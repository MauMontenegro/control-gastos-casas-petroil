# Backend y RPA de SIPP

API Fastify que persiste solicitudes y configuración por usuario en SQLite. Las contraseñas de
SIPP se cifran con AES-256-GCM antes de almacenarse. Playwright inicia sesión, selecciona empresa
y sucursal y guarda la solicitud mediante `generarSolicitud(1601)`; nunca ejecuta la acción de
envío `1602`.

## Preparación

1. Copia `backend/.env.example` a `backend/.env` o carga sus variables en el entorno.
2. Genera una llave estable para `SIPP_ENCRYPTION_KEY`:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. Instala dependencias y Chromium:

   ```powershell
   corepack pnpm install
   corepack pnpm --filter backend exec playwright install chromium
   ```

   En Windows también puedes definir `RPA_BROWSER_CHANNEL=msedge` para usar Microsoft Edge ya
   instalado. En ese caso no es necesaria la descarga de Chromium.

4. Inicia frontend y backend:

   ```powershell
   corepack pnpm dev
   ```

## Seguridad

- En producción define `ALLOW_DEVELOPMENT_USER=false`.
- Configura `AUTH0_DOMAIN` y `AUTH0_AUDIENCE` con los mismos valores del frontend.
- Conserva `SIPP_ENCRYPTION_KEY` fuera del repositorio y en un administrador de secretos.
- No cambies la llave mientras existan credenciales guardadas.
- Protege y respalda `backend/data/control-gastos.sqlite`.
- El backend limita soportes a un archivo de 10 MB y no expone el directorio de cargas.

## Flujo

1. En **Configuración RPA**, guarda usuario, contraseña y ambiente.
2. Prueba la conexión y selecciona empresa, sucursal y tarjeta.
3. Una solicitud nueva queda en `borrador`.
4. La columna **Acciones** permite confirmar la ejecución del RPA.
5. El backend usa `capturando` y después `capturada`. Ante un fallo queda en `correccion` y
   permite reintentar.

La fecha requerida interna se conserva para planeación. SIPP fija por sí mismo la fecha de
captura del día.
