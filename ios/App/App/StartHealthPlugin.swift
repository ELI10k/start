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
    CAPPluginMethod(name: "readDailySteps", returnType: CAPPluginReturnPromise)
  ]

  private let store = HKHealthStore()
  private var stepType: HKQuantityType? { HKQuantityType.quantityType(forIdentifier: .stepCount) }

  @objc func isAvailable(_ call: CAPPluginCall) {
    call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
  }

  // HealthKit deliberately never reveals that a read was refused - it returns
  // empty results instead, so that an app cannot infer a diagnosis from a
  // refusal. "sharingAuthorized" therefore cannot be asked for on a read type,
  // and the honest answer before a request is "prompt".
  @objc func getPermission(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable(), let stepType else {
      call.resolve(["status": "unavailable"])
      return
    }
    store.getRequestStatusForAuthorization(toShare: [], read: [stepType]) { status, _ in
      switch status {
      case .unnecessary: call.resolve(["status": "granted"])
      case .shouldRequest: call.resolve(["status": "prompt"])
      default: call.resolve(["status": "prompt"])
      }
    }
  }

  @objc func requestPermission(_ call: CAPPluginCall) {
    guard HKHealthStore.isHealthDataAvailable(), let stepType else {
      call.resolve(["status": "unavailable"])
      return
    }
    store.requestAuthorization(toShare: [], read: [stepType]) { granted, error in
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
}
