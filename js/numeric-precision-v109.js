/* V1.0.9 Numeric Precision Hotfix */
(function(){
  'use strict';

  const VERSION = window.FARM_APP_VERSION || 'V1.0.9';
  const PRECISION = 2;
  const TARGET_FUNCTIONS = [
    'renderDashboard',
    'renderCrops',
    'renderInv',
    'renderSales',
    'renderCalendar',
    'renderSettings',
    'openCropModal',
    'openInvModal',
    'openSaleModal',
    'editSaleItem',
    'openHarvestLogModal',
    '_buildProductOptions'
  ];

  const metrics = {
    version: VERSION,
    normalizeRuns: 0,
    fieldsRounded: 0,
    lastRoundedAt: null
  };

  function isRoundable(value){
    if (value === '' || value === null || typeof value === 'undefined') return false;
    const number = Number(value);
    return Number.isFinite(number);
  }

  function roundNumber(value){
    if (!isRoundable(value)) return value;
    const rounded = Math.round((Number(value) + Number.EPSILON) * Math.pow(10, PRECISION)) / Math.pow(10, PRECISION);
    return Object.is(rounded, -0) ? 0 : rounded;
  }

  function roundField(object, key){
    if (!object || !Object.prototype.hasOwnProperty.call(object, key) || !isRoundable(object[key])) return false;
    const next = roundNumber(object[key]);
    if (Number(object[key]) === next && String(object[key]).length <= String(next).length + 2) return false;
    object[key] = next;
    metrics.fieldsRounded += 1;
    return true;
  }

  function eachArray(name, callback){
    try {
      const arr = window.eval(name);
      if (Array.isArray(arr)) arr.forEach(callback);
    } catch (error) {}
  }

  function normalizeAll(){
    let changed = false;
    metrics.normalizeRuns += 1;

    eachArray('cropItems', function(crop){
      changed = roundField(crop, 'yieldActual') || changed;
      if (Array.isArray(crop.harvestLog)) {
        crop.harvestLog.forEach(function(entry){
          changed = roundField(entry, 'weight') || changed;
        });
      }
    });

    eachArray('invItems', function(item){
      changed = roundField(item, 'qty') || changed;
    });

    eachArray('salesData', function(sale){
      changed = roundField(sale, 'weight') || changed;
      changed = roundField(sale, 'qty') || changed;
      if (Array.isArray(sale.items)) {
        sale.items.forEach(function(item){
          changed = roundField(item, 'weight') || changed;
          changed = roundField(item, 'qty') || changed;
        });
      }
    });

    if (changed) metrics.lastRoundedAt = new Date().toISOString();
    return changed;
  }

  function cloneAndNormalize(data){
    const copy = JSON.parse(JSON.stringify(data || {}));
    if (Array.isArray(copy.cropItems)) {
      copy.cropItems.forEach(function(crop){
        roundField(crop, 'yieldActual');
        if (Array.isArray(crop.harvestLog)) crop.harvestLog.forEach(entry => roundField(entry, 'weight'));
      });
    }
    if (Array.isArray(copy.invItems)) copy.invItems.forEach(item => roundField(item, 'qty'));
    if (Array.isArray(copy.salesData)) {
      copy.salesData.forEach(function(sale){
        roundField(sale, 'weight');
        roundField(sale, 'qty');
        if (Array.isArray(sale.items)) {
          sale.items.forEach(function(item){
            roundField(item, 'weight');
            roundField(item, 'qty');
          });
        }
      });
    }
    return copy;
  }

  function wrapGlobal(name, wrapperFactory){
    const original = window[name];
    if (typeof original !== 'function' || original.__v109NumericPrecision) return;
    const wrapped = wrapperFactory(original);
    wrapped.__v109NumericPrecision = true;
    wrapped.__v109Original = original;
    window[name] = wrapped;
    try {
      window.eval(name + ' = window["' + name + '"]');
    } catch (error) {}
  }

  function wrapRender(name){
    wrapGlobal(name, function(original){
      return function(){
        normalizeAll();
        const result = original.apply(this, arguments);
        if (window.farmDecimalDisplayV108) window.farmDecimalDisplayV108.applyAll(document.body);
        return result;
      };
    });
  }

  function boot(){
    normalizeAll();

    wrapGlobal('_applyData', function(original){
      return function(data){
        const result = original.call(this, cloneAndNormalize(data));
        normalizeAll();
        return result;
      };
    });

    wrapGlobal('_packData', function(original){
      return function(){
        normalizeAll();
        return cloneAndNormalize(original.apply(this, arguments));
      };
    });

    wrapGlobal('saveData', function(original){
      return function(){
        normalizeAll();
        return original.apply(this, arguments);
      };
    });

    wrapGlobal('forceCloudSyncNowV103', function(original){
      return function(){
        normalizeAll();
        return original.apply(this, arguments);
      };
    });

    TARGET_FUNCTIONS.forEach(wrapRender);

    window.farmNumericPrecisionV109 = {
      roundNumber,
      normalizeAll,
      metrics: function(){
        return Object.assign({}, metrics);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  setTimeout(boot, 1800);
})();
