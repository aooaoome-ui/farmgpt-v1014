/* V1.0.3 JS split: Care Task Insert Flow Fix.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let editorMode = { type:'add', editId:null, afterId:null };

  function safe(fn, fallback){
    try{ return fn(); }catch(e){ console.warn(VERSION, e); return fallback; }
  }
  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
  function js(v){
    return String(v ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');
  }
  function draft(){
    return safe(function(){ return (typeof _fpDraft !== 'undefined') ? _fpDraft : null; }, null);
  }
  function ensureDraft(){
    let d = draft();
    if(!d && typeof calculatePlantingPlan === 'function'){
      safe(function(){ calculatePlantingPlan(); });
      d = draft();
    }
    if(d && !Array.isArray(d.tasks)) d.tasks = [];
    return d;
  }
  function parseIso(v){
    const s = String(v || '').trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if(m){
      const y = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]);
      return String(y).padStart(4,'0') + '-' + String(m[2]).padStart(2,'0') + '-' + String(m[1]).padStart(2,'0');
    }
    const d = new Date(s);
    if(!isNaN(d.getTime())) return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
    return '';
  }
  function fmtDate(iso){
    return safe(function(){ return (typeof _fmtTHDateIso === 'function') ? _fmtTHDateIso(iso) : (iso || '-'); }, iso || '-');
  }
  function addDaysIso(iso, days){
    const d = new Date(String(iso || parseIso(new Date())) + 'T00:00:00');
    if(isNaN(d.getTime())) return iso || '';
    d.setDate(d.getDate() + Number(days || 0));
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  }
  function diffDays(a,b){
    const da = new Date(String(a || '') + 'T00:00:00');
    const db = new Date(String(b || '') + 'T00:00:00');
    if(isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
    return Math.round((db - da) / 86400000);
  }
  function icon(type){
    return safe(function(){ return (typeof _fpTaskIcon === 'function') ? _fpTaskIcon(type) : '•'; }, '•');
  }
  function makeTaskId(){
    return 'TASK-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
  }
  function ensureTaskIds(tasks){
    (tasks || []).forEach(function(t, i){
      if(t && typeof t === 'object' && !t.id) t.id = makeTaskId() + '-' + i;
    });
  }
  function sortedTasks(tasks){
    ensureTaskIds(tasks);
    return (tasks || []).slice().sort(function(a,b){
      return String(a.date || '').localeCompare(String(b.date || '')) || ((Number(a.order)||0) - (Number(b.order)||0));
    });
  }
  function resolveIndex(ref){
    const d = ensureDraft();
    const tasks = d && Array.isArray(d.tasks) ? d.tasks : [];
    ensureTaskIds(tasks);
    if(typeof ref === 'number' && Number.isFinite(ref)) return (ref >= 0 && ref < tasks.length) ? ref : -1;
    const s = String(ref ?? '').trim();
    if(!s) return -1;
    const byId = tasks.findIndex(function(t){ return String(t && t.id) === s; });
    if(byId >= 0) return byId;
    if(/^\d+$/.test(s)){
      const n = Number(s);
      return (n >= 0 && n < tasks.length) ? n : -1;
    }
    return -1;
  }
  function sortedIndexById(id){
    const d = ensureDraft();
    const tasks = sortedTasks((d && d.tasks) || []);
    return tasks.findIndex(function(t){ return String(t.id) === String(id); });
  }
  function suggestedInsertDate(afterTask){
    const d = ensureDraft();
    const ordered = sortedTasks((d && d.tasks) || []);
    const idx = ordered.findIndex(function(t){ return String(t.id) === String(afterTask && afterTask.id); });
    if(idx < 0) return (afterTask && afterTask.date) || (d && d.startDate) || '';
    const base = ordered[idx].date || (d && d.startDate) || '';
    const next = ordered[idx + 1];
    const plusOne = addDaysIso(base, 1);
    if(!next || !next.date) return plusOne || base;
    if(String(next.date) > String(plusOne)) return plusOne;
    return base;
  }
  function renumber(){
    const d = ensureDraft();
    if(!d || !Array.isArray(d.tasks)) return;
    d.tasks = sortedTasks(d.tasks);
    d.tasks.forEach(function(t, i){
      t.order = i + 1;
      t.day = diffDays(d.startDate, t.date);
    });
    const harvest = d.tasks.slice().reverse().find(function(t){ return /เก็บเกี่ยว|คาดเก็บ|พร้อมเก็บ/.test(String((t.title || '') + ' ' + (t.type || ''))); });
    if(harvest && harvest.date) d.harvestDate = harvest.date;
    ensureTaskIds(d.tasks);
  }
  function updateInsertContext(text){
    let el = document.getElementById('fp-care-insert-context-v0649');
    const editor = document.getElementById('fp-care-editor');
    if(!el && editor){
      el = document.createElement('div');
      el.id = 'fp-care-insert-context-v0649';
      el.className = 'fp-care-insert-context';
      const grid = editor.querySelector('.fp-care-editor-grid');
      if(grid) editor.insertBefore(el, grid);
      else editor.insertBefore(el, editor.firstChild);
    }
    if(!el) return;
    el.textContent = text || '';
    el.classList.toggle('show', !!text);
  }
  function ensureHelpText(){
    const modal = document.getElementById('modal-planting-plan');
    const card = modal ? modal.querySelector('.fp-care-card') : null;
    if(!card || document.getElementById('fp-care-insert-help-v0649')) return;
    const head = card.querySelector('.farm-plan-card-head');
    if(head){
      head.insertAdjacentHTML('afterend','<div id="fp-care-insert-help-v0649" class="fp-care-help fp-insert-help-v0649"></div>');
    }
  }
  function openLayer(){
    const modal = document.getElementById('modal-planting-plan');
    if(modal) modal.classList.add('care-card-open');
    const editor = document.getElementById('fp-care-editor');
    if(editor) editor.classList.add('open');
    setTimeout(function(){ document.getElementById('fp-care-title')?.focus(); }, 30);
  }
  function closeLayer(){
    const editor = document.getElementById('fp-care-editor');
    if(editor) editor.classList.remove('open');
    const modal = document.getElementById('modal-planting-plan');
    if(modal) modal.classList.remove('care-card-open');
    updateInsertContext('');
    editorMode = { type:'add', editId:null, afterId:null };
  }
  function fillEditor(task, title){
    const titleEl = document.getElementById('fp-care-editor-title');
    const titleInput = document.getElementById('fp-care-title');
    const typeInput = document.getElementById('fp-care-type');
    const dateInput = document.getElementById('fp-care-date');
    const noteInput = document.getElementById('fp-care-note');
    if(titleEl) titleEl.textContent = title || 'เพิ่มงานดูแล';
    if(titleInput) titleInput.value = task?.title || '';
    if(typeInput) typeInput.value = task?.type || 'น้ำหมัก';
    if(dateInput) dateInput.value = fmtDate(task?.date || (draft() && draft().startDate) || '');
    if(noteInput) noteInput.value = task?.note || '';
  }

  window.openCareTaskEditor = function(ref){
    const d = ensureDraft();
    if(!d) return;
    ensureHelpText();
    ensureTaskIds(d.tasks);
    const idx = resolveIndex(ref);
    const task = idx >= 0 ? d.tasks[idx] : null;
    editorMode = { type: task ? 'edit' : 'add', editId: task ? task.id : null, afterId:null };
    fillEditor(task, task ? 'แก้ไขงานดูแล' : 'เพิ่มงานดูแล');
    updateInsertContext('');
    openLayer();
  };

  window.insertCareTaskAfter = function(ref){
    const d = ensureDraft();
    if(!d) return;
    ensureHelpText();
    ensureTaskIds(d.tasks);
    const idx = resolveIndex(ref);
    const after = idx >= 0 ? d.tasks[idx] : null;
    if(!after) return;
    const order = sortedIndexById(after.id) + 1;
    editorMode = { type:'insert', editId:null, afterId:after.id };
    fillEditor({
      title:'',
      type:after.type || 'น้ำหมัก',
      date:suggestedInsertDate(after),
      note:''
    }, 'แทรกงานดูแล');
    updateInsertContext('กำลังแทรกงานต่อจากลำดับ ' + order + ': ' + (after.title || after.type || 'งานดูแล') + ' งานลำดับถัดไปจะยังอยู่ครบ');
    openLayer();
  };

  window.cancelCareTaskEditor = function(){ closeLayer(); };

  window.saveCareTaskEditor = function(){
    const d = ensureDraft();
    if(!d) return;
    ensureTaskIds(d.tasks);
    const title = (document.getElementById('fp-care-title')?.value || '').trim();
    const type = document.getElementById('fp-care-type')?.value || 'น้ำหมัก';
    const date = parseIso(document.getElementById('fp-care-date')?.value || d.startDate || '') || d.startDate || '';
    const note = (document.getElementById('fp-care-note')?.value || '').trim();
    if(!title){ safe(function(){ if(typeof showToast === 'function') showToast('กรอกชื่องานดูแลก่อน'); }); return; }
    const item = { id:makeTaskId(), order:(d.tasks.length + 1), day:diffDays(d.startDate, date), date, title, type, note, updatedAt:new Date().toISOString() };
    if(editorMode.type === 'edit'){
      const idx = resolveIndex(editorMode.editId);
      if(idx >= 0) Object.assign(d.tasks[idx], item, { id:d.tasks[idx].id, createdAt:d.tasks[idx].createdAt });
      else d.tasks.push(item);
    } else if(editorMode.type === 'insert'){
      const idx = resolveIndex(editorMode.afterId);
      d.tasks.splice(idx >= 0 ? idx + 1 : d.tasks.length, 0, item);
    } else {
      d.tasks.push(item);
    }
    renumber();
    closeLayer();
    if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft();
    safe(function(){ if(typeof showToast === 'function') showToast(editorMode.type === 'edit' ? '✅ แก้ไขงานดูแลแล้ว' : (editorMode.type === 'insert' ? '✅ แทรกงานดูแลแล้ว รายการเดิมยังอยู่ครบ' : '✅ เพิ่มงานดูแลแล้ว')); });
  };

  window.addDraftCareTask = function(){ window.openCareTaskEditor(null); };
  window.editDraftCareTask = function(ref){ window.openCareTaskEditor(ref); };
  window.editDraftTaskDate = function(ref){ window.openCareTaskEditor(ref); };
  window.deleteDraftCareTask = function(ref){
    const d = ensureDraft();
    if(!d || !Array.isArray(d.tasks)) return;
    ensureTaskIds(d.tasks);
    const idx = resolveIndex(ref);
    if(idx < 0) return;
    const task = d.tasks[idx] || {};
    if(!confirm('ลบงานดูแล "' + (task.title || task.type || '') + '" ?')) return;
    d.tasks.splice(idx, 1);
    renumber();
    if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft();
    safe(function(){ if(typeof showToast === 'function') showToast('ลบงานดูแลแล้ว'); });
  };

  window.renderPlantingDraft = function(){
    const d = ensureDraft();
    if(!d) return;
    ensureHelpText();
    renumber();
    const body = document.getElementById('fp-task-body');
    const tasks = sortedTasks(d.tasks || []);
    if(body){
      body.innerHTML = tasks.length ? tasks.map(function(t, idx){
        const id = t.id || String(idx);
        return '<tr>' +
          '<td><span class="fp-badge">' + esc(t.order || (idx + 1)) + '</span></td>' +
          '<td><strong>' + icon(t.type) + ' ' + esc(t.title || t.type || 'งานดูแล') + '</strong><div class="fp-task-note">' + esc(t.note || '') + '</div></td>' +
          '<td>' + fmtDate(t.date) + '</td>' +
          '<td><div class="fp-row-actions fp-row-actions-v0649">' +
            '<button type="button" class="btn btn-outline btn-sm fp-insert-btn" onclick="insertCareTaskAfter(\'' + js(id) + '\')">แทรก</button>' +
            '<button type="button" class="btn btn-outline btn-sm" onclick="editDraftCareTask(\'' + js(id) + '\')">แก้ไข</button>' +
            '<button type="button" class="btn btn-outline btn-sm btn-danger-soft" onclick="deleteDraftCareTask(\'' + js(id) + '\')">ลบ</button>' +
          '</div></td>' +
        '</tr>';
      }).join('') : '<tr><td colspan="4" style="text-align:center;color:#7a837b;padding:18px;">ยังไม่มีงานดูแล กด + เพิ่มงานดูแล</td></tr>';
    }
    safe(function(){ if(typeof renderPlantingTimeline === 'function') renderPlantingTimeline(); });
  };

  const previousOpen = window.openPlantingPlanModal;
  if(typeof previousOpen === 'function' && !previousOpen.__v0649CareInsert){
    const wrappedOpen = function(){
      const result = previousOpen.apply(this, arguments);
      setTimeout(function(){ ensureHelpText(); if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft(); }, 120);
      return result;
    };
    wrappedOpen.__v0649CareInsert = true;
    window.openPlantingPlanModal = wrappedOpen;
    try{ openPlantingPlanModal = wrappedOpen; }catch(e){}
  }

  function updateVersionLabels(){
    safe(function(){ document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
    safe(function(){
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(function(el){
        if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(updateVersionLabels, 700); });
  setTimeout(updateVersionLabels, 1300);
  console.log('✅ ' + VERSION + ' care task insert flow ready');
})();
