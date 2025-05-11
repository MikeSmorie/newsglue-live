import React from 'react';
import { UserInput } from '@/components/ui/user-input';
import { GeneratedOutput } from '@/components/ui/generated-output';
import { Button } from '@/components/ui/button';
import { Link } from '@/components/ui/link';

export function InputOutputDemo() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1>Input & Output Visual Distinction</h1>
      <p className="mb-6">
        This component demonstrates the visual distinction between user input and generated output in the Omega 7 UI.
        Notice how each has a unique style to make it stand out from other content.
      </p>

      <div className="mt-8">
        <h2>User Input</h2>
        <p className="mb-4">
          User input areas use a light cloud white background (#F9FAFB) with a NewsBlue border (#007BFF)
          to clearly identify where users should enter information.
        </p>
        <UserInput>
          <h3 className="text-lg font-semibold mb-2">Security Query</h3>
          <p className="mb-3">Please analyze recent login attempts for suspicious activity.</p>
          <div className="flex justify-end">
            <Button size="sm">Submit Query</Button>
          </div>
        </UserInput>

        <h3 className="text-lg font-semibold mt-6 mb-2">Form Example</h3>
        <UserInput>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1">Username</label>
              <input 
                type="text" 
                id="username" 
                className="w-full p-2 border rounded-md" 
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label htmlFor="query" className="block text-sm font-medium mb-1">Query</label>
              <textarea 
                id="query" 
                className="w-full p-2 border rounded-md" 
                rows={4}
                placeholder="What would you like to analyze?"
              ></textarea>
            </div>
            <div className="flex justify-end">
              <Button>Submit</Button>
            </div>
          </div>
        </UserInput>
      </div>

      <div className="mt-8">
        <h2>Generated Output</h2>
        <p className="mb-4">
          Generated output areas use a light gray background (#E0E0E0) with a Glue Charcoal border (#1A1A1A)
          to clearly distinguish system-generated content from user input.
        </p>
        <GeneratedOutput>
          <h3 className="text-lg font-semibold mb-2">Security Analysis</h3>
          <p className="mb-3">Analysis of login attempts complete. Found 3 suspicious login attempts:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>IP: 192.168.1.45 - Unusual location (New York, USA)</li>
            <li>IP: 203.0.113.42 - Multiple failed attempts (5)</li>
            <li>IP: 198.51.100.23 - Login outside normal hours (3:42 AM)</li>
          </ul>
          <p className="mb-3">Recommended actions:</p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">Block IPs</Button>
            <Button size="sm">Enable 2FA</Button>
          </div>
        </GeneratedOutput>

        <h3 className="text-lg font-semibold mt-6 mb-2">Report Example</h3>
        <GeneratedOutput>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">System Health Report</h3>
              <span className="text-sm text-gray-600">Generated: May 11, 2025</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-green-100 rounded-md">
                <div className="font-semibold">CPU Usage</div>
                <div className="text-xl">24%</div>
                <div className="text-sm text-green-700">Normal</div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-md">
                <div className="font-semibold">Memory</div>
                <div className="text-xl">78%</div>
                <div className="text-sm text-yellow-700">Warning</div>
              </div>
              <div className="p-3 bg-green-100 rounded-md">
                <div className="font-semibold">Disk</div>
                <div className="text-xl">42%</div>
                <div className="text-sm text-green-700">Normal</div>
              </div>
            </div>
            <div>
              <p>The system is operating within normal parameters. Memory usage is approaching warning levels, consider optimizing resource-intensive processes.</p>
            </div>
            <div className="flex justify-end">
              <Link href="/mock-dashboard">View Full Report</Link>
            </div>
          </div>
        </GeneratedOutput>
      </div>

      <div className="mt-8">
        <h2>Input & Output Interaction</h2>
        <p className="mb-4">
          Here's an example showing how user input and generated output interact in a conversation flow.
        </p>
        <div className="space-y-6">
          <UserInput>
            <p>Show me the top security threats from the last 7 days.</p>
          </UserInput>
          
          <GeneratedOutput>
            <h3 className="text-lg font-semibold mb-2">Top Security Threats (Last 7 Days)</h3>
            <div className="space-y-3">
              <div className="p-3 bg-red-100 rounded-md">
                <div className="font-semibold">SQL Injection Attempts</div>
                <div className="text-sm">42 attempts detected, all blocked</div>
                <div className="text-xs">Last attempt: 6 hours ago</div>
              </div>
              <div className="p-3 bg-orange-100 rounded-md">
                <div className="font-semibold">Brute Force Login</div>
                <div className="text-sm">17 attempts detected, all blocked</div>
                <div className="text-xs">Last attempt: 2 days ago</div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-md">
                <div className="font-semibold">Unsecured API Endpoints</div>
                <div className="text-sm">3 endpoints need security updates</div>
                <div className="text-xs">Detected: 4 days ago</div>
              </div>
            </div>
          </GeneratedOutput>
          
          <UserInput>
            <p>Generate a report on the SQL injection attempts and send it to the security team.</p>
          </UserInput>
          
          <GeneratedOutput>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="font-semibold">Report generated and sent to security@example.com</p>
            </div>
            <p className="mb-3">Report Summary:</p>
            <ul className="list-disc pl-5 mb-4">
              <li>42 SQL injection attempts over 7 days</li>
              <li>Primary target: user authentication API</li>
              <li>Source IPs: 12 unique addresses</li>
              <li>All attempts were blocked by WAF</li>
            </ul>
            <div className="flex gap-3">
              <Button size="sm">View Full Report</Button>
              <Button variant="outline" size="sm">Configure Alerts</Button>
            </div>
          </GeneratedOutput>
        </div>
      </div>
    </div>
  );
}