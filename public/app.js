import {DEFAULT,norm} from './default-ruleset.js';
const G='https://www.gstatic.com/firebasejs/10.14.1/';
const {initializeApp}=await import(G+'firebase-app.js');
const {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged,sendPasswordResetEmail,setPersistence,browserSessionPersistence}=await import(G+'firebase-auth.js');
const {getFirestore,collection,doc,setDoc,getDoc,getDocs,deleteDoc,query,orderBy,serverTimestamp}=await import(G+'firebase-firestore.js');
const $=i=>document.getElementById(i),esc=s=>String(s??'').replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const CFG=await(await fetch('/api/config')).json();const app=initializeApp(CFG),auth=getAuth(app),db=getFirestore(app);await setPersistence(auth,browserSessionPersistence);
const ST=['QS1','QS2','QS3','QS4'],NS=r=>(r.stufen||ST).length;let RF=[],SCAN=[],KEY=null,RS=DEFAULT,RSVER='integriert',LAST=null,VERS={},H={},idle;
$('rp').onclick=async()=>{try{await sendPasswordResetEmail(auth,$('em').value.trim())}catch{}$('lm').textContent='Falls die Adresse freigegeben ist, wurde eine E-Mail zum Setzen des Passworts gesendet.'};
// ---- Verschlüsselung (AES-GCM, Schlüssel aus Passphrase, nur im Speicher) ----
const te=new TextEncoder(),td=new TextDecoder();
const b64e=u=>{let s='';const a=new Uint8Array(u);for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode(...a.subarray(i,i+8192));return btoa(s)};
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const dk=async(p,salt)=>crypto.subtle.deriveKey({name:'PBKDF2',salt:b64d(salt),iterations:600000,hash:'SHA-256'},await crypto.subtle.importKey('raw',te.encode(p),'PBKDF2',false,['deriveKey']),{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
const enc=async o=>{const iv=crypto.getRandomValues(new Uint8Array(12));return{iv:b64e(iv),c:b64e(await crypto.subtle.encrypt({name:'AES-GCM',iv},KEY,te.encode(JSON.stringify(o))))}};
const dec=async d=>JSON.parse(td.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(d.iv)},KEY,b64d(d.c))));
// ---- Anmeldung, Sperre, Inaktivität ----
const lock=()=>{KEY=null;location.reload()};const bump=()=>{clearTimeout(idle);idle=setTimeout(async()=>{await signOut(auth);lock()},15*60e3)};
['click','keydown'].forEach(e=>addEventListener(e,bump));
$('li').onclick=async()=>{try{await signInWithEmailAndPassword(auth,$('em').value.trim(),$('pw').value)}catch{$('lm').textContent='Anmeldung fehlgeschlagen.'}};
$('lo').onclick=async()=>{await signOut(auth);lock()};$('lk').onclick=lock;
onAuthStateChanged(auth,u=>{$('s0').hidden=!!u;$('s1').hidden=!u||!!KEY;$('lo').hidden=!u;$('who').textContent=u?u.email:'';if(u)bump()});
$('un').onclick=async()=>{const p=$('ph').value,ref=doc(db,'meta','crypto');$('um').textContent='';
 try{const s=await getDoc(ref);
  if(!s.exists()){if(p.length<12){$('um').textContent='Mindestens 12 Zeichen.';return}const salt=b64e(crypto.getRandomValues(new Uint8Array(16)));KEY=await dk(p,salt);await setDoc(ref,{salt,check:await enc({ok:1})})}
  else{KEY=await dk(p,s.data().salt);await dec(s.data().check)}
 }catch{KEY=null;$('um').textContent='Passphrase falsch oder keine Berechtigung (Allowlist?).';return}
 $('s1').hidden=true;$('ap').hidden=false;$('lk').hidden=false;$('ph').value='';await loadRules();build()};
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x==b));for(const x of'bvg')$('t_'+x).hidden=x!=b.dataset.t;if(b.dataset.t=='v')hist();if(b.dataset.t=='g')vers()});
// ---- Regelwerk: Validierung, Felder, Versionen ----
const okc=c=>c&&typeof c=='object'&&(c.man?1:c.or?Array.isArray(c.or)&&c.or.every(okc):c.and?Array.isArray(c.and)&&c.and.every(okc):typeof c.k=='string'&&('lt'in c||'is'in c||Array.isArray(c.in)||'has'in c));
const chk=r=>{if(!r||!Array.isArray(r.rows))return['„rows“ fehlt'];const e=[];r.rows.forEach(w=>{if(w.n==null||!Array.isArray(w.q)||w.q.length!=NS(r))e.push(`Zeile ${w.n}: q braucht ${NS(r)} Stufen`);else w.q.forEach((s,i)=>{if(!Array.isArray(s)||!s.every(okc))e.push(`Zeile ${w.n} QS${i+1}: ungültige Bedingung`)})});return e};
const fix=r=>{const F=new Map(DEFAULT.fields.map(f=>[f.k,f]));(r.fields||[]).forEach(f=>F.set(f.k,f));
 const w=c=>{if(c.or)c.or.forEach(w);else if(c.and)c.and.forEach(w);else if(c.k&&!F.has(c.k))F.set(c.k,{k:c.k,l:c.k,t:'lt'in c?'n':'is'in c?'b':'s'})};r.rows.forEach(x=>x.q.forEach(s=>s.forEach(w)));
 r.fields=[...F.values()];r.limits={...DEFAULT.limits,...r.limits};r.stufen=r.stufen||ST;return r};
