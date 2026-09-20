const fs = require('fs');
const path = require('path');

const frontendRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(frontendRoot, 'android');
const appGradle = path.join(androidRoot, 'app', 'build.gradle');
const rootGradle = path.join(androidRoot, 'build.gradle');
const manifestPath = path.join(androidRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
const stylesPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
const colorsPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'colors.xml');
const stringsPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values', 'strings.xml');
const networkPath = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml');
const googleServices = path.join(androidRoot, 'app', 'google-services.json');

const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, contents) => {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, contents);
};

if (!fs.existsSync(appGradle)) {
  throw new Error('Android project missing. Run npx cap add android first.');
}

const SIGNING_BLOCK = `
    signingConfigs {
        release {
            def keystorePath = System.getenv("KEYSTORE_PATH")
            if (keystorePath == null || keystorePath.isEmpty()) {
                throw new GradleException("KEYSTORE_PATH is required. Debug signing is not allowed for release.")
            }
            def storeFilePath = new File(keystorePath)
            if (!storeFilePath.exists()) {
                throw new GradleException("Release keystore not found at " + keystorePath)
            }
            storeFile storeFilePath
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
            v1SigningEnabled true
            v2SigningEnabled true
        }
    }
`;

let gradle = read(appGradle);
if (gradle.includes('signingConfigs')) {
  gradle = gradle.replace(/signingConfigs\s*\{[\s\S]*?\n    \}/, '').replace(/\n{3,}/g, '\n\n');
}
if (!gradle.includes('v1SigningEnabled true')) {
  gradle = gradle.replace(/android\s*\{/, `android {${SIGNING_BLOCK}`);
}
if (!/buildTypes[\s\S]*release[\s\S]*signingConfig signingConfigs\.release/.test(gradle)) {
  gradle = gradle.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{)/,
    `$1\n            signingConfig signingConfigs.release`
  );
}
if (fs.existsSync(googleServices) && !gradle.includes("com.google.gms.google-services")) {
  if (!gradle.includes("apply plugin: 'com.google.gms.google-services'")) {
    gradle += `\napply plugin: 'com.google.gms.google-services'\n`;
  }
}
write(appGradle, gradle);

if (fs.existsSync(rootGradle)) {
  let root = read(rootGradle);
  if (!root.includes('com.google.gms:google-services') && fs.existsSync(googleServices)) {
    root = root.replace(
      /dependencies\s*\{/,
      `dependencies {
        classpath 'com.google.gms:google-services:4.4.2'`
    );
    write(rootGradle, root);
  }
}

const PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.READ_CONTACTS',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.REQUEST_INSTALL_PACKAGES'
];

let manifest = read(manifestPath);
PERMISSIONS.forEach((permission) => {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(
      '<application',
      `    <uses-permission android:name="${permission}" />\n    <application`
    );
  }
});
manifest = manifest.replace(/android:launchMode="[^"]*"/, 'android:launchMode="singleTask"');
if (!manifest.includes('android:screenOrientation="portrait"')) {
  manifest = manifest.replace('<activity', '<activity android:screenOrientation="portrait"');
}
if (!manifest.includes('android:networkSecurityConfig')) {
  manifest = manifest.replace(
    '<application',
    '<application android:networkSecurityConfig="@xml/network_security_config" android:usesCleartextTraffic="false"'
  );
}
const deeplinkFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="app.genzwhatsapp" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="genz-whatsapp.onrender.com" android:pathPrefix="/join" />
                <data android:scheme="https" android:host="genz-whatsapp.onrender.com" android:pathPrefix="/download" />
                <data android:scheme="https" android:host="genz-whatsapp.onrender.com" android:pathPrefix="/chat" />
            </intent-filter>`;
if (!manifest.includes('android:scheme="app.genzwhatsapp"')) {
  manifest = manifest.replace('</activity>', `${deeplinkFilter}\n        </activity>`);
}
write(manifestPath, manifest);

if (fs.existsSync(stylesPath)) {
  let styles = read(stylesPath);
  styles = styles.replace(/#FFFFFF|#fff|#ffffff/gi, '#0b141a');
  if (!styles.includes('android:windowDisablePreview')) {
    styles = styles.replace(
      '</style>',
      '        <item name="android:windowDisablePreview">true</item>\n        <item name="android:windowBackground">@color/genzBackground</item>\n        <item name="android:navigationBarColor">@color/genzBackground</item>\n        <item name="android:statusBarColor">@color/genzBackground</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>\n    </style>'
    );
  }
  write(stylesPath, styles);
}

write(colorsPath, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#128C7E</color>
    <color name="colorPrimaryDark">#0b141a</color>
    <color name="colorAccent">#25D366</color>
    <color name="genzBackground">#0b141a</color>
    <color name="ic_launcher_background">#0b141a</color>
</resources>
`);

if (fs.existsSync(stringsPath)) {
  let strings = read(stringsPath);
  strings = strings.replace(/<string name="app_name">[^<]+<\/string>/, '<string name="app_name">GENZ WhatsApp</string>');
  if (!strings.includes('title_activity_main')) {
    strings = strings.replace('</resources>', '    <string name="title_activity_main">GENZ WhatsApp</string>\n</resources>');
  }
  write(stringsPath, strings);
}

