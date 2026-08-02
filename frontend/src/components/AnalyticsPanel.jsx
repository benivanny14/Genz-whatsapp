import React, { useState } from 'react';
import { X, BarChart3, TrendingUp, Users, Eye, Heart, Share2, ArrowUp, ArrowDown, Calendar, MapPin, Smartphone, Monitor } from 'lucide-react';

const AnalyticsPanel = ({ onClose, statusData }) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState('overview');

  const timeRanges = [
    { id: '1d', label: '1 Day' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' }
  ];

  const tabs = [
    { id: 'overview', icon: BarChart3, label: 'Overview' },
    { id: 'audience', icon: Users, label: 'Audience' },
    { id: 'engagement', icon: Heart, label: 'Engagement' },
    { id: 'retention', icon: TrendingUp, label: 'Retention' }
  ];

  // Mock analytics data
  const analyticsData = {
    totalViews: 125000,
    viewsGrowth: 12.5,
    completionRate: 78,
    completionGrowth: 5.2,
    engagementRate: 8.5,
    engagementGrowth: 3.1,
    shareRate: 2.3,
    shareGrowth: 1.8,
    saveRate: 1.9,
    saveGrowth: 0.9
  };

  const viewsByTime = [
    { time: '00:00', views: 1200 },
    { time: '04:00', views: 800 },
    { time: '08:00', views: 3500 },
    { time: '12:00', views: 8900 },
    { time: '16:00', views: 12000 },
    { time: '20:00', views: 15000 },
    { time: '23:59', views: 9500 }
  ];

  const viewsByDay = [
    { day: 'Mon', views: 18000 },
    { day: 'Tue', views: 22000 },
    { day: 'Wed', views: 19000 },
    { day: 'Thu', views: 25000 },
    { day: 'Fri', views: 28000 },
    { day: 'Sat', views: 32000 },
    { day: 'Sun', views: 30000 }
  ];

  const viewsByLocation = [
    { location: 'Dar es Salaam', views: 45000, percentage: 36 },
    { location: 'Nairobi', views: 28000, percentage: 22 },
    { location: 'Kampala', views: 18000, percentage: 14 },
    { location: 'Lagos', views: 15000, percentage: 12 },
    { location: 'Other', views: 19000, percentage: 16 }
  ];

  const viewsByDevice = [
    { device: 'Mobile', icon: Smartphone, views: 95000, percentage: 76 },
    { device: 'Desktop', icon: Monitor, views: 25000, percentage: 20 },
    { device: 'Tablet', icon: Monitor, views: 5000, percentage: 4 }
  ];

  const audienceDemographics = [
    { age: '13-17', percentage: 15 },
    { age: '18-24', percentage: 45 },
    { age: '25-34', percentage: 28 },
    { age: '35-44', percentage: 10 },
    { age: '45+', percentage: 2 }
  ];

  const dropOffPoints = [
    { point: '0-3s', percentage: 15 },
    { point: '3-7s', percentage: 22 },
    { point: '7-15s', percentage: 35 },
    { point: '15-30s', percentage: 18 },
    { point: '30s+', percentage: 10 }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Eye}
          label="Total Views"
          value={analyticsData.totalViews.toLocaleString()}
          growth={analyticsData.viewsGrowth}
        />
        <MetricCard
          icon={TrendingUp}
          label="Completion Rate"
          value={`${analyticsData.completionRate}%`}
          growth={analyticsData.completionGrowth}
        />
        <MetricCard
          icon={Heart}
          label="Engagement Rate"
          value={`${analyticsData.engagementRate}%`}
          growth={analyticsData.engagementGrowth}
        />
        <MetricCard
          icon={Share}
          label="Share Rate"
          value={`${analyticsData.shareRate}%`}
          growth={analyticsData.shareGrowth}
        />
      </div>

      {/* Views Graph */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">Views Over Time</h3>
        <div className="h-40 flex items-end gap-2">
          {viewsByDay.map((item) => (
            <div key={item.day} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-[#00a884] rounded-t"
                style={{ height: `${(item.views / 32000) * 100}%` }}
              />
              <span className="text-white/60 text-xs mt-2">{item.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Views by Time */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">Views by Time of Day</h3>
        <div className="h-32 flex items-end gap-1">
          {viewsByTime.map((item) => (
            <div key={item.time} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-[#00a884]/70 rounded-t"
                style={{ height: `${(item.views / 15000) * 100}%` }}
              />
              <span className="text-white/40 text-xs mt-1">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAudience = () => (
    <div className="space-y-6">
      {/* Views by Location */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <MapPin size={18} />
          Views by Location
        </h3>
        <div className="space-y-3">
          {viewsByLocation.map((item) => (
            <div key={item.location}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white">{item.location}</span>
                <span className="text-white/60">{item.views.toLocaleString()} ({item.percentage}%)</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00a884]"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Views by Device */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">Views by Device</h3>
        <div className="space-y-3">
          {viewsByDevice.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.device}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-white/60" />
                    <span className="text-white">{item.device}</span>
                  </div>
                  <span className="text-white/60">{item.views.toLocaleString()} ({item.percentage}%)</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00a884]"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audience Demographics */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">Audience Age Distribution</h3>
        <div className="space-y-3">
          {audienceDemographics.map((item) => (
            <div key={item.age}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white">{item.age}</span>
                <span className="text-white/60">{item.percentage}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00a884]"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEngagement = () => (
    <div className="space-y-6">
      {/* Engagement Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          icon={Heart}
          label="Likes"
          value="8,500"
          growth={15.2}
        />
        <MetricCard
          icon={Share}
          label="Shares"
          value="2,100"
          growth={8.5}
        />
        <MetricCard
          icon={Eye}
          label="Saves"
          value="1,800"
          growth={12.3}
        />
        <MetricCard
          icon={Users}
          label="Comments"
          value="950"
          growth={22.1}
        />
      </div>

      {/* Drop-off Points */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">View Drop-off Points</h3>
        <div className="space-y-3">
          {dropOffPoints.map((item) => (
            <div key={item.point}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white">{item.point}</span>
                <span className="text-white/60">{item.percentage}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderRetention = () => (
    <div className="space-y-6">
      {/* Retention Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <MetricCard
          icon={Users}
          label="Returning Viewers"
          value="45%"
          growth={5.5}
        />
        <MetricCard
          icon={TrendingUp}
          label="Growth Rate"
          value="18.2%"
          growth={3.8}
        />
      </div>

      {/* Retention Graph */}
      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4">Viewer Retention Over Time</h3>
        <div className="space-y-2">
          {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, index) => (
            <div key={week}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-white">{week}</span>
                <span className="text-white/60">{100 - index * 15}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00a884]"
                  style={{ width: `${100 - index * 15}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#00a884]" size={22} />
            <h2 className="text-white text-lg font-semibold">Analytics</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/10 text-white px-3 py-1.5 rounded-lg text-sm border border-white/20"
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

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
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
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'audience' && renderAudience()}
          {activeTab === 'engagement' && renderEngagement()}
          {activeTab === 'retention' && renderRetention()}
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, growth }) => (
  <div className="bg-white/5 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={18} className="text-[#00a884]" />
      <span className="text-white/60 text-sm">{label}</span>
    </div>
    <div className="text-white text-xl font-bold mb-1">{value}</div>
    <div className={`flex items-center gap-1 text-sm ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {growth >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      <span>{Math.abs(growth)}%</span>
    </div>
  </div>
);

export default AnalyticsPanel;
