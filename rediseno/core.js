/* Arqueo Express · rediseño 2 pantallas + 12 flujos
   Estado, reglas del negocio y datos de demostración. Sin dependencias. */

const STORE = "arqueo-rediseno-v2";
const SESSION = "arqueo-rediseno-sesion-v2";

const DENOMS = [
  { key: "b100", value: 100000, kind: "bill", label: "$100.000" },
  { key: "b50", value: 50000, kind: "bill", label: "$50.000" },
  { key: "b20", value: 20000, kind: "bill", label: "$20.000" },
  { key: "b10", value: 10000, kind: "bill", label: "$10.000" },
  { key: "b5", value: 5000, kind: "bill", label: "$5.000" },
  { key: "b2", value: 2000, kind: "bill", label: "$2.000" },
  { key: "b1", value: 1000, kind: "bill", label: "$1.000" },
  { key: "b1old", value: 1000, kind: "bill", label: "$1.000", note: "anterior" },
  { key: "c1k", value: 1000, kind: "coin", label: "$1.000" },
  { key: "c500", value: 500, kind: "coin", label: "$500" },
  { key: "c200", value: 200, kind: "coin", label: "$200" },
  { key: "c100", value: 100, kind: "coin", label: "$100" },
  { key: "c50", value: 50, kind: "coin", label: "$50" },
  { key: "c20", value: 20, kind: "coin", label: "$20" }
];
const DENOM_BY_KEY = Object.fromEntries(DENOMS.map((d) => [d.key, d]));

const METHODS = [
  { key: "efectivo", name: "Efectivo", immediate: true, needsEvidence: false, note: "Entra a la gaveta de inmediato.", account: "Gaveta · Caja 01" },
  { key: "nequi", name: "Nequi", immediate: false, needsEvidence: true, note: "Requiere verificación del encargado.", account: "Nequi · 300 123 4567" },
  { key: "daviplata", name: "Daviplata", immediate: false, needsEvidence: true, note: "Requiere verificación del encargado.", account: "Daviplata · 300 987 6543" },
  { key: "transferencia", name: "Transferencia", immediate: false, needsEvidence: true, note: "Requiere soporte y verificación.", account: "Bancolombia · 210-45-8877" },
  { key: "tarjeta", name: "Tarjeta", immediate: true, needsEvidence: false, note: "Se confirma con el datafono.", account: "Datafono · Caja 01" }
];
const METHOD_BY = Object.fromEntries(METHODS.map((m) => [m.key, m]));
const methodName = (key) => (METHOD_BY[key] || { name: "Otro" }).name;
const methodIsDigital = (key) => !(METHOD_BY[key] || {}).immediate;

const USERS = {
  ana: { id: "ana", name: "Ana Beltrán", role: "cajero", roleLabel: "Cajera", pin: "1234", initials: "AB" },
  carlos: { id: "carlos", name: "Carlos Mejía", role: "encargado", roleLabel: "Encargado", pin: "4321", initials: "CM" }
};

const CONCEPTS = {
  in: [
    { id: "venta", label: "Venta", hint: "Mostrador o pedido", party: "Cliente", placeholder: "Nombre del cliente (opcional)" },
    { id: "abono", label: "Abono a factura", hint: "Cobro de un crédito", party: "Cliente", placeholder: "Cliente de la factura" },
    { id: "otro-ingreso", label: "Otro ingreso", hint: "Aporte, devolución, ajuste", party: "Origen", placeholder: "¿De dónde viene el dinero?" }
  ],
  out: [
    { id: "compra", label: "Compra", hint: "Reposición de inventario", party: "Proveedor", placeholder: "Nombre del proveedor (opcional)" },
    { id: "gasto", label: "Gasto", hint: "Domicilio, aseo, servicios", party: "Beneficiario", placeholder: "¿A quién se le pagó?" },
    { id: "proveedor", label: "Pago a proveedor", hint: "Factura o cuenta por pagar", party: "Proveedor", placeholder: "Proveedor o cuenta" },
    { id: "retiro", label: "Retiro parcial", hint: "Base que sale de la gaveta", party: "Recibe", placeholder: "Quién retira (opcional)" }
  ]
};

