import React, { useState } from 'react';
import { X, Tag, ShoppingBag, Calendar, Gift, Users, Link as LinkIcon, Plus, Trash2, CheckCircle } from 'lucide-react';

const BusinessShoppingPanel = ({ onClose, content, onSave }) => {
  const [activeTab, setActiveTab] = useState('shopping');
  const [shoppingTags, setShoppingTags] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', url: '' });
  const [fundraiser, setFundraiser] = useState({ enabled: false, goal: '', current: '', description: '' });
  const [event, setEvent] = useState({ enabled: false, title: '', date: '', location: '', description: '' });
  const [challenge, setChallenge] = useState({ enabled: false, title: '', description: '', endDate: '' });
  const [collaboration, setCollaboration] = useState({ enabled: false, partner: '', type: 'collab' });

  const tabs = [
    { id: 'shopping', icon: ShoppingBag, label: 'Shopping' },
    { id: 'fundraiser', icon: Gift, label: 'Fundraiser' },
    { id: 'event', icon: Calendar, label: 'Event' },
    { id: 'challenge', icon: Users, label: 'Challenge' },
    { id: 'collaboration', icon: Users, label: 'Collaboration' }
  ];

  const addProduct = () => {
    if (newProduct.name && newProduct.price) {
      setShoppingTags([...shoppingTags, { ...newProduct, id: Date.now() }]);
      setNewProduct({ name: '', price: '', url: '' });
    }
  };

  const removeProduct = (id) => {
    setShoppingTags(shoppingTags.filter(p => p.id !== id));
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        shoppingTags,
        fundraiser,
        event,
        challenge,
        collaboration
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <ShoppingBag className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Business & Shopping</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[#00a884] text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'shopping' && (
            <div className="space-y-6">
              {/* Add Product */}
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Tag size={18} className="text-[#00a884]" />
                  Add Product Tag
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Product name"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <input
                    type="text"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="Price (e.g., $29.99)"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <input
                    type="text"
                    value={newProduct.url}
                    onChange={(e) => setNewProduct({ ...newProduct, url: e.target.value })}
                    placeholder="Product URL (optional)"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <button
                    onClick={addProduct}
                    className="w-full px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add Product
                  </button>
                </div>
              </div>

              {/* Product Catalog */}
              {shoppingTags.length > 0 && (
                <div className="bg-white/5 rounded-xl p-4">
                  <h3 className="text-white font-medium mb-4">Product Catalog</h3>
                  <div className="space-y-3">
                    {shoppingTags.map((product) => (
                      <div key={product.id} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                        <div className="flex-1">
                          <p className="text-white font-medium">{product.name}</p>
                          <p className="text-[#00a884]">{product.price}</p>
                          {product.url && (
                            <a href={product.url} target="_blank" rel="noopener noreferrer" className="text-white/40 text-sm flex items-center gap-1 mt-1">
                              <LinkIcon size={12} />
                              View Product
                            </a>
                          )}
                        </div>
                        <button
                          onClick={() => removeProduct(product.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'fundraiser' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Gift size={18} className="text-[#00a884]" />
                    Fundraiser
                  </h3>
                  <button
                    onClick={() => setFundraiser({ ...fundraiser, enabled: !fundraiser.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      fundraiser.enabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        fundraiser.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={fundraiser.goal}
                    onChange={(e) => setFundraiser({ ...fundraiser, goal: e.target.value })}
                    placeholder="Fundraising goal (e.g., $10,000)"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <input
                    type="text"
                    value={fundraiser.current}
                    onChange={(e) => setFundraiser({ ...fundraiser, current: e.target.value })}
                    placeholder="Current amount raised"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <textarea
                    value={fundraiser.description}
                    onChange={(e) => setFundraiser({ ...fundraiser, description: e.target.value })}
                    placeholder="Describe your cause..."
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-24 placeholder-white/40"
                  />
                </div>
              </div>

              {/* Progress Bar */}
              {fundraiser.goal && fundraiser.current && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white">Progress</span>
                    <span className="text-white/60">
                      {fundraiser.current} / {fundraiser.goal}
                    </span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00a884]"
                      style={{ width: `${(parseFloat(fundraiser.current.replace(/[^0-9.]/g, '')) / parseFloat(fundraiser.goal.replace(/[^0-9.]/g, ''))) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'event' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Calendar size={18} className="text-[#00a884]" />
                    Event
                  </h3>
                  <button
                    onClick={() => setEvent({ ...event, enabled: !event.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      event.enabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        event.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={event.title}
                    onChange={(e) => setEvent({ ...event, title: e.target.value })}
                    placeholder="Event title"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <input
                    type="text"
                    value={event.date}
                    onChange={(e) => setEvent({ ...event, date: e.target.value })}
                    placeholder="Date and time"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <input
                    type="text"
                    value={event.location}
                    onChange={(e) => setEvent({ ...event, location: e.target.value })}
                    placeholder="Location"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <textarea
                    value={event.description}
                    onChange={(e) => setEvent({ ...event, description: e.target.value })}
                    placeholder="Event description..."
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-24 placeholder-white/40"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'challenge' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Users size={18} className="text-[#00a884]" />
                    Challenge
                  </h3>
                  <button
                    onClick={() => setChallenge({ ...challenge, enabled: !challenge.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      challenge.enabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        challenge.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={challenge.title}
                    onChange={(e) => setChallenge({ ...challenge, title: e.target.value })}
                    placeholder="Challenge title"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <textarea
                    value={challenge.description}
                    onChange={(e) => setChallenge({ ...challenge, description: e.target.value })}
                    placeholder="Challenge description and rules..."
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none resize-none h-24 placeholder-white/40"
                  />
                  <input
                    type="text"
                    value={challenge.endDate}
                    onChange={(e) => setChallenge({ ...challenge, endDate: e.target.value })}
                    placeholder="End date"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'collaboration' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Users size={18} className="text-[#00a884]" />
                    Collaboration Invite
                  </h3>
                  <button
                    onClick={() => setCollaboration({ ...collaboration, enabled: !collaboration.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      collaboration.enabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        collaboration.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <input
                    type="text"
                    value={collaboration.partner}
                    onChange={(e) => setCollaboration({ ...collaboration, partner: e.target.value })}
                    placeholder="Partner username"
                    className="w-full bg-white/10 text-white p-3 rounded-lg outline-none placeholder-white/40"
                  />
                  <select
                    value={collaboration.type}
                    onChange={(e) => setCollaboration({ ...collaboration, type: e.target.value })}
                    className="w-full bg-white/10 text-white p-3 rounded-lg border border-white/20"
                  >
                    <option value="collab">Collaboration</option>
                    <option value="duet">Duet</option>
                    <option value="guest">Guest Appearance</option>
                    <option value="sponsored">Sponsored Content</option>
                  </select>
                </div>
              </div>

              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-white/40 text-xs">
                  Collaboration invites allow you to create content with other creators. The partner will receive a notification to accept or decline.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-white/10">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium"
          >
            Apply Business Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessShoppingPanel;
