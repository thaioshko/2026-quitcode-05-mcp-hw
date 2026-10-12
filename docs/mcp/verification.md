# Перевірка (Task A, Task B, бонус E)

- **Інструмент і версія, модель:** Claude Code 2.1.168 · Claude Opus 5.5
- **ОС і термінал, Node:** macOS 26.5.2 · zsh · Node 26.0.0 · MCP Inspector 2.8.0

## Task A — сервер в Inspector

- **Команди**, якими зроблено чотири файли в `docs/mcp/`: як у walkthrough, крок 4, з кореня репозиторію:

  ```bash
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/list > docs/mcp/tools-list.json                                           # exit=0
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=lead_0002 --tool-arg status=contacted --tool-arg "reason=перевірка в Inspector" > docs/mcp/set-status.json   # exit=0
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method tools/call --tool-name leaddesk_set_lead_status \
    --tool-arg leadId=nope --tool-arg status=won --tool-arg reason=ok > docs/mcp/bad-input.json   # exit=5
  npx -y @modelcontextprotocol/inspector@2.8.0 --cli node mcp/leaddesk-server/src/server.mjs \
    --method resources/read --uri leaddesk://reference/statuses > docs/mcp/resource-read.json    # exit=0
  ```

- **`tools-list.json`:** рівно два інструменти. `leaddesk_find_leads` — `readOnlyHint: true`,
  `openWorldHint: false`; `leaddesk_set_lead_status` — `readOnlyHint: false`, `destructiveHint: false`,
  `idempotentHint: false`, `openWorldHint: false`. У кожного параметра є `description` з `.describe(…)`;
  `status` — `enum` рівно з `LEAD_STATUSES` (у пошуку ще `any`), `leadId` — `pattern: ^lead_\d{4}$`,
  `limit` — ціле 1–50, `default: 10`, `reason` — 3–500 символів. Опис `leaddesk_set_lead_status`
  починається з «ЗМІНЮЄ ДАНІ» і вимагає підтвердження людини перед викликом.
- **`bad-input.json`:** зламано два аргументи — `leadId=nope` (не відповідає `^lead_\d{4}$`) і
  `reason=ok` (коротше 3 символів). Результат `"isError": true`, текст:
  `Input validation error: Invalid arguments for tool leaddesk_set_lead_status: leadId: Invalid string: must match pattern /^lead_\d{4}$/, reason: Too small: expected string to have >=3 characters`.
  Inspector завершився з кодом **5** і надрукував у stderr `{"error":{"code":"tool_is_error",…}}`.
- **Бізнес-помилки** (перевірено окремо, не закомічено): `leadId=lead_9999` →
  `isError: true`, «Ліда lead_9999 немає в LeadDesk. Знайдіть правильний ідентифікатор через
  leaddesk_find_leads (status: "any")»; `lead_0002` → `new` (той самий статус) → `isError: true`,
  «уже має статус new: змінювати нічого. Статус не змінено, запис в аудит не додано».
- **`set-status.json`:** `lead_0002` (Rynok Books) `new` → `contacted`. Запис аудиту в
  `structuredContent.audit`:
  `{ "action": "lead.status_changed", "leadId": "lead_0002", "at": "2026-10-12T20:07:07.678Z", "from": "new", "to": "contacted", "reason": "перевірка в Inspector" }`
  — форма `AuditEntry` з `lib/types.ts` плюс що змінилось і чому.
- **`resource-read.json`:** `leaddesk://reference/statuses`, `mimeType: "text/markdown"`, таблиця
  п'яти статусів: що означає, хто і коли переводить.
- **Звірка з ключем A/B** (`materials/ab-prompts.md`) через `leaddesk_find_leads`: qualified — 3
  (`lead_0001`, `lead_0013`, `lead_0015`); п'ять найновіших new — `lead_0002`, `lead_0005`,
  `lead_0004`, `lead_0018`, `lead_0012`; won — 5 лідів, сума 9000, без бюджету `lead_0006`. Збігається.
