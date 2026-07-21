import React, { useState } from 'react';
import { Fingerprint, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FingerprintSimulation = ({ onComplete }) => {
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setDone(true);
      setTimeout(() => {
        localStorage.setItem('genz_fingerprint_sim_done', 'true');
        onComplete();
      }, 1500);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-dark-bg flex items-center justify-center flex-col p-6 text-center">
      <AnimatePresence mode="wait">
        {!done ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.2, opacity: 0 }}
            className="flex flex-col items-center"
          >
            <div className={`relative p-8 rounded-full border-4 ${scanning ? 'border-primary-500 animate-pulse' : 'border-dark-border'} transition-colors duration-500 mb-8 cursor-pointer`} onClick={handleScan}>
              <Fingerprint size={120} className={`${scanning ? 'text-primary-500' : 'text-dark-textSecondary'} transition-colors duration-500`} />
              {scanning && (
                <motion.div
                  initial={{ top: '0%' }} animate={{ top: '100%' }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-1 bg-primary-500 shadow-[0_0_15px_rgba(37,211,102,0.8)]"
                />
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{scanning ? 'Scanning biometric data...' : 'Initial Security Setup'}</h2>
            <p className="text-dark-textSecondary max-w-xs">Tap the fingerprint sensor to initialize GENZ Biometric Security for the first time.</p>
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
            <ShieldCheck size={100} className="text-primary-500 mb-6" />
            <h2 className="text-3xl font-bold text-white">Security Initialized!</h2>
            <p className="text-primary-500 mt-2 font-medium">Welcome to GENZ WhatsApp Ultra Secure</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FingerprintSimulation;
