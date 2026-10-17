import Capacitor
import Foundation
import HealthKit
import UIKit

// The iOS half of the StartHealth contract. Most HealthKit writers cooperate
// with its aggregate step query, but some ring companion apps publish a second
// full-day stream that HealthKit adds to the iPhone stream. For those days we
// prefer the wearable while it is reporting and use the phone only outside the
// wearable's reporting window (for example after its battery dies).
//
// Days are the device's own calendar days. The web layer decides what "today"
// means in Asia/Jerusalem and asks for a range; this honours that range using
// the device calendar rather than re-deriving it from UTC.
@objc(StartHealthPlugin)
public class StartHealthPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "StartHealthPlugin"
  public let jsName = "StartHealth"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "getPermission", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "readDailySteps", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "readDailySleep", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "readSleepSamples", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
  ]

  private let store = HKHealthStore()
  // v2 deliberately retries installs that Build 2 incorrectly marked as
  // requested even though iOS never presented the HealthKit sheet.
  private let authorizationRequestedKey = "StartHealth.authorizationRequested.v2"
  private var stepType: HKQuantityType? { HKQuantityType.quantityType(forIdentifier: .stepCount) }
  private var sleepType: HKCategoryType? { HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) }

  @objc func isAvailable(_ call: CAPPluginCall) {
    call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
  }

  // HealthKit deliberately never reveals that a read was refused - it returns
  // empty results instead, so that an app cannot infer a diagnosis from a
  // refusal. "sharingAuthorized" therefore cannot be asked for on a read type,
  // and the honest answer before a request is "prompt".
  @objc func getPermission(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable(), let stepType, let sleepType else {
      call.resolve(["status": "unavailable"])
      return
    }
    // `getRequestStatusForAuthorization` does not report whether read access
    // was granted. In particular it may return `.unnecessary` for read-only
    // types before this app has ever presented HealthKit's authorization sheet.
    // Treating that as "granted" made LIFE FIT read an empty store without ever
    // appearing under Health > Apps. Remember our own completed request so a
    // fresh install (and existing installs affected by the old bug) must ask
    // once before any health data is read.
    guard UserDefaults.standard.bool(forKey: authorizationRequestedKey) else {
      call.resolve(["status": "prompt"])
      return
    }
    store.getRequestStatusForAuthorization(toShare: [], read: [stepType, sleepType]) { status, _ in
      switch status {
      case .unnecessary: call.resolve(["status": "granted"])
      case .shouldRequest: call.resolve(["status": "prompt"])
      default: call.resolve(["status": "prompt"])
      }
    }
  }

  @objc func requestPermission(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable(), let stepType, let sleepType else {
      call.resolve(["status": "unavailable"])
      return
    }
    // A Capacitor plugin call is not guaranteed to arrive on the main queue.
    // HealthKit presents UIKit from this request; dispatch it to the main queue
    // so iOS can attach the authorization sheet to the active application.
    DispatchQueue.main.async {
      self.store.requestAuthorization(toShare: [], read: [stepType, sleepType]) { granted, error in
        if let error {
          CAPLog.print("StartHealth authorization failed: \(error.localizedDescription)")
          call.resolve(["status": "denied"])
          return
        }
        // HealthKit intentionally does not disclose the user's per-type read
        // choices. A successful sheet completion is the only reliable lifecycle
        // signal available; subsequent empty reads are handled as empty data and
        // the UI offers a route back to Health settings.
        UserDefaults.standard.set(true, forKey: self.authorizationRequestedKey)
        call.resolve(["status": granted ? "granted" : "denied"])
      }
    }
  }

  @objc func readDailySteps(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable(), let stepType else {
      call.resolve(["days": []])
      return
    }
    guard
      let fromDay = call.getString("fromDay"),
      let toDay = call.getString("toDay"),
      let start = Self.day(fromDay),
      let endDay = Self.day(toDay)
    else {
      call.reject("invalid_range")
      return
    }

    let calendar = Calendar.current
    // Inclusive of the last day: the range ends at the start of the day after it.
    guard let end = calendar.date(byAdding: .day, value: 1, to: endDay) else {
      call.reject("invalid_range")
      return
    }

    let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [.strictStartDate])
    let query = HKStatisticsCollectionQuery(
      quantityType: stepType,
      quantitySamplePredicate: predicate,
      options: .cumulativeSum,
      anchorDate: start,
      intervalComponents: DateComponents(day: 1)
    )

    query.initialResultsHandler = { [weak self] _, collection, error in
      // A failed read is a failure, not an empty week. Resolving [] here used
      // to paint "no data" over a HealthKit error the client could retry.
      if let error {
        CAPLog.print("StartHealth read failed: \(error.localizedDescription)")
        call.reject("read_failed", "HEALTH_READ_FAILED")
        return
      }
      var totals: [(day: String, steps: Int)] = []
      collection?.enumerateStatistics(from: start, to: end) { statistics, _ in
        // The merged, de-duplicated total. HealthKit has already applied its
        // source priority here, so a phone and a watch that saw the same walk
        // count it once; the writers listed below never change this figure.
        let steps = statistics.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
        // A day HealthKit has nothing for is omitted rather than reported as
        // zero: "the phone was off" and "the client did not walk" are different
        // facts, and the summary depends on telling them apart.
        guard steps > 0 else { return }
        totals.append((day: Self.key(statistics.startDate), steps: Int(steps.rounded())))
      }
      guard let self else {
        call.resolve(["days": totals.map { ["day": $0.day, "steps": $0.steps] }])
        return
      }
      self.stepSourceSummary(type: stepType, predicate: predicate) { summary in
        let days: [[String: Any]] = totals.map { total in
          let selected = summary[total.day]
          var day: [String: Any] = ["day": total.day, "steps": selected?.steps ?? total.steps]
          if let writers = selected?.sources, !writers.isEmpty { day["sources"] = writers }
          return day
        }
        call.resolve(["days": days])
      }
    }

    store.execute(query)
  }

  private struct StepWriter {
    var info: [String: Any]
    var samples: [HKQuantitySample]
    var steps: Double
    var first: Date
    var last: Date
    var isPhone: Bool
  }

  private typealias StepDaySummary = (steps: Int?, sources: [[String: Any]])

  // Ring apps can write the same walk as a second stream beside the iPhone.
  // Pick the dominant wearable for the day, then use phone samples only before
  // its first sample or after its last sample. If there is no wearable, keep
  // HealthKit's aggregate total by returning no override for that day.
  private func stepSourceSummary(type: HKQuantityType, predicate: NSPredicate, completion: @escaping ([String: StepDaySummary]) -> Void) {
    let query = HKSampleQuery(sampleType: type, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
      if let error {
        CAPLog.print("StartHealth source lookup failed: \(error.localizedDescription)")
        completion([:])
        return
      }
      var byDay: [String: [String: StepWriter]] = [:]
      let now = Date()
      for sample in samples as? [HKQuantitySample] ?? [] {
        let day = Self.key(sample.startDate)
        let info = Self.sourceInfo(sample)
        let writer = Self.writerKey(sample)
        let isPhone = Self.isPhoneSource(sample)
        let steps = Self.trustedStepValue(sample, isPhone: isPhone, now: now)
        var writers = byDay[day] ?? [:]
        if var current = writers[writer] {
          current.samples.append(sample)
          current.steps += steps
          current.first = min(current.first, sample.startDate)
          current.last = max(current.last, sample.endDate)
          writers[writer] = current
        } else {
          writers[writer] = StepWriter(
            info: info,
            samples: [sample],
            steps: steps,
            first: sample.startDate,
            last: sample.endDate,
            isPhone: isPhone
          )
        }
        byDay[day] = writers
      }
      var result: [String: StepDaySummary] = [:]
      for (day, writers) in byDay {
        let ordered = writers.values.sorted { $0.steps > $1.steps }
        let sources = ordered.prefix(6).map { $0.info }
        guard let wearable = ordered.first(where: { !$0.isPhone }) else {
          // No ring/watch today: the caller keeps HealthKit's aggregate.
          result[day] = (steps: nil, sources: sources)
          continue
        }
        let phone = ordered.first(where: \.isPhone)
        let phoneFallback = phone?.samples.reduce(0.0) { subtotal, sample in
          subtotal + Self.stepsOutsideWearableWindow(sample, from: wearable.first, to: wearable.last)
        } ?? 0
        result[day] = (steps: Int((wearable.steps + phoneFallback).rounded()), sources: [wearable.info] + [phone?.info].compactMap { $0 })
      }
      completion(result)
    }
    store.execute(query)
  }

  private static func stepsOutsideWearableWindow(_ sample: HKQuantitySample, from first: Date, to last: Date) -> Double {
    let steps = sample.quantity.doubleValue(for: HKUnit.count())
    let duration = sample.endDate.timeIntervalSince(sample.startDate)
    guard duration > 0 else {
      return sample.startDate < first || sample.startDate > last ? steps : 0
    }
    let overlapStart = max(sample.startDate, first)
    let overlapEnd = min(sample.endDate, last)
    let overlap = max(0, overlapEnd.timeIntervalSince(overlapStart))
    return steps * max(0, 1 - overlap / duration)
  }

  private static func trustedStepValue(_ sample: HKQuantitySample, isPhone: Bool, now: Date) -> Double {
    let steps = sample.quantity.doubleValue(for: HKUnit.count())
    guard !isPhone, sample.endDate > now else { return steps }

    // Smart Life writes normal partial-hour movement (for example 52 steps
    // after 11 minutes), but can also write an old cumulative total into the
    // still-open hour (9,514 after only two minutes on the reported device).
    // Reject only a physiologically impossible open-hour value. Retaining the
    // sample in StepWriter.samples still marks the ring as active, so phone
    // fallback is not added on top of it.
    let elapsedMinutes = max(0, now.timeIntervalSince(sample.startDate) / 60)
    let plausibleUpperBound = max(500, elapsedMinutes * 250)
    return steps <= plausibleUpperBound ? steps : 0
  }

  private static func isPhoneSource(_ sample: HKSample) -> Bool {
    let source = sample.sourceRevision.source
    let sourceName = source.name.lowercased()
    let sourceBundle = source.bundleIdentifier.lowercased()
    if sourceName.contains("iphone") { return true }

    // Companion apps such as Smart Life run on the iPhone and can therefore
    // attach an iPhone HKDevice to ring samples. The writer remains Smart Life;
    // only Apple's own Health source should inherit the device classification.
    guard sourceBundle.hasPrefix("com.apple.") else { return false }
    let appleDeviceValues = [
      sample.sourceRevision.productType,
      sample.device?.name,
      sample.device?.model
    ].compactMap { $0?.lowercased() }
    return appleDeviceValues.contains { $0.contains("iphone") }
  }

  @objc func readDailySleep(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable(), let sleepType else {
      call.resolve(["days": []])
      return
    }
    guard
      let fromDay = call.getString("fromDay"),
      let toDay = call.getString("toDay"),
      let start = Self.day(fromDay),
      let endDay = Self.day(toDay),
      let end = Calendar.current.date(byAdding: .day, value: 1, to: endDay)
    else {
      call.reject("invalid_range")
      return
    }

    let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
    let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
      if let error {
        CAPLog.print("StartHealth sleep read failed: \(error.localizedDescription)")
        call.reject("read_failed", "HEALTH_READ_FAILED")
        return
      }

      let asleep = (samples as? [HKCategorySample] ?? []).filter { sample in
        if #available(iOS 16.0, *) {
          return [HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue,
                  HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                  HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                  HKCategoryValueSleepAnalysis.asleepREM.rawValue].contains(sample.value)
        }
        return sample.value == HKCategoryValueSleepAnalysis.asleep.rawValue
      }

      // HealthKit returns the raw samples from every writer. Apple Health's
      // source priority is a presentation preference and is not applied to an
      // HKSampleQuery, so unioning all samples can turn one five-hour night into
      // nearly ten hours when both a ring and the phone report sleep.
      //
      // Build one candidate per source and choose a single source for the day.
      // Detailed sleep stages are preferred over a generic "asleep" record;
      // when both are equally detailed, prefer a third-party wearable over an
      // Apple fallback. A lone Apple Watch/iPhone source still works normally.
      let grouped = Dictionary(grouping: asleep, by: { Self.key($0.startDate) })
      let days = grouped.keys.sorted().compactMap { day -> [String: Any]? in
        let candidates = Dictionary(grouping: grouped[day] ?? [], by: {
          $0.sourceRevision.source.bundleIdentifier
        }).compactMap { source, samples -> SleepCandidate? in
          guard let minutes = Self.mergedSleepMinutes(samples) else { return nil }
          let hasStages: Bool
          if #available(iOS 16.0, *) {
            let stages = [HKCategoryValueSleepAnalysis.asleepCore.rawValue,
                          HKCategoryValueSleepAnalysis.asleepDeep.rawValue,
                          HKCategoryValueSleepAnalysis.asleepREM.rawValue]
            hasStages = samples.contains { stages.contains($0.value) }
          } else {
            hasStages = false
          }
          return SleepCandidate(
            minutes: minutes,
            hasStages: hasStages,
            isThirdParty: !source.lowercased().hasPrefix("com.apple."),
            latestEnd: samples.map(\.endDate).max() ?? .distantPast
          )
        }
        guard let selected = candidates.max(by: Self.isLowerPriority) else { return nil }
        return ["day": day, "minutes": selected.minutes]
      }
      call.resolve(["days": days])
    }
    store.execute(query)
  }

  // The raw asleep intervals, each with the writer HealthKit recorded for it.
  // Nights are assembled in the web layer (lib/health/sleep-nights.ts), where
  // the one-writer-per-night rule and the overlap merge are unit tested. The
  // window opens at 18:00 the evening before the first day, because a night
  // belongs to the morning it ends on.
  @objc func readSleepSamples(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable(), let sleepType else {
      call.resolve(["samples": []])
      return
    }
    guard
      let fromDay = call.getString("fromDay"),
      let toDay = call.getString("toDay"),
      let firstDay = Self.day(fromDay),
      let endDay = Self.day(toDay),
      let start = Calendar.current.date(byAdding: .hour, value: -6, to: firstDay),
      let end = Calendar.current.date(byAdding: .day, value: 1, to: endDay)
    else {
      call.reject("invalid_range")
      return
    }

    let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
    let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
      if let error {
        CAPLog.print("StartHealth sleep sample read failed: \(error.localizedDescription)")
        call.reject("read_failed", "HEALTH_READ_FAILED")
        return
      }
      let iso = ISO8601DateFormatter()
      let result: [[String: Any]] = (samples as? [HKCategorySample] ?? []).compactMap { sample in
        guard let stage = Self.stage(sample.value) else { return nil }
        return [
          "start": iso.string(from: sample.startDate),
          "end": iso.string(from: sample.endDate),
          "stage": stage,
          "source": Self.sourceInfo(sample)
        ]
      }
      call.resolve(["samples": result])
    }
    store.execute(query)
  }

  // iOS has no deep link to one app's Health permissions. The Health app is
  // where they live (Profile → Apps → LIFE FIT); failing that, this app's page
  // in Settings.
  @objc func openSettings(_ call: CAPPluginCall) {
    DispatchQueue.main.async {
      let candidates = ["x-apple-health://", UIApplication.openSettingsURLString].compactMap(URL.init(string:))
      guard let url = candidates.first(where: { UIApplication.shared.canOpenURL($0) }) ?? candidates.last else {
        call.resolve(["opened": false])
        return
      }
      UIApplication.shared.open(url) { opened in call.resolve(["opened": opened]) }
    }
  }

  private static func stage(_ value: Int) -> String? {
    if #available(iOS 16.0, *) {
      switch value {
      case HKCategoryValueSleepAnalysis.asleepCore.rawValue: return "core"
      case HKCategoryValueSleepAnalysis.asleepDeep.rawValue: return "deep"
      case HKCategoryValueSleepAnalysis.asleepREM.rawValue: return "rem"
      case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue: return "asleep"
      default: return nil
      }
    }
    return value == HKCategoryValueSleepAnalysis.asleep.rawValue ? "asleep" : nil
  }

  private static func writerKey(_ sample: HKSample) -> String {
    let source = sample.sourceRevision.source.bundleIdentifier
    return "\(source)|\(sample.device?.model ?? "")|\(sample.device?.name ?? "")"
  }

  // Only what HealthKit itself recorded about the writer. Nothing is guessed;
  // a field HealthKit left empty is left out.
  private static func sourceInfo(_ sample: HKSample) -> [String: Any] {
    var info: [String: Any] = [:]
    let revision = sample.sourceRevision
    info["sourceName"] = revision.source.name
    info["sourceBundleIdentifier"] = revision.source.bundleIdentifier
    if let productType = revision.productType { info["productType"] = productType }
    if let device = sample.device {
      if let name = device.name { info["deviceName"] = name }
      if let manufacturer = device.manufacturer { info["manufacturer"] = manufacturer }
      if let model = device.model { info["model"] = model }
      if let hardware = device.hardwareVersion { info["hardwareVersion"] = hardware }
    }
    return info
  }

  private static func day(_ value: String) -> Date? {
    let formatter = DateFormatter()
    formatter.calendar = Calendar.current
    formatter.timeZone = Calendar.current.timeZone
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.date(from: value)
  }

  private static func key(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.calendar = Calendar.current
    formatter.timeZone = Calendar.current.timeZone
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }

  private struct SleepCandidate {
    let minutes: Int
    let hasStages: Bool
    let isThirdParty: Bool
    let latestEnd: Date
  }

  private static func isLowerPriority(_ lhs: SleepCandidate, _ rhs: SleepCandidate) -> Bool {
    if lhs.hasStages != rhs.hasStages { return !lhs.hasStages }
    if lhs.isThirdParty != rhs.isThirdParty { return !lhs.isThirdParty }
    return lhs.latestEnd < rhs.latestEnd
  }

  private static func mergedSleepMinutes(_ samples: [HKCategorySample]) -> Int? {
    let intervals = samples.map { ($0.startDate, $0.endDate) }.sorted { $0.0 < $1.0 }
    guard var current = intervals.first else { return nil }
    var seconds: TimeInterval = 0
    for interval in intervals.dropFirst() {
      if interval.0 <= current.1 {
        current.1 = max(current.1, interval.1)
      } else {
        seconds += current.1.timeIntervalSince(current.0)
        current = interval
      }
    }
    seconds += current.1.timeIntervalSince(current.0)
    let minutes = min(1440, max(0, Int((seconds / 60).rounded())))
    return minutes > 0 ? minutes : nil
  }
}