const CONCEPT_BY_ID = Object.fromEntries([...CONCEPTS.in, ...CONCEPTS.out].map((c) => [c.id, c]));
const FREQUENT_PARTIES = ["Mostrador", "Carolina Ruiz", "Julián Mora", "Distribuidora Andina", "Finca El Roble", "Insumos del Sur", "Domiciliario"];
const FREQUENT_CONCEPTS = {
  in: ["Venta mostrador", "Pedido por WhatsApp", "Abono factura", "Devolución"],
  out: ["Reposición de bebidas", "Domicilio", "Aseo", "Pago de proveedor"]
};

const nf = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const nl = (n) => nf.format(Math.round(Math.abs(Number(n)) || 0));
const fmt = (n) => "$ " + nl(n);
const signed = (n) => (Number(n) >= 0 ? "+ " : "− ") + fmt(n);
const parseMoney = (value) => Number(String(value ?? "").replace(/\D/g, "")) || 0;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const daysAgoAt = (days, h, min) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(h, min, 0, 0);
  return d.toISOString();
};
function timeHM(iso) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function dateLong(iso) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}
function dateShort(iso) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
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
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (sameDay(d, y)) return "Ayer, " + long;
  return d.getFullYear() !== now.getFullYear() ? d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }) : long;
}
function localDateValue(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysUntil(iso) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(iso); due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86400000);
}
function dueLabel(iso) {
  const d = daysUntil(iso);
  if (d < 0) return `Vencida hace ${Math.abs(d)} ${Math.abs(d) === 1 ? "día" : "días"}`;
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Vence mañana";
  return `Vence en ${d} días`;
}

const totalOf = (counts) => DENOMS.reduce((t, d) => t + d.value * Math.max(0, Number(counts?.[d.key]) || 0), 0);
const piecesOf = (counts) => DENOMS.reduce((t, d) => t + Math.max(0, Number(counts?.[d.key]) || 0), 0);
const emptyCounts = () => Object.fromEntries(DENOMS.map((d) => [d.key, 0]));

/* Comprobante de ejemplo, generado localmente. Sirve para probar sin cámara. */
function sampleEvidence(bank, amount, reference) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="540" viewBox="0 0 360 540">
  <rect width="360" height="540" rx="18" fill="#101c18"/>
  <rect x="18" y="18" width="324" height="504" rx="12" fill="#fbfcf9"/>
  <text x="40" y="62" font-family="Arial" font-size="13" fill="#5e6c64">Comprobante de pago</text>
  <text x="40" y="92" font-family="Arial" font-size="21" font-weight="bold" fill="#101c18">${esc(bank)}</text>
  <rect x="40" y="112" width="280" height="1" fill="#dbe1d7"/>
  <text x="40" y="150" font-family="Arial" font-size="11" fill="#5e6c64">VALOR</text>
  <text x="40" y="184" font-family="Courier New" font-size="30" font-weight="bold" fill="#101c18">$ ${nl(amount)}</text>
  <text x="40" y="226" font-family="Arial" font-size="11" fill="#5e6c64">REFERENCIA</text>
  <text x="40" y="248" font-family="Courier New" font-size="15" fill="#101c18">${esc(reference)}</text>
  <text x="40" y="290" font-family="Arial" font-size="11" fill="#5e6c64">DESTINO</text>
  <text x="40" y="312" font-family="Arial" font-size="14" fill="#101c18">Arqueo Express</text>
  <text x="40" y="334" font-family="Arial" font-size="12" fill="#5e6c64">Cuenta de la tienda</text>
  <rect x="40" y="360" width="280" height="1" fill="#dbe1d7"/>
  <text x="40" y="392" font-family="Arial" font-size="11" fill="#5e6c64">ESTADO</text>
  <rect x="40" y="404" width="112" height="28" rx="14" fill="#f2e7cf"/>
  <text x="58" y="423" font-family="Arial" font-size="12" fill="#7d5a15">Aprobado</text>
  <text x="40" y="472" font-family="Arial" font-size="10" fill="#9aa69d">Imagen de demostración · Prototipo Arqueo Express</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ── Datos de demostración ──────────────────────────────────── */

