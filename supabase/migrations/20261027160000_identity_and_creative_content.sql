-- Phase 1: individual identity and immutable creative content.
-- Run as the Supabase migration owner, never as a browser client.
begin;

create schema app;
create schema private;
revoke all on schema app, private from public, anon, authenticated;
grant usage on schema app to authenticated, service_role;
grant usage on schema private to service_role;
alter default privileges in schema app revoke execute on functions from public;
alter default privileges in schema private revoke execute on functions from public;

create function private.touch_row() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  new.row_version := old.row_version + 1;
  return new;
end;
$$;

create function private.reject_content_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'IMMUTABLE_RECORD';
end;
$$;

create function private.content_hash(payload jsonb) returns text
language sql immutable strict set search_path = '' as $$
  select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(payload::text, 'UTF8')), 'hex');
$$;

create table app.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text check (char_length(display_name) between 1 and 120),
  lifecycle text not null default 'active' check (lifecycle in ('active', 'closing', 'closed')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0)
);

create table app.personal_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references auth.users(id) on delete restrict,
  lifecycle text not null default 'active' check (lifecycle in ('active', 'closing', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0),
  check (lifecycle <> 'active' or owner_user_id is not null),
  check ((lifecycle = 'closed') = (closed_at is not null))
);

create table app.preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references app.personal_workspaces(id) on delete restrict,
  user_id uuid not null unique references auth.users(id) on delete restrict,
  audience text check (char_length(audience) <= 300),
  use_case text check (char_length(use_case) <= 120),
  timezone text not null default 'UTC',
  language text not null default 'en' check (language = 'en'),
  billing_currency_preference text check (billing_currency_preference in ('INR', 'USD')),
  notification_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(notification_settings) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0),
  unique (workspace_id, id)
);

create function private.validate_preferences() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception using errcode = '23514', message = 'INVALID_TIMEZONE';
  end if;
  if not exists (select 1 from app.personal_workspaces where id = new.workspace_id and owner_user_id = new.user_id) then
    raise exception using errcode = '23514', message = 'PREFERENCE_OWNER_MISMATCH';
  end if;
  return new;
end;
$$;
create trigger validate_preferences before insert or update on app.preferences
for each row execute function private.validate_preferences();

create table app.credit_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references app.personal_workspaces(id) on delete restrict,
  state text not null default 'unfunded' check (state in ('unfunded', 'active', 'held', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0),
  unique (workspace_id, id)
);
-- No balances, allowances or purchases are invented by signup. Ledger comes later.

create table app.catalog_versions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('templates', 'voices', 'fonts', 'music', 'characters', 'presenters')),
  version text not null check (char_length(version) between 1 and 80),
  contract_version text not null,
  status text not null check (status in ('draft', 'published', 'retired')),
  effective_at timestamptz,
  created_at timestamptz not null default now(),
  unique (kind, version),
  check (status <> 'published' or effective_at is not null)
);

create table app.catalog_entries (
  id uuid primary key default gen_random_uuid(),
  catalog_version_id uuid not null references app.catalog_versions(id) on delete restrict,
  entry_key text not null,
  label text not null,
  public_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(public_settings) = 'object'),
  rights_reference text,
  status text not null check (status in ('draft', 'available', 'disabled', 'retired')),
  created_at timestamptz not null default now(),
  unique (catalog_version_id, entry_key)
);

create table app.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  kind text not null check (kind in ('logo', 'image', 'narration', 'music', 'captions', 'thumbnail', 'clip', 'video')),
  state text not null check (state in ('pending', 'inspecting', 'ready', 'rejected', 'deletion_pending', 'deleted')),
  object_key text not null unique check (char_length(object_key) between 1 and 1024),
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text not null,
  byte_count bigint not null check (byte_count > 0),
  width integer check (width > 0),
  height integer check (height > 0),
  duration_ms integer check (duration_ms > 0),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  rights_reference text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0),
  unique (workspace_id, id),
  check (state <> 'ready' or sha256 is not null),
  check ((state = 'deleted') = (deleted_at is not null))
);

create table app.brand_kits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references app.personal_workspaces(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0),
  unique (workspace_id, id)
);

