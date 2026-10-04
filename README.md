# 🚌 Horarios Pullman Lago Peñuelas

Dashboard personal para ver los horarios de la ruta costera San Antonio ↔ Valparaíso (via El Quisco, El Tabo, Cartagena, Algarrobo).

Los horarios se obtienen automáticamente de las imágenes publicadas en el Facebook de la línea usando IA (Gemini Vision), ya que no están disponibles en ninguna API pública.

---

## 🏗️ Stack Tecnológico

- **Framework:** Next.js 16 (TypeScript)
- **Hosting:** Vercel (Free Tier)
- **Base de datos:** Vercel Postgres o Supabase
- **Scraping:** Apify (Facebook scraper)
- **IA:** Google Gemini 1.5 Flash (extracción de horarios desde imágenes)
- **Estilos:** Tailwind CSS (Dark Mode)

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
| `APIFY_API_TOKEN` | [Apify Console](https://console.apify.com/) → Settings → API tokens |
| `CRON_SECRET` | Cualquier string aleatorio largo (ej. usa `openssl rand -base64 32`) |

### 3. Inicializar la base de datos
Después del primer deploy, abre en el navegador:
```
https://tu-dashboard.vercel.app/api/setup
```
Esto creará la tabla `schedules` en la base de datos.

### 4. Configurar Apify
1. Crea una cuenta gratuita en [Apify](https://apify.com)
2. Busca el actor **"Facebook Posts Scraper"** en el Apify Store
3. Copia tu API token desde Settings → API tokens
4. El actor correcto que usa este proyecto es `apify/facebook-posts-scraper`

   > **Nota:** Si el nombre del actor no funciona, actualiza `src/lib/apify.ts` con el ID exacto del actor que encuentres en Apify Store.

### 5. Verificar el cron job manualmente
Puedes disparar el pipeline manualmente haciendo:
```bash
curl -H "Authorization: Bearer TU_CRON_SECRET" https://tu-dashboard.vercel.app/api/cron
```

El cron se ejecuta automáticamente todos los días a las **8:00 AM UTC** (5:00 AM hora Chile).

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

> Para pruebas locales sin DB, la página mostrará un mensaje de "No hay horarios guardados". Configura una DB local de Postgres o usa una de Supabase para pruebas completas.

---

## 📁 Estructura del proyecto

```
src/
├── app/
│   ├── page.tsx           # Dashboard principal
│   ├── layout.tsx         # Layout HTML
│   ├── globals.css        # Estilos globales
│   └── api/
│       ├── cron/route.ts  # Pipeline: Apify → Gemini → DB
│       └── setup/route.ts # Inicialización de tabla en DB
└── lib/
    ├── db.ts              # Conexión a Postgres
    ├── ai.ts              # Extracción con Gemini Vision
    └── apify.ts           # Scraping de Facebook con Apify
```
