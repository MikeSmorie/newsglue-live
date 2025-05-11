import * as React from "react";
import { Link as WouterLink } from "wouter";
import { cn } from "@/lib/utils";

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  className?: string;
  unstyled?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, href, unstyled = false, children, ...props }, ref) => {
    // Determine if the link is external
    const isExternal = href.startsWith("http") || href.startsWith("mailto:");

    // Default styles for links, unless unstyled is true
    const linkStyles = unstyled 
      ? className 
      : cn(
          "font-inter text-newsBlue hover:underline transition-colors",
          className
        );

    // If external, render a regular anchor tag
    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          className={linkStyles}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }

    // Otherwise, use the Wouter Link component
    return (
      <WouterLink href={href}>
        <a
          ref={ref}
          className={linkStyles}
          {...props}
        >
          {children}
        </a>
      </WouterLink>
    );
  }
);

Link.displayName = "Link";

export { Link };