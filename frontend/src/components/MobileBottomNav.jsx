import { MessageCircle, Newspaper, Phone, Sparkles, UsersRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

const NAV_ITEMS = [
  { label: 'Chats', path: '/chat', icon: MessageCircle, match: (path) => path === '/' || path.startsWith('/chat') },
  { label: 'Updates', path: '/status', icon: Newspaper, match: (path) => path.startsWith('/status') || path.startsWith('/channels') },
  { label: 'Communities', path: '/communities', icon: UsersRound, match: (path) => path.startsWith('/communities') },
  { label: 'Calls', path: '/calls', icon: Phone, match: (path) => path.startsWith('/calls') },
  { label: 'Me', path: '/settings', icon: Sparkles, match: (path) => path.startsWith('/settings') || path.startsWith('/genz-mods') || path.startsWith('/linked-devices') },
];

const HIDDEN_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/pair-device',
  '/admin',
  '/admin-setup',
  '/system-control-x7k9',
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedConversation } = useChat();
  const path = location.pathname;

  const isHiddenRoute = HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isInsideOpenMobileChat = path.startsWith('/chat') && selectedConversation;

  if (isHiddenRoute || isInsideOpenMobileChat) return null;

  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 z-40 border-t border-white/10 bg-[#111b21]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 px-1 py-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.match(path);
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition ${
                active ? 'text-[#25d366]' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={active ? 2.6 : 2} />
              <span className="leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
