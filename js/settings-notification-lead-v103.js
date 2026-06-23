/* V1.0.3 Settings Notification Lead Days
   Extracted from farm_management_V0_6_84_ui_js_split.html for V1.0.3 Settings split.
   Original script line: 20604. Keep wrapper order and global function names stable. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const DEFAULT_DAYS = 7;

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function settings(){
    safe(() => { if(!farmSettings || typeof farmSettings !== 'object') farmSettings = {}; });
    farmSettings.plantingNotifyLeadDays = normalizeDays(farmSettings.plantingNotifyLeadDays, DEFAULT_DAYS);
    farmSettings.materialNotifyLeadDays = normalizeDays(farmSettings.materialNotifyLeadDays, DEFAULT_DAYS);
    return farmSettings;
  }
  function normalizeDays(value, fallback){
    const n = parseInt(value, 10);
    if(!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(90, n));
  }
  function todayIso(){ return safe(() => (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10), new Date().toISOString().slice(0,10)); }
  function addDays(iso, n){
    const d = new Date(String(iso || todayIso()) + 'T00:00:00');
    if(isNaN(d.getTime())) return todayIso();
    d.setDate(d.getDate() + Number(n || 0));
    return d.toISOString().slice(0,10);
  }
  function materialLeadDays(){ return normalizeDays(settings().materialNotifyLeadDays, DEFAULT_DAYS); }
  function plantingLeadDays(){ return normalizeDays(settings().plantingNotifyLeadDays, DEFAULT_DAYS); }
  function eventList(){ try{ return Array.isArray(calEvents) ? calEvents : []; }catch(e){ return []; } }
  function activityList(){ try{ return Array.isArray(actItems) ? actItems : []; }catch(e){ return []; } }
  function fmt(v){ return safe(() => typeof fmtDate === 'function' ? fmtDate(v) : (v || '-'), v || '-'); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function taskId(materialId, ruleId, dueDate){
    return encodeURIComponent(String(materialId || '')) + '__' + encodeURIComponent(String(ruleId || '')) + '__' + encodeURIComponent(String(dueDate || ''));
  }
  function daysBetween(a, b){
    const da = new Date(String(a || '') + 'T00:00:00');
    const db = new Date(String(b || '') + 'T00:00:00');
    return isNaN(da.getTime()) || isNaN(db.getTime()) ? 9999 : Math.round((da - db) / 86400000);
  }
  function stageLabel(stage){
    if(stage === 'start') return 'เริ่มผลิต';
    if(stage === 'ready') return 'ผลิตเสร็จ';
    return 'รอบงาน';
  }
  function actionButtons(task){
    const id = String(task.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return '<div class="planned-task-actions material-calendar-actions-v0666 farm-action-controls-v0667">' +
      '<button type="button" class="btn done farm-action-btn-v0667" data-farm-action-source="material" data-farm-action-kind="done" data-farm-action-id="'+esc(task.id)+'" onclick="event.stopPropagation();confirmMaterialActionDone(\''+id+'\')">ทำ</button>' +
      '<button type="button" class="btn move farm-action-btn-v0667" data-farm-action-source="material" data-farm-action-kind="postpone" data-farm-action-id="'+esc(task.id)+'" onclick="event.stopPropagation();postponeMaterialAction(\''+id+'\')">เลื่อน</button>' +
      '<button type="button" class="btn skip farm-action-btn-v0667" data-farm-action-source="material" data-farm-action-kind="skip" data-farm-action-id="'+esc(task.id)+'" onclick="event.stopPropagation();skipMaterialAction(\''+id+'\')">ไม่ทำ</button>' +
      '</div>';
  }
  function materialDueTasks(){
    const today = todayIso();
    const max = addDays(today, materialLeadDays());
    return eventList().filter(ev => {
      if(!ev || ev.source !== 'material-action') return false;
      if(/done|skipped/.test(String(ev.taskStatus || ev.confirmStatus || '').toLowerCase())) return false;
      return String(ev.start || '') <= String(max);
    }).sort((a,b) => String(a.start || '').localeCompare(String(b.start || ''))).map(ev => ({
      id: taskId(ev.materialPlanId, ev.materialRuleId, ev.start),
      title: ev.title || 'งานวัสดุปลูก',
      stage: ev.materialStage || 'action',
      dueDate: ev.start || '',
      materialName: ev.materialName || '',
      note: ev.note || '',
      event: ev
    }));
  }
  function injectMaterialNotifications(){
    const panel = document.getElementById('notify-panel');
    if(!panel) return;
    panel.querySelectorAll('.material-task-notify-section').forEach(n => n.remove());
    const rows = materialDueTasks().slice(0, 10);
    if(!rows.length) return;
    const today = todayIso();
    const html = rows.map(task => {
      const diff = daysBetween(task.dueDate, today);
      const tag = diff < 0 ? 'เลยกำหนด' : (diff === 0 ? 'วันนี้' : 'อีก ' + diff + ' วัน');
      return '<div class="mock-notify-item planned-task-notify">' +
        '<div class="mock-notify-icon">M</div><div class="mock-notify-text"><div class="mock-notify-name">' + esc(task.title || 'งานวัสดุปลูก') + '</div>' +
        '<div class="mock-notify-sub">' + esc(stageLabel(task.stage) + ' - ' + (task.materialName || '-') + ' - ' + fmt(task.dueDate)) + '</div>' +
        actionButtons(task) + '</div><span class="mock-notify-tag">' + esc(tag) + '</span></div>';
    }).join('');
    const section = '<div class="mock-notify-section material-task-notify-section material-action-only-section" data-notify-source="material"><div class="mock-notify-section-title"><span>แจ้งเตือนแผนผลิตวัสดุ</span><span>' + rows.length + ' งาน</span></div><div class="mock-notify-list">' + html + '</div></div>';
    const updateSection = panel.querySelector('.mock-notify-section:nth-of-type(2)');
    if(updateSection) updateSection.insertAdjacentHTML('beforebegin', section);
    else panel.insertAdjacentHTML('beforeend', section);
  }
  function injectMaterialDashboardTasks(){
    const list = document.getElementById('dash-todo-list');
    if(!list) return;
    list.querySelectorAll('.material-action-row,.material-action-only-row').forEach(n => n.remove());
    const rows = materialDueTasks().slice(0, 5);
    if(!rows.length) return;
    const today = todayIso();
    const html = rows.map(task => {
      const diff = daysBetween(task.dueDate, today);
      const tag = diff < 0 ? '<span class="planned-task-overdue">เลยกำหนด</span>' : (diff === 0 ? 'วันนี้' : 'อีก ' + diff + ' วัน');
      return '<div class="mock-task-row planned-task-row material-action-only-row"><span class="mock-task-dot"></span><div class="planned-task-main">' +
        '<div class="planned-task-meta"><div class="mock-task-title">' + esc(task.title || 'งานวัสดุปลูก') + '</div><div class="planned-task-right"><span class="mock-task-time">' + tag + '</span><span class="mock-status wait">รอทำ</span></div></div>' +
        '<div class="mock-task-sub">' + esc(stageLabel(task.stage) + ' - ' + (task.materialName || '-') + ' - ' + fmt(task.dueDate)) + '</div>' +
        actionButtons(task) + '</div></div>';
    }).join('');
    list.insertAdjacentHTML('afterbegin', html);
    const countEl = document.getElementById('dash-todo-count');
    if(countEl) countEl.textContent = list.querySelectorAll('.mock-task-row').length + ' งาน';
  }
  function overridePlantingLeadDays(){
    const api = window.farmPlannedTaskConfirmV0625;
    if(!api || typeof api.duePlannedTasks !== 'function' || api.__v0668LeadDays) return;
    const original = api.duePlannedTasks;
    api.duePlannedTasks = function(limitFuture){
      const list = original.call(this, false) || [];
      if(limitFuture !== true) return list;
      const max = addDays(todayIso(), plantingLeadDays());
      return list.filter(ev => String(ev && ev.start || '') <= String(max));
    };
    api.__v0668LeadDays = true;
  }
  function injectSettingsControls(){
    const shelfLifeInput = document.getElementById('st-shelf-life');
    const defaultSettingsCard = shelfLifeInput && shelfLifeInput.closest('.settings-section-card');
    const grid = defaultSettingsCard && defaultSettingsCard.querySelector('.form-grid');
    if(!grid || document.getElementById('settings-notification-lead-v0668')) return;
    grid.insertAdjacentHTML('afterend',
      '<div id="settings-notification-lead-v0668">' +
        '<div class="notify-lead-head"><div><div class="notify-lead-title">แจ้งเตือนล่วงหน้า</div><div class="notify-lead-sub">กำหนดจำนวนวันที่ให้แสดงงานในแจ้งเตือนและภารกิจหน้าแดชบอร์ด</div></div></div>' +
        '<div class="notify-lead-grid">' +
          '<div class="notify-lead-field"><label for="st-planting-notify-lead-days">แผนปลูก</label><div class="notify-lead-input-row"><input type="number" class="form-control" id="st-planting-notify-lead-days" min="0" max="90" step="1"><span class="notify-lead-unit">วัน</span></div></div>' +
          '<div class="notify-lead-field"><label for="st-material-notify-lead-days">แผนผลิตวัสดุ</label><div class="notify-lead-input-row"><input type="number" class="form-control" id="st-material-notify-lead-days" min="0" max="90" step="1"><span class="notify-lead-unit">วัน</span></div></div>' +
        '</div>' +
      '</div>');
    fillSettingsControls();
  }
  function fillSettingsControls(){
    const s = settings();
    const planting = document.getElementById('st-planting-notify-lead-days');
    const material = document.getElementById('st-material-notify-lead-days');
    if(planting) planting.value = normalizeDays(s.plantingNotifyLeadDays, DEFAULT_DAYS);
    if(material) material.value = normalizeDays(s.materialNotifyLeadDays, DEFAULT_DAYS);
  }
  function refreshAfterSettingChange(){
    safe(() => {
      if(window.farmMaterialActionOnlyV0666 && typeof window.farmMaterialActionOnlyV0666.syncAllMaterials === 'function') window.farmMaterialActionOnlyV0666.syncAllMaterials();
    });
    safe(() => renderDashboardNotifications());
    safe(() => renderDashboard());
    safe(() => {
      if(window.farmUnifiedActionButtonsV0667 && typeof window.farmUnifiedActionButtonsV0667.refreshSurfaces === 'function') window.farmUnifiedActionButtonsV0667.refreshSurfaces();
    });
  }
  function installWrappers(){
    overridePlantingLeadDays();
    const oldRenderSettings = window.renderSettings;
    if(typeof oldRenderSettings === 'function' && !oldRenderSettings.__v0668LeadSettings){
      const wrappedRenderSettings = function(){
        const result = oldRenderSettings.apply(this, arguments);
        injectSettingsControls();
        fillSettingsControls();
        return result;
      };
      wrappedRenderSettings.__v0668LeadSettings = true;
      window.renderSettings = wrappedRenderSettings;
      safe(() => { renderSettings = wrappedRenderSettings; });
    }
    const oldSaveDefaults = window.saveSettingsDefaults;
    if(typeof oldSaveDefaults === 'function' && !oldSaveDefaults.__v0668LeadSettings){
      const wrappedSaveDefaults = function(){
        const planting = document.getElementById('st-planting-notify-lead-days');
        const material = document.getElementById('st-material-notify-lead-days');
        if(planting) farmSettings.plantingNotifyLeadDays = normalizeDays(planting.value, DEFAULT_DAYS);
        if(material) farmSettings.materialNotifyLeadDays = normalizeDays(material.value, DEFAULT_DAYS);
        const result = oldSaveDefaults.apply(this, arguments);
        if(planting) farmSettings.plantingNotifyLeadDays = normalizeDays(planting.value, DEFAULT_DAYS);
        if(material) farmSettings.materialNotifyLeadDays = normalizeDays(material.value, DEFAULT_DAYS);
        safe(() => saveData());
        refreshAfterSettingChange();
        safe(() => showToast('บันทึกค่าการแจ้งเตือนล่วงหน้าแล้ว'));
        return result;
      };
      wrappedSaveDefaults.__v0668LeadSettings = true;
      window.saveSettingsDefaults = wrappedSaveDefaults;
      safe(() => { saveSettingsDefaults = wrappedSaveDefaults; });
    }
    const oldNotify = window.renderDashboardNotifications;
    if(typeof oldNotify === 'function' && !oldNotify.__v0668LeadSettings){
      const wrappedNotify = function(){
        const result = oldNotify.apply(this, arguments);
        safe(injectMaterialNotifications);
        safe(() => {
          if(window.farmUnifiedActionButtonsV0667 && typeof window.farmUnifiedActionButtonsV0667.refreshSurfaces === 'function') window.farmUnifiedActionButtonsV0667.refreshSurfaces();
        });
        return result;
      };
      wrappedNotify.__v0668LeadSettings = true;
      window.renderDashboardNotifications = wrappedNotify;
      safe(() => { renderDashboardNotifications = wrappedNotify; });
    }
    const oldDashboard = window.renderDashboard;
    if(typeof oldDashboard === 'function' && !oldDashboard.__v0668LeadSettings){
      const wrappedDashboard = function(){
        const result = oldDashboard.apply(this, arguments);
        safe(injectMaterialDashboardTasks);
        safe(() => {
          if(window.farmUnifiedActionButtonsV0667 && typeof window.farmUnifiedActionButtonsV0667.refreshSurfaces === 'function') window.farmUnifiedActionButtonsV0667.refreshSurfaces();
        });
        return result;
      };
      wrappedDashboard.__v0668LeadSettings = true;
      window.renderDashboard = wrappedDashboard;
      safe(() => { renderDashboard = wrappedDashboard; });
    }
  }
  function stamp(){
    safe(() => {
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
        if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  window.farmNotificationLeadSettingsV0668 = {
    materialLeadDays,
    plantingLeadDays,
    materialDueTasks,
    injectSettingsControls,
    refreshAfterSettingChange
  };
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      settings();
      installWrappers();
      safe(injectSettingsControls);
      refreshAfterSettingChange();
      stamp();
      console.log('Notification lead days settings ready', VERSION);
    }, 6400);
  });
})();
