import AVFoundation
import AppKit
import CoreVideo

let framesRoot = URL(fileURLWithPath: "/private/tmp/start-bodyweight-frames", isDirectory: true)
let outputRoot = URL(fileURLWithPath: "/Users/lykhn/start/public/exercises/bodyweight", isDirectory: true)
let width = 720
let height = 720
let fps: Int32 = 30

func pixelBuffer(from image: NSImage) -> CVPixelBuffer? {
    var buffer: CVPixelBuffer?
    let attrs = [
        kCVPixelBufferCGImageCompatibilityKey: true,
        kCVPixelBufferCGBitmapContextCompatibilityKey: true,
    ] as CFDictionary
    CVPixelBufferCreate(kCFAllocatorDefault, width, height, kCVPixelFormatType_32BGRA, attrs, &buffer)
    guard let pixelBuffer = buffer else { return nil }
    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
    guard let context = CGContext(
        data: CVPixelBufferGetBaseAddress(pixelBuffer),
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue
    ) else { return nil }
    context.setFillColor(NSColor.white.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
    context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
    return pixelBuffer
}

func encode(slug: String, directory: URL) throws {
    let outputURL = outputRoot.appendingPathComponent("\(slug).mp4")
    try? FileManager.default.removeItem(at: outputURL)
    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
    let settings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 1_500_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        ],
    ]
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(
        assetWriterInput: input,
        sourcePixelBufferAttributes: [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: width,
            kCVPixelBufferHeightKey as String: height,
        ]
    )
    guard writer.canAdd(input) else { throw NSError(domain: "BodyweightVideo", code: 1) }
    writer.add(input)
    guard writer.startWriting() else { throw writer.error ?? NSError(domain: "BodyweightVideo", code: 2) }
    writer.startSession(atSourceTime: .zero)

    let images = try (1...6).map { index -> NSImage in
        let url = directory.appendingPathComponent(String(format: "frame-%02d.png", index))
        guard let image = NSImage(contentsOf: url) else { throw NSError(domain: "BodyweightVideo", code: 3) }
        return image
    }

    var frameNumber: Int64 = 0
    for _ in 0..<3 {
        for image in images {
            for _ in 0..<8 {
                guard let buffer = pixelBuffer(from: image) else { throw NSError(domain: "BodyweightVideo", code: 4) }
                while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.002) }
                let time = CMTime(value: frameNumber, timescale: fps)
                guard adaptor.append(buffer, withPresentationTime: time) else {
                    throw writer.error ?? NSError(domain: "BodyweightVideo", code: 5)
                }
                frameNumber += 1
            }
        }
    }

    input.markAsFinished()
    let semaphore = DispatchSemaphore(value: 0)
    writer.finishWriting { semaphore.signal() }
    semaphore.wait()
    guard writer.status == .completed else { throw writer.error ?? NSError(domain: "BodyweightVideo", code: 6) }
}

let directories = try FileManager.default.contentsOfDirectory(
    at: framesRoot,
    includingPropertiesForKeys: [.isDirectoryKey],
    options: [.skipsHiddenFiles]
).sorted { $0.lastPathComponent < $1.lastPathComponent }

for directory in directories {
    let slug = directory.lastPathComponent
    try encode(slug: slug, directory: directory)
    print("encoded \(slug)")
}

print("Encoded \(directories.count) videos")
