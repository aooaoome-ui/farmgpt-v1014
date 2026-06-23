/* V1.0.3 JS split: Care Task Card Form Fit.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';

  function fitCareTaskCard(){
    const editor = document.getElementById('fp-care-editor');
    if(!editor) return;

    const title = document.getElementById('fp-care-editor-title');
    if(title){
      title.classList.add('fp-care-editor-title-fit');
      if(!document.getElementById('fp-care-close-x')){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'fp-care-close-x';
        btn.className = 'fp-care-close-x';
        btn.setAttribute('aria-label','ปิด');
        btn.textContent = '×';
        btn.addEventListener('click', function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          if(typeof cancelCareTaskEditor === 'function') cancelCareTaskEditor();
          else editor.classList.remove('open');
        });
        editor.appendChild(btn);
      }
    }

    const titleInput = document.getElementById('fp-care-title');
    if(titleInput){
      const label = titleInput.closest('label');
      if(label) label.classList.add('fp-care-title-row');
      titleInput.placeholder = titleInput.placeholder || 'เช่น ใช้น้ำหมักชีวภาพ ครั้งที่ 1';
    }

    const typeInput = document.getElementById('fp-care-type');
    if(typeInput){
      const label = typeInput.closest('label');
      if(label) label.classList.add('fp-care-type-row');
    }

    const dateInput = document.getElementById('fp-care-date');
    if(dateInput){
      const label = dateInput.closest('label');
      if(label) label.classList.add('fp-care-date-row');
    }

    let note = document.getElementById('fp-care-note');
    if(note && note.tagName !== 'TEXTAREA'){
      const textarea = document.createElement('textarea');
      textarea.id = note.id;
      textarea.className = note.className || 'form-control';
      textarea.placeholder = note.placeholder || 'รายละเอียดสั้น ๆ เช่น ป้องกันโรคดินและราก';
      textarea.value = note.value || '';
      note.parentNode.replaceChild(textarea, note);
      note = textarea;
    }
    if(note){
      const label = note.closest('label');
      if(label){
        label.classList.add('fp-care-note-row');
        label.classList.add('wide');
      }
      note.placeholder = 'รายละเอียดสั้น ๆ เช่น อัตราใช้ / วิธีใช้ / ข้อควรระวัง';
    }
  }

  const oldOpen = window.openCareTaskEditor;
  if(typeof oldOpen === 'function' && !oldOpen.__careTaskFormFitV0615){
    const wrapped = function(){
      const result = oldOpen.apply(this, arguments);
      setTimeout(fitCareTaskCard, 0);
      return result;
    };
    wrapped.__careTaskFormFitV0615 = true;
    window.openCareTaskEditor = wrapped;
  }

  const oldCancel = window.cancelCareTaskEditor;
  if(typeof oldCancel === 'function' && !oldCancel.__careTaskFormFitV0615){
    const wrappedCancel = function(){
      const result = oldCancel.apply(this, arguments);
      const modal = document.getElementById('modal-planting-plan');
      if(modal) modal.classList.remove('care-card-open');
      return result;
    };
    wrappedCancel.__careTaskFormFitV0615 = true;
    window.cancelCareTaskEditor = wrappedCancel;
  }

  window.fitCareTaskCardV0615 = fitCareTaskCard;
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(fitCareTaskCard, 80); });
  console.log('✅ Care Task Card Form Fit ready', VERSION);
})();
