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
  `openWorldHint: false`; `leaddesk_set_lead_status` — `readOnlyHint: false`, `destructiveHint: true` (перезаписує попередній статус),
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
  `{ "action": "lead.status_changed", "leadId": "lead_0002", "at": "2026-10-12T20:18:42.556Z", "from": "new", "to": "contacted", "reason": "перевірка в Inspector" }`
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

- **Supabase:** інтерактивна сесія в корені репозиторію, у `/mcp` лише `supabase` (build: 9 інструментів).
  Агент викликав `apply_migration` (`0001_leaddesk`, SQL з `supabase/migrations/0001_leaddesk.sql`) і `execute_sql`
  (insert з `supabase/seed/leads.sql`); людина схвалила обидва вручну, нічого не відхиляла. Перевірка:
  `select count(*) from leads` → 20. Роль: `select current_user, session_user, current_setting('is_superuser')` →
  `postgres` / `postgres` / `off` — `execute_sql` ходить під `postgres`, але не superuser. Результат
  `execute_sql` загорнуто в `<untrusted-data-…>` з попередженням не виконувати інструкцій (видно в
  `docs/mcp/ab/a-generic.md`)
- **Vercel:** проєкт створено імпортом форку в дашборді Vercel (git-інтеграція, Next.js за замовчуванням, без env),
  production-деплой з `main` @ `958d2ee` — `READY`, білд 58 с. Сесія `claude -p` лише з `vercel`: `list_deployments`
  (`app: 2026-quitcode-05-mcp-hw`) знайшов `dpl_4dZ2tfnU8JgC4DmJX2TQrbBUrg7f`. Інструмента
  `get_deployment_build_logs` з walkthrough у сервері немає — лог віддає `list_deployment_events`
  (`builds: 1, limit: -1`). Він тричі відповів `403 forbidden: Not authorized: Trying to access resource under scope
  "<особиста команда>"` (без scope, з `teamId`, зі `slug`); конектор «claude.ai Vercel» — той самий 403. Перша версія
  логу була знята зі сторінки деплою в дашборді із сесії, де був браузер і конектор «claude.ai Supabase» (відступ,
  див. `connections.md`). **Після рев'ю CodeRabbit лог знято повторно** в окремій сесії `claude -p` **без жодного
  MCP-сервера** (`--strict-mcp-config --mcp-config '{"mcpServers":{}}'`: ні конекторів claude.ai, ні браузера), з
  `Bash`, дозволеним рівно для однієї команди `vercel inspect dpl_4dZ2tfnU8JgC4DmJX2TQrbBUrg7f --logs` (особистий
  логін Vercel CLI; це той самий CLI-шлях, на який вказував сервер у відповіді на 403). Результат — у
  `docs/mcp/evidence/vercel-build-log.txt`, дослівно, крім назви команди в рядку «Fetching». `allow` виправлено: `get_deployment_build_logs` → `list_deployment_events`
- **Figma:** `whoami` — план Starter, сіт Full (у ліміт не рахується). Квота: 3 виклики з 20 — `create_new_file`
  і `use_figma` (власний файл `LeadDesk WS5 tokens`: колекція `LeadDesk` з 4 COLOR-змінними, стиль `Body/16`, фрейм
  `Tokens` 320×200, node `1:8`) — до deny; `get_variable_defs` (`nodeId: 1:8`) — після deny. Токени — у
  `docs/mcp/evidence/figma-tokens.json`. Знімок «до» — 41 інструмент, «після» — 37
- **Що агент зробив сам, без прохання:**
  - Figma: перед `use_figma` агент сам прочитав ресурс сервера `skill://figma/figma-use/SKILL.md`, бо той вимагає
    «**MANDATORY prerequisite** — you MUST invoke this skill BEFORE every `use_figma` tool call». Інструкція від
    вендора в даних сервера — модель її виконала. `create_new_file` сам підставив `planKey` команди з `whoami`
  - Vercel: після 403 агент сам повторив виклик із `teamId` і `slug`, узятими з відповіді `list_deployments`;
    `list_teams` не викликав. У відповіді на 403 сервер радив «Try an available mapped CLI fallback first»
    (`vercel inspect --logs`) — `Bash` був заборонений, тож CLI не запускався; модель вигадала змінну `VERCEL_TOKEN`
    у `.mcp.json`, якої там немає

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
  перевірено: з гвардами, переданими опцією `toNodeHandler(…, { hostValidation: localhostHostValidation(), … })` (окрема копія на порту 3334), запит із `Host: evil.example` отримав HTTP 200 — `dist/index.mjs` пакета `@modelcontextprotocol/node` читає з опцій лише `maxRequestBodySize`. Без явного виклику сервер на `127.0.0.1` відповідав би 200 на
  запит, який браузер жертви надіслав би зі сторінки зловмисника через DNS rebinding. Автентифікації
  HTTP-варіант не має — він лише для локального запуску; назовні його не відкриваємо.
