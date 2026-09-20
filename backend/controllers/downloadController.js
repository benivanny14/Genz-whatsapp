const fs = require('fs');
const path = require('path');

const CANDIDATE_DIRS = [
  path.resolve(__dirname, '../downloads'),
  path.resolve(__dirname, '../../frontend/public/downloads'),
  path.resolve(__dirname, '../../frontend/dist/downloads')
];

const findFile = (filename) => {
  for (const dir of CANDIDATE_DIRS) {
    const full = path.join(dir, filename);
    if (fs.existsSync(full)) return full;
  }
  return null;
};

const findDownloadPage = () => {
  const pages = [
    path.resolve(__dirname, '../../frontend/public/download.html'),
    path.resolve(__dirname, '../../frontend/dist/download.html')
  ];
  return pages.find((file) => fs.existsSync(file));
};

exports.serveDownloadPage = (req, res) => {
  const page = findDownloadPage();
  if (!page) {
    return res.status(404).type('html').send('<h1>Download page not found</h1>');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'"
  );
  res.sendFile(page);
};

exports.serveVersionJson = (req, res) => {
  const file = findFile('version.json');
  if (!file) {
    return res.json({
      versionName: '1.0.0',
      version: '1.0.0',
      versionCode: 1,
      sha256: '',
      size: 0,
      apkUrl: '/downloads/genz-whatsapp.apk',
      buildDate: null
    });
  }
  res.setHeader('Cache-Control', 'no-store');
  res.type('application/json').send(fs.readFileSync(file, 'utf8'));
};

exports.serveApk = (req, res) => {
  const file = findFile('genz-whatsapp.apk') || findFile('genz-whatsapp-latest.apk');
  if (!file) {
    return res.status(404).json({ success: false, message: 'APK is not published yet' });
  }
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="genz-whatsapp.apk"');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(file).pipe(res);
};
