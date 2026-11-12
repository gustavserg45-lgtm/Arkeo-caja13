/* Arqueo Express · flujos 1–5: apertura, entrada, salida, comprobante y métodos */

const FLOWS = {};

/* ── Piezas compartidas ─────────────────────────────────────── */

function moneyInput(value, autofocus = true) {
  return `<div class="amount">
    <span class="cur">$</span>
    <input type="text" inputmode="numeric" autocomplete="off" data-money value="${value ? nl(value) : ""}" placeholder="0" aria-label="Importe en pesos" ${autofocus ? "data-autofocus" : ""} />
    <span class="unit">COP</span>
  </div>`;
}

function readField(name, root = $("#modal-body")) {
  const el = root.querySelector(`[data-field="${name}"]`);
  return el ? el.value.trim() : "";
}

function partyField(kind, draft) {
  const recent = recentParties(kind);
  return `
    <label class="field"><span>${CONCEPT_BY_ID[draft.category]?.party || "Contraparte"}</span>
      <input data-field="party" maxlength="70" value="${esc(draft.party || "")}" placeholder="${esc(CONCEPT_BY_ID[draft.category]?.placeholder || "Nombre (opcional)")}" />
    </label>
    <div class="chip-row" aria-label="Recientes">
      ${recent.map((p) => `<button class="chip" type="button" data-act="party" data-value="${esc(p)}">${esc(p)}</button>`).join("")}
    </div>`;
}

function recentParties(kind) {
  const list = state.movements
    .filter((m) => m.kind === kind && m.party)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .map((m) => m.party);
  return [...new Set([...list, ...FREQUENT_PARTIES])].slice(0, 6);
}

function conceptStep(kind, draft) {
  const list = CONCEPTS[kind];
  return `
    <p class="modal-lede">Elegí una opción. Después te vamos a pedir únicamente los datos necesarios para ese caso.</p>
    <div class="choice-grid" role="group" aria-label="Tipo de movimiento">
      ${list.map((c) => `<button class="choice" type="button" data-act="concept" data-value="${c.id}" aria-pressed="${draft.category === c.id}">
        <b>${esc(c.label)}</b><small>${esc(c.hint)}</small>
      </button>`).join("")}
    </div>
    <div class="flow-tip">${ic(kind === "in" ? "plus" : "minus", 16)}<span><b>${kind === "in" ? "Primero el movimiento" : "Primero el motivo"}</b><small>Los detalles opcionales aparecen más adelante si hacen falta.</small></span></div>`;
}

function methodStep(draft, kind = "in") {
  return `
    <p class="modal-lede">${kind === "in" ? "¿Cuánto dinero recibiste y cómo llegó?" : "¿Cuánto dinero entregaste y cómo salió?"}</p>
    ${moneyInput(draft.amount)}
    <p class="amount-help">Escribe el valor sin puntos ni comas.</p>
    <div class="methods" role="group" aria-label="Método de pago">
      ${METHODS.map((m) => `<button class="method-btn" type="button" data-act="method" data-value="${m.key}" aria-pressed="${draft.method === m.key}">
        ${esc(m.name)}${m.immediate ? "" : `<span class="method-dot" aria-hidden="true"></span>`}
      </button>`).join("")}
    </div>
    <p class="form-note">${METHOD_BY[draft.method]?.note || ""} ${METHOD_BY[draft.method]?.account ? "· " + METHOD_BY[draft.method].account : ""}</p>
    <label class="field form-block"><span>Nota para el turno (opcional)</span>
      <input data-field="note" maxlength="120" value="${esc(draft.note || "")}" placeholder="Ej. pedido de la mañana" />
    </label>`;
}

