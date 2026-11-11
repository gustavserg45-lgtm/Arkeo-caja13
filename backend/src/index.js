import { calculateClosure, isCop } from "./reconciliation.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

function validMovement(input) {
  return input && typeof input.business_id === "string" && input.business_id.length > 0 &&
    typeof input.shift_id === "string" && input.shift_id.length > 0 &&
    typeof input.cashier_id === "string" && input.cashier_id.length > 0 &&
    (input.direction === "in" || input.direction === "out") &&
    typeof input.category === "string" && input.category.length > 0 &&
    Number.isSafeInteger(input.amount_cop) && input.amount_cop > 0 &&
    Number.isSafeInteger(input.cash_amount_cop ?? 0) && input.cash_amount_cop >= 0 && input.cash_amount_cop <= input.amount_cop &&
    typeof input.idempotency_key === "string" && /^[A-Za-z0-9._:-]{8,128}$/.test(input.idempotency_key);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") return json({ ok: true, service: "arkeocaja-api" });
    if (request.method === "POST" && url.pathname === "/api/shift-closures") return createClosure(request, env);
    if (request.method !== "POST" || url.pathname !== "/api/movements") return json({ error: "not_found" }, 404);
    let input;
    try { input = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
    if (!validMovement(input)) return json({ error: "invalid_movement" }, 422);
    if (!env?.DB) return json({ error: "database_not_configured" }, 503);
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(`INSERT INTO movements
        (id,business_id,shift_id,cashier_id,direction,category,amount_cop,cash_amount_cop,idempotency_key)
        VALUES (?,?,?,?,?,?,?,?,?)`).bind(id, input.business_id, input.shift_id, input.cashier_id, input.direction,
        input.category, input.amount_cop, input.cash_amount_cop ?? 0, input.idempotency_key).run();
    } catch (error) {
      if (String(error?.message || error).toLowerCase().includes("unique")) return json({ error: "idempotency_conflict" }, 409);
      return json({ error: "movement_not_created" }, 500);
    }
    return json({ id, status: "pending" }, 201);
  }
};

async function createClosure(request, env) {
  let input;
  try { input = await request.json(); } catch { return json({ error: "invalid_json" }, 400); }
  if (!env?.DB) return json({ error: "database_not_configured" }, 503);
  if (!input?.business_id || !input?.shift_id || !input?.cashier_id || !input?.idempotency_key ||
      !/^[A-Za-z0-9._:-]{8,128}$/.test(input.idempotency_key)) return json({ error: "invalid_closure_identity" }, 422);
  let result;
  try { result = calculateClosure(input); } catch (error) { return json({ error: error.message }, 422); }
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`INSERT INTO shift_closures
      (id,business_id,shift_id,cashier_id,net_sales,returns,cash_sales,electronic_sales,credit_sales,credit_collections,other_income,expenses,purchases,supplier_payments,refunds,internal_transfers,base_initial,cash_counted,base_next,expected_cash,cash_difference,sales_difference,observations,status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, input.business_id, input.shift_id, input.cashier_id, input.net_sales, input.returns, input.cash_sales ?? null,
      input.electronic_sales ?? null, input.credit_sales ?? null, input.credit_collections, input.other_income, input.expenses,
      input.purchases, input.supplier_payments, input.refunds, input.internal_transfers ?? 0, input.base_initial, input.cash_counted,
      input.base_next, result.expected_cash, result.cash_difference, result.sales_difference, input.observations ?? null, result.status
    ).run();
  } catch (error) {
    if (String(error?.message || error).toLowerCase().includes("unique")) return json({ error: "closure_already_exists" }, 409);
    return json({ error: "closure_not_created" }, 500);
  }
  return json({ id, ...result }, 201);
}

export { validMovement, createClosure };
