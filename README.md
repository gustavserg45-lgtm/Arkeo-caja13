# Arqueo Express — v1.1 · Modo cajero (Colombia)

Microaplicación PWA para abrir la caja, contar monedas y billetes colombianos, registrar ventas/compras, abonos a clientes/proveedores, gastos, adelantos y nómina, y realizar el cierre de turno. Diseño responsivo para teléfono, tableta y computador. No requiere backend ni suscripción.

## Ver en GitHub Pages

Consulta [COMO-PUBLICAR.md](COMO-PUBLICAR.md) para publicar gratis desde un repositorio **público** con `main` y `/ (root)`. En GitHub Pages no hace falta instalar dependencias ni ejecutar compilaciones. Los cambios al código aparecen después del siguiente despliegue, no mientras se está editando.

## Cómo abrirla

- **Prueba rápida (PC):** descomprime el ZIP y abre `index.html` con Chrome o Edge.
- **Servidor local de desarrollo:** dentro de la carpeta, ejecuta `python -m http.server 8000` y visita `http://localhost:8000`.
- **Publicación gratuita:** sube los archivos a GitHub Pages o Cloudflare Pages para abrirla desde móviles e instalarla como PWA. La instalación y funcionamiento offline requieren HTTPS o localhost y haber visitado primero la aplicación.

**No elimines el almacenamiento de tu navegador:** los datos se guardan localmente en ese dispositivo. En Configuración puedes exportar un respaldo JSON; hazlo con frecuencia.

## Nuevo en v1.1

1. Apertura guiada en COP: indica nombre del cajero y **cantidades de billetes/monedas**. El total se calcula y se almacena automáticamente.
2. Monedas: **$20, $50, $100, $200, $500 y $1.000**. Billetes: **$1.000, $2.000, $5.000, $10.000, $20.000, $50.000 y $100.000**. El billete antiguo de $1.000 se cuenta separado de la moneda de $1.000.
3. Botones **+** y **−**, teclado numérico, subtotales por denominación, total de piezas, total en COP y confirmación del monto antes de abrir.
4. El turno conserva `baseDenominations` (cantidad por denominación) y permite volver a ver el detalle de apertura.
5. Arqueo de cierre por cantidades de monedas y billetes, cálculo automático de contado, sobrante/faltante y retiro. El cierre guarda `countedDenominations`.
6. Rediseño de panel de cajero: efectivo esperado destacado, acciones prioritarias de cobro/salida, accesos a otras operaciones y navegación inferior móvil.
7. Corrección de la acción rápida de cobro/venta (antes no cambiaba de pantalla cuando coexistían `data-tab` y `data-action`).
8. Se mantiene la compatibilidad de los registros locales v1.0; los turnos anteriores sin desglose siguen siendo visibles.

## Flujo para un cajero

1. **Caja → Abrir caja:** introduce el responsable; cuenta los billetes y monedas y confirma el total. Una base de $0 está permitida si la gaveta está vacía.
2. **Cobrar → Venta:** registra valor, cliente, medios de pago (efectivo, Nequi, Daviplata, transferencia, tarjeta, etc.). Puedes usar métodos mixtos.
3. **Cartera:** si la venta queda a crédito, se registra la deuda sin crear una entrada ficticia. Los abonos futuros sí registran el ingreso real.
4. **Cobrar → Compra, Otros movimientos, Anticipo nómina, Pago nómina:** registra compras, gastos, egresos, pagos a proveedores y adelantos.
5. **Caja → Contar y cerrar:** cuenta el efectivo disponible, fija la base que se queda para el siguiente turno y confirma. Guarda el cierre e imprímelo como soporte interno.
6. **Configuración → Respaldo:** exporta el archivo JSON para prevenir pérdidas.

## Reglas financieras

- Efectivo esperado = **base de apertura + entradas en efectivo − salidas en efectivo**.
- Pagos por transferencia, QR, tarjeta y billeteras NO alteran el efectivo físico en la gaveta.
- Diferencia del arqueo = **efectivo contado − efectivo esperado**.
- Retiro físico al cierre = **efectivo contado − base que se deja**. El retiro de cierre no se registra como gasto.
- Las facturas internas por cobrar/pagar y sus abonos están vinculadas; un documento a crédito no afecta la caja hasta que se registra un pago.
- Un adelanto de nómina se registra como salida real; cuando se descuenta en la liquidación, no se paga por segunda vez.

## Límites del MVP

- Los datos viven **en el navegador/dispositivo**, sin sincronización entre cajeros, cajas o equipos, sin autenticación ni conexión bancaria. No utilizar para información personal sensible sin medidas adicionales.
- Los documentos son **comprobantes internos**; NO son facturación electrónica DIAN ni reemplazan la contabilidad oficial, nómina electrónica ni su normativa.
- Montos en pesos enteros (COP). Las monedas antiguas de $5 y $10 no tienen contador en esta versión; si se usan en tu operación, habría que agregarlas.
- El cierre permite guardar una base para el siguiente turno en COP, pero todavía no selecciona exactamente qué piezas físicas componen esa base.
- Para desarrollo real/producción, validar políticas de seguridad, respaldos, manejo de sesiones y conciliación bancaria antes de depender de ella como sistema oficial.

## Archivos

- `index.html` — entrada de la app.
- `app.js` — registros y lógica de negocio, formularios y cálculos.
- `styles.css` — estilos generales existentes.
- `cashier.css` — rediseño v1.1.
- `icon.svg`, `manifest.webmanifest`, `sw.js` — PWA.
- `PRUEBAS.md` — verificación funcional.

Dependencias externas: ninguna. Licencia: uso y modificación privada/comercial permitidos por el creador del paquete.
