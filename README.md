# 🚌 Horarios Pullman Lago Peñuelas

Dashboard personal para buscar los horarios de bus de la ruta costera **Cartagena → El Tabo → El Quisco → Valparaíso**.

Seleccionas a qué hora necesitas llegar a Valparaíso cada día (Lunes a Viernes), y el sistema te recomienda el mejor bus.

Los horarios se obtienen automáticamente de las imágenes publicadas en el Facebook de la línea usando IA (Gemini Vision), ya que no están disponibles en ninguna API pública.

---

## 🏗️ Stack Tecnológico

- **Framework:** Next.js 16 (TypeScript)
- **Hosting:** Vercel (Free Tier)
- **Base de datos:** Vercel Postgres
- **Scraping:** Apify (Facebook Posts Scraper)
- **IA:** Google Gemini 2.0 Flash (extracción de horarios desde imágenes)
- **Estilos:** Tailwind CSS (Dark Mode)

---

## 🔄 Flujo de Funcionamiento

1. **Cron Job (domingo 22:00 UTC)** o botón manual → Apify scrapea Facebook
2. Se busca la publicación de la **semana actual** (por fecha en el texto del post)
3. Cada imagen del post se procesa con **Gemini Vision** → extrae solo buses de ruta costera
4. Los horarios se guardan en la tabla `weekly_schedules` en PostgreSQL
5. El usuario selecciona su **hora de llegada deseada** por día → consulta rápida a la DB
6. El sistema recomienda el bus más conveniente

---

## 🚀 Despliegue en Vercel (paso a paso)

### 1. Crear la base de datos
1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Crea un nuevo proyecto desde este repositorio
3. En el dashboard de Vercel, ve a **Storage** → **Create Database** → **Postgres**
4. Copia las variables de entorno que te da Vercel (POSTGRES_URL, etc.)

### 2. Configurar variables de entorno en Vercel
En tu proyecto de Vercel, ve a **Settings** → **Environment Variables** y agrega:

| Variable | Dónde obtenerla |
|---|---|
| `POSTGRES_URL` | Vercel Postgres dashboard |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) (gratuito) |
| `APIFY_API_TOKEN` (o `APIFY_API_KEY`) | [Apify Console](https://console.apify.com/) → Settings → API tokens |
| `CRON_SECRET` | Cualquier string aleatorio largo (ej. usa `openssl rand -base64 32`) |

### 3. Inicializar la base de datos
Después del primer deploy, abre en el navegador:
```
https://tu-dashboard.vercel.app/api/setup
```
Esto creará la tabla `weekly_schedules` en la base de datos.

### 4. Configurar Apify
1. Crea una cuenta gratuita en [Apify](https://apify.com)
2. Busca el actor **"Facebook Posts Scraper"** en el Apify Store
3. Copia tu API token desde Settings → API tokens
4. El actor correcto que usa este proyecto es `apify/facebook-posts-scraper`

   > **Nota:** Si el nombre del actor no funciona, actualiza `src/lib/apify.ts` con el ID exacto del actor que encuentres en Apify Store.

### 5. Cargar horarios por primera vez
Desde el dashboard, presiona el botón **"Actualizar desde Facebook"** para ejecutar el pipeline manualmente.

También puedes dispararlo via API:
```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" https://tu-dashboard.vercel.app/api/cron
```

El cron se ejecuta automáticamente cada **domingo a las 22:00 UTC** (19:00 hora Chile).

---

## 📡 API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/search` | Todos los horarios de la semana |
| `GET` | `/api/search?day=Lunes&arrival_hour=09:00` | Horarios del día + bus recomendado |
| `POST` | `/api/refresh` | Ejecutar pipeline manualmente |
| `GET` | `/api/cron` | Llamado por Vercel Cron (requiere auth) |
| `GET` | `/api/setup` | Crear/reinicializar tablas en la DB |

---

## 💻 Desarrollo local

```bash
# Instalar dependencias
npm install

# Copiar y rellenar las variables de entorno
cp .env.local.example .env.local
# (edita .env.local con tus claves reales)

# Iniciar el servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

> Para pruebas locales sin DB, la página mostrará un mensaje pidiendo actualizar desde Facebook. Configura una DB local de Postgres o usa Vercel Postgres para pruebas completas.

---

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx              # Dashboard principal
│   ├── layout.tsx            # Layout HTML
│   ├── globals.css           # Estilos globales
│   └── api/
│       ├── search/route.ts   # Búsqueda de horarios por día/hora
│       ├── refresh/route.ts  # Trigger manual del pipeline
│       ├── cron/route.ts     # Pipeline automático (Vercel Cron)
│       └── setup/route.ts    # Inicialización de tabla en DB
├── components/
│   └── ScheduleSearch.tsx    # Componente interactivo de búsqueda
└── lib/
    ├── db.ts                 # Conexión a Postgres + esquema
    ├── ai.ts                 # Extracción con Gemini Vision
    ├── apify.ts              # Scraping de Facebook con Apify
    └── pipeline.ts           # Orquestador: scrape → IA → DB
```
