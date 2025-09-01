# Invoice Generator

A modern billing solution that integrates real-time invoicing, digital payments, and automated accounting entries into core finance systems (Tally, Zoho).

## Features

- Customer, Item, and Rate master management
- Invoice creation with QR code payment
- Real-time payment tracking
- Integration with Tally and Zoho Books
- Real-time data sync with Supabase
- Desktop application with Electron

## Tech Stack

- Frontend: Electron + React + TypeScript
- Build Tool: Vite
- Package Manager: pnpm
- Database: Supabase (PostgreSQL)
- Styling: Tailwind CSS
- Accounting Integrations:
  - Tally (ODBC / Prime API)
  - Zoho Books API

## Prerequisites

- Node.js (v16 or higher)
- pnpm (install with `npm install -g pnpm`)

## Setup Instructions

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   Create a `.env` file with:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_key
   RAZORPAY_KEY_ID=your_razorpay_key
   RAZORPAY_SECRET=your_razorpay_secret
   ZOHO_CLIENT_ID=your_zoho_client_id
   ZOHO_CLIENT_SECRET=your_zoho_client_secret
   ```

3. Development modes:

   **Web Development (Vite dev server):**
   ```bash
   pnpm dev
   ```

   **Electron Development (with hot reload):**
   ```bash
   pnpm electron:dev
   ```

   **Electron Standalone:**
   ```bash
   pnpm start
   ```

4. Build for production:

   **Web Build:**
   ```bash
   pnpm build
   ```

   **Electron Build:**
   ```bash
   pnpm electron:build
   ```

## Project Structure

```
invoice-generator/
├── src/
│   ├── components/     # React components
│   │   ├── common/     # Shared UI components
│   │   ├── dashboard/  # Dashboard components
│   │   ├── invoice/    # Invoice-related components
│   │   ├── sync/       # Sync status components
│   │   ├── tally/      # Tally integration components
│   │   └── zoho/       # Zoho integration components
│   ├── pages/          # Page components
│   ├── services/       # API integrations
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Database and utility libraries
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Helper functions
├── supabase/           # Database migrations
├── main.js             # Electron main process
├── index.html          # Entry HTML
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Dependencies and scripts
```

## Available Scripts

- `pnpm dev` - Start Vite development server
- `pnpm build` - Build for web production
- `pnpm start` - Start Electron app
- `pnpm electron:dev` - Start Electron with Vite dev server
- `pnpm electron:build` - Build Electron app for distribution
