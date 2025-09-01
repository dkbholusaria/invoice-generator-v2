# Invoice Generator

A modern billing solution that integrates real-time invoicing, digital payments, and automated accounting entries into core finance systems (Tally, Zoho).

## Features

- Customer, Item, and Rate master management
- Invoice creation with QR code payment
- Real-time payment tracking
- Integration with Tally and Zoho Books
- Digital payments via Razorpay
- Real-time data sync with Supabase

## Tech Stack

- Frontend: Electron + React
- Database: Supabase (PostgreSQL)
- Payments: Razorpay
- Accounting Integrations:
  - Tally (ODBC / Prime API)
  - Zoho Books API

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
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

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Project Structure

```
invoice-generator/
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── services/      # API integrations
│   ├── store/         # State management
│   └── utils/         # Helper functions
├── main.js            # Electron main process
├── index.html         # Entry HTML
└── package.json       # Dependencies
```
