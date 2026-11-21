'use strict';
const $=s=>document.querySelector(s),D=()=>window.DB,PEND=()=>D().PEND;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fmt=n=>Number.isFinite(n)?(Math.round(n*1000)/1000).toLocaleString('es-AR'):'—';
/* ---------- IndexedDB ---------- */
const idb=new Promise((ok,ko)=>{const r=indexedDB.open('infucare',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=ko});
const kvGet=async k=>{const d=await idb;return new Promise(r=>{const q=d.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result)})};
const kvSet=async(k,v)=>{const d=await idb;return new Promise(r=>{const t=d.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=r})};
const S={fav:[],hist:[],rec:[],notes:{},calc:[]};
async function load(){for(const k in S)S[k]=(await kvGet(k))??S[k];const th=await kvGet('theme');if(th)document.documentElement.dataset.theme=th;
 const u=await kvGet('dbUpdate');if(u&&u.version)window.DB=u;window.mergeX&&mergeX()}
const save=k=>kvSet(k,S[k]);
/* ---------- Calculadoras ---------- */
const FD=[['','— seleccione —'],['20','20 gtt/ml (macrogotero)'],['15','15 gtt/ml'],['10','10 gtt/ml'],['60','60 gtt/ml (microgotero)']];
const num=(v,lim,name)=>{const n=parseFloat(String(v).replace(',','.'));if(!Number.isFinite(n))throw `Falta ingresar: ${name}.`;if(n<=0&&!lim.zero)throw `${name} debe ser mayor que 0.`;if(lim&&(n<lim[0]||n>lim[1]))throw `${name}=${n} fuera del rango plausible (${lim[0]}–${lim[1]}). Verifique datos y unidades.`;return n};
const CALCS=[
{id:'peso',t:'Dosis por peso',f:[['dose','Dosis indicada','n'],['du','Unidad de la dosis','s',[['','— seleccione —'],['mg/kg','mg/kg'],['mcg/kg','mcg/kg']]],['per','Se refiere a','s',[['','— seleccione —'],['dosis','por dosis'],['dia','por día']]],['kg','Peso (kg)','n'],['n','Tomas por día','n']],
 run(v){const d=num(v.dose,[0,1000],'Dosis'),kg=num(v.kg,[0.3,300],'Peso'),n=num(v.n,[1,24],'Tomas por día');if(!v.du||!v.per)throw'Seleccione unidad y referencia de la dosis.';
 const tot=v.per==='dia'?d*kg:d*kg*n,toma=tot/n,u=v.du.split('/')[0];
 return{formula:'Total/día = dosis × kg × (tomas si es "por dosis"); Por toma = total/tomas',dev:`${d} ${v.du} × ${kg} kg → ${fmt(v.per==='dia'?d*kg:d*kg)} ${u}${v.per==='dia'?'/día':'/dosis'}; total/día ${fmt(tot)} ${u}; ÷ ${n} tomas`,res:`${fmt(toma)} ${u} por toma`,extra:`Total diario: ${fmt(tot)} ${u}. Compare con la dosis máxima del prospecto.`}}},
{id:'dil',t:'Dilución (C₁V₁ = C₂V₂)',f:[['c1','Concentración del fármaco (mg/ml)','n'],['dose','Dosis a preparar (mg)','n'],['vf','Volumen final deseado (ml)','n']],
 run(v){const c=num(v.c1,[0.001,1000],'Concentración'),d=num(v.dose,[0.0001,100000],'Dosis'),vf=num(v.vf,[0.1,5000],'Volumen final'),vd=d/c;
 if(vd>vf)throw`El volumen de fármaco (${fmt(vd)} ml) excede el volumen final. Revise datos.`;
 return{formula:'V fármaco = dosis ÷ C₁ ; V diluyente = V final − V fármaco ; C final = dosis ÷ V final',dev:`${d} mg ÷ ${c} mg/ml = ${fmt(vd)} ml; diluyente ${fmt(vf)} − ${fmt(vd)} = ${fmt(vf-vd)} ml`,res:`Fármaco ${fmt(vd)} ml + diluyente ${fmt(vf-vd)} ml`,extra:`Concentración final: ${fmt(d/vf)} mg/ml. Verifique en el prospecto el diluyente y la concentración máxima permitida.`,viz:[vd,vf-vd]}}},
{id:'inf',t:'Infusión: ml/h y gotas/min',f:[['vol','Volumen total (ml)','n'],['h','Tiempo (horas)','n'],['fg','Factor de goteo','s',FD]],
 run(v){const V=num(v.vol,[1,10000],'Volumen'),h=num(v.h,[0.0167,168],'Tiempo');if(!v.fg)throw'Seleccione el factor de goteo del equipo.';const fg=+v.fg,r=V/h,g=V*fg/(h*60);
 return{formula:'ml/h = V ÷ t ; gtt/min = (V × factor) ÷ (t × 60)',dev:`${V} ÷ ${h} = ${fmt(r)} ml/h ; (${V} × ${fg}) ÷ (${h} × 60) = ${fmt(g)}`,res:`${fmt(r)} ml/h · ${fmt(g)} ${fg===60?'microgotas':'gotas'}/min`,extra:'Redondee según el equipo y controle regularmente el goteo real.'}}},
{id:'mcg',t:'Infusión mcg/kg/min → ml/h',f:[['dose','Dosis (mcg/kg/min)','n'],['kg','Peso (kg)','n'],['c','Concentración de la solución (mg/ml)','n']],
 run(v){const d=num(v.dose,[0.001,500],'Dosis'),kg=num(v.kg,[0.3,300],'Peso'),c=num(v.c,[0.0001,1000],'Concentración'),r=d*kg*60/(c*1000);
 return{formula:'ml/h = dosis × kg × 60 ÷ (C mg/ml × 1000)',dev:`${d} × ${kg} × 60 ÷ (${c} × 1000) = ${fmt(r)}`,res:`${fmt(r)} ml/h`,extra:'Fármacos en infusión continua: confirmar con segundo profesional y protocolo institucional.'}}},
{id:'conv',t:'Conversión de unidades',f:[['x','Valor','n'],['a','De','s',[['','—'],['g','g'],['mg','mg'],['mcg','mcg'],['L','L'],['ml','ml']]],['b','A','s',[['','—'],['g','g'],['mg','mg'],['mcg','mcg'],['L','L'],['ml','ml']]]],
 run(v){const x=num(v.x,[0,1e9],'Valor');const m={g:['m',1],mg:['m',1e-3],mcg:['m',1e-6],L:['v',1],ml:['v',1e-3]};if(!v.a||!v.b)throw'Seleccione unidades.';if(m[v.a][0]!==m[v.b][0])throw'Dimensiones incompatibles (masa vs volumen).';const r=x*m[v.a][1]/m[v.b][1];
 return{formula:'valor × (factor origen ÷ factor destino)',dev:`${x} ${v.a} → ${fmt(r)} ${v.b}`,res:`${fmt(r)} ${v.b}`,extra:'Para % p/v: 1% = 10 mg/ml. UI no son convertibles a masa sin factor del producto.'}}},
{id:'meq',t:'mg ↔ mmol ↔ mEq',f:[['mg','Masa (mg)','n'],['pm','Peso molecular (g/mol) del compuesto','n'],['val','Valencia total de iones','n']],
 run(v){const mg=num(v.mg,[0,1e7],'Masa'),pm=num(v.pm,[1,2000],'Peso molecular'),val=num(v.val,[1,6],'Valencia'),mm=mg/pm;
 return{formula:'mmol = mg ÷ PM ; mEq = mmol × valencia',dev:`${mg} ÷ ${pm} = ${fmt(mm)} mmol ; × ${val}`,res:`${fmt(mm)} mmol = ${fmt(mm*val)} mEq`,extra:'Verifique el PM de la sal exacta del producto (anhidra/hidratada).'}}},
{id:'bal',t:'Balance hídrico',f:[['i','Ingresos totales (ml)','n'],['e','Egresos medidos (ml)','n'],['p','Pérdidas insensibles estimadas (ml)','n']],
 run(v){const i=num(v.i,[0,20000],'Ingresos'),e=num(v.e,[0,20000],'Egresos'),p=num(v.p,[0,3000],'Pérdidas insensibles'),b=i-e-p;
 return{formula:'Balance = ingresos − (egresos + pérdidas insensibles)',dev:`${i} − (${e} + ${p}) = ${fmt(b)}`,res:`${b>=0?'+':''}${fmt(b)} ml`,extra:'Interprete con clínica, peso diario y función renal.'}}},
{id:'def',t:'Déficit de líquidos (estimación)',f:[['kg','Peso (kg)','n'],['pc','Deshidratación estimada (%)','n']],
 run(v){const kg=num(v.kg,[0.3,300],'Peso'),p=num(v.pc,[0.5,15],'% deshidratación'),d=kg*p*10;
 return{formula:'Déficit (ml) = peso (kg) × % × 10',dev:`${kg} × ${p} × 10 = ${fmt(d)}`,res:`${fmt(d)} ml`,extra:'Estimación orientativa. El esquema de reposición lo define el equipo médico.'}}},
{id:'mant',t:'Mantenimiento (regla 4-2-1, referencia)',f:[['kg','Peso (kg)','n']],
 run(v){const kg=num(v.kg,[0.5,200],'Peso');let r=kg<=10?kg*4:kg<=20?40+(kg-10)*2:60+(kg-20);
 return{formula:'4 ml/kg/h (primeros 10 kg) + 2 ml/kg/h (siguientes 10) + 1 ml/kg/h (resto)',dev:`Peso ${kg} kg → ${fmt(r)} ml/h`,res:`${fmt(r)} ml/h ≈ ${fmt(r*24)} ml/día`,extra:'Regla de referencia pediátrica (Holliday-Segar). Los adultos y pacientes críticos requieren individualización médica.'}}}];
