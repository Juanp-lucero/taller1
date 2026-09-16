self.onmessage = async function (event) {
  const { file, start, end, workerId, fileType } = event.data;

  try {
    const chunk = file.slice(start, end);
    const text = await chunk.text();

    const lines = text.split(/\r?\n/);

    let processedLines = 0;
    let validRecords = 0;
    let emptyKwh = 0;
    let invalidRecords = 0;

    const meters = new Set();
    let pendingLine = "";

    for (let index = 0; index < lines.length; index++) {
      let line = lines[index];

      if (index === 0 && start !== 0) {
        pendingLine = line;
        continue;
      }

      if (pendingLine) {
        line = pendingLine + line;
        pendingLine = "";
      }

      if (!line.trim()) {
        continue;
      }

      processedLines++;

      const columns = line.split(",");

      if (fileType === "readings") {
        if (columns.length < 5) {
          invalidRecords++;
          continue;
        }

        const meterId = columns[0]?.trim();
        const kwh = columns[2]?.trim();

        if (!meterId) {
          invalidRecords++;
          continue;
        }

        meters.add(meterId);

        if (kwh === "") {
          emptyKwh++;
        }

        validRecords++;
      }

      if (fileType === "topology") {
        if (columns.length < 5) {
          invalidRecords++;
          continue;
        }

        validRecords++;
      }
    }

    self.postMessage({
      type: "completed",
      workerId,
      start,
      end,
      processedLines,
      validRecords,
      emptyKwh,
      invalidRecords,
      meters: Array.from(meters)
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      workerId,
      message: error.message || "Error desconocido en Worker"
    });
  }
};