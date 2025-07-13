-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  balance numeric default 0 not null,
  created_at timestamptz default now()
);

-- Offers table
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  daily_profit numeric default 0 not null,
  monthly_profit numeric default 0 not null,
  created_at timestamptz default now()
);

-- User-Offers join table
create table if not exists user_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  offer_id uuid references offers(id) on delete cascade,
  joined_at timestamptz default now(),
  active boolean default true,
  unique(user_id, offer_id)
);

-- Transactions table
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  offer_id uuid references offers(id) on delete set null,
  type text not null, -- e.g. 'daily_profit', 'monthly_profit', 'withdrawal', etc.
  amount numeric not null,
  description text,
  created_at timestamptz default now()
);

-- Postgres function for atomic balance update
create or replace function increment_user_balance(user_id uuid, amount numeric)
returns void as $$
begin
  update users set balance = balance + amount where id = user_id;
end;
$$ language plpgsql; 