function calcView(id){const c=CALCS.find(x=>x.id===id);if(!c)return`<h2>Calculadoras</h2>${CALCS.map(x=>`<a href="#calc/${x.id}"><div class="card"><b>${x.t}</b></div></a>`).join('')}<div class="warn">Herramientas de apoyo. No son prescripciones. No hay concentraciones ni factores de goteo por defecto.</div>`;
 return`<h2>${c.t}</h2><div class="card" id="cf">${c.f.map(([k,l,t,o])=>`<label>${l}</label>${t==='s'?`<select id="f_${k}">${o.map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('')}</select>`:`<input id="f_${k}" inputmode="decimal" autocomplete="off">`}`).join('')}<button id="go">Calcular</button></div><div id="out"></div>
 <div class="warn">Doble verificación independiente antes de administrar. Contraste con prospecto y protocolo institucional.</div>`}
function bindCalc(id){const c=CALCS.find(x=>x.id===id);if(!c)return;$('#go').onclick=()=>{const v={};c.f.forEach(([k])=>v[k]=$('#f_'+k).value);const o=$('#out');
 try{const r=c.run(v);o.innerHTML=`<div class="card"><label>Fórmula</label><pre>${esc(r.formula)}</pre><label>Datos ingresados</label><pre>${esc(JSON.stringify(v))}</pre><label>Desarrollo</label><pre>${esc(r.dev)}</pre><label>Resultado</label><div class="res">${esc(r.res)}</div><p class="mu">${esc(r.extra)}</p>
 ${r.viz?`<div class="bar"><i style="width:${r.viz[0]/(r.viz[0]+r.viz[1])*100}%;background:var(--pr)"></i><i style="width:${r.viz[1]/(r.viz[0]+r.viz[1])*100}%;background:var(--ac)"></i></div><p class="mu">■ fármaco · ■ diluyente</p>`:''}
 <button class="s" id="cp">Copiar resultado</button></div>`;
 $('#cp').onclick=()=>navigator.clipboard?.writeText(`${c.t}: ${r.res}\n${r.dev}`);
 S.calc.unshift({fecha:new Date().toISOString(),calc:c.t,datos:JSON.stringify(v),resultado:r.res});S.calc=S.calc.slice(0,200);save('calc')}
 catch(e){o.innerHTML=`<div class="err">⚠ ${esc(e)}</div>`}}}
