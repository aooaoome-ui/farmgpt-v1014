/* V1.0.3 Project Flow Stability Adapter Split
   Extracted from farm_management_V0_7_7_restore_qa_gate.html.
   Keeps project normalization and export/import wrappers outside the HTML while leaving core storage inline. */

// ===== V0.6.34 — Project Flow Stability Polish =====
  (function(){
    const PROJECT_FLOW_VERSION = 'V0.6.34';
    const VALID_PROJ_STATUS = ['กำลังดำเนินการ','วางแผน','เสร็จสิ้น','มีปัญหา','ยกเลิก'];
    const VALID_TL_STATUS = ['done','doing','todo','issue','skip'];

    function _pfsToast(msg){ try { if (typeof showToast === 'function') showToast(msg); } catch(e){} }
    function _pfsArr(v){ return Array.isArray(v) ? v : []; }
    function _pfsText(v, fallback=''){
      const s = String(v ?? '').trim();
      return s || fallback;
    }
    function _pfsToday(){
      try { return (typeof dateStr !== 'undefined' && dateStr) ? dateStr : new Date().toISOString().slice(0,10); }
      catch(e){ return new Date().toISOString().slice(0,10); }
    }

    function _pfsNormalizeTasks(step, seed){
      const raw = Array.isArray(step?.tasks) ? step.tasks :
        (Array.isArray(step?.subtasks) ? step.subtasks : (Array.isArray(step?.items) ? step.items : []));
      step.tasks = raw.filter(t => t !== null && t !== undefined).map((t, i) => {
        if (typeof t === 'string') return { id: seed + i, title: t.trim() || 'รายการงาน', note:'', done:false };
        return {
          id: t.id || t._id || (seed + i),
          title: _pfsText(t.title || t.name || t.text || t.label, 'รายการงาน'),
          note: _pfsText(t.note || t.detail || t.desc, ''),
          done: !!(t.done || t.checked || t.status === 'done' || t.status === 'เสร็จแล้ว')
        };
      });
      return step.tasks;
    }

    function normalizeProjectFlowData(){
      if (typeof projectItems === 'undefined') return [];
      if (!Array.isArray(projectItems)) projectItems = [];
      let maxId = 0;
      projectItems = projectItems.filter(p => p && typeof p === 'object').map((p, idx) => {
        const baseId = Number(p.id || p._id || 0) || (Date.now() + idx);
        p.id = baseId;
        maxId = Math.max(maxId, baseId);
        p.name = _pfsText(p.name || p.title, 'โครงการไม่มีชื่อ');
        p.desc = String(p.desc ?? p.description ?? '');
        p.status = VALID_PROJ_STATUS.includes(p.status) ? p.status : 'วางแผน';
        if (!Array.isArray(p.team)) p.team = String(p.team || '').split(',').map(s => s.trim()).filter(Boolean);
        p.timeline = _pfsArr(p.timeline).filter(Boolean).map((s, si) => {
          if (typeof s === 'string') s = { title:s, status:'todo', tasks:[] };
          if (!s || typeof s !== 'object') s = { title:'แผนงาน', status:'todo', tasks:[] };
          s.id = s.id || (baseId * 1000 + si + 1);
          s.title = _pfsText(s.title || s.name || s.text, 'แผนงาน');
          s.status = VALID_TL_STATUS.includes(s.status) ? s.status : 'todo';
          s.note = String(s.note ?? s.desc ?? '');
          _pfsNormalizeTasks(s, (baseId * 100000) + (si * 1000));
          return s;
        });
        try {
          if (typeof _getProjectTimelineProgress === 'function') {
            const prog = _getProjectTimelineProgress(p);
            p.pct = prog.pct;
          } else {
            p.pct = Math.min(100, Math.max(0, Number(p.pct) || 0));
          }
        } catch(e){ p.pct = Math.min(100, Math.max(0, Number(p.pct) || 0)); }
        if (!p.createdAt) p.createdAt = _pfsToday();
        p.updatedAt = p.updatedAt || p.createdAt;
        return p;
      });
      if (typeof _nextProjId !== 'undefined') _nextProjId = Math.max(Number(_nextProjId)||1, maxId + 1);
      return projectItems;
    }

    function refreshProjectFlowViews(projectId){
      try { normalizeProjectFlowData(); } catch(e){ console.warn('Project normalize failed:', e); }
      try { if (typeof renderProjects === 'function') renderProjects(); } catch(e){ console.warn('Project render failed:', e); }
      try {
        const detailOpen = document.getElementById('modal-project-detail')?.classList.contains('open');
        if (projectId && detailOpen && typeof _viewingProjId !== 'undefined' && _viewingProjId === projectId && typeof openProjectDetail === 'function') {
          openProjectDetail(projectId);
        }
      } catch(e){ console.warn('Project detail refresh failed:', e); }
      try { if (document.getElementById('page-calendar')?.classList.contains('active') && typeof renderCalendar === 'function') renderCalendar(); } catch(e){}
    }

    // ให้ _normalizeTimelineTasks เดิมยังทำงาน แต่รักษา note ของรายการงานไว้ด้วย
    if (typeof _normalizeTimelineTasks === 'function') {
      const _oldNormalizeTimelineTasks = _normalizeTimelineTasks;
      _normalizeTimelineTasks = function(step){
        if (!step) return [];
        const oldNotes = new Map(_pfsArr(step.tasks).map(t => [String(t.id || t.title || t.text || ''), t.note || t.detail || t.desc || '']));
        const tasks = _oldNormalizeTimelineTasks(step);
        tasks.forEach((t, i) => {
          const key = String(t.id || t.title || t.text || '');
          if (t.note === undefined) t.note = oldNotes.get(key) || '';
          if (!t.id) t.id = Date.now() + i;
          t.title = _pfsText(t.title || t.text, 'รายการงาน');
          t.done = !!t.done;
        });
        return tasks;
      };
    }

    if (typeof _applyData === 'function') {
      const _oldApplyData = _applyData;
      _applyData = function(data){
        _oldApplyData(data);
        normalizeProjectFlowData();
      };
    }

    if (typeof renderProjects === 'function') {
      const _oldRenderProjects = renderProjects;
      renderProjects = function(){
        try { normalizeProjectFlowData(); } catch(e){ console.warn('Project data normalize failed:', e); }
        try { return _oldRenderProjects.apply(this, arguments); }
        catch(e){
          console.error('Project render error:', e);
          const wrap = document.getElementById('proj-list-wrap');
          if (wrap) wrap.innerHTML = '<div class="project-empty-state">⚠️ แสดงผลโครงการไม่ได้ กรุณา Export Backup แล้วแจ้งจุดที่กดก่อนเกิดปัญหา</div>';
          _pfsToast('⚠️ พบปัญหาในการแสดงโครงการ');
        }
      };
    }

    if (typeof openProjectDetail === 'function') {
      const _oldOpenProjectDetail = openProjectDetail;
      openProjectDetail = function(id){
        normalizeProjectFlowData();
        const p = projectItems.find(x => x.id === id);
        if (!p) { _pfsToast('⚠️ ไม่พบข้อมูลโครงการ'); return; }
        return _oldOpenProjectDetail.apply(this, arguments);
      };
    }

    if (typeof saveProject === 'function') {
      const _oldSaveProject = saveProject;
      saveProject = function(){
        const beforeId = typeof _editingProjId !== 'undefined' ? _editingProjId : null;
        const result = _oldSaveProject.apply(this, arguments);
        normalizeProjectFlowData();
        if (beforeId && typeof _viewingProjId !== 'undefined' && _viewingProjId === beforeId) {
          try { openProjectDetail(beforeId); } catch(e){}
        }
        return result;
      };
    }

    if (typeof deleteProject === 'function') {
      const _oldDeleteProject = deleteProject;
      deleteProject = function(id){
        const result = _oldDeleteProject.apply(this, arguments);
        try { if (!projectItems.find(x => x.id === id) && typeof _viewingProjId !== 'undefined' && _viewingProjId === id) _viewingProjId = null; } catch(e){}
        try { closeModal('modal-proj-timeline'); } catch(e){}
        return result;
      };
    }

    // หลังแก้แผนงาน/รายการงาน ให้หน้าโครงการและหน้ารายละเอียดอัปเดตตรงกันทันที
    ['saveTimelineStep','deleteTimelineStep','quickUpdateStep','saveInlineTimelineTask','toggleTimelineSubtask','deleteTimelineSubtask','handleTimelineDrop'].forEach(fnName => {
      try {
        const oldFn = window[fnName];
        if (typeof oldFn !== 'function') return;
        window[fnName] = function(){
          const pid = typeof _tlProjId !== 'undefined' ? _tlProjId : null;
          const result = oldFn.apply(this, arguments);
          setTimeout(() => refreshProjectFlowViews(pid), 30);
          return result;
        };
      } catch(e){}
    });

    if (typeof exportProjectPdf === 'function') {
      const _oldExportProjectPdf = exportProjectPdf;
      exportProjectPdf = function(id){
        normalizeProjectFlowData();
        const p = projectItems.find(x => x.id === id);
        if (!p) { _pfsToast('⚠️ ไม่พบข้อมูลโครงการสำหรับ Export PDF'); return; }
        return _oldExportProjectPdf.apply(this, arguments);
      };
    }

    // Export/Import กลางให้รวมข้อมูลโครงการและเลขลำดับ ID ด้วย ไม่ตกหล่นเวลา Backup
    if (typeof exportData === 'function') {
      exportData = function(){
        normalizeProjectFlowData();
        const data = (typeof _packData === 'function') ? _packData() : { farmSettings, cropItems, actItems, invItems, custItems, salesData, goalItems, calEvents, projectItems, _nextProjId, exportedAt: new Date().toISOString() };
        data.exportedAt = new Date().toISOString();
        data.version = PROJECT_FLOW_VERSION;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'farm_backup_' + _pfsToday() + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        _pfsToast('📤 ส่งออกข้อมูลสำเร็จ รวมข้อมูลโครงการแล้ว');
      };
    }

    if (typeof importDataPrompt === 'function') {
      importDataPrompt = function(){
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json';
        inp.onchange = e => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => {
            try {
              const data = JSON.parse(ev.target.result);
              if (!confirm('📥 นำเข้าข้อมูลจากไฟล์?\n\nข้อมูลปัจจุบันจะถูกแทนที่ทั้งหมด')) return;
              if (typeof _applyData === 'function') _applyData(data);
              else {
                if (data.farmSettings) Object.assign(farmSettings, data.farmSettings);
                if (data.projectItems) projectItems = data.projectItems;
              }
              normalizeProjectFlowData();
              if (typeof saveData === 'function') saveData();
              cropRendered=actRendered=invRendered=salesRendered=custRendered=goalsRendered=false;
              navigate('dashboard', document.querySelector('.nav-item[onclick*="dashboard"]'));
              _pfsToast('✅ นำเข้าข้อมูลสำเร็จ');
            } catch(err) { console.warn(err); _pfsToast('❌ ไฟล์ไม่ถูกต้อง'); }
          };
          reader.readAsText(file);
        };
        inp.click();
      };
    }

    window.checkProjectFlowStability = function(){
      const rows = normalizeProjectFlowData();
      const bad = rows.filter(p => !p.id || !p.name || !VALID_PROJ_STATUS.includes(p.status));
      const summary = {
        version: PROJECT_FLOW_VERSION,
        projects: rows.length,
        badProjects: bad.length,
        timelineSteps: rows.reduce((s,p)=>s+_pfsArr(p.timeline).length,0),
        taskItems: rows.reduce((s,p)=>s+_pfsArr(p.timeline).reduce((a,t)=>a+_pfsArr(t.tasks).length,0),0),
      };
      console.table([summary]);
      return summary;
    };

    setTimeout(() => {
      normalizeProjectFlowData();
      try { if (document.getElementById('page-projects')?.classList.contains('active')) renderProjects(); } catch(e){}
      console.log('✅ Project Flow Stability Polish ready', PROJECT_FLOW_VERSION);
    }, 0);
  })();
