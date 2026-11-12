/* Arqueo Express · propuesta de rediseño
   Datos de ejemplo en localStorage. Sin dependencias. */

const SCREENS = ["hoy", "cobrar", "caja", "historial"];
const STORE = "arqueo-rediseno-v1";

const DENOMS = [
  { key: "b100", value: 100000, kind: "bill" },
  { key: "b50", value: 50000, kind: "bill" },
  { key: "b20", value: 20000, kind: "bill" },
  { key: "b10", value: 10000, kind: "bill" },
  { key: "b5", value: 5000, kind: "bill" },
  { key: "b2", value: 2000, kind: "bill" },
  { key: "b1", value: 1000, kind: "bill" },
  { key: "b1old", value: 1000, kind: "bill", note: "anterior" },
  { key: "c1k", value: 1000, kind: "coin" },
  { key: "c500", value: 500, kind: "coin" },
  { key: "c200", value: 200, kind: "coin" },
  { key: "c100", value: 100, kind: "coin" },
  { key: "c50", value: 50, kind: "coin" },
  { key: "c20", value: 20, kind: "coin" }
];
const DENOM_BY_KEY = Object.fromEntries(DENOMS.map((d) => [d.key, d]));

const METHODS = [
  ["efectivo", "Efectivo"],
  ["nequi", "Nequi"],
  ["daviplata", "Daviplata"],
  ["transferencia", "Transferencia"],
  ["tarjeta", "Tarjeta"]
];

const TYPES = {
  sale: { label: "Venta", one: "venta", dir: "in", party: "Cliente", partyPlaceholder: "Nombre del cliente (opcional)" },
  purchase: { label: "Compra", one: "compra", dir: "out", party: "Proveedor", partyPlaceholder: "Nombre del proveedor (opcional)" },
  expense: { label: "Gasto", one: "gasto", dir: "out", party: "Beneficiario", partyPlaceholder: "A quién se le pagó (opcional)" }
};

const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const nl = (n) => nf.format(Math.round(Math.abs(Number(n)) || 0));
const fmt = (n) => "$ " + nl(n);
const signed = (n) => (Number(n) >= 0 ? "+ " : "− ") + fmt(n);

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
const parseMoney = (value) => Number(String(value).replace(/\D/g, "")) || 0;
const methodName = (key) => (METHODS.find((m) => m[0] === key) || ["", "Otro"])[1];
const totalOf = (counts) => DENOMS.reduce((total, d) => total + d.value * Math.max(0, Number(counts?.[d.key]) || 0), 0);
const piecesOf = (counts) => DENOMS.reduce((total, d) => total + Math.max(0, Number(counts?.[d.key]) || 0), 0);

function timeHM(iso) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dayKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function dayLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const long = d.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
  if (sameDay(d, now)) return "Hoy, " + long;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Ayer, " + long;
  if (d.getFullYear() !== now.getFullYear()) {
    return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  }
  return long;
}
function daysAgoAt(days, hours, minutes) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}
function localDateValue() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/* ── Estado ─────────────────────────────────────────────────── */

function seed() {
  const baseCounts = {
    b100: 2, b50: 2, b20: 1, b10: 1, b5: 1, b2: 2, b1: 1, b1old: 1,
    c1k: 1, c500: 1, c200: 2, c100: 1, c50: 1, c20: 2
  };
  const shiftId = uid();
  const move = (kind, amount, method, party, note, minutes) => ({
    id: uid(), at: minutesAgo(minutes), shiftId, kind, amount, method, party, note
  });

  return {
    v: 1,
    settings: { business: "Tienda La Esquina", operator: "Ana" },
    shift: {
      id: shiftId,
      operator: "Ana",
      openedAt: minutesAgo(330),
      base: totalOf(baseCounts),
      counts: baseCounts
    },
    movements: [
      move("sale", 32000, "efectivo", "Mostrador", "Venta del día", 300),
      move("sale", 48000, "nequi", "Carolina Ruiz", "Pedido por WhatsApp", 220),
      move("purchase", 34000, "efectivo", "Distribuidora Andina", "Reposición de bebidas", 150),
      move("sale", 76500, "efectivo", "Mostrador", "Mercado de la tarde", 78),
      move("expense", 8000, "efectivo", "Domiciliario", "Envío de pedido", 41),
      move("sale", 27500, "daviplata", "Julián Mora", "Compra de despensa", 18)
    ],
    closed: [
      {
        id: uid(), operator: "Carlos", openedAt: daysAgoAt(1, 8, 10), closedAt: daysAgoAt(1, 18, 5),
        base: 200000, expected: 512000, counted: 509000, nextBase: 150000, withdrawal: 359000, difference: -3000
      },
      {
        id: uid(), operator: "Ana", openedAt: daysAgoAt(2, 8, 0), closedAt: daysAgoAt(2, 17, 40),
        base: 180000, expected: 468000, counted: 468000, nextBase: 150000, withdrawal: 318000, difference: 0
      }
    ]
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.movements)) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

