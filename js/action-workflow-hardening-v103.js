/* V1.0.3 Action Workflow Hardening
   Extracted from farm_management_V0_6_90_performance_fast_render_split.html for V1.0.3 UI JS split.
   Keep farmActionWorkflowHardeningV0671 and action handler globals stable for inline handlers. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const FINAL_STATUSES = ['done','completed','skipped','cancelled'];
  const ACTION_NAMES = [
    'confirmPlannedTaskDone',
    'postponePlannedTask',
    'skipPlannedTask',
    'confirmMaterialActionDone',
    'postponeMaterialAction',
    'skipMaterialAction'
  ];
  let pendingPlantingPostpone = null;

  function safe(fn, fallback){
    try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; }
  }
  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function todayIso(){
    return safe(function(){ return (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10); }, new Date().toISOString().slice(0,10));
  }
  function events(){
    return safe(function(){ if(!Array.isArray(calEvents)) calEvents = []; return calEvents; }, []);
  }
  function activities(){
    return safe(function(){ if(!Array.isArray(actItems)) actItems = []; return actItems; }, []);
  }
  function statusOf(item){
    return String((item && (item.taskStatus || item.confirmStatus || item.status || item.plannedStatus || item.actionButtonStatus)) || 'pending').toLowerCase();
  }
  function isFinal(item){
    return FINAL_STATUSES.includes(statusOf(item));
  }
  function decode(v){
    try{ return decodeURIComponent(String(v || '')); }catch(e){ return String(v || ''); }
  }
  function routeKey(route){
    return route ? [route.source, route.id].join('|') : '';
  }
  function taskId(materialId, ruleId, dueDate){
    return encodeURIComponent(String(materialId || '')) + '__' + encodeURIComponent(String(ruleId || '')) + '__' + encodeURIComponent(String(dueDate || ''));
  }
  function parseMaterialId(raw){
    const parts = String(raw || '').split('__');
    return {
      materialPlanId: decode(parts[0] || ''),
      materialRuleId: decode(parts[1] || ''),
      dueDate: decode(parts[2] || '')
    };
  }
  function routeFromOnclick(raw){
    raw = String(raw || '');
    let match = raw.match(/(confirmPlannedTaskDone|postponePlannedTask|skipPlannedTask|confirmMaterialActionDone|postponeMaterialAction|skipMaterialAction)\((['"])(.*?)\2\)/);
    if(!match){
      const loose = raw.match(/(confirmPlannedTaskDone|postponePlannedTask|skipPlannedTask|confirmMaterialActionDone|postponeMaterialAction|skipMaterialAction)\(([^)]*)\)/);
      if(loose) match = [loose[0], loose[1], '', String(loose[2] || '').trim().replace(/^['"]|['"]$/g, '')];
    }
    if(!match) return null;
    return routeFromName(match[1], match[3]);
  }
  function routeFromName(name, id){
    const source = /Material/.test(name) ? 'material' : 'planting';
    const kind = /^confirm/.test(name) ? 'done' : (/postpone/.test(name) ? 'postpone' : 'skip');
    return {source, kind, id:String(id ?? '')};
  }
  function routeFromButton(btn){
    if(!btn) return null;
    if(btn.dataset && btn.dataset.farmActionSource && btn.dataset.farmActionKind && btn.dataset.farmActionId){
      return {
        source:btn.dataset.farmActionSource,
        kind:btn.dataset.farmActionKind,
        id:btn.dataset.farmActionId
      };
    }
    return routeFromOnclick(btn.getAttribute('onclick') || '');
  }
  function handlerName(route){
    if(!route) return '';
    if(route.source === 'material'){
      if(route.kind === 'done') return 'confirmMaterialActionDone';
      if(route.kind === 'postpone') return 'postponeMaterialAction';
      if(route.kind === 'skip') return 'skipMaterialAction';
    }
    if(route.source === 'planting'){
      if(route.kind === 'done') return 'confirmPlannedTaskDone';
      if(route.kind === 'postpone') return 'postponePlannedTask';
      if(route.kind === 'skip') return 'skipPlannedTask';
    }
    return '';
  }
  function labelFor(kind){
    if(kind === 'done') return 'ทำ';
    if(kind === 'postpone') return 'เลื่อน';
    if(kind === 'skip') return 'ไม่ทำ';
    return '';
  }
  function findPlantingEvent(id){
    return events().find(ev => ev && ev.source === 'planting-plan' && String(ev.id) === String(id)) || null;
  }
  function snapshotRoute(route){
    const ev = route && route.source === 'planting' ? findPlantingEvent(route.id) : (route && route.source === 'material' ? findMaterialEvent(route.id) : null);
    return ev ? {start:ev.start || '', status:statusOf(ev), postponedAt:ev.postponedAt || '', skippedAt:ev.skippedAt || '', activityId:ev.activityId || ''} : {};
  }
  function findMaterialEvent(id){
    const parsed = parseMaterialId(id);
    return events().find(function(ev){
      if(!ev || ev.source !== 'material-action') return false;
      if(String(ev.id) === String(id)) return true;
      return String(ev.materialPlanId || '') === parsed.materialPlanId &&
        String(ev.materialRuleId || '') === parsed.materialRuleId &&
        String(ev.start || '') === parsed.dueDate;
    }) || null;
  }
  function findMaterialActivity(id){
    return activities().find(function(act){
      if(!act || act.source !== 'material-action') return false;
      return String(act.sourceTaskKey || '') === String(id);
    }) || null;
  }
  function routeIsPending(route){
    if(!route) return false;
    if(route.source === 'planting'){
      const ev = findPlantingEvent(route.id);
      return !!(ev && !isFinal(ev));
    }
    if(route.source === 'material'){
      const ev = findMaterialEvent(route.id);
      if(ev) return !isFinal(ev);
      const act = findMaterialActivity(route.id);
      return !act || !isFinal(act);
    }
    return false;
  }
  function nextActivityId(){
    return safe(function(){ return takeNextActId(); }, Date.now() + Math.floor(Math.random() * 1000));
  }
  function plantingActionStatus(kind){
    if(kind === 'done') return 'done';
    if(kind === 'postpone') return 'postponed';
    if(kind === 'skip') return 'skipped';
    return 'pending';
  }
  function plantingActionLabel(status){
    if(status === 'done') return 'ทำแล้ว';
    if(status === 'postponed') return 'เลื่อน';
    if(status === 'skipped') return 'ไม่ทำ';
    return 'รอดำเนินการ';
  }
  function shouldRecordPlantingAction(route, before){
    const ev = findPlantingEvent(route && route.id);
    if(!ev) return false;
    if(route.kind === 'done') return statusOf(ev) === 'done';
    if(route.kind === 'skip') return statusOf(ev) === 'skipped';
    if(route.kind === 'postpone') return String(ev.start || '') !== String(before.start || '') || String(ev.postponedAt || '') !== String(before.postponedAt || '');
    return false;
  }
  function upsertPlantingActionActivity(route, before){
    if(!route || route.source !== 'planting' || !shouldRecordPlantingAction(route, before || {})) return;
    const ev = findPlantingEvent(route.id);
    if(!ev) return;
    const status = plantingActionStatus(route.kind);
    const taskId = ev.taskId || '';
    const duplicate = activities().find(function(act){
      if(!act || act.source !== 'planting-plan') return false;
      if(String(act.planId || '') !== String(ev.planId || '')) return false;
      if(String(act.taskId || '') !== String(taskId || '')) return false;
      if(String(act.actionButtonStatus || '') === status) return true;
      return status === 'done' && !act.actionButtonStatus;
    });
    const act = duplicate || {};
    if(!duplicate){
      act.id = nextActivityId();
      act.createdAt = new Date().toISOString();
      activities().unshift(act);
    }
    const scheduledDate = before && before.start ? before.start : (ev.originalDueDate || ev.start || todayIso());
    const label = plantingActionLabel(status);
    act.date = scheduledDate;
    act.type = label + ': ' + (ev.title || 'งานจากแผนปลูก');
    act.plot = ev.plot || '-';
    act.person = act.person || 'ระบบ';
    act.material = act.material || '-';
    act.note = [ev.cropName, ev.title, status === 'postponed' ? ('เลื่อนไป ' + (ev.start || '-')) : '', status === 'skipped' && ev.skippedReason ? ('เหตุผล: ' + ev.skippedReason) : ''].filter(Boolean).join(' - ');
    act.fromPlan = true;
    act.source = 'planting-plan';
    act.planId = ev.planId || '';
    act.taskId = taskId;
    act.sourceEventId = ev.id || '';
    act.plannedStatus = status;
    act.actionButtonStatus = status;
    act.actionAt = new Date().toISOString();
    if(status === 'done') act.completedAt = ev.completedAt || new Date().toISOString();
    if(status === 'postponed') act.postponedTo = ev.start || '';
    if(status === 'skipped') act.skipReason = ev.skippedReason || '';
    act.updatedAt = new Date().toISOString();
    ev.activityId = act.id;
    safe(function(){
      const plans = Array.isArray(plantingPlans) ? plantingPlans : [];
      const plan = plans.find(p => String(p && p.id) === String(ev.planId || ''));
      const task = plan && Array.isArray(plan.tasks) ? plan.tasks.find(t => String(t && t.id) === String(taskId)) : null;
      if(task){
        task.activityId = act.id;
        task.actionButtonStatus = status;
        task.updatedAt = new Date().toISOString();
      }
    });
  }
  function dueRouteKeys(){
    const keys = new Set();
    safe(function(){
      const api = window.farmPlannedTaskConfirmV0625;
      const list = api && typeof api.duePlannedTasks === 'function' ? api.duePlannedTasks(true) : [];
      (list || []).forEach(ev => {
        if(ev && !isFinal(ev)) keys.add(routeKey({source:'planting', id:String(ev.id)}));
      });
    });
    safe(function(){
      const api = window.farmNotificationLeadSettingsV0668;
      const list = api && typeof api.materialDueTasks === 'function'
        ? api.materialDueTasks()
        : events().filter(ev => ev && ev.source === 'material-action' && !isFinal(ev) && String(ev.start || '') <= todayIso()).map(ev => ({
            id: taskId(ev.materialPlanId, ev.materialRuleId, ev.start)
          }));
      (list || []).forEach(task => {
        if(task && task.id) keys.add(routeKey({source:'material', id:String(task.id)}));
      });
    });
    return keys;
  }
  function relatedCard(btn){
    return btn && btn.closest ? btn.closest('.mock-task-row,.mock-notify-item,.cal-detail-card,.calendar-detail-body,.planned-task-row,.material-action-only-row') : null;
  }
  function setCardStatus(card, text){
    if(!card) return;
    let status = card.querySelector('.farm-action-status-v0671');
    if(!status){
      const target = card.querySelector('.planned-task-right,.mock-notify-tag,.mock-status') || card;
      status = document.createElement('span');
      status.className = 'farm-action-status-v0671';
      target.insertAdjacentElement(target === card ? 'afterbegin' : 'beforebegin', status);
    }
    status.textContent = text;
  }
  function normalizeButton(btn){
    const route = routeFromButton(btn);
    if(!route) return;
    btn.dataset.farmActionSource = route.source;
    btn.dataset.farmActionKind = route.kind;
    btn.dataset.farmActionId = route.id;
    btn.classList.add('farm-action-btn-v0671');
    btn.textContent = labelFor(route.kind);
    btn.type = 'button';
    btn.setAttribute('aria-label', (route.source === 'material' ? 'แผนผลิตวัสดุ' : 'แผนปลูก') + ' - ' + labelFor(route.kind));
  }
  function normalizeGroup(group){
    if(!group) return;
    group.classList.add('farm-action-controls-v0671');
    const buttons = Array.from(group.querySelectorAll('button,.btn')).filter(btn => routeFromButton(btn));
    buttons.forEach(normalizeButton);
    const route = buttons.length ? routeFromButton(buttons[0]) : null;
    const card = group.closest('.mock-task-row,.mock-notify-item,.cal-detail-card,.planned-task-row,.material-action-only-row');
    if(card && route){
      card.classList.add('farm-action-card-v0671');
      card.dataset.farmActionSource = route.source;
      card.dataset.farmActionId = route.id;
    }
  }
  function normalizeSurfaces(root){
    root = root || document;
    root.querySelectorAll('.planned-task-actions,.planned-notify-actions,.material-calendar-actions-v0666,.farm-action-controls-v0667,.farm-action-controls-v0671').forEach(normalizeGroup);
    root.querySelectorAll('button[onclick*="confirmPlannedTaskDone"],button[onclick*="postponePlannedTask"],button[onclick*="skipPlannedTask"],button[onclick*="confirmMaterialActionDone"],button[onclick*="postponeMaterialAction"],button[onclick*="skipMaterialAction"]').forEach(function(btn){
      normalizeButton(btn);
      normalizeGroup(btn.closest('.planned-task-actions,.planned-notify-actions,.material-calendar-actions-v0666,.farm-action-controls-v0667,.farm-action-controls-v0671'));
    });
  }
  function markProcessing(route){
    document.querySelectorAll('[data-farm-action-source="'+esc(route.source)+'"][data-farm-action-id="'+esc(route.id)+'"]').forEach(function(node){
      node.classList.add('is-processing');
      if(node.matches && node.matches('button')) node.disabled = true;
      const card = relatedCard(node);
      if(card){
        card.classList.add('is-processing');
        setCardStatus(card, 'กำลังบันทึก');
      }
    });
  }
  function clearProcessing(){
    document.querySelectorAll('.is-processing').forEach(function(node){
      node.classList.remove('is-processing');
      if(node.matches && node.matches('button')) node.disabled = false;
    });
  }
  function cleanupResolvedRows(){
    const pending = dueRouteKeys();
    document.querySelectorAll('.farm-action-card-v0671').forEach(function(card){
      const routes = Array.from(card.querySelectorAll('[data-farm-action-source][data-farm-action-id]')).map(routeFromButton).filter(Boolean);
      if(!routes.length) return;
      const stillPending = routes.some(route => pending.has(routeKey(route)) || routeIsPending(route));
      if(stillPending) return;
      setCardStatus(card, 'บันทึกแล้ว');
      card.classList.add('is-resolved');
      setTimeout(function(){ safe(function(){ card.remove(); }); }, 190);
    });
    safe(function(){
      if(window.farmNotificationBehaviorSettingsV0670 && typeof window.farmNotificationBehaviorSettingsV0670.applyNotificationBehavior === 'function'){
        window.farmNotificationBehaviorSettingsV0670.applyNotificationBehavior();
      }
    });
  }
  function refreshAllActionSurfaces(){
    safe(function(){ if(typeof saveData === 'function') saveData(); });
    safe(function(){ if(typeof renderActivities === 'function') renderActivities(); });
    safe(function(){ if(typeof renderCalendar === 'function') renderCalendar(); });
    safe(function(){ if(typeof renderDashboardNotifications === 'function') renderDashboardNotifications(); });
    safe(function(){ if(typeof renderDashboard === 'function') renderDashboard(); });
    setTimeout(function(){ normalizeSurfaces(document); cleanupResolvedRows(); }, 30);
    setTimeout(function(){ normalizeSurfaces(document); cleanupResolvedRows(); clearProcessing(); }, 240);
  }
  function wrapActionHandler(name){
    const oldFn = window[name];
    if(typeof oldFn !== 'function' || oldFn.__v0671ActionWorkflow) return;
    const wrapped = function(id){
      const route = routeFromName(name, id);
      const before = snapshotRoute(route);
      if(route.source === 'planting' && route.kind === 'postpone'){
        pendingPlantingPostpone = {route:route, before:before};
      }
      markProcessing(route);
      const result = oldFn.apply(this, arguments);
      safe(function(){ upsertPlantingActionActivity(route, before); });
      setTimeout(function(){
        safe(function(){ upsertPlantingActionActivity(route, before); });
        normalizeSurfaces(document);
        cleanupResolvedRows();
        clearProcessing();
      }, 260);
      setTimeout(refreshAllActionSurfaces, 520);
      return result;
    };
    wrapped.__v0671ActionWorkflow = true;
    window[name] = wrapped;
    safe(function(){
      if(name === 'confirmPlannedTaskDone') confirmPlannedTaskDone = wrapped;
      if(name === 'postponePlannedTask') postponePlannedTask = wrapped;
      if(name === 'skipPlannedTask') skipPlannedTask = wrapped;
      if(name === 'confirmMaterialActionDone') confirmMaterialActionDone = wrapped;
      if(name === 'postponeMaterialAction') postponeMaterialAction = wrapped;
      if(name === 'skipMaterialAction') skipMaterialAction = wrapped;
    });
  }
  function wrapPostponeModalSave(){
    const oldSave = window.savePostponePlanModal;
    if(typeof oldSave !== 'function' || oldSave.__v0671ActionWorkflow) return;
    const wrapped = function(){
      const pending = pendingPlantingPostpone;
      const beforeEvents = events().filter(ev => ev && ev.source === 'planting-plan').map(ev => ({
        id:String(ev.id),
        start:ev.start || '',
        status:statusOf(ev),
        postponedAt:ev.postponedAt || '',
        activityId:ev.activityId || ''
      }));
      const result = oldSave.apply(this, arguments);
      setTimeout(function(){
        let target = pending && pending.route ? {route:pending.route, before:pending.before || {}} : null;
        if(!target){
          const changed = events().find(function(ev){
            if(!ev || ev.source !== 'planting-plan') return false;
            const prev = beforeEvents.find(item => item.id === String(ev.id));
            if(!prev) return false;
            return String(ev.start || '') !== String(prev.start || '') || String(ev.postponedAt || '') !== String(prev.postponedAt || '');
          });
          if(changed){
            const prev = beforeEvents.find(item => item.id === String(changed.id)) || {};
            target = {route:{source:'planting', kind:'postpone', id:String(changed.id)}, before:prev};
          }
        }
        if(target && target.route) safe(function(){ upsertPlantingActionActivity(target.route, target.before || {}); });
        const modal = document.getElementById('fp-postpone-modal');
        if(!modal || !modal.classList.contains('open')) pendingPlantingPostpone = null;
        refreshAllActionSurfaces();
      }, 80);
      return result;
    };
    wrapped.__v0671ActionWorkflow = true;
    window.savePostponePlanModal = wrapped;
    safe(function(){ savePostponePlanModal = wrapped; });
  }
  function wrapRender(name){
    const oldFn = window[name];
    if(typeof oldFn !== 'function' || oldFn.__v0671ActionWorkflow) return;
    const wrapped = function(){
      const result = oldFn.apply(this, arguments);
      setTimeout(function(){ normalizeSurfaces(document); cleanupResolvedRows(); stamp(); }, 0);
      setTimeout(function(){ normalizeSurfaces(document); cleanupResolvedRows(); }, 180);
      return result;
    };
    wrapped.__v0671ActionWorkflow = true;
    window[name] = wrapped;
    safe(function(){
      if(name === 'renderDashboard') renderDashboard = wrapped;
      if(name === 'renderDashboardNotifications') renderDashboardNotifications = wrapped;
      if(name === 'renderCalendar') renderCalendar = wrapped;
      if(name === 'showCalDetail') showCalDetail = wrapped;
      if(name === 'renderSettings') renderSettings = wrapped;
      if(name === 'navigate') navigate = wrapped;
    });
  }
  function installActionObserver(){
    if(window.__v0671ActionObserver) return;
    window.__v0671ActionObserver = new MutationObserver(function(records){
      let shouldRefresh = false;
      records.forEach(function(record){
        if(record.addedNodes && record.addedNodes.length) shouldRefresh = true;
      });
      if(shouldRefresh) setTimeout(function(){ normalizeSurfaces(document); cleanupResolvedRows(); }, 40);
    });
    window.__v0671ActionObserver.observe(document.body, {childList:true, subtree:true});
  }
  function stamp(){
    safe(function(){
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text,.badge-text span').forEach(function(el){
        if(!el) return;
        Array.from(el.childNodes || []).forEach(function(node){
          if(node.nodeType === Node.TEXT_NODE && /V0\.6\.\d+/.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/V0\.6\.\d+/g, VERSION);
        });
        if(el.children.length === 0 && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = el.textContent.replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  function boot(){
    ACTION_NAMES.forEach(wrapActionHandler);
    wrapPostponeModalSave();
    ['renderDashboard','renderDashboardNotifications','renderCalendar','showCalDetail','renderSettings','navigate'].forEach(wrapRender);
    normalizeSurfaces(document);
    cleanupResolvedRows();
    installActionObserver();
    stamp();
    setInterval(stamp, 1000);
  }
  window.farmActionWorkflowHardeningV0671 = {
    boot,
    normalizeSurfaces,
    cleanupResolvedRows,
    routeFromButton,
    dueRouteKeys,
    routeIsPending,
    refreshAllActionSurfaces,
    stamp
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      boot();
      safe(function(){ if(typeof renderDashboardNotifications === 'function') renderDashboardNotifications(); });
      safe(function(){ if(typeof renderDashboard === 'function') renderDashboard(); });
      console.log('Action workflow hardening ready', VERSION);
    }, 8400);
  });
})();
