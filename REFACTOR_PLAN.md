# REFACTOR_PLAN.md — Controller consolidation

Audit ya controllers 74 za backend iligundua **logic inayorudiwa** kwenye controllers nyingi
zinazoshughulikia "MODs" za mtumiaji. Hii ni mpango wa kuunganisha bila kubadilisha
**API contract ya nje** (`/api/...` route paths hazibadiliki kamwe — refactor ni ya ndani tu:
shared services/helpers na consolidation ya controllers).

---

## Kanuni za refactor (zisizobadilika)

1. **Route paths za nje hazibadiliki** — `/api/chat-filter/...`, `/api/chat-sort/...`, n.k.
   zinaendelea kufanya kazi kama zilivyo. Frontend haioni mabadiliko yoyote.
2. **Majina ya exported handlers hayabadiliki** — routes zinaendelea ku-destructure
   majina yale yale (mfano `filterConversations`, `sortConversations`).
3. **Refactor ni ya ndani tu** — mabadiliko yote ni kwenye `controllers/`, `services/`,
   na `routes/` (import statements pekee).
4. **Kila merge inathibitishwa na tests** — suite ya backend inaendelea kupita
   (192 tests) baada ya kila hatua.

---

## ✅ Proof-of-concept (imefanyika): `chatFilterController` + `chatSortController` → `chatOrganizationController`

### Tatizo
- `chatFilterController.js` na `chatSortController.js` zilikuwa na **karibu boilerplate
  sawa kabisa**: `getUser()` (User lookup + 401), `mergeSettings()` (defaults merge),
  `getChatFilterSettings`/`getChatSortSettings` (sawa isipokuwa jina la field),
  `update...Settings`, `toggle...`, `reset...Settings`, na query ya
  `Conversation.find({ participants: user._id }).populate('participants', ...)`.
- Mantiki ya filter (type/status/time) ilikuwa imerudiwa **mara 2** ndani ya
  `chatFilterController` yenyewe (`filterConversations` + `applySavedFilterPreference`).

### Kitu kilichofanyika
- **`backend/controllers/chatOrganizationController.js`** (mpya): controller moja yenye
  handlers zote za filter + sort, na helpers za pamoja:
  - `getUser(req, res)` — moja badala ya mbili
  - `mergeSettings(defaults, settings)` — moja badala ya mbili
  - `getUserConversations(userId)` — query moja ya pamoja
  - `applyChatFilters(conversations, {type, status, time})` — mantiki ya filter ikiwa
    **moja** (ilitumika mara mbili)
  - `applyChatSort(conversations, sortMethod, isAscending, settings)` — mantiki ya sort
- **`backend/routes/chat-filter.js`** na **`backend/routes/chat-sort.js`**: sasa zina-require
  kutoka `chatOrganizationController` (majina ya handlers na route paths **zimebaki sawa**).
- **`chatFilterController.js` + `chatSortController.js`**: zimefutwa (hakuna kitu kingine
  kilichokuwa kikizirequire).

### Matokeo
- Faili 2 + boilerplate maradufu → faili 1.
- Mantiki ya filter imekuwa single-source-of-truth (bug za future zinatengenezwa mara moja).
- Hakuna mabadiliko ya API: `/api/chat-filter/*` na `/api/chat-sort/*` zinafanya kazi kama awali.

### Bug iliyogunduliwa wakati wa merge
- Kwenye `chatSortController.sortConversations`, case ya `'archived'` ilikuwa na typo:
  `return isAscending ? archivedA - archivedB : archivedA - archivedB` — **branches zote
  mbili zilikuwa sawa** (sort ya ascending pekee). Kwenye `chatOrganizationController`
  hii imerekebishwa kwa `applyChatSort` (descending sasa inafanya kazi kweli).
  Hii ni mabadiliko madogo ya tabia yaliyokusudiwa (bug fix), si breaking change.

---

## Hatua zinazofuata (zinazopendekezwa — zinasubiri idhini)

### 1. ✅ `chatListModsController` + `chatSearchController` + `chatFoldersController` → `chatListController`

#### Tatizo
- Controllers tatu zilikuwa na `getUser()`/`mergeSettings()` sawa na settings
  get/update handlers zilizofanana.
- `chatListModsController` ilikuwa na toggles 8 zinazofanana kabisa (tofauti ni
  jina la field tu).

#### Kitu kilichofanyika
- **`backend/controllers/chatListController.js`** (mpya): controllers tatu zimeunganishwa
  katika moja, na helpers za pamoja:
  - `getUser`, `mergeSettings(defaults, settings)` — moja badala ya tatu
  - `toggleListModsField(req, res, field, logLabel)` — toggles 8 za chat-list-mods
    sasa ni nakala moja ya generic
  - `buildSearchRegex(query, settings)` — mantiki ya regex ya search (ilirudiwa
    mara 3 kwenye `chatSearchController`)
  - `decorateFolderWithChats(user, folder)` — ilirudiwa kwenye `getChatFolders` +
    `getChatFolder`
