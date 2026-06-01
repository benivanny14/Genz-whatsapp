import React from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, X } from 'lucide-react';

const OnlineHistoryDashboard = ({ onClose, history }) => {
  // Simulate hourly buckets for the graph
  const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, active: Math.floor(Math.random() * 100) }));
  const maxActive = Math.max(...hours.map(h => h.active));

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-dark-surface w-full max-w-2xl rounded-3xl shadow-2xl border border-dark-border overflow-hidden">
        <div className="p-6 bg-primary-600 flex justify-between items-center text-white">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} />
            <h2 className="font-bold text-xl">Online Activity Dashboard</h2>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full"><X size={24} /></button>
        </div>

        <div className="p-8">
          <p className="text-dark-textSecondary text-sm mb-8 flex items-center gap-2">
            <Clock size={16} /> Activity based on the last 24 hours of presence.
          </p>

          <div className="flex items-end justify-between h-48 gap-1">
            {(hours || []).map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative">
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: `${(h.active / maxActive) * 100}%` }}
                    className="w-full bg-primary-500/40 group-hover:bg-primary-500 rounded-t-sm transition-colors cursor-help"
                    title={`${h.hour}:00 - ${h.active}% Activity`}
                  />
                </div>
                <span className="text-[8px] text-dark-textSecondary font-mono">{h.hour}h</span>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="bg-dark-bg p-4 rounded-2xl border border-dark-border">
              <p className="text-[10px] text-primary-500 font-bold uppercase">Peak Time</p>
              <p className="text-xl font-black text-white">8:00 PM - 10:00 PM</p>
            </div>
            <div className="bg-dark-bg p-4 rounded-2xl border border-dark-border">
              <p className="text-[10px] text-green-500 font-bold uppercase">Most Active Friend</p>
              <p className="text-xl font-black text-white">GENZ Admin</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default OnlineHistoryDashboard;
