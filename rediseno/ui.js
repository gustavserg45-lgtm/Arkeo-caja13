/* Arqueo Express · interfaz: acceso, Mi caja y motor de modales */

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
  file: '<path d="M6 3h8l4 4v14H6Z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  hand: '<path d="M4 13h5l3-3 5 2 3 1v6H8l-4-3Z"/><path d="M13 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
  list: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  rotate: '<path d="M4 10a8 8 0 1 1 2 6"/><path d="M4 4v6h6"/>',
  check: '<path d="M5 12.5 9.5 17 19 7"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  bank: '<path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v7M9 10v7M15 10v7M19 10v7M3 20h18"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.4"/>',
  lock: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M9 12h10"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  alert: '<path d="M12 3 2.5 20h19Z"/><path d="M12 9v5M12 17.5v.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4l11-11-4-4L4 16Z"/><path d="M13.5 6.5l4 4"/>'
};
function ic(name, size = 20) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}
const STATUS_TEXT = { verificado: "Verificado", pendiente: "Pendiente", revision: "En revisión", rechazado: "Rechazado" };
function tag(stateName, text) {
  return `<span class="tag" data-state="${stateName}">${esc(text)}</span>`;
}
function verificationTag(m) {
  const label = STATUS_TEXT[m.verification] || m.verification;
  return tag(m.verification, label);
}
function movementTags(m) {
  const bits = [];
  if (m.reversed) bits.push(tag("neutral", "Revertido"));
  if (m.kind === "out" && m.method !== "efectivo") {
    if (m.auth === "pendiente") bits.push(tag("pending", "Por autorizar"));
    else if (m.auth === "autorizado") bits.push(tag("verified", "Autorizado"));
    else if (m.auth === "rechazado") bits.push(tag("rejected", "No autorizado"));
    if (m.executed) bits.push(tag("neutral", "Ejecutado"));
  }
  if (m.duplicate) bits.push(tag("rejected", "Posible duplicado"));
  if (m.evidence?.length) bits.push(tag("neutral", m.evidence.length + " soporte" + (m.evidence.length === 1 ? "" : "s")));
  else if (methodIsDigital(m.method)) bits.push(tag("pending", "Sin soporte"));
  return bits.join("");
}

/* ── Acceso con PIN ─────────────────────────────────────────── */

let gateUser = "ana";
let pinBuffer = "";
let pinBusy = false;

function renderGate() {
  $("#app").hidden = true;
  $("#gate").hidden = false;
  if ($("#fab-wrap")) $("#fab-wrap").hidden = true;
  closeModal(true);
  const d = new Date();
  const label = d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  $("#gate-date").textContent = `${state.settings.caja} · ${label.charAt(0).toUpperCase() + label.slice(1)}`;
  $("#gate-users").innerHTML = Object.values(USERS).map((u) => `
    <button type="button" class="who" data-gate-user="${u.id}" aria-pressed="${u.id === gateUser}">
      <span class="avatar">${u.initials}</span>
      <span class="who-meta"><b>${esc(u.name)}</b><small>${u.roleLabel}</small></span>
      <span class="who-check" aria-hidden="true">${ic("check", 15)}</span>
    </button>`).join("");
  $("#pin-for").textContent = USERS[gateUser].name;
  $("#gate-error").textContent = "";
  renderPinDots();
}

function renderPinDots() {
  const dots = $("#pin-dots");
  dots.innerHTML = [0, 1, 2, 3].map((i) => `<i class="${i < pinBuffer.length ? "filled" : ""}"></i>`).join("");
  dots.setAttribute("aria-label", pinBuffer.length ? `${pinBuffer.length} de 4 dígitos` : "PIN vacío");
}

function gateKey(key) {
  if (pinBusy) return;
  const error = $("#gate-error");
  error.textContent = "";
  if (key === "clear") {
    pinBuffer = pinBuffer.slice(0, -1);
    renderPinDots();
    return;
  }
  if (key === "enter") {
    tryLogin();
    return;
  }
  if (!/^\d$/.test(key) || pinBuffer.length >= 4) return;
  pinBuffer += key;
  renderPinDots();
  if (pinBuffer.length === 4) {
    pinBusy = true;
    setTimeout(() => { pinBusy = false; tryLogin(); }, 140);
  }
}

