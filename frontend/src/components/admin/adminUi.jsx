import React from 'react';

export const fmtMoney = (n) => `TZS ${Number(n || 0).toLocaleString()}`;

export const StatCard = ({ label, value, sub, tone = 'emerald' }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
    <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
    <p className={`text-2xl font-semibold mt-1 text-${tone}-600 dark:text-${tone}-400`}>{value}</p>
    {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
  </div>
);

export const ComingSoonPanel = ({ label }) => (
  <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
    <p className="text-gray-700 dark:text-gray-300 font-medium">{label}</p>
    <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
      Sehemu hii itajengwa katika awamu ijayo ya mradi.
    </p>
  </div>
);

export const LoadingBlock = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export const EmptyRow = ({ colSpan, text = 'Hakuna rekodi' }) => (
  <tr><td colSpan={colSpan} className="p-6 text-center text-gray-400">{text}</td></tr>
);

export const Pager = ({ page, pages, onChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 py-3 text-sm">
      <button
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-40"
      >
        Nyuma
      </button>
      <span className="text-gray-500">{page} / {pages}</span>
      <button
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 disabled:opacity-40"
      >
        Mbele
      </button>
    </div>
  );
};

export const Table = ({ headers, children }) => (
  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500">
        <tr>{headers.map((h) => <th key={h} className="text-left p-3 whitespace-nowrap">{h}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);
