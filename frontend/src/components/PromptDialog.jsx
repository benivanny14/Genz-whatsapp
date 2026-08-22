import React, { useState, createContext, useContext, useCallback, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PromptDialogContext = createContext(null);

export const usePromptDialog = () => useContext(PromptDialogContext);

export function PromptDialogProvider({ children }) {
  const [dialogState, setDialogState] = useState(null);
  const resolveRef = useRef(null);

  const prompt = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialogState({
        message,
        title: options.title || 'Input',
        defaultValue: options.defaultValue || '',
        placeholder: options.placeholder || '',
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        inputType: options.inputType || 'text',
        validator: options.validator || null,
      });
    });
  }, []);

  const handleSubmit = useCallback(() => {
    if (dialogState?.validator) {
      const error = dialogState.validator(dialogState.defaultValue);
      if (error) {
        setDialogState((prev) => ({ ...prev, error }));
        return;
      }
    }
    resolveRef.current?.(dialogState.defaultValue);
    setDialogState(null);
    resolveRef.current = null;
  }, [dialogState]);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(null);
    setDialogState(null);
    resolveRef.current = null;
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleSubmit, handleCancel]);

  return (
    <PromptDialogContext.Provider value={{ prompt }}>
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
                  <MessageSquare size={20} className="text-[#00a884]" />
                  <h3 className="text-white font-semibold">{dialogState.title}</h3>
                </div>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-gray-300 text-sm mb-4 whitespace-pre-wrap">
                {dialogState.message}
              </p>

              <input
                type={dialogState.inputType}
                value={dialogState.defaultValue}
                onChange={(e) => {
                  setDialogState((prev) => ({
                    ...prev,
                    defaultValue: e.target.value,
                    error: null,
                  }));
                }}
                onKeyDown={handleKeyDown}
                placeholder={dialogState.placeholder}
                autoFocus
                className="w-full bg-[#0b141a] text-white px-4 py-3 rounded-lg border border-[#00a884]/30 focus:border-[#00a884] outline-none text-sm mb-1 placeholder-gray-500"
              />

              {dialogState.error && (
                <p className="text-red-400 text-xs mb-3">{dialogState.error}</p>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-[#0b141a] text-gray-300 py-2.5 rounded-lg hover:text-white transition-colors text-sm font-medium"
                >
                  {dialogState.cancelText}
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-[#00a884] text-white py-2.5 rounded-lg hover:bg-[#008f72] transition-colors text-sm font-medium"
                >
                  {dialogState.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PromptDialogContext.Provider>
  );
}

/* Drop-in replacement for window.prompt()
 * Usage:
 *   const prompt = usePrompt();
 *   const name = await prompt('Enter your name:', { title: 'Rename', defaultValue: 'John' });
 *   if (name !== null) { ... }
 */
export const usePrompt = () => {
  const ctx = usePromptDialog();
  if (!ctx) throw new Error('usePrompt must be used within PromptDialogProvider');
  return ctx.prompt;
};

export default PromptDialogProvider;
