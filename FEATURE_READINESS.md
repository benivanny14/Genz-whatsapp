# Feature Readiness — Groups & Status

Hati hii inaorodhesha features zote za **Groups** na **Status** pamoja na jinsi
zilivyothibitishwa (tests). Inakusudiwa kuwa checklist kwa wanaotest mfumo
kwa mkono kabla ya kutoa toleo.

> **Maelezo muhimu (AI):** Mfumo huu **HAUNA feature yoyote ya AI**. AI
> assistant (`/ai`), alt-text generation, auto-captions, text-to-speech,
> speech recognition, na message translation zimeondolewa kabisa (backend +
> frontend) — hakuna `ai-assistant`, `/alt-text`, `/captions`,
> `/text-to-speech`, `/message-translator` wala `translatorSettings`.

---

## 👥 Groups

### Uthibitisho
- `backend/scripts/feature-full-verification.js` — checks **G1–G29** (zote zinapita)
- `backend/tests/groupManagement.unit.test.js`, `groupToolsController.unit.test.js`,
  `groupInviteController.unit.test.js` — unit tests
- `frontend/e2e/group-admin.spec.js` — **e2e ya UI**: kuunda group, promote admin,
  kufunga info, join approval, ban member
- `backend/scripts/e2e-group-status-live.js` — **live socket**: ujumbe wa group
  unafika kwa wanachama kwa papo hapo

### Features za WANA (members / users)
| Feature | Hali |
|---|---|
| Kuunda group | ✅ (UI + API) |
| Kujiunga kupitia invite link / join request | ✅ (join approval flow G16–G20) |
| Kutuma ujumbe kwenye group | ✅ (+ live socket) |
| Kuona info ya group | ✅ (G9) |
| Kuondoka group | ✅ (G21) |
| Kuhariri jina/desc ikiwa group iko open | ✅ (G5) |
| Member hawezi: promote/remove/ban/transfer | ✅ (403 — G3, G4, G6, G7, G5b) |

### Features za ADMINS
| Feature | Hali |
|---|---|
| Promote / demote admin | ✅ (G10 + e2e UI) |
| Kuongeza / kuondoa participant | ✅ (G2, G12, G13) |
| Ban / unban member | ✅ (G14, G15 + e2e UI) |
| Kufunga / kufungua group info (lock) | ✅ (G10b–G10d + e2e UI) |
| Kuhariri group info | ✅ (G11) |
| Kuidhinisha join requests | ✅ (G18–G20) |
| Antispam (max messages/min, slow mode) | ✅ (G25) |
| QR code ya group | ✅ (G26) |
| Events + RSVP | ✅ (G27–G28) |
| Polls | ✅ (unit tests) |
| Announcements mode | ✅ (unit tests) |
| Group invite links (generate/revoke/reset) | ✅ (group-invite unit tests) |

### Features za OWNER
| Feature | Hali |
|---|---|
| Transfer ownership | ✅ (G22–G24) |

---

## 📸 Status

### Uthibitisho
- `backend/scripts/feature-full-verification.js` — checks **S1–S58** (zote zinapita)
- `backend/tests/statusController.unit.test.js`, `statusAdvancedController.unit.test.js`,
  `statusFeaturesController.unit.test.js`, `statusToolsController.unit.test.js`
- `backend/scripts/e2e-group-status-live.js` — **live socket**: status mpya
  inafika kwa contacts kwa papo hapo + privacy ya `contacts_except` inaheshimiwa

### Features za ANAPOST (poster / owner)
| Feature | Hali |
|---|---|
| Kuunda status: text / media / poll | ✅ (S1, S5, S7) |
| Privacy: everyone / contacts / only_me / contacts_except | ✅ (S2, S3, S32, S33) |
| Kuunda status: text / media / poll / multi-status upload | ✅ (S1, S5, S7, multi-upload) |
| Privacy: contacts / contacts_except / only_share_with / only_me | ✅ (S2, S3, S32, S33, CHANGELOG v1.1.16) |
| Per-status privacy & Share to Status privacy validation | ✅ (MessageShareToStatus & CreateStatus) |
| Anti-Revoke Status (view deleted status if viewed prior) | ✅ (antiRevokeStatus privacy mod) |
| Edit, hashtags, location, mention, pin, favorite | ✅ (S6, S9–S15) |
| Archive, reminder, duplicate, schedule, share link | ✅ (S16–S22) |
| Report, insights, analytics, QR | ✅ (S23–S26) |
| Drafts, templates, backup, history | ✅ (S36–S43) |
| Trending hashtags | ✅ (S44) |
| Close friends (enable/add/remove) | ✅ (S47–S49) |
| Highlights, duration | ✅ (S50–S53) |

### Features za ANAVIEW (viewer)
| Feature | Hali |
|---|---|
| Kuona feed ya status za contacts | ✅ (S31) |
| Privacy inaheshimiwa (only_me / contacts_except hazionekani) | ✅ (S32, S33) |
| Kuview (inaandikwa kwenye viewers list) | ✅ (S27, S34) |
| Kureact na kuona reactions | ✅ (S28, S29) |
| Kumute status za mtu | ✅ (S30) |

---

## 🔁 Realtime (live delivery)
- **Ujumbe wa group** — unafika kwa wanachama kwa papo hapo via socket
  (`message:received`) ✅ (e2e-group-status-live 6/6)
- **Status mpya** — inafikwa na contacts walio online kwa papo hapo
  (`status:created`) ✅ (e2e-group-status-live 6/6)
- **Privacy ya status** — `contacts_except` haileki kwa walio-excluded ✅

---

## Maneno ya tahadhari
1. AI features 3 za zamani (alt-text/captions/TTS) **zimeondolewa kabisa** —
   usitafute tena kwenye UI.
2. Group polls/announcements zimehakikiwa kwa unit tests (sio e2e ya UI) —
   thibitisha kwa mkono kwenye UI kabla ya toleo kubwa.
3. Vipimo vyote: backend **1696 pass / 0 fail**, frontend **92 pass / 0 fail**,
   CI (incl. E2E Playwright) **green**.