- **Самоперевірка:** `grep -rc 'console\.log' mcp/leaddesk-server/src` — 0 у кожному файлі;
  `cmp materials/leads.json mcp/leaddesk-server/fixtures/leads.json` — без різниці;
  `npm run lint` і `npm run build` у корені — без помилок, кореневі `package.json` і
  `package-lock.json` не змінені.
- **Що було найважче в описах:** вирішити, що модель має знати з опису, а що — з ресурсу. В описі
  `leaddesk_find_leads` прямо сказано, яких полів **немає** (ім'я, email, текст заявки), щоб агент не
  шукав їх іншим способом, а в описі `limit` — «щоб порахувати всі ліди статусу, беріть 50»: інакше
  запит «скільки лідів у статусі X» з дефолтним `limit=10` міг би дати неповну відповідь. В описі
  `leaddesk_set_lead_status` — що він змінює дані й що спершу треба показати людині лід, поточний і
  новий статус і причину.

## Task B — що зробили агенти з серверами

- **Supabase:** <заповнюється в Task B>
- **Vercel:** <заповнюється в Task B>
- **Figma:** <заповнюється в Task B>
- Що агент зробив сам, без прохання: <заповнюється в Task B>

## Task E (бонус)

- **Варіант:** E1 — HTTP-сервер із захистом Host/Origin.
- **Код:** `mcp/leaddesk-server/src/http.mjs` — та сама фабрика (`src/leaddesk.mjs`), що й у
  `server.mjs`; `createMcpHandler(factory)` з `@modelcontextprotocol/server`, обгорнутий
  `toNodeHandler` з `@modelcontextprotocol/node` (`"2.1.0"`, точна версія в тому самому
  `package.json`). Гварди `localhostHostValidation()` і `localhostOriginValidation()` викликаються
  **в обробнику запиту** до `mcp(req, res)`; слухає лише `127.0.0.1:3333`. Стан (ліди й аудит) — на рівні
  модуля `store.mjs`, тож він спільний для всіх запитів, хоч фабрика й створює `McpServer` на кожен.
- **Запуск:** `node mcp/leaddesk-server/src/http.mjs`; тіло запиту і заголовки — як у walkthrough
  (`body.json` з `_meta` `io.modelcontextprotocol/protocolVersion: 2026-07-28`, масив `H=(…)`);
  `body.json` видалено після перевірки, не закомічено.
- **Чотири відповіді `curl`** (тіло першої скорочено):

  ```text
  $ curl … http://127.0.0.1:3333/mcp                          # звичайний запит
  {"result":{"tools":[{"name":"leaddesk_find_leads",…},{"name":"leaddesk_set_lead_status",…}]},…}
  HTTP 200

  $ curl … -H "Host: evil.example"                             # підроблений Host (DNS rebinding)
  {"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Host: evil.example"},"id":null}
  HTTP 403

  $ curl … -H "Origin: https://evil.example"                   # запит зі сторонньої сторінки
  {"jsonrpc":"2.0","error":{"code":-32000,"message":"Invalid Origin: evil.example"},"id":null}
  HTTP 403

  $ curl … без заголовка MCP-Protocol-Version
  {"jsonrpc":"2.0","error":{"code":-32020,"message":"Bad Request: the request headers and body disagree: the body envelope names protocol version 2026-07-28 but the required MCP-Protocol-Version header is absent","data":{"mismatch":{"header":"(missing)","body":"the body envelope names protocol version 2026-07-28 but the required MCP-Protocol-Version header is absent"}}},"id":1}
  HTTP 400
  ```

- **Висновок:** 200 / 403 / 403 / 400 (`-32020`) — як очікувано. Гварди треба викликати самому:
  за walkthrough, опцію гвардів `toNodeHandler` мовчки ігнорує (сам я цього не перевіряв), і без явного виклику сервер на `127.0.0.1` відповідав би 200 на
  запит, який браузер жертви надіслав би зі сторінки зловмисника через DNS rebinding. Автентифікації
  HTTP-варіант не має — він лише для локального запуску; назовні його не відкриваємо.
