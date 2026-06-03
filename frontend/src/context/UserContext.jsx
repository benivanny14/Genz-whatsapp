import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDeviceId, getDeviceInfo } from '../utils/deviceIdentity';
import { isBlobUrl, sanitizeBlobUrls } from '../utils/sanitizeStorage';

const UserContext = createContext();

const USER_STORAGE_KEY = 'genz_user_profile';
const USER_SETTINGS_KEY = 'genz_user_settings';

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Function to update user profile and persist to localStorage
  const updateUserProfile = (updates) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      try {
        const profileData = {
          username: updated.username,
          phoneNumber: updated.phoneNumber,
          avatar: updated.avatar,
          profilePicture: updated.profilePicture,
          bio: updated.bio
        };
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profileData));
        console.log('Profile saved to localStorage:', { ...profileData, profilePicture: profileData.profilePicture?.length + ' chars' });
      } catch (e) {
        console.error('Failed to save profile to localStorage:', e);
      }
      return updated;
    });
  };

  useEffect(() => {
    // Load user profile from localStorage if exists
    const storedProfile = localStorage.getItem(USER_STORAGE_KEY);
    let userProfile = null;

    if (storedProfile) {
      try {
        const parsedProfile = JSON.parse(storedProfile);
        const sanitizedProfile = sanitizeBlobUrls(parsedProfile);
        userProfile = sanitizedProfile.value;
        if (sanitizedProfile.changed) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userProfile));
        }
        console.log('Profile loaded from localStorage:', { ...userProfile, profilePicture: userProfile?.profilePicture?.length + ' chars' });
      } catch (e) {
        console.error('Failed to parse stored profile:', e);
      }
    }

    let storedSettings = null;
    try {
      const rawSettings = localStorage.getItem(USER_SETTINGS_KEY);
      storedSettings = rawSettings ? JSON.parse(rawSettings) : null;
    } catch (e) {
      console.error('Failed to parse stored settings:', e);
    }

    // Initialize device-based user
    const deviceId = getDeviceId();
    const deviceInfo = getDeviceInfo();

    // Load auth user from localStorage as priority
    const storedAuthUser = localStorage.getItem('user');
    let authUser = null;
    if (storedAuthUser) {
      try {
        authUser = JSON.parse(storedAuthUser);
      } catch (e) {
        console.error('Failed to parse auth user:', e);
      }
    }

    const userData = {
      id: authUser?._id || deviceId,
      _id: authUser?._id || deviceId,
      name: authUser?.username || userProfile?.username || "GENZ User",
      username: authUser?.username || userProfile?.username || "GENZ User",
      phoneNumber: authUser?.phoneNumber || authUser?.phone || userProfile?.phoneNumber || "local",
      avatar: isBlobUrl(authUser?.profilePicture || userProfile?.avatar) ? null : (authUser?.profilePicture || userProfile?.avatar || null),
      profilePicture: isBlobUrl(authUser?.profilePicture || userProfile?.profilePicture) ? "" : (authUser?.profilePicture || userProfile?.profilePicture || ""),
      bio: authUser?.bio || authUser?.about || userProfile?.bio || "",
      displayName: authUser?.username || userProfile?.username || "GENZ User",
      deviceId: deviceId,
      deviceInfo: deviceInfo,
      settings: storedSettings || {
        privacy: {
          lastSeen: 'everyone',
          profilePhoto: 'everyone',
          about: 'everyone',
          readReceipts: true
        },
        notifications: {
          messages: true,
          groups: true,
          sounds: true
        },
        theme: {
          mode: 'dark',
          wallpaper: '',
          chatColor: '#00a884'
        }
      },
      updateUserProfile
    };

    setUser(userData);
  }, []);

  // Save and load user settings
  const saveSettings = (settings) => {
    try {
      localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
      setUser(prev => (prev ? { ...prev, settings } : prev));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  return (
    <UserContext.Provider value={{ user, updateUserProfile, saveSettings }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    const deviceId = getDeviceId();
    return {
      user: {
        id: deviceId,
        _id: deviceId,
        name: "GENZ User",
        username: "GENZ User",
        phoneNumber: "local",
        deviceId: deviceId
      }
    };
  }
  return context;
};
