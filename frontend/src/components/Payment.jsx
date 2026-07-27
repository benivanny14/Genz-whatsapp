import React, { useState } from 'react';
import { CreditCard, X, Check, RefreshCw, Wallet, Send, QrCode, History, AlertTriangle, Shield, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Payment = ({ user, onSendPayment, onRequestPayment, onHistory, onClose }) => {
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // wallet, card, bank

  const paymentMethods = [
    { id: 'wallet', label: 'WhatsApp Pay', icon: Wallet },
    { id: 'card', label: 'Credit/Debit Card', icon: CreditCard },
    { id: 'bank', label: 'Bank Account', icon: Shield }
  ];

  const handleSendPayment = async () => {
    if (!amount || !recipient) return;

    setIsSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSending(false);

    if (onSendPayment) {
      onSendPayment({
        amount: parseFloat(amount),
        recipient,
        note,
        method: paymentMethod
      });
    }

    setAmount('');
    setRecipient('');
    setNote('');
  };

  const handleGenerateQR = () => {
    setShowQR(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CreditCard className="text-[#00a884]" size={20} />
            <h3 className="text-white font-semibold">Payment</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Balance */}
        <div className="bg-[#0b141a] rounded-lg p-4 mb-4 border border-[#00a884]/20">
          <p className="text-gray-400 text-sm mb-1">Available balance</p>
          <p className="text-white text-2xl font-bold">$1,250.00</p>
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Payment method</p>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map(method => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    paymentMethod === method.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-[#0b141a] text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="mx-auto mb-1" />
                  <span className="text-xs">{method.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Amount</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-lg">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#0b141a] text-white pl-8 pr-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none text-lg"
            />
          </div>
        </div>

        {/* Recipient */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Send to</p>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Phone number or name"
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          />
        </div>

        {/* Note */}
        <div className="mb-4">
          <p className="text-gray-400 text-sm mb-2">Note (optional)</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note"
            className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] focus:outline-none"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendPayment}
          disabled={isSending || !amount || !recipient}
          className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors disabled:bg-[#00a884]/50 disabled:text-white/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
        >
          {isSending ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Sending...
            </>
          ) : (
            <>
              <Send size={18} />
              Send Payment
            </>
          )}
        </button>

        {/* QR Code Button */}
        <button
          onClick={handleGenerateQR}
          className="w-full bg-[#0b141a] text-white py-3 rounded-lg hover:bg-[#1a2e35] transition-colors flex items-center justify-center gap-2"
        >
          <QrCode size={18} />
          Generate QR Code
        </button>

        {/* History Button */}
        <button
          onClick={onHistory}
          className="w-full text-gray-400 py-2 rounded-lg hover:text-white transition-colors flex items-center justify-center gap-2 mt-2"
        >
          <History size={16} />
          View Payment History
        </button>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          >
            <div className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-semibold">Your QR Code</h3>
                <button
                  onClick={() => setShowQR(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-white rounded-lg p-8 mb-4">
                <div className="w-48 h-48 bg-gray-200 mx-auto flex items-center justify-center">
                  <QrCode size={64} className="text-gray-400" />
                </div>
              </div>

              <p className="text-gray-400 text-sm text-center mb-4">
                Scan this QR code to send money to {user?.name || 'you'}
              </p>

              <button
                onClick={() => setShowQR(false)}
                className="w-full bg-[#00a884] text-white py-3 rounded-lg hover:bg-[#008f72] transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Payment Settings Component
export const PaymentSettings = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white font-medium flex items-center gap-2">
            <CreditCard size={18} className="text-[#00a884]" />
            Payments
          </p>
          <p className="text-gray-400 text-sm">Send and receive money</p>
        </div>
        <button
          onClick={() => onUpdate({ ...settings, paymentsEnabled: !settings.paymentsEnabled })}
          className={`w-12 h-6 rounded-full transition-all ${
            settings.paymentsEnabled ? 'bg-[#00a884]' : 'bg-[#0b141a]'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition-all ${
              settings.paymentsEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.paymentsEnabled && (
        <div className="space-y-3 pl-4 border-l-2 border-[#00a884]/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Require PIN for payments</p>
              <p className="text-gray-400 text-xs">Add security layer</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, requirePaymentPin: !settings.requirePaymentPin })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.requirePaymentPin ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.requirePaymentPin ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Show payment notifications</p>
              <p className="text-gray-400 text-xs">Alert on transactions</p>
            </div>
            <button
              onClick={() => onUpdate({ ...settings, paymentNotifications: !settings.paymentNotifications })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.paymentNotifications ? 'bg-[#00a884]' : 'bg-[#0b141a]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-all ${
                  settings.paymentNotifications ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Payment Button Component
export const PaymentButton = ({ onOpen }) => {
  return (
    <button
      onClick={onOpen}
      className="p-2 rounded-full text-gray-400 hover:text-[#00a884] hover:bg-[#00a884]/10 transition-colors"
      title="Send payment"
    >
      <CreditCard size={18} />
    </button>
  );
};

// Payment History Component
export const PaymentHistory = ({ transactions }) => {
  return (
    <div className="space-y-2">
      {transactions.map(transaction => (
        <motion.div
          key={transaction._id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                transaction.type === 'sent' ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                {transaction.type === 'sent' ? (
                  <Send size={20} className="text-red-500" />
                ) : (
                  <Wallet size={20} className="text-green-500" />
                )}
              </div>
              <div>
                <p className="text-white font-medium">{transaction.recipient}</p>
                <p className="text-gray-400 text-xs">{new Date(transaction.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-medium ${transaction.type === 'sent' ? 'text-red-500' : 'text-green-500'}`}>
                {transaction.type === 'sent' ? '-' : '+'}${transaction.amount.toFixed(2)}
              </p>
              <p className="text-gray-400 text-xs">{transaction.status}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// Payment Request Component
export const PaymentRequest = ({ request, onAccept, onReject }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#0b141a] rounded-lg p-4 border border-[#00a884]/20"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-[#00a884]/20 rounded-full flex items-center justify-center">
          <Wallet size={20} className="text-[#00a884]" />
        </div>
        <div>
          <p className="text-white font-medium">{request.sender}</p>
          <p className="text-gray-400 text-sm">Payment Request</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <p className="text-white text-xl font-bold">${request.amount.toFixed(2)}</p>
        <p className="text-gray-400 text-xs">{new Date(request.date).toLocaleDateString()}</p>
      </div>

      {request.note && (
        <p className="text-gray-400 text-sm mb-3 italic">"{request.note}"</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onAccept?.(request._id)}
          className="flex-1 bg-[#00a884] text-white py-2 rounded-lg hover:bg-[#008f72] transition-colors text-sm"
        >
          Pay
        </button>
        <button
          onClick={() => onReject?.(request._id)}
          className="flex-1 bg-[#0b141a] text-white py-2 rounded-lg hover:bg-[#1a2e35] transition-colors text-sm"
        >
          Decline
        </button>
      </div>
    </motion.div>
  );
};

// Payment Success Component
export const PaymentSuccess = ({ transaction, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#00a884]/10 border border-[#00a884] rounded-lg p-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 bg-[#00a884] rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-white" />
        </div>
        <h3 className="text-white text-xl font-semibold mb-2">Payment Successful!</h3>
        <p className="text-white text-2xl font-bold mb-1">${transaction.amount.toFixed(2)}</p>
        <p className="text-gray-400 text-sm mb-4">Sent to {transaction.recipient}</p>
        <button
          onClick={onClose}
          className="bg-[#00a884] text-white px-6 py-2 rounded-lg hover:bg-[#008f72] transition-colors"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
};

export default Payment;
