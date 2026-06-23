/* V1.0.3 Core Read-only Inspection Helper.
   Pure inspection utilities only. No storage reads or writes. */
(function(){
  'use strict';
  const VERSION = window.FARM_APP_VERSION || 'V1.0.3';

  function list(data, key){
    return Array.isArray(data && data[key]) ? data[key] : [];
  }

  function inspectCollection(data, label, key, idKey, nextKey){
    const items = list(data, key);
    const seen = new Set();
    const duplicateIds = [];
    const missingIdIndexes = [];
    let maxId = 0;
    items.forEach((item, index) => {
      const raw = item && item[idKey];
      const numberId = Number(raw);
      if(!raw) missingIdIndexes.push(index);
      else {
        const textId = String(raw);
        if(seen.has(textId) && !duplicateIds.includes(textId)) duplicateIds.push(textId);
        seen.add(textId);
      }
      if(Number.isFinite(numberId)) maxId = Math.max(maxId, numberId);
    });
    const nextId = Number(data && data[nextKey]);
    const staleNextId = Number.isFinite(nextId) && nextId <= maxId;
    return { label, key, idKey, nextKey, count:items.length, maxId, nextId:Number.isFinite(nextId) ? nextId : null, duplicateIds, missingIdIndexes, staleNextId };
  }

  function countIssues(rows){
    return (rows || []).reduce((sum, row) => sum + row.duplicateIds.length + row.missingIdIndexes.length + (row.staleNextId ? 1 : 0), 0);
  }

  window.farmCoreReadonlyInspectionV0906 = Object.freeze({ version:VERSION, inspectCollection, countIssues });
})();
