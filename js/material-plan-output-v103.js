// V1.0.3 JS split: Material Plan Calendar, Activity, Notification Outputs.
// Preserves the stable farmMaterialPlanOutputsV0665 global API.
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const SOURCE = 'material-action';
  const STAGES = {start:'start', action:'action', ready:'ready'};
  const LOOKAHEAD_DAYS = 7;
  const MAX_RULE_DATES = 12;

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
  function inactive(item){
    const status = String(item && item.status || '');
    return /พร้อมใช้|ใช้หมด|ยกเลิก/.test(status);
  }
  function ensureRules(item){
    if(!item || typeof item !== 'object') return;
    if(!item.id) item.id = 'MAT-' + Date.now();
    item.start = iso(item.start || todayIso()) || todayIso();
    item.ready = iso(item.ready || addDays(item.start, 14)) || addDays(item.start, 14);
    if(!Array.isArray(item.actionRules) || !item.actionRules.length){
      if(window.farmMaterialActionV0658 && typeof window.farmMaterialActionV0658.ensureAll === 'function') safe(() => window.farmMaterialActionV0658.ensureAll());
      if(!Array.isArray(item.actionRules) || !item.actionRules.length){
        item.actionRules = [{id:'turn-pile', title:'กลับกอง/ตรวจวัสดุ', intervalDays:7, note:'ตรวจความชื้น กลิ่น สี และความพร้อมของวัสดุ', active:true}];
      }
    }
    if(!Array.isArray(item.actionLogs)) item.actionLogs = [];
    item.actionRules.forEach((rule, idx) => {
      rule.id = rule.id || ('rule-' + (idx + 1));
      rule.title = rule.title || 'งานดูแลวัสดุ';
      rule.intervalDays = Math.max(1, Number(rule.intervalDays || 7));
      rule.note = rule.note || '';
      rule.active = rule.active !== false;
    });
  }
  function ruleDates(item, rule){
    const dates = [];
    if(!item || !rule || rule.active === false || inactive(item)) return dates;
    let cursor = addDays(item.start || todayIso(), Math.max(1, Number(rule.intervalDays || 7)));
    let guard = 0;
    while(cursor && guard < MAX_RULE_DATES){
      if(item.ready && String(cursor) > String(item.ready)) break;
      dates.push(cursor);
      cursor = addDays(cursor, Math.max(1, Number(rule.intervalDays || 7)));
      guard++;
    }
    return dates;
  }
  function flowTasks(item){
    ensureRules(item);
    const out = [];
    if(item.start){
      out.push({stage:STAGES.start, ruleId:'start', dueDate:item.start, title:'เริ่มผลิตวัสดุปลูก', note:'เริ่มแผนผลิต ' + (item.name || item.id || ''), item});
    }
    (item.actionRules || []).forEach(rule => {
      if(!rule || rule.active === false) return;
      ruleDates(item, rule).forEach(dueDate => out.push({
        stage:STAGES.action,
        ruleId:rule.id,
        dueDate,
        title:rule.title || 'งานดูแลวัสดุ',
        note:rule.note || '',
        item,
        rule
      }));
    });
    if(item.ready){
      out.push({stage:STAGES.ready, ruleId:'ready', dueDate:item.ready, title:'ผลิตเสร็จ/พร้อมใช้', note:'วัสดุพร้อมใช้ ' + (item.name || item.id || ''), item});
    }
    out.forEach(task => {
      task.materialId = item.id;
      task.materialName = item.name || item.id || '';
      task.id = taskId(item.id, task.ruleId, task.dueDate);
      task.eventId = eventId(item.id, task.ruleId, task.dueDate);
    });
    return out.sort((a,b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  }
  function findEvent(task){
    return events().find(ev => String(ev && ev.id) === String(task.eventId)) ||
      events().find(ev => ev && ev.source === SOURCE && String(ev.materialPlanId || '') === String(task.materialId) && String(ev.materialRuleId || '') === String(task.ruleId) && String(ev.start || '') === String(task.dueDate));
  }
  function upsertEvent(task){
    const ev = findEvent(task) || {};
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
    ev.taskStatus = ev.taskStatus || 'pending';
    ev.confirmStatus = ev.confirmStatus || 'pending';
    ev.updatedAt = new Date().toISOString();
    if(!events().includes(ev)) events().push(ev);
  }
  function upsertActivity(task){
    const acts = activities();
    const existing = acts.find(act => act && act.source === SOURCE && String(act.sourceTaskKey || '') === String(task.id));
    const act = existing || {};
    if(!existing){
      act.id = (typeof takeNextActId === 'function') ? takeNextActId() : Date.now() + Math.floor(Math.random() * 1000);
      act.createdAt = new Date().toISOString();
      acts.unshift(act);
    }
    act.date = task.dueDate;
    act.type = task.title || 'งานวัสดุปลูก';
    act.plot = 'วัสดุปลูก';
    act.person = act.person || 'ระบบ';
    act.material = task.materialName || '-';
    act.note = [task.materialName, task.note].filter(Boolean).join(' - ');
    act.source = SOURCE;
    act.materialPlanId = task.materialId;
    act.materialRuleId = task.ruleId;
    act.materialStage = task.stage;
    act.sourceTaskKey = task.id;
    act.plannedStatus = act.plannedStatus || 'pending';
    act.updatedAt = new Date().toISOString();
  }
  function syncOneMaterial(item){
    if(!item || !item.id) return;
    ensureRules(item);
    const validKeys = new Set(flowTasks(item).map(task => task.id));
    const evs = events();
    for(let i = evs.length - 1; i >= 0; i--){
      const ev = evs[i];
      if(ev && ev.source === SOURCE && String(ev.materialPlanId || '') === String(item.id || '') && ev.managedBy === VERSION){
        const key = taskId(item.id, ev.materialRuleId || '', ev.start || '');
        if(!validKeys.has(key)) evs.splice(i, 1);
      }
    }
    const tasks = flowTasks(item);
    tasks.forEach(task => {
      upsertEvent(task);
      upsertActivity(task);
    });
  }
  function syncAllMaterials(){
    materials().forEach(syncOneMaterial);
  }
  function removeMaterialOutputs(materialId){
    if(!materialId) return;
    const evs = events();
    for(let i = evs.length - 1; i >= 0; i--){
      if(evs[i] && evs[i].source === SOURCE && String(evs[i].materialPlanId || '') === String(materialId)) evs.splice(i, 1);
    }
    const acts = activities();
    for(let i = acts.length - 1; i >= 0; i--){
      if(acts[i] && acts[i].source === SOURCE && String(acts[i].materialPlanId || '') === String(materialId)) acts.splice(i, 1);
    }
  }
  function dueFlowTasks(){
    const today = todayIso();
    const max = addDays(today, LOOKAHEAD_DAYS);
    const rows = [];
    materials().forEach(item => {
      flowTasks(item).forEach(task => {
        if(String(task.dueDate) <= String(max)){
          const act = activities().find(a => a && a.source === SOURCE && String(a.sourceTaskKey || '') === String(task.id));
          const ev = findEvent(task);
          const status = String((act && act.plannedStatus) || (ev && ev.taskStatus) || 'pending');
          if(!/done|skipped/.test(status)) rows.push(task);
        }
      });
    });
    return rows.sort((a,b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  }
  function stageLabel(stage){
    if(stage === STAGES.start) return 'เริ่มผลิต';
    if(stage === STAGES.ready) return 'ผลิตเสร็จ';
    return 'รอบงาน';
  }
  function injectNotifications(){
    const panel = document.getElementById('notify-panel');
    if(!panel) return;
    panel.querySelectorAll('.material-plan-flow-section').forEach(n => n.remove());
    const today = todayIso();
    const rows = dueFlowTasks().slice(0, 10);
    if(!rows.length) return;
    const html = rows.map(task => {
      const diff = daysBetween(task.dueDate, today);
      const tag = diff < 0 ? 'เลยกำหนด' : (diff === 0 ? 'วันนี้' : 'อีก ' + diff + ' วัน');
      return '<div class="mock-notify-item planned-task-notify">' +
        '<div class="mock-notify-icon">M</div>' +
        '<div class="mock-notify-text"><div class="mock-notify-name">' + esc(task.title || 'งานวัสดุปลูก') + '</div>' +
        '<div class="mock-notify-sub">' + esc(stageLabel(task.stage) + ' - ' + (task.materialName || '-') + ' - ' + fmt(task.dueDate)) + '</div></div>' +
        '<span class="mock-notify-tag">' + esc(tag) + '</span></div>';
    }).join('');
    const section = '<div class="mock-notify-section material-task-notify-section material-plan-flow-section" data-notify-source="material"><div class="mock-notify-section-title"><span>แจ้งเตือนแผนผลิตวัสดุ</span><span>' + rows.length + ' งาน</span></div><div class="mock-notify-list">' + html + '</div></div>';
    const updateSection = panel.querySelector('.mock-notify-section:nth-of-type(2)');
    if(updateSection) updateSection.insertAdjacentHTML('beforebegin', section);
    else panel.insertAdjacentHTML('beforeend', section);
    safe(() => {
      const api = window.farmCalendarNotificationFiltersV0662;
      if(api && typeof window.setNotifySourceFilterV0662 === 'function') window.setNotifySourceFilterV0662(api.getNotifyFilter ? api.getNotifyFilter() : 'all');
    });
  }
  function markActivityStatus(taskIdValue, status){
    const act = activities().find(a => a && a.source === SOURCE && String(a.sourceTaskKey || '') === String(taskIdValue || ''));
    if(act){
      act.plannedStatus = status;
      act.completedAt = status === 'done' ? new Date().toISOString() : act.completedAt;
      act.updatedAt = new Date().toISOString();
    }
  }
  function refreshAll(){
    safe(() => saveData());
    safe(() => renderFarmInputPlans());
    safe(() => renderActivities());
    safe(() => renderCalendar());
    safe(() => renderDashboardNotifications());
    safe(() => renderDashboard());
  }
  function stamp(){
    safe(() => {
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
        if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  function installWrappers(){
    const oldSave = window.saveFarmMaterialPlan;
    if(typeof oldSave === 'function' && !oldSave.__v0665MaterialOutputs){
      const wrappedSave = function(){
        const idxRaw = document.getElementById('mat-index')?.value || '';
        const idx = idxRaw === '' ? -1 : Number(idxRaw);
        const oldLen = materials().length;
        const result = oldSave.apply(this, arguments);
        const item = idx >= 0 ? materials()[idx] : (materials().length > oldLen ? materials()[materials().length - 1] : materials()[materials().length - 1]);
        const modalStillOpen = !!document.getElementById('modal-material-plan')?.classList.contains('open');
        if(item && !modalStillOpen){
          safe(() => syncOneMaterial(item));
          refreshAll();
          safe(() => showToast('แผนผลิตถูกส่งเข้าปฏิทิน กิจกรรม และแจ้งเตือนแล้ว'));
        }
        return result;
      };
      wrappedSave.__v0665MaterialOutputs = true;
      window.saveFarmMaterialPlan = wrappedSave;
      safe(() => { saveFarmMaterialPlan = wrappedSave; });
    }
    const oldDelete = window.deleteFarmInputPlan;
    if(typeof oldDelete === 'function' && !oldDelete.__v0665MaterialOutputs){
      const wrappedDelete = function(i){
        const item = materials()[Number(i)];
        const materialId = item && item.id;
        const before = materials().length;
        const result = oldDelete.apply(this, arguments);
        if(materialId && materials().length < before){
          removeMaterialOutputs(materialId);
          refreshAll();
        }
        return result;
      };
      wrappedDelete.__v0665MaterialOutputs = true;
      window.deleteFarmInputPlan = wrappedDelete;
      safe(() => { deleteFarmInputPlan = wrappedDelete; });
    }
    const oldReady = window.markFarmMaterialReady;
    if(typeof oldReady === 'function' && !oldReady.__v0665MaterialOutputs){
      const wrappedReady = function(i){
        const result = oldReady.apply(this, arguments);
        safe(() => syncOneMaterial(materials()[Number(i)]));
        refreshAll();
        return result;
      };
      wrappedReady.__v0665MaterialOutputs = true;
      window.markFarmMaterialReady = wrappedReady;
      safe(() => { markFarmMaterialReady = wrappedReady; });
    }
    const oldNotify = window.renderDashboardNotifications;
    if(typeof oldNotify === 'function' && !oldNotify.__v0665MaterialOutputs){
      const wrappedNotify = function(){
        const result = oldNotify.apply(this, arguments);
        safe(injectNotifications);
        return result;
      };
      wrappedNotify.__v0665MaterialOutputs = true;
      window.renderDashboardNotifications = wrappedNotify;
      safe(() => { renderDashboardNotifications = wrappedNotify; });
    }
    const oldDone = window.confirmMaterialActionDone;
    if(typeof oldDone === 'function' && !oldDone.__v0665MaterialOutputs){
      const wrappedDone = function(taskIdValue){
        const result = oldDone.apply(this, arguments);
        safe(() => markActivityStatus(taskIdValue, 'done'));
        safe(syncAllMaterials);
        refreshAll();
        return result;
      };
      wrappedDone.__v0665MaterialOutputs = true;
      window.confirmMaterialActionDone = wrappedDone;
      safe(() => { confirmMaterialActionDone = wrappedDone; });
    }
    const oldSkip = window.skipMaterialAction;
    if(typeof oldSkip === 'function' && !oldSkip.__v0665MaterialOutputs){
      const wrappedSkip = function(taskIdValue){
        const result = oldSkip.apply(this, arguments);
        safe(() => markActivityStatus(taskIdValue, 'skipped'));
        safe(syncAllMaterials);
        refreshAll();
        return result;
      };
      wrappedSkip.__v0665MaterialOutputs = true;
      window.skipMaterialAction = wrappedSkip;
      safe(() => { skipMaterialAction = wrappedSkip; });
    }
  }
  window.farmMaterialPlanOutputsV0665 = {syncOneMaterial, syncAllMaterials, dueFlowTasks, removeMaterialOutputs};
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      installWrappers();
      safe(syncAllMaterials);
      safe(() => saveData());
      safe(() => renderFarmInputPlans());
      safe(() => renderActivities());
      safe(() => renderCalendar());
      safe(() => renderDashboardNotifications());
      stamp();
      console.log('Material plan calendar/activity/notification outputs ready', VERSION);
    }, 4700);
  });
})();