function seed() {
  const shiftId = "sh-" + uid();
  const account = "Bancolombia · 210-45-8877";
  const mk = (o) => ({
    id: uid(), shiftId, evidence: [], note: "", reference: "", party: "", category: "venta",
    verification: "verificado", auth: "no-requiere", executed: true, reverses: null, reversed: false,
    ...o
  });

  const demoEvidence1 = sampleEvidence("Nequi", 48000, "NEQ-88214");
  const demoEvidence2 = sampleEvidence("Bancolombia", 128000, "TRF-559021");
  const demoEvidence3 = sampleEvidence("Bancolombia", 95000, "TRF-771003");

  const inv1 = { id: "inv-" + uid(), number: "F-1042", client: "Carolina Ruiz", concept: "Mercado del mes", amount: 180000, createdAt: daysAgoAt(9, 10, 20), dueAt: daysAgoAt(-3, 12, 0), createdBy: "ana" };
  const inv2 = { id: "inv-" + uid(), number: "F-1043", client: "Julián Mora", concept: "Pedido de despensa", amount: 95000, createdAt: daysAgoAt(12, 16, 10), dueAt: daysAgoAt(2, 12, 0), createdBy: "ana" };
  const inv3 = { id: "inv-" + uid(), number: "F-1044", client: "Mercado San Gil", concept: "Compra mayorista", amount: 240000, createdAt: daysAgoAt(3, 9, 0), dueAt: daysAgoAt(-8, 12, 0), createdBy: "carlos" };
  const inv4 = { id: "inv-" + uid(), number: "F-1039", client: "Comedor La 45", concept: "Pedido semanal", amount: 130000, createdAt: daysAgoAt(20, 11, 0), dueAt: daysAgoAt(6, 12, 0), createdBy: "ana" };

  const movements = [
    mk({ at: minutesAgo(312), kind: "in", concept: "Venta mostrador", category: "venta", amount: 32000, method: "efectivo", party: "Mostrador", createdBy: "ana" }),
    mk({ at: minutesAgo(233), kind: "in", concept: "Pedido por WhatsApp", category: "venta", amount: 48000, method: "nequi", party: "Carolina Ruiz", reference: "NEQ-88214", createdBy: "ana", verification: "pendiente", evidence: [{ name: "nequi-88214.svg", data: demoEvidence1 }] }),
    mk({ at: minutesAgo(151), kind: "out", concept: "Reposición de bebidas", category: "compra", amount: 34000, method: "efectivo", party: "Distribuidora Andina", createdBy: "ana" }),
    mk({ at: minutesAgo(79), kind: "in", concept: "Mercado de la tarde", category: "venta", amount: 76500, method: "efectivo", party: "Mostrador", createdBy: "ana" }),
    mk({ at: minutesAgo(42), kind: "out", concept: "Domicilio", category: "gasto", amount: 8000, method: "efectivo", party: "Domiciliario", createdBy: "ana" }),
    mk({ at: minutesAgo(28), kind: "in", concept: "Pedido mayorista", category: "venta", amount: 128000, method: "transferencia", party: "Finca El Roble", reference: "TRF-559021", createdBy: "ana", verification: "pendiente", evidence: [{ name: "transferencia-559021.svg", data: demoEvidence2 }] }),
    mk({ at: minutesAgo(17), kind: "out", concept: "Pago de proveedor", category: "proveedor", amount: 95000, method: "transferencia", party: "Insumos del Sur", reference: "TRF-771003", createdBy: "ana", verification: "pendiente", auth: "pendiente", executed: false, evidence: [{ name: "transferencia-771003.svg", data: demoEvidence3 }] }),
    mk({ at: minutesAgo(9), kind: "in", concept: "Venta mostrador", category: "venta", amount: 27500, method: "efectivo", party: "Mostrador", createdBy: "ana" }),
    // Abonos de facturas (fuera del turno actual)
    mk({ at: daysAgoAt(1, 11, 30), shiftId: "prev", kind: "in", concept: "Abono F-1042", category: "abono", invoiceId: inv1.id, amount: 60000, method: "efectivo", party: "Carolina Ruiz", createdBy: "ana", reference: "ABN-1042" }),
    mk({ at: daysAgoAt(1, 16, 5), shiftId: "prev", kind: "in", concept: "Abono F-1044", category: "abono", invoiceId: inv3.id, amount: 40000, method: "transferencia", party: "Mercado San Gil", reference: "TRF-441208", createdBy: "ana", verification: "pendiente", evidence: [{ name: "transferencia-441208.svg", data: sampleEvidence("Bancolombia", 40000, "TRF-441208") }] }),
    mk({ at: daysAgoAt(8, 15, 0), shiftId: "prev", kind: "in", concept: "Abono F-1039", category: "abono", invoiceId: inv4.id, amount: 130000, method: "efectivo", party: "Comedor La 45", createdBy: "ana", reference: "ABN-1039" })
  ];

  const baseCounts = { b100: 2, b50: 1, b20: 2, b10: 1 };

  return {
    v: 2,
    settings: { business: "Tienda La Esquina", caja: "Caja 01" },
    shift: {
      id: shiftId, userId: "ana", operator: "Ana Beltrán",
      openedAt: minutesAgo(345), base: totalOf(baseCounts), counts: baseCounts, note: ""
    },
    invoices: [inv1, inv2, inv3, inv4],
    movements,
    closings: [{
      id: "cl-" + uid(), shiftId: "prev", userId: "ana", operator: "Ana Beltrán",
      openedAt: daysAgoAt(1, 8, 5), closedAt: daysAgoAt(1, 18, 20),
      base: 280000, expected: 512000, counted: 509000, difference: -3000,
      nextBase: 150000, withdrawal: 359000,
      classification: [
        { method: "efectivo", in: 372000, out: 140000, pending: 0 },
        { method: "nequi", in: 86000, out: 0, pending: 0 },
        { method: "transferencia", in: 40000, out: 0, pending: 40000 }
      ],
      pendingCount: 1
    }],
    audit: [
      { id: uid(), at: minutesAgo(345), actor: "Ana Beltrán", role: "cajero", action: "Abrió caja", detail: "Base contada " + fmt(300000) },
      { id: uid(), at: minutesAgo(312), actor: "Ana Beltrán", role: "cajero", action: "Registró entrada", detail: "Venta mostrador · " + fmt(32000) + " efectivo" },
      { id: uid(), at: minutesAgo(151), actor: "Ana Beltrán", role: "cajero", action: "Registró salida", detail: "Reposición de bebidas · " + fmt(34000) + " efectivo" },
      { id: uid(), at: minutesAgo(20), actor: "Ana Beltrán", role: "cajero", action: "Registró salida", detail: "Pago de proveedor · " + fmt(95000) + " transferencia · pendiente de autorización" }
    ],
    counters: { receipt: 41 }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 2 || !Array.isArray(parsed.movements)) return seed();
    return parsed;
  } catch {
    return seed();
  }
}

