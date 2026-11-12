/* Arqueo Express v2.0 — experiencia cajero y PIN local. No es autenticación de servidor. */
'use strict';
let currentOperator=null;
let pinFailures=0;
let lockUntil=0;
let cashReady={opening:false,closing:false};
let closeDraft={nextBase:null,note:''};
const oldRender=render, oldCash=renderCash, oldModal=renderModal, oldSettings=renderSettings, oldMenu=renderMenu;
const PIN_ITERATIONS=140000;
const pinData=()=>state.auth?.operators||[];
const validOperator=o=>o&&o.active!==false;
const signedIn=()=>currentOperator&&pinData().some(o=>o.id===currentOperator.id&&validOperator(o));
const operatorName=()=>signedIn()?currentOperator.name:'';
const isManager=()=>signedIn()&&currentOperator.role==='admin';
const blockedPages=['ajustes','reportes'];
const safePage=()=>{if(!signedIn())return;if(!isManager()&&blockedPages.includes(ui.page))ui.page='inicio'};
const pinText=v=>String(v||'').replace(/\D/g,'');
const validPin=(p,admin=false)=>new RegExp(admin?'^[0-9]{6}$':'^[0-9]{4,6}$').test(p);
const randBytes=()=>{const a=new Uint8Array(16);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')};
async function derivePin(pin,salt){if(!globalThis.crypto?.subtle)throw Error('El PIN requiere una conexión segura HTTPS o localhost.');const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(salt.match(/.{2}/g).map(x=>parseInt(x,16))),iterations:PIN_ITERATIONS,hash:'SHA-256'},key,256);return Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,'0')).join('')}
const authShell=(kind)=>{let setup=kind==='setup';return '<div class="pin-screen"><section class="pin-card"><div class="pin-mark">'+icon('wallet')+'</div><div class="pin-kicker">ARQUEO EXPRESS · COLOMBIA</div><h1>'+(setup?'Configura el acceso a caja':'Identifícate para continuar')+'</h1><p class="pin-help">'+(setup?'Crea al responsable principal. Después podrás agregar cajeros con su propio PIN.':'Cada cajero entra con su PIN personal. Los movimientos quedan asociados a su turno.')+'</p><form id="'+(setup?'pin-setup-form':'pin-login-form')+'" autocomplete="off">'+(setup?'<div class="field"><label for="setup-name">Nombre del administrador</label><input id="setup-name" name="name" maxlength="80" placeholder="Ej.: Encargado de caja" required autocomplete="off"></div>':'<div class="field"><label for="pin-person">¿Quién va a trabajar?</label><select id="pin-person" name="person" required>'+pinData().filter(validOperator).map(o=>'<option value="'+esc(o.id)+'">'+esc(o.name)+(o.role==='admin'?' · Responsable':' · Cajero')+'</option>').join('')+'</select></div>')+'<div class="field"><label for="pin-code">'+(setup?'Crea un PIN de 6 dígitos':'PIN de acceso')+'</label><input id="pin-code" class="pin-input" type="password" inputmode="numeric" pattern="[0-9]{'+(setup?'6':'4,6')+'}" minlength="'+(setup?'6':'4')+'" maxlength="6" name="pin" autocomplete="off" placeholder="'+(setup?'••••••':'Tu PIN')+'" required></div>'+(setup?'<div class="field"><label for="pin-repeat">Repite el PIN</label><input id="pin-repeat" class="pin-input" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" name="repeat" autocomplete="off" placeholder="••••••" required></div>':'')+'<button class="btn primary full pin-continue" type="submit">'+(setup?'Crear acceso y continuar':'Entrar a mi caja')+' '+icon('arrow')+'</button></form><p class="pin-notice">Protección de acceso en este navegador. No sustituye usuarios y permisos en un servidor; no compartas el dispositivo ni guardes datos sensibles.</p></section></div>'};
const countValue=(mode)=>denominationTotal(mode==='opening'?ui.openingDenoms:ui.closingDenoms);
const countPcs=(mode)=>sum(Object.values(mode==='opening'?ui.openingDenoms:ui.closingDenoms),num);
const countHidden=mode=>CASH_DENOMS.map(d=>'<input type="hidden" name="denom_'+d.key+'" value="'+num((mode==='opening'?ui.openingDenoms:ui.closingDenoms)[d.key])+'">').join('');
const closeMoney=(movements,predicate)=>sum(movements.filter(m=>m.method==='efectivo'&&predicate(m)),m=>num(m.amount));
function closeBreakdown(shift,counted=0){
 const movements=shiftMovements(shift.id);
 const inCash=m=>m.direction==='in'&&m.method==='efectivo';
 const outCash=m=>m.direction==='out'&&m.method==='efectivo';
 const category=(name)=>m=>m.category===name;
 const cashSales=closeMoney(movements,m=>inCash(m)&&category('venta')(m));
 const creditCollections=closeMoney(movements,m=>inCash(m)&&category('abono_cliente')(m));
 const internalTransfers=closeMoney(movements,m=>inCash(m)&&(category('ingreso_caja')(m)||category('retiro')(m)))
   -closeMoney(movements,m=>outCash(m)&&(category('ingreso_caja')(m)||category('retiro')(m)));
 const otherIncome=closeMoney(movements,m=>inCash(m)&&!['venta','abono_cliente','ingreso_caja'].includes(m.category));
 const expenses=closeMoney(movements,m=>outCash(m)&&['gasto','nomina','anticipo','nomina_otro','egreso_otro','reverso'].includes(m.category));
 const purchases=closeMoney(movements,m=>outCash(m)&&category('compra')(m));
 const supplierPayments=closeMoney(movements,m=>outCash(m)&&['abono_proveedor','pago_proveedor_directo'].includes(m.category));
 const refunds=closeMoney(movements,m=>outCash(m)&&category('devolucion_cliente')(m));
 const electronicIn=sum(movements.filter(m=>m.direction==='in'&&m.method!=='efectivo'),m=>num(m.amount));
 const electronicOut=sum(movements.filter(m=>m.direction==='out'&&m.method!=='efectivo'),m=>num(m.amount));
  const values={base_initial:num(shift.base),cash_sales:cashSales,credit_collections:creditCollections,other_income:otherIncome,expenses,purchases,supplier_payments:supplierPayments,refunds,internal_transfers:internalTransfers,cash_counted:num(counted)};
 const calculate=typeof calculateCashReconciliation==='function'?calculateCashReconciliation:(input=>({expected_cash:input.base_initial+input.cash_sales+input.credit_collections+input.other_income-input.expenses-input.purchases-input.supplier_payments-input.refunds+input.internal_transfers,cash_difference:input.cash_counted-(input.base_initial+input.cash_sales+input.credit_collections+input.other_income-input.expenses-input.purchases-input.supplier_payments-input.refunds+input.internal_transfers)}));
 const result=calculate(values);
 return {...values,...result,electronic_in:electronicIn,electronic_out:electronicOut};
}
function closeLine(label,value,detail=''){return '<div class="v2-close-line"><span>'+label+(detail?'<small>'+detail+'</small>':'')+'</span><b>'+fmt(value)+'</b></div>'}
function syncState(){
 const status=state.sync?.status;
 if(status==='synced')return {key:'synced',label:'Sincronizado',detail:'Última confirmación del servidor registrada.'};
 if(status==='error')return {key:'error',label:'Error de sincronización',detail:'El registro local sigue conservado.'};
 if(status==='pending')return {key:'pending',label:'Pendiente de sincronización',detail:'Guardado localmente; aún no hay confirmación del servidor.'};
 return {key:'pending',label:'Pendiente de sincronización',detail:'Modo local: el backend todavía no está conectado.'};
}
function syncBadge(){const s=syncState();return '<div class="v2-sync-status '+s.key+'" role="status"><span class="v2-sync-dot"></span><span><b>'+s.label+'</b><small>'+s.detail+'</small></span></div>'}
function countTile(mode,type,heading,helper){const counts=mode==='opening'?ui.openingDenoms:ui.closingDenoms;const amount=CASH_DENOMS.filter(d=>d.type===type).reduce((s,d)=>s+d.value*num(counts[d.key]),0);const pcs=CASH_DENOMS.filter(d=>d.type===type).reduce((s,d)=>s+num(counts[d.key]),0);return '<button type="button" class="v2-count-tile" data-v2="count-start" data-mode="'+mode+'" data-step="'+type+'"><span class="v2-tile-icon '+type+'">'+icon(type==='bill'?'receipt':'coin')+'</span><span class="v2-tile-text"><b>'+heading+'</b><small>'+helper+'</small><strong>'+fmt(amount)+' <span>· '+pcs+' piezas</span></strong></span><span class="v2-chevron">'+icon('chevron')+'</span></button>'}
renderCash=function(){
 const s=activeShift();if(s)return oldCash();
 const last=lastShift(),suggest=last?.status==='closed'?'<div class="v2-small-note">Última base dejada: <b>'+fmt(last.nextBase)+'</b>. Cuenta nuevamente la que recibes.</div>':'<div class="v2-small-note">Puedes abrir la caja con $0 si no recibes base inicial.</div>';
 return pageTitle('Abrir caja','Paso 1 de tu turno · verifica el dinero que recibes.')+
 '<section class="v2-open-layout"><div class="panel v2-open-card"><div class="v2-step-line"><span class="v2-step-circle">1</span><div><b>Cajero identificado</b><small>Tu turno quedará registrado con este responsable</small></div><span class="v2-done">'+icon('check')+'</span></div><form id="open-shift-form"><div class="v2-operator">'+icon('users')+' <div><b>'+esc(operatorName())+'</b><small>Acceso verificado con PIN</small></div></div><input type="hidden" name="operator" value="'+esc(operatorName())+'"><div class="v2-step-line"><span class="v2-step-circle">2</span><div><b>Cuenta tu base de caja</b><small>Abre los contadores de billetes y monedas</small></div></div>'+suggest+
 '<div class="v2-count-tiles">'+countTile('opening','bill','Billetes','Primero cuenta todos los billetes')+countTile('opening','coin','Monedas','Después cuenta las monedas')+'</div>'+
 '<div class="v2-total-box"><div><small>BASE DE APERTURA</small><strong>'+fmt(countValue('opening'))+'</strong><span>'+countPcs('opening')+' piezas registradas</span></div><span class="v2-state '+(cashReady.opening?'ok':'')+'">'+(cashReady.opening?'Conteo confirmado':'Por contar')+'</span></div>'+
 '<div class="field v2-note"><label for="opening-note">Observaciones (opcional)</label><textarea id="opening-note" name="note" placeholder="Ej.: turno de la mañana" rows="2"></textarea></div>'+countHidden('opening')+
 '<button class="btn primary full v2-submit" type="submit" '+(!cashReady.opening?'disabled':'')+'>'+icon('check')+' Abrir caja con '+fmt(countValue('opening'))+'</button>'+
 (!cashReady.opening?'<p class="v2-helper">Completa los dos contadores y confirma el resumen para continuar.</p>':'<p class="v2-helper">Verifica el total antes de abrir el turno.</p>')+'</form></div>'+
 '<aside class="panel v2-open-aside"><div class="panel-body"><div class="v2-guide-symbol">'+icon('info')+'</div><h2>¿Qué debes hacer?</h2><ol><li>Cuenta los billetes.</li><li>Cuenta las monedas.</li><li>Confirma el total y abre caja.</li></ol><p>Al terminar, verás los botones de <b>Cobrar venta</b>, <b>Registrar pago</b> y <b>Cerrar caja</b>.</p></div></aside></section>';
};
renderDashboard=function(){
 const s=activeShift();if(!s)return renderCash();
 const cash=shiftExpected(s),movs=shiftMovements(s.id).slice(-4).reverse();
 const action=(title,desc,pg,tab,ic,extra='')=>'<button type="button" class="v2-group-action" data-action="quick" data-page-target="'+pg+'" '+(tab?'data-tab="'+tab+'"':'')+' '+extra+'>'+icon(ic)+'<span><b>'+title+'</b><small>'+desc+'</small></span>'+icon('chevron')+'</button>';
 const group=(kind,title,desc,items)=>'<section class="v2-operation-group '+kind+'"><div class="v2-group-heading"><span class="v2-group-icon">'+icon(kind==='in'?'plus':'minus')+'</span><div><h3>'+title+'</h3><p>'+desc+'</p></div></div><div class="v2-group-actions">'+items.join('')+'</div></section>';
 return pageTitle('Mi caja','Elige una operación para comenzar.')+
  '<div class="v2-cash-hero"><div><div class="v2-hero-label">'+icon('check')+' TURNO ABIERTO · '+esc(s.operator)+'</div><small>Efectivo estimado en gaveta</small><strong>'+fmt(cash)+'</strong><span>Base '+fmt(s.base)+' · Abierta '+esc(dt(s.openedAt))+'</span></div><button type="button" data-action="goto-caja" class="v2-hero-link">Ver caja '+icon('arrow')+'</button></div>'+syncBadge()+
  '<section class="v2-action-panel"><div class="v2-section-head"><h2>¿Qué vas a hacer?</h2><p>Primero elegí el movimiento; después te pedimos solo los datos necesarios.</p></div><div class="v2-operation-groups">'+
  group('in','Recibir dinero','Todo lo que entra a la caja o se registra como cobro.',[
   action('Cobrar una venta','Efectivo, transferencia, tarjeta o crédito','registrar','venta','receipt'),
   action('Buscar una factura','Registrar un abono de cliente o proveedor','cartera','','users','data-page="cartera"')
  ])+
  group('out','Entregar dinero','Todo lo que sale de la caja o se registra como pago.',[
   action('Pagar una compra','Contado o crédito a proveedor','registrar','compra','wallet'),
   action('Registrar gasto o retiro','Gasto, nómina, devolución o traslado','registrar','gasto','minus')
  ])+
  '</div><div class="v2-secondary-actions">'+
  '<button type="button" class="v2-secondary-action" data-action="goto-movimientos">'+icon('file-text')+'<span><b>Comprobantes</b><small>Buscar y revisar movimientos</small></span>'+icon('chevron')+'</button>'+ 
  '<button type="button" class="v2-secondary-action" data-action="show-close">'+icon('wallet')+'<span><b>Cerrar y conciliar</b><small>Comparar ventas, pagos y efectivo</small></span>'+icon('chevron')+'</button>'+ 
  '</div></section>'+
 '<div class="grid-2 v2-lower"><section class="panel"><div class="panel-head"><div><h2>Últimas operaciones</h2><p>Tu turno actual</p></div><button class="btn small" data-action="goto-movimientos">Ver todas</button></div>'+(movs.length?renderMovTable(movs,false):empty('Sin movimientos','Comienza con un cobro o un pago.','receipt'))+'</section>'+
  '<section class="panel"><div class="panel-head"><div><h2>Estado del turno</h2><p>La conciliación se hace al finalizar</p></div></div><div class="panel-body"><p class="v2-muted">El sistema separa efectivo, transferencias y tarjetas para que el resultado sea fácil de revisar.</p><div class="v2-turn-tip">'+icon('check')+' <span><b>Caja activa</b><small>Los movimientos quedan asociados a este turno.</small></span></div></div></section></div>';
};
function wizardStepTitle(step){return step==='bill'?'Cuenta los billetes':step==='coin'?'Cuenta las monedas':'Revisa tu conteo'}
function wizardBody(mode,step){
 const counts=mode==='opening'?ui.openingDenoms:ui.closingDenoms;
 const order=['bill','coin','review'],pos=order.indexOf(step);
 const title=wizardStepTitle(step),total=countValue(mode);
 const pill=(name,i)=>'<span class="v2-progress '+(i===pos?'active':i<pos?'done':'')+'">'+(i<pos?icon('check'):(i+1))+' <span>'+name+'</span></span>';
 const head='<div class="v2-progress-row">'+pill('Billetes',0)+pill('Monedas',1)+pill('Resumen',2)+'</div><div class="v2-wizard-heading"><h2>'+title+'</h2><p>'+(step==='bill'?'Ingresa la cantidad de cada billete. No necesitas calcular montos.':step==='coin'?'Registra las cantidades. La moneda de $1.000 es distinta al billete.':'Confirma el total antes de regresar a la apertura o al cierre.')+'</p></div>';
 let middle='';
 if(step==='review'){
 const group=type=>{const list=CASH_DENOMS.filter(d=>d.type===type&&num(counts[d.key])>0),subtotal=sum(list,d=>d.value*num(counts[d.key]));return '<div class="v2-review-group"><div><b>'+(type==='bill'?'Billetes':'Monedas')+'</b><button type="button" class="v2-text-button" data-v2="counter-goto" data-step="'+type+'">Editar</button></div><strong>'+fmt(subtotal)+'</strong><small>'+(list.length?list.map(d=>fmt(d.value)+' × '+num(counts[d.key])).join(' · '):'Sin piezas registradas')+'</small></div>'};
 middle='<div class="v2-review-amount"><small>TOTAL CONTADO</small><strong>'+fmt(total)+'</strong><span>'+countPcs(mode)+' piezas en total</span></div>'+group('bill')+group('coin');
 }else{
 const set=CASH_DENOMS.filter(d=>d.type===step);
 middle='<div class="v2-denom-grid">'+set.map(d=>{const n=num(counts[d.key]);return '<div class="v2-denom-card" data-count="'+d.key+'"><div class="v2-denom-label"><span class="v2-denom-icon '+step+'">'+(step==='coin'?'$':'▣')+'</span><div><b>'+fmt(d.value)+'</b><small>'+(d.key==='b1000'?'Billete antiguo':step==='coin'?'Moneda':'Billete')+'</small></div></div><div class="v2-denom-step"><button type="button" data-v2="counter-change" data-key="'+d.key+'" data-delta="-1" aria-label="Quitar '+fmt(d.value)+'">−</button><input type="number" name="counter_'+d.key+'" min="0" max="100000" step="1" inputmode="numeric" value="'+(n||'')+'" aria-label="Cantidad de '+fmt(d.value)+'" placeholder="0"><button type="button" data-v2="counter-change" data-key="'+d.key+'" data-delta="1" aria-label="Agregar '+fmt(d.value)+'">+</button></div><div class="v2-denom-amount" data-total="'+d.key+'">'+fmt(d.value*n)+'</div></div>'}).join('')+'</div>';
 }
 const back=pos>0?'<button type="button" class="btn" data-v2="counter-back">'+icon('arrow')+' Atrás</button>':'<button type="button" class="btn" data-v2="counter-cancel">Cancelar</button>';
 return '<div class="modal-cover v2-wizard-cover"><div class="modal v2-wizard" role="dialog" aria-modal="true" aria-label="'+title+'"><div class="v2-wizard-top"><div><span class="v2-eyebrow">'+(mode==='opening'?'APERTURA':'CIERRE')+' · PASO '+(pos+1)+' DE 3</span></div><button class="modal-x" data-v2="counter-cancel" type="button" aria-label="Salir del conteo">'+icon('close')+'</button></div>'+head+'<div class="v2-wizard-scroll">'+middle+'</div><div class="v2-wizard-foot"><div><small>TOTAL ACUMULADO</small><strong id="v2-running-total">'+fmt(total)+'</strong></div><div class="v2-wizard-buttons">'+back+'<button class="btn primary" type="button" data-v2="counter-next">'+(pos===2?'Confirmar conteo':pos===0?'Seguir a monedas':'Revisar total')+' '+icon('chevron')+'</button></div></div></div></div>';
}
renderModal=function(){
 if(!ui.modal)return '';
 if(ui.modal.kind==='cashcount')return wizardBody(ui.modal.mode,ui.modal.step);
 if(ui.modal.kind!=='close')return oldModal();
 const s=activeShift();if(!s)return '';
 const counted=countValue('closing'),breakdown=closeBreakdown(s,counted),expected=breakdown.expected_cash,difference=breakdown.cash_difference;
 const suggest=Math.min(s.base,Math.max(0,counted));
 const nextBase=closeDraft.nextBase===null?suggest:closeDraft.nextBase;
 return '<div class="modal-cover v2-close-cover"><div class="modal v2-close-modal" role="dialog" aria-modal="true" aria-label="Cerrar caja"><div class="modal-head"><div><span class="v2-eyebrow">CIERRE DEL TURNO</span><h2>Cuenta y concilia la caja</h2></div><button type="button" class="modal-x" data-action="close-modal" aria-label="Cerrar">'+icon('close')+'</button></div><div class="modal-content"><form id="close-form">'+syncBadge()+'<div class="v2-close-summary"><span>Efectivo esperado</span><strong>'+fmt(expected)+'</strong></div><p class="v2-muted">La máquina y los medios electrónicos se revisan aparte. Aquí se calcula únicamente el efectivo físico.</p>'+
  '<div class="v2-close-breakdown"><div class="v2-close-breakdown-head"><div><b>Resumen del turno</b><small>Movimientos en efectivo registrados</small></div><span class="v2-state ok">'+shiftMovements(s.id).length+' movimientos</span></div>'+
  closeLine('Base inicial',breakdown.base_initial)+closeLine('Ventas en efectivo',breakdown.cash_sales)+closeLine('Cobros de créditos anteriores',breakdown.credit_collections)+closeLine('Otros ingresos',breakdown.other_income)+closeLine('Gastos',breakdown.expenses)+closeLine('Compras',breakdown.purchases)+closeLine('Pagos a proveedores',breakdown.supplier_payments)+closeLine('Devoluciones',breakdown.refunds)+'</div>'+
  '<div class="v2-close-electronic"><div><b>Medios electrónicos separados</b><small>No modifican el efectivo de la gaveta.</small></div><div class="v2-electronic-grid">'+closeLine('Entradas electrónicas',breakdown.electronic_in)+closeLine('Salidas electrónicas',breakdown.electronic_out)+'</div></div>'+
  '<div class="v2-count-tiles">'+countTile('closing','bill','Billetes','Registrar cantidades')+countTile('closing','coin','Monedas','Registrar cantidades')+'</div>'+
  '<div class="v2-close-compare"><div><small>CONTADO</small><b>'+fmt(counted)+'</b></div><div><small>DIFERENCIA</small><b class="'+(difference?'v2-alert':'v2-match')+'">'+(cashReady.closing?fmt(difference):'Por contar')+'</b></div></div>'+
  '<div class="field"><label for="v2-next-base">Base para el próximo turno (COP)</label><input type="number" id="v2-next-base" name="nextBase" inputmode="numeric" step="1" min="0" max="'+counted+'" value="'+nextBase+'" required></div><div class="field"><label for="v2-close-note">Novedades (opcional)</label><textarea id="v2-close-note" name="note" rows="2" placeholder="Observaciones del cierre">'+esc(closeDraft.note)+'</textarea></div>'+countHidden('closing')+
  '<div class="v2-close-actions"><button class="btn" type="button" data-action="close-modal">Volver</button><button class="btn primary" type="submit" '+(!cashReady.closing?'disabled':'')+'>'+icon('check')+' Confirmar cierre</button></div></form></div></div></div>';
};
openShift=function(form){
 if(activeShift())return toast('Ya tienes un turno activo.','error');
 if(!cashReady.opening)return toast('Primero confirma el conteo de billetes y monedas.','error');
 try{const counts=readDenominationCounts(form),base=denominationTotal(counts);
  const operator=operatorName();if(!operator)return toast('Inicia sesión con tu PIN.','error');
  const ok=commit(()=>state.shifts.push({id:uid(),openedAt:new Date().toISOString(),operator,operatorId:currentOperator.id,base,baseDenominations:counts,openNote:form.elements.namedItem('note').value.trim(),status:'open'}),'Caja abierta. Ahora puedes registrar cobros y pagos.');
  if(ok){cashReady.opening=false;ui.openingDenoms={};ui.page='inicio';render();}
 }catch(e){toast(e.message,'error')}
};
closeShift=function(form){
 const s=activeShift();if(!s)return;
 if(!cashReady.closing)return toast('Primero confirma el conteo de billetes y monedas.','error');
 try{const counts=readDenominationCounts(form),counted=denominationTotal(counts),nextBase=Number(form.elements.namedItem('nextBase').value);
  if(!Number.isSafeInteger(nextBase)||nextBase<0||nextBase>counted)throw Error('La base debe ser un entero entre $0 y el dinero contado.');
   const reconciliation=closeBreakdown(s,counted),expected=reconciliation.expected_cash,difference=reconciliation.cash_difference;
   const ok=commit(()=>Object.assign(s,{status:'closed',closedAt:new Date().toISOString(),closedById:currentOperator.id,closedBy:operatorName(),counted,countedDenominations:counts,nextBase,difference,expected,withdrawal:counted-nextBase,reconciliation,note:form.elements.namedItem('note').value.trim()}),'Caja cerrada. Diferencia: '+fmt(difference));
  if(ok){cashReady.closing=false;ui.closingDenoms={};closeDraft={nextBase:null,note:''};ui.modal={kind:'shift',id:s.id};ui.page='caja';render();}
 }catch(e){toast(e.message,'error')}
};
renderSettings=function(){
 const base=oldSettings();if(!isManager())return base;
 const members=pinData().map(o=>'<div class="v2-member"><div><b>'+esc(o.name)+'</b><small>'+(o.role==='admin'?'Administrador':'Cajero')+' · '+(validOperator(o)?'Activo':'Desactivado')+'</small></div><div class="v2-member-actions">'+(validOperator(o)?'<button class="btn small" type="button" data-v2="operator-pin" data-id="'+esc(o.id)+'">Cambiar PIN</button>':'')+(o.role!=='admin'&&o.id!==currentOperator.id?'<button class="btn small" type="button" data-v2="operator-toggle" data-id="'+esc(o.id)+'">'+(validOperator(o)?'Desactivar':'Activar')+'</button>':'')+'</div></div>').join('');
 return base+'<section class="panel v2-team"><div class="panel-head"><div><h2>Accesos de cajeros</h2><p>Los PIN se guardan como verificadores cifrados en este dispositivo.</p></div></div><div class="panel-body"><div class="v2-team-list">'+members+'</div><h3>Agregar cajero</h3><form id="v2-add-operator" class="form-grid"><div class="field"><label for="v2-person-name">Nombre del cajero</label><input id="v2-person-name" name="name" maxlength="80" required placeholder="Nombre y apellido"></div><div class="field"><label for="v2-person-pin">PIN (4 a 6 números)</label><input id="v2-person-pin" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" autocomplete="new-password" required></div><div class="field full"><button class="btn primary" type="submit">'+icon('plus')+' Crear acceso</button></div></form><p class="v2-small-note">Esta protección es local: para varios cajeros, varios dispositivos o permisos confiables necesitas autenticación y base de datos en un servidor.</p></div></section>';
};
renderMenu=function(){
 const html=oldMenu();if(isManager())return html;
 return html.replace(/<button\b[^>]*data-page="(?:reportes|ajustes)"[^>]*>[\s\S]*?<\/button>/g,'');
};
const drawV2=()=>{
 const app=document.getElementById('app');if(!app)return;
 if(!pinData().length){app.innerHTML=authShell('setup');document.body.classList.add('v2-locked');document.documentElement.classList.add('v2-ready');return}
 if(!signedIn()){currentOperator=null;app.innerHTML=authShell('login');document.body.classList.add('v2-locked');document.documentElement.classList.add('v2-ready');return}
 document.body.classList.remove('v2-locked');safePage();oldRender();
 app.querySelectorAll('.topbar-right').forEach(el=>{el.innerHTML='<div class="v2-account"><span class="v2-account-avatar">'+esc(operatorName().charAt(0))+'</span><span class="v2-account-name"><b>'+esc(operatorName())+'</b><small>'+(isManager()?'Administrador':'Cajero')+'</small></span></div><button type="button" class="v2-lock" data-v2="lock" title="Bloquear sesión" aria-label="Bloquear sesión">'+icon('close')+' <span>Salir</span></button>'});
 app.querySelector('.brand')?.insertAdjacentHTML('beforeend','<span class="v2-ver">v2.0</span>');
 if(!isManager()){app.querySelectorAll('[data-page="reportes"],[data-page="ajustes"]').forEach(el=>el.remove())}
 document.documentElement.classList.add('v2-ready');
};
render=drawV2;
function startWizard(mode,step='bill'){
 if(mode==='opening'){cashReady.opening=false}else{cashReady.closing=false;const form=document.getElementById('close-form');if(form)closeDraft={nextBase:Number(form.elements.namedItem('nextBase').value),note:form.elements.namedItem('note').value}}
 ui.modal={kind:'cashcount',mode,step};render();
}
function closeWizard(){const m=ui.modal;if(m?.kind!=='cashcount')return;ui.modal=m.mode==='closing'?{kind:'close'}:null;render()}
function updateWizardCard(input){
 const key=input.name.slice(8),d=CASH_DENOMS.find(x=>x.key===key);if(!d)return;
 const raw=input.value.trim(),value=raw===''?0:Number(raw);
 if(!Number.isSafeInteger(value)||value<0||value>100000){input.setCustomValidity('Usa un entero entre 0 y 100.000');return}
 input.setCustomValidity('');
 const m=ui.modal,counts=m.mode==='opening'?ui.openingDenoms:ui.closingDenoms;
 counts[key]=value;
 const row=input.closest('.v2-denom-card');
 const sub=row?.querySelector('[data-total]');if(sub)sub.textContent=fmt(value*d.value);
 const total=document.getElementById('v2-running-total');if(total)total.textContent=fmt(countValue(m.mode));
}
function changeWizardStep(direction){
 const m=ui.modal,steps=['bill','coin','review'];if(!m||m.kind!=='cashcount')return;
 const newIndex=steps.indexOf(m.step)+direction;
 if(newIndex<0){closeWizard();return}
 if(newIndex>2){
  if(m.mode==='opening')cashReady.opening=true;else cashReady.closing=true;
  ui.modal=m.mode==='closing'?{kind:'close'}:null;render();return;
 }
 m.step=steps[newIndex];render();
}
async function addOperator(form){
 if(!isManager())return;
 const name=form.elements.namedItem('name').value.trim(),pin=pinText(form.elements.namedItem('pin').value);
 if(name.length<2||name.length>80)throw Error('Escribe el nombre del cajero.');
 if(!validPin(pin))throw Error('Usa un PIN de 4 a 6 dígitos.');
 if(pinData().some(o=>o.name.toLowerCase()===name.toLowerCase()))throw Error('Ya existe un cajero con ese nombre.');
 const salt=randBytes(),hash=await derivePin(pin,salt);
 commit(()=>state.auth.operators.push({id:uid(),name,role:'cashier',active:true,salt,hash}),'Acceso creado para '+name+'.');
}
function lock(){currentOperator=null;ui.modal=null;ui.page='inicio';render()}
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-v2]');if(!el)return;
 e.preventDefault();e.stopImmediatePropagation();const action=el.dataset.v2;
 if(action==='lock'){lock();return}
 if(!signedIn())return;
 if(action==='count-start'){startWizard(el.dataset.mode,el.dataset.step);return}
 if(action==='counter-cancel'){closeWizard();return}
 if(action==='counter-goto'){ui.modal.step=el.dataset.step;render();return}
 if(action==='counter-next'){const invalid=document.querySelector('.v2-wizard input:invalid');if(invalid){invalid.reportValidity();return}changeWizardStep(1);return}
 if(action==='counter-back'){changeWizardStep(-1);return}
 if(action==='counter-change'){const row=el.closest('.v2-denom-card'),input=row?.querySelector('input');if(!input)return;const v=Math.max(0,Math.min(100000,num(input.value)+Number(el.dataset.delta)));input.value=v||'';updateWizardCard(input);return}
 if(action==='operator-toggle'&&isManager()){const op=pinData().find(x=>x.id===el.dataset.id);if(op&&op.role==='cashier'){commit(()=>op.active=!validOperator(op),op.active?'Acceso habilitado.':'Acceso actualizado.')}return}
 if(action==='operator-pin'&&isManager()){const op=pinData().find(x=>x.id===el.dataset.id);if(!op)return;const a=prompt('Nuevo PIN para '+op.name+' (4 a 6 números):');if(a===null)return;const pin=pinText(a);if(!validPin(pin,op.role==='admin'))return toast('PIN inválido. Para administrador se requieren 6 dígitos.','error');(async()=>{const salt=randBytes();const hash=await derivePin(pin,salt);commit(()=>{op.hash=hash;op.salt=salt},'PIN cambiado.')})().catch(e=>toast(e.message,'error'));return}
},true);
document.addEventListener('input',e=>{if(!e.target.matches('.v2-wizard [name^="counter_"]'))return;updateWizardCard(e.target)},true);
document.addEventListener('submit',async e=>{
 const form=e.target;if(!['pin-setup-form','pin-login-form','v2-add-operator'].includes(form.id))return;
 e.preventDefault();e.stopImmediatePropagation();
 const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;
 try{
  if(form.id==='pin-setup-form'){
   if(pinData().length)throw Error('El acceso ya está configurado.');
   const name=form.elements.namedItem('name').value.trim(),p=pinText(form.elements.namedItem('pin').value),confirmPin=pinText(form.elements.namedItem('repeat').value);
   if(name.length<2||!validPin(p,true)||p!==confirmPin)throw Error('Comprueba el nombre y los dos PIN de 6 dígitos.');
   const salt=randBytes(),hash=await derivePin(p,salt),id=uid();
   if(!commit(()=>state.auth={operators:[{id,name,role:'admin',active:true,salt,hash}]},'Acceso principal configurado.'))return;
   currentOperator={id,name,role:'admin'};ui.page=activeShift()?'inicio':'caja';render();return;
  }
  if(form.id==='pin-login-form'){
   const now=Date.now();if(now<lockUntil)throw Error('Demasiados intentos. Vuelve a intentarlo en '+Math.ceil((lockUntil-now)/1000)+' segundos.');
   const op=pinData().find(x=>x.id===form.elements.namedItem('person').value&&validOperator(x));if(!op)throw Error('Usuario no disponible.');
   const entered=pinText(form.elements.namedItem('pin').value);if(!validPin(entered))throw Error('Introduce tu PIN de 4 a 6 dígitos.');
   const hash=await derivePin(entered,op.salt);if(hash!==op.hash){pinFailures++;if(pinFailures>=5){lockUntil=Date.now()+30000;pinFailures=0}throw Error('PIN incorrecto. Verifica e inténtalo nuevamente.')}
   pinFailures=0;lockUntil=0;currentOperator={id:op.id,name:op.name,role:op.role};ui.page=activeShift()?'inicio':'caja';ui.modal=null;render();toast('Bienvenido, '+op.name+'.');return;
  }
  if(form.id==='v2-add-operator'){await addOperator(form);render()}
 }catch(err){toast(err.message||'No se pudo completar la operación.','error')}
 finally{if(submit?.isConnected)submit.disabled=false}
},true);
document.addEventListener('click',e=>{
 if(signedIn())return;
 const target=e.target.closest('button,[data-page],[data-action]');
 if(target&&!target.closest('.pin-card')){e.preventDefault();e.stopImmediatePropagation()}
},true);
document.addEventListener('submit',e=>{
 if(signedIn())return;if(['pin-login-form','pin-setup-form'].includes(e.target.id))return;
 e.preventDefault();e.stopImmediatePropagation();
},true);
document.addEventListener('click',e=>{
 if(!signedIn()||isManager())return;
 const p=e.target.closest('[data-page]');if(p&&blockedPages.includes(p.dataset.page)){e.preventDefault();e.stopImmediatePropagation();toast('Acceso reservado al administrador.','error');return}
},true);
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape'||ui.modal?.kind!=='cashcount')return;
 e.preventDefault();e.stopImmediatePropagation();closeWizard();
},true);
const originalShowClose=()=>{cashReady.closing=false;ui.closingDenoms={};closeDraft={nextBase:null,note:''}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-action="show-close"]');if(b)originalShowClose()},true);
render();
