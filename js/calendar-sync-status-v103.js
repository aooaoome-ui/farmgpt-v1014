/* V1.0.3 JS split: Calendar Sync Status + Short Row Actions.
   Extracted during the V1.0.3 UI JS split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function js(v){ return String(v ?? '').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
  function fmt(iso){ return safe(() => (typeof _fmtTHDateIso === 'function' ? _fmtTHDateIso(iso) : (iso || '-')), iso || '-'); }
  function plans(){ return safe(() => Array.isArray(plantingPlans) ? plantingPlans : [], []); }
  function events(){ return safe(() => Array.isArray(calEvents) ? calEvents : [], []); }
  function eventsForPlan(id){ return events().filter(e => e && e.source === 'planting-plan' && String(e.planId || '') === String(id || '')); }
  function linked(plan){ return safe(() => typeof isPlantingPlanLinkedToCrop === 'function' && isPlantingPlanLinkedToCrop(plan), false); }
  function transplantDate(plan){
    const task = (Array.isArray(plan && plan.tasks) ? plan.tasks : []).find(t => /ย้ายปลูก|ย้ายกล้า/.test(String((t.title || '') + ' ' + (t.type || ''))));
    return task && task.date || '';
  }
  function syncState(plan){
    const count = eventsForPlan(plan && plan.id).length;
    if(!count) return {key:'none', text:'ยังไม่ส่ง'};
    const synced = Date.parse(plan.calendarSyncedAt || '');
    const updated = Date.parse(plan.updatedAt || '');
    if(synced && updated && updated > synced + 1000) return {key:'dirty', text:'แก้แล้ว'};
    return {key:'sent', text:'ส่งแล้ว'};
  }
  function setSynced(plan){
    if(!plan || !plan.id) return;
    const now = new Date().toISOString();
    plan.calendarSyncedAt = now;
    const stored = plans().find(p => String(p && p.id) === String(plan.id));
    if(stored) stored.calendarSyncedAt = now;
  }
  function actionHtml(plan, state){
    const id = js(plan.id);
    const cropBtn = linked(plan)
      ? '<span class="fp-linked-crop-note">พืชแล้ว</span>'
      : (typeof window.createCropFromPlantingPlan === 'function'
        ? '<button class="btn btn-outline btn-sm fp-crop-link-btn" title="สร้างข้อมูลพืชผล" onclick="createCropFromPlantingPlan(\''+id+'\')">พืช</button>'
        : '');
    const sendLabel = state.key === 'sent' ? 'ส่งซ้ำ' : 'ส่ง';
    return '<div class="fp-row-actions fp-plan-actions-compact">'+
      '<button class="btn btn-outline btn-sm fp-plan-detail-btn" title="รายละเอียด" onclick="viewPlantingPlanDetail(\''+id+'\')">ดู</button>'+
      '<button class="btn btn-outline btn-sm" title="แก้ไข" onclick="editPlantingPlan(\''+id+'\')">แก้</button>'+
      '<button class="btn btn-outline btn-sm" title="ส่งเข้าปฏิทิน" onclick="syncPlantingPlanRowToCalendar(\''+id+'\')">'+sendLabel+'</button>'+
      cropBtn+
      '<button class="btn btn-outline btn-sm fp-plan-delete-btn" title="ลบ" onclick="deletePlantingPlan(\''+id+'\')">ลบ</button>'+
    '</div>';
  }
  function renderHeader(){
    const table = q('#fp-plan-body')?.closest('table');
    const head = table && q('thead tr', table);
    if(!head) return;
    head.innerHTML = '<th>พืช / แปลง</th><th>วันที่เพาะ</th><th>ย้ายปลูก</th><th>คาดเก็บ</th><th>จำนวน</th><th>สถานะ</th><th>ปฏิทิน</th><th>จัดการ</th>';
  }
  function renderRows(){
    safe(() => { if(typeof _mergeDefaultCropPlanTemplates === 'function') _mergeDefaultCropPlanTemplates(); });
    safe(() => { if(typeof initFarmPlanningForm === 'function') initFarmPlanningForm(); });
    const body = q('#fp-plan-body');
    if(!body) return;
    renderHeader();
    const query = (q('#fp-search')?.value || '').toLowerCase();
    const status = q('#fp-status-filter')?.value || '';
    const rows = plans()
      .filter(p => (!query || JSON.stringify(p).toLowerCase().includes(query)) && (!status || p.status === status))
      .sort((a,b) => String(a.harvestDate || a.startDate || '').localeCompare(String(b.harvestDate || b.startDate || '')));
    body.innerHTML = rows.length ? rows.map(plan => {
      const state = syncState(plan);
      return '<tr>'+
        '<td><div class="fp-crop-cell"><div class="fp-crop-thumb">🌿</div><div><div class="fp-crop-name">'+esc(plan.cropName || '-')+'</div><div class="fp-crop-sub">'+esc(plan.plot || '-')+' · '+esc(plan.cropType || '')+'</div></div></div></td>'+
        '<td>'+fmt(plan.startDate)+'</td>'+
        '<td>'+fmt(transplantDate(plan))+'</td>'+
        '<td>'+fmt(plan.harvestDate)+'</td>'+
        '<td>'+esc(plan.quantity || '')+' '+esc(plan.unit || '')+'</td>'+
        '<td><span class="fp-status-pill '+(plan.status === 'เสร็จสิ้น' ? 'done' : plan.status === 'วางแผน' ? 'warn' : '')+'">'+esc(plan.status || 'กำลังดำเนินการ')+'</span></td>'+
        '<td><span class="fp-sync-pill '+state.key+'">'+state.text+'</span></td>'+
        '<td>'+actionHtml(plan, state)+'</td>'+
      '</tr>';
    }).join('') : '<tr><td colspan="8" style="text-align:center;color:#889188;padding:24px;">ยังไม่มีแผนปลูก</td></tr>';
    safe(() => { if(typeof renderPlantingOverviewExtras === 'function') renderPlantingOverviewExtras(); });
  }

  const oldAddPlanTasks = window.addPlanTasksToCalendar;
  if(typeof oldAddPlanTasks === 'function' && !oldAddPlanTasks.__v0654SyncStatus){
    const wrappedAdd = function(plan){
      const result = oldAddPlanTasks.apply(this, arguments);
      setSynced(plan);
      safe(() => { if(typeof saveData === 'function') saveData(); });
      setTimeout(renderRows, 0);
      return result;
    };
    wrappedAdd.__v0654SyncStatus = true;
    window.addPlanTasksToCalendar = wrappedAdd;
    safe(() => { addPlanTasksToCalendar = wrappedAdd; });
  }

  window.syncPlantingPlanRowToCalendar = function(id){
    const plan = plans().find(p => String(p && p.id) === String(id));
    if(!plan){ safe(() => showToast && showToast('ไม่พบแผนปลูก')); return; }
    safe(() => { if(typeof addPlanTasksToCalendar === 'function') addPlanTasksToCalendar(plan); });
    setSynced(plan);
    safe(() => { if(typeof renderCalendar === 'function') renderCalendar(); });
    safe(() => { if(typeof saveData === 'function') saveData(); });
    renderRows();
    safe(() => { if(typeof showToast === 'function') showToast('ส่งเข้าปฏิทินแล้ว'); });
  };

  window.renderPlantingPlans = function(){
    try{
      if(safe(() => typeof _fpDraft !== 'undefined' && _fpDraft && typeof renderPlantingDraft === 'function', false)) renderPlantingDraft();
      renderRows();
    }catch(err){ console.warn(VERSION, 'renderPlantingPlans failed', err); }
  };
  safe(() => { renderPlantingPlans = window.renderPlantingPlans; });

  const prevSave = window.savePlantingPlan;
  if(typeof prevSave === 'function' && !prevSave.__v0654SyncStatus){
    const wrappedSave = function(){
      const result = prevSave.apply(this, arguments);
      setTimeout(renderRows, 0);
      return result;
    };
    wrappedSave.__v0654SyncStatus = true;
    window.savePlantingPlan = wrappedSave;
    safe(() => { savePlantingPlan = wrappedSave; });
  }
  const prevSyncCurrent = window.syncCurrentPlantingPlanToCalendar;
  if(typeof prevSyncCurrent === 'function' && !prevSyncCurrent.__v0654SyncStatus){
    const wrappedSync = function(){
      const result = prevSyncCurrent.apply(this, arguments);
      setTimeout(function(){
        const id = safe(() => _fpDraft && _fpDraft.id, '');
        if(id){
          const plan = plans().find(p => String(p && p.id) === String(id));
          if(plan) setSynced(plan);
        }
        renderRows();
        safe(() => { if(typeof saveData === 'function') saveData(); });
      }, 0);
      return result;
    };
    wrappedSync.__v0654SyncStatus = true;
    window.syncCurrentPlantingPlanToCalendar = wrappedSync;
    safe(() => { syncCurrentPlantingPlanToCalendar = wrappedSync; });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      renderRows();
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
    }, 1300);
  });
})();
