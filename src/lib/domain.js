const api = (() => {
'use strict';

  const TYPES = {
    problem: 'Проблема',
    suggestion: 'Предложение',
    praise: 'Положительный отзыв',
  };

  const PRIORITIES = {
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
  };

  const STATUSES = {
    new: 'Новое',
    in_review: 'На рассмотрении',
    in_progress: 'В работе',
    needs_clarification: 'Ожидает уточнения',
    implemented: 'Реализовано',
    rejected: 'Отклонено',
    closed: 'Закрыто',
  };

  const OPEN_STATUSES = ['new', 'in_review', 'in_progress', 'needs_clarification'];
  const FINAL_STATUSES = ['implemented', 'rejected', 'closed'];

  /** Сроки в часах: первый ответ и полное рассмотрение. */
  const SLA = {
    high: { firstResponse: 8, resolution: 120 },
    medium: { firstResponse: 24, resolution: 240 },
    low: { firstResponse: 72, resolution: 480 },
  };

  /** Допустимые переходы статусов. */
  const TRANSITIONS = {
    new: ['in_review', 'in_progress', 'needs_clarification', 'rejected'],
    in_review: ['in_progress', 'needs_clarification', 'implemented', 'rejected'],
    in_progress: ['needs_clarification', 'implemented', 'rejected'],
    needs_clarification: ['in_review', 'in_progress', 'rejected'],
    implemented: ['closed', 'in_progress'],
    rejected: ['closed', 'in_review'],
    closed: ['in_review'],
  };

  /** Автор обращения может самостоятельно выполнить только эти переходы. */
  const AUTHOR_TRANSITIONS = {
    needs_clarification: ['in_review'],
    implemented: ['closed'],
    rejected: ['closed'],
    closed: ['in_review'],
  };

  const ROLE_LABELS = {
    employee: 'Сотрудник',
    manager: 'Руководитель',
    admin: 'Администратор',
  };

  function isFinal(status) {
    return FINAL_STATUSES.includes(status);
  }

  function slaFor(priority) {
    return SLA[priority] || SLA.medium;
  }

  function addHours(dateIso, hours) {
    return new Date(new Date(dateIso).getTime() + hours * 3600 * 1000).toISOString();
  }

  function hoursBetween(fromIso, toIso) {
    return Math.round(((new Date(toIso) - new Date(fromIso)) / 3600000) * 10) / 10;
  }

  /** SLA-показатели обращения на момент now. */
  function timeline(app, now = new Date().toISOString()) {
    const sla = slaFor(app.priority);
    const firstResponseDueAt = addHours(app.createdAt, sla.firstResponse);
    const resolutionDueAt = addHours(app.createdAt, sla.resolution);

    // Дедлайн может быть согласован вручную ответственным.
    const resolutionTarget = app.dueAt || resolutionDueAt;

    const firstResponseOverdue =
      !app.firstResponseAt && new Date(now) > new Date(firstResponseDueAt);
    const resolutionOverdue =
      !isFinal(app.status) && new Date(now) > new Date(resolutionTarget);

    return {
      firstResponseDueAt,
      resolutionDueAt,
      resolutionTarget,
      firstResponseOverdue,
      resolutionOverdue,
      isOverdue: firstResponseOverdue || resolutionOverdue,
      firstResponseHours: app.firstResponseAt ? hoursBetween(app.createdAt, app.firstResponseAt) : null,
      resolutionHours: app.resolvedAt ? hoursBetween(app.createdAt, app.resolvedAt) : null,
    };
  }

  function canManage(user, app) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (app.assigneeId && app.assigneeId === user.id) return true;
    if (user.role === 'manager') {
      if ((user.managedCategories || []).includes(app.categoryId)) return true;
      if (user.department && user.department === app.department) return true;
    }
    return false;
  }

  function canView(user, app) {
    if (!user) return false;
    return app.authorId === user.id || canManage(user, app);
  }

  function availableTransitions(user, app) {
    const base = TRANSITIONS[app.status] || [];
    if (canManage(user, app)) return base;
    if (app.authorId !== user.id) return [];
    return (AUTHOR_TRANSITIONS[app.status] || []).filter((s) => base.includes(s));
  }

  /** Маршрутизация: ответственный по категории, иначе администратор. */
  function resolveAssignee(category, users) {
    if (category && category.assigneeId) {
      const owner = users.find((u) => u.id === category.assigneeId);
      if (owner) return { assignee: owner, rule: 'category' };
    }
    const fallback = users.find((u) => u.role === 'admin');
    return { assignee: fallback || null, rule: fallback ? 'fallback_admin' : 'none' };
  }

  function nextNumber(appeals) {
    let max = 0;
    for (const a of appeals) {
      const m = /^A-(\d+)$/.exec(a.number || '');
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `A-${String(max + 1).padStart(3, '0')}`;
  }

  return {
    TYPES,
    PRIORITIES,
    STATUSES,
    OPEN_STATUSES,
    FINAL_STATUSES,
    SLA,
    TRANSITIONS,
    AUTHOR_TRANSITIONS,
    ROLE_LABELS,
    isFinal,
    slaFor,
    addHours,
    hoursBetween,
    timeline,
    canManage,
    canView,
    availableTransitions,
    resolveAssignee,
    nextNumber,
  };

})();
export default api;
