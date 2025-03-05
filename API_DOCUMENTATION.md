# Omega API Documentation

## Authentication Endpoints

### POST /api/login
Authenticates a user and creates a session.
```typescript
Request:
{
  username: string;
  password: string;
}

Response:
{
  id: number;
  username: string;
  role: "user" | "admin";
  email?: string;
}
```

### POST /api/logout
Ends the current user session.
```typescript
Response: 200 OK
```

### GET /api/user
Returns the current authenticated user's information.
```typescript
Response:
{
  id: number;
  username: string;
  role: "user" | "admin";
  email?: string;
  createdAt: string;
  lastLogin: string;
}
```

## Error Logging Endpoints

### GET /api/admin/logs
Returns system error logs (admin only).
```typescript
Response:
{
  id: number;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  source: string;
  stackTrace?: string;
  resolved: boolean;
}[]
```

### POST /api/admin/logs/clear
Clears all system logs (admin only).
```typescript
Response:
{
  message: string;
}
```

## Communication Endpoints

### GET /api/messages
Retrieves all announcements.
```typescript
Response:
{
  id: number;
  title: string;
  content: string;
  createdAt: string;
}[]
```

### POST /api/messages
Creates a new announcement (admin only).
```typescript
Request:
{
  title: string;
  content: string;
}

Response: 200 OK
```

## Environment Variables

Required environment variables for the application:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=yourpassword
PGDATABASE=omega

# Session Configuration
SESSION_SECRET=your-session-secret

# API Keys (if needed)
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=your-stripe-key

# Application Configuration
NODE_ENV=development|production
PORT=5000
```

## Error Codes

Common error responses:

- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Not authenticated
- `403`: Forbidden - Not authorized
- `404`: Not Found - Resource doesn't exist
- `500`: Internal Server Error - Server-side error

## Rate Limiting

The API implements rate limiting:
- 100 requests per minute for authenticated users
- 30 requests per minute for unauthenticated users

## Websocket Events

Real-time events for system monitoring:

```typescript
// Error log events
interface ErrorLogEvent {
  type: "error_log";
  data: {
    id: number;
    level: "INFO" | "WARNING" | "ERROR";
    message: string;
    timestamp: string;
  };
}

// System status events
interface SystemStatusEvent {
  type: "system_status";
  data: {
    cpu: number;
    memory: number;
    timestamp: string;
  };
}
```

## Database Schema Types

Core types used throughout the API:

```typescript
interface User {
  id: number;
  username: string;
  role: "user" | "admin";
  email?: string;
  createdAt: string;
  lastLogin: string;
}

interface ErrorLog {
  id: number;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
  source: string;
  stackTrace?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: number;
}

interface Message {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}
```

## Testing

Example test cases for API endpoints:

```typescript
// Authentication tests
test("POST /api/login - successful login")
test("POST /api/login - invalid credentials")
test("GET /api/user - authenticated user")
test("GET /api/user - unauthenticated access")

// Error logging tests
test("GET /api/admin/logs - admin access")
test("GET /api/admin/logs - unauthorized access")
test("POST /api/admin/logs/clear - admin access")
```
