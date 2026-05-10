# trazza

Dashboard web para controlar el resultado real de cuentas de prop firms: compras,
resets, activaciones, fees, payouts y refunds.

## Uso

La app es estatica y no necesita build. Puedes abrir `index.html` directamente
para revisar la interfaz, aunque para login con Google conviene servirla desde
localhost o desde el despliegue.

Opcion local:

```bash
python -m http.server 5173
```

Despues abre `http://localhost:5173`.

## Datos y sesion

- Login con email/password y Google mediante Supabase Auth.
- Firms, cuentas y movimientos se sincronizan en Supabase.
- `localStorage` se usa para respaldo local y migracion de datos antiguos.
- Puedes exportar/importar una copia en JSON desde la propia app.

## Incluye

- Dashboard con resultado neto, gastos, retiros, ROI, break-even y cuentas activas.
- Grafico interactivo de evolucion del capital con tooltip, zoom y arrastre.
- Registro de firms.
- Registro de cuentas.
- Registro de movimientos economicos.
- Filtros y vistas por firm, cuenta y movimiento.
- Vista movil optimizada con tablas convertidas en tarjetas.
- Exportacion JSON/CSV e importacion JSON.