const loadRules=async()=>{await vers(true);const a=Object.values(VERS).find(v=>v.active);if(a){RS=a.rs;RSVER='v'+a.ver+' · '+a.rs.name}};
async function vers(quiet){VERS={};const q=await getDocs(query(collection(db,'rulesets'),orderBy('ver','desc')));
 for(const d of q.docs){try{VERS[d.id]={ver:d.data().ver,active:d.data().active,rs:fix(await dec(d.data()))}}catch{}}
 if(quiet)return;$('vl').innerHTML='<table><tr><th>Version</th><th>Name</th><th>Zeilen</th><th>Quellen</th><th>Status</th><th></th></tr>'+Object.entries(VERS).map(([id,v])=>`<tr><td>v${v.ver}</td><td>${esc(v.rs.name)}</td><td>${v.rs.rows.length}</td><td>${esc((v.rs.quellen||[]).slice(-3).join('; '))}</td><td>${v.active?'aktiv':''}</td><td><button class="g" data-a="${id}">Aktivieren</button> <button class="g" data-e="${id}">In Editor</button></td></tr>`).join('')+'</table>'}
$('vl').onclick=async e=>{const a=e.target.dataset.a,x=e.target.dataset.e;if(x){$('rj').value=JSON.stringify(VERS[x].rs,null,1);$('rn').value=VERS[x].rs.name;rowsRender()}if(a)await activate(a)};
async function activate(id){for(const k of Object.keys(VERS))await setDoc(doc(db,'rulesets',k),{active:k==id},{merge:true});await loadRules();build();await vers()}
const parse=()=>{try{const r=JSON.parse($('rj').value);const e=chk(r);if(e.length){$('rm').innerHTML='<p class="no">'+e.map(esc).join('<br>')+'</p>';return null}return fix(r)}catch(x){$('rm').innerHTML='<p class="no">Kein gültiges JSON.</p>';return null}};
$('rc').onclick=()=>{const r=parse();if(!r)return;const o=new Map(RS.rows.map(x=>[x.n,JSON.stringify(x.q)])),n=new Map(r.rows.map(x=>[x.n,JSON.stringify(x.q)]));
 const l=[];n.forEach((v,k)=>{if(!o.has(k))l.push(`Zeile ${k}: neu`);else if(o.get(k)!=v)l.push(`Zeile ${k}: Anforderungen geändert`)});o.forEach((v,k)=>{if(!n.has(k))l.push(`Zeile ${k}: entfällt`)});
 $('rm').innerHTML='<p class="ok">Struktur gültig.</p><p>'+(l.length?l.map(esc).join('<br>'):'Keine Änderung gegenüber dem aktiven Regelwerk.')+'</p>'};
$('rs').onclick=async()=>{const r=parse();if(!r)return;await vers(true);r.name=$('rn').value||r.name;const ver=Math.max(0,...Object.values(VERS).map(v=>v.ver))+1;
 const ref=doc(collection(db,'rulesets'));await setDoc(ref,{...await enc(r),ver,active:false,ts:serverTimestamp(),by:auth.currentUser.uid});await vers(true);await activate(ref.id);$('rm').innerHTML='<p class="ok">Version v'+ver+' gespeichert und aktiv.</p>'};
