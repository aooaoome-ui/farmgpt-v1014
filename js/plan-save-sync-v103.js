/* V1.0.3 JS split: Split Plan Save From Calendar Sync.
   Extracted during the V1.0.3 UI JS split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
  function toast(msg){ safe(() => { if(typeof showToast === 'function') showToast(msg); }); }
  function clone(v){ return JSON.parse(JSON.stringify(v || null)); }
  function parseIso(v){
    const s = String(v || '').trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if(m){
      const y = Number(m[3]) > 2400 ? Number(m[3]) - 543 : Number(m[3]);
      return String(y).padStart(4,'0') + '-' + String(m[2]).padStart(2,'0') + '-' + String(m[1]).padStart(2,'0');
    }
    const d = new Date(s);
    if(isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  }
  function addDays(iso, days){
    const d = new Date(String(iso || '') + 'T00:00:00');
    if(isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + Number(days || 0));
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  }
  function diffDays(a,b){
    const da = new Date(String(a || '') + 'T00:00:00');
    const db = new Date(String(b || '') + 'T00:00:00');
    if(isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
    return Math.round((db - da) / 86400000);
  }
  function getDraft(){
    let d = safe(() => (typeof _fpDraft !== 'undefined' ? _fpDraft : null), null);
    if(!d && typeof calculatePlantingPlan === 'function'){
      safe(() => calculatePlantingPlan());
      d = safe(() => (typeof _fpDraft !== 'undefined' ? _fpDraft : null), null);
    }
    if(d && !Array.isArray(d.tasks)) d.tasks = [];
    return d;
  }
  function makePlanId(){
    const year = new Date().getFullYear() + 543;
    const list = safe(() => Array.isArray(plantingPlans) ? plantingPlans : [], []);
    return 'PL-' + year + '-' + String(list.length + 1).padStart(4,'0');
  }
  function harvestTask(t){
    return /เก็บเกี่ยว|คาดเก็บ|พร้อมเก็บ/.test(String((t && t.title || '') + ' ' + (t && t.type || '')));
  }
  function syncFormToDraft(){
    const d = getDraft();
    if(!d) return null;
    const val = id => q('#' + id)?.value || '';
    const start = parseIso(val('fp-start')) || d.startDate || addDays(parseIso(new Date().toISOString().slice(0,10)), 0);
    const duration = Math.max(1, Math.round(Number(val('fp-duration-days') || d.plantingDurationDays || 45)));
    const harvest = addDays(start, duration) || d.harvestDate || start;
    Object.assign(d, {
      id:d.id || makePlanId(),
      cropName:val('fp-crop') || d.cropName || '',
      cropType:val('fp-type') || d.cropType || '',
      plot:val('fp-plot') || d.plot || '',
      startDate:start,
      harvestDate:harvest,
      plantingDurationDays:duration,
      quantity:val('fp-qty') || '',
      unit:val('fp-unit') || d.unit || 'ต้น',
      status:val('fp-status') || d.status || 'กำลังดำเนินการ',
      updatedAt:new Date().toISOString()
    });
    if(Array.isArray(d.tasks)){
      const task = d.tasks.slice().reverse().find(harvestTask);
      if(task){
        task.date = harvest;
        task.day = diffDays(start, harvest);
      }
      d.tasks.sort((a,b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach((task, index) => {
        task.order = index + 1;
        task.day = diffDays(start, task.date);
      });
    }
    return d;
  }
  function upsertPlan(plan){
    safe(() => { if(!Array.isArray(plantingPlans)) plantingPlans = []; });
    const list = safe(() => plantingPlans, []);
    const idx = list.findIndex(p => String(p && p.id) === String(plan && plan.id));
    if(idx >= 0) list[idx] = plan;
    else list.push(plan);
    return idx;
  }
  function refreshAfterSave(){
    safe(() => { if(typeof renderPlantingPlans === 'function') renderPlantingPlans(); });
    safe(() => { if(typeof renderPlantingOverviewExtras === 'function') renderPlantingOverviewExtras(); });
    safe(() => { if(typeof renderDashboard === 'function') renderDashboard(); });
    safe(() => { if(typeof renderDashboardNotifications === 'function') renderDashboardNotifications(); });
    safe(() => { if(typeof renderCalendar === 'function') renderCalendar(); });
  }
  function saveCurrentPlan(options){
    options = options || {};
    const draft = syncFormToDraft();
    if(!draft){ toast('ยังไม่มีข้อมูลแผนปลูก'); return null; }
    const plan = clone(draft);
    const idx = upsertPlan(plan);
    if(options.syncCalendar){
      safe(() => { if(typeof addPlanTasksToCalendar === 'function') addPlanTasksToCalendar(plan); });
    }
    safe(() => { if(typeof saveData === 'function') saveData(); });
    refreshAfterSave();
    toast(options.syncCalendar
      ? (idx >= 0 ? 'อัปเดตแผนและส่งเข้าปฏิทินแล้ว' : 'บันทึกแผนและส่งเข้าปฏิทินแล้ว')
      : (idx >= 0 ? 'บันทึกแผนแล้ว' : 'บันทึกแผนใหม่แล้ว'));
    return plan;
  }
  function installButtons(){
    const modal = q('#modal-planting-plan');
    if(!modal) return;
    qa('.farm-plan-actions', modal).forEach(row => row.classList.add('fp-save-sync-actions'));
    qa('.farm-plan-actions .btn', modal).forEach(btn => {
      if(/บันทึก/.test(btn.textContent || '')){
        btn.textContent = 'บันทึกแผน';
        btn.setAttribute('onclick', 'savePlantingPlan()');
        btn.title = 'บันทึกแผนเท่านั้น';
      }
    });
    const footer = q('.modal-footer', modal);
    if(footer){
      const primary = q('.btn-primary', footer);
      if(primary){
        primary.textContent = 'ส่งเข้าปฏิทิน';
        primary.classList.add('fp-calendar-sync-btn');
        primary.setAttribute('onclick', 'syncCurrentPlantingPlanToCalendar()');
        primary.title = 'บันทึกแผนนี้แล้วส่งงานเข้าปฏิทิน';
      }
    }
    qa('.fp-modal-timeline-card .btn, .farm-plan-timeline-card .btn', modal).forEach(btn => {
      if(/ส่งเข้าปฏิทิน|ซิงค์/.test(btn.textContent || '')){
        btn.textContent = 'ส่งเข้าปฏิทิน';
        btn.setAttribute('onclick', 'syncCurrentPlantingPlanToCalendar()');
      }
    });
    qa('.modal-subtitle,.farm-plan-hint', modal).forEach(el => { el.style.display = 'none'; });
  }

  window.savePlantingPlan = function(){
    saveCurrentPlan({syncCalendar:false});
  };
  window.savePlantingPlanDraft = window.savePlantingPlan;
  window.syncCurrentPlantingPlanToCalendar = function(){
    saveCurrentPlan({syncCalendar:true});
  };
  window.syncPlantingPlansToCalendar = function(){
    safe(() => { if(!Array.isArray(plantingPlans)) plantingPlans = []; });
    const plans = safe(() => plantingPlans, []);
    plans.forEach(plan => safe(() => { if(typeof addPlanTasksToCalendar === 'function') addPlanTasksToCalendar(plan); }));
    safe(() => { if(typeof renderCalendar === 'function') renderCalendar(); });
    safe(() => { if(typeof saveData === 'function') saveData(); });
    refreshAfterSave();
    toast('ส่งแผนปลูกทั้งหมดเข้าปฏิทินแล้ว');
  };
  safe(() => { savePlantingPlan = window.savePlantingPlan; });
  safe(() => { savePlantingPlanDraft = window.savePlantingPlanDraft; });
  safe(() => { syncCurrentPlantingPlanToCalendar = window.syncCurrentPlantingPlanToCalendar; });
  safe(() => { syncPlantingPlansToCalendar = window.syncPlantingPlansToCalendar; });

  ['openPlantingPlanModal','renderPlantingDraft','renderPlantingPlans'].forEach(function(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn.__v0653SaveSync) return;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      setTimeout(installButtons, 0);
      setTimeout(installButtons, 120);
      return result;
    };
    wrapped.__v0653SaveSync = true;
    window[name] = wrapped;
    safe(() => { eval(name + ' = window[name]'); });
  });

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      installButtons();
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
    }, 1200);
  });
})();
