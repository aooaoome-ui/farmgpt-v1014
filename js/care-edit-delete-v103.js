/* V1.0.3 JS split: Care Plan Edit/Delete Stable.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let careEditTaskId = null;

  function htmlEsc(v){
    return String(v ?? '').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function jsEsc(v){
    return String(v ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');
  }
  function fmtDate(iso){
    try{ return (typeof _fmtTHDateIso === 'function') ? _fmtTHDateIso(iso) : (iso || '-'); }
    catch(e){ return iso || '-'; }
  }
  function fmtIsoFromInput(v){
    try{ return (typeof _iso === 'function' && typeof _parseThaiDate === 'function') ? _iso(_parseThaiDate(v)) : String(v || ''); }
    catch(e){ return String(v || ''); }
  }
  function todayIso(){
    try{ return (typeof _iso === 'function') ? _iso(new Date()) : new Date().toISOString().slice(0,10); }
    catch(e){ return new Date().toISOString().slice(0,10); }
  }
  function taskIcon(type){
    try{ return (typeof _fpTaskIcon === 'function') ? _fpTaskIcon(type) : '🌱'; }
    catch(e){ return '🌱'; }
  }
  function draft(){
    try{ return (typeof _fpDraft !== 'undefined') ? _fpDraft : null; }
    catch(e){ return null; }
  }
  function ensureDraft(){
    let d = draft();
    if(!d && typeof calculatePlantingPlan === 'function'){
      try{ calculatePlantingPlan(); }catch(e){ console.warn(VERSION, 'calculate draft warning', e); }
      d = draft();
    }
    if(d && !Array.isArray(d.tasks)) d.tasks = [];
    return d;
  }
  function makeTaskId(){
    return 'TASK-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
  }
  function ensureTaskIds(){
    const d = ensureDraft();
    if(!d || !Array.isArray(d.tasks)) return;
    const seen = Object.create(null);
    d.tasks.forEach(function(t, i){
      if(!t || typeof t !== 'object') return;
      let id = String(t.id || t.taskId || '').trim();
      if(!id || seen[id]) id = (d.id || 'PLAN') + '-' + makeTaskId() + '-' + i;
      t.id = id;
      seen[id] = true;
    });
  }
  function resolveTaskIndex(ref){
    const d = ensureDraft();
    if(!d || !Array.isArray(d.tasks)) return -1;
    ensureTaskIds();
    if(typeof ref === 'number' && Number.isFinite(ref)) return (ref >= 0 && ref < d.tasks.length) ? ref : -1;
    const s = String(ref ?? '').trim();
    if(!s) return -1;
    const byId = d.tasks.findIndex(function(t){ return String(t && t.id) === s; });
    if(byId >= 0) return byId;
    if(/^\d+$/.test(s)){
      const n = Number(s);
      return (n >= 0 && n < d.tasks.length) ? n : -1;
    }
    return -1;
  }
  function renumberTasks(){
    const d = ensureDraft();
    if(!d || !Array.isArray(d.tasks)) return;
    try{ if(typeof _renumberDraftTasks === 'function') _renumberDraftTasks(); }
    catch(e){
      d.tasks.sort(function(a,b){ return String(a.date || '').localeCompare(String(b.date || '')); });
      d.tasks.forEach(function(t,i){ t.order = i + 1; });
    }
    ensureTaskIds();
  }
  function ensureCareCardShell(){
    const modal = document.getElementById('modal-planting-plan');
    const careCard = modal ? modal.querySelector('.fp-care-card') : null;
    if(careCard && !careCard.querySelector('.fp-care-help')){
      const head = careCard.querySelector('.farm-plan-card-head');
      if(head) head.insertAdjacentHTML('afterend','<div class="fp-care-help">แก้ไขหรือลบงานดูแลได้จากรายการนี้ แล้วกด “บันทึกแผน” เพื่อบันทึกจริง</div>');
    }
    if(modal && !document.getElementById('fp-care-submodal-backdrop')){
      const backdrop = document.createElement('div');
      backdrop.id = 'fp-care-submodal-backdrop';
      backdrop.className = 'fp-care-submodal-backdrop';
      backdrop.addEventListener('click', function(ev){
        ev.preventDefault();
        ev.stopPropagation();
        if(typeof window.cancelCareTaskEditor === 'function') window.cancelCareTaskEditor();
      });
      modal.appendChild(backdrop);
    }
  }

  function updateSummaryCards(){
    const d = ensureDraft();
    if(!d) return;
    const tasks = Array.isArray(d.tasks) ? d.tasks : [];
    const transplant = tasks.find(function(t){ return t && (t.type === 'ย้ายปลูก' || /ย้าย/.test(t.title || '')); });
    const harvest = tasks.find(function(t){ return t && (t.type === 'เก็บเกี่ยว' || /เก็บ/.test(t.title || '')); });
    const set = function(id, val){ const el = document.getElementById(id); if(el) el.textContent = val || '-'; };
    set('fp-sum-start', fmtDate(d.startDate));
    set('fp-sum-transplant', fmtDate(transplant && transplant.date));
    set('fp-sum-harvest', fmtDate((harvest && harvest.date) || d.harvestDate));
    set('fp-sum-tasks', tasks.length + ' งาน');
  }

  function openCareLayer(){
    const modal = document.getElementById('modal-planting-plan');
    if(modal) modal.classList.add('care-card-open');
    const editor = document.getElementById('fp-care-editor');
    if(editor) editor.classList.add('open');
    try{ if(typeof window.fitCareTaskCardV0615 === 'function') window.fitCareTaskCardV0615(); }catch(e){}
    setTimeout(function(){ document.getElementById('fp-care-title')?.focus(); }, 30);
  }
  function closeCareLayer(){
    const editor = document.getElementById('fp-care-editor');
    if(editor) editor.classList.remove('open');
    const modal = document.getElementById('modal-planting-plan');
    if(modal) modal.classList.remove('care-card-open');
    careEditTaskId = null;
  }

  window.openCareTaskEditor = function(ref){
    const d = ensureDraft();
    if(!d) return;
    ensureCareCardShell();
    ensureTaskIds();
    const idx = resolveTaskIndex(ref);
    const task = idx >= 0 ? d.tasks[idx] : null;
    careEditTaskId = task ? task.id : null;
    const titleEl = document.getElementById('fp-care-editor-title');
    const titleInput = document.getElementById('fp-care-title');
    const typeInput = document.getElementById('fp-care-type');
    const dateInput = document.getElementById('fp-care-date');
    const noteInput = document.getElementById('fp-care-note');
    if(titleEl) titleEl.textContent = task ? 'แก้ไขงานดูแล' : 'เพิ่มงานดูแล';
    if(titleInput) titleInput.value = task?.title || '';
    if(typeInput) typeInput.value = task?.type || 'น้ำหมัก';
    if(dateInput) dateInput.value = fmtDate(task?.date || d.startDate || todayIso());
    if(noteInput) noteInput.value = task?.note || '';
    openCareLayer();
  };

  window.cancelCareTaskEditor = function(){ closeCareLayer(); };

  window.saveCareTaskEditor = function(){
    const d = ensureDraft();
    if(!d) return;
    ensureTaskIds();
    const title = (document.getElementById('fp-care-title')?.value || '').trim();
    const type = document.getElementById('fp-care-type')?.value || 'น้ำหมัก';
    const date = fmtIsoFromInput(document.getElementById('fp-care-date')?.value || d.startDate || todayIso());
    const note = (document.getElementById('fp-care-note')?.value || '').trim();
    if(!title){ try{ if(typeof showToast === 'function') showToast('กรอกชื่องานดูแลก่อน'); }catch(e){} return; }
    const editIndex = careEditTaskId ? resolveTaskIndex(careEditTaskId) : -1;
    const item = {
      id: editIndex >= 0 ? d.tasks[editIndex].id : makeTaskId(),
      order: editIndex >= 0 ? (d.tasks[editIndex].order || editIndex + 1) : ((d.tasks || []).length + 1),
      day: (typeof _dateDiff === 'function' ? _dateDiff(d.startDate, date) : 0),
      date: date,
      title: title,
      type: type,
      note: note,
      updatedAt: new Date().toISOString()
    };
    if(editIndex >= 0) Object.assign(d.tasks[editIndex], item);
    else d.tasks.push(item);
    renumberTasks();
    closeCareLayer();
    if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft();
    try{ if(typeof showToast === 'function') showToast(editIndex >= 0 ? '✅ แก้ไขงานดูแลแล้ว' : '✅ เพิ่มงานดูแลแล้ว'); }catch(e){}
  };

  window.addDraftCareTask = function(){ window.openCareTaskEditor(null); };
  window.editDraftCareTask = function(ref){ window.openCareTaskEditor(ref); };
  window.editDraftTaskDate = function(ref){ window.openCareTaskEditor(ref); };
  window.deleteDraftCareTask = function(ref){
    const d = ensureDraft();
    if(!d || !Array.isArray(d.tasks)) return;
    ensureTaskIds();
    const idx = resolveTaskIndex(ref);
    if(idx < 0) return;
    const task = d.tasks[idx] || {};
    if(!confirm('ลบงานดูแล "' + (task.title || task.type || '') + '" ?')) return;
    d.tasks.splice(idx, 1);
    renumberTasks();
    if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft();
    try{ if(typeof showToast === 'function') showToast('ลบงานดูแลแล้ว'); }catch(e){}
  };

  const oldRenderTimeline = window.renderPlantingTimeline;
  window.renderPlantingDraft = function(){
    const d = ensureDraft();
    if(!d) return;
    ensureCareCardShell();
    ensureTaskIds();
    const body = document.getElementById('fp-task-body');
    const tasks = (d.tasks || []).slice().sort(function(a,b){ return String(a.date || '').localeCompare(String(b.date || '')); });
    if(body){
      body.innerHTML = tasks.length ? tasks.map(function(t, idx){
        const id = t.id || String(idx);
        return '<tr>' +
          '<td><span class="fp-badge">' + htmlEsc(t.order || (idx + 1)) + '</span></td>' +
          '<td><strong>' + taskIcon(t.type) + ' ' + htmlEsc(t.title || t.type || 'งานดูแล') + '</strong>' +
          '<div class="fp-task-note">' + htmlEsc(t.note || '') + '</div></td>' +
          '<td>' + fmtDate(t.date) + '</td>' +
          '<td><div class="fp-row-actions">' +
          '<button type="button" class="btn btn-outline btn-sm" onclick="editDraftCareTask(\'' + jsEsc(id) + '\')">แก้ไข</button>' +
          '<button type="button" class="btn btn-outline btn-sm btn-danger-soft" onclick="deleteDraftCareTask(\'' + jsEsc(id) + '\')">ลบ</button>' +
          '</div></td>' +
          '</tr>';
      }).join('') : '<tr><td colspan="4" style="text-align:center;color:#7a837b;padding:18px;">ยังไม่มีงานดูแล กด + เพิ่มงานดูแล</td></tr>';
    }
    try{ updateSummaryCards(); }catch(e){}
    try{ if(typeof oldRenderTimeline === 'function') oldRenderTimeline(); else if(typeof window.renderPlantingTimeline === 'function') window.renderPlantingTimeline(); }catch(e){ console.warn(VERSION, 'timeline warning', e); }
  };

  const oldViewPlan = window.viewPlantingPlan;
  if(typeof oldViewPlan === 'function' && !oldViewPlan.__careEditDeleteV0622){
    const wrappedView = function(){
      const result = oldViewPlan.apply(this, arguments);
      try{ ensureTaskIds(); if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft(); }catch(e){}
      return result;
    };
    wrappedView.__careEditDeleteV0622 = true;
    window.viewPlantingPlan = wrappedView;
  }

  const oldSavePlan = window.savePlantingPlan;
  if(typeof oldSavePlan === 'function' && !oldSavePlan.__careEditDeleteV0622){
    const wrappedSave = function(){
      try{ ensureTaskIds(); renumberTasks(); }catch(e){}
      return oldSavePlan.apply(this, arguments);
    };
    wrappedSave.__careEditDeleteV0622 = true;
    window.savePlantingPlan = wrappedSave;
  }

  const oldOpenModal = window.openPlantingPlanModal;
  if(typeof oldOpenModal === 'function' && !oldOpenModal.__careEditDeleteV0622){
    const wrappedOpenModal = function(){
      const result = oldOpenModal.apply(this, arguments);
      setTimeout(function(){ try{ ensureCareCardShell(); ensureTaskIds(); updateSummaryCards(); if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft(); }catch(e){} }, 50);
      return result;
    };
    wrappedOpenModal.__careEditDeleteV0622 = true;
    window.openPlantingPlanModal = wrappedOpenModal;
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      try{ ensureCareCardShell(); ensureTaskIds(); if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft(); }catch(e){}
      console.log('✅ ' + VERSION + ' Care Plan Edit/Delete ready');
    }, 260);
  });
})();
