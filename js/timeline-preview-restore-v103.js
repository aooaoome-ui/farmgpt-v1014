/* V1.0.3 JS split: Timeline Preview Restore.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const PATCH_VERSION = 'V0.6.34';
  function esc(v){
    try{ return (typeof safeEsc === 'function') ? safeEsc(v) : (typeof _esc === 'function' ? _esc(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))); }
    catch(e){ return String(v ?? ''); }
  }
  function getDraft(){
    try{ if(typeof _fpDraft !== 'undefined' && _fpDraft) return _fpDraft; }catch(e){}
    try{ if(window._fpDraft) return window._fpDraft; }catch(e){}
    return null;
  }
  function iso(v){
    try{ return (typeof _iso === 'function') ? _iso(v) : String(v || '').slice(0,10); }
    catch(e){ return String(v || '').slice(0,10); }
  }
  function parseDate(v){
    try{ return (typeof _parseThaiDate === 'function') ? _parseThaiDate(v) : new Date(String(v || '').slice(0,10) + 'T00:00:00'); }
    catch(e){ return new Date(); }
  }
  function addDays(d,n){
    try{ return (typeof _addDays === 'function') ? _addDays(d,n) : new Date(d.getTime() + n*86400000); }
    catch(e){ return new Date(); }
  }
  function fmtShort(d){
    try{ return (typeof _fmtShortTH === 'function') ? _fmtShortTH(d) : String(d || ''); }
    catch(e){ return String(d || ''); }
  }
  function icon(type){
    try{ return (typeof _fpTaskIcon === 'function') ? _fpTaskIcon(type) : ''; }
    catch(e){ return ''; }
  }
  function cls(type){
    try{ return (typeof _fpTaskClass === 'function') ? _fpTaskClass(type) : ''; }
    catch(e){ return ''; }
  }
  function getTasks(draft){
    const list = draft && Array.isArray(draft.tasks) ? draft.tasks : [];
    return list.slice().sort((a,b)=>String(a.date || '').localeCompare(String(b.date || '')));
  }
  window.renderPlantingTimeline = function renderPlantingTimeline(){
    try{
      const tl = document.getElementById('fp-timeline');
      const draft = getDraft();
      if(!tl) return;
      if(!draft){
        tl.innerHTML = '<div class="fp-timeline-empty">กดคำนวณแผนการปลูก เพื่อแสดงไทม์ไลน์</div>';
        return;
      }
      const tasks = getTasks(draft);
      if(!tasks.length){
        tl.innerHTML = '<div class="fp-timeline-empty">ยังไม่มีงานดูแลในแผนนี้</div>';
        return;
      }
      const marks = [];
      tasks.forEach(t=>{ if(t.date && !marks.includes(t.date)) marks.push(t.date); });
      while(marks.length < 8){ marks.push(iso(addDays(parseDate(draft.startDate), marks.length * 7))); }
      const showMarks = marks.slice(0,8);
      const head = '<div class="fp-time-row fp-time-head"><div class="fp-time-label">กิจกรรม</div>' +
        showMarks.map(d=>'<div class="fp-time-cell fp-time-date">' + fmtShort(d) + '</div>').join('') + '</div>';
      const rows = tasks.map((t,idx)=>{
        const label = t.title || t.name || t.activity || t.type || 'งานดูแล';
        const order = t.order || (idx + 1);
        return '<div class="fp-time-row"><div class="fp-time-label fp-time-activity-name" title="' + esc(label) + '">' + icon(t.type) + ' ' + esc(label) + '</div>' +
          showMarks.map(d=>'<div class="fp-time-cell">' + (t.date === d ? '<span class="fp-dot ' + cls(t.type) + '" title="' + esc(label) + '">' + esc(order) + '</span>' : '') + '</div>').join('') + '</div>';
      }).join('');
      tl.innerHTML = head + rows;
    }catch(err){ console.warn(PATCH_VERSION, 'timeline restore failed', err); }
  };
  const prevRenderDraft = window.renderPlantingDraft;
  window.renderPlantingDraft = function renderPlantingDraft(){
    try{ if(typeof prevRenderDraft === 'function') prevRenderDraft.apply(this, arguments); }
    catch(err){ console.warn(PATCH_VERSION, 'previous renderPlantingDraft warning', err); }
    try{ window.renderPlantingTimeline(); }catch(e){}
  };
  const prevOpenModal = window.openPlantingPlanModal;
  window.openPlantingPlanModal = function openPlantingPlanModal(){
    if(typeof prevOpenModal === 'function') prevOpenModal.apply(this, arguments);
    setTimeout(function(){ try{ window.renderPlantingTimeline(); }catch(e){} }, 80);
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){ try{ window.renderPlantingTimeline(); }catch(e){} }, 300);
  });
  console.log('✅ ' + PATCH_VERSION + ' Timeline Preview Restore ready');
})();
