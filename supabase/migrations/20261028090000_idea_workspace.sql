-- Idea-tab pilot: immutable snapshots, owner commands, AI request journal.
-- No paid allowance, financial settlement, provider secret or final rendering is introduced.
begin;

create table private.idea_pilot_access (
  user_id uuid primary key references auth.users(id) on delete restrict,
  enabled boolean not null default true,
  daily_limit integer not null default 20 check (daily_limit between 1 and 100),
  created_at timestamptz not null default now()
);
alter table private.idea_pilot_access enable row level security;

create table private.idea_mutations (
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  mutation_id uuid not null,
  project_id uuid not null,
  request_hash text not null,
  revision_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, mutation_id),
  foreign key (workspace_id, project_id, revision_id) references app.project_revisions(workspace_id, project_id, id) on delete restrict
);
alter table private.idea_mutations enable row level security;

create table app.content_source_refs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  script_version_id uuid not null,
  source_block_id uuid not null,
  section_key text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (script_version_id, section_key, source_block_id),
  foreign key (workspace_id, project_id, script_version_id) references app.script_versions(workspace_id, project_id, id) on delete restrict,
  foreign key (workspace_id, source_block_id) references app.source_blocks(workspace_id, id) on delete restrict
);
create trigger immutable_content before update or delete on app.content_source_refs
for each row execute function private.reject_content_change();
alter table app.content_source_refs enable row level security;
create policy owner_read on app.content_source_refs for select to authenticated
using (workspace_id = (select app.current_workspace_id()));

create table app.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  revision_id uuid not null,
  scope text not null default 'script' check (scope = 'script'),
  script_version_id uuid not null,
  target_hash text not null check (target_hash ~ '^[0-9a-f]{64}$'),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_basis text not null default 'human' check (actor_basis = 'human'),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (revision_id, script_version_id, actor_user_id),
  foreign key (workspace_id, project_id, revision_id) references app.project_revisions(workspace_id, project_id, id) on delete restrict,
  foreign key (workspace_id, project_id, script_version_id) references app.script_versions(workspace_id, project_id, id) on delete restrict
);
create trigger immutable_content before update or delete on app.approvals
for each row execute function private.reject_content_change();
alter table app.approvals enable row level security;
create policy owner_read on app.approvals for select to authenticated
using (workspace_id = (select app.current_workspace_id()));

create table app.idea_ai_operations (
  id uuid primary key,
  workspace_id uuid not null references app.personal_workspaces(id) on delete restrict,
  project_id uuid not null,
  revision_id uuid not null,
  kind text not null check (kind in ('ideas', 'script', 'rewrite')),
  instruction text not null default '' check (char_length(instruction) <= 500),
  scope_section_id text check (char_length(scope_section_id) between 1 and 64),
  model text not null check (model ~ '^gemini-[a-zA-Z0-9._-]{1,80}$'),
  prompt_version text not null default 'idea-v1',
  request_hash text not null,
  state text not null default 'running' check (state in ('running', 'succeeded', 'failed', 'uncertain')),
  result jsonb,
  error_code text check (error_code in ('PROVIDER_REJECTED', 'PROVIDER_UNAVAILABLE', 'INVALID_AI_RESULT', 'OUTCOME_UNCERTAIN', 'INTERRUPTED_REQUEST')),
  applied_revision_id uuid,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  row_version integer not null default 1,
  unique (workspace_id, id),
  foreign key (workspace_id, project_id, revision_id) references app.project_revisions(workspace_id, project_id, id) on delete restrict,
  foreign key (workspace_id, project_id, applied_revision_id) references app.project_revisions(workspace_id, project_id, id) on delete restrict,
  check ((state = 'running') = (finished_at is null)),
  check (state <> 'succeeded' or result is not null)
);
create unique index idea_one_running_per_workspace on app.idea_ai_operations(workspace_id) where state = 'running';
create index idea_operations_recent on app.idea_ai_operations(workspace_id, created_at desc, id desc);
create index idea_operations_project on app.idea_ai_operations(workspace_id, project_id, created_at desc);
create trigger touch_row before update on app.idea_ai_operations for each row execute function private.touch_row();
alter table app.idea_ai_operations enable row level security;
create policy owner_read on app.idea_ai_operations for select to authenticated
using (workspace_id = (select app.current_workspace_id()));

