import { getAuthToken, clearAuthTokens } from '../../utils/tokenStore';
import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../../utils/resolveApiBase';
import { X, DollarSign, TrendingUp, Target, Users, Clock, CheckCircle, AlertCircle, Zap, Crown, Gift, CreditCard, BarChart3, Play } from 'lucide-react';

const StatusMonetizationPanel = ({ onClose, status, onMonetizationUpdate }) => {
  const [monetizationEnabled, setMonetizationEnabled] = useState(false);
  const [adType, setAdType] = useState('none');
  const [sponsoredContent, setSponsoredContent] = useState(false);
  const [affiliateLinks, setAffiliateLinks] = useState(false);
  const [donationEnabled, setDonationEnabled] = useState(false);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(false);
  const [exclusiveContent, setExclusiveContent] = useState(false);
  const [tipJarEnabled, setTipJarEnabled] = useState(false);
  const [fundraiserEnabled, setFundraiserEnabled] = useState(false);
  const [adSettings, setAdSettings] = useState({
    placement: 'bottom',
    frequency: 'low',
    targetAudience: 'all'
  });
  const [earnings, setEarnings] = useState({
    total: 0,
    thisMonth: 0,
    lastMonth: 0,
    adRevenue: 0,
    donations: 0,
    subscriptions: 0,
    tips: 0
  });
  const [loading, setLoading] = useState(false);

  const adTypes = [
    { id: 'none', label: 'No Ads', icon: X },
    { id: 'banner', label: 'Banner Ad', icon: BarChart3 },
    { id: 'video', label: 'Video Ad', icon: Play },
    { id: 'native', label: 'Native Ad', icon: Target },
    { id: 'sponsored', label: 'Sponsored Content', icon: Crown }
  ];

  const placements = [
    { id: 'top', label: 'Top of Status' },
    { id: 'bottom', label: 'Bottom of Status' },
    { id: 'middle', label: 'Middle of Status' },
    { id: 'overlay', label: 'Overlay' }
  ];

  const frequencies = [
    { id: 'low', label: 'Low (1 per 10 views)' },
    { id: 'medium', label: 'Medium (1 per 5 views)' },
    { id: 'high', label: 'High (1 per 2 views)' }
  ];

  const audiences = [
    { id: 'all', label: 'All Viewers' },
    { id: 'followers', label: 'Followers Only' },
    { id: 'engaged', label: 'Engaged Users' },
    { id: 'custom', label: 'Custom Audience' }
  ];

  useEffect(() => {
    // Load monetization settings
    const loadMonetizationSettings = async () => {
      setLoading(true);
      try {
        const token = getAuthToken();
        const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/monetization`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.success && data.monetization) {
          const settings = data.monetization;
          setMonetizationEnabled(settings.monetizationEnabled || false);
          setAdType(settings.adType || 'none');
          setSponsoredContent(settings.sponsoredContent || false);
          setAffiliateLinks(settings.affiliateLinks || false);
          setDonationEnabled(settings.donationEnabled || false);
          setSubscriptionEnabled(settings.subscriptionEnabled || false);
          setExclusiveContent(settings.exclusiveContent || false);
          setTipJarEnabled(settings.tipJarEnabled || false);
          setFundraiserEnabled(settings.fundraiserEnabled || false);
          setAdSettings(settings.adSettings || adSettings);
          setEarnings(settings.earnings || earnings);
        }
      } catch (error) {
        console.error('Error loading monetization settings:', error);
        // Fallback to localStorage
        try {
          const settings = JSON.parse(localStorage.getItem('genz_status_monetization') || '{}');
          const statusId = status?._id || status?.id;
          if (statusId && settings[statusId]) {
            const statusSettings = settings[statusId];
            setMonetizationEnabled(statusSettings.monetizationEnabled || false);
            setAdType(statusSettings.adType || 'none');
            setSponsoredContent(statusSettings.sponsoredContent || false);
            setAffiliateLinks(statusSettings.affiliateLinks || false);
            setDonationEnabled(statusSettings.donationEnabled || false);
            setSubscriptionEnabled(statusSettings.subscriptionEnabled || false);
            setExclusiveContent(statusSettings.exclusiveContent || false);
            setTipJarEnabled(statusSettings.tipJarEnabled || false);
            setFundraiserEnabled(statusSettings.fundraiserEnabled || false);
            setAdSettings(statusSettings.adSettings || adSettings);
            setEarnings(statusSettings.earnings || earnings);
          }
        } catch (e) {
          console.error('Error loading from localStorage:', e);
        }
      } finally {
        setLoading(false);
      }
    };
    loadMonetizationSettings();
  }, [status]);

  const handleSave = async () => {
    const statusId = status?._id || status?.id;
    if (!statusId) return;

    const monetizationSettings = {
      monetizationEnabled,
      adType,
      sponsoredContent,
      affiliateLinks,
      donationEnabled,
      subscriptionEnabled,
      exclusiveContent,
      tipJarEnabled,
      fundraiserEnabled,
      adSettings,
      earnings
    };

    try {
      const token = getAuthToken();
      const response = await fetch(`${resolveApiBase()}/status-advanced/${statusId}/monetization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(monetizationSettings)
      });

      const data = await response.json();
      if (data.success) {
        if (onMonetizationUpdate) {
          onMonetizationUpdate(monetizationSettings);
        }
        onClose();
      }
    } catch (error) {
      console.error('Error saving monetization settings:', error);
      // Fallback to localStorage
      try {
        const settings = JSON.parse(localStorage.getItem('genz_status_monetization') || '{}');
        settings[statusId] = monetizationSettings;
        localStorage.setItem('genz_status_monetization', JSON.stringify(settings));
        
        if (onMonetizationUpdate) {
          onMonetizationUpdate(monetizationSettings);
        }
        onClose();
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
    }
  };

  const calculateProjectedEarnings = () => {
    const baseEarnings = earnings.thisMonth;
    const multiplier = monetizationEnabled ? 1.5 : 1;
    const adBonus = adType !== 'none' ? 0.3 : 0;
    const subscriptionBonus = subscriptionEnabled ? 0.5 : 0;
    const tipBonus = tipJarEnabled ? 0.2 : 0;
    
    return Math.round(baseEarnings * multiplier * (1 + adBonus + subscriptionBonus + tipBonus));
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <DollarSign className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Monetization</h2>
              <p className="text-white/60 text-xs">Earn from your status updates</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Enable Monetization */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Zap className="text-[#00a884]" size={20} />
                <div>
                  <h3 className="text-white font-medium">Enable Monetization</h3>
                  <p className="text-white/60 text-xs">Start earning from this status</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={monetizationEnabled}
                  onChange={(e) => setMonetizationEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>
          </div>

          {/* Earnings Overview */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="text-[#00a884]" size={20} />
              <h3 className="text-white font-medium">Earnings Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Total Earnings</p>
                <p className="text-white text-xl font-bold">${earnings.total.toFixed(2)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">This Month</p>
                <p className="text-[#00a884] text-xl font-bold">${earnings.thisMonth.toFixed(2)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Projected</p>
                <p className="text-white text-xl font-bold">${calculateProjectedEarnings().toFixed(2)}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-white/60 text-xs">Growth</p>
                <p className="text-green-400 text-xl font-bold">
                  {earnings.lastMonth > 0 ? `${((earnings.thisMonth - earnings.lastMonth) / earnings.lastMonth * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Ad Type Selection */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="text-[#00a884]" size={20} />
              <h3 className="text-white font-medium">Ad Type</h3>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {adTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setAdType(type.id)}
                    className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                      adType === type.id
                        ? 'bg-[#00a884] text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ad Settings */}
          {adType !== 'none' && (
            <div className="bg-white/5 rounded-xl p-4 space-y-4">
              <div>
                <label className="text-white/60 text-xs mb-2 block">Ad Placement</label>
                <select
                  value={adSettings.placement}
                  onChange={(e) => setAdSettings({ ...adSettings, placement: e.target.value })}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
                >
                  {placements.map((placement) => (
                    <option key={placement.id} value={placement.id} className="bg-[#1a2e35]">
                      {placement.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/60 text-xs mb-2 block">Ad Frequency</label>
                <select
                  value={adSettings.frequency}
                  onChange={(e) => setAdSettings({ ...adSettings, frequency: e.target.value })}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
                >
                  {frequencies.map((frequency) => (
                    <option key={frequency.id} value={frequency.id} className="bg-[#1a2e35]">
                      {frequency.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/60 text-xs mb-2 block">Target Audience</label>
                <select
                  value={adSettings.targetAudience}
                  onChange={(e) => setAdSettings({ ...adSettings, targetAudience: e.target.value })}
                  className="w-full bg-white/10 text-white px-4 py-3 rounded-xl border border-white/20 focus:border-[#00a884] focus:outline-none"
                >
                  {audiences.map((audience) => (
                    <option key={audience.id} value={audience.id} className="bg-[#1a2e35]">
                      {audience.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Monetization Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Crown className="text-yellow-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Sponsored Content</h3>
                  <p className="text-white/60 text-xs">Partner with brands</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={sponsoredContent}
                  onChange={(e) => setSponsoredContent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Target className="text-blue-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Affiliate Links</h3>
                  <p className="text-white/60 text-xs">Earn from product links</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={affiliateLinks}
                  onChange={(e) => setAffiliateLinks(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Gift className="text-pink-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Donations</h3>
                  <p className="text-white/60 text-xs">Accept viewer donations</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={donationEnabled}
                  onChange={(e) => setDonationEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="text-purple-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Subscriptions</h3>
                  <p className="text-white/60 text-xs">Offer exclusive content</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={subscriptionEnabled}
                  onChange={(e) => setSubscriptionEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Crown className="text-orange-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Exclusive Content</h3>
                  <p className="text-white/60 text-xs">Premium status for subscribers</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={exclusiveContent}
                  onChange={(e) => setExclusiveContent(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Users className="text-green-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Tip Jar</h3>
                  <p className="text-white/60 text-xs">Accept tips from viewers</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tipJarEnabled}
                  onChange={(e) => setTipJarEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>

            <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-red-400" size={20} />
                <div>
                  <h3 className="text-white font-medium">Fundraiser</h3>
                  <p className="text-white/60 text-xs">Raise funds for causes</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={fundraiserEnabled}
                  onChange={(e) => setFundraiserEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#00a884]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a884]" />
              </label>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="text-[#00a884]" size={20} />
              <h3 className="text-white font-medium">Revenue Breakdown</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Ad Revenue</span>
                <span className="text-white">${earnings.adRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Donations</span>
                <span className="text-white">${earnings.donations.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Subscriptions</span>
                <span className="text-white">${earnings.subscriptions.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Tips</span>
                <span className="text-white">${earnings.tips.toFixed(2)}</span>
              </div>
              <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                <span className="text-white font-medium">Total</span>
                <span className="text-[#00a884] font-bold">${earnings.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleSave}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Save Monetization Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusMonetizationPanel;
