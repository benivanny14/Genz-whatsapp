/**
 * Notifications.jsx — In-app Notification Center (WhatsApp-style).
 *
 * Shows a bell icon with a red badge in the header, and a scrollable list
 * of notification history grouped by date (Today, Yesterday, Earlier).
 * Supports mark-as-read (single + mark all) and real-time updates via socket.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, CheckCheck, MessageCircle, Image, CreditCard, Users, Phone, Info, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/socket';
import { authFetch } from '../utils/authFetch';
import { API_URL } from '../utils/authSession';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const ICON_MAP = {
  message: MessageCircle,
  status: Image,
  payment_approved: CreditCard,
  payment_rejected: CreditCard,
  group_invite: Users,
  group_joined: Users,
  call_missed: Phone,
  system: Info
};

const COLOR_MAP = {
  message: 'bg-blue-500/20 text-blue-400',
  status: 'bg-green-500/20 text-green-400',
  payment_approved: 'bg-emerald-500/20 text-emerald-400',
  payment_rejected: 'bg-red-500/20 text-red-400',
  group_invite: 'bg-purple-500/20 text-purple-400',
  group_joined: 'bg-purple-500/20 text-purple-400',
  call_missed: 'bg-orange-500/20 text-orange-400',
  system: 'bg-gray-500/20 text-gray-400'
};

/**
 * Group notifications by date: Today, Yesterday, Earlier.
 */
const groupByDate = (notifications) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = { Today: [], Yesterday: [], Earlier: [] };

  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    if (d >= today) groups.Today.push(n);
    else if (d >= yesterday) groups.Yesterday.push(n);
    else groups.Earlier.push(n);
  });

  return Object.entries(groups).filter(([, items]) => items.length > 0);
};

/**
 * Single notification item.
 */
const NotificationItem = ({ notification, onRead }) => {
  const navigate = useNavigate();
  const Icon = ICON_MAP[notification.type] || Bell;
  const colorClass = COLOR_MAP[notification.type] || 'bg-gray-500/20 text-gray-400';
  const data = notification.data || {};

  const handleClick = async () => {
    if (!notification.isRead) {
      onRead(notification._id);
    }
    // Navigate to relevant page based on type
    if (data.conversationId) {
      navigate('/chat', { state: { conversationId: data.conversationId } });
    } else if (data.statusId) {
      navigate('/status');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 p-3 rounded-xl transition-colors text-left ${
        notification.isRead
          ? 'bg-transparent hover:bg-white/5'
          : 'bg-[#00a884]/5 hover:bg-[#00a884]/10'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${notification.isRead ? 'text-gray-400' : 'text-white font-medium'}`}>
            {data.title || notification.type.replace(/_/g, ' ')}
          </p>
          {!notification.isRead && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#00a884] flex-shrink-0 mt-1" />
          )}
        </div>
        {data.body && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{data.body}</p>
        )}
        <p className="text-[11px] text-gray-600 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
};

/**
 * Main Notifications page component.
 */
const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadingMore = useRef(false);

  const fetchNotifications = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      loadingMore.current = true;

      const res = await authFetch(`${API_URL}/notifications/history?page=${pageNum}&limit=30`);
      const data = await res.json();

      if (data.success) {
        if (append) {
          setNotifications(prev => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }
        setUnreadCount(data.unreadCount || 0);
        setHasMore(pageNum < (data.pagination?.pages || 1));
      }
    } catch (err) {
      console.error('[Notifications] Fetch error:', err);
    } finally {
      setLoading(false);
      loadingMore.current = false;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // Real-time: listen for new notifications via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewNotification = (data) => {
      setNotifications(prev => {
        // Deduplicate
        if (prev.some(n => n._id === data._id)) return prev;
        return [data, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    };

    socket.on('notification:new', handleNewNotification);
    return () => socket.off('notification:new', handleNewNotification);
  }, []);

  // Mark single notification as read
  const handleMarkRead = async (notificationId) => {
    setNotifications(prev =>
      prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await authFetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('[Notifications] Mark read error:', err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await authFetch(`${API_URL}/notifications/read-all`, { method: 'POST' });
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error('[Notifications] Mark all read error:', err);
    }
  };

  // Load more (infinite scroll)
  const handleLoadMore = () => {
    if (loadingMore.current || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  const grouped = groupByDate(notifications);

  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1f2c34] border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-1 rounded-full hover:bg-white/10">
          <ArrowLeft size={22} />
        </button>
        <Bell size={20} className="text-[#00a884]" />
        <h1 className="text-lg font-semibold flex-1">Notifications</h1>
        {unreadCount > 0 && (
          <span className="bg-[#00a884] text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-[#00a884] text-xs font-medium hover:underline"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-3 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Bell size={28} className="text-gray-600" />
            </div>
            <h3 className="text-gray-400 font-medium mb-1">No notifications yet</h3>
            <p className="text-gray-600 text-sm max-w-xs">
              You'll see notifications for new messages, status updates, payments, and group invites here.
            </p>
          </div>
        ) : (
          <>
            {grouped.map(([label, items]) => (
              <div key={label} className="mb-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  {label}
                </h2>
                <div className="space-y-1">
                  {items.map(notification => (
                    <NotificationItem
                      key={notification._id}
                      notification={notification}
                      onRead={handleMarkRead}
                    />
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={handleLoadMore}
                className="w-full py-3 text-center text-[#00a884] text-sm font-medium hover:bg-white/5 rounded-xl transition-colors"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