let state = loadState();
let screen = (location.hash || "").replace("#", "");
if (!SCREENS.includes(screen)) screen = "hoy";
let activeType = "sale";
let histFilter = "all";
let introPlayed = false;
let toastTimer = 0;
let lastFocus = null;

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* almacenamiento no disponible */ }
}

/* ── Cálculos ───────────────────────────────────────────────── */

function shiftMovements() {
  if (!state.shift) return [];
  return state.movements.filter((m) => m.shiftId === state.shift.id);
}

function cashSummary() {
  const base = state.shift ? state.shift.base : 0;
  const moves = shiftMovements();
  const ins = moves.filter((m) => m.kind === "sale" && m.method === "efectivo").reduce((t, m) => t + m.amount, 0);
  const outs = moves.filter((m) => m.kind !== "sale" && m.method === "efectivo").reduce((t, m) => t + m.amount, 0);
  return { base, ins, outs, expected: base + ins - outs };
}

function todayMovements() {
  const now = new Date();
  return state.movements.filter((m) => sameDay(new Date(m.at), now));
}

function netOf(movements) {
  return movements.reduce((total, m) => total + (TYPES[m.kind].dir === "in" ? m.amount : -m.amount), 0);
}

/* ── Vistas ─────────────────────────────────────────────────── */

function viewHoy() {
  const s = state.shift;
  const today = todayMovements();
  const cash = cashSummary();

  const hero = s
    ? `<section class="drawer" aria-labelledby="hero-label">
        <div class="drawer-top">
          <p id="hero-label">Efectivo en gaveta</p>
          <p>Turno de <b>${esc(s.operator)}</b> · desde ${timeHM(s.openedAt)}</p>
        </div>
        <p class="drawer-figure" aria-label="Efectivo en gaveta: ${fmt(cash.expected)}">
          <span class="cur" aria-hidden="true">$</span>
          <span class="num" id="hero-num" data-value="${cash.expected}">${nl(cash.expected)}</span>
        </p>
        <dl class="drawer-math">
          <div><dt>Base de apertura</dt><dd>${fmt(cash.base)}</dd></div>
          <div><dt>Entradas en efectivo</dt><dd class="in">+ ${fmt(cash.ins)}</dd></div>
          <div><dt>Salidas en efectivo</dt><dd class="out">− ${fmt(cash.outs)}</dd></div>
        </dl>
        <div class="drawer-actions">
          <button class="btn btn-brass" type="button" data-quick="sale">Cobrar venta</button>
          <button class="btn btn-ghost-dark" type="button" data-quick="expense">Registrar gasto</button>
        </div>
        <div class="drawer-lip">
          <span><b>${piecesOf(s.counts)}</b> piezas contadas al abrir</span>
          <span>Solo el efectivo mueve la gaveta</span>
        </div>
      </section>`
    : `<section class="drawer drawer-closed" aria-labelledby="hero-label">
        <div class="drawer-top">
          <p id="hero-label">Caja cerrada</p>
          <p>Sin turno activo</p>
        </div>
        <h2>Cuenta la base y abre el turno.</h2>
        <p>El conteo por billetes y monedas fija el punto de partida. Después, cada cobro en efectivo se suma solo.</p>
        <div class="drawer-actions">
          <button class="btn btn-brass" type="button" data-screen="caja">Abrir caja</button>
        </div>
      </section>`;

  return `
    <div class="page-head">
      <div>
        <h1 tabindex="-1">Hoy</h1>
        <p class="sub">${s
          ? "Cobros, compras y gastos registrados hoy."
          : "Abre un turno para empezar a registrar cobros y pagos."}</p>
      </div>
    </div>

    ${hero}

    <div class="quick" aria-label="Acciones rápidas">
      <button type="button" data-quick="sale">
        ${iconReceipt()}
        <span><b>Venta</b><small>Cobro al cliente</small></span>
      </button>
      <button type="button" data-quick="purchase">
        ${iconBox()}
        <span><b>Compra</b><small>Pago a proveedor</small></span>
      </button>
      <button type="button" data-quick="expense">
        ${iconMinus()}
        <span><b>Gasto</b><small>Sale de la caja</small></span>
      </button>
    </div>

    <section aria-labelledby="today-title">
      <div class="section-head">
        <h2 id="today-title">Movimientos de hoy</h2>
        <span class="meta">${today.length} ${today.length === 1 ? "registro" : "registros"}</span>
      </div>
      ${today.length
        ? `<ul class="ledger">${today.slice().reverse().slice(0, 6).map(entryHTML).join("")}</ul>
           <div class="ledger-foot"><button class="text-link" type="button" data-screen="historial">Ver todo el historial</button></div>`
        : emptyHTML("Todavía no hay movimientos", "Cuando cobres o pagues algo, aparecerá aquí con su método de pago.")}
    </section>`;
}

