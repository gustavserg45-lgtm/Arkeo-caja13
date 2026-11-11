const FIELDS = [
  "net_sales", "returns", "cash_sales", "electronic_sales", "credit_sales",
  "credit_collections", "other_income", "expenses", "purchases",
  "supplier_payments", "refunds", "internal_transfers", "base_initial",
  "cash_counted", "base_next"
];

const isCop = (value) => Number.isSafeInteger(value) && value >= 0;

export function calculateClosure(input) {
  if (!input || !isCop(input.base_initial) || !isCop(input.cash_counted) || !isCop(input.base_next)) {
    throw new Error("base_initial_cash_counted_base_next_required");
  }
  for (const field of FIELDS.filter((field) => !["base_initial", "cash_counted", "base_next"].includes(field))) {
    if (!isCop(input[field] ?? 0)) throw new Error(`invalid_${field}`);
  }
  const hasSalesBreakdown = ["cash_sales", "electronic_sales", "credit_sales"].every((field) => Number.isSafeInteger(input[field]));
  const expectedCash = input.base_initial + (input.cash_sales ?? 0) + input.credit_collections + input.other_income
    - input.expenses - input.purchases - input.supplier_payments - input.refunds + (input.internal_transfers ?? 0);
  const netSales = input.net_sales - input.returns;
  const salesBreakdownTotal = (input.cash_sales ?? 0) + (input.electronic_sales ?? 0) + (input.credit_sales ?? 0);
  return {
    expected_cash: expectedCash,
    cash_difference: input.cash_counted - expectedCash,
    sales_difference: hasSalesBreakdown ? netSales - salesBreakdownTotal : null,
    status: hasSalesBreakdown ? "reconciled" : "warning_machine_breakdown_required",
    machine_reconciliation: hasSalesBreakdown ? "available" : "not_automatically_reconcilable"
  };
}

export { isCop };
