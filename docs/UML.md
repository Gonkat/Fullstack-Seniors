# UML-модель «Модус Сигнал»

Диаграммы описывают текущий MVP на Astro 5 + Preact и синхронизированы с кодом:

- роли, статусы, переходы и маршрутизация — `src/lib/domain.js`;
- создание, комментарии, решения и уведомления — `src/lib/mutations.js`;
- состав сущностей и демо-данные — `server/seed.js`;
- контракт хранения — `src/lib/backend.js`, `server/index.js`.

Формат — **Mermaid**. Он рендерится в GitHub/GitLab, VS Code и большинстве Markdown-редакторов. Для вставки в презентацию можно открыть нужный блок в [Mermaid Live Editor](https://mermaid.live/) и экспортировать PNG/SVG.

---

## 1. Диаграмма вариантов использования

```mermaid
flowchart LR
  E["Сотрудник"]
  M["Руководитель"]
  A["Администратор"]
  S["Система"]

  subgraph SYSTEM["Модус Сигнал"]
    UC1(["Создать обращение"])
    UC2(["Смотреть свои обращения"])
    UC3(["Дополнить обращение"])
    UC4(["Ответить на уточнение"])
    UC5(["Подтвердить результат"])
    UC6(["Получать уведомления"])
    UC7(["Вести входящие обращения"])
    UC8(["Комментировать и уточнять"])
    UC9(["Назначить ответственного"])
    UC10(["Изменить статус, приоритет и срок"])
    UC11(["Зафиксировать решение"])
    UC12(["Смотреть аналитику"])
    UC13(["Управлять категориями и правилами"])
    UC14(["Смотреть всех пользователей"])
    UC15(["Сбросить демо-данные"])
    UC16(["Маршрутизировать по категории"])
  end

  E --> UC1
  E --> UC2
  E --> UC3
  E --> UC4
  E --> UC5
  E --> UC6

  M --> UC7
  M --> UC8
  M --> UC9
  M --> UC10
  M --> UC11
  M --> UC12
  M --> UC6

  A --> UC7
  A --> UC8
  A --> UC9
  A --> UC10
  A --> UC11
  A --> UC12
  A --> UC13
  A --> UC14
  A --> UC15
  A --> UC6

  S --> UC16
```

**Что показывает:** три роли и автоматическая маршрутизация. Сотрудник работает со своими обращениями, руководитель — с входящими и результатом, администратор — со справочником и демо-стендом. Внутренние заметки и аналитика ограничены матрицей доступа.

---

## 2. Компонентная диаграмма

```mermaid
flowchart LR
  subgraph BROWSER["Браузер"]
    UI["Astro 5 + Preact<br/>экраны и состояние"]
    LOGIC["src/lib<br/>domain / views / mutations"]
    ADAPTER["backend.js<br/>контракт /api/*"]
    UI --> LOGIC
    UI --> ADAPTER
  end

  subgraph DEMO["Демо-режим"]
    MOKKY[("Mokky.dev<br/>/test")]
  end

  subgraph SERVER["Серверный режим"]
    BUILD["dist/<br/>Astro build"]
    API["Express 5<br/>server/index.js"]
    SHARED["public/shared<br/>domain / mutations"]
    JSON[("JSON<br/>data/")]
    FILES[("Файлы<br/>uploads/")]
    API --> SHARED
    API --> JSON
    API --> FILES
    API --> BUILD
  end

  ADAPTER -->|"apiMode = mokky"| MOKKY
  ADAPTER -->|"apiMode = server"| API
  API -->|"HTML / JS / CSS"| UI
  API -.->|"целевая замена"| PG[("PostgreSQL")]
```

**Что показывает:** один клиент и один контракт `/api/*`; адаптер переключает Mokky.dev и собственный Express API. В серверном режиме Express также раздаёт собранный Astro-фронтенд из `dist/`. PostgreSQL показан как целевое хранилище, а не как текущая реализация.

---

## 3. ER-модель данных

```mermaid
erDiagram
  USER ||--o{ APPEAL : "автор"
  USER |o--o{ APPEAL : "ответственный"
  USER }o--o{ CATEGORY : "managedCategories"
  CATEGORY ||--o{ APPEAL : "категория"
  APPEAL ||--o{ EVENT : "история"
  APPEAL ||--o{ COMMENT : "комментарии"
  APPEAL ||--o{ NOTIFICATION : "уведомления"
  USER ||--o{ EVENT : "действие"
  USER ||--o{ COMMENT : "автор"
  USER ||--o{ NOTIFICATION : "получатель"

  USER {
    string id PK
    string name
    string role "employee / manager / admin"
    string department
    string position
    json managedCategories "категории руководителя"
  }

  CATEGORY {
    string id PK
    string name
    string department
    string assigneeId FK "ответственный по умолчанию"
    string description
    boolean isActive
  }

  APPEAL {
    string id PK
    string number UK "A-001"
    string type "problem / suggestion / praise"
    string categoryId FK
    string department
    string priority "high / medium / low"
    string status "new / in_review / ..."
    string authorId FK
    string assigneeId FK
    string subject
    string description
    string solution "предложенное решение"
    json attachments "до 3 файлов"
    datetime createdAt
    datetime updatedAt
    datetime firstResponseAt
    datetime resolvedAt
    datetime closedAt
    datetime dueAt "ручной срок"
    json decision "текст и действия"
  }

  EVENT {
    string id PK
    string appealId FK
    string type "created / status / comment / decision / ..."
    string actorId FK
    datetime createdAt
    string text
    json meta
  }

  COMMENT {
    string id PK
    string appealId FK
    string authorId FK
    string text
    boolean internal "внутренняя заметка"
    datetime createdAt
  }

  NOTIFICATION {
    string id PK
    string userId FK
    string appealId FK
    string text
    boolean read
    datetime createdAt
  }
```

`attachments` — **встроенный массив** в обращении, а не отдельная коллекция. В нём хранятся имя, размер, MIME-тип и URL/Data URL файла. `decision` также встроен в обращение и дополняется событием в истории.

---

## 4. Состояния обращения

```mermaid
stateDiagram-v2
  state "Новое" as new
  state "На рассмотрении" as in_review
  state "В работе" as in_progress
  state "Ожидает уточнения" as needs_clarification
  state "Реализовано" as implemented
  state "Отклонено" as rejected
  state "Закрыто" as closed

  [*] --> new: создание и маршрутизация
  new --> in_review: взять в работу
  new --> in_progress: начать работу
  new --> needs_clarification: запросить уточнение
  new --> rejected: отклонить

  in_review --> in_progress: начать работу
  in_review --> needs_clarification: запросить уточнение
  in_review --> implemented: реализовано
  in_review --> rejected: отклонить

  in_progress --> needs_clarification: запросить уточнение
  in_progress --> implemented: реализовано
  in_progress --> rejected: отклонить

  needs_clarification --> in_review: автор ответил
  needs_clarification --> in_progress: продолжить работу
  needs_clarification --> rejected: отклонить

  implemented --> closed: автор подтвердил
  implemented --> in_progress: вернуть в работу

  rejected --> closed: автор подтвердил
  rejected --> in_review: пересмотреть

  closed --> in_review: вернуть в работу
  closed --> [*]

  note right of needs_clarification
    Автор может вернуть обращение
    в работу только переходом
    needs_clarification → in_review
  end note

  note right of closed
    Закрытие подтверждает автор.
    Повторное открытие возможно
    только по правилам системы.
  end note
```

**Полномочия на переходы:**

| Роль | Что может |
|---|---|
| Руководитель / ответственный / администратор | все переходы, разрешённые из текущего статуса |
| Автор | `needs_clarification → in_review`, `implemented → closed`, `rejected → closed`, `closed → in_review` |
| Другие сотрудники | не могут изменять обращение |

SLA не является статусом: срок первого ответа и срок рассмотрения рассчитываются по приоритету и отображаются флагом просрочки. Ручной `dueAt` заменяет расчётный срок рассмотрения.

---

## 5. Последовательность основного сценария

```mermaid
sequenceDiagram
  autonumber
  actor E as Сотрудник
  participant UI as Astro + Preact
  participant A as backend.js
  participant S as Mokky / API
  actor M as Руководитель
  participant N as Уведомления

  E->>UI: выбирает тип, категорию и приоритет
  E->>UI: описывает проблему и прикладывает файлы
  UI->>A: POST /api/appeals
  A->>A: resolveAssignee(category)
  A->>S: appeal + событие created + уведомление
  S-->>A: сохранено
  A-->>UI: A-023 и ответственный
  UI-->>E: карточка, срок первого ответа и рассмотрения

  M->>UI: открывает входящие
  UI->>A: GET /api/appeals/:id
  A->>S: обращение, история, комментарии
  S-->>A: данные
  A-->>UI: карточка

  M->>UI: комментарий или запрос уточнения
  UI->>A: POST /api/appeals/:id/comments
  A->>S: комментарий + событие + уведомление автору
  S-->>N: новое уведомление
  N-->>E: обращение ожидает уточнения

  E->>UI: отвечает на уточнение
  UI->>A: POST /api/appeals/:id/comments
  A->>S: комментарий, статус in_review, событие
  S-->>N: уведомление ответственному

  M->>UI: фиксирует решение «Реализовано»
  UI->>A: POST /api/appeals/:id/decision
  A->>S: решение, статус implemented, событие, уведомление
  S-->>N: уведомление автору
  N-->>E: решение доступно

  E->>UI: подтверждает закрытие
  UI->>A: PATCH /api/appeals/:id (status=closed)
  A->>S: статус closed, closedAt, событие
  S-->>N: уведомление ответственному

  Note over A,S: В Mokky контракт исполняется в браузере.<br/>В server-режиме те же операции выполняет Express API.
  Note over UI,S: Аналитика строится по сохранённым обращениям, событиям и срокам.
```

**Что показывает:** сквозной путь из ТЗ — создание, автоматическая маршрутизация, уточнение, решение и подтверждение автором. Номер `A-023` использован как пример следующего обращения после демо-набора из 22 записей.

---

## Соответствие слайдам защиты

| Диаграмма | Куда показывать |
|---|---|
| Use case | «Пользователи и сценарии» |
| Компоненты | «Что под капотом» |
| ER | «Данные и хранение» |
| Состояния | «Процесс рассмотрения и SLA» |
| Sequence | «Основной сценарий» или ответ на вопрос «как это работает?» |

При изменении статусов, ролей или состава сущностей обновляйте этот файл вместе с `src/lib/domain.js` и `server/seed.js`, чтобы диаграммы не расходились с MVP.
