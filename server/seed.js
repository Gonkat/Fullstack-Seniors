'use strict';

/**
 * Демонстрационные данные: 20 обращений из датасета хакатона,
 * синтетические пользователи, категории и правила маршрутизации.
 * Все совпадения с реальными людьми и процессами отсутствуют.
 */

const { STATUSES } = require('./domain');

const CATEGORY_DEFS = [
  ['c-01', 'Межотдельное взаимодействие', 'Закупки', 'm-pavel', 'Заявки, передача данных между подразделениями'],
  ['c-02', 'Информационная прозрачность', 'Продажи', 'm-natalia', 'Доступ к статусам и контрольным датам'],
  ['c-03', 'Каталог и данные', 'Проектирование', 'm-roman', 'Номенклатура, карточки позиций, спецификации'],
  ['c-04', 'Обучение', 'HR', 'm-svetlana', 'Внутренние занятия, материалы, календарь'],
  ['c-05', 'Документооборот', 'Бухгалтерия', 'm-irina', 'Пакеты документов, этапы согласования'],
  ['c-06', 'Регламенты', 'Управление процессами', 'm-alina', 'Инструкции, памятки, владельцы процессов'],
  ['c-07', 'Интеграции и IT', 'IT', 'm-viktor', 'Корпоративные системы и обмен данными'],
  ['c-08', 'Знания и наставничество', 'HR', 'm-svetlana', 'Передача опыта, база знаний'],
  ['c-09', 'Договорная работа', 'Продажи', 'm-ilya', 'Приложения, согласования, версии договоров'],
  ['c-10', 'Задачи и коммуникации', 'Продажи', 'm-natalia', 'Правила закрытия задач и обсуждений'],
  ['c-11', 'Оперативность', 'Продажи', 'm-natalia', 'Сроки ответа смежных подразделений'],
  ['c-12', 'Коммуникации', 'IT', 'm-viktor', 'Каналы связи, фиксация итоговых решений'],
  ['c-13', 'Проектная деятельность', 'Проектный офис', 'm-egor', 'Спецификации, версии, изменения состава'],
  ['c-14', 'Планирование ресурсов', 'Проектирование', 'm-andrey', 'Загрузка команд и сроки запуска'],
  ['c-15', 'Постановка задач', 'Продажи', 'm-natalia', 'Форматы поручений и шаблоны задач'],
  ['c-16', 'Корпоративная среда', 'Административный отдел', 'm-oleg', 'Офис, зоны отдыха, условия работы'],
  ['c-17', 'Хранение документов', 'Бухгалтерия', 'm-marina', 'Общие папки, правила именования, архив'],
  ['c-18', 'Прозрачность результатов', 'HR', 'm-svetlana', 'Публикация итогов внутренних улучшений'],
];