create table app.brand_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  brand_kit_id uuid not null,
  version_no integer not null check (version_no > 0),
  settings_schema text not null,
  settings jsonb not null check (jsonb_typeof(settings) = 'object'),
  logo_asset_id uuid,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, brand_kit_id, id),
  unique (brand_kit_id, version_no),
  foreign key (workspace_id, brand_kit_id) references app.brand_kits(workspace_id, id) on delete restrict,
  foreign key (workspace_id, logo_asset_id) references app.assets(workspace_id, id) on delete restrict
);
alter table app.brand_kits add constraint brand_current_version_fk
  foreign key (workspace_id, id, current_version_id)
  references app.brand_versions(workspace_id, brand_kit_id, id) deferrable initially deferred;

create table app.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  current_revision_id uuid,
  last_accepted_render_id uuid,
  lifecycle text not null default 'active' check (lifecycle in ('active', 'archived', 'deletion_pending', 'deleted')),
  archived_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0),
  unique (workspace_id, id),
  check ((lifecycle = 'archived') = (archived_at is not null)),
  check (lifecycle not in ('deletion_pending', 'deleted') or deletion_requested_at is not null)
);

create table app.sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  kind text not null check (kind in ('topic', 'notes', 'script', 'public_url')),
  title text check (char_length(title) <= 200),
  origin_url text check (origin_url is null or (char_length(origin_url) <= 2048 and origin_url ~ '^https?://')),
  lifecycle text not null default 'active' check (lifecycle in ('active', 'deletion_pending', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0),
  unique (workspace_id, id)
);

create table app.source_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  source_id uuid not null,
  version_no integer not null check (version_no > 0),
  origin_url text,
  retrieved_at timestamptz,
  text_content text not null check (char_length(text_content) between 1 and 100000),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  extraction_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(extraction_metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (source_id, version_no),
  foreign key (workspace_id, source_id) references app.sources(workspace_id, id) on delete restrict
);

create table app.source_blocks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  source_version_id uuid not null,
  block_key text not null,
  position integer not null check (position >= 0),
  text_content text not null check (char_length(text_content) between 1 and 100000),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (source_version_id, block_key),
  unique (source_version_id, position),
  foreign key (workspace_id, source_version_id) references app.source_versions(workspace_id, id) on delete restrict
);

create table app.source_confirmations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  source_version_id uuid not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (source_version_id, actor_user_id),
  foreign key (workspace_id, source_version_id) references app.source_versions(workspace_id, id) on delete restrict
);

create table app.script_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  version_no integer not null check (version_no > 0),
  contract_version text not null,
  sections jsonb not null check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) between 1 and 100),
  estimated_duration_ms integer not null check (estimated_duration_ms between 1 and 180000),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, project_id, id),
  unique (project_id, version_no),
  foreign key (workspace_id, project_id) references app.projects(workspace_id, id) on delete restrict
);

create table app.scenes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  stable_key text not null check (char_length(stable_key) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, project_id, id),
  unique (project_id, stable_key),
  foreign key (workspace_id, project_id) references app.projects(workspace_id, id) on delete restrict
);

create table app.scene_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  scene_id uuid not null,
  version_no integer not null check (version_no > 0),
  template_entry_id uuid not null references app.catalog_entries(id) on delete restrict,
  schema_version text not null,
  narration text not null check (char_length(narration) <= 10000),
  pronunciation_text text check (char_length(pronunciation_text) <= 10000),
  display_text text not null check (char_length(display_text) <= 2000),
  estimated_duration_ms integer not null check (estimated_duration_ms between 1 and 90000),
  visual_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(visual_settings) = 'object'),
  mode_settings jsonb not null default '{}'::jsonb check (jsonb_typeof(mode_settings) = 'object'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, project_id, id),
  unique (workspace_id, project_id, scene_id, id),
  unique (scene_id, version_no),
  foreign key (workspace_id, project_id, scene_id) references app.scenes(workspace_id, project_id, id) on delete restrict
);

create table app.storyboard_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  version_no integer not null check (version_no > 0),
  script_version_id uuid not null,
  contract_version text not null,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  estimated_duration_ms integer not null check (estimated_duration_ms between 1 and 180000),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, project_id, id),
  unique (workspace_id, project_id, script_version_id, id),
  unique (project_id, version_no),
  foreign key (workspace_id, project_id) references app.projects(workspace_id, id) on delete restrict,
  foreign key (workspace_id, project_id, script_version_id) references app.script_versions(workspace_id, project_id, id) on delete restrict
);

