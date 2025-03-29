# ACPL (Agent-Commerce-Protocol Lite)

A lite demo to demonstrate ACP (Agent-Commerce-Protocol), previously known as Echonade.

## Prerequisites

- Node
- pnpm

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up the database:
```bash
pnpm db:reset
```

3. Start the development servers:
```bash
pnpm dev
```

This will start both the simulation and dashboard applications in development mode.

## Available Scripts

- `pnpm dev` - Start development servers
- `pnpm build` - Build all applications
- `pnpm lint` - Run linting
- `pnpm format` - Format code with Prettier
- `pnpm check-types` - Check TypeScript types
- `pnpm db:reset` - Reset database
- `pnpm db:reset:hard` - Hard reset database

## Project Structure

- `apps/simulation` - LTE network simulation application
- `apps/dashboard` - Dashboard for visualizing simulation data
- `packages/` - Shared packages and utilities
