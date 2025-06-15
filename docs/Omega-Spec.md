# Omega-V8.3 Technical Specification ✅

## Overview

Omega-V8.3 is a comprehensive web development platform with advanced payment processing, multi-role authentication, and AI-assisted development capabilities. This document provides technical specifications for developers working with or extending the platform.

## Architecture

### Frontend Structure
```
client/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── executive-privileges.tsx
│   │   ├── token-balance-display.tsx
│   │   └── trial-badge.tsx
│   ├── pages/              # Route components
│   │   ├── admin/          # Admin-only pages
│   │   ├── dashboard.tsx
│   │   └── auth/
│   ├── hooks/              # Custom React hooks
│   └── lib/                # Utilities and configurations
```

### Backend Structure
```
server/
├── auth.ts                 # Authentication & session management
├── routes.ts               # Main API route definitions
├── paypal.ts               # PayPal integration (DO NOT MODIFY)
├── ai_assistant/           # AI service implementation
├── routes/
│   ├── tokens.ts           # Token management API
│   ├── subscriptions.ts    # Subscription handling
│   └── webhook.ts          # Payment webhooks
└── middleware/
    └── tierAccess.ts       # Access control middleware
```

### Database Schema
```
db/
├── schema.ts               # Drizzle ORM schema definitions
└── index.ts               # Database connection
```

## Role System & Permissions

| Role | Trial Access | Subscription Required | Token Usage | Admin Tools | User Management | System Config |
|------|-------------|---------------------|-------------|-------------|----------------|--------------|
| **User** | ✅ 14-day trial | ✅ After trial | ✅ Pay-per-use | ❌ | ❌ | ❌ |
| **Admin** | ❌ Bypassed | ❌ Bypassed | ✅ Unlimited | ✅ | ✅ | ✅ Limited |
| **Supergod** | ❌ Bypassed | ❌ Bypassed | ✅ Unlimited | ✅ | ✅ | ✅ Full |

### Executive Access Bypass

Admin and Supergod roles have complete bypass of:
- Trial period restrictions
- Subscription requirements
- Payment verification
- Module access limitations
- Token consumption limits

Implementation: `server/middleware/tierAccess.ts`

## Billing System Architecture

### Hybrid Model: Subscription + Tokens

#### Subscription Tiers
- **Free**: Trial users (14 days)
- **Pro**: Monthly/annual subscription
- **Enterprise**: Custom pricing

#### Token System
- **Consumption**: Pay-per-use for premium features
- **Purchase**: Buy token packages via PayPal
- **Administration**: Admin/Supergod can gift tokens
- **Tracking**: Full audit trail in `tokens` table

### Payment Provider Integration

#### Current: PayPal
- **Client**: PayPal Checkout integration
- **Server**: PayPal Server SDK
- **Webhooks**: Real-time payment confirmation
- **Security**: Client/server token validation

#### Adding New Payment Providers

To integrate a new payment provider:

1. **Create Provider Service** (`server/providers/[provider].ts`)
   ```typescript
   export interface PaymentProvider {
     createOrder(amount: string, currency: string): Promise<OrderResponse>;
     captureOrder(orderId: string): Promise<CaptureResponse>;
     handleWebhook(payload: any): Promise<WebhookResponse>;
   }
   ```

2. **Update Database Schema** (`db/schema.ts`)
   ```typescript
   export const paymentProviders = pgTable("payment_providers", {
     id: serial("id").primaryKey(),
     name: text("name").notNull(), // "paypal", "stripe", etc.
     isActive: boolean("is_active").default(true),
     config: jsonb("config"), // Provider-specific configuration
   });
   ```

3. **Add Frontend Component** (`client/src/components/[Provider]Button.tsx`)
   - Follow PayPal button pattern
   - Implement provider-specific SDK integration

4. **Register Routes** (`server/routes.ts`)
   ```typescript
   app.post("/api/[provider]/order", async (req, res) => {
     // Provider-specific order creation
   });
   ```

5. **Update Environment** (`.env.example`)
   ```bash
   [PROVIDER]_CLIENT_ID="your-client-id"
   [PROVIDER]_CLIENT_SECRET="your-client-secret"
   ```

## Module System

### Module Interface
```typescript
export interface IModule {
  name: string;
  inputSchema: ZodSchema;
  outputSchema: ZodSchema;
  process(input: any): Promise<any>;
  tierRequired?: 'free' | 'pro' | 'enterprise';
  tokensRequired?: number;
}
```

### Access Control Flow
1. **Authentication Check**: User must be logged in
2. **Role Bypass**: Admin/Supergod skip all restrictions
3. **Subscription Check**: User must have active subscription or trial
4. **Token Verification**: Sufficient tokens for module execution
5. **Tier Access**: Module tier matches user subscription level

