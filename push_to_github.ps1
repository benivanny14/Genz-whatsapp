# Script ya ku-push code kwenye GitHub kwa usalama
cd "C:\Users\dell\OneDrive\Documents\Desktop\genz\Genz-whatsapp-main"

Write-Host "Inaandaa Git repository..." -ForegroundColor Cyan
git init
git remote remove origin 2>$null
git remote add origin https://github.com/benivanny14/Genz-whatsapp.git

Write-Host "Inavuta (fetch) history kutoka GitHub... (Tafadhali thibitisha kama utaulizwa password/token)" -ForegroundColor Yellow
git fetch origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "Kuna tatizo wakati wa kuvuta (fetch) kutoka GitHub. Hakikisha una internet na umeweka password/token sahihi." -ForegroundColor Red
    exit 1
}

Write-Host "Inaunganisha history yako na files hizi mpya..." -ForegroundColor Cyan
git reset --mixed origin/main

Write-Host "Inaongeza files zote zilizobadilika..." -ForegroundColor Cyan
git add .

Write-Host "Ina-commit mabadiliko yako yote..." -ForegroundColor Cyan
git commit -m "Update from local changes"

Write-Host "Ina-push code kwenye GitHub... (Tafadhali thibitisha kama utaulizwa password/token)" -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Hongera! Code zako zote zimeingizwa kwenye GitHub kikamilifu bila makosa." -ForegroundColor Green
} else {
    Write-Host "Kuna tatizo wakati wa ku-push. Hakikisha una ruhusa (write access) kwenye hiyo repo." -ForegroundColor Red
}
