const startRecordingButton = document.getElementById("startRecording");
const stopRecordingButton = document.getElementById("stopRecording");
const generateReportButton = document.getElementById("generateReport");
const submitReportButton = document.getElementById("submitReport");
const clearReportButton = document.getElementById("clearReport");
const downloadDocButton = document.getElementById("downloadDoc");
const downloadPdfButton = document.getElementById("downloadPdf");
const transcriptionArea = document.getElementById("transcription");
const reportEditor = document.getElementById("reportEditor");
const transcriptionBadge = document.getElementById("transcriptionBadge");
const reportBadge = document.getElementById("reportBadge");
const statusValue = document.querySelector(".status-value");
const confidenceScore = document.getElementById("confidenceScore");
const reportList = document.getElementById("reportList");
const searchInput = document.getElementById("searchInput");

let mediaRecorder;
let audioChunks = [];
let reports = [];

const REPORTS_KEY = "prs_reports";

const loadReports = () => {
  const stored = localStorage.getItem(REPORTS_KEY);
  reports = stored ? JSON.parse(stored) : [];
  renderReports(reports);
};

const saveReports = () => {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
};

const setStatus = (label, detail) => {
  statusValue.textContent = label;
  transcriptionBadge.textContent = detail;
};

const updateButtons = (state) => {
  startRecordingButton.disabled = state === "recording";
  stopRecordingButton.disabled = state !== "recording";
  generateReportButton.disabled = state !== "transcribed";
  submitReportButton.disabled = state !== "report-ready";
  clearReportButton.disabled = state === "idle";
};

const formatTranscript = (lengthSeconds) =>
  `Officer statement captured for ${lengthSeconds} seconds. Key points: Scene secured, witness statements collected, evidence logged, and follow-up requested.`;

const generateReportFromTranscript = (transcript) => {
  const now = new Date();
  return `Incident Report\n\nDate/Time: ${now.toLocaleString()}\nOfficer: [Name] | Badge: [ID]\nLocation: [Location]\nIncident Type: [Type]\n\nNarrative Summary:\n${transcript}\n\nActions Taken:\n- Scene stabilized and secured.\n- Witnesses identified and interviewed.\n- Evidence documented and tagged.\n- Follow-up recommended for supervisor review.\n\nNext Steps:\n- Upload attachments and media.\n- Submit for supervisor approval.`;
};

const renderReports = (items) => {
  reportList.innerHTML = "";
  if (!items.length) {
    reportList.innerHTML =
      "<p class=\"hint\">No reports yet. Your submitted reports will appear here.</p>";
    return;
  }

  items.forEach((report) => {
    const card = document.createElement("div");
    card.className = "report-item";
    card.innerHTML = `
      <h4>${report.title}</h4>
      <p>${report.summary}</p>
      <p><strong>${report.date}</strong> • ${report.tags.join(" · ")}</p>
    `;
    reportList.appendChild(card);
  });
};

const filterReports = (query) => {
  const normalized = query.toLowerCase();
  const filtered = reports.filter((report) =>
    [report.title, report.summary, report.tags.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
  renderReports(filtered);
};

const createPdfBlob = (content) => {
  const pdfHeader = `%PDF-1.3\n`;
  const textStream = `BT /F1 12 Tf 50 750 Td (${content.replace(
    /[()]/g,
    ""
  )}) Tj ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${textStream.length} >> stream\n${textStream}\nendstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];
  let offset = pdfHeader.length;
  const xref = ["0000000000 65535 f \n"];

  objects.forEach((obj) => {
    xref.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    offset += obj.length;
  });

  const xrefStart = offset;
  const trailer = `xref\n0 ${objects.length + 1}\n${xref.join("")}trailer << /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdfContent = pdfHeader + objects.join("") + trailer;
  return new Blob([pdfContent], { type: "application/pdf" });
};

const downloadFile = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

startRecordingButton.addEventListener("click", async () => {
  audioChunks = [];
  setStatus("Recording", "Listening");
  transcriptionArea.value = "";
  reportEditor.value = "";
  reportBadge.textContent = "Draft";
  confidenceScore.textContent = "--";
  updateButtons("recording");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.onstop = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  mediaRecorder.start();
});

stopRecordingButton.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  setStatus("Transcribing", "Processing");
  transcriptionBadge.textContent = "Processing";
  const duration = Math.max(12, Math.floor(audioChunks.length * 3));

  setTimeout(() => {
    transcriptionArea.value = formatTranscript(duration);
    transcriptionBadge.textContent = "Ready";
    confidenceScore.textContent = "94%";
    updateButtons("transcribed");
    setStatus("Ready", "Transcribed");
  }, 1000);
});

generateReportButton.addEventListener("click", () => {
  const transcript = transcriptionArea.value.trim();
  if (!transcript) {
    return;
  }
  reportEditor.value = generateReportFromTranscript(transcript);
  reportBadge.textContent = "Review";
  updateButtons("report-ready");
});

submitReportButton.addEventListener("click", () => {
  const content = reportEditor.value.trim();
  if (!content) {
    return;
  }
  const report = {
    id: crypto.randomUUID(),
    title: content.split("\n")[0] || "Incident Report",
    summary: content.slice(0, 140) + "...",
    date: new Date().toLocaleString(),
    tags: ["Submitted", "Audio", "Patrol"],
    content,
  };
  reports = [report, ...reports];
  saveReports();
  renderReports(reports);
  reportBadge.textContent = "Submitted";
  downloadDocButton.disabled = false;
  downloadPdfButton.disabled = false;
});

clearReportButton.addEventListener("click", () => {
  transcriptionArea.value = "";
  reportEditor.value = "";
  reportBadge.textContent = "Draft";
  transcriptionBadge.textContent = "Idle";
  confidenceScore.textContent = "--";
  updateButtons("idle");
  setStatus("Ready", "Idle");
});

downloadDocButton.addEventListener("click", () => {
  const content = reportEditor.value.trim();
  if (!content) {
    return;
  }
  const docContent = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\"></head><body><pre>${content}</pre></body></html>`;
  const blob = new Blob([docContent], {
    type: "application/msword",
  });
  downloadFile(blob, "incident-report.doc");
});

downloadPdfButton.addEventListener("click", () => {
  const content = reportEditor.value.trim();
  if (!content) {
    return;
  }
  const blob = createPdfBlob(content);
  downloadFile(blob, "incident-report.pdf");
});

searchInput.addEventListener("input", (event) => {
  filterReports(event.target.value);
});

loadReports();
updateButtons("idle");