### Adding New Modules

1. **Define Module** (`server/routes/modules.ts`)
   ```typescript
   const newModule: IModule = {
     name: "custom-feature",
     inputSchema: z.object({ input: z.string() }),
     outputSchema: z.object({ output: z.string() }),
     tierRequired: 'pro',
     tokensRequired: 5,
     async process(input) {
       // Module logic
       return { output: "processed" };
     }
   };
   ```

2. **Register Module**
   ```typescript
   moduleManager.registerModule(newModule);
   ```

3. **Create Frontend Interface** (`client/src/pages/modules/`)
   - Use React Query for API calls
   - Implement loading states
   - Handle token consumption display

## Observability Layer

### Logging System (`lib/logs.ts`)

#### Event Types
- `login/logout`: Authentication events
- `subscription_change`: Billing updates
- `payment_attempt`: Transaction tracking
- `api_error`: System errors
- `user_action`: Feature usage
- `system_event`: Administrative actions

#### Usage Example
```typescript
import { logEvent } from '@/lib/logs';

await logEvent('user_action', 'Module executed successfully', {
  userId: user.id,
  userRole: user.role,
  endpoint: '/api/modules/run',
  metadata: { moduleName: 'ai-assistant', tokensUsed: 5 }
});
```

### Error Tracking
- **Automatic**: Express error middleware captures all API errors
- **Manual**: Use `logAPIError` for specific error handling
- **Frontend**: Error boundaries log client-side issues

### Audit Trail
- **User Actions**: All significant user activities logged
- **Admin Actions**: User management, token administration
- **System Changes**: Configuration updates, role modifications
- **Payment Events**: Subscription changes, token purchases

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/register-admin` - Admin registration (requires secret)
- `POST /api/register-supergod` - Supergod registration (requires secret)

### User Management (Admin/Supergod only)
- `GET /api/users` - List all users
- `POST /api/users/:id/role` - Update user role
- `DELETE /api/users/:id` - Delete user

### Subscriptions
- `GET /api/subscriptions` - User subscription status
- `POST /api/subscriptions/create` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription

### Tokens (Auth required)
- `GET /api/tokens/balance` - Get user token balance
- `POST /api/tokens/purchase` - Purchase tokens
- `POST /api/tokens/gift` - Gift tokens (Admin/Supergod only)
- `GET /api/tokens/history` - Token transaction history

### PayPal Integration
- `GET /paypal/setup` - Get client token
- `POST /paypal/order` - Create PayPal order
- `POST /paypal/order/:orderID/capture` - Capture PayPal payment

### Modules
- `GET /api/modules` - List available modules
- `POST /api/modules/run` - Execute module

### AI Assistant (Auth required)
- `POST /api/ai/query` - Send query to AI assistant
- `POST /api/ai/feedback` - Submit feedback on AI response

## Security Considerations

### Authentication
- **Sessions**: Express-session with secure cookies
- **Password Hashing**: bcrypt with salt rounds
- **CSRF Protection**: Built into session management
- **Rate Limiting**: Implemented on sensitive endpoints

### Authorization
- **Role-Based Access**: Middleware enforces role requirements
- **Executive Bypass**: Admin/Supergod skip subscription checks
- **Token Validation**: Server-side token balance verification

### Payment Security
- **PayPal**: Official SDK with webhook verification
- **Token Validation**: Server-side order verification
- **PCI Compliance**: No card data stored locally

### Data Protection
- **Environment Variables**: Sensitive data in environment files
- **Database**: PostgreSQL with connection pooling
- **Logging**: No sensitive data in logs
- **Error Handling**: Generic error messages to clients

## Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Consistent code formatting
- **Prettier**: Automatic code formatting

### Database Changes
- **Migrations**: Use `npm run db:push` for schema changes
- **Never**: Manually write SQL migrations
- **Always**: Update schema.ts and push changes

### Testing Strategy
- **Frontend**: React Testing Library
- **Backend**: Jest with supertest
- **Integration**: Test complete user flows
- **Payment**: Use PayPal sandbox environment

### Deployment
- **Environment**: Production builds with optimizations
- **Database**: Ensure production database connectivity
- **Environment Variables**: Set all required secrets
- **Health Checks**: Monitor application status

## Version History

- **V8.3**: Executive access bypass, hybrid billing, PayPal integration
- **V8.2**: Token system implementation
- **V8.1**: Multi-role authentication
- **V8.0**: Initial modular architecture

---

**Document Version**: Omega-V8.3 ✅  
**Last Updated**: June 2025  
**Next Review**: Q3 2025