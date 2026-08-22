# Manual QA Checklist — GENZ Messenger APK

Kagua kila kipengele kwa mikono kwenye APK halisi. Kwa kila hatua, andika:
- ✅ = Imefanya kazi
- ❌ = Haifanyi kazi (andika screenshot + console error)
- ⚠️ = Inafanya kazi vibaya (andika maelezo)

---

## 1. Unread Message Count

**Lengo**: Hakikisha badge inaondoka unaposoma ujumbe

### Hatua:
1. Tumia account **A** (simu 1) na account **B** (simu 2)
2. Kutoka A, tuma ujumbe 3 kwenda B
3. Angalia B — kuna badge nyekundu kwenye chat list (juu ya "Chats" tab)
4. **Fungua** chat ya B
5. Soma ujumbe wote 3
6. **Rudi** kwenye orodha ya chats (bonyeza Back)
7. Angalia badge — **lazima ipomea**

### Angalia pia:
- [ ] Badge inaondoka kwenye chat list (sidebar)
- [ ] Badge ya WINGA tab haionyeshi unread ya chat (siyo ya WINGA sends)
- [ ] App icon badge (kama inashikilia) — ni ngumu kuthibitisha, lakini jaribu

---

## 2. Message Delivery Real-Time

**Lengo**: Ujumbe unafika haraka (linganisha na WhatsApp)

### Hatua:
1. Weka simu 2 zote online (WiFi moja)
2. Kutoka A, tuma "Habari" — pima muda kabla ya kuonekana kwenye B
3. Kutoka B, jibu "Poa" — pima muda kabla ya kuonekana kwenye A
4. Tuma picha kutoka A — pima muda
5. Tuma voice note kutoka A — pima muda
6. Tuma sticker kutoka A — pima muda

### Viwango:
| Aina ya Ujumbe | Muda unaokubalika | WhatsApp Reference |
|---|---|---|
| Text | < 2 seconds | ~1s |
| Image | < 5 seconds | ~2-3s |
| Voice note | < 5 seconds | ~2-3s |
| Sticker | < 3 seconds | ~1-2s |

- [ ] Text delivery < 2s
- [ ] Image delivery < 5s
- [ ] Voice note delivery < 5s
- [ ] Sticker delivery < 3s
- [ ] "Sending" (clock icon) inaonekana kabla ya "Sent" (✓)
- [ ] "Sent" (✓) inabadilika kuwa "Delivered" (✓✓) haraka

---

## 3. Status Video + Trim

**Lengo**: Video inacheza baada ya kupost na trim inafanya kazi

### Hatua:
1. Bonyeza **Status** tab
2. Bonyeza **+** (Add status)
3. Chagua **Video** kutoka gallery
4. Angalia preview — video inaonekana na ina play?
5. Bonyeza **Video Tools** (scissors icon)
6. **Sogeza** handle ya kushoto (start) kwenda kulia — video ya msingi inapungua?
7. **Sogeza** handle ya kulia (end) kwanda kushoto — video ya mwisho inapungua?
8. Bonyeza **Play** — inacheza sehemu iliyochaguliwa?
9. Bonyeza **Trim Video** — inatengeneza video mpya?
10. Bonyeza **Apply** — status inapost?

### Angalia pia:
- [ ] Video thumbnail inaonekana kwenye status feed
- [ ] Video inaplay unapoibonyeza
- [ ] Audio ya video **inabaki** baada ya trim (hatari kwenye browser/WebView)
- [ ] Duraction ya video iliyotrimmed ni sahihi

---

## 4. Music kwenye Status

**Lengo**: Muziki unachaguliwa na unatumika kwenye status

### Hatua:
1. Bonyeza **Status** → **+**
2. Chagua **Music** aina ya status
3. Bonyeza **Add Music**
4. Chagua faili la muziki kutoka kwenye kifaa
5. Angalia — muziki unaonekana kwenye player?
6. Bonyeza **Play** — unaisikia?
7. Sogeza sliders (start/end) — trim inafanya kazi?
8. Bonyeza **Kata Wimbo** — unatumika?
9. Bonyeza **Post** — status inapost?

### Angalia pia:
- [ ] Muziki unacheza kwenye status ya mtu mwingine
- [ ] Volume slider inafanya kazi
- [ ] Unaweza kuondoa muziki (Remove Music button)
- [ ] Faili kubwa la muziki (>5MB) linashughulikiwa vizuri

---

## 5. Sticker ya Kujitengeneza

**Lengo**: Sticker inaonekana kabla ya kutuma

### Hatua:
1. Fungua chat
2. Bonyeza attachment icon (📎)
3. Chagua **Stickers**
4. Tengeneza sticker mpya kutoka kwenye media ya kifaa
5. Angalia preview — sticker inaonekana? (si blank)
6. Bonyeza **Send**

### Angalia pia:
- [ ] Sticker inaonekana kama sticker (si blank) kabla ya send
- [ ] Sticker inaonekana kwenye chat ya mpokeaji
- [ ] Sticker haivunji layout ya chat

---

## 6. Voice Recording (Kwa mkono)

**Lengo**: Recording inafanya kazi na sauti ni safi

### Hatua:
1. Fungua chat
2. **Shikilia** mic button (si kubonyeza tu)
3. Sogeza juu (lock mode) — recording inaendelea bila kushikilia?
4. Bonyeza **Stop** — preview inaonekana?
5. Bonyeza **Play** kwenye preview — unaisikia sauti?
6. Bonyeza **Send**

### Test Errors:
7. **Kata ruhusa ya microphone** kwenye Settings za simu
8. Jaribu kurekodi tena — ujumbe unaonekana unavyosema "Nenda kwenye Settings"? (sio file picker!)
9. **Rudisha** ruhusa ya microphone
10. Jaribu tena — inafanya kazi?