function evidencePicker(draft) {
  const ev = draft.evidence || [];
  return `
    <p class="modal-lede">Adjunta el soporte. La foto nunca valida sola: solo deja el movimiento listo para que el encargado decida.</p>
    ${ev.length ? `<div class="evidence-thumbs">${ev.map((e, i) => `<figure class="evidence-thumb">
      <img src="${e.data}" alt="${esc(e.name || "Soporte " + (i + 1))}" />
      <button type="button" class="thumb-x" data-act="remove-evidence" data-value="${i}" aria-label="Quitar soporte">${ic("x", 13)}</button>
    </figure>`).join("")}</div>` : `<div class="evidence-empty">${ic("camera", 26)}<b>Aún no hay soporte</b><small>Puedes tomar la foto ahora, elegir una de la galería o usar el comprobante de ejemplo.</small></div>`}
    <div class="upload-row">
      <label class="btn upload-btn">${ic("camera", 16)} Tomar foto<input type="file" accept="image/*" capture="environment" data-evidence hidden /></label>
      <label class="btn upload-btn">Galería<input type="file" accept="image/*" data-evidence hidden /></label>
      <button class="btn btn-quiet" type="button" data-act="sample-evidence">Usar ejemplo</button>
    </div>
    <label class="field form-block"><span>Referencia o número de comprobante</span>
      <input data-field="reference" maxlength="40" value="${esc(draft.reference || "")}" placeholder="Ej. TRF-559021" />
    </label>
    <div id="duplicate-note">${duplicateNote(draft)}</div>`;
}

function duplicateNote(draft) {
  const dup = duplicateReference(draft.reference);
  if (!draft.reference || !dup) return "";
  return `<div class="inline-alert">${ic("alert", 18)}<div><b>Esa referencia ya existe</b><small>${esc(dup.concept)} · ${fmt(dup.amount)} · ${timeHM(dup.at)}. El movimiento se marcará para revisión y no se validará solo.</small></div></div>`;
}

function summaryList(rows) {
  return `<dl class="summary">${rows.map((r) => `<div class="${r.cls || ""}"><dt>${esc(r.label)}</dt><dd>${r.html || esc(r.value)}</dd></div>`).join("")}</dl>`;
}

function stateExplainer(method) {
  if (!methodIsDigital(method)) {
    return `<div class="rule-box ok">${ic("check", 18)}<div><b>Entra verificado</b><p>El efectivo se suma a la gaveta de inmediato y el cierre lo cuenta como verificado.</p></div></div>`;
  }
  return `<div class="rule-box warn">${ic("clock", 18)}<div><b>Queda pendiente</b><p>Se registra ahora, pero no se considera verificado hasta que el encargado revise el soporte. No cambia el efectivo esperado.</p></div></div>`;
}

function countTray(counts) {
  const bills = DENOMS.filter((d) => d.kind === "bill");
  const coins = DENOMS.filter((d) => d.kind === "coin");
  const group = (list, title) => `
    <div class="tray-group">
      <div class="tray-head"><h3>${title}</h3><span>Se cuenta por pieza</span></div>
      <div class="tray-list">
        ${list.map((d) => `<div class="slot">
          <span class="slot-value">${d.label}${d.note ? `<small>${d.note}</small>` : ""}</span>
          <span class="slot-sub" data-slot-sub="${d.key}">${counts[d.key] ? fmt(counts[d.key] * d.value) : "$ 0"}</span>
          <div class="stepper">
            <button type="button" data-step="${d.key}" data-dir="-1" aria-label="Quitar ${d.label}">−</button>
            <input data-count="${d.key}" inputmode="numeric" value="${counts[d.key] || 0}" aria-label="Cantidad de ${d.label}" />
            <button type="button" data-step="${d.key}" data-dir="1" aria-label="Agregar ${d.label}">+</button>
          </div>
        </div>`).join("")}
      </div>
    </div>`;
  return `<div class="tray count-tray">
    ${group(bills, "Billetes")}
    ${group(coins, "Monedas")}
    <div class="tray-foot">
      <div><small>Total contado</small><strong data-count-total>${fmt(totalOf(counts))}</strong></div>
      <span class="tray-count" data-count-pieces>${piecesOf(counts)} ${piecesOf(counts) === 1 ? "pieza" : "piezas"}</span>
    </div>
  </div>`;
}

function syncCounts(draft, root = $("#modal-body")) {
  const counts = emptyCounts();
  $$("[data-count]", root).forEach((inp) => {
    const qty = Math.max(0, parseInt(inp.value, 10) || 0);
    counts[inp.dataset.count] = qty;
    const sub = root.querySelector(`[data-slot-sub="${inp.dataset.count}"]`);
    const d = DENOM_BY_KEY[inp.dataset.count];
    if (sub && d) sub.textContent = fmt(qty * d.value);
  });
  draft.counts = counts;
  const total = totalOf(counts);
  const pieces = piecesOf(counts);
  $$("[data-count-total]", root).forEach((el) => (el.textContent = fmt(total)));
  $$("[data-count-pieces]", root).forEach((el) => (el.textContent = `${pieces} ${pieces === 1 ? "pieza" : "piezas"}`));
  $$("[data-count-diff]", root).forEach((el) => {
    const expected = Number(el.dataset.expected || 0);
    const diff = total - expected;
    el.textContent = signed(diff);
    el.dataset.state = diff === 0 ? "verified" : diff > 0 ? "pending" : "rejected";
    el.classList.toggle("ok", diff === 0);
    el.classList.toggle("bad", diff !== 0);
  });
  return total;
}

