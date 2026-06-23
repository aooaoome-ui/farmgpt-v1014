(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  let editingIndex = -1;

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function materialList(){ try{ if(!Array.isArray(farmInputPlans)) farmInputPlans = []; return farmInputPlans; }catch(e){ return []; } }
  function defaultRuleFor(item){
    const text = String((item && item.type) || '') + ' ' + String((item && item.name) || '') + ' ' + String((item && item.note) || '');
    if(/น้ำหมัก|สารสกัด/.test(text)) return {id:'stir-vent', title:'คนน้ำหมัก/ระบายแก๊ส', intervalDays:7, note:'เปิดฝาระบายแก๊ส ตรวจกลิ่น และคนให้เข้ากัน', active:true};
    if(/วัสดุเพาะ|วัสดุปลูก/.test(text)) return {id:'water-hole', title:'เจาะรู/รดน้ำวัสดุปลูก', intervalDays:10, note:'ตรวจความชื้น เจาะรูระบายน้ำ และรดน้ำตามสภาพวัสดุ', active:true};
    if(/ชีวภัณฑ์|ไตรโค|บิวเวอ/.test(text)) return {id:'inspect-bio', title:'ตรวจชีวภัณฑ์', intervalDays:5, note:'ตรวจกลิ่น สี ความชื้น และเก็บในที่ร่ม', active:true};
    return {id:'turn-pile', title:'กลับกองปุ๋ยหมัก', intervalDays:7, note:'ตรวจความชื้นและกลับกองให้ระบายอากาศสม่ำเสมอ', active:true};
  }
  function ensureRules(item){
    if(!item || typeof item !== 'object') return;
    if(!Array.isArray(item.actionRules) || !item.actionRules.length) item.actionRules = [defaultRuleFor(item)];
    if(!Array.isArray(item.actionLogs)) item.actionLogs = [];
    item.actionRules.forEach((rule, idx) => {
      rule.id = rule.id || ('rule-' + Date.now() + '-' + idx);
      rule.title = rule.title || 'งานดูแลวัสดุ';
      rule.intervalDays = Math.max(1, Number(rule.intervalDays || 7));
      rule.note = rule.note || '';
      rule.active = rule.active !== false;
    });
  }
  function ensureModal(){
    if(document.getElementById('modal-material-action-rules')) return;
    document.body.insertAdjacentHTML('beforeend',
      '<div id="modal-material-action-rules" class="mat-rule-backdrop" onclick="if(event.target===this) closeMaterialActionRules()">'+
        '<div class="mat-rule-card" onclick="event.stopPropagation()">'+
          '<div class="mat-rule-head"><div><div id="mat-rule-title" class="mat-rule-title">ตั้งรอบงานวัสดุปลูก</div><div id="mat-rule-sub" class="mat-rule-sub">กำหนด action ที่ต้องแจ้งเตือนและให้กดทำแล้ว/เลื่อน/ไม่ทำ</div></div><button type="button" class="mat-rule-close" onclick="closeMaterialActionRules()">×</button></div>'+
          '<div class="mat-rule-body"><div class="mat-rule-toolbar"><div class="mat-rule-hint">แต่ละสูตรตั้งรอบไม่เหมือนกันได้ เช่น กลับกองทุก 7 วัน หรือเจาะรูรดน้ำทุก 10 วัน</div><button type="button" class="btn btn-outline btn-sm" onclick="addMaterialActionRule()">+ เพิ่ม action</button></div><div id="mat-rule-list" class="mat-rule-list"></div></div>'+
          '<div class="mat-rule-footer"><div class="mat-rule-footer-left"><button type="button" class="btn btn-outline btn-sm" onclick="resetMaterialActionRules()">ใช้ค่าแนะนำ</button></div><div class="mat-rule-footer-right"><button type="button" class="btn btn-outline" onclick="closeMaterialActionRules()">ยกเลิก</button><button type="button" class="btn btn-primary" onclick="saveMaterialActionRules()">บันทึกรอบงาน</button></div></div>'+
        '</div>'+
      '</div>');
  }
  function renderRuleRows(){
    const item = materialList()[editingIndex];
    const box = document.getElementById('mat-rule-list');
    if(!box || !item) return;
    ensureRules(item);
    if(!item.actionRules.length){
      box.innerHTML = '<div class="mat-rule-empty">ยังไม่มี action สำหรับสูตรนี้ กด “เพิ่ม action” เพื่อเริ่มตั้งรอบงาน</div>';
      return;
    }
    box.innerHTML = item.actionRules.map((rule, idx) => (
      '<div class="mat-rule-row" data-rule-index="'+idx+'">'+
        '<div class="mat-rule-field"><label>ชื่อ action</label><input data-field="title" value="'+esc(rule.title || '')+'" placeholder="เช่น กลับกองปุ๋ยหมัก"></div>'+
        '<div class="mat-rule-field"><label>ทำซ้ำทุกกี่วัน</label><input data-field="intervalDays" type="number" min="1" step="1" value="'+esc(rule.intervalDays || 7)+'"></div>'+
        '<div class="mat-rule-field"><label>ข้อความบันทึก/หมายเหตุ</label><textarea data-field="note" placeholder="เนื้อหาหลักที่จะลงบันทึกกิจกรรม">'+esc(rule.note || '')+'</textarea></div>'+
        '<label class="mat-rule-active"><input data-field="active" type="checkbox" '+(rule.active === false ? '' : 'checked')+'> เปิดใช้</label>'+
        '<button type="button" class="mat-rule-remove" title="ลบ action" onclick="removeMaterialActionRule('+idx+')">×</button>'+
      '</div>'
    )).join('');
  }
  function readRows(){
    const item = materialList()[editingIndex];
    if(!item) return false;
    const rows = Array.from(document.querySelectorAll('#mat-rule-list .mat-rule-row'));
    const rules = [];
    for(const row of rows){
      const idx = Number(row.getAttribute('data-rule-index'));
      const old = item.actionRules[idx] || {};
      const title = (row.querySelector('[data-field="title"]')?.value || '').trim();
      const intervalDays = Math.max(1, Number(row.querySelector('[data-field="intervalDays"]')?.value || 0));
      const note = (row.querySelector('[data-field="note"]')?.value || '').trim();
      const active = !!row.querySelector('[data-field="active"]')?.checked;
      if(!title){ safe(() => showToast('กรอกชื่อ action ให้ครบ')); row.querySelector('[data-field="title"]')?.focus(); return false; }
      if(!Number.isFinite(intervalDays) || intervalDays < 1){ safe(() => showToast('จำนวนวันต้องมากกว่า 0')); row.querySelector('[data-field="intervalDays"]')?.focus(); return false; }
      rules.push({ id: old.id || ('rule-' + Date.now() + '-' + rules.length), title, intervalDays, note, active });
    }
    item.actionRules = rules;
    if(!Array.isArray(item.actionLogs)) item.actionLogs = [];
    item.updatedAt = new Date().toISOString();
    return true;
  }
  function refreshAll(){
    safe(() => saveData());
    safe(() => renderFarmInputPlans());
    safe(() => renderDashboardNotifications());
    safe(() => renderDashboard());
  }
  function enhanceMaterialRows(){
    document.querySelectorAll('#farm-input-body .farm-material-actions').forEach(actions => {
      if(actions.querySelector('.mat-rule-btn')) return;
      const html = actions.innerHTML || '';
      const m = html.match(/(?:editFarmInputPlan|markFarmMaterialReady)\((\d+)\)/);
      if(!m) return;
      const idx = Number(m[1]);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-outline btn-sm mat-rule-btn';
      btn.textContent = 'รอบงาน';
      btn.onclick = function(ev){ ev.stopPropagation(); openMaterialActionRules(idx); };
      actions.insertBefore(btn, actions.children[1] || null);
    });
  }

  window.openMaterialActionRules = function(index){
    const item = materialList()[Number(index)];
    if(!item){ safe(() => showToast('ไม่พบรายการวัสดุปลูก')); return; }
    editingIndex = Number(index);
    ensureRules(item);
    ensureModal();
    const title = document.getElementById('mat-rule-title');
    const sub = document.getElementById('mat-rule-sub');
    if(title) title.textContent = 'ตั้งรอบงาน: ' + (item.name || item.id || 'วัสดุปลูก');
    if(sub) sub.textContent = (item.type || 'วัสดุปลูก') + ' · ' + (item.qty || '-') + ' · ใช้กำหนดแจ้งเตือนและปุ่ม action';
    renderRuleRows();
    document.getElementById('modal-material-action-rules')?.classList.add('open');
    document.body.classList.add('modal-open');
  };
  window.closeMaterialActionRules = function(){
    document.getElementById('modal-material-action-rules')?.classList.remove('open');
    if(!document.querySelector('#modal-planting-plan.open,#fp-plan-detail-modal.open,#fp-crop-submodal.open,#modal-material-plan.open')) document.body.classList.remove('modal-open');
    editingIndex = -1;
  };
  window.addMaterialActionRule = function(){
    const item = materialList()[editingIndex];
    if(!item) return;
    ensureRules(item);
    item.actionRules.push({id:'rule-' + Date.now() + '-' + item.actionRules.length, title:'งานดูแลวัสดุ', intervalDays:7, note:'', active:true});
    renderRuleRows();
  };
  window.removeMaterialActionRule = function(ruleIndex){
    const item = materialList()[editingIndex];
    if(!item || !Array.isArray(item.actionRules)) return;
    item.actionRules.splice(Number(ruleIndex), 1);
    renderRuleRows();
  };
  window.resetMaterialActionRules = function(){
    const item = materialList()[editingIndex];
    if(!item) return;
    item.actionRules = [defaultRuleFor(item)];
    renderRuleRows();
  };
  window.saveMaterialActionRules = function(){
    if(!readRows()) return;
    refreshAll();
    safe(() => showToast('บันทึกรอบ action วัสดุปลูกแล้ว'));
    closeMaterialActionRules();
  };

  function installWrappers(){
    const oldRender = window.renderFarmInputPlans;
    if(typeof oldRender === 'function' && !oldRender.__v0659RuleEditor){
      const wrapped = function(){
        const result = oldRender.apply(this, arguments);
        safe(() => materialList().forEach(ensureRules));
        safe(() => enhanceMaterialRows());
        return result;
      };
      wrapped.__v0659RuleEditor = true;
      window.renderFarmInputPlans = wrapped;
      safe(() => { renderFarmInputPlans = wrapped; });
    }
  }

  window.farmMaterialRuleEditorV0659 = {
    ensureRules,
    enhanceMaterialRows,
    rulesFor:function(index){ const item = materialList()[Number(index)]; ensureRules(item); return item ? item.actionRules : []; }
  };

  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Escape' && document.getElementById('modal-material-action-rules')?.classList.contains('open')) closeMaterialActionRules();
  });
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      installWrappers();
      safe(() => materialList().forEach(ensureRules));
      safe(() => enhanceMaterialRows());
      safe(() => { if(typeof renderFarmInputPlans === 'function') renderFarmInputPlans(); });
      safe(() => saveData());
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
      console.log('Material action rule editor ready', VERSION);
    }, 2300);
  });
})();
