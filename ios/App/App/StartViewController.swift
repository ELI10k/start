import Capacitor
import UIKit

// Capacitor registers the plugins that arrive as npm packages by itself, from
// the generated packageClassList. StartHealth is not a package - it lives in
// this target - so nothing registers it unless this does.
//
// The failure without this is silent and easy to misread: window.StartHealth
// never appears, the web layer falls back to "no health store on this device",
// and the steps card shows exactly what it would show on a phone with HealthKit
// switched off. Registering here, rather than leaving it as a step in Xcode,
// means there is no way to build the app with the plugin quietly missing.
class StartViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(StartHealthPlugin())
    }
}