create function app.configure_idea_pilot(p_email text, p_daily_limit integer default 20)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if p_daily_limit not between 1 and 100 then raise exception 'INVALID_LIMIT'; end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then raise exception 'PILOT_ACCOUNT_NOT_FOUND'; end if;
  -- Bind the existing auth UUID once; changing email/metadata never grants pilot access.
  update private.idea_pilot_access set enabled = false where user_id <> v_user;
  insert into private.idea_pilot_access(user_id, daily_limit) values (v_user, p_daily_limit)
    on conflict (user_id) do update set enabled = true, daily_limit = excluded.daily_limit;
  return v_user;
end;
$$;

create function app.idea_capabilities() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_limit integer; v_count integer;
begin
  if auth.uid() is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  select daily_limit into v_limit from private.idea_pilot_access where user_id = auth.uid() and enabled;
  if v_limit is null or app.current_workspace_id() is null then
    return jsonb_build_object('allowed', false, 'dailyLimit', 0, 'remaining', 0);
  end if;
  select count(*) into v_count from app.idea_ai_operations where workspace_id = app.current_workspace_id()
    and created_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';
  return jsonb_build_object('allowed', true, 'dailyLimit', v_limit, 'remaining', greatest(0, v_limit-v_count));
end;
$$;

create function private.idea_basis(p_draft jsonb) returns text
language sql immutable set search_path = '' as $$
  select private.content_hash(p_draft - 'title' - 'themeId' - 'sections' - 'reviewNotes');
$$;

