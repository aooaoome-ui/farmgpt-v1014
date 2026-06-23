// V1.0.3 JS split: Distinct Calendar Type Colors.
// Preserves the stable farmCalendarTypeColorsV0663 global API.
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const TYPE_META = {
    planting:{label:'แผนปลูก', color:'#16a34a'},
    material:{label:'วัสดุปลูก', color:'#f97316'},
    project:{label:'โครงการ', color:'#4f46e5'},
    high:{label:'สำคัญมาก', color:'#dc2626'},
    medium:{label:'ปานกลาง', color:'#f59e0b'},
    farm:{label:'งานเกษตร', color:'#0ea5e9'},
    personal:{label:'ส่วนตัว', color:'#9333ea'},
    normal:{label:'ทั่วไป', color:'#64748b'}
  };
  const TYPE_ORDER = ['planting','material','project','high','medium','farm','personal','normal'];

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function allEvents(){ return safe(() => typeof _allCalendarEvents === 'function' ? _allCalendarEvents() : [], []); }
  function typeKey(ev){
    if(!ev) return 'normal';
    if(ev.source === 'planting-plan') return 'planting';
    if(ev.source === 'material-action') return 'material';
    if(ev.source === 'timeline') return 'project';
    const pri = String(ev.priority || 'normal');
    return TYPE_META[pri] ? pri : 'normal';
  }
  function typeLabel(evOrKey){
    const key = typeof evOrKey === 'string' ? evOrKey : typeKey(evOrKey);
    return (TYPE_META[key] || TYPE_META.normal).label;
  }
  function countTypes(list){
    const out = {};
    TYPE_ORDER.forEach(key => out[key] = 0);
    (list || []).forEach(ev => { const key = typeKey(ev); out[key] = (out[key] || 0) + 1; });
    return out;
  }
  function retitleProjectText(root){
    if(!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      node.nodeValue = String(node.nodeValue || '')
        .replace(/Timeline\s*โครงการ/g, 'โครงการ')
        .replace(/ดึงจาก\s*Timeline/g, 'ดึงจากโครงการ');
    });
  }
  function installTypePriority(){
    const oldPri = window._calPri || (typeof _calPri === 'function' ? _calPri : null);
    if(typeof oldPri === 'function' && !oldPri.__v0663TypeColors){
      const wrapped = function(ev){ return typeKey(ev); };
      wrapped.__v0663TypeColors = true;
      wrapped.__v0663Old = oldPri;
      window._calPri = wrapped;
      safe(() => { _calPri = wrapped; });
    }
  }
  function installTimelineLabel(){
    const oldTimeline = window._timelineCalendarEvents || (typeof _timelineCalendarEvents === 'function' ? _timelineCalendarEvents : null);
    if(typeof oldTimeline !== 'function' || oldTimeline.__v0663TypeColors) return;
    const wrapped = function(){
      return (oldTimeline.apply(this, arguments) || []).map(ev => {
        if(ev && ev.source === 'timeline') ev.cat = 'โครงการ';
        return ev;
      });
    };
    wrapped.__v0663TypeColors = true;
    wrapped.__v0663Old = oldTimeline;
    window._timelineCalendarEvents = wrapped;
    safe(() => { _timelineCalendarEvents = wrapped; });
  }
  function installEventCards(){
    if(typeof _calTaskHtml === 'function' && !_calTaskHtml.__v0663TypeColors){
      const taskHtml = function(ev){
        const key = typeKey(ev);
        const label = typeLabel(key);
        const id = esc(ev.id);
        return "<div class=\"calendar-task-item\" onclick=\"showCalDetail('" + id + "')\">" +
          '<span class="calendar-task-line ' + esc(key) + '"></span>' +
          '<div style="min-width:0;">' +
            '<div class="calendar-task-title">' + esc(ev.title) + '</div>' +
            '<div class="calendar-task-meta">' + esc(label) + (ev.note ? ' · ' + esc(ev.note) : '') + '</div>' +
          '</div>' +
          '<span class="calendar-task-date">' + safe(() => _calDateShort(ev.start), ev.start || '-') + '</span>' +
        '</div>';
      };
      taskHtml.__v0663TypeColors = true;
      window._calTaskHtml = taskHtml;
      safe(() => { _calTaskHtml = taskHtml; });
    }
    if(typeof _calDayEventHtml === 'function' && !_calDayEventHtml.__v0663TypeColors){
      const dayHtml = function(ev){
        const key = typeKey(ev);
        const label = typeLabel(key);
        const id = esc(ev.id);
        const dateRange = safe(() => _calDateShort(ev.start), ev.start || '-') + (ev.end && ev.end !== ev.start ? ' - ' + safe(() => _calDateShort(ev.end), ev.end) : '');
        const note = ev.note ? ' · ' + esc(ev.note) : '';
        const viewBtn = "<button class=\"btn btn-outline\" onclick=\"showCalDetail('" + id + "')\">ดู</button>";
        const editBtn = ev.source === 'timeline'
          ? "<button class=\"btn btn-outline\" onclick=\"showCalDetail('" + id + "')\">เปิดแผนงาน</button>"
          : "<button class=\"btn btn-outline\" onclick=\"openCalEventModal('" + id + "')\">แก้ไข</button>";
        const delBtn = ev.source === 'timeline'
          ? ''
          : "<button class=\"btn btn-outline\" style=\"color:var(--red-400);border-color:var(--red-200);\" onclick=\"deleteCalEvent('" + id + "')\">ลบ</button>";
        return '<div class="cal-day-detail-item">' +
          '<span class="cal-day-detail-line ' + esc(key) + '"></span>' +
          '<div style="min-width:0;">' +
            '<div class="cal-day-detail-title">' + esc(ev.title) + '</div>' +
            '<div class="cal-day-detail-meta">' + esc(label) + ' · ' + dateRange + note + '</div>' +
          '</div>' +
          '<div class="cal-day-detail-actions">' + viewBtn + editBtn + delBtn + '</div>' +
        '</div>';
      };
      dayHtml.__v0663TypeColors = true;
      window._calDayEventHtml = dayHtml;
      safe(() => { _calDayEventHtml = dayHtml; });
    }
  }
  function installSummary(){
    const oldSummary = window.renderCalendarSummary || (typeof renderCalendarSummary === 'function' ? renderCalendarSummary : null);
    if(typeof oldSummary !== 'function' || oldSummary.__v0663TypeColors) return;
    const wrapped = function(){
      const result = oldSummary.apply(this, arguments);
      const todayBox = document.getElementById('cal-today-list');
      const upcomingBox = document.getElementById('cal-upcoming-list');
      const legendBox = document.getElementById('cal-legend-list');
      const today = safe(() => dateStr, new Date().toISOString().slice(0,10));
      const todayDt = new Date(today + 'T00:00:00');
      const end7 = new Date(todayDt);
      end7.setDate(end7.getDate() + 7);
      const end7Iso = end7.toISOString().slice(0,10);
      const list = allEvents();
      const todayEvents = list.filter(e => e.start <= today && today <= (e.end || e.start));
      const upcoming = list.filter(e => (e.start || '') >= today && (e.start || '') <= end7Iso);
      if(todayBox){
        todayBox.innerHTML = todayEvents.length
          ? todayEvents.slice(0,6).map(_calTaskHtml).join('')
          : '<div class="calendar-empty">วันนี้ยังไม่มีงานในปฏิทิน</div>';
      }
      if(upcomingBox){
        upcomingBox.innerHTML = upcoming.length
          ? upcoming.slice(0,7).map(_calTaskHtml).join('')
          : '<div class="calendar-empty">ยังไม่มีงานใกล้ถึงกำหนดใน 7 วัน</div>';
      }
      if(legendBox){
        const counts = countTypes(list.filter(e => String(e.start || '').slice(0,7) === (calYear + '-' + String(calMonth + 1).padStart(2,'0'))));
        legendBox.innerHTML = TYPE_ORDER.map(key => {
          const meta = TYPE_META[key];
          return '<div class="calendar-legend-item"><span class="calendar-legend-left"><span class="calendar-legend-dot ' + key + '"></span><strong>' + esc(meta.label) + '</strong></span><span>' + Number(counts[key] || 0) + ' งาน</span></div>';
        }).join('');
      }
      retitleProjectText(document.getElementById('page-calendar'));
      return result;
    };
    wrapped.__v0663TypeColors = true;
    window.renderCalendarSummary = wrapped;
    safe(() => { renderCalendarSummary = wrapped; });
  }
  function replaceChipRow(){
    const hint = document.getElementById('calendar-mode-hint');
    if(!hint) return;
    let row = document.getElementById('calendar-type-chip-row-v0663');
    if(!row){
      const oldRow = hint.previousElementSibling && hint.previousElementSibling.classList.contains('app-chip-row') ? hint.previousElementSibling : null;
      if(oldRow) oldRow.remove();
      row = document.createElement('div');
      row.id = 'calendar-type-chip-row-v0663';
      row.className = 'calendar-type-chip-row-v0663';
      hint.insertAdjacentElement('beforebegin', row);
    }
    row.innerHTML = TYPE_ORDER.map(key => '<span class="calendar-type-chip-v0663"><i style="background:' + TYPE_META[key].color + '"></i>' + esc(TYPE_META[key].label) + '</span>').join('');
  }
  function installDetailWrapper(){
    const oldDetail = window.showCalDetail || (typeof showCalDetail === 'function' ? showCalDetail : null);
    if(typeof oldDetail !== 'function' || oldDetail.__v0663TypeColors) return;
    const wrapped = function(id){
      const result = oldDetail.apply(this, arguments);
      safe(() => {
        const ev = allEvents().find(e => String(e.id) === String(id));
        const key = typeKey(ev);
        const body = document.getElementById('cal-detail-body');
        if(body){
          retitleProjectText(body);
          const firstBadge = body.querySelector('span');
          if(firstBadge && ev && ev.source === 'timeline'){
            firstBadge.textContent = '📋 โครงการ';
            firstBadge.style.background = '#e0e7ff';
            firstBadge.style.color = '#3730a3';
          }
          const pill = body.querySelector('.cal-event-pill');
          if(pill){
            pill.className = 'cal-event-pill ' + key;
            pill.textContent = '● ' + typeLabel(key);
          }
          const cat = body.querySelector('span:not(.cal-event-pill)');
          if(cat && ev && ev.source !== 'timeline') cat.textContent = typeLabel(key);
        }
      });
      return result;
    };
    wrapped.__v0663TypeColors = true;
    window.showCalDetail = wrapped;
    safe(() => { showCalDetail = wrapped; });
  }
  function refreshCalendarText(){
    replaceChipRow();
    retitleProjectText(document.getElementById('page-calendar'));
  }
  function installRenderWrapper(){
    const oldRender = window.renderCalendar || (typeof renderCalendar === 'function' ? renderCalendar : null);
    if(typeof oldRender !== 'function' || oldRender.__v0663TypeColors) return;
    const wrapped = function(){
      const result = oldRender.apply(this, arguments);
      safe(refreshCalendarText);
      return result;
    };
    wrapped.__v0663TypeColors = true;
    window.renderCalendar = wrapped;
    safe(() => { renderCalendar = wrapped; });
  }
  function install(){
    installTimelineLabel();
    installTypePriority();
    installEventCards();
    installSummary();
    installDetailWrapper();
    installRenderWrapper();
    refreshCalendarText();
  }
  window.farmCalendarTypeColorsV0663 = {typeKey, typeLabel, countTypes, install};
  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      install();
      safe(() => { if(typeof renderCalendar === 'function') renderCalendar(); });
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
      console.log('Distinct calendar type colors ready', VERSION);
    }, 3900);
  });
})();