$('rb').onclick=()=>{$('rj').value=JSON.stringify(DEFAULT,null,1);$('rn').value=DEFAULT.name;rowsRender()};
// ---- PDF lokal lesen, KI-Aufruf ----
const red=t=>t.replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g,'[E-MAIL]').replace(/\b(Tel|Telefon|Fax|Notruf)\b[^\n\d+]{0,15}[+\d][\d\s()\/-]{6,}\d/gi,'$1 [Nr.]');
const prep=t=>$('rd2').checked?red(t):t;
async function read(files,st){let all='',scans=[],big='';$(st).textContent='Lese …';
 try{const p=await import('./lib/pdf.min.mjs');p.GlobalWorkerOptions.workerSrc='./lib/pdf.worker.min.mjs';
  for(const f of files){if(/\.(txt|csv)$/i.test(f.name)){all+=await f.text();continue}
   const buf=await f.arrayBuffer(),d=await p.getDocument({data:buf.slice(0),isEvalSupported:false}).promise;let t='';
   for(let i=1;i<=d.numPages;i++){const c=await(await d.getPage(i)).getTextContent();t+=`\n[${f.name} S.${i}]\n`+c.items.map(x=>x.str).join(' ')}
   if(t.replace(/\[[^\]]*\]|\s/g,'').length<200){if(buf.byteLength<=3e6)scans.push({name:f.name,b64:b64e(buf)});else big=' Scan größer als 3 MB wurde ausgelassen.'}else all+=t}}
 catch{$(st).textContent='PDF konnte nicht gelesen werden.';return{t:all,s:scans}}
 $(st).textContent=(all||scans.length?'Geladen.':'Kein Text.')+(scans.length?' Gescannte PDF geht unverändert (ohne Schwärzung) an die KI.':'')+big;return{t:all,s:scans}}
$('f').onchange=async e=>{const r=await read(e.target.files,'st');SCAN=r.s;$('t').value=prep(r.t)};$('rf').onchange=async e=>{RF=[...e.target.files].map(f=>f.name);$('rt').value=(await read(e.target.files,'rs2')).t};
async function llm(mode,payload){const tk=await auth.currentUser.getIdToken();const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tk},body:JSON.stringify({mode,...payload})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);return j}
function merge(b,d,neu){const o=JSON.parse(JSON.stringify(b)),m=new Map(o.rows.map(r=>[String(r.n),r]));
 for(const r of d.rows||[])if(r&&r.n!=null&&(neu||m.has(String(r.n))))m.set(String(r.n),r);
 o.rows=[...m.values()];const f=new Map((o.fields||[]).map(x=>[x.k,x]));for(const x of d.fields||[])if(x&&x.k)f.set(x.k,x);o.fields=[...f.values()];return o}
function rowsRender(){let r;try{r=JSON.parse($('rj').value)}catch{$('rl').innerHTML='';return}if(!r.rows)return;
 $('rl').innerHTML='<table><tr><th>Nr.</th><th>Bezeichnung</th><th>Quelle</th><th></th></tr>'+r.rows.map(x=>`<tr><td>${esc(x.n)}</td><td>${esc(x.t)}</td><td>${esc(x.src||'')}</td><td><button class="g" data-d="${esc(x.n)}">Entfernen</button></td></tr>`).join('')+'</table>'}
$('rl').onclick=e=>{const n=e.target.dataset.d;if(n==null)return;try{const r=JSON.parse($('rj').value);r.rows=r.rows.filter(x=>String(x.n)!=n);$('rj').value=JSON.stringify(r,null,1);rowsRender()}catch{}};
$('rj').onchange=rowsRender;
$('rd').onclick=async()=>{const t=$('rt').value.trim();if(!t){$('rs2').textContent='Erst Dateien laden.';return}
 const neu=$('rneu').checked,hint=[],ch=[];let w=JSON.parse(JSON.stringify(RS));for(let i=0;i<t.length;i+=30000)ch.push(t.slice(i,i+30000));
 try{for(let i=0;i<ch.length;i++){$('rs2').textContent=`KI arbeitet … (Teil ${i+1} von ${ch.length})`;
   const d=await llm('rules',{text:ch[i],rules:w,neu,hinweis:$('rh').value,stufen:w.stufen||ST});w=merge(w,d,neu);(d.hinweise||[]).forEach(x=>hint.push(x))}
  w.quellen=[...(RS.quellen||[]),...RF.map(n=>n+' ('+new Date().toLocaleDateString('de-DE')+')')];
  $('rj').value=JSON.stringify(w,null,1);rowsRender();$('rs2').textContent='Entwurf erstellt. Bitte prüfen und vergleichen.';
  $('rm').innerHTML=hint.length?'<h3>Hinweise der KI</h3><p>'+hint.map(esc).join('<br>')+'</p>':''}
 catch(e){$('rs2').textContent='Fehler: '+e.message}};
