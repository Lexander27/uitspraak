(() => {
  'use strict';

  // ---------- hulpjes ----------
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = w => String(w).toLowerCase().trim();
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pad = n => String(n).padStart(2, '0');
  const dstr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return dstr(d); };

  const IC = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'
  };

  // ---------- opslag ----------
  const KEY = 'uitspraak_v1';
  const REFKEY = 'uitspraak_ref_v1';
  const fresh = () => ({ progress: {}, pairs: {}, custom: [], days: {}, settings: { uk: true, real: true } });
  let store = (() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY)) || {};
      const f = fresh();
      return { ...f, ...s, settings: { ...f.settings, ...(s.settings || {}) } };
    } catch (e) { return fresh(); }
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* vol of geblokkeerd */ } };

  let refCache = {};
  try { refCache = JSON.parse(localStorage.getItem(REFKEY)) || {}; } catch (e) { refCache = {}; }

  // ---------- woorden en herhaling ----------
  const NEW_PER_DAY = 6;
  const INTERVALS = [0, 1, 3, 7, 14, 30]; // dagen per niveau

  function allItems() {
    const out = [];
    for (const c of store.custom) out.push({ w: c.w, uk: c.uk || '', sound: 'eigen' });
    const max = Math.max(...SOUNDS.map(s => s.words.length));
    for (let i = 0; i < max; i++) for (const s of SOUNDS) if (s.words[i]) out.push({ w: s.words[i][0], uk: s.words[i][1], sound: s.id });
    return out;
  }
  const soundItems = s => s.words.map(([w, uk]) => ({ w, uk, sound: s.id }));
  const prog = w => store.progress[norm(w)];

  function rate(item, r) {
    const k = norm(item.w), t = dstr();
    const p = store.progress[k] || { box: 0, n: 0, first: t };
    if (r === 'nee') { p.box = 0; p.due = t; }
    else if (r === 'bijna') { p.box = Math.max(1, p.box); p.due = addDays(1); }
    else { p.box = Math.min(5, p.box + 1); p.due = addDays(INTERVALS[p.box]); }
    p.n++; p.last = t;
    store.progress[k] = p;
    store.days[t] = (store.days[t] || 0) + 1;
    save();
  }

  function todayPlan() {
    const t = dstr(), items = allItems(), seen = new Set();
    const uniq = items.filter(i => { const k = norm(i.w); if (seen.has(k)) return false; seen.add(k); return true; });
    const due = uniq.filter(i => { const p = prog(i.w); return p && p.due <= t; });
    const startedToday = Object.values(store.progress).filter(p => p.first === t).length;
    const quota = Math.max(0, NEW_PER_DAY - startedToday);
    const nieuw = uniq.filter(i => !prog(i.w)).slice(0, quota);
    return { due, nieuw };
  }

  function streak() {
    let n = 0; const d = new Date();
    if (!store.days[dstr(d)]) d.setDate(d.getDate() - 1);
    while (store.days[dstr(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  function soundStats(s) {
    let sum = 0, n = 0;
    for (const [w] of s.words) { const p = prog(w); if (p) { n++; sum += Math.min(p.box, 4); } }
    return { pct: Math.round(sum / (s.words.length * 4) * 100), n, total: s.words.length };
  }
  const dotClass = w => { const p = prog(w); return !p ? '' : p.box >= 3 ? 'ok' : 'busy'; };

  // ---------- audio: voorbeeld ----------
  const player = new Audio();
  player.preload = 'auto';
  let playTok = 0, curResolve = null, curUtter = null, unlocked = false;

  function silence() { // kort stil wav-bestand om audio op iOS vrij te geven
    const n = 800, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
    v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { player.src = silence(); const p = player.play(); if (p) p.catch(() => {}); } catch (e) { /* niet erg */ }
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
  }

  const hasTts = 'speechSynthesis' in window;
  let lastCancel = 0;
  // Alleen afbreken als er echt iets klinkt: op iOS verdwijnt een nieuwe zin
  // soms helemaal als er vlak daarvoor zonder reden is afgebroken.
  function cancelSpeech() {
    if (hasTts && (speechSynthesis.speaking || speechSynthesis.pending)) { speechSynthesis.cancel(); lastCancel = Date.now(); }
  }

  function stopPlayback() {
    playTok++;
    try { player.pause(); } catch (e) { /* */ }
    cancelSpeech();
    if (curResolve) { const r = curResolve; curResolve = null; r(); }
    setStatus('');
  }

  // startTimeout: als het geluid niet binnen die tijd begint (trage verbinding), geven we op.
  function playUrl(url, speed = 1, startTimeout = 0) {
    return new Promise((res, rej) => {
      let t = null;
      const off = () => { clearTimeout(t); player.onended = player.onerror = player.onplaying = null; curResolve = null; };
      curResolve = () => { off(); res(); };
      player.onended = () => { off(); res(); };
      player.onerror = () => { off(); rej(new Error('audio')); };
      player.onplaying = () => clearTimeout(t);
      if (startTimeout) t = setTimeout(() => { off(); try { player.pause(); } catch (e) { /* */ } rej(new Error('traag')); }, startTimeout);
      player.src = url;
      player.defaultPlaybackRate = speed; player.playbackRate = speed;
      const p = player.play();
      if (p) p.catch(e => { if (curResolve) { off(); rej(e); } });
    });
  }

  function nlVoice() {
    const vs = speechSynthesis.getVoices();
    return vs.find(v => /^nl[-_]NL/i.test(v.lang)) || vs.find(v => /^nl/i.test(v.lang)) || null;
  }
  function speak(text, slow) {
    return new Promise(res => {
      if (!hasTts) { toast('Dit apparaat heeft geen spraakfunctie.'); return res(); }
      cancelSpeech();
      let done = false, started = false, tries = 0, guard = null, watch = null, u = null;
      const fin = () => {
        if (done) return; done = true; clearTimeout(guard); clearTimeout(watch);
        if (curResolve === fin) curResolve = null; res();
      };
      const say = () => {
        if (done) return;
        tries++;
        u = new SpeechSynthesisUtterance(text);
        u.lang = 'nl-NL';
        const v = nlVoice(); if (v) u.voice = v;
        u.rate = slow ? 0.55 : 0.9;
        u.onstart = () => { started = true; };
        u.onend = fin; u.onerror = fin;
        curUtter = u; // referentie bewaren, anders stopt Safari soms te vroeg
        try { speechSynthesis.resume(); } catch (e) { /* */ }
        speechSynthesis.speak(u);
        // Begint er niets? Dan is de zin "ingeslikt": één keer opnieuw proberen.
        watch = setTimeout(() => {
          if (done || started || speechSynthesis.speaking || tries >= 2) return;
          u.onend = u.onerror = null;
          speechSynthesis.cancel(); lastCancel = Date.now();
          setTimeout(say, 200);
        }, 1200);
      };
      guard = setTimeout(fin, 4500 + text.length * 300);
      curResolve = fin;
      const sinceCancel = Date.now() - lastCancel;
      if (sinceCancel < 200) setTimeout(say, 200 - sinceCancel); else say();
    });
  }

  // Echte opnames van Wikimedia Commons (bestanden "Nl-woord.ogg"), anders de computerstem.
  // De opname wordt vooraf helemaal opgehaald en bewaard, zodat ze direct afspeelt bij een tik.
  const pending = {}, blobUrl = {};
  const AUDIO_CACHE = 'uitspraak-audio';
  async function loadBlob(k, url) {
    if (blobUrl[k] || !url) return;
    try {
      let res = null, cache = null;
      if (window.caches) { cache = await caches.open(AUDIO_CACHE); res = await cache.match(url); }
      if (!res) {
        res = await fetch(url);
        if (!res.ok) return;
        if (cache) cache.put(url, res.clone()).catch(() => {});
      }
      blobUrl[k] = URL.createObjectURL(await res.blob());
    } catch (e) { /* dan spelen we rechtstreeks van internet */ }
  }
  function prefetch(word) {
    const k = norm(word);
    if (!store.settings.real || /[^a-zà-ÿ'-]/i.test(k) || !k) return Promise.resolve('');
    if (pending[k]) return pending[k];
    if (k in refCache) {
      if (!refCache[k] || blobUrl[k]) return Promise.resolve(refCache[k]);
      return pending[k] = loadBlob(k, refCache[k]).then(() => refCache[k]).finally(() => { delete pending[k]; });
    }
    const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=videoinfo&viprop=derivatives&titles=' +
      encodeURIComponent('File:Nl-' + k + '.ogg');
    pending[k] = fetch(url).then(r => r.json()).then(j => {
      const pages = (j.query && j.query.pages) || {};
      let found = '';
      for (const id in pages) {
        const vi = pages[id].videoinfo; if (!vi || !vi[0]) continue;
        const ders = vi[0].derivatives || [];
        const mp3 = ders.find(d => /mpeg|mp3/.test(d.type || ''));
        const ogg = ders.find(d => /ogg/.test(d.type || ''));
        if (mp3) found = mp3.src;
        else if (ogg && player.canPlayType('audio/ogg')) found = ogg.src;
      }
      refCache[k] = found;
      try { localStorage.setItem(REFKEY, JSON.stringify(refCache)); } catch (e) { /* */ }
      return loadBlob(k, found).then(() => found);
    }).catch(() => '').finally(() => { delete pending[k]; });
    return pending[k];
  }
  const hasReal = w => !!(store.settings.real && refCache[norm(w)]);

  async function playRef(word, { slow = false, forceTts = false } = {}) {
    const k = norm(word);
    if (!forceTts && hasReal(word)) {
      const tok = playTok;
      // lokale kopie speelt direct; anders van internet, met de computerstem als reserve
      try { await playUrl(blobUrl[k] || refCache[k], slow ? 0.65 : 1, blobUrl[k] ? 0 : 2500); return; }
      catch (e) { if (tok !== playTok) return; }
    }
    await speak(word, slow);
  }

  // ---------- audio: opnemen ----------
  const recs = {}; // laatste opname per woord (alleen deze sessie)
  let rec = null, recStream = null, recTimer = null, recState = 'idle';

  async function toggleRec() {
    if (recState === 'recording') { rec.stop(); return; }
    if (recState !== 'idle') return;
    const it = curItem(); if (!it) return;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast('Opnemen werkt hier niet. Open de app via https in Safari.'); return;
    }
    stopPlayback();
    recState = 'starting'; render();
    try {
      recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      recState = 'idle'; render();
      toast('Geen toegang tot de microfoon. Sta de microfoon toe en probeer opnieuw.'); return;
    }
    const chunks = [];
    try { rec = new MediaRecorder(recStream); }
    catch (e) { recStream.getTracks().forEach(t => t.stop()); recState = 'idle'; render(); toast('Opnemen is mislukt.'); return; }
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      clearTimeout(recTimer);
      recStream.getTracks().forEach(t => t.stop());
      const k = norm(it.w);
      if (recs[k]) URL.revokeObjectURL(recs[k]);
      recBlobs[k] = new Blob(chunks, { type: rec.mimeType || 'audio/mp4' });
      recs[k] = URL.createObjectURL(recBlobs[k]);
      delete scores[k];
      recState = 'idle';
      const still = curItem() === it;
      render();
      if (still) setTimeout(() => { if (curItem() === it) compare(); }, 350);
      assess(it);
    };
    rec.start();
    recState = 'recording'; render();
    recTimer = setTimeout(() => { if (recState === 'recording') rec.stop(); }, 8000);
  }
  function cancelRec() { if (recState === 'recording') { try { rec.stop(); } catch (e) { /* */ } } }

  async function compare() {
    const it = curItem(); if (!it || !recs[norm(it.w)]) return;
    stopPlayback(); const tok = playTok;
    setStatus('Voorbeeld …');
    await playRef(it.w);
    if (tok !== playTok) return;
    await wait(350);
    if (tok !== playTok) return;
    setStatus('Jouw opname …');
    try { await playUrl(recs[norm(it.w)]); } catch (e) { /* */ }
    if (tok === playTok) setStatus('');
  }

  // ---------- automatische score (Azure Speech, uitspraakbeoordeling) ----------
  const recBlobs = {}, scores = {};
  let actx = null;
  const azOn = () => !!(store.settings.azKey && store.settings.azRegion);
  const level = s => s >= 80 ? 'good' : s >= 60 ? 'mid' : 'bad';
  const levelRate = { good: 'goed', mid: 'bijna', bad: 'nee' };

  // Azure wil WAV, 16 kHz, mono. De telefoon neemt op in een ander formaat, dus zetten we het om.
  async function toWav(blob) {
    const AC = window.AudioContext || window.webkitAudioContext;
    actx = actx || new AC();
    const raw = await blob.arrayBuffer();
    const buf = await new Promise((res, rej) => { const p = actx.decodeAudioData(raw, res, rej); if (p && p.catch) p.catch(rej); });
    const n = buf.length, ch = buf.numberOfChannels, mono = new Float32Array(n);
    for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / ch; }
    const ratio = buf.sampleRate / 16000, m = Math.floor(n / ratio);
    const v = new DataView(new ArrayBuffer(44 + m * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); v.setUint32(4, 36 + m * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 16000, true); v.setUint32(28, 32000, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, m * 2, true);
    for (let i = 0; i < m; i++) {
      const a = Math.floor(i * ratio), b = Math.min(n, Math.max(a + 1, Math.floor((i + 1) * ratio)));
      let s = 0; for (let j = a; j < b; j++) s += mono[j];
      s = Math.max(-1, Math.min(1, s / (b - a)));
      v.setInt16(44 + i * 2, Math.round(s * 32767), true);
    }
    return new Blob([v.buffer], { type: 'audio/wav' });
  }

  function parseScore(j, ref) {
    const pa = o => (o && o.PronunciationAssessment) || o || {};
    const num = x => typeof x === 'number' && isFinite(x) ? Math.round(x) : null;
    const nb = j && j.NBest && j.NBest[0];
    if (!nb || j.RecognitionStatus !== 'Success') return { state: 'err', msg: 'Ik kon je niet goed horen. Probeer het opnieuw, iets luider.' };
    const words = (nb.Words || []).map(w => ({
      w: w.Word || '', score: num(pa(w).AccuracyScore), err: pa(w).ErrorType || 'None',
      ph: (w.Phonemes || []).map(p => ({ p: p.Phoneme || '', score: num(pa(p).AccuracyScore) })).filter(p => p.score !== null)
    }));
    const multi = ref.trim().split(/\s+/).length > 1;
    const acc = num(pa(nb).AccuracyScore), pron = num(pa(nb).PronScore);
    const total = multi && pron !== null ? pron : acc;
    if (total === null) return { state: 'err', msg: 'Er kwam geen score terug. Probeer het opnieuw.' };
    return { state: 'done', total, multi, words, heard: (nb.Lexical || nb.Display || '').trim() };
  }

  async function assess(it) {
    const k = norm(it.w), blob = recBlobs[k], s = store.settings;
    if (!blob || !azOn()) return;
    const job = scores[k] = { state: 'busy' };
    paintScore(it);
    let result;
    try {
      const wav = await toWav(blob);
      const cfg = btoa(unescape(encodeURIComponent(JSON.stringify({
        ReferenceText: it.w, GradingSystem: 'HundredMark', Granularity: 'Phoneme', Dimension: 'Comprehensive', EnableMiscue: 'True'
      }))));
      const host = s.azRegion.includes('.') ? s.azRegion + '/stt' : s.azRegion + '.stt.speech.microsoft.com';
      const r = await fetch(`https://${host}/speech/recognition/conversation/cognitiveservices/v1?language=nl-NL&format=detailed`, {
        method: 'POST', body: wav,
        headers: { 'Ocp-Apim-Subscription-Key': s.azKey, 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', 'Pronunciation-Assessment': cfg, Accept: 'application/json' }
      });
      if (r.status === 401 || r.status === 403) result = { state: 'err', msg: 'De Azure-sleutel of de regio klopt niet. Controleer ze bij Voortgang → Instellingen.' };
      else if (r.status === 429) result = { state: 'err', msg: 'De gratis limiet van Azure is bereikt. Probeer het later opnieuw.', retry: true };
      else if (!r.ok) result = { state: 'err', msg: `De score is mislukt (fout ${r.status}).`, retry: true };
      else result = parseScore(await r.json(), it.w);
    } catch (e) {
      result = { state: 'err', msg: 'De score is mislukt. Is er internet?', retry: true };
    }
    if (scores[k] !== job) return; // er is intussen een nieuwe opname gemaakt
    scores[k] = result;
    paintScore(it);
  }

  function scoreHtml(it) {
    const k = norm(it.w), sc = scores[k];
    if (!sc) return recs[k] && !azOn() ? '<p class="muted small">Automatische score staat uit. Aanzetten kan bij Voortgang → Instellingen.</p>' : '';
    if (sc.state === 'busy') return '<div class="scorebox muted">Score berekenen …</div>';
    if (sc.state === 'err') return `<div class="scorebox"><p class="small">${esc(sc.msg)}</p>
      ${sc.retry ? '<button class="btn" data-act="score">Opnieuw proberen</button>' : ''}</div>`;
    const lv = level(sc.total), label = { good: 'Goed!', mid: 'Bijna goed', bad: 'Nog niet goed' }[lv];
    const chip = (text, s, extra = '') => `<span class="chip ${s === null ? '' : level(s)} ${extra}">${esc(text)}${s === null ? '' : ` <b>${s}</b>`}</span>`;
    let detail = '';
    if (sc.multi) {
      detail = `<div class="chips">${sc.words.map(w => w.err === 'Omission' ? chip(w.w, null, 'miss') : w.err === 'Insertion' ? chip('+ ' + w.w, null, 'extra') : chip(w.w, w.score)).join('')}</div>`;
    } else {
      const ph = (sc.words.find(w => w.err !== 'Insertion') || { ph: [] }).ph;
      if (ph.length > 1) detail = `<div class="small muted">Per klank, van begin tot eind:</div>
        <div class="chips">${ph.map((p, i) => chip(p.p || String(i + 1), p.score)).join('')}</div>`;
    }
    const heard = sc.heard && norm(sc.heard).replace(/[.,!?]/g, '') !== norm(it.w).replace(/[.,!?]/g, '')
      ? `<p class="small">De computer hoorde: <b>“${esc(sc.heard)}”</b></p>` : '';
    const snd = SOUNDS.find(s => s.id === it.sound);
    const tip = lv !== 'good' && snd ? `<p class="small muted">Deze les gaat over <b>${esc(snd.label)}</b>: ${esc(snd.tip)}</p>` : '';
    return `<div class="scorebox">
      <div class="scorenum ${lv}">${sc.total}<span>/100</span></div>
      <div class="scorelbl ${lv}">${label}</div>
      ${detail}${heard}${tip}
      <p class="muted tiny">De score komt van een computer en kan zich vergissen. Vertrouw ook op je oren.</p></div>`;
  }
  const suggested = it => { const sc = scores[norm(it.w)]; return sc && sc.state === 'done' ? levelRate[level(sc.total)] : ''; };
  function paintScore(it) {
    if (curItem() !== it) return;
    const el = $('#score'); if (el) el.innerHTML = scoreHtml(it);
    const sug = suggested(it);
    document.querySelectorAll('[data-act="rate"]').forEach(b => b.classList.toggle('sug', b.dataset.r === sug));
  }

  // ---------- navigatie ----------
  let view = { name: 'klanken' }, curTab = 'klanken';
  const stack = [];
  function leave() { cancelRec(); stopPlayback(); }
  function go(v) { leave(); stack.push(view); view = v; render(); window.scrollTo(0, 0); }
  function back() { leave(); view = stack.pop() || { name: curTab }; render(); }
  function tab(name) { leave(); stack.length = 0; curTab = name; view = { name }; render(); window.scrollTo(0, 0); }
  const curItem = () => view.name === 'practice' ? view.items[view.idx] : null;

  let toastT = null;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3200);
  }
  function setStatus(t) { const el = $('#status'); if (el) el.textContent = t; }

  // ---------- schermen ----------
  function vKlanken() {
    const rows = SOUNDS.map(s => {
      const st = soundStats(s);
      return `<button class="item" data-act="sound" data-id="${s.id}">
        <div class="grow"><div class="big">${esc(s.label)}</div>
        <div class="sub">${esc(s.example)} · ${st.n}/${st.total} woorden geoefend</div>
        <div class="bar"><i style="width:${st.pct}%"></i></div></div><span class="chev">›</span></button>`;
    }).join('');
    return ['Klanken', `<p class="muted small">Kies een klank. Lees de uitleg, luister, neem jezelf op en vergelijk.</p><div class="list">${rows}</div>`];
  }

  function vSound(v) {
    const s = SOUNDS.find(x => x.id === v.id);
    const words = s.words.map(([w, uk], i) => `<button class="item" data-act="practice-sound" data-i="${i}">
      <span class="dot ${dotClass(w)}"></span>
      <div class="grow"><div class="big">${esc(w)}</div>${store.settings.uk ? `<div class="sub">${esc(uk)}</div>` : ''}</div>
      <span class="chev">›</span></button>`).join('');
    const drills = CONTRASTS.filter(c => c.sound === s.id).map(c =>
      `<button class="btn soft" data-act="drill" data-id="${c.id}" style="margin-top:10px">Luisteroefening: ${esc(c.label)}</button>`).join('');
    return [s.label, `
      <div class="card tip"><p>${esc(s.tip)}</p>${store.settings.uk ? `<p class="tipuk" lang="uk">${esc(s.tipUk)}</p>` : ''}</div>
      <button class="btn primary" data-act="practice-sound" data-i="0">Oefen deze klank</button>
      ${drills}
      <h2>Woorden</h2><div class="list">${words}</div>`];
  }

  function vPractice(v) {
    const it = v.items[v.idx], k = norm(it.w), has = !!recs[k];
    const recOn = recState === 'recording', recWait = recState === 'starting';
    prefetch(it.w).then(() => { if (curItem() === it) { const el = $('#src'); if (el) el.textContent = srcLabel(it.w); } });
    if (v.items[v.idx + 1]) prefetch(v.items[v.idx + 1].w); // het volgende woord alvast klaarzetten
    const sug = suggested(it);
    const nav = v.session ? '' : `<div class="row">
        <button class="btn" data-act="prev" ${v.idx === 0 ? 'disabled' : ''}>‹ Vorige</button>
        <button class="btn" data-act="next" ${v.idx >= v.items.length - 1 ? 'disabled' : ''}>Volgende ›</button></div>`;
    return [v.title, `
      <div class="card wordcard">
        <div class="counter">${v.idx + 1} / ${v.items.length}</div>
        <div class="word" lang="nl">${esc(it.w)}</div>
        <div class="uk" lang="uk">${store.settings.uk ? esc(it.uk || '') : ''}</div>
        <div class="src" id="src">${esc(srcLabel(it.w))}</div>
        <div class="row">
          <button class="btn" data-act="listen">${IC.play} Luister</button>
          <button class="btn" data-act="slow">${IC.play} Langzaam</button>
        </div>
        <button class="recbtn ${recOn ? 'on' : ''} ${recWait ? 'wait' : ''}" data-act="rec" aria-label="${recOn ? 'Stop de opname' : 'Neem op'}">${recOn ? IC.stop : IC.mic}</button>
        <div class="reclabel">${recOn ? 'Spreek nu … tik om te stoppen' : recWait ? 'Even wachten …' : has ? 'Opnieuw opnemen' : 'Tik en zeg het woord'}</div>
        <div class="row">
          <button class="btn" data-act="mine" ${has ? '' : 'disabled'}>Mijn opname</button>
          <button class="btn soft" data-act="compare" ${has ? '' : 'disabled'}>Vergelijk</button>
        </div>
        <div class="status" id="status"></div>
        <div id="score">${scoreHtml(it)}</div>
      </div>
      <div class="card rate">
        <div class="center small muted">Hoe klonk het?</div>
        <div class="row">
          <button class="btn no ${sug === 'nee' ? 'sug' : ''}" data-act="rate" data-r="nee">Nog niet</button>
          <button class="btn mid ${sug === 'bijna' ? 'sug' : ''}" data-act="rate" data-r="bijna">Bijna</button>
          <button class="btn yes ${sug === 'goed' ? 'sug' : ''}" data-act="rate" data-r="goed">Goed</button>
        </div>
      </div>${nav}`];
  }
  const srcLabel = w => hasReal(w) ? 'Voorbeeld: echte opname (Wikimedia Commons)' : 'Voorbeeld: computerstem';

  function vOefenen() {
    const { due, nieuw } = todayPlan(), n = due.length + nieuw.length, st = streak();
    const practiced = Object.keys(store.progress).length;
    return ['Oefenen', `
      <div class="stats">
        <div class="stat"><b>${due.length}</b><span>herhalen</span></div>
        <div class="stat"><b>${nieuw.length}</b><span>nieuw</span></div>
        <div class="stat"><b>${st}</b><span>${st === 1 ? 'dag' : 'dagen'} op rij</span></div>
      </div>
      <div class="card" style="margin-top:12px">
        ${n ? `<p>Vandaag staan er <b>${n} woorden</b> klaar. Woorden die moeilijk zijn, komen vaker terug.</p>
               <button class="btn primary" data-act="session">Start</button>`
            : `<p><b>Klaar voor vandaag!</b> Morgen staan er nieuwe woorden klaar.</p>
               ${practiced ? '<button class="btn" data-act="extra">Toch extra oefenen</button>' : ''}`}
      </div>
      <p class="muted small">Na elk woord kies je zelf: <b>Nog niet</b>, <b>Bijna</b> of <b>Goed</b>. Zo weet de app wanneer een woord terugkomt.</p>`];
  }

  function vKlaar(v) {
    return ['Klaar', `<div class="card center"><div class="word">Goed gedaan!</div>
      <p class="muted">Je hebt ${v.n} keer geoefend.</p>
      <button class="btn primary" data-act="tab" data-tab="oefenen">Terug</button></div>`];
  }

  function vLuisteren() {
    const rows = CONTRASTS.map(c => {
      const p = store.pairs[c.id];
      return `<button class="item" data-act="drill" data-id="${c.id}">
        <div class="grow"><div class="big">${esc(c.label)}</div>
        <div class="sub">${esc(c.pairs[0].join(' – '))}${p ? ` · ${Math.round(p.ok / p.n * 100)}% goed (${p.n})` : ''}</div></div>
        <span class="chev">›</span></button>`;
    }).join('');
    return ['Luisteren', `<p class="muted small">Je hoort één woord. Welk woord is het? Wie het verschil hoort, kan het ook beter zeggen.</p>
      <button class="btn primary" data-act="drill" data-id="all" style="margin-bottom:12px">Alles door elkaar</button>
      <div class="list">${rows}</div>`];
  }

  const DRILL_LEN = 10;
  function newQuestion(v) {
    const c = v.id === 'all' ? CONTRASTS[Math.floor(Math.random() * CONTRASTS.length)] : CONTRASTS.find(x => x.id === v.id);
    let pair;
    do { pair = c.pairs[Math.floor(Math.random() * c.pairs.length)]; } while (c.pairs.length > 1 && v.cur && pair === v.cur.pair);
    v.cur = { cid: c.id, pair, target: pair[Math.floor(Math.random() * 2)], answer: null, tts: null };
    prefetch(pair[0]); prefetch(pair[1]);
  }
  function drillPlay(word) {
    const q = view.cur;
    // beide woorden met dezelfde soort stem, anders verraadt de stem het antwoord
    if (q.tts === null) q.tts = !(hasReal(q.pair[0]) && hasReal(q.pair[1]));
    stopPlayback();
    return playRef(word, { forceTts: q.tts });
  }
  function vDrill(v) {
    const q = v.cur, done = q.answer !== null, good = q.answer === q.target;
    const c = v.id === 'all' ? null : CONTRASTS.find(x => x.id === v.id);
    const opts = q.pair.map(w => {
      const cls = !done ? '' : w === q.target ? 'right' : w === q.answer ? 'wrong' : '';
      return `<button class="opt ${cls}" data-act="answer" data-w="${esc(w)}" lang="nl">${esc(w)}</button>`;
    }).join('');
    return [c ? c.label : 'Luisteren', `
      <div class="card center">
        <div class="counter">Vraag ${v.q} / ${DRILL_LEN} · ${v.score} goed</div>
        <p style="margin-top:14px"><b>Welk woord hoor je?</b></p>
        <button class="btn primary" data-act="replay">${IC.play} Luister ${done ? 'opnieuw' : ''}</button>
        <div class="opts">${opts}</div>
        <div class="verdict ${done ? (good ? 'good' : 'bad') : ''}">${!done ? '' : good ? 'Goed!' : `Nee, het was “${esc(q.target)}”.`}</div>
        ${done ? `<p class="muted small">Tik op een woord om het te horen.</p>
          <button class="btn primary" data-act="nextq">${v.q >= DRILL_LEN ? 'Klaar' : 'Volgende'}</button>` : ''}
      </div>`];
  }
  function vDrillDone(v) {
    return ['Resultaat', `<div class="card center"><div class="word">${v.score} / ${DRILL_LEN}</div>
      <p class="muted">${v.score >= 9 ? 'Uitstekend!' : v.score >= 7 ? 'Goed gedaan!' : 'Blijf oefenen, het wordt elke keer beter.'}</p>
      <div class="row"><button class="btn" data-act="tab" data-tab="luisteren">Terug</button>
      <button class="btn primary" data-act="drill-again" data-id="${esc(v.id)}">Nog een keer</button></div></div>`];
  }

  function vMijn() {
    const rows = store.custom.map((c, i) => `<div class="item">
      <span class="dot ${dotClass(c.w)}"></span>
      <div class="grow" data-act="practice-custom" data-i="${i}"><div class="big" lang="nl">${esc(c.w)}</div>
      ${c.uk ? `<div class="sub">${esc(c.uk)}</div>` : ''}</div>
      <button class="del" data-act="del-custom" data-i="${i}" aria-label="Verwijder ${esc(c.w)}">×</button></div>`).join('');
    return ['Mijn woorden', `
      <form class="card" id="addform" autocomplete="off">
        <label class="field"><span>Nederlands woord of korte zin</span>
          <input type="text" name="w" lang="nl" maxlength="80" autocapitalize="off" autocorrect="off" spellcheck="false" required></label>
        <label class="field"><span>Vertaling (mag leeg blijven)</span>
          <input type="text" name="uk" maxlength="80"></label>
        <button class="btn primary" type="submit">Toevoegen</button>
      </form>
      ${rows ? `<button class="btn soft" data-act="practice-custom" data-i="0" style="margin-bottom:12px">Oefen mijn woorden</button><div class="list">${rows}</div>`
             : '<p class="muted small center">Nog geen eigen woorden. Voeg hierboven een woord toe.</p>'}`];
  }

  function vVoortgang() {
    const total = Object.values(store.days).reduce((a, b) => a + b, 0);
    const good = Object.values(store.progress).filter(p => p.box >= 3).length;
    const srows = SOUNDS.map(s => { const st = soundStats(s);
      return `<div class="prow"><span class="name">${esc(s.label)}</span><div class="bar"><i style="width:${st.pct}%"></i></div><span class="val">${st.pct}%</span></div>`; }).join('');
    const prows = CONTRASTS.map(c => { const p = store.pairs[c.id]; const pct = p ? Math.round(p.ok / p.n * 100) : 0;
      return `<div class="prow"><span class="name">${esc(c.label)}</span><div class="bar"><i style="width:${pct}%"></i></div><span class="val">${p ? pct + '%' : '–'}</span></div>`; }).join('');
    const voice = ('speechSynthesis' in window) && nlVoice();
    return ['Voortgang', `
      <div class="stats">
        <div class="stat"><b>${streak()}</b><span>${streak() === 1 ? 'dag' : 'dagen'} op rij</span></div>
        <div class="stat"><b>${good}</b><span>woorden goed</span></div>
        <div class="stat"><b>${total}</b><span>keer geoefend</span></div>
      </div>
      <h2>Uitspraak per klank</h2><div class="card">${srows}</div>
      <h2>Luisteren per paar</h2><div class="card">${prows}</div>
      <h2>Instellingen</h2>
      <div class="card">
        <label class="check"><input type="checkbox" data-set="uk" ${store.settings.uk ? 'checked' : ''}>
          <span>Oekraïense hulp tonen<br><span class="muted small">Vertalingen en uitleg in het Oekraïens.</span></span></label>
        <label class="check"><input type="checkbox" data-set="real" ${store.settings.real ? 'checked' : ''}>
          <span>Echte opnames gebruiken<br><span class="muted small">Opnames van Nederlandse sprekers via Wikimedia Commons (internet nodig). Anders hoor je de computerstem.</span></span></label>
        <p class="muted small">${voice ? 'Computerstem: ' + esc(voice.name) : 'Geen Nederlandse computerstem gevonden op dit apparaat.'}</p>
        <button class="btn danger" data-act="reset" style="margin-top:8px">Alle voortgang wissen</button>
      </div>
      <h2>Automatische score</h2>
      <div class="card">
        <p class="small">${azOn() ? '<b>Staat aan.</b> Na elke opname krijg je een score.' : '<b>Staat uit.</b> Vul een regio en een sleutel van Azure Speech in om na elke opname een score te krijgen.'}</p>
        <p class="muted small">Je opname gaat dan naar Microsoft om te worden beoordeeld. De sleutel blijft alleen op dit apparaat.</p>
        <form id="azform" autocomplete="off">
          <label class="field"><span>Regio (bijvoorbeeld westeurope)</span>
            <input type="text" name="region" value="${esc(store.settings.azRegion || '')}" maxlength="120" autocapitalize="off" autocorrect="off" spellcheck="false" required></label>
          <label class="field"><span>Sleutel</span>
            <input type="password" name="key" maxlength="200" autocomplete="off" placeholder="${store.settings.azKey ? 'Opgeslagen. Vul in om te vervangen.' : ''}" ${store.settings.azKey ? '' : 'required'}></label>
          <button class="btn primary" type="submit">Opslaan</button>
        </form>
        ${store.settings.azKey ? '<button class="btn danger" data-act="az-clear" style="margin-top:10px">Sleutel verwijderen</button>' : ''}
      </div>
      <p class="muted small center">Opnames: Wikimedia Commons, vrije licenties (CC BY-SA e.a.). Jouw eigen opnames blijven op dit apparaat.</p>`];
  }

  const VIEWS = { klanken: vKlanken, sound: vSound, practice: vPractice, oefenen: vOefenen, klaar: vKlaar, luisteren: vLuisteren,
    drill: vDrill, drilldone: vDrillDone, mijn: vMijn, voortgang: vVoortgang };

  function render() {
    const [title, html] = VIEWS[view.name](view);
    $('#title').textContent = title;
    $('#back').hidden = !stack.length;
    $('#view').innerHTML = html;
    for (const b of $('#tabs').children) b.classList.toggle('on', b.dataset.tab === curTab);
  }

  // ---------- acties ----------
  function startDrill(id) {
    const v = { name: 'drill', id, q: 1, score: 0, cur: null };
    newQuestion(v);
    if (view.name === 'drilldone') { leave(); view = v; render(); } else go(v);
    drillPlay(v.cur.target);
  }
  function startPractice(items, idx, title, session) {
    if (!items.length) return;
    go({ name: 'practice', items, idx, title, session: !!session, done: 0 });
  }
  function step(d) {
    const v = view; const n = v.idx + d;
    if (n < 0 || n >= v.items.length) return;
    leave(); v.idx = n; render();
  }

  const ACT = {
    back, tab: d => tab(d.tab),
    sound: d => go({ name: 'sound', id: d.id }),
    'practice-sound': d => { const s = SOUNDS.find(x => x.id === view.id); startPractice(soundItems(s), +d.i, s.label); },
    'practice-custom': d => startPractice(store.custom.map(c => ({ w: c.w, uk: c.uk || '', sound: 'eigen' })), +d.i, 'Mijn woorden'),
    session: () => { const { due, nieuw } = todayPlan(); startPractice(shuffle(due).concat(nieuw), 0, 'Vandaag', true); },
    extra: () => { const seen = new Set(); const items = allItems().filter(i => prog(i.w) && !seen.has(norm(i.w)) && seen.add(norm(i.w)));
      startPractice(shuffle(items).slice(0, 8), 0, 'Extra oefenen', true); },
    listen: () => { stopPlayback(); playRef(curItem().w); },
    slow: () => { stopPlayback(); playRef(curItem().w, { slow: true }); },
    rec: toggleRec,
    mine: () => { const u = recs[norm(curItem().w)]; if (u) { stopPlayback(); playUrl(u).catch(() => {}); } },
    compare,
    score: () => assess(curItem()),
    'az-clear': () => {
      if (confirm('De Azure-sleutel verwijderen? De automatische score gaat dan uit.')) { delete store.settings.azKey; save(); render(); }
    },
    prev: () => step(-1), next: () => step(1),
    rate: d => {
      const v = view, it = v.items[v.idx];
      rate(it, d.r);
      if (v.session) { v.done++; if (d.r === 'nee' && !it.redo) v.items.push({ ...it, redo: true }); }
      if (v.idx < v.items.length - 1) step(1);
      else if (v.session) { leave(); view = { name: 'klaar', n: v.done }; stack.length = 0; curTab = 'oefenen'; render(); }
      else { toast('Opgeslagen. Dit was het laatste woord.'); }
    },
    drill: d => startDrill(d.id),
    'drill-again': d => startDrill(d.id),
    replay: () => drillPlay(view.cur.target),
    answer: d => {
      const v = view, q = v.cur;
      if (q.answer !== null) { drillPlay(d.w); return; }
      q.answer = d.w;
      const ok = d.w === q.target;
      if (ok) v.score++;
      const p = store.pairs[q.cid] || { ok: 0, n: 0 }; p.n++; if (ok) p.ok++; store.pairs[q.cid] = p;
      const t = dstr(); store.days[t] = (store.days[t] || 0) + 1; save();
      render();
    },
    nextq: () => {
      const v = view;
      if (v.q >= DRILL_LEN) { leave(); view = { name: 'drilldone', id: v.id, score: v.score }; render(); return; }
      v.q++; newQuestion(v); render(); drillPlay(v.cur.target);
    },
    'del-custom': d => {
      const c = store.custom[+d.i];
      if (c && confirm(`“${c.w}” verwijderen?`)) { store.custom.splice(+d.i, 1); save(); render(); }
    },
    reset: () => {
      if (confirm('Alle voortgang wissen? Je eigen woorden blijven staan.')) {
        store.progress = {}; store.pairs = {}; store.days = {}; save(); render(); toast('Voortgang gewist.');
      }
    }
  };

  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    unlock();
    const fn = ACT[el.dataset.act]; if (fn) fn(el.dataset);
  });
  document.addEventListener('submit', e => {
    if (e.target.id === 'azform') {
      e.preventDefault();
      const region = e.target.region.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      const key = e.target.key.value.trim();
      if (!/^[a-z0-9][a-z0-9.-]*$/.test(region)) { toast('De regio klopt niet. Voorbeeld: westeurope'); return; }
      store.settings.azRegion = region;
      if (key) store.settings.azKey = key;
      save(); render(); toast('Opgeslagen.');
      return;
    }
    if (e.target.id !== 'addform') return;
    e.preventDefault();
    const w = e.target.w.value.trim().replace(/\s+/g, ' '), uk = e.target.uk.value.trim();
    if (!w) return;
    if (store.custom.some(c => norm(c.w) === norm(w))) { toast('Dit woord staat al in je lijst.'); return; }
    store.custom.unshift({ w, uk }); save(); render(); toast('Toegevoegd.');
  });
  document.addEventListener('change', e => {
    const k = e.target.dataset && e.target.dataset.set; if (!k) return;
    store.settings[k] = e.target.checked; save();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) leave(); });
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { if (view.name === 'voortgang') render(); };

  const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if ('serviceWorker' in navigator && !isLocal) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Alleen tijdens het ontwikkelen: een opname aanleveren zonder microfoon, om de score te testen.
  if (isLocal) window.__test = {
    setRec(blob) {
      const it = curItem(), k = norm(it.w);
      recBlobs[k] = blob; recs[k] = URL.createObjectURL(blob); delete scores[k];
      render(); return assess(it);
    }
  };

  render();
})();
