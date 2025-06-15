# Omega-V8.3 ✅

A comprehensive web development platform with advanced AI-assisted coding capabilities, designed for flexible and secure application building with enhanced payment and subscription management.

## What Omega-V8.3 Does

Omega-V8.3 is a full-stack web application platform featuring:

- **Multi-Role Authentication System**: User, Admin, and Supergod roles with tier-based access control
- **Hybrid Billing System**: Subscription-based billing combined with token-based usage tracking
- **Executive Access Bypass**: Admin and Supergod roles bypass all trial and subscription restrictions
- **PayPal Payment Integration**: Secure payment processing with PayPal Checkout
- **AI-Powered Code Assistant**: OpenAI integration for intelligent development support
- **Modular Architecture**: Extensible module system for custom functionality
- **Comprehensive Observability**: Advanced logging, error tracking, and audit trails
- **Trial Management**: 14-day trial system for new users with automatic expiration
- **Responsive UI**: Modern React interface with dark/light theme support

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session management
- **Payments**: PayPal Server SDK
- **AI Integration**: OpenAI API
- **Build Tools**: Vite, ESBuild

## Quick Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- PayPal Developer Account (for payments)
- OpenAI API key (for AI features)

### Installation

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd omega-v8.3
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   npm run db:push
   ```

4. **Start Development**
   ```bash
   npm run dev
   ```

5. **Access Application**
   - Application: http://localhost:5000
   - Create your first admin account at `/register-admin`

## Environment Variables

Required environment variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `PAYPAL_CLIENT_ID`: PayPal application client ID
- `PAYPAL_CLIENT_SECRET`: PayPal application secret
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `REPL_ID`: Session secret key

## GitHub Best Practices for Forking

When forking Omega-V8.3:

1. **Fork Strategy**: Use GitHub's fork feature to create your own copy
2. **Branch Management**: Create feature branches from `main`
3. **Environment Security**: Never commit `.env` files with real credentials
4. **Customization**: Modify `theme.json` for branding, extend modules in `/server/routes/modules.ts`
5. **Updates**: Regularly sync with upstream for security updates
6. **Documentation**: Update this README for your specific implementation

## Core Features

### Authentication & Roles
- **User**: Standard access with 14-day trial
- **Admin**: Unlimited access, user management, token administration
- **Supergod**: Full system control, admin management, configuration access

### Billing System
- **Subscriptions**: Monthly/annual plans with PayPal integration
- **Tokens**: Pay-per-use model for premium features
- **Executive Bypass**: Admin/Supergod roles skip all payment restrictions

### Module System
- Extensible architecture for custom functionality
- Tier-based access control
- Built-in audit and logging

## Documentation

For detailed technical specifications, see [/docs/Omega-Spec.md](./docs/Omega-Spec.md)

## Support

For issues and feature requests, please use GitHub Issues.

---

**Version**: Omega-V8.3 ✅  
**License**: MIT  
**Last Updated**: June 2025