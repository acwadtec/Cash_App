CREATE TABLE deposit_numbers (id serial PRIMARY KEY, number text NOT NULL, created_at timestamp with time zone DEFAULT timezone('utc', now()));
