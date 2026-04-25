import React from 'react';
import clsx from 'clsx';
import Image from 'next/image';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  alt?: string;
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-base' },
  xl: { container: 'w-16 h-16', text: 'text-lg' },
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, size = 'md', alt = 'Avatar', className, ...props }, ref) => {
    const { container, text } = sizeMap[size];
    const initials = getInitials(name);

    return (
      <div
        ref={ref}
        className={clsx(
          container,
          'rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden flex-shrink-0',
          className
        )}
        {...props}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes={`${size === 'sm' ? 32 : size === 'md' ? 40 : size === 'lg' ? 48 : 64}px`}
          />
        ) : (
          <span className={clsx('font-semibold text-neutral-700', text)}>
            {initials}
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
