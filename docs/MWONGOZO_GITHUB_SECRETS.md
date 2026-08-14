# Mwongozo wa Kuweka GitHub Secrets (RENDER_API_KEY + RENDER_SERVICE_ID)

Mwongozo huu unakueleza hatua kwa hatua jinsi ya kuweka **secrets** kwenye
GitHub ili workflow ya **"Deploy to Production"** iweze ku-trigger deploy ya
Render.

> **Kwa nini hii ni muhimu?** GitHub Actions (CI) inaweza ku-build app na
> kutoa "success" **hata kama Render haikupokea deploy** — kwa sababu
> `RENDER_API_KEY` na `RENDER_SERVICE_ID` zilikuwa **tupu**. Action ya deploy
> inarudi kimya (exit 0) huku Render ikirudisha 401. Hivi ndivyo production
> inavyobaki down hata baada ya push yenye "success". Hili limebainika
> tarehe 2026-08-14.

---

## Kabla ya kuanza — pata vitu 2

### 1. `RENDER_API_KEY` (kutoka Render)

1. Fungua **https://dashboard.render.com** na uingie.
2. Bofya avatar yako (juu kulia) → **Account Settings**.
3. Chagua tab **API Keys** (kushoto).
4. Bofya **Create API Key** → andika jina (k.m. `github-actions`) → **Create**.
5. **Nakili key mara moja** (inajulikana kama `rnd_xxxxxxxx...`).
   > ⚠️ Kwa usalama, Render haikionyeshi tena baadaye — ikiwa unaipoteza,
   > tengeneza nyingine mpya.

### 2. `RENDER_SERVICE_ID` (kutoka URL ya service yako)

1. Kwenye dashboard, fungua service yako (`genz-whatsapp`).
2. Angalia URL ya kivinjari — iko kama:
   ```
   https://dashboard.render.com/web/srv-xxxxxxxxxxxx
   ```
3. `srv-xxxxxxxxxxxx` (sehemu baada ya `/web/`) ndiyo **RENDER_SERVICE_ID**.

> 💡 Ikiwa unayo services mbili (`genz-whatsapp` = API, `genz-whatsapp-1` = UI),
> tumia ID ya ile inayohitaji deploy (API — `genz-whatsapp`). Unaweza kuweka
> zote mbili kwa kuongeza secret ya pili kama `RENDER_SERVICE_ID_UI`.

---

## Hatua kwa Hatua — Weka Secrets kwenye GitHub

1. Fungua repo yako:
   **https://github.com/benivanny14/Genz-whatsapp**
2. Bofya tab ya **Settings** (juu, karibu na Code/Issues).
   > ⚠️ USIwe kwenye "Settings" ya profile yako — inabidi iwe ya **repo**.
3. Kwenye menu ya kushoto, chini, bofya **Secrets and variables** → **Actions**.
4. Bofya kitufe cha **New repository secret** (juu kulia).
5. Andika:
   - **Name**: `RENDER_API_KEY`
   - **Secret**: bandika key yako ya Render (`rnd_...`)
   - Bofya **Add secret**.
6. Bofya **New repository secret** tena na ongeza:
   - **Name**: `RENDER_SERVICE_ID`
   - **Secret**: `srv-...` (kutoka URL ya service)
   - Bofya **Add secret**.

Baada ya kumaliza, ukurasa wa **Actions secrets** unapaswa kuonyesha:
```
RENDER_API_KEY       (Updated just now)
RENDER_SERVICE_ID    (Updated just now)
```

> Thamani hazionekani — zimefichwa. Usiwaambie mtu yeyote secret yako.

---

## Baada ya Secrets — Trigger Deploy

Njia rahisi zaidi: **GitHub → Actions → "Deploy to Production" → Run workflow**
(bofya kitufe cha **Run workflow** kulia, chagua branch `main`, bofya **Run**).

Au kwa mkono: push commit yoyote kwenye `main` (workflow ina-run kiotomatiki
kwenye push).

**Jinsi ya kuthibitisha deploy ilifika Render:**

1. GitHub → **Actions** → bofya run ya mwisho ya "Deploy to Production".
2. Fungua step ya **"Deploy to Render"** → kwenye log unapaswa kuona
   `Deploying...` na `Successfully deployed` (sio 401/unauthorized).
3. Thibitisha kutoka terminal:
   ```bash
   curl https://genz-whatsapp.onrender.com/api/health
   # Lazima uone: {"services":{"mongo":"connected",...}}
   ```

---

## Troubleshooting

| Dalili | Suluhisho |
|---|---|
| Deploy step inasema success lakini Render haijibu | Secrets bado tupu au action ilirudi kimya — thibitisha jina la secret ni `RENDER_API_KEY` / `RENDER_SERVICE_ID` halisi (case-sensitive!) |
| `401` kwenye log ya deploy | `RENDER_API_KEY` haiko sahihi au haijasajiliwa — tengeneza key mpya kwenye Render na uisajili tena |
| `404` / "service not found" | `RENDER_SERVICE_ID` sio sahihi — angalia URL ya service (`srv-...`) |
| Deploy inafika Render lakini /api/health haipiti | Env vars za Render zinakosekana — angalia `docs/CHECKLIST_DASHBOARD_RENDER.md` (Logs) na `RENDER_RESTORE_CHECKLIST.md` (orodha ya env) |
| Secrets zinakataa kusajiliwa (validation) | Hakikisha unafanya hivi kwenye **repo** yako (sio account) — Settings ya repo → Secrets and variables → Actions |

---

## Uthibitisho wa Mwisho (baada ya Render kuwa live)

```bash
# 1. Health ya API
curl https://genz-whatsapp.onrender.com/api/health
# → {"success":true,"status":"ok","services":{"mongo":"connected",...}}

# 2. APK mpya inaserve kutoka site (njia pekee ya download sasa — hakuna GitHub)
curl -I https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk
# → HTTP/1.1 200, content-type: application/vnd.android.package-archive

# 3. version.json inaonyesha v1.1.11 (hakuna downloadUrl)
curl -s https://genz-whatsapp-1.onrender.com/version.json
```
