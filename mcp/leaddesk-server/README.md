# LeadDesk MCP server

Доменний MCP-сервер LeadDesk: два бізнес-дієслова замість SQL на всю базу.

| Що | Ім'я | Змінює дані |
|---|---|---|
| Інструмент | `leaddesk_find_leads` — ліди за статусом, найновіші першими; лише `id`, `company`, `status`, `source`, `budget`, `createdAt` | ні (`readOnlyHint: true`) |
| Інструмент | `leaddesk_set_lead_status` — новий статус + запис аудиту `{ action, leadId, at, from, to, reason }` | так (`readOnlyHint: false`) |
| Ресурс | `leaddesk://reference/statuses` (`text/markdown`) — що кожен статус означає для команди | — |

Працює офлайн: читає `fixtures/leads.json` (незмінна копія `materials/leads.json`, 20 лідів) один раз,
зміни статусів і аудит тримає в пам'яті процесу. Файл фікстури не переписує ніколи — після
перезапуску дані знову ті самі.

## Запуск

Node ≥ 22.19. З кореня репозиторію:

```bash
(cd mcp/leaddesk-server && npm ci)
node mcp/leaddesk-server/src/server.mjs        # stdio
node mcp/leaddesk-server/src/http.mjs          # бонус E1: http://127.0.0.1:3333/mcp
```

Змінні оточення (усі необов'язкові, секретів немає):

| Змінна | Що робить |
|---|---|
| `LEADDESK_FIXTURE` | інший шлях до фікстури; за замовчуванням `fixtures/leads.json` поруч із сервером |
| `PORT` | порт HTTP-варіанта, за замовчуванням `3333` (слухає лише `127.0.0.1`) |

## Перевірка Inspector'ом

```bash
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs --method tools/list
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method tools/call --tool-name leaddesk_find_leads --tool-arg status=qualified
npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
  --method resources/read --uri leaddesk://reference/statuses
```

Збережені результати — у [`docs/mcp/`](../../docs/mcp/).

## Підключення до Claude Code

Скоуп `local` — шлях до сервера лишається в `~/.claude.json`, у git нічого не потрапляє:

```bash
claude mcp add leaddesk -- node "$(pwd)/mcp/leaddesk-server/src/server.mjs"
```

`leaddesk_set_lead_status` змінює дані: схвалюйте кожен виклик вручну, не додавайте його в `allow`.

## Будова

- `src/server.mjs` — точка входу stdio (`serveStdio(factory)`).
- `src/http.mjs` — точка входу HTTP з гвардами Host/Origin (бонус E1).
- `src/leaddesk.mjs` — фабрика `McpServer`: інструменти, Zod-схеми з `.describe(…)`, ресурс.
- `src/store.mjs` — фікстура, сховище в пам'яті, аудит. Словник — з `lib/types.ts` і `lib/db.ts`.

Жодного виводу в stdout: це канал протоколу. Журнал — лише stderr, без персональних даних.
