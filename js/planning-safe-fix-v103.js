/* V1.0.3 JS split: Planning Safe Fix.
   Extracted during the V1.0.3 safe wrapper batch split. */
(function(){
  'use strict';
  const VERSION='V0.6.34';

  function safe(fn){try{return fn();}catch(err){console.warn(VERSION+' safe patch warning',err);}}
  function unique(arr){return Array.from(new Set((arr||[]).filter(Boolean)));}

  function addDaysLocal(date, days){
    const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
    d.setDate(d.getDate()+Number(days||0));
    return d;
  }
  function isoDate(d){
    if(typeof _iso==='function') return _iso(d);
    const x=d instanceof Date?d:new Date(d);
    return x.toISOString().slice(0,10);
  }
  function parseStart(value){
    if(typeof _parseThaiDate==='function') return _parseThaiDate(value||'');
    if(!value) return new Date();
    const m=String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(m){ let y=Number(m[3]); if(y>2400)y-=543; return new Date(y,Number(m[2])-1,Number(m[1])); }
    return new Date(value);
  }
  function escText(s){return typeof _esc==='function'?_esc(s):String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmtShort(iso){
    if(typeof _fmtShortTH==='function') return _fmtShortTH(iso);
    const d=new Date(iso+'T00:00:00'); return d.getDate()+'/'+(d.getMonth()+1);
  }
  function fmtDate(iso){return typeof _fmtTHDateIso==='function'?_fmtTHDateIso(iso):iso;}
  function icon(type){return typeof _fpTaskIcon==='function'?_fpTaskIcon(type):'•';}
  function cls(type){return typeof _fpTaskClass==='function'?_fpTaskClass(type):'';}

  const EXTRA_CATEGORY_CROPS = {
    'พืชผัก': ['Green Oak','Red Oak','Cos','Butterhead','Green Coral','Red Coral','กรีนโอ๊ค','เรดโอ๊ค','คอส','บัตเตอร์เฮด','ผักกาดหอม','ผักกาดแก้ว','ผักกาดขาว','ผักชี','ขึ้นฉ่าย','คะน้า','กวางตุ้ง','กวางตุ้งฮ่องเต้หวาน','บรอกโคลี','กะหล่ำดอก','กะหล่ำปลี','ชื่นฉ่าย','ปวยเล้ง','ผักบุ้ง','ผักโขม'],
    'พืชสวนครัว': ['พริก','พริกขี้หนู','พริกหวาน','มะเขือเทศราชินี','มะเขือเทศ','มะเขือเปราะ','มะเขือยาว','แตงกวา','แตงร้าน','บวบ','ฟักทอง','เมล่อน','แตงไทย','แตงโม','ถั่วฝักยาว','กะเพรา','โหระพา','แมงลัก','ผักชีฝรั่ง','ตะไคร้','มะกรูด','ข่า','กระเทียม','หอมแบ่ง','หอมแดง'],
    'พืชดอก/ไม้ดอก': ['ดาวเรือง','มะลิ','กุหลาบ','กล้วยไม้','เบญจมาศ','บานไม่รู้โรย','ทานตะวัน','คัตเตอร์','บัว','พุด','เยอบีร่า','ดอกหน้าวัว','สร้อยไก่','ซ่อนกลิ่น'],
    'พืชไร่': ['ข้าวโพดหวาน','ข้าวโพดเลี้ยงสัตว์','มันสำปะหลัง','อ้อย','ถั่วเหลือง','ถั่วเขียว','ถั่วลิสง','งา','ข้าวไร่','ข้าวโพดข้าวเหนียว','ทานตะวันเมล็ด','ปอเทือง'],
    'พืชสมุนไพร': ['ขมิ้นชัน','ไพล','ฟ้าทะลายโจร','กระชาย','กระชายดำ','ขิง','ว่านหางจระเข้','ใบบัวบก','ตะไคร้หอม','รางจืด','มะขามป้อม','มะระขี้นก','หญ้าหวาน','อัญชัน'],
    'ไม้ผล': ['มะม่วง','ลำไย','กล้วยน้ำว้า','กล้วยหอม','มะนาว','ฝรั่ง','มะละกอ','ทุเรียน','อะโวคาโด','ส้มโอ','มะพร้าวน้ำหอม','ขนุน','เสาวรส','น้อยหน่า','ชมพู่'],
    'ไม้เศรษฐกิจ': ['ไผ่','สัก','ยางพารา','ยูคาลิปตัส','กาแฟ','โกโก้','มะพร้าว','กฤษณา','กระถินเทพา','พะยูง','ไผ่กิมซุง','ไผ่ซางหม่น'],
    'อื่นๆ': ['หญ้าอาหารสัตว์','พืชคลุมดิน','ปอเทือง','ถั่วพร้า','ถั่วมะแฮะ']
  };

  function patchCategoryCrops(){
    safe(()=>{
      if(typeof FARM_PLAN_CATEGORY_CROPS==='object'){
        Object.keys(EXTRA_CATEGORY_CROPS).forEach(cat=>{
          FARM_PLAN_CATEGORY_CROPS[cat]=unique([...(FARM_PLAN_CATEGORY_CROPS[cat]||[]),...EXTRA_CATEGORY_CROPS[cat]]);
        });
      }
    });
  }

  function groupOf(crop, cat){
    const n=String(crop||'').toLowerCase();
    if(/green oak|red oak|cos|butterhead|coral|โอ๊ค|คอส|บัตเตอร์|สลัด|ผักกาดหอม|ผักกาดแก้ว/.test(n)) return 'lettuce';
    if(/ผักบุ้ง/.test(n)) return 'morning';
    if(/คะน้า|กวางตุ้ง|บรอกโคลี|กะหล่ำ/.test(n)) return 'brassica';
    if(/มะเขือเทศ|พริก|มะเขือ/.test(n)) return 'fruitVegLong';
    if(/แตง|เมล่อน|บวบ|ฟักทอง/.test(n)) return 'cucurbit';
    if(/กะเพรา|โหระพา|แมงลัก|ผักชี|ขึ้นฉ่าย|ชื่นฉ่าย/.test(n)) return 'herbShort';
    if(cat==='พืชไร่') return 'field';
    if(cat==='พืชสมุนไพร') return 'herbLong';
    if(cat==='ไม้ผล') return 'fruitTree';
    if(cat==='ไม้เศรษฐกิจ') return 'treeCrop';
    if(cat==='พืชดอก/ไม้ดอก') return 'flower';
    return 'genericVeg';
  }

  function profileByCrop(crop, cat){
    const g=groupOf(crop, cat);
    const P={
      lettuce:{transplantDay:15,harvestDay:45,tasks:[
        [0,'เพาะเมล็ด {crop}','เพาะเมล็ด','เริ่มเพาะในถาดเพาะ'],[3,'ตรวจการงอก / ความชื้นวัสดุเพาะ','ตรวจแปลง','อย่าให้วัสดุเพาะแห้งหรือแฉะเกินไป'],[7,'ใช้ไตรโคเดอร์ม่า ครั้งที่ 1','ไตรโคเดอร์ม่า','ป้องกันโรคดินและราก'],[10,'ใช้น้ำหมักชีวภาพ ครั้งที่ 1','น้ำหมัก','เจือจางอ่อนสำหรับต้นกล้า'],[15,'ย้ายปลูก {crop}','ย้ายปลูก','ย้ายลงแปลง/โต๊ะปลูก'],[18,'ตรวจตั้งตัวหลังย้ายปลูก','ตรวจแปลง','เช็กเหี่ยว ราก และความชื้น'],[22,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','เสริมอินทรียวัตถุรอบโคน'],[27,'ใช้น้ำหมักชีวภาพ ครั้งที่ 2','น้ำหมัก','บำรุงใบ'],[30,'ใช้บิวเวอเรีย ครั้งที่ 1','บิวเวอเรีย','ป้องกันแมลง'],[35,'ใส่ปุ๋ยหมัก ครั้งที่ 2','ใส่ปุ๋ย','เร่งขนาดต้นก่อนเก็บ'],[38,'ใช้น้ำหมักชีวภาพ ครั้งที่ 3','น้ำหมัก','บำรุงก่อนเก็บ'],[41,'ใช้บิวเวอเรีย ครั้งที่ 2','บิวเวอเรีย','ป้องกันแมลงช่วงท้าย'],[45,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','คาดการณ์วันพร้อมเก็บ']]},
      morning:{transplantDay:0,harvestDay:25,tasks:[[0,'หว่าน/ปลูก {crop}','เพาะเมล็ด','ปลูกลงแปลงได้โดยตรง'],[3,'ตรวจการงอก','ตรวจแปลง','รักษาความชื้น'],[7,'ใช้น้ำหมักชีวภาพ ครั้งที่ 1','น้ำหมัก','บำรุงต้นอ่อน'],[10,'ใส่ปุ๋ยหมักบาง ๆ','ใส่ปุ๋ย','เสริมอินทรียวัตถุ'],[14,'ตรวจโรคและแมลง','ตรวจแปลง','ดูเพลี้ยและใบเหลือง'],[18,'ใช้น้ำหมักชีวภาพ ครั้งที่ 2','น้ำหมัก','บำรุงก่อนตัด'],[25,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','เริ่มตัดยอด/ตัดขาย']]},
      brassica:{transplantDay:18,harvestDay:55,tasks:[[0,'เพาะเมล็ด {crop}','เพาะเมล็ด','เริ่มเพาะกล้า'],[4,'ตรวจการงอก','ตรวจแปลง','คัดต้นอ่อนผิดปกติ'],[7,'ใช้ไตรโคเดอร์ม่า ครั้งที่ 1','ไตรโคเดอร์ม่า','ลดโรคราก'],[14,'ใช้น้ำหมักชีวภาพ ครั้งที่ 1','น้ำหมัก','บำรุงต้นกล้า'],[18,'ย้ายปลูก {crop}','ย้ายปลูก','ย้ายเมื่อกล้าแข็งแรง'],[25,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','เสริมการแตกใบ'],[32,'ใช้บิวเวอเรีย ครั้งที่ 1','บิวเวอเรีย','ป้องกันหนอน/แมลง'],[38,'ใช้น้ำหมักชีวภาพ ครั้งที่ 2','น้ำหมัก','บำรุงใบ'],[45,'ใส่ปุ๋ยหมัก ครั้งที่ 2','ใส่ปุ๋ย','ก่อนเข้าระยะเก็บ'],[55,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','พร้อมเก็บโดยประมาณ']]},
      cucurbit:{transplantDay:12,harvestDay:65,tasks:[[0,'เพาะเมล็ด {crop}','เพาะเมล็ด','เพาะในถาดหรือถุงเพาะ'],[4,'ตรวจการงอก','ตรวจแปลง','คัดกล้าแข็งแรง'],[7,'ใช้ไตรโคเดอร์ม่า ครั้งที่ 1','ไตรโคเดอร์ม่า','ป้องกันโรคราก'],[12,'ย้ายปลูก {crop}','ย้ายปลูก','ย้ายปลูกลงแปลง'],[18,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','เร่งแตกเถา'],[25,'จัดเถา/ตรวจค้าง','ตรวจแปลง','จัดทรงต้นและเช็กระบบน้ำ'],[30,'ใช้น้ำหมักชีวภาพ','น้ำหมัก','บำรุงก่อนออกดอก'],[35,'ใช้บิวเวอเรีย ครั้งที่ 1','บิวเวอเรีย','ลดแมลงศัตรูพืช'],[42,'ใส่ปุ๋ยหมัก ครั้งที่ 2','ใส่ปุ๋ย','ช่วงติดดอก/ติดผล'],[50,'ตรวจผลและโรคใบ','ตรวจแปลง','ดูรา ใบไหม้ และแมลง'],[65,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','เริ่มเก็บผลผลิต']]},
      fruitVegLong:{transplantDay:25,harvestDay:85,tasks:[[0,'เพาะเมล็ด {crop}','เพาะเมล็ด','เริ่มเพาะกล้า'],[5,'ตรวจการงอก','ตรวจแปลง','รักษาความชื้น'],[10,'ใช้ไตรโคเดอร์ม่า ครั้งที่ 1','ไตรโคเดอร์ม่า','ลดโรคกล้า'],[18,'ใช้น้ำหมักชีวภาพ ครั้งที่ 1','น้ำหมัก','บำรุงต้นกล้า'],[25,'ย้ายปลูก {crop}','ย้ายปลูก','ย้ายลงแปลง/โรงเรือน'],[32,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','เร่งตั้งตัว'],[40,'ทำค้าง/แต่งกิ่ง/ตรวจทรงต้น','ตรวจแปลง','จัดต้นให้โปร่ง'],[48,'ใช้บิวเวอเรีย ครั้งที่ 1','บิวเวอเรีย','ลดแมลง'],[55,'ใส่ปุ๋ยหมัก ครั้งที่ 2','ใส่ปุ๋ย','ช่วงเริ่มออกดอก'],[65,'ใช้น้ำหมักชีวภาพ ครั้งที่ 2','น้ำหมัก','บำรุงดอกและผล'],[75,'ตรวจโรคและแมลงก่อนเก็บ','ตรวจแปลง','ดูเพลี้ย หนอน รา'],[85,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','เริ่มเก็บผลผลิต']]},
      herbShort:{transplantDay:15,harvestDay:45,tasks:[[0,'เพาะ/ปักชำ {crop}','เพาะเมล็ด','เริ่มเพาะหรือปักชำ'],[5,'ตรวจการแตกราก/งอก','ตรวจแปลง','รักษาความชื้น'],[12,'ใช้น้ำหมักชีวภาพ ครั้งที่ 1','น้ำหมัก','บำรุงใบ'],[15,'ย้ายปลูก {crop}','ย้ายปลูก','ย้ายลงแปลง'],[22,'ใส่ปุ๋ยหมักบาง ๆ','ใส่ปุ๋ย','เสริมอินทรียวัตถุ'],[30,'ตัดแต่งยอด/ตรวจแมลง','ตรวจแปลง','กระตุ้นแตกยอด'],[38,'ใช้น้ำหมักชีวภาพ ครั้งที่ 2','น้ำหมัก','บำรุงก่อนเก็บ'],[45,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','เริ่มตัดยอด/ใบ']]},
      flower:{transplantDay:20,harvestDay:70,tasks:[[0,'เพาะเมล็ด/ปักชำ {crop}','เพาะเมล็ด','เริ่มต้นแผนไม้ดอก'],[7,'ตรวจการงอก/แตกราก','ตรวจแปลง','คัดต้นสมบูรณ์'],[14,'ใช้ไตรโคเดอร์ม่า','ไตรโคเดอร์ม่า','ลดโรคราก'],[20,'ย้ายปลูก {crop}','ย้ายปลูก','ย้ายลงแปลง'],[30,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','เร่งทรงต้น'],[40,'ใช้น้ำหมักชีวภาพ','น้ำหมัก','บำรุงก่อนออกดอก'],[50,'ใช้บิวเวอเรีย','บิวเวอเรีย','ลดแมลง'],[60,'ตรวจดอก/ตัดแต่ง','ตรวจแปลง','จัดคุณภาพดอก'],[70,'เก็บเกี่ยว/ตัดดอก {crop}','เก็บเกี่ยว','พร้อมตัดดอกโดยประมาณ']]},
      field:{transplantDay:0,harvestDay:100,tasks:[[0,'ปลูก/หยอดเมล็ด {crop}','เพาะเมล็ด','เริ่มปลูก'],[7,'ตรวจการงอก','ตรวจแปลง','เช็กแถวปลูกและความชื้น'],[15,'ใช้ไตรโคเดอร์ม่า','ไตรโคเดอร์ม่า','ลดโรคดิน'],[25,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','บำรุงต้น'],[40,'กำจัดวัชพืช/ตรวจแมลง','ตรวจแปลง','ดูวัชพืชและแมลง'],[55,'ใช้น้ำหมักชีวภาพ','น้ำหมัก','บำรุงระยะเจริญ'],[70,'ใส่ปุ๋ยหมัก ครั้งที่ 2','ใส่ปุ๋ย','เสริมก่อนสร้างผลผลิต'],[100,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','พร้อมเก็บเกี่ยวโดยประมาณ']]},
      herbLong:{transplantDay:30,harvestDay:180,tasks:[[0,'เพาะ/ปลูก {crop}','เพาะเมล็ด','เริ่มแปลงสมุนไพร'],[10,'ตรวจการงอก/ตั้งตัว','ตรวจแปลง','ดูความชื้นและต้นอ่อน'],[20,'ใช้ไตรโคเดอร์ม่า','ไตรโคเดอร์ม่า','ลดโรคดิน'],[30,'ย้ายปลูก {crop}','ย้ายปลูก','ย้ายลงแปลงถ้าจำเป็น'],[45,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','บำรุงต้น'],[70,'ใช้น้ำหมักชีวภาพ','น้ำหมัก','บำรุงใบ/หัว'],[100,'ใส่ปุ๋ยหมัก ครั้งที่ 2','ใส่ปุ๋ย','เสริมระยะสะสมอาหาร'],[140,'ตรวจโรคและวัชพืช','ตรวจแปลง','ดูโรคหัว/ราก'],[180,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','เก็บเกี่ยวตามอายุโดยประมาณ']]},
      fruitTree:{transplantDay:0,harvestDay:365,tasks:[[0,'ปลูก {crop}','ย้ายปลูก','เริ่มปลูกไม้ผล'],[7,'ตรวจตั้งตัวหลังปลูก','ตรวจแปลง','ดูใบเหี่ยวและน้ำ'],[15,'ใช้ไตรโคเดอร์ม่า','ไตรโคเดอร์ม่า','ลดโรคราก'],[30,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','บำรุงโคนต้น'],[60,'คลุมโคน/ตรวจระบบน้ำ','ตรวจแปลง','รักษาความชื้น'],[90,'ใช้น้ำหมักชีวภาพ','น้ำหมัก','บำรุงต้น'],[120,'ใส่ปุ๋ยหมัก ครั้งที่ 2','ใส่ปุ๋ย','เสริมการเจริญเติบโต'],[180,'ตัดแต่งกิ่ง/ตรวจโรค','ตรวจแปลง','จัดทรงพุ่ม'],[365,'ประเมินผลผลิต/เก็บเกี่ยว {crop}','เก็บเกี่ยว','ขึ้นกับชนิดและอายุต้น']]},
      treeCrop:{transplantDay:0,harvestDay:730,tasks:[[0,'ปลูก {crop}','ย้ายปลูก','เริ่มปลูกไม้เศรษฐกิจ'],[15,'ตรวจตั้งตัวหลังปลูก','ตรวจแปลง','ดูน้ำและใบเหี่ยว'],[30,'ใช้ไตรโคเดอร์ม่า','ไตรโคเดอร์ม่า','ลดโรคราก'],[60,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','บำรุงโคนต้น'],[120,'กำจัดวัชพืช/คลุมโคน','ตรวจแปลง','ลดการแข่งขันอาหาร'],[180,'ใส่ปุ๋ยหมัก ครั้งที่ 2','ใส่ปุ๋ย','เสริมการเติบโต'],[365,'ประเมินการเจริญเติบโต','ตรวจแปลง','วัดรอดตาย/ความสูง'],[730,'ประเมินระยะเก็บเกี่ยว {crop}','เก็บเกี่ยว','ไม้เศรษฐกิจต้องประเมินตามชนิด']]},
      genericVeg:{transplantDay:15,harvestDay:50,tasks:[[0,'เพาะเมล็ด {crop}','เพาะเมล็ด','เริ่มแผนปลูก'],[3,'ตรวจการงอก','ตรวจแปลง','รักษาความชื้น'],[7,'ใช้ไตรโคเดอร์ม่า','ไตรโคเดอร์ม่า','ป้องกันโรคดิน'],[12,'ใช้น้ำหมักชีวภาพ','น้ำหมัก','บำรุงต้นกล้า'],[15,'ย้ายปลูก {crop}','ย้ายปลูก','ย้ายลงแปลง'],[23,'ใส่ปุ๋ยหมัก ครั้งที่ 1','ใส่ปุ๋ย','เสริมอินทรียวัตถุ'],[32,'ใช้บิวเวอเรีย','บิวเวอเรีย','ป้องกันแมลง'],[38,'ใช้น้ำหมักชีวภาพ ครั้งที่ 2','น้ำหมัก','บำรุงก่อนเก็บ'],[50,'เก็บเกี่ยว {crop}','เก็บเกี่ยว','พร้อมเก็บโดยประมาณ']]}
    };
    const base=P[g]||P.genericVeg;
    return JSON.parse(JSON.stringify(base));
  }

  function makeTemplate(crop, cat){
    const p=profileByCrop(crop, cat);
    const tasks=p.tasks.map(x=>({day:x[0], title:String(x[1]).replace('{crop}', crop), type:x[2], note:x[3]||''}));
    const fertilizerDays=tasks.filter(t=>t.type==='ใส่ปุ๋ย').map(t=>t.day);
    const fermentDays=tasks.filter(t=>t.type==='น้ำหมัก').map(t=>t.day);
    const trichoDays=tasks.filter(t=>t.type==='ไตรโคเดอร์ม่า').map(t=>t.day);
    const beauDays=tasks.filter(t=>t.type==='บิวเวอเรีย').map(t=>t.day);
    return {cropName:crop,cropType:cat,transplantDay:p.transplantDay,harvestDay:p.harvestDay,fertilizerDays,fermentDays,trichoDays,beauDays,tasks};
  }

  safe(()=>{
    patchCategoryCrops();
    const oldDefault = (typeof _farmPlanDefaultTemplateFor==='function') ? _farmPlanDefaultTemplateFor : null;
    window._farmPlanDefaultTemplateForV0630 = function(name, cat){
      const crop=String(name||'Green Oak');
      const type=cat || (typeof cropPlanTemplates==='object' && cropPlanTemplates[crop] && cropPlanTemplates[crop].cropType) || 'พืชผัก';
      const generated=makeTemplate(crop,type);
      const old=oldDefault ? (oldDefault(crop,type)||{}) : {};
      return Object.assign({}, old, generated);
    };
    if(typeof _farmPlanDefaultTemplateFor==='function'){
      _farmPlanDefaultTemplateFor = window._farmPlanDefaultTemplateForV0630;
    }
  });

  safe(()=>{
    if(typeof _mergeDefaultCropPlanTemplates==='function'){
      const oldMerge=_mergeDefaultCropPlanTemplates;
      _mergeDefaultCropPlanTemplates=function(){
        patchCategoryCrops();
        oldMerge();
        if(typeof cropPlanTemplates==='object'){
          Object.entries(EXTRA_CATEGORY_CROPS).forEach(([cat,names])=>{
            names.forEach(name=>{
              const generated=makeTemplate(name,cat);
              cropPlanTemplates[name]=Object.assign({}, generated, cropPlanTemplates[name]||{}, {cropName:name,cropType:cat});
              if(!cropPlanTemplates[name].tasks || !cropPlanTemplates[name].tasks.length){ cropPlanTemplates[name].tasks=generated.tasks; }
            });
          });
        }
      };
      _mergeDefaultCropPlanTemplates();
    }
  });

  safe(()=>{
    if(typeof calculatePlantingPlan==='function'){
      calculatePlantingPlan=function(){
        if(typeof _mergeDefaultCropPlanTemplates==='function') _mergeDefaultCropPlanTemplates();
        const crop=document.getElementById('fp-crop')?.value || 'Green Oak';
        const type=document.getElementById('fp-type')?.value || (cropPlanTemplates&&cropPlanTemplates[crop]?.cropType) || 'พืชผัก';
        const plot=document.getElementById('fp-plot')?.value || 'แปลงผัก A1';
        const qty=document.getElementById('fp-qty')?.value || '';
        const unit=document.getElementById('fp-unit')?.value || 'ต้น';
        const status=document.getElementById('fp-status')?.value || 'กำลังดำเนินการ';
        const start=parseStart(document.getElementById('fp-start')?.value || '');
        let t=Object.assign({}, makeTemplate(crop,type), (cropPlanTemplates&&cropPlanTemplates[crop]) || {});
        if(!Array.isArray(t.tasks) || !t.tasks.length){ t=Object.assign({}, t, makeTemplate(crop,type)); }
        const tasks=[]; let order=1;
        (t.tasks||[]).forEach(item=>{
          const day=Number(item.day||0);
          tasks.push({order:order++,day,date:isoDate(addDaysLocal(start,day)),title:String(item.title||item.type||'งานดูแล').replace('{crop}',crop),type:item.type||'ตรวจแปลง',note:item.note||''});
        });
        tasks.sort((a,b)=>a.day-b.day).forEach((x,i)=>{x.order=i+1;});
        const oldId=(_fpDraft&&_fpDraft.id&&(plantingPlans||[]).some(p=>p.id===_fpDraft.id))?_fpDraft.id:null;
        const nextId='PL-'+(new Date().getFullYear()+543)+'-'+String(((plantingPlans||[]).length||0)+1).padStart(4,'0');
        const harvest=(tasks.find(t=>t.type==='เก็บเกี่ยว')||{}).date || isoDate(addDaysLocal(start,t.harvestDay||45));
        _fpDraft={id:oldId||nextId,cropName:crop,cropType:type,plot,startDate:isoDate(start),harvestDate:harvest,quantity:qty,unit,status,tasks,createdAt:_fpDraft?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
        if(typeof renderPlantingDraft==='function') renderPlantingDraft();
        return _fpDraft;
      };
    }
  });

  safe(()=>{
    renderPlantingTimeline=function(){
      const tl=document.getElementById('fp-timeline');
      if(!tl||!_fpDraft) return;
      const tasks=(_fpDraft.tasks||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
      if(!tasks.length){ tl.innerHTML='<div style="padding:18px;color:#778177;">ยังไม่มีงานดูแล</div>'; return; }
      const marks=unique(tasks.map(t=>t.date)).sort();
      const colWidth=96;
      const gridWidth=Math.max(820,160+(marks.length*colWidth));
      const columns=`160px repeat(${marks.length}, ${colWidth}px)`;
      const head='<div class="fp-time-row fp-time-head" style="grid-template-columns:'+columns+'"><div class="fp-time-label">กิจกรรม</div>'+marks.map(d=>'<div class="fp-time-cell fp-time-date">'+fmtShort(d)+'</div>').join('')+'</div>';
      const rows=tasks.map(t=>'<div class="fp-time-row" style="grid-template-columns:'+columns+'"><div class="fp-time-label">'+icon(t.type)+' '+escText(t.type)+'</div>'+marks.map(d=>'<div class="fp-time-cell">'+(t.date===d?'<span class="fp-dot '+cls(t.type)+'" title="'+escText(t.title)+'">'+escText(t.order)+'</span>':'')+'</div>').join('')+'</div>').join('');
      tl.innerHTML='<div class="fp-time-tip">เลื่อนซ้าย-ขวาเพื่อดูแผนจนจบกิจกรรม</div><div class="fp-timeline-scroll"><div class="fp-timeline-grid" style="min-width:'+gridWidth+'px">'+head+rows+'</div></div>';
    };
  });

  safe(()=>{
    if(typeof renderPlantingDraft==='function'){
      const oldRender=renderPlantingDraft;
      renderPlantingDraft=function(){
        oldRender();
        const box=document.querySelector('.fp-crop-chip-list, .fp-crop-name-list');
        if(box) box.classList.add('fp-chip-list-compact');
      };
    }
  });

  safe(()=>{
    document.addEventListener('DOMContentLoaded',()=>{
      document.querySelectorAll('[class*="version"], .app-version, #app-version').forEach(el=>{ if(/V0\.6\./.test(el.textContent||'')) el.textContent=(el.textContent||'').replace(/V0\.6\.\d+/g,VERSION); });
      if(typeof renderDashboard==='function') renderDashboard();
    });
  });

  console.log('✅ '+VERSION+' Script Leak Restore + Crop Care Templates ready');
})();
