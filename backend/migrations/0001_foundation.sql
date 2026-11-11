PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS cash_registers (
  id TEXT PRIMARY KEY, branch_id TEXT NOT NULL REFERENCES branches(id), name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked','inactive')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), name TEXT NOT NULL,
  UNIQUE (business_id, name)
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id), role_id TEXT NOT NULL REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), branch_id TEXT NOT NULL REFERENCES branches(id),
  cash_register_id TEXT NOT NULL REFERENCES cash_registers(id), cashier_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('open','closing','closed','reopened')),
  opening_cash_cop INTEGER NOT NULL CHECK (opening_cash_cop >= 0), closing_cash_cop INTEGER,
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, closed_at TEXT
);
CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), shift_id TEXT NOT NULL REFERENCES shifts(id),
  cashier_id TEXT NOT NULL REFERENCES users(id), direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  category TEXT NOT NULL, counterparty_id TEXT, amount_cop INTEGER NOT NULL CHECK (amount_cop > 0),
  cash_amount_cop INTEGER NOT NULL DEFAULT 0 CHECK (cash_amount_cop >= 0 AND cash_amount_cop <= amount_cop),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','reversed')),
  idempotency_key TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (business_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS payment_parts (
  id TEXT PRIMARY KEY, movement_id TEXT NOT NULL REFERENCES movements(id), method TEXT NOT NULL,
  amount_cop INTEGER NOT NULL CHECK (amount_cop > 0), reference TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS credit_documents (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), document_type TEXT NOT NULL CHECK (document_type IN ('receivable','payable')),
  counterparty_id TEXT NOT NULL, document_number TEXT NOT NULL, total_cop INTEGER NOT NULL CHECK (total_cop > 0),
  paid_cop INTEGER NOT NULL DEFAULT 0 CHECK (paid_cop >= 0 AND paid_cop <= total_cop), status TEXT NOT NULL DEFAULT 'pending',
  due_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (business_id, document_type, document_number)
);
CREATE TABLE IF NOT EXISTS allocations (
  id TEXT PRIMARY KEY, movement_id TEXT NOT NULL REFERENCES movements(id), credit_document_id TEXT NOT NULL REFERENCES credit_documents(id),
  amount_cop INTEGER NOT NULL CHECK (amount_cop > 0), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (movement_id, credit_document_id)
);
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY, movement_id TEXT NOT NULL REFERENCES movements(id), receipt_number TEXT NOT NULL,
  receipt_type TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (receipt_number)
);
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY, movement_id TEXT REFERENCES movements(id), receipt_id TEXT REFERENCES receipts(id),
  object_key TEXT NOT NULL UNIQUE, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  sha256 TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY, movement_id TEXT NOT NULL REFERENCES movements(id), verifier_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')), notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reversals (
  id TEXT PRIMARY KEY, original_movement_id TEXT NOT NULL REFERENCES movements(id), reversal_movement_id TEXT NOT NULL REFERENCES movements(id),
  authorized_by TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (original_movement_id)
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), actor_id TEXT REFERENCES users(id),
  event_type TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sync_operations (
  id TEXT PRIMARY KEY, business_id TEXT NOT NULL REFERENCES businesses(id), operation_key TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('pending','synced','failed','conflict')),
  error_message TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE (business_id, operation_key)
);

CREATE INDEX IF NOT EXISTS idx_branches_business ON branches(business_id);
CREATE INDEX IF NOT EXISTS idx_registers_branch ON cash_registers(branch_id);
CREATE INDEX IF NOT EXISTS idx_shifts_register_status ON shifts(cash_register_id, status);
CREATE INDEX IF NOT EXISTS idx_movements_shift_created ON movements(shift_id, created_at);
CREATE INDEX IF NOT EXISTS idx_movements_business_status ON movements(business_id, status);
CREATE INDEX IF NOT EXISTS idx_parts_movement ON payment_parts(movement_id);
CREATE INDEX IF NOT EXISTS idx_credits_counterparty_status ON credit_documents(counterparty_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_entity_created ON audit_events(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_operations(business_id, status);
