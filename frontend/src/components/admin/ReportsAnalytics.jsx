import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { LoadingBlock, StatCard, fmtMoney } from './adminUi';

const MiniBarChart = ({ data, valueKey, labelKey = '_id', color = 'bg-emerald-500' }) => {
  const max = Math.max(1, ...data.map((d) => d[valueKey] || 0));
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d) => (
        <div key={d[labelKey]} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d[labelKey]}: ${d[valueKey]}`}>
          <div className={`${color} rounded-t w-full`} style={{ height: `${((d[valueKey] || 0) / max) * 100}%` }} />
        </div>
      ))}
    </div>
  );
};

const ReportsAnalytics = () => {
  const [growth, setGrowth] = useState(null);
  const [engagement, setEngagement] = useState(null);

  useEffect(() => {
    Promise.all([
      adminApi.get('/admin/reports/growth'),
      adminApi.get('/admin/reports/engagement')
    ]).then(([g, e]) => {
      setGrowth(g.data.report);
      setEngagement(e.data.report);
    }).catch(() => toast.error('Failed to load reports'));
  }, []);

  if (!growth || !engagement) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Active Users Today (DAU)" value={engagement.dailyActiveUsers} />
        <StatCard label="New Users (30 days)" value={growth.userGrowth.reduce((s, d) => s + d.count, 0)} tone="blue" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="font-medium mb-3 text-sm">User Growth (30 days)</h3>
        <MiniBarChart data={growth.userGrowth} valueKey="count" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="font-medium mb-3 text-sm">Messages Sent (30 days)</h3>
        <MiniBarChart data={growth.messageGrowth} valueKey="count" color="bg-violet-500" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="font-medium mb-3 text-sm">Revenue (30 days)</h3>
        <MiniBarChart data={growth.revenueGrowth} valueKey="total" color="bg-amber-500" />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <h3 className="font-medium mb-3 text-sm">Top Messaging Users (This Week)</h3>
        <div className="space-y-1">
          {engagement.topSenders.map((s, i) => (
            <div key={i} className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-800 py-1">
              <span>{s.user?.username || 'User'}</span>
              <span className="text-gray-400">{s.count} messages</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;
