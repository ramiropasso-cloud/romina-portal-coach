# Panel de la coach — Romina Garino

Sitio estático (HTML + CSS + JS, sin build) que se conecta al **mismo**
proyecto de Supabase que `romina-portal-alumno`. Pensado para vivir en
un subdominio propio, ej. `coach.rominagarino.com`.

Cuatro pestañas, tema claro, siguiendo `design_handoff_romina_garino_app/`:

- **Hoy** (`hoy.html`) — métricas del día, alta rápida, quién necesita atención, actividad reciente.
- **Alumnos** (`alumnos.html`) — buscar/filtrar y abrir cualquier alumna.
- **Ficha** (`ficha.html?id=...`) — datos, plan asignado (con el día que le toca), registrar pago, cambiar plan, mensajes.
- **Cobros** (`cobros.html`) — avisos de pago pendientes de confirmar, recaudado del mes, cobrar por alumna.
- **Planes** (`planes.html`) — biblioteca en solo lectura (crear/editar planes sigue siendo por el pipeline de `romina-portal-alumno/claudeviaclaudecode/`).

## 1. Configuración

`app.js` ya tiene la misma `supabaseUrl` / `supabaseAnonKey` que el
portal del alumno (es el mismo proyecto). No hace falta tocar nada ahí.

El acceso al panel usa **la misma contraseña de administración**
(`admin_secret`) que ya protege el alta de alumnas y la carga de
planes en `romina-portal-alumno`. Si esa contraseña cambia, cambia acá
también automáticamente (es la misma tabla).

## 2. Ver el sitio en local

Abrí `index.html` con **Live Server** de VS Code. Sin `npm install` ni build.

## 3. Publicar

Mismo mecanismo que `romina-portal-alumno`: GitHub Pages + dominio
propio (`coach.rominagarino.com` → CNAME a `ramiropasso-cloud.github.io.`).

## Seguridad

Toda escritura pasa por funciones `admin_*` (security definer) que
validan la contraseña en cada llamada — no hay lectura directa de
tablas desde el navegador. La contraseña queda guardada en
`localStorage` del navegador de la coach tras el login; "Cerrar
sesión" la borra.

## Próximos pasos (no incluidos en esta base)

- **Editor de planificación**: hoy "Planes" es solo lectura. El
  editor visual por bloques del handoff (`design/Estudio RG - App de
  gestión.dc.html`) todavía no está construido — se sigue usando el
  pipeline markdown → Supabase.
- **Borrar/editar alumnas**: no hay botón para dar de baja ni editar
  nombre/teléfono desde el panel; se hace por SQL Editor si hace falta.
- **Notificaciones**: nada avisa proactivamente a la coach (todo es
  "entrar y mirar"). Push notifications quedan fuera del alcance de
  una PWA estática sin backend propio.
