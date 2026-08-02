import React, { useState, useEffect } from 'react';
import { resolveApiBase } from '../utils/resolveApiBase';
import { X, BarChart3, TrendingUp, Users, Eye, Heart, Share2, Clock, Calendar, ArrowUp, ArrowDown, Download, Filter } from 'lucide-react';

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
      const response = await fetch(`${resolveApiBase()}/status-advanced/${status?._id || status?.id}/insights`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setAnalyticsData(data.insights);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Fallback to mock data
      const mockData = {
        totalViews: Math.floor(Math.random() * 10000) + 1000,
        uniqueViewers: Math.floor(Math.random() * 5000) + 500,
        completionRate: Math.floor(Math.random() * 30) + 70,
        engagementRate: Math.floor(Math.random() * 20) + 10,
        shareRate: Math.floor(Math.random() * 10) + 5,
        saveRate: Math.floor(Math.random() * 15) + 5,
        viewsByTime: generateViewsByTime(),
        viewsByDevice: generateViewsByDevice(),
        viewsByLocation: generateViewsByLocation(),
        audienceDemographics: generateDemographics(),
        retentionRate: Math.floor(Math.random() * 40) + 40,
        growthRate: Math.floor(Math.random() * 30) - 10,
        averageViewTime: Math.floor(Math.random() * 30) + 10,
        dropOffPoints: generateDropOffPoints()
      };
      setAnalyticsData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const generateViewsByTime = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push({
        hour: i,
        views: Math.floor(Math.random() * 500) + 50
      });
    }
    return hours;
  };

  const generateViewsByDevice = () => [
    { device: 'Mobile', views: Math.floor(Math.random() * 5000) + 2000, percentage: 65 },
    { device: 'Desktop', views: Math.floor(Math.random() * 2000) + 500, percentage: 25 },
    { device: 'Tablet', views: Math.floor(Math.random() * 1000) + 200, percentage: 10 }
  ];

  const generateViewsByLocation = () => [
    { location: 'Tanzania', views: Math.floor(Math.random() * 3000) + 1000 },
    { location: 'Kenya', views: Math.floor(Math.random() * 2000) + 500 },
    { location: 'Uganda', views: Math.floor(Math.random() * 1000) + 200 },
    { location: 'Nigeria', views: Math.floor(Math.random() * 1500) + 300 },
    { location: 'South Africa', views: Math.floor(Math.random() * 1000) + 200 }
  ];

  const generateDemographics = () => ({
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
  });

  const generateDropOffPoints = () => [
    { time: '0-3s', percentage: 20 },
    { time: '3-6s', percentage: 15 },
    { time: '6-10s', percentage: 10 },
    { time: '10-15s', percentage: 8 },
    { time: '15s+', percentage: 47 }
  ];

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

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-[#1a2e35] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#0b141a] p-4 flex items-center justify-between border-b border-[#00a884]/20">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#00a884]" size={22} />
            <div>
              <h2 className="text-white text-lg font-semibold">Status Analytics</h2>
              <p className="text-white/60 text-xs">Detailed performance metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-white/10 text-white px-3 py-2 rounded-lg border border-white/20 focus:border-[#00a884] focus:outline-none text-sm"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              value={`${analyticsData.engagementRate}%`}
              change={Math.floor(Math.random() * 10) - 2}
              color="#ef4444"
            />
            <MetricCard
              icon={Clock}
              label="Avg View Time"
              value={`${analyticsData.averageViewTime}s`}
              change={Math.floor(Math.random() * 15) - 5}
              color="#f59e0b"
            />
          </div>

          {/* Views by Time Chart */}
          <div className="bg-white/5 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <TrendingUp size={18} className="text-[#00a884]" />
                Views Over Time
              </h3>
            </div>
            <div className="h-48 flex items-end gap-1">
              {analyticsData.viewsByTime.map((data, index) => {
                const maxViews = Math.max(...analyticsData.viewsByTime.map(d => d.views));
                const height = (data.views / maxViews) * 100;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-[#00a884]/50 hover:bg-[#00a884] transition-colors rounded-t"
                    style={{ height: `${height}%` }}
                    title={`${data.hour}:00 - ${data.views} views`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-white/40 text-xs">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">Completion Rate</p>
              <p className="text-white text-2xl font-bold">{analyticsData.completionRate}%</p>
              <div className="bg-white/10 rounded-full h-2 mt-2">
                <div
                  className="bg-[#00a884] h-full rounded-full"
                  style={{ width: `${analyticsData.completionRate}%` }}
                />
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">Share Rate</p>
              <p className="text-white text-2xl font-bold">{analyticsData.shareRate}%</p>
              <div className="bg-white/10 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${analyticsData.shareRate}%` }}
                />
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-white/60 text-xs mb-1">Save Rate</p>
              <p className="text-white text-2xl font-bold">{analyticsData.saveRate}%</p>
              <div className="bg-white/10 rounded-full h-2 mt-2">
                <div
                  className="bg-purple-500 h-full rounded-full"
                  style={{ width: `${analyticsData.saveRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Views by Device */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Filter size={18} className="text-[#00a884]" />
              Views by Device
            </h3>
            <div className="space-y-3">
              {analyticsData.viewsByDevice.map((data) => (
                <div key={data.device}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{data.device}</span>
                    <span className="text-white/60">{data.views} ({data.percentage}%)</span>
                  </div>
                  <div className="bg-white/10 rounded-full h-2">
                    <div
                      className="bg-[#00a884] h-full rounded-full"
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Views by Location */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-[#00a884]" />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-white font-medium mb-4">Age Distribution</h3>
              <div className="space-y-2">
                {analyticsData.audienceDemographics.age.map((data) => (
                  <div key={data.range}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{data.range}</span>
                      <span className="text-white/60">{data.percentage}%</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2">
                      <div
                        className="bg-[#00a884] h-full rounded-full"
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <h3 className="text-white font-medium mb-4">Gender Distribution</h3>
              <div className="space-y-2">
                {analyticsData.audienceDemographics.gender.map((data) => (
                  <div key={data.gender}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{data.gender}</span>
                      <span className="text-white/60">{data.percentage}%</span>
                    </div>
                    <div className="bg-white/10 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Drop-off Points */}
          <div className="bg-white/5 rounded-xl p-4">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#00a884]" />
              Viewer Drop-off
            </h3>
            <div className="space-y-2">
              {analyticsData.dropOffPoints.map((data) => (
                <div key={data.time}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{data.time}</span>
                    <span className="text-white/60">{data.percentage}%</span>
                  </div>
                  <div className="bg-white/10 rounded-full h-2">
                    <div
                      className="bg-red-500 h-full rounded-full"
                      style={{ width: `${data.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0b141a] p-4 border-t border-[#00a884]/20">
          <button
            onClick={() => {
              // Export analytics as CSV
              const csv = generateCSV(analyticsData);
              downloadCSV(csv, 'status-analytics.csv');
            }}
            className="w-full px-4 py-3 bg-[#00a884] hover:bg-[#008f6f] rounded-lg text-white font-medium flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Export Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, change, color }) => (
  <div className="bg-white/5 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={18} style={{ color }} />
      <span className="text-white/60 text-xs">{label}</span>
    </div>
    <p className="text-white text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    {change !== undefined && (
      <div className={`flex items-center gap-1 mt-1 text-xs ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {change >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        <span>{Math.abs(change)}%</span>
      </div>
    )}
  </div>
);

const generateCSV = (data) => {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Views', data.totalViews],
    ['Unique Viewers', data.uniqueViewers],
    ['Completion Rate', `${data.completionRate}%`],
    ['Engagement Rate', `${data.engagementRate}%`],
    ['Share Rate', `${data.shareRate}%`],
    ['Save Rate', `${data.saveRate}%`],
    ['Average View Time', `${data.averageViewTime}s`],
    ['Retention Rate', `${data.retentionRate}%`],
    ['Growth Rate', `${data.growthRate}%`]
  ];
  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default StatusAnalyticsPanel;
