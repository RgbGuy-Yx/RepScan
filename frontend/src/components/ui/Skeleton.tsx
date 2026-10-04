import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer bg-zinc-800/60 rounded-md animate-pulse ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
