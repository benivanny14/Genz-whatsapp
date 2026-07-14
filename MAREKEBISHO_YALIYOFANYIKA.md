# Marekebisho Yaliyofanyika — GENZ WhatsApp

Hii ni taarifa ya kile ambacho kimekaguliwa na kurekebishwa kwenye mradi wako,
kwa kusoma code halisi (siyo makisio) — kila tatizo lililoorodheshwa hapa
lilikuwa tatizo la kweli lililopatikana kwenye faili za mradi.

## 1. Group Features (zilizokuwa hazifanani na WhatsApp)

**Tatizo kuu lililogundulika:** Kazi mbili muhimu za "Group permissions" kwenye
`ChatContext.jsx` zilikuwa ni **stub tupu** — hazikuwa zikifanya kazi yoyote:

```js
const toggleAdminOnlyMessaging = () => { };   // haikufanya kazi yoyote
const updateGroupPermission = () => { };      // haikufanya kazi yoyote
```

Hii ndiyo sababu ukibadilisha "Edit group settings" au "Send messages" kwenye
Group Info, hakuna kilichobadilika — vitufe vilikuwa vya mapambo tu.

**Yaliyorekebishwa:**
- `updateGroupPermission` na `toggleAdminOnlyMessaging` sasa zinatuma ombi la
  kweli kwenda backend (`PUT /chat/groups/:groupId/info`) na kuhifadhi
  mabadiliko kwenye database.
- Backend (`chatController.js` → `updateGroupInfo`) sasa inapokea na
  kuhifadhi: `adminOnlyMessaging`, `canSendMedia`, `canCreatePolls`,
  `canChangeGroupInfo` — kabla haikupokea fields hizi kabisa.
- Sheria sahihi za ruhusa zimewekwa: permissions zinabadilishwa na admin
  pekee; lakini jina/maelezo/picha ya group inaweza kubadilishwa na
  mwanachama yeyote IKIWA admin amefungua ruhusa ya "Edit group settings"
  kwa wote — kama WhatsApp halisi.
- `getGroupInfo` (backend) sasa inarudisha `canChangeGroupInfo` na
  `disappearingMessages` — kabla data hizi hazikutumwa kabisa kwenda
  frontend, hivyo skrini ilikuwa inaonyesha "Off" / hali isiyo sahihi kila
  wakati.
- Mabadiliko ya group settings sasa yanatumwa **real-time kwa wanachama
  wote** wa group (socket event `group:settings:updated`), kama WhatsApp —
  kabla hakuna chochote kilichokuwa kikiwafikia wanachama wengine papo hapo.

**Vitufe vilivyokuwa havifanyi kazi kwenye "Group info" screen, sasa
vinafanya kazi:**
- **Badilisha picha ya group** — kabla kuonyesha icon tu bila utendaji wowote;
  sasa admin anabofya picha → anachagua picha → inapakiwa → inahifadhiwa.
- **Mute notifications** — kabla ilikuwa "ON" daima bila kujali hali halisi;
  sasa inaonyesha hali sahihi na inafanya kazi.
- **Disappearing messages** — kabla ilikuwa maandishi tu bila la kubofya;
  sasa kubofya kunafungua chaguo (Off / 24 hours / 7 days / 90 days) kama
  WhatsApp.
- **Media, links and docs** — kabla ilionyesha "0" bila kufanya kazi; sasa
  inafungua ukurasa wa media halisi wa mazungumzo hayo.
- Permission toggles (Edit group settings / Send messages) sasa
  zinabadilika papo hapo unapozibofya na zinahifadhiwa kwenye database.

## 2. Tatizo la Simu (WebRTC) — Hitilafu kwenye logs zako

Kwenye logs ulizoshare nilikuta hitilafu hii halisi:

```
InvalidAccessError: Failed to execute 'setLocalDescription' ...
The order of m-lines in subsequent offer doesn't match order from previous offer/answer.
```

**Chanzo cha tatizo:** Faili `webrtc.js` ilikuwa ikitumia njia mbili tofauti
za kutengeneza "offer" ya simu — moja yenye options za zamani
(`offerToReceiveAudio`/`offerToReceiveVideo`) kwa simu ya kwanza, na nyingine
bila options kwa renegotiation (mfano: ukibadilisha kamera kati ya simu).
Mchanganyiko huu unasababisha mpangilio wa audio/video "m-lines" kutofautiana
kati ya simu ya kwanza na renegotiation — ndiyo sababu simu zilikuwa
zikikatika au kuwa na matatizo ya muunganiko kati kati ya mazungumzo.

**Imerekebishwa:** Sasa njia moja tu (thabiti) inatumika kila wakati kutengeneza
"offer", sawa na inavyofanyika kwenye GroupCallScreen (ambayo tayari ilikuwa
sahihi). Hii inaondoa kabisa hitilafu ya m-line mismatch.

## 3. PWA — Kuweza kuinstall kupitia Chrome kama App

**Tatizo lililogundulika:** `manifest.json`, `service-worker.js`, na icons
zote zilikuwepo tayari kwenye mradi (kazi nzuri iliyokuwa imefanyika kabla!)
— LAKINI `index.html` haikuwa na `<link rel="manifest">` wala meta tags za
PWA. Bila hiyo link, Chrome/Android na Safari/iOS haziwezi kumtambua mfumo
kama "installable app", hivyo kitufe cha "Install App" / "Add to Home
Screen" hakikuonekana kamwe.

**Imerekebishwa:** `frontend/index.html` sasa ina:
- `<link rel="manifest" href="/manifest.json">`
- `<meta name="theme-color">`
- `apple-touch-icon` kwa ajili ya iPhone
- meta tags za `apple-mobile-web-app-capable` / `mobile-web-app-capable`

Baada ya kujenga (`npm run build`) na kupandisha (deploy) upya, mtumiaji
ataona kitufe cha "Install" kwenye address bar ya Chrome (desktop) au chaguo
la "Add to Home Screen" kwenye simu, na app itafunguka kama app halisi
(standalone, bila address bar).

## Hatua zinazopendekezwa kuendelea (follow-up)

Hii ni mradi mkubwa (zaidi ya MB 4 za code, backend kamili + frontend +
E2EE + calls + sockets). Niliyofanya hapo juu ni marekebisho ya kweli
niliyoyapata kwa kusoma code halisi — siyo orodha ya jumla. Kwa hatua
inayofuata, napendekeza:

1. **Jenga upya na upandishe (deploy)** mradi — backend na frontend —
   kwenye Render, kisha ujaribu vitendo vilivyotajwa hapo juu live.
2. Niambie matokeo / hitilafu zozote zinazoonekana baada ya deploy, ili
   niendelee kukagua na kurekebisha sehemu nyingine (mfano: group call
   screen kwa undani zaidi, broadcast lists, status/stories, n.k.)
3. Kama una console log nyingine za hitilafu baada ya hili, zinitumie —
   ndiyo njia ya haraka zaidi ya kupata na kurekebisha matatizo halisi
   badala ya kukagua faili zote elfu moja kwa moja.
