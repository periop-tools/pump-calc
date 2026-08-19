/* ===========================================================
   Pump 藥物速算  app.js
   三種劑量單位，各有各的公式（見下面 UNITS）：
     mcg/kg/min → ml/hr = 劑量 × 體重 × 60 ÷ 濃度(mcg/ml)
     mg/kg/hr   → ml/hr = 劑量 × 體重 ÷ 濃度(mg/ml)        （肌鬆劑）
     mg/hr      → ml/hr = 劑量 ÷ 濃度(mg/ml)               （不看體重）
   資料來源：科內筆記（藥物.md / Adrenergic agent.md / CVS刀.md）＋ 仿單劑量核對
   =========================================================== */

/* ---------- 劑量單位定義 ----------
   要新增一種劑量單位，就在這裡加一組；藥物資料只要寫 doseUnit 指到它。
   c 是 getConc() 回傳的濃度物件（同時帶 mcg/ml 與 mg/ml 兩種數值）。 */
const UNITS = {
  'mcg/kg/min': {
    needWt: true,
    mlhr: (dose, wt, c) => dose * wt * 60 / c.mcg,
    dose: (mlhr, wt, c) => mlhr * c.mcg / (wt * 60)
  },
  'mg/kg/hr': {
    needWt: true,
    mlhr: (dose, wt, c) => dose * wt / c.mg,
    dose: (mlhr, wt, c) => mlhr * c.mg / wt
  },
  'mg/hr': {
    needWt: false,
    mlhr: (dose, wt, c) => dose / c.mg,
    dose: (mlhr, wt, c) => mlhr * c.mg
  }
};

/* ---------- 藥物資料 ----------
   欄位說明：doseUnit = 劑量單位（對應上面 UNITS）、rec = 建議劑量範圍（畫面上唯一顯示的
   臨床資訊，大字）、def = 目標劑量預設值、mixes = 常見泡法快捷鍵、
   concUnit = 濃度欄預設單位（mcg 或 mg）。
   ⚠️ recNote / recept 目前「不顯示在畫面上」（2026-08-18 使用者要求精簡資訊卡），
      保留在資料裡供日後想加回來時使用，改 renderInfo() 即可。 */
