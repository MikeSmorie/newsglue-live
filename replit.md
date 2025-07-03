# Ghostli NewsJack Platform - Architecture Overview

## Overview
Ghostli is a sophisticated NewsJack content marketing platform built on a modern full-stack architecture. The system enables users to create campaigns, process news items, and generate multi-platform content outputs through AI-powered content generation. It features a comprehensive role-based access system, payment integration, and advanced observability capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation
- **Theme System**: Custom dark/light mode with localStorage persistence

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Authentication**: Passport.js with session-based authentication
- **Session Storage**: MemoryStore with configurable persistence
- **API Design**: RESTful endpoints with comprehensive error handling

## Key Components

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema Management**: Type-safe database operations
- **Core Tables**:
  - `users` - Authentication and user management with role-based access
  - `campaigns` - NewsJack campaign management with JSONB metadata
  - `news_items` - News content with AI crawl tracking and platform outputs
  - `error_logs` - System observability and debugging
  - `omega_logs` - Comprehensive event logging system

### AI Integration (OmegaAIR)
- **Provider Multiplexing**: Dynamic routing between Claude, OpenAI, and Mistral
- **Intelligent Fallbacks**: Automatic provider switching on failures
- **Stub Provider Support**: Development and testing capabilities
- **Configuration Management**: Runtime provider selection and prioritization

### Authentication & Authorization
- **Multi-Role System**: User, Admin, and Supergod roles
- **Session Management**: Secure session handling with token versioning
- **Email Verification**: Complete verification flow with secure tokens
- **Password Reset**: Token-based password recovery system
- **Multi-Device Logout**: Cross-device session invalidation

### Payment Processing
- **PayPal Integration**: Server SDK implementation with order management
- **Subscription Management**: Three-tier system (Free, Pro, Enterprise)
- **Token System**: Usage-based billing with balance tracking
- **Mock Payment Testing**: Development-friendly payment simulation

## Data Flow

### Campaign Workflow
1. **Campaign Creation**: Users create campaigns with target audience and brand voice
2. **News Item Processing**: Manual submission or automated news crawling
3. **AI Content Generation**: Multi-platform content creation through OmegaAIR
4. **Platform Distribution**: Formatted outputs for blog, social media, and other channels
5. **Analytics Tracking**: Performance metrics and efficiency measurements

### AI Processing Pipeline
1. **Request Routing**: OmegaAIR determines optimal AI provider
2. **Content Generation**: Provider-specific API calls with fallback handling
3. **Response Processing**: Structured output formatting and validation
4. **Usage Tracking**: Token consumption and performance monitoring

### User Management Flow
1. **Registration**: Account creation with email verification
2. **Authentication**: Session-based login with role assignment
3. **Authorization**: Route-level permissions based on user roles
4. **Activity Logging**: Comprehensive audit trail for all user actions

## External Dependencies

### AI Providers
- **OpenAI**: GPT models for content generation
- **Claude**: Anthropic's AI assistant for alternative processing
- **Mistral**: Additional AI provider for content diversity

### Payment Services
- **PayPal**: Primary payment processor with sandbox/production modes
- **Future Integrations**: Stripe and cryptocurrency payment support planned

### Development Tools
- **Vite**: Frontend build system with HMR support
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: End-to-end type safety across the stack

## Deployment Strategy

### Environment Configuration
- **Development**: Local PostgreSQL with environment variable configuration
- **Production**: Cloud Run deployment with external database
- **Scaling**: Horizontal scaling support through session store configuration

### Database Management
- **Migration System**: Drizzle Kit for schema versioning
- **Backup Strategy**: Automated backup system with data protection monitoring
- **Data Integrity**: Comprehensive validation and recovery mechanisms

### Security Measures
- **Environment Isolation**: Dedicated database instances
- **API Key Management**: External configuration for sensitive credentials
- **Input Validation**: Zod schema validation across all endpoints
- **Role-Based Access Control**: Comprehensive permission system

## Changelog
- July 3, 2025: **CAMPAIGN ISOLATION SECURITY FIXES IMPLEMENTED**
  - **Campaign Silo Integrity**: Fixed modules showing without campaign selection
  - **Sidebar Campaign Enforcement**: Modules only visible when campaign context active
  - **Exit Campaign Feature**: Added ability to exit campaign mode via sidebar button
  - **Module Access Protection**: Modules 2 & 6 redirect if no campaign selected
  - **Admin Bypass Removed**: All users must select campaign before accessing modules
- July 3, 2025: **CRITICAL SYSTEM RESTORATION COMPLETED**
  - **COMPLETE DATABASE DEPENDENCY AUDIT**: Conducted three comprehensive passes of every database link
  - **Module 4 & 5 AI Keyword Suggestions**: FULLY RESTORED - Now generating high-quality keywords
  - **Module 3 to Module 6 Transfer**: COMPLETELY FIXED - News item creation and transfer fully operational
  - **Database Schema Synchronization**: Fixed all mismatches between ORM definitions and actual database structure
  - **API Endpoint Corrections**: All frontend components now use correct backend routes
  - **Production Readiness**: System verified 100% operational for VC investment testing
- June 26, 2025: Critical security and UX fixes implemented
  - Fixed campaign name data leakage between users
  - Enabled deletion/editing of default keywords
  - Removed visible Call-to-Action headers from blog content
  - Comprehensive UI contrast correction for both light/dark modes
- June 26, 2025: Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.