function readAmount() {
  return parseMoney($("#modal-body [data-money]")?.value || 0);
}

function saveMovement(m) {
  m.receipt = nextReceipt();
  state.movements.unshift(m);
  pushAudit("Registró " + (m.kind === "in" ? "entrada" : "salida"), `${m.concept} · ${fmt(m.amount)} ${methodName(m.method)}${m.verification === "pendiente" ? " · pendiente" : ""}`);
  save();
}

function requireShift() {
  if (state.shift) return true;
  toast("Primero abre la caja del turno.", "error");
  return false;
}

/* Acciones comunes de los formularios: concepto, método, atajos y soportes. */
function sharedDraftAction(act, d, value) {
  if (act === "concept") {
    d.party = readField("party") || d.party;
    d.category = value;
    d.conceptText = value === "venta" ? "Venta mostrador" : value === "abono" ? "Abono factura" : CONCEPT_BY_ID[value]?.label || d.conceptText;
    return true;
  }
  if (act === "concept-text") { d.conceptText = value; return true; }
  if (act === "party") { d.party = value; return true; }
  if (act === "method") {
    const amount = readAmount();
    if (amount) d.amount = amount;
    const note = readField("note");
    if (note) d.note = note;
    d.method = value;
    return true;
  }
  if (act === "sample-evidence") {
    const bank = METHOD_BY[d.method]?.name || "Banco";
    const typedRef = readField("reference");
    if (typedRef) d.reference = typedRef;
    const ref = d.reference || "DEMO-" + String(Math.floor(100000 + Math.random() * 899999));
    d.evidence = d.evidence || [];
    d.evidence.push({ name: "comprobante-demo.svg", data: sampleEvidence(bank, d.amount || 0, ref) });
    if (!d.reference) d.reference = ref;
    return true;
  }
  if (act === "auth-mode") { d.authMode = value; return true; }
  if (act === "remove-evidence") {
    d.evidence = (d.evidence || []).filter((_, i) => i !== Number(value));
    return true;
  }
  return false;
}

/* ── 1 · Apertura de caja ───────────────────────────────────── */

FLOWS.open = {
  n: "01", kicker: "Apertura", title: "Apertura de caja",
  steps: () => ["Conteo base", "Confirmar"],
  draft: () => ({ counts: {}, note: "" }),
  render(step, d) {
    if (step === 0) {
      return `<p class="modal-lede">Cuenta el efectivo con el que arranca el turno. Esta base es el punto de partida del arqueo.</p>
        ${countTray(d.counts)}
        <p class="form-note">Si la base no coincide con lo que esperabas, déjalo anotado al confirmar.</p>`;
    }
    return `<p class="modal-lede">Revisa antes de abrir. El turno queda a nombre de quien está en sesión.</p>
      ${summaryList([
        { label: "Responsable", value: currentUser().name + " · " + currentUser().roleLabel },
        { label: "Fecha y hora", value: new Date().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) },
        { label: "Base contada", value: fmt(totalOf(d.counts)), cls: "strong" }
      ])}
      <label class="field form-block"><span>Nota de apertura (opcional)</span>
        <textarea data-field="note" maxlength="240" placeholder="Ej. falta cambio de $2.000">${esc(d.note || "")}</textarea>
      </label>
      <div class="rule-box ok">${ic("check", 18)}<div><b>Desde este momento puedes registrar</b><p>Las entradas en efectivo suman a la base; las salidas restan. Los métodos digitales no mueven la gaveta.</p></div></div>`;
  },
  collect(m) {
    if (m.step === 0) {
      syncCounts(m.draft);
      if (totalOf(m.draft.counts) <= 0) {
        toast("Cuenta al menos una pieza para abrir la caja.", "error");
        return false;
      }
    } else {
      m.draft.note = readField("note");
    }
    return true;
  },
  foot() {
    return modal.step === 0
      ? `<button class="btn btn-quiet" type="button" data-mclose>Cancelar</button><div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-next>Siguiente ${ic("chevron", 15)}</button>`
      : `<button class="btn" type="button" data-back>Atrás</button><div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-act="confirm-open">${ic("lock", 15)} Abrir caja</button>`;
  },
  action(act, d) {
    if (act !== "confirm-open") return;
    const base = totalOf(d.counts);
    if (!base) return toast("La base no puede quedar en cero.", "error");
    state.shift = {
      id: "sh-" + uid(), userId: currentUser().id, operator: currentUser().name,
      openedAt: new Date().toISOString(), base, counts: d.counts, note: d.note || ""
    };
    pushAudit("Abrió caja", `Base contada ${fmt(base)}${d.note ? " · " + d.note : ""}`);
    save();
    closeModal(true);
    renderApp();
    toast(`Caja abierta con base de ${fmt(base)}`);
  }
};