// ---- Formular, Auswertung ----
const fld=k=>RS.fields.find(f=>f.k==k);
function build(){$('rv').textContent=RSVER;$('fm').innerHTML=RS.fields.map(({k,l,t})=>`<div><label for="f_${k}">${esc(l)}</label>`+(t=='b'?`<select id="f_${k}"><option value="">?</option><option value="1">ja</option><option value="0">nein</option></select>`:t=='e'?`<select id="f_${k}"><option value="">?</option><option>EC1PLUS</option><option>EC1</option><option>EC2</option><option value="keiner">keiner</option></select>`:`<input id="f_${k}" ${t=='d'?'type="date"':''}>`)+`<small class="b" id="b_${k}"></small></div>`).join('');
 $('rw').innerHTML=RS.rows.map(r=>`<label><input type="checkbox" value="${r.n}"> Z${r.n} ${esc(r.t)}</label>`).join('')}
const val=k=>{const e=$('f_'+k),f=fld(k);if(!e||!f||e.value==='')return null;return f.t=='b'?e.value=='1':f.t=='n'?parseFloat(String(e.value).replace(',','.')):e.value};
const vals=()=>Object.fromEntries(RS.fields.map(f=>[f.k,val(f.k)]).filter(x=>x[1]!==null&&!Number.isNaN(x[1])));
const setv=o=>{for(const f of RS.fields){const e=$('f_'+f.k),v=o[f.k];if(e)e.value=v==null?'':f.t=='b'?(v?'1':'0'):v}};
function ev(c){
 if(c.man)return['unk',c.man+' – manuell prüfen'];
 if(c.or){const r=c.or.map(ev);return r.find(x=>x[0]=='ok')||r.find(x=>x[0]=='unk')||r[0]}
 if(c.and){const r=c.and.map(ev);return r.find(x=>x[0]=='no')||r.find(x=>x[0]=='unk')||r[0]}
 const v=val(c.k);if(v===null||Number.isNaN(v))return['unk',`${c.k}: nicht belegt`];
 if('lt'in c)return[v<c.lt?'ok':'no',`${c.k} = ${v} (gefordert < ${c.lt})`];
 if('is'in c)return[v===c.is?'ok':'no',`${c.k} = ${v?'ja':'nein'} (gefordert ${c.is?'ja':'nein'})`];
 if(c.in)return[c.in.map(norm).includes(norm(v))?'ok':'no',`${c.k} = ${v} (zulässig: ${c.in.join(', ')})`];
 return[norm(v).includes(norm(c.has))?'ok':'no',`${c.k} = ${v} (gefordert …${c.has})`]}
