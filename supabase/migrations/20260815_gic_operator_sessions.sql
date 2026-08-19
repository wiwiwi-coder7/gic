create table if not exists gic.operator_config (
  identifier text primary key,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gic.operator_sessions (
  token_hash text primary key,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table gic.operator_config enable row level security;
alter table gic.operator_sessions enable row level security;
