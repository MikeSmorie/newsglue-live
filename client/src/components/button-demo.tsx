import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';

export function ButtonDemo() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1>Omega 7 Navigation UI Demo</h1>
      <p className="mb-6">
        This component demonstrates the updated button and link styles for improved navigation in Omega 7 UI.
        Notice how buttons and links are now clear, consistent, and easy to identify.
      </p>

      <div className="mt-8">
        <h2>Button Styles</h2>
        <p className="mb-4">
          Buttons now use Inter font with bold weight, consistent padding, and clear hover states.
          The primary color is NewsBlue (#007BFF) for visual clarity.
        </p>
        <div className="border p-6 rounded-md mb-8 grid gap-6">
          <div className="flex flex-wrap gap-4">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="link">Link Button</Button>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button size="lg">Large Button</Button>
            <Button>Default Button</Button>
            <Button size="sm">Small Button</Button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2>Link Styles</h2>
        <p className="mb-4">
          Links are now styled with Inter font, NewsBlue color (#007BFF), and clear hover underlines
          for better visibility and identification.
        </p>
        <div className="border p-6 rounded-md mb-8">
          <div className="space-y-4">
            <p>
              This is a paragraph with a <Link href="/typography">link to the Typography page</Link> embedded within text.
              Links are now more visible and recognize hover states for better accessibility.
            </p>
            <p>
              <Link href="https://example.com">External links</Link> are also styled consistently but will open in a new tab.
            </p>
            <div className="flex gap-6 mt-4">
              <Link href="/typography">Typography Demo</Link>
              <Link href="/mock-dashboard">Dashboard Example</Link>
              <Link href="/subscription/plans">Subscription Plans</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2>Button and Link Combinations</h2>
        <p className="mb-4">
          Here's how buttons and links look when used together in UI components.
        </p>
        <div className="border p-6 rounded-md mb-8">
          <div className="flex flex-col gap-4">
            <div className="p-4 border rounded-md">
              <h3 className="mb-2">Security Alert</h3>
              <p className="mb-4">
                Your system has detected 3 potential security vulnerabilities. 
                <Link href="/mock-dashboard" className="ml-1">View details.</Link>
              </p>
              <div className="flex gap-3">
                <Button>Fix Now</Button>
                <Button variant="outline">Dismiss</Button>
              </div>
            </div>
            
            <div className="p-4 border rounded-md">
              <h3 className="mb-2">Subscription Upgrade</h3>
              <p className="mb-4">
                Upgrade your plan to access advanced security features.
              </p>
              <div className="flex gap-3">
                <Button>Upgrade Now</Button>
                <Link href="/subscription/plans">Compare Plans</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}