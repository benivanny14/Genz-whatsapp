/**
 * Test PesaPal Integration
 * Run this script to verify PesaPal connection
 */

require('dotenv').config();
const { getPesapalAuthToken } = require('../services/pesapalService');

async function testPesaPal() {
  console.log('Testing PesaPal Integration...\n');
  console.log('PESAPAL_BASE_URL:', process.env.PESAPAL_BASE_URL);
  console.log('PESAPAL_CONSUMER_KEY:', process.env.PESAPAL_CONSUMER_KEY ? 'Set' : 'Not set');
  console.log('PESAPAL_CONSUMER_SECRET:', process.env.PESAPAL_CONSUMER_SECRET ? 'Set' : 'Not set');
  console.log('');

  try {
    const token = await getPesapalAuthToken();
    console.log('✅ SUCCESS: Auth token obtained!');
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('\nPesaPal integration is working correctly.');
  } catch (error) {
    console.error('❌ FAILED: Could not obtain auth token');
    console.error('Error:', error.message);
    console.error('\nPlease check your PesaPal credentials in .env file.');
    process.exit(1);
  }
}

testPesaPal();
