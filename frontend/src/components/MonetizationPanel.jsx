import React, { useState } from 'react';
import { X, DollarSign, Tag, Heart, Gem, Crown, Link as LinkIcon, Gift, Star, CheckCircle } from 'lucide-react';

const MonetizationPanel = ({ onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('ads');
  const [adSettings, setAdSettings] = useState({ enabled: false, frequency: 'medium' });
  const [sponsoredContent, setSponsoredContent] = useState({ brand: '', product: '', compensation: '' });
  const [affiliateLink, setAffiliateLink] = useState({ url: '', commission: '' });
  const [tipSettings, setTipSettings] = useState({ enabled: true, platforms: ['paypal', 'stripe'] });
  const [subscription, setSubscription] = useState({ enabled: false, tier: 'basic', price: '' });
  const [exclusiveContent, setExclusiveContent] = useState({ enabled: false, accessLevel: 'free' });

  const tabs = [
    { id: 'ads', icon: DollarSign, label: 'Ads' },
    { id: 'sponsored', icon: Tag, label: 'Sponsored' },
    { id: 'affiliate', icon: LinkIcon, label: 'Affiliate' },
    { id: 'tips', icon: Heart, label: 'Tips' },
    { id: 'subscription', icon: Crown, label: 'Subscription' },
    { id: 'exclusive', icon: Star, label: 'Exclusive' }
  ];

  const handleSave = () => {
    if (onSave) {
      onSave({
        adSettings,
        sponsoredContent,
        affiliateLink,
        tipSettings,
        subscription,
        exclusiveContent
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <DollarSign className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Monetization</h2>
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
          {activeTab === 'ads' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4">Ad Settings</h3>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/70">Enable Ads</span>
                  <button
                    onClick={() => setAdSettings({ ...adSettings, enabled: !adSettings.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      adSettings.enabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        adSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <p className="text-white/70 text-sm mb-2">Ad Frequency</p>
                  <select
                    value={adSettings.frequency}
                    onChange={(e) => setAdSettings({ ...adSettings, frequency: e.target.value })}
                    className="w-full bg-white/10 text-white p-2 rounded border border-white/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Ad Types</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Banner Ads</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Video Ads</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Native Ads</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Interstitial Ads</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sponsored' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4">Sponsored Content</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm mb-2">Brand Name</p>
                    <input
                      type="text"
                      value={sponsoredContent.brand}
                      onChange={(e) => setSponsoredContent({ ...sponsoredContent, brand: e.target.value })}
                      placeholder="Enter brand name"
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                    />
                  </div>
                  
                  <div>
                    <p className="text-white/70 text-sm mb-2">Product/Service</p>
                    <input
                      type="text"
                      value={sponsoredContent.product}
                      onChange={(e) => setSponsoredContent({ ...sponsoredContent, product: e.target.value })}
                      placeholder="Enter product or service"
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                    />
                  </div>
                  
                  <div>
                    <p className="text-white/70 text-sm mb-2">Compensation</p>
                    <input
                      type="text"
                      value={sponsoredContent.compensation}
                      onChange={(e) => setSponsoredContent({ ...sponsoredContent, compensation: e.target.value })}
                      placeholder="e.g., $500 per post"
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Disclosure</h3>
                <label className="flex items-center gap-3 text-white/70">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Automatically add "Sponsored" label</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'affiliate' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4">Affiliate Links</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm mb-2">Affiliate URL</p>
                    <input
                      type="text"
                      value={affiliateLink.url}
                      onChange={(e) => setAffiliateLink({ ...affiliateLink, url: e.target.value })}
                      placeholder="https://example.com/affiliate/..."
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                    />
                  </div>
                  
                  <div>
                    <p className="text-white/70 text-sm mb-2">Commission Rate</p>
                    <input
                      type="text"
                      value={affiliateLink.commission}
                      onChange={(e) => setAffiliateLink({ ...affiliateLink, commission: e.target.value })}
                      placeholder="e.g., 10%"
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Tracking</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Track clicks</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Track conversions</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Generate unique links</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tips' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4">Tip Settings</h3>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/70">Enable Tips</span>
                  <button
                    onClick={() => setTipSettings({ ...tipSettings, enabled: !tipSettings.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      tipSettings.enabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        tipSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <p className="text-white/70 text-sm mb-2">Payment Platforms</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 text-white/70">
                      <input 
                        type="checkbox" 
                        checked={tipSettings.platforms.includes('paypal')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTipSettings({ ...tipSettings, platforms: [...tipSettings.platforms, 'paypal'] });
                          } else {
                            setTipSettings({ ...tipSettings, platforms: tipSettings.platforms.filter(p => p !== 'paypal') });
                          }
                        }}
                        className="rounded"
                      />
                      <span>PayPal</span>
                    </label>
                    <label className="flex items-center gap-3 text-white/70">
                      <input 
                        type="checkbox" 
                        checked={tipSettings.platforms.includes('stripe')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTipSettings({ ...tipSettings, platforms: [...tipSettings.platforms, 'stripe'] });
                          } else {
                            setTipSettings({ ...tipSettings, platforms: tipSettings.platforms.filter(p => p !== 'stripe') });
                          }
                        }}
                        className="rounded"
                      />
                      <span>Stripe</span>
                    </label>
                    <label className="flex items-center gap-3 text-white/70">
                      <input 
                        type="checkbox" 
                        checked={tipSettings.platforms.includes('venmo')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTipSettings({ ...tipSettings, platforms: [...tipSettings.platforms, 'venmo'] });
                          } else {
                            setTipSettings({ ...tipSettings, platforms: tipSettings.platforms.filter(p => p !== 'venmo') });
                          }
                        }}
                        className="rounded"
                      />
                      <span>Venmo</span>
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-white/70 text-sm mb-2">Suggested Amounts</p>
                  <div className="flex gap-2">
                    {['$1', '$5', '$10', '$20'].map((amount) => (
                      <button key={amount} className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm">
                        {amount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Diamonds (Virtual Gifts)</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Rose', icon: '🌹', value: 1 },
                    { name: 'Heart', icon: '❤️', value: 5 },
                    { name: 'Star', icon: '⭐', value: 10 },
                    { name: 'Fire', icon: '🔥', value: 25 },
                    { name: 'Diamond', icon: '💎', value: 50 },
                    { name: 'Crown', icon: '👑', value: 100 }
                  ].map((gift) => (
                    <button key={gift.name} className="flex flex-col items-center gap-1 p-3 bg-white/10 hover:bg-white/20 rounded-lg">
                      <span className="text-2xl">{gift.icon}</span>
                      <span className="text-white text-xs">{gift.name}</span>
                      <span className="text-[#00a884] text-xs">{gift.value}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4">Subscription</h3>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/70">Enable Subscriptions</span>
                  <button
                    onClick={() => setSubscription({ ...subscription, enabled: !subscription.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      subscription.enabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        subscription.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-white/70 text-sm mb-2">Subscription Tier</p>
                    <select
                      value={subscription.tier}
                      onChange={(e) => setSubscription({ ...subscription, tier: e.target.value })}
                      className="w-full bg-white/10 text-white p-2 rounded border border-white/20"
                    >
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>
                  
                  <div>
                    <p className="text-white/70 text-sm mb-2">Monthly Price</p>
                    <input
                      type="text"
                      value={subscription.price}
                      onChange={(e) => setSubscription({ ...subscription, price: e.target.value })}
                      placeholder="$9.99"
                      className="w-full bg-white/10 text-white p-3 rounded-lg outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Tier Benefits</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle size={14} className="text-[#00a884]" />
                    <span>Basic: Ad-free viewing</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle size={14} className="text-[#00a884]" />
                    <span>Premium: Exclusive content + Basic</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CheckCircle size={14} className="text-[#00a884]" />
                    <span>VIP: All features + Priority support</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exclusive' && (
            <div className="space-y-6">
              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-4">Exclusive Content</h3>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/70">Enable Exclusive Content</span>
                  <button
                    onClick={() => setExclusiveContent({ ...exclusiveContent, enabled: !exclusiveContent.enabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      exclusiveContent.enabled ? 'bg-[#00a884]' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        exclusiveContent.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <p className="text-white/70 text-sm mb-2">Access Level</p>
                  <select
                    value={exclusiveContent.accessLevel}
                    onChange={(e) => setExclusiveContent({ ...exclusiveContent, accessLevel: e.target.value })}
                    className="w-full bg-white/10 text-white p-2 rounded border border-white/20"
                  >
                    <option value="free">Free</option>
                    <option value="subscribers">Subscribers Only</option>
                    <option value="premium">Premium Members</option>
                    <option value="vip">VIP Members</option>
                  </select>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Content Types</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Behind-the-scenes</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Early access</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Extended content</span>
                  </label>
                  <label className="flex items-center gap-3 text-white/70">
                    <input type="checkbox" className="rounded" />
                    <span>Personal messages</span>
                  </label>
                </div>
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
            Save Monetization Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonetizationPanel;
