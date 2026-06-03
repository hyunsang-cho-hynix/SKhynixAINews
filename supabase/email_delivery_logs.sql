create table if not exists email_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  success boolean not null default false,
  articles_sent integer not null default 0,
  language_preference text,
  topics_requested text[] not null default '{}',
  error text,
  sent_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists email_delivery_logs_sent_date_idx
  on email_delivery_logs (sent_date desc);

create index if not exists email_delivery_logs_email_idx
  on email_delivery_logs (email);
