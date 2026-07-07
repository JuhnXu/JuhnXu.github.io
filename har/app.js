const state = {
  fileName: "",
  rawHar: null,
  extracted: null,
  rows: [],
  filteredRows: [],
};

const els = {
  fileInput: document.querySelector("#harFile"),
  dropZone: document.querySelector("#dropZone"),
  fileMeta: document.querySelector("#fileMeta"),
  resultTitle: document.querySelector("#resultTitle"),
  pageCount: document.querySelector("#pageCount"),
  entryCount: document.querySelector("#entryCount"),
  successRate: document.querySelector("#successRate"),
  totalSize: document.querySelector("#totalSize"),
  previewMeta: document.querySelector("#previewMeta"),
  previewBody: document.querySelector("#previewBody"),
  rowTemplate: document.querySelector("#rowTemplate"),
  searchInput: document.querySelector("#searchInput"),
  typeFilter: document.querySelector("#typeFilter"),
  downloadBtn: document.querySelector("#downloadBtn"),
  copyBtn: document.querySelector("#copyBtn"),
  downloadAssetsBtn: document.querySelector("#downloadAssetsBtn"),
  includeHeaders: document.querySelector("#includeHeaders"),
  includeCookies: document.querySelector("#includeCookies"),
  includePayload: document.querySelector("#includePayload"),
  includeBody: document.querySelector("#includeBody"),
};

const optionControls = [
  els.includeHeaders,
  els.includeCookies,
  els.includePayload,
  els.includeBody,
];

els.fileInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    loadHarFile(file);
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("drag-over");
  });
});

els.dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (file) {
    loadHarFile(file);
  }
});

els.searchInput.addEventListener("input", applyFilters);
els.typeFilter.addEventListener("change", applyFilters);
optionControls.forEach((control) => {
  control.addEventListener("change", () => {
    if (state.rawHar) {
      rebuildExtraction();
    }
  });
});

document.querySelectorAll("input[name='format']").forEach((input) => {
  input.addEventListener("change", () => {
    if (state.extracted) {
      updateDownloadName();
    }
  });
});

els.downloadBtn.addEventListener("click", downloadOutput);
els.downloadAssetsBtn.addEventListener("click", downloadAssetsZip);
els.copyBtn.addEventListener("click", copyJson);

async function loadHarFile(file) {
  try {
    els.fileMeta.textContent = `读取中: ${file.name}`;
    const text = await file.text();
    const parsed = JSON.parse(text);
    validateHar(parsed);

    state.fileName = file.name.replace(/\.[^.]+$/, "");
    state.rawHar = parsed;
    rebuildExtraction();
  } catch (error) {
    resetData();
    els.fileMeta.textContent = "文件解析失败";
    els.resultTitle.textContent = "无法读取这个 HAR 文件";
    renderEmpty(error.message || "请确认文件是有效 HAR / JSON");
  }
}

function validateHar(data) {
  if (!data || typeof data !== "object" || !data.log || !Array.isArray(data.log.entries)) {
    throw new Error("请导入包含 log.entries 的 HAR 文件");
  }
}

function rebuildExtraction() {
  const extracted = extractHar(state.rawHar);
  state.extracted = extracted;
  state.rows = extracted.entries;
  applyFilters();
  renderStats(extracted);
  updateDownloadName();
  setEnabled(true);
}

function extractHar(har) {
  const pages = (har.log.pages || []).map((page) => ({
    id: page.id || "",
    title: page.title || "",
    startedDateTime: page.startedDateTime || "",
    pageTimings: page.pageTimings || {},
  }));

  const pageById = new Map(pages.map((page) => [page.id, page]));
  const entries = har.log.entries.map((entry, index) => normalizeEntry(entry, index, pageById));
  const successCount = entries.filter((entry) => entry.status >= 200 && entry.status < 400).length;
  const totalBytes = entries.reduce((sum, entry) => sum + Math.max(0, entry.size.bytes || 0), 0);

  return {
    source: {
      fileName: state.fileName,
      exportedAt: new Date().toISOString(),
      harVersion: har.log.version || "",
      creator: har.log.creator || {},
      browser: har.log.browser || {},
    },
    summary: {
      pageCount: pages.length,
      entryCount: entries.length,
      successCount,
      successRate: entries.length ? Number(((successCount / entries.length) * 100).toFixed(2)) : 0,
      totalBytes,
    },
    pages,
    entries,
  };
}

