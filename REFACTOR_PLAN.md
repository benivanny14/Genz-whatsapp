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

### 1. `chatListModsController` + `chatSearchController` + `chatFoldersController` → `chatListController`
- Zote zina `getUser`/`mergeSettings` sawa na zinafanya `Conversation.find({participants})`
  kwa ajili ya list/search/folders.
- Merge: `backend/controllers/chatListController.js` + shared helpers katika
  `backend/services/chatListService.js`.
- Route paths: `/api/chat-list/*`, `/api/chat-search/*`, `/api/chat-folders/*` — hazibadiliki.

### 2. `mediaModsController` + `mediaCompressorController` + `mediaEditorController` → `mediaToolsController`
- Zote zinashughulikia processing ya media (compress/edit) na zinashiriki upload/multer
  setup sawa.
- Hatua ya kwanza: toa `backend/services/mediaProcessingService.js` (compress/resize/filter
  logic) — controllers zinabaki lakini zinatumia service moja.
- Hatua ya pili (baada ya uthibitisho): unganisha controllers katika `mediaToolsController.js`.

### 3. `securityController` + `securityModsController` → `securityController` (moja)
- `securityModsController` ni set ya MODs za user-level kwenye security; `securityController`
  ni ya admin-level. Hizi zinaweza kuunganishwa kwa kuweka MODs handlers kwenye sehemu
  moja ya faili (au kutenganisha `securityService.js`).
- Tahadhari: hakikisha `superAdminAuth` vs `protect` middleware haichanganyiki kwenye routes.

### 4. `chatFilterController` + `chatSortController` (zilizofanyika) → model kwa wengine
- Pattern iliyotumika hapo (helpers za pamoja + controller moja + routes zina-point
  kwake) ndiyo itakayotumika kwa hatua 1–3.

### 5. `settingsController` + `customizationModsController` + `themeEngineController` (high-level)
- Zote zina `getUser`/`mergeSettings` sawa. Hizi ni kubwa, kwa hiyo zifanyike baada ya
  hatua 1–3 kuthibitishwa.

---

## Vigezo vya "done" kwa kila hatua
- [ ] `node -c` inapita kwa faili zote zilizobadilika
- [ ] `npm test` inapita (192 tests kwa sasa — inabaki sawa au inaongezeka)
- [ ] Route paths za nje hazijabadilika (diff ya routes ni import-only)
- [ ] Feature smoke test (`scripts/feature-smoke-test.js`) inapita kwa endpoints zilizoguswa
