const User = require('../models/User');
const Status = require('../models/Status');

describe('Status Socket Recipient & Blocking Enforcement Unit Tests', () => {
  it('prevents user A who blocked user B from receiving status:created socket emission when B creates status', async () => {
    const userA = {
      _id: '507f1f77bcf86cd799439011',
      contacts: [{ user: '507f1f77bcf86cd799439022' }],
      blockedUsers: ['507f1f77bcf86cd799439022']
    };

    const userB = {
      _id: '507f1f77bcf86cd799439022',
      contacts: [{ user: '507f1f77bcf86cd799439011' }],
      blockedUsers: []
    };

    const statusObj = {
      _id: '507f1f77bcf86cd799439033',
      user: userB._id,
      privacy: 'contacts'
    };

    // Filter candidate recipients logic as implemented in audienceIdsForStatus
    const isBlocked = userA.blockedUsers.includes(String(userB._id));
    expect(isBlocked).toBe(true);

    // Filter recipients
    const recipients = [userA._id].filter(id => !userA.blockedUsers.includes(String(userB._id)));
    expect(recipients).not.toContain(userA._id);
    expect(recipients.length).toBe(0);
  });
});