const DRUGS = {
  nmb: [
    {
      id: 'esmeron10',
      name: 'Esmeron',
      gen: 'Rocuronium',
      conc: 10, concUnit: 'mg',
      concDesc: '原汁（50 mg / 5 ml vial 直接抽）',
      doseUnit: 'mg/kg/hr',
      rec: [0.3, 0.6], def: 0.5
    },
    {
      id: 'esmeron5',
      name: 'Esmeron',
      gen: 'Rocuronium',
      conc: 5, concUnit: 'mg',
      concDesc: '對半稀釋（50 mg 加到 10 ml）',
      doseUnit: 'mg/kg/hr',
      rec: [0.3, 0.6], def: 0.5
    },
    {
      id: 'nimbex2',
      name: 'Nimbex',
      gen: 'Cisatracurium',
      conc: 2, concUnit: 'mg',
      concDesc: '原汁（10 mg / 5 ml，抽原汁不稀釋）',
      doseUnit: 'mg/kg/hr',
      rec: [0.06, 0.18], def: 0.12
    },
    {
      id: 'nimbex1',
      name: 'Nimbex',
      gen: 'Cisatracurium',
      conc: 1, concUnit: 'mg',
      concDesc: '對半稀釋（10 mg 加到 10 ml）',
      doseUnit: 'mg/kg/hr',
      rec: [0.06, 0.18], def: 0.12
    }
  ],

  vaso: [
    {
      id: 'levophed',
      name: 'Levophed',
      gen: 'Norepinephrine',
      conc: null, concUnit: 'mcg',
      concDesc: '泡法多種，請輸入實際濃度',
      doseUnit: 'mcg/kg/min',
      rec: [0.01, 0.3], def: 0.05,
      alertOver: 0.1, alertMsg: '超過 0.1 需要問過麻醉醫師',
      recept: '強 α1、弱 β2 → 升 SVR、可能 reflex bradycardia、CO 持平',
      mixes: [
        { label: '10 mcg/ml', mcg: 10, how: 'Levophed 2.5 ml + D5W 247.5 ml（總量 250 ml）' },
        { label: '20 mcg/ml', mcg: 20, how: 'Levophed 1 ml + D5W 49 ml（總量 50 ml）' },
        { label: '50 mcg/ml', mcg: 50, how: 'Levophed 2 ml + D5W 38 ml（總量 40 ml）' },
        { label: '64 mcg/ml', mcg: 64, how: 'Levophed 16 mg + D5W 234 ml（總量 250 ml，CVS LA set）' },
        { label: '96 mcg/ml', mcg: 96, how: 'Levophed 24 mg 稀釋至總量 250 ml' }
      ]
    },
    {
      id: 'epinephrine',
      name: 'Epinephrine',
      gen: 'Adrenaline',
      conc: null, concUnit: 'mcg',
      concDesc: '泡法多種，請輸入實際濃度',
      doseUnit: 'mcg/kg/min',
      rec: [0.01, 0.1], def: 0.05,
      recNote: 'CVS 常用 0.01–0.1；敗血性休克可到 0.05–2 mcg/kg/min（依醫囑）',
      recept: '低劑量 β 為主（↑CO、↑冠脈灌注壓），高劑量轉 α（血管收縮）',
      mixes: [
        { label: '10 mcg/ml', mcg: 10, how: 'Epinephrine 2.5 ml + D5W 247.5 ml（總量 250 ml）' },
        { label: '64 mcg/ml', mcg: 64, how: 'Epinephrine 16 mg + D5W 234 ml（總量 250 ml，CVS LA set）' }
      ]
    },
    {
      id: 'dopamine',
      name: 'Dopamine',
      gen: 'Dopamine',
      conc: 3, concUnit: 'mg',
      concDesc: '科內現行泡法 3 mg/ml（可自行改）',
      doseUnit: 'mcg/kg/min',
      rec: [2, 10], def: 5,
      recNote: '速記「5 腎 / 10 心 / 15 血管」；>20 拉血壓無效反增心律不整',
      recept: '劑量依賴：低劑量 D1（腎血管舒張）→ 中劑量 β1（強心）→ 高劑量 α1（升 SVR）',
      mixes: [
        { label: '3 mg/ml', mcg: 3000, how: '科內現行泡法' },
        { label: '1.6 mg/ml', mcg: 1600, how: 'Dopamine 400 mg（2 amp）+ D5W 240 ml（總量 250 ml，LA set）' }
      ]
    },
    {
      id: 'dobutamine',
      name: 'Dobutrex',
      gen: 'Dobutamine',
      conc: null, concUnit: 'mcg',
      concDesc: '請輸入實際濃度',
      doseUnit: 'mcg/kg/min',
      rec: [2, 20], def: 5,
      recNote: '純強心，不升 SVR；低血壓時需搭配升壓劑',
      recept: 'β1++（↑收縮力 → ↑CO）、β2+（↓SVR），↑冠脈血流、↓LV filling pressure',
      mixes: [
        { label: '2 mg/ml', mcg: 2000, how: 'Dobutrex 500 mg（2 amp）+ D5W 210 ml（總量 250 ml，LA set）' }
      ]
    },
    {
      id: 'primacor',
      name: 'Primacor',
      gen: 'Milrinone',
      conc: null, concUnit: 'mcg',
      concDesc: '請輸入實際濃度',
      doseUnit: 'mcg/kg/min',
      rec: [0.375, 0.75], def: 0.375,
      recNote: '通常不開高劑量；每日累積上限 1.13 mg/kg/day（約 0.78 mcg/kg/min）',
      recept: 'PDE3 抑制劑（inodilator）：強心兼降 SVR/PVR，RV 問題與 CPB weaning 常用',
      mixes: [
        { label: '200 mcg/ml', mcg: 200, how: 'Primacor 30 mg（3 amp）+ D5W 120 ml（總量 150 ml，LV set）' }
      ]
    },

    /* --- 以下為降壓藥（2026-08-19 新增）。使用者指定：濃度一律自行輸入，不預設泡法 chip。 --- */
    {
      id: 'ntg',
      name: 'NTG',
      gen: 'Nitroglycerin',
      conc: null, concUnit: 'mcg',
      concDesc: '泡法未定，請輸入實際濃度',
      doseUnit: 'mcg/kg/min',
      rec: [0.1, 5], def: 0.5,
      recNote: '以靜脈擴張為主 → ↓preload；會被 PVC 管路吸附，換管後劑量可能要重調',
      recept: 'NO donor → cGMP → 靜脈擴張為主（高劑量才擴動脈）'
    },
    {
      id: 'isoket',
      name: 'Isoket',
      gen: 'Isosorbide dinitrate',
      conc: null, concUnit: 'mg',
      concDesc: '泡法未定，請輸入實際濃度',
      doseUnit: 'mg/hr',
      rec: [1, 10], def: 2,
      recNote: '醫囑習慣寫 mg/hr，不看體重；作用比 NTG 久',
      recept: '同為 NO donor，靜脈擴張為主'
    },
    {
      id: 'nicardipine',
      name: 'Perdipine',
      gen: 'Nicardipine',
      conc: null, concUnit: 'mg',
      concDesc: '泡法未定，請輸入實際濃度',
      doseUnit: 'mcg/kg/min',
      rec: [0.5, 6], def: 1,
      recNote: '仿單 0.5–6 mcg/kg/min；起效稍慢、作用久，調快後要等一下再評估',
      recept: 'DHP 型鈣離子阻斷劑：擴動脈、降 SVR，不抑制心收縮力'
    },
    {
      id: 'trandate',
      name: 'Trandate',
      gen: 'Labetalol',
      conc: null, concUnit: 'mg',
      concDesc: '泡法未定，請輸入實際濃度',
      doseUnit: 'mg/hr',
      rec: [10, 120], def: 20,
      recNote: '醫囑習慣寫 mg/hr 或 mg/min，不看體重；單次療程累積量一般不超過 300 mg',
      recept: 'α1 + 非選擇性 β 阻斷（β:α 約 7:1 IV）：降壓不反射心搏過速；氣喘／心搏過緩慎用'
    }
  ]
};