- **Routes** (`chat-list-mods.js`, `chat-search.js`, `chat-folders.js`): sasa zina-require
  kutoka `chatListController` — route paths zimebaki sawa (10 + 10 + 12 = 32 routes).
- Controllers 3 za zamani zimefutwa (routes pekee ndizo zilizokuwa zikizirequire).

#### Matokeo
- Faili 3 → 1; boilerplate maradufu imeondolewa. Hakuna mabadiliko ya API.
- Tests: **214/214 zinapita**.

### 2. ✅ `mediaModsController` + `mediaCompressorController` + `mediaEditorController` → `mediaToolsController`

#### Tatizo
- Controllers tatu zilikuwa na boilerplate sawa kabisa: `getUser()`, `mergeSettings()`,
  na settings get/update handlers zilizofanana (isipokuwa jina la field kwenye User).
- `mediaModsController` ilikuwa na **toggles 8 zinazofanana kabisa** — kila moja ilikuwa
  nakala ya ile nyingine (tofauti ni jina la field tu).
- `mediaEditorController` ilikuwa na **edit handlers 3 karibu sawa** (`editImage`/
  `editVideo`/`editAudio`) — kila moja ilirudia mantiki ya validation, enabled check,
  na auto-save edit history.

#### Kitu kilichofanyika
- **`backend/controllers/mediaToolsController.js`** (mpya): controllers tatu zimeunganishwa
  katika moja, na helpers za pamoja:
  - `getUser(req, res)` — moja badala ya tatu
  - `mergeSettings(defaults, settings)` — moja badala ya tatu
  - `toggleModsField(req, res, field, logLabel)` — **toggles 8 za media-mods sasa ni
    nakala moja ya generic** (hazirudii tena)
  - `editMedia(req, res, {type, enabledField, logLabel, clientNote})` — **edit handlers
    3 za editor sasa ni nakala moja ya generic**
- **`backend/routes/media-mods.js`**, **`media-compressor.js`**, **`media-editor.js`**:
  sasa zina-require kutoka `mediaToolsController` — majina ya handlers na route paths
  **zimebaki sawa kabisa** (24 routes: 10 mods + 5 compressor + 9 editor).
- **`mediaModsController.js` + `mediaCompressorController.js` + `mediaEditorController.js`**:
  zimefutwa (routes pekee ndizo zilizokuwa zikizirequire).

#### Matokeo
- Faili 3 + boilerplate maradufu → faili 1 (~350 lines ndogo kuliko jumla ya 3 za awali).
- Toggles 8 na edit handlers 3 sasa ni single-source-of-truth.
- Hakuna mabadiliko ya API: `/api/media-mods/*`, `/api/media-compressor/*`,
  `/api/media-editor/*` zinafanya kazi kama awali. Tests: **192/192 zinapita**.
- **UPDATE:** mock implementations zimebadilishwa kuwa real — `compressMedia` na
  editor handlers sasa zinatumia `services/mediaProcessingService.js` (sharp kwa
  images, ffmpeg kwa video/audio; download → process → re-upload kupitia
  `config/cloudinary.uploadFile`). `getCompressionStats` sasa inarudisha per-user
  stats halisi zilizokusanywa na `compressMedia`. Verified end-to-end:
  `scripts/verify-media-service.js` (1.3MB → 262KB, 80%).

### 3. ✅ `securityController` + `securityModsController` → `securityController` (moja)

#### Tatizo
- `securityController` (2FA + security settings) na `securityModsController` (security
  MODs) zilikuwa na `getUser`/`requireUser` na `mergeSettings` sawa; MODs ilikuwa na
  toggles 10 zinazofanana kabisa.
- Maelezo muhimu: zote mbili ni **user-level** (zinalindwa na `protect` middleware,
  sio `superAdminAuth`) — kwa hiyo kuunganisha hakuchanganyi auth levels.

#### Kitu kilichofanyika
- **`backend/controllers/securityController.js`** (iliyounganishwa): 2FA handlers +
  security settings + security MODs handlers zote katika faili moja:
  - `requireUser` moja (iliyochukuliwa kutoka securityController — pia inaangalia
    `req.user?._id` kabla ya User lookup, sawa na getUser ya MODs)
  - `mergeSettings(defaults, settings)` moja
  - `toggleModsField(req, res, field, logLabel)` — toggles 10 za MODs sasa ni nakala
    moja ya generic
