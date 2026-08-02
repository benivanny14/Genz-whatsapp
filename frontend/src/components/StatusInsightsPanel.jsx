import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, TrendingUp, Users, Eye, Heart, Share2, Clock, BarChart3, Calendar } from 'lucide-react';

const StatusInsightsPanel = ({ onClose, status }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInsights();
  }, [status, timeRange]);

      const loadInsights = async () => {
    if (!status?._id && !status?.id) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setInsights(data.analytics);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      // Fallback to mock data
      setInsights({
        totalViews: Math.floor(Math.random() * 10000) + 1000,
        totalReactions: Math.floor(Math.random() * 5000) + 500,
        shareCount: Math.floor(Math.random() * 100) + 10,
        uniqueViewers: Math.floor(Math.random() * 5000) + 500,
        engagementRate: (Math.floor(Math.random() * 20) + 10) / 100,
        peakTime: '12:00',
        topDay: 'Monday',
        demographics: {
          age: [
            { range: '18-24', percentage: 35 },
            { range: '25-34', percentage: 40 },
            { range: '35-44', percentage: 15 },
            { range: '45+', percentage: 10 }
          ],
          gender: [
            { gender: 'Male', percentage: 55 },
            { gender: 'Female', percentage: 45 }
          ]
        },
        engagement: {
          views: []
        },
        viewsByHour: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const displayInsights = insights || {
    totalViews: 0,
    totalReactions: 0,
    shareCount: 0,
    uniqueViewers: 0,
    engagementRate: 0,
    peakTime: '12:00',
    topDay: 'Monday',
    demographics: {
      age: [
        { range: '18-24', percentage: 35 },
        { range: '25-34', percentage: 40 },
        { range: '35-44', percentage: 15 },
        { range: '45+', percentage: 10 }
      ],
      gender: [
        { gender: 'Male', percentage: 55 },
        { gender: 'Female', percentage: 45 }
      ]
    },
    engagement: {
      views: []
    },
    viewsByHour: {}
  };

  const timeRanges = [
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' }
  ];

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Insights</h2>
              <p className="text-white/60 text-xs">Detailed analytics and performance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Time Range Selector */}
          <div className="flex gap-2">
            {timeRanges.map((range) => (
              <button
                key={range.id}
                onClick={() => setTimeRange(range.id)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  timeRange === range.id
                    ? 'bg-[#00a884] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="text-[#00a884]" size={18} />
                <span className="text-white/60 text-xs">Views</span>
              </div>
              <p className="text-white text-2xl font-bold">{displayInsights.totalViews}</p>
              <p className="text-green-400 text-xs flex items-center gap-1">
                <TrendingUp size={12} />
                +12.5%
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="text-red-400" size={18} />
                <span className="text-white/60 text-xs">Reactions</span>
              </div>
              <p className="text-white text-2xl font-bold">{displayInsights.totalReactions}</p>
              <p className="text-green-400 text-xs flex items-center gap-1">
                <TrendingUp size={12} />
                +8.3%
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="text-blue-400" size={18} />
                <span className="text-white/60 text-xs">Shares</span>
              </div>
              <p className="text-white text-2xl font-bold">{displayInsights.shareCount}</p>
              <p className="text-green-400 text-xs flex items-center gap-1">
                <TrendingUp size={12} />
                +15.2%
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="text-yellow-400" size={18} />
                <span className="text-white/60 text-xs">Engagement</span>
              </div>
              <p className="text-white text-2xl font-bold">{displayInsights.engagementRate}%</p>
              <p className="text-green-400 text-xs flex items-center gap-1">
                <TrendingUp size={12} />
                +5.1%
              </p>
            </div>
          </div>

          {/* Peak Performance */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="text-[#00a884]" size={18} />
              Peak Performance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-white/60 text-xs mb-1">Best Time</p>
                <p className="text-white font-medium">{displayInsights.peakTime}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs mb-1">Best Day</p>
                <p className="text-white font-medium">{displayInsights.topDay}</p>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Users className="text-[#00a884]" size={18} />
              Audience Demographics
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Age 18-24</span>
                  <span className="text-white">{mockInsights.demographics.age['18-24']}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-[#00a884] h-2 rounded-full" style={{ width: `${mockInsights.demographics.age['18-24']}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Age 25-34</span>
                  <span className="text-white">{mockInsights.demographics.age['25-34']}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-[#00a884] h-2 rounded-full" style={{ width: `${mockInsights.demographics.age['25-34']}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Age 35-44</span>
                  <span className="text-white">{mockInsights.demographics.age['35-44']}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-[#00a884] h-2 rounded-full" style={{ width: `${mockInsights.demographics.age['35-44']}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Chart */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Calendar className="text-[#00a884]" size={18} />
              Engagement Trend
            </h3>
            <div className="flex items-end gap-2 h-32">
              {mockInsights.engagement.views.map((value, index) => (
                <div
                  key={index}
                  className="flex-1 bg-[#00a884]/50 hover:bg-[#00a884] rounded-t transition-colors"
                  style={{ height: `${(value / 220) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-white/40 mt-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusInsightsPanel;
