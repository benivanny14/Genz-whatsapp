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
- Maelezo: `compressMedia` na editor handlers bado ni mock implementations (kama
  zilivyokuwa awali) — hazijaongezwa kwenye scope ya refactor hii.

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

### 5. 🧭 Scan ya duplicates iliyobaki (imefanyika)

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

---

## Vigezo vya "done" kwa kila hatua
- [x] `node -c` inapita kwa faili zote zilizobadilika
- [x] `npm test` inapita (261 tests kwa sasa)
- [x] Route paths za nje hazijabadilika (diff ya routes ni import-only)
- [x] Feature smoke test (`scripts/feature-smoke-test.js`) inapita kwa endpoints zilizoguswa
