import React from 'react';
import clsx from 'clsx';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'rectangular',
      width,
      height = '1rem',
      count = 1,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const variantClasses = {
      text: 'rounded',
      rectangular: 'rounded-lg',
      circular: 'rounded-full',
    };

    const skeletons = Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : undefined}
        className={clsx(
          'bg-neutral-200 animate-pulse',
          variantClasses[variant],
          className
        )}
        style={{
          width: variant === 'circular' ? height : width,
          height,
          ...style,
        }}
        {...props}
      />
    ));

    return count === 1 ? skeletons[0] : <div className="space-y-2">{skeletons}</div>;
  }
);

Skeleton.displayName = 'Skeleton';
