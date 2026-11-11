# Pruebas de Arqueo Express v1.1

Verificado el 11 de noviembre de 2026 en pruebas automatizadas de lógica (Node.js) y navegador Chromium, usando HTML/CSS/JS locales con almacenamiento simulado.

| Comprobación | Resultado |
| --- | --- |
| Abrir por 2 billetes de $20.000, 3 monedas de $1.000 y 1 billete de $1.000 | **PASS** · $44.000 |
| Distinguir moneda de $1.000 y billete de $1.000 | **PASS** · claves separadas |
| Mostrar el turno recién abierto en el panel del cajero | **PASS** |
| Acción rápida «Cobrar venta» abre formulario | **PASS** · corregida |
| Venta por $100.000 con pago parcial en efectivo por $20.000 | **PASS** · $80.000 por cobrar |
| Abono de cliente por $10.000 | **PASS** · saldo $70.000 |
| Cierre contado por $74.000, esperado $74.000 | **PASS** · diferencia $0 |
| Base dejada $30.000 y retiro de cierre $44.000 | **PASS** |
| Guardar desglose de apertura y cierre por denominaciones | **PASS** |
| Efectivo esperado no suma pagos Nequi | **PASS** (prueba de lógica) |
| Rechazar cantidades negativas | **PASS** (prueba de lógica) |
| Interfaces renderizadas en móvil y escritorio | **PASS** |
| Errores JavaScript del navegador durante el flujo probado | **0** |

La prueba de navegador se ejecutó mediante inyección local de HTML/CSS/JS porque este entorno no permite navegar a HTTP/file desde Chromium. No equivale a una auditoría de seguridad, fiscal, de accesibilidad, ni a pruebas en hardware de caja real.

**Pruebas pendientes antes de uso diario:** almacenamiento local real tras recargas y reinicios, modo PWA en Android, restauración de respaldos, reversos, impresión, monedas menos frecuentes, operación offline, errores de red y validación con usuarios cajeros.