### Angalia pia:
- [ ] Duration inaonyesha (mm:ss)
- [ ] Waveform inaonekana wakati wa recording
- [ ] Voice note inaonekana kama audio bubble (sio text)
- [ ] Voice note inacheza kwenye simu ya mpokeaji

---

## 7. Bottom Navigation

**Lengo**: Tab zote 5 zinaonekana na zinafanya kazi

### Hatua:
1. Angalia chini ya screen — kuna tabs 5: Chats, Status, Communities, WINGA, Me
2. Bonyeza kila tab moja — inafungua?
3. Tab iliyochaguliwa ina green color?
4. **Tab ya Chats** — haionekani kwenye landing page/login
5. **Tab ya Status** — haionekani kwenye landing page/login

### Angalia pia:
- [ ] Bottom nav haionyeshi kwenye /, /login, /register
- [ ] Safe area padding (notch) — haifichi tab za chini

---

## 8. Notifications (Mfumo mzima)

**Lengo**: Notification inafika mtumiaji anapo/exhibit app

### Hatua:
1. Weka simu 2 online
2. Kutoka A, fungua chat ya B
3. Kutoka B, fungua app (login)
4. **Funga** app B kabisa (swipe away)
5. Kutoka A, tuma ujumbe kwenda B
6. Angalia simu B — notification inaonekana? (system notification)

### Angalia pia:
- [ ] Notification inaonyesha jina la mtumaji
- [ ] Notification inaonyesha preview ya ujumbe
- [ ] Bonyeza notification — inafungua chat sahihi
- [ ] Kwenye app, in-app toast inaonekana

---

## 9. Chat UI kwenye Simu

**Lengo**: Chat yote inafit vizuri kwenye screen ya simu

### Hatua:
1. Fungua chat yenye ujumbe mwingi
2. Scroll chini na juu — smooth?
3. Tuma ujumbe mrefu — haipaswi kuvunja layout
4. Tuma picha — inaonekana vizuri?
5. Tuma sticker — haipaswi kuzidisha screen
6. Tuma location — map inaonekana?
7. Tuma contact card — inaonekana vizuri?
8. Reply ujumbe — quoted message inaonekana?

### Angalia pia:
- [ ] Send button (绿色) inaonekana wakati wa kuandika
- [ ] Input field haipaswi kufichwa na keyboard
- [ ] Message bubbles haizidi screen width
- [ ] Timestamp inaonekana kwa kila ujumbe

---

## 10. Biometric / App Lock

**Lengo**: Fingerprint/Face ID inafungua app

### Hatua:
1. Nenda **Settings** → **Security**
2. Bonyeza **Enable Fingerprint Lock**
3. Thibitisha kwa fingerprint
4. **Funga** app kabisa
5. **Fungua** app — inakulazimisha fingerprint?
6. Thibitisha — inafungua app?

### Angalia pia:
- [ ] Mharusi wa fingerprint unafungua app
- [ ] Kujaribu mara 3 bila mafanikio — inakataa?
- [ ] Disable Lock — inafanya kazi?

---

## 11. Video Trimmer kwenye Status

**Lengo**: Trim handles zinafanya kazi kama WhatsApp

### Hatua:
1. Post video status (kama hatua ya 3 hapo)
2. Bonyeza **Trim** (scissors)
3. Angalia timeline — kuna handles 2 (kijani)
4. **Shikilia** handle ya kushoto na **suage** kulia — start time inabadilika?
5. **Shikilia** handle ya kulia na **suage** kushoto — end time inabadilika?
6. Bonyeza **Play** — inacheza sehemu iliyochaguliwa tu?
7. Duration ya trim inaonekana sahihi?

### Angalia pia:
- [ ] Handles zinawekwa kwa left/right (si overlapping)
- [ ] Unaweza ku-seek (bonyeza start/end time labels)
- [ ] Reset button inarejesha duration kamili
- [ ] Music overlay inachanganywa na audio ya video

---

## 12. Button Text Overflow

**Lengo**: Maneno ya buttons hayapitilizi screen

### Hatua:
1. Angalia buttons zote kwenye app kwa screen ya simu (360px)
2. Hasa: Settings, Login, Register, Status page
3. Kila button — text inaonekana kamili? Haipaswi kuwa truncated bila sababu?

### Angalia pia:
- [ ] Login page buttons zote zinaonekana
- [ ] Register page — password strength indicator haivunji layout
- [ ] Status page header — buttons zote zinaonekana (hazipaswi kuzidi screen)
- [ ] Attachment menu grid — icons + labels zote zinaonekana

---

## Jinsi ya Kupata Console Errors kwenye APK

1. Weka simu kwa **USB debugging mode**
2. Fungua **Chrome** kwenye kompyuta
3. Andika **chrome://inspect** kwenye address bar
4. Chagua **WebView** ya GENZ app
5. Fungua **Console** tab
6. Tazama errors zozote (red)

---

## Hitimisho

Baada ya kila test, jaza meza hii:

| # | Kipengele | Matokeo | Screenshot | Console Errors |
|---|-----------|---------|------------|----------------|
| 1 | Unread count | | | |
| 2 | Real-time delivery | | | |
| 3 | Status video + trim | | | |
| 4 | Music kwenye status | | | |
| 5 | Custom sticker | | | |
| 6 | Voice recording | | | |
| 7 | Bottom navigation | | | |
| 8 | Notifications | | | |
| 9 | Chat UI mobile | | | |
| 10 | Biometric lock | | | |
| 11 | Video trimmer | | | |
| 12 | Button text overflow | | | |