function entryHTML(m) {
  const t = TYPES[m.kind];
  const sign = t.dir === "in" ? "+" : "−";
  return `<li class="entry">
    <div class="entry-main">
      <p class="entry-title">${t.label}${m.party ? " · " + esc(m.party) : ""}</p>
      <p class="entry-meta">${timeHM(m.at)} · ${methodName(m.method)}${m.note ? " · " + esc(m.note) : ""}</p>
    </div>
    <span class="entry-amount ${t.dir}">${sign} ${fmt(m.amount)}</span>
  </li>`;
}

function emptyHTML(title, text) {
  return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
}

function viewCobrar() {
  const enabled = Boolean(state.shift);
  const t = TYPES[activeType];

  return `
    <div class="page-head">
      <div>
        <h1 tabindex="-1">Cobrar</h1>
        <p class="sub">Un movimiento por pantalla. El valor, el método y quién participa.</p>
      </div>
    </div>

    ${enabled ? "" : `<div class="notice">
      <span>Necesitas un turno abierto para guardar movimientos.</span>
      <button class="btn" type="button" data-screen="caja">Abrir caja</button>
    </div>`}

    <form id="cobrar-form" class="form" novalidate>
      <div class="type-pick" role="group" aria-label="Tipo de movimiento">
        ${Object.entries(TYPES).map(([key, type]) => `
          <button type="button" data-type="${key}" aria-pressed="${key === activeType}">${type.label}</button>
        `).join("")}
      </div>

      <div class="amount">
        <span class="cur" aria-hidden="true">$</span>
        <input id="amount" name="amount" type="text" inputmode="numeric" autocomplete="off"
          placeholder="0" aria-label="Valor en pesos colombianos" ${enabled ? "" : "disabled"} />
        <span class="unit" aria-hidden="true">COP</span>
      </div>
      <p class="amount-help">Escribe el valor en pesos. Los separadores de miles aparecen solos.</p>

      <div class="form-grid">
        <label class="field">
          <span id="party-label">${t.party}</span>
          <input name="party" type="text" maxlength="80" placeholder="${t.partyPlaceholder}" ${enabled ? "" : "disabled"} />
        </label>
        <label class="field">
          <span>Fecha</span>
          <input name="date" type="date" value="${localDateValue()}" ${enabled ? "" : "disabled"} />
        </label>
        <div class="field full">
          <span id="method-label">Método de pago</span>
          <div class="methods" role="radiogroup" aria-labelledby="method-label">
            ${METHODS.map(([key, label], i) => `
              <label class="method">
                <input type="radio" name="method" value="${key}" ${i === 0 ? "checked" : ""} ${enabled ? "" : "disabled"} />
                <span>${label}</span>
              </label>
            `).join("")}
          </div>
        </div>
        <label class="field full">
          <span>Concepto <span style="font-weight:400;color:var(--muted)">(opcional)</span></span>
          <input name="note" type="text" maxlength="120" placeholder="Detalle breve del movimiento" ${enabled ? "" : "disabled"} />
        </label>
      </div>

      <p class="form-note" id="cash-note">${cashNote(activeType, "efectivo")}</p>

      <div class="form-foot">
        <p>Se guarda en este dispositivo</p>
        <button class="btn btn-ink" type="submit" id="save-move" ${enabled ? "" : "disabled"}>Guardar ${t.one}</button>
      </div>
    </form>`;
}

