# Підключення MCP-серверів LeadDesk (Task B)

- **Акаунти** (особисті, без клієнтських організацій і команд): Supabase — особистий акаунт, одна організація з
  одним проєктом, створеним для цієї домашки (`xysjkhudzfrgqmhpdcei`, eu-west-1) · Vercel — особистий Hobby-акаунт
  (лише особиста Hobby-команда за замовчуванням, без клієнтських команд) · Figma — особистий
  план Starter, файл `LeadDesk WS5 tokens` створено для домашки в Drafts
- **Третій сервер:** Figma — бо в роботі агенції макети приходять саме з Figma, а урок про права тут найгостріший:
  на сервері звузити нічим (єдиний OAuth-скоуп `mcp:connect`), лише deny на клієнті. Playwright не підключали
- **Vercel CLI на цій машині:** встановлено (`/opt/homebrew/bin/vercel`), `vercel whoami` → особистий користувач (той самий, що в MCP) —
  особистий акаунт без клієнтських команд. CLI не розлогінював: `use_vercel_cli` → `Bash` → CLI діяв би лише в
  межах цього ж акаунта. Жодна команда `vercel` у цій домашці через агента не запускалась

## Сервери

| Сервер | Який доступ | Навіщо нам | Що станеться при компрометації | Чим саме звужено |
|---|---|---|---|---|
| `supabase` | Один проєкт; 9 інструментів: `execute_sql` і `apply_migration` (повний SQL під роллю `postgres`, `is_superuser = off`), `list_tables`, `list_migrations`, `list_extensions`, `get_project_url`, `get_publishable_keys`, `generate_typescript_types`, `search_docs`. Читає й пише всі таблиці проєкту, зокрема імена, email і тексти заявок | Міграція схеми `leads` і сид 20 лідів — дані для прогону A в Task C | Повне читання й зміна бази одноразового проєкту, публікація publishable key. OAuth-токен видано на користувача Supabase: з ним інший клієнт без `project_ref` бачить **усі** проєкти акаунта | `project_ref=xysjkhudzfrgqmhpdcei` (зникає `project_id`, інші проєкти недоступні); `features=database,development,docs` — немає `account` (9 account-інструментів, `list_projects`, `create_project`…), `functions` (Edge Functions — канал назовні), `branching` (платне), `storage`, `debugging`. `read_only` тут свідомо не стоїть — треба `apply_migration`; він є в профілі прогону A. `execute_sql` і `apply_migration` не в `allow` |
| `vercel` | Весь користувач Vercel (OAuth-скоуп `openid`): десятки інструментів — деплої, логи, домени, DNS, env, flags, toolbar, покупки | Знайти деплой LeadDesk і взяти лог білду | Покупки з картки (`buy_*`), деплой у production, роздача посилань в обхід Deployment Protection, коментарі від імені розробника, зміна доменів і env усіх проєктів акаунта | Звузити в URL нічим. `deny` на 11 інструментів, що змінюють стан: `buy_pro`, `buy_credits`, `buy_addon`, `buy_domain`, `deploy_to_vercel`, `get_access_to_vercel_url`, `import-claude-design-from-url`, `reply_to_toolbar_thread`, `edit_toolbar_message`, `change_toolbar_thread_resolve_status`, `add_toolbar_reaction`. В `allow` — лише `list_deployments`, `get_deployment`, `list_deployment_events`. Решта (зокрема `create_project`, `update_project`, `create_record`) не в `allow` — щоразу ручне схвалення. CLI — особистий акаунт |
| `figma` | Увесь користувач Figma (`mcp:connect`): 41 інструмент — читання дизайну, змінних, скріншотів, бібліотек; запис (`use_figma` виконує Plugin API), створення файлів, завантаження ассетів, генеративні інструменти | Змінні й стилі з макета (`get_variable_defs`) | Читання всіх файлів акаунта, створення й зміна файлів у будь-якій команді користувача, витрата ліміту викликів (Starter — 20 на місяць) | Звузити на сервері нічим. `deny` на 4 записуючі: `use_figma`, `create_new_file`, `upload_assets`, `generate_diagram` — перевірено: 41 → 37 інструментів. Генеративні (`generate_image`, `weave_*`, `create_shader`…) не в `allow` — ручне схвалення |

Сервер `leaddesk` (Task A) у `.mcp.json` не входить: у Task C він підключений зі скоупом `local` у порожній теці прогону.

## Supabase: схема й сид