/* ---------- 狀態 ---------- */
let cat = 'nmb';
let drug = null;
let concMode = 'direct';

/* ---------- 小工具 ---------- */
const $ = id => document.getElementById(id);

// 目前這支藥的單位規則
function U() {
  return UNITS[unitName()];
}
function unitName() {
  // 還沒選藥時，先用該頁籤的代表單位（肌鬆劑 mg/kg/hr、其餘 mcg/kg/min）
  if (drug) return drug.doseUnit;
  return cat === 'nmb' ? 'mg/kg/hr' : 'mcg/kg/min';
}

// 數字格式化：最多 n 位小數、去掉多餘的 0、千分位
function fmt(n, dec) {
  if (!isFinite(n)) return '—';
  if (dec === undefined) dec = 2;
  const r = Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec);
  return r.toLocaleString('en-US', { maximumFractionDigits: dec });
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- 建立藥物按鈕 ---------- */
function renderDrugs() {
  const box = $('drugList');
  box.innerHTML = '';
  DRUGS[cat].forEach(d => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'drug' + (drug && drug.id === d.id ? ' on' : '');
    b.dataset.id = d.id;
    const concTxt = d.conc === null
      ? '濃度自行輸入'
      : d.conc + ' ' + d.concUnit + '/ml';
    b.innerHTML = '<b>' + esc(d.name) + '</b>' +
                  '<span>' + esc(d.gen) + '</span>' +
                  '<em>' + esc(concTxt) + '</em>';
    b.addEventListener('click', () => selectDrug(d.id));
    box.appendChild(b);
  });
}

/* ---------- 清空所有濃度相關輸入 ----------
   換藥／換頁籤時一定要呼叫。若只重設 concMode 而不清空泡法欄位，
   使用者手動切回「用泡法換算」時會沿用上一支藥的 mg/ml，
   而且數值合法不會跳警告 → 靜默算出錯誤劑量。 */
