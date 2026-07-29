import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  X, 
  Camera, 
  AlertTriangle,
  Check,
  EyeOff
} from 'lucide-react';

const AntiScreenshot = ({ enabled, onToggle }) => {
  const [isDetected, setIsDetected] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    // Detect screenshot attempts
    const detectScreenshot = () => {
      setIsDetected(true);
      setWarningCount(prev => prev + 1);
      setShowWarning(true);
      
      // Clear sensitive content or blur it
      document.body.style.filter = 'blur(10px)';
      
      setTimeout(() => {
        document.body.style.filter = 'none';
        setShowWarning(false);
        setIsDetected(false);
      }, 3000);
    };

    // Listen for screenshot events
    const handleKeyDown = (e) => {
      // Detect common screenshot shortcuts
      if (
        (e.ctrlKey && e.key === 'PrintScreen') ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) ||
        (e.key === 'PrintScreen')
      ) {
        e.preventDefault();
        detectScreenshot();
      }
    };

    // Detect visibility changes (could indicate screenshot)
    const handleVisibilityChange = () => {
      if (document.hidden && enabled) {
        // Could be a screenshot attempt
        // In production, you might want to be more sophisticated
      }
    };

    // Detect DevTools opening (could indicate screenshot attempt)
    const handleDevTools = (e) => {
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && e.keyCode === 73)) {
        // F12 or Ctrl+Shift+I
        if (enabled) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleDevTools);

    // Prevent context menu (right-click)
    const handleContextMenu = (e) => {
      if (enabled) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleDevTools);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled]);

  return (
    <>
      {/* Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Screenshot Detected</h3>
                <p className="text-gray-600 mb-4">
                  Screenshot protection is enabled. Taking screenshots is not allowed for privacy reasons.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700">
                      Warning count: {warningCount}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarning(false)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  I Understand
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <EyeOff className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-800">Anti-Screenshot</h4>
          <p className="text-xs text-gray-500">Prevent screenshots of sensitive content</p>
        </div>
        <button
          onClick={onToggle}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            enabled ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              enabled ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>
    </>
  );
};

// Hook for anti-screenshot protection
export const useAntiScreenshot = (enabled = true) => {
  const [isProtected, setIsProtected] = useState(enabled);

  useEffect(() => {
    if (!isProtected) return;

    const preventScreenshot = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Show warning
      const event = new CustomEvent('screenshot-attempted');
      window.dispatchEvent(event);
    };

    // Prevent PrintScreen
    window.addEventListener('keydown', (e) => {
      if (e.key === 'PrintScreen' || 
          (e.ctrlKey && e.key === 'PrintScreen') ||
          (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4'))) {
        preventScreenshot(e);
      }
    });

    // Prevent right-click
    document.addEventListener('contextmenu', preventScreenshot);

    // Prevent drag
    document.addEventListener('dragstart', preventScreenshot);

    // Prevent select
    document.addEventListener('selectstart', preventScreenshot);

    return () => {
      window.removeEventListener('keydown', preventScreenshot);
      document.removeEventListener('contextmenu', preventScreenshot);
      document.removeEventListener('dragstart', preventScreenshot);
      document.removeEventListener('selectstart', preventScreenshot);
    };
  }, [isProtected]);

  return { isProtected, setIsProtected };
};

export default AntiScreenshot;
