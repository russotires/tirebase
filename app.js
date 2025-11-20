// ---- Config & state ----
// In production, point PROXY_BASE to your server route that forwards to
// https://api.tirebase.io/v1/external and injects the Authorization header.
// Examples were provided earlier (Vercel/Netlify). Keep your API key server-side.
const PROXY_BASE = ""; // e.g. "/api/tirebase" or full URL like "https://yourapp.vercel.app/api/tirebase"
const API_BASE = PROXY_BASE || "https://api.tirebase.io/v1/external";
const state = { apiKey: null, selectedCustomerId: null };

// ---- Helpers ----
function saveKey(key){ localStorage.setItem('TB_API_KEY', key); }
function loadKey(){ return localStorage.getItem('TB_API_KEY'); }
function clearKey(){ localStorage.removeItem('TB_API_KEY'); }
async function tbFetch(path, options){
  if(!state.apiKey) throw new Error('Missing API key');
  const url = API_BASE + path;
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + state.apiKey,
        ...(options && options.headers || {})
      }
    });
  } catch (err) {
    const name = (err && err.name) ? err.name : 'FetchError';
    const msg = (err && err.message) ? err.message : 'Unknown network error';
    throw new Error(`FETCH_ERROR: ${name}: ${msg}.\nLikely CORS or a network block.\nURL=${url}\nORIGIN=${location.origin}`);
  }
  if(!res.ok){
    let text = '';
    try { text = await res.text(); } catch(_){ }
    const body = text && text.length > 400 ? text.slice(0,400) + '…' : text;
    throw new Error(`HTTP ${res.status} ${res.statusText}\nURL=${url}\nResponse: ${body}`);
  }
  return res.json();
}

// ---- UI refs ----
const authCard = document.getElementById('authCard');
const contextCard = document.getElementById('contextCard');
const tabs = document.getElementById('tabs');
const signoutBtn = document.getElementById('signout');
const connectBtn = document.getElementById('connectBtn');
const apiKeyInput = document.getElementById('apiKey');

const useCtxBtn = document.getElementById('useCtxBtn');
const ctxCustomerId = document.getElementById('ctxCustomerId');

const custId = document.getElementById('custId');
const findCustBtn = document.getElementById('findCustBtn');
const custLoading = document.getElementById('custLoading');
const custError = document.getElementById('custError');
const custResult = document.getElementById('custResult');

const tireSearchBtn = document.getElementById('tireSearchBtn');
const tireLoading = document.getElementById('tireLoading');
const tireError = document.getElementById('tireError');
const tireResults = document.getElementById('tireResults');

const storeId = document.getElementById('storeId');
const statusId = document.getElementById('statusId');
const prodId = document.getElementById('prodId');
const qty = document.getElementById('qty');
const price = document.getElementById('price');
const createOrderBtn = document.getElementById('createOrderBtn');
const orderError = document.getElementById('orderError');
const orderMsg = document.getElementById('orderMsg');

const createCustBtn = document.getElementById('createCustomerBtn');
const createCustError = document.getElementById('createCustError');
const createCustMsg = document.getElementById('createCustMsg');

// ---- Tabs ----
function setTab(name){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('section[id^="tab-"]').forEach(s=>s.hidden=true);
  const section = document.getElementById('tab-'+name);
  if(section) section.hidden=false;
}
document.querySelectorAll('.tab-btn').forEach(btn=> btn.addEventListener('click', ()=> setTab(btn.dataset.tab)));

// ---- Auth/init ----
function init(){
  const key = loadKey();
  state.apiKey = key;
  const hasKey = Boolean(key);
  authCard.hidden = hasKey;
  contextCard.hidden = !hasKey;
  tabs.hidden = !hasKey;
  document.getElementById('diagnostics').hidden = !hasKey;
  if (hasKey) setTab('customers');
}
connectBtn.addEventListener('click', ()=>{ const k = apiKeyInput.value.trim(); if(!k) return; saveKey(k); state.apiKey=k; init(); });
signoutBtn.addEventListener('click', ()=>{ clearKey(); state.apiKey=null; init(); });
useCtxBtn.addEventListener('click', ()=>{ const cid = parseInt(ctxCustomerId.value||'0',10); state.selectedCustomerId = isNaN(cid)?null:cid; alert('Using customer ID: ' + (state.selectedCustomerId||'none')); });