write(networkPath, `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`);

const drawableDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'drawable');
ensureDir(drawableDir);
write(path.join(drawableDir, 'ic_stat_genz.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,2C6.48,2 2,6.48 2,12c0,1.85 0.5,3.58 1.36,5.07L2,22l4.93,-1.36C8.42,21.5 10.15,22 12,22c5.52,0 10,-4.48 10,-10S17.52,2 12,2zM17,15.5c-0.21,0.59 -1.23,1.13 -1.7,1.2c-0.45,0.07 -1.02,0.1 -1.65,-0.1c-0.96,-0.31 -2.18,-0.96 -3.75,-2.36c-1.85,-1.64 -3.04,-3.67 -3.22,-3.93C6.5,10.05 5.5,8.7 5.5,7.32c0,-1.36 0.69,-2.07 1.02,-2.36C6.7,4.79 7.02,4.68 7.33,4.68h0.7c0.23,0 0.53,-0.08 0.82,0.63c0.3,0.74 1.02,2.5 1.11,2.68c0.09,0.18 0.15,0.4 0.03,0.64c-0.12,0.24 -0.18,0.4 -0.36,0.61c-0.18,0.21 -0.38,0.47 -0.54,0.63c-0.18,0.18 -0.37,0.38 -0.16,0.74c0.21,0.36 0.93,1.54 2,2.5c1.38,1.23 2.54,1.61 2.9,1.79c0.36,0.18 0.57,0.15 0.78,-0.09c0.21,-0.24 0.9,-1.05 1.14,-1.41c0.24,-0.36 0.48,-0.3 0.81,-0.18c0.33,0.12 2.1,0.99 2.46,1.17c0.36,0.18 0.6,0.27 0.69,0.42C17.21,14.37 17.21,14.91 17,15.5z"/>
</vector>
`);

write(path.join(drawableDir, 'ic_launcher_foreground.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#25D366"
        android:pathData="M54,20c-18.78,0 -34,15.22 -34,34c0,6.29 1.7,12.17 4.62,17.24L20,88l16.76,-4.62C42.83,86.3 48.71,88 54,88c18.78,0 34,-15.22 34,-34S72.78,20 54,20z"/>
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M41,48h8c6,0 10,4 10,10s-4,10 -10,10h-8V48zM49,64c3.3,0 6,-2.7 6,-6s-2.7,-6 -6,-6h-2v12H49z"/>
</vector>
`);

const mipmapAny = path.join(androidRoot, 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26');
ensureDir(mipmapAny);
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`;
write(path.join(mipmapAny, 'ic_launcher.xml'), adaptive);
write(path.join(mipmapAny, 'ic_launcher_round.xml'), adaptive);

const kotlinCandidates = [
  path.join(androidRoot, 'app', 'src', 'main', 'java', 'app', 'genzwhatsapp', 'MainActivity.kt'),
  path.join(androidRoot, 'app', 'src', 'main', 'kotlin', 'app', 'genzwhatsapp', 'MainActivity.kt')
];
const javaCandidates = [
  path.join(androidRoot, 'app', 'src', 'main', 'java', 'app', 'genzwhatsapp', 'MainActivity.java')
];

const kotlinMain = `package app.genzwhatsapp

import android.os.Bundle
import android.view.View
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hardenWebView()
    }

    override fun onStart() {
        super.onStart()
        hardenWebView()
    }

    private fun hardenWebView() {
        window.decorView.overScrollMode = View.OVER_SCROLL_NEVER
        bridge?.webView?.let { webView ->
            webView.overScrollMode = View.OVER_SCROLL_NEVER
            webView.settings.builtInZoomControls = false
            webView.settings.displayZoomControls = false
            webView.settings.setSupportZoom(false)
            webView.isVerticalScrollBarEnabled = false
            webView.isHorizontalScrollBarEnabled = false
        }
    }
}
`;

const javaMain = `package app.genzwhatsapp;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hardenWebView();
    }

    @Override
    public void onStart() {
        super.onStart();
        hardenWebView();
    }

    private void hardenWebView() {
        getWindow().getDecorView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
            getBridge().getWebView().getSettings().setBuiltInZoomControls(false);
            getBridge().getWebView().getSettings().setDisplayZoomControls(false);
            getBridge().getWebView().getSettings().setSupportZoom(false);
            getBridge().getWebView().setVerticalScrollBarEnabled(false);
            getBridge().getWebView().setHorizontalScrollBarEnabled(false);
        }
    }
}
`;

const kotlinPath = kotlinCandidates.find((file) => fs.existsSync(file));
const javaPath = javaCandidates.find((file) => fs.existsSync(file));
if (kotlinPath) write(kotlinPath, kotlinMain);
else if (javaPath) write(javaPath, javaMain);
else {
  ensureDir(path.dirname(kotlinCandidates[0]));
  write(kotlinCandidates[0], kotlinMain);
}

console.log('Android native project patched for release signing, permissions, and WebView chrome.');
