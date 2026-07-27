import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Globe, X } from 'lucide-react';

const PrivacyPolicyAnimation = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="bg-dark-surface w-full max-w-lg rounded-2xl shadow-2xl border border-dark-border overflow-hidden"
          >
            <div className="p-4 bg-primary-600 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} />
                <h2 className="font-bold text-lg">GENZ Privacy & Security</h2>
              </div>
              <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full" aria-label="Close"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4 text-dark-text">
              <p className="text-sm flex items-center gap-2">
                <Lock size={16} className="text-primary-500" />
                Your messages are End-to-End Encrypted. Only you and the recipient can read them.
              </p>
              <p className="text-sm flex items-center gap-2">
                <Globe size={16} className="text-primary-500" />
                We do not store your personal data on our servers. Your privacy is our priority.
              </p>
              <p className="text-sm flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary-500" />
                Advanced security features like App Lock and Anti-Screenshot protect your conversations.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all mt-4"
              >
                Got it!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PrivacyPolicyAnimation;