const USER_DEFS = [
  ['u-anna', 'Анна Соколова', 'employee', 'Закупки', 'Менеджер по закупкам'],
  ['u-igor', 'Игорь Мельник', 'employee', 'Проектирование', 'Инженер-проектировщик'],
  ['u-maria', 'Мария Ким', 'employee', 'Бухгалтерия', 'Специалист по документообороту'],
  ['u-dmitry', 'Дмитрий Орлов', 'employee', 'Продажи', 'Менеджер по продажам'],
  ['u-elena', 'Елена Волкова', 'employee', 'Проектный офис', 'Координатор проекта'],
  ['u-sergey', 'Сергей Абрамов', 'employee', 'Проектный офис', 'Руководитель проекта'],
  ['u-olga', 'Ольга Лебедева', 'employee', 'Административный отдел', 'Офис-менеджер'],
  ['m-pavel', 'Павел Гусев', 'manager', 'Закупки', 'Руководитель закупок'],
  ['m-natalia', 'Наталья Ершова', 'manager', 'Продажи', 'Руководитель направления'],
  ['m-andrey', 'Андрей Титов', 'manager', 'Проектирование', 'Руководитель проектирования'],
  ['m-irina', 'Ирина Данилова', 'manager', 'Бухгалтерия', 'Руководитель бухгалтерии'],
  ['m-viktor', 'Виктор Соловьёв', 'manager', 'IT', 'Руководитель IT'],
  ['m-svetlana', 'Светлана Романова', 'manager', 'HR', 'Руководитель обучения и внутренних коммуникаций'],
  ['m-oleg', 'Олег Крылов', 'manager', 'Административный отдел', 'Административный руководитель'],
  ['m-egor', 'Егор Лапшин', 'manager', 'Проектный офис', 'Руководитель проектов'],
  ['m-alina', 'Алина Ковалёва', 'manager', 'Управление процессами', 'Ответственный за процессы'],
  ['m-roman', 'Роман Захаров', 'manager', 'Проектирование', 'Ответственный за номенклатуру'],
  ['m-ilya', 'Илья Кузнецов', 'manager', 'Продажи', 'Ответственный за договоры'],
  ['m-marina', 'Марина Белова', 'manager', 'Бухгалтерия', 'Администратор документов'],
  ['a-alexey', 'Алексей Смирнов', 'admin', 'IT', 'Администратор системы'],
];

const MANAGED = {
  'm-pavel': ['c-01'],
  'm-natalia': ['c-02', 'c-10', 'c-11', 'c-15'],
  'm-andrey': ['c-14'],
  'm-irina': ['c-05'],
  'm-viktor': ['c-07', 'c-12'],
  'm-svetlana': ['c-04', 'c-08', 'c-18'],
  'm-oleg': ['c-16'],
  'm-egor': ['c-13'],
  'm-alina': ['c-06'],
  'm-roman': ['c-03'],
  'm-ilya': ['c-09'],
  'm-marina': ['c-17'],
};

