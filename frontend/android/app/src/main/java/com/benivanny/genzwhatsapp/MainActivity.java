package com.benivanny.genzwhatsapp;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

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

        // Allow geolocation in WebView — when the web page requests
        // navigator.geolocation, the WebView needs a WebChromeClient that
        // responds to onGeolocationPermissionsShowPrompt.  Capacitor's default
        // bridge handles most permissions but not geolocation.
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onGeolocationPermissionsShowPrompt(
                            String origin, GeolocationPermissions.Callback callback) {
                        // Automatically grant geolocation for our own origin.
                        callback.invoke(origin, true, false);
                    }
                });
            } catch (Exception ignored) {
                // Bridge may not be ready yet.
            }
        });
    }
}
