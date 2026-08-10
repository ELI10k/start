package co.il.startcoaching.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Custom plugins have to be registered before the bridge starts, or the web
    // layer finds window.StartHealth missing and falls back to "unavailable".
    registerPlugin(StartHealthPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