function resetConcInputs() {
  $('conc').value = '';
  $('mixMg').value = '';
  $('mixMl').value = '';
  $('mixOut').textContent = '＝ 請輸入藥量與總體積';
  $('backMl').value = '';
  $('backOut').textContent = '輸入體重、濃度與 ml/hr 後顯示';
  concMode = 'direct';
  setConcMode();
}

/* ---------- 選藥 ---------- */
function selectDrug(id) {
  drug = DRUGS[cat].find(d => d.id === id);
  renderDrugs();
  renderInfo();
  resetConcInputs();

  // 濃度欄：肌鬆劑固定濃度 → 隱藏；升降壓／強心藥 → 顯示
  const cf = $('concField');
  if (drug.conc !== null && cat === 'nmb') {
    cf.classList.add('hidden');
  } else {
    cf.classList.remove('hidden');
    $('concHint').textContent = '（' + drug.concDesc + '）';
    $('conc').value = drug.conc === null ? '' : drug.conc;
    $('concUnit').value = drug.concUnit;
    renderChips();
  }

  // 目標劑量：帶入預設值，之後由使用者手動 key（拉霸已依使用者要求移除）
  $('dose').value = drug.def;
  syncUnitLabels();

  calc();
}

/* ---------- 畫面上的單位字樣（跟著藥物走） ---------- */
function syncUnitLabels() {
  $('doseUnitLabel').textContent = unitName();
  $('wtHint').textContent = U().needWt
    ? 'kg'
    : 'kg（這支藥的劑量不看體重，可不填）';
}

/* ---------- 藥物資訊卡 ----------
   使用者要求（2026-08-18）：只留建議劑量大字，bolus／備註／作用機轉／濃度全部拿掉。 */
function renderInfo() {
  if (!drug) { $('drugInfo').innerHTML = '<div class="nodrug">請先選擇藥物</div>'; return; }
  $('drugInfo').innerHTML =
    '<div class="bigdose">' + drug.rec[0] + ' – ' + drug.rec[1] + '</div>' +
    '<div class="bigdose-unit">' + esc(drug.doseUnit) + '</div>' +
    (drug.alertMsg ? '<div class="dosealert">⚠️ ' + esc(drug.alertMsg) + '</div>' : '');
}

/* ---------- 常見泡法 chips ---------- */
function renderChips() {
  const box = $('concChips');
  box.innerHTML = '';
  $('chipTip').textContent = '';
  if (!drug || !drug.mixes) return;
  drug.mixes.forEach(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = m.label;
    b.title = m.how;
    b.addEventListener('click', () => {
      concMode = 'direct';
      setConcMode();
      $('conc').value = m.mcg;
      $('concUnit').value = 'mcg';
      $('chipTip').textContent = '📋 ' + m.label + '：' + m.how;
      calc();
    });
    box.appendChild(b);
  });
  $('chipTip').textContent = '↑ 科內常見泡法，點一下帶入（仍請對照實際藥袋）';
}

/* ---------- 濃度模式切換 ---------- */
function setConcMode() {
  document.querySelectorAll('#concSeg button').forEach(b => {
    b.classList.toggle('on', b.dataset.mode === concMode);
  });
  $('modeDirect').classList.toggle('hidden', concMode !== 'direct');
  $('modeMix').classList.toggle('hidden', concMode !== 'mix');
}

/* ---------- 取得目前濃度 ----------
   一律同時回傳 mcg/ml 與 mg/ml，讓三種劑量單位各取所需。 */
