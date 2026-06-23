// V1.0.3 JS split: Material Activities Only From Action Buttons.
// Preserves the stable farmMaterialActionOnlyV0666 global API.
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const SOURCE = 'material-action';
  const LOOKAHEAD_DAYS = 7;
  const MAX_RULE_DATES = 12;
  const STATUS = {pending:'pending', done:'done', skipped:'skipped', postponed:'postponed'};

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function js(v){ return JSON.stringify(String(v ?? '')); }
  function todayIso(){ return safe(() => (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10), new Date().toISOString().slice(0,10)); }
  function materials(){ try{ if(!Array.isArray(farmInputPlans)) farmInputPlans = []; return farmInputPlans; }catch(e){ return []; } }
  function events(){ try{ if(!Array.isArray(calEvents)) calEvents = []; return calEvents; }catch(e){ return []; } }
  function activities(){ try{ if(!Array.isArray(actItems)) actItems = []; return actItems; }catch(e){ return []; } }
  function parseDate(v){
    if(!v) return null;
    const raw = String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw + 'T00:00:00');
    const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if(m){ let y = +m[3]; if(y > 2400) y -= 543; return new Date(y, +m[2]-1, +m[1]); }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  function iso(v){
    const d = v instanceof Date ? v : parseDate(v);
    if(!d) return '';
    return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
  }
  function addDays(v, n){
    const d = parseDate(v) || parseDate(todayIso()) || new Date();
    d.setDate(d.getDate() + Number(n || 0));
    return iso(d);
  }
  function daysBetween(a, b){
    const da = parseDate(a), db = parseDate(b);
    return da && db ? Math.round((da - db) / 86400000) : 9999;
  }
  function fmt(v){ return safe(() => typeof fmtDate === 'function' ? fmtDate(v) : (v || '-'), v || '-'); }
  function eventId(materialId, ruleId, dueDate){
    return 'mat-' + String(materialId || '').replace(/[^a-zA-Z0-9_-]/g,'') + '-' + String(ruleId || '').replace(/[^a-zA-Z0-9_-]/g,'') + '-' + String(dueDate || '');
  }
  function taskId(materialId, ruleId, dueDate){
    return encodeURIComponent(String(materialId || '')) + '__' + encodeURIComponent(String(ruleId || '')) + '__' + encodeURIComponent(String(dueDate || ''));
  }
  function parseTaskId(id){
    const parts = String(id || '').split('__');
    return {materialId:decodeURIComponent(parts[0] || ''), ruleId:decodeURIComponent(parts[1] || ''), dueDate:decodeURIComponent(parts[2] || '')};
  }
  function inactive(item){
    return /พร้อมใช้|ใช้หมด|ยกเลิก/.test(String(item && item.status || ''));
  }
  function defaultRule(){
    return {id:'turn-pile', title:'กลับกอง/ตรวจวัสดุ', intervalDays:7, note:'ตรวจความชื้น กลิ่น สี และความพร้อมของวัสดุ', active:true};
  }
  function ensureRules(item){
    if(!item || typeof item !== 'object') return;
    if(!item.id) item.id = 'MAT-' + Date.now();
    item.start = iso(item.start || todayIso()) || todayIso();
    item.ready = iso(item.ready || addDays(item.start, 14)) || addDays(item.start, 14);
    if(!Array.isArray(item.actionRules) || !item.actionRules.length) item.actionRules = [defaultRule()];
    if(!Array.isArray(item.actionLogs)) item.actionLogs = [];
    item.actionRules.forEach((rule, idx) => {
      rule.id = rule.id || ('rule-' + (idx + 1));
      rule.title = rule.title || 'งานดูแลวัสดุ';
      rule.intervalDays = Math.max(1, Number(rule.intervalDays || 7));
      rule.note = rule.note || '';
      rule.active = rule.active !== false;
    });
  }
  function baseTasks(item){
    ensureRules(item);
    const out = [];
    if(item.start) out.push({stage:'start', ruleId:'start', dueDate:item.start, title:'เริ่มผลิตวัสดุปลูก', note:'เริ่มแผนผลิต ' + (item.name || item.id || ''), item});
    if(!inactive(item)){
      (item.actionRules || []).forEach(rule => {
        if(!rule || rule.active === false) return;
        let cursor = addDays(item.start || todayIso(), Math.max(1, Number(rule.intervalDays || 7)));
        let guard = 0;
        while(cursor && guard < MAX_RULE_DATES){
          if(item.ready && String(cursor) > String(item.ready)) break;
          out.push({stage:'action', ruleId:rule.id, dueDate:cursor, title:rule.title || 'งานดูแลวัสดุ', note:rule.note || '', item, rule});
          cursor = addDays(cursor, Math.max(1, Number(rule.intervalDays || 7)));
          guard++;
        }
      });
    }
    if(item.ready) out.push({stage:'ready', ruleId:'ready', dueDate:item.ready, title:'ผลิตเสร็จ/พร้อมใช้', note:'วัสดุพร้อมใช้ ' + (item.name || item.id || ''), item});
    out.forEach(task => completeTask(item, task));
    return out.sort((a,b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  }
  function completeTask(item, task){
    task.materialId = item.id;
    task.materialName = item.name || item.id || '';
    task.id = taskId(item.id, task.ruleId, task.dueDate);
    task.eventId = eventId(item.id, task.ruleId, task.dueDate);
    return task;
  }
  function actionRecordsFor(task){
    return activities().filter(act => act && act.source === SOURCE && String(act.sourceTaskKey || '') === String(task.id) && String(act.actionButtonStatus || act.plannedStatus || '') !== STATUS.pending);
  }
  function latestAction(task){
    return actionRecordsFor(task).sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))[0] || null;
  }
  function scheduledTasks(item){
    const out = [];
    baseTasks(item).forEach(task => {
      const action = latestAction(task);
      const status = String(action && (action.actionButtonStatus || action.plannedStatus) || STATUS.pending);
      if(status === STATUS.postponed && action && action.postponedTo){
        const moved = Object.assign({}, task, {dueDate:action.postponedTo, originalDueDate:task.dueDate, taskStatus:STATUS.pending});
        completeTask(item, moved);
        out.push(moved);
        return;
      }
      task.taskStatus = status;
      out.push(task);
    });
    return out;
  }
  function findTask(id){
    const key = parseTaskId(id);
    let found = null;
    materials().some(item => {
      if(String(item && item.id || '') !== String(key.materialId)) return false;
      found = scheduledTasks(item).find(task => String(task.ruleId) === String(key.ruleId) && String(task.dueDate) === String(key.dueDate)) ||
        baseTasks(item).find(task => String(task.ruleId) === String(key.ruleId) && String(task.dueDate) === String(key.dueDate));
      return !!found;
    });
    return found;
  }
  function eventForTask(task){
    return events().find(ev => String(ev && ev.id) === String(task.eventId)) ||
      events().find(ev => ev && ev.source === SOURCE && String(ev.materialPlanId || '') === String(task.materialId) && String(ev.materialRuleId || '') === String(task.ruleId) && String(ev.start || '') === String(task.dueDate));
  }
  function upsertEvent(task){
    const ev = eventForTask(task) || {};
    ev.id = task.eventId;
    ev.source = SOURCE;
    ev.materialPlanId = task.materialId;
    ev.materialRuleId = task.ruleId;
    ev.materialStage = task.stage;
    ev.managedBy = VERSION;
    ev.title = task.title || 'งานวัสดุปลูก';
    ev.start = task.dueDate;
    ev.end = task.dueDate;
    ev.priority = 'material';
    ev.cat = 'วัสดุปลูก';
    ev.note = [task.materialName, task.note].filter(Boolean).join(' - ');
    ev.materialName = task.materialName;
    ev.materialType = task.item && task.item.type || '';
    ev.taskStatus = task.taskStatus || STATUS.pending;
    ev.confirmStatus = ev.taskStatus;
    ev.originalDueDate = task.originalDueDate || '';
    ev.updatedAt = new Date().toISOString();
    if(!events().includes(ev)) events().push(ev);
    return ev;
  }
  function removeAutoPendingActivities(){
    const acts = activities();
    for(let i = acts.length - 1; i >= 0; i--){
      const act = acts[i];
      if(!act || act.source !== SOURCE) continue;
      const status = String(act.actionButtonStatus || act.plannedStatus || '');
      const actionMade = !!(act.actionButtonStatus || act.completedAt || act.actionAt || act.postponedTo || act.skipReason);
      if(status === STATUS.pending && !actionMade) acts.splice(i, 1);
    }
  }
  function syncOneMaterial(item){
    if(!item || !item.id) return;
    ensureRules(item);
    const evs = events();
    for(let i = evs.length - 1; i >= 0; i--){
      if(evs[i] && evs[i].source === SOURCE && String(evs[i].materialPlanId || '') === String(item.id)) evs.splice(i, 1);
    }
    scheduledTasks(item).forEach(upsertEvent);
  }
  function syncAllMaterials(){
    removeAutoPendingActivities();
    materials().forEach(syncOneMaterial);
  }
  function dueTasks(){
    const today = todayIso();
    const max = addDays(today, LOOKAHEAD_DAYS);
    const rows = [];
    materials().forEach(item => {
      scheduledTasks(item).forEach(task => {
        if(String(task.dueDate) <= String(max) && !/done|skipped/.test(String(task.taskStatus || ''))) rows.push(task);
      });
    });
    return rows.sort((a,b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  }
  function stageLabel(stage){
    if(stage === 'start') return 'เริ่มผลิต';
    if(stage === 'ready') return 'ผลิตเสร็จ';
    return 'รอบงาน';
  }
  function statusLabel(status){
    if(status === STATUS.done) return 'ทำแล้ว';
    if(status === STATUS.skipped) return 'ไม่ทำ';
    if(status === STATUS.postponed) return 'เลื่อน';
    return 'รอทำ';
  }
  function actionButtons(task){
    const id = String(task.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return '<div class="planned-task-actions material-calendar-actions-v0666">' +
      '<button type="button" class="btn done" onclick="event.stopPropagation();confirmMaterialActionDone(\''+id+'\')">ทำ</button>' +
      '<button type="button" class="btn move" onclick="event.stopPropagation();postponeMaterialAction(\''+id+'\')">เลื่อน</button>' +
      '<button type="button" class="btn skip" onclick="event.stopPropagation();skipMaterialAction(\''+id+'\')">ไม่ทำ</button>' +
      '</div>';
  }
  function recordAction(task, status, extra){
    const existing = activities().find(act => act && act.source === SOURCE && String(act.sourceTaskKey || '') === String(task.id) && String(act.actionButtonStatus || '') === String(status));
    const act = existing || {};
    if(!existing){
      act.id = (typeof takeNextActId === 'function') ? takeNextActId() : Date.now() + Math.floor(Math.random() * 1000);
      act.createdAt = new Date().toISOString();
      activities().unshift(act);
    }
    act.date = task.dueDate;
    act.type = statusLabel(status) + ': ' + (task.title || 'งานวัสดุปลูก');
    act.plot = 'วัสดุปลูก';
    act.person = act.person || 'ระบบ';
    act.material = task.materialName || '-';
    act.note = [stageLabel(task.stage), task.materialName, task.note, extra && extra.note].filter(Boolean).join(' - ');
    act.source = SOURCE;
    act.materialPlanId = task.materialId;
    act.materialRuleId = task.ruleId;
    act.materialStage = task.stage;
    act.sourceTaskKey = task.id;
    act.plannedStatus = status;
    act.actionButtonStatus = status;
    act.actionAt = new Date().toISOString();
    act.completedAt = status === STATUS.done ? new Date().toISOString() : act.completedAt;
    if(extra && extra.postponedTo) act.postponedTo = extra.postponedTo;
    if(extra && extra.reason) act.skipReason = extra.reason;
    act.updatedAt = new Date().toISOString();
    return act;
  }
  function logAction(task, status, extra){
    const item = task && task.item;
    if(!item) return;
    ensureRules(item);
    item.actionLogs.push(Object.assign({
      id:'mat-log-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
      ruleId:task.ruleId,
      stage:task.stage,
      status,
      dueDate:task.dueDate,
      actionDate:todayIso(),
      createdAt:new Date().toISOString()
    }, extra || {}));
    item.updatedAt = new Date().toISOString();
  }
  function refreshAll(){
    removeAutoPendingActivities();
    safe(() => saveData());
    safe(() => renderFarmInputPlans());
    safe(() => renderActivities());
    safe(() => renderCalendar());
    safe(() => renderDashboardNotifications());
    safe(() => renderDashboard());
  }
  window.confirmMaterialActionDone = function(taskIdValue){
    const task = findTask(taskIdValue);
    if(!task){ safe(() => showToast('ไม่พบงานวัสดุปลูก')); return; }
    recordAction(task, STATUS.done);
    logAction(task, STATUS.done);
    const ev = eventForTask(task);
    if(ev){ ev.taskStatus = STATUS.done; ev.confirmStatus = STATUS.done; ev.completedAt = new Date().toISOString(); }
    safe(syncAllMaterials);
    safe(() => showToast('บันทึกกิจกรรมจากปุ่มทำแล้ว'));
    refreshAll();
  };
  window.postponeMaterialAction = function(taskIdValue){
    const task = findTask(taskIdValue);
    if(!task) return;
    const input = prompt('เลื่อนงานไปวันที่ (YYYY-MM-DD หรือ วว/ดด/ปปปป)', addDays(task.dueDate || todayIso(), 1));
    if(input === null) return;
    const next = iso(input);
    if(!next){ safe(() => showToast('รูปแบบวันที่ไม่ถูกต้อง')); return; }
    recordAction(task, STATUS.postponed, {postponedTo:next, note:'เลื่อนไป ' + fmt(next)});
    logAction(task, STATUS.postponed, {originalDueDate:task.dueDate, dueDate:next});
    const ev = eventForTask(task);
    if(ev){
      ev.id = eventId(task.materialId, task.ruleId, next);
      ev.start = next;
      ev.end = next;
      ev.originalDueDate = task.dueDate;
      ev.taskStatus = STATUS.pending;
      ev.confirmStatus = STATUS.pending;
      ev.postponedAt = new Date().toISOString();
    }
    safe(syncAllMaterials);
    safe(() => showToast('บันทึกกิจกรรมจากปุ่มเลื่อนแล้ว'));
    refreshAll();
  };
  window.skipMaterialAction = function(taskIdValue){
    const task = findTask(taskIdValue);
    if(!task) return;
    const reason = prompt('เหตุผลที่ไม่ทำ/ข้ามงานนี้ (เว้นว่างได้)', '');
    if(reason === null) return;
    recordAction(task, STATUS.skipped, {reason:reason || '', note:reason ? 'เหตุผล: ' + reason : ''});
    logAction(task, STATUS.skipped, {reason:reason || ''});
    const ev = eventForTask(task);
    if(ev){ ev.taskStatus = STATUS.skipped; ev.confirmStatus = STATUS.skipped; ev.skippedAt = new Date().toISOString(); }
    safe(syncAllMaterials);
    safe(() => showToast('บันทึกกิจกรรมจากปุ่มไม่ทำแล้ว'));
    refreshAll();
  };
  safe(() => {
    confirmMaterialActionDone = window.confirmMaterialActionDone;
    postponeMaterialAction = window.postponeMaterialAction;
    skipMaterialAction = window.skipMaterialAction;
  });
  function injectNotifications(){
    const panel = document.getElementById('notify-panel');
    if(!panel) return;
    panel.querySelectorAll('.material-task-notify-section').forEach(n => n.remove());
    const rows = dueTasks().slice(0, 10);
    if(!rows.length) return;
    const today = todayIso();
    const html = rows.map(task => {
      const diff = daysBetween(task.dueDate, today);
      const tag = diff < 0 ? 'เลยกำหนด' : (diff === 0 ? 'วันนี้' : 'อีก ' + diff + ' วัน');
      return '<div class="mock-notify-item planned-task-notify">' +
        '<div class="mock-notify-icon">M</div><div class="mock-notify-text"><div class="mock-notify-name">' + esc(task.title || 'งานวัสดุปลูก') + '</div>' +
        '<div class="mock-notify-sub">' + esc(stageLabel(task.stage) + ' - ' + (task.materialName || '-') + ' - ' + fmt(task.dueDate)) + '</div>' +
        actionButtons(task) + '</div><span class="mock-notify-tag">' + esc(tag) + '</span></div>';
    }).join('');
    const section = '<div class="mock-notify-section material-task-notify-section material-action-only-section" data-notify-source="material"><div class="mock-notify-section-title"><span>แจ้งเตือนแผนผลิตวัสดุ</span><span>' + rows.length + ' งาน</span></div><div class="mock-notify-list">' + html + '</div></div>';
    const updateSection = panel.querySelector('.mock-notify-section:nth-of-type(2)');
    if(updateSection) updateSection.insertAdjacentHTML('beforebegin', section);
    else panel.insertAdjacentHTML('beforeend', section);
  }
  function injectDashboardTasks(){
    const list = document.getElementById('dash-todo-list');
    if(!list) return;
    list.querySelectorAll('.material-action-row,.material-action-only-row').forEach(n => n.remove());
    const rows = dueTasks().slice(0, 5);
    if(!rows.length) return;
    const today = todayIso();
    const html = rows.map(task => {
      const diff = daysBetween(task.dueDate, today);
      const tag = diff < 0 ? '<span class="planned-task-overdue">เลยกำหนด</span>' : (diff === 0 ? 'วันนี้' : 'อีก ' + diff + ' วัน');
      return '<div class="mock-task-row planned-task-row material-action-only-row"><span class="mock-task-dot"></span><div class="planned-task-main">' +
        '<div class="planned-task-meta"><div class="mock-task-title">' + esc(task.title || 'งานวัสดุปลูก') + '</div><div class="planned-task-right"><span class="mock-task-time">' + tag + '</span><span class="mock-status wait">รอทำ</span></div></div>' +
        '<div class="mock-task-sub">' + esc(stageLabel(task.stage) + ' - ' + (task.materialName || '-') + ' - ' + fmt(task.dueDate)) + '</div>' +
        actionButtons(task) + '</div></div>';
    }).join('');
    list.insertAdjacentHTML('afterbegin', html);
    const countEl = document.getElementById('dash-todo-count');
    if(countEl) countEl.textContent = list.querySelectorAll('.mock-task-row').length + ' งาน';
  }
  function injectCalendarActions(id){
    const ev = events().find(e => String(e && e.id) === String(id));
    if(!ev || ev.source !== SOURCE || /done|skipped/.test(String(ev.taskStatus || ''))) return;
    const task = findTask(taskId(ev.materialPlanId, ev.materialRuleId, ev.start));
    if(!task) return;
    const body = document.getElementById('cal-detail-body') || document.getElementById('modal-cal-detail');
    if(!body || body.querySelector('.material-calendar-actions-v0666')) return;
    body.insertAdjacentHTML('beforeend', actionButtons(task));
  }
  function installWrappers(){
    const oldSave = window.saveFarmMaterialPlan;
    if(typeof oldSave === 'function' && !oldSave.__v0666ActionOnly){
      const wrappedSave = function(){
        const result = oldSave.apply(this, arguments);
        safe(syncAllMaterials);
        refreshAll();
        return result;
      };
      wrappedSave.__v0666ActionOnly = true;
      window.saveFarmMaterialPlan = wrappedSave;
      safe(() => { saveFarmMaterialPlan = wrappedSave; });
    }
    const oldNotify = window.renderDashboardNotifications;
    if(typeof oldNotify === 'function' && !oldNotify.__v0666ActionOnly){
      const wrappedNotify = function(){
        const result = oldNotify.apply(this, arguments);
        safe(injectNotifications);
        return result;
      };
      wrappedNotify.__v0666ActionOnly = true;
      window.renderDashboardNotifications = wrappedNotify;
      safe(() => { renderDashboardNotifications = wrappedNotify; });
    }
    const oldDash = window.renderDashboard;
    if(typeof oldDash === 'function' && !oldDash.__v0666ActionOnly){
      const wrappedDash = function(){
        const result = oldDash.apply(this, arguments);
        safe(injectDashboardTasks);
        return result;
      };
      wrappedDash.__v0666ActionOnly = true;
      window.renderDashboard = wrappedDash;
      safe(() => { renderDashboard = wrappedDash; });
    }
    const oldDetail = window.showCalDetail;
    if(typeof oldDetail === 'function' && !oldDetail.__v0666ActionOnly){
      const wrappedDetail = function(id){
        const result = oldDetail.apply(this, arguments);
        setTimeout(() => safe(() => injectCalendarActions(id)), 0);
        return result;
      };
      wrappedDetail.__v0666ActionOnly = true;
      window.showCalDetail = wrappedDetail;
      safe(() => { showCalDetail = wrappedDetail; });
    }
  }
  function stamp(){
    safe(() => {
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
        if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  window.farmMaterialActionOnlyV0666 = {syncAllMaterials, dueTasks, removeAutoPendingActivities, findTask};
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      installWrappers();
      safe(syncAllMaterials);
      safe(() => saveData());
      safe(() => renderFarmInputPlans());
      safe(() => renderActivities());
      safe(() => renderCalendar());
      safe(() => renderDashboardNotifications());
      safe(() => renderDashboard());
      stamp();
      console.log('Material activities now record only from action buttons', VERSION);
    }, 5400);
  });
})();
