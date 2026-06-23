/* V1.0.3 Clean Language Samples Split
   Extracted from farm_management_V0_7_9_planning_flow_adapter_split.html.
   Keeps text cleanup and sample-data naming normalization outside the HTML while leaving core storage inline. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const replacements = [
    [/แผนทำปุ๋ย-น้ำหมัก-ชีวภัณฑ์/g, 'แผนผลิตวัสดุปลูก'],
    [/แผนปุ๋ย-น้ำหมัก-ชีวภัณฑ์/g, 'แผนผลิตวัสดุปลูก'],
    [/แผนปุ๋ย\/น้ำหมัก/g, 'วัสดุปลูก'],
    [/ไปแผนวัสดุปลูก/g, 'ไปวัสดุปลูก'],
    [/ปุ๋ย\/น้ำหมัก/g, 'วัสดุปลูก'],
    [/แผนวัสดุปลูก/g, 'แผนผลิตวัสดุปลูก'],
    [/เพิ่มรายการ/g, 'เพิ่มแผนผลิต'],
    [/Crop 1/g, 'รุ่นปลูก 1'],
    [/Crop A/g, 'รุ่นปลูก A'],
    [/\bCrop\b/g, 'รุ่นปลูก'],
    [/Local Only/g, 'บันทึกในเครื่อง'],
    [/localStorage/g, 'พื้นที่บันทึกในเครื่อง'],
    [/Mockup/g, 'ต้นแบบ'],
    [/mockup/g, 'ต้นแบบ'],
    [/Mocup/g, 'ต้นแบบ']
  ];
  const materialSamples = {
    'MAT-001': {
      oldNames:['ปุ๋ยหมักกองเล็ก','ปุ๋ยหมักไม่พลิกกลับกอง'],
      values:{name:'ปุ๋ยหมักใบไม้แปลงผัก', type:'ปุ๋ยหมัก', qty:'300 กก.', status:'กำลังผลิต', materials:'ใบไม้แห้ง, เศษพืช, มูลวัว, รำละเอียด', usage:'ปรับปรุงดินและรองพื้นแปลงผักใบ', note:'เช็กความชื้นและกลับกองทุก 7 วัน'}
    },
    'MAT-002': {
      oldNames:['น้ำหมักสมุนไพร'],
      values:{name:'น้ำหมักสมุนไพรป้องกันแมลง', type:'น้ำหมัก', qty:'100 ลิตร', status:'พร้อมใช้', materials:'ตะไคร้, ข่า, สะเดา, กากน้ำตาล', usage:'ฉีดพ่นช่วงเย็นเพื่อช่วยลดแมลงปากดูด', note:'กรองก่อนใช้และเจือจางตามความเหมาะสม'}
    },
    'MAT-003': {
      oldNames:['ไตรโคเดอร์ม่าเชื้อสด','ไตรโคเดอร์ม่า'],
      values:{name:'เชื้อไตรโคเดอร์ม่าพร้อมผสม', type:'ชีวภัณฑ์', qty:'50 กก.', status:'ใกล้พร้อมใช้', materials:'รำละเอียด, เชื้อไตรโคเดอร์ม่า, น้ำสะอาด', usage:'ผสมวัสดุปลูกหรือรองก้นหลุมเพื่อลดโรคดิน', note:'เก็บในที่ร่มและใช้ให้หมดหลังพร้อมใช้'}
    },
    'IN-001': {
      oldNames:['ปุ๋ยหมักไม่พลิกกลับกอง'],
      values:{name:'ปุ๋ยหมักใบไม้แปลงผัก', type:'ปุ๋ยหมัก', usage:'ใช้ปรับปรุงดินก่อนปลูก', note:'ข้อมูลตั้งต้นของระบบ'}
    },
    'IN-002': {
      oldNames:['น้ำหมักสมุนไพร'],
      values:{name:'น้ำหมักสมุนไพรป้องกันแมลง', type:'น้ำหมัก', usage:'ฉีดพ่นช่วยลดแมลงในแปลงผัก', note:'ข้อมูลตั้งต้นของระบบ'}
    },
    'IN-003': {
      oldNames:['ไตรโคเดอร์ม่า'],
      values:{name:'เชื้อไตรโคเดอร์ม่าพร้อมผสม', type:'ชีวภัณฑ์', usage:'ใช้กับวัสดุปลูกและรองก้นหลุม', note:'ข้อมูลตั้งต้นของระบบ'}
    }
  };
  function safe(fn, fallback){ try{ return fn(); }catch(e){ console.warn(VERSION, e); return fallback; } }
  function applyText(v){
    let out = String(v ?? '');
    replacements.forEach(function(pair){ out = out.replace(pair[0], pair[1]); });
    return out;
  }
  function shouldSkipNode(node){
    const parent = node && node.parentElement;
    return !parent || /^(SCRIPT|STYLE|TEXTAREA|INPUT|SELECT|OPTION)$/i.test(parent.tagName || '');
  }
  function cleanVisibleText(root){
    const scope = root || document.body;
    if(!scope) return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode:function(node){ return shouldSkipNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; }
    });
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(node){
      const next = applyText(node.nodeValue);
      if(next !== node.nodeValue) node.nodeValue = next;
    });
    scope.querySelectorAll('input[placeholder],textarea[placeholder],button[aria-label],[title]').forEach(function(el){
      ['placeholder','aria-label','title'].forEach(function(attr){
        if(!el.hasAttribute(attr)) return;
        const next = applyText(el.getAttribute(attr));
        if(next !== el.getAttribute(attr)) el.setAttribute(attr, next);
      });
    });
  }
  function arrayRef(name){
    return safe(function(){
      if(name === 'farmInputPlans'){ if(!Array.isArray(farmInputPlans)) farmInputPlans = []; return farmInputPlans; }
      if(name === 'invItems'){ if(!Array.isArray(invItems)) invItems = []; return invItems; }
      if(name === 'custItems'){ if(!Array.isArray(custItems)) custItems = []; return custItems; }
      if(name === 'salesData'){ if(!Array.isArray(salesData)) salesData = []; return salesData; }
      if(name === 'calEvents'){ if(!Array.isArray(calEvents)) calEvents = []; return calEvents; }
      if(name === 'cropItems'){ if(!Array.isArray(cropItems)) cropItems = []; return cropItems; }
      return [];
    }, []);
  }
  function updateKnownMaterial(item){
    if(!item || typeof item !== 'object') return false;
    const rule = materialSamples[String(item.id || '')];
    if(!rule) return false;
    const name = String(item.name || '');
    const isOldSample = rule.oldNames.includes(name);
    const untouchedSeed = !item.createdAt && !item.updatedAt;
    if(!isOldSample && !untouchedSeed) return false;
    Object.keys(rule.values).forEach(function(key){
      if(key === 'note' && item.note && !isOldSample) return;
      item[key] = rule.values[key];
    });
    item.systemSample = true;
    return true;
  }
  function normalizeKnownSamples(){
    let changed = false;
    arrayRef('farmInputPlans').forEach(function(item){ if(updateKnownMaterial(item)) changed = true; });
    arrayRef('invItems').forEach(function(item){
      if(!item || typeof item !== 'object') return;
      if(item.name === 'ปุ๋ยหมักอินทรีย์'){ item.name = 'ปุ๋ยหมักพร้อมใช้'; item.cat = 'วัสดุปลูก'; changed = true; }
      if(item.name === 'น้ำส้มควันไม้'){ item.name = 'สารสกัดควันไม้'; item.cat = 'สารสกัดพืช'; changed = true; }
      if(item.name === 'เมล็ดพันธุ์ผักคะน้า'){ item.name = 'เมล็ดพันธุ์คะน้าอินทรีย์'; changed = true; }
      if(item.lot === 'Crop 1') { item.lot = 'รุ่นปลูก 1'; changed = true; }
      if(item.lot === 'Crop A') { item.lot = 'รุ่นปลูก A'; changed = true; }
    });
    arrayRef('custItems').forEach(function(item){
      if(item && item.name === 'ออนไลน์ Facebook'){ item.name = 'ลูกค้าออนไลน์'; changed = true; }
      if(item && item.contact === '@FarmSeeKhiao'){ item.contact = '@TongOrganicFarm'; changed = true; }
    });
    arrayRef('salesData').forEach(function(item){
      if(item && item.customer === 'ออนไลน์ Facebook'){ item.customer = 'ลูกค้าออนไลน์'; changed = true; }
    });
    arrayRef('calEvents').forEach(function(ev){
      if(!ev || typeof ev !== 'object') return;
      if(ev.title === 'สั่งซื้อปุ๋ยใหม่'){ ev.title = 'ตรวจแผนผลิตวัสดุปลูก'; ev.cat = 'วัสดุปลูก'; ev.note = 'เช็กปริมาณปุ๋ยหมักพร้อมใช้'; changed = true; }
      ev.title = applyText(ev.title);
      ev.note = applyText(ev.note);
    });
    arrayRef('cropItems').forEach(function(item){
      if(item && item.lot === 'Crop 1'){ item.lot = 'รุ่นปลูก 1'; changed = true; }
    });
    if(changed){
      safe(function(){ if(!farmSettings || typeof farmSettings !== 'object') farmSettings = {}; farmSettings.languageCleanedVersion = VERSION; });
      safe(function(){ if(typeof saveData === 'function') saveData(); });
    }
  }
  function cleanPlanningLabels(){
    safe(function(){
      const title = document.querySelector('#farm-plan-panel-inputs .farm-plan-card-head h3');
      if(title) title.textContent = 'แผนผลิตวัสดุปลูก';
      const tab = document.getElementById('farm-plan-tab-inputs');
      if(tab) tab.textContent = 'วัสดุปลูก';
      const btns = document.querySelectorAll('#page-planning button');
      btns.forEach(function(btn){ btn.textContent = applyText(btn.textContent); });
    });
  }
  function refreshCleanUI(){
    normalizeKnownSamples();
    cleanPlanningLabels();
    cleanVisibleText(document.body);
    safe(function(){
      document.title = document.title.replace(/V0\.6\.\d+/, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; });
      document.querySelectorAll('.badge-text span:last-child').forEach(function(el){ if(/V0\.6\./.test(el.textContent || '')) el.textContent = VERSION; });
    });
  }
  ['renderDashboard','renderInv','renderCalendar','renderFarmInputPlans','renderPlantingPlans','renderFarmPlanning','renderSettings','renderDashboardNotifications'].forEach(function(name){
    const oldFn = window[name];
    if(typeof oldFn === 'function' && !oldFn.__v0647CleanLanguage){
      const wrapped = function(){
        const result = oldFn.apply(this, arguments);
        safe(refreshCleanUI);
        return result;
      };
      wrapped.__v0647CleanLanguage = true;
      window[name] = wrapped;
      safe(function(){
        if(name === 'renderDashboard') renderDashboard = wrapped;
        if(name === 'renderInv') renderInv = wrapped;
        if(name === 'renderCalendar') renderCalendar = wrapped;
        if(name === 'renderFarmInputPlans') renderFarmInputPlans = wrapped;
        if(name === 'renderPlantingPlans') renderPlantingPlans = wrapped;
        if(name === 'renderFarmPlanning') renderFarmPlanning = wrapped;
      });
    }
  });
  const oldNavigate = window.navigate;
  if(typeof oldNavigate === 'function' && !oldNavigate.__v0647CleanLanguage){
    const wrappedNavigate = function(){
      const result = oldNavigate.apply(this, arguments);
      setTimeout(function(){ safe(refreshCleanUI); }, 120);
      return result;
    };
    wrappedNavigate.__v0647CleanLanguage = true;
    window.navigate = wrappedNavigate;
  }
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      refreshCleanUI();
      console.log(VERSION + ' clean language and sample data ready');
    }, 3200);
  });
  if(document.readyState !== 'loading') setTimeout(refreshCleanUI, 3200);
})();
