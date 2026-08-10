package co.il.startcoaching.app;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.time.LocalDate;

/**
 * The Android half of the StartHealth contract.
 *
 * Health Connect already merges the phone, a watch and any other writer into one
 * reading per day, so the implementation asks for that daily total rather than
 * summing sources - a phone in a pocket and a watch on the wrist saw the same
 * walk. Days stay the device's own calendar days, matching what the web layer
 * asked for; re-deriving them from UTC would put an evening walk on the next day.
 *
 * BLOCKED-EXTERNAL: reading steps needs androidx.health.connect:connect-client
 * on the classpath, the READ_STEPS permission in the manifest, and Android
 * Studio to resolve and build both. Adding the dependency here without being
 * able to compile against it would only produce a build that fails on a machine
 * I cannot run.
 *
 * Until then every method answers honestly rather than pretending: "unavailable"
 * and an empty list, which is exactly the state the steps card is written to
 * handle - it says the device cannot serve steps instead of drawing an empty
 * chart. Wiring the real client changes this file only; nothing above it moves.
 */
@CapacitorPlugin(name = "StartHealth")
public class StartHealthPlugin extends Plugin {

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject result = new JSObject();
    result.put("available", false);
    call.resolve(result);
  }

  @PluginMethod
  public void getPermission(PluginCall call) {
    JSObject result = new JSObject();
    result.put("status", "unavailable");
    call.resolve(result);
  }

  @PluginMethod
  public void requestPermission(PluginCall call) {
    JSObject result = new JSObject();
    result.put("status", "unavailable");
    call.resolve(result);
  }

  // The range is still validated, so the contract is exercised end to end and a
  // malformed call fails here rather than silently returning nothing.
  @PluginMethod
  public void readDailySteps(PluginCall call) {
    String fromDay = call.getString("fromDay");
    String toDay = call.getString("toDay");
    if (fromDay == null || toDay == null || !validDay(fromDay) || !validDay(toDay)) {
      call.reject("invalid_range");
      return;
    }
    JSObject result = new JSObject();
    result.put("days", new JSArray());
    call.resolve(result);
  }

  private boolean validDay(String value) {
    try {
      LocalDate.parse(value);
      return true;
    } catch (Exception invalid) {
      return false;
    }
  }
}
