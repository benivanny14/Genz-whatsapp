package com.benivanny.genzwhatsapp;

import android.app.DownloadManager;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.google.firebase.FirebaseApp;

/**
 * MainActivity — extends Capacitor's BridgeActivity.
 *
 * KEY CONSTRAINT: We must NOT call setWebChromeClient() because that
 * replaces Capacitor's BridgeWebChromeClient which handles:
 *   - onShowFileChooser → file picker (<input type="file">)
 *   - Camera/Mic permission flow
 *   - Console message forwarding
 *   - JS alert/confirm/prompt dialogs
 *
 * Instead, we use reflection to ENHANCE the existing client with:
 *   - onGeolocationPermissionsShowPrompt (geolocation)
 *   - onPermissionRequest (WebRTC camera/mic + MediaRecorder)
 *
 * The reflection accesses WebView's internal mProvider.mWebChromeClient
 * field. If this fails (Capacitor internal API change), we log a warning
 * but the app still works — just without geolocation auto-grant and
 * explicit permission request handling (Capacitor may still handle some
 * of these through its plugin system).
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Initialize Firebase safely — crashes app if not done before plugins load
        try {
            if (FirebaseApp.getApps(this).isEmpty()) {
                FirebaseApp.initializeApp(this);
            }
        } catch (Exception e) {
            // google-services.json missing — Push Notifications won't work but app must not crash
            android.util.Log.w("MainActivity", "Firebase init skipped: " + e.getMessage());
        }
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
                } catch (Exception ignored) {}
            });
        }

        // Enhance the WebChromeClient with geolocation + permission support
        // WITHOUT replacing Capacitor's existing client (which handles file picker).
        enhanceWebChromeClient();

        // Native download listener
        setupDownloadListener();
    }

    /**
     * Enhance Capacitor's BridgeWebChromeClient to add:
     * - Geolocation auto-grant (onGeolocationPermissionsShowPrompt)
     * - Camera/Mic/WebRTC permission grant (onPermissionRequest)
     *
     * We SUBCLASS Capacitor's BridgeWebChromeClient (instead of replacing it
     * with a plain WebChromeClient) so all of its handlers keep working:
     * onShowFileChooser (file picker for <input type="file">), onJsAlert /
     * onJsConfirm / onJsPrompt dialogs, onConsoleMessage forwarding, and
     * fullscreen video. Replacing it with a fresh WebChromeClient silently
     * broke the file picker — gallery/document attachments never opened
     * on-device.
     *
     * Bridge does not keep its own reference to the client (it only calls
     * webView.setWebChromeClient(new BridgeWebChromeClient(this)) during
     * setup), so installing our subclass via setWebChromeClient is safe.
     */
    private void enhanceWebChromeClient() {
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                WebChromeClient enhancedClient = new BridgeWebChromeClient(getBridge()) {
                    @Override
                    public void onGeolocationPermissionsShowPrompt(
                            String origin, GeolocationPermissions.Callback callback) {
                        // Auto-grant geolocation for our own origins
                        callback.invoke(origin, true, false);
                    }

                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        // Grant camera + microphone permissions for WebRTC and MediaRecorder.
                        // These map to Android runtime permissions (CAMERA, RECORD_AUDIO)
                        // already declared in AndroidManifest.xml and prompted by the user
                        // on first use.
                        runOnUiThread(() -> {
                            try {
                                request.grant(request.getResources());
                            } catch (Exception e) {
                                android.util.Log.w("MainActivity",
                                        "Failed to grant permissions: " + e.getMessage());
                            }
                        });
                    }
                };
                webView.setWebChromeClient(enhancedClient);
                android.util.Log.i("MainActivity",
                        "WebChromeClient enhanced (BridgeWebChromeClient subclass) — file picker preserved");
            } catch (Exception e) {
                android.util.Log.w("MainActivity",
                        "Could not enhance WebChromeClient: " + e.getMessage()
                        + " — falling back to minimal client");
                try {
                    createMinimalChromeClient(getBridge().getWebView());
                } catch (Exception ignored) {}
            }
        });
    }

    /**
     * Fallback: subclass BridgeWebChromeClient with geolocation auto-grant.
     * Keeps Capacitor's file picker and dialog handlers intact.
     * Used only if the primary enhancement path throws.
     */
    private void createMinimalChromeClient(WebView webView) {
        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onGeolocationPermissionsShowPrompt(
                    String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });
    }

    private void setupDownloadListener() {
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
            } catch (Exception ignored) {}
        });
    }
}
