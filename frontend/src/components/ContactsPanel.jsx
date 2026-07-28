import React, { useState } from 'react';
import { X, Users, Filter, ArrowUpDown, QrCode, Smartphone, Download } from 'lucide-react';

const ContactsPanel = ({ onClose, onSave }) => {
  const [sortBy, setSortBy] = useState('name');
  const [filterBy, setFilterBy] = useState('all');
  const [showQRGroup, setShowQRGroup] = useState(false);
  const [showQRLinked, setShowQRLinked] = useState(false);

  const sortOptions = [
    { id: 'name', label: 'Name (A-Z)' },
    { id: 'name-desc', label: 'Name (Z-A)' },
    { id: 'recent', label: 'Recently Added' },
    { id: 'frequent', label: 'Most Contacted' }
  ];

  const filterOptions = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'online', label: 'Online' },
    { id: 'groups', label: 'Groups' }
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({
        sortBy,
        filterBy
      });
    }
  };

  const generateGroupQR = () => {
    console.log('Generate QR Code for Group Invite');
    setShowQRGroup(true);
  };

  const generateLinkedDeviceQR = () => {
    console.log('Generate QR Code for Linked Devices');
    setShowQRLinked(true);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Users className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Contacts</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Sort */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <ArrowUpDown size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Sort Contacts</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSortBy(option.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    sortBy === option.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Filter Contacts</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setFilterBy(option.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    filterBy === option.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code for Group Invite */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <QrCode size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">QR Code for Group Invite</h3>
            </div>
            <button
              onClick={generateGroupQR}
              className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center justify-center gap-2"
            >
              <QrCode size={18} />
              Generate Group Invite QR
            </button>
            {showQRGroup && (
              <div className="mt-4 bg-white rounded-lg p-4 flex flex-col items-center">
                <div className="w-32 h-32 bg-gray-200 flex items-center justify-center">
                  <QrCode size={64} className="text-gray-600" />
                </div>
                <p className="text-gray-600 text-sm mt-2">Scan to join group</p>
              </div>
            )}
          </div>

          {/* QR Code for Linked Devices */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">QR Code for Linked Devices</h3>
            </div>
            <button
              onClick={generateLinkedDeviceQR}
              className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center justify-center gap-2"
            >
              <Smartphone size={18} />
              Generate Linked Device QR
            </button>
            {showQRLinked && (
              <div className="mt-4 bg-white rounded-lg p-4 flex flex-col items-center">
                <div className="w-32 h-32 bg-gray-200 flex items-center justify-center">
                  <QrCode size={64} className="text-gray-600" />
                </div>
                <p className="text-gray-600 text-sm mt-2">Scan to link device</p>
              </div>
            )}
          </div>

          {/* Export Contacts */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Download size={18} className="text-[#00a884]" />
              <h3 className="text-white font-medium">Export Contacts</h3>
            </div>
            <button className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium flex items-center justify-center gap-2">
              <Download size={18} />
              Export as VCF
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Contact Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactsPanel;
