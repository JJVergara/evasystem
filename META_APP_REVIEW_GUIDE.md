# Guía de Revisión de App de Meta - EVA System

## Resumen de la App

**EVA System** es una plataforma de gestión de embajadores de marca que permite a las organizaciones:
- Administrar y rankear embajadores según su desempeño en Instagram
- Rastrear menciones en Stories de Instagram
- Analizar métricas de alcance, engagement e impresiones
- Asignar tareas a embajadores y medir su cumplimiento
- Generar reportes analíticos de rendimiento

---

## Permisos Requeridos

### 1. `pages_show_list` (CRÍTICO - Necesita App Review)

**Por qué lo necesitamos:**
Para listar las Páginas de Facebook del usuario y detectar cuáles tienen cuentas de Instagram Business vinculadas.

**Cómo lo usamos:**
- Llamamos a `GET /me/accounts` para obtener la lista de páginas
- Para cada página, verificamos si tiene una cuenta de Instagram Business conectada
- Esto permite al usuario seleccionar qué cuenta de Instagram quiere conectar a su organización

**Texto para el formulario:**
> "EVA System necesita listar las Páginas de Facebook del usuario para identificar cuáles tienen cuentas de Instagram Business vinculadas. Esto es esencial para el proceso de conexión inicial, donde el administrador de la organización elige qué cuenta de Instagram usar para monitorear menciones y analizar el rendimiento de sus embajadores de marca."

---

### 2. `instagram_manage_insights` (CRÍTICO - Necesita App Review)

**Por qué lo necesitamos:**
Para obtener métricas de rendimiento de las Stories de Instagram (alcance, impresiones, respuestas, compartidos).

**Cómo lo usamos:**
- Obtenemos insights de Stories publicadas por embajadores
- Calculamos el alcance total de las campañas
- Medimos el engagement (respuestas, compartidos)
- Generamos rankings basados en métricas reales

**Texto para el formulario:**
> "EVA System es una plataforma de gestión de embajadores de marca. Necesitamos instagram_manage_insights para obtener métricas de rendimiento (alcance, impresiones, engagement) de las Stories donde nuestros embajadores mencionan la marca. Estos datos se usan para: (1) Calcular el alcance total de cada embajador, (2) Rankear embajadores según su desempeño real, (3) Generar reportes analíticos para las organizaciones, (4) Asignar puntos y categorías (Bronce/Plata/Oro/Diamante) basados en métricas verificables."

---

### 3. `pages_read_engagement` (RECOMENDADO)

**Por qué lo necesitamos:**
Para leer datos de engagement de las páginas de Facebook vinculadas.

**Texto para el formulario:**
> "Necesitamos leer métricas de engagement de las Páginas de Facebook para complementar nuestros análisis de rendimiento de embajadores y proporcionar reportes completos a las organizaciones."

---

### 4. `pages_manage_metadata` (RECOMENDADO)

**Por qué lo necesitamos:**
Para suscribir webhooks que nos notifiquen cuando un embajador menciona la marca en una Story.

**Texto para el formulario:**
> "Necesitamos pages_manage_metadata para configurar webhooks que nos notifiquen en tiempo real cuando embajadores mencionan la cuenta de Instagram de la organización en sus Stories. Esto es fundamental para el rastreo automático de menciones."

---

## Guía para Video de Demostración

### Video 1: `pages_show_list`

**Duración recomendada:** 60-90 segundos

**Guión del video:**

1. **Intro (5s):** "Este video muestra cómo EVA System usa pages_show_list"

2. **Ir a Configuración (10s):**
   - Navegar a `https://app.evasystem.cl/settings`
   - Hacer clic en la pestaña "Instagram"

3. **Conectar Instagram (15s):**
   - Mostrar el botón "Conectar Instagram"
   - Hacer clic en él
   - Mostrar la pantalla de autorización de Facebook

4. **Selección de páginas (20s):**
   - En la pantalla de Meta, mostrar la lista de páginas disponibles
   - Explicar: "Aquí el usuario ve sus páginas de Facebook. Selecciona las que tienen cuentas de Instagram Business vinculadas."

5. **Resultado (15s):**
   - Mostrar cómo la app detecta las cuentas de Instagram
   - Mostrar el panel de diagnóstico con las páginas encontradas

6. **Cierre (5s):** "Este permiso es necesario únicamente para el proceso de conexión inicial."

---

### Video 2: `instagram_manage_insights`

**Duración recomendada:** 90-120 segundos

**Guión del video:**

1. **Intro (5s):** "Este video muestra cómo EVA System usa instagram_manage_insights"

2. **Dashboard de Analíticas (20s):**
   - Navegar a `https://app.evasystem.cl/analytics` (o la ruta correcta)
   - Mostrar las métricas principales:
     - "Alcance Total" 
     - "Total Menciones"
     - "Tasa de Completitud"

