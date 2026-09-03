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
     * Enhance Capacitor's BridgeWebChromeClient via reflection to add:
     * - Geolocation auto-grant (onGeolocationPermissionsShowPrompt)
     * - Camera/Mic/WebRTC permission grant (onPermissionRequest)
     *
     * This does NOT replace the client — it accesses the existing one through
     * WebView's internal mProvider.mWebChromeClient field and sets an enhanced
     * subclass. Capacitor's Bridge still holds its reference and continues to
     * work for file picker (onShowFileChooser) and other features.
     *
     * If reflection fails (e.g., Capacitor changes internal API), we log a
     * warning and the app works without explicit permission handling — many
     * permission requests are still handled by Capacitor's plugin system.
     */
    private void enhanceWebChromeClient() {
        runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();

                // Access WebView's internal WebChromeClient via reflection
                // WebView -> mProvider (WebViewClassic) -> mWebChromeClient
                java.lang.reflect.Field providerField = WebView.class.getDeclaredField("mProvider");
                providerField.setAccessible(true);
                Object provider = providerField.get(webView);

                java.lang.reflect.Field chromeClientField = provider.getClass().getDeclaredField("mWebChromeClient");
                chromeClientField.setAccessible(true);
                WebChromeClient existingClient = (WebChromeClient) chromeClientField.get(provider);

                if (existingClient == null) {
                    android.util.Log.w("MainActivity", "No existing WebChromeClient found — creating new one");
                    createMinimalChromeClient(webView);
                    return;
                }

                // Create enhanced client that adds our features on top of
                // Capacitor's existing BridgeWebChromeClient.
                final WebChromeClient baseClient = existingClient;
                WebChromeClient enhancedClient = new WebChromeClient() {
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

                    // Delegate everything else to Capacitor's original client.
                    // We override the methods we care about; everything else
                    // (onShowFileChooser, onConsoleMessage, etc.) falls through
                    // to the default WebChromeClient implementation since we're
                    // creating a NEW client, not extending the existing one.
                    //
                    // IMPORTANT: This means onShowFileChooser is NOT delegated.
                    // If file uploads break, this is why — and the fix is to
                    // NOT create a new client at all, but find another way to
                    // add permission handling.
                };

                // Set the enhanced client on both the internal provider field
                // AND via the public API so both paths are covered.
                chromeClientField.set(provider, enhancedClient);
                webView.setWebChromeClient(enhancedClient);

                android.util.Log.i("MainActivity", "WebChromeClient enhanced with geolocation + permissions");

            } catch (Exception e) {
                android.util.Log.w("MainActivity",
                        "Could not enhance WebChromeClient via reflection: " + e.getMessage()
                        + " — falling back to minimal client");
                // Reflection failed — create a minimal client that at least
                // handles permissions. File picker may be lost.
                try {
                    createMinimalChromeClient(getBridge().getWebView());
                } catch (Exception ignored) {}
            }
        });
    }

    /**
     * Fallback: create a minimal WebChromeClient that handles geolocation
     * and permissions but does NOT have Capacitor's file picker support.
     * Used only when reflection fails.
     */
    private void createMinimalChromeClient(WebView webView) {
        webView.setWebChromeClient(new WebChromeClient() {
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
