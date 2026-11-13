import D from './domain.js';
import V from './views.js';

const api = (() => {
'use strict';

  class ApiError extends Error {
    constructor(status, message, field) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.field = field;
    }
  }

  function bad(message, field) {
    throw new ApiError(400, message, field);
  }

  function forbid(message) {
    throw new ApiError(403, message);
  }

  function notFound(message) {
    throw new ApiError(404, message);
  }

  function conflict(message) {
    throw new ApiError(409, message);
  }

  function newId(prefix) {
    let uuid;
    if (typeof require === 'function') {
      uuid = require('crypto').randomUUID();
    } else if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      uuid = crypto.randomUUID();
    } else {
      uuid = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return `${prefix}-${uuid.slice(0, 8)}`;
  }

  function findAppeal(state, idOrNumber) {
    return state.appeals.find((a) => a.id === idOrNumber || a.number === idOrNumber) || null;
  }

  function requireAdmin(user) {
    if (!user || user.role !== 'admin') {
      forbid('Действие доступно только администратору системы.');
    }
  }

  function createAppeal(state, user, body, attachments, now) {
    const payload = body || {};
    const type = payload.type;
    const priority = payload.priority || 'medium';
    const category = state.categories.find((c) => c.id === payload.categoryId && c.isActive !== false);
    const subject = String(payload.subject || '').trim();
    const description = String(payload.description || '').trim();
    const solution = payload.solution ? String(payload.solution).trim() : null;

    if (!D.TYPES[type]) bad('Выберите тип обращения.', 'type');
    if (!category) bad('Выберите категорию обращения.', 'categoryId');
    if (!D.PRIORITIES[priority]) bad('Выберите приоритет.', 'priority');
    if (subject.length < 5) bad('Тема должна содержать минимум 5 символов.', 'subject');
    if (subject.length > 160) bad('Тема не должна превышать 160 символов.', 'subject');
    if (description.length < 20) bad('Опишите ситуацию подробнее: минимум 20 символов.', 'description');
    if (description.length > 6000) bad('Описание не должно превышать 6000 символов.', 'description');

    const { assignee, rule } = D.resolveAssignee(category, state.users);
    const appealId = newId('a');

    const appeal = {
      id: appealId,
      number: D.nextNumber(state.appeals),
      type,
      categoryId: category.id,
      department: category.department,
      priority,
      status: 'new',
      authorId: user.id,
      assigneeId: assignee ? assignee.id : null,
      subject,
      description,
      solution: solution || null,
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: now,
      updatedAt: now,
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      dueAt: null,
      decision: null,
    };

    state.appeals.push(appeal);
    state.events.push({
      id: newId('e'),
      appealId,
      type: 'created',
      actorId: user.id,
      createdAt: now,
      text: assignee
        ? `Обращение зарегистрировано. Ответственный: ${assignee.name} (${rule === 'category' ? 'правило категории' : 'резервное правило'}).`
        : 'Обращение зарегистрировано без ответственного: требуется назначение администратором.',
      meta: { assigneeId: appeal.assigneeId, routingRule: rule },
    });

    if (assignee) {
      state.notifications.push({
        id: newId('n'),
        userId: assignee.id,
        appealId,
        text: `Новое обращение ${appeal.number}: ${appeal.subject}`,
        createdAt: now,
        read: false,
      });
    } else {
      for (const admin of state.users.filter((u) => u.role === 'admin')) {
        state.notifications.push({
          id: newId('n'),
          userId: admin.id,
          appealId,
          text: `Обращение ${appeal.number} без ответственного — требуется назначение`,
          createdAt: now,
          read: false,
        });
      }
    }

    return {
      appeal: V.decorate(state, appeal),
      routing: { assignee: V.publicUser(assignee), rule },
    };
  }

  function patchAppeal(state, user, idOrNumber, body, now) {
    const appeal = findAppeal(state, idOrNumber);
    if (!appeal) notFound('Обращение не найдено.');
    const payload = body || {};
    const changes = [];

    const managed = D.canManage(user, appeal);
    const isAuthor = user.id === appeal.authorId;
    const authorAllowed = D.availableTransitions(user, appeal);
    const authorOnlyStatusChange =
      isAuthor &&
      !managed &&
      payload.status &&
      authorAllowed.includes(payload.status) &&
      Object.keys(payload).every((key) => ['status', 'comment'].includes(key));

    if (!managed && !authorOnlyStatusChange) {
      forbid(isAuthor
        ? 'Вы можете только подтвердить результат или вернуть обращение в работу.'
        : 'Изменять обращение может ответственный или руководитель подразделения.');
    }

    if (managed && payload.assigneeId !== undefined) {
      const assignee = state.users.find((u) => u.id === payload.assigneeId);
      if (!assignee || !['manager', 'admin'].includes(assignee.role)) {
        bad('Ответственным можно назначить руководителя или администратора.', 'assigneeId');
      }
      if (assignee.id !== appeal.assigneeId) {
        const previous = appeal.assigneeId;
        appeal.assigneeId = assignee.id;
        changes.push({
          type: 'assigned',
          actorId: user.id,
          text: `Ответственный изменён на «${assignee.name}».`,
          meta: { previous, assigneeId: assignee.id },
        });
        state.notifications.push({
          id: newId('n'),
          userId: assignee.id,
          appealId: appeal.id,
          text: `${appeal.number}: вы назначены ответственным`,
          createdAt: now,
          read: false,
        });
      }
    }

    if (managed && payload.priority !== undefined) {
      if (!D.PRIORITIES[payload.priority]) bad('Некорректный приоритет.', 'priority');
      if (payload.priority !== appeal.priority) {
        const previous = appeal.priority;
        appeal.priority = payload.priority;
        changes.push({
          type: 'priority_changed',
          actorId: user.id,
          text: `Приоритет изменён: ${D.PRIORITIES[previous]} → ${D.PRIORITIES[payload.priority]}.`,
          meta: { previous, priority: payload.priority },
        });
      }
    }

    if (managed && payload.dueAt !== undefined) {
      if (payload.dueAt !== null && Number.isNaN(new Date(payload.dueAt).getTime())) {
        bad('Некорректная дата срока.', 'dueAt');
      }
      appeal.dueAt = payload.dueAt || null;
      changes.push({
        type: 'due_changed',
        actorId: user.id,
        text: payload.dueAt
          ? `Срок рассмотрения установлен: ${new Date(payload.dueAt).toLocaleDateString('ru-RU')}.`
          : 'Ручной срок рассмотрения снят, применяется SLA.',
        meta: { dueAt: appeal.dueAt },
      });
    }

    if (payload.status !== undefined) {
      if (payload.status !== appeal.status) {
        const allowed = D.availableTransitions(user, appeal);
        if (!allowed.includes(payload.status)) {
          conflict(`Переход из статуса «${D.STATUSES[appeal.status]}» в «${D.STATUSES[payload.status] || payload.status}» недоступен.`);
        }
        const previous = appeal.status;
        appeal.status = payload.status;
        if (!appeal.firstResponseAt && user.id !== appeal.authorId) appeal.firstResponseAt = now;

        if (['implemented', 'rejected'].includes(payload.status)) {
          appeal.resolvedAt = appeal.resolvedAt || now;
          if (!appeal.decision) {
            appeal.decision = {
              text: payload.decisionText || 'Решение зафиксировано ответственным.',
              actions: payload.decisionActions || null,
              status: payload.status,
              by: user.id,
              at: now,
            };
          }
        }
        if (payload.status === 'closed') appeal.closedAt = now;
        if (payload.status === 'in_review' && previous === 'closed') appeal.closedAt = null;

        changes.push({
          type: 'status_changed',
          actorId: user.id,
          text: payload.comment
            ? `Статус изменён на «${D.STATUSES[payload.status]}». ${String(payload.comment).trim()}`
            : `Статус изменён на «${D.STATUSES[payload.status]}».`,
          meta: { previous, status: payload.status },
        });
      }
    }

    if (!changes.length) return { appeal: V.decorate(state, appeal), unchanged: true };

    appeal.updatedAt = now;
    for (const c of changes) {
      state.events.push(Object.assign({ id: newId('e'), appealId: appeal.id, createdAt: now }, c));
    }
    if (changes.some((c) => c.type === 'status_changed')) {
      const recipient = user.id === appeal.authorId ? appeal.assigneeId : appeal.authorId;
      if (recipient && recipient !== user.id) {
        state.notifications.push({
          id: newId('n'),
          userId: recipient,
          appealId: appeal.id,
          text: `${appeal.number}: статус изменён на «${D.STATUSES[appeal.status]}»`,
          createdAt: now,
          read: false,
        });
      }
    }

    return { appeal: V.decorate(state, appeal) };
  }

  function addComment(state, user, idOrNumber, body, now) {
    const appeal = findAppeal(state, idOrNumber);
    if (!appeal) notFound('Обращение не найдено.');
    if (!D.canView(user, appeal)) forbid('Нет доступа к этому обращению.');
    const payload = body || {};
    const text = String(payload.text || '').trim();
    const internal = Boolean(payload.internal);
    if (text.length < 2) bad('Комментарий слишком короткий.', 'text');
    if (text.length > 4000) bad('Комментарий не должен превышать 4000 символов.', 'text');
    if (internal && !D.canManage(user, appeal)) {
      forbid('Внутренние заметки доступны только ответственным и руководителям.');
    }

    const comment = {
      id: newId('cm'),
      appealId: appeal.id,
      authorId: user.id,
      text,
      internal,
      createdAt: now,
    };
    state.comments.push(comment);

    const isAuthorReply = user.id === appeal.authorId && appeal.status === 'needs_clarification';
    const statusChange = isAuthorReply ? 'in_review' : null;

    state.events.push({
      id: newId('e'),
      appealId: appeal.id,
      type: internal ? 'internal_note' : 'comment',
      actorId: user.id,
      createdAt: now,
      text,
      meta: Object.assign({ commentId: comment.id }, isAuthorReply ? { authorReply: true } : {}),
    });

    if (isAuthorReply) {
      state.events.push({
        id: newId('e'),
        appealId: appeal.id,
        type: 'status_changed',
        actorId: user.id,
        createdAt: now,
        text: 'Автор ответил на запрос уточнения, обращение возвращено на рассмотрение.',
        meta: { previous: 'needs_clarification', status: 'in_review', automatic: true },
      });
      if (appeal.assigneeId) {
        state.notifications.push({
          id: newId('n'),
          userId: appeal.assigneeId,
          appealId: appeal.id,
          text: `${appeal.number}: автор ответил на уточнение`,
          createdAt: now,
          read: false,
        });
      }
    } else if (user.id === appeal.authorId) {
      if (appeal.assigneeId) {
        state.notifications.push({
          id: newId('n'),
          userId: appeal.assigneeId,
          appealId: appeal.id,
          text: `${appeal.number}: новый комментарий автора`,
          createdAt: now,
          read: false,
        });
      }
    } else if (!internal) {
      state.notifications.push({
        id: newId('n'),
        userId: appeal.authorId,
        appealId: appeal.id,
        text: `${appeal.number}: новый комментарий ответственного`,
        createdAt: now,
        read: false,
      });
    }

    if (!appeal.firstResponseAt && user.id !== appeal.authorId) appeal.firstResponseAt = now;

    appeal.updatedAt = now;
    if (statusChange) appeal.status = statusChange;

    return { comment, status: appeal.status };
  }

  function setDecision(state, user, idOrNumber, body, now) {
    const appeal = findAppeal(state, idOrNumber);
    if (!appeal) notFound('Обращение не найдено.');
    if (!D.canManage(user, appeal)) forbid('Зафиксировать решение может ответственный или руководитель.');
    const payload = body || {};
    const text = String(payload.text || '').trim();
    const actions = payload.actions ? String(payload.actions).trim() : null;
    const status = payload.status;

    if (text.length < 10) bad('Опишите решение: минимум 10 символов.', 'text');
    if (!['implemented', 'rejected'].includes(status)) {
      bad('Выберите результат рассмотрения: «Реализовано» или «Отклонено».', 'status');
    }
    if (!(D.availableTransitions(user, appeal) || []).includes(status)) {
      conflict(`Из статуса «${D.STATUSES[appeal.status]}» нельзя зафиксировать такой результат.`);
    }

    appeal.status = status;
    appeal.resolvedAt = now;
    appeal.decision = { text, actions, status, by: user.id, at: now };
    appeal.firstResponseAt = appeal.firstResponseAt || now;
    appeal.updatedAt = now;
    if (status === 'rejected') appeal.closedAt = null;

    state.events.push({
      id: newId('e'),
      appealId: appeal.id,
      type: 'decision',
      actorId: user.id,
      createdAt: now,
      text: `Решение (${D.STATUSES[status]}): ${text}`,
      meta: { status, actions },
    });
    state.notifications.push({
      id: newId('n'),
      userId: appeal.authorId,
      appealId: appeal.id,
      text: `${appeal.number}: ${D.STATUSES[status].toLowerCase()} — ознакомьтесь с решением`,
      createdAt: now,
      read: false,
    });

    return { appeal: V.decorate(state, appeal) };
  }

  function updateCategory(state, user, id, body, now) {
    requireAdmin(user);
    const category = state.categories.find((c) => c.id === id);
    if (!category) notFound('Категория не найдена.');
    const payload = body || {};

    if (payload.assigneeId !== undefined) {
      if (payload.assigneeId === null) {
        category.assigneeId = null;
      } else {
        const owner = state.users.find((u) => u.id === payload.assigneeId && ['manager', 'admin'].includes(u.role));
        if (!owner) bad('Ответственным по категории может быть руководитель или администратор.', 'assigneeId');
        category.assigneeId = owner.id;
      }
    }
    if (payload.isActive !== undefined) category.isActive = Boolean(payload.isActive);
    if (payload.name !== undefined) {
      const name = String(payload.name).trim();
      if (name.length < 3) bad('Название категории слишком короткое.', 'name');
      category.name = name;
    }
    if (payload.description !== undefined) {
      category.description = String(payload.description).trim().slice(0, 300);
    }

    if (payload.assigneeId && category.isActive !== false) {
      for (const a of state.appeals) {
        if (a.categoryId === category.id && !a.assigneeId) {
          a.assigneeId = category.assigneeId;
          a.updatedAt = now;
          state.events.push({
            id: newId('e'),
            appealId: a.id,
            type: 'assigned',
            actorId: user.id,
            createdAt: a.updatedAt,
            text: 'Ответственный назначен автоматически по обновлённому правилу категории.',
            meta: { assigneeId: category.assigneeId, automatic: true },
          });
        }
      }
    }

    return { category };
  }

  function createCategory(state, user, body, now) {
    requireAdmin(user);
    const payload = body || {};
    const name = String(payload.name || '').trim();
    const department = String(payload.department || '').trim();
    if (name.length < 3) bad('Укажите название категории.', 'name');
    if (!department) bad('Укажите подразделение.', 'department');
    if (state.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      bad('Категория с таким названием уже существует.', 'name');
    }
    const assignee = payload.assigneeId ? state.users.find((u) => u.id === payload.assigneeId) : null;
    const category = {
      id: newId('c'),
      name,
      department,
      assigneeId: assignee ? assignee.id : null,
      description: String(payload.description || '').trim().slice(0, 300),
      isActive: true,
      createdAt: now,
    };
    state.categories.push(category);
    return { category };
  }

  function markNotificationsRead(state, user, ids) {
    const list = Array.isArray(ids) ? ids : null;
    let changed = 0;
    for (const n of state.notifications) {
      if (n.userId !== user.id) continue;
      if (list && !list.includes(n.id)) continue;
      if (!n.read) {
        n.read = true;
        changed += 1;
      }
    }
    return { ok: true, changed };
  }

  return {
    ApiError,
    newId,
    findAppeal,
    createAppeal,
    patchAppeal,
    addComment,
    setDecision,
    updateCategory,
    createCategory,
    markNotificationsRead,
  };

})();
export default api;