/* ---------- Búsqueda ---------- */
function index(){const d=D();return[
 ...d.drugs.map(x=>({k:'drug',id:x.id,t:x.nombre,s:x.grupo,r:x.riesgo,h:norm([x.nombre,x.generico,x.grupo,x.tags,x.indicaciones].join(' '))})),
 ...d.fluids.map(x=>({k:'fluid',id:x.id,t:x.nombre,s:'Solución IV',h:norm([x.nombre,x.comp,x.ind,'suero solucion fluidoterapia'].join(' '))})),
 ...d.paths.map(x=>({k:'path',id:x.id,t:x.nombre,s:'Patología · '+x.sistema,h:norm([x.nombre,x.tags,x.sistema,x.tipos.map(t=>t[0]).join(' ')].join(' '))}))]}
function search(q){const t=norm(q).split(/\s+/).filter(Boolean);if(!t.length)return[];return index().map(i=>({...i,sc:t.reduce((a,w)=>a+(i.h.includes(w)?(norm(i.t).includes(w)?3:1):0),0)})).filter(i=>i.sc>0).sort((a,b)=>b.sc-a.sc)}
const resRow=i=>`<a href="#${i.k}/${i.id}"><div class="card"><b>${esc(i.t)}</b>${i.r==='alto'?' <span class="tag" style="background:var(--da);color:var(--dt)">ALTO RIESGO</span>':''}<div class="mu">${esc(i.s)}</div></div></a>`;
/* ---------- Vistas ---------- */
const sec=(l,v)=>`<div class="card"><label>${l}</label><div>${v?esc(v):`<span class="mu">${PEND()}</span>`}</div></div>`;
function drugView(id){const x=D().drugs.find(d=>d.id===id);if(!x)return'<p>No encontrado.</p>';if(!S.rec.includes(id)){S.rec.unshift(id);S.rec=[...new Set(S.rec)].slice(0,10);save('rec')}
 const fav=S.fav.includes(id),high=x.riesgo==='alto';
 const body=`${sec('Nombre genérico',x.generico)}${sec('Grupo farmacológico',x.grupo)}${sec('Marcas en Argentina / laboratorio / registro ANMAT',x.marcas)}${sec('Presentaciones y concentración',x.presentaciones)}${sec('Indicaciones',x.indicaciones)}
 ${high?'<div class="card"><label>Dosis, dilución y velocidad</label><div class="err">Sin instrucciones autónomas de administración para medicamentos de alto riesgo. Seguir prescripción médica y protocolo institucional con doble control.</div></div>':sec('Dosis, dilución, velocidad y compatibilidad',null)}
 ${sec('Monitorización de Enfermería',x.monitorizacion)}${sec('Reacciones adversas',x.adversas)}`;
 return`<h2>${esc(x.nombre)}</h2><span class="tag">Riesgo ${esc(x.riesgo)}</span><div class="${high?'err':'warn'}">⚠ ${esc(x.alerta)}</div>
 <div class="grid"><button id="fv" class="s">${fav?'★ Quitar favorito':'☆ Favorito'}</button><button class="s" onclick="print()">PDF / Imprimir</button></div>
 ${high?`<label><input type="checkbox" id="ack" style="width:auto"> Entiendo que esta ficha es educativa y que debo verificar con prescripción y protocolo.</label><div id="hb" hidden>${body}</div>`:body}
 <div class="card"><label>Nota personal</label><textarea id="nt" rows="3">${esc(S.notes[id]||'')}</textarea></div>
 <p class="mu">Datos con valor <i>null</i> = pendientes de verificación. Base v${D().version} (${D().fecha}). Fuentes a consultar: ${D().fuentes.slice(0,3).join('; ')}.</p>`}