function cashNote(type, method) {
  if (method !== "efectivo") return "No toca la gaveta. Queda registrado en el historial.";
  return type === "sale" ? "Este cobro entra a la gaveta." : "Este pago sale de la gaveta.";
}

function viewCaja() {
  const s = state.shift;
  return s ? closeView(s) : openView();
}

function openView() {
  return `
    <div class="page-head">
      <div>
        <h1 tabindex="-1">Abrir caja</h1>
        <p class="sub">Cuenta los billetes y monedas que quedan como base. El total se calcula solo.</p>
      </div>
    </div>

    <form id="open-form" class="form form-narrow" novalidate>
      <label class="field field-narrow">
        <span>Responsable del turno</span>
        <input name="operator" type="text" maxlength="80" value="${esc(state.settings.operator)}" required />
      </label>

      <div class="form-block">${trayHTML("open")}</div>

      <div class="form-foot">
        <p>Puedes abrir con una base de $0 si la gaveta está vacía.</p>
        <button class="btn btn-ink" type="submit">Abrir con <span id="open-total-inline">$ 0</span></button>
      </div>
    </form>

    ${prevShiftsHTML()}`;
}

function closeView(s) {
  const cash = cashSummary();
  return `
    <div class="page-head">
      <div>
        <h1 tabindex="-1">Caja</h1>
        <p class="sub">Turno de ${esc(s.operator)}, abierto a las ${timeHM(s.openedAt)}. Cuenta el efectivo antes de retirarlo.</p>
      </div>
    </div>

    <dl class="stats">
      <div><dt>Base de apertura</dt><dd>${fmt(cash.base)}</dd></div>
      <div><dt>Entradas en efectivo</dt><dd class="in">+ ${fmt(cash.ins)}</dd></div>
      <div><dt>Salidas en efectivo</dt><dd class="out">− ${fmt(cash.outs)}</dd></div>
      <div><dt>Efectivo esperado</dt><dd>${fmt(cash.expected)}</dd></div>
    </dl>

    <section aria-labelledby="count-title">
      <div class="section-head">
        <h2 id="count-title">Contar para cerrar</h2>
        <span class="meta">Todo el dinero físico de la gaveta</span>
      </div>

      <form id="close-form" class="form" novalidate>
        <div class="form-block">${trayHTML("close")}</div>

        <div class="close-bar">
          <label class="field">
            <span>Base para el próximo turno</span>
            <input id="next-base" name="nextBase" type="text" inputmode="numeric" value="100.000" />
          </label>
          <div class="close-read" aria-live="polite">
            <b id="close-diff">Ingresa el conteo</b>
            <small id="close-withdraw">Retiro al cerrar: $ 0</small>
          </div>
          <button class="btn btn-ink" type="submit">Cerrar turno</button>
        </div>
      </form>
    </section>

    ${prevShiftsHTML()}`;
}

