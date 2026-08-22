/**
 * ContactCard Component
 * Displays shared contact information in WhatsApp-style card format
 */

import React, { useState } from 'react';
import { User, Phone, Mail, Building, Download, UserPlus, ExternalLink } from 'lucide-react';
import { downloadVCard } from '../utils/vcard';
import { saveContactToPhone, isContactsAvailable } from '../utils/contacts';

const ContactCard = ({ contact, onSave, onDownload, isOwn = false }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    name = '',
    phone = '',
    email = '',
    avatar = '',
    organization = '',
    title = ''
  } = contact;

  const handleSaveContact = async () => {
    if (!isContactsAvailable()) {
      alert('Contact saving is only available on the mobile app');
      return;
    }

    setSaving(true);
    try {
      const success = await saveContactToPhone(contact);
      if (success) {
        setSaved(true);
        if (onSave) onSave(contact);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert('Failed to save contact');
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadVCard = () => {
    downloadVCard(contact);
    if (onDownload) onDownload(contact);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden max-w-xs">
      {/* Header with avatar */}
      <div className="bg-gradient-to-br from-[#00a884]/20 to-[#00a884]/5 p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#00a884]/20 flex items-center justify-center overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          ) : (
            <User size={24} className="text-[#00a884]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{name}</h3>
          {title && <p className="text-xs text-white/60 truncate">{title}</p>}
        </div>
      </div>

      {/* Contact details */}
      <div className="p-3 space-y-2">
        {phone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone size={14} className="text-[#00a884] flex-shrink-0" />
            <span className="text-white/80 truncate">{phone}</span>
          </div>
        )}
        
        {email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-[#00a884] flex-shrink-0" />
            <span className="text-white/80 truncate">{email}</span>
          </div>
        )}
        
        {organization && (
          <div className="flex items-center gap-2 text-sm">
            <Building size={14} className="text-[#00a884] flex-shrink-0" />
            <span className="text-white/80 truncate">{organization}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-white/10">
        <button
          onClick={handleSaveContact}
          disabled={saving || saved}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#00a884] hover:bg-[#00a884]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saved ? (
            <>
              <UserPlus size={14} />
              Saved
            </>
          ) : saving ? (
            <>Saving...</>
          ) : (
            <>
              <UserPlus size={14} />
              Save
            </>
          )}
        </button>
        
        <button
          onClick={handleDownloadVCard}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-[#00a884] hover:bg-[#00a884]/10 transition-colors border-l border-white/10"
        >
          <Download size={14} />
          Download
        </button>
      </div>
    </div>
  );
};

export default ContactCard;
