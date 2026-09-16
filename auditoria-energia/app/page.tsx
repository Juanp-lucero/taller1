
"use client";

import { useState } from "react";

type FileStatus = {
  name: string;
  size: string;
  loaded: boolean;
};

export default function Home() {
  const [readingsFile, setReadingsFile] = useState<FileStatus | null>(null);
  const [topologyFile, setTopologyFile] = useState<FileStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    "Esperando archivos para iniciar la auditoría"
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleReadingsUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setReadingsFile({
      name: file.name,
      size: formatFileSize(file.size),
      loaded: true,
    });

    setMessage("Archivo de lecturas cargado correctamente");
  };

  const handleTopologyUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setTopologyFile({
      name: file.name,
      size: formatFileSize(file.size),
      loaded: true,
    });

    setMessage("Archivo de topología cargado correctamente");
  };

  const startAudit = () => {
    if (!readingsFile || !topologyFile) {
      setMessage("Debes cargar los dos archivos CSV antes de continuar");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setMessage("Preparando archivos para el procesamiento...");

    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsProcessing(false);
        setMessage(
          "Archivos validados. El motor de análisis estará disponible en la siguiente fase."
        );
      }
    }, 250);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-xl font-bold text-slate-950">
              ⚡
            </div>

            <div>
              <h1 className="text-xl font-bold">
                EnergyAudit
              </h1>

              <p className="text-sm text-slate-400">
                Plataforma de auditoría energética
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Procesamiento local
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Introduction */}
        <section className="mb-8">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-emerald-400">
            Centro de control
          </p>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Auditoría de pérdidas de energía
          </h2>

          <p className="mt-3 max-w-3xl text-slate-400">
            Analiza las lecturas de los medidores y la topología eléctrica
            para identificar pérdidas no explicadas y preparar el plan de
            inspección semanal.
          </p>
        </section>

        {/* Statistics */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Clientes registrados</p>
            <p className="mt-2 text-3xl font-bold">260.000</p>
            <p className="mt-2 text-xs text-slate-500">
              Capacidad del sistema
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Lecturas del mes</p>
            <p className="mt-2 text-3xl font-bold">20 M</p>
            <p className="mt-2 text-xs text-slate-500">
              Aproximadamente
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Horas analizadas</p>
            <p className="mt-2 text-3xl font-bold">720</p>
            <p className="mt-2 text-xs text-slate-500">
              Mes de referencia
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Transformadores</p>
            <p className="mt-2 text-3xl font-bold">—</p>
            <p className="mt-2 text-xs text-slate-500">
              Pendiente de análisis
            </p>
          </div>
        </section>

        {/* Main content */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Upload panel */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-xl font-semibold">
                Cargar archivos de auditoría
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Selecciona los archivos desde tu computador. Los datos se
                procesarán localmente en el navegador.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Readings file */}
              <label className="cursor-pointer rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 transition hover:border-emerald-500">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-3xl">📄</span>

                  {readingsFile && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                      Cargado
                    </span>
                  )}
                </div>

                <h4 className="font-semibold">Lecturas del mes</h4>

                <p className="mt-2 text-sm text-slate-400">
                  lecturas_mes.csv
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  Archivo con las lecturas horarias de los medidores.
                </p>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-5 block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:font-medium file:text-slate-950 hover:file:bg-emerald-400"
                  onChange={handleReadingsUpload}
                />

                {readingsFile && (
                  <div className="mt-4 rounded-lg bg-slate-900 p-3">
                    <p className="break-all text-sm text-emerald-400">
                      {readingsFile.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {readingsFile.size}
                    </p>
                  </div>
                )}
              </label>

              {/* Topology file */}
              <label className="cursor-pointer rounded-xl border border-dashed border-slate-700 bg-slate-950 p-5 transition hover:border-emerald-500">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-3xl">🗺️</span>

                  {topologyFile && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                      Cargado
                    </span>
                  )}
                </div>

                <h4 className="font-semibold">Topología eléctrica</h4>

                <p className="mt-2 text-sm text-slate-400">
                  topologia.csv
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  Archivo con las relaciones jerárquicas de la red.
                </p>

                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="mt-5 block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-3 file:py-2 file:font-medium file:text-slate-950 hover:file:bg-emerald-400"
                  onChange={handleTopologyUpload}
                />

                {topologyFile && (
                  <div className="mt-4 rounded-lg bg-slate-900 p-3">
                    <p className="break-all text-sm text-emerald-400">
                      {topologyFile.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {topologyFile.size}
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Start button */}
            <div className="mt-6">
              <button
                onClick={startAudit}
                disabled={
                  isProcessing || !readingsFile || !topologyFile
                }
                className="w-full rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
              >
                {isProcessing
                  ? "Validando archivos..."
                  : "Iniciar auditoría"}
              </button>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-slate-400">Estado del proceso</span>
                <span className="font-medium text-emerald-400">
                  {progress}%
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="mt-3 text-sm text-slate-400">
                {message}
              </p>
            </div>
          </div>

          {/* System status */}
          <aside className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-xl font-semibold">
              Estado del sistema
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              Componentes de la plataforma
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">
                  Aplicación Next.js
                </span>

                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                  Activo
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">
                  Procesamiento local
                </span>

                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                  Preparado
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">
                  Web Workers
                </span>

                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                  Pendiente
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">
                  Índice de medidores
                </span>

                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                  Pendiente
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">
                  Motor estadístico
                </span>

                <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                  Pendiente
                </span>
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-slate-700 bg-slate-950 p-4">
              <p className="text-sm font-medium text-slate-300">
                Seguridad de los datos
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Los archivos seleccionados no se envían a un servidor
                mediante este formulario. La lectura y el análisis real
                se implementarán en el navegador.
              </p>
            </div>
          </aside>
        </section>

        {/* Ranking preview */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl font-semibold">
                Ranking de transformadores
              </h3>

              <p className="mt-2 text-sm text-slate-400">
                Los 200 transformadores con mayor pérdida acumulada no
                explicada.
              </p>
            </div>

            <span className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-400">
              Sin resultados todavía
            </span>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Posición</th>
                  <th className="px-4 py-3">Transformador</th>
                  <th className="px-4 py-3">Pérdida acumulada</th>
                  <th className="px-4 py-3">Estado</th>
                </tr>
              </thead>

              <tbody>
                {[1, 2, 3].map((position) => (
                  <tr
                    key={position}
                    className="border-b border-slate-800/70"
                  >
                    <td className="px-4 py-4 text-slate-500">
                      {position}
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      —
                    </td>

                    <td className="px-4 py-4 text-slate-500">
                      —
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
                        Pendiente
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-800 py-6 text-center text-sm text-slate-500">
          EnergyAudit · Caso de estudio de Ingeniería de Software
        </footer>
      </div>
    </main>
  );
}