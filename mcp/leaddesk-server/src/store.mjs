// In-memory lead store for the LeadDesk MCP server.
// The fixture is read once and never written back: after a restart the data is the same 20 leads
// as in materials/leads.json. Status changes and the audit trail live only in this process.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Same vocabulary as the app: LEAD_STATUSES in lib/types.ts, leadId() in lib/db.ts.
export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
export const LEAD_ID_PATTERN = /^lead_\d{4}$/;

// Resolved from this module, not from the cwd: Claude Code starts the server from elsewhere.
const FIXTURE = process.env.LEADDESK_FIXTURE ?? fileURLToPath(new URL("../fixtures/leads.json", import.meta.url));

const leads = new Map();
const audit = [];
let loaded;

function load() {
  loaded ??= readFile(FIXTURE, "utf8").then((text) => {
    for (const lead of JSON.parse(text)) leads.set(lead.id, lead);
  });
  return loaded;
}

// The only fields the agent needs for "who is in work" and "move after a call":
// no name, e-mail or request text.
const toPublic = ({ id, company, status, source, budget, createdAt }) => ({ id, company, status, source, budget, createdAt });

export async function findLeads({ status, limit }) {
  await load();
  return [...leads.values()]
    .filter((lead) => status === "any" || lead.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
    .map(toPublic);
}

export class LeadError extends Error {}

export async function setLeadStatus({ leadId, status, reason }) {
  await load();
  const lead = leads.get(leadId);
  if (!lead) {
    throw new LeadError(
      `Ліда ${leadId} немає в LeadDesk. Знайдіть правильний ідентифікатор через leaddesk_find_leads (status: "any").`,
    );
  }
  if (lead.status === status) {
    throw new LeadError(`Лід ${leadId} уже має статус ${status}: змінювати нічого. Статус не змінено, запис в аудит не додано.`);
  }
  const from = lead.status;
  const at = new Date().toISOString();
  const updated = { ...lead, status, updatedAt: at };
  leads.set(leadId, updated);
  // Same shape as AuditEntry in lib/types.ts ({ action, leadId, at }) plus what changed and why.
  const entry = { action: "lead.status_changed", leadId, at, from, to: status, reason };
  audit.push(entry);
  return { lead: toPublic(updated), audit: entry };
}