const age=(d,y)=>d&&(Date.now()-new Date(d))/31557600000>y,sy={ok:'✔ erfüllt',no:'✘ nicht erfüllt',unk:'? nicht belegt'};
$('b').onclick=()=>{const sel=[...$('rw').querySelectorAll('input:checked')].map(i=>i.value);if(!sel.length){$('out').innerHTML='<p class="no">Bitte mindestens eine Matrixzeile wählen.</p>';return}
 const NSS=NS(RS),lb=x=>RS.stufen[x];let min=NSS,minU=false,det='';const pn=val('produkt')||'Produkt';
 for(const n of sel){const r=RS.rows.find(x=>x.n==n);let er=0,stop=null,rows='';
  for(let s=0;s<NSS;s++){let all='ok';for(const c of r.q[s]){const[st,tx]=ev(c);rows+=`<tr><td>${esc(lb(s))}</td><td>${esc(tx)}</td><td class="${st}">${sy[st]}</td></tr>`;if(st!='ok'&&all!='no')all=st}
   if(all=='ok')er=s+1;else{stop=all;break}}
  min=Math.min(min,er);if(stop=='unk')minU=true;
  det+=`<h3>Zeile ${esc(r.n)}: ${esc(r.t)}${r.src?' <small class="s">(Quelle: '+esc(r.src)+')</small>':''}</h3><p>Voraussichtlich <b>${er?esc(lb(er-1)):'&lt;'+esc(lb(0))}</b>${stop=='unk'?' (höher möglich bei fehlenden Nachweisen)':''}</p><table><tr><th>Stufe</th><th>Befund</th><th>Status</th></tr>${rows}</table>`}
 const qs=min?lb(min-1):'<'+lb(0),w=[];if(age(val('svhcDatum'),RS.limits.svhcYears))w.push(`SVHC-Erklärung älter als ${RS.limits.svhcYears} Jahr(e)`);if(age(val('emDatum'),RS.limits.emYears))w.push(`Emissionsprüfung älter als ${RS.limits.emYears} Jahre`);if(val('svhcOver')===true)w.push('SVHC > 0,1 %: Bonus 5 / KPI 3 nicht erfüllt');
 $('out').innerHTML=`<h2>Ergebnis: ${esc(pn)}</h2><p class="big">Voraussichtlich geeignet für ${esc(qs)} (Produkt-Ebene)${minU?' – Konfidenz niedrig, Nachweise fehlen':''}</p>`+(w.length?'<p class="no">Hinweise: '+w.map(esc).join('; ')+'</p>':'')+det+`<p class="s">Prognose auf Basis der übermittelten Unterlagen und des Regelwerks ${esc(RSVER)}. ${esc(RS.hinweis||'QS3/QS4 erfordern zusätzlich Bauteilekatalog und Baustellenprotokolle.')} Verbindlich ist die Bewertung der DGNB-Auditorin bzw. des Auditors. Erstellt ${new Date().toLocaleString('de-DE')}.</p>`;
 LAST={produkt:pn,werte:vals(),zeilen:sel,qs:String(qs)+(minU?'?':''),ver:RSVER};$('sv').disabled=false;$('sm').textContent=''};
$('pr').onclick=()=>print();
$('sv').onclick=async()=>{await setDoc(doc(collection(db,'bewertungen')),{...await enc(LAST),ts:serverTimestamp(),by:auth.currentUser.uid});$('sm').textContent='Verschlüsselt gespeichert.';$('sv').disabled=true};
async function hist(){const q=await getDocs(query(collection(db,'bewertungen'),orderBy('ts','desc')));H={};let h='<table><tr><th>Datum</th><th>Produkt</th><th>QS</th><th>Regelwerk</th><th></th></tr>';
 for(const d of q.docs){try{const o=await dec(d.data());H[d.id]=o;h+=`<tr><td>${d.data().ts?d.data().ts.toDate().toLocaleDateString('de-DE'):''}</td><td>${esc(o.produkt)}</td><td>${esc((/^\d/.test(o.qs)?'QS':'')+o.qs)}</td><td>${esc(o.ver)}</td><td><button class="g" data-o="${d.id}">Laden</button> <button class="g" data-x="${d.id}">Löschen</button></td></tr>`}catch{}}
 $('hl').innerHTML=h+'</table>'}
$('hl').onclick=async e=>{const o=e.target.dataset.o,x=e.target.dataset.x;if(x&&confirm('Eintrag löschen?')){await deleteDoc(doc(db,'bewertungen',x));hist()}
 if(o){const v=H[o];document.querySelector('nav button[data-t=b]').click();setv(v.werte);$('rw').querySelectorAll('input').forEach(i=>i.checked=v.zeilen.map(String).includes(i.value));$('b').click()}};
// ---- Werte-Extraktion (Gemini über serverseitige Funktion) ----
$('x').onclick=async()=>{const t=prep($('t').value.trim());if(!t&&!SCAN.length){$('st').textContent='Kein Text.';return}$('st').textContent='KI arbeitet …';
 try{const j=await llm('values',{text:t.slice(0,100000),fields:RS.fields.map(({k,l,t:y})=>({k,l,t:y})),pdfs:SCAN.slice(0,1).map(x=>x.b64)});const b=j.belege||{};
  for(const f of RS.fields){const v=j[f.k];if(v==null)continue;$('f_'+f.k).value=f.t=='b'?(v?'1':'0'):v;$('b_'+f.k).textContent=b[f.k]||''}$('st').textContent='Fertig. Werte bitte prüfen.'}catch(e){$('st').textContent='Fehler: '+e.message}};
build();
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>0);
