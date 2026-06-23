/* V1.0.3 Inventory split
   Extracted from farm_management_V0_6_85_settings_split.html. Keep original global API names stable. */

(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const DEFAULT_OVERSTOCK_DAYS = 15;
  let activeProduceView = 'stock';
  let stampTimer = 0;
  let versionObserver = null;
  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function clampInt(value, fallback, min, max){
    const n = parseInt(value, 10);
    if(!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }
  function settings(){
    safe(function(){ if(!farmSettings || typeof farmSettings !== 'object') farmSettings = {}; });
    farmSettings.overstockVisibleDays = clampInt(farmSettings.overstockVisibleDays, DEFAULT_OVERSTOCK_DAYS, 1, 365);
    return farmSettings;
  }
  function todayIso(){
    return safe(function(){ return (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10); }, new Date().toISOString().slice(0,10));
  }
  function addDays(iso, days){
    const d = new Date(String(iso || todayIso()) + 'T00:00:00');
    if(isNaN(d.getTime())) return todayIso();
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0,10);
  }
  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>"']/g, function(s){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]; });
  }
  function money(v){ return (Number(v)||0).toLocaleString('th-TH'); }
  function dateThai(iso){
    if(!iso) return '-';
    const d = new Date(String(iso) + 'T00:00:00');
    if(isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
  }
  function isProduce(item){ return item && item.cat === 'ผลผลิต'; }
  function status(item){ return safe(function(){ return produceStatus(item); }, {label:'มีในคลัง', cls:'badge-green', color:'#5cb85c', overstock:false}); }
  function daysLeft(item){ return safe(function(){ return produceDaysLeft(item); }, null); }
  function expiry(item){ return safe(function(){ return produceExpiry(item); }, null); }
  function overstockAgeDays(item){
    if(!item || !status(item).overstock) return 0;
    if(item.manualOverstockSince){
      const start = new Date(String(item.manualOverstockSince) + 'T00:00:00');
      const now = new Date(); now.setHours(0,0,0,0);
      if(!isNaN(start.getTime())) return Math.max(0, Math.floor((now - start) / 86400000));
    }
    const d = daysLeft(item);
    return d !== null ? Math.abs(d) : 0;
  }
  function allProduce(){
    return safe(function(){ return (invItems || []).filter(isProduce).filter(function(i){ return (Number(i.qty)||0) > 0; }); }, []);
  }
  function queryMatches(item){
    const q = (document.getElementById('search-produce')?.value || '').trim().toLowerCase();
    if(!q) return true;
    return String(item.name||'').toLowerCase().includes(q) || String(item.lot||'').toLowerCase().includes(q);
  }
  function dataGroups(){
    const limit = settings().overstockVisibleDays;
    const produce = allProduce().sort(function(a,b){ return String(b.harvestDate||'').localeCompare(String(a.harvestDate||'')); });
    const stock = produce.filter(function(i){ return !status(i).overstock; });
    const near = stock.filter(function(i){ const d = daysLeft(i); return d !== null && d >= 0 && d <= 2; }).sort(function(a,b){ return (daysLeft(a)||0) - (daysLeft(b)||0); });
    const overAll = produce.filter(function(i){ return status(i).overstock; }).sort(function(a,b){ return overstockAgeDays(b) - overstockAgeDays(a); });
    const overVisible = overAll.filter(function(i){ return overstockAgeDays(i) <= limit; });
    const overHidden = overAll.filter(function(i){ return overstockAgeDays(i) > limit; });
    return { limit, stock, near, overAll, overVisible, overHidden };
  }
  function visibleItemsForView(){
    const groups = dataGroups();
    if(activeProduceView === 'near') return groups.near.filter(queryMatches);
    if(activeProduceView === 'overstock') return groups.overAll.filter(queryMatches);
    return groups.stock.filter(queryMatches);
  }
  function setHeaderForView(){
    const row = document.querySelector('#inventory-produce-panel table thead tr');
    if(!row) return;
    row.innerHTML = '<th style="width:36px"><input type="checkbox" id="chk-all-produce" onchange="toggleCheckAll(&quot;produce&quot;,this.checked)"></th><th>ผลผลิต / Lot</th><th>คงเหลือ / ราคา</th><th>วันที่</th><th>สถานะ</th><th style="width:160px">จัดการ</th>';
  }
  function produceRow(item, mode){
    const st = status(item);
    const exp = expiry(item);
    const expStr = exp ? exp.toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'}) : '-';
    const harvestStr = item.harvestDate ? dateThai(item.harvestDate) : (item.lastOrder || '-');
    const valueStr = money((Number(item.qty)||0) * (Number(item.price)||0));
    const lot = escapeHtml(item.lot || 'รุ่นปลูก 1');
    const age = overstockAgeDays(item);
    const qty = escapeHtml(item.qty) + ' ' + escapeHtml(item.unit || 'กก.');
    const stockActions = '<button class="inv-detail-btn" id="inv-detail-btn-' + item.id + '" onclick="toggleInvDetail(' + item.id + ')">ดู</button>' +
      '<button class="btn-icon" title="ย้ายไปค้างสต็อก" onclick="markAsOverstock(' + item.id + ')" style="font-size:12px">⚠️</button>' +
      '<button class="btn-icon edit" onclick="editInvItem(' + item.id + ')">✏️</button>' +
      '<button class="btn-icon del" onclick="askConfirmDel(&quot;inv&quot;,' + item.id + ',' + JSON.stringify(item.name||'') + ')">🗑</button>';
    const overActions = '<button class="inv-detail-btn restore-overstock-v0676" onclick="restoreOverstockItemV0676(' + item.id + ')">นำกลับ</button>' +
      '<button class="inv-detail-btn" style="color:#b42323" onclick="disposeItem(' + item.id + ')">ทิ้ง</button>' +
      '<button class="btn-icon edit" onclick="editInvItem(' + item.id + ')">✏️</button>';
    const dateLine = mode === 'overstock'
      ? 'หมดอายุ: ' + expStr + '<small>ค้างสต็อก ' + age + ' วัน</small>'
      : 'เข้า: ' + harvestStr + '<small>หมดอายุ: ' + expStr + '</small>';
    return '<tr>' +
      '<td><input type="checkbox" class="' + (mode === 'overstock' ? 'overstock-chk' : 'chk-produce') + '" data-id="' + item.id + '" onchange="' + (mode === 'overstock' ? '' : '_updateSelBar(&quot;produce&quot;)') + '"></td>' +
      '<td><div class="inv-main-name">' + escapeHtml(item.name) + '</div><div class="inv-sub-line">Lot: ' + lot + '</div></td>' +
      '<td><div class="qty-stepper"><button onclick="adjustQty(' + item.id + ',-1)">−</button><span class="qty-val" id="qty-' + item.id + '" style="color:' + st.color + ';font-weight:600">' + escapeHtml(item.qty) + '</span><button onclick="adjustQty(' + item.id + ',1)">+</button></div><div class="inv-money">' + ((Number(item.price)||0) > 0 ? money(item.price) + ' ฿/' + escapeHtml(item.unit || 'กก.') : 'ยังไม่ตั้งราคา') + '</div></td>' +
      '<td><div class="inv-date-line">' + dateLine + '</div></td>' +
      '<td><span class="badge ' + st.cls + '" id="status-' + item.id + '">' + (mode === 'overstock' ? 'ค้าง ' + age + ' วัน' : escapeHtml(st.label)) + '</span></td>' +
      '<td><div class="inv-actions">' + (mode === 'overstock' ? overActions : stockActions) + '</div></td>' +
      '</tr><tr class="inventory-detail-row" id="inv-detail-' + item.id + '" style="display:none"><td colspan="6"><div class="inventory-detail-box"><span>ประเภท: <strong>ผลผลิต</strong></span><span>อายุไข: <strong>' + escapeHtml(item.shelfLife || '-') + ' วัน</strong></span><span>มูลค่า: <strong>' + valueStr + ' ฿</strong></span><span>หน่วย: <strong>' + escapeHtml(item.unit || 'กก.') + '</strong></span>' + (mode === 'overstock' ? '<span>แสดงค้างสต็อกถึง: <strong>' + settings().overstockVisibleDays + ' วัน</strong></span>' : '') + '</div></td></tr>';
  }
  function renderCustomProduceTable(){
    if(activeProduceView === 'stock') return;
    const body = document.getElementById('produce-table-body');
    const empty = document.getElementById('produce-empty');
    const pager = document.getElementById('pg-produce');
    if(!body) return;
    const items = visibleItemsForView();
    const mode = activeProduceView === 'overstock' ? 'overstock' : 'near';
    setHeaderForView();
    body.innerHTML = items.map(function(item){ return produceRow(item, mode); }).join('');
    if(pager) pager.innerHTML = '';
    if(empty){
      empty.style.display = items.length ? 'none' : 'block';
      empty.textContent = activeProduceView === 'overstock'
        ? 'ยังไม่มีผลผลิตค้างสต็อกในช่วงวันที่ตั้งค่า'
        : 'ยังไม่มีผลผลิตใกล้หมดอายุ';
    }
  }
  function installProduceTabs(){
    const panel = document.querySelector('#inventory-produce-panel .inventory-panel-compact');
    const summary = document.getElementById('produce-summary-row');
    if(!panel || !summary) return;
    let tabs = document.getElementById('produce-view-tabs-v0676');
    if(!tabs){
      tabs = document.createElement('div');
      tabs.id = 'produce-view-tabs-v0676';
      tabs.className = 'produce-view-tabs-v0676';
      summary.insertAdjacentElement('beforebegin', tabs);
    }
    const groups = dataGroups();
    tabs.innerHTML =
      '<button type="button" class="produce-view-tab-v0676 ' + (activeProduceView === 'stock' ? 'active' : '') + '" onclick="setInventoryProduceViewV0676(&quot;stock&quot;)">ผลผลิต <span>(' + groups.stock.length + ')</span></button>' +
      '<button type="button" class="produce-view-tab-v0676 warn ' + (activeProduceView === 'near' ? 'active' : '') + '" onclick="setInventoryProduceViewV0676(&quot;near&quot;)">ใกล้หมดอายุ <span>(' + groups.near.length + ')</span></button>' +
      '<button type="button" class="produce-view-tab-v0676 danger ' + (activeProduceView === 'overstock' ? 'active' : '') + '" onclick="setInventoryProduceViewV0676(&quot;overstock&quot;)">ค้างสต็อก <span>(' + groups.overAll.length + ')</span></button>';
  }
  function updateProduceSummary(){
    const row = document.getElementById('produce-summary-row');
    if(!row) return;
    const groups = dataGroups();
    const kg = groups.stock.reduce(function(sum,i){ return sum + (Number(i.qty)||0); }, 0);
    const hidden = groups.overHidden.length;
    row.innerHTML =
      '<div class="quick-pill">📦 มีในคลัง <strong>' + groups.stock.length + ' ชนิด</strong></div>' +
      '<div class="quick-pill">⚖️ รวม <strong>' + kg.toLocaleString('th-TH') + ' กก.</strong></div>' +
      '<div class="quick-pill" style="border-color:#f9e28a;color:#94620b;">⏰ ใกล้หมดอายุ ' + groups.near.length + ' ชนิด</div>' +
      '<div class="quick-pill" style="border-color:var(--red-200);color:var(--red-400);">⚠️ ค้างสต็อกทั้งหมด ' + groups.overAll.length + ' ชนิด</div>' +
      (hidden ? '<div class="quick-pill" style="border-color:#e4eae2;color:#747f77;">ไม่ขึ้นแจ้งเตือนเกิน ' + groups.limit + ' วัน: ' + hidden + ' ชนิด</div>' : '');
  }
  function updateOverstockWindowNote(){
    const tabs = document.getElementById('produce-view-tabs-v0676');
    if(!tabs) return;
    let note = document.getElementById('produce-window-note-v0676');
    if(!note){
      note = document.createElement('div');
      note.id = 'produce-window-note-v0676';
      note.className = 'produce-window-note-v0676';
      tabs.insertAdjacentElement('afterend', note);
    }
    const groups = dataGroups();
    if(activeProduceView === 'overstock'){
      note.style.display = '';
      note.textContent = 'แท็บนี้แสดงค้างสต็อกทั้งหมดเพื่อดูข้อมูลรุ่นและจำนวนวันที่ค้าง ส่วนผลผลิตต้องดู/แจ้งเตือนจะแสดงเฉพาะที่ค้างไม่เกิน ' + groups.limit + ' วันตาม Settings' + (groups.overHidden.length ? ' และมีรายการที่ไม่ขึ้นแจ้งเตือน ' + groups.overHidden.length + ' รายการ' : '');
    }else if(activeProduceView === 'near'){
      note.style.display = '';
      note.textContent = 'แสดงผลผลิตที่หมดอายุวันนี้หรือเหลือไม่เกิน 2 วัน';
    }else{
      note.style.display = 'none';
    }
  }
  function renderProduceWatchList(){
    const list = document.getElementById('produce-alert-list');
    if(!list) return;
    const groups = dataGroups();
    const itemHtml = function(item, mode){
      const st = status(item);
      const d = daysLeft(item);
      const value = mode === 'overstock' ? 'ค้าง ' + overstockAgeDays(item) + ' วัน' : (d === null ? (Number(item.qty)||0) + ' ' + (item.unit || 'กก.') : (d === 0 ? 'หมดวันนี้' : 'เหลือ ' + d + ' วัน'));
      const dot = mode === 'stock' ? '' : (mode === 'near' ? 'warn' : 'danger');
      return '<div class="inventory-alert-item"><span class="inventory-alert-dot ' + dot + '"></span><div><div class="inventory-alert-title">' + escapeHtml(item.name) + '</div><div class="inventory-alert-sub">' + escapeHtml(item.lot || 'รุ่นปลูก 1') + ' · ' + escapeHtml(item.qty) + ' ' + escapeHtml(item.unit || 'กก.') + '</div></div><div class="inventory-alert-value" style="color:' + (mode === 'overstock' ? '#ef4444' : mode === 'near' ? '#b8750d' : '#345f32') + '">' + escapeHtml(value) + '</div></div>';
    };
    const stock = groups.stock.slice(0,4);
    const near = groups.near.slice(0,4);
    const over = groups.overVisible.slice(0,4);
    list.innerHTML =
      '<div class="inventory-watch-section-v0676"><div class="inventory-watch-title-v0676"><strong>ผลผลิตในคลัง</strong><span>' + groups.stock.length + ' ชนิด</span></div>' + (stock.length ? stock.map(function(i){ return itemHtml(i,'stock'); }).join('') : '<div class="app-soft-note">ยังไม่มีผลผลิตในคลัง</div>') + '</div>' +
      '<div class="inventory-watch-section-v0676"><div class="inventory-watch-title-v0676"><strong>ใกล้หมดอายุ</strong><span>' + groups.near.length + ' ชนิด</span></div>' + (near.length ? near.map(function(i){ return itemHtml(i,'near'); }).join('') : '<div class="app-soft-note">ยังไม่มีผลผลิตใกล้หมดอายุ</div>') + '</div>' +
      '<div class="inventory-watch-section-v0676"><div class="inventory-watch-title-v0676"><strong>ค้างสต็อก</strong><span>' + groups.overVisible.length + ' ชนิด</span></div>' + (over.length ? over.map(function(i){ return itemHtml(i,'overstock'); }).join('') : '<div class="app-soft-note">ยังไม่มีค้างสต็อกในช่วงที่ตั้งค่า</div>') + (groups.overHidden.length ? '<div class="inventory-watch-hidden-v0676">ซ่อนรายการค้างเกิน ' + groups.limit + ' วัน ' + groups.overHidden.length + ' รายการ ปรับได้ใน Settings</div>' : '') + '</div>';
  }
  function applyInventoryOverstockUi(){
    safe(function(){
      settings();
      const page = document.getElementById('page-inventory');
      if(page) page.classList.add('inventory-overstock-v0676');
      const alertCardTitle = document.querySelector('#produce-alert-list')?.closest('.app-panel')?.querySelector('.app-panel-title');
      const alertCardSub = document.querySelector('#produce-alert-list')?.closest('.app-panel')?.querySelector('.app-panel-sub');
      if(alertCardTitle) alertCardTitle.textContent = '⏰ ผลผลิตต้องดู';
      if(alertCardSub) alertCardSub.textContent = 'ผลผลิต / ใกล้หมดอายุ / ค้างสต็อกตามช่วงวันที่ตั้งค่า';
      installProduceTabs();
      updateProduceSummary();
      updateOverstockWindowNote();
      renderCustomProduceTable();
      renderProduceWatchList();
      stamp();
    });
  }
  function setProduceView(view){
    activeProduceView = ['stock','near','overstock'].includes(view) ? view : 'stock';
    safe(function(){ if(activeProduceView !== 'stock') renderInv._producePage = 1; });
    if(typeof renderInv === 'function') renderInv();
    else applyInventoryOverstockUi();
  }
  function restoreOverstockItem(id){
    const item = safe(function(){ return (invItems || []).find(function(i){ return Number(i.id) === Number(id); }); }, null);
    if(!item) return;
    item.harvestDate = todayIso();
    item.manualOverstockSince = '';
    item.restoredFromOverstockAt = todayIso();
    if(!item.shelfLife) item.shelfLife = safe(function(){ return farmSettings.shelfLife || 7; }, 7);
    safe(function(){ saveData(); });
    activeProduceView = 'stock';
    if(typeof renderInv === 'function') renderInv();
    safe(function(){ showToast('นำ ' + item.name + ' กลับเข้าผลผลิตในคลังแล้ว'); });
  }
  function installMarkAsOverstock(){
    const replacement = function(id){
      const item = safe(function(){ return (invItems || []).find(function(i){ return Number(i.id) === Number(id); }); }, null);
      if(!item) return;
      const shelf = Number(item.shelfLife || safe(function(){ return farmSettings.shelfLife || 7; }, 7));
      item.manualOverstockSince = todayIso();
      item.harvestDate = addDays(todayIso(), -(Math.max(1, shelf) + 1));
      activeProduceView = 'overstock';
      safe(function(){ saveData(); });
      if(typeof renderInv === 'function') renderInv();
      safe(function(){ showToast('ย้าย ' + item.name + ' ไปค้างสต็อกแล้ว'); });
    };
    window.markAsOverstock = replacement;
    safe(function(){ markAsOverstock = replacement; });
  }
  function visibleOverstockForNotifications(){
    return dataGroups().overVisible;
  }
  function installDashboardAlertFilter(){
    const oldState = window._dashboardNotificationState || (typeof _dashboardNotificationState === 'function' ? _dashboardNotificationState : null);
    if(typeof oldState !== 'function' || oldState.__v0676OverstockWindow) return;
    const wrapped = function(){
      const result = oldState.apply(this, arguments) || {alerts:[], updates:[]};
      const visible = visibleOverstockForNotifications();
      result.alerts = (result.alerts || []).filter(function(a){
        return !(a && a.page === 'inventory' && /ค้างสต็อก|stock/i.test(String(a.title || '')));
      });
      if(visible.length){
        result.alerts.push({icon:'🧺', title:'ผลผลิตค้างสต็อก ' + visible.length + ' รายการ', sub:'แสดงเฉพาะที่ค้างไม่เกิน ' + settings().overstockVisibleDays + ' วัน', tag:'คลัง', page:'inventory'});
      }
      return result;
    };
    wrapped.__v0676OverstockWindow = true;
    window._dashboardNotificationState = wrapped;
    safe(function(){ _dashboardNotificationState = wrapped; });
  }
  function ensureSettingsControl(){
    safe(function(){
      if(window.farmSettingsNotificationGroupsV0669 && typeof window.farmSettingsNotificationGroupsV0669.organize === 'function'){
        window.farmSettingsNotificationGroupsV0669.organize();
      }
    });
    const slot = document.getElementById('settings-stock-fields-v0669');
    if(!slot || document.getElementById('settings-overstock-window-v0676')) return;
    slot.insertAdjacentHTML('beforeend',
      '<div id="settings-overstock-window-v0676">' +
        '<label for="st-overstock-visible-days">แสดงค้างสต็อกในผลผลิตต้องดูไม่เกิน</label>' +
        '<div class="overstock-setting-row-v0676"><input type="number" class="form-control" id="st-overstock-visible-days" min="1" max="365" step="1"><span>วัน</span></div>' +
        '<div class="overstock-setting-help-v0676">ค่าเริ่มต้น 15 วัน รายการที่ค้างเกินกำหนดจะไม่ขึ้นในผลผลิตต้องดูและแจ้งเตือน แต่ข้อมูลยังอยู่และปรับจำนวนวันเพื่อเรียกดูได้</div>' +
      '</div>');
    fillSettingsControl();
  }
  function fillSettingsControl(){
    const input = document.getElementById('st-overstock-visible-days');
    if(input) input.value = settings().overstockVisibleDays;
  }
  function readSettingsControl(){
    const input = document.getElementById('st-overstock-visible-days');
    if(input) farmSettings.overstockVisibleDays = clampInt(input.value, DEFAULT_OVERSTOCK_DAYS, 1, 365);
    settings();
  }
  function installSettingsWrappers(){
    const oldRenderSettings = window.renderSettings;
    if(typeof oldRenderSettings === 'function' && !oldRenderSettings.__v0676OverstockWindow){
      const wrappedRenderSettings = function(){
        const result = oldRenderSettings.apply(this, arguments);
        ensureSettingsControl();
        fillSettingsControl();
        stamp();
        return result;
      };
      wrappedRenderSettings.__v0676OverstockWindow = true;
      window.renderSettings = wrappedRenderSettings;
      safe(function(){ renderSettings = wrappedRenderSettings; });
    }
    const oldSaveDefaults = window.saveSettingsDefaults;
    if(typeof oldSaveDefaults === 'function' && !oldSaveDefaults.__v0676OverstockWindow){
      const wrappedSaveDefaults = function(){
        readSettingsControl();
        const result = oldSaveDefaults.apply(this, arguments);
        readSettingsControl();
        safe(function(){ saveData(); });
        safe(function(){ if(typeof renderInv === 'function') renderInv(); });
        safe(function(){ if(typeof renderDashboardNotifications === 'function') renderDashboardNotifications(); });
        safe(function(){ showToast('บันทึกค่าค้างสต็อกแล้ว'); });
        return result;
      };
      wrappedSaveDefaults.__v0676OverstockWindow = true;
      window.saveSettingsDefaults = wrappedSaveDefaults;
      safe(function(){ saveSettingsDefaults = wrappedSaveDefaults; });
    }
  }
  function stamp(){
    safe(function(){
      document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION);
      document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text,.badge-text span,.farm-badge,.sidebar-logo').forEach(function(el){
        Array.from(el.childNodes || []).forEach(function(node){
          if(node.nodeType === Node.TEXT_NODE && /V0\.6\.\d+/.test(node.nodeValue || '')) node.nodeValue = node.nodeValue.replace(/V0\.6\.\d+/g, VERSION);
        });
        if(el.children.length === 0 && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = el.textContent.replace(/V0\.6\.\d+/g, VERSION);
      });
      document.querySelectorAll('.logo-version,[data-app-version]').forEach(function(el){ el.textContent = VERSION; });
      document.querySelectorAll('.farm-badge,.sidebar-logo').forEach(function(el){
        if(/V0\.6\.\d+/.test(el.innerHTML || '')) el.innerHTML = el.innerHTML.replace(/V0\.6\.\d+/g, VERSION);
      });
    });
  }
  function wrapRenderInv(){
    const oldRender = window.renderInv;
    if(typeof oldRender !== 'function' || oldRender.__v0676OverstockWindow) return;
    const wrapped = function(){
      const result = oldRender.apply(this, arguments);
      applyInventoryOverstockUi();
      return result;
    };
    wrapped.__v0676OverstockWindow = true;
    window.renderInv = wrapped;
    safe(function(){ renderInv = wrapped; });
  }
  function boot(){
    settings();
    installMarkAsOverstock();
    installDashboardAlertFilter();
    installSettingsWrappers();
    wrapRenderInv();
    applyInventoryOverstockUi();
    ensureSettingsControl();
    stamp();
    if(!stampTimer) stampTimer = window.setInterval(stamp, 120);
    if(!versionObserver && window.MutationObserver){
      versionObserver = new MutationObserver(function(){
        window.clearTimeout(versionObserver._timer);
        versionObserver._timer = window.setTimeout(stamp, 0);
      });
      document.querySelectorAll('.logo-version,.farm-badge,.sidebar-logo,[data-app-version],.settings-hero-badge').forEach(function(el){
        versionObserver.observe(el, {childList:true, characterData:true, subtree:true});
      });
    }
    window.setTimeout(applyInventoryOverstockUi, 800);
    window.setTimeout(function(){ ensureSettingsControl(); fillSettingsControl(); applyInventoryOverstockUi(); }, 2300);
  }
  window.setInventoryProduceViewV0676 = setProduceView;
  window.restoreOverstockItemV0676 = restoreOverstockItem;
  window.farmInventoryOverstockTabsV0676 = {
    boot, applyInventoryOverstockUi, settings, visibleOverstockForNotifications, restoreOverstockItem
  };
  document.addEventListener('DOMContentLoaded', function(){
    boot();
    window.setTimeout(boot, 9900);
  });
})();
