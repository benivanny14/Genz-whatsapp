import React, { useState } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, Zap, TrendingUp, Users, Eye, CheckCircle, CreditCard } from 'lucide-react';

const StatusBoostPanel = ({ onClose, status, onBoost }) => {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [boostDuration, setBoostDuration] = useState('24h');
  const [targetAudience, setTargetAudience] = useState('all');
  const [isBoosting, setIsBoosting] = useState(false);

  const boostPlans = [
    { id: 'basic', name: 'Basic Boost', price: 5, features: ['2x Reach', 'Basic Analytics', '24h Support'], icon: Zap },
    { id: 'standard', name: 'Standard Boost', price: 15, features: ['5x Reach', 'Advanced Analytics', 'Priority Support', 'Demographics'], icon: TrendingUp, popular: true },
    { id: 'premium', name: 'Premium Boost', price: 30, features: ['10x Reach', 'Full Analytics', '24/7 Support', 'Custom Targeting', 'A/B Testing'], icon: Users }
  ];

  const durations = [
    { id: '24h', label: '24 Hours', multiplier: 1 },
    { id: '48h', label: '48 Hours', multiplier: 1.5 },
    { id: '72h', label: '3 Days', multiplier: 2 },
    { id: '168h', label: '7 Days', multiplier: 3 }
  ];

  const audiences = [
    { id: 'all', label: 'All Users' },
    { id: 'local', label: 'Local Area' },
    { id: 'interest', label: 'Interest Based' },
    { id: 'custom', label: 'Custom Target' }
  ];

  const selectedPlanData = boostPlans.find(p => p.id === selectedPlan);
  const durationData = durations.find(d => d.id === boostDuration);
  const totalPrice = selectedPlanData ? selectedPlanData.price * (durationData?.multiplier || 1) : 0;

  const handleBoost = async () => {
    if (!selectedPlan) {
      alert('Please select a boost plan');
      return;
    }

    setIsBoosting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/boost`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: selectedPlan,
          duration: boostDuration,
          audience: targetAudience,
          price: totalPrice
        })
      });

      const data = await response.json();
      if (data.success) {
        if (onBoost) {
          onBoost({
            plan: selectedPlan,
            duration: boostDuration,
            audience: targetAudience,
            price: totalPrice
          });
        }
        onClose();
      }
    } catch (error) {
      console.error('Error boosting status:', error);
      alert('Failed to boost status. Please try again.');
    } finally {
      setIsBoosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <Zap className="text-yellow-400" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Boost Status</h2>
              <p className="text-white/60 text-xs">Increase your status reach</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Boost Plans */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Select Boost Plan</label>
            <div className="space-y-2">
              {boostPlans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full p-4 rounded-xl border transition-colors ${
                      selectedPlan === plan.id
                        ? 'bg-[#00a884]/20 border-[#00a884]'
                        : 'bg-white/5 border-white/20 hover:border-[#00a884]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon size={18} className={selectedPlan === plan.id ? 'text-[#00a884]' : 'text-white/60'} />
                        <span className="text-white font-medium">{plan.name}</span>
                        {plan.popular && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Popular</span>
                        )}
                      </div>
                      <span className="text-white font-bold">${plan.price}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {plan.features.map((feature) => (
                        <span key={feature} className="text-white/60 text-xs bg-white/10 px-2 py-1 rounded-full">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Boost Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {durations.map((duration) => (
                <button
                  key={duration.id}
                  onClick={() => setBoostDuration(duration.id)}
                  className={`p-3 rounded-xl text-center transition-colors ${
                    boostDuration === duration.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <p className="font-medium text-sm">{duration.label}</p>
                  <p className="text-xs opacity-80">x{duration.multiplier}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="text-white/60 text-xs mb-2 block">Target Audience</label>
            <div className="grid grid-cols-2 gap-2">
              {audiences.map((audience) => (
                <button
                  key={audience.id}
                  onClick={() => setTargetAudience(audience.id)}
                  className={`p-3 rounded-xl text-center transition-colors ${
                    targetAudience === audience.id
                      ? 'bg-[#00a884] text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {audience.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {selectedPlanData && (
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <Eye className="text-[#00a884]" size={18} />
                Boost Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Plan</span>
                  <span className="text-white">{selectedPlanData.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Duration</span>
                  <span className="text-white">{durationData?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Audience</span>
                  <span className="text-white capitalize">{targetAudience}</span>
                </div>
                <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold">
                  <span className="text-white">Total Price</span>
                  <span className="text-[#00a884]">${totalPrice}</span>
                </div>
              </div>
            </div>
          )}

          {/* Estimated Reach */}
          {selectedPlanData && (
            <div className="bg-[#00a884]/10 rounded-xl p-4 border border-[#00a884]/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-[#00a884]" size={18} />
                <span className="text-white font-medium">Estimated Reach</span>
              </div>
              <p className="text-3xl font-bold text-[#00a884]">
                {selectedPlanData.id === 'basic' ? '2,000-5,000' : 
                 selectedPlanData.id === 'standard' ? '10,000-25,000' : 
                 '50,000-100,000'}
              </p>
              <p className="text-white/60 text-sm">potential viewers</p>
            </div>
          )}
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={handleBoost}
            disabled={!selectedPlan}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <CreditCard size={20} />
            Boost Now (${totalPrice})
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusBoostPanel;
