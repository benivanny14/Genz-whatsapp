package com.benivanny.genzwhatsapp;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

/**
 * APKInstaller — Capacitor plugin that downloads an APK via DownloadManager
 * and opens Android's package installer to install it OVER the current app.
 *
 * All user data (messages, media, settings) is preserved because Android
 * reinstalls using the same package name + signing key.
 */
@CapacitorPlugin(name = "APKInstaller")
public class APKInstallerPlugin extends Plugin {

    private static final String TAG = "APKInstaller";
    private static final String FILE_PROVIDER_AUTHORITY = "com.benivanny.genzwhatsapp.fileprovider";

    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("URL is required");
            return;
        }

        String filename = call.getString("filename", "genz-update.apk");
        String version = call.getString("version", "");

        new Thread(() -> {
            try {
                // 1. Enqueue download to the public Downloads folder
                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setTitle("GENZ Messenger v" + version);
                request.setDescription("Installing update...");
                request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                );
                request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS, filename
                );
                request.setMimeType("application/vnd.android.package-archive");

                DownloadManager dm = (DownloadManager)
                    getContext().getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm == null) {
                    call.reject("DownloadManager not available");
                    return;
                }

                long downloadId = dm.enqueue(request);
                Log.i(TAG, "Download started: " + downloadId);

                // 2. Poll for completion
                boolean downloading = true;
                while (downloading) {
                    DownloadManager.Query query = new DownloadManager.Query();
                    query.setFilterById(downloadId);
                    Cursor cursor = dm.query(query);
                    if (cursor != null && cursor.moveToFirst()) {
                        int status = cursor.getInt(
                            cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS)
                        );
                        cursor.close();
                        if (status == DownloadManager.STATUS_SUCCESSFUL) {
                            downloading = false;
                        } else if (status == DownloadManager.STATUS_FAILED) {
                            call.reject("Download failed");
                            return;
                        }
                    }
                    Thread.sleep(500);
                }

                // 3. Find the downloaded file
                File downloadsDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS
                );
                File apkFile = new File(downloadsDir, filename);

                if (!apkFile.exists()) {
                    call.reject("APK file not found after download");
                    return;
                }

                Log.i(TAG, "APK ready: " + apkFile.getAbsolutePath()
                    + " (" + apkFile.length() + " bytes)");

                // 4. Get content:// URI via FileProvider
                Uri contentUri = FileProvider.getUriForFile(
                    getContext(),
                    FILE_PROVIDER_AUTHORITY,
                    apkFile
                );

                // 5. Launch package installer
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(
                    contentUri,
                    "application/vnd.android.package-archive"
                );
                installIntent.setFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION
                    | Intent.FLAG_ACTIVITY_NEW_TASK
                    | Intent.FLAG_ACTIVITY_CLEAR_TOP
                );
                getContext().startActivity(installIntent);

                Log.i(TAG, "Package installer launched for v" + version);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("path", apkFile.getAbsolutePath());
                call.resolve(result);

            } catch (Exception e) {
                Log.e(TAG, "Install failed: " + e.getMessage(), e);
                call.reject("Install failed: " + e.getMessage(), e);
            }
        }).start();
    }
}