let state = loadState();
let session = null;
try { session = JSON.parse(localStorage.getItem(SESSION) || "null"); } catch { session = null; }

function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
}
function saveSession() {
  try {
    if (session) localStorage.setItem(SESSION, JSON.stringify(session));
    else localStorage.removeItem(SESSION);
  } catch { /* sin almacenamiento */ }
}
function resetDemo() {
  state = seed();
  session = null;
  save(); saveSession();
}
function currentUser() {
  return USERS[session?.userId] || null;
}
function isManager() {
  return currentUser()?.role === "encargado";
}

/* ── Cálculos del turno ─────────────────────────────────────── */

function shiftMoves() {
  if (!state.shift) return [];
  return state.movements.filter((m) => m.shiftId === state.shift.id);
}
function cashSummary() {
  const base = state.shift?.base || 0;
  const moves = shiftMoves();
  const ins = moves.filter((m) => m.kind === "in" && m.method === "efectivo" && m.verification === "verificado" && !m.reversed).reduce((t, m) => t + m.amount, 0);
  const outs = moves.filter((m) => m.kind === "out" && m.method === "efectivo" && !m.reversed).reduce((t, m) => t + m.amount, 0);
  return { base, ins, outs, expected: base + ins - outs };
}
function methodTotals(moves = shiftMoves()) {
  return METHODS.map((m) => {
    const rows = moves.filter((x) => x.method === m.key && !x.reversed);
    const ins = rows.filter((x) => x.kind === "in" && x.verification === "verificado").reduce((t, x) => t + x.amount, 0);
    const outs = rows.filter((x) => x.kind === "out" && x.verification === "verificado").reduce((t, x) => t + x.amount, 0);
    const pending = rows.filter((x) => x.verification === "pendiente" || (x.kind === "out" && x.auth === "pendiente")).reduce((t, x) => t + x.amount, 0);
    const pendingCount = rows.filter((x) => x.verification === "pendiente" || (x.kind === "out" && x.auth === "pendiente")).length;
    return { ...m, ins, outs, pending, pendingCount, count: rows.length };
  }).filter((m) => m.count || m.key === "efectivo");
}
function pendingVerifications() {
  return state.movements
    .filter((m) => m.verification === "pendiente" && !m.reversed && m.auth !== "pendiente")
    .sort((a, b) => {
      const score = (m) => (m.duplicate ? 2 : 0) + (m.evidence?.length ? 0 : 1);
      return score(b) - score(a) || new Date(a.at) - new Date(b.at);
    });
}
function pendingAuthorizations() {
  return state.movements
    .filter((m) => m.kind === "out" && m.auth === "pendiente" && !m.reversed)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}