function trayHTML(mode, counts = {}) {
  const group = (title, kind, label) => {
    const items = DENOMS.filter((d) => d.kind === kind);
    return `<div class="tray-group">
      <div class="tray-head"><h3>${title}</h3><span>${label}</span></div>
      <div class="tray-list">
        ${items.map((d) => slotHTML(d, mode, counts[d.key])).join("")}
      </div>
    </div>`;
  };

  return `<div class="tray" data-mode="${mode}">
    ${group("Billetes", "bill", "Incluye el billete de $1.000 anterior")}
    ${group("Monedas", "coin", "Moneda de $1.000 incluida")}
    <div class="tray-foot">
      <div>
        <small>Total contado</small>
        <strong id="tray-total">${fmt(0)}</strong>
      </div>
      <span class="tray-count" id="tray-pieces">0 piezas</span>
    </div>
  </div>`;
}

function slotHTML(d, mode, qty) {
  const value = Math.max(0, Number(qty) || 0);
  return `<div class="slot">
    <span class="slot-value">${fmt(d.value)}${d.note ? `<small>${d.note}</small>` : ""}</span>
    <span class="slot-sub" data-sub="${d.key}">${value ? fmt(value * d.value) : ""}</span>
    <div class="stepper">
      <button type="button" data-step="-1" data-key="${d.key}" aria-label="Quitar una pieza de ${fmt(d.value)}">−</button>
      <input type="number" min="0" max="99999" step="1" inputmode="numeric"
        data-count="${mode}" data-key="${d.key}" value="${value || ""}" placeholder="0"
        aria-label="Cantidad de piezas de ${fmt(d.value)}" />
      <button type="button" data-step="1" data-key="${d.key}" aria-label="Añadir una pieza de ${fmt(d.value)}">+</button>
    </div>
  </div>`;
}

function prevShiftsHTML() {
  if (!state.closed.length) return "";
  return `<section class="prev-shifts" aria-labelledby="prev-title">
    <div class="section-head">
      <h2 id="prev-title">Turnos anteriores</h2>
      <span class="meta">${state.closed.length} ${state.closed.length === 1 ? "cierre" : "cierres"}</span>
    </div>
    <ul class="ledger">
      ${state.closed.slice(0, 4).map((s) => {
        const diff = Number(s.difference) || 0;
        return `<li class="entry">
          <div class="entry-main">
            <p class="entry-title">${esc(s.operator)} · ${dayLabel(s.closedAt)}</p>
            <p class="entry-meta">Base ${fmt(s.base)} · Contado ${fmt(s.counted)} · Retiro ${fmt(s.withdrawal)}</p>
          </div>
          <span class="entry-amount ${diff === 0 ? "" : diff > 0 ? "in" : "out"}">${diff === 0 ? "Cuadró" : signed(diff)}</span>
        </li>`;
      }).join("")}
    </ul>
  </section>`;
}

function viewHistorial() {
  const all = state.movements.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
  const filtered = all.filter((m) => {
    if (histFilter === "in") return TYPES[m.kind].dir === "in";
    if (histFilter === "out") return TYPES[m.kind].dir === "out";
    if (histFilter === "sale") return m.kind === "sale";
    if (histFilter === "purchase") return m.kind === "purchase";
    return true;
  });

  const ins = filtered.filter((m) => TYPES[m.kind].dir === "in").reduce((t, m) => t + m.amount, 0);
  const outs = filtered.filter((m) => TYPES[m.kind].dir === "out").reduce((t, m) => t + m.amount, 0);
  const net = ins - outs;

  const groups = new Map();
  filtered.forEach((m) => {
    const key = dayKey(m.at);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  });

  const filters = [
    ["all", "Todo"],
    ["in", "Entradas"],
    ["out", "Salidas"],
    ["sale", "Ventas"],
    ["purchase", "Compras"]
  ];

  return `
    <div class="page-head">
      <div>
        <h1 tabindex="-1">Historial</h1>
        <p class="sub">Cada movimiento con su fecha, método y concepto. Nada se borra sin dejar rastro.</p>
      </div>
      <button class="btn head-action" type="button" data-export>Descargar respaldo</button>
    </div>

    <dl class="stats three">
      <div><dt>Entradas</dt><dd class="in">+ ${fmt(ins)}</dd></div>
      <div><dt>Salidas</dt><dd class="out">− ${fmt(outs)}</dd></div>
      <div><dt>Neto</dt><dd class="${net < 0 ? "out" : ""}">${net < 0 ? "− " : ""}${fmt(Math.abs(net))}</dd></div>
    </dl>

    <div class="filters" role="group" aria-label="Filtrar movimientos">
      ${filters.map(([key, label]) => `
        <button class="filter" type="button" data-filter="${key}" aria-pressed="${histFilter === key}">${label}</button>
      `).join("")}
    </div>

    ${filtered.length
      ? [...groups.entries()].map(([, moves]) => {
          const dayNet = netOf(moves);
          return `<section>
            <div class="day-head">
              <b>${dayLabel(moves[0].at)}</b>
              <span class="net">${dayNet === 0 ? "Sin neto" : (dayNet > 0 ? "+ " : "− ") + fmt(Math.abs(dayNet))}</span>
            </div>
            <ul class="ledger">${moves.map(entryHTML).join("")}</ul>
          </section>`;
        }).join("")
      : emptyHTML("Sin movimientos en este filtro", "Prueba con otro filtro o registra un movimiento desde Cobrar.")}`;
}

