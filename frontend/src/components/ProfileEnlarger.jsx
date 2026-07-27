import React, { useEffect } from 'react';

const ProfileEnlarger = ({ src, alt, onClose, size = 300 }) => {
  useEffect(() => {
    // Push state so Android back button can be intercepted
    window.history.pushState({ profileEnlarged: true }, '');

    const handlePopState = (e) => {
      onClose();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // If component unmounts for other reasons, ensure we don't trap the user
      if (window.history.state?.profileEnlarged) {
        window.history.back();
      }
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="profile-pic-enlarged cursor-pointer transform transition-transform"
        onClick={onClose}
        style={{
          width: size,
          height: size,
          maxWidth: '90vw',
          maxHeight: '90vh'
        }}
      >
        <img
          src={src}
          alt={alt || 'Profile'}
          className="w-full h-full rounded-full object-cover"
        />
      </div>
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg text-sm">
        Click anywhere to close
      </div>
    </div>
  );
};

export default ProfileEnlarger;