function tryLogin() {
  const user = USERS[gateUser];
  if (pinBuffer.length !== 4) {
    $("#gate-error").textContent = "Ingresa los 4 dígitos del PIN.";
    return;
  }
  if (pinBuffer !== user.pin) {
    pinBuffer = "";
    renderPinDots();
    $("#gate-error").textContent = "PIN incorrecto. Intenta de nuevo.";
    const card = $(".gate-card");
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
    return;
  }
  session = { userId: user.id, at: new Date().toISOString() };
  saveSession();
  pinBuffer = "";
  renderApp();
  toast(`Bienvenida, ${user.name.split(" ")[0]}`);
  if (!state.shift) setTimeout(() => openModal("open"), 240);
}

/* ── Mi caja ────────────────────────────────────────────────── */

function renderApp() {
  if (!currentUser()) {
    renderGate();
    return;
  }
  $("#gate").hidden = true;
  $("#app").hidden = false;
  if ($("#fab-wrap")) $("#fab-wrap").hidden = false;
  renderDashboard();
}

function renderDashboard() {
  const u = currentUser();
  const cash = cashSummary();
  const moves = shiftMoves().slice().sort((a, b) => new Date(b.at) - new Date(a.at));
  const pend = pendingVerifications();
  const auths = pendingAuthorizations();
  const pendingAmount = [...pend, ...auths].reduce((t, m) => t + m.amount, 0);
  const openInv = openInvoices();
  const receivable = openInv.reduce((t, i) => t + invoiceSaldo(i), 0);
  const lastClose = state.closings[0];

  const hero = state.shift ? `
    <div class="drawer">
      <div class="drawer-top">
        <span>Efectivo esperado en caja</span>
        <span>${esc(state.shift.operator)} · desde ${timeHM(state.shift.openedAt)}</span>
      </div>
      <div class="drawer-figure"><span class="cur">$</span><span class="num">${nl(cash.expected)}</span></div>
      <div class="drawer-math">
        <div><dt>Base</dt><dd>${fmt(cash.base)}</dd></div>
        <div><dt>Entradas en efectivo</dt><dd class="in">+ ${nl(cash.ins)}</dd></div>
        <div><dt>Salidas en efectivo</dt><dd class="out">− ${nl(cash.outs)}</dd></div>
      </div>
      <div class="drawer-actions">
        <button class="btn btn-brass" type="button" data-modal="in">${ic("plus", 16)} Entrada de dinero</button>
        <button class="btn btn-ghost-dark" type="button" data-modal="out">${ic("minus", 16)} Salida de dinero</button>
        <button class="btn btn-ghost-dark" type="button" data-modal="close">${ic("lock", 16)} Cerrar caja</button>
      </div>
      <div class="drawer-lip">
        <span>Los métodos digitales no mueven el efectivo.</span>
        <b>${state.settings.caja}</b>
      </div>
    </div>` : `
    <div class="drawer drawer-closed">
      <div class="drawer-top"><span>Caja cerrada</span><span>${lastClose ? "Último cierre · " + dateShort(lastClose.closedAt) : "Sin turno activo"}</span></div>
      <h2>Todo cuadrado. Abre un turno cuando estés listo.</h2>
      <p>${lastClose ? `El turno anterior cerró con ${fmt(lastClose.counted)} contados y una diferencia de ${signed(lastClose.difference)}.` : "Aún no hay cierres registrados en este navegador."}</p>
      <div class="drawer-actions">
        <button class="btn btn-brass" type="button" data-modal="open">${ic("lock", 16)} Abrir caja</button>
        <button class="btn btn-ghost-dark" type="button" data-modal="result" data-draft='${lastClose ? JSON.stringify({ closingId: lastClose.id }) : "{}"}'>${ic("receipt", 16)} Ver último cierre</button>
      </div>
    </div>`;

  const roleNote = u.role === "encargado"
    ? `<button class="role-note ${pend.length + auths.length ? "" : "calm"}" type="button" data-modal="verify">
         <span class="role-note-icon">${ic("check", 19)}</span>
         <span class="role-note-text">
           <b>${pend.length + auths.length ? `${pend.length + auths.length} cosas esperan tu decisión` : "Sin verificaciones pendientes"}</b>
           <small>${pend.length + auths.length ? `${pend.length} por verificar · ${auths.length} por autorizar · ${fmt(pendingAmount)}` : "Las transferencias que registre el cajero aparecerán aquí."}</small>
         </span>
         <span class="role-note-go">Abrir bandeja ${ic("chevron", 14)}</span>
       </button>`
    : pend.length + auths.length
      ? `<div class="role-note quiet">
           <span class="role-note-icon">${ic("clock", 19)}</span>
           <span class="role-note-text"><b>${pend.length + auths.length} movimientos esperan al encargado</b><small>Puedes seguir registrando: el dinero no se bloquea.</small></span>
           <button class="text-link" type="button" data-modal="verify">Ver estado</button>
         </div>`
      : "";

  const actions = [
    { flow: "in", icon: "plus", title: "Entrada de dinero", hint: "Venta, abono u otro ingreso" },
    { flow: "out", icon: "minus", title: "Salida de dinero", hint: "Compra, gasto o retiro" },
    { flow: "invoices", icon: "file", title: "Facturas a crédito", hint: `${openInv.length} abiertas`, badge: openInv.length ? openInv.length : 0 },
    { flow: "abono", icon: "hand", title: "Abonos", hint: "Cobrar una factura" },
    { flow: "history", icon: "list", title: "Historial", hint: "Todo lo del turno" },
    { flow: "verify", icon: "check", title: "Verificaciones", hint: u.role === "encargado" ? "Revisar y decidir" : "Estado de lo pendiente", badge: pend.length + auths.length },
    { flow: "reverse", icon: "rotate", title: "Reversos y correcciones", hint: "Con rastro de auditoría" },
    { flow: "methods", icon: "card", title: "Métodos de pago", hint: "Qué entra directo y qué se verifica" }
  ];

  $("#app").innerHTML = `
    <header class="topbar">
      <a class="brand" href="#" aria-label="Arqueo Express, ir a Mi caja">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="brand-name">Arqueo <em>Express</em></span>
      </a>
      <p class="biz">${esc(state.settings.business)}</p>
      <div class="topbar-end">
        <span class="live" data-open="${state.shift ? "true" : "false"}"><i></i><span>${state.shift ? "Caja abierta" : "Caja cerrada"}</span></span>
        <div class="user-wrap">
          <button class="user-chip" type="button" id="user-chip" aria-expanded="false" aria-controls="user-menu">
            <span class="avatar sm">${u.initials}</span>
            <span class="user-meta"><b>${esc(u.name)}</b><small>${u.roleLabel}</small></span>
            ${ic("chevron", 14)}
          </button>
          <div class="user-menu" id="user-menu" hidden>
            <p><b>${esc(u.name)}</b><small>${u.roleLabel} · PIN ${u.pin}</small></p>
            <button type="button" data-switch-user>${ic("user", 16)} Cambiar de usuario</button>
            <button type="button" data-reset-demo>${ic("rotate", 16)} Reiniciar demo</button>
          </div>
        </div>
      </div>
    </header>

    <main id="main" class="page" tabindex="-1">
      <div class="page-head">
        <div>
          <p class="eyebrow">${esc(state.settings.business)} · ${state.settings.caja}</p>
          <h1>Mi caja</h1>
          <p class="sub">${state.shift ? `Turno abierto por ${esc(state.shift.operator)} a las ${timeHM(state.shift.openedAt)}. Registra, adjunta y deja que el encargado verifique.` : "No hay un turno activo. Abre la caja para empezar a registrar movimientos."}</p>
        </div>
        <div class="head-action">${state.shift ? `<button class="btn" type="button" data-modal="close">${ic("lock", 16)} Cerrar turno</button>` : `<button class="btn btn-ink" type="button" data-modal="open">${ic("lock", 16)} Abrir caja</button>`}</div>
      </div>

      ${hero}
      ${roleNote}

      <div class="actions-grid">
        ${actions.map((a) => `<button class="action-tile" type="button" data-modal="${a.flow}">
          <span class="tile-icon">${ic(a.icon, 21)}</span>
          <span class="tile-text"><b>${esc(a.title)}</b><small>${esc(a.hint)}</small></span>
          ${a.badge ? `<span class="tile-badge">${a.badge}</span>` : ""}
        </button>`).join("")}
      </div>

      <dl class="stats">
        <div><dt>Entradas verificadas</dt><dd class="in">${fmt(methodTotals().reduce((t, m) => t + m.ins, 0))}</dd></div>
        <div><dt>Salidas verificadas</dt><dd class="out">${fmt(methodTotals().reduce((t, m) => t + m.outs, 0))}</dd></div>
        <div><dt>Por verificar</dt><dd>${pend.length + auths.length ? fmt(pendingAmount) : "—"}</dd></div>
        <div><dt>Por cobrar</dt><dd>${fmt(receivable)}</dd></div>
      </dl>

      <section aria-labelledby="recent-title">
        <div class="section-head">
          <h2 id="recent-title">Movimientos del turno</h2>
          <span class="meta">${moves.length} registros</span>
          <button class="btn" type="button" data-modal="history">Ver historial</button>
        </div>
        ${moves.length ? `<div class="move-list">${moves.slice(0, 8).map(moveRow).join("")}</div>` : `<div class="empty"><h3>La gaveta está tranquila</h3><p>Registra la primera entrada o salida del turno. Cada movimiento genera su comprobante y su rastro de auditoría.</p></div>`}
      </section>

      <p class="app-foot">Prototipo local · ${esc(state.settings.business)} · Los datos viven en este navegador.</p>
    </main>`;
}

