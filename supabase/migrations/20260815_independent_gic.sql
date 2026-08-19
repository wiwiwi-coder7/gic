create schema if not exists gic;
create extension if not exists pgcrypto;

create table if not exists gic.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  role text not null default 'user' check (role in ('owner','admin','user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gic.projects (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  title text not null check (char_length(title) between 4 and 255),
  description text not null check (char_length(description) between 12 and 20000),
  client_name text,
  client_email text,
  source text not null default 'manual',
  budget_cents integer not null default 0 check (budget_cents >= 0),
  currency text not null default 'USD',
  deadline_at timestamptz,
  status text not null default 'OPPORTUNITY',
  phase text not null default 'INTAKE',
  risk_level text not null default 'medium' check (risk_level in ('low','medium','high','critical')),
  match_score integer,
  completion_percent integer not null default 0 check (completion_percent between 0 and 100),
  estimated_hours integer,
  actual_hours integer not null default 0,
  created_by uuid not null references gic.users(id),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gic_projects_status_idx on gic.projects(status, updated_at desc);
create index if not exists gic_projects_owner_idx on gic.projects(created_by);

create table if not exists gic.project_tasks (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references gic.projects(id) on delete cascade,
  parent_task_id uuid references gic.project_tasks(id) on delete set null,
  title text not null,
  description text not null,
  assigned_role text not null,
  status text not null default 'queued',
  priority integer not null default 3 check (priority between 1 and 5),
  attempt_count integer not null default 0,
  max_attempts integer not null default 2,
  input_json jsonb,
  output_json jsonb,
  feedback text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists gic_tasks_project_status_idx on gic.project_tasks(project_id, status);

create table if not exists gic.approval_gates (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references gic.projects(id) on delete cascade,
  gate_type text not null,
  status text not null default 'pending' check (status in ('pending','resolved','expired','cancelled')),
  title text not null,
  summary text not null,
  context_json jsonb not null default '{}'::jsonb,
  requested_by_role text not null,
  resolution_action text check (resolution_action in ('approve','reject','request-changes')),
  resolved_by uuid references gic.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gic_approval_pending_idx on gic.approval_gates(status, created_at desc);

create table if not exists gic.approval_decisions (
  id uuid primary key default gen_random_uuid(),
  approval_gate_id uuid not null references gic.approval_gates(id) on delete cascade,
  action text not null check (action in ('approve','reject','request-changes')),
  feedback text,
  decided_by uuid not null references gic.users(id),
  created_at timestamptz not null default now()
);

create table if not exists gic.agent_runs (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references gic.projects(id) on delete cascade,
  task_id uuid references gic.project_tasks(id) on delete set null,
  role text not null,
  provider text,
  model_name text,
  status text not null default 'queued' check (status in ('queued','running','waiting_for_approval','completed','failed','cancelled')),
  input_summary text,
  output_summary text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists gic_agent_runs_project_idx on gic.agent_runs(project_id, created_at desc);

create table if not exists gic.project_events (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references gic.projects(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  actor_type text not null,
  actor_role text,
  actor_user_id uuid references gic.users(id) on delete set null,
  title text not null,
  detail text not null,
  metadata_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists gic_project_events_project_idx on gic.project_events(project_id, created_at desc);

create table if not exists gic.notifications (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid references gic.projects(id) on delete cascade,
  recipient_id uuid references gic.users(id) on delete cascade,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  status text not null default 'unread' check (status in ('unread','read','archived')),
  title text not null,
  body text not null,
  action_url text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists gic_notifications_recipient_idx on gic.notifications(recipient_id, status, created_at desc);

create table if not exists gic.site_profiles (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  owner_id uuid not null references gic.users(id) on delete cascade,
  name text not null,
  base_url text not null,
  connection_mode text not null default 'hybrid' check (connection_mode in ('api','browser','hybrid')),
  allowed_paths jsonb not null default '[]'::jsonb,
  api_secret_reference text,
  browser_session_label text,
  status text not null default 'draft' check (status in ('draft','active','paused','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gic.web_actions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  project_id uuid not null references gic.projects(id) on delete cascade,
  site_profile_id uuid not null references gic.site_profiles(id) on delete cascade,
  agent_run_id uuid references gic.agent_runs(id) on delete set null,
  action_type text not null check (action_type in ('read','fill_draft','prepare_message','submit')),
  status text not null default 'draft' check (status in ('draft','awaiting_approval','approved','running','succeeded','failed','blocked','completed','cancelled')),
  target_url text not null,
  payload_redacted jsonb not null default '{}'::jsonb,
  result_redacted jsonb,
  approval_gate_id uuid references gic.approval_gates(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gic.provider_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_name text not null,
  tier text not null default 'standard',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(provider, model_name)
);

create table if not exists gic.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  label text not null,
  ciphertext text not null,
  iv text not null,
  algorithm text not null default 'AES-GCM',
  last_four text,
  updated_by uuid references gic.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gic.telegram_pairings (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid not null references gic.users(id) on delete cascade,
  chat_id text unique,
  display_name text,
  role_snapshot text not null,
  status text not null default 'pending' check (status in ('pending','active','revoked','expired')),
  pairing_code_hash text,
  pairing_expires_at timestamptz,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  revoked_at timestamptz
);

create table if not exists gic.telegram_preferences (
  user_id uuid primary key references gic.users(id) on delete cascade,
  locale text not null default 'fa' check (locale in ('fa','en')),
  daily_digest_enabled boolean not null default false,
  daily_digest_hour_iran integer not null default 9 check (daily_digest_hour_iran between 0 and 23),
  daily_digest_minute_iran integer not null default 0 check (daily_digest_minute_iran in (0,30)),
  updated_at timestamptz not null default now()
);

create table if not exists gic.digest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references gic.users(id) on delete cascade,
  local_date_key text not null,
  status text not null default 'started' check (status in ('started','sent','failed','skipped')),
  delivered_count integer not null default 0,
  summary_redacted text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id, local_date_key)
);

create table if not exists gic.fallback_test_runs (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  initiated_by uuid references gic.users(id) on delete set null,
  role text not null,
  primary_model text not null,
  fallback_model text,
  status text not null check (status in ('succeeded','failed')),
  reason text not null,
  duration_ms integer,
  created_at timestamptz not null default now()
);

alter table gic.users enable row level security;
alter table gic.projects enable row level security;
alter table gic.project_tasks enable row level security;
alter table gic.approval_gates enable row level security;
alter table gic.approval_decisions enable row level security;
alter table gic.agent_runs enable row level security;
alter table gic.project_events enable row level security;
alter table gic.notifications enable row level security;
alter table gic.site_profiles enable row level security;
alter table gic.web_actions enable row level security;
alter table gic.provider_models enable row level security;
alter table gic.provider_credentials enable row level security;
alter table gic.telegram_pairings enable row level security;
alter table gic.telegram_preferences enable row level security;
alter table gic.digest_runs enable row level security;
alter table gic.fallback_test_runs enable row level security;
