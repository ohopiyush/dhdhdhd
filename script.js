// ===== CONFIG: paste your Supabase project URL and anon key =====
const CFG = { url: 'YOUR_SUPABASE_URL', key: 'YOUR_SUPABASE_ANON_KEY' };
const sb = CFG.url.startsWith('http') && window.supabase ? supabase.createClient(CFG.url, CFG.key) : null;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DL = '2026-12-15T23:59:00+05:30';           // fallback deadline; the database value wins
const EV = [ // text content lives here; deadlines are merged in from the database
 {slug:'robo-wars',name:'Robo Wars',venue:'Stage Garden',desc:'Two bots, one arena. Build for control, traction and survival.',rules:['Bot weight limit: 8 kg','Wired or wireless control allowed','No flames, liquids or projectiles','Match ends on knockout or 3-minute timer'],dl:DL},
 {slug:'code-clash',name:'Code Clash',venue:'Conclave Centre',desc:'Timed competitive programming. Correct solutions first, speed second.',rules:['Languages: C, C++, Java, Python','No internet except the problem portal','Ties break on submission time','Plagiarism means disqualification'],dl:DL},
 {slug:'circuitrix',name:'Circuitrix',venue:'J115, 1st Floor, Electronics Department',desc:'Debug, design and build circuits against the clock.',rules:['Components are provided on site','Round 1 is theory, Round 2 is hands-on','No pre-built modules','Judges decide on function and neatness'],dl:DL},
 {slug:'tech-quiz',name:'Tech Quiz',venue:'Colloquium Hall',desc:'Electronics, computing and general tech. Prelims, then a buzzer final.',rules:['Written prelims, top 6 teams advance','No phones during the quiz','Quizmaster\'s decision is final','Negative marking in prelims'],dl:DL}];
const SCHED = [['09:00','Inauguration','Colloquium Hall'],['10:00','Robo Wars','Stage Garden'],['10:30','Code Clash','Conclave Centre'],['11:00','Circuitrix','J115, Electronics Dept'],['14:00','Tech Quiz','Colloquium Hall'],['16:30','Prize distribution','Colloquium Hall']];
const FAQ = [['Who can participate?','Any MITS Gwalior student with a valid college email.'],['What is the team size?','Individual, or a team of 2 to 4 including the registrant.'],['When do registrations close?','15 December 2026, 23:59 IST.'],['Is there a fee?','No. Entry is free.'],['What should I bring?','College ID card. Bring your own laptop for Code Clash.'],['Will there be certificates?','Yes, for every participant.']];
const fmt = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const isOpen = e => new Date(e.dl) > new Date();

