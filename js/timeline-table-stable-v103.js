/* V1.0.3 JS split: Timeline Table Stable Fix.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION='V0.6.34';
  function safe(fn){try{return fn();}catch(e){console.warn(VERSION+' timeline stable warning',e);}}
  function esc(v){return String(v ?? '').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function parseDate(v){
    if(v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(),v.getMonth(),v.getDate());
    const s=String(v||'').trim();
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3]);
    m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m){let y=+m[3]; if(y>2400)y-=543; return new Date(y,+m[2]-1,+m[1]);}
    const d=new Date(s); if(!isNaN(d)) return new Date(d.getFullYear(),d.getMonth(),d.getDate());
    return new Date();
  }
  function iso(v){const d=parseDate(v);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function addDays(v,n){const d=parseDate(v);d.setDate(d.getDate()+Number(n||0));return d;}
  function shortDate(v){const d=parseDate(v);return d.getDate()+' '+['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][d.getMonth()]+' '+String(d.getFullYear()+543).slice(-2);}
  function getDraft(){try{return (typeof _fpDraft!=='undefined' && _fpDraft)?_fpDraft:null;}catch(e){return null;}}
  function taskList(draft){
    const list = Array.isArray(draft?.tasks)?draft.tasks:(Array.isArray(draft?.careTasks)?draft.careTasks:[]);
    return list.slice().filter(function(t){return t && (t.date || t.title || t.name || t.type);}).sort(function(a,b){return iso(a.date).localeCompare(iso(b.date)) || Number(a.order||0)-Number(b.order||0);});
  }
  function taskIcon(v){
    const t=String(v||'');
    if(/เพาะ|เมล็ด/.test(t)) return '🌱';
    if(/ย้าย|ปลูก/.test(t)) return '🌿';
    if(/ปุ๋ย/.test(t)) return '🧺';
    if(/น้ำหมัก|ชีวภาพ/.test(t)) return '🧪';
    if(/ไตรโค/.test(t)) return '💧';
    if(/บิวเวอ/.test(t)) return '🐞';
    if(/เก็บเกี่ยว/.test(t)) return '🧺';
    if(/ตรวจ|สำรวจ|ความชื้น/.test(t)) return '🔎';
    return '•';
  }
  function dotClass(v){
    const t=String(v||'');
    if(/เพาะ|เมล็ด/.test(t)) return 'fp-seed';
    if(/ย้าย|ปลูก/.test(t)) return 'fp-transplant';
    if(/ปุ๋ย/.test(t)) return 'fp-fertilizer';
    if(/น้ำหมัก|ชีวภาพ/.test(t)) return 'fp-ferment';
    if(/ไตรโค/.test(t)) return 'fp-tricho';
    if(/บิวเวอ/.test(t)) return 'fp-beau';
    if(/เก็บเกี่ยว/.test(t)) return 'fp-harvest';
    return 'fp-check';
  }
  function buildDates(draft,tasks){
    const set=new Set();
    if(draft?.startDate) set.add(iso(draft.startDate));
    tasks.forEach(function(t){if(t.date)set.add(iso(t.date));});
    if(draft?.transplantDate) set.add(iso(draft.transplantDate));
    if(draft?.harvestDate) set.add(iso(draft.harvestDate));
    let dates=Array.from(set).sort();
    if(dates.length<6){const base=dates[0] || iso(new Date());for(let i=1;dates.length<6 && i<=8;i++){set.add(iso(addDays(base,i*7)));dates=Array.from(set).sort();}}
    return dates;
  }
  window.renderPlantingTimeline=function(){
    safe(function(){
      const tl=document.getElementById('fp-timeline');
      if(!tl) return;
      const draft=getDraft();
      if(!draft){tl.innerHTML='<div class="fp-timeline-empty">กดคำนวณแผนการปลูก เพื่อแสดงไทม์ไลน์</div>';return;}
      const tasks=taskList(draft);
      if(!tasks.length){tl.innerHTML='<div class="fp-timeline-empty">ยังไม่มีงานดูแลในแผนนี้</div>';return;}
      const dates=buildDates(draft,tasks);
      const tableWidth=230+(dates.length*92);
      const head='<thead><tr><th class="fp-act-head">กิจกรรม</th>'+dates.map(function(d){return '<th class="fp-date-col">'+esc(shortDate(d))+'</th>';}).join('')+'</tr></thead>';
      const rows=tasks.map(function(t,i){
        const d=iso(t.date);
        const label=t.title || t.name || t.type || 'งานดูแล';
        const key=t.type || label;
        const no=t.order || (i+1);
        return '<tr><th class="fp-act-label" title="'+esc(label)+'">'+taskIcon(label+' '+key)+' '+esc(label)+'</th>'+dates.map(function(x){return '<td class="fp-date-col">'+(x===d?'<span class="fp-dot '+dotClass(label+' '+key)+'" title="'+esc(label+' · '+shortDate(d))+'">'+esc(no)+'</span>':'')+'</td>';}).join('')+'</tr>';
      }).join('');
      tl.innerHTML='<div class="fp-timeline-help">เลื่อนซ้าย-ขวาเพื่อดูวันที่ทั้งหมด และเลื่อนลงเพื่อดูทุกกิจกรรม</div><div class="fp-timeline-table-wrap"><table class="fp-timeline-table" style="min-width:'+tableWidth+'px">'+head+'<tbody>'+rows+'</tbody></table></div>';
    });
  };
  safe(function(){
    const oldCalc=window.calculatePlantingPlan;
    if(typeof oldCalc==='function' && !oldCalc.__v0632Wrapped){
      const wrapped=function(){const r=oldCalc.apply(this,arguments);setTimeout(function(){safe(window.renderPlantingTimeline);},80);return r;};
      wrapped.__v0632Wrapped=true;window.calculatePlantingPlan=wrapped;
    }
    const oldRender=window.renderPlantingDraft;
    if(typeof oldRender==='function' && !oldRender.__v0632Wrapped){
      const wrapped=function(){const r=oldRender.apply(this,arguments);setTimeout(function(){safe(window.renderPlantingTimeline);},60);return r;};
      wrapped.__v0632Wrapped=true;window.renderPlantingDraft=wrapped;
    }
    document.addEventListener('click',function(e){
      const text=(e.target && (e.target.textContent||'')) || '';
      if(/คำนวณแผนการปลูก|เพิ่มงานดูแล|แก้ไข|ลบ|บันทึกงานดูแล/.test(text)) setTimeout(function(){safe(window.renderPlantingTimeline);},120);
    },true);
    setTimeout(function(){safe(window.renderPlantingTimeline);},200);
    document.querySelectorAll('[class*="version"], .app-version, #app-version').forEach(function(el){ if(/V0\.6\./.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/V0\.6\.\d+/g,VERSION); });
  });
  console.log('✅ '+VERSION+' Timeline Table Stable Fix ready');
})();
