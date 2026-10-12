-- Catálogos y valores iniciales.

insert into public.terminales (codigo, nombre) values
  ('florencia', 'Florencia'),
  ('pitalito', 'Pitalito'),
  ('popayan', 'Popayán'),
  ('cali', 'Cali');

insert into public.tramos (id, sentido, orden, origen, destino) values
  ('ida-1', 'ida', 1, 'florencia', 'pitalito'),
  ('ida-2', 'ida', 2, 'pitalito', 'popayan'),
  ('ida-3', 'ida', 3, 'popayan', 'cali'),
  ('regreso-1', 'regreso', 1, 'cali', 'popayan'),
  ('regreso-2', 'regreso', 2, 'popayan', 'pitalito'),
  ('regreso-3', 'regreso', 3, 'pitalito', 'florencia');

insert into public.repuesto_categorias (nombre) values
  ('Frenos'), ('Aceite'), ('Eléctrico'), ('Neumáticos'), ('Amortiguadores'),
  ('Refrigeración'), ('Dirección'), ('Motor'), ('General'), ('Otros');

insert into public.busetas (placa, numero_interno, empresa, modelo, motor, puestos, aceite)
values ('WFV990', '7900', 'Gaitana', '2015', 'NKR', 18, '20W50 Mobil');

-- Gastos fijos por vuelta (valores del sistema anterior).
-- se_paga_en_ruta: sale del efectivo que manejan los conductores (afecta el cuadre).
insert into public.gastos_fijos_config (concepto, valor, se_paga_en_ruta, vigente_desde, creado_por) values
  ('Peajes', 35000, true, '2026-01-01', null),
  ('Conduces', 250000, true, '2026-01-01', null),
  ('Viáticos', 140000, true, '2026-01-01', null),
  ('Pago conductor Florencia', 200000, true, '2026-01-01', null),
  ('Pago conductor Pitalito', 150000, true, '2026-01-01', null),
  ('Lavadas', 50000, true, '2026-01-01', null),
  ('Parqueos', 20000, true, '2026-01-01', null);
