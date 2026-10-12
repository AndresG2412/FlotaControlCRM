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
- **Tarifas**: tabla configurable por el admin (origen → destino → precio) para sugerir el monto facturado. El conductor puede corregirlo; el valor ingresado manda.
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
```
efectivo_esperado = Σ neto de planillas + Σ polilla + Σ encomiendas − gastos pagados en efectivo por los conductores
diferencia        = efectivo_entregado (lo digita el admin) − efectivo_esperado
```

### Privacidad de resultados frente a los conductores (regla dura)

Los conductores **no pueden ver** ningún resultado: ni totales de la vuelta, ni ingreso real, ni gastos fijos, ni liquidación, ni cuadre, ni lo que el sistema registra como "se lo quedó el conductor". Solo ven y corrigen **sus propios registros** (planillas, polilla, gastos, repuestos) mientras la vuelta esté abierta, sin sumas ni subtotales de dinero.

- Se aplica en la base de datos (RLS y vistas/funciones de reportes accesibles solo para `admin`), no solo ocultándolo en la UI.
- Ninguna respuesta de la API al conductor debe incluir campos calculados de dinero.
- Ante cualquier pantalla nueva del conductor, verificar que no filtre totales.

### Módulo 5 — Repuestos

- Conductores y admin registran: nombre del repuesto, categoría, foto, notas opcionales (costo, kilometraje, taller).
- **El usuario lo pone el servidor**, no el formulario. Como se puede registrar sin señal, se guardan dos fechas: `ocurrido_en` (hora del celular cuando se registró) y `sincronizado_en` (hora del servidor cuando llegó). Si la diferencia es rara (ej. fecha en el futuro), se marca para revisión.
- Historial consultable por categoría y por fecha ("¿cuándo se cambiaron las pastillas de freno por última vez?").
- Categorías iniciales: Frenos, Aceite, Eléctrico, Neumáticos, Amortiguadores, Refrigeración, Dirección, Motor, General, Otros.

### Módulo 6 — Pagos y vencimientos (solo admin)

Sección aparte, independiente de las vueltas, para gastos periódicos de la buseta: seguro, SOAT, tecnomecánica, cuota a la empresa afiliadora, etc.

- Campos: nombre, fecha de compra/pago, costo, fecha de recordatorio, fecha de vencimiento (opcional), notas, foto del comprobante (opcional).
- En la fecha de recordatorio, el admin recibe un **correo** (Resend, disparado por un cron diario) y el pendiente aparece en el panel.
- Al renovar, se registra un pago nuevo; el historial queda intacto.

### Usuarios y roles

- **admin**: el dueño. Ve y edita todo, configura tarifas, gastos fijos, pagos a conductores, programación y categorías; ve liquidaciones, cuadres, reportes y pagos/vencimientos; cierra vueltas.
- **conductor**: registra planillas, polilla, gastos variables y repuestos de las vueltas en las que está asignado. Solo ve sus propios registros, sin totales (ver *Privacidad de resultados*). No puede editar una vuelta cerrada.
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
- Todo el esquema está en `supabase/migrations/` (aplicadas en orden). Cambios nuevos = migración nueva, nunca editar una ya aplicada.
- Roles en `public.perfiles` (`admin` | `conductor`). Los helpers de autorización viven en el esquema `private` (no expuesto por la API): `es_admin()`, `es_conductor()`, `puede_registrar_en_vuelta()`, etc.
- Las reglas que tocan varias filas a la vez van en Postgres (atómicas): `cerrar_vuelta()`, `registrar_salida_adicional()`, copia de gastos fijos al crear la vuelta, marcar la salida como realizada.
- Los totales de dinero solo salen de la vista `reporte_vueltas`, que devuelve 0 filas a quien no sea admin.
- Fotos en el bucket privado `evidencias`, con ruta `{uid}/{uuid}.{jpg|png|webp}`, máximo 5 MB.
- Sin `DELETE` en ninguna tabla: se anula con `estado` + `motivo_anulacion`.
- Pendiente en el dashboard: desactivar el registro público (Auth → Sign In / Providers → "Allow new users to sign up" en off). Los usuarios los crea el admin.

> Next.js 16 tiene cambios que rompen con versiones anteriores. Antes de escribir código de Next, revisar la guía correspondiente en `node_modules/next/dist/docs/` y respetar los avisos de deprecación.

### PWA offline-first

En la vía se quedan sin señal con frecuencia, así que la captura del conductor **tiene que funcionar sin internet**. Los conductores usan **Android** (Chrome), donde la PWA instalada funciona bien offline y sincroniza sola al recuperar señal.

- Un solo código para admin (web) y conductores (app instalada en el celular). Sin tiendas de apps.
- Plan B si la PWA se queda corta: app con Expo (React Native) reutilizando el mismo backend de Supabase. Por eso la lógica de negocio va en `lib/dominio/`, sin depender de React ni de Next.

Reglas offline:
- Los registros se crean en el celular con **UUID generado en el cliente**, así se pueden crear sin servidor y la sincronización es idempotente (reenviar no duplica).
- La UI siempre muestra qué está **pendiente de sincronizar**; nada se pierde si se cierra la app.
- Las fotos se guardan en IndexedDB y se suben después, comprimidas.
- El panel del admin puede requerir conexión.
- Antes de elegir la librería de service worker, verificar que sea compatible con la versión de Next/Turbopack.

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
- La `service_role` key solo en servidor, jamás en código de cliente ni en variables `NEXT_PUBLIC_*`.
- Toda escritura pasa por Server Actions / Route Handlers con validación Zod.
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

### Estructura propuesta

```
app/
  (auth)/login
  admin/        # panel del dueño: vueltas, programación, tarifas, gastos fijos, repuestos, reportes
  conductor/    # vuelta actual, registrar planilla/polilla/gastos, repuestos
lib/
  dominio/      # reglas de negocio puras + tests
  offline/      # IndexedDB (Dexie) + cola de sincronización
  supabase/     # clientes server/browser
  validaciones/ # esquemas Zod
supabase/
  migrations/
```

---

## 4. Orden de construcción sugerido

1. Proyecto base, Supabase, auth con roles (admin / conductor), RLS, PWA instalable.
2. Capa offline (IndexedDB + cola de sincronización), probada sin señal antes de construir encima.
3. Vueltas y trayectos + planillas (incluye "sin planilla" con motivo y vueltas varadas).
4. Polilla y encomiendas + tabla de tarifas + cálculo de ingreso real.
5. Gastos fijos (configuración) y variables (ACPM, ligas, extras) + liquidación y cuadre, solo para admin.
6. Repuestos con foto.
7. Programación mensual (digitada) + regresos pendientes + salidas adicionales.
8. Pagos y vencimientos con recordatorio por correo.
9. Reportes para admin (por vuelta, por mes, por conductor; incluye lo que se quedó el conductor).

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

---

## 6. Migración desde Firebase

El sistema anterior usa Firebase (Firestore + Auth). Se migra a Supabase:

- **Código**: no se migra; se reescribe sobre el nuevo modelo (vuelta → trayectos → planillas/polilla/gastos).
- **Usuarios**: son pocos; se crean de nuevo en Supabase Auth (no se migran contraseñas). El script `create-admin` de Firebase se reemplaza por un seed/script equivalente en Supabase.
- **Datos históricos**: **no se migran**; la base de Supabase arranca vacía. El código y los datos de Firebase quedan en la rama `main` como referencia.
- Credenciales de Firebase (service account) solo en local, en `.env.local` o fuera del repo; jamás en git.
- Firebase se apaga solo cuando el dueño confirme que los datos en Supabase están completos.
