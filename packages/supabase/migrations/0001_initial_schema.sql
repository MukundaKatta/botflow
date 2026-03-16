-- BotFlow Database Schema
-- Supabase Postgres with RLS

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================
-- ORGANIZATIONS
-- ============================================
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro', 'enterprise')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  monthly_message_limit integer not null default 500,
  messages_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organizations_slug on public.organizations(slug);
create index idx_organizations_stripe on public.organizations(stripe_customer_id);

-- ============================================
-- ORGANIZATION MEMBERS
-- ============================================
create table public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

create index idx_org_members_user on public.organization_members(user_id);
create index idx_org_members_org on public.organization_members(organization_id);

-- ============================================
-- BOTS
-- ============================================
create table public.bots (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused')),
  channels text[] not null default '{"whatsapp"}',
  whatsapp_number text,
  sms_number text,
  instagram_page_id text,
  system_prompt text,
  ai_model text not null default 'claude-sonnet-4-20250514',
  ai_temperature numeric(3,2) not null default 0.7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bots_org on public.bots(organization_id);
create index idx_bots_whatsapp on public.bots(whatsapp_number) where whatsapp_number is not null;
create index idx_bots_sms on public.bots(sms_number) where sms_number is not null;
create index idx_bots_instagram on public.bots(instagram_page_id) where instagram_page_id is not null;

-- ============================================
-- FLOWS
-- ============================================
create table public.flows (
  id uuid primary key default uuid_generate_v4(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  trigger_type text not null default 'message' check (trigger_type in ('message', 'keyword', 'button', 'scheduled')),
  trigger_config jsonb not null default '{}',
  flow_data jsonb not null default '{"nodes": [], "edges": []}',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_flows_bot on public.flows(bot_id);
create index idx_flows_active on public.flows(bot_id) where is_active = true;

-- ============================================
-- CONTACTS
-- ============================================
create table public.contacts (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone text,
  instagram_id text,
  name text,
  email text,
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contacts_org on public.contacts(organization_id);
create index idx_contacts_phone on public.contacts(organization_id, phone) where phone is not null;
create index idx_contacts_instagram on public.contacts(organization_id, instagram_id) where instagram_id is not null;
create index idx_contacts_tags on public.contacts using gin(tags);

-- ============================================
-- CONVERSATIONS
-- ============================================
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'sms', 'instagram')),
  status text not null default 'active' check (status in ('active', 'closed', 'handed_off')),
  assigned_to uuid references auth.users(id),
  current_flow_id uuid references public.flows(id),
  current_node_id text,
  context jsonb not null default '{}',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_convos_bot on public.conversations(bot_id);
create index idx_convos_contact on public.conversations(contact_id);
create index idx_convos_status on public.conversations(bot_id, status);
create index idx_convos_last_msg on public.conversations(last_message_at desc);

-- ============================================
-- MESSAGES
-- ============================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  content text not null,
  content_type text not null default 'text' check (content_type in ('text', 'image', 'audio', 'video', 'document', 'template', 'interactive')),
  media_url text,
  external_id text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'delivered', 'read', 'failed')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_messages_convo on public.messages(conversation_id, created_at);
create index idx_messages_external on public.messages(external_id) where external_id is not null;

-- ============================================
-- BROADCASTS
-- ============================================
create table public.broadcasts (
  id uuid primary key default uuid_generate_v4(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  name text not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'instagram')),
  template_name text,
  content text not null,
  audience_filter jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  read_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_broadcasts_bot on public.broadcasts(bot_id);
create index idx_broadcasts_status on public.broadcasts(status);
create index idx_broadcasts_scheduled on public.broadcasts(scheduled_at) where status = 'scheduled';

-- ============================================
-- KNOWLEDGE BASE
-- ============================================
create table public.knowledge_base (
  id uuid primary key default uuid_generate_v4(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  title text not null,
  content text not null,
  category text,
  embedding vector(1536),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_kb_bot on public.knowledge_base(bot_id);
create index idx_kb_active on public.knowledge_base(bot_id) where is_active = true;

-- ============================================
-- ANALYTICS EVENTS
-- ============================================
create table public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}',
  contact_id uuid references public.contacts(id),
  conversation_id uuid references public.conversations(id),
  created_at timestamptz not null default now()
);

create index idx_analytics_bot on public.analytics_events(bot_id, created_at desc);
create index idx_analytics_type on public.analytics_events(bot_id, event_type);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Increment messages used counter
create or replace function public.increment_messages_used(org_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.organizations
  set messages_used = messages_used + 1,
      updated_at = now()
  where id = org_id;
end;
$$;

-- Reset monthly message counters (run via pg_cron)
create or replace function public.reset_monthly_messages()
returns void
language plpgsql
security definer
as $$
begin
  update public.organizations
  set messages_used = 0,
      updated_at = now();
end;
$$;

-- Auto-create org on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_name text;
  org_slug text;
  new_org_id uuid;
begin
  org_name := coalesce(new.raw_user_meta_data->>'org_name', 'My Organization');
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(new.id::text, 1, 8);

  insert into public.organizations (name, slug)
  values (org_name, org_slug)
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, new.id, 'owner');

  return new;
end;
$$;

-- Trigger: create org on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_organizations_updated_at before update on public.organizations for each row execute function public.update_updated_at();
create trigger update_bots_updated_at before update on public.bots for each row execute function public.update_updated_at();
create trigger update_flows_updated_at before update on public.flows for each row execute function public.update_updated_at();
create trigger update_contacts_updated_at before update on public.contacts for each row execute function public.update_updated_at();
create trigger update_conversations_updated_at before update on public.conversations for each row execute function public.update_updated_at();
create trigger update_broadcasts_updated_at before update on public.broadcasts for each row execute function public.update_updated_at();
create trigger update_knowledge_base_updated_at before update on public.knowledge_base for each row execute function public.update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.bots enable row level security;
alter table public.flows enable row level security;
alter table public.contacts enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.broadcasts enable row level security;
alter table public.knowledge_base enable row level security;
alter table public.analytics_events enable row level security;

-- Helper: get user's org IDs
create or replace function public.get_user_org_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select organization_id from public.organization_members where user_id = auth.uid();
$$;

-- Organizations: members can read their own orgs
create policy "org_select" on public.organizations for select using (id in (select public.get_user_org_ids()));
create policy "org_update" on public.organizations for update using (id in (
  select organization_id from public.organization_members where user_id = auth.uid() and role in ('owner', 'admin')
));

-- Organization Members
create policy "org_members_select" on public.organization_members for select using (organization_id in (select public.get_user_org_ids()));
create policy "org_members_insert" on public.organization_members for insert with check (organization_id in (
  select organization_id from public.organization_members where user_id = auth.uid() and role in ('owner', 'admin')
));
create policy "org_members_delete" on public.organization_members for delete using (organization_id in (
  select organization_id from public.organization_members where user_id = auth.uid() and role = 'owner'
));

-- Bots: org members can CRUD
create policy "bots_select" on public.bots for select using (organization_id in (select public.get_user_org_ids()));
create policy "bots_insert" on public.bots for insert with check (organization_id in (select public.get_user_org_ids()));
create policy "bots_update" on public.bots for update using (organization_id in (select public.get_user_org_ids()));
create policy "bots_delete" on public.bots for delete using (organization_id in (select public.get_user_org_ids()));

-- Flows: through bot org membership
create policy "flows_select" on public.flows for select using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "flows_insert" on public.flows for insert with check (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "flows_update" on public.flows for update using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "flows_delete" on public.flows for delete using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));