create table app.storyboard_scenes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  storyboard_version_id uuid not null,
  scene_id uuid not null,
  scene_version_id uuid not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (storyboard_version_id, position),
  unique (storyboard_version_id, scene_id),
  foreign key (workspace_id, project_id, storyboard_version_id) references app.storyboard_versions(workspace_id, project_id, id) on delete restrict,
  foreign key (workspace_id, project_id, scene_id, scene_version_id) references app.scene_versions(workspace_id, project_id, scene_id, id) on delete restrict
);

create table app.project_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  parent_revision_id uuid,
  revision_no integer not null check (revision_no > 0),
  brief_schema text not null,
  brief jsonb not null check (jsonb_typeof(brief) = 'object' and octet_length(brief::text) <= 150000),
  target_duration_seconds integer not null check (target_duration_seconds in (30, 60, 90)),
  style text not null check (style in ('explainer_2d', 'cinematic', 'presenter')),
  brand_version_id uuid,
  script_version_id uuid,
  storyboard_version_id uuid,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  canonicalizer_version text not null,
  created_by_user_id uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, project_id, id),
  unique (project_id, revision_no),
  check ((revision_no = 1) = (parent_revision_id is null)),
  check (id is distinct from parent_revision_id),
  check (storyboard_version_id is null or script_version_id is not null),
  foreign key (workspace_id, project_id) references app.projects(workspace_id, id) on delete restrict,
  foreign key (workspace_id, project_id, parent_revision_id) references app.project_revisions(workspace_id, project_id, id) on delete restrict,
  foreign key (workspace_id, brand_version_id) references app.brand_versions(workspace_id, id) on delete restrict,
  foreign key (workspace_id, project_id, script_version_id) references app.script_versions(workspace_id, project_id, id) on delete restrict,
  foreign key (workspace_id, project_id, script_version_id, storyboard_version_id) references app.storyboard_versions(workspace_id, project_id, script_version_id, id) on delete restrict
);
alter table app.projects add constraint project_current_revision_fk
  foreign key (workspace_id, id, current_revision_id)
  references app.project_revisions(workspace_id, project_id, id) deferrable initially deferred;

create table app.revision_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  revision_id uuid not null,
  source_version_id uuid not null,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (revision_id, source_version_id),
  unique (revision_id, position),
  foreign key (workspace_id, project_id, revision_id) references app.project_revisions(workspace_id, project_id, id) on delete restrict,
  foreign key (workspace_id, source_version_id) references app.source_versions(workspace_id, id) on delete restrict
);

