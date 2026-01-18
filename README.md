# EvaSystem

Plataforma de gestión de embajadores de marca e integración con Instagram desarrollada para **Evaconcept**.

## Descripción

EvaSystem permite a organizaciones:

- **Gestionar embajadores de marca**: registro, seguimiento y análisis de rendimiento
- **Integración con Instagram**: conexión OAuth, sincronización de stories y detección automática de menciones
- **Analíticas**: métricas de engagement, alcance e impresiones de stories
- **Gestión de eventos y fiestas**: organización de eventos con asignación de tareas a embajadores

## Tech Stack

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 18, Vite, TypeScript |
| Estilos | Tailwind CSS, shadcn/ui |
| Estado | TanStack React Query |
| Backend | Supabase (PostgreSQL + Edge Functions + Auth) |
| APIs externas | Instagram Graph API v24.0, Meta OAuth |

## Requisitos previos

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Cuenta de Supabase con proyecto configurado

## Instalación

```bash
# Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd evasystem

# Instalar dependencias
pnpm install
```

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Desarrollo

```bash
# Iniciar servidor de desarrollo
pnpm run dev

# El servidor estará disponible en http://localhost:5173
```

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm run dev` | Inicia el servidor de desarrollo |
| `pnpm run build` | Genera build de producción |
| `pnpm run preview` | Previsualiza el build de producción |
| `pnpm run lint` | Ejecuta ESLint |
| `pnpm run lint:fix` | Corrige errores de ESLint automáticamente |
| `pnpm run format` | Formatea el código con Prettier |
| `pnpm run typecheck` | Verifica tipos de TypeScript |
| `pnpm run test` | Ejecuta tests en modo watch |
| `pnpm run test:run` | Ejecuta tests una vez |

## Supabase (Edge Functions)

Para desarrollo local de Edge Functions:

```bash
# Iniciar Supabase localmente
supabase start

# Servir funciones en modo desarrollo
supabase functions serve

# Aplicar migraciones
supabase db push

# Regenerar tipos de TypeScript
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Estructura del proyecto

```
evasystem/
├── src/
│   ├── components/     # Componentes React
│   ├── pages/          # Páginas de la aplicación
│   ├── hooks/          # Custom hooks
│   ├── services/       # Capa de servicios API
│   ├── types/          # Tipos TypeScript
│   └── constants/      # Constantes centralizadas
├── supabase/
│   ├── functions/      # Edge Functions (Deno)
│   └── migrations/     # Migraciones SQL
└── n8n-workflows/      # Workflows de automatización
```
