# Kusakinisha GENZ WhatsApp APK kwenye Simu Halisi (Kiswahili)

Mwongozo huu unaelezea hatua kwa hatua jinsi ya kusakinisha
`frontend/public/genz-whatsapp.apk` (v1.1.11) kwenye **simu halisi ya Android**.
Kuna njia mbili: **file transfer** (rahisi zaidi) na **USB + ADB** (kwa developers).

> APK unayohitaji: `frontend/public/genz-whatsapp.apk` (uliyojenga) — au
> pakua moja kwa moja kutoka kwenye tovuti ya GENZ (`/genz-whatsapp.apk`).
> Hakuna download kupitia GitHub.

---

## Njia ya 1: File Transfer (Rahisi — hakuna kompyuta inahitajika zaidi)

Inafanya kazi kwa simu yoyote ya Android 8+.

1. **Tuma APK kwenye simu** — chagua moja:
   - **WhatsApp/Telegram kwako mwenyewe**: tuma file kwako na uipakue kwenye simu
     (Downloads / WhatsApp folder), AU
   - **Google Drive / OneDrive**: pakia APK, kisha uifungue kwenye simu kupitia
     app ya Drive, AU
   - **Cable ya USB**: unganisha simu kwenye kompyuta, chagua "File transfer"
     (MTP), na nakili `genz-whatsapp.apk` kwenye folder ya Downloads ya simu
2. **Fungua file** kwenye simu (bofya notification ya download au tembea
   Downloads → `genz-whatsapp.apk`).
3. Android itauliza: *"Do you want to install this app?"* → **Install**.
4. Kama Play Protect inaonya ("unrecognized app"):
   - Bofya **More details → Install anyway**, AU
   - Kwanza: **Settings → Apps → Chrome** (au file manager) → **Install unknown
     apps** → ruhusu chanzo hicho.
5. Subiri install ikamilike → **Open**.

> 💡 **Kidokezo**: Iwapo unafunga APK kwenye Chrome na haifunguki, weka kwenye
> folder ya `Download` na uifungue kupitia app ya **Files** (halisi ya Android).

---

## Njia ya 2: USB + ADB (Kwa Developers)

ADB (Android Debug Bridge) inakupa udhibiti kamili — muhimu kwa kujaribu
builds mbalimbali, kuangalia logcat, n.k.

### 1. Washa USB Debugging kwenye simu

1. Simu → **Settings → About phone** → bofya **Build number** mara **7**
   (utaona "You are now a developer!").
2. Rudi kwenye Settings → **System → Developer options** (au "Options for
   developers") → washa **USB debugging**.
3. Unganisha simu kwenye kompyuta kwa cable (chagua **File transfer** ikiwa
   inauliza).
4. Kwenye simu itatokea dialog *"Allow USB debugging?"* → chagua **Allow**
   (angalia "Always allow from this computer").

### 2. Hakikisha ADB inaona simu

Kwenye kompyuta (terminal ya `frontend/` au popote):

```bash
ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb"
"$ADB" devices
```

Unapaswa kuona simu yako kwenye list, k.m.:

```
List of devices attached
R58M1234567    device        ← "device" = iko tayari (sio "unauthorized")
```

Kama inaonyesha `unauthorized` → angalia dialog kwenye simu na Allow.

### 3. Sakinisha APK

```bash
"$ADB" install -r frontend/public/genz-whatsapp.apk
```

- `-r` = replace (inaboresha APK ya zamani bila kufuta data) — **data ya
  chats/settings inabaki** kwa muda mrefu kama signature ni ile ile.
- Kama inalalamika `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (signature ilibadilika
  — k.m. ulijaribu debug APK kwanza), futa ya zamani kwanza:
  ```bash
  "$ADB" uninstall com.benivanny.genzwhatsapp
  "$ADB" install frontend/public/genz-whatsapp.apk
  ```
  > ⚠️ Uninstall inafuta data yote ya app kwenye simu hiyo!

### 4. Fungua app

```bash
"$ADB" shell am start -n com.benivanny.genzwhatsapp/.MainActivity
```

Au fungua kwa mkono kwenye simu (icon ya GENZ).

### 5. Kuona logcat (ikiwa kuna tatizo)

```bash
"$ADB" logcat -d | grep -iE "genz|crash|AndroidRuntime|chromium" | tail -50
```

---

## Thibitisha checksum (hiari — usalama)

Thibitisha APK uliyopakua ni ile ile iliyojengwa (checksum iko kwenye
`frontend/public/version.json`):

```bash
certutil -hashfile frontend/public/genz-whatsapp.apk SHA256   # Windows
# Au kwenye simu: funga GENZ → login page → kitufe cha "Verify checksum" →
# chagua APK uliyopakua → inapaswa kuonyesha ✓ MATCH
```

---

## Troubleshooting

| Tatizo | Suluhisho |
|---|---|
| "Install blocked" / Play Protect inazuia | Settings → Apps → Chrome/Files → Install unknown apps → washa; kisha Install anyway |
| `unauthorized` kwenye `adb devices` | Fungua dialog kwenye simu → Allow; kama haionekani, ondoa cable na jaribu tena |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Signature hailingani (debug vs release) → `adb uninstall` kisha `install` tena |
| App inafunguka lakini login inashindwa | APK inaelekeza kwenye Render (`https://genz-whatsapp.onrender.com/api`) — kama Render iko down, subiri irekebishwe (tazama `docs/MWONGOZO_APK_NA_DEPLOY.md` Sehemu ya 6) |
| Fingerprint haijitokeza | Simu → Settings → Security → Fingerprint — lazima uweke angalau fingerprint moja; kwenye app: Settings → App Lock → chagua Fingerprint |
