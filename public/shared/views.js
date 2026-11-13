/*
 * Чтение данных «Модус Сигнал»: карточки, списки, аналитика, админка.
 * Единая реализация для собственного API и для режима Mokky.dev.
 */
(function (root, factory) {
  const D = typeof module === 'object' && module.exports ? require('./domain') : root.ModusDomain;
  const api = factory(D);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ModusViews = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';

  function publicUser(u) {
    if (!u) return null;
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      roleLabel: D.ROLE_LABELS[u.role],
      department: u.department,
      position: u.position,
      managedCategories: u.managedCategories || [],
    };
  }

  function findAppeal(state, idOrNumber) {
    return state.appeals.find((a) => a.id === idOrNumber || a.number === idOrNumber) || null;
  }

  function decorate(state, appeal) {
    const category = state.categories.find((c) => c.id === appeal.categoryId);
    const author = state.users.find((u) => u.id === appeal.authorId);
    const assignee = state.users.find((u) => u.id === appeal.assigneeId);
    const tl = D.timeline(appeal);

    return Object.assign({}, appeal, {
      categoryName: category ? category.name : 'Без категории',
      authorName: author ? author.name : 'Не указан',
      authorDepartment: author ? author.department : null,
      assigneeName: assignee ? assignee.name : 'Не назначен',
      assigneeDepartment: assignee ? assignee.department : null,
      typeLabel: D.TYPES[appeal.type] || appeal.type,
      statusLabel: D.STATUSES[appeal.status] || appeal.status,
      priorityLabel: D.PRIORITIES[appeal.priority] || appeal.priority,
      sla: tl,
    });
  }

  function visibleAppeals(state, user, query) {
    const q = query || {};
    let list = state.appeals.filter((a) => D.canView(user, a));

    if (q.scope === 'mine') list = list.filter((a) => a.authorId === user.id);
    if (q.scope === 'inbox') {
      list = list.filter((a) => D.canManage(user, a) && a.authorId !== user.id);
    }
    if (q.type) list = list.filter((a) => a.type === q.type);
    if (q.status) {
      const statuses = String(q.status).split(',');
      list = list.filter((a) => statuses.includes(a.status));
    }
    if (q.priority) list = list.filter((a) => a.priority === q.priority);
    if (q.categoryId) list = list.filter((a) => a.categoryId === q.categoryId);
    if (q.department) list = list.filter((a) => a.department === q.department);
    if (q.assigneeId) list = list.filter((a) => a.assigneeId === q.assigneeId);
    if (q.authorId) list = list.filter((a) => a.authorId === q.authorId);
    if (q.overdue === '1') list = list.filter((a) => D.timeline(a).isOverdue);
    if (q.unassigned === '1') list = list.filter((a) => !a.assigneeId);

    if (q.q) {
      const needle = String(q.q).toLowerCase();
      list = list.filter((a) =>
        [a.number, a.subject, a.description, a.solution || '', (a.decision && a.decision.text) || '']
          .join(' ')
          .toLowerCase()
          .includes(needle),
      );
    }

    const sort = q.sort || 'updated_desc';
    const cmp = {
      updated_desc: (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
      created_desc: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      due_asc: (a, b) => new Date(D.timeline(a).resolutionTarget) - new Date(D.timeline(b).resolutionTarget),
      priority: (a, b) => {
        const rank = { high: 0, medium: 1, low: 2 };
        return rank[a.priority] - rank[b.priority] || new Date(b.createdAt) - new Date(a.createdAt);
      },
    }[sort] || ((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return list.sort(cmp);
  }

  function appealView(state, user, idOrNumber) {
    const appeal = findAppeal(state, idOrNumber);
    if (!appeal) return { status: 404, error: 'Обращение не найдено.' };
    if (!D.canView(user, appeal)) return { status: 403, error: 'Нет доступа к этому обращению.' };

    const canManage = D.canManage(user, appeal);
    const events = state.events
      .filter((e) => e.appealId === appeal.id)
      .filter((e) => canManage || (e.type !== 'internal_note' && e.type !== 'assignment_note'))
      .map((e) => {
        const actor = state.users.find((u) => u.id === e.actorId);
        return Object.assign({}, e, { actorName: actor ? actor.name : 'Система' });
      })
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const transitions = D.availableTransitions(user, appeal);

    return {
      appeal: decorate(state, appeal),
      events,
      permissions: {
        canManage,
        canComment: true,
        canChangeStatus: transitions.length > 0,
        availableStatuses: transitions,
        canAssign: canManage,
        canPrioritize: canManage,
        canDecide: canManage && ['new', 'in_review', 'in_progress', 'needs_clarification'].includes(appeal.status),
        isAuthor: appeal.authorId === user.id,
        canSeeInternal: canManage,
      },
    };
  }

  function statsFor(state, user) {
    const visible = state.appeals.filter((a) => D.canView(user, a));
    return {
      visible: visible.length,
      mine: visible.filter((a) => a.authorId === user.id).length,
      inbox: visible.filter((a) => D.canManage(user, a) && a.authorId !== user.id).length,
      overdue: visible.filter((a) => D.timeline(a).isOverdue).length,
      newCount: visible.filter((a) => a.status === 'new').length,
      needsClarification: visible.filter((a) => a.status === 'needs_clarification' && a.authorId === user.id).length,
    };
  }

  function bootstrap(state, user) {
    return {
      user: publicUser(user),
      users: state.users.map(publicUser),
      categories: state.categories,
      dictionaries: {
        types: D.TYPES,
        priorities: D.PRIORITIES,
        statuses: D.STATUSES,
        roles: D.ROLE_LABELS,
        sla: D.SLA,
      },
      unread: state.notifications.filter((n) => n.userId === user.id && !n.read).length,
      stats: statsFor(state, user),
      meta: state.meta,
    };
  }

  function notifications(state, user) {
    const list = state.notifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 30)
      .map((n) => {
        const appeal = state.appeals.find((a) => a.id === n.appealId);
        return Object.assign({}, n, { appealNumber: appeal ? appeal.number : null });
      });
    return { notifications: list, unread: list.filter((n) => !n.read).length };
  }

  function analytics(state, user, query) {
    const list = visibleAppeals(state, user, query || {});
    const now = Date.now();
    const total = list.length;
    const finalCount = list.filter((a) => D.isFinal(a.status)).length;
    const decided = list.filter((a) => a.resolvedAt);
    const withFirstResponse = list.filter((a) => a.firstResponseAt);

    const countBy = (keyFn) => {
      const map = new Map();
      for (const a of list) {
        const k = keyFn(a);
        if (!k) continue;
        map.set(k, (map.get(k) || 0) + 1);
      }
      return map;
    };

    const statusCounts = countBy((a) => a.status);
    const typeCounts = countBy((a) => a.type);
    const priorityCounts = countBy((a) => a.priority);
    const departmentCounts = countBy((a) => a.department);

    const categories = state.categories.map((c) => {
      const inCat = list.filter((a) => a.categoryId === c.id);
      return {
        id: c.id,
        name: c.name,
        department: c.department,
        count: inCat.length,
        problems: inCat.filter((a) => a.type === 'problem').length,
        open: inCat.filter((a) => !D.isFinal(a.status)).length,
        implemented: inCat.filter((a) => ['implemented', 'closed'].includes(a.status)).length,
      };
    }).filter((c) => c.count > 0).sort((a, b) => b.count - a.count || b.problems - a.problems);

    const overdue = list
      .filter((a) => D.timeline(a).isOverdue)
      .map((a) => {
        const tl = D.timeline(a);
        const target = tl.firstResponseOverdue ? tl.firstResponseDueAt : tl.resolutionTarget;
        return {
          id: a.id,
          number: a.number,
          subject: a.subject,
          assigneeName: decorate(state, a).assigneeName,
          status: a.status,
          statusLabel: D.STATUSES[a.status],
          priority: a.priority,
          kind: tl.firstResponseOverdue ? 'first_response' : 'resolution',
          daysOverdue: Math.max(0, Math.round(((now - new Date(target)) / 86400000) * 10) / 10),
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const repeatProblems = categories
      .filter((c) => c.problems >= 2)
      .map((c) => Object.assign({}, c, {
        appeals: list
          .filter((a) => a.categoryId === c.id && a.type === 'problem')
          .map((a) => ({ id: a.id, number: a.number, subject: a.subject, status: a.status })),
      }));

    const months = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        key,
        label: d.toLocaleDateString('ru-RU', { month: 'short' }),
        created: list.filter((a) => a.createdAt.slice(0, 7) === key).length,
        closed: list.filter((a) => ['implemented', 'rejected', 'closed'].includes(a.status) && (a.resolvedAt || a.closedAt) && String(a.resolvedAt || a.closedAt).slice(0, 7) === key).length,
      });
    }

    const slaOk = withFirstResponse.filter((a) => {
      const tl = D.timeline(a);
      return new Date(a.firstResponseAt) <= new Date(tl.firstResponseDueAt);
    }).length;

    return {
      scope: {
        role: user.role,
        department: user.department,
        label: user.role === 'admin'
          ? 'Все обращения компании'
          : user.role === 'manager'
            ? `Обращения подразделения «${user.department}» и назначенные вам`
            : 'Ваши обращения',
      },
      total,
      byStatus: Object.entries(D.STATUSES).map(([key, label]) => ({ key, label, count: statusCounts.get(key) || 0 })),
      byType: Object.entries(D.TYPES).map(([key, label]) => ({ key, label, count: typeCounts.get(key) || 0 })),
      byPriority: Object.entries(D.PRIORITIES).map(([key, label]) => ({ key, label, count: priorityCounts.get(key) || 0 })),
      byDepartment: [...departmentCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      topCategories: categories.slice(0, 8),
      repeatProblems,
      months,
      kpi: {
        total,
        open: list.filter((a) => !D.isFinal(a.status)).length,
        closedShare: total ? Math.round((finalCount / total) * 100) : 0,
        implemented: list.filter((a) => ['implemented', 'closed'].includes(a.status)).length,
        rejected: list.filter((a) => a.status === 'rejected').length,
        overdue: overdue.length,
        avgFirstResponseHours: withFirstResponse.length
          ? Math.round((withFirstResponse.reduce((sum, a) => sum + D.hoursBetween(a.createdAt, a.firstResponseAt), 0) / withFirstResponse.length) * 10) / 10
          : null,
        avgResolutionHours: decided.length
          ? Math.round((decided.reduce((sum, a) => sum + D.hoursBetween(a.createdAt, a.resolvedAt), 0) / decided.length) * 10) / 10
          : null,
        slaFirstResponsePct: withFirstResponse.length ? Math.round((slaOk / withFirstResponse.length) * 100) : null,
        newLast7Days: list.filter((a) => now - new Date(a.createdAt).getTime() <= 7 * 86400000).length,
        decidedLast30Days: list.filter((a) => a.resolvedAt && now - new Date(a.resolvedAt).getTime() <= 30 * 86400000).length,
      },
      overdue,
    };
  }

  function adminOverview(state) {
    const unassigned = state.appeals.filter((a) => !a.assigneeId);
    const noRoute = state.categories.filter((c) => !c.assigneeId || !state.users.some((u) => u.id === c.assigneeId));
    return {
      users: state.users.map(publicUser),
      categories: state.categories,
      stats: {
        users: state.users.length,
        managers: state.users.filter((u) => u.role === 'manager').length,
        categories: state.categories.length,
        unassigned: unassigned.length,
        categoriesWithoutOwner: noRoute.length,
        openAppeals: state.appeals.filter((a) => !D.isFinal(a.status)).length,
      },
      unassigned: unassigned.map((a) => ({ id: a.id, number: a.number, subject: a.subject, createdAt: a.createdAt })),
    };
  }

  return {
    publicUser,
    findAppeal,
    decorate,
    visibleAppeals,
    appealView,
    statsFor,
    bootstrap,
    notifications,
    analytics,
    adminOverview,
  };
});
