import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import adminApi from '../../services/adminApi';
import { LoadingBlock, StatCard, Table, EmptyRow } from './adminUi';

const FraudDetection = () => {
  const [signals, setSignals] = useState(null);

  useEffect(() => {
    adminApi.get('/admin/fraud/signals')
      .then(({ data }) => setSignals(data.signals))
      .catch(() => toast.error('Imeshindikana kupakua fraud signals'));
  }, []);

  if (!signals) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="IP Zinazoshirikiwa" value={signals.sharedIps.length} tone="red" />
        <StatCard label="Walengwa wa Brute-force" value={signals.bruteForceTargets.length} tone="amber" />
        <StatCard label="Mrundikano wa Usajili" value={signals.signupBursts.length} tone="red" />
      </div>

      <div>
        <h3 className="font-medium mb-2 text-sm">Akaunti Nyingi Kwenye IP Moja (zaidi ya 2)</h3>
        <Table headers={['IP', 'Idadi ya Akaunti', 'Watumiaji']}>
          {signals.sharedIps.map((s) => (
            <tr key={s._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3 font-mono text-xs">{s._id}</td>
              <td className="p-3">{s.userCount}</td>
              <td className="p-3 text-gray-400 text-xs">{s.users.map((u) => u.username).join(', ')}</td>
            </tr>
          ))}
          {signals.sharedIps.length === 0 && <EmptyRow colSpan={3} text="Hakuna dalili za tuhuma" />}
        </Table>
      </div>

      <div>
        <h3 className="font-medium mb-2 text-sm">Walengwa wa Majaribio ya Kuvunja Akaunti (Brute-force)</h3>
        <Table headers={['Mtumiaji', 'Simu', 'Majaribio Yaliyoshindwa', 'Amefungwa Hadi']}>
          {signals.bruteForceTargets.map((u) => (
            <tr key={u._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3">{u.username}</td>
              <td className="p-3 text-gray-400">{u.phoneNumber}</td>
              <td className="p-3 text-red-500">{u.failedLoginAttempts}</td>
              <td className="p-3 text-gray-400">{u.lockUntil ? new Date(u.lockUntil).toLocaleString() : '—'}</td>
            </tr>
          ))}
          {signals.bruteForceTargets.length === 0 && <EmptyRow colSpan={4} text="Hakuna dalili za tuhuma" />}
        </Table>
      </div>

      <div>
        <h3 className="font-medium mb-2 text-sm">Mrundikano wa Usajili (Siku 14) — zaidi ya akaunti 10 kwa saa moja</h3>
        <Table headers={['Saa', 'Idadi ya Usajili']}>
          {signals.signupBursts.map((b) => (
            <tr key={b._id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="p-3">{b._id}</td>
              <td className="p-3 text-red-500">{b.count}</td>
            </tr>
          ))}
          {signals.signupBursts.length === 0 && <EmptyRow colSpan={2} text="Hakuna dalili za tuhuma" />}
        </Table>
      </div>
    </div>
  );
};

export default FraudDetection;
