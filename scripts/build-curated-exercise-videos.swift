import AVFoundation
import AppKit
import CoreVideo

let framesRoot = URL(fileURLWithPath: "/private/tmp/start-curated-exercise-frames", isDirectory: true)
let outputRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath, isDirectory: true)
    .appendingPathComponent("public/exercises", isDirectory: true)
let width = 720
let height = 720
let fps: Int32 = 30

func pixelBuffer(from image: NSImage) -> CVPixelBuffer? {
    var buffer: CVPixelBuffer?
    CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32BGRA, [
        kCVPixelBufferCGImageCompatibilityKey: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey: true,
    ] as CFDictionary, &buffer)
    guard let pixelBuffer = buffer else { return nil }
    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
    guard let context = CGContext(data: CVPixelBufferGetBaseAddress(pixelBuffer), width: width, height: height,
        bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer), space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue),
        let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    return pixelBuffer
}

func encode(category: String, slug: String, directory: URL) throws {
    let outputDirectory = outputRoot.appendingPathComponent(category, isDirectory: true)
    try FileManager.default.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
    let outputURL = outputDirectory.appendingPathComponent("\(slug).mp4")
    try? FileManager.default.removeItem(at: outputURL)
    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 1_500_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel],
    ])
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
    ])
    guard writer.canAdd(input) else { throw NSError(domain: "CuratedExerciseVideo", code: 1) }
    writer.add(input)
    guard writer.startWriting() else { throw writer.error ?? NSError(domain: "CuratedExerciseVideo", code: 2) }
    writer.startSession(atSourceTime: .zero)
    let images = try (1...6).map { index -> NSImage in
        let url = directory.appendingPathComponent(String(format: "frame-%02d.png", index))
        guard let image = NSImage(contentsOf: url) else { throw NSError(domain: "CuratedExerciseVideo", code: 3) }
        return image
    }
    var frameNumber: Int64 = 0
    for _ in 0..<3 {
        for image in images {
            for _ in 0..<8 {
                guard let buffer = pixelBuffer(from: image) else { throw NSError(domain: "CuratedExerciseVideo", code: 4) }
                while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
                guard adaptor.append(buffer, withPresentationTime: CMTime(value: frameNumber, timescale: fps)) else {
                    throw writer.error ?? NSError(domain: "CuratedExerciseVideo", code: 5)
                }
                frameNumber += 1
            }
        }
    }
    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    guard writer.status == .completed else { throw writer.error ?? NSError(domain: "CuratedExerciseVideo", code: 6) }
}

let categories = try FileManager.default.contentsOfDirectory(at: framesRoot, includingPropertiesForKeys: [.isDirectoryKey], options: [.skipsHiddenFiles])
var encoded = 0
for category in categories.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
    let exercises = try FileManager.default.contentsOfDirectory(at: category, includingPropertiesForKeys: [.isDirectoryKey], options: [.skipsHiddenFiles])
    for directory in exercises.sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
        try encode(category: category.lastPathComponent, slug: directory.lastPathComponent, directory: directory)
        encoded += 1
        print("encoded \(category.lastPathComponent)/\(directory.lastPathComponent)")
    }
}
print("Encoded \(encoded) videos")