- **Routes**: `securityRoutes.js` (tayari ili-point kwa `securityController`) na
  `security-mods.js` (sasa ina-point kwa `securityController`). Route paths zimebaki
  sawa (8 + 14 = 22 routes).
- **`securityModsController.js`** imefutwa (routes pekee ndizo zilizokuwa zikizirequire).

#### Matokeo
- Faili 2 → 1; toggles 10 sasa ni single-source-of-truth. Hakuna mabadiliko ya API.
- Tests: **214/214 zinapita**.

### 4. ✅ `settingsController` + `customizationModsController` + `themeEngineController` → `userSettingsController`

#### Tatizo
- Controllers tatu zilikuwa na `getUser`/`mergeSettings` sawa; customization MODs ilikuwa
  na toggles 8 zinazofanana kabisa; theme engine ilikuwa na handlers nyingi za update
  zilizofanana (font/mode/colors/UI — zote zinafanya `getUser` → merge → `save`).

#### Kitu kilichofanyika
- **`backend/controllers/userSettingsController.js`** (mpya): controllers tatu zimeunganishwa:
  - `getUser` + `mergeSettings(defaults, settings)` — moja badala ya tatu
  - `toggleCustomizationField` — toggles 8 za customization sasa ni nakala moja ya generic
  - Settings handlers za `/api/settings` (getSettings/updateSettings/resetSettings)
    zimebaki na tabia yao ya awali (404 kwa user missing, mergeWhatsAppSettings)
- **Routes** (`settingsRoutes.js`, `customization-mods.js`, `theme-engine.js`): sasa
  zina-require kutoka `userSettingsController` — route paths zimebaki sawa (3 + 10 + 10 = 23 routes).
- Controllers 3 za zamani zimefutwa (routes pekee ndizo zilizokuwa zikizirequire).

#### Matokeo
- Faili 3 → 1; hakuna mabadiliko ya API. Tests: **261/261 zinapita**.

### 5. ✅ Shared user-scoped service + merges za group/message (zimefanyika)

#### `services/userScopedService.js` (mpya)
- `getUser(req, res)` + `mergeSettings(defaults, settings)` + `createSettingsMerger(defaults)`
  — zimetolewa kwenye service moja.
- Controllers **32 zilibadilishwa** kutumia service (kila moja ilipoteza ~8 lines za
  `getUser` + `mergeSettings` local) — boilerplate ~**400 lines imeondolewa**.
- `User` require isiyotumika imeondolewa kwenye controllers 29.

#### `groupToolsController.js` (mpya) — groupFeatures + groupMods
- Toggles 8 za group-mods → `toggleModsField` generic; toggles 5 za group-features
  (zinazokubali `{ enabled }`) → `toggleFeaturesField` generic.
- Routes 22 (14 features + 8 mods) zimebaki sawa; controllers 2 za zamani zimefutwa.

#### `messageToolsController.js` (mpya) — messageMods + messageTranslator
- Toggles 8 za message-mods → `toggleModsField` generic.
- Routes 16 (9 mods + 7 translator) zimebaki sawa; controllers 2 za zamani zimefutwa.

#### Verification
- `node scripts/check-syntax.js`: 250 files OK; jest: **261/261 tests zinapita**.
- Feature smoke test dhidi ya temp server (SMOKE_BASE_URL): **137 passed, 0 failed**
  (script sasa inaunga mkono `SMOKE_BASE_URL` env kwa kujaribu dhidi ya temp server).

### 6. 🧭 Scan ya duplicates iliyobaki (imefanyika)

`grep -l "const getUser = async (req, res)" controllers/*.js` → **controllers 33** bado zina
nakala ya `getUser` (na ~34 zina `mergeSettings`), zikiwemo:

- **MODs-style controllers zilizofanana na zilizounganishwa tayari**: `antiBanController`,
  `antiRevokeController`, `automationModsController`, `callBlockerController`,
  `callFeaturesController`, `groupFeaturesController`, `groupModsController`,
  `messageModsController`, `statusFeaturesController`, `storyHighlightsController`,
  `dataUsageController`, `storageManagerController`, `textRepeaterController`, n.k.
- **Feature controllers kubwa**: `whatsappWebController`, `bulkSenderController`,
  `fakeChatController`, `chatAnalyzerController`, `multiAccountsController`,
  `liveReactionsController`, `locationSharingController`, `gifPlayerController`,
  `quickActionsController`, `cacheCleanerController`, `businessAccountController`,
  `fileManagerController`, `messageTranslatorController`, `genzModsController`.

