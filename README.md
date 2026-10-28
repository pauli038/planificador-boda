# Planificador de Boda 💍

App web para planear la boda desde el teléfono. Es un solo archivo (`index.html`), sin servidor ni base de datos.

## Secciones

- **Inicio**: cuenta regresiva, confirmados, gasto previsto vs pagado, avance de tareas y próximos pendientes.
- **Invitados**: invitaciones con acompañantes, de quién son (novia / novio / ambos), mesa, teléfono, notas y RSVP (pendiente / confirmado / no asiste). Búsqueda y filtros.
- **Presupuesto**: gastos por categoría con estimado, costo real y pagado; compara contra tu meta total.
- **Tareas**: checklist por etapa (12+ meses antes … después de la boda), con fecha límite y responsable. Incluye un checklist sugerido de 33 tareas.
- **Proveedores**: contacto, servicio, cotización y estado (cotizando / apartado / contratado / descartado).

Los datos se guardan en el navegador del dispositivo (`localStorage`).

## Usarla en el teléfono

1. En GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root** → Save.
2. Abre la URL que te da (`https://<usuario>.github.io/planificador-boda/`) en el teléfono.
3. Menú del navegador → **Agregar a pantalla de inicio** para tenerla como app.

> Nota: GitHub Pages en repos privados requiere un plan de pago; si tu cuenta es gratis, haz el repo público o usa Netlify / Vercel / Cloudflare Pages (arrastra la carpeta y listo).

## Correr en local

Abre `index.html` en el navegador, o:

```bash
npx serve .
```
