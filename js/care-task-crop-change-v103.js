/* V1.0.3 JS split: Care Task Actions After Crop Change Fix.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let editorState = { mode:'add', editId:null, afterId:null };

  function safe(fn, fallback){ try{ return fn(); }catch(e){ console.warn(VERSION, e); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function draft(){ return safe(() => (typeof _fpDraft !== 'undefined' ? _fpDraft : null), null); }
  function ensureDraft(){
    let d = draft();
    if(!d && typeof calculatePlantingPlan === 'function'){
      safe(() => calculatePlantingPlan());
      d = draft();
    }
    if(d && !Array.isArray(d.tasks)) d.tasks = [];
    return d;
  }
  function makeTaskId(){ return 'TASK-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }
  function ensureTaskIds(tasks){
    (tasks || []).forEach((task, index) => {
      if(task && typeof task === 'object' && !task.id) task.id = makeTaskId() + '-' + index;
    });
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
  function fmtDate(iso){ return safe(() => (typeof _fmtTHDateIso === 'function' ? _fmtTHDateIso(iso) : (iso || '-')), iso || '-'); }
  function addDaysIso(iso, days){
    const d = new Date(String(iso || '') + 'T00:00:00');
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
  function icon(type){ return safe(() => (typeof _fpTaskIcon === 'function' ? _fpTaskIcon(type) : '•'), '•'); }
  function sorted(tasks){
    ensureTaskIds(tasks);
    return (tasks || []).slice().sort((a,b) => String(a.date || '').localeCompare(String(b.date || '')) || ((Number(a.order)||0) - (Number(b.order)||0)));
  }
  function resolveIndex(ref){
    const d = ensureDraft();
    const tasks = d && Array.isArray(d.tasks) ? d.tasks : [];
    ensureTaskIds(tasks);
    const s = String(ref ?? '').trim();
    if(!s) return -1;
    const byId = tasks.findIndex(t => String(t && t.id) === s);
    if(byId >= 0) return byId;
    if(/^\d+$/.test(s)){
      const n = Number(s);
      return n >= 0 && n < tasks.length ? n : -1;
    }
    return -1;
  }
  function renumber(){
    const d = ensureDraft();
    if(!d || !Array.isArray(d.tasks)) return;
    d.tasks = sorted(d.tasks);
    d.tasks.forEach((task, index) => {
      task.order = index + 1;
      task.day = diffDays(d.startDate, task.date);
    });
    const harvest = d.tasks.slice().reverse().find(t => /เก็บเกี่ยว|คาดเก็บ|พร้อมเก็บ/.test(String((t.title || '') + ' ' + (t.type || ''))));
    if(harvest && harvest.date) d.harvestDate = harvest.date;
  }
  function ensureInsertContext(){
    let el = document.getElementById('fp-care-insert-context-v0650');
    const editor = document.getElementById('fp-care-editor');
    if(!el && editor){
      el = document.createElement('div');
      el.id = 'fp-care-insert-context-v0650';
      const grid = editor.querySelector('.fp-care-editor-grid');
      if(grid) editor.insertBefore(el, grid);
      else editor.insertBefore(el, editor.firstChild);
    }
    return el;
  }
  function setInsertContext(text){
    const el = ensureInsertContext();
    if(!el) return;
    el.textContent = text || '';
    el.classList.toggle('show', !!text);
  }
  function openCareLayer(){
    const modal = document.getElementById('modal-planting-plan');
    if(modal) modal.classList.add('care-card-open');
    const editor = document.getElementById('fp-care-editor');
    if(editor) editor.classList.add('open');
    setTimeout(() => document.getElementById('fp-care-title')?.focus(), 30);
  }
  function closeCareLayer(){
    const editor = document.getElementById('fp-care-editor');
    if(editor) editor.classList.remove('open');
    const modal = document.getElementById('modal-planting-plan');
    if(modal) modal.classList.remove('care-card-open');
    setInsertContext('');
    editorState = { mode:'add', editId:null, afterId:null };
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
  function suggestDateAfter(task){
    const d = ensureDraft();
    const ordered = sorted((d && d.tasks) || []);
    const idx = ordered.findIndex(t => String(t.id) === String(task && task.id));
    if(idx < 0) return (task && task.date) || (d && d.startDate) || '';
    const base = ordered[idx].date || (d && d.startDate) || '';
    const next = ordered[idx + 1];
    const plusOne = addDaysIso(base, 1);
    if(!next || !next.date) return plusOne || base;
    return String(next.date) > String(plusOne) ? plusOne : base;
  }
  function renderCareRows(){
    const d = ensureDraft();
    if(!d) return;
    renumber();
    const body = document.getElementById('fp-task-body');
    if(!body) return;
    const tasks = sorted(d.tasks || []);
    body.innerHTML = tasks.length ? tasks.map((task, idx) => {
      const id = String(task.id || idx);
      return '<tr>' +
        '<td><span class="fp-badge">' + esc(task.order || (idx + 1)) + '</span></td>' +
        '<td><strong>' + icon(task.type) + ' ' + esc(task.title || task.type || 'งานดูแล') + '</strong><div class="fp-task-note">' + esc(task.note || '') + '</div></td>' +
        '<td>' + fmtDate(task.date) + '</td>' +
        '<td><div class="fp-row-actions fp-care-actions-v0650">' +
          '<button type="button" class="btn btn-outline btn-sm fp-insert-btn" data-care-action="insert" data-task-id="' + esc(id) + '">แทรก</button>' +
          '<button type="button" class="btn btn-outline btn-sm" data-care-action="edit" data-task-id="' + esc(id) + '">แก้ไข</button>' +
          '<button type="button" class="btn btn-outline btn-sm btn-danger-soft" data-care-action="delete" data-task-id="' + esc(id) + '">ลบ</button>' +
        '</div></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="4" style="text-align:center;color:#7a837b;padding:18px;">ยังไม่มีงานดูแล กด + เพิ่มงานดูแล</td></tr>';
    safe(() => { if(typeof renderPlantingTimeline === 'function') renderPlantingTimeline(); });
  }
  function repairCareActions(){
    const modal = document.getElementById('modal-planting-plan');
    if(!modal || !modal.classList.contains('open')) return;
    ensureDraft();
    renderCareRows();
  }

  window.openCareTaskEditor = function(ref){
    const d = ensureDraft();
    if(!d) return;
    ensureTaskIds(d.tasks);
    const idx = resolveIndex(ref);
    const task = idx >= 0 ? d.tasks[idx] : null;
    editorState = { mode:task ? 'edit' : 'add', editId:task ? task.id : null, afterId:null };
    fillEditor(task, task ? 'แก้ไขงานดูแล' : 'เพิ่มงานดูแล');
    setInsertContext('');
    openCareLayer();
  };
  window.insertCareTaskAfter = function(ref){
    const d = ensureDraft();
    if(!d) return;
    ensureTaskIds(d.tasks);
    const idx = resolveIndex(ref);
    const task = idx >= 0 ? d.tasks[idx] : null;
    if(!task) return;
    editorState = { mode:'insert', editId:null, afterId:task.id };
    const order = sorted(d.tasks).findIndex(t => String(t.id) === String(task.id)) + 1;
    fillEditor({ title:'', type:task.type || 'น้ำหมัก', date:suggestDateAfter(task), note:'' }, 'แทรกงานดูแล');
    setInsertContext('กำลังแทรกงานต่อจากลำดับ ' + order + ': ' + (task.title || task.type || 'งานดูแล') + ' โดยไม่ลบงานเดิมที่อยู่ถัดไป');
    openCareLayer();
  };
  window.cancelCareTaskEditor = function(){ closeCareLayer(); };
  window.saveCareTaskEditor = function(){
    const d = ensureDraft();
    if(!d) return;
    ensureTaskIds(d.tasks);
    const title = (document.getElementById('fp-care-title')?.value || '').trim();
    const type = document.getElementById('fp-care-type')?.value || 'น้ำหมัก';
    const date = parseIso(document.getElementById('fp-care-date')?.value || d.startDate || '') || d.startDate || '';
    const note = (document.getElementById('fp-care-note')?.value || '').trim();
    if(!title){ safe(() => { if(typeof showToast === 'function') showToast('กรอกชื่องานดูแลก่อน'); }); return; }
    const item = { id:makeTaskId(), order:d.tasks.length + 1, day:diffDays(d.startDate, date), date, title, type, note, updatedAt:new Date().toISOString() };
    if(editorState.mode === 'edit'){
      const idx = resolveIndex(editorState.editId);
      if(idx >= 0) Object.assign(d.tasks[idx], item, { id:d.tasks[idx].id, createdAt:d.tasks[idx].createdAt });
      else d.tasks.push(item);
    } else if(editorState.mode === 'insert'){
      const idx = resolveIndex(editorState.afterId);
      d.tasks.splice(idx >= 0 ? idx + 1 : d.tasks.length, 0, item);
    } else {
      d.tasks.push(item);
    }
    closeCareLayer();
    renderCareRows();
    safe(() => { if(typeof showToast === 'function') showToast(editorState.mode === 'edit' ? '✅ แก้ไขงานดูแลแล้ว' : (editorState.mode === 'insert' ? '✅ แทรกงานดูแลแล้ว' : '✅ เพิ่มงานดูแลแล้ว')); });
  };
  window.deleteDraftCareTask = function(ref){
    const d = ensureDraft();
    if(!d || !Array.isArray(d.tasks)) return;
    ensureTaskIds(d.tasks);
    const idx = resolveIndex(ref);
    if(idx < 0) return;
    const task = d.tasks[idx] || {};
    if(!confirm('ลบงานดูแล "' + (task.title || task.type || '') + '" ?')) return;
    d.tasks.splice(idx, 1);
    renderCareRows();
    safe(() => { if(typeof showToast === 'function') showToast('ลบงานดูแลแล้ว'); });
  };
  window.editDraftCareTask = function(ref){ window.openCareTaskEditor(ref); };
  window.editDraftTaskDate = function(ref){ window.openCareTaskEditor(ref); };
  window.addDraftCareTask = function(){ window.openCareTaskEditor(null); };
  window.renderPlantingDraft = function(){ renderCareRows(); };
  window.repairCareTaskActionsAfterCropChange = repairCareActions;
  safe(() => { openCareTaskEditor = window.openCareTaskEditor; });
  safe(() => { insertCareTaskAfter = window.insertCareTaskAfter; });
  safe(() => { cancelCareTaskEditor = window.cancelCareTaskEditor; });
  safe(() => { saveCareTaskEditor = window.saveCareTaskEditor; });
  safe(() => { deleteDraftCareTask = window.deleteDraftCareTask; });
  safe(() => { editDraftCareTask = window.editDraftCareTask; });
  safe(() => { editDraftTaskDate = window.editDraftTaskDate; });
  safe(() => { addDraftCareTask = window.addDraftCareTask; });
  safe(() => { renderPlantingDraft = window.renderPlantingDraft; });

  document.addEventListener('click', function(ev){
    const btn = ev.target && ev.target.closest ? ev.target.closest('#modal-planting-plan [data-care-action]') : null;
    if(!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    const action = btn.getAttribute('data-care-action');
    const id = btn.getAttribute('data-task-id');
    if(action === 'insert') window.insertCareTaskAfter(id);
    if(action === 'edit') window.openCareTaskEditor(id);
    if(action === 'delete') window.deleteDraftCareTask(id);
  }, true);

  ['onFarmPlanCropTypeChange','onFarmPlanCropNameChange','calculatePlantingPlan'].forEach(function(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn.__v0650CareRepair) return;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      setTimeout(repairCareActions, 0);
      setTimeout(repairCareActions, 120);
      return result;
    };
    wrapped.__v0650CareRepair = true;
    window[name] = wrapped;
    try{ eval(name + ' = window[name]'); }catch(e){}
  });

  function updateVersionLabels(){
    safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
    safe(() => {
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
        if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ updateVersionLabels(); repairCareActions(); }, 900); });
  setTimeout(updateVersionLabels, 1400);
  console.log('✅ ' + VERSION + ' care task crop-change actions fixed');
})();