#### Pendekezo la merge inayofuata (faida kubwa zaidi)
1. **Extract `services/userScopedService.js`** — toa `getUser(req, res)` na
   `mergeSettings(defaults, settings)` kwenye service moja (au `middleware/loadUser.js`)
   na ufanye controllers zote 33 zizitumie. Hii ni change ya `require` + deletion ya
   nakala ~33 × 12 lines ≈ **400 lines za boilerplate zinaondolewa** kwa gharama ndogo
   sana na hatari ndogo (functions ni pure, hazina state).
2. **Merge MODs-style controllers kwa makundi**: `groupFeaturesController` +
   `groupModsController` → `groupToolsController`; `messageModsController` +
   `messageTranslatorController` → `messageToolsController`; `callBlockerController` +
   `callFeaturesController` → `callToolsController`. Zinatumia pattern ile ile ya
   `getUser`/`mergeSettings`/toggles kama mediaTools/chatOrganization.
3. **`whatsappWebController` + `bulkSenderController` + `multiAccountsController`** —
   zote zinafanya kazi na WhatsApp session management; zinaweza kuunganishwa kwenye
   `whatsappSessionController` (lakini hizi ni kubwa — zifanyike baada ya #1).

### 8. ✅ `callBlockerController` + `callFeaturesController` → `callToolsController` (zimefanyika)

#### Tatizo
- Controllers mbili zilikuwa na `getUser`/`mergeSettings` sawa (kupitia `userScopedService`)
  na settings get/update/reset handlers zilizofanana (tofauti ni jina la field kwenye User).
- `callFeaturesController` ilikuwa na **toggles 16 karibu sawa kabisa** (tofauti ni jina la
  field tu) + `updateCallTimeout`/`updateMaxCallDuration` zilizofanana.

#### Kitu kilichofanyika
- **`backend/controllers/callToolsController.js`** (mpya): controllers mbili zimeunganishwa
  katika moja na `createSettingsMerger` mbili (`callBlockerDefaultSettings` +
  `callFeaturesDefaultSettings` — fields ni tofauti kwenye User, hivyo kila moja inahitaji
  merger yake).
- **Routes** (`call-blocker.js`, `call-features.js`): sasa zina-require kutoka
  `callToolsController` — route paths zimebaki sawa (11 + 19 = 30 routes).
- Maelezo: `toggleCallBlocker` ilikuwa imeexported **mara mbili** (moja ina-toggle
  `callBlockerSettings.callBlockerEnabled`, nyingine `callFeaturesSettings.callBlocker`).
  Katika merge, features version imebadilishwa jina → `toggleCallFeaturesBlocker`
  (route `/api/call-features/blocker` haijabadilika — import pekee kwenye route file).
- **`callBlockerController.js` + `callFeaturesController.js`** zimefutwa (routes pekee
  ndizo zilizokuwa zikizirequire).

#### Matokeo
- Faili 2 → 1; toggles 16 sasa ni single-source-of-truth. Hakuna mabadiliko ya API.
- Tests: **29/29 zinapita** (call blocker + call features suite).

### 9. ✅ `whatsappWebController` + `bulkSenderController` + `multiAccountsController` → `whatsappSessionController` (zimefanyika)

#### Tatizo
- Controllers tatu zilikuwa na `getUser`/`mergeSettings` sawa na settings handlers
  zilizofanana; zote tatu zinafanya kazi na WhatsApp session/device management.

#### Kitu kilichofanyika
- **`backend/controllers/whatsappSessionController.js`** (mpya): controllers tatu
  zimeunganishwa katika moja na `createSettingsMerger` tatu (whatsappWeb / bulkSender /
  multiAccounts defaults — kila moja inahifadhiwa kwenye field yake ya User).
- **Routes** (`whatsapp-web.js`, `bulk-sender.js`, `multi-accounts.js`): sasa zina-require
  kutoka `whatsappSessionController` — route paths zimebaki sawa (11 + 9 + 12 = 32 routes).
- **`whatsappWebController.js` + `bulkSenderController.js` + `multiAccountsController.js`**
  zimefutwa (routes pekee ndizo zilizokuwa zikizirequire).

#### Matokeo
- Faili 3 → 1; hakuna mabadiliko ya API. Tests: **54/54 zinapita** (3 suites).

### 10. ✅ Coverage expansion (batch 5) — controllers zilizokuwa chini kabisa

#### Tests zilizoongezwa (pattern ya happy path + validation + auth + error)
- **adminAccessController.unit.test.js** (mpya, +20): permissions (list/set/filter),
  devices (list pagination/clamp, revoke + socket emit), sessions (list/revoke/revoke-all).
- **adminBroadcastController.unit.test.js** (mpya, +16): broadcast lists, system
  announcements (segments all/premium, new-conversation path, per-recipient errors),
  notification center (overview, segment targeting, broadcast).
- **adminCallsController.unit.test.js** (mpya, +11): listCalls filters/pagination, call
  stats aggregates, deleteCallLog.
- **adminInsightsController.unit.test.js** (mpya, +9): growth report, engagement report,
  fraud signals.
- **cacheCleanerController.unit.test.js** (mpya, +11): settings get/update/toggle/max-size/
  reset, cache size estimation + warning level, 501 clear endpoints.
- **mediaController.unit.test.js** (mpya, +34): uploads (local + cloudinary + error),
  deletes (ownership 403 / cloudinary / batch / admin), file info, signed URLs, local
  signing, transforms, thumbnails, cleanup dry-run + real + error.
- **manualPaymentController.test.js** (imepanuliwa: 1 → **+40**): payment info, subscription
  status, SMS preview, submit (new + duplicate + validation), my-payments/replies, admin
  list/stats/details, approve/reject (+ duplicate guard, expiry extension), admin messages,
  runExpiryCheck.
- **privacyController.unit.test.js** (imepanuliwa: **+16**): toggles 13 zilizobaki kwa
  `it.each`, toggle-back-to-false, 401 auth, 500 error paths.

#### Matokeo ya coverage (kutoka `coverage-final.json`, `npm run coverage`)
- **Statements: ~76%** • **Branches: ~87%** • **Functions: ~85%**.
- Controllers **60** (baada ya merges 8–9); **47 ziko ≥75%** statements; **33 ziko ≥80%**.
- Chini kabisa sasa ni `callToolsController` (54%) — kila controller iko >50% (ilikuwa
  nyingi chini ya 20%).

### 11. ✅ Extract duplicated settings get/update/reset handlers → `createSettingsHandlers` (zimefanyika)

#### Tatizo
- Controllers ~25 zilikuwa zikirudia **trio ile ile** ya settings handlers (get/update/reset)
  kwa kila feature — kila trio ilikuwa nakala ya nyingine (tofauti ni jina la field kwenye
  User, label ya log, na defaults).

#### Uchambuzi (analysis script, `/tmp/analyze*.js`)
- Kati ya handlers zote: **36/42 get, 38/44 update, 30/31 reset** zilikuwa canonical
  (sawa na template). **22 trios kamili** zilibadilishwa kwa codemod.
- **Zilibaki kama zilivyo** (deviations halali): `userSettingsController` (WhatsApp
  settings merge + 404), `authController` (WhatsApp settings), `securityController`
  (`requireUser` ya custom + two-arg merge + composite shape), `genzModsController`
  (custom field + normalize), `mediaToolsController.getMediaModsSettings` (custom
  decorator), `whatsappSessionController.updateSyncSettings` (partial-update).

#### Kitu kilichofanyika
- **`services/userScopedService.js`**: `createSettingsHandlers({ field, label, mergeSettings, defaults })`
  imeongezwa — inarejesha `{ getSettings, updateSettings, resetSettings }` kwa tabia ile
  ile ya awali (getUser + 401, markModified + save, `{ success, settings }` shape).
  Inasaidia `defaults` optional kwa controllers zenye two-arg `mergeSettings`
  (chatList, chatOrganization, mediaTools).
- **Controllers 25 zilibadilishwa** na codemod (`scripts/tmp-refactor-settings.js`, kisha
  kufutwa): kila trio ya ~39 lines → destructure 1 line + re-exports 3 lines (~7 lines).
  Hii ni ~**800 lines za boilerplate zimeondolewa** (25 × ~32 lines).
- Majina ya exported handlers **hayakubadilika** — routes zinaendelea ku-destructure
  majina yale yale (mfano `getAntiBanSettings`), sasa yakiwa re-exported kutoka helpers.

#### Verification
- `node scripts/verify-route-exports.js` (mpya, permanent): inathibitisha kila handler
  inayorequirewa na route ipo kwenye controller (handles destructure, renamed
  destructures, whole-module requires, `exports.x` + `module.exports = {}` styles) —
  **"All route handler imports resolve to existing exports"**.
- **1532/1532 tests zinapita.** Hakuna mabadiliko ya API.

### 12. ✅ Extract duplicated toggle handlers → `createToggleHandler` (zimefanyika)

#### Tatizo
- Toggle handlers (single-field settings toggles) zilikuwa zimerudiwa **~55 mara** kwenye
  controllers 6: `chatListController` (8), `mediaToolsController` (8), `messageToolsController`
  (8), `groupToolsController` (8 mods + 5 features), `securityController` (10),
  `userSettingsController` (8). Kila toggle ilikuwa nakala ya nyingine (tofauti ni jina la
  field, settingsField, na log label).

#### Kitu kilichofanyika
- **`services/userScopedService.js`**: `createToggleHandler({ settingsField, merge, loadUser, transform, acceptEnabled })`
  imeongezwa — inarejesha toggle handler inayotumika kwa wote. Inasaidia variants:
  - `acceptEnabled: true` kwa group-features toggles (zinazokubali `{ enabled }` na
    kurudisha settings nzima badala ya `{ [field]: value }`)
  - `loadUser: requireUser` kwa securityController (badala ya getUser default)
  - `transform: compactSettings` kwa userSettingsController customization
- **Controllers 6 zilibadilishwa** na codemod (`scripts/tmp-refactor-toggles.js`, kisha
  kufutwa): kila `const toggleXField = async (...) => {...}` (~20 lines) → call 4-5 lines
  ya `createToggleHandler(...)`. Jumla ~**100 lines za boilerplate zimeondolewa**;
  majina ya exported handlers hayakubadilika (routes hazikuguswa).
- **Unused imports zimeondolewa**: `createSettingsMerger` kwenye chatListController,
  chatOrganizationController, mediaToolsController, genzModsController (zilibaki kutoka
  hatua za awali — sasa safi).

#### Vingine
- `npm run check:exports` (mpya) — `scripts/verify-route-exports.js` imewekwa kwenye
  package.json; inathibitisha kila handler inayorequirewa na route ipo kwenye controller.
- **1532/1532 tests zinapita**; `npm run check` (307 files) OK.

### 13. ✅ WhatsApp-style text formatting kwenye composer + archive/unarchive + block/unblock verification

#### Text formatting (kama WhatsApp: bold/italic/strikethrough/monospace)
- **`frontend/src/utils/formatText.js`** (mpya): `formatTextTokens()` inaparse WhatsApp
  markers (`*bold*`, `_italic_`, `~strike~`, `` `mono` ``); `wrapWithMarker()` ina-wrap
  selected text kwenye composer (na ina-unwrap ikiwa tayari imewrap).
- **`frontend/src/components/FormattedText.jsx`** (mpya): inarender tokens kama
  `<strong>`/`<em>`/`<s>`/`<code>`; inakubali `renderText` callback ili @mentions
  ziendelee kufanya kazi.
- **`ChatArea.jsx`**: formatting toolbar (B/I/S/M) inaonekana juu ya composer ukiandika
  (in DM na group); message bubbles (na system messages) sasa zinatuma text kupitia
  `FormattedText`. Uki-edit message, formatting inahifadhiwa (raw markers hurender tena).
- **Text-selection menu kwenye messages** (kama WhatsApp): ukichagua (select) text ndani
  ya bubble, menu inaonekana juu ya selection na **Copy**, **Select all**, na (kwa
  messages zako) **B / I / S / M** — formatting inafungua edit mode na selection imewrap.
- **`chatExporter.js`**: structured messages sasa zinaexport caption + media label
  (na markers za formatting zinahifadhiwa verbatim kwenye .txt).
- Tests: `src/tests/formatText.test.js` (+8) + `src/tests/chatExporter.test.js` (+3)
  — **15/15 frontend tests zinapita**; `vite build` OK.
- Verified live kwenye dev server: `*Hello* _world_` → bubble inaonekana na
  **Hello** (bold) + *world* (italic); selection menu ilionekana kwenye group chat.

#### Archive/unarchive verification
- Backend: `chatController.toggleArchiveConversation` imethibitishwa kwa tests mpya
  (archive→unarchive roundtrip + per-user isolation) kwenye `chatController.unit.test.js`
  (+2, jumla 127/127).
- Verified live kwenye dev server: chat ime-archive (inaondoka kwenye list, "Archived 1"
  inaonekana) → unarchive (inarudi kwenye main list, badge inaondoka).

#### Block/unblock verification
- Backend: `chatController.blockUser`/`unblockUser` zinafanya kazi (200) na kuweka
  `blockedUsers` kwenye User; `isConversationBlocked` inazuia blocked user kutuma
  (403) kwa upande mmoja (WhatsApp semantics: blocker anaweza kuendelea kutuma).
- Verified live kwenye dev server: block kwa UI (Contact Info → Block → confirm) →
  DM inaondoka kwenye chat list (WhatsApp behavior) → unblock kupitia Settings →
  Blocked contacts → chat inarudi → message "message after unblock" inatuma (✓✓).
- DB verification: `blockedUsers` inaonekana baada ya block, inaondoka baada ya unblock.

### 14. ✅ Formatting kila mahali + WhatsApp .txt import + E2E block flow

#### Formatting toolbar wakati wa edit + indicators
- Edit composer inatumia `messageInput` sawa → toolbar ya B/I/S/M inaonekana pia
  wakati wa edit (raw markers huhifadhiwa kwenye stored message).
- **Indicator "Editing message" + Cancel button** imeongezwa juu ya composer ili
  edit mode ionekane wazi (hapo awali hakukuwa na dalili yoyote ya editing).

#### FormattedText kwenye previews zote
- **`ReplyMessage.jsx`**: quoted message preview (juu ya composer) sasa inarender
  formatting kupitia `FormattedText`.
- **`SearchMessages.jsx`**: search results zinarender formatting.
- **`ChatArea.jsx`**: quoted reply ndani ya message bubble inatumia `FormattedText`.
- **`MessageGroupReply.jsx`**: modal ya group reply preview inatumia `FormattedText`.

#### WhatsApp .txt import (formatting-preserving)
- **`frontend/src/utils/chatImporter.js`** (mpya): inaparse export ya WhatsApp `.txt`
  (`[date, time] Sender: message` format, ikihimili multi-line messages), inahifadhi
  formatting markers kwenye content, na inatoa messages zinazoendana na schema ya app.
- **`Sidebar.jsx`**: Import Chat sasa inakubali `.txt` pamoja na `.json`
  (JSON inabaki kwenye njia ya zamani).
- Tests: `src/tests/chatImporter.test.js` (+7).

#### E2E test ya block flow (`frontend/e2e/block-flow.spec.js`)
- Inathibitisha mzunguko kamili: A↔B chat inaonekana → A anablock B → chat inatoweka
  kwenye list → B hawezi kutuma (403) → A an-unblock (kuthibitishwa kwa
  `GET /api/auth/blocked`) → chat inarudi → B anapeleka ujumbe (201).
- Inaendeshwa kwa `GENZ_DEV_PORT=5176 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176`
  (convention ya e2e suite); `request.delete()` inatumika kwa unblock (badala ya
  `request.post` + `method` override ambayo Playwright haikuiheshimu).

### 15. ✅ CI workflow + WhatsApp .txt export + live mention/formatting verification

#### GitHub Actions CI (`.github/workflows/ci.yml`)
- **`backend-tests`**: `npm run check` + `npm run check:exports` + `npm test`
  (jest `--runInBand --forceExit`, mongodb-memory-server — hakuna DB ya nje).
- **`frontend-tests`**: `npm test` (node:test) + `npm run build`.
- **`e2e`**: MongoDB service container (mongo:7) + `npx playwright install --with-deps
  chromium` + `GENZ_DEV_PORT=5176 PLAYWRIGHT_BASE_URL=http://127.0.0.1:5176
  npx playwright test`. Backend inarithi env (MONGODB_URI → service container,
  `PHONE_VERIFICATION_REQUIRED=false` → users wana auto-verify), na inazinduliwa na
  webServer ya Playwright (`npm run dev` → start-dev.js). CI-only secrets kwa
  JWT_SECRET/ADMIN_JWT_SECRET (fallback `${{ secrets.X || '...' }}`). Artifact ya
  Playwright report kwenye failure.

#### WhatsApp-style .txt export (`exportChatAsWhatsAppTxt`)
- **`chatExporter.js`**: function mpya inayotoa format halisi ya WhatsApp
  (`[MM/DD/YYYY, hh:mm:ss AM/PM] Sender: message`), `You` kwa messages zako,
  media kama `image omitted`/`<Media omitted>`, deleted kama `This message was
  deleted` — ina-round-trip kupitia `parseWhatsAppTxt` (chatImporter).
- **`ChatArea.jsx`**: header menu sasa inatoa chaguo mbili — "Export Chat
  (.txt)" (format tajiri: header + reactions) na "Export Chat (WhatsApp .txt)"
  (format halisi ya WhatsApp, ina-round-trip kupitia import).
- Tests: `chatExporter.test.js` (+3: line shape, You/media, round-trip
  export→import inahifadhi markers) — **26/26 frontend tests**.

#### CI validation kwenye fresh GitHub runner ✓ (run #31448846657)
- Backend tests, Frontend tests + build, na E2E (Playwright) **zote zinapita** kwenye
  fresh runner kwenye branch `ci-validation`.
- Matatizo yaliyogunduliwa + kurekebishwa wakati wa validation:
  1. **Faili zisizocommitted zinazoreferiwa na committed code**: `StickerImage.jsx`
     (ChatArea/FloatingStickerOverlay/StickerPicker) na `contentFilter.js`
     (auth/chat/status controllers) — fresh clones zilikosewa (Windows iliendelea
     kwa sababu faili zipo kwenye disk). Zimecommitted.
  2. **`vite.config.js` GENZ_DEV_PORT override** ilikuwa worktree-only — fresh
     clone ilibind 5174 tu, e2e ikasubiri 5176. Imecommitted.
  3. **Backend e2e env**: `validateEnv` inahitaji `PORT`, `JWT_EXPIRE`, `NODE_ENV`
     (backend/.env inazitoa local) — sasa zimewekwa kwenye e2e step env.
  4. **smoke.spec** ilikuwa inatafuta heading "GENZ Login" ambayo committed login
     page hairender; **voice.spec** ilirefer WAV ya dev-only (uploads/ ni
     gitignored) — sasa ina-generate silent WAV kama haipo. Fixes za worktree
     zimecommitted.
- Workflow pia ina diagnostics: dev log + Playwright failures zinaonekana kwenye
  check-run annotations (public API) bila auth.

#### Live verification: mention + formatting kwenye bubble moja ✓
- Kwenye "Big 50 Test Group" nilituma kwa API:
  `@settester4181 *bold* _italic_ ~strike~ \`mono\` — mention na formatting kwenye bubble moja`
  na `mentions: ['settester4181']`.
- Bubble ilirender: mention chip (`@settester4181`, bg `rgba(0,168,132,0.2)`,
  weight 600) + `<strong>` (700) + `<em>` (italic) + `<s>` (line-through) +
  `<code>` (monospace) kwenye bubble moja — kuthibitishwa kwenye DOM na a11y tree.

### 16. ✅ Merge `ci-validation` → `main` + production deploy (imefanyika)

- Fast-forward push `7620e03..ca542bb` (35 commits, 0 behind) — CI validation
  imekamilika kwenye fresh runner, hivyo merge haikuhitaji PR.
- Kwenye `main` (commit `ca542bb`):
  - **CI run `31479861087`** — Backend tests ✓, Frontend tests + build ✓,
    E2E (Playwright) ✓ — **3/3 green**.
  - **Deploy run `31479861059`** — `Deploy to Production` ✓ (deploy.yml:
    `npm ci` ×2 → `npm run build` → `johnbeynon/render-deploy-action` na
    `wait-for-success: true`). Production imedeploy kwa Render.
- Notes:
  - Worktree bado ina WIP isiyocommit kwenye `deploy.yml` (+6 lines: backend jest
    quality gate kabla ya Render deploy) — haikujumuishwa kwenye merge; ikiwa
    inatakiwa kwenye production, inahitaji commit tofauti.
  - Branch `ci-validation` bado ipo kwenye origin (inabaki kama record ya
    validation) — inaweza kufutwa ikiwa haihitajiki tena.

### 7. ✅ Test coverage expansion (batches 1–4) + `npm run coverage`

#### Tests zilizoongezwa (kwa pattern ya happy path + validation + auth)
- **Batch 1–3** (commits `efbeb08` … `db7bf68`): mediaTools (+22), chatList (+26),
  security (+21), groupTools (+35), messageTools (+19), bulkSender, multiAccounts,
  whatsappWeb, automationMods, chatAnalyzer, statusFeatures, textRepeater,
  quickActions, callFeatures, callBlocker, liveReactions, dataUsage, admin,
  adminSupport, adminContent, storageManager, fileManager, notification, sticker,
  backup (+105) — **+315 tests**.
- **Batch 4** (commit hii): community, groupInvite, scheduledMessage, gifPlayer,
  businessAccount, fakeChat, locationSharing, voice, genzMods, advanced — **+212 tests**.
  `advancedController` (handlers 31) imepanda coverage kutoka ~6% → **58%**.

#### Scripts za coverage (`backend/package.json`)
- `npm run coverage` — jest coverage (json + text reporters) kwa `controllers/**/*.js`
- `npm run coverage:scan` — `node scripts/coverage-scan.js`: orodha ya controllers zote
  sorted by pct (inatoa rahisia ya ku-prioritize batch inayofuata)

#### Hali ya coverage (kutoka `coverage-final.json`)
- **Statements: ~76%** • **Branches: ~87%** • **Functions: ~85%** (baada ya batch 5).
- Chini kabisa: `callToolsController` (54%), `advancedController` (58%),
  `chatListController` (59%), `callController` (63%), `whatsappOtpController` (66%).
- Batch inayofuata yenye faida kubwa zaidi: `callToolsController` (54% — merged file
  bado haina tests za toggles nyingi za call-features), `advancedController` (58%),
  `chatListController` (59%).

---

## Vigezo vya "done" kwa kila hatua
- [x] `node -c` inapita kwa faili zote zilizobadilika
- [x] `npm test` inapita (**1613 tests backend + 71 frontend** kwa sasa)
- [x] `npm run check:exports` inapita (kila handler inayorequirewa na route ipo kwenye controller)
- [x] Route paths za nje hazijabadilika (diff ya routes ni import-only)
- [x] Feature smoke test (`backend/scripts/feature-smoke-test.js`) inapita kwa endpoints zilizoguswa