function bindDrug(id){$('#fv').onclick=()=>{S.fav=S.fav.includes(id)?S.fav.filter(x=>x!==id):[...S.fav,id];save('fav');route()};
 $('#nt').onchange=e=>{S.notes[id]=e.target.value;save('notes')};const a=$('#ack');if(a)a.onchange=()=>$('#hb').hidden=!a.checked}
const fluidView=id=>{const f=D().fluids.find(x=>x.id===id);return`<h2>${esc(f.nombre)}</h2>${sec('Composición',f.comp)}${sec('Osmolaridad',f.osm)}${sec('Indicaciones',f.ind)}${sec('Riesgos / alteraciones',f.riesgos)}${sec('Monitorización',f.mon)}${sec('Compatibilidad',null)}<div class="warn">Indicación y volumen: prescripción médica.</div>`};
const pathView=id=>{const p=D().paths.find(x=>x.id===id);return`<h2>${esc(p.nombre)}</h2><div class="warn">Contenido educativo. No constituye diagnóstico ni prescripción individualizada. No existe un tratamiento único: depende de la causa.</div>${sec('Definición',p.def)}${p.tipos.map(t=>`<div class="card"><h3>${esc(t[0])}</h3><p>${esc(t[1])}</p><label>Estudios</label><p>${esc(t[2])}</p><label>Tratamiento según causa</label><p>${esc(t[3])}</p></div>`).join('')}${sec('Diferenciales',p.dif)}${sec('Monitorización',p.mon)}${sec('Criterios de derivación',p.der)}<div class="card"><label>Medicamentos relacionados</label>${p.meds.map(m=>`<a href="#drug/${m}">${esc(D().drugs.find(d=>d.id===m).nombre)}</a>`).join('')}</div><p class="mu">Fuente: ${esc(p.fuente)}</p>`};
const ELEC=[['Sodio (Na⁺)','135–145 mEq/L'],['Potasio (K⁺)','3,5–5,0 mEq/L'],['Calcio total','8,5–10,5 mg/dL'],['Magnesio','1,7–2,2 mg/dL'],['Fósforo','2,5–4,5 mg/dL'],['Cloro (Cl⁻)','98–106 mEq/L']];
const views={
 home(){const r=S.rec.map(id=>D().drugs.find(d=>d.id===id)).filter(Boolean);return`<input id="q" placeholder="🔍 Medicamento, patología, solución…" autocomplete="off"><div id="sr"></div>
 <div class="grid">${CALCS.slice(0,4).map(c=>`<a href="#calc/${c.id}"><div class="card"><b>🧮 ${c.t}</b></div></a>`).join('')}</div>
 <div class="card"><b>Recientes</b>${r.map(d=>`<div><a href="#drug/${d.id}">${esc(d.nombre)}</a></div>`).join('')||'<div class="mu">Sin consultas.</div>'}</div>
 <div class="card"><b>★ Favoritos</b>${S.fav.map(id=>D().drugs.find(d=>d.id===id)).filter(Boolean).map(d=>`<div><a href="#drug/${d.id}">${esc(d.nombre)}</a></div>`).join('')||'<div class="mu">Sin favoritos.</div>'}</div>
 <div class="err"><b>Alertas de seguridad:</b> potasio concentrado, insulina, heparina, opioides, vasopresores, electrolitos concentrados, margen terapéutico estrecho, riesgo de anafilaxia. <a href="#safety">Ver</a></div>`},
 fluids(){return`<h2>Sueroterapia</h2>${D().fluids.map(f=>`<a href="#fluid/${f.id}"><div class="card"><b>${esc(f.nombre)}</b><div class="mu">${esc(f.comp)}</div></div></a>`).join('')}<a href="#calc/inf"><button>Calcular velocidad de infusión</button></a>`},
 elec(){return`<h2>Electrolitos</h2><div class="err">Correcciones de alto riesgo: solo con indicación médica y revisión profesional. Esta sección no genera órdenes.</div>${ELEC.map(e=>`<div class="card"><b>${e[0]}</b><div class="mu">Referencia orientativa: ${e[1]} — el rango depende del laboratorio.</div><div class="mu">${PEND()}</div></div>`).join('')}`},
 safety(){return`<h2>Administración segura</h2><div class="card"><b>Correctos</b><p>Paciente · medicamento · dosis · vía · hora · registro · indicación · velocidad · alergias · vencimiento/estabilidad.</p></div>
 <div class="card"><b>Antes de administrar</b><p>Identificar con 2 datos; verificar alergias; doble control en alto riesgo; confirmar permeabilidad y tipo de acceso; registrar; vigilar reacciones y notificar a farmacovigilancia (ANMAT).</p></div>
 <div class="card"><b>Medicamentos de alto riesgo</b><p>Potasio concentrado, insulina, heparina, opioides, vasopresores, electrolitos concentrados, margen terapéutico estrecho, riesgo de anafilaxia: sin instrucciones autónomas; protocolo y doble control.</p></div>
 <div class="warn">Si falta información: ${PEND()}</div>`},
 lib(){const g={};D().paths.forEach(p=>(g[p.sistema]=g[p.sistema]||[]).push(p));return`<h2>Biblioteca clínica</h2>${Object.entries(g).map(([s,l])=>`<div class="card"><b>${s}</b>${l.map(p=>`<div><a href="#path/${p.id}">${esc(p.nombre)}</a></div>`).join('')}</div>`).join('')}<p class="mu">Otros sistemas (Cardiología, Nefrología, Endocrinología, Gastroenterología, Neurología, Infectología, Neumonología, Medicina interna, Nutrición): pendientes de carga verificada.</p>`},
 settings(){return`<h2>Ajustes</h2><div class="card"><button id="th" class="s">Alternar modo oscuro</button><button id="up">Actualizar base de datos</button><button id="csv" class="s">Exportar cálculos (CSV)</button><div class="mu" id="st">Base local v${D().version} (${D().fecha})</div></div><div class="card"><b>Historial de cálculos</b>${S.calc.slice(0,10).map(c=>`<div class="mu">${c.fecha.slice(0,16)} · ${esc(c.calc)} → ${esc(c.resultado)}</div>`).join('')||'<div class="mu">Vacío.</div>'}</div>
 <div class="warn">InfuCare Pro es una herramienta educativa y de apoyo. No reemplaza el juicio profesional, el prospecto oficial ni los protocolos institucionales.</div>`}};
