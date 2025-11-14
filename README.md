# Short Link

A modern, secure URL shortener built with SvelteKit. Create short, memorable links with built-in safety checks, analytics, and QR code generation.

## Tech Stack

- **Framework**: SvelteKit 5
- **Database**: PostgreSQL (via Prisma)
- **Cache**: Redis
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance (optional, for caching)
  (docker-compose included to easily host for dev)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/thewander02/shortlink
cd shortlink
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

Required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `KV_REST_API_URL` - Redis REST API URL (optional)
- `KV_REST_API_TOKEN` - Redis REST API token (optional)
- `ADMIN_SECRET_KEY` - Secret key for admin access
- `PUBLIC_LINK_URL` - Base URL for shortened links (e.g., `https://l.example.com`)

4. Set up the database:

```bash
npx prisma migrate dev
```

5. Start the development server:

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Run TypeScript checks
- `npm run lint` - Lint code
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── lib/
│   ├── actions/      # Server actions (links, admin, appeals)
│   ├── components/   # Svelte components
│   ├── utils/        # Utility functions
│   └── constants.ts  # Application constants
├── routes/           # SvelteKit routes
└── hooks.server.ts   # Server hooks (rate limiting, IP blocking)
```

## License

MIT
