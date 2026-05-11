# trazza

Dashboard web para controlar el resultado real de cuentas de prop firms: compras,
resets, activaciones, fees, payouts y refunds.

## Uso

La app es estatica y no necesita build. Puedes abrir `index.html` directamente
para revisar la interfaz, o servirla desde localhost para probar el flujo
completo de Supabase.

Opcion local:

```bash
python -m http.server 5173
```

Despues abre `http://localhost:5173`.

## Datos y sesion

- Login con email/password mediante Supabase Auth.
- Firms, cuentas, movimientos y journal se sincronizan en Supabase.
- `localStorage` se usa para respaldo local y migracion de datos antiguos.
- Puedes exportar/importar una copia en JSON desde la propia app.

Para activar el Journal en Supabase, ejecuta `supabase-journal.sql` en el SQL
editor del proyecto. La app seguira funcionando aunque la tabla no exista, pero
no podra guardar entradas de journal hasta crearla.

## Incluye

- Dashboard con resultado neto, gastos, retiros, ROI, break-even y cuentas activas.
- Grafico interactivo de evolucion del capital con tooltip, zoom y arrastre.
- Registro de firms.
- Registro de cuentas.
- Registro de movimientos economicos.
- Journal independiente con calendario mensual, P&L diario, P&L semanal, disciplina, estado mental y aprendizajes.
- Filtros y vistas por firm, cuenta, movimiento y journal.
- Vista movil optimizada con tablas convertidas en tarjetas.
- Exportacion JSON/CSV e importacion JSON.
