# Cash App (Frontend Demo)

A modern React + Vite + TypeScript web app for managing user deposits, withdrawals, and admin operations. This project is a **frontend-only mock/demo** and does not include a backend or real authentication.

## Features

### User Panel
- Register, login, and view profile (mocked)
- Deposit Money: 
  - See a randomly selected official deposit number (set by admin)
  - Enter deposit amount, your mobile number, and upload a transfer screenshot
  - Submit deposit requests (status: pending/approved/rejected)
- View deposit request status/history
- Withdraw money (mocked)

### Admin Panel
- Manage up to 10 official deposit numbers (add, edit, remove)
- View and process deposit requests (approve/reject, see details)
- Manage users, offers, withdrawals, and notifications (mocked)

## Tech Stack
- React 18 + Vite
- TypeScript
- Tailwind CSS
- LocalStorage for mock/demo data (no backend)

## Limitations
- **No real backend:** All data is stored in browser localStorage for demo purposes only.
- **No real authentication:** User/admin flows are simulated.
- **No real balance updates:** All business logic (like updating balances) should be handled by a backend in production.
- **File uploads:** Screenshots are stored as base64 in localStorage (for demo only).

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Run the app:**
   ```bash
   npm run dev
   ```
3. **Open in browser:**
   Visit [http://localhost:5173](http://localhost:5173)

## Project Structure

- `src/pages/Deposit.tsx` — User deposit form and logic
- `src/pages/AdminDashboard.tsx` — Admin panel for managing deposit numbers and requests
- `src/components/Navigation.tsx` — Main navigation
- `src/contexts/LanguageContext.tsx` — i18n and translations

## How Deposits Work (Demo)
- Admin adds up to 10 official deposit numbers
- User sees a random number, fills the deposit form, and uploads a screenshot
- Admin reviews requests and approves/rejects (status only, no real balance update)
- All data is stored in localStorage for demo

## Production Notes
- Replace all localStorage logic with real API calls
- Move all business logic (balances, approvals, etc.) to the backend
- Add real authentication and security

## Settings Table

The `settings` table is used to store application-wide configuration values, such as withdrawal time slots and package withdrawal limits. This allows you to change business rules without redeploying code.

### How to Create the Table

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
```

### Recommended RLS Policies

Enable RLS on the table:

```sql
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
```

Allow all authenticated users to read settings:

```sql
CREATE POLICY "Allow all authenticated users to read settings"
ON settings
FOR SELECT
USING (
  auth.role() = 'authenticated'
);
```

Allow only admins to update/insert/delete settings (if you have an `admins` table):

```sql
CREATE POLICY "Allow only admins to update settings"
ON settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()
  )
);

CREATE POLICY "Allow only admins to insert settings"
ON settings
FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()
  )
);

CREATE POLICY "Allow only admins to delete settings"
ON settings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM admins WHERE admins.user_uid = auth.uid()
  )
);
```

---

**This project is for demo/prototyping only. Do not use as-is in production.**
