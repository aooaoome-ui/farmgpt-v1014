/* V1.0.3 JS split: Care Plan Action Buttons Visible Fix.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function jsArg(v){
    return String(v ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n').replace(/\r/g,'');
  }
  function fmtDate(iso){
    try{ return (typeof _fmtTHDateIso === 'function') ? _fmtTHDateIso(iso) : (iso || '-'); }
    catch(e){ return iso || '-'; }
  }
  function icon(type){
    try{ return (typeof _fpTaskIcon === 'function') ? _fpTaskIcon(type) : '🌱'; }
    catch(e){ return '🌱'; }
  }
  function getDraft(){
    try{ return (typeof _fpDraft !== 'undefined') ? _fpDraft : null; }
    catch(e){ return null; }
  }
  function ensureIds(tasks){
    tasks.forEach(function(t, i){
      if(t && typeof t === 'object' && !t.id){
        t.id = 'TASK-' + Date.now().toString(36) + '-' + i + '-' + Math.random().toString(36).slice(2,7);
      }
    });
  }
  function resolveIndex(ref){
    const d = getDraft();
    const tasks = d && Array.isArray(d.tasks) ? d.tasks : [];
    if(typeof ref === 'number') return ref >= 0 && ref < tasks.length ? ref : -1;
    const s = String(ref ?? '').trim();
    let idx = tasks.findIndex(function(t){ return String(t && t.id) === s; });
    if(idx >= 0) return idx;
    if(/^\d+$/.test(s)){
      const n = Number(s);
      if(n >= 0 && n < tasks.length) return n;
    }
    return -1;
  }
  function renderCareActionsVisible(){
    const d = getDraft();
    const body = document.getElementById('fp-task-body');
    if(!d || !body || !Array.isArray(d.tasks)) return;
    ensureIds(d.tasks);
    const tasks = d.tasks.slice().sort(function(a,b){ return String(a.date || '').localeCompare(String(b.date || '')); });
    body.innerHTML = tasks.length ? tasks.map(function(t, sortedIndex){
      const id = t.id || String(sortedIndex);
      const order = t.order || (sortedIndex + 1);
      return '<tr>'+
        '<td><span class="fp-badge">'+esc(order)+'</span></td>'+
        '<td><strong>'+icon(t.type)+' '+esc(t.title || t.type || 'งานดูแล')+'</strong><div class="fp-task-note">'+esc(t.note || '')+'</div></td>'+
        '<td>'+fmtDate(t.date)+'</td>'+
        '<td><div class="fp-row-actions">'+
          '<button type="button" class="btn btn-outline btn-sm" onclick="editDraftCareTask(\''+jsArg(id)+'\')">แก้ไข</button>'+
          '<button type="button" class="btn btn-outline btn-sm btn-danger-soft" onclick="deleteDraftCareTask(\''+jsArg(id)+'\')">ลบ</button>'+
        '</div></td>'+
      '</tr>';
    }).join('') : '<tr><td colspan="4" style="text-align:center;color:#7a837b;padding:18px;">ยังไม่มีงานดูแล กด + เพิ่มงานดูแล</td></tr>';
  }
  const oldRender = window.renderPlantingDraft;
  if(typeof oldRender === 'function' && !oldRender.__careActionsVisibleV0623){
    const wrapped = function(){
      const result = oldRender.apply(this, arguments);
      try{ renderCareActionsVisible(); }catch(e){ console.warn(VERSION, 'care action render warning', e); }
      return result;
    };
    wrapped.__careActionsVisibleV0623 = true;
    window.renderPlantingDraft = wrapped;
  }
  const oldOpen = window.openPlantingPlanModal;
  if(typeof oldOpen === 'function' && !oldOpen.__careActionsVisibleV0623){
    const wrappedOpen = function(){
      const result = oldOpen.apply(this, arguments);
      setTimeout(function(){ try{ renderCareActionsVisible(); }catch(e){} }, 80);
      return result;
    };
    wrappedOpen.__careActionsVisibleV0623 = true;
    window.openPlantingPlanModal = wrappedOpen;
  }
  window.renderCareActionsVisibleV0623 = renderCareActionsVisible;
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(function(){ try{ renderCareActionsVisible(); }catch(e){} }, 320); });
  console.log('✅ ' + VERSION + ' Care action buttons visible fix ready');
})();
