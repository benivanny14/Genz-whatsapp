(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `e2e_test_${Date.now()}`, phoneNumber: `900${String(Date.now()).slice(-7)}`, password: 'Test1234' })
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (e) {
    console.error('ERROR', e.message || e);
  }
})();