// ---- Customers: find by ID ----
findCustBtn.addEventListener('click', async () => {
  custError.textContent=''; custResult.innerHTML=''; custLoading.style.display='flex';
  try {
    const id = parseInt(custId.value || '0', 10);
    const data = await tbFetch(`/customer/find?customer_id=${id}`);
    custResult.innerHTML = `
      <div class="tiny"><b>Basic Info</b></div>
      <div class="grid cols-2 tiny mt-6">
        <div><span class="muted">Name:</span> ${data.first_name || ''} ${data.last_name || ''}</div>
        <div><span class="muted">Business:</span> ${data.business_name || ''}</div>
        <div><span class="muted">Email:</span> ${data.email || ''}</div>
        <div><span class="muted">Phone:</span> ${data.phone_number_1 || ''}</div>
      </div>
      ${'have_tax' in data ? `<div class="tiny mt-6"><span class="pill">Tax Rate</span> ${data.tax_rate_name || 'N/A'} (${data.tax_applied || 0}%)</div>`: ''}
    `;
  } catch(err){ custError.textContent = err.message; }
  finally { custLoading.style.display='none'; }
});

// ---- Create Customer ----
createCustBtn.addEventListener('click', async ()=>{
  createCustError.textContent=''; createCustMsg.textContent='';
  try {
    const payload = {
      first_name: document.getElementById('firstName').value,
      last_name: document.getElementById('lastName').value,
      business_name: document.getElementById('businessName').value,
      contact_person: document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value,
      billing_address_1: document.getElementById('billing1').value,
      billing_address_2: document.getElementById('billing2').value,
      city: document.getElementById('city').value,
      zip_code: document.getElementById('zip').value,
      phone_number_1: document.getElementById('phone').value,
      email: document.getElementById('email').value,
      notes: document.getElementById('notes').value,
      state_id: parseInt(document.getElementById('stateId').value||'1',10),
      customer_type_id: parseInt(document.getElementById('customerTypeId').value||'1',10),
      price_level_id: parseInt(document.getElementById('priceLevelId').value||'0',10) || undefined,
      tax_rate_id: parseInt(document.getElementById('taxRateId').value||'0',10) || undefined,
      store_id: parseInt(document.getElementById('storeIdCreate').value||'1',10),
      default_store_id: parseInt(document.getElementById('defaultStoreId').value||'1',10)
    };
    const required = ['first_name','last_name','business_name','billing_address_1','city','zip_code','phone_number_1','email','state_id','customer_type_id','store_id','default_store_id'];
    for (const key of required){ if(!payload[key]){ throw new Error('Missing required field: ' + key); } }
    const data = await tbFetch('/customer/create', { method:'POST', body: JSON.stringify(payload) });
    createCustMsg.textContent = 'Customer created successfully. ID: ' + data;
    // Optional: auto-select new customer and switch tab
    // state.selectedCustomerId = data; setTab('tires');
  } catch(err){ createCustError.textContent = (err && err.message) ? err.message : String(err); }
});

// ---- Tires: raw size parser ----
function parseRawTireSize(raw){
  if(!raw) return null;
  const digits = String(raw).replace(/\D/g,'');
  if(digits.length < 7) return null; // expect WWWAARR
  const rim = parseInt(digits.slice(-2),10);
  const ar = parseInt(digits.slice(-4,-2),10);
  const w = parseInt(digits.slice(0,3),10);
  if(Number.isNaN(rim) || Number.isNaN(ar) || Number.isNaN(w)) return null;
  if(rim < 10 || rim > 24) return null;
  if(ar < 20 || ar > 85) return null;
  if(w < 125 || w > 425) return null;
  return { width:w, aspect:ar, rim:rim };
}

