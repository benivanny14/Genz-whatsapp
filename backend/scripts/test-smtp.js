/**
 * test-smtp.js — Test SMTP email configuration for Genz Messenger
 *
 * Usage:
 *   node scripts/test-smtp.js
 *   node scripts/test-smtp.js --to recipient@example.com
 *
 * Reads SMTP_* env vars from backend/.env (loads dotenv automatically).
 * Sends a single test email and reports the result.
 *
 * Fully safe: NEVER throws. Reports success/failure to stdout.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const nodemailer = require('nodemailer');

// Parse --to flag
const toFlagIndex = process.argv.indexOf('--to');
const customTo = toFlagIndex !== -1 ? process.argv[toFlagIndex + 1] : null;

async function testSmtp() {
  console.log('═══════════════════════════════════════════════');
  console.log('  SMTP Configuration Test — Genz Messenger');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Check config
  const config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-4) : '(empty)',
    from: process.env.SMTP_FROM || process.env.FROM_EMAIL,
    to: customTo || process.env.ALERT_EMAIL_TO || process.env.SMTP_USER,
  };

  console.log('📋 Configuration:');
  console.log(`   Host:     ${config.host || '❌ NOT SET'}`);
  console.log(`   Port:     ${config.port || '❌ NOT SET'}`);
  console.log(`   Secure:   ${config.secure}`);
  console.log(`   User:     ${config.user || '❌ NOT SET'}`);
  console.log(`   Password: ${config.pass}`);
  console.log(`   From:     ${config.from || '❌ NOT SET'}`);
  console.log(`   To:       ${config.to || '❌ NOT SET'}`);
  console.log('');

  // 2. Validate required fields
  const missing = [];
  if (!config.host) missing.push('SMTP_HOST');
  if (!config.user) missing.push('SMTP_USER');
  if (!config.to) missing.push('SMTP_USER or ALERT_EMAIL_TO (recipient)');

  if (missing.length > 0) {
    console.log('❌ Missing required configuration:');
    missing.forEach(m => console.log(`   - ${m}`));
    console.log('\n📝 Add these to backend/.env:');
    console.log('   SMTP_HOST=smtp.gmail.com');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_SECURE=false');
    console.log('   SMTP_USER=your-email@gmail.com');
    console.log('   SMTP_PASS=xxxx-xxxx-xxxx-xxxx  (Gmail App Password)');
    console.log('   SMTP_FROM=noreply@genz-whatsapp.com');
    console.log('   ALERT_EMAIL_TO=your-email@gmail.com');
    console.log('\n💡 Get Gmail App Password at: https://myaccount.google.com/apppasswords');
    process.exit(1);
  }

  // 3. Create transporter
  console.log('🔄 Connecting to SMTP server...');
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || '',
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP server connection verified!\n');
  } catch (error) {
    console.log('❌ SMTP connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log('\n🔧 Troubleshooting:');
    if (error.message.includes('EAUTH')) {
      console.log('   → Authentication failed. Check SMTP_USER and SMTP_PASS.');
      console.log('   → Gmail: Use App Password, NOT your account password.');
      console.log('   → Go to: https://myaccount.google.com/apppasswords');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('   → Connection refused. Check SMTP_HOST and SMTP_PORT.');
    } else if (error.message.includes('ETIMEDOUT')) {
      console.log('   → Connection timed out. Check your network/firewall.');
    }
    process.exit(1);
  }

  // 4. Send test email
  const now = new Date();
  const testSubject = `[Genz Messenger] SMTP Test — ${now.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}`;
  const testHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #25D366; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0;">✅ SMTP Test Successful</h1>
      </div>
      <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
        <p>Habari!</p>
        <p>Barua pepe hii inathibitisha kuwa SMTP configuration ya <strong>Genz Messenger</strong> inafanya kazi vizuri.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Server:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${process.env.SMTP_HOST}:${process.env.SMTP_PORT}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>From:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${config.from}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${now.toISOString()}</td></tr>
          <tr><td style="padding: 8px;"><strong>Status:</strong></td><td style="padding: 8px; color: green; font-weight: bold;">OPERATIONAL</td></tr>
        </table>
        <p style="color: #666; font-size: 12px;">— Genz Messenger SMTP Health Check</p>
      </div>
    </div>
  `;

  console.log('📧 Sending test email...');
  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: config.to,
      subject: testSubject,
      text: `SMTP Test Successful! Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}. Time: ${now.toISOString()}`,
      html: testHtml,
    });

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  ✅ SMTP TEST PASSED — EMAIL SENT!');
    console.log('═══════════════════════════════════════════════');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Sent to:    ${config.to}`);
    console.log(`   Server:     ${config.host}:${config.port}`);
    console.log('');
  } catch (error) {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  ❌ SMTP TEST FAILED — EMAIL NOT SENT');
    console.log('═══════════════════════════════════════════════');
    console.log(`   Error: ${error.message}`);
    if (error.message.includes('EAUTH')) {
      console.log('\n   💡 Gmail App Password required:');
      console.log('      1. Go to https://myaccount.google.com/apppasswords');
      console.log('      2. Create new App Password for "Genz Messenger"');
      console.log('      3. Copy the 16-char code and set SMTP_PASS in .env');
    }
    process.exit(1);
  }

  transporter.close();
}

testSmtp().catch(() => process.exit(1));
