const container = document.getElementById('scrollWrap');
const masterToggle = document.getElementById('masterToggle');
const resetAllBtn = document.getElementById('resetAllBtn');
const totalOutShared = document.getElementById('totalOutShared');
const units = [];
let masterRunning = false;
let masterTimer = null;
let sharedTotal = 0;

const DEFAULTS = [629, 600, 550];
const STORAGE_KEY = 'slot-counter-denoms';

function loadDenomMemory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveDenom(id, value) {
  const mem = loadDenomMemory();
  mem[id] = value;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mem));
  } catch (e) {}
}

function median(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function createUnit(id, defaultDenom) {
  const denomMemory = loadDenomMemory();
  const savedDenom = denomMemory[id] || defaultDenom;

  const wrap = document.createElement('div');
  wrap.className = 'unit';
  wrap.innerHTML = `
    <div class="denom-row">
      <span>1/</span>
      <input type="number" class="denom-input" id="denom-${id}" value="${savedDenom}" min="1" step="1" />
    </div>

    <div class="top-row">
      <div class="hit-box" id="hitBox-${id}">
        <div class="flash-bg" id="flashBg-${id}"></div>
        <p class="hit-label">あたり</p>
        <p class="outline-num hit-num" id="hitOut-${id}">0</p>
      </div>
      <div class="since-box">
        <p class="since-label">現在G</p>
        <p class="since-num" id="sinceOut-${id}">0</p>
      </div>
    </div>

    <div class="stats-line">
      <span>実確率 <b id="probOut-${id}">-</b></span>
      <span>平均 <b id="avgGapOut-${id}">-</b></span>
      <span>中央値 <b id="medianGapOut-${id}">-</b></span>
    </div>

    <div class="log-wrap">
      <table>
        <thead>
          <tr><th>#</th><th>G</th><th>累計</th></tr>
        </thead>
        <tbody id="logBody-${id}"></tbody>
      </table>
      <div class="empty-state" id="emptyState-${id}">なし</div>
    </div>
  `;
  container.appendChild(wrap);

  const state = {
    id, total: 0, hits: 0, sinceLast: 0, gaps: [],
    denomInput: document.getElementById(`denom-${id}`),
    hitOut: document.getElementById(`hitOut-${id}`),
    sinceOut: document.getElementById(`sinceOut-${id}`),
    flashBg: document.getElementById(`flashBg-${id}`),
    probOut: document.getElementById(`probOut-${id}`),
    avgGapOut: document.getElementById(`avgGapOut-${id}`),
    medianGapOut: document.getElementById(`medianGapOut-${id}`),
    logBody: document.getElementById(`logBody-${id}`),
    emptyState: document.getElementById(`emptyState-${id}`),
  };

  state.denomInput.addEventListener('change', () => {
    saveDenom(id, state.denomInput.value);
  });

  function addRow(hitNum, gap, cumulative, gapSetTarget) {
    const tr = document.createElement('tr');
    if (gap < gapSetTarget) tr.classList.add('row-good');
    tr.innerHTML = `
      <td>${hitNum}</td>
      <td>${gap.toLocaleString()}</td>
      <td>${cumulative.toLocaleString()}</td>
    `;
    state.logBody.prepend(tr);
    while (state.logBody.children.length > 20) state.logBody.removeChild(state.logBody.lastChild);
  }

  state.spin = function () {
    let denom = parseInt(state.denomInput.value, 10);
    if (!denom || denom < 1) denom = 1;
    const prob = 1 / denom;
    state.total++;
    state.sinceLast++;
    const isHit = Math.random() < prob;
    if (isHit) {
      state.hits++;
      state.gaps.push(state.sinceLast);
      state.emptyState.style.display = 'none';
      const actualProb = state.hits / state.total;
      addRow(state.hits, state.sinceLast, state.total, denom);
      state.sinceLast = 0;
      state.flashBg.classList.remove('playing');
      void state.flashBg.offsetWidth;
      state.flashBg.classList.add('playing');
    }
    state.hitOut.textContent = state.hits.toLocaleString();
    state.sinceOut.textContent = state.sinceLast.toLocaleString();
    state.probOut.textContent = state.hits > 0 ? `1/${(state.total / state.hits).toFixed(1)}` : '-';
    if (state.gaps.length > 0) {
      const avg = state.gaps.reduce((a, b) => a + b, 0) / state.gaps.length;
      state.avgGapOut.textContent = `${avg.toFixed(1)}G`;
      state.medianGapOut.textContent = `${median(state.gaps).toFixed(1)}G`;
    }
  };

  state.reset = function () {
    state.total = 0; state.hits = 0; state.sinceLast = 0; state.gaps = [];
    state.hitOut.textContent = '0';
    state.sinceOut.textContent = '0';
    state.probOut.textContent = '-';
    state.avgGapOut.textContent = '-';
    state.medianGapOut.textContent = '-';
    state.logBody.innerHTML = '';
    state.emptyState.style.display = 'block';
    state.flashBg.classList.remove('playing');
  };

  units.push(state);
}

function setMasterRunning(running) {
  masterRunning = running;
  if (masterRunning) {
    masterToggle.innerHTML = '<i class="ti ti-player-pause"></i>OFF';
    units.forEach(u => u.denomInput.disabled = true);
    masterTimer = setInterval(() => {
      units.forEach(u => u.spin());
      sharedTotal++;
      totalOutShared.textContent = sharedTotal.toLocaleString();
    }, 15);
  } else {
    masterToggle.innerHTML = '<i class="ti ti-player-play"></i>ON';
    units.forEach(u => u.denomInput.disabled = false);
    clearInterval(masterTimer);
  }
}

masterToggle.addEventListener('click', () => setMasterRunning(!masterRunning));
resetAllBtn.addEventListener('click', () => {
  setMasterRunning(false);
  units.forEach(u => u.reset());
  sharedTotal = 0;
  totalOutShared.textContent = '0';
});

DEFAULTS.forEach((denom, i) => createUnit(i + 1, denom));
