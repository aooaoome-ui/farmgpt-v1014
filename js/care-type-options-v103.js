/* V1.0.3 JS split: Care Task Type Options Sync.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';

  const CARE_TASK_GROUPS = [
    { label:'🌱 ปลูกและดูแลพืช', items:[
      'เตรียมดิน',
      'เพาะเมล็ด / เพาะกล้า',
      'ตรวจการงอก / ความชื้นวัสดุเพาะ',
      'ย้ายปลูก',
      'ปลูกซ่อม',
      'รดน้ำ',
      'พรวนดิน / ไถดิน',
      'คลุมดิน (Mulching)',
      'ปักไม้ค้ำ / ทำค้าง',
      'ตัดแต่งกิ่ง / ใบ'
    ]},
    { label:'🌿 ปุ๋ย ดิน และน้ำหมัก', items:[
      'ใส่ปุ๋ยหมัก',
      'ใส่มูลสัตว์หมัก',
      'ใส่น้ำหมักชีวภาพ',
      'ใส่ปุ๋ยน้ำชีวภาพ',
      'ใส่ปุ๋ยอินทรีย์เม็ด',
      'ปรับปรุงดิน',
      'ตรวจค่า pH ดิน'
    ]},
    { label:'🦠 ชีวภัณฑ์และศัตรูพืช', items:[
      'ใช้เชื้อไตรโคเดอร์ม่า',
      'ใช้เชื้อบิวเวอเรีย',
      'ฉีดพ่นน้ำส้มควันไม้',
      'ฉีดพ่นสารสกัดพืช',
      'ติดกับดักแมลง',
      'สำรวจศัตรูพืช',
      'ตรวจโรคพืช',
      'กำจัดวัชพืช'
    ]},
    { label:'💧 ระบบน้ำและงานตรวจแปลง', items:[
      'ตรวจระบบน้ำ',
      'ติดตั้ง / ซ่อมระบบน้ำ',
      'ตรวจสอบความชื้นดิน',
      'ตรวจแปลง',
      'ถ่ายรูปหลักฐาน',
      'บันทึกผล / ประเมิน'
    ]},
    { label:'🌾 เก็บเกี่ยวและหลังเก็บเกี่ยว', items:[
      'เก็บเกี่ยว',
      'คัดแยก',
      'ชั่งน้ำหนัก',
      'คัดแยก / บรรจุภัณฑ์',
      'ขนส่ง / ส่งมอบ'
    ]},
    { label:'อื่นๆ', items:['อื่นๆ'] }
  ];

  const TYPE_ALIAS = {
    'เพาะเมล็ด':'เพาะเมล็ด / เพาะกล้า',
    'เพาะกล้า':'เพาะเมล็ด / เพาะกล้า',
    'ตรวจการงอก':'ตรวจการงอก / ความชื้นวัสดุเพาะ',
    'ใส่ปุ๋ย':'ใส่ปุ๋ยหมัก',
    'น้ำหมัก':'ใส่น้ำหมักชีวภาพ',
    'ไตรโคเดอร์ม่า':'ใช้เชื้อไตรโคเดอร์ม่า',
    'ไตรโคเดอร์มา':'ใช้เชื้อไตรโคเดอร์ม่า',
    'บิวเวอเรีย':'ใช้เชื้อบิวเวอเรีย'
  };

  const DEFAULT_TITLE = {
    'เตรียมดิน':'เตรียมดิน',
    'เพาะเมล็ด / เพาะกล้า':'เพาะเมล็ด / เพาะกล้า',
    'ตรวจการงอก / ความชื้นวัสดุเพาะ':'ตรวจการงอก / ความชื้นวัสดุเพาะ',
    'ย้ายปลูก':'ย้ายปลูก',
    'ปลูกซ่อม':'ปลูกซ่อม',
    'รดน้ำ':'รดน้ำ',
    'พรวนดิน / ไถดิน':'พรวนดิน / ไถดิน',
    'คลุมดิน (Mulching)':'คลุมดิน',
    'ปักไม้ค้ำ / ทำค้าง':'ปักไม้ค้ำ / ทำค้าง',
    'ตัดแต่งกิ่ง / ใบ':'ตัดแต่งกิ่ง / ใบ',
    'ใส่ปุ๋ยหมัก':'ใส่ปุ๋ยหมัก',
    'ใส่มูลสัตว์หมัก':'ใส่มูลสัตว์หมัก',
    'ใส่น้ำหมักชีวภาพ':'ใส่น้ำหมักชีวภาพ',
    'ใส่ปุ๋ยน้ำชีวภาพ':'ใส่ปุ๋ยน้ำชีวภาพ',
    'ใส่ปุ๋ยอินทรีย์เม็ด':'ใส่ปุ๋ยอินทรีย์เม็ด',
    'ปรับปรุงดิน':'ปรับปรุงดิน',
    'ตรวจค่า pH ดิน':'ตรวจค่า pH ดิน',
    'ใช้เชื้อไตรโคเดอร์ม่า':'ใช้เชื้อไตรโคเดอร์ม่า',
    'ใช้เชื้อบิวเวอเรีย':'ใช้เชื้อบิวเวอเรีย',
    'ฉีดพ่นน้ำส้มควันไม้':'ฉีดพ่นน้ำส้มควันไม้',
    'ฉีดพ่นสารสกัดพืช':'ฉีดพ่นสารสกัดพืช',
    'ติดกับดักแมลง':'ติดกับดักแมลง',
    'สำรวจศัตรูพืช':'สำรวจศัตรูพืช',
    'ตรวจโรคพืช':'ตรวจโรคพืช',
    'กำจัดวัชพืช':'กำจัดวัชพืช',
    'ตรวจระบบน้ำ':'ตรวจระบบน้ำ',
    'ติดตั้ง / ซ่อมระบบน้ำ':'ติดตั้ง / ซ่อมระบบน้ำ',
    'ตรวจสอบความชื้นดิน':'ตรวจสอบความชื้นดิน',
    'ตรวจแปลง':'ตรวจแปลง',
    'ถ่ายรูปหลักฐาน':'ถ่ายรูปหลักฐาน',
    'บันทึกผล / ประเมิน':'บันทึกผล / ประเมิน',
    'เก็บเกี่ยว':'เก็บเกี่ยว',
    'คัดแยก':'คัดแยก',
    'ชั่งน้ำหนัก':'ชั่งน้ำหนัก',
    'คัดแยก / บรรจุภัณฑ์':'คัดแยก / บรรจุภัณฑ์',
    'ขนส่ง / ส่งมอบ':'ขนส่ง / ส่งมอบ'
  };

  const ICON_MAP = {
    'เตรียมดิน':'🧱',
    'เพาะเมล็ด / เพาะกล้า':'🌱',
    'ตรวจการงอก / ความชื้นวัสดุเพาะ':'🔎',
    'ย้ายปลูก':'🌿',
    'ปลูกซ่อม':'🌱',
    'รดน้ำ':'💧',
    'พรวนดิน / ไถดิน':'🧑‍🌾',
    'คลุมดิน (Mulching)':'🍂',
    'ปักไม้ค้ำ / ทำค้าง':'🪵',
    'ตัดแต่งกิ่ง / ใบ':'✂️',
    'ใส่ปุ๋ยหมัก':'🧺',
    'ใส่มูลสัตว์หมัก':'🧺',
    'ใส่น้ำหมักชีวภาพ':'🧪',
    'ใส่ปุ๋ยน้ำชีวภาพ':'🧪',
    'ใส่ปุ๋ยอินทรีย์เม็ด':'🧺',
    'ปรับปรุงดิน':'🧱',
    'ตรวจค่า pH ดิน':'🧪',
    'ใช้เชื้อไตรโคเดอร์ม่า':'⚗️',
    'ใช้เชื้อบิวเวอเรีย':'🐞',
    'ฉีดพ่นน้ำส้มควันไม้':'🌫️',
    'ฉีดพ่นสารสกัดพืช':'🌿',
    'ติดกับดักแมลง':'🪤',
    'สำรวจศัตรูพืช':'🔎',
    'ตรวจโรคพืช':'🩺',
    'กำจัดวัชพืช':'🌾',
    'ตรวจระบบน้ำ':'💧',
    'ติดตั้ง / ซ่อมระบบน้ำ':'🔧',
    'ตรวจสอบความชื้นดิน':'💧',
    'ตรวจแปลง':'📋',
    'ถ่ายรูปหลักฐาน':'📷',
    'บันทึกผล / ประเมิน':'📝',
    'เก็บเกี่ยว':'🧺',
    'คัดแยก':'📦',
    'ชั่งน้ำหนัก':'⚖️',
    'คัดแยก / บรรจุภัณฑ์':'📦',
    'ขนส่ง / ส่งมอบ':'🚚',
    'อื่นๆ':'•'
  };

  const CLASS_MAP = {
    'เพาะเมล็ด / เพาะกล้า':'fp-seed',
    'ตรวจการงอก / ความชื้นวัสดุเพาะ':'fp-seed',
    'ย้ายปลูก':'fp-transplant',
    'ปลูกซ่อม':'fp-transplant',
    'ใส่ปุ๋ยหมัก':'fp-fertilizer',
    'ใส่มูลสัตว์หมัก':'fp-fertilizer',
    'ใส่ปุ๋ยอินทรีย์เม็ด':'fp-fertilizer',
    'ใส่น้ำหมักชีวภาพ':'fp-ferment',
    'ใส่ปุ๋ยน้ำชีวภาพ':'fp-ferment',
    'ใช้เชื้อไตรโคเดอร์ม่า':'fp-tricho',
    'ใช้เชื้อบิวเวอเรีย':'fp-beau',
    'เก็บเกี่ยว':'fp-harvest',
    'คัดแยก':'fp-harvest',
    'ชั่งน้ำหนัก':'fp-harvest',
    'คัดแยก / บรรจุภัณฑ์':'fp-harvest',
    'ขนส่ง / ส่งมอบ':'fp-harvest'
  };

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function allTypes(){
    return CARE_TASK_GROUPS.reduce(function(acc,g){ return acc.concat(g.items); }, []);
  }
  function normalizeType(type, title){
    const raw = String(type || '').trim();
    const text = (raw + ' ' + String(title || '')).trim();
    if(TYPE_ALIAS[raw]) return TYPE_ALIAS[raw];
    if(/ไตรโค/.test(text)) return 'ใช้เชื้อไตรโคเดอร์ม่า';
    if(/บิวเวอ/.test(text)) return 'ใช้เชื้อบิวเวอเรีย';
    if(/น้ำหมัก/.test(text)) return 'ใส่น้ำหมักชีวภาพ';
    if(/ปุ๋ย/.test(text) && !/น้ำ/.test(text)) return 'ใส่ปุ๋ยหมัก';
    if(/เพาะ/.test(text)) return 'เพาะเมล็ด / เพาะกล้า';
    if(/งอก|ความชื้น/.test(text)) return 'ตรวจการงอก / ความชื้นวัสดุเพาะ';
    return raw || 'ใส่น้ำหมักชีวภาพ';
  }
  function getDraft(){
    try{ return (typeof _fpDraft !== 'undefined') ? _fpDraft : (window._fpDraft || null); }
    catch(e){ return window._fpDraft || null; }
  }
  function normalizeDraftTaskTypes(){
    const d = getDraft();
    if(!d || !Array.isArray(d.tasks)) return;
    d.tasks.forEach(function(t){
      if(!t || typeof t !== 'object') return;
      t.type = normalizeType(t.type, t.title);
    });
  }
  function buildOptions(value){
    const types = allTypes();
    const wanted = normalizeType(value);
    let html = CARE_TASK_GROUPS.map(function(group){
      return '<optgroup label="' + esc(group.label) + '">' + group.items.map(function(item){
        return '<option value="' + esc(item) + '">' + esc(item) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
    if(wanted && !types.includes(wanted)){
      html += '<optgroup label="รายการเดิม"><option value="' + esc(wanted) + '">' + esc(wanted) + '</option></optgroup>';
    }
    return { html: html, value: wanted };
  }
  function populateCareTaskTypeSelect(preferred){
    const sel = document.getElementById('fp-care-type');
    if(!sel) return;
    const current = preferred || sel.value || sel.getAttribute('data-last-type') || 'ใส่น้ำหมักชีวภาพ';
    const opts = buildOptions(current);
    sel.innerHTML = opts.html;
    sel.value = opts.value;
    sel.setAttribute('data-last-type', opts.value);
    if(!sel.__careTypeSyncV0624){
      sel.__careTypeSyncV0624 = true;
      sel.addEventListener('change', function(){
        const val = normalizeType(sel.value);
        sel.value = val;
        sel.setAttribute('data-last-type', val);
        const title = document.getElementById('fp-care-title');
        if(title){
          const old = title.value.trim();
          const defaults = Object.values(DEFAULT_TITLE);
          if(!old || defaults.includes(old)) title.value = DEFAULT_TITLE[val] || val;
        }
      });
    }
    if(!document.getElementById('fp-care-type-hint')){
      const hint = document.createElement('div');
      hint.id = 'fp-care-type-hint';
      hint.className = 'fp-care-type-hint';
      hint.textContent = 'ประเภทงานอิงจาก “บันทึกกิจกรรม” เฉพาะงานดูแลแปลง';
      sel.insertAdjacentElement('afterend', hint);
    }
  }
  function findTaskByRef(ref){
    const d = getDraft();
    const tasks = d && Array.isArray(d.tasks) ? d.tasks : [];
    if(typeof ref === 'number') return tasks[ref] || null;
    const s = String(ref ?? '').trim();
    if(!s) return null;
    let item = tasks.find(function(t){ return String(t && t.id) === s; });
    if(item) return item;
    if(/^\d+$/.test(s)) return tasks[Number(s)] || null;
    return null;
  }

  const oldTaskIcon = window._fpTaskIcon;
  window._fpTaskIcon = function(type){
    const t = normalizeType(type);
    return ICON_MAP[t] || (typeof oldTaskIcon === 'function' ? oldTaskIcon(type) : '•');
  };
  const oldTaskClass = window._fpTaskClass;
  window._fpTaskClass = function(type){
    const t = normalizeType(type);
    return CLASS_MAP[t] || (typeof oldTaskClass === 'function' ? oldTaskClass(type) : 'fp-seed');
  };

  const oldCalculate = window.calculatePlantingPlan;
  if(typeof oldCalculate === 'function' && !oldCalculate.__careTypeSyncV0624){
    const wrappedCalculate = function(){
      const result = oldCalculate.apply(this, arguments);
      try{ normalizeDraftTaskTypes(); populateCareTaskTypeSelect(); }catch(e){ console.warn(VERSION, 'calculate type sync warning', e); }
      return result;
    };
    wrappedCalculate.__careTypeSyncV0624 = true;
    window.calculatePlantingPlan = wrappedCalculate;
  }

  const oldRenderDraft = window.renderPlantingDraft;
  if(typeof oldRenderDraft === 'function' && !oldRenderDraft.__careTypeSyncV0624){
    const wrappedRender = function(){
      try{ normalizeDraftTaskTypes(); }catch(e){}
      const result = oldRenderDraft.apply(this, arguments);
      try{ populateCareTaskTypeSelect(); }catch(e){}
      return result;
    };
    wrappedRender.__careTypeSyncV0624 = true;
    window.renderPlantingDraft = wrappedRender;
  }

  const oldOpenCare = window.openCareTaskEditor;
  if(typeof oldOpenCare === 'function' && !oldOpenCare.__careTypeSyncV0624){
    const wrappedOpenCare = function(ref){
      try{ normalizeDraftTaskTypes(); }catch(e){}
      const task = findTaskByRef(ref);
      const preferred = normalizeType(task && task.type, task && task.title);
      const result = oldOpenCare.apply(this, arguments);
      setTimeout(function(){
        try{
          populateCareTaskTypeSelect(preferred);
          const title = document.getElementById('fp-care-title');
          const type = document.getElementById('fp-care-type')?.value || preferred;
          if(title && !title.value.trim()) title.value = DEFAULT_TITLE[type] || type || '';
        }catch(e){ console.warn(VERSION, 'open care type sync warning', e); }
      }, 0);
      return result;
    };
    wrappedOpenCare.__careTypeSyncV0624 = true;
    window.openCareTaskEditor = wrappedOpenCare;
  }

  const oldSaveCare = window.saveCareTaskEditor;
  if(typeof oldSaveCare === 'function' && !oldSaveCare.__careTypeSyncV0624){
    const wrappedSaveCare = function(){
      const sel = document.getElementById('fp-care-type');
      if(sel) sel.value = normalizeType(sel.value, document.getElementById('fp-care-title')?.value || '');
      const result = oldSaveCare.apply(this, arguments);
      try{ normalizeDraftTaskTypes(); if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft(); }catch(e){}
      return result;
    };
    wrappedSaveCare.__careTypeSyncV0624 = true;
    window.saveCareTaskEditor = wrappedSaveCare;
  }

  window.farmCareTaskTypeOptionsV0624 = {
    version: VERSION,
    groups: CARE_TASK_GROUPS,
    normalizeType: normalizeType,
    populate: populateCareTaskTypeSelect
  };

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      try{
        normalizeDraftTaskTypes();
        populateCareTaskTypeSelect();
        if(typeof window.renderPlantingDraft === 'function') window.renderPlantingDraft();
      }catch(e){ console.warn(VERSION, 'init type sync warning', e); }
      console.log('✅ ' + VERSION + ' Care Task Type Options Sync ready');
    }, 420);
  });
})();
