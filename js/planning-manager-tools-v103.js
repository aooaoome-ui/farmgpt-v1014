/* V1.0.3 JS split: Planting Plan Manager Tools.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const PATCH_NAME = 'Planning Manager Tools';
  const safe = (fn, fallback)=>{ try{ return fn(); }catch(e){ console.warn(VERSION, e); return fallback; } };
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  function list(name){
    if(name === 'plantingPlans') return safe(()=>Array.isArray(plantingPlans) ? plantingPlans : [], []);
    if(name === 'farmInputPlans') return safe(()=>Array.isArray(farmInputPlans) ? farmInputPlans : [], []);
    if(name === 'calEvents') return safe(()=>Array.isArray(calEvents) ? calEvents : [], []);
    return Array.isArray(window[name]) ? window[name] : [];
  }
  function parseDate(v){
    if(!v) return null;
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return new Date(String(v)+'T00:00:00');
    const m = String(v).trim().match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if(m){ let y = +m[3]; if(y > 2400) y -= 543; return new Date(y, +m[2]-1, +m[1]); }
    const d = new Date(v); return isNaN(d.getTime()) ? null : d;
  }
  function iso(d){ if(!d) return ''; const x = new Date(d.getTime() - d.getTimezoneOffset()*60000); return x.toISOString().slice(0,10); }
  function addDays(base, n){ const d = parseDate(base) || new Date(); d.setDate(d.getDate() + Number(n || 0)); return iso(d); }
  function fmt(isoDate){
    if(!isoDate) return '-';
    return safe(()=>new Date(String(isoDate)+'T00:00:00').toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit',year:'numeric'}), isoDate);
  }
  function daysBetween(a,b){
    const da = parseDate(a), db = parseDate(b);
    if(!da || !db) return 0;
    return Math.round((db - da) / 86400000);
  }
  function getDraft(){
    if(typeof _fpDraft !== 'undefined' && _fpDraft) return _fpDraft;
    return null;
  }
  function currentPlanFromForm(){
    const draft = getDraft() || {};
    const read = id=>document.getElementById(id)?.value || '';
    const crop = read('fp-crop') || draft.cropName || 'พืช';
    const type = read('fp-type') || draft.cropType || 'พืชผัก';
    const startDate = iso(parseDate(read('fp-start'))) || draft.startDate || iso(new Date());
    const harvestDate = draft.harvestDate || addDays(startDate, 45);
    return Object.assign({}, draft, {
      id: draft.id || '',
      cropName: crop,
      cropType: type,
      plot: read('fp-plot') || draft.plot || '',
      startDate,
      harvestDate,
      quantity: read('fp-qty') || draft.quantity || '',
      unit: read('fp-unit') || draft.unit || 'ต้น',
      status: read('fp-status') || draft.status || 'กำลังดำเนินการ',
      tasks: Array.isArray(draft.tasks) ? draft.tasks : []
    });
  }
  function overlap(aStart, aEnd, bStart, bEnd){
    return String(aStart || '') <= String(bEnd || '') && String(bStart || '') <= String(aEnd || '');
  }
  function planRisks(plan){
    const risks = [];
    if(!plan.plot) risks.push({kind:'danger', icon:'!', title:'ยังไม่ได้ระบุแปลงปลูก', sub:'ใส่แปลง/โรงเรือนก่อนบันทึก เพื่อให้ติดตามรอบปลูกและปฏิทินได้ชัดเจน', tag:'ต้องแก้'});
    if(!plan.quantity) risks.push({kind:'warn', icon:'?', title:'ยังไม่ได้ระบุจำนวนปลูก', sub:'จำนวนช่วยประเมินต้นทุน เมล็ดพันธุ์ ถาดเพาะ และแรงงาน', tag:'ควรเติม'});
    const conflicts = list('plantingPlans').filter(p=>p && p.plot && plan.plot && String(p.plot).trim() === String(plan.plot).trim() && String(p.id || '') !== String(plan.id || '') && overlap(plan.startDate, plan.harvestDate, p.startDate, p.harvestDate || p.startDate));
    conflicts.slice(0,2).forEach(p=>risks.push({kind:'danger', icon:'!', title:'แปลงอาจชนกับ '+(p.cropName || p.id || 'แผนเดิม'), sub:'ช่วง '+fmt(p.startDate)+' - '+fmt(p.harvestDate || p.startDate)+' ใช้แปลงเดียวกัน', tag:'ชนแปลง'}));
    const eventCount = list('calEvents').filter(e=>e && e.source === 'planting-plan' && String(e.planId || '') === String(plan.id || '')).length;
    if(plan.id && eventCount === 0) risks.push({kind:'warn', icon:'↻', title:'แผนนี้ยังไม่อยู่ในปฏิทิน', sub:'กด “ซิงค์แผนนี้” เมื่อพร้อมให้ทีมเห็นงานดูแลรายวัน', tag:'ยังไม่ซิงค์'});
    if(!risks.length) risks.push({kind:'ok', icon:'✓', title:'ข้อมูลหลักพร้อมใช้งาน', sub:'ไม่พบแปลงชนกัน และข้อมูลพื้นฐานครบพอสำหรับวางแผนรอบปลูก', tag:'พร้อม'});
    return risks;
  }
  function inputReadiness(plan){
    const inputs = list('farmInputPlans');
    const start = plan.startDate;
    const harvest = plan.harvestDate;
    const need = [
      {key:'ปุ๋ยหมัก', title:'ปุ๋ยหมัก/อินทรียวัตถุ', re:/ปุ๋ย|หมัก|compost/i},
      {key:'น้ำหมัก', title:'น้ำหมักชีวภาพ', re:/น้ำหมัก|ferment/i},
      {key:'ชีวภัณฑ์', title:'ชีวภัณฑ์ป้องกันโรค/แมลง', re:/ชีว|ไตรโค|บิว|tricho|beau/i}
    ];
    return need.map(n=>{
      const matches = inputs.filter(x=>n.re.test(String((x && (x.type+' '+x.name+' '+x.materials)) || '')));
      const ready = matches.find(x=>/พร้อมใช้|ใกล้พร้อมใช้/i.test(String(x.status || '')) && String(x.ready || '') <= String(harvest || start));
      const late = matches.find(x=>String(x.ready || '') > String(start || ''));
      if(ready) return {kind:'ok', icon:'✓', title:n.title, sub:(ready.name || n.key)+' พร้อมใช้ '+fmt(ready.ready)+' · '+(ready.qty || ''), tag:'พร้อม'};
      if(late) return {kind:'warn', icon:'!', title:n.title, sub:(late.name || n.key)+' จะพร้อม '+fmt(late.ready)+' ตรวจว่าเร็วพอกับงานในแผนหรือไม่', tag:'เช็กวัน'};
      return {kind:'warn', icon:'+', title:n.title, sub:'ยังไม่พบรายการในแผนผลิตวัสดุปลูก ควรเพิ่มไว้ก่อนเริ่มรอบปลูก', tag:'ต้องเตรียม'};
    });
  }
  function workload(plan){
    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    const first14 = tasks.filter(t=>daysBetween(plan.startDate, t.date) >= 0 && daysBetween(plan.startDate, t.date) <= 14).length;
    const care = tasks.filter(t=>!/เพาะ|เก็บเกี่ยว/i.test(String((t.type || '') + (t.title || '')))).length;
    const duration = Math.max(1, daysBetween(plan.startDate, plan.harvestDate));
    return {total:tasks.length, first14, care, duration};
  }
  function renderItems(items){
    return '<div class="fp-manager-list">'+items.map(item=>
      '<div class="fp-manager-item"><div>'+esc(item.icon || '•')+'</div><div><b>'+esc(item.title)+'</b><span>'+esc(item.sub || '')+'</span></div><em class="fp-manager-tag '+esc(item.kind === 'danger' ? 'danger' : item.kind === 'warn' ? 'warn' : '')+'">'+esc(item.tag || '')+'</em></div>'
    ).join('')+'</div>';
  }
  function scoreFor(risks, ready){
    let score = 100;
    risks.forEach(r=>{ if(r.kind === 'danger') score -= 28; else if(r.kind === 'warn') score -= 13; });
    ready.forEach(r=>{ if(r.kind === 'warn') score -= 10; });
    return Math.max(0, Math.min(100, score));
  }
  function ensureModalTools(){
    const modal = document.getElementById('modal-planting-plan');
    const formCard = modal?.querySelector('.fp-form-card');
    if(formCard && !document.getElementById('fp-v0640-manager-check')){
      const hint = formCard.querySelector('.farm-plan-hint');
      (hint || formCard).insertAdjacentHTML(hint ? 'afterend' : 'beforeend', '<div id="fp-v0640-manager-check" class="fp-manager-check"></div>');
    }
    const careCard = modal?.querySelector('.fp-care-card');
    if(careCard && !document.getElementById('fp-v0640-workload')){
      careCard.insertAdjacentHTML('beforeend', '<div id="fp-v0640-workload" class="fp-manager-workload"></div>');
    }
    const footer = modal?.querySelector('.modal-footer');
    if(footer && !document.getElementById('fp-print-summary-v0640')){
      const closeBtn = footer.querySelector('.btn-outline');
      (closeBtn || footer).insertAdjacentHTML(closeBtn ? 'afterend' : 'afterbegin', '<button id="fp-print-summary-v0640" type="button" class="btn btn-outline" onclick="printCurrentPlantingPlanSummary()">สรุป/พิมพ์แผน</button>');
    }
  }
  function renderModalTools(){
    ensureModalTools();
    const plan = currentPlanFromForm();
    const risks = planRisks(plan);
    const ready = inputReadiness(plan);
    const score = scoreFor(risks, ready);
    const box = document.getElementById('fp-v0640-manager-check');
    if(box){
      const cls = score < 65 ? 'danger' : score < 85 ? 'warn' : '';
      box.innerHTML = '<div class="fp-manager-check-head"><div><div class="fp-manager-check-title">ตรวจความพร้อมก่อนปลูก</div><div class="fp-manager-check-sub">ช่วยเช็กแปลงซ้อน ข้อมูลขาด และวัตถุดิบอินทรีย์ที่ต้องเตรียม</div></div><div class="fp-manager-score '+cls+'">'+score+'</div></div>' +
        renderItems(risks.concat(ready)) +
        '<div class="fp-manager-actions"><button type="button" class="btn btn-outline btn-sm" onclick="switchFarmPlanTab(\'inputs\')">ไปวัสดุปลูก</button><button type="button" class="btn btn-outline btn-sm" onclick="printCurrentPlantingPlanSummary()">สรุป/พิมพ์แผน</button></div>';
    }
    const w = workload(plan);
    const wk = document.getElementById('fp-v0640-workload');
    if(wk){
      wk.innerHTML = '<div><span>ระยะเวลาปลูก</span><b>'+w.duration+' วัน</b></div><div><span>งานดูแลทั้งหมด</span><b>'+w.total+' งาน</b></div><div><span>งาน 14 วันแรก</span><b>'+w.first14+' งาน</b></div>';
    }
  }
  function ensureOverviewTools(){
    const side = document.querySelector('#farm-plan-panel-planting .fp-overview-side');
    if(side && !document.getElementById('fp-v0640-overview')){
      side.insertAdjacentHTML('beforeend', '<div id="fp-v0640-overview" class="farm-plan-card fp-manager-side-card"></div>');
    }
  }
  function renderOverviewTools(){
    ensureOverviewTools();
    const plans = list('plantingPlans');
    const cards = [];
    plans.forEach(p=>{
      const danger = planRisks(p).filter(r=>r.kind === 'danger').length;
      if(danger) cards.push({kind:'danger', icon:'!', title:(p.cropName || p.id || 'แผนปลูก')+' ต้องตรวจแปลง', sub:(p.plot || '-')+' · '+fmt(p.startDate)+' - '+fmt(p.harvestDate), tag:danger+' จุด'});
    });
    const unsynced = plans.filter(p=>!list('calEvents').some(e=>e && e.source === 'planting-plan' && String(e.planId || '') === String(p.id || '')));
    unsynced.slice(0,3).forEach(p=>cards.push({kind:'warn', icon:'↻', title:(p.cropName || p.id || 'แผนปลูก')+' ยังไม่ซิงค์ปฏิทิน', sub:(p.plot || '-')+' · กดรายละเอียดหรือแก้ไขเพื่อซิงค์เฉพาะแผน', tag:'ปฏิทิน'}));
    const el = document.getElementById('fp-v0640-overview');
    if(el){
      el.innerHTML = '<div class="fp-manager-card-head"><div><div class="fp-manager-card-title">เช็กแผนก่อนลงงาน</div><div class="fp-manager-card-sub">สรุปความเสี่ยงที่ผู้จัดการฟาร์มควรจัดการก่อนสั่งงานทีม</div></div></div>' +
        (cards.length ? renderItems(cards.slice(0,5)) : '<div style="padding:14px;color:#758077;font-size:12px;">ยังไม่พบแผนที่ชนแปลงหรือยังไม่ซิงค์ปฏิทิน</div>');
    }
  }
  window.printCurrentPlantingPlanSummary = function(){
    const plan = currentPlanFromForm();
    const tasks = Array.isArray(plan.tasks) ? plan.tasks.slice().sort((a,b)=>String(a.date || '').localeCompare(String(b.date || ''))) : [];
    const risks = planRisks(plan).concat(inputReadiness(plan));
    const rows = tasks.map(t=>'<tr><td>'+esc(t.order || '')+'</td><td>'+esc(t.title || t.type || '')+'</td><td>'+fmt(t.date)+'</td><td>'+esc(t.note || '')+'</td></tr>').join('');
    const riskRows = risks.map(r=>'<li><b>'+esc(r.title)+'</b> - '+esc(r.sub || '')+'</li>').join('');
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>สรุปแผนปลูก '+esc(plan.cropName || '')+'</title><style>body{font-family:Arial,Tahoma,sans-serif;color:#172018;padding:28px;line-height:1.5}h1{font-size:24px;margin:0 0 6px}h2{font-size:16px;margin:22px 0 8px}.meta{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:16px}.meta div{border:1px solid #dfe8dc;border-radius:10px;padding:9px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #dfe8dc;padding:8px;text-align:left;font-size:12px}th{background:#f3faf0}ul{padding-left:20px}@media print{button{display:none}body{padding:0}}</style></head><body><button onclick="window.print()">พิมพ์</button><h1>สรุปแผนการปลูก '+esc(plan.cropName || '-')+'</h1><div>'+esc(plan.id || 'แผนใหม่')+' · '+esc(plan.plot || '-')+'</div><div class="meta"><div><b>เริ่มแผน</b><br>'+fmt(plan.startDate)+'</div><div><b>คาดเก็บเกี่ยว</b><br>'+fmt(plan.harvestDate)+'</div><div><b>จำนวน</b><br>'+esc(plan.quantity || '-')+' '+esc(plan.unit || '')+'</div><div><b>สถานะ</b><br>'+esc(plan.status || '-')+'</div></div><h2>รายการตรวจพร้อม</h2><ul>'+riskRows+'</ul><h2>งานดูแล</h2><table><thead><tr><th>#</th><th>กิจกรรม</th><th>วันที่</th><th>หมายเหตุ</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>';
    const win = window.open('', '_blank');
    if(!win){ if(typeof showToast === 'function') showToast('เบราว์เซอร์บล็อกหน้าพิมพ์'); return; }
    win.document.open(); win.document.write(html); win.document.close(); win.focus();
  };
  function refresh(){
    renderModalTools();
    renderOverviewTools();
  }
  const oldOpen = window.openPlantingPlanModal;
  if(typeof oldOpen === 'function' && !oldOpen.__v0640ManagerTools){
    const wrapped = function(){ const result = oldOpen.apply(this, arguments); setTimeout(refresh, 120); return result; };
    wrapped.__v0640ManagerTools = true;
    window.openPlantingPlanModal = wrapped;
  }
  const oldDraft = window.renderPlantingDraft;
  if(typeof oldDraft === 'function' && !oldDraft.__v0640ManagerTools){
    const wrapped = function(){ const result = oldDraft.apply(this, arguments); refresh(); return result; };
    wrapped.__v0640ManagerTools = true;
    window.renderPlantingDraft = wrapped;
  }
  const oldPlans = window.renderPlantingPlans;
  if(typeof oldPlans === 'function' && !oldPlans.__v0640ManagerTools){
    const wrapped = function(){ const result = oldPlans.apply(this, arguments); renderOverviewTools(); return result; };
    wrapped.__v0640ManagerTools = true;
    window.renderPlantingPlans = wrapped;
  }
  ['fp-type','fp-crop','fp-plot','fp-start','fp-qty','fp-unit','fp-status'].forEach(id=>{
    document.addEventListener('input', function(ev){ if(ev.target && ev.target.id === id) setTimeout(refresh, 80); });
    document.addEventListener('change', function(ev){ if(ev.target && ev.target.id === id) setTimeout(refresh, 80); });
  });
  try{
    const oldState = window._dashboardNotificationState || (typeof _dashboardNotificationState === 'function' ? _dashboardNotificationState : null);
    if(typeof oldState === 'function' && !oldState.__v0640ManagerTools){
      const wrapped = function(){
        const res = oldState.apply(this, arguments) || {alerts:[], updates:[]};
        const update = {icon:'📋', title:'V0.6.40 เครื่องมือผู้จัดการแผนปลูก', sub:'เพิ่มตรวจแปลงชน เช็กวัตถุดิบอินทรีย์ และสรุป/พิมพ์แผนปลูก', tag:'V0.6.40', page:'planning'};
        res.updates = [update].concat((res.updates || []).filter(function(u){ return u && u.tag !== 'V0.6.40'; })).slice(0,8);
        return res;
      };
      wrapped.__v0640ManagerTools = true;
      window._dashboardNotificationState = wrapped;
      try{ _dashboardNotificationState = wrapped; }catch(e){}
    }
  }catch(e){}
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      refresh();
      safe(function(){ document.title = document.title.replace(/V0\.6\.\d+/, VERSION); });
      safe(function(){ document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; }); });
      safe(function(){ document.querySelectorAll('.badge-text span:last-child').forEach(function(el){ if(/V0\.6\./.test(el.textContent || '')) el.textContent = VERSION; }); });
      safe(function(){ if(typeof renderDashboardNotifications === 'function') renderDashboardNotifications(); });
      console.log('✅ ' + VERSION + ' ' + PATCH_NAME + ' ready');
    }, 1650);
  });
})();
