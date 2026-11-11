import assert from "node:assert/strict";
import { calculateClosure } from "../src/reconciliation.js";

const base = { net_sales: 1000000, returns: 0, cash_sales: 500000, electronic_sales: 300000, credit_sales: 200000,
  credit_collections: 100000, other_income: 50000, expenses: 20000, purchases: 0, supplier_payments: 80000,
  refunds: 0, internal_transfers: 0, base_initial: 100000, cash_counted: 650000, base_next: 100000 };

assert.equal(calculateClosure(base).expected_cash, 650000);
assert.equal(calculateClosure(base).cash_difference, 0);
assert.equal(calculateClosure(base).sales_difference, 0);
assert.equal(calculateClosure({ ...base, electronic_sales: 400000 }).expected_cash, 650000);
assert.equal(calculateClosure({ ...base, credit_collections: 150000, cash_counted: 700000 }).expected_cash, 700000);
assert.equal(calculateClosure({ ...base, purchases: 100000, supplier_payments: 0 }).expected_cash, 630000);
assert.equal(calculateClosure({ ...base, cash_counted: 640000 }).cash_difference, -10000);
assert.equal(calculateClosure({ ...base, cash_counted: 660000 }).cash_difference, 10000);
assert.equal(calculateClosure({ ...base, net_sales: 0, returns: 0, cash_sales: undefined, electronic_sales: undefined, credit_sales: undefined }).status, "warning_machine_breakdown_required");
assert.throws(() => calculateClosure({ ...base, cash_counted: undefined }), /required/);
console.log("PASS: reconciliation contract");
