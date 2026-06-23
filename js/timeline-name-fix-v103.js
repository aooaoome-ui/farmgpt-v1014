/* V1.0.3 JS split: Timeline Activity Name Fix.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const PATCH_VERSION = 'V0.6.34';
  const htmlEsc = window.safeEsc || window._esc || function(v){
    return String(v ?? '').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  };
  function iconFor(type){
    try{ return (typeof window._fpTaskIcon === 'function') ? window._fpTaskIcon(type) : ''; }catch(e){ return ''; }
  }
  function clsFor(type){
    try{ return (typeof window._fpTaskClass === 'function') ? window._fpTaskClass(type) : ''; }catch(e){ return ''; }
  }
  function fmtShort(date){
    try{ return (typeof window._fmtShortTH === 'function') ? window._fmtShortTH(date) : String(date || ''); }catch(e){ return String(date || ''); }
  }
  function isoAddFromStart(index){
    try{
      if(typeof window._parseThaiDate === 'function' && typeof window._addDays === 'function' && typeof window._iso === 'function' && window._fpDraft){
        return window._iso(window._addDays(window._parseThaiDate(window._fpDraft.startDate), index * 7));
      }
    }catch(e){}
    return '';
  }
  function sortedDraftTasks(){
    const draft = window._fpDraft || null;
    const tasks = draft && Array.isArray(draft.tasks) ? draft.tasks : [];
    return tasks.slice().sort(function(a,b){ return String(a.date || '').localeCompare(String(b.date || '')); });
  }
  window.renderPlantingTimeline = function renderPlantingTimeline(){
    try{
      const tl = document.getElementById('fp-timeline');
      if(!tl || !window._fpDraft) return;
      const tasks = sortedDraftTasks();
      if(!tasks.length){
        tl.innerHTML = '<div style="padding:18px;color:#778177;">ยังไม่มีงานดูแล</div>';
        return;
      }
      const marks = [];
      tasks.forEach(function(t){ if(t.date && !marks.includes(t.date)) marks.push(t.date); });
      while(marks.length < 8){
        const next = isoAddFromStart(marks.length);
        marks.push(next || (tasks[0] && tasks[0].date) || '');
      }
      const showMarks = marks.slice(0,8);
      const head = '<div class="fp-time-row fp-time-head"><div class="fp-time-label">กิจกรรม</div>' +
        showMarks.map(function(d){ return '<div class="fp-time-cell fp-time-date">' + fmtShort(d) + '</div>'; }).join('') + '</div>';
      const rows = tasks.map(function(t, idx){
        const label = t.title || t.name || t.activity || t.type || 'งานดูแล';
        const order = t.order || (idx + 1);
        return '<div class="fp-time-row"><div class="fp-time-label fp-time-activity-name" title="' + htmlEsc(label) + '">' + iconFor(t.type) + ' ' + htmlEsc(label) + '</div>' +
          showMarks.map(function(d){
            return '<div class="fp-time-cell">' + (t.date === d ? '<span class="fp-dot ' + clsFor(t.type) + '" title="' + htmlEsc(label) + '">' + htmlEsc(order) + '</span>' : '') + '</div>';
          }).join('') + '</div>';
      }).join('');
      tl.innerHTML = head + rows;
    }catch(err){ console.warn(PATCH_VERSION, 'timeline name fix failed', err); }
  };
  const oldRenderDraft = window.renderPlantingDraft;
  window.renderPlantingDraft = function renderPlantingDraft(){
    try{
      if(typeof oldRenderDraft === 'function') oldRenderDraft.apply(this, arguments);
      if(typeof window.renderPlantingTimeline === 'function') window.renderPlantingTimeline();
    }catch(err){
      console.warn(PATCH_VERSION, 'render draft wrapper failed', err);
      try{ if(typeof oldRenderDraft === 'function') oldRenderDraft.apply(this, arguments); }catch(e){}
    }
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){ try{ if(typeof window.renderPlantingTimeline === 'function') window.renderPlantingTimeline(); }catch(e){} }, 250);
  });
  console.log('✅ ' + PATCH_VERSION + ' Modal Equal Cards + Timeline Activity Name Fix ready');
})();
