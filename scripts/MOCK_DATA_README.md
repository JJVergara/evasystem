# Mock Instagram Data for Testing

Este directorio contiene scripts para crear datos mock de Instagram (usuarios/stories) para probar el sistema de Story Insights Cron.

## Scripts Disponibles

### `mock-instagram-data.ts` (Recomendado)
Script TypeScript que crea datos directamente en la base de datos usando el cliente de Supabase.

**Uso:**
```bash
# Crear organización, token y stories de prueba
npx tsx scripts/mock-instagram-data.ts create

# Solo crear stories para una organización existente
npx tsx scripts/mock-instagram-data.ts stories <org_id>

# Listar organizaciones con Instagram configurado
npx tsx scripts/mock-instagram-data.ts list

# Limpiar datos de prueba
npx tsx scripts/mock-instagram-data.ts cleanup
```

### `mock-instagram-data.sh`
Script bash que genera SQL para ejecutar manualmente. Útil si prefieres ejecutar SQL directamente.

## Configuración

1. **Variables de entorno requeridas:**
   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
   export SUPABASE_URL="https://tu-proyecto.supabase.co"  # Opcional, tiene default
   ```

2. **Cargar desde .env:**
   El script automáticamente carga variables desde `.env` en la raíz del proyecto si existe.

## Qué Crea el Script

### 1. Organización de Prueba
- Nombre: `Test Organization <timestamp>`
- Instagram Business Account ID: `17841405309217644` (mock)
- Instagram Username: `test_org_instagram`

### 2. Token de Instagram
- Token mock (plain text): `mock_instagram_token_<timestamp>`
- Expiración: 60 días desde la creación
- **Nota:** Este token no funcionará con la API real de Instagram, pero permite probar el flujo de datos.

### 3. Stories de Prueba
Crea 7 stories con diferentes edades para probar el sistema de snapshots:

| Edad | Username | ¿Crea Snapshot? | Nota |
|------|----------|-----------------|------|
| 1h   | test_user_1h | ✅ Sí | Dentro de la ventana de snapshot (1h ±30min) |
| 2h   | test_user_2h | ❌ No | Fuera de las ventanas de snapshot |
| 4h   | test_user_4h | ✅ Sí | Dentro de la ventana de snapshot (4h ±30min) |
| 8h   | test_user_8h | ✅ Sí | Dentro de la ventana de snapshot (8h ±30min) |
| 12h  | test_user_12h | ✅ Sí | Dentro de la ventana de snapshot (12h ±30min) |
| 20h  | test_user_20h | ✅ Sí | Dentro de la ventana de snapshot (20h ±30min) |
| 23h  | test_user_23h | ✅ Sí | Dentro de la ventana de snapshot (23h ±30min) |

**Ventanas de snapshot:** El cron toma snapshots a las 1h, 4h, 8h, 12h, 20h, y 23h con una ventana de ±30 minutos.

## Flujo de Testing

### Paso 1: Crear Datos Mock
```bash
npx tsx scripts/mock-instagram-data.ts create
```

Esto crea:
- ✅ Organización con Instagram configurado
- ✅ Token de Instagram (mock)
- ✅ 7 Stories con diferentes edades

### Paso 2: Ejecutar el Cron Manualmente
```bash
npx tsx scripts/test-story-insights-cron.ts cron
```

**Nota importante:** Como los tokens son mock, las llamadas a la API de Instagram fallarán. Esto es esperado. El cron:
- ✅ Encontrará las stories en la base de datos
- ✅ Intentará obtener insights de Instagram (fallará con token mock)
- ✅ Continuará procesando otras stories

### Paso 3: Verificar Resultados

**Opción A: Verificar en la base de datos**
```sql
-- Ver stories creadas
SELECT id, instagram_story_id, mentioned_at, state 
FROM social_mentions 
WHERE instagram_story_id LIKE 'mock_story_%'
ORDER BY mentioned_at DESC;

-- Ver snapshots creados (si hay alguno)
SELECT * FROM story_insights_snapshots 
WHERE instagram_story_id LIKE 'mock_story_%'
ORDER BY snapshot_at DESC;
```

**Opción B: Usar el script de verificación**
```bash
npx tsx scripts/test-story-insights-cron.ts data
```

### Paso 4: Limpiar Datos
```bash
npx tsx scripts/mock-instagram-data.ts cleanup
```

Esto elimina las stories mock. Los tokens y organizaciones deben eliminarse manualmente si lo deseas.

## Limitaciones con Tokens Mock

### ❌ Lo que NO funcionará:
- Llamadas reales a la API de Instagram
- Obtención de insights reales de stories
- Snapshots con datos reales de métricas

### ✅ Lo que SÍ funcionará:
- Detección de stories en la base de datos
- Cálculo de edad de stories
- Lógica de cuándo tomar snapshots
- Procesamiento del flujo completo (aunque falle en la API)

## Testing con Datos Reales

Para testing completo con datos reales:

1. **Usa un token real de Instagram:**
   ```sql
   UPDATE organization_instagram_tokens 
   SET access_token = '<token_real_encriptado>'
   WHERE organization_id = '<org_id>';
   ```

2. **O crea stories reales:**
   - Conecta una cuenta real de Instagram
   - Crea stories reales que mencionen tu organización
   - El webhook de Instagram las detectará automáticamente

## Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY requerida"
```bash
export SUPABASE_SERVICE_ROLE_KEY="tu-key"
```

### Error: "violates check constraint" al crear stories
Si recibes un error sobre el constraint de `mention_type`, verifica que `'story_referral'` esté permitido:

```sql
-- Ver constraint actual
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'social_mentions'::regclass 
AND conname LIKE '%mention_type%';

-- Si falta 'story_referral', actualiza el constraint:
ALTER TABLE public.social_mentions 
DROP CONSTRAINT IF EXISTS social_mentions_mention_type_check;

ALTER TABLE public.social_mentions 
ADD CONSTRAINT social_mentions_mention_type_check 
CHECK (mention_type IN ('mention', 'tag', 'hashtag', 'story', 'comment', 'story_referral'));
```

### Error: "No se encontraron organizaciones"
Ejecuta `create` primero:
```bash
npx tsx scripts/mock-instagram-data.ts create
```

### Las stories no aparecen en el cron
Verifica que:
- El `mention_type` sea `'story_referral'`
- El `state` sea `'new'` o `'flagged_early_delete'`
- El `mentioned_at` sea menor a 24 horas

### No se crean snapshots
Recuerda que los snapshots solo se crean cuando:
- La edad de la story está dentro de una ventana de snapshot (1h, 4h, 8h, 12h, 20h, 23h ±30min)
- La API de Instagram devuelve insights (fallará con tokens mock)

## Próximos Pasos

Para testing más completo, considera:
1. **Mockear respuestas de la API de Instagram** - Interceptar llamadas y devolver datos mock
2. **Usar tokens reales en ambiente de desarrollo** - Para testing end-to-end
3. **Crear un ambiente de testing aislado** - Base de datos separada para tests

