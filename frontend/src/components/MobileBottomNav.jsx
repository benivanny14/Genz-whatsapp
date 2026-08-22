import { MessageCircle, Sparkles, UsersRound, CircleDot, Store } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

const NAV_ITEMS = [
  { label: 'Chats', path: '/chat', icon: MessageCircle, match: (path) => path.startsWith('/chat') },
  { label: 'Status', path: '/status', icon: CircleDot, match: (path) => path.startsWith('/status') },
  { label: 'Communities', path: '/communities', icon: UsersRound, match: (path) => path.startsWith('/communities') },
  { label: 'WINGA', path: '/winga', icon: Store, match: (path) => path.startsWith('/winga') },
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
  const { selectedConversation, statusUnseenCount, wingaData } = useChat();
  const path = location.pathname;

  const isHiddenRoute = HIDDEN_EXACT.includes(path) || HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isInsideOpenMobileChat = path.startsWith('/chat') && selectedConversation;

  if (isHiddenRoute || isInsideOpenMobileChat) return null;

  const wingaUnseen = wingaData?.totalUnseen || 0;

  return (
    <nav className="max-md:flex md:hidden fixed left-0 right-0 bottom-0 z-50 border-t border-white/10 bg-[#111b21]/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.5)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="grid grid-cols-5 px-1 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(path);
          const badge = item.path === '/status' ? (statusUnseenCount || 0) : item.path === '/winga' ? wingaUnseen : 0;
          return (
            <button
              key={item.path}
              type="button"
              data-testid={`nav-${item.path.replace('/', '')}`}
              onClick={() => navigate(item.path)}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition ${
                active ? 'text-[#25d366]' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.6 : 2} />
                {badge > 0 && (
                  <span
                    data-testid={`nav-badge-${item.path.replace('/', '')}`}
                    className="absolute -top-2 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#25d366] px-1 text-[10px] font-black text-[#0b141a] shadow"
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
