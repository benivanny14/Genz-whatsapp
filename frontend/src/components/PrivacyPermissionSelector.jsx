import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

const PrivacyPermissionSelector = ({
  privacyType,
  currentValue,
  options,
  onChange,
  showOnlineOption = false,
  onlineValue = null,
  onOnlineChange = null
}) => {
  const [selectedOption, setSelectedOption] = useState(currentValue);
  const [selectedOnline, setSelectedOnline] = useState(onlineValue);

  useEffect(() => {
    setSelectedOption(currentValue);
  }, [currentValue]);

  useEffect(() => {
    if (onlineValue !== null) {
      setSelectedOnline(onlineValue);
    }
  }, [onlineValue]);

  const handleOptionChange = async (option) => {
    setSelectedOption(option);
    
    // Auto-save immediately (WhatsApp behavior)
    if (onChange) {
      await onChange(option);
    }

    // If "My Contacts Except..." is selected, open contact selector
    if (option === 'contacts_except') {
      window.openContactSelector?.(privacyType, 'excluded');
    }

    // If "Only Share With..." is selected, open contact selector
    if (option === 'only_share_with') {
      window.openContactSelector?.(privacyType, 'allowed');
    }
  };

  const handleOnlineChange = async (option) => {
    setSelectedOnline(option);
    
    // Auto-save immediately (WhatsApp behavior)
    if (onOnlineChange) {
      await onOnlineChange(option);
    }
  };

  const getOptionLabel = (option) => {
    switch (option) {
      case 'everyone':
        return 'Everyone';
      case 'contacts':
        return 'My Contacts';
      case 'contacts_except':
        return 'My Contacts Except...';
      case 'nobody':
        return 'Nobody';
      case 'only_share_with':
        return 'Only Share With...';
      case 'same_as_last_seen':
        return 'Same as Last Seen';
      default:
        return option;
    }
  };

  const getOptionDescription = (option) => {
    switch (option) {
      case 'everyone':
        return 'Anyone on WhatsApp can see this information';
      case 'contacts':
        return 'Only your contacts can see this information';
      case 'contacts_except':
        return 'Your contacts except those you exclude';
      case 'nobody':
        return 'No one can see this information';
      case 'only_share_with':
        return 'Only people you choose can see this information';
      case 'same_as_last_seen':
        return 'Follows your Last Seen privacy setting';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
      {/* Main privacy options */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleOptionChange(option)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 flex items-center justify-center">
                {selectedOption === option ? (
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  {getOptionLabel(option)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getOptionDescription(option)}
                </p>
              </div>
            </div>
            {(option === 'contacts_except' || option === 'only_share_with') && (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
        ))}
      </div>

      {/* Online status option (for Last Seen) */}
      {showOnlineOption && onOnlineChange && (
        <>
          <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
          <div className="px-4 py-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Who can see when I'm online
            </p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {['everyone', 'same_as_last_seen'].map((option) => (
              <button
                key={option}
                onClick={() => handleOnlineChange(option)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    {selectedOnline === option ? (
                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {getOptionLabel(option)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getOptionDescription(option)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PrivacyPermissionSelector;
