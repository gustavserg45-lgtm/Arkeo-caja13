/*
 * Contrato puro compartido por la pantalla de cierre y sus pruebas.
 * Se expone como global porque la PWA usa scripts clásicos y también como
 * CommonJS para poder probarlo directamente con Node sin dependencias.
 */
(function exposeReconciliation(root, factory) {
  const api = factory();
  if (root) root.calculateCashReconciliation = api.calculateCashReconciliation;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createReconciliationApi() {
  function integer(value) {
    return Number.isSafeInteger(value) ? value : Math.round(Number(value) || 0);
  }

  function calculateCashReconciliation(input) {
    const expected_cash = integer(input.base_initial)
      + integer(input.cash_sales)
      + integer(input.credit_collections)
      + integer(input.other_income)
      - integer(input.expenses)
      - integer(input.purchases)
      - integer(input.supplier_payments)
      - integer(input.refunds)
      + integer(input.internal_transfers);
    return {
      expected_cash,
      cash_difference: integer(input.cash_counted) - expected_cash,
    };
  }

  return { calculateCashReconciliation };
});
