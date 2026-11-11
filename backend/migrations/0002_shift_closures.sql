CREATE TABLE IF NOT EXISTS shift_closures (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  shift_id TEXT NOT NULL UNIQUE REFERENCES shifts(id),
  cashier_id TEXT NOT NULL REFERENCES users(id),
  net_sales INTEGER NOT NULL CHECK (net_sales >= 0), returns INTEGER NOT NULL CHECK (returns >= 0),
  cash_sales INTEGER, electronic_sales INTEGER, credit_sales INTEGER,
  credit_collections INTEGER NOT NULL CHECK (credit_collections >= 0), other_income INTEGER NOT NULL CHECK (other_income >= 0),
  expenses INTEGER NOT NULL CHECK (expenses >= 0), purchases INTEGER NOT NULL CHECK (purchases >= 0),
  supplier_payments INTEGER NOT NULL CHECK (supplier_payments >= 0), refunds INTEGER NOT NULL CHECK (refunds >= 0),
  internal_transfers INTEGER NOT NULL DEFAULT 0,
  base_initial INTEGER NOT NULL CHECK (base_initial >= 0), cash_counted INTEGER NOT NULL CHECK (cash_counted >= 0),
  base_next INTEGER NOT NULL CHECK (base_next >= 0), expected_cash INTEGER NOT NULL,
  cash_difference INTEGER NOT NULL, sales_difference INTEGER,
  observations TEXT, status TEXT NOT NULL CHECK (status IN ('reconciled','warning_machine_breakdown_required')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_shift_closures_business_created ON shift_closures(business_id, created_at);
