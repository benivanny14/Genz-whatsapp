import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type,
      duration: options.duration || (type === 'error' ? 5000 : type === 'success' ? 3000 : 4000),
      persistent: options.persistent || false,
      action: options.action || null,
      position: options.position || 'top-right'
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove toast after duration (unless persistent)
    if (!newToast.persistent) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, options) => {
    addToast(message, 'success', options);
  }, [addToast]);

  const error = useCallback((message, options) => {
    addToast(message, 'error', options);
  }, [addToast]);

  const info = useCallback((message, options) => {
    addToast(message, 'info', options);
  }, [addToast]);

  const warning = useCallback((message, options) => {
    addToast(message, 'warning', options);
  }, [addToast]);

  const clear = useCallback(() => {
    setToasts([]);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
    }
  };

  const getPositionClasses = (position) => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  return (
    <ToastContext.Provider value={{ success, error, info, warning, clear, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed inset-0 pointer-events-none z-[9999] space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -50, scale: 0.3 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.3 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`absolute ${getPositionClasses(toast.position)} pointer-events-auto`}
            >
              <div className={`
                flex items-start space-x-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm
                ${getBackgroundColor(toast.type)}
                max-w-md min-w-[300px]
              `}>
                {/* Icon */}
                <div className="flex-shrink-0">
                  {getIcon(toast.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium break-words">
                    {toast.message}
                  </p>
                  
                  {/* Action Button */}
                  {toast.action && (
                    <button
                      onClick={toast.action.handler}
                      className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>

                {/* Close Button */}
                {!toast.persistent && (
                  <button
                    onClick={() => removeToast(toast.id)}
                    className="flex-shrink-0 p-1 hover:bg-black/10 rounded-full transition-colors"
                   aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// Toast Component for individual usage
export const Toast = ({ message, type = 'info', duration, persistent = false, action, position = 'top-right' }) => {
  const { addToast } = useToast();

  React.useEffect(() => {
    addToast(message, type, { duration, persistent, action, position });
  }, [message, type, duration, persistent, action, position]);

  return null; // This component doesn't render anything, it just triggers toasts
};

// Hook for easy usage
export const useToastNotifications = () => {
  const { success, error, info, warning, clear } = useToast();

  return {
    success: (message, options) => success(message, options),
    error: (message, options) => error(message, options),
    info: (message, options) => info(message, options),
    warning: (message, options) => warning(message, options),
    clear
  };
};

export default ToastProvider;