async function init() {
  if (sb) { const {data} = await sb.from('events').select('slug,deadline'); (data||[]).forEach(d => { const e = EV.find(x => x.slug === d.slug); if (e) e.dl = d.deadline; }); }
  $('#grid').innerHTML = EV.map(e => `<article class="card" data-s="${e.slug}"><h3>${e.name}</h3><p class="mono">${esc(e.venue)}</p><p>${e.desc}</p>
   <ul class="rules">${e.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
   <p class="mono">Individual or team · max 4 · closes ${fmt(e.dl)}</p><span class="chip ${isOpen(e)?'on':''}">${isOpen(e)?'Open':'Closed'}</span>
   <button class="btn go" data-s="${e.slug}">Register</button><div class="leds">${'<i></i>'.repeat(8)}</div><div class="bar"></div></article>`).join('');
  $('#evsel').innerHTML = EV.map(e => `<option value="${e.slug}">${e.name}</option>`).join('');
  $('#ofilter').innerHTML = '<option value="">All events</option>' + EV.map(e => `<option value="${e.slug}">${e.name}</option>`).join('');
  $('#tl').innerHTML = SCHED.map(s => `<li><b class="mono">${s[0]}</b> ${s[1]}<br><span class="mono">${s[2]}</span></li>`).join('');
  $('#faqs').innerHTML = FAQ.map(f => `<details><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join('');
  syncForm();
}
// card interactions: tilt (mouse), expand (touch), "circuit connect" then scroll to form
const grid = $('#grid');
grid.addEventListener('mousemove', ev => { const c = ev.target.closest('.card'); if (!c || !matchMedia('(hover:hover)').matches) return;
  const r = c.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
  c.style.transform = `rotateX(${-y*12}deg) rotateY(${x*12}deg)`; });
grid.addEventListener('mouseout', ev => { const c = ev.target.closest('.card'); if (c) c.style.transform = ''; });
grid.addEventListener('click', ev => { const b = ev.target.closest('.go');
  if (!b) { ev.target.closest('.card')?.classList.toggle('open'); return; }
  b.classList.add('fire'); setTimeout(() => { b.classList.remove('fire'); $('#evsel').value = b.dataset.s; syncForm(); $('#register').scrollIntoView(); }, 400); });
// countdown to the fest (IST)
const FEST = new Date('2026-12-20T09:00:00+05:30');
setInterval(() => { const d = FEST - new Date(); if (d <= 0) { $('#count').textContent = 'Fest concluded'; return; }
  const p = n => String(n).padStart(2,'0'); $('#count').textContent = `${p(d/864e5|0)}d ${p(d/36e5%24|0)}h ${p(d/6e4%60|0)}m ${p(d/1e3%60|0)}s`; }, 1000);
// ---------- registration form ----------
const F = $('#form');
function check(el) { const t = el.dataset.v, v = el.value.trim(); let e = '';
  if (t === 'enr') el.value = el.value.toUpperCase();
  if (!v) e = 'Required';
  else if (t === 'email' && !/^[^\s@]+@mitsgwl\.ac\.in$/i.test(v)) e = 'Use your @mitsgwl.ac.in email';
  else if (t === 'enr' && !/^[A-Z0-9]{8,15}$/.test(el.value.trim())) e = '8-15 uppercase letters or digits';
  else if (t === 'phone' && !/^[6-9]\d{9}$/.test(v)) e = '10 digits, starting with 6-9';
  el.parentElement.querySelector('small').textContent = e; return !e; }
F.addEventListener('input', ev => { if (ev.target.dataset.v) check(ev.target); });
function syncForm() {
  const e = EV.find(x => x.slug === $('#evsel').value), team = $('#type').value === 'team', open = e && isOpen(e);
  $('#team').hidden = !team; $('#closed').hidden = open; $('#submit').disabled = !open;
  $('#team [name=team_name]').dataset.v = team ? 'req' : '';
  const n = +$('#tsize').value; $('#members').innerHTML = !team ? '' : Array.from({length:n-1},(_,i) => `<h4>Member ${i+2}</h4>
   <label>Name<input data-v="req" data-m="${i}" data-k="name"><small></small></label>
   <label>Enrollment number<input data-v="enr" data-m="${i}" data-k="enrollment"><small></small></label>
   <label>Mobile<input data-v="phone" data-m="${i}" data-k="phone" inputmode="numeric" maxlength="10"><small></small></label>`).join(''); }
['#evsel','#type','#tsize'].forEach(s => $(s).addEventListener('change', syncForm));
const ERR = {CLOSED:'Registration closed for this event.',BAD_TYPE:'This participation type is not allowed.',BAD_SIZE:'Invalid team size.',NO_EVENT:'Unknown event.'};
F.addEventListener('submit', async ev => { ev.preventDefault(); const msg = $('#msg'); msg.textContent = '';
  if (!sb) { msg.textContent = 'Database not configured. Add your Supabase keys in script.js.'; return; }
  const els = [...F.querySelectorAll('[data-v]')].filter(x => x.dataset.v && x.offsetParent !== null);
  if (!els.map(check).every(Boolean)) { msg.textContent = 'Fix the highlighted fields.'; return; }
  const f = Object.fromEntries(new FormData(F)), team = f.type === 'team', members = [];
  F.querySelectorAll('[data-m]').forEach(i => { (members[i.dataset.m] ??= {})[i.dataset.k] = i.value.trim(); });
  const all = [f.enrollment, ...members.map(m => m.enrollment)], emails = [f.email.toLowerCase()];
  if (new Set(all).size !== all.length) { msg.textContent = 'Each team member needs a different enrollment number.'; return; }
  $('#submit').disabled = true;
  const {data, error} = await sb.rpc('register_participant', {p: {event:f.event,type:f.type,team_size:+f.team_size,name:f.name.trim(),email:f.email.trim(),enrollment:f.enrollment.trim(),phone:f.phone,department:f.department,year:f.year,team_name:team?f.team_name:null,members:team?members:[]}});
  $('#submit').disabled = false;
  if (error || !data) { msg.textContent = 'Something went wrong. Try again.'; return; }
  if (data.error) { msg.textContent = data.error === 'DUPLICATE' ? `Already registered for this event${data.who ? ': ' + data.who : ''}.` : ERR[data.error]; return; }
  const t = $('#ticket'); t.hidden = false;
  t.innerHTML = `<span>REGISTRATION CONFIRMED</span><b id="rid">${data.reg_id}</b><p>${esc(f.name)} · ${EV.find(x => x.slug === f.event).name} · ${team ? 'Team ' + esc(f.team_name) + ' (' + f.team_size + ')' : 'Individual'}</p><button class="btn" id="cp">Copy ID</button>`;
  $('#cp').onclick = () => navigator.clipboard.writeText(data.reg_id); F.reset(); syncForm(); t.scrollIntoView(); });
// ---------- my registration ----------
$('#lookup').addEventListener('submit', async ev => { ev.preventDefault(); const out = $('#lres');
  if (!sb) { out.textContent = 'Database not configured.'; return; } out.textContent = 'Loading...';
  const {data} = await sb.rpc('lookup_registration', {q: $('#q').value});
  out.innerHTML = !data || !data.length ? '<p>No registration found.</p>' : data.map(r => `<div class="ticket"><b>${esc(r.reg_id)}</b>${esc(r.name)} · ${esc(r.enrollment)} · ${esc(r.phone)}<br>${esc(EV.find(e => e.slug === r.event)?.name)} · ${esc(r.type)}${r.team_name ? ' · ' + esc(r.team_name) : ''}${r.members.map(m => `<br>+ ${esc(m.name)} ${esc(m.enrollment)}`).join('')}</div>`).join(''); });
// ---------- organiser (credentials only live in memory) ----------
let ORG = [];
$('#olink').onclick = () => { $('#organiser').hidden = false; };
$('#login').addEventListener('submit', async ev => { ev.preventDefault(); const f = new FormData(ev.target);
  const {data, error} = sb ? await sb.rpc('organiser_list', {u: f.get('u'), pw: f.get('pw')}) : {error: 1};
  if (error) { $('#lerr').textContent = 'Invalid credentials'; return; }
  ORG = data; ev.target.reset(); $('#lerr').textContent = ''; $('#login').hidden = true; $('#dash').hidden = false; draw(); });
const evName = s => EV.find(e => e.slug === s)?.name || s;
const view = () => { const q = $('#osearch').value.toLowerCase(), f = $('#ofilter').value;
  return ORG.filter(r => (!f || r.event_slug === f) && JSON.stringify(r).toLowerCase().includes(q)); };
function draw() { const rows = view();
  $('#ocount').textContent = `Total ${ORG.length} · shown ${rows.length} · ` + EV.map(e => `${e.name}: ${ORG.filter(r => r.event_slug === e.slug).length}`).join(' · ');
  $('#tb').innerHTML = rows.length ? rows.map(r => `<tr><td>${esc(r.reg_id)}</td><td>${esc(r.name)}</td><td>${esc(r.enrollment_no)}</td><td>${esc(r.email)}</td><td>${esc(r.phone)}</td><td>${esc(evName(r.event_slug))}</td><td>${esc(r.participation_type)}</td><td>${esc(r.team_name || '-')}</td><td>${new Date(r.created_at).toLocaleString('en-IN')}</td></tr>`).join('') : '<tr><td colspan="9">No registrations yet.</td></tr>'; }
$('#osearch').oninput = $('#ofilter').onchange = draw;
$('#logout').onclick = () => { ORG = []; $('#dash').hidden = true; $('#login').hidden = false; };
$('#csv').onclick = () => { const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['reg_id','name','enrollment','email','phone','event','type','team','size','members','time'];
  const lines = view().map(r => [r.reg_id,r.name,r.enrollment_no,r.email,r.phone,evName(r.event_slug),r.participation_type,r.team_name,r.team_size,r.members.map(m => `${m.name} ${m.enrollment_no} ${m.phone}`).join(' | '),r.created_at].map(q).join(','));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[head.join(','), ...lines].join('\n')], {type:'text/csv'})); a.download = 'technova-registrations.csv'; a.click(); };
// nav + scroll reveal
$('#menu').onclick = () => $('#links').classList.toggle('open'); $('#links').onclick = () => $('#links').classList.remove('open');
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), {threshold:.08}); document.querySelectorAll('.rv').forEach(s => io.observe(s));
init();
