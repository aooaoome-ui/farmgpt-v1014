(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const SOURCE = 'material-action';

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function materialList(){ try{ if(!Array.isArray(farmInputPlans)) farmInputPlans = []; return farmInputPlans; }catch(e){ return []; } }
  function eventList(){ try{ if(!Array.isArray(calEvents)) calEvents = []; return calEvents; }catch(e){ return []; } }
  function activityList(){ try{ if(!Array.isArray(actItems)) actItems = []; return actItems; }catch(e){ return []; } }
  function todayIso(){ return safe(() => (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10), new Date().toISOString().slice(0,10)); }
  function fmt(v){ return safe(() => typeof fmtDate === 'function' ? fmtDate(v) : (v || '-'), v || '-'); }
  function statusText(status){
    if(status === 'done') return 'ทำแล้ว';
    if(status === 'skipped') return 'ไม่ทำ';
    if(status === 'postponed') return 'เลื่อน';
    return 'รอทำ';
  }
  function ruleById(item, ruleId){
    return (item && Array.isArray(item.actionRules) ? item.actionRules : []).find(rule => String(rule && rule.id) === String(ruleId)) || {};
  }
  function activityForLog(item, log){
    return activityList().find(act => act && act.source === SOURCE && (
      (log && log.activityId && String(act.id) === String(log.activityId)) ||
      (String(act.materialPlanId || '') === String(item && item.id || '') && String(act.materialRuleId || '') === String(log && log.ruleId || '') && String(act.completedDate || act.date || '') === String(log && (log.dueDate || log.actionDate) || ''))
    )) || null;
  }
  function eventsForItem(item){
    return eventList().filter(ev => ev && ev.source === SOURCE && String(ev.materialPlanId || '') === String(item && item.id || ''));
  }
  function logsForItem(item){
    return (item && Array.isArray(item.actionLogs) ? item.actionLogs : []).map(log => {
      const rule = ruleById(item, log.ruleId);
      const act = activityForLog(item, log);
      return {
        kind:'log',
        status: log.status || 'pending',
        title: rule.title || log.title || 'งานวัสดุปลูก',
        dueDate: log.dueDate || log.originalDueDate || log.actionDate || '',
        actionDate: log.actionDate || '',
        note: act ? (act.note || '') : (log.reason || rule.note || ''),
        activityId: act && act.id,
        createdAt: log.createdAt || log.actionDate || ''
      };
    });
  }
  function pendingForItem(item){
    const logged = new Set((item && item.actionLogs || []).map(log => String(log.ruleId || '') + '|' + String(log.dueDate || log.originalDueDate || '')));
    return eventsForItem(item).filter(ev => {
      const st = String(ev.taskStatus || ev.confirmStatus || 'pending');
      if(st !== 'pending') return false;
      const key = String(ev.materialRuleId || '') + '|' + String(ev.start || '');
      return !logged.has(key);
    }).map(ev => ({
      kind:'event',
      status:'pending',
      title: ev.title || 'งานวัสดุปลูก',
      dueDate: ev.start || '',
      actionDate:'',
      note: ev.note || '',
      activityId:'',
      createdAt: ev.start || ''
    }));
  }
  function historyForItem(item){
    return logsForItem(item).concat(pendingForItem(item)).sort((a,b) => {
      const ad = a.dueDate || a.actionDate || a.createdAt || '';
      const bd = b.dueDate || b.actionDate || b.createdAt || '';
      return String(bd).localeCompare(String(ad));
    });
  }
  function summaryForItem(item){
    const history = historyForItem(item);
    const now = todayIso();
    const pending = history.filter(x => x.status === 'pending');
    const overdue = pending.filter(x => x.dueDate && String(x.dueDate) < now);
    const done = history.filter(x => x.status === 'done');
    const latestDone = done.sort((a,b) => String(b.actionDate || b.dueDate || '').localeCompare(String(a.actionDate || a.dueDate || '')))[0] || null;
    const rules = item && Array.isArray(item.actionRules) ? item.actionRules.filter(r => r && r.active !== false).length : 0;
    return { rules, pending:pending.length, overdue:overdue.length, done:done.length, latestDone, history };
  }
  function kpi(label, value){ return '<div class="mat-history-kpi"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>'; }
  function historyHtml(item){
    const summary = summaryForItem(item);
    const rows = summary.history.slice(0, 10).map(row => {
      const meta = [
        row.dueDate ? 'ครบกำหนด ' + fmt(row.dueDate) : '',
        row.actionDate ? 'บันทึก ' + fmt(row.actionDate) : '',
        row.activityId ? 'บันทึกกิจกรรม #' + row.activityId : ''
      ].filter(Boolean).join(' · ');
      return '<div class="mat-history-row">'+
        '<span class="mat-history-line '+esc(row.status)+'"></span>'+
        '<div><div class="mat-history-name">'+esc(row.title)+'</div><div class="mat-history-meta">'+esc(meta || '-')+'</div>'+(row.note ? '<div class="mat-history-note">'+esc(row.note)+'</div>' : '')+'</div>'+
        '<span class="mat-history-badge '+esc(row.status)+'">'+esc(statusText(row.status))+'</span>'+
      '</div>';
    }).join('');
    return '<section id="material-action-history-v0661" class="mat-history-section">'+
      '<div class="mat-history-head"><div><div class="mat-history-title">ประวัติรอบงานวัสดุ</div><div class="mat-history-sub">สรุปงานที่รอทำ ทำแล้ว เลื่อน หรือไม่ทำ ของวัสดุชุดนี้</div></div></div>'+
      '<div class="mat-history-kpis">'+
        kpi('รอบงาน', summary.rules)+
        kpi('รอทำ', summary.pending)+
        kpi('เลยกำหนด', summary.overdue)+
        kpi('ทำแล้ว', summary.done)+
      '</div>'+
      (rows ? '<div class="mat-history-list">'+rows+'</div>' : '<div class="mat-history-empty">ยังไม่มีประวัติ action สำหรับวัสดุชุดนี้</div>')+
    '</section>';
  }
  function injectHistoryIntoDetail(index){
    const body = document.getElementById('material-detail-body');
    const item = materialList()[Number(index)];
    if(!body || !item) return;
    const old = document.getElementById('material-action-history-v0661');
    if(old) old.remove();
    body.insertAdjacentHTML('beforeend', historyHtml(item));
  }
  function inferIndexFromDetailTitle(){
    const title = document.getElementById('material-detail-title')?.textContent || '';
    return materialList().findIndex(item => String(item && item.name || '') === String(title));
  }
  function addTableSummaries(){
    const rows = Array.from(document.querySelectorAll('#farm-input-body tr'));
    rows.forEach(row => {
      const detailBtn = row.querySelector('.farm-material-detail-btn');
      const onclick = detailBtn && detailBtn.getAttribute('onclick') || '';
      const match = onclick.match(/openFarmMaterialDetail\((\d+)\)/);
      if(!match) return;
      const item = materialList()[Number(match[1])];
      if(!item) return;
      const firstCell = row.querySelector('td');
      const sub = firstCell && firstCell.querySelector('.farm-material-sub');
      if(!sub || sub.querySelector('.mat-action-summary')) return;
      const sum = summaryForItem(item);
      const latest = sum.latestDone ? fmt(sum.latestDone.actionDate || sum.latestDone.dueDate) : '-';
      sub.insertAdjacentHTML('beforeend',
        '<div class="mat-action-summary">'+
          '<span class="mat-action-chip">รอบงาน '+esc(sum.rules)+'</span>'+
          '<span class="mat-action-chip '+(sum.overdue ? 'late' : (sum.pending ? 'due' : ''))+'">ค้าง '+esc(sum.pending)+'</span>'+
          '<span class="mat-action-chip done">ล่าสุด '+esc(latest)+'</span>'+
        '</div>');
    });
  }
  function installWrappers(){
    const oldOpen = window.openFarmMaterialDetail;
    if(typeof oldOpen === 'function' && !oldOpen.__v0661History){
      const wrappedOpen = function(index){
        const result = oldOpen.apply(this, arguments);
        safe(() => injectHistoryIntoDetail(index));
        return result;
      };
      wrappedOpen.__v0661History = true;
      window.openFarmMaterialDetail = wrappedOpen;
      safe(() => { openFarmMaterialDetail = wrappedOpen; });
    }
    const oldRender = window.renderFarmInputPlans;
    if(typeof oldRender === 'function' && !oldRender.__v0661History){
      const wrappedRender = function(){
        const result = oldRender.apply(this, arguments);
        safe(addTableSummaries);
        const modal = document.getElementById('modal-material-detail');
        if(modal && modal.classList.contains('open')){
          const idx = inferIndexFromDetailTitle();
          if(idx >= 0) safe(() => injectHistoryIntoDetail(idx));
        }
        return result;
      };
      wrappedRender.__v0661History = true;
      window.renderFarmInputPlans = wrappedRender;
      safe(() => { renderFarmInputPlans = wrappedRender; });
    }
    ['confirmMaterialActionDone','postponeMaterialAction','skipMaterialAction'].forEach(name => {
      const oldFn = window[name];
      if(typeof oldFn === 'function' && !oldFn.__v0661HistoryRefresh){
        const wrapped = function(){
          const result = oldFn.apply(this, arguments);
          safe(() => { if(typeof renderFarmInputPlans === 'function') renderFarmInputPlans(); });
          const idx = inferIndexFromDetailTitle();
          if(idx >= 0) safe(() => injectHistoryIntoDetail(idx));
          return result;
        };
        wrapped.__v0661HistoryRefresh = true;
        window[name] = wrapped;
        safe(() => { if(name === 'confirmMaterialActionDone') confirmMaterialActionDone = wrapped; if(name === 'postponeMaterialAction') postponeMaterialAction = wrapped; if(name === 'skipMaterialAction') skipMaterialAction = wrapped; });
      }
    });
  }
  window.farmMaterialActionHistoryV0661 = {
    summaryForItem,
    historyForItem,
    injectHistoryIntoDetail,
    addTableSummaries
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      installWrappers();
      safe(addTableSummaries);
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
      console.log('Material action history ready', VERSION);
    }, 3100);
  });
})();
