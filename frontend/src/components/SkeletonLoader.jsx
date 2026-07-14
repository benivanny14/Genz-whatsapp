import React from 'react';

const SkeletonLoader = ({ type = 'chat', count = 1 }) => {
  if (type === 'chat') {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 p-3 hover:bg-dark-hover transition-colors">
            <div className="w-12 h-12 rounded-full bg-dark-surface animate-pulse"></div>
            <div className="flex-1 min-w-0">
              <div className="h-4 w-32 bg-dark-surface rounded animate-pulse mb-2"></div>
              <div className="h-3 w-48 bg-dark-surface rounded animate-pulse"></div>
            </div>
            <div className="h-3 w-12 bg-dark-surface rounded animate-pulse"></div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'message') {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-dark-surface animate-pulse flex-shrink-0"></div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-dark-surface rounded animate-pulse mb-2"></div>
              <div className="h-3 w-64 bg-dark-surface rounded animate-pulse mb-1"></div>
              <div className="h-3 w-48 bg-dark-surface rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (type === 'avatar') {
    return (
      <div className="w-12 h-12 rounded-full bg-dark-surface animate-pulse"></div>
    );
  }

  if (type === 'text') {
    return (
      <div className="h-4 w-full bg-dark-surface rounded animate-pulse"></div>
    );
  }

  return null;
};

export default SkeletonLoader;
