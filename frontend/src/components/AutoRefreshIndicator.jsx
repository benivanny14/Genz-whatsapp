import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const AutoRefreshIndicator = ({ isRefreshing, message = 'Syncing...' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isRefreshing) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRefreshing]);

  if (!visible) return null;

  return (
    <div className="auto-refresh-indicator flex items-center gap-2">
      <RefreshCw size={14} className="animate-spin" />
      <span>{message}</span>
    </div>
  );
};

export default AutoRefreshIndicator;