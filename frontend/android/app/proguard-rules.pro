# Capacitor core — keep the bridge and plugin loader
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }

# Capacitor plugins used by this project
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }
-keep class com.capacitorjs.plugins.localnotifications.** { *; }
-keep class com.capacitorjs.plugins.camera.** { *; }
-keep class com.capacitorjs.plugins.filesystem.** { *; }
-keep class com.capacitorjs.plugins.share.** { *; }
-keep class com.capacitorjs.plugins.keyboard.** { *; }
-keep class com.capacitorjs.plugins.statusbar.** { *; }
-keep class com.capacitorjs.plugins.toast.** { *; }
-keep class com.capacitorjs.plugins.clipboard.** { *; }
-keep class com.capacitorjs.plugins.haptics.** { *; }
-keep class com.capacitorjs.plugins.network.** { *; }
-keep class com.capacitorjs.plugins.preferences.** { *; }
-keep class com.capacitorjs.plugins.splashscreen.** { *; }
-keep class com.capacitorjs.plugins.contacts.** { *; }
-keep class io.capawesome.** { *; }
-keep class ee.forgr.** { *; }
-keep class com.goong.android.** { *; }

# Native Biometric plugin
-keep class com.talosdigital.androidbiometric.** { *; }
-keep class com.talosdigital.** { *; }

# Sentry (crash reporting)
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Retrofit / OkHttp (used by some plugins)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Prevent removal of enum values
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
