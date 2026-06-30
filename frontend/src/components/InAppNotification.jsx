import React, { useEffect, useState } from 'react';
import { X, MessageSquare, Phone, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './InAppNotification.css';

const InAppNotification = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'call':
        return <Phone size={20} className="text-green-400" />;
      case 'video':
        return <Video size={20} className="text-blue-400" />;
      default:
        return <MessageSquare size={20} className="text-green-400" />;
    }
  };

  const handleNotificationClick = () => {
    setIsVisible(false);
    if (notification.chatId || notification.conversationId) {
      const convId = notification.conversationId || notification.chatId;
      // Dispatch event so ChatContext opens the correct conversation
      window.dispatchEvent(new CustomEvent('open-chat', { detail: { conversationId: convId } }));
      // Navigate to chat page if not already there
      if (!window.location.pathname.includes('/chat')) {
        navigate('/chat');
      }
    }
    setTimeout(onClose, 300);
  };

  return (
    <div 
      className={`in-app-notification ${isVisible ? 'visible' : ''}`}
      onClick={handleNotificationClick}
    >
      <div className="notification-content">
        <div className="notification-icon">
          {getIcon()}
        </div>
        <div className="notification-text">
          <h4 className="notification-title">{notification.title}</h4>
          <p className="notification-body">{notification.body}</p>
        </div>
        <button 
          className="notification-close"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default InAppNotification;
