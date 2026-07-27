jest.mock('../models/ManualPayment', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../utils/mobileMoneySmsParser', () => ({
  parsePaymentSms: jest.fn(),
  isValidTransactionId: jest.fn()
}));

describe('manual payment receiver settings', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.MANUAL_PAYMENT_RECEIVER_NAME;
    delete process.env.MANUAL_PAYMENT_RECEIVER_NUMBER;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the latest receiver details from the environment for the payment info response', async () => {
    process.env.MANUAL_PAYMENT_RECEIVER_NAME = 'Old Receiver';
    process.env.MANUAL_PAYMENT_RECEIVER_NUMBER = '0711111111';

    const controller = require('../controllers/manualPaymentController');

    process.env.MANUAL_PAYMENT_RECEIVER_NAME = 'New Receiver';
    process.env.MANUAL_PAYMENT_RECEIVER_NUMBER = '0712345678';

    const res = { json: jest.fn() };
    await controller.getPaymentInfo({}, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      receiverName: 'New Receiver',
      receiverNumber: '0712345678'
    }));
  });
});