function withMg(o) {
  o.mg = o.mcg / 1000;
  return o;
}
function getConc() {
  if (!drug) return { mcg: NaN, mg: NaN };

  // 肌鬆劑：固定濃度
  if (cat === 'nmb') {
    return withMg({ mcg: drug.conc * 1000, raw: drug.conc, unit: 'mg', converted: true });
  }

  if (concMode === 'mix') {
    const mg = parseFloat($('mixMg').value);
    const ml = parseFloat($('mixMl').value);
    if (!(mg > 0) || !(ml > 0)) {
      $('mixOut').textContent = '＝ 請輸入藥量與總體積';
      return { mcg: NaN, mg: NaN };
    }
    const mgPerMl = mg / ml;
    const mcg = mgPerMl * 1000;
    $('mixOut').innerHTML = '＝ ' + fmt(mgPerMl, 4) + ' mg/ml ＝ <b>' + fmt(mcg, 2) + ' mcg/ml</b>' +
      '<br><span style="color:var(--ink2);font-weight:400;font-size:12px">' +
      fmt(mg) + ' mg ÷ ' + fmt(ml) + ' ml × 1000</span>';
    return withMg({ mcg: mcg, raw: mgPerMl, unit: 'mg', converted: true, fromMix: { mg: mg, ml: ml } });
  }

  const v = parseFloat($('conc').value);
  if (!(v > 0)) return { mcg: NaN, mg: NaN };
  const u = $('concUnit').value;
  return u === 'mg'
    ? withMg({ mcg: v * 1000, raw: v, unit: 'mg', converted: true })
    : withMg({ mcg: v, raw: v, unit: 'mcg', converted: false });
}

/* ---------- 主計算 ---------- */
function calc() {
  const res = $('result'), mlhrEl = $('mlhr'), sub = $('resSub');

  if (!drug) {
    res.classList.add('err');
    mlhrEl.textContent = '請先選擇藥物';
    sub.textContent = '';
    $('formulaOne').textContent = '—';
    $('steps').innerHTML = '';
    backCalc();
    return;
  }

  const u = U();
  const wt = parseFloat($('wt').value);
  const dose = parseFloat($('dose').value);
  const c = getConc();

  const miss = [];
  if (u.needWt && !(wt > 0)) miss.push('體重');
  if (!(c.mcg > 0)) miss.push('藥物濃度');
  if (!(dose > 0)) miss.push('目標劑量');

  if (miss.length) {
    res.classList.add('err');
    mlhrEl.textContent = '請輸入：' + miss.join('、');
    sub.textContent = '';
    $('formulaOne').textContent = '—';
    $('steps').innerHTML = '';
    $('genericNote').innerHTML = genericNote();
    backCalc();
    return;
  }

  res.classList.remove('err');
  const mlhr = u.mlhr(dose, wt, c);
  mlhrEl.innerHTML = fmt(mlhr, 2) + '<small>ml/hr</small>';

  // 副標：建議範圍換算成 ml/hr ＋ 超出範圍提醒
  const loMl = u.mlhr(drug.rec[0], wt, c);
  const hiMl = u.mlhr(drug.rec[1], wt, c);
  let s = drug.name + ' ' + fmt(dose, 3) + ' ' + unitName() +
          (u.needWt ? ' ・ ' + fmt(wt, 1) + ' kg' : '') + '<br>' +
          '建議範圍 ' + drug.rec[0] + '–' + drug.rec[1] + ' ' + unitName() + ' ＝ ' +
          fmt(loMl, 2) + ' – ' + fmt(hiMl, 2) + ' ml/hr';
  if (dose < drug.rec[0]) s += '<br>⚠️ 目前劑量低於建議範圍';
  if (dose > drug.rec[1]) s += '<br>⚠️ 目前劑量高於建議範圍，請再確認醫囑';
  else if (drug.alertOver !== undefined && dose > drug.alertOver) s += '<br>⚠️ ' + drug.alertMsg;
  sub.innerHTML = s;

  renderFormula(wt, dose, c, mlhr);
  backCalc();
}

/* ---------- 算式（一行 + 逐步） ----------
   三種劑量單位各有一套講法，別把 mcg/kg/min 那套硬套到別的單位上。 */
