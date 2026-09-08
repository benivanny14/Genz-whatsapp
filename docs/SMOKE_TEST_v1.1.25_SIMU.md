# Smoke Test v1.1.25 kwenye Simu Halisi (Kiswahili)

Checklist hii inaangalia kila kitu kilichorekebishwa/kuthibitishwa kwenye
**v1.1.25 (versionCode 28)** kwa kutumia **simu halisi ya Android** — sio
emulator. Ikimaliza yote bila tatizo, mfumo uko tayari kwa users.

> APK ya kusakinisha: pakua kutoka kwenye site (banner ya update) au
> `frontend/public/genz-whatsapp.apk` (sha256 inayofaa:
> `18f17a2cffbc0f0d7baa409111ea546d80d3054739ca05b25d33f52f09c6f090`).
> Usifute app iliyopo — `install -r` huhifadhi data na messages.

---

## 1. Update kutoka v1.1.24 → v1.1.25 (users waliopo)

- [ ] Simu iliyo na **v1.1.24 (code 27)** inafungua app → **banner "Update available
      v1.1.25" inaonekana** (kwenye login page / settings) bila kufanya chochote.
- [ ] Kubofya banner kunafungua download ya APK kutoka kwenye site.
- [ ] Baada ya download, `install -r` inapita bila "App not installed" (versionCode
      imeongezeka 27→28).
- [ ] App inafunguka, **data zote (messages, chats, account) zimebaki**.

## 2. App Lock / Fingerprint (kama TM WhatsApp)

- [ ] GENZ Settings (⚡) → Theme tab → **Enable App Lock** → chagua **Fingerprint**.
- [ ] Funga app kabisa (swipe away) → fungua upya → **LockScreen inaonekana**
      ("Checking fingerprint...").
- [ ] **Native prompt ya Android inaonekana** (kifaa kinatumia fingerprint ya
      **lock screen yako halisi**).
- [ ] Kugusa fingerprint → **app inafunguka moja kwa moja** (sio PIN fallback).
- [ ] Background → resume → prompt ya fingerprint inaonekana tena; kufuta
      (cancel) → app haifunguki kikamilifu (inabaki imefungwa).

## 3. Font ya message (TM WhatsApp style)

- [ ] Tumia **mtumiaji asiye-premium**: fungua chat → format menu → **Change font**
      → chagua **Georgia** (au Comic Sans) → tuma message.
- [ ] **Mpokeaji** (simu nyingine) anaona message hiyo kwa **font ile ile** — sio
      font default.
- [ ] Stored message (server) ina font sahihi — kifungua chat kwa mtumaji na
      angalia bubble ina font iliyochaguliwa.

## 4. Status (video, picha, voice, location)

- [ ] **Picha status** — inaonekana kwa contacts (privacy default = contacts).
- [ ] **Video status** — inacheza kwa mpokeaji; **music/sauti inasikika**.
- [ ] **Voice status** — inachezwa.
- [ ] **Location status** — inafungua ramani.

## 5. Winga (bidhaa kwa video na picha)

- [ ] Fungua tab ya **Winga** → tengeneza listing → ongeza **picha + video**.
- [ ] Listing inachapishwa; thumbnails (picha + video) zinaonekana kwenye grid.
- [ ] Video thumbnail inacheza preview; kufungua listing kunaelekeza kwa media.

## 6. Voice message

- [ ] Rekodi voice note → tuma → mpokeaji anaona bubble ya voice na **inaweza
      kuchezwa** (play button, waveform, duration).
- [ ] Sauti inacheza kwa ubora wa kawaida.

## 7. Emoji / Stickers kwenye keyboard

- [ ] Emoji zinatoka kwenye keyboard ya simu kama WhatsApp (katika chat input).
- [ ] Sticker panel inafunguka na stickers zinatuma.

## 8. Anti-Screenshot (antiScreenshot mod)

- [ ] GENZ Settings → Privacy → washa **Anti-Screenshot**.
- [ ] Jaribu `screenshot` kwenye chat → **imezuiwa** (blank/black).
- [ ] Jaribu **screen record** → pia inazuiwa.

## 9. View-once (ulinzi kamili)

- [ ] Tumia message ya **view-once** (picha/video) → inafunguka mara moja tu.
- [ ] **Screenshot kwenye view-once → imezuiwa**.
- [ ] **Screen record kwenye view-once → imezuiwa** (kama WhatsApp).
- [ ] Baada ya kuifungua, haiwezi kuonekana tena.

## 10. Kila kitu kingine cha haraka

- [ ] Login page inaonyesha **"Genz Messenger Android v1.1.25"**.
- [ ] Kuandika message, kutuma picha, kupokea messages — zinafanya kazi kwa
      kasi ya kawaida (server: `https://genz-whatsapp.onrender.com`).
- [ ] Offline (Airplane mode) → app bado inafunguka (chats za mwisho).

---

> Ukigundua tatizo lolote: andika kwenye GitHub issue (label `prod-health` au
> `bug`) au kwenye sehemu ya Troubleshooting ya `docs/KUSAKINISHA_APK_SIMU.md`.
> Matokeo ya check hii (kila checkbox) yapendekezwa kuripotiwa kwa mimi ili
> nirekebishe chochote kinachoshindikana.