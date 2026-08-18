import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { LoadingBlock, StatCard, Table, EmptyRow } from './adminUi';

const FraudDetection = () => {
  const [signals, setSignals] = useState(null);

  useEffect(() => {
    adminApi.get('/admin/fraud/signals')
      .then(({ data }) => setSignals(data.signals))
      .catch(() => toast.error('Failed to load fraud signals'));
  }, []);

  if (!signals) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Shared IPs" value={signals.sharedIps.length} tone="red" />
        <StatCard label="Walengwa wa Brute-force" value={signals.bruteForceTargets.length} tone="amber" />
        <StatCard label="Signup Burst" value={signals.signupBursts.length} tone="red" />
      </div>

      <div>
        <h3 className="font-medium mb-2 text-sm">Multiple Accounts on One IP (more than 2)</h3>
        <Table headers={['IP', 'Account Count', 'Users']}>
          {signals.sharedIps.map((s) => (
            <tr key={s._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3 font-mono text-xs">{s._id}</td>
              <td className="p-3">{s.userCount}</td>
              <td className="p-3 text-gray-400 text-xs">{s.users.map((u) => u.username).join(', ')}</td>
            </tr>
          ))}
          {signals.sharedIps.length === 0 && <EmptyRow colSpan={3} text="No suspicious signals" />}
        </Table>
      </div>

      <div>
        <h3 className="font-medium mb-2 text-sm">Brute-force Account Attack Targets</h3>
        <Table headers={['User', 'Phone', 'Failed Attempts', 'Locked Until']}>
          {signals.bruteForceTargets.map((u) => (
            <tr key={u._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3">{u.username}</td>
              <td className="p-3 text-gray-400">{u.phoneNumber}</td>
              <td className="p-3 text-red-500">{u.failedLoginAttempts}</td>
              <td className="p-3 text-gray-400">{u.lockUntil ? new Date(u.lockUntil).toLocaleString() : '—'}</td>
            </tr>
          ))}
          {signals.bruteForceTargets.length === 0 && <EmptyRow colSpan={4} text="No suspicious signals" />}
        </Table>
      </div>

      <div>
        <h3 className="font-medium mb-2 text-sm">Registration Burst (14 days) — more than 10 accounts per hour</h3>
        <Table headers={['Time', 'Registration Count']}>
          {signals.signupBursts.map((b) => (
            <tr key={b._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3">{b._id}</td>
              <td className="p-3 text-red-500">{b.count}</td>
            </tr>
          ))}
          {signals.signupBursts.length === 0 && <EmptyRow colSpan={2} text="No suspicious signals" />}
        </Table>
      </div>
    </div>
  );
};

export default FraudDetection;
