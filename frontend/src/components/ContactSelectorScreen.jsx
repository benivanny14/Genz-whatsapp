import React, { useState, useEffect } from 'react';
import { Search, X, ArrowLeft, Check } from 'lucide-react';

const ContactSelectorScreen = ({
  privacyType,
  selectorType, // 'excluded' or 'allowed'
  contacts,
  initialSelectedContacts,
  onSave,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState(new Set(initialSelectedContacts || []));
  const [filteredContacts, setFilteredContacts] = useState(contacts);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    // Filter contacts based on search query
    const validContacts = contacts.filter(c => c && (c._id || c.id));
    
    if (!searchQuery.trim()) {
      // Sort contacts alphabetically by name
      const sorted = [...validContacts].sort((a, b) => {
        const nameA = (a.username || a.name || '').toLowerCase();
        const nameB = (b.username || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setFilteredContacts(sorted);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = validContacts.filter(contact => 
        contact.name?.toLowerCase().includes(query) ||
        contact.phone?.toLowerCase().includes(query) ||
        contact.phoneNumber?.toLowerCase().includes(query) ||
        contact.username?.toLowerCase().includes(query)
      );
      // Sort filtered contacts alphabetically
      const sorted = filtered.sort((a, b) => {
        const nameA = (a.username || a.name || '').toLowerCase();
        const nameB = (b.username || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setFilteredContacts(sorted);
    }
  }, [searchQuery, contacts]);

  useEffect(() => {
    // Check if all contacts are selected
    if (filteredContacts.length > 0 && selectedContacts.size === filteredContacts.length) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedContacts, filteredContacts]);

  const handleToggleContact = (contactId) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      // Deselect all
      setSelectedContacts(new Set());
    } else {
      // Select all filtered contacts
      const allIds = new Set(filteredContacts.map(c => (c._id || c.id)?.toString()).filter(Boolean));
      setSelectedContacts(allIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSave = () => {
    const selectedContactIds = Array.from(selectedContacts);
    const selectedContactData = contacts.filter(c => {
      const contactId = (c._id || c.id)?.toString();
      return contactId && selectedContacts.has(contactId);
    }).map(c => ({
      id: c._id || c.id,
      name: c.username || c.name,
      phone: c.phoneNumber || c.phone
    }));
    
    onSave(selectedContactIds, selectedContactData);
  };

  const getSubtitle = () => {
    if (selectorType === 'excluded') {
      return 'Select contacts that should NOT be allowed to see this information.';
    } else {
      return 'Select contacts that should be allowed to see this information.';
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Choose Contacts
            </h1>
          </div>
          <button
            onClick={handleSave}
            className="text-green-600 dark:text-green-400 font-medium hover:text-green-700 dark:hover:text-green-300 transition-colors"
          >
            Done
          </button>
        </div>
        
        {/* Selected count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getSubtitle()}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Selected ({selectedContacts.size})
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or phone number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Select All / Deselect All */}
      <div className="px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSelectAll}
          className="text-sm text-green-600 dark:text-green-400 font-medium hover:text-green-700 dark:hover:text-green-300 transition-colors"
        >
          {selectAll ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Search className="w-12 h-12 mb-3 opacity-50" />
            <p>No contacts found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredContacts.map((contact) => {
              const contactId = (contact._id || contact.id)?.toString();
              if (!contactId) return null;
              
              const isSelected = selectedContacts.has(contactId);
              return (
                <button
                  key={contactId}
                  onClick={() => handleToggleContact(contactId)}
                  className="w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* Profile Picture */}
                  <div className="relative">
                    {contact.profilePicture ? (
                      <img
                        src={contact.profilePicture}
                        alt={contact.username || contact.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                        <span className="text-white font-medium text-lg">
                          {(contact.username || contact.name || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {contact.username || contact.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {contact.phoneNumber || contact.phone}
                    </p>
                  </div>

                  {/* Checkbox */}
                  <div className="w-6 h-6 flex items-center justify-center">
                    {isSelected ? (
                      <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded border-2 border-gray-300 dark:border-gray-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactSelectorScreen;
