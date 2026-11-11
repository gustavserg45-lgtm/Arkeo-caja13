# Publicar Arqueo Express en GitHub Pages

Repositorio: https://github.com/gustavserg45-lgtm/Arkeo-caja13

## Antes de publicar
El repositorio está configurado como **privado**. Con GitHub Free, Pages requiere que el repositorio sea **público**. El cambio de visibilidad revela el código fuente y el historial del repositorio; revisa que no haya datos privados antes de hacerlo.

## Pasos
1. Abre https://github.com/gustavserg45-lgtm/Arkeo-caja13/settings
2. En **General → Danger Zone → Change repository visibility**, cambia a **Public** si quieres usar GitHub Pages con plan gratuito.
3. Abre https://github.com/gustavserg45-lgtm/Arkeo-caja13/settings/pages
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona **main** y **/(root)**. Guarda.
6. Cuando GitHub termine de publicar, abre:
   https://gustavserg45-lgtm.github.io/Arkeo-caja13/

No necesitas instalar Node.js ni ejecutar compilaciones: `index.html` y todos sus recursos están en la raíz de `main`.

### Seguridad y funcionamiento
- Cada navegador mantiene su propia información en almacenamiento local. No hay sincronización entre cajeros ni dispositivos.
- La app solo registra medios de pago; no transfiere dinero ni emite facturas DIAN.
- No guardes datos de clientes ni respaldos financieros en el repositorio público.
- Haz respaldos JSON desde la aplicación antes de borrar datos del navegador.