const APPEAL_DEFS = [
  {
    number: 'A-001', type: 'problem', categoryId: 'c-01', priority: 'medium', status: 'new',
    authorId: 'u-anna', assigneeId: 'm-pavel', createdAgoHours: 20,
    subject: 'В заявках на закупку не хватает назначения и параметров изделия',
    description: 'В заявках на приобретение оборудования иногда не хватает назначения изделия и требуемых параметров. Из-за этого приходится возвращаться к автору заявки с уточнениями, а срок подбора оборудования увеличивается.',
    solution: 'Добавить в форму заявки обязательные поля «назначение изделия» и «требуемые параметры», чтобы сократить число уточнений.',
    timeline: [],
  },
  {
    number: 'A-002', type: 'suggestion', categoryId: 'c-02', priority: 'medium', status: 'in_review',
    authorId: 'u-anna', assigneeId: 'm-natalia', createdAgoHours: 74,
    subject: 'Показывать поставщикам краткий статус проекта',
    description: 'При общении с поставщиками полезно видеть общую стадию проекта без доступа к коммерческим деталям. Сейчас приходится каждый раз уточнять стадию у коллег, которые ведут проект.',
    solution: 'Показывать краткий статус проекта и ориентировочные контрольные даты без раскрытия коммерческих условий.',
    timeline: [
      { kind: 'comment', by: 'm-natalia', atAgoHours: 60, text: 'Идея понятна. Нужно определить перечень доступных статусов и источник их обновления, чтобы поставщики не видели устаревшие данные.' },
      { kind: 'status', by: 'm-natalia', atAgoHours: 58, status: 'in_review', text: 'Определяем перечень статусов совместно с проектным офисом.' },
    ],
  },
  {
    number: 'A-003', type: 'problem', categoryId: 'c-03', priority: 'high', status: 'in_progress',
    authorId: 'u-igor', assigneeId: 'm-roman', createdAgoHours: 192,
    subject: 'Разные обозначения одной позиции в рабочих материалах',
    description: 'В рабочих материалах иногда встречаются разные обозначения одного изделия. Это увеличивает время проверки спецификации: приходится вручную сверять артикулы и описания.',
    solution: 'Нужен понятный способ находить актуальную карточку позиции и правило проверки обозначений перед выпуском спецификации.',
    timeline: [
      { kind: 'comment', by: 'm-roman', atAgoHours: 181, text: 'Пришлите, пожалуйста, 2–3 примера спецификаций, где встречаются расхождения. По ним подготовим правило проверки.' },
      { kind: 'comment', by: 'u-igor', atAgoHours: 174, text: 'Примеры отправил в рабочую папку, там же отметил строки с разными обозначениями.' },
      { kind: 'status', by: 'm-roman', atAgoHours: 170, status: 'in_progress', text: 'Готовим правило сверки номенклатуры, проверяем на примерах.' },
    ],
  },
  {
    number: 'A-004', type: 'suggestion', categoryId: 'c-04', priority: 'low', status: 'implemented',
    authorId: 'u-anna', assigneeId: 'm-svetlana', createdAgoHours: 960,
    subject: 'Короткие занятия по новым товарным линейкам',
    description: 'Было бы полезно проводить короткие занятия по новым товарным линейкам с разбором типовых запросов. Сейчас информацию приходится собирать самостоятельно из документов производителей.',
    solution: 'Составить календарь коротких встреч по новым линейкам с разбором типовых запросов клиентов.',
    timeline: [
      { kind: 'comment', by: 'm-svetlana', atAgoHours: 900, text: 'Формат поддерживаю. Собираем вопросы от закупок и продаж, чтобы занятие было практическим.' },
      { kind: 'decision', by: 'm-svetlana', atAgoHours: 720, status: 'implemented', text: 'Запланирован пробный обучающий семинар по новой линейке. Формат 40 минут с разбором типовых запросов.', actions: 'Проведён пробный семинар, материалы размещены во внутренней базе знаний.' },
    ],
  },
  {
    number: 'A-005', type: 'problem', categoryId: 'c-05', priority: 'medium', status: 'needs_clarification',
    authorId: 'u-maria', assigneeId: 'm-irina', createdAgoHours: 96,
    subject: 'Непонятно, на каком этапе находится пакет документов',
    description: 'При обработке документов между подразделениями возникают дополнительные вопросы о том, на каком этапе находится пакет. Приходится выяснять это в переписке, что занимает время у обеих сторон.',
    solution: 'Хотелось бы видеть ответственного и текущий статус пакета документов в одном месте.',
    timeline: [
      { kind: 'clarification', by: 'm-irina', atAgoHours: 80, status: 'needs_clarification', text: 'Уточните, пожалуйста, какие виды документов и ключевые этапы согласования важны в первую очередь — от этого зависит состав статусов.' },
    ],
  },
  {
    number: 'A-006', type: 'suggestion', categoryId: 'c-06', priority: 'medium', status: 'in_review',
    authorId: 'u-maria', assigneeId: 'm-alina', createdAgoHours: 120,
    subject: 'Памятка для операций с участием нескольких подразделений',
    description: 'Операции, в которых последовательно участвуют несколько подразделений, описаны в разных местах. Новым сотрудникам сложно понять порядок шагов и точки передачи ответственности.',
    solution: 'Собрать короткую пошаговую памятку и определить порядок её актуализации и владельца процесса.',
    timeline: [
      { kind: 'comment', by: 'm-alina', atAgoHours: 101, text: 'Согласен, что нужен владелец процесса. Предлагаю начать с двух самых частых операций.' },
      { kind: 'status', by: 'm-alina', atAgoHours: 98, status: 'in_review', text: 'Согласовываем черновик памятки и владельца процесса.' },
    ],
  },
  {
    number: 'A-007', type: 'problem', categoryId: 'c-07', priority: 'high', status: 'new',
    authorId: 'u-maria', assigneeId: 'm-viktor', createdAgoHours: 48,
    subject: 'Повторный ввод одних и тех же данных в разных системах',
    description: 'Иногда повторный ввод одних и тех же сведений в разных рабочих системах занимает много времени и приводит к расхождениям в данных.',
    solution: 'Нужна оценка, какие операции можно синхронизировать безопасно, без риска нарушить учёт.',
    timeline: [],
  },
  {
    number: 'A-008', type: 'suggestion', categoryId: 'c-08', priority: 'low', status: 'closed',
    authorId: 'u-maria', assigneeId: 'm-irina', createdAgoHours: 1320,
    subject: 'Памятка по типовым ошибкам для новых сотрудников',
    description: 'При передаче сложной задачи новому сотруднику полезен короткий разбор типовых ошибок и контактов, к которым можно обратиться за помощью. Сейчас всё передаётся устно.',
    solution: 'Сделать короткую памятку с типовыми ошибками и контактами для помощи.',
    timeline: [
      { kind: 'comment', by: 'm-irina', atAgoHours: 1280, text: 'Согласна. Соберём памятку по двум самым частым операциям, дальше расширим.' },
      { kind: 'decision', by: 'm-irina', atAgoHours: 1200, status: 'implemented', text: 'Создана учебная инструкция с типовыми ошибками и контактами ответственных.', actions: 'Инструкция размещена в общей папке подразделения.' },
      { kind: 'status', by: 'u-maria', atAgoHours: 1152, status: 'closed', text: 'Инструкцией воспользовалась, помогает. Подтверждаю закрытие.' },
    ],
  },
  {
    number: 'A-009', type: 'problem', categoryId: 'c-09', priority: 'high', status: 'in_progress',
    authorId: 'u-dmitry', assigneeId: 'm-ilya', createdAgoHours: 144,
    subject: 'Неясно, кто готовит и проверяет версию приложения к договору',
    description: 'Не всегда понятно, кто готовит очередную версию приложения к договору и кто должен проверить её перед отправкой. Это приводит к повторным согласованиям и задержкам.',
    solution: 'Разграничить этапы подготовки, проверки и утверждения приложения к договору с указанием ответственных.',
    timeline: [
      { kind: 'comment', by: 'm-ilya', atAgoHours: 126, text: 'Разбираем текущую цепочку согласования, после этого зафиксируем ответственных по этапам.' },
      { kind: 'status', by: 'm-ilya', atAgoHours: 120, status: 'in_progress', text: 'Готовим схему этапов и матрицу ответственных.' },
    ],
  },
  {
    number: 'A-010', type: 'suggestion', categoryId: 'c-10', priority: 'medium', status: 'in_review',
    authorId: 'u-dmitry', assigneeId: 'm-natalia', createdAgoHours: 168,
    subject: 'Не закрывать задачу до подтверждения результата заказчиком',
    description: 'Рабочая задача иногда закрывается до подтверждения результата заказчиком внутри компании, из-за чего связанные вопросы теряются из общей истории обсуждения.',
    solution: 'Не закрывать задачу до подтверждения заказчиком результата внутри компании, чтобы связанные вопросы оставались в общей истории.',
    timeline: [
      { kind: 'comment', by: 'm-natalia', atAgoHours: 141, text: 'Правило полезное, но нужно проверить, подходит ли оно для разных типов задач. Проверяем на нескольких командах.' },
      { kind: 'status', by: 'm-natalia', atAgoHours: 138, status: 'in_review', text: 'Проверяем правило на разных типах задач.' },
    ],
  },
  {
    number: 'A-011', type: 'problem', categoryId: 'c-11', priority: 'high', status: 'new',
    authorId: 'u-dmitry', assigneeId: 'm-natalia', createdAgoHours: 36,
    subject: 'Сложно прогнозировать срок ответа смежных подразделений',
    description: 'При срочной подготовке клиентского предложения сложно прогнозировать сроки ответа от смежных подразделений. Клиент ждёт ответа, а внутренний срок неизвестен.',
    solution: 'Показывать ожидаемый срок ответа и отправлять уведомление при задержке.',
    timeline: [],
  },
  {
    number: 'A-012', type: 'suggestion', categoryId: 'c-12', priority: 'low', status: 'in_review',
    authorId: 'u-dmitry', assigneeId: 'm-viktor', createdAgoHours: 216,
    subject: 'Единое место для итоговых решений по задаче',
    description: 'Рабочие обсуждения распределены по нескольким каналам, из-за чего теряется контекст и итоговые решения приходится восстанавливать по переписке.',
    solution: 'Выбрать единое место для фиксации итоговых решений по задаче и описать правила его использования.',
    timeline: [
      { kind: 'comment', by: 'm-viktor', atAgoHours: 190, text: 'Сравниваем варианты. Важно не создать ещё один канал — нужно закрепить итоги в существующем.' },
      { kind: 'status', by: 'm-viktor', atAgoHours: 188, status: 'in_review', text: 'Готовим правила фиксации итогов.' },
    ],
  },
  {
    number: 'A-013', type: 'problem', categoryId: 'c-13', priority: 'medium', status: 'needs_clarification',
    authorId: 'u-elena', assigneeId: 'm-egor', createdAgoHours: 288,
    subject: 'Не видно, какие строки спецификации изменились',
    description: 'Когда изменяется состав оборудования в проекте, не всегда ясно, какие строки спецификации были пересмотрены. Из-за этого сложно проверить актуальность комплекта.',
    solution: 'Нужна более заметная история изменений состава оборудования в проекте.',
    timeline: [
      { kind: 'clarification', by: 'm-egor', atAgoHours: 250, status: 'needs_clarification', text: 'Уточните, пожалуйста, в каком формате приходят исходные файлы и каким способом сейчас сравниваются версии — от этого зависит решение.' },
    ],
  },
  {
    number: 'A-014', type: 'suggestion', categoryId: 'c-14', priority: 'medium', status: 'in_review',
    authorId: 'u-elena', assigneeId: 'm-andrey', createdAgoHours: 144,
    subject: 'Показывать загруженность проектной группы на ближайшие недели',
    description: 'При согласовании сроков запуска новых задач нет общего представления о загруженности проектной группы, поэтому договорённости достигаются в переписке.',
    solution: 'Показывать загруженность проектной группы на ближайшие недели в укрупнённом виде, без детализации по задачам.',
    timeline: [
      { kind: 'comment', by: 'm-andrey', atAgoHours: 131, text: 'Согласуем показатели загрузки и права просмотра, чтобы данные не раскрывали детали проектов.' },
      { kind: 'status', by: 'm-andrey', atAgoHours: 128, status: 'in_review', text: 'Согласовываем состав показателей и права доступа.' },
    ],
  },
  {
    number: 'A-015', type: 'problem', categoryId: 'c-15', priority: 'medium', status: 'in_progress',
    authorId: 'u-sergey', assigneeId: 'm-natalia', createdAgoHours: 264,
    subject: 'Поручения поступают без ожидаемого результата и даты',
    description: 'Некоторые поручения поступают без описания ожидаемого результата и даты завершения. В итоге исполнитель и постановщик по-разному понимают, что должно быть сделано.',
    solution: 'Договориться о минимальном наборе данных при постановке задачи и подготовить шаблон с целью, сроком, приоритетом и ответственным.',
    timeline: [
      { kind: 'comment', by: 'm-natalia', atAgoHours: 241, text: 'Поддерживаю. Проверим шаблон на нескольких командах и соберём обратную связь.' },
      { kind: 'status', by: 'm-natalia', atAgoHours: 238, status: 'in_progress', text: 'Готовим шаблон постановки задачи и инструкцию к нему.' },
    ],
  },
  {
    number: 'A-016', type: 'suggestion', categoryId: 'c-04', priority: 'low', status: 'new',
    authorId: 'u-sergey', assigneeId: 'm-svetlana', createdAgoHours: 50,
    subject: 'Практические демонстрации оборудования для новых сотрудников',
    description: 'Для новых сотрудников полезны практические демонстрации оборудования, а не только презентации. На практике приходится объяснять назначение устройств «на пальцах».',
    solution: 'Провести пилотное занятие с учебными образцами оборудования.',
    timeline: [],
  },
  {
    number: 'A-017', type: 'suggestion', categoryId: 'c-16', priority: 'low', status: 'rejected',
    authorId: 'u-olga', assigneeId: 'm-oleg', createdAgoHours: 480,
    subject: 'Зона для коротких перерывов рядом с рабочими местами',
    description: 'Предлагаю организовать отдельную небольшую зону для коротких перерывов рядом с рабочими помещениями: сейчас нет места, где можно спокойно переключиться между задачами.',
    solution: 'Выделить небольшую зону отдыха рядом с рабочими помещениями.',
    timeline: [
      { kind: 'comment', by: 'm-oleg', atAgoHours: 460, text: 'Посмотрели доступные помещения. Свободной площади для отдельной зоны сейчас нет.' },
      { kind: 'decision', by: 'm-oleg', atAgoHours: 445, status: 'rejected', text: 'Сейчас нет подходящего помещения для отдельной зоны отдыха. Вопрос вернёмся к рассмотрению при следующей перепланировке этажа.', actions: 'Предложено использовать существующую переговорную вне часов встреч; вопрос включён в план перепланировки.' },
    ],
  },
  {
    number: 'A-018', type: 'praise', categoryId: 'c-16', priority: 'low', status: 'closed',
    authorId: 'u-olga', assigneeId: 'm-svetlana', createdAgoHours: 360,
    subject: 'Польза внутренних учебных встреч',
    description: 'Хочу отметить пользу внутренних учебных встреч: после них стало легче обращаться к коллегам за консультацией и понятнее, к кому идти с вопросом. Было бы хорошо сохранить этот формат.',
    solution: null,
    timeline: [
      { kind: 'comment', by: 'm-svetlana', atAgoHours: 352, text: 'Спасибо за отзыв! Передали организаторам обучения, формат продолжим.' },
      { kind: 'decision', by: 'm-svetlana', atAgoHours: 350, status: 'closed', text: 'Положительный отзыв зафиксирован и передан организаторам обучения.', actions: 'Формат внутренних встреч сохранён в плане на следующий квартал.' },
    ],
  },
  {
    number: 'A-019', type: 'problem', categoryId: 'c-17', priority: 'medium', status: 'in_review',
    authorId: 'u-elena', assigneeId: 'm-marina', createdAgoHours: 168,
    subject: 'В общих папках сложно найти актуальную редакцию инструкции',
    description: 'В общих папках трудно быстро определить актуальную редакцию инструкции: названия файлов отличаются, старые версии не архивируются.',
    solution: 'Закрепить единые правила именования и архивирования старых версий, определить владельцев папок.',
    timeline: [
      { kind: 'comment', by: 'm-marina', atAgoHours: 150, text: 'Предлагаю начать с правил именования и переноса устаревших версий в архив. Согласуем владельцев папок.' },
      { kind: 'status', by: 'm-marina', atAgoHours: 148, status: 'in_review', text: 'Согласовываем порядок хранения и владельцев папок.' },
    ],
  },
  {
    number: 'A-021', type: 'problem', categoryId: 'c-03', priority: 'medium', status: 'in_review',
    authorId: 'u-elena', assigneeId: 'm-roman', createdAgoHours: 30,
    subject: 'После обновления каталога обозначения в спецификации не совпадают',
    description: 'После обновления каталога поставщика часть обозначений в спецификации проекта перестала совпадать с карточками позиций. Приходится вручную проверять каждую строку перед отправкой.',
    solution: 'Показывать в спецификации признак «позиция обновлена в каталоге» и предлагать актуальное обозначение.',
    timeline: [
      { kind: 'comment', by: 'm-roman', atAgoHours: 20, text: 'Это связано с обращением A-003 про разные обозначения. Соберём общее правило сверки, чтобы не исправлять каждую спецификацию отдельно.' },
      { kind: 'status', by: 'm-roman', atAgoHours: 19, status: 'in_review', text: 'Объединяем с задачей по правилу сверки номенклатуры.' },
    ],
  },
  {
    number: 'A-022', type: 'problem', categoryId: 'c-05', priority: 'medium', status: 'in_progress',
    authorId: 'u-dmitry', assigneeId: 'm-irina', createdAgoHours: 62,
    subject: 'По пакету документов не видно, кто держит следующий шаг',
    description: 'Пакет документов по клиенту переходит между подразделениями, но не видно, на чьей стороне следующий шаг. Продажи и бухгалтерия уточняют это в переписке.',
    solution: 'Показывать в пакете текущий этап и ответственного за следующий шаг, как предложено в A-005.',
    timeline: [
      { kind: 'comment', by: 'm-irina', atAgoHours: 42, text: 'Тема пересекается с обращением A-005. Предлагаю рассматривать вместе, чтобы статусы пакета были едиными для всех подразделений.' },
      { kind: 'status', by: 'm-irina', atAgoHours: 38, status: 'in_progress', text: 'Собираем перечень этапов для общей модели статусов.' },
    ],
  },
  {
    number: 'A-020', type: 'suggestion', categoryId: 'c-18', priority: 'low', status: 'new',
    authorId: 'u-anna', assigneeId: 'm-pavel', createdAgoHours: 60,
    subject: 'Публиковать краткий обзор завершённых улучшений',
    description: 'Предлагаю публиковать краткий обзор завершённых внутренних улучшений, чтобы сотрудники видели результат направленных предложений и понимали, что канал работает.',
    solution: 'Рассмотреть формат квартальной подборки завершённых улучшений без конфиденциальных сведений.',
    timeline: [],
  },
];

