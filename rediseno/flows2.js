/* Arqueo Express · flujos 6–12: verificaciones, facturas, abonos, historial,
   reversos, cierre y resultado del cierre. */

function ago(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

/* ── 6 · Validar transferencia / bandeja ───────────────────── */

function verifyItem(m, mode) {
  const urgent = m.duplicate || (methodIsDigital(m.method) && !m.evidence?.length);
  return `<button class="verify-item" type="button" data-act="detail" data-value="${m.id}" ${urgent ? 'data-flag="urgent"' : ""}>
    <span class="vi-icon ${m.kind}">${ic(m.kind === "in" ? "plus" : "minus", 16)}</span>
    <span class="vi-main">
      <b>${esc(m.concept)}</b>
      <small>${esc(m.party || "Sin contraparte")} · ${esc(methodName(m.method))} · ${ago(m.at)} · ${esc(USERS[m.createdBy]?.name || "—")}</small>
      <span class="vi-tags">${movementTags(m)}${mode === "auth" ? tag("pending", "Autorización") : ""}</span>
    </span>
    <span class="vi-side"><b>${fmt(m.amount)}</b><small>${mode === "auth" ? "Por autorizar" : "Por verificar"}</small></span>
  </button>`;
}

function verifyDetail(m, modal) {
  const mode = m.kind === "out" && m.auth === "pendiente" ? "auth" : "verify";
  const dup = m.reference ? duplicateReference(m.reference, m.id) : null;
  return `<button class="back-link" type="button" data-act="list">${ic("chevron", 14)} Volver a la bandeja</button>
    <div class="detail-head">
      <div>
        <p class="eyebrow">${mode === "auth" ? "Autorización de salida" : "Verificación de entrada"}</p>
        <h3>${esc(m.concept)}</h3>
        <p>${esc(m.party || "Sin contraparte")} · ${esc(methodName(m.method))} · ${dateShort(m.at)} ${timeHM(m.at)}</p>
      </div>
      <div class="detail-amount">${fmt(m.amount)}${verificationTag(m)}</div>
    </div>
    ${dup || m.duplicate ? `<div class="inline-alert">${ic("alert", 18)}<div><b>Posible duplicado</b><small>${dup ? `La referencia ${esc(m.reference)} aparece en otro movimiento: ${esc(dup.concept)} · ${fmt(dup.amount)}.` : "Este movimiento se marcó como posible duplicado al registrarse."} No se valida solo.</small></div></div>` : ""}
    ${methodIsDigital(m.method) && !m.evidence?.length ? `<div class="inline-alert">${ic("alert", 18)}<div><b>Sin soporte adjunto</b><small>Puedes verificar con tu criterio, pero queda registrado que no había foto.</small></div></div>` : ""}
    ${summaryList([
      { label: "Registrado por", value: `${USERS[m.createdBy]?.name || "—"} · ${timeHM(m.at)}` },
      { label: "Referencia", value: m.reference || "Sin referencia" },
      { label: "Nota", value: m.note || "—" },
      { label: "Estado", html: verificationTag(m) },
      ...(m.auth !== "no-requiere" ? [{ label: "Autorización", html: tag(m.auth === "autorizado" ? "verified" : m.auth === "rechazado" ? "rejected" : "pending", m.auth === "autorizado" ? "Autorizado" : m.auth === "rechazado" ? "No autorizado" : "Pendiente") + " " + tag(m.executed ? "neutral" : "pending", m.executed ? "Ejecutado" : "No ejecutado") }] : [])
    ])}
    <div class="detail-evidence">
      <div class="section-head"><h2>Soporte adjunto</h2><span class="meta">${m.evidence?.length || 0} archivo(s)</span></div>
      ${m.evidence?.length ? `<div class="evidence-large">${m.evidence.map((e) => `<a href="${e.data}" target="_blank" rel="noopener"><img src="${e.data}" alt="${esc(e.name)}" /></a>`).join("")}</div>` : `<div class="evidence-empty compact">${ic("camera", 22)}<b>Sin soporte</b><small>La decisión queda en la auditoría.</small></div>`}
      <p class="form-note">La foto es un soporte, nunca una validación automática.</p>
    </div>
    ${!isManager() ? `<div class="rule-box warn">${ic("lock", 18)}<div><b>Solo el encargado puede decidir</b><p>Estás como cajera. Cambia de usuario con PIN 4321 para probar Verificar o Rechazar.</p></div></div>` : ""}`;
}

FLOWS.verify = {
  n: "06", kicker: "Verificaciones", title: "Bandeja del encargado",
  steps: () => [],
  draft: () => ({}),
  enter(m) { m.tab = "pending"; m.detailId = null; },
  render(step, d, m) {
    if (m.detailId) {
      const mov = movementById(m.detailId);
      if (mov) return verifyDetail(mov, m);
      m.detailId = null;
    }
    const pend = pendingVerifications();
    const auth = pendingAuthorizations();
    const content = m.tab === "audit" ? `<div class="audit-list">${state.audit.slice(0, 40).map((a) => `<div class="audit-row">
        <span class="audit-dot"></span>
        <div><b>${esc(a.action)}</b><small>${esc(a.detail)}</small><span>${esc(a.actor)} · ${esc(a.role)} · ${dateShort(a.at)} ${timeHM(a.at)}</span></div>
      </div>`).join("")}</div>`
      : m.tab === "auth"
        ? (auth.length ? auth.map((x) => verifyItem(x, "auth")).join("") : `<div class="empty"><h3>Sin autorizaciones pendientes</h3><p>Las salidas digitales que registre el cajero aparecerán aquí antes de ejecutarse.</p></div>`)
        : (pend.length ? pend.map((x) => verifyItem(x, "verify")).join("") : `<div class="empty"><h3>Todo verificado</h3><p>No hay entradas esperando revisión. Las nuevas transferencias aparecerán aquí.</p></div>`);
    return `<div class="tray-tabs" role="tablist">
        <button type="button" role="tab" aria-selected="${m.tab === "pending"}" data-act="tab" data-value="pending">Por verificar <b>${pend.length}</b></button>
        <button type="button" role="tab" aria-selected="${m.tab === "auth"}" data-act="tab" data-value="auth">Autorizaciones <b>${auth.length}</b></button>
        <button type="button" role="tab" aria-selected="${m.tab === "audit"}" data-act="tab" data-value="audit">Auditoría</button>
      </div>
      ${m.tab !== "audit" ? `<p class="tray-hint">${pend.length + auth.length ? "Ordenadas por antigüedad, duplicados y falta de soporte. La decisión queda firmada con tu usuario y la hora." : "La bandeja está al día."}</p>` : `<p class="tray-hint">Cada registro, verificación, rechazo o reverso deja rastro automático.</p>`}
      ${content}`;
  },
  foot(m) {
    if (m.detailId) {
      if (!isManager()) return `<div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-mclose>Cerrar</button>`;
      if (m.rejectMode) {
        return `<button class="btn btn-quiet" type="button" data-act="reject-cancel">Cancelar</button><div class="foot-spacer"></div><button class="btn btn-danger" type="button" data-act="confirm-reject">${ic("x", 15)} Confirmar rechazo</button>`;
      }
      const mov = movementById(m.detailId);
      const isAuth = mov && mov.kind === "out" && mov.auth === "pendiente";
      return `<button class="btn" type="button" data-act="list">${ic("chevron", 14)} Volver</button><div class="foot-spacer"></div>
        <button class="btn btn-danger-soft" type="button" data-act="reject-start">Rechazar</button>
        <button class="btn btn-ink" type="button" data-act="${isAuth ? "authorize" : "verify"}">${ic("check", 15)} ${isAuth ? "Autorizar y ejecutar" : "Verificar"}</button>`;
    }
    return `<div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-mclose>Cerrar</button>`;
  },
  action(act, d, value) {
    if (act === "tab") { modal.tab = value; modal.detailId = null; modal.rejectMode = false; renderModal(); return; }
    if (act === "list") { modal.detailId = null; modal.rejectMode = false; renderModal(); return; }
    if (act === "detail") { modal.detailId = value; modal.rejectMode = false; modal.rejectReason = ""; renderModal(); return; }
    if (act === "reject-start") {
      modal.rejectMode = true;
      modal.rejectReason = "";
      renderModal();
      setTimeout(() => {
        $(".reject-box")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        $('.reject-box textarea')?.focus({ preventScroll: true });
      }, 40);
      return;
    }
    if (act === "reject-cancel") { modal.rejectMode = false; renderModal(); return; }
    if (act === "reject-reason") { modal.rejectReason = value; renderModal(); return; }
    const mov = movementById(modal.detailId);
    if (!mov) return;
    if (!isManager()) return toast("Solo el encargado puede decidir.", "error");
    if (act === "verify") {
      mov.verification = "verificado";
      mov.verifiedBy = currentUser().id;
      mov.verifiedAt = new Date().toISOString();
      pushAudit("Verificó movimiento", `${mov.concept} · ${fmt(mov.amount)} · ${methodName(mov.method)}`);
      save(); renderApp(); modal.detailId = null; modal.rejectMode = false; renderModal();
      toast(mov.invoiceId ? "Verificado · la factura se actualizó" : "Movimiento verificado");
      return;
    }
    if (act === "authorize") {
      mov.auth = "autorizado";
      mov.executed = true;
      mov.verification = "verificado";
      mov.verifiedBy = currentUser().id;
      mov.verifiedAt = new Date().toISOString();
      pushAudit("Autorizó y ejecutó salida", `${mov.concept} · ${fmt(mov.amount)} · ${methodName(mov.method)}`);
      save(); renderApp(); modal.detailId = null; renderModal();
      toast("Salida autorizada y ejecutada");
      return;
    }
    if (act === "confirm-reject") {
      const typed = readField("rejectNote");
      const reason = [modal.rejectReason, typed].filter(Boolean).join(" · ") || "Sin motivo especificado";
      mov.verification = "rechazado";
      mov.rejectionReason = reason;
      mov.verifiedBy = currentUser().id;
      mov.verifiedAt = new Date().toISOString();
      if (mov.auth === "pendiente") { mov.auth = "rechazado"; mov.executed = false; }
      pushAudit("Rechazó movimiento", `${mov.concept} · ${fmt(mov.amount)} · ${reason}`);
      save(); renderApp(); modal.detailId = null; modal.rejectMode = false; renderModal();
      toast("Movimiento rechazado · queda en auditoría", "error");
    }
  }
};

/* Rechazo: el cuerpo del detalle pide el motivo cuando rejectMode está activo. */
const verifyBaseRender = FLOWS.verify.render;
FLOWS.verify.render = function (step, d, m) {
  const html = verifyBaseRender.call(this, step, d, m);
  if (!m.rejectMode || !m.detailId) return html;
  return html + `<div class="reject-box">
    <b>¿Por qué lo rechazas?</b>
    <div class="chip-row">
      ${["Comprobante ilegible", "Referencia no coincide", "Posible duplicado", "Monto incorrecto", "No llegó el dinero"].map((r) => `<button class="chip" type="button" data-act="reject-reason" data-value="${esc(r)}" aria-pressed="${m.rejectReason === r}">${esc(r)}</button>`).join("")}
    </div>
    <label class="field"><span>Detalle para la auditoría</span><textarea data-field="rejectNote" maxlength="200" placeholder="Explica brevemente la decisión">${esc(m.rejectReason || "")}</textarea></label>
  </div>`;
};

/* ── 7 · Facturas a crédito ────────────────────────────────── */

function invoiceCard(inv) {
  const paid = invoicePaid(inv);
  const pending = invoicePending(inv);
  const saldo = invoiceSaldo(inv);
  const st = invoiceLabel(inv);
  const pct = Math.min(100, Math.round((paid / inv.amount) * 100));
  return `<button class="invoice-card" type="button" data-act="invoice" data-value="${inv.id}" ${saldo <= 0 ? 'data-paid="true"' : ""}>
    <span class="invoice-top">
      <span><b>${esc(inv.number)} · ${esc(inv.client)}</b><small>${esc(inv.concept)} · ${esc(dueLabel(inv.dueAt))}</small></span>
      ${tag(st.state, st.text)}
    </span>
    <span class="invoice-mid">
      <span class="invoice-bar"><i style="width:${pct}%"></i></span>
      <span class="invoice-pct">${pct}% pagado</span>
    </span>
    <span class="invoice-bottom">
      <span><small>Saldo</small><b>${fmt(saldo)}</b></span>
      <span><small>Total</small><b>${fmt(inv.amount)}</b></span>
      ${pending ? `<span class="pending-text">${fmt(pending)} en verificación</span>` : ""}
      <span class="invoice-go">${saldo > 0 ? "Abonar" : "Pagada"} ${saldo > 0 ? ic("chevron", 14) : ic("check", 14)}</span>
    </span>
  </button>`;
}

FLOWS.invoices = {
  n: "07", kicker: "Crédito", title: "Facturas a crédito",
  steps: () => [],
  draft: () => ({ form: false, client: "", concept: "", amount: 0, due: localDateValue(7) }),
  render(step, d) {
    const open = openInvoices();
    const total = open.reduce((t, i) => t + invoiceSaldo(i), 0);
    const overdue = open.filter((i) => daysUntil(i.dueAt) < 0).length;
    if (d.form) {
      return `<p class="modal-lede">Una factura a crédito deja el saldo pendiente y habilita abonos parciales. No mueve efectivo hasta que se registre el pago.</p>
        <div class="form-grid">
          <label class="field"><span>Cliente</span><input data-field="client" maxlength="70" value="${esc(d.client)}" placeholder="Ej. Carolina Ruiz" data-autofocus /></label>
          <label class="field"><span>Concepto</span><input data-field="concept" maxlength="80" value="${esc(d.concept)}" placeholder="Ej. Mercado del mes" /></label>
          <label class="field"><span>Valor de la factura</span><input data-money value="${d.amount ? nl(d.amount) : ""}" inputmode="numeric" placeholder="0" /></label>
          <label class="field"><span>Vence</span><input type="date" data-field="due" value="${esc(d.due)}" /></label>
        </div>
        <div class="inline-actions">
          <button class="btn" type="button" data-act="cancel-form">Cancelar</button>
          <button class="btn btn-ink" type="button" data-act="create-invoice">Crear factura</button>
        </div>`;
    }
    return `<p class="modal-lede">El saldo baja solo con abonos verificados. Un abono por transferencia queda "en verificación" y no libera la factura todavía.</p>
      <div class="invoice-summary">
        <div><small>Por cobrar</small><b>${fmt(total)}</b></div>
        <div><small>Facturas abiertas</small><b>${open.length}</b></div>
        <div><small>Vencidas</small><b class="${overdue ? "bad" : ""}">${overdue}</b></div>
      </div>
      <div class="invoice-list">${open.length ? open.map(invoiceCard).join("") : `<div class="empty"><h3>No hay facturas abiertas</h3><p>Crea una factura a crédito o revisa las pagadas en el historial.</p></div>`}</div>
      ${state.invoices.filter((i) => invoiceSaldo(i) <= 0).length ? `<p class="form-note">${state.invoices.filter((i) => invoiceSaldo(i) <= 0).length} factura(s) ya están pagadas.</p>` : ""}`;
  },
  foot(m) {
    if (m.draft.form) return `<div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-mclose>Cerrar</button>`;
    return `<button class="btn" type="button" data-act="new-invoice">${ic("plus", 15)} Nueva factura</button><div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-mclose>Cerrar</button>`;
  },
  action(act, d, value) {
    if (act === "new-invoice") { modal.draft.form = true; modal.draft.amount = 0; modal.draft.client = ""; modal.draft.concept = ""; modal.draft.due = localDateValue(7); renderModal(); return; }
    if (act === "cancel-form") { modal.draft.form = false; renderModal(); return; }
    if (act === "invoice") { openModal("abono", { invoiceId: value }); return; }
    if (act === "create-invoice") {
      const body = $("#modal-body");
      const client = body.querySelector('[data-field="client"]').value.trim();
      const concept = body.querySelector('[data-field="concept"]').value.trim();
      const amount = parseMoney(body.querySelector("[data-money]").value);
      const due = body.querySelector('[data-field="due"]').value;
      if (!client) return toast("Escribe el nombre del cliente.", "error");
      if (!amount) return toast("Escribe el valor de la factura.", "error");
      const max = state.invoices.reduce((n, i) => Math.max(n, Number(String(i.number).replace(/\D/g, "")) || 0), 1000);
      const inv = {
        id: "inv-" + uid(), number: "F-" + (max + 1), client, concept: concept || "Crédito",
        amount, createdAt: new Date().toISOString(),
        dueAt: due ? new Date(due + "T12:00:00").toISOString() : daysAgoAt(-7, 12, 0),
        createdBy: currentUser().id
      };
      state.invoices.unshift(inv);
      pushAudit("Creó factura a crédito", `${inv.number} · ${client} · ${fmt(amount)}`);
      save(); modal.draft.form = false; renderModal(); renderApp();
      toast(`Factura ${inv.number} creada`);
    }
  }
};

/* ── 8 · Abonos ────────────────────────────────────────────── */

FLOWS.abono = {
  n: "08", kicker: "Abono", title: "Abono a factura",
  steps: (d) => ["Factura", "Importe y método", ...(methodIsDigital(d.method) ? ["Soporte"] : []), "Registrar"],
  draft: (seedDraft) => {
    const inv = state.invoices.find((i) => i.id === seedDraft.invoiceId);
    return {
      invoiceId: seedDraft.invoiceId || "", amount: inv ? invoiceSaldo(inv) : 0,
      method: "efectivo", reference: "", evidence: [], note: ""
    };
  },
  enter(m) {
    if (!m.draft.invoiceId) {
      const first = openInvoices()[0];
      if (first) { m.draft.invoiceId = first.id; m.draft.amount = invoiceSaldo(first); }
    }
  },
  render(step, d) {
    const inv = state.invoices.find((i) => i.id === d.invoiceId);
    if (step === 0) {
      const open = openInvoices();
      if (!open.length) return `<div class="empty"><h3>No hay facturas por cobrar</h3><p>Crea una factura a crédito desde el flujo de facturas.</p></div><button class="btn" type="button" data-act="go-invoices">Ir a facturas</button>`;
      return `<p class="modal-lede">Elige la factura. El saldo se completa con los abonos ya verificados.</p>
        <div class="invoice-list pick">${open.map((i) => `<button class="invoice-card pick ${d.invoiceId === i.id ? "selected" : ""}" type="button" data-act="pick-invoice" data-value="${i.id}" aria-pressed="${d.invoiceId === i.id}">
          <span class="invoice-top"><span><b>${esc(i.number)} · ${esc(i.client)}</b><small>${esc(dueLabel(i.dueAt))}</small></span>${invoicePending(i) ? tag("pending", "Con abono pendiente") : ""}</span>
          <span class="invoice-bottom"><span><small>Saldo</small><b>${fmt(invoiceSaldo(i))}</b></span><span class="invoice-go">${d.invoiceId === i.id ? "Elegida" : "Elegir"} ${ic("chevron", 14)}</span></span>
        </button>`).join("")}</div>`;
    }
    if (step === 1) {
      const saldo = inv ? invoiceSaldo(inv) : 0;
      return `<p class="modal-lede">Abono para <b>${esc(inv?.client || "")}</b> · ${esc(inv?.number || "")}. Saldo actual ${fmt(saldo)}.</p>
        ${moneyInput(d.amount)}
        <div class="chip-row">
          ${[0.25, 0.5, 1].map((f) => `<button class="chip" type="button" data-act="quick-amount" data-value="${Math.round(saldo * f)}">${f === 1 ? "Saldo total" : Math.round(f * 100) + "%"}</button>`).join("")}
        </div>
        <div class="methods" role="group" aria-label="Método de pago">
          ${METHODS.map((m) => `<button class="method-btn" type="button" data-act="method" data-value="${m.key}" aria-pressed="${d.method === m.key}">${esc(m.name)}${m.immediate ? "" : '<span class="method-dot" aria-hidden="true"></span>'}</button>`).join("")}
        </div>
        <p class="form-note">${METHOD_BY[d.method]?.note || ""}</p>
        <label class="field form-block"><span>Nota (opcional)</span><input data-field="note" maxlength="120" value="${esc(d.note)}" placeholder="Ej. abono acordado por WhatsApp" /></label>`;
    }
    if (step === 2 && methodIsDigital(d.method)) return evidencePicker(d);
    const saldo = inv ? invoiceSaldo(inv) : 0;
    return `<p class="modal-lede">Así queda el abono. Si el método es digital, el saldo baja cuando el encargado lo verifique.</p>
      ${summaryList([
        { label: "Factura", value: `${inv?.number || "—"} · ${inv?.client || ""}` },
        { label: "Abono", value: fmt(d.amount), cls: "strong" },
        { label: "Método", value: methodName(d.method) },
        { label: "Soporte", value: d.evidence.length ? d.evidence.length + " archivo(s)" : methodIsDigital(d.method) ? "Sin soporte" : "No aplica" },
        { label: "Saldo antes", value: fmt(saldo) },
        { label: "Saldo después", value: fmt(Math.max(0, saldo - d.amount)), cls: "strong" }
      ])}
      ${stateExplainer(d.method)}
      ${methodIsDigital(d.method) ? `<p class="form-note">El saldo mostrado se descuenta al verificar, no al registrar.</p>` : ""}`;
  },
  collect(m) {
    const d = m.draft;
    const inv = state.invoices.find((i) => i.id === d.invoiceId);
    if (m.step === 0) {
      if (!d.invoiceId) { toast("Elige una factura.", "error"); return false; }
    } else if (m.step === 1) {
      d.amount = readAmount();
      d.note = readField("note");
      if (!inv) { toast("La factura ya no está disponible.", "error"); return false; }
      const saldo = invoiceSaldo(inv);
      if (!d.amount) { toast("Escribe el valor del abono.", "error"); return false; }
      if (d.amount > saldo) { toast(`El abono no puede superar el saldo de ${fmt(saldo)}.`, "error"); return false; }
    } else if (m.step === 2 && methodIsDigital(d.method)) {
      d.reference = readField("reference");
    }
    return true;
  },
  foot(m) {
    const steps = this.steps(m.draft);
    if (!openInvoices().length) return `<div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-mclose>Cerrar</button>`;
    if (m.step === steps.length - 1) {
      return `<button class="btn btn-quiet" type="button" data-mclose>Cancelar</button><div class="foot-spacer"></div><button class="btn" type="button" data-back>Atrás</button><button class="btn btn-ink" type="button" data-act="register-abono">Registrar abono</button>`;
    }
    return `<button class="btn btn-quiet" type="button" data-mclose>Cancelar</button><div class="foot-spacer"></div>${m.step > 0 ? `<button class="btn" type="button" data-back>Atrás</button>` : ""}<button class="btn btn-ink" type="button" data-next>Siguiente ${ic("chevron", 15)}</button>`;
  },
  action(act, d, value) {
    if (act === "pick-invoice") {
      modal.draft.invoiceId = value;
      modal.draft.amount = invoiceSaldo(state.invoices.find((i) => i.id === value));
      renderModal(); return;
    }
    if (act === "quick-amount") { modal.draft.amount = Number(value); renderModal(); return; }
    if (act === "go-invoices") { openModal("invoices"); return; }
    if (sharedDraftAction(act, d, value)) return;
    if (act !== "register-abono") return;
    if (!requireShift()) return;
    const inv = state.invoices.find((i) => i.id === d.invoiceId);
    if (!inv) return toast("La factura ya no existe.", "error");
    const digital = methodIsDigital(d.method);
    const m = {
      id: uid(), at: new Date().toISOString(), shiftId: state.shift.id,
      kind: "in", category: "abono", concept: "Abono " + inv.number, invoiceId: inv.id, invoiceNumber: inv.number,
      amount: d.amount, method: d.method, party: inv.client, note: d.note, reference: d.reference,
      evidence: d.evidence || [], verification: digital ? "pendiente" : "verificado",
      duplicate: Boolean(duplicateReference(d.reference)), auth: "no-requiere", executed: true,
      reversed: false, reverses: null, createdBy: currentUser().id
    };
    saveMovement(m);
    renderApp();
    openModal("receipt", { receiptId: m.id });
    toast(digital ? "Abono registrado · pendiente de verificación" : "Abono registrado · factura actualizada");
  }
};

/* ── 9 · Historial ─────────────────────────────────────────── */

FLOWS.history = {
  n: "09", kicker: "Historial", title: "Historial del turno",
  steps: () => [],
  draft: () => ({ filter: "all", q: "" }),
  render(step, d) {
    const all = state.movements.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
    let rows = all;
    if (d.filter === "in") rows = rows.filter((m) => m.kind === "in");
    if (d.filter === "out") rows = rows.filter((m) => m.kind === "out");
    if (d.filter === "pending") rows = rows.filter((m) => m.verification === "pendiente" || m.auth === "pendiente");
    if (d.filter === "rejected") rows = rows.filter((m) => m.verification === "rechazado");
    const q = d.q.trim().toLowerCase();
    if (q) rows = rows.filter((m) => [m.concept, m.party, m.reference, methodName(m.method), m.note].join(" ").toLowerCase().includes(q));
    const groups = [...new Set(rows.map((m) => dayKey(m.at)))];
    const ins = rows.filter((m) => m.kind === "in" && m.verification === "verificado").reduce((t, m) => t + m.amount, 0);
    const outs = rows.filter((m) => m.kind === "out" && m.verification === "verificado").reduce((t, m) => t + m.amount, 0);
    return `<div class="history-tools">
        <div class="filters" role="group" aria-label="Filtrar movimientos">
          ${[["all", "Todos"], ["in", "Entradas"], ["out", "Salidas"], ["pending", "Pendientes"], ["rejected", "Rechazados"]].map(([k, l]) => `<button class="filter" type="button" data-act="filter" data-value="${k}" aria-pressed="${d.filter === k}">${l}</button>`).join("")}
        </div>
        <label class="search-box">${ic("search", 16)}<input data-history-search value="${esc(d.q)}" placeholder="Buscar concepto, cliente o referencia" aria-label="Buscar movimientos" /></label>
      </div>
      <div class="history-totals"><span>${rows.length} movimientos</span><span class="in">Entradas ${fmt(ins)}</span><span class="out">Salidas ${fmt(outs)}</span><span>Neto ${signed(ins - outs)}</span></div>
      ${rows.length ? groups.map((g) => {
        const dayRows = rows.filter((m) => dayKey(m.at) === g);
        const net = dayRows.reduce((t, m) => t + (m.kind === "in" ? m.amount : -m.amount), 0);
        return `<div class="day-head"><b>${esc(dayLabel(dayRows[0].at))}</b><span>${dayRows.length} movimientos · <span class="net ${net >= 0 ? "in" : "out"}">${signed(net)}</span></span></div>
          <div class="move-list">${dayRows.map(moveRow).join("")}</div>`;
      }).join("") : `<div class="empty"><h3>Nada por aquí</h3><p>No hay movimientos con ese filtro. Prueba con "Todos" o borra la búsqueda.</p></div>`}`;
  },
  foot() {
    return `<button class="btn btn-quiet" type="button" data-act="export-csv">${ic("download", 15)} Exportar CSV</button><div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-mclose>Cerrar</button>`;
  },
  action(act, d, value) {
    if (act === "filter") { modal.draft.filter = value; renderModal(); return; }
    if (act === "export-csv") {
      const rows = [["Fecha", "Tipo", "Concepto", "Método", "Importe", "Estado", "Contraparte", "Referencia"]];
      state.movements.forEach((m) => rows.push([new Date(m.at).toLocaleString("es-CO"), m.kind === "in" ? "Entrada" : "Salida", m.concept, methodName(m.method), m.amount, m.verification, m.party, m.reference]));
      downloadText("movimientos-arqueo.csv", rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"));
      toast("CSV descargado");
    }
  }
};

/* ── 10 · Reversos y correcciones ──────────────────────────── */

FLOWS.reverse = {
  n: "10", kicker: "Correcciones", title: "Reversos y correcciones",
  steps: () => ["Movimiento", "Motivo", "Confirmar"],
  draft: () => ({ targetId: "", reason: "Monto incorrecto", note: "" }),
  render(step, d) {
    const candidates = state.movements
      .filter((m) => !m.reversed && m.category !== "reverso")
      .sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 30);
    if (step === 0) {
      return `<p class="modal-lede">Un reverso no borra: crea el movimiento contrario y deja el original marcado. Nada desaparece del historial.</p>
        ${!isManager() ? `<div class="rule-box warn">${ic("lock", 18)}<div><b>Solo el encargado puede reversar</b><p>Puedes revisar la lista, pero el reverso se bloquea con tu rol actual.</p></div></div>` : ""}
        <div class="reverse-list">${candidates.length ? candidates.map((m) => `<button class="reverse-item ${d.targetId === m.id ? "selected" : ""}" type="button" data-act="target" data-value="${m.id}" aria-pressed="${d.targetId === m.id}">
          <span class="vi-icon ${m.kind}">${ic(m.kind === "in" ? "plus" : "minus", 15)}</span>
          <span class="vi-main"><b>${esc(m.concept)}</b><small>${esc(methodName(m.method))} · ${dateShort(m.at)} ${timeHM(m.at)} · ${esc(m.party || "—")}</small></span>
          <span class="vi-side"><b>${fmt(m.amount)}</b>${movementTags(m)}</span>
        </button>`).join("") : `<div class="empty"><h3>Sin movimientos para reversar</h3><p>Los movimientos ya revertidos no se pueden corregir dos veces.</p></div>`}</div>`;
    }
    const target = movementById(d.targetId);
    if (!target) return `<div class="empty"><h3>Elige un movimiento</h3><p>Vuelve al paso anterior.</p></div>`;
    if (step === 1) {
      return `<p class="modal-lede">Corriges <b>${esc(target.concept)}</b> por ${fmt(target.amount)}. El motivo queda en la auditoría.</p>
        <div class="choice-grid two">
          ${["Monto incorrecto", "Método equivocado", "Duplicado", "Otro"].map((r) => `<button class="choice" type="button" data-act="reason" data-value="${esc(r)}" aria-pressed="${d.reason === r}"><b>${esc(r)}</b><small>${r === "Duplicado" ? "Se registró dos veces" : r === "Método equivocado" ? "Efectivo vs. digital" : "Queda documentado"}</small></button>`).join("")}
        </div>
        <label class="field form-block"><span>Detalle (recomendado)</span><textarea data-field="note" maxlength="240" placeholder="Ej. se digitó 89.000 en vez de 98.000">${esc(d.note)}</textarea></label>`;
    }
    const counterKind = target.kind === "in" ? "out" : "in";
    return `<p class="modal-lede">Revisa el efecto. Es la última pantalla antes de dejar el rastro.</p>
      ${summaryList([
        { label: "Original", value: `${target.concept} · ${fmt(target.amount)}` },
        { label: "Queda marcado", html: tag("neutral", "Revertido") },
        { label: "Movimiento contrario", value: `${counterKind === "in" ? "Entrada" : "Salida"} · ${fmt(target.amount)}`, cls: "strong" },
        { label: "Motivo", value: d.reason },
        { label: "Detalle", value: d.note || "—" },
        { label: "Responsable", value: currentUser().name + " · " + currentUser().roleLabel }
      ])}
      <div class="rule-box ${target.method === "efectivo" ? "warn" : ""}">${ic("rotate", 18)}<div><b>${target.method === "efectivo" ? "Ajusta el efectivo esperado" : "No mueve el efectivo"}</b><p>${target.method === "efectivo" ? (target.kind === "in" ? "El reverso resta lo que se había sumado." : "El reverso devuelve lo que se había restado.") : "Los métodos digitales se corrigen por trazabilidad, no por conteo de billetes."}</p></div></div>`;
  },
  collect(m) {
    const d = m.draft;
    if (m.step === 0 && !d.targetId) { toast("Elige el movimiento a corregir.", "error"); return false; }
    if (m.step === 1) d.note = readField("note");
    return true;
  },
  foot(m) {
    if (m.step === 2) {
      return `<button class="btn" type="button" data-back>Atrás</button><div class="foot-spacer"></div><button class="btn btn-danger" type="button" data-act="confirm-reverse" ${isManager() ? "" : "disabled"}>${ic("rotate", 15)} Registrar reverso</button>`;
    }
    return `<button class="btn btn-quiet" type="button" data-mclose>Cancelar</button><div class="foot-spacer"></div>${m.step > 0 ? `<button class="btn" type="button" data-back>Atrás</button>` : ""}<button class="btn btn-ink" type="button" data-next>Siguiente ${ic("chevron", 15)}</button>`;
  },
  action(act, d, value) {
    if (act === "target") { modal.draft.targetId = value; renderModal(); return; }
    if (act === "reason") { modal.draft.reason = value; renderModal(); return; }
    if (act !== "confirm-reverse") return;
    if (!isManager()) return toast("Solo el encargado puede reversar.", "error");
    if (!requireShift()) return;
    const orig = movementById(d.targetId);
    if (!orig || orig.reversed) return toast("Ese movimiento ya no se puede reversar.", "error");
    orig.reversed = true;
    orig.reversedAt = new Date().toISOString();
    orig.reversedBy = currentUser().id;
    const counter = {
      id: uid(), at: new Date().toISOString(), shiftId: state.shift.id,
      kind: orig.kind === "in" ? "out" : "in", category: "reverso",
      concept: "Reverso · " + orig.concept, amount: orig.amount, method: orig.method,
      party: orig.party, note: `${d.reason}${d.note ? " · " + d.note : ""}`, reference: "",
      evidence: [], verification: "verificado", duplicate: false, auth: "no-requiere",
      executed: true, reversed: false, reverses: orig.id, createdBy: currentUser().id
    };
    saveMovement(counter);
    pushAudit("Reversó movimiento", `${orig.concept} · ${fmt(orig.amount)} · ${d.reason}${d.note ? " · " + d.note : ""}`);
    save();
    renderApp();
    openModal("receipt", { receiptId: counter.id });
    toast("Reverso registrado · rastro guardado");
  }
};

/* ── 11 · Cierre de caja ───────────────────────────────────── */

function classificationTable(rows) {
  return `<div class="class-table">
    <div class="ct-row ct-head"><span>Método</span><span>Entradas</span><span>Salidas</span><span>Pendiente</span><span>Estado</span></div>
    ${rows.map((r) => {
      const key = r.method || r.key;
      const ins = r.ins ?? r.in ?? 0;
      const outs = r.outs ?? r.out ?? 0;
      const pending = r.pending || 0;
      const builtin = METHOD_BY[key] || {};
      const digital = !builtin.immediate;
      return `<div class="ct-row">
        <span><b>${esc(builtin.name || key || "—")}</b><small>${digital ? "No mueve la gaveta" : "Cuenta en el efectivo"}</small></span>
        <span class="in">${fmt(ins)}</span>
        <span class="out">${fmt(outs)}</span>
        <span>${pending ? fmt(pending) : "—"}</span>
        <span>${digital ? tag("neutral", "Digital") : tag("verified", "Verificado")}${pending ? " " + tag("pending", (r.pendingCount || 0) + " pend.") : ""}</span>
      </div>`;
    }).join("")}
  </div>`;
}

FLOWS.close = {
  n: "11", kicker: "Cierre", title: "Cierre de caja",
  steps: () => ["Conteo", "Clasificación"],
  draft: () => ({ counts: {}, note: "", nextBase: 150000 }),
  render(step, d) {
    const cash = cashSummary();
    const counted = totalOf(d.counts);
    const diff = counted - cash.expected;
    if (step === 0) {
      return `<p class="modal-lede">Cuenta la gaveta completa. El sistema clasifica por método y estado de verificación; tú solo confirmas.</p>
        <div class="close-summary">
          <div><small>Esperado en efectivo</small><b>${fmt(cash.expected)}</b></div>
          <div><small>Contado</small><b data-count-total>${fmt(counted)}</b></div>
          <div><small>Diferencia</small><b class="${diff === 0 ? "ok" : "bad"}" data-count-diff data-expected="${cash.expected}">${signed(diff)}</b></div>
        </div>
        ${countTray(d.counts)}
        <div class="form-grid form-block">
          <label class="field"><span>Base para el próximo turno</span><input data-next-base data-money value="${nl(d.nextBase || 0)}" inputmode="numeric" /></label>
          <div class="close-read"><b data-withdrawal>${fmt(Math.max(0, counted - (d.nextBase || 0)))}</b><small>Retiro estimado = contado − próxima base</small></div>
        </div>
        ${state.movements.some((m) => m.verification === "pendiente") ? `<p class="form-note">Hay movimientos digitales pendientes: se listan en la clasificación y no se suman al efectivo.</p>` : ""}
        <label class="field form-block"><span>Nota de cierre (opcional)</span><input data-field="note" maxlength="160" value="${esc(d.note)}" placeholder="Ej. faltante por cambio" /></label>`;
    }
    const rows = methodTotals();
    return `<p class="modal-lede">Clasificación automática del turno. Revisa el efectivo, los digitales y lo que queda pendiente.</p>
      ${classificationTable(rows)}
      <div class="close-reconcile">
        <div><span>Base</span><b>${fmt(cash.base)}</b></div>
        <div><span>Entradas efectivo</span><b class="in">+ ${fmt(cash.ins)}</b></div>
        <div><span>Salidas efectivo</span><b class="out">− ${fmt(cash.outs)}</b></div>
        <div class="total"><span>Esperado</span><b>${fmt(cash.expected)}</b></div>
        <div class="total"><span>Contado</span><b>${fmt(counted)}</b></div>
        <div class="total"><span>Diferencia</span><b class="${diff === 0 ? "ok" : "bad"}">${signed(diff)}</b></div>
        <div><span>Retiro</span><b>${fmt(Math.max(0, counted - (d.nextBase || 0)))}</b></div>
        <div><span>Próxima base</span><b>${fmt(d.nextBase || 0)}</b></div>
      </div>
      ${pendingTotal() ? `<div class="rule-box warn">${ic("alert", 18)}<div><b>${pendingTotal()} pendientes no entran al efectivo</b><p>Las verificaciones y autorizaciones siguen en la bandeja del encargado después de cerrar. No se pierden.</p></div></div>` : `<div class="rule-box ok">${ic("check", 18)}<div><b>Sin pendientes</b><p>Todo lo del turno está verificado o no requiere verificación.</p></div></div>`}
      <label class="field form-block"><span>Nota final</span><textarea data-field="note" maxlength="240" placeholder="Observaciones del cierre">${esc(d.note)}</textarea></label>`;
  },
  collect(m) {
    const d = m.draft;
    if (m.step === 0) {
      syncCounts(d);
      const nextInput = $("#modal-body [data-next-base]");
      d.nextBase = parseMoney(nextInput?.value || 0);
      d.note = readField("note");
      if (totalOf(d.counts) <= 0) { toast("Cuenta el efectivo antes de cerrar.", "error"); return false; }
      if (d.nextBase > totalOf(d.counts)) { toast("La próxima base no puede superar lo contado.", "error"); return false; }
    } else {
      d.note = readField("note");
    }
    return true;
  },
  foot(m) {
    if (m.step === 1) {
      return `<button class="btn" type="button" data-back>Atrás</button><div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-act="confirm-close">${ic("lock", 15)} Cerrar turno</button>`;
    }
    return `<button class="btn btn-quiet" type="button" data-mclose>Cancelar</button><div class="foot-spacer"></div><button class="btn btn-ink" type="button" data-next>Ver clasificación ${ic("chevron", 15)}</button>`;
  },
  action(act, d) {
    if (act !== "confirm-close") return;
    if (!state.shift) return;
    const cash = cashSummary();
    const counted = totalOf(d.counts);
    const rows = methodTotals().map((r) => ({ method: r.key, ins: r.ins, outs: r.outs, pending: r.pending, pendingCount: r.pendingCount }));
    const closing = {
      id: "cl-" + uid(), shiftId: state.shift.id, userId: currentUser().id, operator: state.shift.operator,
      openedAt: state.shift.openedAt, closedAt: new Date().toISOString(),
      base: cash.base, expected: cash.expected, counted,
      difference: counted - cash.expected,
      nextBase: d.nextBase || 0, withdrawal: Math.max(0, counted - (d.nextBase || 0)),
      classification: rows, pendingCount: pendingTotal(), note: d.note || ""
    };
    state.closings.unshift(closing);
    state.shift = null;
    pushAudit("Cerró caja", `Contado ${fmt(counted)} · diferencia ${signed(closing.difference)} · retiro ${fmt(closing.withdrawal)}`);
    save();
    renderApp();
    openModal("result", { closingId: closing.id });
    toast("Turno cerrado · acta generada");
  }
};

/* ── 12 · Resultado del cierre ─────────────────────────────── */

function closingText(c) {
  return [
    "ARQUEO EXPRESS · ACTA DE CIERRE",
    "Cierre: " + dateLong(c.closedAt) + " " + timeHM(c.closedAt),
    "Turno abierto: " + dateLong(c.openedAt) + " " + timeHM(c.openedAt),
    "Responsable: " + c.operator,
    "--------------------------------",
    "Base: " + fmt(c.base),
    "Esperado: " + fmt(c.expected),
    "Contado: " + fmt(c.counted),
    "Diferencia: " + signed(c.difference),
    "Retiro: " + fmt(c.withdrawal),
    "Proxima base: " + fmt(c.nextBase),
    "Pendientes de verificacion: " + (c.pendingCount || 0),
    "--------------------------------",
    ...(c.classification || []).map((r) => `${METHOD_BY[r.method]?.name || r.method}: entradas ${fmt(r.ins ?? r.in ?? 0)} · salidas ${fmt(r.outs ?? r.out ?? 0)} · pendiente ${fmt(r.pending || 0)}`),
    "--------------------------------",
    "Generado automaticamente · Prototipo local"
  ].join("\n");
}

FLOWS.result = {
  n: "12", kicker: "Resultado", title: "Resultado del cierre",
  steps: () => [],
  draft: () => ({ closingId: "" }),
  enter(m) { if (!m.draft.closingId) m.draft.closingId = state.closings[0]?.id || ""; },
  render(step, d) {
    const c = state.closings.find((x) => x.id === d.closingId);
    if (!c) return `<div class="empty"><h3>Sin cierre para mostrar</h3><p>La caja está abierta o el cierre no está en este navegador.</p></div>`;
    const ok = c.difference === 0;
    return `<p class="modal-lede">Acta generada automáticamente. El turno ya quedó cerrado y la bandeja conserva lo pendiente.</p>
      <div class="result-hero ${ok ? "ok" : "bad"}">
        <span>${ok ? "Cierre cuadrado" : c.difference > 0 ? "Sobrante en caja" : "Faltante en caja"}</span>
        <b>${signed(c.difference)}</b>
        <small>${ok ? "El efectivo contado coincide con el esperado." : `Esperado ${fmt(c.expected)} · contado ${fmt(c.counted)}.`}</small>
      </div>
      <div class="result-grid">
        <div><small>Contado</small><b>${fmt(c.counted)}</b></div>
        <div><small>Esperado</small><b>${fmt(c.expected)}</b></div>
        <div><small>Retiro</small><b>${fmt(c.withdrawal)}</b></div>
        <div><small>Próxima base</small><b>${fmt(c.nextBase)}</b></div>
      </div>      ${classificationTable(c.classification || [])}
      ${c.pendingCount ? `<div class="rule-box warn">${ic("clock", 18)}<div><b>${c.pendingCount} pendientes siguen en la bandeja</b><p>No se sumaron al efectivo de este cierre. El encargado puede verificarlos después.</p></div></div>` : ""}
      <div class="audit-sign">${ic("check", 16)}<div><b>Cerrado por ${esc(c.operator)}</b><small>${dateLong(c.closedAt)} · ${timeHM(c.closedAt)} · Registro automático de auditoría</small></div></div>
      ${c.note ? `<p class="form-note">Nota: ${esc(c.note)}</p>` : ""}`;
  },
  foot(m) {
    return `<button class="btn" type="button" data-act="download-closing">${ic("download", 15)} Descargar acta</button>
      <div class="foot-spacer"></div>
      <button class="btn" type="button" data-mclose>Volver a Mi caja</button>
      <button class="btn btn-ink" type="button" data-act="new-shift">${ic("lock", 15)} Iniciar nuevo turno</button>`;
  },
  action(act, d) {
    if (act === "download-closing") {
      const c = state.closings.find((x) => x.id === d.closingId);
      if (c) downloadText(`cierre-${dayKey(c.closedAt)}.txt`, closingText(c));
      return;
    }
    if (act === "new-shift") { closeModal(); openModal("open"); }
  }
};
