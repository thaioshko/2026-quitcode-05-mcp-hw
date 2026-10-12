# Прогін B — доменний сервер LeadDesk

- Модель: `claude-opus-4-8` · Claude Code 2.1.168 · сесія `adad2cc2-4931-4b53-b385-8990fee94f44`
- MCP-сервери на старті: `leaddesk` (pending)
- Режим дозволів: `default`


> **Як зроблено прогін.** Нова сесія `claude -p` у порожній теці поза репозиторієм (`../ws05-ab-a` / `../ws05-ab-b`),
> `--strict-mcp-config` з рівно одним сервером, `--model opus --effort high` (резолвиться в `claude-opus-4-8`),
> шість запитів із `materials/ab-prompts.md` дослівно, кожен окремим `claude -p --resume <сесія>`.
> `Bash`, `WebFetch`, `WebSearch`, `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Task` — заборонені (`--disallowedTools`).
> Інтерактивних запитів на схвалення в режимі `-p` немає: інструменти сервера дозволено наперед через
> `--allowedTools`. Тому замість тексту діалогу схвалення нижче — точні аргументи кожного виклику (саме їх
> показує діалог схвалення Claude Code). Транскрипт згенеровано з `--output-format stream-json` без правок;
> довгі результати обрізано позначкою. `ToolSearch` — вбудований пошук відкладених інструментів Claude Code, не виклик сервера.

---

## Запит 1

**Людина:** Скільки лідів зараз у статусі qualified? Назви їхні ідентифікатори й компанії.

**Виклик інструмента** `ToolSearch`

```json
{
  "query": "leaddesk leads qualified status list",
  "max_results": 10
}
```

**Результат** `ToolSearch`

```
[tool_reference mcp__leaddesk__leaddesk_find_leads]
[tool_reference mcp__leaddesk__leaddesk_set_lead_status]
[tool_reference TaskList]
[tool_reference CronList]
[tool_reference ListMcpResourcesTool]
[tool_reference TaskCreate]
[tool_reference TaskGet]
[tool_reference TaskUpdate]
[tool_reference DesignSync]
[tool_reference EnterWorktree]
```

**Виклик інструмента** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "qualified",
  "limit": 50
}
```

**Результат** `mcp__leaddesk__leaddesk_find_leads`

```
{"status":"qualified","limit":50,"count":3,"leads":[{"id":"lead_0001","company":"North Wind Yachts","status":"qualified","source":"facebook-ads","budget":2500,"createdAt":"2026-09-20T06:32:40.447Z"},{"id":"lead_0013","company":"Bloom Florists","status":"qualified","source":"facebook-ads","budget":1500,"createdAt":"2026-09-07T13:54:42.854Z"},{"id":"lead_0015","company":"Bloom Florists","status":"qualified","source":"website","budget":2500,"createdAt":"2026-08-18T15:29:38.903Z"}]}
```

**Агент:** Зараз у статусі **qualified** 3 ліди:

| Ідентифікатор | Компанія |
|---|---|
| `lead_0001` | North Wind Yachts |
| `lead_0013` | Bloom Florists |
| `lead_0015` | Bloom Florists |

Зверни увагу, що **Bloom Florists** фігурує двічі — це два окремі ліди (`lead_0013` і `lead_0015`, з різних джерел: facebook-ads і website).

---

## Запит 2

**Людина:** Покажи п'ять найновіших лідів зі статусом new: ідентифікатор, компанія, дата заявки.

**Виклик інструмента** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_find_leads",
  "max_results": 5
}
```

**Результат** `ToolSearch`

```
[tool_reference mcp__leaddesk__leaddesk_find_leads]
```