/* ── 2 · Entrada de dinero ──────────────────────────────────── */

FLOWS.in = {
  n: "02", kicker: "Entrada", title: "Entrada de dinero",
  steps: (d) => ["Tipo", "Monto y método", ...(methodIsDigital(d.method) ? ["Soporte"] : []), "Confirmar"],
  draft: () => ({ category: "venta", conceptText: "Venta mostrador", party: "Mostrador", amount: 0, method: "efectivo", note: "", reference: "", evidence: [] }),
  render(step, d) {
    if (step === 0) return conceptStep("in", d);
    if (step === 1) return methodStep(d, "in");
    if (step === 2 && methodIsDigital(d.method)) {
      return evidencePicker(d) + `<p class="form-note">Sin soporte, el movimiento queda en la bandeja del encargado marcado como "sin soporte".</p>`;
    }
    return `<p class="modal-lede">Así queda registrado. El comprobante se genera solo.</p>
      ${summaryList([
        { label: "Tipo", value: CONCEPT_BY_ID[d.category]?.label || "Entrada" },
        { label: "Detalle", value: d.conceptText || "Sin detalle" },
        { label: "Contraparte", value: d.party || "—" },
        { label: "Importe", value: fmt(d.amount), cls: "strong" },
        { label: "Método", html: esc(methodName(d.method)) + (d.reference ? ` · ${esc(d.reference)}` : "") },
        { label: "Soporte", value: d.evidence.length ? d.evidence.length + " archivo(s)" : methodIsDigital(d.method) ? "Sin soporte" : "No aplica" }
      ])}
      ${stateExplainer(d.method)}`;
  },
  collect(m) {
    const d = m.draft;
    if (m.step === 1) {
      d.amount = readAmount();
      d.note = readField("note");
      if (!d.amount) { toast("Escribe un importe mayor que cero.", "error"); return false; }
    } else if (m.step === 2 && methodIsDigital(d.method)) {
      d.reference = readField("reference");
    }
    return true;
  },
  foot(m) {
    const steps = this.steps(m.draft);
    if (m.step === steps.length - 1) {
      return `<button class="btn btn-quiet" type="button" data-mclose>Cancelar</button><div class="foot-spacer"></div><button class="btn" type="button" data-back>Atrás</button><button class="btn btn-ink" type="button" data-act="register-in">Registrar entrada</button>`;
    }
    return defaultFoot();
  },
  action(act, d, value) {
    if (act !== "register-in") { sharedDraftAction(act, d, value); return; }
    if (!requireShift()) return;
    const dup = duplicateReference(d.reference);
    const digital = methodIsDigital(d.method);
    const m = {
      id: uid(), at: new Date().toISOString(), shiftId: state.shift.id,
      kind: "in", category: d.category, concept: d.conceptText || CONCEPT_BY_ID[d.category]?.label || "Entrada",
      amount: d.amount, method: d.method, party: d.party, note: d.note, reference: d.reference,
      evidence: d.evidence || [], verification: digital || dup ? "pendiente" : "verificado",
      duplicate: Boolean(dup), auth: "no-requiere", executed: true, reversed: false, reverses: null,
      createdBy: currentUser().id
    };
    saveMovement(m);
    renderApp();
    openModal("receipt", { receiptId: m.id });
    toast(m.verification === "pendiente" ? "Entrada registrada · pendiente de verificación" : "Entrada registrada y verificada");
  }
};

