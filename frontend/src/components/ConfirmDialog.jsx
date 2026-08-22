import React, { useState, createContext, useContext, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmDialogContext = createContext(null);

export const useConfirmDialog = () => useContext(ConfirmDialogContext);

export function ConfirmDialogProvider({ children }) {
  const [dialogState, setDialogState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogState({
        message,
        title: options.title || 'Confirm',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        danger: options.danger !== false,
        icon: options.icon || null,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setDialogState(null);
    resolveRef.current = null;
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setDialogState(null);
    resolveRef.current = null;
  }, []);

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {dialogState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a2e35] rounded-2xl w-full max-w-sm p-6 shadow-xl border border-[#00a884]/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {dialogState.icon || (
                    <AlertTriangle
                      size={20}
                      className={dialogState.danger ? 'text-red-500' : 'text-[#00a884]'}
                    />
                  )}
                  <h3 className="text-white font-semibold">{dialogState.title}</h3>
                </div>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-gray-300 text-sm mb-6 whitespace-pre-wrap">
                {dialogState.message}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-[#0b141a] text-gray-300 py-2.5 rounded-lg hover:text-white transition-colors text-sm font-medium"
                >
                  {dialogState.cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${
                    dialogState.danger
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-[#00a884] hover:bg-[#008f72]'
                  }`}
                >
                  {dialogState.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmDialogContext.Provider>
  );
}

/* Drop-in replacement for window.confirm()
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm('Delete this item?', { title: 'Delete', danger: true });
 *   if (ok) { ... }
 */
export const useConfirm = () => {
  const ctx = useConfirmDialog();
  if (!ctx) throw new Error('useConfirm must be used within ConfirmDialogProvider');
  return ctx.confirm;
};

export default ConfirmDialogProvider;