create table app.ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  origin_revision_id uuid not null,
  selected_in_revision_id uuid,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  state text not null default 'suggested' check (state in ('suggested', 'saved', 'dismissed', 'selected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1 check (row_version > 0),
  unique (workspace_id, id),
  foreign key (workspace_id, project_id, origin_revision_id) references app.project_revisions(workspace_id, project_id, id) on delete restrict,
  foreign key (workspace_id, project_id, selected_in_revision_id) references app.project_revisions(workspace_id, project_id, id) on delete restrict,
  check ((state = 'selected') = (selected_in_revision_id is not null))
);

create function private.provision_individual(p_user_id uuid, p_display_name text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_workspace uuid;
begin
  insert into app.profiles (user_id, display_name)
  values (p_user_id, nullif(left(btrim(p_display_name), 120), '')) on conflict (user_id) do nothing;
  perform 1 from app.profiles where user_id = p_user_id and lifecycle = 'active' for update;
  if not found then raise exception using errcode = '42501', message = 'ACCOUNT_NOT_ACTIVE'; end if;
  insert into app.personal_workspaces (owner_user_id) values (p_user_id) on conflict (owner_user_id) do nothing;
  select id into v_workspace from app.personal_workspaces where owner_user_id = p_user_id and lifecycle = 'active';
  if v_workspace is null then raise exception using errcode = '42501', message = 'WORKSPACE_NOT_ACTIVE'; end if;
  insert into app.preferences (user_id, workspace_id) values (p_user_id, v_workspace) on conflict (user_id) do nothing;
  insert into app.credit_accounts (workspace_id) values (v_workspace) on conflict (workspace_id) do nothing;
  return v_workspace;
end;
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.provision_individual(new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;
create trigger video_studio_provision_user after insert on auth.users
for each row execute function private.handle_new_user();

create function app.ensure_personal_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  return private.provision_individual(auth.uid());
end;
$$;

create function app.current_workspace_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select w.id from app.personal_workspaces w
  join app.profiles p on p.user_id = w.owner_user_id
  where w.owner_user_id = (select auth.uid()) and w.lifecycle = 'active' and p.lifecycle = 'active';
$$;

do $$
declare v_table text;
begin
  foreach v_table in array array['profiles', 'personal_workspaces', 'preferences', 'credit_accounts', 'assets', 'brand_kits', 'projects', 'sources', 'ideas'] loop
    execute format('create trigger touch_row before update on app.%I for each row execute function private.touch_row()', v_table);
  end loop;
  foreach v_table in array array['brand_versions', 'source_versions', 'source_blocks', 'source_confirmations', 'script_versions', 'scenes', 'scene_versions', 'storyboard_versions', 'storyboard_scenes', 'project_revisions', 'revision_sources'] loop
    execute format('create trigger immutable_content before update or delete on app.%I for each row execute function private.reject_content_change()', v_table);
  end loop;
  foreach v_table in array array['preferences', 'credit_accounts', 'assets', 'brand_kits', 'brand_versions', 'projects', 'sources', 'source_versions', 'source_blocks', 'source_confirmations', 'script_versions', 'scenes', 'scene_versions', 'storyboard_versions', 'storyboard_scenes', 'project_revisions', 'revision_sources', 'ideas'] loop
    execute format('alter table app.%I enable row level security', v_table);
    execute format('create policy owner_read on app.%I for select to authenticated using (workspace_id = (select app.current_workspace_id()))', v_table);
  end loop;
end;
$$;

alter table app.profiles enable row level security;
create policy profile_owner_read on app.profiles for select to authenticated using (user_id = (select auth.uid()));
alter table app.personal_workspaces enable row level security;
create policy workspace_owner_read on app.personal_workspaces for select to authenticated using (owner_user_id = (select auth.uid()));
alter table app.catalog_versions enable row level security;
create policy published_catalogs on app.catalog_versions for select to authenticated using (status = 'published');
alter table app.catalog_entries enable row level security;
create policy published_entries on app.catalog_entries for select to authenticated using (
  status = 'available' and exists (select 1 from app.catalog_versions v where v.id = catalog_version_id and v.status = 'published')
);

revoke all on all tables in schema app from public, anon, authenticated;
grant select on app.profiles, app.personal_workspaces, app.preferences, app.brand_kits,
  app.brand_versions, app.projects, app.sources, app.source_versions, app.source_blocks,
  app.source_confirmations, app.script_versions, app.scenes, app.scene_versions,
  app.storyboard_versions, app.storyboard_scenes, app.project_revisions,
  app.revision_sources, app.ideas, app.catalog_versions, app.catalog_entries to authenticated;
-- Private storage keys and provenance must go through the authorized media service.
grant select (id, workspace_id, kind, state, mime_type, byte_count, width, height, duration_ms, created_at)
  on app.assets to authenticated;
-- Account state alone is not a balance or an entitlement.
grant select (id, workspace_id, state, created_at) on app.credit_accounts to authenticated;
revoke all on all functions in schema app, private from public, anon, authenticated;
grant execute on function app.ensure_personal_workspace(), app.current_workspace_id() to authenticated;
grant all on all tables in schema app to service_role;
grant execute on all functions in schema app, private to service_role;

create index projects_dashboard_idx on app.projects(workspace_id, lifecycle, updated_at desc, id desc);
create index sources_workspace_idx on app.sources(workspace_id, created_at desc, id desc);
create index assets_workspace_idx on app.assets(workspace_id, state, created_at desc);
create index ideas_project_idx on app.ideas(workspace_id, project_id, state);
create index revision_sources_source_idx on app.revision_sources(workspace_id, source_version_id);
create index scene_versions_project_idx on app.scene_versions(workspace_id, project_id, scene_id, version_no desc);

commit;
