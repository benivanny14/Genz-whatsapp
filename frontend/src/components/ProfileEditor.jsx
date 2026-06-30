import React, { useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { X, User, Mail, Camera, Save, Check } from 'lucide-react';
import userService from '../services/userService';
import toast from 'react-hot-toast';

const ProfileEditor = ({ onClose }) => {
  const { user, updateUserProfile } = useUser();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    profilePicture: user?.profilePicture || ''
  });
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const data = await userService.uploadProfilePicture(file);
      const uploadedUrl = data.user?.profilePicture || data.fileUrl || data.url;
      if (data.success && uploadedUrl) {
        setFormData(prev => ({ ...prev, profilePicture: uploadedUrl }));
        if (updateUserProfile) {
          updateUserProfile({ profilePicture: uploadedUrl, avatar: uploadedUrl });
        }
        toast.success('Profile picture uploaded!');
      } else {
        throw new Error(data.error || data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      toast.error('Failed to upload image. Using local preview.');
      
      // Fallback to local preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, profilePicture: ev.target.result }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      alert('Username is required');
      return;
    }
    
    try {
      const profilePictureForSave = formData.profilePicture?.startsWith('data:')
        ? (user?.profilePicture || '')
        : formData.profilePicture;

      // API call to backend
      await userService.updateProfile({
        username: formData.username,
        bio: formData.bio,
        email: formData.email,
        profilePicture: profilePictureForSave
      });

      // Update local context
      if (updateUserProfile) {
        updateUserProfile({
          username: formData.username,
          bio: formData.bio,
          email: formData.email,
          profilePicture: profilePictureForSave,
          avatar: profilePictureForSave
        });
      }
      
      setSaved(true);
      toast.success('Profile updated successfully!');
      setTimeout(() => { setSaved(false); onClose(); }, 1500);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile: ' + error.message);
    }
  };

  return (
    <div className="absolute inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-dark-surface w-full max-w-md rounded-2xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="p-4 bg-primary-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <User size={20} />
            <h2 className="font-bold text-lg">Edit Profile</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-primary-600/20 flex items-center justify-center relative">
              {formData.profilePicture ? (
                <img src={formData.profilePicture} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User size={48} className="text-primary-600" />
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-primary-600 p-1.5 rounded-full text-white hover:bg-primary-700"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-dark-textSecondary uppercase font-bold mb-2 block">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-primary-500"
              placeholder="Enter username"
            />
          </div>

          <div>
            <label className="text-xs text-dark-textSecondary uppercase font-bold mb-2 block">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-textSecondary" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 pl-10 text-dark-text focus:outline-none focus:border-primary-500"
                placeholder="Enter email"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-dark-textSecondary uppercase font-bold mb-2 block">Phone Number</label>
            <p className="text-base text-emerald-400 font-medium tracking-wide">
              {user?.phoneNumber || user?.phone || "Namba haijapatikana"}
            </p>
          </div>

          <div>
            <label className="text-xs text-dark-textSecondary uppercase font-bold mb-2 block">Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="w-full bg-dark-bg border border-dark-border rounded-lg p-3 text-dark-text focus:outline-none focus:border-primary-500 resize-none h-24"
              placeholder="Write something about yourself..."
              maxLength={150}
            />
            <p className="text-[10px] text-dark-textSecondary text-right mt-1">{formData.bio.length}/150</p>
          </div>

          <button
            onClick={handleSave}
            className={`w-full text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
              saved ? 'bg-green-500 hover:bg-green-600' : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {saved ? <><Check size={18} /> Saved!</> : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