-- Contacts
create policy "contacts_select" on public.contacts for select using (organization_id in (select public.get_user_org_ids()));
create policy "contacts_insert" on public.contacts for insert with check (organization_id in (select public.get_user_org_ids()));
create policy "contacts_update" on public.contacts for update using (organization_id in (select public.get_user_org_ids()));
create policy "contacts_delete" on public.contacts for delete using (organization_id in (select public.get_user_org_ids()));

-- Conversations: through bot org membership
create policy "convos_select" on public.conversations for select using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "convos_insert" on public.conversations for insert with check (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "convos_update" on public.conversations for update using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));

-- Messages: through conversation -> bot -> org
create policy "messages_select" on public.messages for select using (conversation_id in (
  select id from public.conversations where bot_id in (
    select id from public.bots where organization_id in (select public.get_user_org_ids())
  )
));
create policy "messages_insert" on public.messages for insert with check (conversation_id in (
  select id from public.conversations where bot_id in (
    select id from public.bots where organization_id in (select public.get_user_org_ids())
  )
));

-- Broadcasts
create policy "broadcasts_select" on public.broadcasts for select using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "broadcasts_insert" on public.broadcasts for insert with check (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "broadcasts_update" on public.broadcasts for update using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "broadcasts_delete" on public.broadcasts for delete using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));

-- Knowledge Base
create policy "kb_select" on public.knowledge_base for select using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "kb_insert" on public.knowledge_base for insert with check (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "kb_update" on public.knowledge_base for update using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "kb_delete" on public.knowledge_base for delete using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));

-- Analytics Events
create policy "analytics_select" on public.analytics_events for select using (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));
create policy "analytics_insert" on public.analytics_events for insert with check (bot_id in (
  select id from public.bots where organization_id in (select public.get_user_org_ids())
));

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

-- ============================================
-- CRON JOBS (requires pg_cron extension)
-- ============================================
-- Reset monthly message counters on the 1st of each month
-- select cron.schedule('reset-monthly-messages', '0 0 1 * *', 'select public.reset_monthly_messages()');
