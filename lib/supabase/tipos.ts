// Generado con `supabase gen types` (proyecto edrjtplwvprqlnbxafjp). No editar a mano:
// regenerar después de cada migración.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      busetas: {
        Row: {
          aceite: string | null
          activa: boolean
          creado_en: string
          empresa: string | null
          id: string
          modelo: string | null
          motor: string | null
          numero_interno: string | null
          placa: string
          puestos: number | null
        }
        Insert: {
          aceite?: string | null
          activa?: boolean
          creado_en?: string
          empresa?: string | null
          id?: string
          modelo?: string | null
          motor?: string | null
          numero_interno?: string | null
          placa: string
          puestos?: number | null
        }
        Update: {
          aceite?: string | null
          activa?: boolean
          creado_en?: string
          empresa?: string | null
          id?: string
          modelo?: string | null
          motor?: string | null
          numero_interno?: string | null
          placa?: string
          puestos?: number | null
        }
        Relationships: []
      }
      encomiendas: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          descripcion: string | null
          destino: string
          estado: string
          id: string
          monto: number
          motivo_anulacion: string | null
          ocurrido_en: string
          recibida_en_terminal: string | null
          recibida_en_tramo: string | null
          registrado_por: string
          sincronizado_en: string
          trayecto_id: string
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          descripcion?: string | null
          destino: string
          estado?: string
          id?: string
          monto: number
          motivo_anulacion?: string | null
          ocurrido_en?: string
          recibida_en_terminal?: string | null
          recibida_en_tramo?: string | null
          registrado_por: string
          sincronizado_en?: string
          trayecto_id: string
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          descripcion?: string | null
          destino?: string
          estado?: string
          id?: string
          monto?: number
          motivo_anulacion?: string | null
          ocurrido_en?: string
          recibida_en_terminal?: string | null
          recibida_en_tramo?: string | null
          registrado_por?: string
          sincronizado_en?: string
          trayecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encomiendas_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encomiendas_destino_fkey"
            columns: ["destino"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "encomiendas_recibida_en_terminal_fkey"
            columns: ["recibida_en_terminal"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "encomiendas_recibida_en_tramo_fkey"
            columns: ["recibida_en_tramo"]
            isOneToOne: false
            referencedRelation: "tramos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encomiendas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encomiendas_trayecto_id_fkey"
            columns: ["trayecto_id"]
            isOneToOne: false
            referencedRelation: "trayectos"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos_fijos_config: {
        Row: {
          concepto: string
          creado_en: string
          creado_por: string | null
          id: string
          se_paga_en_ruta: boolean
          valor: number
          vigente_desde: string
        }
        Insert: {
          concepto: string
          creado_en?: string
          creado_por?: string | null
          id?: string
          se_paga_en_ruta?: boolean
          valor: number
          vigente_desde: string
        }
        Update: {
          concepto?: string
          creado_en?: string
          creado_por?: string | null
          id?: string
          se_paga_en_ruta?: boolean
          valor?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_fijos_config_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gastos_variables: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          descripcion: string | null
          estado: string
          foto_path: string | null
          galones: number | null
          id: string
          lugar: string | null
          monto: number
          motivo_anulacion: string | null
          ocurrido_en: string
          registrado_por: string
          sincronizado_en: string
          terminal: string | null
          tipo: string
          trayecto_id: string | null
          vuelta_id: string
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          descripcion?: string | null
          estado?: string
          foto_path?: string | null
          galones?: number | null
          id?: string
          lugar?: string | null
          monto: number
          motivo_anulacion?: string | null
          ocurrido_en?: string
          registrado_por: string
          sincronizado_en?: string
          terminal?: string | null
          tipo: string
          trayecto_id?: string | null
          vuelta_id: string
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          descripcion?: string | null
          estado?: string
          foto_path?: string | null
          galones?: number | null
          id?: string
          lugar?: string | null
          monto?: number
          motivo_anulacion?: string | null
          ocurrido_en?: string
          registrado_por?: string
          sincronizado_en?: string
          terminal?: string | null
          tipo?: string
          trayecto_id?: string | null
          vuelta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_variables_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_variables_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_variables_terminal_fkey"
            columns: ["terminal"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "gastos_variables_trayecto_id_fkey"
            columns: ["trayecto_id"]
            isOneToOne: false
            referencedRelation: "trayectos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_variables_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: false
            referencedRelation: "reporte_vueltas"
            referencedColumns: ["vuelta_id"]
          },
          {
            foreignKeyName: "gastos_variables_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: false
            referencedRelation: "vueltas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos_periodicos: {
        Row: {
          actualizado_en: string | null
          buseta_id: string | null
          comprobante_path: string | null
          costo: number
          creado_en: string
          creado_por: string | null
          estado: string
          fecha_pago: string
          fecha_recordatorio: string | null
          fecha_vencimiento: string | null
          id: string
          motivo_anulacion: string | null
          nombre: string
          notas: string | null
          recordatorio_enviado_en: string | null
        }
        Insert: {
          actualizado_en?: string | null
          buseta_id?: string | null
          comprobante_path?: string | null
          costo: number
          creado_en?: string
          creado_por?: string | null
          estado?: string
          fecha_pago: string
          fecha_recordatorio?: string | null
          fecha_vencimiento?: string | null
          id?: string
          motivo_anulacion?: string | null
          nombre: string
          notas?: string | null
          recordatorio_enviado_en?: string | null
        }
        Update: {
          actualizado_en?: string | null
          buseta_id?: string | null
          comprobante_path?: string | null
          costo?: number
          creado_en?: string
          creado_por?: string | null
          estado?: string
          fecha_pago?: string
          fecha_recordatorio?: string | null
          fecha_vencimiento?: string | null
          id?: string
          motivo_anulacion?: string | null
          nombre?: string
          notas?: string | null
          recordatorio_enviado_en?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_periodicos_buseta_id_fkey"
            columns: ["buseta_id"]
            isOneToOne: false
            referencedRelation: "busetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_periodicos_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          actualizado_en: string
          creado_en: string
          id: string
          nombre: string
          rol: string
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id: string
          nombre: string
          rol: string
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          creado_en?: string
          id?: string
          nombre?: string
          rol?: string
        }
        Relationships: []
      }
      planillas: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          emitida: boolean
          estado: string
          foto_path: string | null
          id: string
          motivo_anulacion: string | null
          motivo_sin_planilla: string | null
          neto: number | null
          numero: string | null
          ocurrido_en: string
          pasajeros: number | null
          registrado_por: string
          sincronizado_en: string
          terminal: string
          trayecto_id: string
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          emitida: boolean
          estado?: string
          foto_path?: string | null
          id?: string
          motivo_anulacion?: string | null
          motivo_sin_planilla?: string | null
          neto?: number | null
          numero?: string | null
          ocurrido_en?: string
          pasajeros?: number | null
          registrado_por: string
          sincronizado_en?: string
          terminal: string
          trayecto_id: string
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          emitida?: boolean
          estado?: string
          foto_path?: string | null
          id?: string
          motivo_anulacion?: string | null
          motivo_sin_planilla?: string | null
          neto?: number | null
          numero?: string | null
          ocurrido_en?: string
          pasajeros?: number | null
          registrado_por?: string
          sincronizado_en?: string
          terminal?: string
          trayecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planillas_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planillas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planillas_terminal_fkey"
            columns: ["terminal"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "planillas_trayecto_id_fkey"
            columns: ["trayecto_id"]
            isOneToOne: false
            referencedRelation: "trayectos"
            referencedColumns: ["id"]
          },
        ]
      }
      polilla_pasajeros: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          destino: string
          destino_sobrante: string
          estado: string
          facturado: boolean
          id: string
          monto_cobrado: number
          monto_facturado: number
          motivo_anulacion: string | null
          ocurrido_en: string
          registrado_por: string
          sincronizado_en: string
          sobrante: number | null
          terminal_facturacion: string | null
          tramo_id: string
          trayecto_id: string
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          destino: string
          destino_sobrante?: string
          estado?: string
          facturado?: boolean
          id?: string
          monto_cobrado: number
          monto_facturado?: number
          motivo_anulacion?: string | null
          ocurrido_en?: string
          registrado_por: string
          sincronizado_en?: string
          sobrante?: number | null
          terminal_facturacion?: string | null
          tramo_id: string
          trayecto_id: string
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          destino?: string
          destino_sobrante?: string
          estado?: string
          facturado?: boolean
          id?: string
          monto_cobrado?: number
          monto_facturado?: number
          motivo_anulacion?: string | null
          ocurrido_en?: string
          registrado_por?: string
          sincronizado_en?: string
          sobrante?: number | null
          terminal_facturacion?: string | null
          tramo_id?: string
          trayecto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "polilla_pasajeros_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polilla_pasajeros_destino_fkey"
            columns: ["destino"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "polilla_pasajeros_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polilla_pasajeros_terminal_facturacion_fkey"
            columns: ["terminal_facturacion"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "polilla_pasajeros_tramo_id_fkey"
            columns: ["tramo_id"]
            isOneToOne: false
            referencedRelation: "tramos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polilla_pasajeros_trayecto_id_fkey"
            columns: ["trayecto_id"]
            isOneToOne: false
            referencedRelation: "trayectos"
            referencedColumns: ["id"]
          },
        ]
      }
      programacion_salidas: {
        Row: {
          actualizado_en: string | null
          buseta_id: string
          cancelada_por_id: string | null
          creado_en: string
          creado_por: string | null
          estado: string
          fecha: string
          hora: string | null
          id: string
          notas: string | null
          sentido: string
          tipo: string
        }
        Insert: {
          actualizado_en?: string | null
          buseta_id: string
          cancelada_por_id?: string | null
          creado_en?: string
          creado_por?: string | null
          estado?: string
          fecha: string
          hora?: string | null
          id?: string
          notas?: string | null
          sentido: string
          tipo?: string
        }
        Update: {
          actualizado_en?: string | null
          buseta_id?: string
          cancelada_por_id?: string | null
          creado_en?: string
          creado_por?: string | null
          estado?: string
          fecha?: string
          hora?: string | null
          id?: string
          notas?: string | null
          sentido?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "programacion_salidas_buseta_id_fkey"
            columns: ["buseta_id"]
            isOneToOne: false
            referencedRelation: "busetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programacion_salidas_cancelada_por_id_fkey"
            columns: ["cancelada_por_id"]
            isOneToOne: false
            referencedRelation: "programacion_salidas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programacion_salidas_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repuesto_categorias: {
        Row: {
          activa: boolean
          id: number
          nombre: string
        }
        Insert: {
          activa?: boolean
          id?: never
          nombre: string
        }
        Update: {
          activa?: boolean
          id?: never
          nombre?: string
        }
        Relationships: []
      }
      repuestos: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          buseta_id: string
          categoria_id: number
          costo: number | null
          estado: string
          foto_path: string | null
          id: string
          kilometraje: number | null
          motivo_anulacion: string | null
          nombre: string
          notas: string | null
          ocurrido_en: string
          registrado_por: string
          sincronizado_en: string
          taller: string | null
          vuelta_id: string | null
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          buseta_id: string
          categoria_id: number
          costo?: number | null
          estado?: string
          foto_path?: string | null
          id?: string
          kilometraje?: number | null
          motivo_anulacion?: string | null
          nombre: string
          notas?: string | null
          ocurrido_en?: string
          registrado_por: string
          sincronizado_en?: string
          taller?: string | null
          vuelta_id?: string | null
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          buseta_id?: string
          categoria_id?: number
          costo?: number | null
          estado?: string
          foto_path?: string | null
          id?: string
          kilometraje?: number | null
          motivo_anulacion?: string | null
          nombre?: string
          notas?: string | null
          ocurrido_en?: string
          registrado_por?: string
          sincronizado_en?: string
          taller?: string | null
          vuelta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repuestos_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repuestos_buseta_id_fkey"
            columns: ["buseta_id"]
            isOneToOne: false
            referencedRelation: "busetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repuestos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "repuesto_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repuestos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repuestos_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: false
            referencedRelation: "reporte_vueltas"
            referencedColumns: ["vuelta_id"]
          },
          {
            foreignKeyName: "repuestos_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: false
            referencedRelation: "vueltas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarifas: {
        Row: {
          creado_en: string
          creado_por: string | null
          destino: string
          id: string
          origen: string
          precio: number
          vigente_desde: string
        }
        Insert: {
          creado_en?: string
          creado_por?: string | null
          destino: string
          id?: string
          origen: string
          precio: number
          vigente_desde?: string
        }
        Update: {
          creado_en?: string
          creado_por?: string | null
          destino?: string
          id?: string
          origen?: string
          precio?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarifas_creado_por_fkey"
            columns: ["creado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarifas_destino_fkey"
            columns: ["destino"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "tarifas_origen_fkey"
            columns: ["origen"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
        ]
      }
      terminales: {
        Row: {
          codigo: string
          nombre: string
        }
        Insert: {
          codigo: string
          nombre: string
        }
        Update: {
          codigo?: string
          nombre?: string
        }
        Relationships: []
      }
      tramos: {
        Row: {
          destino: string
          id: string
          orden: number
          origen: string
          sentido: string
        }
        Insert: {
          destino: string
          id: string
          orden: number
          origen: string
          sentido: string
        }
        Update: {
          destino?: string
          id?: string
          orden?: number
          origen?: string
          sentido?: string
        }
        Relationships: [
          {
            foreignKeyName: "tramos_destino_fkey"
            columns: ["destino"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "tramos_origen_fkey"
            columns: ["origen"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
        ]
      }
      trayectos: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          fecha: string
          hora_salida: string | null
          id: string
          ocurrido_en: string
          registrado_por: string
          sentido: string
          sincronizado_en: string
          terminal_fin: string | null
          vuelta_id: string
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          fecha: string
          hora_salida?: string | null
          id?: string
          ocurrido_en?: string
          registrado_por: string
          sentido: string
          sincronizado_en?: string
          terminal_fin?: string | null
          vuelta_id: string
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          fecha?: string
          hora_salida?: string | null
          id?: string
          ocurrido_en?: string
          registrado_por?: string
          sentido?: string
          sincronizado_en?: string
          terminal_fin?: string | null
          vuelta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trayectos_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trayectos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trayectos_terminal_fin_fkey"
            columns: ["terminal_fin"]
            isOneToOne: false
            referencedRelation: "terminales"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "trayectos_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: false
            referencedRelation: "reporte_vueltas"
            referencedColumns: ["vuelta_id"]
          },
          {
            foreignKeyName: "trayectos_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: false
            referencedRelation: "vueltas"
            referencedColumns: ["id"]
          },
        ]
      }
      vuelta_cierres: {
        Row: {
          cerrado_en: string
          cerrado_por: string
          efectivo_entregado: number
          notas: string | null
          vuelta_id: string
        }
        Insert: {
          cerrado_en?: string
          cerrado_por?: string
          efectivo_entregado: number
          notas?: string | null
          vuelta_id: string
        }
        Update: {
          cerrado_en?: string
          cerrado_por?: string
          efectivo_entregado?: number
          notas?: string | null
          vuelta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vuelta_cierres_cerrado_por_fkey"
            columns: ["cerrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vuelta_cierres_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: true
            referencedRelation: "reporte_vueltas"
            referencedColumns: ["vuelta_id"]
          },
          {
            foreignKeyName: "vuelta_cierres_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: true
            referencedRelation: "vueltas"
            referencedColumns: ["id"]
          },
        ]
      }
      vuelta_cierres_reemplazados: {
        Row: {
          cerrado_en: string | null
          cerrado_por: string | null
          efectivo_entregado: number
          id: string
          motivo: string
          notas: string | null
          reabierto_en: string
          reabierto_por: string
          vuelta_id: string
        }
        Insert: {
          cerrado_en?: string | null
          cerrado_por?: string | null
          efectivo_entregado: number
          id?: string
          motivo: string
          notas?: string | null
          reabierto_en?: string
          reabierto_por: string
          vuelta_id: string
        }
        Update: {
          cerrado_en?: string | null
          cerrado_por?: string | null
          efectivo_entregado?: number
          id?: string
          motivo?: string
          notas?: string | null
          reabierto_en?: string
          reabierto_por?: string
          vuelta_id?: string
        }
        Relationships: []
      }
      vuelta_gastos_fijos: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          concepto: string
          id: string
          se_paga_en_ruta: boolean
          valor: number
          vuelta_id: string
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          concepto: string
          id?: string
          se_paga_en_ruta: boolean
          valor: number
          vuelta_id: string
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          concepto?: string
          id?: string
          se_paga_en_ruta?: boolean
          valor?: number
          vuelta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vuelta_gastos_fijos_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vuelta_gastos_fijos_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: false
            referencedRelation: "reporte_vueltas"
            referencedColumns: ["vuelta_id"]
          },
          {
            foreignKeyName: "vuelta_gastos_fijos_vuelta_id_fkey"
            columns: ["vuelta_id"]
            isOneToOne: false
            referencedRelation: "vueltas"
            referencedColumns: ["id"]
          },
        ]
      }
      vueltas: {
        Row: {
          actualizado_en: string | null
          actualizado_por: string | null
          buseta_id: string
          conductor_florencia_id: string | null
          conductor_pitalito_id: string | null
          estado: string
          fecha_inicio: string
          id: string
          notas: string | null
          ocurrido_en: string
          registrado_por: string
          salida_programada_id: string | null
          sincronizado_en: string
          tipo: string
        }
        Insert: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          buseta_id: string
          conductor_florencia_id?: string | null
          conductor_pitalito_id?: string | null
          estado?: string
          fecha_inicio: string
          id?: string
          notas?: string | null
          ocurrido_en?: string
          registrado_por: string
          salida_programada_id?: string | null
          sincronizado_en?: string
          tipo?: string
        }
        Update: {
          actualizado_en?: string | null
          actualizado_por?: string | null
          buseta_id?: string
          conductor_florencia_id?: string | null
          conductor_pitalito_id?: string | null
          estado?: string
          fecha_inicio?: string
          id?: string
          notas?: string | null
          ocurrido_en?: string
          registrado_por?: string
          salida_programada_id?: string | null
          sincronizado_en?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "vueltas_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vueltas_buseta_id_fkey"
            columns: ["buseta_id"]
            isOneToOne: false
            referencedRelation: "busetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vueltas_conductor_florencia_id_fkey"
            columns: ["conductor_florencia_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vueltas_conductor_pitalito_id_fkey"
            columns: ["conductor_pitalito_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vueltas_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vueltas_salida_programada_fk"
            columns: ["salida_programada_id"]
            isOneToOne: false
            referencedRelation: "programacion_salidas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      reporte_vueltas: {
        Row: {
          buseta_id: string | null
          cerrado_en: string | null
          conductor_florencia_id: string | null
          conductor_pitalito_id: string | null
          diferencia_cuadre: number | null
          efectivo_entregado: number | null
          efectivo_esperado: number | null
          estado: string | null
          fecha_inicio: string | null
          gastos_fijos: number | null
          gastos_minimos: number | null
          gastos_variables: number | null
          ingreso_encomiendas: number | null
          ingreso_planillas: number | null
          ingreso_polilla: number | null
          ingreso_real: number | null
          liquidacion: number | null
          quedo_conductor: number | null
          tipo: string | null
          vuelta_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vueltas_buseta_id_fkey"
            columns: ["buseta_id"]
            isOneToOne: false
            referencedRelation: "busetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vueltas_conductor_florencia_id_fkey"
            columns: ["conductor_florencia_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vueltas_conductor_pitalito_id_fkey"
            columns: ["conductor_pitalito_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cerrar_vuelta: {
        Args: {
          p_efectivo_entregado: number
          p_notas?: string
          p_vuelta: string
        }
        Returns: undefined
      }
      reabrir_vuelta_cerrada: {
        Args: { p_motivo: string; p_vuelta: string }
        Returns: undefined
      }
      registrar_salida_adicional: {
        Args: {
          p_buseta: string
          p_fecha: string
          p_hora?: string
          p_notas?: string
          p_sentido?: string
        }
        Returns: string
      }
      unirse_a_vuelta: {
        Args: { p_puesto: string; p_vuelta: string }
        Returns: undefined
      }
      vencimientos_buseta: {
        Args: never
        Returns: {
          buseta_id: string
          fecha_pago: string
          fecha_recordatorio: string
          fecha_vencimiento: string
          id: string
          nombre: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