// ---- Tires search ----
tireSearchBtn.addEventListener('click', async () => {
  tireError.textContent=''; tireResults.innerHTML='';
  const cid = state.selectedCustomerId;
  if(!cid){ tireError.textContent='Select a customer in Quick Context first.'; return; }

  // Prefer raw input if present
  const raw = document.getElementById('rawSize').value.trim();
  if(raw){
    const parsed = parseRawTireSize(raw);
    if(!parsed){
      tireError.textContent = 'Could not parse raw size. Use 7 digits like 2055516 (WWW AARR).';
      return;
    }
    document.getElementById('tw').value  = String(parsed.width);
    document.getElementById('ar').value  = String(parsed.aspect);
    document.getElementById('rim').value = String(parsed.rim);
  }

  const width = document.getElementById('tw').value;
  const aspect = document.getElementById('ar').value;
  const rim = document.getElementById('rim').value;
  const minq = document.getElementById('minq').value;

  tireLoading.style.display='flex';
  try {
    const params = new URLSearchParams({
      tire_width: width,
      aspect_ratio: aspect,
      rim_diameter: rim,
      min_quantity: minq,
      customer_id: String(cid)
    });
    const data = await tbFetch(`/product/searchTireBySize?${params.toString()}`);
    const products = data.products || [];
    if(products.length===0){
      tireResults.innerHTML = '<div class="tiny" style="color:var(--muted)">No products found.</div>'; return;
    }
    tireResults.innerHTML = products.map(p => `
      <div class="card" style="margin-top:8px">
        <div class="row"><div><b>${p.brand || ''}</b> <span class="tiny" style="color:var(--muted)">${p.part_number || p.mfg_product_number || ''}</span></div><span class="pill">Qty by store</span></div>
        <div class="tiny row" style="margin-top:6px">
          <div>FET: ${p.fet ?? '-'}</div>
          <div>Cost: ${p.cost ?? '-'}</div>
          <div>Price: ${p.calculated_price ?? '-'}</div>
        </div>
        <div class="tiny" style="margin-top:6px;color:var(--muted)">
          ${(p.stores||[]).map(s=>`<div class="row"><span>${s.store_name}${s.main_store? ' (Main)':''}</span><b>${s.quantity}</b></div>`).join('')}
        </div>
      </div>
    `).join('');
  } catch(err){
    tireError.textContent = (err && err.message) ? err.message : String(err);
  } finally { tireLoading.style.display='none'; }
});

// ---- Order create ----
createOrderBtn.addEventListener('click', async () => {
  orderError.textContent=''; orderMsg.textContent='';
  const cid = state.selectedCustomerId;
  if(!cid){ orderError.textContent='Select a customer in Quick Context first.'; return; }
  try {
    const now = new Date();
    const payload = {
      store_id: parseInt(storeId.value,10),
      customer_id: cid,
      order_status_id: parseInt(statusId.value,10),
      date_admission: now.toISOString().slice(0,19).replace('T',' '),
      current_datetime: now.toISOString().slice(0,19).replace('T',' '),
      current_date: now.toISOString().slice(0,10),
      order_details: [
        { product_id: parseInt(prodId.value||'0',10), quantity: parseInt(qty.value||'1',10), price: parseFloat(price.value||'0') }
      ]
    };
    const data = await tbFetch('/order/createOrder', { method:'POST', body: JSON.stringify(payload) });
    orderMsg.textContent = 'Order created. ID: ' + (data && data.data ? data.data : '(unknown)');
  } catch(err){ orderError.textContent = (err && err.message) ? err.message : String(err); }
});

// ---- Diagnostics: API probe & UI tests ----
const pingBtn = document.getElementById('pingBtn');
const runTestsBtn = document.getElementById('runTestsBtn');
const diagOut = document.getElementById('diagOut');

pingBtn.addEventListener('click', async ()=>{
  const keyLen = state.apiKey ? state.apiKey.length : 0;
  diagOut.textContent = `API_BASE=${API_BASE}\nKey present: ${!!state.apiKey} (length ${keyLen})\nRunning /store/getStores…`;
  try {
    const res = await tbFetch('/store/getStores');
    const stores = (res && res.data && res.data.stores) ? res.data.stores.length : 0;
    diagOut.textContent += `\nSuccess ✅ Stores: ${stores}`;
  } catch(e){
    diagOut.textContent += `\nFailed ❌\n${(e && e.message) ? e.message : e}`;
    diagOut.textContent += `\nHint: If you see FETCH_ERROR, set PROXY_BASE to a server route (Vercel/Netlify) and store the API key server-side.`;
  }
});

function runTests(){
  const results = [];
  function expect(name, cond){ results.push(`${cond ? '✅' : '❌'} ${name}`); }
  expect('tbFetch is a function', typeof tbFetch === 'function');
  const before = document.getElementById('tab-customers').hidden;
  setTab('customers');
  const after = document.getElementById('tab-customers').hidden;
  expect('setTab("customers") shows the tab', before !== false && after === false);
  expect('#custId exists', !!document.getElementById('custId'));
  expect('#tw exists', !!document.getElementById('tw'));
  expect('#createCustomerBtn exists', !!document.getElementById('createCustomerBtn'));
  // Raw size parser tests
  expect('parseRawTireSize exists', typeof parseRawTireSize === 'function');
  const good = parseRawTireSize('2055516');
  expect('parseRawTireSize("2055516") ok', !!good && good.width===205 && good.aspect===55 && good.rim===16);
  const bad = parseRawTireSize('2055');
  expect('parseRawTireSize("2055") fails', bad===null);
  return results.join('\n');
}
runTestsBtn.addEventListener('click', ()=>{ diagOut.textContent = runTests(); });

// Boot
init();
