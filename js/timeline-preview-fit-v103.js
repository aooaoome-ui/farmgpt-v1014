/* V1.0.3 JS split: Timeline Preview Fit Fix.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  const VERSION='V0.6.34';
  function run(fn){try{fn();}catch(e){console.warn('V0.6.34 timeline fix warning',e);}}
  function html(v){return String(v ?? '').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function parseDate(v){
    if(v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(),v.getMonth(),v.getDate());
    const s=String(v||'').trim();
    let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m) return new Date(+m[1],+m[2]-1,+m[3]);
    m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m){ let y=+m[3]; if(y>2400)y-=543; return new Date(y,+m[2]-1,+m[1]); }
    const d=new Date(s); if(!isNaN(d)) return new Date(d.getFullYear(),d.getMonth(),d.getDate());
    return new Date();
  }
  function iso(d){const x=parseDate(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');}
  function add(d,n){const x=parseDate(d); x.setDate(x.getDate()+Number(n||0)); return x;}
  function shortDate(v){const d=parseDate(v); const th=d.getFullYear()+543; return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(th).slice(-2);}
  function icon(type){const t=String(type||''); if(/เพาะ|เมล็ด/.test(t)) return '🌱'; if(/ย้าย|ปลูก/.test(t)) return '🌿'; if(/ปุ๋ย/.test(t)) return '🧺'; if(/น้ำหมัก|ชีวภาพ/.test(t)) return '🧪'; if(/ไตรโค/.test(t)) return '💧'; if(/บิวเวอ/.test(t)) return '🐞'; if(/เก็บเกี่ยว/.test(t)) return '🧺'; if(/ตรวจ|สำรวจ|ความชื้น/.test(t)) return '🔎'; return '•';}
  function dotClass(type){const t=String(type||''); if(/เพาะ|เมล็ด/.test(t)) return 'fp-seed'; if(/ย้าย|ปลูก/.test(t)) return 'fp-transplant'; if(/ปุ๋ย/.test(t)) return 'fp-fertilizer'; if(/น้ำหมัก|ชีวภาพ/.test(t)) return 'fp-ferment'; if(/ไตรโค/.test(t)) return 'fp-tricho'; if(/บิวเวอ/.test(t)) return 'fp-beau'; if(/เก็บเกี่ยว/.test(t)) return 'fp-harvest'; return 'fp-seed';}
  run(function(){
    window.renderPlantingTimeline=function(){
      const tl=document.getElementById('fp-timeline');
      if(!tl) return;
      if(typeof _fpDraft==='undefined' || !_fpDraft){tl.innerHTML='<div class="fp-timeline-empty">กดคำนวณแผนการปลูก เพื่อแสดงไทม์ไลน์</div>';return;}
      const tasks=Array.isArray(_fpDraft.tasks)?_fpDraft.tasks.slice():[];
      tasks.sort(function(a,b){return iso(a.date).localeCompare(iso(b.date)) || Number(a.order||0)-Number(b.order||0);});
      if(!tasks.length){tl.innerHTML='<div class="fp-timeline-empty">ยังไม่มีงานดูแลในแผนนี้</div>';return;}
      const dateSet=new Set();
      if(_fpDraft.startDate) dateSet.add(iso(_fpDraft.startDate));
      tasks.forEach(function(t){ if(t.date) dateSet.add(iso(t.date)); });
      if(_fpDraft.harvestDate) dateSet.add(iso(_fpDraft.harvestDate));
      let marks=Array.from(dateSet).sort();
      if(marks.length<6){const base=_fpDraft.startDate || marks[0] || new Date(); for(let i=1; marks.length<6 && i<=6; i++) dateSet.add(iso(add(base,i*7))); marks=Array.from(dateSet).sort();}
      const labelWidth=190, colWidth=92;
      const columns=labelWidth+'px repeat('+marks.length+', '+colWidth+'px)';
      const gridWidth=Math.max(labelWidth+(marks.length*colWidth), 760);
      const head='<div class="fp-time-row fp-time-head" style="grid-template-columns:'+columns+'"><div class="fp-time-label">กิจกรรม</div>'+marks.map(function(d){return '<div class="fp-time-cell fp-time-date">'+html(shortDate(d))+'</div>';}).join('')+'</div>';
      const rows=tasks.map(function(t,i){const date=iso(t.date); const label=t.title || t.name || t.type || 'งานดูแล'; const num=t.order || (i+1); return '<div class="fp-time-row" style="grid-template-columns:'+columns+'"><div class="fp-time-label" title="'+html(label)+'">'+icon(t.type||label)+' '+html(label)+'</div>'+marks.map(function(d){return '<div class="fp-time-cell">'+(d===date?'<span class="fp-dot '+dotClass(t.type||label)+'" title="'+html(label+' · '+shortDate(date))+'">'+html(num)+'</span>':'')+'</div>';}).join('')+'</div>';}).join('');
      tl.innerHTML='<div class="fp-timeline-note">เลื่อนซ้าย-ขวาเพื่อดูวันที่ของกิจกรรมทั้งหมด</div><div class="fp-timeline-scroll"><div class="fp-timeline-grid" style="min-width:'+gridWidth+'px">'+head+rows+'</div></div>';
    };
  });
  run(function(){const rerender=function(){ if(typeof window.renderPlantingTimeline==='function') window.renderPlantingTimeline(); }; if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',rerender,{once:true}); else rerender(); document.querySelectorAll('[class*="version"], .app-version, #app-version').forEach(function(el){ if(/V0\.6\./.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/V0\.6\.\d+/g,VERSION); });});
  console.log('✅ '+VERSION+' Timeline Preview Fit Fix ready');
})();
