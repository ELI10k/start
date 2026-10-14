import Capacitor
import Foundation
import HealthKit

// The iOS half of the StartHealth contract. HealthKit already merges the phone,
// the watch and any ring that writes to it, so this reads the merged daily total
// and hands back one figure per calendar day - never a sum of sources, which
// would count the same walk twice.
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
    CAPPluginMethod(name: "readDailySleep", returnType: CAPPluginReturnPromise)
  ]

  private let store = HKHealthStore()
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
    store.requestAuthorization(toShare: [], read: [stepType, sleepType]) { granted, error in
      if let error {
        CAPLog.print("StartHealth authorization failed: \(error.localizedDescription)")
        call.resolve(["status": "denied"])
        return
      }
      call.resolve(["status": granted ? "granted" : "denied"])
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

    query.initialResultsHandler = { _, collection, error in
      if let error {
        CAPLog.print("StartHealth read failed: \(error.localizedDescription)")
        call.resolve(["days": []])
        return
      }
      var days: [[String: Any]] = []
      collection?.enumerateStatistics(from: start, to: end) { statistics, _ in
        let steps = statistics.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
        // A day HealthKit has nothing for is omitted rather than reported as
        // zero: "the phone was off" and "the client did not walk" are different
        // facts, and the summary depends on telling them apart.
        guard steps > 0 else { return }
        days.append(["day": Self.key(statistics.startDate), "steps": Int(steps.rounded())])
      }
      call.resolve(["days": days])
    }

    store.execute(query)
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
        call.resolve(["days": []])
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
