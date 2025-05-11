import * as React from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export interface LinkProps {
  href: string;
  className?: string;
  unstyled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Link = React.forwardRef<HTMLSpanElement, LinkProps>(
  ({ className, href, unstyled = false, children, onClick, ...props }, ref) => {
    const [, navigate] = useLocation();
    // Determine if the link is external
    const isExternal = href.startsWith("http") || href.startsWith("mailto:");

    // Default styles for links, unless unstyled is true
    const linkStyles = unstyled 
      ? className 
      : cn(
          "font-inter text-newsBlue hover:underline transition-colors cursor-pointer",
          className
        );
    
    // Handle click for internal links
    const handleClick = () => {
      if (onClick) {
        onClick();
      }
      
      if (!isExternal) {
        navigate(href);
      }
    };

    // If external, render a regular anchor tag
    if (isExternal) {
      return (
        <a
          href={href}
          className={linkStyles}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
        >
          {children}
        </a>
      );
    }

    // For internal links, use a span with onClick that navigates
    return (
      <span
        ref={ref}
        className={linkStyles}
        onClick={handleClick}
        role="link"
        tabIndex={0}
      >
        {children}
      </span>
    );
  }
);

Link.displayName = "Link";

export { Link };