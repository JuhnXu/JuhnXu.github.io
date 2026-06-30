const sourceCanvas = document.querySelector("#sourceCanvas");
const previewCanvas = document.querySelector("#previewCanvas");
const sourceCtx = sourceCanvas.getContext("2d");
const previewCtx = previewCanvas.getContext("2d");
const overlay = document.querySelector("#overlay");

const fileInput = document.querySelector("#fileInput");
const imageMeta = document.querySelector("#imageMeta");
const outputMeta = document.querySelector("#outputMeta");
const metaTemplateStatus = document.querySelector("#metaTemplateStatus");

const x1Input = document.querySelector("#x1Input");
const x2Input = document.querySelector("#x2Input");
const y1Input = document.querySelector("#y1Input");
const y2Input = document.querySelector("#y2Input");
const targetWidthInput = document.querySelector("#targetWidth");
const targetHeightInput = document.querySelector("#targetHeight");
const metaTemplateInput = document.querySelector("#metaTemplateInput");
const fitCenterButton = document.querySelector("#fitCenterButton");
const resetButton = document.querySelector("#resetButton");
const downloadPngButton = document.querySelector("#downloadPng");
const downloadJsonButton = document.querySelector("#downloadJson");
const downloadMetaButton = document.querySelector("#downloadMeta");

const inputs = [
  x1Input,
  x2Input,
  y1Input,
  y2Input,
  targetWidthInput,
  targetHeightInput,
];
const actionButtons = [
  fitCenterButton,
  resetButton,
  downloadPngButton,
  downloadJsonButton,
  downloadMetaButton,
];

const state = {
  image: null,
  fileName: "nine-slice",
  width: 0,
  height: 0,
  x1: 0,
  x2: 0,
  y1: 0,
  y2: 0,
  targetWidth: 0,
  targetHeight: 0,
  metaTemplate: null,
  dragging: null,
};

const minRegion = 1;

fileInput.addEventListener("change", handleFileSelect);
metaTemplateInput.addEventListener("change", handleMetaTemplateSelect);
window.addEventListener("resize", updateOverlay);
fitCenterButton.addEventListener("click", cutScalableAreas);
resetButton.addEventListener("click", resetSplits);
downloadPngButton.addEventListener("click", downloadPng);
downloadJsonButton.addEventListener("click", downloadJson);
downloadMetaButton.addEventListener("click", downloadMeta);

document.querySelectorAll(".split-line").forEach((line) => {
  line.addEventListener("pointerdown", startDrag);
  line.addEventListener("keydown", nudgeLine);
});

[x1Input, x2Input, y1Input, y2Input].forEach((input) => {
  input.addEventListener("change", () => {
    state.x1 = numberFrom(x1Input, state.x1);
    state.x2 = numberFrom(x2Input, state.x2);
    state.y1 = numberFrom(y1Input, state.y1);
    state.y2 = numberFrom(y2Input, state.y2);
    clampSplits();
    syncInputs();
    renderAll();
  });
});

[targetWidthInput, targetHeightInput].forEach((input) => {
  input.addEventListener("change", () => {
    state.targetWidth = Math.max(1, Math.round(numberFrom(targetWidthInput, state.targetWidth)));
    state.targetHeight = Math.max(1, Math.round(numberFrom(targetHeightInput, state.targetHeight)));
    syncInputs();
    renderPreview();
  });
});

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    URL.revokeObjectURL(url);
    if (img.naturalWidth < 3 || img.naturalHeight < 3) {
      imageMeta.textContent = "图片至少需要 3 x 3 像素";
      return;
    }

    state.image = img;
    state.fileName = file.name.replace(/\.[^.]+$/, "") || "nine-slice";
    state.width = img.naturalWidth;
    state.height = img.naturalHeight;
    resetSplits();
    enableControls(true);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    imageMeta.textContent = "图片读取失败";
  };
  img.src = url;
}

function handleMetaTemplateSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const meta = JSON.parse(String(reader.result));
      const spriteMeta = findSpriteFrameMeta(meta);
      if (!spriteMeta?.userData) {
        throw new Error("未找到 sprite-frame.userData");
      }

      state.metaTemplate = meta;
      metaTemplateStatus.textContent = `已读取 ${file.name}`;
    } catch (error) {
      state.metaTemplate = null;
      metaTemplateStatus.textContent = "meta 格式不匹配";
    }
  };
  reader.onerror = () => {
    state.metaTemplate = null;
    metaTemplateStatus.textContent = "meta 读取失败";
  };
  reader.readAsText(file);
}

