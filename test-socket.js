const io = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected!');
  
  socket.emit('message:send', {
    conversationId: '665f80b1e4b00c3b04c8f0a0', // Just a dummy valid objectid
    content: 'Test message',
    messageType: 'text',
    messageId: 'test1234'
  });
});

socket.on('message:error', (err) => {
  console.log('Error from socket:', err);
  process.exit();
});

socket.on('message:delivered', (data) => {
  console.log('Delivered:', data);
  process.exit();
});

setTimeout(() => process.exit(), 5000);
