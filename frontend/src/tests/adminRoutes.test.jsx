import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

vi.mock('../components/ErrorBoundary', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('../components/InAppNotification', () => ({ default: () => null }));
vi.mock('../components/OfflineBanner', () => ({ default: () => null }));
vi.mock('../components/InstallAppPrompt', () => ({ default: () => null }));
vi.mock('../components/ProtectedRoute', () => ({
  default: ({ children }) => <>{children}</>
}));
vi.mock('../services/notificationService', () => ({
  default: {
    requestNotificationPermission: vi.fn(() => Promise.resolve('granted')),
    registerServiceWorker: vi.fn(() => Promise.resolve({})),
    setupBackgroundNotificationHandler: vi.fn(),
    subscribeToWebPush: vi.fn(() => Promise.resolve())
  }
}));
vi.mock('../utils/sanitizeStorage', () => ({
  cleanupLocalBlobUrls: vi.fn(),
  sanitizeBlobUrls: vi.fn((value) => ({ value }))
}));
vi.mock('../utils/antiScreenshot', () => ({
  applyAntiScreenshot: vi.fn(),
  initAntiScreenshotListeners: vi.fn()
}));
vi.mock('../services/socket', () => ({
  getSocket: vi.fn(() => null)
}));
vi.mock('../utils/callUi', () => ({
  shouldShowCallScreen: vi.fn(() => false)
}));
vi.mock('../context/ChatContext', () => ({
  useChat: () => ({
    activeCall: null,
    endCall: vi.fn(),
    acceptCall: vi.fn(),
    rejectCall: vi.fn(),
    activeGroupCall: null,
    setActiveGroupCall: vi.fn(),
    setActiveCall: vi.fn()
  })
}));
vi.mock('../context/UserContext', () => ({
  useUser: () => ({ user: { profilePicture: '' } })
}));
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { role: 'user' }
  })
}));
vi.mock('../context/AdminAuthContext', () => ({
  AdminAuthProvider: ({ children }) => <>{children}</>,
  useAdminAuth: () => ({
    isAuthenticated: false,
    loading: false,
    loginStep1: vi.fn(),
    verifyTwoFactor: vi.fn(),
    logout: vi.fn()
  })
}));
vi.mock('../pages/AdminLogin', () => ({
  default: () => <div>System Control Login</div>
}));
vi.mock('../pages/Admin', () => ({
  default: () => <div>Legacy Admin Page</div>
}));
vi.mock('../pages/Chat', () => ({ default: () => <div>Chat Page</div> }));
vi.mock('../pages/Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('../pages/Register', () => ({ default: () => <div>Register Page</div> }));
vi.mock('../pages/ForgotPassword', () => ({ default: () => <div>Forgot Password</div> }));
vi.mock('../pages/ResetPassword', () => ({ default: () => <div>Reset Password</div> }));
vi.mock('../pages/VerifyEmail', () => ({ default: () => <div>Verify Email</div> }));
vi.mock('../pages/Settings', () => ({ default: () => <div>Settings Page</div> }));
vi.mock('../pages/NewChat', () => ({ default: () => <div>New Chat</div> }));
vi.mock('../pages/NewGroup', () => ({ default: () => <div>New Group</div> }));
vi.mock('../pages/Status', () => ({ default: () => <div>Status Page</div> }));
vi.mock('../pages/Broadcasts', () => ({ default: () => <div>Broadcasts Page</div> }));
vi.mock('../pages/Broadcast', () => ({ default: () => <div>Broadcast Page</div> }));
vi.mock('../pages/LinkedDevices', () => ({ default: () => <div>Linked Devices</div> }));
vi.mock('../pages/PairDevice', () => ({ default: () => <div>Pair Device</div> }));
vi.mock('../pages/SecuritySettings', () => ({ default: () => <div>Security Settings</div> }));
vi.mock('../pages/Starred', () => ({ default: () => <div>Starred</div> }));
vi.mock('../pages/Archived', () => ({ default: () => <div>Archived</div> }));
vi.mock('../pages/Calls', () => ({ default: () => <div>Calls</div> }));
vi.mock('../pages/GENZMods', () => ({ default: () => <div>GENZ Mods</div> }));
vi.mock('../pages/Channels', () => ({ default: () => <div>Channels</div> }));
vi.mock('../pages/ChannelView', () => ({ default: () => <div>Channel View</div> }));
vi.mock('../pages/JoinGroup', () => ({ default: () => <div>Join Group</div> }));
vi.mock('../components/CallScreen', () => ({ default: () => null }));
vi.mock('../components/GroupCallScreen', () => ({ default: () => null }));

describe('Admin routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the admin login screen at the secure admin route', async () => {
    render(
      <MemoryRouter initialEntries={['/system-control-x7k9/login']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText('System Control Login')).toBeInTheDocument();
  });
});
