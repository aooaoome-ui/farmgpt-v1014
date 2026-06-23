(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const SOURCE = 'material-action';
  const MAX_FUTURE_EVENTS_PER_RULE = 12;

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function materialList(){ try{ if(!Array.isArray(farmInputPlans)) farmInputPlans = []; return farmInputPlans; }catch(e){ return []; } }
  function eventList(){ try{ if(!Array.isArray(calEvents)) calEvents = []; return calEvents; }catch(e){ return []; } }
  function todayIso(){ return safe(() => (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10), new Date().toISOString().slice(0,10)); }
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
  function formSnapshot(){
    return {
      name:(document.getElementById('mat-name')?.value || '').trim(),
      type:document.getElementById('mat-type')?.value || '',
      note:(document.getElementById('mat-note')?.value || '').trim()
    };
  }
  function defaultRuleFor(item){
    const text = String((item && item.type) || '') + ' ' + String((item && item.name) || '') + ' ' + String((item && item.note) || '');
    if(/น้ำหมัก|สารสกัด/.test(text)) return {id:'stir-vent', title:'คนน้ำหมัก/ระบายแก๊ส', intervalDays:7, note:'เปิดฝาระบายแก๊ส ตรวจกลิ่น และคนให้เข้ากัน', active:true};
    if(/วัสดุเพาะ|วัสดุปลูก/.test(text)) return {id:'water-hole', title:'เจาะรู/รดน้ำวัสดุปลูก', intervalDays:10, note:'ตรวจความชื้น เจาะรูระบายน้ำ และรดน้ำตามสภาพวัสดุ', active:true};
    if(/ชีวภัณฑ์|ไตรโค|บิวเวอ/.test(text)) return {id:'inspect-bio', title:'ตรวจชีวภัณฑ์', intervalDays:5, note:'ตรวจกลิ่น สี ความชื้น และเก็บในที่ร่ม', active:true};
    return {id:'turn-pile', title:'กลับกองปุ๋ยหมัก', intervalDays:7, note:'ตรวจความชื้นและกลับกองให้ระบายอากาศสม่ำเสมอ', active:true};
  }
  function ensureRules(item){
    if(!item || typeof item !== 'object') return;
    if(!Array.isArray(item.actionRules) || !item.actionRules.length) item.actionRules = [defaultRuleFor(item)];
    if(!Array.isArray(item.actionLogs)) item.actionLogs = [];
    item.actionRules.forEach((rule, idx) => {
      rule.id = rule.id || ('rule-' + Date.now() + '-' + idx);
      rule.title = rule.title || 'งานดูแลวัสดุ';
      rule.intervalDays = Math.max(1, Number(rule.intervalDays || 7));
      rule.note = rule.note || '';
      rule.active = rule.active !== false;
    });
  }
  function inlineRulesFromItem(item){
    const source = item && Array.isArray(item.actionRules) && item.actionRules.length ? item.actionRules : [defaultRuleFor(item || formSnapshot())];
    return source.map((rule, idx) => ({
      id: rule.id || ('rule-' + Date.now() + '-' + idx),
      title: rule.title || 'งานดูแลวัสดุ',
      intervalDays: Math.max(1, Number(rule.intervalDays || 7)),
      note: rule.note || '',
      active: rule.active !== false
    }));
  }
  function ensureInlineSection(){
    const modal = document.getElementById('modal-material-plan');
    if(!modal) return null;
    let section = document.getElementById('mat-inline-rules');
    if(section) return section;
    const grid = modal.querySelector('.material-plan-grid');
    if(!grid) return null;
    grid.insertAdjacentHTML('beforeend',
      '<div id="mat-inline-rules" class="mat-inline-rules">'+
        '<div class="mat-inline-head"><div><div class="mat-inline-title">รอบงาน/แจ้งเตือน</div><div class="mat-inline-sub">ตั้ง action ของสูตรนี้ตั้งแต่ตอนเพิ่มแผนผลิต งานที่เปิดใช้จะถูกส่งเข้าแจ้งเตือนและปฏิทิน</div></div>'+
        '<div class="mat-inline-actions"><button type="button" class="btn btn-outline btn-sm" onclick="resetInlineMaterialRules()">ใช้ค่าแนะนำ</button><button type="button" class="btn btn-outline btn-sm" onclick="addInlineMaterialRule()">+ เพิ่ม action</button></div></div>'+
        '<div id="mat-inline-rule-list" class="mat-inline-list"></div>'+
        '<div class="mat-inline-calendar-note">เมื่อบันทึกแผนผลิต ระบบจะสร้าง/อัปเดตงานรอบวัสดุลงปฏิทินด้วย และแยกที่มาเป็นงานวัสดุปลูก</div>'+
      '</div>');
    return document.getElementById('mat-inline-rules');
  }
  function renderInlineRules(rules){
    ensureInlineSection();
    const box = document.getElementById('mat-inline-rule-list');
    if(!box) return;
    window.__matInlineRulesV0660 = (rules && rules.length ? rules : [defaultRuleFor(formSnapshot())]).map((rule, idx) => ({
      id: rule.id || ('rule-' + Date.now() + '-' + idx),
      title: rule.title || 'งานดูแลวัสดุ',
      intervalDays: Math.max(1, Number(rule.intervalDays || 7)),
      note: rule.note || '',
      active: rule.active !== false
    }));
    box.innerHTML = window.__matInlineRulesV0660.length ? window.__matInlineRulesV0660.map((rule, idx) => (
      '<div class="mat-inline-row" data-rule-index="'+idx+'">'+
        '<div class="mat-inline-field"><label>ชื่อ action</label><input data-field="title" value="'+esc(rule.title)+'" placeholder="เช่น กลับกองปุ๋ยหมัก"></div>'+
        '<div class="mat-inline-field"><label>ทุกกี่วัน</label><input data-field="intervalDays" type="number" min="1" step="1" value="'+esc(rule.intervalDays)+'"></div>'+
        '<div class="mat-inline-field"><label>หมายเหตุที่จะบันทึก</label><textarea data-field="note" placeholder="เนื้อหาหลัก ไม่ต้องใส่ว่าสร้างจากอะไร">'+esc(rule.note)+'</textarea></div>'+
        '<label class="mat-inline-active"><input data-field="active" type="checkbox" '+(rule.active === false ? '' : 'checked')+'> เปิด</label>'+
        '<button type="button" class="mat-inline-remove" title="ลบ action" onclick="removeInlineMaterialRule('+idx+')">×</button>'+
      '</div>'
    )).join('') : '<div class="mat-inline-empty">ยังไม่มี action ในสูตรนี้</div>';
  }
  function readInlineRules(){
    const rows = Array.from(document.querySelectorAll('#mat-inline-rule-list .mat-inline-row'));
    const previous = window.__matInlineRulesV0660 || [];
    const rules = [];
    for(const row of rows){
      const idx = Number(row.getAttribute('data-rule-index'));
      const old = previous[idx] || {};
      const title = (row.querySelector('[data-field="title"]')?.value || '').trim();
      const intervalDays = Math.max(1, Number(row.querySelector('[data-field="intervalDays"]')?.value || 0));
      const note = (row.querySelector('[data-field="note"]')?.value || '').trim();
      const active = !!row.querySelector('[data-field="active"]')?.checked;
      if(!title){ safe(() => showToast('กรอกชื่อ action ให้ครบ')); row.querySelector('[data-field="title"]')?.focus(); return null; }
      if(!Number.isFinite(intervalDays) || intervalDays < 1){ safe(() => showToast('จำนวนวันต้องมากกว่า 0')); row.querySelector('[data-field="intervalDays"]')?.focus(); return null; }
      rules.push({ id: old.id || ('rule-' + Date.now() + '-' + rules.length), title, intervalDays, note, active });
    }
    return rules;
  }
  window.addInlineMaterialRule = function(){
    const current = readInlineRules();
    const rules = current || (window.__matInlineRulesV0660 || []);
    rules.push({id:'rule-' + Date.now() + '-' + rules.length, title:'งานดูแลวัสดุ', intervalDays:7, note:'', active:true});
    renderInlineRules(rules);
  };
  window.removeInlineMaterialRule = function(index){
    const rules = (readInlineRules() || window.__matInlineRulesV0660 || []).filter((_, idx) => idx !== Number(index));
    renderInlineRules(rules);
  };
  window.resetInlineMaterialRules = function(){
    renderInlineRules([defaultRuleFor(formSnapshot())]);
  };
  function statusActive(item){
    const status = String((item && item.status) || '');
    return !/พร้อมใช้|ใช้หมด|ยกเลิก/.test(status);
  }
  function materialCalendarEventId(materialId, ruleId, dueDate){
    return 'mat-' + String(materialId || '').replace(/[^a-zA-Z0-9_-]/g,'') + '-' + String(ruleId || '').replace(/[^a-zA-Z0-9_-]/g,'') + '-' + String(dueDate || '');
  }
  function parseMaterialTaskId(taskId){
    const parts = String(taskId || '').split('__');
    return {
      materialId: decodeURIComponent(parts[0] || ''),
      ruleId: decodeURIComponent(parts[1] || ''),
      dueDate: decodeURIComponent(parts[2] || '')
    };
  }
  function findMaterialEvent(taskId){
    const key = parseMaterialTaskId(taskId);
    const id = materialCalendarEventId(key.materialId, key.ruleId, key.dueDate);
    return eventList().find(ev => String(ev && ev.id) === String(id)) ||
      eventList().find(ev => ev && ev.source === SOURCE && String(ev.materialPlanId || '') === String(key.materialId) && String(ev.materialRuleId || '') === String(key.ruleId) && String(ev.start || '') === String(key.dueDate));
  }
  function syncMaterialCalendarStatus(taskId, status){
    const key = parseMaterialTaskId(taskId);
    const item = materialList().find(x => String(x && x.id) === String(key.materialId));
    const ev = findMaterialEvent(taskId);
    if(!ev) return;
    ev.taskStatus = status;
    ev.confirmStatus = status;
    ev.updatedAt = new Date().toISOString();
    if(status === 'done'){
      ev.completedAt = new Date().toISOString();
      ev.completedDate = key.dueDate || todayIso();
      const latest = item && Array.isArray(item.actionLogs) ? item.actionLogs.slice().reverse().find(log => String(log.ruleId) === String(key.ruleId) && String(log.dueDate) === String(key.dueDate)) : null;
      if(latest && latest.activityId) ev.activityId = latest.activityId;
    }
    if(status === 'skipped') ev.skippedAt = new Date().toISOString();
  }
  function syncMaterialCalendarPostpone(taskId){
    const key = parseMaterialTaskId(taskId);
    const item = materialList().find(x => String(x && x.id) === String(key.materialId));
    const latest = item && Array.isArray(item.actionLogs) ? item.actionLogs.slice().reverse().find(log => String(log.ruleId) === String(key.ruleId) && String(log.originalDueDate || '') === String(key.dueDate || '')) : null;
    const ev = findMaterialEvent(taskId);
    if(!ev || !latest || !latest.dueDate) return;
    ev.id = materialCalendarEventId(key.materialId, key.ruleId, latest.dueDate);
    ev.start = latest.dueDate;
    ev.end = latest.dueDate;
    ev.taskStatus = 'pending';
    ev.confirmStatus = 'pending';
    ev.postponedAt = new Date().toISOString();
    ev.updatedAt = new Date().toISOString();
  }
  function materialDueDates(item, rule){
    const dates = [];
    const interval = Math.max(1, Number(rule.intervalDays || 7));
    let cursor = addDays(item.start || todayIso(), interval);
    const ready = item.ready || '';
    let guard = 0;
    while(cursor && guard < MAX_FUTURE_EVENTS_PER_RULE){
      if(ready && String(cursor) > String(ready)) break;
      dates.push(cursor);
      cursor = addDays(cursor, interval);
      guard++;
    }
    if(!dates.length && item.start) dates.push(addDays(item.start, interval));
    return dates;
  }
  function syncMaterialToCalendar(item){
    if(!item || !item.id) return;
    ensureRules(item);
    const events = eventList();
    const kept = events.filter(ev => !(ev && ev.source === SOURCE && String(ev.materialPlanId || '') === String(item.id)));
    events.length = 0;
    kept.forEach(ev => events.push(ev));
    if(!statusActive(item)) return;
    (item.actionRules || []).forEach(rule => {
      if(!rule || rule.active === false) return;
      materialDueDates(item, rule).forEach(dueDate => {
        events.push({
          id: materialCalendarEventId(item.id, rule.id, dueDate),
          source: SOURCE,
          materialPlanId: item.id,
          materialRuleId: rule.id,
          title: rule.title || 'งานวัสดุปลูก',
          start: dueDate,
          end: dueDate,
          priority: 'farm',
          cat: 'วัสดุปลูก',
          note: [item.name || '', rule.note || ''].filter(Boolean).join(' · '),
          materialName: item.name || '',
          materialType: item.type || '',
          taskStatus: 'pending'
        });
      });
    });
  }
  function syncAllMaterialsToCalendar(){
    materialList().forEach(item => syncMaterialToCalendar(item));
  }
  function findSavedItem(idx, oldLen, name){
    const list = materialList();
    if(idx >= 0 && list[idx]) return list[idx];
    if(list.length > oldLen) return list[list.length - 1];
    return list.find(item => String(item && item.name || '') === String(name || '')) || null;
  }
  function enhanceModalOnOpen(index){
    const item = Number.isInteger(index) && index >= 0 ? materialList()[index] : null;
    ensureInlineSection();
    renderInlineRules(inlineRulesFromItem(item || formSnapshot()));
    const typeEl = document.getElementById('mat-type');
    if(typeEl && !typeEl.__v0660InlineDefault){
      typeEl.__v0660InlineDefault = true;
      typeEl.addEventListener('change', function(){
        if(!window.__matInlineRulesDirtyV0660) renderInlineRules([defaultRuleFor(formSnapshot())]);
      });
    }
    const box = document.getElementById('mat-inline-rule-list');
    if(box && !box.__v0660DirtyWatch){
      box.__v0660DirtyWatch = true;
      box.addEventListener('input', function(){ window.__matInlineRulesDirtyV0660 = true; });
      box.addEventListener('change', function(){ window.__matInlineRulesDirtyV0660 = true; });
    }
  }
  function refreshAfterCalendarSync(){
    safe(() => saveData());
    safe(() => renderFarmInputPlans());
    safe(() => renderCalendar());
    safe(() => renderDashboardNotifications());
    safe(() => renderDashboard());
  }
  function installWrappers(){
    const oldOpen = window.openFarmInputPlanForm;
    if(typeof oldOpen === 'function' && !oldOpen.__v0660InlineRules){
      const wrappedOpen = function(i){
        window.__matInlineRulesDirtyV0660 = false;
        const result = oldOpen.apply(this, arguments);
        setTimeout(() => safe(() => enhanceModalOnOpen(Number.isInteger(i) ? i : -1)), 40);
        return result;
      };
      wrappedOpen.__v0660InlineRules = true;
      window.openFarmInputPlanForm = wrappedOpen;
      safe(() => { openFarmInputPlanForm = wrappedOpen; });
    }
    const oldSave = window.saveFarmMaterialPlan;
    if(typeof oldSave === 'function' && !oldSave.__v0660InlineRules){
      const wrappedSave = function(){
        const rules = readInlineRules();
        if(!rules) return;
        const idxRaw = document.getElementById('mat-index')?.value || '';
        const idx = idxRaw === '' ? -1 : Number(idxRaw);
        const oldLen = materialList().length;
        const name = (document.getElementById('mat-name')?.value || '').trim();
        const result = oldSave.apply(this, arguments);
        const item = findSavedItem(idx, oldLen, name);
        if(item){
          item.actionRules = rules;
          if(!Array.isArray(item.actionLogs)) item.actionLogs = [];
          item.updatedAt = new Date().toISOString();
          syncMaterialToCalendar(item);
          refreshAfterCalendarSync();
        }
        return result;
      };
      wrappedSave.__v0660InlineRules = true;
      window.saveFarmMaterialPlan = wrappedSave;
      safe(() => { saveFarmMaterialPlan = wrappedSave; });
    }
    const oldRender = window.renderFarmInputPlans;
    if(typeof oldRender === 'function' && !oldRender.__v0660CalendarSummary){
      const wrappedRender = function(){
        const result = oldRender.apply(this, arguments);
        document.querySelectorAll('#farm-input-body .farm-material-actions .mat-rule-btn').forEach(btn => btn.remove());
        return result;
      };
      wrappedRender.__v0660CalendarSummary = true;
      window.renderFarmInputPlans = wrappedRender;
      safe(() => { renderFarmInputPlans = wrappedRender; });
    }
    const oldDone = window.confirmMaterialActionDone;
    if(typeof oldDone === 'function' && !oldDone.__v0660CalendarStatus){
      const wrappedDone = function(taskId){
        const result = oldDone.apply(this, arguments);
        safe(() => syncMaterialCalendarStatus(taskId, 'done'));
        safe(() => saveData());
        safe(() => renderCalendar());
        return result;
      };
      wrappedDone.__v0660CalendarStatus = true;
      window.confirmMaterialActionDone = wrappedDone;
      safe(() => { confirmMaterialActionDone = wrappedDone; });
    }
    const oldPostpone = window.postponeMaterialAction;
    if(typeof oldPostpone === 'function' && !oldPostpone.__v0660CalendarStatus){
      const wrappedPostpone = function(taskId){
        const result = oldPostpone.apply(this, arguments);
        safe(() => syncMaterialCalendarPostpone(taskId));
        safe(() => saveData());
        safe(() => renderCalendar());
        return result;
      };
      wrappedPostpone.__v0660CalendarStatus = true;
      window.postponeMaterialAction = wrappedPostpone;
      safe(() => { postponeMaterialAction = wrappedPostpone; });
    }
    const oldSkip = window.skipMaterialAction;
    if(typeof oldSkip === 'function' && !oldSkip.__v0660CalendarStatus){
      const wrappedSkip = function(taskId){
        const result = oldSkip.apply(this, arguments);
        safe(() => syncMaterialCalendarStatus(taskId, 'skipped'));
        safe(() => saveData());
        safe(() => renderCalendar());
        return result;
      };
      wrappedSkip.__v0660CalendarStatus = true;
      window.skipMaterialAction = wrappedSkip;
      safe(() => { skipMaterialAction = wrappedSkip; });
    }
  }
  window.farmMaterialCalendarV0660 = {
    syncMaterialToCalendar,
    syncAllMaterialsToCalendar,
    readInlineRules,
    materialDueDates
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      installWrappers();
      safe(() => materialList().forEach(ensureRules));
      safe(() => syncAllMaterialsToCalendar());
      safe(() => saveData());
      safe(() => { if(typeof renderFarmInputPlans === 'function') renderFarmInputPlans(); });
      safe(() => { if(typeof renderCalendar === 'function') renderCalendar(); });
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
      console.log('Material actions inline + calendar sync ready', VERSION);
    }, 2600);
  });
})();
