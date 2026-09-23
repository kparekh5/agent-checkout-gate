// Agent Checkout Gate — small client-side demo.
// No real payments, no backend, no network calls except loading this page.

const SCENARIOS = [
  {
    id: 'headphones',
    label: 'Buy headphones',
    userMsg: 'Find me noise-cancelling headphones under $150 and buy the best one.',
    searchTool: 'list_products',
    searchArgs: { query: 'noise-cancelling headphones', max_price: 150 },
    product: { id: 'acme-qc-42', name: 'Acme QC-42 headphones', price: 128.00 },
    altProduct: { id: 'acme-qc-lite', name: 'Acme QC Lite headphones', price: 79.00 },
    found: 'Found "Acme QC-42" at $128.00, in stock, 4.6★.',
    foundAlt: 'The Acme QC Lite is $79.00, in stock, 4.2★. Lower price point, still noise-cancelling.',
  },
  {
    id: 'hotel',
    label: 'Book a hotel',
    userMsg: 'Book me a hotel in Seattle for two nights, under $220 a night.',
    searchTool: 'search_stays',
    searchArgs: { city: 'Seattle', nights: 2, max_nightly: 220 },
    product: { id: 'pike-place-inn', name: 'Pike Place Inn, 2 nights', price: 398.00 },
    altProduct: { id: 'budget-inn-seattle', name: 'Budget Inn Seattle, 2 nights', price: 210.00 },
    found: 'Found Pike Place Inn, $199/night, 2 nights = $398.00, free cancellation.',
    foundAlt: 'Budget Inn Seattle is $105/night, 2 nights = $210.00, no cancellation.',
  },
  {
    id: 'subscription',
    label: 'Upgrade a subscription',
    userMsg: 'Upgrade my analytics plan to whatever tier supports 5 team seats.',
    searchTool: 'list_plans',
    searchArgs: { min_seats: 5 },
    product: { id: 'team-tier', name: 'Team tier, 5 seats / mo', price: 149.00 },
    altProduct: { id: 'starter-tier', name: 'Starter tier, 3 seats / mo', price: 89.00 },
    found: 'Team tier supports 5 seats at $149.00/mo, billed monthly.',
    foundAlt: 'Starter tier only covers 3 seats, but it is $89.00/mo if that works instead.',
  },
];

const chat = document.getElementById('chat');
const log = document.getElementById('log');
const gate = document.getElementById('gate');
const gateAmt = document.getElementById('gateAmt');
const gateNote = document.getElementById('gateNote');
const approveBtn = document.getElementById('approveBtn');
const denyBtn = document.getElementById('denyBtn');
const replayBtn = document.getElementById('replay');
const scenarioBar = document.getElementById('scenarios');
const auditLog = document.getElementById('auditLog');
const clearLogBtn = document.getElementById('clearLog');

const LOG_KEY = 'agent-checkout-gate:audit-log';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function addMsg(who, text) {
  const el = document.createElement('div');
  el.className = 'msg ' + (who === 'You' ? 'user' : 'agent');
  el.innerHTML = '<div class="who">' + who + '</div>' + text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function addCall(name, args, status) {
  const el = document.createElement('div');
  el.className = 'call';
  const statusHtml = status === 'gate'
    ? '<span class="gate"> ⏸ waiting for human approval</span>'
    : status === 'ok' ? '<span class="ok"> ✓ ok</span>' : '';
  el.innerHTML = '<span class="name">' + name + '(</span>...<span class="name">)</span>' + statusHtml +
    '<pre>' + JSON.stringify(args, null, 2) + '</pre>';
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function resolveCall(el, approved) {
  el.querySelector('.gate')?.remove();
  const span = document.createElement('span');
  span.className = approved ? 'ok' : 'gate';
  span.textContent = approved ? ' ✓ approved by human, charge completed' : ' ✕ denied by human, charge cancelled';
  el.insertBefore(span, el.querySelector('pre'));
}

// --- Persistent audit log (localStorage) ---

function loadLog() {
  try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
  catch { return []; }
}

function saveLogEntry(entry) {
  const entries = loadLog();
  entries.unshift(entry);
  localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(0, 20)));
  renderLog();
}

