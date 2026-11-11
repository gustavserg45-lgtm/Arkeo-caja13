# Publicar Arqueo Express en GitHub Pages

Repositorio: https://github.com/gustavserg45-lgtm/Arkeo-caja13

## Estado verificado el 11 de noviembre de 2026

- Repositorio público con la aplicación completa en `main`.
- Despliegue automatizado preparado en `.github/workflows/deploy-pages.yml`.
- El primer despliegue falló al ejecutar `actions/configure-pages` porque **GitHub Pages todavía no está habilitado** para este repositorio. No es un error del código de Arqueo Express.
- Registro del intento: https://github.com/gustavserg45-lgtm/Arkeo-caja13/actions/runs/42974394944

## Habilitar la publicación (acción del propietario)

1. Abre https://github.com/gustavserg45-lgtm/Arkeo-caja13/settings/pages
2. En **Build and deployment → Source**, selecciona **GitHub Actions** (NO "Deploy from a branch").
3. Abre https://github.com/gustavserg45-lgtm/Arkeo-caja13/actions/workflows/deploy-pages.yml
4. Selecciona **Run workflow → Branch: main → Run workflow**. Alternativamente, vuelve a ejecutar el flujo fallido.
5. Comprueba el resultado del flujo. Si está en verde, abre https://gustavserg45-lgtm.github.io/Arkeo-caja13/

No necesitas compilar manualmente: el flujo sube `index.html`, `app.js`, hojas CSS y recursos PWA a GitHub Pages automáticamente cada vez que cambia `main`.

## Advertencias

- Los movimientos se almacenan únicamente en el navegador, por dispositivo; no existe sincronización entre cajeros.
- La aplicación no transfiere dinero ni emite facturación electrónica de la DIAN.
- No subas respaldos, clientes ni datos financieros reales al repositorio público.
- Exporta respaldos JSON periódicamente desde Configuración.