- Міграція `supabase/migrations/0001_leaddesk.sql` створює таблицю `public.leads` (поля `materials/leads.json`;
  `check` на `id ~ '^lead_\d{4}$'` і на п'ять статусів `LEAD_STATUSES`), індекс `(status, created_at desc)`,
  вмикає RLS без політик (ролі `anon`/`authenticated` через Data API не бачать нічого)
- Сид `supabase/seed/leads.sql`: 20 рядків, `lead_0001`–`lead_0020`, згенеровано з `materials/leads.json` без змін
  значень — ті самі, що в `mcp/leaddesk-server/fixtures/leads.json`
- Скільки інструментів Supabase видно з нашим URL: **9** (профіль build); з URL прогону A — **5**. Перелік отримано
  в окремих сесіях `claude -p --strict-mcp-config` запитом «перелічи інструменти, нічого не викликай» (`ToolSearch +supabase`)
- Якими викликами створено схему й дані: інтерактивна сесія `claude` в корені репозиторію, у `/mcp` увімкнено лише
  `supabase` (решту, зокрема конектор «claude.ai Supabase», вимкнено). Людина вручну схвалила `apply_migration`
  (`name: 0001_leaddesk`, SQL міграції) і `execute_sql` (insert сиду); далі `select count(*) from leads` → **20**,
  `select current_user, session_user, current_setting('is_superuser')` → `postgres`, `postgres`, `off`.
  Окрема сесія лише з профілем client (`read_only=true`) до міграції показала порожню схему `public` і нуль міграцій
- Project ref знайдено одним викликом `list_projects` конектора «claude.ai Supabase» (на весь акаунт); результат
  виклику не записано нікуди, крім самого ref

## Сесії: що вмикаємо разом

У кожній сесії — щонайбільше один сервер із правом запису; браузерний сервер — ніколи разом із Supabase. Сесії
агента — `claude -p --strict-mcp-config --mcp-config '{"mcpServers":{<рівно один сервер>}}'`, `--disallowedTools
"Bash WebFetch WebSearch Write Edit Read"`; інтерактивні — з вимкненими в `/mcp` рештою серверів і конекторів.

| Крок | Увімкнено в `/mcp` | Сервер із правом запису в цій сесії |
|---|---|---|
| Вхід (Authenticate) у `vercel` і `figma` | `vercel`, `figma` — агенту нічого не писали, лише вхід | — (жодного виклику) |
| Вхід і міграція й сид | `supabase` (build) | `supabase` |
| Лог білду | `vercel` | —, записуючі інструменти під deny |
| Figma: `whoami`, знімок «до» | `figma` | — (жодного запису) |
| Figma: тестовий файл (до deny) | `figma`; `--allowedTools whoami create_new_file use_figma` | `figma` — створення власного файлу з 4 змінними й фреймом |
| Figma: знімок «після», `get_variable_defs` | `figma` | —, записуючі під deny |
| A/B, прогін A | `supabase` (client, `read_only=true`) | — (`read_only`) |
| A/B, прогін B | `leaddesk` | `leaddesk` (пам'ять процесу) |

**Відступ від правил — чесно.** Частину кроків виконувала сесія-оркестратор Claude Code (desktop), у якій
одночасно були доступні: браузер **Claude in Chrome** (справжній профіль Chrome, де людина сама увійшла у Vercel),
конектори claude.ai — зокрема «claude.ai Supabase» і «claude.ai Vercel» на весь акаунт — і `Bash`. У цій сесії:
браузером імпортовано форк у дашборді Vercel (крок 5.1 walkthrough передбачає, що це робить людина) і прочитано лог
білду; конектором «claude.ai Supabase» один раз викликано `list_projects` (лише щоб дізнатися ref), конектором
«claude.ai Vercel» — `list_deployment_events` (403). Запису в Supabase з цієї сесії не було, але правило «браузерний
сервер ніколи разом із Supabase» і правило №4 («у браузер агента не логінимось») у ній формально порушено: браузер
із логіном і доступ до Supabase на весь акаунт були в одній сесії. **Щоб відповідати вимогам, ці кроки треба повторити:** імпорт форку й читання логу білду — вручну людиною в
дашборді Vercel або в окремій сесії, де вимкнено конектори claude.ai (зокрема «claude.ai Supabase») і немає
браузерного розширення. Опис вище лишаємо як документацію відступу; повторний прогін записуємо в `verification.md`,
розділ Task B.

## До і після звуження: третій сервер

- Як отримали перелік: нова сесія `claude -p --strict-mcp-config` лише з `figma`, запит «Перелічи всі інструменти
  сервера figma, які тобі зараз доступні: повні імена (mcp__figma__...), по одному на рядок… Інструменти figma не
  викликай»; агент шукав через `ToolSearch +figma` (`max_results 100`). Перша спроба з `max_results 20` обрізала
  список на 20 — повторили
- `docs/mcp/evidence/mcp-before.txt`: **41** інструмент
- `docs/mcp/evidence/mcp-after.txt`: **37** інструментів; зникли рівно `create_new_file`, `generate_diagram`,
  `upload_assets`, `use_figma` (`diff` двох файлів)