/* ── Piezas de interfaz ─────────────────────────────────────── */

function iconReceipt() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></svg>`;
}
function iconBox() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>`;
}
function iconMinus() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M8 12h8"/></svg>`;
}

/* ── Render ─────────────────────────────────────────────────── */

const main = $("#main");
const sheet = $("#sheet");

function render() {
  main.innerHTML = { hoy: viewHoy, cobrar: viewCobrar, caja: viewCaja, historial: viewHistorial }[screen]();
  document.title = `${screen.charAt(0).toUpperCase() + screen.slice(1)} · Arqueo Express`;
  updateChrome();
  afterRender();
}

function updateChrome() {
  $$("#tabs button, #dock button").forEach((button) => {
    if (button.dataset.screen === screen) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const live = $("#live");
  const open = Boolean(state.shift);
  live.dataset.open = String(open);
  live.querySelector("span").textContent = open ? "Caja abierta" : "Caja cerrada";
  $("#biz-name").textContent = state.settings.business;
}

function afterRender() {
  if (screen === "hoy" && state.shift && !introPlayed) {
    introPlayed = true;
    const el = $("#hero-num");
    if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animateNumber(el, Number(el.dataset.value) || 0);
    }
  }
  syncTray();
  updateCashNote();
}

function animateNumber(el, target) {
  const start = performance.now();
  const duration = 680;
  const frame = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = nl(Math.round(target * eased));
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function readCounts(mode) {
  const counts = {};
  $$(`[data-count="${mode}"]`).forEach((input) => {
    counts[input.dataset.key] = Math.max(0, Math.min(99999, parseInt(input.value, 10) || 0));
  });
  return counts;
}

function syncTray() {
  const tray = $(".tray");
  if (!tray) return;

  const mode = tray.dataset.mode;
  let total = 0;
  let pieces = 0;

  $$("[data-count]", tray).forEach((input) => {
    const qty = Math.max(0, Math.min(99999, parseInt(input.value, 10) || 0));
    const denom = DENOM_BY_KEY[input.dataset.key];
    if (!denom) return;
    total += denom.value * qty;
    pieces += qty;
    const sub = $(`[data-sub="${input.dataset.key}"]`, tray);
    if (sub) sub.textContent = qty ? fmt(qty * denom.value) : "";
  });

  const totalEl = $("#tray-total", tray);
  if (totalEl) totalEl.textContent = fmt(total);
  const piecesEl = $("#tray-pieces", tray);
  if (piecesEl) piecesEl.textContent = `${pieces} ${pieces === 1 ? "pieza" : "piezas"}`;

  if (mode === "open") {
    const inline = $("#open-total-inline");
    if (inline) inline.textContent = fmt(total);
  }

  if (mode === "close") {
    const read = $("#close-diff");
    if (read) {
      if (total === 0) {
        read.className = "";
        read.textContent = "Ingresa el conteo";
      } else {
        const diff = total - cashSummary().expected;
        read.className = diff === 0 ? "ok" : "bad";
        read.textContent = diff === 0 ? "Cuadra exacto" : diff > 0 ? `Sobran ${fmt(diff)}` : `Faltan ${fmt(Math.abs(diff))}`;
      }
    }
    const baseInput = $("#next-base");
    const base = parseMoney(baseInput?.value || "");
    const withdraw = Math.max(0, total - base);
    const withdrawEl = $("#close-withdraw");
    if (withdrawEl) withdrawEl.textContent = `Retiro al cerrar: ${fmt(withdraw)}`;
  }
}

function updateCashNote() {
  const checked = $('input[name="method"]:checked');
  const note = $("#cash-note");
  if (!checked || !note) return;
  note.textContent = cashNote(activeType, checked.value);
}

function updateCobrarLabels() {
  const t = TYPES[activeType];
  const partyLabel = $("#party-label");
  const partyInput = $('input[name="party"]');
  const saveButton = $("#save-move");
  if (partyLabel) partyLabel.textContent = t.party;
  if (partyInput) partyInput.placeholder = t.partyPlaceholder;
  if (saveButton) saveButton.textContent = `Guardar ${t.one}`;
  updateCashNote();
}

function go(next) {
  if (!SCREENS.includes(next)) next = "hoy";
  screen = next;
  if (location.hash !== "#" + next) {
    location.hash = next;
  } else {
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
    focusHeading();
  }
}

function focusHeading() {
  const heading = $("h1", main);
  if (heading) heading.focus({ preventScroll: true });
}

function toast(message, tone = "") {
  const el = $("#toast");
  el.textContent = message;
  el.className = "toast show" + (tone === "error" ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = "toast";
  }, 3200);
}

/* ── Acciones ───────────────────────────────────────────────── */

function saveMovement(form) {
  if (!state.shift) {
    toast("Abre la caja antes de registrar movimientos.", "error");
    return;
  }
  const data = new FormData(form);
  const amount = parseMoney(data.get("amount"));
  if (!amount) {
    toast("Escribe un valor mayor que cero.", "error");
    $("#amount")?.focus();
    return;
  }
  const type = TYPES[activeType];
  const dateValue = String(data.get("date") || "");
  const now = new Date();
  let at = now.toISOString();
  if (dateValue) {
    const chosen = new Date(dateValue + "T00:00:00");
    if (!Number.isNaN(chosen.getTime())) {
      chosen.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
      at = chosen.toISOString();
    }
  }
  state.movements.push({
    id: uid(),
    at,
    shiftId: state.shift.id,
    kind: activeType,
    amount,
    method: data.get("method") || "efectivo",
    party: String(data.get("party") || "").trim(),
    note: String(data.get("note") || "").trim()
  });
  save();
  toast(`${type.label} guardada: ${fmt(amount)}`);
  go("hoy");
}

function openShift(form) {
  const data = new FormData(form);
  const operator = String(data.get("operator") || "").trim();
  if (!operator) {
    toast("Escribe el nombre de la persona responsable.", "error");
    form.elements.operator.focus();
    return;
  }
  const counts = readCounts("open");
  const base = totalOf(counts);
  state.shift = {
    id: uid(),
    operator,
    openedAt: new Date().toISOString(),
    base,
    counts
  };
  state.settings.operator = operator;
  save();
  toast(`Caja abierta con una base de ${fmt(base)}`);
  go("hoy");
}

function closeShift(form) {
  if (!state.shift) return;
  const data = new FormData(form);
  const counts = readCounts("close");
  const counted = totalOf(counts);
  const nextBase = parseMoney(data.get("nextBase"));

  if (nextBase > counted) {
    toast("La base para el próximo turno no puede superar lo contado.", "error");
    return;
  }

  const expected = cashSummary().expected;
  const withdrawal = counted - nextBase;
  state.closed.unshift({
    id: state.shift.id,
    operator: state.shift.operator,
    openedAt: state.shift.openedAt,
    closedAt: new Date().toISOString(),
    base: state.shift.base,
    expected,
    counted,
    nextBase,
    withdrawal,
    difference: counted - expected
  });
  state.shift = null;
  save();
  toast(`Turno cerrado. Retiro de ${fmt(withdrawal)}.`);
  go("caja");
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `arqueo-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast("Respaldo descargado.");
}

function openSheet() {
  lastFocus = document.activeElement;
  const form = $("#settings-form");
  form.elements.business.value = state.settings.business;
  form.elements.operator.value = state.settings.operator;
  sheet.hidden = false;
  document.body.style.overflow = "hidden";
  form.elements.business.focus();
}

function closeSheet() {
  sheet.hidden = true;
  document.body.style.overflow = "";
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  lastFocus = null;
}

/* ── Eventos ────────────────────────────────────────────────── */

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-screen]");
  if (nav) {
    event.preventDefault();
    go(nav.dataset.screen);
    return;
  }

  const quick = event.target.closest("[data-quick]");
  if (quick) {
    activeType = quick.dataset.quick;
    go("cobrar");
    return;
  }

  const typeButton = event.target.closest("[data-type]");
  if (typeButton) {
    activeType = typeButton.dataset.type;
    $$("[data-type]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.type === activeType)));
    updateCobrarLabels();
    return;
  }

  const step = event.target.closest("[data-step]");
  if (step) {
    const input = $(`[data-count][data-key="${step.dataset.key}"]`);
    if (!input) return;
    const next = Math.max(0, (parseInt(input.value, 10) || 0) + Number(step.dataset.step));
    input.value = next === 0 ? "" : String(next);
    syncTray();
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    histFilter = filter.dataset.filter;
    render();
    return;
  }

  if (event.target.closest("[data-export]") || event.target.closest("#export-json")) {
    event.preventDefault();
    exportJSON();
    return;
  }

  if (event.target.closest("#open-settings")) {
    openSheet();
    return;
  }

  if (event.target.closest("#close-settings") || event.target === sheet) {
    closeSheet();
    return;
  }

  if (event.target.closest("#reset-demo")) {
    if (!confirm("Esto reemplaza los datos de la demo por el ejemplo inicial. ¿Continuar?")) return;
    state = seed();
    save();
    closeSheet();
    go("hoy");
    toast("Demo reiniciada con datos de ejemplo.");
  }
});

document.addEventListener("change", (event) => {
  if (event.target.name === "method") updateCashNote();
});

document.addEventListener("input", (event) => {
  const target = event.target;

  if (target.id === "amount") {
    const digits = target.value.replace(/\D/g, "").slice(0, 10);
    target.value = digits ? nf.format(Number(digits)) : "";
    return;
  }

  if (target.matches("[data-count]")) {
    const digits = target.value.replace(/\D/g, "").slice(0, 5);
    target.value = digits ? String(Number(digits)) : "";
    syncTray();
    return;
  }

  if (target.id === "next-base") {
    const digits = target.value.replace(/\D/g, "").slice(0, 10);
    target.value = digits ? nf.format(Number(digits)) : "";
    syncTray();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  event.preventDefault();

  if (form.id === "cobrar-form") saveMovement(form);
  if (form.id === "open-form") openShift(form);
  if (form.id === "close-form") closeShift(form);

  if (form.id === "settings-form") {
    const data = new FormData(form);
    const business = String(data.get("business") || "").trim();
    const operator = String(data.get("operator") || "").trim();
    if (!business || !operator) {
      toast("Completa el nombre del negocio y del cajero.", "error");
      return;
    }
    state.settings.business = business;
    state.settings.operator = operator;
    if (state.shift) state.shift.operator = operator;
    save();
    closeSheet();
    render();
    toast("Configuración guardada.");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !sheet.hidden) closeSheet();
});

window.addEventListener("hashchange", () => {
  const next = (location.hash || "").replace("#", "");
  screen = SCREENS.includes(next) ? next : "hoy";
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
  focusHeading();
});

/* ── Inicio ─────────────────────────────────────────────────── */

render();