function buildSeed(nowDate) {
  const now = nowDate.getTime();
  const ago = (h) => new Date(now - h * 3600000).toISOString();

  const users = USER_DEFS.map(([id, name, role, department, position]) => ({
    id, name, role, department, position,
    managedCategories: MANAGED[id] || [],
  }));

  const categories = CATEGORY_DEFS.map(([id, name, department, assigneeId, description]) => ({
    id, name, department, assigneeId, description, isActive: true,
  }));

  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const appeals = [];
  const comments = [];
  const events = [];
  let commentSeq = 0;
  let eventSeq = 0;

  for (const def of APPEAL_DEFS) {
    const createdAt = ago(def.createdAgoHours);
    const category = categoryById[def.categoryId];
    const appealId = `a-${def.number.slice(2)}`;
    const appeal = {
      id: appealId,
      number: def.number,
      type: def.type,
      categoryId: def.categoryId,
      department: category.department,
      priority: def.priority,
      status: def.status,
      authorId: def.authorId,
      assigneeId: def.assigneeId,
      subject: def.subject,
      description: def.description,
      solution: def.solution || null,
      attachments: [],
      createdAt,
      updatedAt: createdAt,
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      dueAt: null,
      decision: null,
    };

    events.push({
      id: `e-${++eventSeq}`,
      appealId,
      type: 'created',
      actorId: def.authorId,
      createdAt,
      text: 'Обращение зарегистрировано в системе.',
      meta: { assigneeId: def.assigneeId, routingRule: 'category' },
    });

    const timeline = [...def.timeline].sort((a, b) => b.atAgoHours - a.atAgoHours);
    for (const item of timeline) {
      const at = ago(item.atAgoHours);
      appeal.updatedAt = at;

      if (item.kind === 'comment' || item.kind === 'clarification') {
        const comment = {
          id: `cm-${++commentSeq}`,
          appealId,
          authorId: item.by,
          text: item.text,
          internal: false,
          createdAt: at,
        };
        comments.push(comment);
        events.push({
          id: `e-${++eventSeq}`,
          appealId,
          type: item.kind === 'clarification' ? 'clarification_requested' : 'comment',
          actorId: item.by,
          createdAt: at,
          text: item.text,
          meta: { commentId: comment.id },
        });
      }

      if (item.status) {
        const isDecision = item.kind === 'decision';
        appeal.status = item.status;
        if (isDecision) {
          appeal.resolvedAt = at;
          appeal.decision = {
            text: item.text,
            actions: item.actions || null,
            status: item.status,
            by: item.by,
            at,
          };
          if (item.status === 'closed') appeal.closedAt = at;
        }
        if (item.status === 'closed' && !appeal.closedAt) appeal.closedAt = at;
        events.push({
          id: `e-${++eventSeq}`,
          appealId,
          type: isDecision ? 'decision' : item.kind === 'clarification' ? 'clarification_requested' : 'status_changed',
          actorId: item.by,
          createdAt: at,
          text: isDecision
            ? `Решение: ${item.text}`
            : item.kind === 'clarification'
              ? `Запрошено уточнение: ${item.text}`
              : `Статус изменён на «${STATUSES[item.status] || item.status}».`,
          meta: { status: item.status, commentText: item.text },
        });
        if (isDecision) {
          events[events.length - 1].meta.actions = item.actions || null;
        }
      }

      if (item.kind === 'comment' || item.kind === 'decision' || item.kind === 'clarification') {
        if (!appeal.firstResponseAt && item.by !== def.authorId) {
          appeal.firstResponseAt = at;
        }
      }
    }

    // Если ответственный уже работал с обращением, фиксируем первый ответ.
    if (!appeal.firstResponseAt && def.status !== 'new') {
      appeal.firstResponseAt = appeal.updatedAt;
    }

    appeals.push(appeal);
  }

  // Уведомления: последние события — второй стороне по обращению.
  const appealById = Object.fromEntries(appeals.map((a) => [a.id, a]));
  const notifications = [];
  const sortedEvents = [...events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  let notifSeq = 0;

  for (const event of sortedEvents) {
    if (notifications.length >= 14) break;
    const appeal = appealById[event.appealId];
    if (!appeal) continue;
    let userId = null;
    let text = '';

    if (event.type === 'created') {
      userId = appeal.assigneeId;
      text = `Новое обращение ${appeal.number}: ${appeal.subject}`;
    } else if (event.type === 'comment' && event.actorId === appeal.authorId) {
      userId = appeal.assigneeId;
      text = `${appeal.number}: новый комментарий автора`;
    } else if (['comment', 'clarification_requested', 'status_changed', 'decision'].includes(event.type)) {
      userId = appeal.authorId;
      text = `${appeal.number}: ${event.type === 'status_changed' ? 'изменён статус обращения' : event.type === 'decision' ? 'зафиксировано решение' : 'новый комментарий ответственного'}`;
    }

    if (!userId || userId === event.actorId) continue;
    notifications.push({
      id: `n-${++notifSeq}`,
      userId,
      appealId: appeal.id,
      text,
      createdAt: event.createdAt,
      read: new Date(event.createdAt).getTime() < now - 4 * 24 * 3600000,
    });
  }

  return {
    meta: { seededAt: new Date(now).toISOString(), schemaVersion: 1, demo: true },
    users,
    categories,
    appeals,
    comments,
    events: events.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    notifications,
    counters: { comment: commentSeq, event: eventSeq, notification: notifSeq },
  };
}

module.exports = { buildSeed, APPEAL_DEFS, USER_DEFS, CATEGORY_DEFS };
