#!/bin/bash
set -e
BASE="http://localhost:5000"

# Login
T1=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"testuser1","password":"TestPass123!@#"}' | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).token||'')})")
T2=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"testuser2","password":"TestPass@234"}' | node -e "process.stdin.on('data',d=>{console.log(JSON.parse(d).token||'')})")

echo "=== TEST 1: TEXT STATUS ==="
RES=$(curl -s -X POST $BASE/api/advanced/status -H "Authorization: Bearer $T1" -H "Content-Type: application/json" \
  -d '{"type":"text","content":"Hello from API test! 🔥","backgroundColor":"#00a884","textColor":"#ffffff"}')
echo "Text status: $(echo $RES | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'PASS':'FAIL: '+JSON.stringify(j))})")"

echo "=== TEST 2: IMAGE STATUS ==="
# Create a tiny test PNG (1x1 pixel)
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00\x00\x49\x45\x4e\x44\xae\x42\x60\x82' > /tmp/test.png
RES=$(curl -s -X POST $BASE/api/advanced/status -H "Authorization: Bearer $T1" \
  -F "type=image" -F "content=Image status test" -F "media=@/tmp/test.png;type=image/png")
echo "Image status: $(echo $RES | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'PASS':'FAIL: '+JSON.stringify(j))})")"

echo "=== TEST 3: VIDEO STATUS ==="
# Create tiny test video (1 frame)
printf '\x00\x00\x00\x1c\x66\x74\x79\x70\x6d\x70\x34\x32' > /tmp/test.mp4
RES=$(curl -s -X POST $BASE/api/advanced/status -H "Authorization: Bearer $T1" \
  -F "type=video" -F "content=Video status test" -F "media=@/tmp/test.mp4;type=video/mp4")
echo "Video status: $(echo $RES | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'PASS':'FAIL: '+JSON.stringify(j))})")"

echo "=== TEST 4: VOICE/AUDIO STATUS ==="
printf '\x1a\x45\xdf\xa3\x93\x42\x86\x81\x01\x42\x40\x23\x49\x84\x80' > /tmp/test.ogg
RES=$(curl -s -X POST $BASE/api/advanced/status -H "Authorization: Bearer $T1" \
  -F "type=voice" -F "content=Voice status test" -F "media=@/tmp/test.ogg;type=audio/ogg")
echo "Voice status: $(echo $RES | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'PASS':'FAIL: '+JSON.stringify(j))})")"

echo "=== TEST 5: LOCATION STATUS ==="
RES=$(curl -s -X POST $BASE/api/advanced/status -H "Authorization: Bearer $T1" -H "Content-Type: application/json" \
  -d '{"type":"location","content":"Testing location","locationData":{"lat":-6.7924,"lng":39.2083,"name":"Dar es Salaam"}}')
echo "Location status: $(echo $RES | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'PASS':'FAIL: '+JSON.stringify(j))})")"

echo "=== TEST 6: MUSIC STATUS ==="
printf '\x1a\x45\xdf\xa3\x93\x42\x86\x81\x01\x42\x40\x23\x49\x84\x80' > /tmp/test-music.ogg
RES=$(curl -s -X POST $BASE/api/advanced/status -H "Authorization: Bearer $T1" \
  -F "type=music" -F "content=Music on status" -F "media=@/tmp/test-music.ogg;type=audio/ogg")
echo "Music status: $(echo $RES | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.success?'PASS':'FAIL: '+JSON.stringify(j))})")"

echo "=== TEST 7: FETCH STATUSES ==="
RES=$(curl -s $BASE/api/advanced/statuses -H "Authorization: Bearer $T1")
echo "Fetch statuses: $(echo $RES | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);const count=(j.statuses||[]).length;console.log(count>0?'PASS ('+count+' statuses)':'FAIL')})")"

echo ""
echo "=== ALL STATUS TESTS COMPLETE ==="
