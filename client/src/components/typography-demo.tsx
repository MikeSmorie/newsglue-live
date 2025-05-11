import React from 'react';

export function TypographyDemo() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1>Omega 7 Typography Demo</h1>
      <p className="mb-6">
        This component demonstrates the updated typography settings for Omega 7 UI.
        Notice how headings, subheadings, and body text are visually distinct and organized.
      </p>

      <div className="mt-8">
        <h2>Main Headings (h1, h2, h3)</h2>
        <p className="mb-4">
          Main headings use Poppins font with bold weight and NewsBlue color (#007BFF).
          They have a larger margin at the bottom to create separation from content.
        </p>
        <div className="border p-4 rounded-md mb-8">
          <h1>Heading 1 (2.5rem)</h1>
          <h2>Heading 2 (2rem)</h2>
          <h3>Heading 3 (1.75rem)</h3>
        </div>
      </div>

      <div className="mt-8">
        <h2>Subheadings (h4, h5, h6)</h2>
        <p className="mb-4">
          Subheadings also use Poppins font but with semi-bold weight and Glue Charcoal color (#1A1A1A).
          They have a smaller margin at the bottom.
        </p>
        <div className="border p-4 rounded-md mb-8">
          <h4>Subheading 4 (1.5rem)</h4>
          <h5>Subheading 5 (1.25rem)</h5>
          <h6>Subheading 6 (1rem)</h6>
        </div>
      </div>

      <div className="mt-8">
        <h2>Body Text</h2>
        <p className="mb-4">
          Body text uses Inter font with normal weight and Glue Charcoal color (#1A1A1A).
          It has a consistent line height and margin bottom.
        </p>
        <div className="border p-4 rounded-md mb-8">
          <p>
            This is an example of body text using Inter font with normal weight. The text color is Glue Charcoal (#1A1A1A) which provides excellent readability. The line height is set to 1.6 to ensure proper spacing between lines of text.
          </p>
          <p>
            Multiple paragraphs maintain consistent spacing with a margin-bottom of 1rem, creating a clear visual separation between content blocks while maintaining a cohesive look and feel.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h2>Text Sample with Mixed Elements</h2>
        <div className="border p-4 rounded-md">
          <h3>Security Intelligence Dashboard</h3>
          <p>
            The Security Intelligence Dashboard provides a comprehensive overview of your system's security status, with real-time threat detection and intelligent monitoring.
          </p>
          <h4>Key Features</h4>
          <p>
            Our advanced error tracking system logs all security events and potential threats, providing you with actionable insights to protect your infrastructure.
          </p>
          <h5>Administrator Controls</h5>
          <p>
            Powerful administrative tools allow you to manage user access, configure security settings, and respond quickly to emerging threats.
          </p>
        </div>
      </div>
    </div>
  );
}