/* ── 3 · Salida de dinero ───────────────────────────────────── */

FLOWS.out = {
  n: "03", kicker: "Salida", title: "Salida de dinero",
  steps: (d) => ["Motivo", "Monto y método", "Destinatario" , ...(methodIsDigital(d.method) ? ["Autorización"] : []), "Confirmar"],
  draft: () => ({ category: "compra", conceptText: "", party: "", amount: 0, method: "efectivo", note: "", reference: "", evidence: [], authMode: "pending" }),
  enter(m) { m.draft.authMode = isManager() ? "now" : "pending"; },
  render(step, d) {
    if (step === 0) return conceptStep("out", d);
    if (step === 1) return methodStep(d, "out");
    if (step === 2) {
      return `<p class="modal-lede">¿A quién se le paga? Si el pago es digital, adjunta el soporte de la operación.</p>
        ${partyField("out", d)}
        ${methodIsDigital(d.method) ? `<div class="form-block">${evidencePicker(d)}</div>` : `<div class="rule-box">${ic("minus", 18)}<div><b>Sale de la gaveta</b><p>El efectivo se descuenta del esperado en cuanto registres la salida.</p></div></div>`}`;
    }
    if (methodIsDigital(d.method) && step === 3) {
      return `<p class="modal-lede">Autorizar no es lo mismo que ejecutar. El encargado puede dejar el pago listo y ejecutarlo después.</p>
        <div class="choice-grid two">
          <button class="choice" type="button" data-act="auth-mode" data-value="now" aria-pressed="${d.authMode === "now"}">
            <b>Autorizar y ejecutar ahora</b><small>${isManager() ? "Queda verificado con tu decisión." : "Requiere el PIN del encargado."}</small>
          </button>
          <button class="choice" type="button" data-act="auth-mode" data-value="pending" aria-pressed="${d.authMode === "pending"}">
            <b>Dejar pendiente</b><small>Autorizado y Ejecutado quedan separados en la bandeja.</small>
          </button>
        </div>
        ${d.authMode === "now" && !isManager() ? `<label class="field form-block"><span>PIN del encargado</span><input data-field="authPin" type="password" inputmode="numeric" maxlength="4" placeholder="4 dígitos" /></label>` : ""}
        ${d.authMode === "now" && isManager() ? `<div class="rule-box ok">${ic("check", 18)}<div><b>Quedará autorizado y ejecutado</b><p>Se registra tu usuario y la hora de la decisión en la auditoría.</p></div></div>` : ""}
        ${d.authMode === "pending" ? `<div class="rule-box warn">${ic("clock", 18)}<div><b>Quedará en la bandeja</b><p>El pago no se marca como ejecutado. El encargado lo autoriza o lo rechaza.</p></div></div>` : ""}`;
    }
    const authText = methodIsDigital(d.method) ? (d.authMode === "now" ? "Autorizado y ejecutado" : "Pendiente de autorización") : "No aplica";
    return `<p class="modal-lede">Revisa la salida. El comprobante y el rastro de auditoría se crean al confirmar.</p>
      ${summaryList([
        { label: "Tipo", value: CONCEPT_BY_ID[d.category]?.label || "Salida" },
        { label: "Detalle", value: d.conceptText || "Sin detalle" },
        { label: "Beneficiario", value: d.party || "—" },
        { label: "Importe", value: fmt(d.amount), cls: "strong" },
        { label: "Método", html: esc(methodName(d.method)) + (d.reference ? ` · ${esc(d.reference)}` : "") },
        { label: "Soporte", value: d.evidence.length ? d.evidence.length + " archivo(s)" : methodIsDigital(d.method) ? "Sin soporte" : "No aplica" },
        { label: "Autorización", value: authText }
      ])}
      <div class="rule-box ${methodIsDigital(d.method) ? "warn" : "ok"}">${ic(methodIsDigital(d.method) ? "clock" : "minus", 18)}<div><b>${methodIsDigital(d.method) ? "No mueve el efectivo" : "Resta de la gaveta"}</b><p>${methodIsDigital(d.method) ? "Es un pago digital: se controla por autorización y verificación, no por el conteo de billetes." : "El cierre compara el efectivo contado contra la base más entradas menos salidas."}</p></div></div>`;
  },
  collect(m) {
    const d = m.draft;
    if (m.step === 1) {
      d.amount = readAmount();
      d.note = readField("note");
      if (!d.amount) { toast("Escribe un importe mayor que cero.", "error"); return false; }
    } else if (m.step === 2) {
      d.party = readField("party");
      if (methodIsDigital(d.method)) d.reference = readField("reference");
    } else if (methodIsDigital(d.method) && m.step === 3) {
      if (d.authMode === "now" && !isManager()) {
        d.authPin = readField("authPin");
      }
    }
    return true;
  },
  foot(m) {
    const steps = this.steps(m.draft);
    if (m.step === steps.length - 1) {
      return `<button class="btn btn-quiet" type="button" data-mclose>Cancelar</button><div class="foot-spacer"></div><button class="btn" type="button" data-back>Atrás</button><button class="btn btn-ink" type="button" data-act="register-out">Registrar salida</button>`;
    }
    return defaultFoot();
  },
  action(act, d, value) {
    if (act !== "register-out") { sharedDraftAction(act, d, value); return; }
    if (!requireShift()) return;
    const digital = methodIsDigital(d.method);
    let authorized = !digital;
    if (digital && d.authMode === "now") {
      if (isManager()) authorized = true;
      else if (d.authPin === USERS.carlos.pin) authorized = true;
      else return toast("PIN del encargado incorrecto. La salida no se registró.", "error");
    }
    const dup = duplicateReference(d.reference);
    const m = {
      id: uid(), at: new Date().toISOString(), shiftId: state.shift.id,
      kind: "out", category: d.category, concept: d.conceptText || CONCEPT_BY_ID[d.category]?.label || "Salida",
      amount: d.amount, method: d.method, party: d.party, note: d.note, reference: d.reference,
      evidence: d.evidence || [],
      verification: digital && !authorized ? "pendiente" : "verificado",
      duplicate: Boolean(dup),
      auth: digital ? (authorized ? "autorizado" : "pendiente") : "no-requiere",
      executed: digital ? authorized : true,
      reversed: false, reverses: null, createdBy: currentUser().id
    };
    saveMovement(m);
    if (digital && !authorized) {
      pushAudit("Solicitó autorización", `${m.concept} · ${fmt(m.amount)} · pendiente del encargado`);
      save();
    }
    renderApp();
    openModal("receipt", { receiptId: m.id });
    toast(digital && !authorized ? "Salida registrada · espera autorización" : "Salida registrada");
  }
};