function route(){const [r,a]=location.hash.slice(1).split('/');const app=$('#app');let h;
 if(r==='calc')h=calcView(a);else if(r==='drug')h=drugView(a);else if(r==='fluid')h=fluidView(a);else if(r==='path')h=pathView(a);else h=(views[r]||views.home)();
 app.innerHTML=h;window.scrollTo(0,0);
 $('#nav').innerHTML=[['','🏠','Inicio'],['calc','🧮','Calcular'],['fluids','💧','Sueros'],['lib','📚','Clínica'],['labs','🔬','Valores'],['safety','🛡','Seguridad'],['settings','⚙','Ajustes']].map(n=>`<a href="#${n[0]}" class="${(r||'')===n[0]?'on':''}"><span>${n[1]}</span>${n[2]}</a>`).join('');
 if(r==='calc')bindCalc(a);if(r==='drug'&&D().drugs.some(d=>d.id===a))bindDrug(a);
 if(!r||!views[r]&&!['calc','drug','fluid','path'].includes(r)){const q=$('#q');if(q)q.oninput=()=>{$('#sr').innerHTML=search(q.value).map(resRow).join('')||(q.value?`<div class="card mu">Sin resultados. ${PEND()}</div>`:'')}}
 window.bindX&&bindX(r,a);if(r==='settings'){$('#th').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;kvSet('theme',t)};
 $('#csv').onclick=()=>{const rows=[['fecha','calculo','datos','resultado'],...S.calc.map(c=>[c.fecha,c.calc,c.datos,c.resultado])];const b=new Blob(['\ufeff'+rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='infucare-calculos.csv';a.click()};
 $('#up').onclick=async()=>{const s=$('#st');if(!navigator.onLine){s.textContent='Sin conexión: se usa la base local.';return}try{const t=await (await fetch('db.js?'+Date.now())).text();const m=t.match(/window\.DB=([\s\S]*);?\s*$/);const nd=Function('return '+m[1])();await kvSet('dbUpdate',nd);window.DB=nd;window.mergeX&&mergeX();s.textContent='Base actualizada a v'+nd.version}catch(e){s.textContent='No se pudo actualizar.'}}}}
function net(){const n=$('#net');n.textContent=navigator.onLine?'En línea · datos locales':'Sin conexión · datos locales'}
addEventListener('hashchange',route);addEventListener('online',net);addEventListener('offline',net);
load().then(()=>{route();net()});
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
