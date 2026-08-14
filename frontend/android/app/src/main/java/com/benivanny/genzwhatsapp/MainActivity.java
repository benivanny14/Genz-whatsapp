package com.benivanny.genzwhatsapp;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // DEBUG builds only: allow mixed content (https://localhost webview →
        // http://10.0.2.2 dev backend). Release builds keep WebView defaults so
        // production traffic stays HTTPS-only.
        boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (isDebuggable) {
            runOnUiThread(() -> {
                try {
                    getBridge().getWebView().getSettings()
                            .setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
                } catch (Exception ignored) {
                    // WebView may not be ready yet — harmless, page reloads re-apply.
                }
            });
        }
    }
}