function enableControls(enabled) {
  inputs.forEach((input) => {
    input.disabled = !enabled;
  });
  actionButtons.forEach((button) => {
    button.disabled = !enabled;
  });
}

function resetSplits() {
  if (!state.image) return;
  state.x1 = Math.round(state.width / 3);
  state.x2 = Math.round((state.width * 2) / 3);
  state.y1 = Math.round(state.height / 3);
  state.y2 = Math.round((state.height * 2) / 3);
  state.targetWidth = state.width;
  state.targetHeight = state.height;
  syncInputs();
  renderAll();
}

function cutScalableAreas() {
  if (!state.image) return;
  const left = state.x1;
  const right = state.width - state.x2;
  const top = state.y1;
  const bottom = state.height - state.y2;

  state.targetWidth = left + right;
  state.targetHeight = top + bottom;
  syncInputs();
  renderPreview();
}

function syncInputs() {
  x1Input.max = Math.max(0, state.width);
  x2Input.max = Math.max(0, state.width);
  y1Input.max = Math.max(0, state.height);
  y2Input.max = Math.max(0, state.height);
  targetWidthInput.min = Math.max(1, state.x1 + (state.width - state.x2));
  targetHeightInput.min = Math.max(1, state.y1 + (state.height - state.y2));

  x1Input.value = state.x1;
  x2Input.value = state.x2;
  y1Input.value = state.y1;
  y2Input.value = state.y2;
  targetWidthInput.value = state.targetWidth;
  targetHeightInput.value = state.targetHeight;

  imageMeta.textContent = `${state.width} x ${state.height}`;
}

function renderAll() {
  renderSource();
  updateOverlay();
  renderPreview();
}

function renderSource() {
  if (!state.image) return;
  sourceCanvas.width = state.width;
  sourceCanvas.height = state.height;
  sourceCtx.clearRect(0, 0, state.width, state.height);
  sourceCtx.drawImage(state.image, 0, 0);
}

function renderPreview() {
  if (!state.image) return;

  enforceTargetMinimums();
  previewCanvas.width = state.targetWidth;
  previewCanvas.height = state.targetHeight;
  previewCtx.clearRect(0, 0, state.targetWidth, state.targetHeight);
  previewCtx.imageSmoothingEnabled = true;
  previewCtx.imageSmoothingQuality = "high";

  const sourceXs = [0, state.x1, state.x2, state.width];
  const sourceYs = [0, state.y1, state.y2, state.height];
  const targetXs = [0, state.x1, state.targetWidth - (state.width - state.x2), state.targetWidth];
  const targetYs = [0, state.y1, state.targetHeight - (state.height - state.y2), state.targetHeight];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const sx = sourceXs[col];
      const sy = sourceYs[row];
      const sw = sourceXs[col + 1] - sx;
      const sh = sourceYs[row + 1] - sy;
      const dx = targetXs[col];
      const dy = targetYs[row];
      const dw = targetXs[col + 1] - dx;
      const dh = targetYs[row + 1] - dy;

      if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
        previewCtx.drawImage(state.image, sx, sy, sw, sh, dx, dy, dw, dh);
      }
    }
  }

  outputMeta.textContent = `${state.targetWidth} x ${state.targetHeight}`;
  syncInputs();
}

function enforceTargetMinimums() {
  const minWidth = Math.max(1, state.x1 + (state.width - state.x2));
  const minHeight = Math.max(1, state.y1 + (state.height - state.y2));
  state.targetWidth = Math.max(minWidth, Math.round(state.targetWidth));
  state.targetHeight = Math.max(minHeight, Math.round(state.targetHeight));
}

