// LeadDesk as an MCP server: two business verbs instead of SQL on the whole database.
// The factory is shared by the stdio entry point (server.mjs) and the HTTP one (http.mjs).
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { LEAD_ID_PATTERN, LEAD_STATUSES, LeadError, findLeads, setLeadStatus } from "./store.mjs";

const STATUSES_URI = "leaddesk://reference/statuses";

const STATUSES_MD = `# Статуси лідів LeadDesk

П'ять статусів — рівно \`LEAD_STATUSES\` застосунку. Інших немає.

| Статус | Що означає для команди | Хто і коли переводить |
|---|---|---|
| \`new\` | Заявка прийшла з форми чи іншого джерела, з клієнтом ще ніхто не говорив | Ставиться автоматично під час створення ліда |
| \`contacted\` | Менеджер уже зв'язався з клієнтом (дзвінок, лист, месенджер) і клієнт відповів або отримав повідомлення | Менеджер — одразу після першого контакту |
| \`qualified\` | Задачу клієнта зрозуміло, бюджет і терміни підходять агенції, є домовленість про кошторис чи зустріч | Менеджер — після розмови, коли відомі задача, бюджет і термін |
| \`won\` | Клієнт погодив кошторис або підписав договір; проєкт передано в роботу | Лише власник акаунта чи керівник проєкту — після підписання |
| \`lost\` | Клієнт відмовився, обрав іншу агенцію, не відповідає після трьох спроб або запит нам не підходить | Менеджер — із причиною відмови |

Правила:

- Статус змінюється лише інструментом \`leaddesk_set_lead_status\`, з причиною і після підтвердження людини.
- Кожна зміна лишає запис в аудиті: \`{ action, leadId, at }\`, а також попередній і новий статус і причину.
- Перескакувати статуси можна (наприклад, \`new\` → \`lost\`), але причина має пояснювати чому.
`;

const fail = (message) => ({ isError: true, content: [{ type: "text", text: message }] });

const fmtLead = (l) =>
  `${l.id} · ${l.company} · ${l.status} · ${l.source} · бюджет ${l.budget ?? "—"} · ${l.createdAt.slice(0, 10)}`;

export const factory = () => {
  const server = new McpServer({ name: "leaddesk", version: "0.1.0" });

  server.registerTool(
    "leaddesk_find_leads",
    {
      title: "Знайти ліди за статусом",
      description:
        "Повертає ліди LeadDesk із заданим статусом, найновіші першими: id, компанія, статус, джерело, бюджет (null — не вказано) і дата заявки. " +
        "Імені, email і тексту заявки не повертає. Тільки читає, нічого не змінює. " +
        `Що означає кожен статус — у ресурсі ${STATUSES_URI}.`,
      inputSchema: {
        status: z
          .enum([...LEAD_STATUSES, "any"])
          .describe("Який статус шукати: new, contacted, qualified, won або lost; any — ліди з будь-яким статусом"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(10)
          .describe("Скільки лідів повернути, від 1 до 50; за замовчуванням 10. Щоб порахувати всі ліди статусу, беріть 50"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, limit }) => {
      const found = await findLeads({ status, limit });
      const head = `Знайдено ${found.length} лід(ів) зі статусом ${status} (ліміт ${limit}), найновіші першими:`;
      return {
        content: [{ type: "text", text: found.length ? `${head}\n${found.map(fmtLead).join("\n")}` : `Лідів зі статусом ${status} немає.` }],
        structuredContent: { status, limit, count: found.length, leads: found },
      };
    },
  );

  server.registerTool(
    "leaddesk_set_lead_status",
    {
      title: "Змінити статус ліда",
      description:
        "ЗМІНЮЄ ДАНІ: переводить один лід LeadDesk у новий статус і пише запис в аудит (хто, що, коли, з якого статусу в який і чому). " +
        "Перед викликом покажіть людині лід, поточний і новий статус і причину та дочекайтеся її підтвердження. " +
        "Невідомий лід або той самий статус — помилка, нічого не змінюється. " +
        `Що означає кожен статус — у ресурсі ${STATUSES_URI}.`,
      inputSchema: {
        leadId: z
          .string()
          .regex(LEAD_ID_PATTERN)
          .describe("Ідентифікатор ліда у форматі lead_ і чотири цифри, напр. lead_0002. Не знаєте — знайдіть через leaddesk_find_leads"),
        status: z.enum(LEAD_STATUSES).describe("Новий статус: new, contacted, qualified, won або lost"),
        reason: z
          .string()
          .trim()
          .min(3)
          .max(500)
          .describe("Чому змінюємо статус, 3–500 символів: що сталося (дзвінок, відмова, підписання). Потрапляє в аудит"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async (args) => {
      try {
        const { lead, audit } = await setLeadStatus(args);
        return {
          content: [
            {
              type: "text",
              text: `Статус ${lead.id} (${lead.company}) змінено: ${audit.from} → ${audit.to}. Причина: ${audit.reason}. Аудит: ${audit.action} о ${audit.at}.`,
            },
          ],
          structuredContent: { lead, audit },
        };
      } catch (e) {
        if (e instanceof LeadError) return fail(e.message);
        throw e;
      }
    },
  );

  server.registerResource(
    "leaddesk-statuses",
    STATUSES_URI,
    {
      title: "Статуси лідів LeadDesk",
      description: "П'ять статусів ліда і що кожен означає для команди: коли лід стає contacted, qualified, won чи lost і хто його переводить",
      mimeType: "text/markdown",
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: STATUSES_MD }] }),
  );

  return server;
};
