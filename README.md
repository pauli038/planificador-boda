# Planificador de Boda 💍

App para planear la boda desde el teléfono, compartida en pareja: los dos entran con la misma contraseña y ven los mismos datos.

## Secciones

- **Inicio**: cuenta regresiva, confirmados, gasto previsto vs pagado, avance de tareas y próximos pendientes.
- **Invitados**: invitaciones con acompañantes, de quién son (novia / novio / ambos), mesa, teléfono, notas y RSVP. Búsqueda y filtros.
- **Mesas**: crea varias mesas de una vez, sienta a los invitados con casillas y ve en cada mesa cuántos lugares quedan (avisa si una se pasa). Lista de quién falta por sentar.
- **Programa del día**: el minuto a minuto de la boda en línea de tiempo (incluye un programa típico para empezar). El día de la boda marca lo que está pasando y lo que sigue.
- **Luna de miel**: destino, fechas, noches y cuenta regresiva; pendientes del viaje (vuelos, hotel, documentos, maleta) con costo, folio y presupuesto.
- **Presupuesto**: gastos por categoría con estimado, costo real y pagado, contra tu meta total.
- **Tareas**: checklist por etapa con fecha límite y responsable; incluye 33 tareas sugeridas.
- **Proveedores**: contacto, servicio, cotización y estado (cotizando / apartado / contratado / descartado).

Se adapta al teléfono (pestañas abajo y menú "Más") y a la computadora (menú lateral y rejillas). Tiene tema claro, oscuro o automático (botón junto al engrane).

Los cambios de uno aparecen en el teléfono del otro en unos segundos (la app se sincroniza cada 8 s y al volver a abrirla).

## Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** con [`postgres`](https://github.com/porsager/postgres): funciona con Neon, Supabase o cualquier Postgres
- Sesión con cookie firmada (HMAC) y una contraseña compartida

La tabla se crea sola la primera vez que se usa; no hay migraciones manuales.

## Publicar en Vercel

1. Entra a [vercel.com/new](https://vercel.com/new) e importa el repo **planificador-boda** (Next.js se detecta solo) y dale **Deploy**.
2. En el proyecto: **Storage → Create Database → Neon (Postgres)** y conéctala al proyecto. Esto agrega `DATABASE_URL` automáticamente.
3. En **Settings → Environment Variables** agrega:
   - `APP_PASSWORD`: la contraseña que usarán tú y tu pareja.
   - `AUTH_SECRET`: un texto largo y aleatorio (por ejemplo, el resultado de `openssl rand -hex 32`).
4. **Deployments → ⋯ → Redeploy** para que tome las variables.
5. Abre `https://<tu-proyecto>.vercel.app` en los dos teléfonos y, en el menú del navegador, toca **Agregar a pantalla de inicio**.

> ¿Prefieres Supabase? Usa su cadena de conexión (*Session pooler*, puerto 5432) como `DATABASE_URL`.

## Correr en local

```bash
cp .env.example .env.local   # y llena los valores
npm install
npm run dev
```

Abre http://localhost:3000.
