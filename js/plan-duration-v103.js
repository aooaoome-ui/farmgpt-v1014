/* V1.0.3 JS split: Planting Duration Days + Care Actions Layout.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let manualDuration = false;

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.from((root || document).querySelectorAll(sel)); }
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
  function fmt(iso){ return safe(() => (typeof _fmtTHDateIso === 'function' ? _fmtTHDateIso(iso) : (iso || '')), iso || ''); }
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
    return Math.max(0, Math.round((db - da) / 86400000));
  }
  function draft(){ return safe(() => (typeof _fpDraft !== 'undefined' ? _fpDraft : null), null); }
  function startIso(){
    const d = draft();
    return parseIso(q('#fp-start')?.value || '') || (d && d.startDate) || safe(() => (typeof _iso === 'function' ? _iso(new Date()) : ''), '');
  }
  function templateDays(){
    const crop = q('#fp-crop')?.value || (draft() && draft().cropName) || '';
    const d = draft();
    if(d && Number(d.plantingDurationDays) > 0) return Number(d.plantingDurationDays);
    const tpl = safe(() => Object.assign({}, cropPlanTemplates && cropPlanTemplates['Green Oak'] || {}, cropPlanTemplates && cropPlanTemplates[crop] || {}), {});
    if(Number(tpl.harvestDay) > 0) return Number(tpl.harvestDay);
    if(d && d.startDate && d.harvestDate) return diffDays(d.startDate, d.harvestDate);
    return 45;
  }
  function currentDays(){
    const input = q('#fp-duration-days');
    const n = Number(input && input.value);
    if(n > 0) return Math.round(n);
    return templateDays();
  }
  function harvestTask(t){
    return /เก็บเกี่ยว|คาดเก็บ|พร้อมเก็บ/.test(String((t && t.title || '') + ' ' + (t && t.type || '')));
  }
  function syncDurationToDraft(days, markManual){
    const d = draft();
    if(!d) return null;
    const n = Math.max(1, Math.round(Number(days || templateDays())));
    const start = startIso();
    const harvest = addDays(start, n);
    d.startDate = start || d.startDate;
    d.harvestDate = harvest || d.harvestDate;
    d.plantingDurationDays = n;
    d.plantingDurationManual = !!markManual;
    d.harvestDateManual = !!markManual;
    if(Array.isArray(d.tasks) && harvest){
      const task = d.tasks.slice().reverse().find(harvestTask);
      if(task){
        task.date = harvest;
        task.day = diffDays(d.startDate, harvest);
      }
      d.tasks.sort((a,b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach((task, index) => { task.order = index + 1; });
    }
    const hidden = q('#fp-harvest-date');
    if(hidden) hidden.value = fmt(d.harvestDate);
    return d;
  }
  function updateDurationResult(){
    const days = currentDays();
    const harvest = addDays(startIso(), days);
    const out = q('#fp-duration-result');
    if(out) out.textContent = harvest ? 'เก็บเกี่ยว ' + fmt(harvest) : '';
    updateCareDurationCard();
  }
  function ensureDurationField(){
    const modal = q('#modal-planting-plan');
    const form = q('.fp-form-card .farm-plan-formgrid', modal);
    if(!modal || !form) return;
    let oldInput = q('#fp-harvest-date', modal);
    if(!oldInput && typeof window.resetPlanHarvestDate === 'function') safe(() => window.resetPlanHarvestDate());
    oldInput = q('#fp-harvest-date', modal);
    const oldLabel = oldInput && oldInput.closest('label');
    if(q('#fp-duration-days', modal)) return;
    const html = 'ระยะเวลาปลูก<div class="fp-duration-row"><input id="fp-duration-days" type="number" min="1" step="1" class="form-control" placeholder="วัน"><span id="fp-duration-result" class="fp-duration-result"></span><button type="button" class="btn btn-outline btn-sm fp-duration-reset" onclick="resetPlanDurationDays()">รีเซ็ต</button></div><input id="fp-harvest-date" type="hidden">';
    if(oldLabel) oldLabel.innerHTML = html;
    else {
      const label = document.createElement('label');
      label.innerHTML = html;
      const startLabel = q('#fp-start', modal)?.closest('label');
      if(startLabel && startLabel.nextSibling) form.insertBefore(label, startLabel.nextSibling);
      else form.appendChild(label);
    }
    const input = q('#fp-duration-days', modal);
    if(input){
      input.addEventListener('input', function(){
        manualDuration = true;
        syncDurationToDraft(currentDays(), true);
        updateDurationResult();
      });
      input.addEventListener('change', function(){
        manualDuration = true;
        syncDurationToDraft(currentDays(), true);
        updateDurationResult();
        safe(() => { if(typeof renderPlantingDraft === 'function') renderPlantingDraft(); });
      });
    }
  }
  function fillDurationField(force){
    ensureDurationField();
    const input = q('#fp-duration-days');
    if(!input) return;
    const d = draft();
    if(d && d.plantingDurationManual) manualDuration = true;
    const days = d && Number(d.plantingDurationDays) > 0 ? Number(d.plantingDurationDays) : templateDays();
    if(force || !manualDuration || !input.value) input.value = days;
    syncDurationToDraft(input.value || days, !!manualDuration);
    updateDurationResult();
  }
  function updateCareDurationCard(){
    const modal = q('#modal-planting-plan');
    const card = q('.fp-care-card', modal);
    if(!card) return;
    const days = currentDays();
    let chip = q('#fp-duration-chip-v0652', card);
    const head = q('.farm-plan-card-head', card);
    if(!chip && head){
      chip = document.createElement('span');
      chip.id = 'fp-duration-chip-v0652';
      chip.className = 'fp-duration-chip';
      const h3 = q('h3', head);
      if(h3 && h3.nextSibling) head.insertBefore(chip, h3.nextSibling);
      else head.insertBefore(chip, head.firstChild);
    }
    if(chip) chip.textContent = 'ระยะเวลาปลูก ' + days + ' วัน';
    const wk = q('#fp-v0640-workload', card);
    if(wk){
      const firstLabel = q('span', wk);
      const firstValue = q('b', wk);
      if(firstLabel) firstLabel.textContent = 'ระยะเวลาปลูก';
      if(firstValue) firstValue.textContent = days + ' วัน';
    }
  }
  function cleanCareActions(){
    const modal = q('#modal-planting-plan');
    if(!modal) return;
    qa('.fp-insert-btn', modal).forEach(btn => {
      if(/^แทรก/.test((btn.textContent || '').trim())) btn.textContent = 'แทรก';
    });
    qa('th', modal).forEach(th => {
      if((th.textContent || '').trim() === 'วันที่แนะนำ') th.textContent = 'วันที่';
    });
    updateCareDurationCard();
  }
  function refreshDuration(force){
    ensureDurationField();
    fillDurationField(!!force);
    cleanCareActions();
  }
  window.resetPlanDurationDays = function(){
    manualDuration = false;
    const input = q('#fp-duration-days');
    const days = templateDays();
    if(input) input.value = days;
    syncDurationToDraft(days, false);
    updateDurationResult();
    safe(() => { if(typeof renderPlantingDraft === 'function') renderPlantingDraft(); });
    cleanCareActions();
  };
  window.resetPlanHarvestDate = window.resetPlanDurationDays;

  const oldCalc = window.calculatePlantingPlan;
  if(typeof oldCalc === 'function' && !oldCalc.__v0652Duration){
    const wrapped = function(){
      const keepDays = manualDuration ? currentDays() : null;
      const result = oldCalc.apply(this, arguments);
      if(keepDays) syncDurationToDraft(keepDays, true);
      refreshDuration(false);
      return result;
    };
    wrapped.__v0652Duration = true;
    window.calculatePlantingPlan = wrapped;
    safe(() => { calculatePlantingPlan = wrapped; });
  }
  ['renderPlantingDraft','openPlantingPlanModal','viewPlantingPlan','editPlantingPlan','onFarmPlanCropTypeChange','onFarmPlanCropNameChange'].forEach(function(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn.__v0652Duration) return;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      setTimeout(function(){ refreshDuration(name === 'viewPlantingPlan' || name === 'editPlantingPlan'); }, 0);
      setTimeout(cleanCareActions, 120);
      return result;
    };
    wrapped.__v0652Duration = true;
    window[name] = wrapped;
    safe(() => { eval(name + ' = window[name]'); });
  });
  const oldSave = window.savePlantingPlan;
  if(typeof oldSave === 'function' && !oldSave.__v0652Duration){
    const wrappedSave = function(){
      syncDurationToDraft(currentDays(), !!manualDuration);
      return oldSave.apply(this, arguments);
    };
    wrappedSave.__v0652Duration = true;
    window.savePlantingPlan = wrappedSave;
    safe(() => { savePlantingPlan = wrappedSave; });
  }
  document.addEventListener('input', function(ev){
    if(ev.target && ev.target.id === 'fp-start'){
      syncDurationToDraft(currentDays(), !!manualDuration);
      updateDurationResult();
      cleanCareActions();
    }
  }, true);
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      refreshDuration(true);
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
    }, 1100);
  });
})();
