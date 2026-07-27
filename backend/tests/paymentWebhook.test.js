const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Subscription = require('../models/Subscription');

const createMpesaPayload = () => ({
  Body: {
    stkCallback: {
      MerchantRequestID: 'merchant-request-1',
      CheckoutRequestID: 'checkout-request-1',
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: {
        Item: [
          { Name: 'Amount', Value: 10000 },
          { Name: 'MpesaReceiptNumber', Value: 'MPESA12345' },
          { Name: 'TransactionDate', Value: 20260515123045 },
          { Name: 'PhoneNumber', Value: 255700000002 }
        ]
      }
    }
  }
});

describe('Payment webhooks', () => {
  it('processes duplicate M-Pesa success callbacks only once', async () => {
    const user = await User.create({
      username: 'payuser',
      phoneNumber: '255700000002',
      email: 'payuser@example.com'
    });

    await Transaction.create({
      userId: user._id,
      provider: 'mpesa',
      type: 'subscription',
      amount: 10000,
      currency: 'TZS',
      phoneNumber: '255700000002',
      reference: 'GENZ Subscription',
      description: 'Premium subscription payment',
      transactionId: 'MPESA-test-1',
      merchantRequestID: 'merchant-request-1',
      checkoutRequestID: 'checkout-request-1',
      status: 'processing'
    });

    const payload = createMpesaPayload();

    const first = await request(app)
      .post('/api/payment/webhook/mpesa')
      .send(payload);

    expect(first.statusCode).toBe(200);
    expect(first.body.success).toBe(true);

    const afterFirstUser = await User.findById(user._id);
    const firstExpiry = afterFirstUser.subscriptionExpiresAt.toISOString();

    const second = await request(app)
      .post('/api/payment/webhook/mpesa')
      .send(payload);

    expect(second.statusCode).toBe(200);
    expect(second.body.success).toBe(true);

    const afterSecondUser = await User.findById(user._id);
    expect(afterSecondUser.subscriptionExpiresAt.toISOString()).toBe(firstExpiry);

    const subscription = await Subscription.findOne({ userId: user._id.toString() });
    expect(subscription.paymentStatus).toBe('completed');
    expect(subscription.processedTransactionIds).toEqual(['MPESA-test-1']);
    expect(subscription.paymentHistory.filter((item) => item.status === 'completed')).toHaveLength(1);

    const transaction = await Transaction.findOne({ transactionId: 'MPESA-test-1' });
    expect(transaction.status).toBe('completed');
    expect(transaction.webhookEvents.map((event) => event.status)).toEqual(['completed', 'duplicate']);
  });
});
