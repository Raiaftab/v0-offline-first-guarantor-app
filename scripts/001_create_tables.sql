-- Create profiles table for user metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

-- Policies for profiles table
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admins can update all profiles"
  on public.profiles for update
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Create guarantor_records table
create table if not exists public.guarantor_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text,
  client_name text,
  co_name text not null,
  branch text,
  phone_number text,
  address text,
  cnic text,
  account_number text,
  disbursement_date text,
  due_date text,
  amount text,
  status text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.guarantor_records enable row level security;

-- Policies for guarantor_records
create policy "Users can view their own records"
  on public.guarantor_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own records"
  on public.guarantor_records for insert
  with check (auth.uid() = user_id);

create policy "Admins can view all records"
  on public.guarantor_records for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- Create indexes for faster queries
create index if not exists idx_guarantor_records_user_id on public.guarantor_records(user_id);
create index if not exists idx_guarantor_records_co_name on public.guarantor_records(co_name);
create index if not exists idx_profiles_username on public.profiles(username);