function pendingTotal() {
  return pendingVerifications().length + pendingAuthorizations().length;
}
function invoicePaid(inv) {
  return state.movements
    .filter((m) => m.invoiceId === inv.id && m.verification === "verificado" && !m.reversed)
    .reduce((t, m) => t + m.amount, 0);
}
function invoicePending(inv) {
  return state.movements
    .filter((m) => m.invoiceId === inv.id && m.verification === "pendiente" && !m.reversed)
    .reduce((t, m) => t + m.amount, 0);
}
function invoiceSaldo(inv) {
  return Math.max(0, inv.amount - invoicePaid(inv));
}
function openInvoices() {
  return state.invoices.filter((i) => invoiceSaldo(i) > 0);
}
function invoiceLabel(inv) {
  const saldo = invoiceSaldo(inv);
  if (saldo <= 0) return { state: "verified", text: "Pagada" };
  const d = daysUntil(inv.dueAt);
  if (d < 0) return { state: "rejected", text: "Vencida" };
  if (d <= 3) return { state: "pending", text: "Por vencer" };
  return { state: "neutral", text: "Al día" };
}

function duplicateReference(ref, exceptId) {
  const clean = String(ref || "").trim().toLowerCase();
  if (!clean) return null;
  return state.movements.find((m) => m.id !== exceptId && !m.reversed && String(m.reference || "").trim().toLowerCase() === clean) || null;
}

function pushAudit(action, detail, actor = currentUser()) {
  state.audit.unshift({
    id: uid(), at: new Date().toISOString(),
    actor: actor?.name || "Sistema", role: actor?.role || "sistema",
    action, detail
  });
  state.audit = state.audit.slice(0, 300);
}

function nextReceipt() {
  state.counters.receipt = (state.counters.receipt || 40) + 1;
  return "C-" + String(state.counters.receipt).padStart(4, "0");
}

function movementById(id) {
  return state.movements.find((m) => m.id === id) || null;
}
function daysWithMovements() {
  return [...new Set(state.movements.map((m) => dayKey(m.at)))].sort().reverse();
}
