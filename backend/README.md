# Arkeo Express — Backend Foundation

Primer lote seguro para Cloudflare Workers + D1. No despliega recursos, no contiene credenciales y no reemplaza el almacenamiento local existente.

## Estructura

- `src/index.js`: Worker mínimo con `GET /health` y `POST /api/movements`.
- `migrations/0001_foundation.sql`: esquema financiero inicial.
- `migrations/0002_shift_closures.sql`: reportes de máquina y cierres deterministas.
- `tests/foundation-contract.cjs`: contrato reproducible con Node integrado.
- `tests/reconciliation-contract.mjs`: contrato de conciliación de efectivo y ventas.
- `wrangler.jsonc`: configuración declarativa; el `database_id` es un marcador intencional.

## Contrato de movimientos

El endpoint acepta JSON con `business_id`, `shift_id`, `cashier_id`, `direction` (`in|out`), `category`, `amount_cop`, `cash_amount_cop` e `idempotency_key` (8–128 caracteres seguros). Devuelve solo `id` y estado; no expone datos financieros. La clave es única por empresa. COP se almacena como entero, nunca como decimal.

## Decisiones e invariantes

## Conciliación real de caja

El cierre usa importes COP enteros y exige `base_initial`, `cash_counted` y `base_next`.

```text
expected_cash = base_initial
  + cash_sales
  + credit_collections
  + other_income
  - expenses
  - purchases
  - supplier_payments
  - refunds
  + internal_transfers
cash_difference = cash_counted - expected_cash
```

`electronic_sales` y `credit_sales` no afectan el efectivo de la gaveta. Un abono de crédito anterior sí afecta `credit_collections` si fue recibido en efectivo, pero no aumenta `net_sales`. Una compra a crédito sin pago no se registra en `purchases` del cierre y no afecta efectivo.

El endpoint `POST /api/shift-closures` calcula y persiste el cierre. Si el reporte de máquina no trae desglose de efectivo, electrónico y crédito, devuelve estado `warning_machine_breakdown_required` y `sales_difference: null`: el total neto por sí solo no permite conciliar automáticamente el efectivo.

- Un movimiento confirmado no se borra; los reversos se relacionan en `reversals`.
- `cash_amount_cop` no puede superar `amount_cop`: solo esa parte afecta efectivo.
- `payment_parts` permite pagos mixtos.
- Fotos y firmas se modelan como metadatos en D1; los objetos deberán ir a R2 con URLs privadas/firma temporal en un lote posterior.
- La migración no crea usuarios, empresas ni una base remota: eso evita tocar datos o credenciales.
- La autenticación, autorización por caja, transacciones de pagos mixtos, validación de turno y auditoría de cada escritura requieren el siguiente lote antes de producción.

## Límites Free verificados

La documentación oficial consultada el 11-11-2026 indica Workers Free: 100.000 solicitudes/día y 10 ms CPU por invocación; D1 Free: 5 millones de filas leídas/día, 100.000 filas escritas/día y 5 GB de almacenamiento. Desde septiembre de 2026, al exceder las cuotas diarias, las consultas D1 fallan hasta el reinicio UTC. 500 transacciones/día es compatible como objetivo inicial, pero depende de cuántas filas escriba cada operación, índices, lecturas y archivos R2. Esto no prueba despliegue ni disponibilidad real.

## Pruebas sin instalar dependencias

Desde `backend/`:

```text
node tests/foundation-contract.cjs
node --check src/index.js
```

No se ejecutan builds, `wrangler deploy`, migraciones remotas ni comandos que modifiquen Cloudflare.
