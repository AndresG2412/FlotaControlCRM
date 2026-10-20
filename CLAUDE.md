# FlotaControl

Sistema para controlar el dinero, las rutas y el mantenimiento de una buseta de transporte público intermunicipal (empresa afiliada: Gaitana). Es un proyecto familiar: el dueño (admin) necesita saber **cuánto produjo realmente cada vuelta**, porque hoy el dinero llega neto a través de los conductores y parte se pierde sin registro.

Este repositorio arranca **desde cero** en la rama `flotamain`. Existe una versión anterior (https://github.com/AndresG2412/FlotaControlCRM, Next.js 16 + Firebase) que sirve solo como referencia de ideas; no se migra su código.

---

## 1. Dominio del negocio

### Glosario

| Término | Significado |
|---|---|
| **Vuelta** | La unidad del negocio: **ida + regreso completos**. Sobre la vuelta se calculan gastos, pago a conductores y liquidación (ganancia o pérdida). |
| **Ida** | Florencia → Pitalito → Popayán → Cali. |
| **Regreso** | Cali → Popayán → Pitalito → Florencia. |
| **Trayecto** | Una ida o un regreso concreto, con fecha. Una vuelta tiene 2 trayectos (o 1 si fue varada). |
| **Tramo** | Entre dos terminales consecutivas (ej. Florencia → Pitalito ≈ 3 h). Cada trayecto tiene 3 tramos. Los pasajeros de vía se ubican por tramo, no por lugar exacto. |
| **Terminal** | Florencia, Pitalito, Popayán, Cali. En cada una (menos la última del trayecto) se puede emitir una planilla. |
| **Planilla** | Documento que la terminal entrega al salir. Su **neto a pagar** es lo que la terminal le vendió al vehículo en esa salida. |
| **Polilla** | Dinero "suelto" que entra en la vía: pasajeros recogidos fuera de terminal y encomiendas. |
| **Encomienda** | Caja/paquete que alguien entrega (en terminal o en la vía) para llevar a otro punto. |
| **Facturar** | Meter en la planilla de la siguiente terminal a un pasajero recogido en la vía (obligatorio si sigue en el bus, porque allí cuentan pasajeros a mano). El conductor paga en taquilla el pasaje desde esa terminal hasta el destino. |
| **Ligas** | Dinero que se le da a los taquilleros de cada terminal para mantener buena relación y que ayuden a conseguir pasajeros. |
| **Varada / desvío** | Vuelta que no se completó (ej. salió de Florencia y se quedó en Pitalito). Casi nunca deja dinero, pero **se registra igual** para saber que el carro salió. |
| **Programación** | Tabla mensual de salidas asignadas a la buseta (fecha + hora + sentido). |
| **Salida adicional** | Salida en un día que no estaba en la programación. |
| **Repuesto** | Pieza cambiada a la buseta, con foto, categoría, fecha y quién lo registró. |

### Conductores

Cada vuelta lleva **dos conductores**:

| Conductor | Recorrido | Pago por vuelta completa |
|---|---|---|
| **Conductor Florencia** | Florencia → Cali → Florencia | $200.000 |
| **Conductor Pitalito** | Se sube en Pitalito → Cali → se baja en Pitalito | $150.000 |

- Total $350.000 por vuelta completa.
- En una **varada** (ej. Florencia → Pitalito → Florencia) al conductor Florencia se le pagan $70.000, pero **por ahora el sistema no lo registra**: las varadas quedan en $0.
- Los dos conductores registran desde su propio celular en la misma vuelta (cada registro guarda quién lo hizo).
- Los valores de pago son configurables por el admin, con fecha de vigencia.

### Módulo 1 — Planillas

- Cada trayecto tiene **0 a 3 planillas** (una por terminal de salida). Lo normal es 3.
- Una planilla puede **no existir** y eso es válido: terminal cerrada por la hora, no se vendió nada, etc. Se registra igual la terminal como "sin planilla" con un motivo, para distinguir "no hubo" de "el conductor no la subió".
- La terminal final del trayecto (Cali en la ida, Florencia en el regreso) **nunca** emite planilla en ese trayecto.
- El **neto se digita a mano** en un campo numérico. La foto de la planilla es **opcional**, solo como evidencia; el sistema no lee datos de fotos.
- El **neto a pagar ya es el valor final** (con los descuentos de la terminal aplicados). No se registra bruto.
- Campos: terminal, fecha/hora, número de planilla (opcional), neto a pagar, pasajeros en planilla (opcional), foto (opcional).

### Módulo 2 — Polilla (pasajeros en vía y encomiendas)

Es el módulo más sensible: aquí es donde se pierde dinero. Cada pasajero/encomienda de polilla se registra **individualmente**:

- Tramo donde subió, destino, monto cobrado.
- Si siguió en el bus al pasar por la siguiente terminal → **se facturó**: el conductor pagó en taquilla el pasaje desde esa terminal hasta el destino. Se registra cuánto pagó.
- Lo que sobra (`cobrado − facturado`) tiene **dos destinos posibles**, que se registran explícitamente:
  - `polilla`: entra a la caja de la vuelta.
  - `conductor`: se lo quedó el conductor.

**Regla de cálculo (no cambiar sin confirmar con el dueño):**

```
sobrante(pasajero)     = monto_cobrado − monto_facturado    (monto_facturado = 0 si se bajó antes de la terminal)
polilla(pasajero)      = sobrante si destino = 'polilla', si no 0
quedo_conductor        = sobrante si destino = 'conductor', si no 0
ingreso_real(vuelta)   = Σ neto de planillas + Σ polilla + Σ encomiendas
```

Ejemplo: un pasajero sube cerca de Florencia, va a Cali y paga $80.000. En Pitalito sigue en el bus, así que el conductor paga $55.000 en taquilla (Pitalito → Cali) y queda en la planilla; esos $55.000 ya vienen dentro del neto de esa planilla. Sobran $25.000: van a polilla o se los queda el conductor, y queda registrado cuál de los dos.

- Lo que se queda el conductor **no suma al ingreso**, pero se muestra en los reportes como un total visible por vuelta y por conductor. La idea es que nada quede sin registro.
- **Sin tarifas** (decisión del dueño): no hay tabla de precios ni monto sugerido. El conductor digita cuánto pagó en taquilla y, a conciencia, dice si el sobrante va a la caja o se lo quedó. La confianza en los conductores pesa más que controlar cada peso. La tabla `tarifas` existe en la base pero no se usa.
- **Facturar es obligatorio** si el pasajero sigue en el bus al pasar por una terminal. Se factura en la **primera** terminal que pasa (`terminalDeFacturacion`). Si se baja en la siguiente terminal, no se factura.
- **No hay sobrante negativo:** en la terminal el tiquete se hace por lo que pagó el pasajero, así que lo facturado nunca supera lo cobrado. Lo validan Zod y la base (`polilla_facturado_no_supera_cobrado` y el trigger `validar_polilla`).
- **Monto de la encomienda = neto final** que recibe la vuelta. Si la dejó un taquillero, ya descontó su porcentaje. La encomienda va siempre hacia adelante en la ruta: lo validan Zod y el trigger `validar_encomienda`.
- Registrar polilla toma segundos: el tramo viene preseleccionado (sale de la última terminal registrada), el destino se elige con botones, y "Guardar y otro" deja listo el siguiente pasajero.
- **Encomiendas**: origen, destino, descripción corta, monto, dónde se recibió (terminal / vía).
- No guardar nombres ni documentos de pasajeros de polilla (minimización de datos, Ley 1581).

### Módulo 3 — Programación de salidas

- El admin **digita** las salidas del mes (fecha, hora, sentido) en un calendario. El sistema no lee la foto de la tabla; la foto se puede adjuntar como referencia.
- El sistema debe responder: qué salidas hay en el mes, qué días y horas está disponible la buseta, y cuál es el regreso que corresponde a cada ida.
- Toda esta lógica (regresos, adicionales, cancelaciones) vive aislada en `lib/dominio/programacion` como funciones puras con tests, porque es la parte con más casos especiales.

**Regla del regreso:**
- Cada ida genera un **regreso pendiente** con `fecha_sugerida` = día siguiente a la llegada a Cali.
- Si ese día no hay pasajeros, el regreso se corre; la buseta se queda en Cali. El regreso sigue pendiente hasta que se haga (no desaparece).

**Salida adicional:**
- Si la buseta sale en un día no programado (porque había pasajeros), se registra como `adicional`.
- La salida programada del día siguiente queda **cancelada por adicional** (marcada, nunca borrada), porque la buseta está en otra ciudad.
- Esa salida cancelada traía su propio regreso, y ese regreso se **hereda**. Resultado: la buseta tiene una **ventana de regreso** desde el día siguiente a la adicional hasta el día del regreso heredado.
- Ejemplo: adicional el miércoles → se cancela la ida programada del jueves → puede regresar el jueves; si el jueves no hay pasajeros, se queda en Cali y regresa el viernes (el regreso que le tocaba a la ida del jueves).
- La regla es simétrica: un regreso adicional cancela el regreso programado del día siguiente.
- Si el día siguiente no había nada programado, no se cancela nada y la ventana es solo el día siguiente.
- La buseta **siempre puede devolverse**: pasada la ventana, el regreso sigue pendiente y se marca como "atrasado".
- Implementado en `lib/dominio/programacion` (`salidaQueCancela`, `regresosEsperados`, `calendarioDelMes`). Un regreso se enlaza con la ida si es el primer regreso vigente desde el día de la ida y antes de la siguiente ida.

### Módulo 4 — Gastos y liquidación de la vuelta (solo admin)

**Gastos mínimos por vuelta = gastos fijos + gastos variables.** No hay una cifra fija en el sistema: los gastos de cada vuelta se calculan con lo que realmente se registra. (El dueño estima de cabeza que una vuelta cuesta ~$1.300.000; es solo su referencia mental, **no** se programa como constante ni como meta.)

- **Gastos fijos por vuelta** (se cargan solos al crear la vuelta): configurables por el admin, con fecha de vigencia (si cambia un valor, las vueltas viejas conservan el valor que tenían). Valores del sistema anterior:

  | Concepto | Valor |
  |---|---|
  | Peajes | $35.000 |
  | Conduces | $250.000 |
  | Viáticos | $140.000 |
  | Pago conductores (200.000 + 150.000) | $350.000 |
  | Lavadas | $50.000 |
  | Parqueos | $20.000 |
  | **Total fijos** | **$845.000** |

- **Gastos variables** (los registran los conductores durante la vuelta, con monto y foto del recibo opcional):
  - **ACPM**: por cada tanqueada (monto, galones opcional, dónde).
  - **Ligas**: por terminal.
  - **Otros/extras**: nombre libre + monto.
  - Repuesto o arreglo hecho en ruta (enlaza con el módulo de Repuestos).

```
gastos_minimos(vuelta) = gastos_fijos + gastos_variables
liquidacion(vuelta)    = ingreso_real − gastos_minimos      ← ganancia (verde) o pérdida (rojo)
```

- Igual que el sistema anterior, pero corrigiendo un error: allá el ACPM se registraba y **no se restaba** en la liquidación. Aquí sí se resta.
- Una **varada** solo se **registra** como vuelta de tipo `varada` (fecha, trayecto parcial, conductores, nota) para el historial ("el carro salió, pero no hubo base"). **No lleva gastos, ingresos ni pagos: todo en $0** y no se liquida.

**Cuadre de caja** (al cerrar la vuelta):

El conductor maneja todo el dinero de la vuelta: en cada terminal le entregan el neto de la planilla en efectivo, cobra polilla y encomiendas, y de ahí paga los gastos (ACPM, ligas, peajes, su pago, etc.). Al final le entrega al dueño lo que queda.

```
efectivo_esperado = Σ neto de planillas + Σ polilla + Σ encomiendas − Σ gastos variables − Σ gastos fijos con se_paga_en_ruta
diferencia        = efectivo_entregado (lo digita el admin) − efectivo_esperado
```

- Todos los gastos variables salen del efectivo de la vuelta (el ACPM lo paga el conductor con lo que le dan las terminales).
- Un gasto fijo con `se_paga_en_ruta = false` (lo paga el dueño aparte) resta en la liquidación pero no en el cuadre.
- Las encomiendas **no** van dentro del neto de la planilla: son dinero suelto y suman aparte.

### Privacidad de resultados frente a los conductores (regla dura)

Los conductores **no pueden ver** ningún resultado: ni totales de la vuelta, ni ingreso real, ni gastos fijos, ni liquidación, ni cuadre, ni lo que el sistema registra como "se lo quedó el conductor". Solo ven y corrigen **los registros individuales de las vueltas en que van** (planillas, polilla, encomiendas, gastos) mientras la vuelta esté abierta, sin sumas ni subtotales de dinero.

- Se aplica en la base de datos (RLS y vistas/funciones de reportes accesibles solo para `admin`), no solo ocultándolo en la UI.
- Ninguna respuesta de la API al conductor debe incluir campos calculados de dinero.
- Ante cualquier pantalla nueva del conductor, verificar que no filtre totales.
- El conductor sí marca, en cada pasajero, si el sobrante fue a polilla o se lo quedó (es él quien lo sabe). Lo que nunca ve es el **total** de lo que se quedó, ni el de ningún otro concepto.

### Módulo 5 — Repuestos

- Conductores y admin registran: nombre del repuesto, categoría, **fecha del cambio**, **precio** y **taller** (obligatorios), foto y notas (opcionales). Sin kilometraje (decisión del dueño; la columna se eliminó).
- **Fecha del cambio** (`fecha_cambio`, día de Bogotá): por defecto hoy; se puede elegir un día anterior, **nunca uno futuro** (lo validan Zod y el trigger `validar_fecha_repuesto`). El historial, los filtros por mes y el "último cambio por categoría" usan esta fecha. `ocurrido_en` sigue siendo la hora en que se registró, y es la que se usa para marcar "revisar hora".
- **El usuario lo pone el servidor**, no el formulario. Como se puede registrar sin señal, se guardan dos fechas: `ocurrido_en` (hora del celular cuando se registró) y `sincronizado_en` (hora del servidor cuando llegó). Si la diferencia es rara (ej. fecha en el futuro), se marca para revisión.
- Historial consultable por categoría y por fecha ("¿cuándo se cambiaron las pastillas de freno por última vez?").
- Categorías iniciales: Frenos, Aceite, Eléctrico, Neumáticos, Amortiguadores, Refrigeración, Dirección, Motor, General, Otros.

### Módulo 6 — Pagos y vencimientos (solo admin)

Sección aparte, independiente de las vueltas, para gastos periódicos de la buseta: seguro, SOAT, tecnomecánica, cuota a la empresa afiliadora, etc.

- Campos: nombre, fecha de compra/pago, costo, fecha de recordatorio, fecha de vencimiento (opcional), notas, foto del comprobante (opcional).
- En la fecha de recordatorio, el admin recibe un **correo** (Resend, disparado por un cron diario) y el pendiente aparece en el panel.
- Al renovar, se registra un pago nuevo; el historial queda intacto.
- Los conductores solo ven cuándo vence cada concepto (nombre y fechas), sin costos ni comprobantes. Lo exponen `vencimientos_buseta()`.

### Usuarios y roles

- **admin**: el dueño. Ve y edita todo, configura gastos fijos, pagos a conductores, programación y categorías; ve liquidaciones, cuadres, reportes y pagos/vencimientos; cierra vueltas.
- **conductor**: cada conductor tiene su propia cuenta. Los dos conductores de una vuelta **comparten sus registros**: ambos ven y corrigen planillas, polilla, encomiendas y gastos de esa vuelta (se guarda quién registró y quién corrigió). Nunca ven totales (ver *Privacidad de resultados*). No pueden editar una vuelta cerrada. Además:
  - **Crea y finaliza vueltas.** Cualquiera de los dos la puede crear, pero solo hay **una vuelta en curso por buseta**: no se empieza otra sin finalizar la anterior. Mientras exista, se sigue registrando en ella terminal por terminal. Todo conductor ve la vuelta en curso y puede unirse o reemplazar a un compañero en un puesto (`unirse_a_vuelta()`). Si se equivocó al finalizar, puede reabrirla mientras el admin no la haya cerrado.
  - **Repuestos:** ve todo el historial de la buseta; crea, edita y "elimina" los que registró. Eliminar pide confirmación ("¿Seguro que quieres eliminarlo?") y por dentro **anula** el registro con un motivo; no hay borrado físico.
  - **Vencimientos:** ve cuándo toca SOAT, seguro, tecnomecánica, etc. (`vencimientos_buseta()`: nombre y fechas, sin costos ni comprobantes). No ve ni edita los pagos.
  - **Programación:** ve las salidas del mes, los regresos y las adicionales. Solo el admin la edita.
- Hoy hay **una buseta** (placa WFV990, número 7900), pero todas las tablas llevan `buseta_id` para soportar más en el futuro sin rediseñar.

---

## 2. Stack técnico

| Capa | Elección |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript estricto |
| Estilos | Tailwind CSS |
| Base de datos y auth | Supabase (Postgres + Auth + RLS) |
| Archivos (fotos de planillas, recibos y repuestos) | Supabase Storage (buckets privados, URLs firmadas) |
| Validación | Zod, compartido entre formulario y servidor |
| Íconos | lucide-react |
| Hosting | Vercel |
| App del conductor | **PWA instalable, offline-first** (service worker + IndexedDB con Dexie + cola de sincronización) |

Se prioriza lo gratuito. Se eligió Postgres sobre Firebase porque el dominio es relacional (vuelta → trayectos → planillas → pasajeros de polilla) y los reportes de dinero necesitan SQL.

### Base de datos (Supabase)

- Proyecto: **FlotaControl**, ref `edrjtplwvprqlnbxafjp`, región `us-east-1`, organización "Gabosky" (de un colaborador).
- Todo el esquema está en `supabase/migrations/` (aplicadas en orden). Cambios nuevos = migración nueva, nunca editar una ya aplicada. El nombre de cada archivo usa la misma versión con que quedó registrada en Supabase (`supabase_migrations.schema_migrations`), para que el CLI no las crea pendientes.
- Roles en `public.perfiles` (`admin` | `conductor`). Los helpers de autorización viven en el esquema `private` (no expuesto por la API): `es_admin()`, `es_conductor()`, `puede_registrar_en_vuelta()`, etc.
- Las reglas que tocan varias filas a la vez van en Postgres (atómicas): `cerrar_vuelta()`, `registrar_salida_adicional()`, copia de gastos fijos al crear la vuelta, marcar la salida como realizada.
- Los totales de dinero solo salen de la vista `reporte_vueltas`, que devuelve 0 filas a quien no sea admin.
- Fotos en el bucket privado `evidencias`, con ruta `{uid}/{uuid}.{jpg|png|webp}`, máximo 5 MB.
- Sin `DELETE` en ninguna tabla: se anula con `estado` + `motivo_anulacion`.
- Usuarios iniciales: admin, conductor Florencia y conductor Pitalito (correos internos `@flotacontrol.local`). Las contraseñas están solo en `.credenciales.local.md` (ignorado por git). Nunca poner contraseñas en migraciones ni en el repo.
- Pendiente en el dashboard: desactivar el registro público (Auth → Sign In / Providers → "Allow new users to sign up" en off). Los usuarios los crea el admin.

> Next.js 16 tiene cambios que rompen con versiones anteriores. Antes de escribir código de Next, revisar la guía correspondiente en `node_modules/next/dist/docs/` y respetar los avisos de deprecación.

Decisiones del panel del admin (paso 3):
- Lee y escribe con la sesión del admin (`crearClienteServidor()`), sin service role: la RLS ya le da acceso total. Cada función de `lib/admin/` y cada Server Action llama a `exigirRol("admin")`.
- Las fotos se ven con URLs firmadas de 10 minutos generadas en el servidor; el bucket sigue privado.
- Una vuelta `cerrada` es de solo lectura también para el admin (las acciones lo verifican). Reabrir solo pasa `finalizada → en_curso`; si ya hay otra en curso, `vueltas_una_en_curso` lo impide y se muestra el aviso.
- Corregir una planilla valida la planilla completa con `esquemaPlanilla` (lo guardado + lo corregido). `actualizado_por` lo pone la base.
- La lista muestra por defecto el mes actual (Bogotá); `?mes=todos` quita el filtro.

Decisiones ya tomadas con Next 16.4:
- `middleware` ahora se llama **`proxy.ts`** (raíz). Solo refresca la sesión de Supabase y manda a `/login` si no hay usuario; el rol se verifica en los layouts con `exigirRol()` (`lib/auth/sesion.ts`) y, de verdad, en la RLS.
- **Cache Components apagado** (`cacheComponents: false`): Serwist 9 no es compatible con él. Revisar cuando salga Serwist 10.
- `LayoutProps` y `PageProps` son tipos globales que genera `next typegen` (lo corre `npm run typecheck`).
- Sesión en el servidor: siempre `supabase.auth.getClaims()` (valida el JWT), nunca `getSession()`.


Decisiones del paso 5 (gastos, liquidación y cuadre):
- Todo el dinero del detalle sale de `reporte_vueltas`; la UI solo calcula la vista previa de la diferencia al cerrar (con `diferenciaCuadre`). `vuelta_gastos_fijos` guarda quién ajustó un valor (`actualizado_por`).
- Una vuelta `cerrada` es de solo lectura para el admin también en gastos fijos y variables (trigger `bloquear_si_vuelta_cerrada`), no solo en las acciones.
- El conductor ve sus gastos uno por uno (tipo, monto, dónde, "sin enviar"); `VistaVuelta.gastos` nunca se suma.
- Los galones admiten decimales (no son dinero). Solo la liga lleva terminal y solo el ACPM, galones. "Arreglo en ruta" es por ahora solo descripción; se enlazará con Repuestos en el paso 6.
- Pendiente de probar en pantalla con sesión real: ver el resumen del paso en el cierre de la conversación.

### PWA offline-first

En la vía se quedan sin señal con frecuencia, así que la captura del conductor **tiene que funcionar sin internet**. Los conductores usan **Android** (Chrome), donde la PWA instalada funciona bien offline y sincroniza sola al recuperar señal.

- Un solo código para admin (web) y conductores (app instalada en el celular). Sin tiendas de apps.
- Plan B si la PWA se queda corta: app con Expo (React Native) reutilizando el mismo backend de Supabase. Por eso la lógica de negocio va en `lib/dominio/`, sin depender de React ni de Next.

Reglas offline:
- Los registros se crean en el celular con **UUID generado en el cliente**, así se pueden crear sin servidor y la sincronización es idempotente (reenviar no duplica).
- La UI siempre muestra qué está **pendiente de sincronizar**; nada se pierde si se cierra la app.
- Las fotos se guardan en IndexedDB y se suben después, comprimidas.
- El panel del admin puede requerir conexión.
- Service worker: **Serwist 9** con `@serwist/turbopack`, compatible con Turbopack. El código está en `app/sw.ts`, se sirve desde la ruta `app/serwist/[path]` y lo registra `app/proveedor-sw.tsx`. Está apagado en `next dev`; para probarlo hay que usar `npm run build && npm start`. Sin conexión se muestra `/sin-conexion`.
- El proveedor no recarga la página al volver la señal (`reloadOnOnline={false}`), para no perder un formulario a medio llenar.

Diseño de la sincronización (paso 2):
- Cada registro se guarda primero en IndexedDB (Dexie) con su UUID y `ocurrido_en`, y entra a una cola (`pendiente` → `enviando` → `sincronizado` | `error`).
- Al haber señal, la cola envía los lotes a un Route Handler (`app/api/sincronizar`) que valida cada registro con los esquemas de `lib/validaciones/registros.ts` y hace `upsert` por `id` con la sesión del conductor. La RLS sigue mandando y reenviar no duplica.
- Las fotos se suben aparte, directo a Storage desde el navegador. Las políticas del bucket solo dejan escribir en `{uid}/`. Al subir la foto, la cola actualiza el `foto_path` del registro.
- Un rechazo de validación o de RLS deja el registro en `error`, visible para el conductor; nunca se borra solo.
- **Conflicto de vuelta en curso:** si los dos conductores crean una vuelta sin señal, la segunda choca con `vueltas_una_en_curso` al sincronizar. La cola no la descarta: busca la vuelta en curso del servidor, le pasa sus trayectos y registros (y, si hace falta, al conductor con `unirse_a_vuelta()`) y marca la vuelta local como fusionada. Antes de crear una vuelta con señal, la app consulta primero si ya hay una en curso.

---

## 3. Reglas de desarrollo

### Dinero
- Montos en **pesos colombianos como enteros** (`bigint` en Postgres, `number` entero en TS). Nunca `float`/decimales.
- Mostrar con `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`.
- Los totales (`ingreso_real`, `polilla`, `liquidacion`) se **calculan** (vista SQL o función), no se guardan a mano, para que nunca se desincronicen.

### Fechas
- Zona horaria **America/Bogota** en todo cálculo de "día" (programación, adicionales, reportes). Guardar `timestamptz`.
- Por el modo offline, cada registro guarda `ocurrido_en` (hora del celular, cuándo pasó) y `sincronizado_en` (la pone la base con `default now()`). Los reportes usan `ocurrido_en`.

### Datos e integridad
- Nada de borrado físico de registros de dinero o repuestos: usar estado (`anulado`, `cancelado`) + motivo.
- Una vuelta pasa por `en_curso` → `finalizada` (conductor) → `cerrada` (admin). Cerrada = solo lectura.
- Guardar quién creó y quién modificó cada registro de dinero.

### Seguridad
- RLS activo en **todas** las tablas desde la primera migración. El rol se valida en la base de datos, no solo en la UI.
- La `service_role` key solo en servidor, jamás en código de cliente ni en variables `NEXT_PUBLIC_*`. Hoy la usa únicamente el cron de recordatorios (`lib/supabase/servicio.ts`), después de verificar `CRON_SECRET`.
- Toda escritura de datos pasa por Server Actions / Route Handlers con validación Zod. La única excepción es la subida de fotos a Storage desde el navegador, protegida por las políticas del bucket. La RLS y los checks de Postgres son la última defensa: aunque alguien llame la API de Supabase directamente, no puede saltárselos.
- Usar la skill `seguridad-web` al diseñar tablas, auth, subida de archivos o antes de producción.

### UI
- **Mobile-first**: el conductor registra desde el celular, en carretera. Formularios cortos, botones grandes, pocos pasos.
- Todo el texto de la interfaz en español.
- Registrar polilla debe tomar segundos: tramo, destino, monto, guardar.

### Código
- Nombres del dominio en español (`vuelta`, `trayecto`, `planilla`, `polilla`, `encomienda`, `gasto`, `repuesto`) tanto en tablas como en tipos TS; tablas en `snake_case`.
- Esquema de base de datos solo mediante migraciones versionadas en `supabase/migrations/`. Nunca cambios manuales en el dashboard.
- Tipos de la base generados (`supabase gen types`), no escritos a mano.
- Sin `any`. La lógica de negocio (polilla, liquidación, cuadre, regresos, cancelación por adicional) va en funciones puras con tests.

### Estructura

```
proxy.ts                 # refresca la sesión y protege /admin y /conductor
app/
  (auth)/login           # login por usuario ("pedro" → pedro@flotacontrol.local)
  admin/                 # panel del dueño (exigirRol('admin') en layout y en cada page)
    configuracion/       # índice; gastos-fijos/ = vigentes, formulario por fecha e historial (acciones.ts, formulario.tsx); categorias/ de repuestos
    repuestos/           # historial filtrable, último cambio por categoría, registrar/corregir/eliminar (acciones.ts también crea y desactiva categorías)
    programacion/        # calendario del mes, salidas, adicionales, regresos, trayectos sin salida
    pagos/               # vigentes con estado, renovar, comprobante, historial, eliminar
    reportes/            # resumen del mes, por vuelta, por conductor, por mes; csv/ = descarga
    vueltas/             # lista con filtros (mes, estado, tipo) y detalle [id] con trayectos y planillas
      acciones.ts        # Server Actions: corregir/anular planilla, conductores y tipo, reabrir, anular gasto, ajustar fijo, cerrarVuelta, reabrirVueltaCerrada
  conductor/             # captura en ruta (exigirRol('conductor')); nunca totales
                         # pantalla-vuelta.tsx, formulario-planilla.tsx, polilla.tsx y gastos.tsx: diseño provisional
                         # navegacion.tsx (Mi vuelta / Repuestos / Agenda); repuestos/ = historial y formulario sin señal
                         # agenda/ = próximas salidas, regreso pendiente y vencimientos (solo lectura, sin señal)
  sin-conexion/          # respaldo offline del service worker
  api/sincronizar/       # recibe los lotes de la cola offline (POST, sesión obligatoria)
  api/cron/recordatorios/ # cron diario (Vercel): correo de pagos por renovar (Bearer CRON_SECRET)
  serwist/[path]/        # sirve el service worker
  sw.ts                  # código del service worker
  manifest.ts            # manifiesto de la PWA (íconos en public/iconos)
lib/
  admin/                 # lecturas del panel (server-only, exigirRol('admin') en cada función)
    comun.ts             # nombres de usuarios, URLs firmadas de fotos (compartido)
    vueltas.ts           # listarVueltas (con liquidación), detalleVuelta (fotos firmadas, gastos, liquidación y cuadre desde reporte_vueltas), listarConductores
    gastos-fijos.ts      # configuración de gastos fijos
    repuestos.ts         # historial de repuestos, categorías, buseta principal
    programacion.ts      # salidas del mes (con margen) y trayectos sin salida
    pagos.ts             # pagos periódicos con comprobante firmado
    reportes.ts          # filas de reporte_vueltas + polilla "me lo quedé" por quién la registró
  auth/                  # sesión, roles y acciones de login/salir
  dominio/               # reglas de negocio puras + tests (sin React ni Next)
    programacion/        # regresos, adicionales, calendario
    vuelta.ts            # ciclo de vida: una en curso, finalizar, varada en $0, qué puede hacer el admin
    gastos-fijos.ts      # fijosVigentes (igual que el trigger cargar_gastos_fijos), historialPorConcepto, totalFijos
    planillas.ts         # estado de cada terminal (registrada, sin planilla, pendiente); conductor y admin
    repuestos.ts         # filtrar historial (días de Bogotá, sin tildes), último por categoría, revisar hora
    vencimientos.ts      # vigentes por concepto, estado, por recordar, correo (escapado)
    reportes.ts          # resumir, porMes, porConductor, csvPorVuelta (sin guardar totales)
  offline/               # IndexedDB (Dexie) + cola de sincronización
    operaciones.ts       # contrato celular ↔ servidor (operaciones, lote, códigos de error)
    db.ts                # tablas locales: cola, registros, fotos, ajustes
    cola.ts              # guardar/anular/finalizar sin señal, sincronizar, fusionar vuelta
    servidor.ts          # aplica un lote con la sesión del usuario (lo usa la API)
    fotos.ts, enviar.ts, ciclo.ts  # fotos comprimidas, envío HTTP, ciclo automático (subir → enviar → descargar)
    descargar.ts         # trae vuelta en curso y sus registros, repuestos, categorías, programación cercana y vencimientos
    vista.ts             # arma la pantalla de la vuelta desde lo local (puro, con tests)
    acciones-conductor.ts # iniciar vuelta/trayecto, planilla, pasajero, encomienda, varada, finalizar (sin señal)
    vista-repuestos.ts   # historial local de repuestos (propio = lo puede corregir)
    use-consulta.ts      # hook: consulta reactiva a la base local
  recordatorios.ts       # lógica del cron (dependencias inyectadas, con tests); correo.ts = envío por Resend
  supabase/              # clientes servidor/navegador/proxy + servicio.ts (llave secreta, solo cron) + tipos generados
  validaciones/          # esquemas Zod compartidos formulario ↔ servidor (admin.ts: filtros y acciones del panel)
supabase/
  migrations/
```

Comandos: `npm run dev`, `npm test` (Vitest), `npm run typecheck`, `npm run lint`, `npm run build`. Regenerar tipos tras una migración con el MCP de Supabase o con `npm run tipos` (requiere `supabase login`).

---

## 4. Orden de construcción sugerido

1. ✅ Proyecto base, Supabase, auth con roles (admin / conductor), RLS, PWA instalable. También están las reglas de dominio puras con tests y los esquemas Zod.
2. ✅ Capa offline (IndexedDB + cola de sincronización). Cubierta con tests (cola, fusión de vuelta, endpoint) y probada contra la base real con dos conductores simulados (transacción revertida). Falta probarla en un Android real sin señal, con cuentas reales, cuando estén las pantallas del paso 3.
3. ✅ Vueltas y trayectos + planillas (incluye "sin planilla" con motivo y vueltas varadas). Conductor (diseño provisional): iniciar o unirse a la vuelta, ida y regreso, planilla por terminal con foto opcional, varada y finalizar, todo sin señal. Admin (diseño provisional, requiere conexión): lista con filtros, detalle con quién registró y corrigió cada planilla, foto con URL firmada, corregir o eliminar (anular) planillas, cambiar conductores y tipo, reabrir una finalizada. Falta probar el flujo del conductor en un Android real sin señal.
4. ✅ Polilla y encomiendas + cálculo de ingreso real (sin tarifas, por decisión del dueño). Conductor (diseño provisional, sin señal): pasajeros de vía y encomiendas por trayecto, corregir y eliminar (anular) con confirmación, sin ninguna suma. Admin: polilla de cada trayecto con quién registró, "se lo quedó el conductor" resaltado, eliminar, e ingresos de la vuelta desde `reporte_vueltas`. Probado contra la base en una transacción revertida: la vista y `liquidar()` coinciden. Falta probar la pantalla del conductor con su cuenta real.
5. ✅ Gastos fijos (configuración) y variables (ACPM, ligas, extras, arreglos) + liquidación y cuadre, solo para admin. Conductor (diseño provisional, sin señal): sección "Gastos" con botones por tipo, foto del recibo opcional, corregir y eliminar con confirmación, sin ninguna suma. Admin: `/admin/configuracion/gastos-fijos` (vigentes, cambiar/agregar/quitar con fecha, historial), detalle de la vuelta con liquidación (ganancia verde / pérdida roja), cuadre de caja, gastos fijos (ajustables por vuelta) y variables (eliminar con motivo), cerrar con confirmación del cuadre, reabrir cerrada con motivo, y liquidación en la lista. Probado contra la base en una transacción revertida: la vista y `liquidar()`/`diferenciaCuadre()` coinciden. Migración `20261012213649_cierre_vuelta`.
6. ✅ Repuestos con foto. Conductor (diseño provisional, sin señal): pestaña "Repuestos" con historial compartido de la buseta (búsqueda y filtro por categoría), "último cambio por categoría" (hace N días), registrar con categoría, fecha del cambio, precio y taller (obligatorios), foto, notas y "se cambió en ruta" (enlaza la vuelta en curso); corrige y elimina (anula con confirmación y motivo) solo los suyos. Admin: `/admin/repuestos` (historial filtrable por categoría, mes y texto, foto con URL firmada, quién registró, "revisar hora", registrar, corregir, eliminar) y `/admin/configuracion/categorias` (agregar, activar o desactivar; no se borran). El gasto "Arreglo en ruta" remite a Repuestos. Migración `20261020125457_repuestos_fecha_precio_taller`: `fecha_cambio`, sin kilometraje, precio y taller obligatorios. Falta probarlo con sesión real.
7. ✅ Programación mensual (digitada) + regresos pendientes + salidas adicionales. Migración `20261020123104_trayectos_con_salida_programada`: `trayectos.salida_programada_id` (una salida, un trayecto). Al crear un trayecto se enlaza solo con la salida pendiente del mismo día y sentido, y esa salida queda `realizada` (también el regreso). El enlace solo lo cambia el admin. Admin (diseño provisional): `/admin/programacion` con calendario del mes (disponible, en Cali esperando regreso), "Guardar y seguir" para digitar el mes rápido, corregir o cancelar (con motivo) salidas pendientes, salida adicional (cancela la del día siguiente), regresos (pendiente, atrasado, programado, hecho) y "trayectos sin salida" (registrarlo como adicional o enlazarlo a una pendiente). Conductor: pestaña "Agenda" (sin señal) con próximas salidas, regreso pendiente y vencimientos. Probado contra la base en una transacción revertida. Falta probar las pantallas con sesión real. La foto de la tabla de programación como referencia quedó sin hacer.
8. ✅ Pagos y vencimientos con recordatorio por correo. Admin (diseño provisional): `/admin/pagos` con los vigentes (último pago por concepto) y su estado (vencido, toca renovar, por vencer, al día), "Registrar renovación" prellenado, comprobante opcional (se sube comprimido a la carpeta del admin), historial y eliminar (anular con motivo); el inicio del panel muestra los pagos por renovar. Correo: Vercel Cron diario a las 7:00 de Bogotá (`vercel.json`) → `/api/cron/recordatorios` (exige `Authorization: Bearer CRON_SECRET`, comparación en tiempo constante) → un solo correo por Resend con lo que toca renovar, y marca `recordatorio_enviado_en` (si el correo falla no marca y se reintenta al otro día). Es el **único** uso de la llave secreta (`lib/supabase/servicio.ts`). Falta: crear la cuenta de Resend, configurar las variables en Vercel y probar un envío real.
9. ✅ Reportes para admin (por vuelta, por mes, por conductor; incluye lo que se quedó el conductor). `/admin/reportes?mes=`: resumen del mes (ingreso real, gastos, liquidación, promedio por vuelta completa, se quedó el conductor, diferencias de cuadre, vueltas sin cerrar), tabla por vuelta con enlace al detalle, por conductor en los últimos 12 meses (vueltas y puesto, liquidación de sus vueltas, lo que registró como "me lo quedé", diferencias de cuadre) y tendencia por mes. Descarga CSV (`;`, BOM, protegido contra fórmulas). Las sumas se hacen con `lib/dominio/reportes.ts` sobre `reporte_vueltas` y nunca se guardan; las vueltas en curso no suman. Falta probar con sesión real de admin (la consulta anidada de polilla por conductor no se pudo validar sin sesión).

---

## 5. Preguntas abiertas (confirmar con el dueño antes de implementar)

_(ninguna por ahora)_

### Respondidas
- Vuelta = ida + regreso. Gastos mínimos por vuelta = fijos + variables, calculados con lo registrado; los ~$1.300.000 son solo la estimación mental del dueño (Módulo 4).
- Regreso: normalmente al día siguiente de llegar a Cali; si no hay pasajeros, se corre (Módulo 3).
- Adicional: cancela la ida programada del día siguiente y hereda su regreso (Módulo 3).
- Neto de planilla: es el neto total y se digita a mano; la foto es opcional (Módulo 1).
- Facturar: el conductor paga en taquilla el pasaje desde esa terminal; el sobrante va a polilla o se lo queda el conductor, y se registra cuál (Módulo 2).
- Pagos: $200.000 conductor Florencia + $150.000 conductor Pitalito por vuelta; varada: $70.000 al conductor Florencia.
- Varadas: solo se registran, todo en $0 (sin gastos ni pagos).
- Registran ambos conductores, cada uno desde su celular.
- Cuadre y resultados: solo los ve el admin; los conductores no ven ningún total.
- Pagos y vencimientos: sección aparte, solo admin, con recordatorio (Módulo 6).
- Conductores usan Android → PWA offline-first.
- Pasajeros de vía: basta con el tramo, no lugares concretos.
- Datos de Firebase: se arranca de cero con la base de datos (no se migran datos históricos).
- Repositorio: mismo repo de GitHub, rama `flotamain` creada desde cero (sin el código anterior).
- El neto de la planilla lo recibe el conductor en efectivo en cada terminal. Él maneja el dinero de la vuelta y al final entrega el neto menos los gastos (Módulo 4, cuadre).
- Encomiendas: no van dentro del neto de la planilla; son dinero suelto.
- ACPM: lo paga el conductor con el dinero que le dan las terminales.
- Conductores: cada uno tiene su cuenta. Los dos de una vuelta comparten los registros de esa vuelta, y el conductor de una vuelta puede cambiar.
- Tarifas: no se usan. El facturado lo digita el conductor y el sobrante va a la caja según su conciencia.
- Pasajero que pagó menos que la taquilla: no pasa, porque el tiquete se hace por lo que pagó (no hay sobrante negativo).
- Encomiendas: se registra el neto final; si la recibió un taquillero, ya descontó su porcentaje.
- Adicional: la buseta siempre puede devolverse. Los casos borde se resolvieron con criterio técnico (Módulo 3).
- Quién crea la vuelta: cualquier conductor. Solo una en curso por buseta; hay que finalizarla para empezar otra.
- Varadas con dinero: aunque se registre dinero, una varada queda toda en $0 (ni gastos ni ganancias).
- Conductores: crean y finalizan vueltas; crean, editan y eliminan (anulan, con confirmación) repuestos; ven vencimientos y programación.
- Cerrar una vuelta: solo si está **finalizada**, también en la base (`cerrar_vuelta`). Una varada se finaliza igual que una completa, así que usa el mismo botón.
- El admin puede **reabrir una vuelta cerrada** con motivo (`reabrir_vuelta_cerrada`): queda finalizada y el cuadre anterior se guarda en `vuelta_cierres_reemplazados`.
- Gastos fijos: todos se pagan en ruta (salen del efectivo del conductor).
- Ajustar un gasto fijo en una vuelta concreta: **solo el admin**. El conductor no ve gastos fijos ni montos (regla de privacidad); si cambia el tipo o la fecha de la vuelta, la base recarga los fijos desde la configuración y el ajuste se pierde.
- Varada: sigue toda en $0, incluidos los $70.000 del conductor Florencia, que por ahora no se registran (valor por defecto, no se discutió de nuevo).
- Repuestos: se elige la fecha del cambio (hoy por defecto, solo días anteriores, no futuros); sin kilometraje; precio y taller obligatorios.

---

## 6. Migración desde Firebase

El sistema anterior usa Firebase (Firestore + Auth). Se migra a Supabase:

- **Código**: no se migra; se reescribe sobre el nuevo modelo (vuelta → trayectos → planillas/polilla/gastos).
- **Usuarios**: son pocos; se crean de nuevo en Supabase Auth (no se migran contraseñas). El script `create-admin` de Firebase se reemplaza por un seed/script equivalente en Supabase.
- **Datos históricos**: **no se migran**; la base de Supabase arranca vacía. El código y los datos de Firebase quedan en la rama `main` como referencia.
- Credenciales de Firebase (service account) solo en local, en `.env.local` o fuera del repo; jamás en git.
- Firebase se apaga solo cuando el dueño confirme que los datos en Supabase están completos.