/* ── 4 · Comprobante ───────────────────────────────────────── */

function receiptMarkup(m) {
  const digital = methodIsDigital(m.method);
  return `<div class="receipt">
    <div class="receipt-head">
      <span class="brand-mark dark" aria-hidden="true"><i></i><i></i><i></i></span>
      <div class="receipt-id"><b>Arqueo Express</b><small>Comprobante ${esc(m.receipt || "—")} · ${dateShort(m.at)} ${timeHM(m.at)}</small></div>
      ${verificationTag(m)}
    </div>
    <div class="receipt-amount ${m.kind}">${signed(m.kind === "in" ? m.amount : -m.amount)}</div>
    <div class="receipt-lines">
      <div><span>Movimiento</span><b>${m.kind === "in" ? "Entrada" : "Salida"} · ${esc(m.concept)}</b></div>
      <div><span>Método</span><b>${esc(methodName(m.method))}${m.reference ? ` · ${esc(m.reference)}` : ""}</b></div>
      <div><span>${m.kind === "in" ? "Origen" : "Beneficiario"}</span><b>${esc(m.party || "—")}</b></div>
      <div><span>Registrado por</span><b>${esc(USERS[m.createdBy]?.name || "Ana Beltrán")}</b></div>
      ${m.note ? `<div><span>Nota</span><b>${esc(m.note)}</b></div>` : ""}
      ${m.auth !== "no-requiere" ? `<div><span>Autorización</span><b>${m.auth === "autorizado" ? "Autorizado" : m.auth === "rechazado" ? "No autorizado" : "Pendiente"} · ${m.executed ? "Ejecutado" : "No ejecutado"}</b></div>` : ""}
      ${m.invoiceNumber ? `<div><span>Factura</span><b>${esc(m.invoiceNumber)}</b></div>` : ""}
    </div>
    ${m.evidence?.length ? `<div class="receipt-evidence">${m.evidence.map((e) => `<img src="${e.data}" alt="${esc(e.name)}" />`).join("")}</div>` : ""}
    <p class="receipt-note">${m.verification === "verificado" ? "Movimiento verificado. " : "Pendiente de verificación: no cuenta como efectivo ni cierra la factura. "}${digital ? "Soporte adjunto, la decisión es humana." : "Movimiento de efectivo."}</p>
  </div>`;
}

