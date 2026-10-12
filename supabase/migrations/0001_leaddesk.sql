-- LeadDesk leads table for WS5 (Task B). Fields mirror materials/leads.json;
-- status is limited to LEAD_STATUSES from lib/types.ts, id follows leadId() in lib/db.ts.
create table if not exists public.leads (
  id          text primary key check (id ~ '^lead_\d{4}$'),
  full_name   text not null,
  company     text not null,
  email       text not null,
  source      text not null,
  status      text not null default 'new'
              check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  budget      integer check (budget is null or budget >= 0),
  message     text not null,
  created_at  timestamptz not null
);

create index if not exists leads_status_created_at_idx on public.leads (status, created_at desc);

-- No policies: with RLS on, the anon and authenticated roles see nothing through the Data API.
-- Only the developer (MCP / service role) reads this table.
alter table public.leads enable row level security;

comment on table public.leads is 'LeadDesk leads (synthetic, WS5). Status meanings: see leaddesk://reference/statuses in mcp/leaddesk-server.';
