#!/usr/bin/env node

// Connection test script for GENZ WhatsApp development environment
// Tests all critical connections and endpoints

import http from 'http';

console.log('🔍 Testing GENZ WhatsApp Development Connections...\n');

// Test functions
const testConnection = (url, name) => {
  return new Promise((resolve) => {
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.path,
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      console.log(`✅ ${name}: HTTP ${res.statusCode} - ${url.href}`);
      resolve({ success: true, status: res.statusCode, url: url.href });
    });

    req.on('error', (err) => {
      console.log(`❌ ${name}: ${err.message} - ${url.href}`);
      resolve({ success: false, error: err.message, url: url.href });
    });

    req.on('timeout', () => {
      console.log(`⏱️ ${name}: Timeout - ${url.href}`);
      req.destroy();
      resolve({ success: false, error: 'timeout', url: url.href });
    });

    req.end();
  });
};

// Test endpoints
const tests = [
  {
    name: 'Frontend Server',
    url: new URL('http://localhost:5174')
  },
  {
    name: 'Backend API Health',
    url: new URL('http://localhost:5000/api/device')
  },
  {
    name: 'Backend GENZ Mods',
    url: new URL('http://localhost:5000/api/genz-mods/settings')
  },
  {
    name: 'Backend Broadcast',
    url: new URL('http://localhost:5000/api/advanced/broadcast')
  },
  {
    name: 'Backend Status',
    url: new URL('http://localhost:5000/api/advanced/status')
  }
];

// Run all tests
async function runTests() {
  console.log('📡 Testing HTTP connections...\n');
  
  const results = await Promise.all(tests.map(test => testConnection(test.url, test.name)));
  
  console.log('\n📊 Test Results Summary:');
  console.log('─'.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n🔧 Failed Connections:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   • ${result.url}`);
    });
  }
  
  console.log('\n🎯 Expected Development Setup:');
  console.log('   Frontend: http://localhost:5174');
  console.log('   Backend:  http://localhost:5000');
  console.log('   Vite HMR: ws://localhost:5174');
  console.log('   Socket.IO: ws://localhost:5000');
  
  if (successful === results.length) {
    console.log('\n🎉 All connections successful! Development environment is ready.');
  } else {
    console.log('\n⚠️ Some connections failed. Check server status.');
  }
}

runTests().catch(console.error);
