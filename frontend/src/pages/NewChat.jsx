import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus, MessageCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { authFetch } from '../utils/authFetch';
import AddContactModal from '../components/AddContactModal';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';

const NewChat = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myContacts, setMyContacts] = useState([]);
  const { selectConversation, contacts, conversations } = useChat();

  // Load contacts from backend on mount
  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const response = await authFetch(`${BACKEND_URL}/chat/contacts`);
        const data = await response.json();
        if (data.success && data.contacts) {
          setMyContacts(data.contacts);
        }
      } catch (error) {
        console.error('[NewChat] Failed to load contacts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [contacts]); // Re-fetch when contacts state changes (after addContact)

  // Filter contacts locally based on search query
  const filteredContacts = myContacts.filter(contact => {
    if (!searchQuery.trim()) return true; // Show all contacts when no search
    const query = searchQuery.toLowerCase();
    const nameMatch = (contact.savedName || '').toLowerCase().includes(query);
    const usernameMatch = (contact.user?.username || '').toLowerCase().includes(query);
    const phoneMatch = (contact.user?.phoneNumber || '').includes(query);
    return nameMatch || usernameMatch || phoneMatch;
  });

  // Start a conversation with a contact
  const handleSelectContact = async (contactUser) => {
    if (!contactUser?._id) return;
    try {
      // Check if a conversation with this user already exists
      const existingConv = (conversations || []).find(conv => {
        const participants = conv.participants || [];
        return participants.some(p => {
          const pid = typeof p === 'string' ? p : p?._id;
          return pid === contactUser._id;
        });
      });

      if (existingConv) {
        selectConversation(existingConv);
        navigate('/chat');
        return;
      }

      // Create a new conversation
      const response = await authFetch(`${BACKEND_URL}/chat/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: contactUser._id })
      });
      const data = await response.json();
      if (data.success && data.conversation) {
        selectConversation(data.conversation);
      }
      navigate('/chat');
    } catch (error) {
      console.error('[NewChat] Failed to start conversation:', error);
    }
  };

  // Callback to refresh contacts after adding a new one
  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="h-screen bg-dark-bg flex flex-col">
      <header className="bg-dark-surface border-b border-dark-border px-4 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-dark-hover rounded-lg transition-colors"
         aria-label="Back">
          <ArrowLeft className="w-6 h-6 text-dark-text" />
        </button>
        <h1 className="text-xl font-semibold text-white">New Chat</h1>
      </header>

      <div className="p-4 flex-1 overflow-y-auto">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full mb-4 p-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
        >
          ➕ Add New Contact
        </button>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-textSecondary" />
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-dark-surface border border-dark-border rounded-lg text-dark-text placeholder-dark-textSecondary focus:outline-none focus:border-primary-500"
          />
        </div>

        {/* Contacts count */}
        {!loading && myContacts.length > 0 && (
          <p className="text-xs text-dark-textSecondary mb-3 px-1 uppercase tracking-wider font-semibold">
            Contacts on your phone &middot; {filteredContacts.length}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredContacts.length > 0 ? (
          <div className="space-y-1">
            {filteredContacts.map((contact, index) => (
              <button
                key={contact.user?._id || index}
                onClick={() => handleSelectContact(contact.user)}
                className="w-full flex items-center gap-3 p-3 bg-dark-surface hover:bg-dark-hover rounded-lg transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {contact.user?.profilePicture ? (
                    <img
                      src={contact.user.profilePicture}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-lg">
                      {(contact.savedName || contact.user?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-dark-text font-medium truncate">{contact.savedName}</h3>
                  <p className="text-sm text-dark-textSecondary truncate">
                    {contact.user?.about || contact.user?.bio || 'Hey there! I am using GENZ'}
                  </p>
                </div>
                <MessageCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        ) : searchQuery.trim() ? (
          <div className="text-center py-8">
            <p className="text-dark-textSecondary">No contacts found.</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <UserPlus className="w-12 h-12 text-dark-textSecondary mx-auto mb-3 opacity-40" />
            <p className="text-dark-textSecondary mb-1">No contacts yet</p>
            <p className="text-sm text-dark-textSecondary opacity-70">Click "Add New Contact" to add a new person</p>
          </div>
        )}
      </div>
      
      <AddContactModal isOpen={isModalOpen} onClose={handleModalClose} />
    </div>
  );
};

export default NewChat;