function renderFormula(wt, dose, c, mlhr) {
  const unit = unitName();
  const li = [];

  if (unit === 'mg/kg/hr') {
    /* 肌鬆劑：劑量與濃度同為 mg，公式最短 —— 不用 ×1000，也不用 ×60 */
    $('formulaOne').innerHTML =
      '<span class="hl">' + fmt(dose, 3) + '</span> mg/kg/hr × ' +
      '<span class="hl">' + fmt(wt, 1) + '</span> kg ÷ ' +
      '<span class="hl">' + fmt(c.mg, 4) + '</span> mg/ml ＝ ' +
      '<b>' + fmt(mlhr, 2) + ' ml/hr</b>';

    const perHr = dose * wt;

    if (c.fromMix) {
      li.push('先算出藥袋濃度：<span class="calc">' + fmt(c.fromMix.mg) + ' mg ÷ ' + fmt(c.fromMix.ml) +
              ' ml = ' + fmt(c.mg, 4) + ' mg/ml</span>' +
              '<span class="why">濃度＝總藥量 ÷ 總體積。「總體積」是藥＋稀釋液全部加起來的量。</span>');
    } else {
      li.push('確認濃度：<span class="calc">' + fmt(c.mg, 4) + ' mg/ml</span>，不用換算' +
              '<span class="why">劑量是 mg、濃度也是 mg/ml，兩邊單位一樣就能直接除，<b>不用 ×1000</b>。</span>');
    }

    li.push('算這位病人<b>每小時</b>需要多少藥：<span class="calc">' + fmt(dose, 3) + ' mg/kg/hr × ' +
            fmt(wt, 1) + ' kg = ' + fmt(perHr, 3) + ' mg/hr</span>' +
            '<span class="why">劑量是「每公斤每小時」，乘上體重才是這位病人的量。單位本來就是每小時，<b>不用再 ×60</b>。</span>');

    li.push('每小時的藥量 ÷ 濃度 ＝ 要打幾 ml：<span class="calc">' + fmt(perHr, 3) + ' mg/hr ÷ ' +
            fmt(c.mg, 4) + ' mg/ml = ' + fmt(mlhr, 2) + ' ml/hr</span>' +
            '<span class="why">濃度是「每 1 ml 裡有幾 mg 藥」，用藥量去除，就知道要打幾 ml。</span>');

  } else if (unit === 'mg/hr') {
    /* 不看體重：醫囑直接就是每小時幾 mg */
    $('formulaOne').innerHTML =
      '<span class="hl">' + fmt(dose, 3) + '</span> mg/hr ÷ ' +
      '<span class="hl">' + fmt(c.mg, 4) + '</span> mg/ml ＝ ' +
      '<b>' + fmt(mlhr, 2) + ' ml/hr</b>';

    if (c.fromMix) {
      li.push('先算出藥袋濃度：<span class="calc">' + fmt(c.fromMix.mg) + ' mg ÷ ' + fmt(c.fromMix.ml) +
              ' ml = ' + fmt(c.mg, 4) + ' mg/ml</span>' +
              '<span class="why">濃度＝總藥量 ÷ 總體積。「總體積」是藥＋稀釋液全部加起來的量。</span>');
    } else {
      li.push('確認濃度：<span class="calc">' + fmt(c.mg, 4) + ' mg/ml</span>' +
              '<span class="why">若藥袋寫 mcg/ml，記得 ÷1000 換成 mg/ml（上面單位選 mcg/ml 的話程式會自動換）。</span>');
    }

    li.push('這支藥的劑量<b>不看體重</b>：醫囑寫 <span class="calc">' + fmt(dose, 3) + ' mg/hr</span>，' +
            '就是每小時要進去這麼多藥' +
            '<span class="why">Isoket、Trandate 的醫囑習慣是「每小時幾 mg」，跟病人幾公斤無關，<b>不要乘體重</b>。</span>');

    li.push('每小時的藥量 ÷ 濃度 ＝ 要打幾 ml：<span class="calc">' + fmt(dose, 3) + ' mg/hr ÷ ' +
            fmt(c.mg, 4) + ' mg/ml = ' + fmt(mlhr, 2) + ' ml/hr</span>' +
            '<span class="why">濃度是「每 1 ml 裡有幾 mg 藥」，用藥量去除，就知道要打幾 ml。</span>');

  } else {
    /* mcg/kg/min：升壓藥與 NTG / Perdipine */
    $('formulaOne').innerHTML =
      '<span class="hl">' + fmt(dose, 3) + '</span> mcg/kg/min × ' +
      '<span class="hl">' + fmt(wt, 1) + '</span> kg × ' +
      '<span class="hl">60</span> min ÷ ' +
      '<span class="hl">' + fmt(c.mcg, 2) + '</span> mcg/ml ＝ ' +
      '<b>' + fmt(mlhr, 2) + ' ml/hr</b>';

    const perMin = dose * wt;
    const perHr = perMin * 60;

    if (c.fromMix) {
      li.push('先算出藥袋濃度：<span class="calc">' + fmt(c.fromMix.mg) + ' mg ÷ ' + fmt(c.fromMix.ml) +
              ' ml = ' + fmt(c.raw, 4) + ' mg/ml</span>，再 × 1000 ＝ <span class="calc">' +
              fmt(c.mcg, 2) + ' mcg/ml</span>' +
              '<span class="why">濃度＝總藥量 ÷ 總體積。注意「總體積」是藥＋稀釋液全部加起來的量。</span>');
    } else if (c.converted) {
      li.push('把濃度換成 mcg/ml：<span class="calc">' + fmt(c.raw, 4) + ' mg/ml × 1000 = ' +
              fmt(c.mcg, 2) + ' mcg/ml</span>' +
              '<span class="why">劑量的單位是 mcg，濃度也要先換成 mcg 才能相除。1 mg ＝ 1000 mcg。</span>');
    } else {
      li.push('濃度本來就是 <span class="calc">' + fmt(c.mcg, 2) + ' mcg/ml</span>，不用換算' +
              '<span class="why">如果藥袋寫的是 mg/ml，記得先 × 1000 變成 mcg/ml。</span>');
    }

    li.push('算這位病人<b>每分鐘</b>需要多少藥：<span class="calc">' + fmt(dose, 3) + ' mcg/kg/min × ' +
            fmt(wt, 1) + ' kg = ' + fmt(perMin, 2) + ' mcg/min</span>' +
            '<span class="why">劑量是「每公斤每分鐘」，乘上體重才是這位病人的量。</span>');

    li.push('換成<b>每小時</b>：<span class="calc">' + fmt(perMin, 2) + ' mcg/min × 60 = ' +
            fmt(perHr, 2) + ' mcg/hr</span>' +
            '<span class="why">pump 設定的單位是 ml/<u>hr</u>，所以要把「每分鐘」變成「每小時」。這個 60 最常被忘記。</span>');

    li.push('每小時的藥量 ÷ 濃度 ＝ 要打幾 ml：<span class="calc">' + fmt(perHr, 2) + ' mcg/hr ÷ ' +
            fmt(c.mcg, 2) + ' mcg/ml = ' + fmt(mlhr, 2) + ' ml/hr</span>' +
            '<span class="why">濃度是「每 1 ml 裡有幾 mcg 藥」，用藥量去除，就知道要打幾 ml。</span>');
  }

  $('steps').innerHTML = li.map(x => '<li>' + x + '</li>').join('');
  $('genericNote').innerHTML = genericNote();
}