function updateOverlay() {
  if (!state.image) {
    overlay.hidden = true;
    return;
  }

  const rect = sourceCanvas.getBoundingClientRect();
  const parentRect = sourceCanvas.parentElement.getBoundingClientRect();
  const scaleX = rect.width / state.width;
  const scaleY = rect.height / state.height;

  overlay.hidden = false;
  overlay.style.left = `${rect.left - parentRect.left}px`;
  overlay.style.top = `${rect.top - parentRect.top}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.height = `${rect.height}px`;

  setLinePosition("x1", state.x1 * scaleX);
  setLinePosition("x2", state.x2 * scaleX);
  setLinePosition("y1", state.y1 * scaleY);
  setLinePosition("y2", state.y2 * scaleY);
}

function setLinePosition(name, value) {
  const line = overlay.querySelector(`[data-line="${name}"]`);
  if (name.startsWith("x")) {
    line.style.left = `${value}px`;
  } else {
    line.style.top = `${value}px`;
  }
}

function startDrag(event) {
  if (!state.image) return;
  const line = event.currentTarget.dataset.line;
  state.dragging = line;
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.addEventListener("pointermove", dragLine);
  event.currentTarget.addEventListener("pointerup", stopDrag, { once: true });
  event.currentTarget.addEventListener("pointercancel", stopDrag, { once: true });
}

function dragLine(event) {
  if (!state.dragging) return;
  const rect = overlay.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * state.width;
  const y = ((event.clientY - rect.top) / rect.height) * state.height;
  setSplit(state.dragging, Math.round(state.dragging.startsWith("x") ? x : y));
}

function stopDrag(event) {
  event.currentTarget.removeEventListener("pointermove", dragLine);
  state.dragging = null;
}

function nudgeLine(event) {
  if (!state.image) return;
  const line = event.currentTarget.dataset.line;
  const step = event.shiftKey ? 10 : 1;
  let delta = 0;

  if (line.startsWith("x")) {
    if (event.key === "ArrowLeft") delta = -step;
    if (event.key === "ArrowRight") delta = step;
  } else {
    if (event.key === "ArrowUp") delta = -step;
    if (event.key === "ArrowDown") delta = step;
  }

  if (delta !== 0) {
    event.preventDefault();
    setSplit(line, state[line] + delta);
  }
}

function setSplit(line, value) {
  state[line] = value;
  clampSplits(line);
  syncInputs();
  updateOverlay();
  renderPreview();
}

function clampSplits(activeLine) {
  state.x1 = clamp(Math.round(state.x1), minRegion, state.width - minRegion * 2);
  state.x2 = clamp(Math.round(state.x2), minRegion * 2, state.width - minRegion);
  state.y1 = clamp(Math.round(state.y1), minRegion, state.height - minRegion * 2);
  state.y2 = clamp(Math.round(state.y2), minRegion * 2, state.height - minRegion);

  if (state.x1 >= state.x2) {
    if (activeLine === "x2") state.x1 = state.x2 - minRegion;
    else state.x2 = state.x1 + minRegion;
  }
  if (state.y1 >= state.y2) {
    if (activeLine === "y2") state.y1 = state.y2 - minRegion;
    else state.y2 = state.y1 + minRegion;
  }
}

function numberFrom(input, fallback) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function downloadPng() {
  if (!state.image) return;
  const link = document.createElement("a");
  link.download = `${getOutputBaseName()}.png`;
  link.href = previewCanvas.toDataURL("image/png");
  link.click();
}

function downloadJson() {
  if (!state.image) return;
  const config = {
    source: {
      fileName: state.fileName,
      width: state.width,
      height: state.height,
    },
    splits: {
      x1: state.x1,
      x2: state.x2,
      y1: state.y1,
      y2: state.y2,
    },
    target: {
      width: state.targetWidth,
      height: state.targetHeight,
    },
  };
  const blob = new Blob([JSON.stringify(config, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.download = `${getOutputBaseName()}.json`;
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadMeta() {
  if (!state.image) return;
  const meta = state.metaTemplate ? createCocosMetaFromTemplate() : createCocosMeta();
  const blob = new Blob([JSON.stringify(meta, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.download = `${getOutputBaseName()}.png.meta`;
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function createCocosMetaFromTemplate() {
  const meta = structuredCloneJson(state.metaTemplate);
  const spriteMeta = findSpriteFrameMeta(meta);
  const textureMeta = findTextureMeta(meta);
  const displayName = getOutputBaseName();

  if (textureMeta) {
    textureMeta.displayName = displayName;
  }
  if (spriteMeta) {
    spriteMeta.displayName = displayName;
    updateSpriteFrameUserData(spriteMeta.userData);
  }

  return meta;
}

function createCocosMeta() {
  const baseUuid = createUuid();
  const textureId = createShortId();
  let spriteId = createShortId();
  while (spriteId === textureId) {
    spriteId = createShortId();
  }

  const displayName = getOutputBaseName();
  const width = state.targetWidth;
  const height = state.targetHeight;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const spriteUserData = {
    trimThreshold: 1,
    rotated: false,
    offsetX: 0,
    offsetY: 0,
    trimX: 0,
    trimY: 0,
    width,
    height,
    rawWidth: width,
    rawHeight: height,
    borderTop: 0,
    borderBottom: 0,
    borderLeft: 0,
    borderRight: 0,
    packable: true,
    pixelsToUnit: 100,
    pivotX: 0.5,
    pivotY: 0.5,
    meshType: 0,
    vertices: {
      rawPosition: [
        -halfWidth,
        -halfHeight,
        0,
        halfWidth,
        -halfHeight,
        0,
        -halfWidth,
        halfHeight,
        0,
        halfWidth,
        halfHeight,
        0,
      ],
      indexes: [0, 1, 2, 2, 1, 3],
      uv: [0, height, width, height, 0, 0, width, 0],
      nuv: [0, 0, 1, 0, 0, 1, 1, 1],
      minPos: [-halfWidth, -halfHeight, 0],
      maxPos: [halfWidth, halfHeight, 0],
    },
    isUuid: true,
    imageUuidOrDatabaseUri: `${baseUuid}@${textureId}`,
    atlasUuid: "",
    trimType: "auto",
  };
  updateSpriteFrameUserData(spriteUserData);

  return {
    ver: "1.0.27",
    importer: "image",
    imported: true,
    uuid: baseUuid,
    files: [".json", ".png"],
    subMetas: {
      [textureId]: {
        importer: "texture",
        uuid: `${baseUuid}@${textureId}`,
        displayName,
        id: textureId,
        name: "texture",
        userData: {
          wrapModeS: "clamp-to-edge",
          wrapModeT: "clamp-to-edge",
          imageUuidOrDatabaseUri: baseUuid,
          isUuid: true,
          visible: false,
          minfilter: "linear",
          magfilter: "linear",
          mipfilter: "none",
          anisotropy: 0,
        },
        ver: "1.0.22",
        imported: true,
        files: [".json"],
        subMetas: {},
      },
      [spriteId]: {
        importer: "sprite-frame",
        uuid: `${baseUuid}@${spriteId}`,
        displayName,
        id: spriteId,
        name: "spriteFrame",
        userData: spriteUserData,
        ver: "1.0.12",
        imported: true,
        files: [".json"],
        subMetas: {},
      },
    },
    userData: {
      type: "sprite-frame",
      hasAlpha: true,
      fixAlphaTransparencyArtifacts: false,
      redirect: `${baseUuid}@${textureId}`,
    },
  };
}

function updateSpriteFrameUserData(userData) {
  const width = state.targetWidth;
  const height = state.targetHeight;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  userData.width = width;
  userData.height = height;
  userData.rawWidth = width;
  userData.rawHeight = height;
  userData.borderTop = toCocosBorderValue(state.y1);
  userData.borderBottom = toCocosBorderValue(state.height - state.y2);
  userData.borderLeft = toCocosBorderValue(state.x1);
  userData.borderRight = toCocosBorderValue(state.width - state.x2);

  if (userData.vertices) {
    userData.vertices.rawPosition = [
      -halfWidth,
      -halfHeight,
      0,
      halfWidth,
      -halfHeight,
      0,
      -halfWidth,
      halfHeight,
      0,
      halfWidth,
      halfHeight,
      0,
    ];
    userData.vertices.indexes = [0, 1, 2, 2, 1, 3];
    userData.vertices.uv = [0, height, width, height, 0, 0, width, 0];
    userData.vertices.nuv = [0, 0, 1, 0, 0, 1, 1, 1];
    userData.vertices.minPos = [-halfWidth, -halfHeight, 0];
    userData.vertices.maxPos = [halfWidth, halfHeight, 0];
  }
}

function findSpriteFrameMeta(meta) {
  return Object.values(meta?.subMetas ?? {}).find((subMeta) => subMeta?.importer === "sprite-frame");
}

function findTextureMeta(meta) {
  return Object.values(meta?.subMetas ?? {}).find((subMeta) => subMeta?.importer === "texture");
}

function structuredCloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function getOutputBaseName() {
  return `${state.fileName}-9slice`;
}

function toCocosBorderValue(value) {
  return Math.max(0, Math.round(value) - 6);
}

function createUuid() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) => {
    const value = Number(char);
    return (value ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (value / 4)))).toString(16);
  });
}

function createShortId() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 5);
}

enableControls(false);
