# Omega-8-Clean-Core

A modular SaaS starter with 10 functional silos, secure session authentication, mock PayPal + Stablecoin integration, and sandbox 2FA scaffold. Built on the Omega framework.

## Features

### 🔐 Authentication & Security
- Secure session-based authentication with Passport.js
- Role-based access control (User, Admin, Supergod)
- Two-factor authentication scaffold (TOTP/SMS ready)
- Protected routes with middleware validation

### 💳 Subscription Management
- Three-tier subscription system (Free, Pro, Enterprise)
- Mock PayPal payment integration ready for live SDK
- Stablecoin wallet address management
- Admin subscription monitoring dashboard

### 🎨 Modern UI/UX
- Responsive design with Tailwind CSS and shadcn/ui
- Light/dark mode with WCAG AA+ accessibility compliance
- Persistent header/sidebar navigation
- Professional SaaS-grade interface

### 📦 Modular Architecture
- 10 sealed functional module containers
- Dev-assigned component system
- Read-only user access with clear boundaries
- Extensible module framework

### 🛠️ Developer Tools
- TypeScript throughout frontend and backend
- PostgreSQL with Drizzle ORM
- Real-time query invalidation with TanStack Query
- Comprehensive error handling and logging

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd omega-8-clean-core
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Configure your DATABASE_URL and other settings
```

4. Initialize the database:
```bash
npm run db:push
```

5. Start development servers:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Scripts

- `npm run dev` - Start both client and server in development mode
- `npm run dev:server` - Start only the backend server
- `npm run dev:client` - Start only the frontend client
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run start` - Start production server

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility functions
├── server/                 # Express backend
│   ├── routes/             # API route handlers
│   ├── middleware/         # Express middleware
│   └── auth.ts             # Authentication setup
├── db/                     # Database schema and config
│   ├── schema.ts           # Drizzle schema definitions
│   └── index.ts            # Database connection
└── package.json
```

## Configuration

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/omega8
IS_SANDBOX=true
NODE_ENV=development
```

### Database Setup

The application uses PostgreSQL with Drizzle ORM. Run migrations with:

```bash
npm run db:push
```

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/user` - Get current user

### Subscriptions
- `GET /api/subscription/current-plan` - Get user's current plan
- `POST /api/subscription/change` - Request plan change
- `GET /api/admin/subscriptions` - Admin: View all subscriptions

### Two-Factor Authentication
- `GET /api/2fa/status` - Get 2FA status
- `POST /api/2fa/enable` - Enable 2FA
- `POST /api/2fa/disable` - Disable 2FA

## Deployment

### Production Build

1. Build the application:
```bash
npm run build
```

2. Set production environment variables

3. Start the production server:
```bash
npm run start
```

### Environment Setup

Ensure these environment variables are set in production:
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV=production`
- `IS_SANDBOX=false` (for live payments)

## Development

### Adding New Features

1. **Frontend Components**: Add to `client/src/components/`
2. **API Routes**: Add to `server/routes/`
3. **Database Changes**: Update `db/schema.ts` and run `npm run db:push`
4. **Pages**: Add to `client/src/pages/` and register in `App.tsx`

### Module System

Modules are sealed containers managed by system developers. Each module:
- Has a reserved content area at `/module/[1-10]`
- Shows read-only access to users
- Awaits developer assignment for functionality

## Technology Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- shadcn/ui component library
- Wouter for routing
- TanStack Query for state management

### Backend
- Express.js with TypeScript
- Passport.js for authentication
- Drizzle ORM for database operations
- PostgreSQL database

### Development Tools
- Vite for frontend tooling
- tsx for TypeScript execution
- ESLint and Prettier for code quality

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the documentation in this README
- Review the API documentation in `API_DOCUMENTATION.md`
- Open an issue for bug reports or feature requests

---

**Omega-8-Clean-Core v1.0.0** - Built with the Omega framework for scalable SaaS applications.