function genericNote() {
  const unit = unitName();
  const head = '<b>一句話記住：</b><br><span style="font-family:Consolas,monospace;color:var(--brand);font-weight:700">';

  if (unit === 'mg/kg/hr') {
    return head + 'ml/hr ＝ 劑量(mg/kg/hr) × 體重 ÷ 濃度(mg/ml)</span><br><br>' +
      '<b>最常錯的兩個地方：</b><br>' +
      '① 濃度拿 <b>mcg/ml</b> 去除（劑量是 mg，濃度也要用 mg/ml）→ 答案會差 1000 倍。<br>' +
      '② 多乘了一個 <b>60</b>：這個單位<u>已經是每小時</u>，不用再從每分鐘換算。';
  }
  if (unit === 'mg/hr') {
    return head + 'ml/hr ＝ 劑量(mg/hr) ÷ 濃度(mg/ml)</span><br><br>' +
      '<b>最常錯的兩個地方：</b><br>' +
      '① 多乘了<b>體重</b>：這支藥的醫囑不看公斤數。<br>' +
      '② 濃度單位沒對齊：劑量是 mg，濃度要用 <b>mg/ml</b>。';
  }
  return head + 'ml/hr ＝ 劑量 × 體重 × 60 ÷ 濃度(mcg/ml)</span><br><br>' +
    '<b>最常錯的兩個地方：</b><br>' +
    '① 藥袋是 <b>mg/ml</b> 卻直接拿去除 → 答案會差 1000 倍。<br>' +
    '② 忘了 <b>× 60</b>（把每分鐘的量當成每小時）→ 答案會小 60 倍。';
}

