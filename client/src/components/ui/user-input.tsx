import * as React from 'react';
import { cn } from '@/lib/utils';

interface UserInputProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function UserInput({ children, className, ...props }: UserInputProps) {
  return (
    <div
      className={cn(
        "bg-[#F9FAFB] p-4 border-2 border-newsBlue rounded-lg mb-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}