function renderLog() {
  const entries = loadLog();
  if (!entries.length) {
    auditLog.innerHTML = '<div class="empty">No decisions yet, run a scenario below.</div>';
    return;
  }
  auditLog.innerHTML = entries.map(e => (
    '<div class="row ' + e.decision + '">' +
      '<span>' + e.time + '</span>' +
      '<span>' + e.item + '</span>' +
      '<span>$' + e.amount.toFixed(2) + '</span>' +
      '<span class="decision">' + e.decision + '</span>' +
    '</div>'
  )).join('');
}

clearLogBtn.onclick = () => { localStorage.removeItem(LOG_KEY); renderLog(); };

// --- Gate: pause execution until a human clicks approve/deny ---

let resolveGate = null;
approveBtn.onclick = () => { if (resolveGate) { resolveGate(true); resolveGate = null; } };
denyBtn.onclick = () => { if (resolveGate) { resolveGate(false); resolveGate = null; } };

async function askApproval(item, amount) {
  gateAmt.textContent = '$' + amount.toFixed(2) + ' → ' + item;
  gateNote.textContent = 'submit_payment() is eligible, but blocked until a human explicitly approves it.';
  gate.classList.add('show');
  const approved = await new Promise(res => { resolveGate = res; });
  gate.classList.remove('show');
  saveLogEntry({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    item, amount, decision: approved ? 'approved' : 'denied',
  });
  return approved;
}

// --- Scenario runner ---

let activeBtn = null;

function setActive(btn) {
  activeBtn?.classList.remove('active');
  btn.classList.add('active');
  activeBtn = btn;
}

async function runScenario(s) {
  chat.innerHTML = '';
  log.innerHTML = '';
  gate.classList.remove('show');

  await wait(250);
  addMsg('You', s.userMsg);

  await wait(650);
  addMsg('Agent', "On it. I'll search, pick the best match, then confirm the purchase with you before paying.");

  await wait(600);
  addCall(s.searchTool, s.searchArgs, 'ok');

  await wait(650);
  addMsg('Agent', s.found + ' Ready to check out whenever you approve.');

  await wait(600);
  const callEl = addCall('submit_payment', { item_id: s.product.id, amount: s.product.price.toFixed(2), currency: 'usd' }, 'gate');
  const firstApproved = await askApproval(s.product.name, s.product.price);
  resolveCall(callEl, firstApproved);

  if (firstApproved) {
    await wait(200);
    addMsg('Agent', 'Done, charged $' + s.product.price.toFixed(2) + '. Confirmation would go to your email.');
    return;
  }

  await wait(300);
  addMsg('Agent', 'Understood, cancelled. ' + s.foundAlt + ' Want me to go with that instead?');

  await wait(600);
  const altCallEl = addCall('submit_payment', { item_id: s.altProduct.id, amount: s.altProduct.price.toFixed(2), currency: 'usd' }, 'gate');
  const secondApproved = await askApproval(s.altProduct.name, s.altProduct.price);
  resolveCall(altCallEl, secondApproved);

  await wait(200);
  if (secondApproved) {
    addMsg('Agent', 'Done, charged $' + s.altProduct.price.toFixed(2) + ' for the alternative. Confirmation would go to your email.');
  } else {
    addMsg('Agent', "Okay, I'll stop here. Nothing was charged, let me know if you'd like other options.");
  }
}

function buildScenarioBar() {
  SCENARIOS.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'scenario-btn';
    btn.textContent = s.label;
    btn.onclick = () => { setActive(btn); runScenario(s); };
    scenarioBar.appendChild(btn);
    if (i === 0) { setActive(btn); }
  });
}

replayBtn.onclick = () => { if (activeBtn) { runScenario(SCENARIOS.find(s => s.label === activeBtn.textContent)); } };

buildScenarioBar();
renderLog();
runScenario(SCENARIOS[0]);
