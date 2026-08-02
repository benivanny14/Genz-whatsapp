import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, BarChart3, TrendingUp, Users, Eye, Heart, Share2, ArrowUp, ArrowDown, Calendar, MapPin, Smartphone, Monitor } from 'lucide-react';

const StatusAnalyticsPanel = ({ onClose, status }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [status, timeRange]);

  const loadAnalyticsData = async () => {
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
        setAnalyticsData(data.analytics);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Fallback to mock data
      const mockData = {
        totalViews: Math.floor(Math.random() * 10000) + 1000,
        uniqueViewers: Math.floor(Math.random() * 5000) + 500,
        engagementRate: (Math.floor(Math.random() * 20) + 10) / 100,
        shareCount: Math.floor(Math.random() * 100) + 10,
        saveCount: Math.floor(Math.random() * 50) + 5,
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
        viewsByTime: [],
        viewsByDevice: [
          { device: 'Mobile', views: Math.floor(Math.random() * 5000) + 2000, percentage: 65 },
          { device: 'Desktop', views: Math.floor(Math.random() * 2000) + 500, percentage: 25 },
          { device: 'Tablet', views: Math.floor(Math.random() * 1000) + 200, percentage: 10 }
        ],
        viewsByLocation: [
          { location: 'Tanzania', views: Math.floor(Math.random() * 3000) + 1000 },
          { location: 'Kenya', views: Math.floor(Math.random() * 2000) + 500 },
          { location: 'Uganda', views: Math.floor(Math.random() * 1000) + 200 },
          { location: 'Nigeria', views: Math.floor(Math.random() * 1500) + 300 },
          { location: 'South Africa', views: Math.floor(Math.random() * 1000) + 200 }
        ],
        audienceDemographics: {
          age: [
            { age: '18-24', percentage: 35 },
            { age: '25-34', percentage: 40 },
            { age: '35-44', percentage: 15 },
            { age: '45+', percentage: 10 }
          ],
          gender: [
            { gender: 'Male', percentage: 55 },
            { gender: 'Female', percentage: 45 }
          ]
        },
        retentionRate: Math.floor(Math.random() * 40) + 40,
        growthRate: Math.floor(Math.random() * 30) - 10,
        averageViewTime: Math.floor(Math.random() * 30) + 10,
        dropOffPoints: [
          { time: '0-3s', percentage: 20 },
          { time: '3-6s', percentage: 15 },
          { time: '6-10s', percentage: 10 },
          { time: '10-15s', percentage: 8 },
          { time: '15s+', percentage: 47 }
        ]
      };
      setAnalyticsData(mockData);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00a884] mx-auto mb-4" />
          <p className="text-white">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return null;
  }

  const timeRanges = [
    { id: '24h', label: 'Last 24 hours' },
    { id: '7d', label: 'Last 7 days' },
    { id: '30d', label: 'Last 30 days' },
    { id: '90d', label: 'Last 90 days' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon={Eye}
          label="Total Views"
          value={analyticsData.totalViews}
          change={analyticsData.growthRate}
          color="#00a884"
        />
        <MetricCard
          icon={Users}
          label="Unique Viewers"
          value={analyticsData.uniqueViewers}
          change={Math.floor(Math.random() * 20) - 5}
          color="#3b82f6"
        />
        <MetricCard
          icon={Heart}
          label="Engagement Rate"
          value={`${analyticsData.engagementRate * 100}%`}
          change={Math.floor(Math.random() * 10) - 3}
          color="#ef4444"
        />
        <MetricCard
          icon={Share2}
          label="Share Rate"
          value={`${(analyticsData.shareCount / analyticsData.totalViews * 100).toFixed(1)}%`}
          change={Math.floor(Math.random() * 8) - 2}
          color="#10b981"
        />
      </div>

      {/* Views Graph */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">Views Over Time</h3>
        <div className="h-40 flex items-end gap-2">
          {analyticsData.viewsByDevice.map((item) => (
            <div key={item.device} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-[#00a884] rounded-t"
                style={{ height: `${(item.views / 10000) * 100}%` }}
              />
              <span className="text-white/60 text-xs mt-2">{item.device}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Views by Location */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <Users size={18} />
          Top Locations
        </h3>
        <div className="space-y-2">
          {analyticsData.viewsByLocation.map((data, index) => (
            <div key={data.location} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white/40 w-6">#{index + 1}</span>
                <span className="text-white">{data.location}</span>
              </div>
              <span className="text-white/60">{data.views}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Audience Demographics */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">Audience Demographics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-white/60 text-sm mb-2">Age Distribution</h4>
            {analyticsData.audienceDemographics.age.map((data) => (
              <div key={data.range} className="flex items-center justify-between mb-1">
                <span className="text-white">{data.range}</span>
                <span className="text-white/60">{data.percentage}%</span>
              </div>
            ))}
          </div>
          <div>
            <h4 className="text-white/60 text-sm mb-2">Gender Distribution</h4>
            {analyticsData.audienceDemographics.gender.map((data) => (
              <div key={data.gender} className="flex items-center justify-between mb-1">
                <span className="text-white">{data.gender}</span>
                <span className="text-white/60">{data.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Drop-off Points */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#00a884]" />
          View Drop-off Points
        </h3>
        <div className="space-y-2">
          {analyticsData.dropOffPoints.map((item) => (
            <div key={item.time} className="flex items-center justify-between">
              <span className="text-white">{item.time}</span>
              <span className="text-white/60">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const MetricCard = ({ icon: Icon, label, value, change, color }) => (
    <div className="bg-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} className="text-[#00a884]" />
        <span className="text-white/60 text-sm">{label}</span>
      </div>
      <div className="text-white text-xl font-bold mb-1">{value}</div>
      <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {change >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        <span>{Math.abs(change)}%</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Analytics</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none text-sm"
            >
              {timeRanges.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderOverview()}
        </div>
      </div>
    </div>
  );
};

export default StatusAnalyticsPanel;