create function private.validate_idea_document(p_draft jsonb) returns void
language plpgsql set search_path = '' as $$
declare v_item jsonb; v_key text; v_words integer;
begin
  if jsonb_typeof(p_draft) is distinct from 'object' or octet_length(p_draft::text) > 131072 then raise exception 'INVALID_DRAFT'; end if;
  if (select count(*) from jsonb_object_keys(p_draft)) <> 14 then raise exception 'INVALID_DRAFT'; end if;
  foreach v_key in array array['title','inputType','inputText','sourceUrl','audience','objective','selectedIdea','tone','themeId'] loop
    if jsonb_typeof(p_draft->v_key) is distinct from 'string' then raise exception 'INVALID_DRAFT'; end if;
  end loop;
  if char_length(btrim(p_draft->>'title')) not between 1 and 200
    or char_length(p_draft->>'inputText') > 16000 or char_length(p_draft->>'sourceUrl') > 2048
    or char_length(p_draft->>'audience') > 300 or char_length(p_draft->>'objective') > 500
    or char_length(p_draft->>'selectedIdea') > 500
    or p_draft->>'inputType' not in ('topic','notes','script','url')
    or p_draft->>'tone' not in ('clear','friendly','professional')
    or p_draft->>'themeId' not in ('sapphire-clay','clean-paper','midnight','classroom')
    or jsonb_typeof(p_draft->'sourceConfirmed') is distinct from 'boolean'
    or not (p_draft ? 'sourceRetrievedAt') or jsonb_typeof(p_draft->'sourceRetrievedAt') not in ('null','string')
    or jsonb_typeof(p_draft->'durationSeconds') is distinct from 'number'
    or p_draft->>'durationSeconds' not in ('30','60','90')
    or jsonb_typeof(p_draft->'sections') is distinct from 'array'
    or jsonb_typeof(p_draft->'reviewNotes') is distinct from 'array'
  then raise exception 'INVALID_DRAFT'; end if;
  if jsonb_typeof(p_draft->'sourceRetrievedAt') = 'string' and (p_draft->>'sourceRetrievedAt') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' then raise exception 'INVALID_DRAFT'; end if;
  if jsonb_array_length(p_draft->'sections') > 8 or jsonb_array_length(p_draft->'reviewNotes') > 8 then raise exception 'INVALID_DRAFT'; end if;
  if exists (select 1 from jsonb_array_elements(p_draft->'reviewNotes') n where jsonb_typeof(n) <> 'string' or char_length(n#>>'{}') not between 1 and 300) then raise exception 'INVALID_DRAFT'; end if;
  for v_item in select value from jsonb_array_elements(p_draft->'sections') loop
    if jsonb_typeof(v_item) <> 'object' or (select count(*) from jsonb_object_keys(v_item)) <> 5
      or jsonb_typeof(v_item->'id') is distinct from 'string' or (v_item->>'id') !~ '^[a-zA-Z0-9_-]{1,64}$'
      or jsonb_typeof(v_item->'title') is distinct from 'string' or char_length(btrim(v_item->>'title')) not between 1 and 100
      or jsonb_typeof(v_item->'narration') is distinct from 'string' or char_length(btrim(v_item->>'narration')) not between 1 and 1600
      or jsonb_typeof(v_item->'visualSuggestion') is distinct from 'string' or char_length(v_item->>'visualSuggestion') > 400
      or jsonb_typeof(v_item->'sourceRefs') is distinct from 'array'
    then raise exception 'INVALID_DRAFT'; end if;
    if jsonb_array_length(v_item->'sourceRefs') > 1
      or exists(select 1 from jsonb_array_elements(v_item->'sourceRefs') r where r <> '"source-1"'::jsonb)
    then raise exception 'INVALID_SOURCE_REFERENCE'; end if;
  end loop;
  if (select count(distinct s->>'id') from jsonb_array_elements(p_draft->'sections') s) <> jsonb_array_length(p_draft->'sections') then raise exception 'INVALID_DRAFT'; end if;
  select count(*) into v_words from regexp_split_to_table(btrim((select coalesce(string_agg(s->>'narration',' '),'') from jsonb_array_elements(p_draft->'sections') s)), E'\\s+') w where w <> '';
  if v_words > 420 then raise exception 'SCRIPT_TOO_LONG'; end if;
end;
$$;

create function private.idea_operation_json(p_op app.idea_ai_operations) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id',p_op.id,'kind',p_op.kind,'state',p_op.state,'createdAt',p_op.created_at,
    'errorCode',p_op.error_code,'result',p_op.result,'applied',p_op.applied_revision_id is not null);
$$;

create function app.load_idea_project(p_project_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_project app.projects; v_rev app.project_revisions; v_sections jsonb; v_op app.idea_ai_operations; v_draft jsonb;
begin
  select * into v_project from app.projects where id = p_project_id and workspace_id = app.current_workspace_id() and lifecycle = 'active';
  if not found then raise exception using errcode = 'P0002', message = 'RESOURCE_NOT_FOUND'; end if;
  select * into strict v_rev from app.project_revisions where id = v_project.current_revision_id;
  select sections into v_sections from app.script_versions where id = v_rev.script_version_id;
  v_draft := (v_rev.brief - '_scriptBasis') || jsonb_build_object('title', v_project.title, 'sections', coalesce(v_sections,'[]'::jsonb), 'durationSeconds',v_rev.target_duration_seconds,'themeId',v_rev.settings->>'themeId');
  select * into v_op from app.idea_ai_operations where project_id = p_project_id and workspace_id = v_project.workspace_id order by created_at desc, id desc limit 1;
  return jsonb_build_object('id',v_project.id,'revisionId',v_rev.id,'revisionNumber',v_rev.revision_no,'updatedAt',v_project.updated_at,'draft',v_draft,
    'scriptStale',v_rev.script_version_id is not null and (v_rev.brief->>'_scriptBasis') is distinct from private.idea_basis(v_draft),
    'scriptApproved', exists(select 1 from app.approvals a where a.revision_id = v_rev.id and a.script_version_id = v_rev.script_version_id),
    'latestOperation',case when v_op.id is null then null else private.idea_operation_json(v_op) end,
    'ideas',coalesce((select jsonb_agg(i.content) from (select content from app.ideas where project_id=p_project_id and workspace_id=v_project.workspace_id order by created_at desc,id desc limit 5) i),'[]'::jsonb));
end;
$$;

create function app.save_idea_draft(p_project_id uuid, p_expected_revision_id uuid, p_mutation_id uuid, p_draft jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_workspace uuid := app.current_workspace_id(); v_project app.projects; v_old app.project_revisions;
  v_previous private.idea_mutations; v_request_hash text; v_revision uuid := gen_random_uuid();
  v_script uuid; v_old_sections jsonb := '[]'::jsonb; v_basis text; v_source uuid; v_source_version uuid;
  v_source_block uuid; v_old_source app.source_versions; v_source_kind text; v_words integer; v_source_ref record;
begin
  if v_workspace is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  perform private.validate_idea_document(p_draft);
  v_request_hash := private.content_hash(jsonb_build_object('project',p_project_id,'expected',p_expected_revision_id,'draft',p_draft));
  -- The workspace lock also serializes first creation and mutation-key replay.
  perform 1 from app.personal_workspaces where id = v_workspace for update;
  select * into v_previous from private.idea_mutations where workspace_id = v_workspace and mutation_id = p_mutation_id;
  if found then
    if v_previous.request_hash <> v_request_hash or v_previous.project_id <> p_project_id then raise exception 'IDEMPOTENCY_MISMATCH'; end if;
    if (select current_revision_id from app.projects where id=p_project_id) is distinct from v_previous.revision_id then raise exception 'REVISION_CONFLICT'; end if;
    return app.load_idea_project(p_project_id);
  end if;
  select * into v_project from app.projects where id = p_project_id and workspace_id = v_workspace and lifecycle = 'active' for update;
  if not found then
    if p_expected_revision_id is not null or exists(select 1 from app.projects where id = p_project_id) then raise exception using errcode = 'P0002', message = 'RESOURCE_NOT_FOUND'; end if;
    insert into app.projects(id, workspace_id, title) values(p_project_id,v_workspace,p_draft->>'title') returning * into v_project;
  elsif v_project.current_revision_id is distinct from p_expected_revision_id then raise exception 'REVISION_CONFLICT';
  end if;
  if v_project.current_revision_id is not null then
    select * into strict v_old from app.project_revisions where id = v_project.current_revision_id;
    select sections into v_old_sections from app.script_versions where id = v_old.script_version_id;
    v_old_sections := coalesce(v_old_sections,'[]'::jsonb);
  end if;
  -- Persist the exact user/source text. A topic is intent, not factual evidence.
  if btrim(p_draft->>'inputText') <> '' then
    v_source_kind := case p_draft->>'inputType' when 'url' then 'public_url' else p_draft->>'inputType' end;
    select sv.* into v_old_source from app.revision_sources rs join app.source_versions sv on sv.id = rs.source_version_id
      where rs.revision_id = v_old.id and rs.position = 0;
    if v_old_source.id is not null and v_old_source.text_content = p_draft->>'inputText'
      and v_old.brief->>'inputType' = p_draft->>'inputType' and v_old.brief->>'sourceUrl' = p_draft->>'sourceUrl' then
      v_source_version := v_old_source.id;
      select id into v_source_block from app.source_blocks where source_version_id = v_source_version and block_key = 'source-1';
    else
      if v_old_source.id is not null and v_old.brief->>'inputType' = p_draft->>'inputType' then v_source := v_old_source.source_id;
      else insert into app.sources(workspace_id,kind,title,origin_url) values(v_workspace,v_source_kind,p_draft->>'title',case when v_source_kind = 'public_url' and (p_draft->>'sourceUrl') ~ '^https?://' then p_draft->>'sourceUrl' else null end) returning id into v_source;
      end if;
      insert into app.source_versions(workspace_id,source_id,version_no,origin_url,retrieved_at,text_content,content_hash,extraction_metadata)
        values(v_workspace,v_source,(select coalesce(max(version_no),0)+1 from app.source_versions where source_id = v_source),
        case when v_source_kind = 'public_url' then nullif(p_draft->>'sourceUrl','') else null end,
        case when v_source_kind = 'public_url' then (p_draft->>'sourceRetrievedAt')::timestamptz else null end,p_draft->>'inputText',private.content_hash(to_jsonb(p_draft->>'inputText')),jsonb_build_object('confirmationRequired',v_source_kind = 'public_url')) returning id into v_source_version;
      insert into app.source_blocks(workspace_id,source_version_id,block_key,position,text_content,content_hash)
        values(v_workspace,v_source_version,'source-1',0,p_draft->>'inputText',private.content_hash(to_jsonb(p_draft->>'inputText'))) returning id into v_source_block;
    end if;
    if (p_draft->>'sourceConfirmed')::boolean then
      insert into app.source_confirmations(workspace_id,source_version_id,content_hash,actor_user_id)
        select v_workspace,v_source_version,content_hash,auth.uid() from app.source_versions where id = v_source_version
        on conflict (source_version_id, actor_user_id) do nothing;
    end if;
  end if;
  v_basis := private.idea_basis(p_draft);
  if jsonb_array_length(p_draft->'sections') > 0 then
    if v_old_sections = p_draft->'sections' and v_old.script_version_id is not null then
      v_script := v_old.script_version_id; v_basis := v_old.brief->>'_scriptBasis';
    else
      if p_draft->>'inputType' = 'topic' and exists(select 1 from jsonb_array_elements(p_draft->'sections') s where jsonb_array_length(s->'sourceRefs') > 0) then raise exception 'INVALID_SOURCE_REFERENCE'; end if;
      if exists(select 1 from jsonb_array_elements(p_draft->'sections') s where jsonb_array_length(s->'sourceRefs') > 0) and v_source_block is null then raise exception 'INVALID_SOURCE_REFERENCE'; end if;
      select count(*) into v_words from regexp_split_to_table(btrim((select string_agg(s->>'narration',' ') from jsonb_array_elements(p_draft->'sections') s)),E'\\s+') w where w <> '';
      insert into app.script_versions(workspace_id,project_id,version_no,contract_version,sections,estimated_duration_ms,content_hash)
        values(v_workspace,p_project_id,(select coalesce(max(version_no),0)+1 from app.script_versions where project_id = p_project_id),'idea-script-v1',p_draft->'sections',greatest(1,ceil(v_words*60000.0/140)::integer),private.content_hash(p_draft->'sections')) returning id into v_script;
      if v_source_block is not null then
        insert into app.content_source_refs(workspace_id,project_id,script_version_id,source_block_id,section_key)
          select v_workspace,p_project_id,v_script,v_source_block,s->>'id' from jsonb_array_elements(p_draft->'sections') s where s->'sourceRefs' @> '["source-1"]';
      end if;
    end if;
  end if;
  insert into app.project_revisions(id,workspace_id,project_id,parent_revision_id,revision_no,brief_schema,brief,target_duration_seconds,style,script_version_id,settings,content_hash,canonicalizer_version,created_by_user_id)
    values(v_revision,v_workspace,p_project_id,v_old.id,coalesce(v_old.revision_no,0)+1,'idea-v1',
      (p_draft - 'sections' - 'themeId' - 'durationSeconds') || jsonb_build_object('_scriptBasis',v_basis),
      (p_draft->>'durationSeconds')::integer,'explainer_2d',v_script,jsonb_build_object('themeId',p_draft->>'themeId'),private.content_hash(p_draft),'postgres-jsonb-text-v1',auth.uid());
  if v_source_version is not null then
    insert into app.revision_sources(workspace_id,project_id,revision_id,source_version_id,position) values(v_workspace,p_project_id,v_revision,v_source_version,0);
  end if;
  -- Retain exact source versions for a reused script, even when the current input changes.
  for v_source_ref in select distinct sb.source_version_id from app.content_source_refs cr join app.source_blocks sb on sb.id = cr.source_block_id where cr.script_version_id = v_script loop
    if not exists(select 1 from app.revision_sources where revision_id = v_revision and source_version_id = v_source_ref.source_version_id) then
      insert into app.revision_sources(workspace_id,project_id,revision_id,source_version_id,position)
        values(v_workspace,p_project_id,v_revision,v_source_ref.source_version_id,(select coalesce(max(position),-1)+1 from app.revision_sources where revision_id = v_revision));
    end if;
  end loop;
  update app.projects set title = p_draft->>'title', current_revision_id = v_revision where id = p_project_id;
  insert into private.idea_mutations(workspace_id,mutation_id,project_id,request_hash,revision_id) values(v_workspace,p_mutation_id,p_project_id,v_request_hash,v_revision);
  return app.load_idea_project(p_project_id);
end;
$$;

create function app.begin_idea_generation(p_project_id uuid, p_expected_revision_id uuid, p_operation_id uuid,
  p_kind text, p_instruction text, p_model text, p_section_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_workspace uuid := app.current_workspace_id(); v_limit integer; v_count integer;
  v_project app.projects; v_op app.idea_ai_operations; v_draft jsonb; v_hash text;
begin
  if v_workspace is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  perform 1 from app.personal_workspaces where id = v_workspace for update;
  select daily_limit into v_limit from private.idea_pilot_access where user_id = auth.uid() and enabled for update;
  if v_limit is null then raise exception using errcode = '42501', message = 'PILOT_ACCESS_REQUIRED'; end if;
  if p_kind not in ('ideas','script','rewrite') or p_instruction is null or char_length(p_instruction) > 500
    or p_model is null or p_model !~ '^gemini-[a-zA-Z0-9._-]{1,80}$' then raise exception 'INVALID_GENERATION'; end if;
  v_hash := private.content_hash(jsonb_build_object('project',p_project_id,'revision',p_expected_revision_id,'kind',p_kind,'instruction',p_instruction,'model',p_model,'section',p_section_id));
  select * into v_op from app.idea_ai_operations where id = p_operation_id;
  if found then
    if v_op.workspace_id <> v_workspace then raise exception using errcode = 'P0002', message = 'RESOURCE_NOT_FOUND'; end if;
    if v_op.request_hash <> v_hash then raise exception 'IDEMPOTENCY_MISMATCH'; end if;
    return jsonb_build_object('claimed',false,'operation',private.idea_operation_json(v_op));
  end if;
  select * into v_project from app.projects where id = p_project_id and workspace_id = v_workspace and lifecycle = 'active' for update;
  if not found then raise exception using errcode = 'P0002', message = 'RESOURCE_NOT_FOUND'; end if;
  if v_project.current_revision_id is distinct from p_expected_revision_id then raise exception 'REVISION_CONFLICT'; end if;
  v_draft := app.load_idea_project(p_project_id)->'draft';
  if p_kind = 'ideas' then
    if char_length(btrim((v_draft->>'inputText') || (v_draft->>'audience') || (v_draft->>'objective'))) < 10 then raise exception 'MORE_CONTEXT_REQUIRED'; end if;
  elsif char_length(btrim((v_draft->>'inputText') || (v_draft->>'selectedIdea'))) < 10 then raise exception 'MORE_CONTEXT_REQUIRED'; end if;
  if v_draft->>'inputType' = 'url' and ((v_draft->>'sourceConfirmed')::boolean is not true or char_length(btrim(v_draft->>'inputText')) < 50) then raise exception 'SOURCE_UNCONFIRMED'; end if;
  if p_kind = 'rewrite' and (jsonb_array_length(v_draft->'sections') = 0 or btrim(p_instruction) = '') then raise exception 'REWRITE_INSTRUCTION_REQUIRED'; end if;
  if p_section_id is not null and (p_kind <> 'rewrite' or not exists(select 1 from jsonb_array_elements(v_draft->'sections') s where s->>'id' = p_section_id)) then raise exception 'INVALID_SECTION'; end if;
  if exists(select 1 from app.idea_ai_operations where workspace_id = v_workspace and state = 'running') then raise exception 'GENERATION_IN_PROGRESS'; end if;
  select count(*) into v_count from app.idea_ai_operations where workspace_id = v_workspace and created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  if v_count >= v_limit then raise exception 'DAILY_GENERATION_LIMIT'; end if;
  insert into app.idea_ai_operations(id,workspace_id,project_id,revision_id,kind,instruction,scope_section_id,model,request_hash)
    values(p_operation_id,v_workspace,p_project_id,p_expected_revision_id,p_kind,p_instruction,p_section_id,p_model,v_hash) returning * into v_op;
  return jsonb_build_object('claimed',true,'operation',private.idea_operation_json(v_op),'draft',v_draft);
end;
$$;

create function app.finish_idea_generation(p_operation_id uuid, p_result jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_workspace uuid := app.current_workspace_id(); v_op app.idea_ai_operations; v_project app.projects;
  v_draft jsonb; v_saved jsonb; v_item jsonb; v_key text;
begin
  if v_workspace is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  perform 1 from app.personal_workspaces where id = v_workspace for update;
  select * into v_op from app.idea_ai_operations where id = p_operation_id and workspace_id = v_workspace for update;
  if not found then raise exception using errcode = 'P0002', message = 'RESOURCE_NOT_FOUND'; end if;
  if v_op.state <> 'running' then return jsonb_build_object('operation',private.idea_operation_json(v_op),'project',app.load_idea_project(v_op.project_id)); end if;
  if jsonb_typeof(p_result) is distinct from 'object' or octet_length(p_result::text) > 64000 then raise exception 'INVALID_AI_RESULT'; end if;
  if v_op.kind = 'ideas' then
    if jsonb_typeof(p_result->'ideas') is distinct from 'array' or (select count(*) from jsonb_object_keys(p_result)) <> 1 then raise exception 'INVALID_AI_RESULT'; end if;
    if jsonb_array_length(p_result->'ideas') <> 5 then raise exception 'INVALID_AI_RESULT'; end if;
    for v_item in select value from jsonb_array_elements(p_result->'ideas') loop
      if jsonb_typeof(v_item) <> 'object' or (select count(*) from jsonb_object_keys(v_item)) <> 5 then raise exception 'INVALID_AI_RESULT'; end if;
      foreach v_key in array array['title','hook','problem','outcome','rationale'] loop
        if jsonb_typeof(v_item->v_key) is distinct from 'string' or char_length(btrim(v_item->>v_key)) not between 1 and 250 then raise exception 'INVALID_AI_RESULT'; end if;
      end loop;
      if char_length(v_item->>'title') > 120 then raise exception 'INVALID_AI_RESULT'; end if;
    end loop;
  else
    select * into strict v_project from app.projects where id = v_op.project_id and workspace_id = v_workspace for update;
    select (r.brief - '_scriptBasis') || jsonb_build_object('sections',p_result->'sections','reviewNotes',p_result->'reviewNotes','durationSeconds',r.target_duration_seconds,'themeId',r.settings->>'themeId')
      into v_draft from app.project_revisions r where id = v_op.revision_id;
    if (select count(*) from jsonb_object_keys(p_result)) <> 2 or jsonb_typeof(p_result->'sections') is distinct from 'array'
      or jsonb_typeof(p_result->'reviewNotes') is distinct from 'array' then raise exception 'INVALID_AI_RESULT'; end if;
    perform private.validate_idea_document(v_draft);
    if jsonb_array_length(p_result->'sections') = 0 then raise exception 'INVALID_AI_RESULT'; end if;
    if v_op.scope_section_id is not null then
      if exists(select 1 from app.project_revisions r join app.script_versions sv on sv.id = r.script_version_id,
        lateral jsonb_array_elements(sv.sections) old_section where r.id = v_op.revision_id and old_section->>'id' <> v_op.scope_section_id
        and not (p_result->'sections' @> jsonb_build_array(old_section))) then raise exception 'UNRELATED_SECTION_CHANGED'; end if;
      if jsonb_array_length(p_result->'sections') <> (select jsonb_array_length(sv.sections) from app.project_revisions r join app.script_versions sv on sv.id = r.script_version_id where r.id = v_op.revision_id) then raise exception 'UNRELATED_SECTION_CHANGED'; end if;
    end if;
    if v_project.lifecycle = 'active' and v_project.current_revision_id = v_op.revision_id then
      v_saved := app.save_idea_draft(v_op.project_id,v_op.revision_id,v_op.id,v_draft);
    end if;
  end if;
  update app.idea_ai_operations set state = 'succeeded', result = p_result, finished_at = now(),
    applied_revision_id = case when v_saved is null then null else (v_saved->>'revisionId')::uuid end
    where id = v_op.id returning * into v_op;
  if v_op.kind = 'ideas' then
    insert into app.ideas(workspace_id,project_id,origin_revision_id,content)
      select v_workspace,v_op.project_id,v_op.revision_id,i from jsonb_array_elements(p_result->'ideas') i;
  end if;
  return jsonb_build_object('operation',private.idea_operation_json(v_op),'project',app.load_idea_project(v_op.project_id));
end;
$$;

create function app.fail_idea_generation(p_operation_id uuid, p_error_code text, p_uncertain boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_op app.idea_ai_operations;
begin
  if p_error_code not in ('PROVIDER_REJECTED','PROVIDER_UNAVAILABLE','INVALID_AI_RESULT','OUTCOME_UNCERTAIN') then raise exception 'INVALID_ERROR_CODE'; end if;
  select * into v_op from app.idea_ai_operations where id = p_operation_id and workspace_id = app.current_workspace_id() for update;
  if not found then raise exception using errcode = 'P0002', message = 'RESOURCE_NOT_FOUND'; end if;
  if v_op.state = 'running' then
    update app.idea_ai_operations set state = case when p_uncertain then 'uncertain' else 'failed' end, error_code = p_error_code, finished_at = now()
      where id = v_op.id returning * into v_op;
  end if;
  return private.idea_operation_json(v_op);
end;
$$;

create function app.resolve_interrupted_idea_request(p_operation_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_op app.idea_ai_operations;
begin
  select * into v_op from app.idea_ai_operations where id = p_operation_id and workspace_id = app.current_workspace_id() for update;
  if not found then raise exception using errcode = 'P0002', message = 'RESOURCE_NOT_FOUND'; end if;
  if v_op.state = 'running' then
    if v_op.created_at > now() - interval '2 minutes' then raise exception 'REQUEST_STILL_RUNNING'; end if;
    update app.idea_ai_operations set state = 'uncertain', error_code = 'INTERRUPTED_REQUEST', finished_at = now() where id = v_op.id returning * into v_op;
  end if;
  return private.idea_operation_json(v_op);
end;
$$;

create function app.approve_idea_script(p_project_id uuid, p_expected_revision_id uuid, p_reviewed boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_workspace uuid := app.current_workspace_id(); v_project app.projects; v_rev app.project_revisions; v_script app.script_versions; v_draft jsonb;
begin
  if v_workspace is null then raise exception using errcode = '42501', message = 'AUTH_REQUIRED'; end if;
  perform 1 from app.personal_workspaces where id = v_workspace for update;
  select * into v_project from app.projects where id = p_project_id and workspace_id = v_workspace and lifecycle = 'active' for update;
  if not found then raise exception using errcode = 'P0002', message = 'RESOURCE_NOT_FOUND'; end if;
  if v_project.current_revision_id is distinct from p_expected_revision_id then raise exception 'REVISION_CONFLICT'; end if;
  if p_reviewed is not true then raise exception 'CONTENT_REVIEW_REQUIRED'; end if;
  select * into strict v_rev from app.project_revisions where id = p_expected_revision_id;
  if v_rev.script_version_id is null then raise exception 'SCRIPT_REQUIRED'; end if;
  v_draft := app.load_idea_project(p_project_id)->'draft';
  if v_rev.brief->>'_scriptBasis' is distinct from private.idea_basis(v_draft) then raise exception 'SCRIPT_STALE'; end if;
  if v_draft->>'inputType' = 'url' and (v_draft->>'sourceConfirmed')::boolean is not true then raise exception 'SOURCE_UNCONFIRMED'; end if;
  select * into strict v_script from app.script_versions where id = v_rev.script_version_id;
  insert into app.approvals(workspace_id,project_id,revision_id,script_version_id,target_hash,actor_user_id)
    values(v_workspace,p_project_id,v_rev.id,v_script.id,v_script.content_hash,auth.uid()) on conflict (revision_id,script_version_id,actor_user_id) do nothing;
  return app.load_idea_project(p_project_id);
end;
$$;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on app.content_source_refs, app.approvals, app.idea_ai_operations from public, anon, authenticated;
grant select on app.content_source_refs, app.approvals, app.idea_ai_operations to authenticated;
grant all on app.content_source_refs, app.approvals, app.idea_ai_operations to service_role;
revoke all on function app.configure_idea_pilot(text,integer), app.idea_capabilities(), app.load_idea_project(uuid), app.save_idea_draft(uuid,uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function private.idea_basis(jsonb), private.validate_idea_document(jsonb), private.idea_operation_json(app.idea_ai_operations) from public, anon, authenticated;
grant execute on function app.configure_idea_pilot(text,integer) to service_role;
grant execute on function app.idea_capabilities(), app.load_idea_project(uuid), app.save_idea_draft(uuid,uuid,uuid,jsonb) to authenticated;
revoke all on function app.begin_idea_generation(uuid,uuid,uuid,text,text,text,text), app.finish_idea_generation(uuid,jsonb), app.fail_idea_generation(uuid,text,boolean), app.resolve_interrupted_idea_request(uuid), app.approve_idea_script(uuid,uuid,boolean) from public, anon, authenticated;
grant execute on function app.begin_idea_generation(uuid,uuid,uuid,text,text,text,text), app.finish_idea_generation(uuid,jsonb), app.fail_idea_generation(uuid,text,boolean), app.resolve_interrupted_idea_request(uuid), app.approve_idea_script(uuid,uuid,boolean) to authenticated;
notify pgrst, 'reload schema';
commit;