/* ---------- 反算 ---------- */
function backCalc() {
  const out = $('backOut');
  const wt = parseFloat($('wt').value);
  const ml = parseFloat($('backMl').value);
  const c = getConc();

  if (!drug) { out.textContent = '輸入體重、濃度與 ml/hr 後顯示'; return; }

  const u = U();
  if ((u.needWt && !(wt > 0)) || !(c.mcg > 0) || !(ml > 0)) {
    out.textContent = u.needWt
      ? '輸入體重、濃度與 ml/hr 後顯示'
      : '輸入濃度與 ml/hr 後顯示（這支藥不看體重）';
    return;
  }

  const dose = u.dose(ml, wt, c);
  const unit = unitName();
  let h;

  if (unit === 'mg/kg/hr') {
    h = '<span class="hl">' + fmt(ml, 2) + '</span> ml/hr × ' +
        '<span class="hl">' + fmt(c.mg, 4) + '</span> mg/ml ÷ ' +
        '<span class="hl">' + fmt(wt, 1) + '</span> kg ＝ ' +
        '<b>' + fmt(dose, 3) + ' mg/kg/hr</b>';
  } else if (unit === 'mg/hr') {
    h = '<span class="hl">' + fmt(ml, 2) + '</span> ml/hr × ' +
        '<span class="hl">' + fmt(c.mg, 4) + '</span> mg/ml ＝ ' +
        '<b>' + fmt(dose, 3) + ' mg/hr</b>';
  } else {
    h = '<span class="hl">' + fmt(ml, 2) + '</span> ml/hr × ' +
        '<span class="hl">' + fmt(c.mcg, 2) + '</span> mcg/ml ÷ (' +
        '<span class="hl">' + fmt(wt, 1) + '</span> kg × <span class="hl">60</span>) ＝ ' +
        '<b>' + fmt(dose, 3) + ' mcg/kg/min</b>';
  }

  const range = '（' + drug.rec[0] + '–' + drug.rec[1] + ' ' + unit + '）';
  if (dose < drug.rec[0]) h += '<br>⚠️ 低於 ' + drug.name + ' 建議範圍' + range;
  else if (dose > drug.rec[1]) h += '<br>⚠️ 高於 ' + drug.name + ' 建議範圍' + range;
  else if (drug.alertOver !== undefined && dose > drug.alertOver) h += '<br>⚠️ ' + drug.alertMsg;
  out.innerHTML = h;
}

/* ---------- 事件綁定 ---------- */
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
    t.classList.add('on');
    cat = t.dataset.cat;
    drug = null;
    resetConcInputs();   // 體重刻意保留：同一台刀換藥時病人沒變
    $('concChips').innerHTML = '';
    $('chipTip').textContent = '';
    $('concField').classList.add('hidden');
    $('dose').value = '';
    syncUnitLabels();
    renderDrugs();
    renderInfo();
    calc();
  });
});

document.querySelectorAll('#concSeg button').forEach(b => {
  b.addEventListener('click', () => {
    concMode = b.dataset.mode;
    setConcMode();
    calc();
  });
});

['wt', 'dose', 'conc', 'mixMg', 'mixMl', 'backMl'].forEach(id => $(id).addEventListener('input', calc));
$('concUnit').addEventListener('change', calc);

/* ---------- 初始化 ---------- */
renderDrugs();
renderInfo();
syncUnitLabels();
$('concField').classList.add('hidden');
calc();

/* ---------- PWA ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
