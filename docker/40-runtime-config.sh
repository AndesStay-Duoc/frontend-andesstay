#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# Genera /usr/share/nginx/html/assets/config.json a partir de las variables de
# entorno del contenedor.
#
# La imagen oficial de nginx ejecuta todos los *.sh de /docker-entrypoint.d/ en
# orden alfabético antes de arrancar el servidor. Este va después del 20, que es
# el que procesa las plantillas con envsubst.
#
# Permite cambiar los endpoints del despliegue sin recompilar la SPA: basta
# editar el .env compartido y reiniciar el contenedor.
# ─────────────────────────────────────────────────────────────────────────────
set -eu

TARGET_DIR=/usr/share/nginx/html/assets
TARGET="$TARGET_DIR/config.json"

# ── Comprobación de seguridad, antes de arrancar nginx ───────────────────────
# El server block compara la cabecera X-Gateway-Secret con este valor mediante
# un bloque "map". Si la variable llegara vacía, la plantilla renderizaría
#
#     map $http_x_gateway_secret $gateway_authorized {
#         default  0;
#         ""       1;      <-- una petición SIN la cabecera quedaría autorizada
#     }
#
# es decir, exactamente lo contrario de lo que se busca: el puerto 80 está
# abierto a internet y el BFF quedaría accesible sin pasar por API Gateway.
# Mejor no arrancar que arrancar desprotegido.
if [ -z "${GATEWAY_SECRET:-}" ]; then
    echo "40-runtime-config.sh: ERROR - GATEWAY_SECRET está vacío." >&2
    echo "  Nginx autorizaría las peticiones sin cabecera y el BFF quedaría expuesto." >&2
    echo "  Completar GATEWAY_SECRET en el .env compartido y ejecutar push-env.sh." >&2
    exit 1
fi

mkdir -p "$TARGET_DIR"

# Un valor sin definir se escribe como cadena vacía, y runtime-config.ts lo
# reemplaza por el de environment. Así un despliegue a medio configurar arranca
# igual y deja el aviso en la consola del navegador.
AZURE_TENANT_ID="${AZURE_TENANT_ID:-}"
AZURE_CLIENT_ID="${AZURE_CLIENT_ID:-}"
PUBLIC_API_ORIGIN="${PUBLIC_API_ORIGIN:-}"
PUBLIC_WEB_ORIGIN="${PUBLIC_WEB_ORIGIN:-}"

AUTHORITY=""
if [ -n "$AZURE_TENANT_ID" ]; then
    AUTHORITY="https://login.microsoftonline.com/$AZURE_TENANT_ID"
fi

SCOPES="[]"
if [ -n "$AZURE_CLIENT_ID" ]; then
    SCOPES="[\"api://$AZURE_CLIENT_ID/AndesStay.Access\"]"
fi

# PUBLIC_WEB_ORIGIN es el origen desde el que el navegador carga la SPA, y tiene
# que coincidir carácter por carácter con un Redirect URI registrado en Entra ID.
REDIRECT_URI="$PUBLIC_WEB_ORIGIN"
POST_LOGOUT_URI=""
if [ -n "$PUBLIC_WEB_ORIGIN" ]; then
    POST_LOGOUT_URI="$PUBLIC_WEB_ORIGIN/login"
fi

cat > "$TARGET" <<JSON
{
  "clientId": "$AZURE_CLIENT_ID",
  "authority": "$AUTHORITY",
  "redirectUri": "$REDIRECT_URI",
  "postLogoutRedirectUri": "$POST_LOGOUT_URI",
  "apiUri": "$PUBLIC_API_ORIGIN",
  "scopes": $SCOPES
}
JSON

echo "40-runtime-config.sh: assets/config.json generado (apiUri=${PUBLIC_API_ORIGIN:-<vacio>})"
