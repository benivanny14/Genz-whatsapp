const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'public', 'screenshots');

async function captureScreenshots() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log('📸 Starting screenshot capture...\n');

  // 1. Landing Page (hero)
  console.log('1/12 Landing Page Hero...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'landing-hero.png'), fullPage: false });
  console.log('   ✅ landing-hero.png');

  // 2. Login Page
  console.log('2/12 Login Page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login.png'), fullPage: false });
  console.log('   ✅ login.png');

  // 3. Login Page - filled
  console.log('3/12 Login Page (filled)...');
  await page.fill('input[placeholder="+255712345678"]', 'admin');
  await page.fill('input[type="password"]', 'Admin@123456');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-filled.png'), fullPage: false });
  console.log('   ✅ login-filled.png');

  // 4. Login and go to Chat
  console.log('4/12 Chat List...');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/chat', { timeout: 10000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chat-list.png'), fullPage: false });
  console.log('   ✅ chat-list.png');

  // 5. Click first conversation
  console.log('5/12 Chat Conversation...');
  try {
    // Find and click a chat item - look for conversation list items
    const chatItem = page.locator('[class*="rounded"][class*="hover"]').filter({ has: page.locator('img, [class*="avatar"], [class*="rounded-full"]') }).first();
    if (await chatItem.count() > 0) {
      await chatItem.click();
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('   ⚠️ Could not click conversation, taking current page');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chat-conversation.png'), fullPage: false });
  console.log('   ✅ chat-conversation.png');

  // 6. Status Page
  console.log('6/12 Status Page...');
  await page.goto('http://localhost:5173/chat', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  // Click "Status" tab in bottom nav
  try {
    const statusBtn = page.locator('nav button, [class*="bottom"] button, [class*="nav"] button').filter({ hasText: /status/i });
    if (await statusBtn.count() > 0) {
      await statusBtn.first().click();
      await page.waitForTimeout(1500);
    } else {
      // Try clicking by icon position (Status is usually 2nd in bottom nav)
      const navButtons = page.locator('[class*="bottom"] button, nav button');
      const count = await navButtons.count();
      if (count >= 2) {
        await navButtons.nth(1).click();
        await page.waitForTimeout(1500);
      }
    }
  } catch (e) {
    console.log('   ⚠️ Status tab click failed');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'status-page.png'), fullPage: false });
  console.log('   ✅ status-page.png');

  // 7. Groups Page
  console.log('7/12 Groups Page...');
  try {
    const groupsBtn = page.locator('nav button, [class*="bottom"] button, [class*="nav"] button').filter({ hasText: /group|communit/i });
    if (await groupsBtn.count() > 0) {
      await groupsBtn.first().click();
      await page.waitForTimeout(1500);
    } else {
      const navButtons = page.locator('[class*="bottom"] button, nav button');
      const count = await navButtons.count();
      if (count >= 3) {
        await navButtons.nth(2).click();
        await page.waitForTimeout(1500);
      }
    }
  } catch (e) {
    console.log('   ⚠️ Groups tab click failed');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'groups-page.png'), fullPage: false });
  console.log('   ✅ groups-page.png');

  // 8. Winga Marketplace
  console.log('8/12 Winga Marketplace...');
  try {
    const wingaBtn = page.locator('nav button, [class*="bottom"] button, [class*="nav"] button').filter({ hasText: /winga/i });
    if (await wingaBtn.count() > 0) {
      await wingaBtn.first().click();
      await page.waitForTimeout(1500);
    } else {
      const navButtons = page.locator('[class*="bottom"] button, nav button');
      const count = await navButtons.count();
      if (count >= 4) {
        await navButtons.nth(3).click();
        await page.waitForTimeout(1500);
      }
    }
  } catch (e) {
    console.log('   ⚠️ Winga tab click failed');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'winga-marketplace.png'), fullPage: false });
  console.log('   ✅ winga-marketplace.png');

  // 9. Settings / Profile
  console.log('9/12 Settings Page...');
  try {
    const meBtn = page.locator('nav button, [class*="bottom"] button, [class*="nav"] button').filter({ hasText: /me|profile|setting/i });
    if (await meBtn.count() > 0) {
      await meBtn.first().click();
      await page.waitForTimeout(1500);
    } else {
      const navButtons = page.locator('[class*="bottom"] button, nav button');
      const count = await navButtons.count();
      if (count >= 5) {
        await navButtons.nth(4).click();
        await page.waitForTimeout(1500);
      }
    }
  } catch (e) {
    console.log('   ⚠️ Settings tab click failed');
  }
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'settings-page.png'), fullPage: false });
  console.log('   ✅ settings-page.png');

  // 10. Notifications
  console.log('10/12 Notifications...');
  await page.goto('http://localhost:5173/notifications', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'notifications-page.png'), fullPage: false });
  console.log('   ✅ notifications-page.png');

  // 11. Register Page
  console.log('11/12 Register Page...');
  await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'register-page.png'), fullPage: false });
  console.log('   ✅ register-page.png');

  // 12. Landing Page - Features section
  console.log('12/12 Landing Features...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'instant' });
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'landing-features.png'), fullPage: false });
  console.log('   ✅ landing-features.png');

  // Summary
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  console.log(`\n✅ Done! ${files.length} screenshots captured:`);
  files.sort().forEach(f => {
    const stats = fs.statSync(path.join(SCREENSHOT_DIR, f));
    console.log(`   📁 ${f} (${(stats.size / 1024).toFixed(0)}KB)`);
  });

  await browser.close();
}

captureScreenshots().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
