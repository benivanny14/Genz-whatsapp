# 🔑 Backup ya Release Keystore — Mwongozo

**Kwa nini ni muhimu:** APK zako zinasainiwa na `frontend/android/genz-release.keystore`
(pamoja na `keystore.properties` yenye nenosiri). Faili hizi ni **gitignored** —
hazipo kwenye GitHub. Kama zikipotea (disk imeharibika, kompyuta imeibiwa,
worktree imefutwa), **huwezi kusaini APK mpya tena**, na watumiaji wenye APK ya
zamani hawataweza kusakinisha update (signature mismatch). Utaanza upya kutoka
sifuri.

## Backup — hatua moja

```bash
# Kutoka repo root
node scripts/backup-keystore.js
```

- Inanakili `genz-release.keystore` + `keystore.properties` kwenye
  `~/Documents/GENZ-keystore-backup/` (au njia yoyote ukiiweka kama argument).
- Inachapisha sha256 ya kila faili — andika hizi (au uhifadhi) ili uthibitishe
  faili hazijabadilishwa baadaye.
- Inaandika `BACKUP-NOTES.txt` yenye maelezo ya kurejesha.

> 💡 **Weka nakala nyingine mahali tofauti kabisa** — USB stick au cloud
> (Google Drive / OneDrive) yenye password. Nakala moja kwenye kompyuta moja
> si backup ya kweli.

## Kurejesha (restore)

1. Nakili faili mbili kwenye:
   ```
   frontend/android/genz-release.keystore
   frontend/android/keystore.properties
   ```
2. Hakikisha `keystore.properties` ina `storeFile=genz-release.keystore`.
3. Jenga APK:
   ```bash
   cd frontend
   npm run apk:build
   ```

## Usalama

- **USIWEKE faili hizi kwenye git** (tayari ziko kwenye `.gitignore`).
- **USIZITUME** kwa mtu yeyote — yeyote mwenye keystore + nenosiri anaweza
  kusaini APK kama wewe.
- Nenosiri likiingia kwenye mtu mwingine, tengeneza keystore **mpya** na utoe
  APK kama release mpya (versionCode mpya) — usijaribu kurekebisha.

## Backup ya sasa

Tarehe: 2026-08-14 (imefanywa na `scripts/backup-keystore.js`).

| Faili | sha256 |
|---|---|
| `genz-release.keystore` | `fe00618fd086bc8c531f63fde22d958a175630965894d032a547fc570ca075d1` |
| `keystore.properties` | `2364bb971ee3f0061e9a6516bb3fb44c7e22bea8255f0fb0a9a07da16e413a7d` |

Mahali: `C:\Users\dell\Documents\GENZ-keystore-backup\`