**Виклик інструмента** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "new",
  "limit": 5
}
```

**Результат** `mcp__leaddesk__leaddesk_find_leads`

```
{"status":"new","limit":5,"count":5,"leads":[{"id":"lead_0002","company":"Rynok Books","status":"new","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},{"id":"lead_0005","company":"Brick & Beam","status":"new","source":"linkedin","budget":500,"createdAt":"2026-09-12T02:42:39.732Z"},{"id":"lead_0004","company":"Green Leaf Market","status":"new","source":"facebook-ads","budget":1500,"createdAt":"2026-08-30T17:46:42.505Z"},{"id":"lead_0018","company":"Green Leaf Market","status":"new","source":"google-ads","budget":null,"createdAt":"2026-07-18T05:08:24.837Z"},{"id":"lead_0012","company":"Lviv Coffee Lab","status":"new","source":"website","budget":null,"createdAt":"2026-07-07T20:23:53.712Z"}]}
```

**Агент:** П'ять найновіших лідів зі статусом **new**:

| Ідентифікатор | Компанія | Дата заявки |
|---|---|---|
| `lead_0002` | Rynok Books | 2026-09-13 |
| `lead_0005` | Brick & Beam | 2026-09-12 |
| `lead_0004` | Green Leaf Market | 2026-08-30 |
| `lead_0018` | Green Leaf Market | 2026-07-18 |
| `lead_0012` | Lviv Coffee Lab | 2026-07-07 |

---

## Запит 3

**Людина:** Який сумарний бюджет лідів у статусі won? Ліди без бюджету в суму не додавай, але скажи, скільки їх.

**Виклик інструмента** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_find_leads",
  "max_results": 5
}
```

**Результат** `ToolSearch`

```
[tool_reference mcp__leaddesk__leaddesk_find_leads]
```

**Виклик інструмента** `mcp__leaddesk__leaddesk_find_leads`

```json
{
  "status": "won",
  "limit": 50
}
```

**Результат** `mcp__leaddesk__leaddesk_find_leads`

```
{"status":"won","limit":50,"count":5,"leads":[{"id":"lead_0011","company":"Lviv Coffee Lab","status":"won","source":"facebook-ads","budget":5000,"createdAt":"2026-09-11T12:34:50.420Z"},{"id":"lead_0006","company":"Nova Dental","status":"won","source":"linkedin","budget":null,"createdAt":"2026-08-31T21:08:50.351Z"},{"id":"lead_0016","company":"Karpaty Tours","status":"won","source":"google-ads","budget":1000,"createdAt":"2026-07-30T05:49:44.585Z"},{"id":"lead_0010","company":"Artisan Bakery","status":"won","source":"linkedin","budget":2500,"createdAt":"2026-07-20T15:04:37.639Z"},{"id":"lead_0017","company":"Hutsul Crafts","status":"won","source":"webinar","budget":500,"createdAt":"2026-06-27T08:23:09.596Z"}]}
```

**Агент:** Сумарний бюджет лідів у статусі **won** — **9000** (lead_0011: 5000 + lead_0016: 1000 + lead_0010: 2500 + lead_0017: 500).

Без бюджету — **1 лід**: `lead_0006` (Nova Dental), його в суму не включено.

---

## Запит 4

**Людина:** Які статуси лідів є в LeadDesk і що кожен із них означає для команди?

**Виклик інструмента** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_set_lead_status,ListMcpResourcesTool,ReadMcpResourceTool",
  "max_results": 5
}
```

**Результат** `ToolSearch`

```
[tool_reference mcp__leaddesk__leaddesk_set_lead_status]
[tool_reference ListMcpResourcesTool]
[tool_reference ReadMcpResourceTool]
```

**Агент:** The tool descriptions reference a resource `leaddesk://reference/statuses`. Let me read it.

**Виклик інструмента** `ReadMcpResourceTool`

```json
{
  "server": "leaddesk",
  "uri": "leaddesk://reference/statuses"
}
```

**Результат** `ReadMcpResourceTool`

```
{"contents":[{"uri":"leaddesk://reference/statuses","mimeType":"text/markdown","text":"# Статуси лідів LeadDesk\n\nП'ять статусів — рівно `LEAD_STATUSES` застосунку. Інших немає.\n\n| Статус | Що означає для команди | Хто і коли переводить |\n|---|---|---|\n| `new` | Заявка прийшла з форми чи іншого джерела, з клієнтом ще ніхто не говорив | Ставиться автоматично під час створення ліда |\n| `contacted` | Менеджер уже зв'язався з клієнтом (дзвінок, лист, месенджер) і клієнт відповів або отримав повідомлення | Менеджер — одразу після першого контакту |\n| `qualified` | Задачу клієнта зрозуміло, бюджет і терміни підходять агенції, є домовленість про кошторис чи зустріч | Менеджер — після розмови, коли відомі задача, бюджет і термін |\n| `won` | Клієнт погодив кошторис або підписав договір; проєкт передано в роботу | Лише власник акаунта чи керівник проєкту — після підписання |\n| `lost` | Клієнт відмовився, обрав іншу агенцію, не відповідає після трьох спроб або запит нам не підходить | Менеджер — із причиною відмови |\n\nПравила:\n\n- Статус змінюється лише інструментом `leaddesk_set_lead_status`, з причиною і після підтвердження людини.\n- Кожна зміна лишає запис в аудиті: `{ action, leadId, at }`, а також попередній і новий статус і причину.\n- Перескакувати статуси можна (наприклад, `new` → `lost`), але причина має пояснювати чому.\n"}]}
```

**Агент:** У LeadDesk рівно **п'ять статусів** лідів. Ось що кожен означає для команди та хто його ставить:

| Статус | Що означає для команди | Хто і коли переводить |
|---|---|---|
| **`new`** | Заявка прийшла з форми чи іншого джерела, з клієнтом ще ніхто не говорив | Ставиться автоматично при створенні ліда |
| **`contacted`** | Менеджер уже зв'язався з клієнтом (дзвінок, лист, месенджер), клієнт відповів або отримав повідомлення | Менеджер — одразу після першого контакту |
| **`qualified`** | Задачу клієнта зрозуміло, бюджет і терміни підходять агенції, є домовленість про кошторис чи зустріч | Менеджер — після розмови, коли відомі задача, бюджет і термін |
| **`won`** | Клієнт погодив кошторис або підписав договір; проєкт передано в роботу | Лише власник акаунта чи керівник проєкту — після підписання |
| **`lost`** | Клієнт відмовився, обрав іншу агенцію, не відповідає після трьох спроб або запит нам не підходить | Менеджер — із причиною відмови |

**Правила роботи зі статусами:**
- Статус змінюється лише інструментом `leaddesk_set_lead_status`, обов'язково з причиною і після підтвердження людини.
- Кожна зміна лишає запис в аудиті (дія, лід, час, попередній і новий статус, причина).
- Перескакувати статуси можна (наприклад, `new` → `lost`), але причина має пояснювати чому.

---

## Запит 5

**Людина:** Ми вже зателефонували в Rynok Books щодо заявки lead_0002. Переведи цей лід у статус contacted.

**Виклик інструмента** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_set_lead_status",
  "max_results": 5
}
```

**Результат** `ToolSearch`

```
[tool_reference mcp__leaddesk__leaddesk_set_lead_status]
```

**Агент:** Переводжу `lead_0002` (Rynok Books) зі статусу **new** → **contacted**, причина — перший контакт телефоном.

**Виклик інструмента** `mcp__leaddesk__leaddesk_set_lead_status`

```json
{
  "leadId": "lead_0002",
  "status": "contacted",
  "reason": "Зателефонували в Rynok Books щодо заявки — відбувся перший контакт із клієнтом."
}
```

**Результат** `mcp__leaddesk__leaddesk_set_lead_status`

```
{"lead":{"id":"lead_0002","company":"Rynok Books","status":"contacted","source":"webinar","budget":500,"createdAt":"2026-09-13T00:52:02.043Z"},"audit":{"action":"lead.status_changed","leadId":"lead_0002","at":"2026-10-12T21:49:53.624Z","from":"new","to":"contacted","reason":"Зателефонували в Rynok Books щодо заявки — відбувся перший контакт із клієнтом."}}
```

**Агент:** Готово ✅

**`lead_0002`** (Rynok Books): **new → contacted**

Запис в аудиті створено:
- Дія: `lead.status_changed`
- Причина: «Зателефонували в Rynok Books щодо заявки — відбувся перший контакт із клієнтом.»

---

## Запит 6

**Людина:** Лід lead_0003 (Metro Logistics) відмовився: обрали іншу агенцію. Познач його як lost і вкажи причину.

**Виклик інструмента** `ToolSearch`

```json
{
  "query": "select:mcp__leaddesk__leaddesk_set_lead_status",
  "max_results": 5
}
```

**Результат** `ToolSearch`

```
[tool_reference mcp__leaddesk__leaddesk_set_lead_status]
```

**Агент:** Переводжу `lead_0003` (Metro Logistics) → **lost**, причина — клієнт обрав іншу агенцію.

**Виклик інструмента** `mcp__leaddesk__leaddesk_set_lead_status`

```json
{
  "leadId": "lead_0003",
  "status": "lost",
  "reason": "Клієнт відмовився — обрав іншу агенцію."
}
```

**Результат** `mcp__leaddesk__leaddesk_set_lead_status`

```
{"lead":{"id":"lead_0003","company":"Metro Logistics","status":"lost","source":"facebook-ads","budget":10000,"createdAt":"2026-07-18T00:14:44.381Z"},"audit":{"action":"lead.status_changed","leadId":"lead_0003","at":"2026-10-12T21:50:06.947Z","from":"contacted","to":"lost","reason":"Клієнт відмовився — обрав іншу агенцію."}}
```

**Агент:** Готово ✅

**`lead_0003`** (Metro Logistics): **contacted → lost**

Запис в аудиті створено:
- Дія: `lead.status_changed`
- Причина: «Клієнт відмовився — обрав іншу агенцію.»

