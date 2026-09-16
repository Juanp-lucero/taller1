"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type FileKind = "readings" | "topology";

type SelectedFile = {
  file: File | null;
  name: string;
  size: number;
  type: FileKind;
};

type ProcessingStats = {
  totalBytes: number;
  processedBytes: number;
  processedLines: number;
  validRecords: number;
  emptyKwh: number;
  invalidRecords: number;
  uniqueMeters: number;
  elapsedMs: number;
};

type WorkerResult = {
  workerId: number;
  start: number;
  end: number;
  processedLines: number;
  validRecords: number;
  emptyKwh: number;
  invalidRecords: number;
  meters: string[];
};

const BLOCK_SIZE = 1024 * 1024 * 4;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds} ms`;
  }

  return `${(milliseconds / 1000).toFixed(2)} s`;
}

export default function HomePage() {
  const [readingsFile, setReadingsFile] = useState<SelectedFile>({
    file: null,
    name: "Ningún archivo seleccionado",
    size: 0,
    type: "readings",
  });

  const [topologyFile, setTopologyFile] = useState<SelectedFile>({
    file: null,
    name: "Ningún archivo seleccionado",
    size: 0,
    type: "topology",
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    "Esperando archivos para iniciar la auditoría"
  );

  const [progress, setProgress] = useState(0);
  const [activeWorkers, setActiveWorkers] = useState(0);
  const [totalWorkers, setTotalWorkers] = useState(0);

  const [stats, setStats] = useState<ProcessingStats>({
    totalBytes: 0,
    processedBytes: 0,
    processedLines: 0,
    validRecords: 0,
    emptyKwh: 0,
    invalidRecords: 0,
    uniqueMeters: 0,
    elapsedMs: 0,
  });

  const [hasResults, setHasResults] = useState(false);

  const workersRef = useRef<Worker[]>([]);
  const metersRef = useRef<Set<string>>(new Set());
  const startTimeRef = useRef<number>(0);

  const hardwareWorkers = useMemo(() => {
    if (typeof navigator === "undefined") {
      return 2;
    }

    const cores = navigator.hardwareConcurrency || 4;

    return Math.max(2, Math.min(cores - 1, 8));
  }, []);

  useEffect(() => {
    setTotalWorkers(hardwareWorkers);
  }, [hardwareWorkers]);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
    type: FileKind
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const fileData: SelectedFile = {
      file: selectedFile,
      name: selectedFile.name,
      size: selectedFile.size,
      type,
    };

    if (type === "readings") {
      setReadingsFile(fileData);
    } else {
      setTopologyFile(fileData);
    }

    setHasResults(false);
    setStatusMessage(`Archivo ${selectedFile.name} seleccionado`);
  }

  function clearWorkers() {
    workersRef.current.forEach((worker) => {
      worker.terminate();
    });

    workersRef.current = [];
  }

  function resetStats() {
    setStats({
      totalBytes: 0,
      processedBytes: 0,
      processedLines: 0,
      validRecords: 0,
      emptyKwh: 0,
      invalidRecords: 0,
      uniqueMeters: 0,
      elapsedMs: 0,
    });

    setProgress(0);
    setActiveWorkers(0);
    metersRef.current = new Set();
  }

  async function processFile(
    file: File,
    fileType: FileKind,
    workerCount: number
  ): Promise<{
    processedLines: number;
    validRecords: number;
    emptyKwh: number;
    invalidRecords: number;
    uniqueMeters: number;
    elapsedMs: number;
  }> {
    return new Promise((resolve, reject) => {
      const totalBytes = file.size;
      const totalBlocks = Math.ceil(totalBytes / BLOCK_SIZE);

      let nextBlock = 0;
      let completedBlocks = 0;
      let processedLines = 0;
      let validRecords = 0;
      let emptyKwh = 0;
      let invalidRecords = 0;

      const localMeters = new Set<string>();
      const workers: Worker[] = [];

      const startedAt = performance.now();

      function assignNextBlock(worker: Worker, workerId: number) {
        if (nextBlock >= totalBlocks) {
          worker.terminate();

          const remainingWorkers = workers.filter(
            (currentWorker) => currentWorker !== worker
          );

          workers.length = 0;
          workers.push(...remainingWorkers);

          setActiveWorkers(workers.length);

          if (completedBlocks === totalBlocks) {
            const elapsedMs = Math.round(performance.now() - startedAt);

            resolve({
              processedLines,
              validRecords,
              emptyKwh,
              invalidRecords,
              uniqueMeters: localMeters.size,
              elapsedMs,
            });
          }

          return;
        }

        const blockIndex = nextBlock;
        nextBlock++;

        const start = blockIndex * BLOCK_SIZE;
        const end = Math.min(start + BLOCK_SIZE, totalBytes);

        worker.postMessage({
          file,
          start,
          end,
          workerId,
          fileType,
        });
      }

      for (let index = 0; index < workerCount; index++) {
        const worker = new Worker("/workers/csv-worker.js");

        workers.push(worker);

        worker.onmessage = (event: MessageEvent) => {
          const result = event.data;

          if (result.type === "error") {
            clearWorkers();
            reject(new Error(result.message));
            return;
          }

          if (result.type !== "completed") {
            return;
          }

          processedLines += result.processedLines;
          validRecords += result.validRecords;
          emptyKwh += result.emptyKwh;
          invalidRecords += result.invalidRecords;

          result.meters.forEach((meterId: string) => {
            localMeters.add(meterId);
          });

          completedBlocks++;

          const processedBytes = Math.min(
            completedBlocks * BLOCK_SIZE,
            totalBytes
          );

          const currentProgress = Math.round(
            (processedBytes / totalBytes) * 100
          );

          setProgress(currentProgress);

          setStats((previous) => ({
            ...previous,
            processedBytes,
            processedLines,
            validRecords,
            emptyKwh,
            invalidRecords,
            uniqueMeters: localMeters.size,
          }));

          assignNextBlock(worker, result.workerId);
        };

        worker.onerror = () => {
          clearWorkers();
          reject(new Error("Uno de los Workers falló durante el procesamiento"));
        };

        assignNextBlock(worker, index);
      }

      setActiveWorkers(workers.length);
    });
  }

  async function startAudit() {
    if (!readingsFile.file) {
      setStatusMessage("Selecciona primero el archivo lecturas_mes.csv");
      return;
    }

    setIsProcessing(true);
    setHasResults(false);
    resetStats();
    clearWorkers();

    startTimeRef.current = performance.now();

    try {
      const readings = readingsFile.file;

      setStatusMessage("Procesando lecturas con Worker Pool...");

      const readingsResult = await processFile(
        readings,
        "readings",
        hardwareWorkers
      );

      let topologyResult = {
        processedLines: 0,
        validRecords: 0,
        emptyKwh: 0,
        invalidRecords: 0,
        uniqueMeters: 0,
        elapsedMs: 0,
      };

      if (topologyFile.file) {
        setStatusMessage("Procesando archivo de topología...");

        topologyResult = await processFile(
          topologyFile.file,
          "topology",
          hardwareWorkers
        );
      }

      const elapsedMs = Math.round(performance.now() - startTimeRef.current);

      setStats({
        totalBytes: readings.size + (topologyFile.file?.size || 0),
        processedBytes: readings.size + (topologyFile.file?.size || 0),
        processedLines:
          readingsResult.processedLines + topologyResult.processedLines,
        validRecords:
          readingsResult.validRecords + topologyResult.validRecords,
        emptyKwh: readingsResult.emptyKwh,
        invalidRecords:
          readingsResult.invalidRecords + topologyResult.invalidRecords,
        uniqueMeters: readingsResult.uniqueMeters,
        elapsedMs,
      });

      setProgress(100);
      setHasResults(true);
      setStatusMessage(
        "Procesamiento terminado. Los resultados corresponden al análisis básico de archivos."
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido durante la auditoría";

      setStatusMessage(message);
    } finally {
      clearWorkers();
      setActiveWorkers(0);
      setIsProcessing(false);
    }
  }

  const readingsReady = Boolean(readingsFile.file);
  const topologyReady = Boolean(topologyFile.file);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">⚡</div>

          <div>
            <h1>GridAudit</h1>
            <span>Energy Intelligence</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a className="nav-item active" href="#dashboard">
            <span>▦</span>
            Dashboard
          </a>

          <a className="nav-item" href="#files">
            <span>▤</span>
            Archivos
          </a>

          <a className="nav-item" href="#processing">
            <span>◌</span>
            Procesamiento
          </a>

          <a className="nav-item" href="#results">
            <span>▥</span>
            Resultados
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            Sistema local activo
          </div>

          <small>Auditoría energética v1.0</small>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">PLATAFORMA DE AUDITORÍA</p>
            <h2>Auditoría de pérdidas de energía</h2>
            <p className="subtitle">
              Procesamiento local de lecturas y topología mediante
              procesamiento paralelo.
            </p>
          </div>

          <div className="header-badge">
            <span className="status-dot" />
            Offline ready
          </div>
        </header>

        <section id="dashboard" className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">RESUMEN OPERATIVO</p>
              <h3>Estado de la auditoría</h3>
            </div>

            <span className="tag">Fase 1 · Worker Pool</span>
          </div>

          <div className="metrics-grid">
            <article className="metric-card">
              <div className="metric-icon blue">◫</div>
              <div>
                <span>Bytes procesados</span>
                <strong>{formatBytes(stats.processedBytes)}</strong>
                <small>{formatBytes(stats.totalBytes)} totales</small>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon purple">⌘</div>
              <div>
                <span>Registros válidos</span>
                <strong>{formatNumber(stats.validRecords)}</strong>
                <small>Lecturas y topología</small>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon orange">◉</div>
              <div>
                <span>Medidores detectados</span>
                <strong>{formatNumber(stats.uniqueMeters)}</strong>
                <small>Identificadores únicos</small>
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-icon green">◷</div>
              <div>
                <span>Tiempo de ejecución</span>
                <strong>{formatDuration(stats.elapsedMs)}</strong>
                <small>Medición local</small>
              </div>
            </article>
          </div>
        </section>

        <section id="files" className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ENTRADA DE DATOS</p>
              <h3>Archivos de auditoría</h3>
            </div>

            <span className="tag">CSV local</span>
          </div>

          <div className="files-grid">
            <article className="file-card">
              <div className="file-card-header">
                <div className="file-title">
                  <div className="file-icon">▤</div>

                  <div>
                    <h4>Lecturas mensuales</h4>
                    <p>lecturas_mes.csv</p>
                  </div>
                </div>

                <span className={readingsReady ? "file-state ready" : "file-state"}>
                  {readingsReady ? "Listo" : "Pendiente"}
                </span>
              </div>

              <label className="upload-area">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(event) =>
                    handleFileChange(event, "readings")
                  }
                />

                <span className="upload-symbol">↑</span>
                <strong>Seleccionar archivo CSV</strong>
                <small>Lecturas horarias de medidores</small>
              </label>

              <div className="file-information">
                <span>{readingsFile.name}</span>
                <strong>{formatBytes(readingsFile.size)}</strong>
              </div>
            </article>

            <article className="file-card">
              <div className="file-card-header">
                <div className="file-title">
                  <div className="file-icon">⌘</div>

                  <div>
                    <h4>Topología de red</h4>
                    <p>topologia.csv</p>
                  </div>
                </div>

                <span className={topologyReady ? "file-state ready" : "file-state"}>
                  {topologyReady ? "Listo" : "Opcional"}
                </span>
              </div>

              <label className="upload-area">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(event) =>
                    handleFileChange(event, "topology")
                  }
                />

                <span className="upload-symbol">↑</span>
                <strong>Seleccionar archivo CSV</strong>
                <small>Jerarquía y vigencias de la red</small>
              </label>

              <div className="file-information">
                <span>{topologyFile.name}</span>
                <strong>{formatBytes(topologyFile.size)}</strong>
              </div>
            </article>
          </div>
        </section>

        <section id="processing" className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PROCESAMIENTO PARALELO</p>
              <h3>Monitor de ejecución</h3>
            </div>

            <span className="tag">
              {activeWorkers} / {totalWorkers} Workers activos
            </span>
          </div>

          <article className="processing-card">
            <div className="processing-header">
              <div>
                <h4>Worker Pool dinámico</h4>
                <p>
                  El archivo se divide en bloques y se distribuye entre
                  varios Workers del navegador.
                </p>
              </div>

              <div className="worker-counter">
                <strong>{totalWorkers}</strong>
                <span>Workers configurados</span>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-label">
                <span>Progreso de lectura</span>
                <strong>{progress}%</strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-value"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="processing-grid">
              <div>
                <span>Líneas procesadas</span>
                <strong>{formatNumber(stats.processedLines)}</strong>
              </div>

              <div>
                <span>Valores kWh vacíos</span>
                <strong>{formatNumber(stats.emptyKwh)}</strong>
              </div>

              <div>
                <span>Registros inválidos</span>
                <strong>{formatNumber(stats.invalidRecords)}</strong>
              </div>

              <div>
                <span>Bloques aproximados</span>
                <strong>
                  {readingsFile.file
                    ? Math.ceil(readingsFile.size / BLOCK_SIZE)
                    : 0}
                </strong>
              </div>
            </div>

            <div className="processing-footer">
              <div className="live-status">
                <span className={isProcessing ? "pulse-dot" : "status-dot"} />
                <span>{statusMessage}</span>
              </div>

              <button
                className="primary-button"
                onClick={startAudit}
                disabled={isProcessing || !readingsReady}
              >
                {isProcessing ? "Procesando..." : "Iniciar auditoría"}
                <span>→</span>
              </button>
            </div>
          </article>
        </section>

        <section id="results" className="section-block">
          <div className="section-heading">
            <div>
              <p className="eyebrow">RESULTADOS</p>
              <h3>Hallazgos del procesamiento</h3>
            </div>

            <span className="tag">Análisis básico</span>
          </div>

          {!hasResults ? (
            <article className="empty-results">
              <div className="empty-icon">⌁</div>
              <h4>Aún no hay resultados de auditoría</h4>
              <p>
                Carga los archivos e inicia el procesamiento para obtener
                métricas reales.
              </p>
            </article>
          ) : (
            <div className="results-grid">
              <article className="result-card">
                <span>Registros procesados</span>
                <strong>{formatNumber(stats.processedLines)}</strong>
                <small>Conteo obtenido desde los archivos</small>
              </article>

              <article className="result-card">
                <span>Registros inválidos</span>
                <strong>{formatNumber(stats.invalidRecords)}</strong>
                <small>Filas que no cumplen la estructura básica</small>
              </article>

              <article className="result-card">
                <span>Huecos kWh detectados</span>
                <strong>{formatNumber(stats.emptyKwh)}</strong>
                <small>Aún no imputados</small>
              </article>

              <article className="result-card">
                <span>Estado</span>
                <strong>Lectura completada</strong>
                <small>
                  Todavía no se calculan pérdidas ni anomalías
                </small>
              </article>
            </div>
          )}
        </section>

        <footer className="footer">
          <span>GridAudit · Auditoría energética local</span>
          <span>Fase 1: lectura paralela con Web Workers</span>
        </footer>
      </section>
    </main>
  );
}