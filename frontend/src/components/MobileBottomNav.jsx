import { useMemo } from 'react';
import { MessageCircle, Sparkles, UsersRound, CircleDot, Store } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

const NAV_ITEMS = [
  { label: 'Chats', path: '/chat', icon: MessageCircle, match: (path) => path.startsWith('/chat') },
  { label: 'Status', path: '/status', icon: CircleDot, match: (path) => path.startsWith('/status') },
  { label: 'Groups', path: '/communities', icon: UsersRound, match: (path) => path.startsWith('/communities') },
  { label: 'Winga', path: '/winga', icon: Store, match: (path) => path.startsWith('/winga') },
  { label: 'Me', path: '/settings', icon: Sparkles, match: (path) => path.startsWith('/settings') || path.startsWith('/linked-devices') },
];

const HIDDEN_PREFIXES = [
  '/login',
  '/register',
  '/pair-device',
  '/admin',
  '/admin-setup',
  '/system-control-x7k9',
  '/forgot-password',
  '/verify-phone',
  '/privacy-policy',
  '/terms',
  '/install',
];

// Paths that match exactly (not prefixes) — the landing page root
const HIDDEN_EXACT = ['/'];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedConversation, statusUnseenCount, wingaData, conversations } = useChat();
  const path = location.pathname;

  const isHiddenRoute = HIDDEN_EXACT.includes(path) || HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isInsideOpenMobileChat = path.startsWith('/chat') && selectedConversation;

  const wingaUnseen = wingaData?.totalUnseen || 0;

  // Compute unread badges from conversations — hooks MUST be above any early return
  const chatUnread = useMemo(() => {
    if (!conversations) return 0;
    return conversations
      .filter(c => !c.isGroup && !c.isArchived)
      .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  const groupUnread = useMemo(() => {
    if (!conversations) return 0;
    return conversations
      .filter(c => c.isGroup && !c.isArchived)
      .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [conversations]);

  if (isHiddenRoute || isInsideOpenMobileChat) return null;

  return (
    <nav
        className="max-md:flex md:hidden fixed left-0 right-0 bottom-0 z-50 border-t border-white/10 bg-[#111b21]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* BUGFIX (layout): fixed px-1 + no per-item width control let long
            labels ("Communities") wrap to 2 lines while short ones ("Me")
            stayed on 1, breaking vertical alignment across the bar. Grid
            columns are now equal-width and each button fills its column, so
            icons/labels line up evenly on every side regardless of label
            length or screen width. */}
        <div className="grid grid-cols-5 w-full pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.match(path);
            const badge = item.path === '/status' ? (statusUnseenCount || 0)
              : item.path === '/winga' ? wingaUnseen
              : item.path === '/chat' ? chatUnread
              : item.path === '/communities' ? groupUnread
              : 0;
            return (
              <button
                key={item.path}
                type="button"
                data-testid={`nav-${item.path.replace('/', '')}`}
                onClick={() => navigate(item.path)}
                className={`relative flex w-full min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-none text-[10.5px] font-semibold transition ${
                  active ? 'text-[#25d366]' : 'text-white/55 hover:bg-white/5 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} strokeWidth={active ? 2.6 : 2} />
                  {badge > 0 && (
                    <span
                      key={`badge-${item.path}-${badge}`}
                      data-testid={`nav-badge-${item.path.replace('/', '')}`}
                      className="nav-badge-animate"
                      style={{ position: 'absolute', top: -5, right: -10, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#25d366', color: '#0b141a', fontSize: 10, fontWeight: 900, paddingLeft: 4, paddingRight: 4, lineHeight: 1, zIndex: 99999, boxShadow: '0 1px 4px rgba(0,0,0,0.3)', animation: 'badgePopIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span style={{ lineHeight: '1.2', whiteSpace: 'nowrap' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
  );
};

export default MobileBottomNav;
