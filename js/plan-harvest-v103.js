/* V1.0.3 JS split: Harvest Date + Clean Planting Form.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let lastType = '';
  let lastCrop = '';
  let manualHarvest = false;
  let internalChange = false;

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function draft(){ return safe(() => (typeof _fpDraft !== 'undefined' ? _fpDraft : null), null); }
  function setDraft(v){ safe(() => { _fpDraft = v; }); }
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
  function addDays(iso, n){
    const d = new Date(String(iso || '') + 'T00:00:00');
    if(isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + Number(n || 0));
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10);
  }
  function daysBetween(a,b){
    const da = new Date(String(a || '') + 'T00:00:00');
    const db = new Date(String(b || '') + 'T00:00:00');
    if(isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
    return Math.round((db - da) / 86400000);
  }
  function isHarvestTask(t){
    return /เก็บเกี่ยว|คาดเก็บ|พร้อมเก็บ/.test(String((t && t.title || '') + ' ' + (t && t.type || '')));
  }
  function templateHarvestDate(){
    const crop = q('#fp-crop')?.value || '';
    const start = parseIso(q('#fp-start')?.value || '') || safe(() => (typeof _iso === 'function' ? _iso(new Date()) : ''), '');
    const tpl = safe(() => Object.assign({}, cropPlanTemplates && cropPlanTemplates['Green Oak'] || {}, cropPlanTemplates && cropPlanTemplates[crop] || {}), {});
    return addDays(start, Number(tpl.harvestDay || 45));
  }
  function getHarvestInputIso(){
    return parseIso(q('#fp-harvest-date')?.value || '');
  }
  function syncHarvestToDraft(iso, markManual){
    const d = draft();
    if(!d || !iso) return;
    d.harvestDate = iso;
    d.harvestDateManual = !!markManual;
    if(Array.isArray(d.tasks)){
      let task = d.tasks.slice().reverse().find(isHarvestTask);
      if(task){
        task.date = iso;
        task.day = daysBetween(d.startDate, iso);
      }
      d.tasks.sort((a,b) => String(a.date || '').localeCompare(String(b.date || ''))).forEach((task, index) => { task.order = index + 1; });
    }
  }
  function ensureHarvestField(){
    const modal = q('#modal-planting-plan');
    if(!modal) return;
    const form = q('.fp-form-card .farm-plan-formgrid', modal);
    if(!form || q('#fp-harvest-date')) return;
    const startLabel = q('#fp-start')?.closest('label');
    const label = document.createElement('label');
    label.innerHTML = '<input id="fp-harvest-date" type="hidden">';
    if(startLabel && startLabel.nextSibling) form.insertBefore(label, startLabel.nextSibling);
    else form.appendChild(label);
    q('#fp-harvest-date')?.addEventListener('input', function(){
      manualHarvest = true;
      syncHarvestToDraft(getHarvestInputIso(), true);
    });
    q('#fp-harvest-date')?.addEventListener('change', function(){
      manualHarvest = true;
      syncHarvestToDraft(getHarvestInputIso(), true);
      safe(() => { if(typeof renderPlantingDraft === 'function') renderPlantingDraft(); });
    });
  }
  function cleanText(){
    const modal = q('#modal-planting-plan');
    if(!modal) return;
    const title = q('.modal-title', modal);
    const cropHead = q('.fp-crop-name-manager-head', modal);
    const taskDateHead = q('.fp-task-table th:nth-child(3)', modal);
    if(title && /^\+/.test(title.textContent || '')) title.textContent = 'แผนปลูก';
    if(cropHead) cropHead.childNodes.forEach(node => { if(node.nodeType === Node.TEXT_NODE) node.textContent = 'รายชื่อพืช '; });
    if(taskDateHead) taskDateHead.textContent = 'วันที่';
  }
  function setHarvestFieldFromDraft(force){
    ensureHarvestField();
    const input = q('#fp-harvest-date');
    if(!input) return;
    const d = draft();
    const iso = (d && d.harvestDate) || templateHarvestDate();
    if(force || !manualHarvest || !input.value) input.value = fmt(iso);
    if(d && d.harvestDateManual) manualHarvest = true;
  }
  function rememberCurrentSelection(){
    lastType = q('#fp-type')?.value || lastType;
    lastCrop = q('#fp-crop')?.value || lastCrop;
  }
  function hasEditedDraft(){
    const d = draft();
    if(!d) return false;
    if(d.harvestDateManual) return true;
    if(d.id && safe(() => Array.isArray(plantingPlans) && plantingPlans.some(p => String(p.id) === String(d.id)), false)) return true;
    return Array.isArray(d.tasks) && d.tasks.some(t => t && (t.updatedAt || t.createdAt || t.manual));
  }
  function blockUnconfirmedCropChange(ev){
    if(internalChange) return;
    const target = ev.target;
    if(!target || (target.id !== 'fp-type' && target.id !== 'fp-crop')) return;
    if(!hasEditedDraft()){
      setTimeout(rememberCurrentSelection, 0);
      return;
    }
    if(confirm('คำนวณแผนใหม่จากพืชที่เลือก?')){
      setTimeout(function(){
        const d = draft();
        const iso = getHarvestInputIso();
        if(d && manualHarvest && iso) syncHarvestToDraft(iso, true);
        rememberCurrentSelection();
        setHarvestFieldFromDraft(false);
      }, 0);
      return;
    }
    ev.preventDefault();
    ev.stopImmediatePropagation();
    internalChange = true;
    if(target.id === 'fp-type' && lastType) target.value = lastType;
    if(target.id === 'fp-crop' && lastCrop) target.value = lastCrop;
    internalChange = false;
  }
  function afterCalculate(){
    const inputIso = getHarvestInputIso();
    const d = draft();
    if(d && manualHarvest && inputIso) syncHarvestToDraft(inputIso, true);
    setHarvestFieldFromDraft(false);
    cleanText();
    rememberCurrentSelection();
  }
  window.resetPlanHarvestDate = function(){
    manualHarvest = false;
    const iso = templateHarvestDate();
    const input = q('#fp-harvest-date');
    if(input) input.value = fmt(iso);
    syncHarvestToDraft(iso, false);
    safe(() => { if(typeof renderPlantingDraft === 'function') renderPlantingDraft(); });
  };

  const oldCalc = window.calculatePlantingPlan;
  if(typeof oldCalc === 'function' && !oldCalc.__v0651Harvest){
    const wrapped = function(){
      const result = oldCalc.apply(this, arguments);
      afterCalculate();
      return result;
    };
    wrapped.__v0651Harvest = true;
    window.calculatePlantingPlan = wrapped;
    safe(() => { calculatePlantingPlan = wrapped; });
  }
  ['onFarmPlanCropTypeChange','onFarmPlanCropNameChange','renderPlantingDraft','openPlantingPlanModal','viewPlantingPlan','editPlantingPlan'].forEach(function(name){
    const fn = window[name];
    if(typeof fn !== 'function' || fn.__v0651Harvest) return;
    const wrapped = function(){
      const result = fn.apply(this, arguments);
      setTimeout(function(){
        ensureHarvestField();
        cleanText();
        setHarvestFieldFromDraft(name === 'viewPlantingPlan' || name === 'editPlantingPlan');
        rememberCurrentSelection();
      }, 0);
      return result;
    };
    wrapped.__v0651Harvest = true;
    window[name] = wrapped;
    safe(() => { eval(name + ' = window[name]'); });
  });
  const oldSave = window.savePlantingPlan;
  if(typeof oldSave === 'function' && !oldSave.__v0651Harvest){
    const wrappedSave = function(){
      const iso = getHarvestInputIso();
      if(iso) syncHarvestToDraft(iso, manualHarvest);
      return oldSave.apply(this, arguments);
    };
    wrappedSave.__v0651Harvest = true;
    window.savePlantingPlan = wrappedSave;
    safe(() => { savePlantingPlan = wrappedSave; });
  }
  document.addEventListener('change', blockUnconfirmedCropChange, true);
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      ensureHarvestField();
      cleanText();
      setHarvestFieldFromDraft(true);
      rememberCurrentSelection();
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
    }, 900);
  });
})();
