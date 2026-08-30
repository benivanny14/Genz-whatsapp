#!/usr/bin/env node
const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add imports
if (!c.includes('initBackgroundSync')) {
  const anchor = "import { authenticateWithBiometric } from './services/capacitorBridge';";
  c = c.replace(
    anchor,
    anchor + "\nimport { initBackgroundSync } from './services/backgroundSync';\nimport { setStatusBar } from './utils/statusBarHelper';"
  );
  console.log('Added imports');
}

// 2. Add useEffect for backgroundSync + splash screen
if (!c.includes('initBackgroundSync().catch')) {
  const anchor = "  }, []);\n\n  return (";
  const replacement = `  }, []);

  // --- Native: background sync + status bar (APK only) ---
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initBackgroundSync().catch(() => {});
      setStatusBar({ style: 'dark', color: '#111b21' });

      // Hide splash screen after initial render
      import('@capacitor/splash-screen').then(({ SplashScreen }) => {
        setTimeout(() => SplashScreen.hide().catch(() => {}), 500);
      });
    }
  }, []);

  return (`;
  c = c.replace(anchor, replacement);
  console.log('Added backgroundSync useEffect');
}

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('App.jsx updated');
