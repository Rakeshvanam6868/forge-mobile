alter table public.users add column program_start_date date;

create table public.plan_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) not null,
    program_day int not null,
    log_date date not null,
    energy int,
    status text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, log_date)
);

alter table public.plan_logs enable row level security;
create policy "Users can modify their own plan_logs" on public.plan_logs for all using (auth.uid() = user_id);
