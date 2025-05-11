import * as React from 'react';
import { cn } from '@/lib/utils';

interface GeneratedOutputProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GeneratedOutput({ children, className, ...props }: GeneratedOutputProps) {
  return (
    <div
      className={cn(
        "bg-[#E0E0E0] p-4 border-2 border-[#1A1A1A] rounded-lg mb-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}