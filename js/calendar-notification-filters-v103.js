// V1.0.3 JS split: Calendar + Notification Source Filters.
// Preserves the stable farmCalendarNotificationFiltersV0662 API and filter handlers.
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';
  const ALL = 'all';
  const FILTERS = [
    {key:'all', label:'ทั้งหมด'},
    {key:'planting', label:'แผนปลูก'},
    {key:'material', label:'วัสดุปลูก'},
    {key:'general', label:'งานทั่วไป'}
  ];
  let renderingCalendar = false;
  let calendarFilter = localStorage.getItem('farmCalendarSourceFilterV0662') || ALL;
  let notifyFilter = localStorage.getItem('farmNotifySourceFilterV0662') || ALL;

  function safe(fn, fallback){ try{ return fn(); }catch(err){ console.warn(VERSION, err); return fallback; } }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function pageCalendarActive(){ return !!document.getElementById('page-calendar')?.classList.contains('active'); }
  function validFilter(v){ return FILTERS.some(f => f.key === v) ? v : ALL; }
  function classifyEvent(ev){
    if(!ev) return 'general';
    if(ev.source === 'planting-plan') return 'planting';
    if(ev.source === 'material-action') return 'material';
    return 'general';
  }

  const originalAllEvents = (typeof _allCalendarEvents === 'function') ? _allCalendarEvents : null;
  function rawCalendarEvents(){
    return safe(() => originalAllEvents ? originalAllEvents() : (Array.isArray(calEvents) ? calEvents : []), []);
  }
  function shouldFilterCalendar(){
    return calendarFilter !== ALL && (renderingCalendar || pageCalendarActive() || document.getElementById('modal-cal-day')?.classList.contains('open') || document.getElementById('modal-cal-detail')?.classList.contains('open'));
  }
  function installCalendarEventFilter(){
    if(!originalAllEvents || originalAllEvents.__v0662SourceFilter) return;
    const filteredAll = function(){
      const list = originalAllEvents.apply(this, arguments) || [];
      if(!shouldFilterCalendar()) return list;
      return list.filter(ev => classifyEvent(ev) === calendarFilter);
    };
    filteredAll.__v0662SourceFilter = true;
    filteredAll.__v0662Original = originalAllEvents;
    window._allCalendarEvents = filteredAll;
    safe(() => { _allCalendarEvents = filteredAll; });
  }

  function calendarCounts(){
    const counts = {all:0, planting:0, material:0, general:0};
    rawCalendarEvents().forEach(ev => {
      const key = classifyEvent(ev);
      counts.all += 1;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }
  function injectCalendarFilterBar(){
    const toolbar = document.querySelector('#page-calendar .calendar-toolbar-row');
    const container = document.getElementById('cal-container');
    if(!toolbar || !container) return;
    let bar = document.getElementById('calendar-source-filter-v0662');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'calendar-source-filter-v0662';
      bar.className = 'cal-source-filter-wrap';
      toolbar.insertAdjacentElement('afterend', bar);
    }
    const counts = calendarCounts();
    bar.innerHTML = '<div class="cal-source-filter-title">กรองปฏิทิน</div><div class="cal-source-filter-group">' +
      FILTERS.map(f => '<button type="button" class="cal-source-filter '+(calendarFilter===f.key?'active':'')+'" data-filter="'+esc(f.key)+'" onclick="setCalendarSourceFilterV0662(\''+esc(f.key)+'\')">'+esc(f.label)+' <span>'+Number(counts[f.key] || 0)+'</span></button>').join('') +
      '</div>';
    if(calendarFilter !== ALL && !Number(counts[calendarFilter] || 0) && !container.querySelector('.cal-filter-empty-note')){
      container.insertAdjacentHTML('beforeend', '<div class="cal-filter-empty-note">ยังไม่มีงานในหมวดนี้</div>');
    }
  }
  window.setCalendarSourceFilterV0662 = function(next){
    calendarFilter = validFilter(next);
    safe(() => localStorage.setItem('farmCalendarSourceFilterV0662', calendarFilter));
    safe(() => { if(typeof renderCalendar === 'function') renderCalendar(); });
  };

  function notifySections(panel){
    return Array.from(panel.querySelectorAll(':scope > .mock-notify-section'));
  }
  function markNotifySections(panel){
    notifySections(panel).forEach(section => {
      if(section.classList.contains('planned-task-notify-section')) section.dataset.notifySource = 'planting';
      else if(section.classList.contains('material-task-notify-section')) section.dataset.notifySource = 'material';
      else section.dataset.notifySource = 'general';
    });
  }
  function notifyCounts(panel){
    const counts = {all:0, planting:0, material:0, general:0};
    notifySections(panel).forEach(section => {
      const key = section.dataset.notifySource || 'general';
      const itemCount = section.querySelectorAll('.mock-notify-item').length || (section.textContent.trim() ? 1 : 0);
      counts.all += itemCount;
      counts[key] = (counts[key] || 0) + itemCount;
    });
    return counts;
  }
  function injectNotifyFilterBar(){
    const panel = document.getElementById('notify-panel');
    if(!panel) return;
    notifyFilter = validFilter(notifyFilter);
    markNotifySections(panel);
    let bar = document.getElementById('notify-source-filter-v0662');
    const head = panel.querySelector('.mock-notify-head');
    if(!bar){
      bar = document.createElement('div');
      bar.id = 'notify-source-filter-v0662';
      bar.className = 'notify-source-filter-wrap';
      if(head) head.insertAdjacentElement('afterend', bar);
      else panel.insertAdjacentElement('afterbegin', bar);
    }
    const counts = notifyCounts(panel);
    bar.innerHTML = '<div class="notify-source-filter-title">กรองแจ้งเตือน</div><div class="notify-source-filter-group">' +
      FILTERS.map(f => '<button type="button" class="notify-source-filter '+(notifyFilter===f.key?'active':'')+'" data-filter="'+esc(f.key)+'" onclick="setNotifySourceFilterV0662(\''+esc(f.key)+'\')">'+esc(f.label)+' <span>'+Number(counts[f.key] || 0)+'</span></button>').join('') +
      '</div>';
    applyNotifyFilter(panel);
  }
  function applyNotifyFilter(panel){
    panel = panel || document.getElementById('notify-panel');
    if(!panel) return;
    markNotifySections(panel);
    let visible = 0;
    notifySections(panel).forEach(section => {
      const show = notifyFilter === ALL || (section.dataset.notifySource || 'general') === notifyFilter;
      section.classList.toggle('notify-filter-hidden', !show);
      if(show) visible += 1;
    });
    let empty = document.getElementById('notify-filter-empty-v0662');
    if(!empty){
      empty = document.createElement('div');
      empty.id = 'notify-filter-empty-v0662';
      empty.className = 'notify-filter-empty';
      panel.insertAdjacentElement('beforeend', empty);
    }
    const label = (FILTERS.find(f => f.key === notifyFilter) || FILTERS[0]).label;
    empty.textContent = notifyFilter === ALL ? '' : 'ยังไม่มีแจ้งเตือนในหมวด ' + label;
    empty.classList.toggle('show', notifyFilter !== ALL && visible === 0);
  }
  window.setNotifySourceFilterV0662 = function(next){
    notifyFilter = validFilter(next);
    safe(() => localStorage.setItem('farmNotifySourceFilterV0662', notifyFilter));
    safe(() => injectNotifyFilterBar());
  };

  function installWrappers(){
    installCalendarEventFilter();
    const oldRenderCalendar = window.renderCalendar;
    if(typeof oldRenderCalendar === 'function' && !oldRenderCalendar.__v0662SourceFilter){
      const wrappedCalendar = function(){
        renderingCalendar = true;
        let result;
        try{ result = oldRenderCalendar.apply(this, arguments); }
        finally{ renderingCalendar = false; }
        safe(() => injectCalendarFilterBar());
        return result;
      };
      wrappedCalendar.__v0662SourceFilter = true;
      window.renderCalendar = wrappedCalendar;
      safe(() => { renderCalendar = wrappedCalendar; });
    }
    const oldNotify = window.renderDashboardNotifications;
    if(typeof oldNotify === 'function' && !oldNotify.__v0662SourceFilter){
      const wrappedNotify = function(){
        const result = oldNotify.apply(this, arguments);
        safe(() => injectNotifyFilterBar());
        return result;
      };
      wrappedNotify.__v0662SourceFilter = true;
      window.renderDashboardNotifications = wrappedNotify;
      safe(() => { renderDashboardNotifications = wrappedNotify; });
    }
  }

  window.farmCalendarNotificationFiltersV0662 = {
    classifyEvent,
    rawCalendarEvents,
    calendarCounts,
    installWrappers,
    getCalendarFilter:function(){ return calendarFilter; },
    getNotifyFilter:function(){ return notifyFilter; }
  };

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(function(){
      installWrappers();
      safe(() => { if(typeof renderCalendar === 'function') renderCalendar(); });
      safe(() => { if(typeof renderDashboardNotifications === 'function') renderDashboardNotifications(); });
      safe(() => { document.title = (document.title || '').replace(/V0\.6\.\d+/g, VERSION); });
      safe(() => {
        document.querySelectorAll('.logo-version,[data-app-version],.settings-hero-badge,.badge-text span:last-child').forEach(el => {
          if(el && /V0\.6\.\d+/.test(el.textContent || '')) el.textContent = (el.textContent || '').replace(/V0\.6\.\d+/g, VERSION);
        });
      });
      console.log('Calendar + notification source filters ready', VERSION);
    }, 3400);
  });
})();
