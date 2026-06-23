(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const DONE = 'done';
  const SKIPPED = 'skipped';
  const POSTPONED = 'postponed';

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function js(v){ return JSON.stringify(String(v ?? '')); }
  function todayIso(){ return safe(() => (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10), new Date().toISOString().slice(0,10)); }
  function parseDate(v){
    if(!v) return null;
    const raw = String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(raw + 'T00:00:00');
    const m = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if(m){ let y = +m[3]; if(y > 2400) y -= 543; return new Date(y, +m[2]-1, +m[1]); }
    const d = new Date(raw); return isNaN(d.getTime()) ? null : d;
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
  function fmt(v){ return safe(() => typeof fmtDate === 'function' ? fmtDate(v) : (v || '-'), v || '-'); }
  function materialList(){ try{ if(!Array.isArray(farmInputPlans)) farmInputPlans = []; return farmInputPlans; }catch(e){ return []; } }
  function activityList(){ try{ if(!Array.isArray(actItems)) actItems = []; return actItems; }catch(e){ return []; } }
  function buildTaskId(materialId, ruleId, dueDate){ return encodeURIComponent(String(materialId)) + '__' + encodeURIComponent(String(ruleId)) + '__' + encodeURIComponent(String(dueDate)); }
  function parseTaskId(id){
    const parts = String(id || '').split('__');
    return { materialId:decodeURIComponent(parts[0] || ''), ruleId:decodeURIComponent(parts[1] || ''), dueDate:decodeURIComponent(parts[2] || '') };
  }

  function defaultRules(item){
    const text = String((item && item.type) || '') + ' ' + String((item && item.name) || '') + ' ' + String((item && item.note) || '');
    if(/น้ำหมัก|สารสกัด/.test(text)){
      return [{id:'stir-vent', title:'คนน้ำหมัก/ระบายแก๊ส', intervalDays:7, note:'เปิดฝาระบายแก๊ส ตรวจกลิ่น และคนให้เข้ากัน'}];
    }
    if(/วัสดุเพาะ|วัสดุปลูก/.test(text)){
      return [{id:'water-hole', title:'เจาะรู/รดน้ำวัสดุปลูก', intervalDays:10, note:'ตรวจความชื้น เจาะรูระบายน้ำ และรดน้ำตามสภาพวัสดุ'}];
    }
    if(/ชีวภัณฑ์|ไตรโค|บิวเวอ/.test(text)){
      return [{id:'inspect-bio', title:'ตรวจชีวภัณฑ์', intervalDays:5, note:'ตรวจกลิ่น สี ความชื้น และเก็บในที่ร่ม'}];
    }
    return [{id:'turn-pile', title:'กลับกองปุ๋ยหมัก', intervalDays:7, note:'ตรวจความชื้นและกลับกองให้ระบายอากาศสม่ำเสมอ'}];
  }
  function ensureMaterialRules(item){
    if(!item || typeof item !== 'object') return;
    if(!Array.isArray(item.actionRules) || !item.actionRules.length) item.actionRules = defaultRules(item);
    if(!Array.isArray(item.actionLogs)) item.actionLogs = [];
    item.actionRules.forEach((rule, idx) => {
      rule.id = rule.id || ('rule-' + (idx + 1));
      rule.title = rule.title || 'งานดูแลวัสดุ';
      rule.intervalDays = Math.max(1, Number(rule.intervalDays || 7));
      rule.active = rule.active !== false;
    });
  }
  function statusActive(item){
    const status = String((item && item.status) || '');
    return !/พร้อมใช้|ใช้หมด|ยกเลิก/.test(status);
  }
  function latestRuleLog(item, ruleId){
    return (item.actionLogs || []).filter(l => l && String(l.ruleId) === String(ruleId))
      .sort((a,b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] || null;
  }
  function nextDueDate(item, rule){
    const last = latestRuleLog(item, rule.id);
    if(last && last.status === POSTPONED && last.dueDate) return last.dueDate;
    if(last && (last.status === DONE || last.status === SKIPPED)){
      return addDays(last.dueDate || last.actionDate || item.start || todayIso(), rule.intervalDays);
    }
    return addDays(item.start || todayIso(), rule.intervalDays);
  }
  function dueMaterialTasks(onlyDue){
    const now = todayIso();
    const tasks = [];
    materialList().forEach(item => {
      ensureMaterialRules(item);
      if(!item || !statusActive(item)) return;
      (item.actionRules || []).forEach(rule => {
        if(!rule || rule.active === false) return;
        const dueDate = nextDueDate(item, rule);
        if(!dueDate) return;
        if(onlyDue === true && String(dueDate) > now) return;
        tasks.push({
          id: buildTaskId(item.id, rule.id, dueDate),
          materialId:item.id,
          ruleId:rule.id,
          dueDate,
          title:rule.title,
          note:rule.note || '',
          materialName:item.name || item.id || '',
          materialType:item.type || '',
          material:item,
          rule
        });
      });
    });
    return tasks.sort((a,b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  }
  function findTask(taskId){
    const key = parseTaskId(taskId);
    const item = materialList().find(x => String(x && x.id) === String(key.materialId));
    if(!item) return null;
    ensureMaterialRules(item);
    const rule = (item.actionRules || []).find(r => String(r.id) === String(key.ruleId));
    if(!rule) return null;
    return {
      id: buildTaskId(item.id, rule.id, key.dueDate),
      materialId:item.id,
      ruleId:rule.id,
      dueDate:key.dueDate || nextDueDate(item, rule),
      title:rule.title,
      note:rule.note || '',
      materialName:item.name || item.id || '',
      materialType:item.type || '',
      material:item,
      rule
    };
  }
  function cleanParts(parts){
    return parts.map(x => String(x || '').trim()).filter(Boolean).join(' · ') || 'บันทึกกิจกรรม';
  }
  function createMaterialActivity(task){
    const acts = activityList();
    const duplicate = acts.find(a => a && a.source === 'material-action' && String(a.sourceTaskKey || '') === String(task.id));
    if(duplicate) return duplicate.id;
    const id = (typeof takeNextActId === 'function') ? takeNextActId() : Date.now();
    acts.unshift({
      id,
      date: task.dueDate || todayIso(),
      type: task.title || 'ดูแลวัสดุปลูก',
      plot: 'วัสดุปลูก',
      person: '—',
      material: task.materialName || '—',
      note: cleanParts([task.title + ' ' + task.materialName, task.note]),
      source:'material-action',
      materialPlanId: task.materialId,
      materialRuleId: task.ruleId,
      sourceTaskKey: task.id,
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    return id;
  }
  function addActionLog(task, status, extra){
    const item = task && task.material;
    if(!item) return;
    ensureMaterialRules(item);
    item.actionLogs.push(Object.assign({
      id:'mat-log-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
      ruleId: task.ruleId,
      status,
      dueDate: task.dueDate,
      actionDate: todayIso(),
      createdAt: new Date().toISOString()
    }, extra || {}));
    item.updatedAt = new Date().toISOString();
  }
  function parseInputDate(input){
    const raw = String(input || '').trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return safe(() => (typeof _parseThaiDate === 'function' && typeof _iso === 'function') ? _iso(_parseThaiDate(raw)) : iso(raw), iso(raw));
  }
  function refreshAll(){
    safe(() => saveData());
    safe(() => renderFarmInputPlans());
    safe(() => renderActivities());
    safe(() => renderCalendar());
    safe(() => renderDashboardNotifications());
    safe(() => renderDashboard());
  }
  window.confirmMaterialActionDone = function(taskId){
    const task = findTask(taskId);
    if(!task){ safe(() => showToast('ไม่พบงานวัสดุปลูก')); return; }
    const activityId = createMaterialActivity(task);
    addActionLog(task, DONE, {activityId});
    safe(() => showToast('บันทึกกิจกรรมวัสดุปลูกแล้ว'));
    refreshAll();
  };
  window.postponeMaterialAction = function(taskId){
    const task = findTask(taskId);
    if(!task) return;
    const input = prompt('เลื่อนงานไปวันที่ (YYYY-MM-DD หรือ วว/ดด/ปปปป)', addDays(task.dueDate || todayIso(), 1));
    if(input === null) return;
    const dueDate = parseInputDate(input);
    if(!dueDate){ safe(() => showToast('รูปแบบวันที่ไม่ถูกต้อง')); return; }
    addActionLog(task, POSTPONED, {originalDueDate:task.dueDate, dueDate});
    safe(() => showToast('เลื่อนงานวัสดุปลูกแล้ว'));
    refreshAll();
  };
  window.skipMaterialAction = function(taskId){
    const task = findTask(taskId);
    if(!task) return;
    const reason = prompt('เหตุผลที่ไม่ทำ/ข้ามงานนี้ (เว้นว่างได้)', '');
    if(reason === null) return;
    addActionLog(task, SKIPPED, {reason:reason || ''});
    safe(() => showToast('บันทึกว่าไม่ทำงานวัสดุปลูกแล้ว'));
    refreshAll();
  };

  function taskActionsHtml(task){
    const id = js(task.id);
    return '<div class="planned-task-actions">' +
      '<button type="button" class="btn done" onclick="event.stopPropagation();confirmMaterialActionDone('+id+')">ทำแล้ว</button>' +
      '<button type="button" class="btn move" onclick="event.stopPropagation();postponeMaterialAction('+id+')">เลื่อน</button>' +
      '<button type="button" class="btn skip" onclick="event.stopPropagation();skipMaterialAction('+id+')">ไม่ทำ</button>' +
      '</div>';
  }
  function injectDashboardMaterialTasks(){
    const list = document.getElementById('dash-todo-list');
    if(!list) return;
    list.querySelectorAll('.material-action-row').forEach(n => n.remove());
    const due = dueMaterialTasks(true).slice(0,4);
    if(!due.length) return;
    const now = todayIso();
    const html = due.map(task => {
      const when = String(task.dueDate || '') < now ? '<span class="planned-task-overdue">เลยกำหนด</span>' : 'วันนี้';
      return '<div class="mock-task-row planned-task-row material-action-row">' +
        '<span class="mock-task-dot"></span><div class="planned-task-main">' +
        '<div class="planned-task-meta"><div class="mock-task-title">' + esc(task.title || 'งานวัสดุปลูก') + '</div><div class="planned-task-right"><span class="mock-task-time">' + when + '</span><span class="mock-status wait">รอยืนยัน</span></div></div>' +
        '<div class="mock-task-sub">' + esc((task.materialName || '-') + ' · ' + fmt(task.dueDate)) + '</div>' +
        taskActionsHtml(task) + '</div></div>';
    }).join('');
    list.insertAdjacentHTML('afterbegin', html);
    const countEl = document.getElementById('dash-todo-count');
    if(countEl){
      const rows = list.querySelectorAll('.mock-task-row').length;
      countEl.textContent = rows + ' งาน';
    }
  }
  function injectNotifyMaterialTasks(){
    const panel = document.getElementById('notify-panel');
    if(!panel) return;
    panel.querySelectorAll('.material-task-notify-section').forEach(n => n.remove());
    const due = dueMaterialTasks(true).slice(0,8);
    if(!due.length) return;
    const items = due.map(task => '<div class="mock-notify-item planned-task-notify">' +
      '<div class="mock-notify-icon">M</div><div class="mock-notify-text"><div class="mock-notify-name">' + esc(task.title || 'งานวัสดุปลูก') + '</div>' +
      '<div class="mock-notify-sub">' + esc((task.materialName || '-') + ' · ' + fmt(task.dueDate)) + '</div>' +
      '<div class="planned-notify-actions"><button type="button" onclick="event.stopPropagation();confirmMaterialActionDone('+js(task.id)+')">ทำแล้ว</button><button type="button" onclick="event.stopPropagation();postponeMaterialAction('+js(task.id)+')">เลื่อน</button><button type="button" onclick="event.stopPropagation();skipMaterialAction('+js(task.id)+')">ไม่ทำ</button></div>' +
      '</div><span class="mock-notify-tag">วัสดุ</span></div>').join('');
    const section = '<div class="mock-notify-section material-task-notify-section"><div class="mock-notify-section-title"><span>งานวัสดุปลูกที่รอยืนยัน</span><span>' + due.length + ' งาน</span></div><div class="mock-notify-list">' + items + '</div></div>';
    const updateSection = panel.querySelector('.mock-notify-section:nth-of-type(2)');
    if(updateSection) updateSection.insertAdjacentHTML('beforebegin', section);
    else panel.insertAdjacentHTML('beforeend', section);
  }
  function cleanupActionActivityNotes(){
    activityList().forEach(act => {
      if(!act || act.source !== 'planting-plan' || !act.note) return;
      const raw = String(act.note);
      if(!/สร้างจาก|รหัสแผน|หมายเหตุเดิม|ซิงค์ข้อมูล/.test(raw)) return;
      const kept = raw.split('|').map(p => p.trim()).filter(p =>
        p && !/^สร้างจาก/.test(p) && !/^รหัสแผน/.test(p) && !/^ซิงค์ข้อมูล/.test(p)
      ).map(p => p.replace(/^พืช:\s*/,'').replace(/^งาน:\s*/,'').replace(/^หมายเหตุเดิม:\s*/,''));
      const clean = cleanParts(kept);
      if(clean && clean !== raw){ act.note = clean; act.updatedAt = new Date().toISOString(); }
    });
  }
  function installWrappers(){
    const oldDash = window.renderDashboard;
    if(typeof oldDash === 'function' && !oldDash.__v0658MaterialActions){
      const wrappedDash = function(){
        const result = oldDash.apply(this, arguments);
        safe(() => injectDashboardMaterialTasks());
        return result;
      };
      wrappedDash.__v0658MaterialActions = true;
      window.renderDashboard = wrappedDash;
      safe(() => { renderDashboard = wrappedDash; });
    }
    const oldNotify = window.renderDashboardNotifications;
    if(typeof oldNotify === 'function' && !oldNotify.__v0658MaterialActions){
      const wrappedNotify = function(){
        const result = oldNotify.apply(this, arguments);
        safe(() => injectNotifyMaterialTasks());
        return result;
      };
      wrappedNotify.__v0658MaterialActions = true;
      window.renderDashboardNotifications = wrappedNotify;
      safe(() => { renderDashboardNotifications = wrappedNotify; });
    }
    const oldConfirm = window.confirmPlannedTaskDone;
    if(typeof oldConfirm === 'function' && !oldConfirm.__v0658CleanActionNotes){
      const wrappedConfirm = function(){
        const result = oldConfirm.apply(this, arguments);
        safe(() => cleanupActionActivityNotes());
        safe(() => saveData());
        safe(() => renderActivities());
        return result;
      };
      wrappedConfirm.__v0658CleanActionNotes = true;
      window.confirmPlannedTaskDone = wrappedConfirm;
      safe(() => { confirmPlannedTaskDone = wrappedConfirm; });
    }
  }

  window.farmMaterialActionV0658 = {
    dueMaterialTasks,
    ensureAll:function(){ materialList().forEach(ensureMaterialRules); return materialList(); },
    cleanupActionActivityNotes
  };

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      safe(() => materialList().forEach(ensureMaterialRules));
      installWrappers();
      safe(() => cleanupActionActivityNotes());
      safe(() => saveData());
      safe(() => renderDashboardNotifications());
      safe(() => renderDashboard());
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
      console.log('Material action notifications ready', VERSION);
    }, 1900);
  });
})();
