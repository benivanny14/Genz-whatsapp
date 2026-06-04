const https = require('https');

https.get('https://genz-whatsapp-2.onrender.com/api/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Health API Response Status:", res.statusCode);
    console.log("Health API Response:", data);
  });
}).on('error', err => {
  console.log("Error:", err.message);
});