function normalizeEntry(entry, index, pageById) {
  const request = entry.request || {};
  const response = entry.response || {};
  const content = response.content || {};
  const page = pageById.get(entry.pageref) || {};
  const url = request.url || "";
  const mimeType = content.mimeType || getHeader(response.headers, "content-type") || "";
  const type = detectType(mimeType, url);
  const status = Number(response.status || 0);
  const body = getResponseBody(content, type, mimeType);

  const normalized = {
    index: index + 1,
    pageRef: entry.pageref || "",
    pageTitle: page.title || "",
    startedDateTime: entry.startedDateTime || "",
    type,
    method: request.method || "",
    status,
    statusText: response.statusText || "",
    url,
    domain: safeDomain(url),
    mimeType,
    timings: {
      blocked: numberOrNull(entry.timings?.blocked),
      dns: numberOrNull(entry.timings?.dns),
      connect: numberOrNull(entry.timings?.connect),
      ssl: numberOrNull(entry.timings?.ssl),
      send: numberOrNull(entry.timings?.send),
      wait: numberOrNull(entry.timings?.wait),
      receive: numberOrNull(entry.timings?.receive),
      total: numberOrNull(entry.time),
    },
    size: {
      bodyBytes: numberOrZero(response.bodySize),
      headerBytes: numberOrZero(response.headersSize),
      bytes: numberOrZero(response.bodySize) + numberOrZero(response.headersSize),
    },
    request: {
      queryString: compactNameValueList(request.queryString),
    },
    response: {
      redirectURL: response.redirectURL || "",
    },
  };

  if (els.includeHeaders.checked) {
    normalized.request.headers = compactNameValueList(request.headers);
    normalized.response.headers = compactNameValueList(response.headers);
  }

  if (els.includeCookies.checked) {
    normalized.request.cookies = compactNameValueList(request.cookies);
    normalized.response.cookies = compactNameValueList(response.cookies);
  }

  if (els.includePayload.checked && request.postData) {
    normalized.request.postData = {
      mimeType: request.postData.mimeType || "",
      text: request.postData.text || "",
      params: compactNameValueList(request.postData.params),
    };
  }

  if (els.includeBody.checked) {
    normalized.response.content = {
      mimeType,
      encoding: content.encoding || "",
      text: body.text,
      truncated: body.truncated,
      skipped: body.skipped,
    };
  }

  return normalized;
}

function getResponseBody(content, type, mimeType) {
  if (!content || typeof content.text !== "string") {
    return { text: "", truncated: false, skipped: "" };
  }

  if (!isTextContent(type, mimeType)) {
    return { text: "", truncated: false, skipped: "binary-resource" };
  }

  const limit = 500000;
  let text = content.text;

  if (content.encoding === "base64") {
    try {
      text = decodeBase64(content.text);
    } catch {
      text = content.text;
    }
  }

  return {
    text: text.slice(0, limit),
    truncated: text.length > limit,
    skipped: "",
  };
}

