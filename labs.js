/* Módulo Valores de referencia + evaluador + panel de anemia. Educativo; no diagnostica. */
function mergeX(){const X=window.DBX,d=window.DB;if(!X||!d||d.mergedX===X.version)return;
 X.drugs.forEach(x=>{if(!d.drugs.some(y=>y.id===x.id))d.drugs.push(x)});X.paths.forEach(x=>{if(!d.paths.some(y=>y.id===x.id))d.paths.push(x)});
 const an=d.paths.find(p=>p.id==='anemia');if(an)['cmfe','b12','folico'].forEach(m=>{if(!an.meds.includes(m))an.meds.push(m)});
 d.labs=X.labs;d.mergedX=X.version}
mergeX();
const POPS=[['todos','Adulto (general)'],['varon','Varón adulto'],['mujer','Mujer adulta no embarazada'],['embarazada','Embarazada']];
const rng=(l,p)=>l.r[p]||l.r.todos||Object.values(l.r)[0];
function classify(l,p,v,ov){const [a,b]=ov||rng(l,p);const lo=a!=null&&v<a,hi=b!=null&&v>b;return{lo,hi,txt:lo?'POR DEBAJO del rango':hi?'POR ENCIMA del rango':'Dentro del rango',range:`${a??'—'} – ${b??'—'} ${l.u}`}}
const pn=s=>{const n=parseFloat(String(s).replace(',','.'));return Number.isFinite(n)?n:null};
views.labs=()=>{const L=DB.labs;return`<h2>Valores de referencia</h2><div class="warn">Valores orientativos de uso general. El rango válido es el del laboratorio que procesó la muestra: puede modificarlo abajo. No es un diagnóstico.</div>
<div class="card"><b>Evaluar un resultado</b><label>Estudio</label><select id="la">${L.map(l=>`<option value="${l.id}">${esc(l.n)}</option>`).join('')}</select><label>Población</label><select id="lp">${POPS.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select>
<label>Resultado</label><input id="lv" inputmode="decimal"><div class="grid"><div><label>Mín. del laboratorio (opcional)</label><input id="lmin" inputmode="decimal"></div><div><label>Máx. del laboratorio (opcional)</label><input id="lmax" inputmode="decimal"></div></div><button id="le">Evaluar</button><div id="lo"></div></div>
<div class="card"><b>Panel de orientación en anemia</b><div class="mu">Ingrese los datos disponibles; los campos vacíos no se evalúan.</div><label>Población</label><select id="ap">${POPS.slice(1).map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select>
${[['hb','Hemoglobina (g/dL)'],['vcm','VCM (fL)'],['ferr','Ferritina (ng/mL)'],['tsat','Saturación de transferrina (%)'],['b12','Vitamina B12 (pg/mL)'],['fol','Folato (ng/mL)']].map(x=>`<label>${x[1]}</label><input id="a_${x[0]}" inputmode="decimal">`).join('')}
<label><input type="checkbox" id="a_inf" style="width:auto"> Inflamación / ERC conocida</label><button id="ab">Orientar</button><div id="ao"></div></div>
<div class="card"><b>Tabla de referencia</b>${L.map(l=>`<div style="margin:8px 0"><b>${esc(l.n)}</b> <span class="tag">${Object.entries(l.r).map(([p,r])=>`${p==='todos'?'':p+': '}${r[0]??'—'}–${r[1]??'—'}`).join(' · ')} ${esc(l.u)}</span><div class="mu">${esc(l.nota)}</div></div>`).join('')}</div>`};
window.bindX=(r)=>{if(r!=='labs')return;
 $('#le').onclick=()=>{const l=DB.labs.find(x=>x.id===$('#la').value),v=pn($('#lv').value);const o=$('#lo');if(v==null||v<0){o.innerHTML='<div class="err">Ingrese un resultado numérico válido.</div>';return}
  const mn=pn($('#lmin').value),mx=pn($('#lmax').value),ov=(mn!=null||mx!=null)?[mn,mx]:null,c=classify(l,$('#lp').value,v,ov);
  o.innerHTML=`<div class="card"><div class="res">${v} ${esc(l.u)}</div><b>${c.txt}</b><div class="mu">Rango usado: ${c.range}${ov?' (del laboratorio)':' (referencia orientativa)'}</div>${c.lo&&l.bajo?`<p>${esc(l.bajo)}</p>`:''}${c.hi&&l.alto?`<p>${esc(l.alto)}</p>`:''}<div class="mu">${esc(l.nota)}</div>${(c.lo||c.hi)&&l.path?`<a href="#path/${l.path}">Ver cuadro clínico relacionado</a>`:''}<div class="warn">Interpretar con clínica e historia. Informar al equipo médico.</div></div>`;
  S.calc.unshift({fecha:new Date().toISOString(),calc:'Valor de referencia: '+l.n,datos:`${v} ${l.u}`,resultado:c.txt});save('calc')};
 $('#ab').onclick=()=>{const p=$('#ap').value,g=id=>pn($('#a_'+id).value),G=id=>DB.labs.find(l=>l.id===id),v={};['hb','vcm','ferr','tsat','b12','fol'].forEach(k=>v[k]=g(k));const inf=$('#a_inf').checked,o=$('#ao'),out=[];
  if(v.hb==null){o.innerHTML='<div class="err">Ingrese al menos la hemoglobina.</div>';return}
  const anem=classify(G('hb'),p,v.hb).lo;if(!anem){o.innerHTML='<div class="card"><b>Hemoglobina dentro del rango orientativo.</b> No hay anemia por este criterio.</div>';return}
  out.push(`Hemoglobina ${v.hb} g/dL: anemia por criterio OMS.`);
  const mic=v.vcm!=null&&v.vcm<80,mac=v.vcm!=null&&v.vcm>100,fl=v.ferr!=null&&v.ferr<(inf?100:30),ts=v.tsat!=null&&v.tsat<20;
  if(v.vcm!=null)out.push(mic?'VCM bajo (microcítica).':mac?'VCM alto (macrocítica).':'VCM normal (normocítica).');
  if(mic||v.vcm==null){if(fl&&(ts||v.tsat==null))out.push(inf?'Ferritina baja para contexto inflamatorio ± saturación baja: compatible con déficit de hierro (posiblemente combinado con inflamación).':'Patrón compatible con déficit de hierro. Es obligatorio buscar la causa (pérdidas, ingesta, malabsorción).');
   else if(v.ferr!=null&&!fl&&ts)out.push('Ferritina no baja con saturación baja: considerar anemia de enfermedad crónica/inflamación u otras causas (talasemia).');else if(mic&&v.ferr!=null&&!fl)out.push('Microcitosis con ferritina normal: considerar talasemia, inflamación, otras causas.')}
  if(mac){const b=v.b12!=null&&v.b12<200,f=v.fol!=null&&v.fol<4;out.push(b?'B12 baja: compatible con anemia megaloblástica por déficit de B12.':'');out.push(f?'Folato bajo: compatible con déficit de folato. Descartar B12 antes de tratar.':'');if(v.b12==null||v.fol==null)out.push('Faltan B12 y/o folato para orientar la macrocitosis.')}
  o.innerHTML=`<div class="card"><b>Orientación educativa</b>${out.filter(Boolean).map(x=>`<p>${esc(x)}</p>`).join('')}<div class="err">No es un diagnóstico ni una indicación de tratamiento. La elección de terapia (oral, intravenosa, vitaminas) y su dosis corresponde al médico según la causa. <a href="#path/anemia">Ver Anemia</a></div></div>`}};
