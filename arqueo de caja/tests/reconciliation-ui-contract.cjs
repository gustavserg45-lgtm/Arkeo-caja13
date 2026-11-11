/* Contrato P0 de cierre: prueba sin DOM ni dependencias externas. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { calculateCashReconciliation } = require('../reconciliation.js');

const html = fs.readFileSync('index.html', 'utf8');
const cashier = fs.readFileSync('cashier-v2.js', 'utf8');
const css = fs.readFileSync('cashier-v2.css', 'utf8');

assert.match(html, /reconciliation\.js/, 'index.html debe cargar la utilidad de conciliación');
for (const label of [
  'Base inicial',
  'Ventas en efectivo',
  'Cobros de créditos anteriores',
  'Otros ingresos',
  'Gastos',
  'Compras',
  'Pagos a proveedores',
  'Medios electrónicos separados',
  'Base para el próximo turno (COP)',
]) {
  assert.match(cashier, new RegExp(label.replace(/[()]/g, '\\$&')), `Falta la fila de cierre: ${label}`);
}
for (const selector of ['.v2-close-breakdown', '.v2-close-electronic', '.v2-sync-status']) {
  assert.match(css, new RegExp(selector.replace('.', '\\.')), `Falta estilo del componente ${selector}`);
}

const result = calculateCashReconciliation({
  base_initial: 100000,
  cash_sales: 500000,
  credit_collections: 100000,
  other_income: 50000,
  expenses: 80000,
  purchases: 150000,
  supplier_payments: 90000,
  refunds: 0,
  internal_transfers: 0,
  cash_counted: 430000,
});
assert.deepEqual(result, { expected_cash: 430000, cash_difference: 0 });

console.log('PASS: contrato de UI y cálculo de conciliación del cierre');