function decodeBase64(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function isTextContent(type, mimeType) {
  const lowerMime = mimeType.toLowerCase();
  return ["document", "xhr", "script", "style"].includes(type)
    || lowerMime.startsWith("text/")
    || lowerMime.includes("json")
    || lowerMime.includes("xml")
    || lowerMime.includes("javascript")
    || lowerMime.includes("css")
    || lowerMime.includes("html")
    || lowerMime.includes("x-www-form-urlencoded");
}

function compactNameValueList(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return list.map((item) => ({
    name: item.name || "",
    value: item.value || "",
  }));
}

function getHeader(headers, target) {
  if (!Array.isArray(headers)) {
    return "";
  }

  const found = headers.find((header) => (header.name || "").toLowerCase() === target);
  return found?.value || "";
}

function detectType(mimeType, url) {
  const lowerMime = mimeType.toLowerCase();
  const lowerUrl = url.toLowerCase().split("?")[0];

  if (lowerMime.includes("text/html")) return "document";
  if (lowerMime.includes("json") || lowerMime.includes("xml") || lowerMime.includes("graphql")) return "xhr";
  if (lowerMime.includes("javascript") || lowerUrl.endsWith(".js")) return "script";
  if (lowerMime.includes("css") || lowerUrl.endsWith(".css")) return "style";
  if (lowerMime.startsWith("image/")) return "image";
  if (lowerMime.startsWith("video/") || lowerMime.startsWith("audio/")) return "media";
  if (lowerMime.includes("font") || /\.(woff2?|ttf|otf|eot)$/.test(lowerUrl)) return "font";
  return "other";
}

function safeDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function applyFilters() {
  const query = els.searchInput.value.trim().toLowerCase();
  const type = els.typeFilter.value;

  state.filteredRows = state.rows.filter((row) => {
    const matchesType = type === "all" || row.type === type;
    const haystack = `${row.url} ${row.pageTitle} ${row.status} ${row.method} ${row.mimeType}`.toLowerCase();
    return matchesType && (!query || haystack.includes(query));
  });

  renderRows(state.filteredRows);
  renderPreviewMeta();
}

function renderRows(rows) {
  els.previewBody.replaceChildren();

  if (!rows.length) {
    renderEmpty(state.rows.length ? "没有匹配的请求" : "请选择一个 HAR 文件");
    return;
  }

  const fragment = document.createDocumentFragment();
  rows.slice(0, 500).forEach((row) => {
    const tr = els.rowTemplate.content.firstElementChild.cloneNode(true);
    const typePill = tr.querySelector(".type-pill");
    const statusPill = tr.querySelector(".status-pill");
    const urlTitle = tr.querySelector(".url-cell strong");
    const urlLine = tr.querySelector(".url-cell span");

    typePill.textContent = row.type;
    typePill.classList.add(row.type);
    tr.querySelector(".method").textContent = row.method || "-";
    statusPill.textContent = row.status || "-";
    statusPill.classList.add(getStatusClass(row.status));
    urlTitle.textContent = row.pageTitle || row.domain || "未命名页面";
    urlLine.textContent = row.url || "-";
    tr.querySelector(".mime").textContent = row.mimeType || "-";
    tr.querySelector(".time").textContent = row.timings.total === null ? "-" : `${Math.round(row.timings.total)} ms`;
    tr.querySelector(".size").textContent = formatBytes(row.size.bytes);
    fragment.appendChild(tr);
  });

  els.previewBody.appendChild(fragment);
}

function renderEmpty(message) {
  const tr = document.createElement("tr");
  tr.className = "empty-row";
  const td = document.createElement("td");
  td.colSpan = 7;
  td.textContent = message;
  tr.appendChild(td);
  els.previewBody.replaceChildren(tr);
}

function renderStats(extracted) {
  els.resultTitle.textContent = `${state.fileName || "HAR"} 已提取`;
  els.fileMeta.textContent = `${state.fileName}.har`;
  els.pageCount.textContent = extracted.summary.pageCount.toLocaleString();
  els.entryCount.textContent = extracted.summary.entryCount.toLocaleString();
  els.successRate.textContent = `${extracted.summary.successRate}%`;
  els.totalSize.textContent = formatBytes(extracted.summary.totalBytes);
}

function renderPreviewMeta() {
  if (!state.extracted) {
    els.previewMeta.textContent = "暂无数据";
    return;
  }

  const capped = state.filteredRows.length > 500 ? "，当前显示前 500 条" : "";
  els.previewMeta.textContent = `${state.filteredRows.length.toLocaleString()} 条匹配请求${capped}`;
}

function getStatusClass(status) {
  if (status >= 200 && status < 400) return "ok";
  if (status >= 400) return "bad";
  return "warn";
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function getSelectedFormat() {
  return document.querySelector("input[name='format']:checked").value;
}

function createOutputRows() {
  if (!state.extracted) {
    return null;
  }

  const filteredIndexes = new Set(state.filteredRows.map((row) => row.index));
  const entries = state.extracted.entries.filter((entry) => filteredIndexes.has(entry.index));

  return {
    ...state.extracted,
    summary: {
      ...state.extracted.summary,
      filteredEntryCount: entries.length,
    },
    entries,
  };
}

function downloadOutput() {
  const output = createOutputRows();
  if (!output) {
    return;
  }

  const format = getSelectedFormat();
  const content = format === "csv" ? `\ufeff${toCsv(output.entries)}` : JSON.stringify(output, null, 2);
  const type = format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `har-extracted-output.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function downloadAssetsZip() {
  if (!state.rawHar) {
    return;
  }

  const originalText = els.downloadAssetsBtn.textContent;
  els.downloadAssetsBtn.disabled = true;
  els.downloadAssetsBtn.textContent = "正在打包...";

  try {
    const packageData = collectAssetFiles();
    const manifestBytes = new TextEncoder().encode(JSON.stringify(packageData.manifest, null, 2));
    const files = [
      { path: "manifest.json", data: manifestBytes },
      ...packageData.files,
    ];
    const blob = createZipBlob(files);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${state.fileName || "har"}-assets.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } finally {
    els.downloadAssetsBtn.textContent = originalText;
    els.downloadAssetsBtn.disabled = !state.extracted;
  }
}

function collectAssetFiles() {
  const entries = state.rawHar?.log?.entries || [];
  const files = [];
  const nameCounts = new Map();
  const manifest = {
    sourceFile: state.fileName,
    exportedAt: new Date().toISOString(),
    note: "Only image and script responses captured inside the HAR can be saved as files.",
    totals: {
      assets: 0,
      saved: 0,
      missingContent: 0,
      image: 0,
      script: 0,
    },
    assets: [],
  };

  entries.forEach((entry, index) => {
    const request = entry.request || {};
    const response = entry.response || {};
    const content = response.content || {};
    const url = request.url || "";
    const mimeType = content.mimeType || getHeader(response.headers, "content-type") || "";
    const type = detectType(mimeType, url);

    if (type !== "image" && type !== "script") {
      return;
    }

    manifest.totals.assets += 1;
    manifest.totals[type] += 1;

    const assetRecord = {
      index: index + 1,
      type,
      method: request.method || "",
      status: Number(response.status || 0),
      statusText: response.statusText || "",
      mimeType,
      url,
      saved: false,
      path: "",
      bytes: 0,
      reason: "",
    };

    if (typeof content.text !== "string") {
      assetRecord.reason = "missing-content";
      manifest.totals.missingContent += 1;
      manifest.assets.push(assetRecord);
      return;
    }

    const bytes = responseContentToBytes(content);
    const filePath = uniqueAssetPath(type, url, mimeType, index + 1, nameCounts);
    files.push({ path: filePath, data: bytes });

    assetRecord.saved = true;
    assetRecord.path = filePath;
    assetRecord.bytes = bytes.byteLength;
    manifest.totals.saved += 1;
    manifest.assets.push(assetRecord);
  });

  return { files, manifest };
}

function responseContentToBytes(content) {
  if (content.encoding === "base64") {
    return base64ToBytes(content.text);
  }

  return new TextEncoder().encode(content.text);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function uniqueAssetPath(type, url, mimeType, index, nameCounts) {
  const folder = type === "image" ? "images" : "scripts";
  let fileName = urlFileName(url) || `${type}-${index}`;
  const extension = fileExtension(fileName) || mimeExtension(mimeType, type);

  fileName = stripExtension(fileName);
  fileName = sanitizeFileName(fileName) || `${type}-${index}`;
  fileName = `${String(index).padStart(4, "0")}-${fileName.slice(0, 100)}${extension}`;

  const key = `${folder}/${fileName}`.toLowerCase();
  const count = nameCounts.get(key) || 0;
  nameCounts.set(key, count + 1);

  if (!count) {
    return `${folder}/${fileName}`;
  }

  return `${folder}/${stripExtension(fileName)}-${count + 1}${fileExtension(fileName)}`;
}

function urlFileName(url) {
  try {
    const { pathname, hostname } = new URL(url);
    const lastPart = pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(lastPart || hostname || "");
  } catch {
    return "";
  }
}

function sanitizeFileName(value) {
  return value
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .replace(/\.+$/, "");
}

function fileExtension(fileName) {
  const match = fileName.match(/(\.[a-z0-9]{1,8})$/i);
  return match ? match[1].toLowerCase() : "";
}

function stripExtension(fileName) {
  const extension = fileExtension(fileName);
  return extension ? fileName.slice(0, -extension.length) : fileName;
}

function mimeExtension(mimeType, type) {
  const cleanMime = mimeType.split(";")[0].trim().toLowerCase();
  const known = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "image/x-icon": ".ico",
    "image/vnd.microsoft.icon": ".ico",
    "application/javascript": ".js",
    "text/javascript": ".js",
    "application/x-javascript": ".js",
    "text/ecmascript": ".js",
    "application/ecmascript": ".js",
  };

  return known[cleanMime] || (type === "script" ? ".js" : ".bin");
}

function createZipBlob(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = new TextEncoder().encode(file.path);
    const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
    const crc = crc32(data);
    const localHeader = zipLocalHeader(nameBytes, data.byteLength, crc);
    const centralHeader = zipCentralHeader(nameBytes, data.byteLength, crc, offset);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.byteLength + data.byteLength;
  });

  const centralSize = centralParts.reduce((sum, part) => sum + part.byteLength, 0);
  const endRecord = zipEndRecord(files.length, centralSize, offset);
  return new Blob([...localParts, ...centralParts, endRecord], { type: "application/zip" });
}

function zipLocalHeader(nameBytes, size, crc) {
  const header = new Uint8Array(30 + nameBytes.byteLength);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameBytes.byteLength, true);
  view.setUint16(28, 0, true);
  header.set(nameBytes, 30);
  return header;
}

function zipCentralHeader(nameBytes, size, crc, offset) {
  const header = new Uint8Array(46 + nameBytes.byteLength);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, 0, true);
  view.setUint16(14, 0, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameBytes.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  header.set(nameBytes, 46);
  return header;
}

function zipEndRecord(entryCount, centralSize, centralOffset) {
  const header = new Uint8Array(22);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0, true);
  return header;
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
})();

function toCsv(entries) {
  const headers = [
    "index",
    "pageTitle",
    "type",
    "method",
    "status",
    "statusText",
    "url",
    "domain",
    "mimeType",
    "startedDateTime",
    "timeMs",
    "sizeBytes",
  ];

  const lines = [headers.join(",")];
  entries.forEach((entry) => {
    lines.push(headers.map((header) => csvEscape(csvValue(entry, header))).join(","));
  });

  return lines.join("\n");
}

function csvValue(entry, header) {
  switch (header) {
    case "timeMs":
      return entry.timings.total ?? "";
    case "sizeBytes":
      return entry.size.bytes ?? "";
    default:
      return entry[header] ?? "";
  }
}

function csvEscape(value) {
  const stringValue = String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

async function copyJson() {
  const output = createOutputRows();
  if (!output) {
    return;
  }

  const text = JSON.stringify(output, null, 2);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    fallbackCopy(text);
  }

  const original = els.copyBtn.textContent;
  els.copyBtn.textContent = "已复制";
  window.setTimeout(() => {
    els.copyBtn.textContent = original;
  }, 1300);
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function updateDownloadName() {
  const format = getSelectedFormat();
  els.downloadBtn.disabled = !state.extracted;
  els.downloadBtn.title = `har-extracted-output.${format}`;
  els.downloadAssetsBtn.disabled = !state.extracted;
  els.downloadAssetsBtn.title = "har-assets.zip";
}

function setEnabled(enabled) {
  els.searchInput.disabled = !enabled;
  els.typeFilter.disabled = !enabled;
  els.downloadBtn.disabled = !enabled;
  els.downloadAssetsBtn.disabled = !enabled;
  els.copyBtn.disabled = !enabled;
}

function resetData() {
  state.rawHar = null;
  state.extracted = null;
  state.rows = [];
  state.filteredRows = [];
  setEnabled(false);
  els.pageCount.textContent = "0";
  els.entryCount.textContent = "0";
  els.successRate.textContent = "0%";
  els.totalSize.textContent = "0 KB";
  els.previewMeta.textContent = "暂无数据";
}
