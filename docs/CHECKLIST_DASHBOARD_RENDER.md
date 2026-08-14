# Checklist ya Dashboard ya Render (Kwa Mtu Asiyejua Render)

Mwongozo huu unakueleza **mahali pa kwenda na kile cha kuangalia** kwenye
[dashboard.render.com](https://dashboard.render.com) hatua kwa hatua — kama
hujawahi kufungua Render kabisa. Inahusu service ya **`genz-whatsapp`** ambayo
sasa **haijibu** (tarehe 2026-08-14: DNS inafanya kazi, lakini server inarudisha
byte 0 — service imelala au inapiga chafu).

> Checklist ya env vars iko kwenye `RENDER_RESTORE_CHECKLIST.md` — mwongozo huu
> ni kuhusu **navigation ya dashboard** (wapi kubofya, nini maana yake).

---

## Kabla ya kuanza

- Fungua **https://dashboard.render.com** kwenye kivinjari.
- Ingia na akaunti ya Google iliyounganishwa na Render yako.
- Usifungue kwa njia ya **"log in with GitHub"** ikiwa haikumbuki password ya
  GitHub — tumia Google ikiwa ndiyo akaunti halisi.

---

## Hatua 1 — Tafuta service yako

Baada ya kuingia, unaona orodha ya **services** (mistari yenye jina la kila app).

1. Tafuta mstari unaoitwa **`genz-whatsapp`** (au jina lolote uliloliweka).
2. Bonyeza jina la service — **USIBOFYE** kwenye URL ya `onrender.com` iliyo
   karibu (hiyo inafungua site, sio dashboard).

Kwenye ukurasa wa service unaona tabs hapo juu/kushoto:
**Overview · Events · Logs · Deploys · Environment · Shell · Settings**
(zinaweza kuitwa "Events" au "Deploys" — kwenye Render ya sasa ziko pamoja).

---

## Hatua 2 — Angalia **Events** (habari muhimu zaidi!)

Tab ya **Events** (au **Deploys**) ndiyo inayokuambia kama service iko hai.

Kila deploy ni mstari wenye: tarehe, **status**, na commit (hex kama `bee6cf9`).

**Status unazoweza kuona na maana yake:**

| Status | Maana | Unachofanya |
|---|---|---|
| 🟢 **Live** / **Deployed** | Service iko juu na inafanya kazi | Hakuna cha kufanya |
| 🟡 **Building** | Inaandaa build mpya | Subiri dakika 5–10 |
| 🔴 **Failed** | Build au deploy ilishindwa | Bofya mstari huo → ona **Logs** |
| ⚪ **Deactivated / Suspended** | Free tier imelala (baada ya ~15 dk kutotumiwa) | Bofya **Manual Deploy** (Hatua 5) au tembelea URL |
| ⚪ **Cancelled** | Uliighairi | Kawaida — fanya Manual Deploy |

> ⚠️ Kama **hakuna deploy yoyote** kwenye list → service imefutika au haijawahi
> kuundwa. Kama ndivyo, unda upya kwa `render.yaml`: **New + → Blueprint →
> chagua repo yako** (usichague "Web Service" mpya tupu — blueprint ina env zote).

**Kutambua tatizo la sasa:** ikiwa deploy ya mwisho ni `Live` lakini site bado
haijibu → angalia **Logs** (Hatua 4). Ikiwa deploy ya mwisho ni `Failed` →
bofya mstari na soma log — kwa kawaida inaonyesha key gani ya env imekosekana.

---

## Hatua 3 — Angalia **Environment** (env vars)

Tab ya **Environment** inaorodhesha kila env variable ya service yako.

1. Bofya **Environment**.
2. Angalia kama kuna env zilizopo kabisa. **Kama tab ni tupu → ndiyo sababu
   ya service kukataa kuanza** (server ya GENZ ina **fail-closed**: haianzi
   bila env muhimu).
3. Linganisha na orodha ya `RENDER_RESTORE_CHECKLIST.md` (Hatua ya 2) — zote
   muhimu lazima ziwe hapo: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `CLOUDINARY_*`, `FRONTEND_URL`, `PUBLIC_API_URL`, `MANUAL_PAYMENT_*`, n.k.
4. Kila key ina kitufe cha **Edit / pencil** kando yake → bofya kubadilisha
   thamani (usifungue "Reveal value" mbele ya watu — hizi ni secrets).
5. Baada ya kubadilisha env → **Lazima UREDEPLOY** (Hatua 5) — env hazibadiliki
   kwenye service inayoendesha.

---

## Hatua 4 — Angalia **Logs** (error halisi)

Tab ya **Logs** inaonyesha output ya server yako (console.log / errors).

1. Bofya **Logs**.
2. Chuja kwa `tail` (mwisho) — error ya kuanza iko chini.
3. Tafuta maneno haya:

| Unachokiona kwenye log | Maana |
|---|---|
| `Environment validation passed (production)` | Env zote sawa — server inaanza ✓ |
| `CRITICAL: Environment validation failed:` | **Hii ndiyo sababu!** Soma baada ya `:` — inaonyesha key gani imekosekana (k.m. `CLOUDINARY_API_KEY`) |
| `MongoNetworkError` / `ECONNREFUSED` | `MONGODB_URI` haifiki (localhost? Atlas down? IP whitelist?) |
| `Cannot find module` / `Module not found` | Build haijakamilika (angalia Build tab) |
| **Hakuna output kabisa** | Service imesuspended — fanya Manual Deploy (Hatua 5) |

4. Baada ya kurekebisha env → **Manual Deploy** → angalia Logs tena.

---

## Hatua 5 — **Manual Deploy** (kuamsha / kuweka upya)

Kitufe cha **Manual Deploy** kiko juu kwenye ukurasa wa service (kitufe cha
bluu, kama `Manual Deploy ▾`).

1. Bofya **Manual Deploy**.
2. Chagua:
   - **Deploy latest commit** — hii inajenga na kuweka commit ya mwisho ya
     branch iliyounganishwa. **Chagua hii 99% ya nyakati.**
   - **Clear build cache & deploy** — chagua tu kama build inashindwa kwenye
     cache ya zamani (inachukua muda mrefu zaidi).
3. Subiri build ikamilike (dakika 5–10) — unaona progress kwenye **Events**.
4. Wakati wa build, fungua **Logs** ili ufuatilie maendeleo.

> Free tier: ikiwa service imelala, deploy hii pia inaweza kuamsha kwa ujumla.
> Kama unahitaji kuiwasha bila deploy, tembelea tu URL yake — inachukua ~1 dk.

---

## Hatua 6 — Thibitisha mwisho (kutoka terminal yako)

Baada ya deploy kuwa **Live**, jaribu kutoka hapa (mimi ninaweza kufanya hili
kwako ukiniambia):

```bash
curl https://genz-whatsapp-1.onrender.com/api/health
```

Unapaswa kuona:
```json
{"success":true,"status":"ok","services":{"mongo":"connected","redis":"disabled","mediaStorage":"cloudinary"}}
```

- `mongo: connected` → database iko sawa
- `mediaStorage: cloudinary` → media iko kwenye Cloudinary (sio local disk)
- `redis: disabled` → inakubalika (single-instance mode)

Pia thibitisha APK mpya inaserve (sasa ndiyo njia pekee ya download):
```bash
curl -I https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk
# Unapaswa kuona HTTP/1.1 200 na content-type application/vnd.android.package-archive
```

---

## Muhtasari wa haraka (kama huna muda)

1. Dashboard → service `genz-whatsapp`
2. **Events** → deploy ya mwisho ni `Failed` au `Deactivated`?
   - `Failed` → bofya mstari → **Logs** → soma `CRITICAL: Environment validation failed: <key>`
   - `Deactivated` → **Manual Deploy → Deploy latest commit**
3. Env zimefutika? → **Environment** → weka zote (orodha: `RENDER_RESTORE_CHECKLIST.md`)
4. Baada ya deploy `Live` → `curl https://genz-whatsapp-1.onrender.com/api/health`
5. Ikirejea `200` → GENZ iko live, watumiaji wanapakua APK kutoka site ✓

---

## Maswali ya kawaida

**"Dashboard inasema service iko Live lakini site haijibu — kwanini?"**
Logs ndiyo jibu. Fungua **Logs** → kama hakuna output → suspen; kama kuna
`CRITICAL: Environment validation failed` → env zinakosekana. Live kwenye
dashboard inamaana tu deploy ilimalizika — si kwamba server ilianzishwa.

**"Nimeweka env lakini bado haifanyi kazi."**
Env hubadilika tu baada ya **redeploy**. Bofya Manual Deploy → Deploy latest
commit.

**"Ninaona `genz-whatsapp` na `genz-whatsapp-1` — tofauti gani?"**
Hizo ni **services mbili**: `genz-whatsapp` = API + database (backend), na
`genz-whatsapp-1` = UI + downloads. Zote mbili zinahitaji kuwa Live. (Mpangilio
bora ni kuziunganisha kuwa moja — lakini sio kazi ya leo.)
