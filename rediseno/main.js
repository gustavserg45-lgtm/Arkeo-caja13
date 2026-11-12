/* Arqueo Express · cableado de eventos, captura de soportes y arranque */

function readEvidence(file) {
  if (!file || !modal) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 1100;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.82);
      modal.draft.evidence = modal.draft.evidence || [];
      modal.draft.evidence.push({ name: file.name || "soporte.jpg", data });
      renderModal();
      toast("Soporte adjuntado · la decisión sigue siendo del encargado");
    };
    img.onerror = () => toast("No pudimos leer esa imagen. Prueba con otra.", "error");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function updateWithdrawal() {
  const out = $("#modal-body [data-withdrawal]");
  const base = $("#modal-body [data-next-base]");
  const totalEl = $("#modal-body [data-count-total]");
  if (!out || !base || !totalEl) return;
  const counted = parseMoney(totalEl.textContent);
  const next = parseMoney(base.value);
  out.textContent = fmt(Math.max(0, counted - next));
}

document.addEventListener("click", (event) => {
  const target = event.target;

  /* Acceso */
  const who = target.closest("[data-gate-user]");
  if (who) {
    gateUser = who.dataset.gateUser;
    pinBuffer = "";
    $$("[data-gate-user]").forEach((b) => b.setAttribute("aria-pressed", String(b === who)));
    $("#pin-for").textContent = USERS[gateUser].name;
    $("#gate-error").textContent = "";
    renderPinDots();
    return;
  }
  const key = target.closest("[data-key]");
  if (key) { gateKey(key.dataset.key); return; }

  /* Menú de usuario */
  const chip = target.closest("#user-chip");
  if (chip) {
    const menu = $("#user-menu");
    const open = menu.hidden;
    menu.hidden = !open;
    chip.setAttribute("aria-expanded", String(open));
    return;
  }
  if (!target.closest(".user-wrap") && $("#user-menu")) {
    $("#user-menu").hidden = true;
    $("#user-chip")?.setAttribute("aria-expanded", "false");
  }
  if (target.closest("[data-switch-user]")) {
    session = null;
    saveSession();
    renderGate();
    return;
  }
  if (target.closest("[data-reset-demo]")) {
    resetDemo();
    gateUser = "ana";
    pinBuffer = "";
    renderGate();
    toast("Demo reiniciada");
    return;
  }

  /* Acciones rápidas flotantes */
  const fab = target.closest("#fab-toggle");
  if (fab) {
    toggleFab();
    return;
  }
  const quick = target.closest("[data-quick]");
  if (quick) {
    closeFab();
    openModal(quick.dataset.quick);
    return;
  }
  if (!target.closest("#fab-wrap")) closeFab();

  /* Abrir flujos y comprobantes */
  const opener = target.closest("[data-modal]");
  if (opener) {
    let draft = {};
    if (opener.dataset.draft) {
      try { draft = JSON.parse(opener.dataset.draft); } catch { draft = {}; }
    }
    closeFab();
    openModal(opener.dataset.modal, draft);
    return;
  }
  const move = target.closest("[data-move]");
  if (move) {
    openModal("receipt", { receiptId: move.dataset.move });
    return;
  }
  if (target.closest("[data-mclose]")) { closeModal(); return; }
  if (target.closest("[data-back]")) { modalBack(); return; }
  if (target.closest("[data-next]")) { modalNext(); return; }

  /* Acciones internas del flujo */
  const act = target.closest("[data-act]");
  if (act && modal && $("#modal").contains(act)) {
    const handler = FLOWS[modal.flow]?.action;
    if (handler) handler(act.dataset.act, modal.draft, act.dataset.value);
    if (modal) renderModal();
  }
});

/* Contadores, importes y búsqueda */
document.addEventListener("input", (event) => {
  const el = event.target;
  if (el.matches("[data-money]")) {
    const n = parseMoney(el.value);
    el.value = n ? nl(n) : "";
    updateWithdrawal();
  }
  if (el.matches("[data-next-base]")) {
    updateWithdrawal();
    if (modal) modal.draft.nextBase = parseMoney(el.value);
  }
  if (el.matches("[data-count]") && modal) {
    syncCounts(modal.draft);
    updateWithdrawal();
  }
  if (el.matches('[data-field="reference"]') && modal) {
    modal.draft.reference = el.value.trim();
    const box = $("#duplicate-note");
    if (box) box.innerHTML = duplicateNote(modal.draft);
  }
  if (el.matches("[data-history-search]") && modal) {
    modal.draft.q = el.value;
    renderModal();
    const next = $("[data-history-search]");
    next?.focus();
    next?.setSelectionRange(next.value.length, next.value.length);
  }
});

document.addEventListener("click", (event) => {
  const step = event.target.closest("[data-step]");
  if (!step) return;
  const input = step.parentElement.querySelector("input");
  if (!input) return;
  const delta = Number(step.dataset.dir);
  input.value = Math.max(0, (parseInt(input.value, 10) || 0) + delta);
  input.dispatchEvent(new Event("input", { bubbles: true }));
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-evidence]")) {
    readEvidence(event.target.files?.[0]);
    event.target.value = "";
  }
});

/* Teclado: PIN y cierre de modales */
document.addEventListener("keydown", (event) => {
  if (!$("#gate").hidden) {
    if (/^\d$/.test(event.key)) { gateKey(event.key); return; }
    if (event.key === "Backspace") { gateKey("clear"); event.preventDefault(); return; }
    if (event.key === "Enter") { gateKey("enter"); return; }
    return;
  }
  if (event.key === "Escape") {
    if (modal) closeModal();
    closeFab();
    return;
  }
  if (event.key === "Tab" && modal) {
    const focusables = $$('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href]', $("#modal")).filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
    else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
  }
});

/* Acciones rápidas */
function toggleFab() {
  const menu = $("#fab-menu");
  const btn = $("#fab-toggle");
  const open = menu.hidden;
  menu.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
  btn.classList.toggle("open", open);
  if (open) updateFabStatus();
}
function closeFab() {
  const menu = $("#fab-menu");
  const btn = $("#fab-toggle");
  if (menu && !menu.hidden) {
    menu.hidden = true;
    btn?.setAttribute("aria-expanded", "false");
    btn?.classList.remove("open");
  }
}
function updateFabStatus() {
  const el = $("#fab-status");
  if (!el) return;
  const cash = cashSummary();
  const pend = pendingTotal();
  el.innerHTML = state.shift
    ? `<span class="fab-live"><i></i>Caja abierta</span><b>${fmt(cash.expected)}</b><small>${pend ? pend + " pendiente(s) de verificación" : "Sin pendientes"}</small>`
    : `<span class="fab-live closed"><i></i>Caja cerrada</span><b>—</b><small>Abre un turno para registrar</small>`;
}

function renderShell() {
  renderApp();
  const logged = Boolean(currentUser());
  const wrap = $("#fab-wrap");
  if (wrap) wrap.hidden = !logged;
  closeFab();
}

window.addEventListener("DOMContentLoaded", () => {
  renderGate();
  renderShell();
});
