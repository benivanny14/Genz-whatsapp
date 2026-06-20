import React from 'react';

const ProfileEnlarger = ({ src, alt, onClose, size = 300 }) => {
  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="profile-pic-enlarged"
        onClick={(e) => e.stopPropagation()}
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