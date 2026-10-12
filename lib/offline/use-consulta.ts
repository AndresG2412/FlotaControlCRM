"use client";

import { liveQuery } from "dexie";
import { useEffect, useState, type DependencyList } from "react";

/**
 * Consulta reactiva a la base local: se vuelve a ejecutar cuando cambian los
 * datos que lee. undefined mientras carga.
 */
export function useConsulta<T>(consulta: () => Promise<T>, deps: DependencyList): T | undefined {
  const [valor, setValor] = useState<T>();
  useEffect(() => {
    const s = liveQuery(consulta).subscribe({ next: setValor, error: () => undefined });
    return () => s.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps las define quien llama
  }, deps);
  return valor;
}
