/* V1.0.3 JS split: Clean Planning UI.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  function safe(fn, fallback){ try{ return fn(); }catch(e){ console.warn(VERSION, e); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, function(ch){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]; }); }
  function arr(name){
    return safe(function(){
      if(name === 'plantingPlans') return Array.isArray(plantingPlans) ? plantingPlans : [];
      if(name === 'farmInputPlans') return Array.isArray(farmInputPlans) ? farmInputPlans : [];
      if(name === 'calEvents') return Array.isArray(calEvents) ? calEvents : [];
      return [];
    }, []);
  }
  function parseDate(v){
    if(!v) return null;
    const d = new Date(String(v).slice(0,10) + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? null : d;
  }
  function today(){
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }
  function daysUntil(v){
    const d = parseDate(v);
    if(!d) return 9999;
    return Math.round((d - today()) / 86400000);
  }
  function fmt(v){
    return safe(function(){ return (typeof _fmtTHDateIso === 'function') ? _fmtTHDateIso(v) : (v || '-'); }, v || '-');
  }
  function statusLevel(status, due){
    const st = String(status || '');
    if(/เลยกำหนด|ล่าช้า/.test(st) || due < 0) return 'danger';
    if(/ใกล้|กำลัง|รอ|วางแผน/.test(st) || due <= 7) return 'warn';
    return '';
  }
  function eventsForPlan(planId){
    return arr('calEvents').filter(function(e){ return e && e.source === 'planting-plan' && String(e.planId) === String(planId); });
  }
  function allTasks(){
    return arr('plantingPlans').flatMap(function(plan){
      return (Array.isArray(plan.tasks) ? plan.tasks : []).map(function(task){
        return Object.assign({ plan: plan }, task);
      });
    });
  }
  function materialReadyDate(item){ return item.ready || item.readyDate || item.finishDate || item.date || ''; }
  function materialStatus(item){ return String(item.status || 'กำลังผลิต'); }
  function readinessScore(){
    const plans = arr('plantingPlans');
    const tasks = allTasks();
    const inputs = arr('farmInputPlans');
    const overdueTasks = tasks.filter(function(t){ return daysUntil(t.date) < 0; }).length;
    const unsynced = plans.filter(function(p){ return p && p.id && !eventsForPlan(p.id).length; }).length;
    const lateMaterials = inputs.filter(function(x){ return /เลยกำหนด/.test(materialStatus(x)) || daysUntil(materialReadyDate(x)) < 0 && !/พร้อมใช้/.test(materialStatus(x)); }).length;
    const readyMaterials = inputs.filter(function(x){ return /พร้อมใช้|ใกล้พร้อมใช้/.test(materialStatus(x)); }).length;
    return Math.max(35, Math.min(100, 94 - overdueTasks * 8 - unsynced * 5 - lateMaterials * 7 + Math.min(6, readyMaterials * 2)));
  }
  function riskItems(){
    const out = [];
    allTasks().filter(function(t){ return daysUntil(t.date) < 0; }).slice(0,2).forEach(function(t){
      const p = t.plan || {};
      out.push({ level:'danger', title:t.title || t.type || 'งานแผนปลูกเลยกำหนด', sub:(p.cropName || '') + (p.plot ? ' · ' + p.plot : '') + ' · ' + fmt(t.date), tag:'เลยกำหนด' });
    });
    arr('plantingPlans').filter(function(p){ return p && p.id && !eventsForPlan(p.id).length; }).slice(0,2).forEach(function(p){
      out.push({ level:'warn', title:(p.cropName || p.id || 'แผนปลูก') + ' ยังไม่เข้าปฏิทิน', sub:(p.plot || '-') + ' · เริ่ม ' + fmt(p.startDate), tag:'ต้องซิงค์' });
    });
    arr('farmInputPlans').filter(function(x){ return /เลยกำหนด/.test(materialStatus(x)); }).slice(0,2).forEach(function(x){
      out.push({ level:'danger', title:x.name || 'วัสดุปลูกเลยกำหนด', sub:(x.type || '-') + ' · พร้อมใช้ ' + fmt(materialReadyDate(x)), tag:'วัสดุ' });
    });
    if(!out.length && !arr('plantingPlans').length) out.push({ level:'warn', title:'ยังไม่มีแผนปลูก', sub:'เริ่มสร้างแผนปลูกแรกเพื่อให้ระบบช่วยจัดงานรายวัน', tag:'เริ่มต้น' });
    return out.slice(0,4);
  }
  function upcomingPlans(){
    const tasks = allTasks().filter(function(t){ const d = daysUntil(t.date); return d >= -1 && d <= 21; });
    tasks.sort(function(a,b){ return daysUntil(a.date) - daysUntil(b.date); });
    const seen = new Set();
    return tasks.filter(function(t){
      const key = String(t.plan && t.plan.id || '') + String(t.title || t.type || '');
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0,4).map(function(t){
      const p = t.plan || {};
      const d = daysUntil(t.date);
      return {
        level: d < 0 ? 'danger' : d <= 3 ? 'warn' : '',
        title: (p.cropName || 'แผนปลูก') + (p.plot ? ' · ' + p.plot : ''),
        sub: (t.title || t.type || 'งานถัดไป') + ' · ' + fmt(t.date),
        tag: d < 0 ? 'เลยกำหนด' : d === 0 ? 'วันนี้' : 'อีก ' + d + ' วัน'
      };
    });
  }
  function materialItems(){
    const inputs = arr('farmInputPlans').slice().sort(function(a,b){
      return daysUntil(materialReadyDate(a)) - daysUntil(materialReadyDate(b));
    });
    return inputs.filter(function(x){
      return /พร้อมใช้|ใกล้พร้อมใช้|เลยกำหนด|กำลังผลิต|กำลังทำ/.test(materialStatus(x));
    }).slice(0,4).map(function(x){
      const due = daysUntil(materialReadyDate(x));
      const level = statusLevel(materialStatus(x), due);
      return {
        level: level,
        title: x.name || 'แผนผลิตวัสดุปลูก',
        sub: (x.type || '-') + ' · ' + (x.qty || '-') + ' · พร้อมใช้ ' + fmt(materialReadyDate(x)),
        tag: materialStatus(x)
      };
    });
  }
  function listHtml(items, emptyText){
    if(!items.length) return '<div class="clean-v0645-empty">'+esc(emptyText)+'</div>';
    return '<div class="clean-v0645-list">' + items.map(function(it){
      return '<div class="clean-v0645-item"><span class="clean-v0645-dot '+esc(it.level || '')+'"></span><div><div class="clean-v0645-item-title">'+esc(it.title || '-')+'</div><div class="clean-v0645-item-sub">'+esc(it.sub || '')+'</div></div><span class="clean-v0645-pill '+esc(it.level || '')+'">'+esc(it.tag || '')+'</span></div>';
    }).join('') + '</div>';
  }
  function ensureCleanPlanningUI(){
    const tabs = document.querySelector('#page-planning .farm-plan-tabs');
    const plantingTab = document.getElementById('farm-plan-tab-planting');
    if(tabs && plantingTab && !document.getElementById('farm-plan-tab-command')){
      plantingTab.insertAdjacentHTML('beforebegin', '<button class="farm-plan-tab" id="farm-plan-tab-command" onclick="switchFarmPlanTab(\'command\')">ภาพรวม</button>');
    }
    const commandTab = document.getElementById('farm-plan-tab-command');
    const inputsTab = document.getElementById('farm-plan-tab-inputs');
    if(commandTab) commandTab.textContent = 'ภาพรวม';
    if(plantingTab) plantingTab.textContent = 'แผนปลูก';
    if(inputsTab) inputsTab.textContent = 'วัสดุปลูก';
    const plantingPanel = document.getElementById('farm-plan-panel-planting');
    if(plantingPanel && !document.getElementById('farm-plan-panel-command')){
      plantingPanel.insertAdjacentHTML('beforebegin', '<section class="farm-plan-panel" id="farm-plan-panel-command"><div id="farm-command-center" class="farm-command-shell clean-v0645"></div></section>');
    }
    const title = document.querySelector('#page-planning .app-page-title');
    const sub = document.querySelector('#page-planning .app-page-subtitle');
    if(title) title.textContent = 'แผนงานฟาร์ม';
    if(sub) sub.textContent = 'ภาพรวมสั้น ๆ สำหรับตัดสินใจ แล้วค่อยเปิดรายละเอียดในแผนปลูกหรือวัสดุปลูก';
    const actions = document.querySelector('#page-planning .app-head-actions');
    if(actions && !actions.__v0645Cleaned){
      actions.innerHTML = '<button type="button" class="btn btn-primary" onclick="openPlantingPlanModal(true)">สร้างแผนปลูก</button><button type="button" class="btn btn-outline" onclick="openFarmInputPlanForm()">เพิ่มแผนผลิต</button>';
      actions.__v0645Cleaned = true;
    }
    const inputTitle = document.querySelector('#farm-plan-panel-inputs .farm-plan-card-head h3');
    if(inputTitle) inputTitle.textContent = 'แผนผลิตวัสดุปลูก';
    const inputAdd = document.querySelector('#farm-plan-panel-inputs .farm-plan-card-head .btn-primary');
    if(inputAdd) inputAdd.textContent = '+ เพิ่มแผนผลิต';
    const inputCalTitle = document.querySelector('#farm-plan-panel-inputs aside.farm-plan-card h3');
    if(inputCalTitle) inputCalTitle.textContent = 'ปฏิทินวัสดุพร้อมใช้';
  }
  function renderCleanCommandCenter(){
    ensureCleanPlanningUI();
    const root = document.getElementById('farm-command-center');
    if(!root) return;
    root.classList.add('clean-v0645');
    const plans = arr('plantingPlans');
    const inputs = arr('farmInputPlans');
    const tasks7 = allTasks().filter(function(t){ const d = daysUntil(t.date); return d >= 0 && d <= 7; }).length;
    const unsynced = plans.filter(function(p){ return p && p.id && !eventsForPlan(p.id).length; }).length;
    const ready = inputs.filter(function(x){ return /พร้อมใช้/.test(materialStatus(x)); }).length;
    const score = readinessScore();
    const scoreClass = score < 65 ? 'danger' : score < 82 ? 'warn' : '';
    root.innerHTML =
      '<section class="farm-command-hero clean-v0645"><div><div class="clean-v0645-title">ภาพรวมแผนงานวันนี้</div><div class="clean-v0645-sub">ดูเฉพาะเรื่องที่ควรตัดสินใจก่อน แล้วเปิดแท็บรายละเอียดเมื่อจะเพิ่ม แก้ไข หรือตรวจรายการเต็ม</div><div class="clean-v0645-actions"><button type="button" class="btn btn-primary" onclick="openPlantingPlanModal(true)">สร้างแผนปลูก</button><button type="button" class="btn btn-outline" onclick="openFarmInputPlanForm()">เพิ่มแผนผลิต</button><button type="button" class="btn btn-outline" onclick="switchFarmPlanTab(\'planting\')">ดูรายละเอียด</button></div></div><div class="clean-v0645-score '+scoreClass+'"><b>'+score+'</b><span>คะแนนความพร้อม</span></div></section>'+
      '<section class="clean-v0645-kpis"><div class="clean-v0645-kpi"><span>แผนปลูก</span><b>'+plans.length+'</b><small>รายการทั้งหมด</small></div><div class="clean-v0645-kpi"><span>งาน 7 วัน</span><b>'+tasks7+'</b><small>ต้องติดตาม</small></div><div class="clean-v0645-kpi"><span>ยังไม่เข้าปฏิทิน</span><b>'+unsynced+'</b><small>ควรตรวจซิงค์</small></div><div class="clean-v0645-kpi"><span>วัสดุพร้อมใช้</span><b>'+ready+'</b><small>ใช้กับรอบปลูกได้</small></div></section>'+
      '<section class="clean-v0645-grid"><div class="clean-v0645-card"><div class="clean-v0645-card-head"><div><div class="clean-v0645-card-title">งาน/ความเสี่ยงที่ต้องดู</div><div class="clean-v0645-card-sub">เฉพาะรายการที่มีผลต่อการตัดสินใจ</div></div></div>'+listHtml(riskItems(), 'ยังไม่พบความเสี่ยงสำคัญ')+'</div><div class="clean-v0645-card"><div class="clean-v0645-card-head"><div><div class="clean-v0645-card-title">แผนปลูกใกล้ถึงขั้นตอน</div><div class="clean-v0645-card-sub">งานจากแผนปลูกในช่วงใกล้ ๆ นี้</div></div><button type="button" class="btn btn-outline btn-sm" onclick="switchFarmPlanTab(\'planting\')">ดูรายละเอียด</button></div>'+listHtml(upcomingPlans(), 'ยังไม่มีงานแผนปลูกที่ต้องติดตามเร็ว ๆ นี้')+'</div><div class="clean-v0645-card"><div class="clean-v0645-card-head"><div><div class="clean-v0645-card-title">วัสดุปลูก</div><div class="clean-v0645-card-sub">พร้อมใช้ ใกล้พร้อม หรือเลยกำหนด</div></div><button type="button" class="btn btn-outline btn-sm" onclick="switchFarmPlanTab(\'inputs\')">ดูรายละเอียด</button></div>'+listHtml(materialItems(), 'ยังไม่มีแผนผลิตวัสดุปลูก')+'</div></section>';
  }
  function activateCleanTab(tab){
    ensureCleanPlanningUI();
    const target = (tab === 'inputs' || tab === 'planting') ? tab : 'command';
    document.querySelectorAll('#page-planning .farm-plan-tab').forEach(function(b){ b.classList.remove('active'); });
    document.querySelectorAll('#page-planning .farm-plan-panel').forEach(function(p){ p.classList.remove('active'); });
    document.getElementById('farm-plan-tab-' + target)?.classList.add('active');
    document.getElementById('farm-plan-panel-' + target)?.classList.add('active');
    if(target === 'command') renderCleanCommandCenter();
    if(target === 'planting') safe(function(){ if(typeof renderPlantingPlans === 'function') renderPlantingPlans(); });
    if(target === 'inputs') safe(function(){ if(typeof renderFarmInputPlans === 'function') renderFarmInputPlans(); });
  }
  const previousSwitch = window.switchFarmPlanTab;
  window.switchFarmPlanTab = function(tab){
    if(tab === 'command' || tab === 'planting' || tab === 'inputs') return activateCleanTab(tab);
    return typeof previousSwitch === 'function' ? previousSwitch.apply(this, arguments) : activateCleanTab('command');
  };
  const previousNavigate = window.navigate;
  if(typeof previousNavigate === 'function' && !previousNavigate.__v0645CleanPlanning){
    const wrappedNavigate = function(page){
      const result = previousNavigate.apply(this, arguments);
      if(page === 'planning') setTimeout(function(){ activateCleanTab('command'); }, 140);
      return result;
    };
    wrappedNavigate.__v0645CleanPlanning = true;
    window.navigate = wrappedNavigate;
  }
  function refreshCommandIfActive(){
    if(document.getElementById('farm-plan-panel-command')?.classList.contains('active')) renderCleanCommandCenter();
  }
  ['renderPlantingPlans','renderFarmInputPlans'].forEach(function(name){
    const oldFn = window[name];
    if(typeof oldFn === 'function' && !oldFn.__v0645CleanPlanning){
      const wrapped = function(){
        const result = oldFn.apply(this, arguments);
        safe(refreshCommandIfActive);
        return result;
      };
      wrapped.__v0645CleanPlanning = true;
      window[name] = wrapped;
      try{ if(name === 'renderPlantingPlans') renderPlantingPlans = wrapped; if(name === 'renderFarmInputPlans') renderFarmInputPlans = wrapped; }catch(e){}
    }
  });
  function boot(){
    ensureCleanPlanningUI();
    safe(function(){
      document.title = document.title.replace(/V0\.6\.\d+/, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; });
      document.querySelectorAll('.badge-text span:last-child').forEach(function(el){ if(/V0\.6\./.test(el.textContent || '')) el.textContent = VERSION; });
    });
    if(document.getElementById('page-planning')?.classList.contains('active')) activateCleanTab('command');
    console.log(VERSION + ' clean planning UI ready');
  }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(boot, 2600); });
  if(document.readyState !== 'loading') setTimeout(boot, 2600);
})();
