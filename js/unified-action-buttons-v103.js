// V1.0.3 JS split: Unified Action Buttons and Delegated Click Handling.
// Preserves the stable farmUnifiedActionButtonsV0667 global API.
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function routeFromOnclick(raw){
    raw = String(raw || '');
    let match = raw.match(/(confirmPlannedTaskDone|postponePlannedTask|skipPlannedTask|confirmMaterialActionDone|postponeMaterialAction|skipMaterialAction)\((['"])(.*?)\2\)/);
    if(!match){
      const loose = raw.match(/(confirmPlannedTaskDone|postponePlannedTask|skipPlannedTask|confirmMaterialActionDone|postponeMaterialAction|skipMaterialAction)\(([^)]*)\)/);
      if(loose) match = [loose[0], loose[1], '', String(loose[2] || '').trim().replace(/^['"]|['"]$/g, '')];
    }
    if(!match) return null;
    const fn = match[1];
    const source = /Material/.test(fn) ? 'material' : 'planting';
    const kind = /^confirm/.test(fn) ? 'done' : (/postpone/.test(fn) ? 'postpone' : 'skip');
    return {source, kind, id:match[3]};
  }
  function routeFromButton(btn){
    if(!btn) return null;
    if(btn.dataset && btn.dataset.farmActionSource && btn.dataset.farmActionKind && btn.dataset.farmActionId){
      return {source:btn.dataset.farmActionSource, kind:btn.dataset.farmActionKind, id:btn.dataset.farmActionId};
    }
    return routeFromOnclick(btn.getAttribute('onclick') || '');
  }
  function handlerName(route){
    if(!route) return '';
    if(route.source === 'material'){
      if(route.kind === 'done') return 'confirmMaterialActionDone';
      if(route.kind === 'postpone') return 'postponeMaterialAction';
      if(route.kind === 'skip') return 'skipMaterialAction';
    }
    if(route.source === 'planting'){
      if(route.kind === 'done') return 'confirmPlannedTaskDone';
      if(route.kind === 'postpone') return 'postponePlannedTask';
      if(route.kind === 'skip') return 'skipPlannedTask';
    }
    return '';
  }
  function labelFor(kind){
    if(kind === 'done') return 'ทำ';
    if(kind === 'postpone') return 'เลื่อน';
    if(kind === 'skip') return 'ไม่ทำ';
    return '';
  }
  function normalizeButton(btn){
    const route = routeFromButton(btn);
    if(!route) return;
    btn.dataset.farmActionSource = route.source;
    btn.dataset.farmActionKind = route.kind;
    btn.dataset.farmActionId = route.id;
    btn.classList.add('farm-action-btn-v0667');
    btn.classList.toggle('done', route.kind === 'done');
    btn.classList.toggle('move', route.kind === 'postpone');
    btn.classList.toggle('skip', route.kind === 'skip');
    btn.textContent = labelFor(route.kind);
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', (route.source === 'material' ? 'วัสดุปลูก' : 'แผนปลูก') + ' - ' + labelFor(route.kind));
  }
  function normalizeActionGroups(root){
    root = root || document;
    root.querySelectorAll('.planned-task-actions,.planned-notify-actions,.material-calendar-actions-v0666').forEach(group => {
      group.classList.add('farm-action-controls-v0667');
      group.querySelectorAll('button,.btn').forEach(normalizeButton);
    });
    root.querySelectorAll('button[onclick*="confirmPlannedTaskDone"],button[onclick*="postponePlannedTask"],button[onclick*="skipPlannedTask"],button[onclick*="confirmMaterialActionDone"],button[onclick*="postponeMaterialAction"],button[onclick*="skipMaterialAction"]').forEach(normalizeButton);
  }
  function refreshSurfaces(){
    safe(() => normalizeActionGroups(document));
    safe(() => {
      const panel = document.getElementById('notify-panel');
      if(panel) normalizeActionGroups(panel);
    });
    safe(() => {
      const dash = document.getElementById('dash-todo-list');
      if(dash) normalizeActionGroups(dash);
    });
    safe(() => {
      const modal = document.getElementById('modal-cal-detail');
      if(modal) normalizeActionGroups(modal);
    });
  }
  function callRoute(route){
    const name = handlerName(route);
    const fn = name && window[name];
    if(typeof fn !== 'function'){
      safe(() => showToast('ยังไม่พบ action handler'));
      return false;
    }
    fn(route.id);
    return true;
  }
  function refreshAfterAction(){
    safe(() => {
      if(window.farmMaterialActionOnlyV0666 && typeof window.farmMaterialActionOnlyV0666.syncAllMaterials === 'function') window.farmMaterialActionOnlyV0666.syncAllMaterials();
    });
    safe(() => saveData());
    safe(() => renderActivities());
    safe(() => renderCalendar());
    safe(() => renderDashboardNotifications());
    safe(() => renderDashboard());
    setTimeout(refreshSurfaces, 0);
    setTimeout(refreshSurfaces, 160);
  }
  function installDelegatedClicks(){
    if(document.__v0667DelegatedFarmActions) return;
    document.__v0667DelegatedFarmActions = true;
    document.addEventListener('click', function(ev){
      const btn = ev.target && ev.target.closest ? ev.target.closest('button,.btn') : null;
      const route = routeFromButton(btn);
      if(!route) return;
      ev.preventDefault();
      ev.stopPropagation();
      if(typeof ev.stopImmediatePropagation === 'function') ev.stopImmediatePropagation();
      const ok = callRoute(route);
      if(ok) refreshAfterAction();
    }, true);
  }
  function wrapRender(name){
    const oldFn = window[name];
    if(typeof oldFn !== 'function' || oldFn.__v0667UnifiedActions) return;
    const wrapped = function(){
      const result = oldFn.apply(this, arguments);
      setTimeout(refreshSurfaces, 0);
      setTimeout(refreshSurfaces, 120);
      return result;
    };
    wrapped.__v0667UnifiedActions = true;
    window[name] = wrapped;
    safe(() => {
      if(name === 'renderDashboard') renderDashboard = wrapped;
      if(name === 'renderDashboardNotifications') renderDashboardNotifications = wrapped;
      if(name === 'renderCalendar') renderCalendar = wrapped;
      if(name === 'showCalDetail') showCalDetail = wrapped;
    });
  }
  function stamp(){
    safe(() => {
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
        if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  function install(){
    installDelegatedClicks();
    ['renderDashboard','renderDashboardNotifications','renderCalendar','showCalDetail'].forEach(wrapRender);
    refreshSurfaces();
    stamp();
  }
  window.farmUnifiedActionButtonsV0667 = {install, refreshSurfaces, routeFromButton};
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      install();
      safe(() => renderDashboardNotifications());
      safe(() => renderDashboard());
      console.log('Unified action buttons and delegated clicks ready', VERSION);
    }, 5900);
  });
})();