function moveRow(m) {
  return `
    <button class="move" type="button" data-move="${m.id}">
      <span class="move-sign ${m.kind}" aria-hidden="true">${ic(m.kind === "in" ? "plus" : "minus", 15)}</span>
      <span class="move-main">
        <b>${esc(m.concept)}</b>
        <small>${esc(methodName(m.method))} · ${timeHM(m.at)} · ${esc(m.party || "Sin contraparte")}</small>
      </span>
      <span class="move-tags">${movementTags(m)}</span>
      <span class="move-amt ${m.kind}">${signed(m.kind === "in" ? m.amount : -m.amount)}</span>
    </button>`;
}

/* ── Motor de modales ───────────────────────────────────────── */

let modal = null;
let modalRestoreFocus = null;
let toastTimer = 0;

function toast(message, type = "ok") {
  const el = $("#toast");
  el.textContent = message;
  el.classList.toggle("error", type === "error");
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

function modalSteps() {
  if (!modal) return [];
  const flow = FLOWS[modal.flow];
  return (flow?.steps ? flow.steps(modal.draft) : []) || [];
}

function openModal(flowKey, draft = {}) {
  const flow = FLOWS[flowKey];
  if (!flow) return;
  modalRestoreFocus = document.activeElement;
  modal = {
    flow: flowKey,
    step: 0,
    draft: { ...(flow.draft ? flow.draft(draft) : {}), ...draft },
    detailId: null,
    tab: "pending"
  };
  flow.enter?.(modal);
  $("#modal").hidden = false;
  document.body.classList.add("modal-open");
  renderModal();
  $("#modal-title").focus?.();
}

function closeModal(silent = false) {
  if (!modal) {
    $("#modal").hidden = true;
    document.body.classList.remove("modal-open");
    return;
  }
  modal = null;
  $("#modal").hidden = true;
  document.body.classList.remove("modal-open");
  if (!silent && modalRestoreFocus?.isConnected) modalRestoreFocus.focus();
}

function renderModal() {
  if (!modal) return;
  const flow = FLOWS[modal.flow];
  const steps = modalSteps();
  $("#modal-kicker").textContent = `${flow.n} de 12 · ${flow.kicker}`;
  $("#modal-title").textContent = typeof flow.title === "function" ? flow.title(modal.draft) : flow.title;
  $("#modal-steps").innerHTML = steps.length > 1 ? `
    <div class="step-track" role="list" aria-label="Pasos">
      ${steps.map((s, i) => `<div class="step ${i === modal.step ? "current" : ""} ${i < modal.step ? "done" : ""}" role="listitem">
        <span class="step-dot">${i < modal.step ? ic("check", 11) : i + 1}</span>
        <span class="step-label">${esc(s)}</span>
      </div>`).join("")}
    </div>` : "";
  const body = $("#modal-body");
  body.innerHTML = flow.render(modal.step, modal.draft, modal);
  $("#modal-foot").innerHTML = flow.foot ? flow.foot(modal) : defaultFoot();
  body.scrollTop = 0;
  const focusTarget = body.querySelector("[data-autofocus]");
  if (focusTarget) focusTarget.focus();
}

function updateModal() {
  if (modal) renderModal();
}

function defaultFoot() {
  const steps = modalSteps();
  const last = modal.step >= steps.length - 1;
  return `
    <button class="btn btn-quiet" type="button" data-mclose>Cancelar</button>
    <div class="foot-spacer"></div>
    ${modal.step > 0 ? `<button class="btn" type="button" data-back>${ic("chevron", 15)} Atrás</button>` : ""}
    <button class="btn btn-ink" type="button" data-next>${last ? "Continuar" : "Siguiente"} ${ic("chevron", 15)}</button>`;
}

function modalNext() {
  if (!modal) return;
  const flow = FLOWS[modal.flow];
  if (flow.collect && flow.collect(modal) === false) return;
  const steps = modalSteps();
  if (modal.step < steps.length - 1) {
    modal.step += 1;
    renderModal();
  }
}

function modalBack() {
  if (!modal) return;
  if (modal.step > 0) {
    modal.step -= 1;
    renderModal();
  } else {
    closeModal();
  }
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}