function receiptText(m) {
  return [
    "ARQUEO EXPRESS · COMPROBANTE",
    "Comprobante: " + (m.receipt || "—"),
    "Fecha: " + dateLong(m.at) + " " + timeHM(m.at),
    "--------------------------------",
    (m.kind === "in" ? "ENTRADA" : "SALIDA") + ": " + fmt(m.amount),
    "Concepto: " + m.concept,
    "Método: " + methodName(m.method),
    "Contraparte: " + (m.party || "—"),
    "Referencia: " + (m.reference || "—"),
    "Verificación: " + (STATUS_TEXT[m.verification] || m.verification),
    "Autorización: " + (m.auth === "no-requiere" ? "No aplica" : m.auth + " · " + (m.executed ? "ejecutado" : "no ejecutado")),
    "Registrado por: " + (USERS[m.createdBy]?.name || "—"),
    "Nota: " + (m.note || "—"),
    "--------------------------------",
    "Generado automáticamente · Prototipo local"
  ].join("\n");
}

FLOWS.receipt = {
  n: "04", kicker: "Comprobante", title: "Comprobante automático",
  steps: () => [],
  draft: () => ({}),
  render(step, d) {
    const m = movementById(d.receiptId);
    if (!m) return `<div class="empty"><h3>No encontramos el comprobante</h3><p>Vuelve a abrirlo desde el historial.</p></div>`;
    return `<p class="modal-lede">Se generó al registrar el movimiento. Puedes descargarlo o revisarlo después en el historial.</p>${receiptMarkup(m)}`;
  },
  foot() {
    return `<button class="btn" type="button" data-act="download-receipt">${ic("download", 16)} Descargar</button>
      <button class="btn btn-quiet" type="button" data-act="view-history">Ver historial</button>
      <div class="foot-spacer"></div>
      <button class="btn btn-ink" type="button" data-mclose>Listo</button>`;
  },
  action(act, d) {
    if (act === "download-receipt") {
      const m = movementById(d.receiptId);
      if (m) downloadText(`comprobante-${m.receipt || m.id}.txt`, receiptText(m));
      return;
    }
    if (act === "view-history") openModal("history");
  }
};

/* ── 5 · Métodos de pago ───────────────────────────────────── */

FLOWS.methods = {
  n: "05", kicker: "Métodos", title: "Métodos de pago",
  steps: () => [],
  draft: () => ({}),
  render() {
    const totals = methodTotals();
    return `<p class="modal-lede">Una sola regla para todos: el efectivo se cuenta; lo digital se verifica. La foto nunca valida un pago por sí sola.</p>
      <div class="method-list">
        ${METHODS.map((m) => {
          const t = totals.find((x) => x.key === m.key) || { ins: 0, outs: 0, pending: 0, pendingCount: 0 };
          return `<div class="method-card">
            <span class="method-icon">${ic(m.immediate ? "card" : "bank", 20)}</span>
            <div class="method-info">
              <b>${esc(m.name)}</b>
              <small>${esc(m.account)} · ${esc(m.note)}</small>
            </div>
            <div class="method-rules">
              ${m.immediate ? tag("verified", "Entra directo") : tag("pending", "Requiere verificación")}
              ${m.needsEvidence ? tag("neutral", "Pide soporte") : tag("neutral", "Sin soporte")}
            </div>
            <div class="method-money">
              <span>Entradas ${fmt(t.ins)}</span>
              <span>Salidas ${fmt(t.outs)}</span>
              ${t.pendingCount ? `<span class="pending-text">${t.pendingCount} pendiente(s) · ${fmt(t.pending)}</span>` : ""}
            </div>
          </div>`;
        }).join("")}
      </div>
      <div class="rule-box">${ic("alert", 18)}<div><b>Cómo se decide</b><p>Efectivo y tarjeta quedan verificados al registrar. Nequi, Daviplata y transferencia quedan pendientes hasta que el encargado revise el soporte; si la referencia se repite, el sistema lo marca como posible duplicado.</p></div></div>`;
  },
  foot() {
    return `<div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-mclose>Entendido</button>`;
  }
};