3. **Ranking de Embajadores (20s):**
   - Mostrar el "Top 10 Embajadores"
   - Explicar: "Los embajadores se rankean según su alcance y engagement medido a través de instagram_manage_insights"

4. **Detalle de Embajador (25s):**
   - Hacer clic en "Ver" en un embajador
   - Mostrar las métricas:
     - Alcance Total
     - Engagement Promedio
     - Insights de Stories (total stories, alcance, impresiones, engagement)

5. **Menciones de Stories (20s):**
   - Navegar a la sección de "Menciones"
   - Mostrar una mención con sus métricas

6. **Cierre (10s):** "Estos insights nos permiten medir objetivamente el desempeño de cada embajador y generar rankings justos basados en datos reales."

---

## Pantallas a Capturar para Screenshots

Para cada permiso, Meta pide screenshots. Aquí están las pantallas relevantes:

### Para `pages_show_list`:
1. **Configuración > Instagram** - Botón "Conectar Instagram"
2. **Modal de diagnóstico** - Mostrando las páginas encontradas
3. **Estado de conexión** - Mostrando cuenta conectada

### Para `instagram_manage_insights`:
1. **Dashboard Analítico** - Métricas principales (Alcance, Menciones, etc.)
2. **Ranking de Embajadores** - Top 10 con puntos
3. **Detalle de Embajador** - Cards de métricas
4. **Insights de Stories** - Sección específica mostrando alcance/impresiones
5. **Distribución de Rendimiento** - Gráfico de pie (Cumple/Advertencia/No Cumple)

---

## Texto Completo para Formulario de App Review

### Descripción General de la App:

```
EVA System es una plataforma SaaS de gestión de embajadores de marca para empresas en Chile y Latinoamérica.

La plataforma permite a las organizaciones:
1. Registrar y gestionar embajadores de marca
2. Asignar tareas de contenido en Instagram (como publicar Stories con hashtags específicos)
3. Rastrear automáticamente cuando los embajadores mencionan la marca en sus Stories
4. Medir el alcance e impacto real de cada embajador usando métricas de Instagram
5. Rankear embajadores en categorías (Bronce, Plata, Oro, Diamante) según su desempeño
6. Generar reportes analíticos para las organizaciones

URL de la App: https://app.evasystem.cl
```

### Instrucciones de Prueba para el Revisor:

```
1. Visite https://app.evasystem.cl
2. Inicie sesión con las credenciales de prueba proporcionadas
3. Navegue a Configuración > Instagram para ver el proceso de conexión
4. Vaya a "Analíticas" para ver cómo se muestran las métricas de Instagram
5. En "Embajadores", haga clic en "Ver" para ver los insights individuales
6. En "Menciones", puede ver cómo se rastrean las menciones en Stories
```

---

## Checklist Pre-Envío

- [ ] Privacy Policy URL actualizada y accesible
- [ ] Terms of Service URL actualizados
- [ ] App Icon de alta calidad (1024x1024)
- [ ] Screenshots de todas las pantallas relevantes
- [ ] Videos de demostración para cada permiso
- [ ] Credenciales de prueba para el revisor
- [ ] Data Deletion URL configurada
- [ ] Business Verification completada (si aplica)

---

## URLs Requeridas

| Campo | URL |
|-------|-----|
| Privacy Policy | https://evasystem.cl/privacy |
| Terms of Service | https://evasystem.cl/terms |
| Data Deletion | https://app.evasystem.cl/data-deletion |
| App Website | https://evasystem.cl |

---

## Respuestas a Preguntas Frecuentes del Revisor

**P: ¿Por qué necesitan acceso a páginas de Facebook?**
R: Solo necesitamos listar las páginas para identificar cuáles tienen cuentas de Instagram Business vinculadas. No accedemos al contenido ni publicamos en las páginas.

**P: ¿Qué hacen con los datos de Instagram?**
R: Los datos se usan exclusivamente para calcular métricas de rendimiento de embajadores. No compartimos datos con terceros ni los usamos para publicidad.

**P: ¿Por qué necesitan insights en tiempo real?**
R: Para poder rankear embajadores de manera justa, necesitamos métricas actualizadas de su alcance y engagement.

---

## Notas Importantes

1. **Modo de App:** Asegúrate de que la app esté en modo "Activo" (no Development) para el review

2. **Permisos ya aprobados que tienes:**
   - ✅ instagram_business_basic
   - ✅ instagram_business_manage_messages
   - ✅ instagram_business_content_publish

3. **Permisos por solicitar:**
   - ⏳ pages_show_list (CRÍTICO)
   - ⏳ instagram_manage_insights (CRÍTICO)
   - ⏳ pages_read_engagement (RECOMENDADO)
   - ⏳ pages_manage_metadata (RECOMENDADO para webhooks)
