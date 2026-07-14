# Mfumo Mpya wa Admin — Usalama & Usanidi (Awamu ya 1)

## Nini kimebadilika

1. **Akaunti ya Admin imetengwa kabisa** kwenye collection mpya `AdminOwner`
   (`backend/models/AdminOwner.js`) — HAIHUSIANI na collection ya `User`.
   Watumiaji wa kawaida (na hivyo hackers wanaoiba akaunti ya mtumiaji wa
   kawaida) hawawezi tena kuwa admin, hata kama walikuwa na `isAdmin: true`
   au `role: 'admin'` kwenye akaunti yao ya zamani.

2. **Njia pekee ya kuunda/kubadilisha akaunti ya admin** ni script ya CLI:
   ```
   node backend/scripts/bootstrapAdminOwner.js
   ```
   Hii inaendeshwa moja kwa moja kwenye server (SSH/hosting console) — HAKUNA
   endpoint ya HTTP inayofanya kazi hii. Itakuuliza username, password (herufi
   12+), na itakupa QR code + msimbo wa 2FA (Google Authenticator/Authy) wa
   kuscan kwenye terminal.

3. **Login ya admin ina hatua mbili za lazima**: password kisha msimbo wa
   2FA wa sekunde 30. Bila hizo mbili, huwezi kuingia — hata ukiwa na
   password sahihi.

4. **JWT ya admin ni tofauti kabisa** na JWT ya watumiaji wa kawaida
   (`ADMIN_JWT_SECRET` ≠ `JWT_SECRET`). Hata kama secret ya watumiaji
   ikivuja, haiwezi kutumika kuingia admin.

5. **Njia ya login ya admin imefichwa** kwenye path ya siri
   (`ADMIN_BASE_PATH`, mfano `/api/x7f2-owner-gate-9k`) badala ya
   `/api/admin/auth` inayoweza kukisiwa kirahisi.

6. **Rate limiting kali** kwenye login (majaribio 10 tu kwa dakika 15) na
   **lock ya moja kwa moja** baada ya majaribio 5 mfululizo yasiyofaulu
   (dakika 15), na majaribio 10 (saa 1).

7. **Audit log ya kila ombi la admin** — kila kitendo cha admin (na kila
   jaribio la kuingia lililoshindwa) linahifadhiwa kwenye `AuditLog`.

8. **Njia za zamani za "kujipandisha kuwa admin"** (`/api/admin/bootstrap`,
   `promote/demote`) zimeondolewa kabisa. Pia endpoints za malipo za admin
   (`/api/payment/admin/*`, `/api/admin/manual-payments/*`) sasa zinalindwa
   na mfumo huu mpya badala ya alama ya zamani ya mtumiaji.

9. **Bug ya awali imerekebishwa**: kulikuwa na alama za merge-conflict
   (`<<<<<<< HEAD`) zisizotatuliwa kwenye `backend/server.js` ambazo
   zingezuia server yote kushindwa kuanza — hii imetatuliwa.

## Hatua za Usanidi (fanya hizi kwenye server yako)

1. Weka kwenye `backend/.env` yako:
   ```
   ADMIN_JWT_SECRET=<zalisha secret ndefu ya kipekee, tofauti na JWT_SECRET>
   ADMIN_BASE_PATH=/api/<chagua-neno-la-siri-lako-mwenyewe>
   ADMIN_IP_ALLOWLIST=   # (hiari) IP yako tuli ukitaka safu ya ziada
   ```
2. Weka kwenye `frontend/.env.local`:
   ```
   VITE_ADMIN_BASE_PATH=/api/<neno-lile-lile-ulilochagua-juu>
   ```
3. Endesha mara moja tu (kwenye server, si kwenye tovuti):
   ```
   cd backend
   node scripts/bootstrapAdminOwner.js
   ```
   Fuata maelekezo — weka username, password, na scan QR kwenye
   Google Authenticator.
4. Fungua dashibodi yako kwenye:
   `https://tovuti-yako.com/system-control-x7k9/login`
   (unaweza kubadilisha "system-control-x7k9" kwenye `frontend/src/App.jsx`
   na `AdminProtectedRoute`/`AdminDashboard` kama unataka jina lingine la
   siri kwa upande wa frontend pia).

## Hali ya Sasa: Sehemu ZOTE 33 Zimekamilika

Dashibodi (`frontend/src/pages/AdminDashboard.jsx`) sasa ina sehemu zote 33
ulizoomba, zote zikiwa zimeunganishwa na backend halisi (si placeholder):

**Msingi**: Overview, Dashboard, User Management
**Fedha**: Payment Management, Subscription Management, Revenue Dashboard,
Duplicate Payment Detection, Fraud Detection
**Maudhui**: Chat Management, Group Management, Channel Management,
Status Management, Stories Management, Calls Management
**Mawasiliano**: Broadcast System, Notification Center, Support Ticket
System, Admin ↔ User Chat
**Ripoti**: Reports & Analytics
**Usalama**: Audit Logs, Security Center, Roles & Permissions,
Device Management, Session Management

Maelezo ya ziada kuhusu baadhi ya sehemu:

- **Stories Management** ni mwonekano wa "highlights" juu ya data ile ile
  ya Status (WhatsApp haitofautishi Status na Stories kimuundo).
- **Support Ticket System** na **Admin ↔ User Chat** zinatumia model moja
  (`SupportTicket`) — tickets za watumiaji (`category != direct_message`)
  dhidi ya mazungumzo yaliyoanzishwa na wewe moja kwa moja
  (`category = direct_message`). Nimeongeza pia njia za mtumiaji za kawaida
  kuunda/kujibu tickets (`backend/routes/supportTicketRoutes.js`,
  `/api/support/tickets`) ili mfumo uwe na data halisi.
- **Broadcast System** ina sehemu mbili: usimamizi wa broadcast-lists za
  watumiaji (zilizopo tayari kwenye mfumo wako), na uwezo mpya wa WEWE
  kutuma tangazo la mfumo mzima kama "GENZ Support" kwa watumiaji wote au
  kundi maalum (premium/free/blocked).
- **Roles & Permissions**: hizi ni ruhusa za ndani ya app (mfano:
  kusimamia maudhui ya kikundi) — HAZIHUSIANI kabisa na ufikiaji wa
  dashibodi hii ya admin, ambayo inabaki kuwa yako peke yako milele kupitia
  mfumo wa `AdminOwner` uliotajwa juu.
- **Session Management** inatumia `activeSessions` iliyokuwa tayari kwenye
  User model (JWT sessions), tofauti na **Device Management** ambayo
  inasimamia vifaa vilivyounganishwa (QR pairing / multi-device).
- **Fraud Detection** inaangalia: akaunti nyingi kwenye IP moja, walengwa
  wa majaribio ya kuvunja akaunti (brute-force), na mrundikano wa usajili
  wa haraka (bot signups). Malipo yanayofanana yanaonekana kwenye
  "Duplicate Payment Detection" iliyokuwepo tayari.

Model mpya iliyoongezwa: `backend/models/SupportTicket.js`.
Field mpya kwenye User: `appPermissions` (kwa Roles & Permissions).


