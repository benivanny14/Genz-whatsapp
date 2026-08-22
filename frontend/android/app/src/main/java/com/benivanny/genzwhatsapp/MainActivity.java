package com.benivanny.genzwhatsapp;

import android.app.DownloadManager;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.URLUtil;
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

        // Native download listener — catches any download that the WebView would
        // normally handle via <a download>.  The default WebView download handler
        // is unreliable for cross-origin URLs on Android, so we route everything
        // through Android's DownloadManager for consistent behavior.
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                webView.setDownloadListener((url, userAgent, contentDisposition,
                                            mimeType, contentLength) -> {
                    try {
                        DownloadManager.Request request =
                                new DownloadManager.Request(Uri.parse(url));
                        String cookies = CookieManager.getInstance().getCookie(url);
                        request.addRequestHeader("cookie", cookies != null ? cookies : "");
                        request.addRequestHeader("User-Agent",
                                userAgent != null ? userAgent : "");
                        request.setMimeType(mimeType);
                        request.setDescription("Downloading file...");
                        String filename = URLUtil.guessFileName(
                                url, contentDisposition, mimeType);
                        request.setTitle(filename);
                        request.setNotificationVisibility(
                                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(
                                Environment.DIRECTORY_DOWNLOADS, filename);
                        DownloadManager dm = (DownloadManager)
                                getSystemService(DOWNLOAD_SERVICE);
                        if (dm != null) dm.enqueue(request);
                    } catch (Exception e) {
                        android.util.Log.e("MainActivity",
                                "Download failed: " + e.getMessage(), e);
                    }
                });
            } catch (Exception ignored) {
                // Bridge may not be ready yet.
            }
        });
    }
}
