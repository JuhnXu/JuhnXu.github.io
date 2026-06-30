/* Plist Atlas Tool - browser only, no upload */
const $ = (id) => document.getElementById(id);

const state = {
  unpackFiles: [],
  packFiles: [],
};

function log(el, text) {
  el.textContent = text;
}

function appendLog(el, text) {
  el.textContent += `\n${text}`;
}

function safeFileName(name) {
  const base = String(name || 'sprite.png').split(/[\\/]/).pop() || 'sprite.png';
  const cleaned = base.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  return cleaned.toLowerCase().endsWith('.png') ? cleaned : `${cleaned}.png`;
}

function uniqueName(name, used) {
  let candidate = safeFileName(name);
  if (!used.has(candidate)) {
    used.add(candidate);
    return candidate;
  }
  const dot = candidate.lastIndexOf('.');
  const stem = dot >= 0 ? candidate.slice(0, dot) : candidate;
  const ext = dot >= 0 ? candidate.slice(dot) : '.png';
  let i = 2;
  while (used.has(`${stem}_${i}${ext}`)) i += 1;
  candidate = `${stem}_${i}${ext}`;
  used.add(candidate);
  return candidate;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readText(file) {
  return file.text();
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`图片读取失败：${file.name}`));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function parsePlistXml(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, 'application/xml');
  const parserError = xml.querySelector('parsererror');
  if (parserError) throw new Error('plist 解析失败：请确认是 XML 格式 plist，不是 binary plist。');
  const plist = xml.querySelector('plist');
  if (!plist) throw new Error('没有找到 plist 根节点。');
  const root = [...plist.childNodes].find((n) => n.nodeType === 1);
  return parsePlistNode(root);
}

function parsePlistNode(node) {
  if (!node) return null;
  const tag = node.nodeName;
  if (tag === 'dict') {
    const obj = {};
    const children = [...node.childNodes].filter((n) => n.nodeType === 1);
    for (let i = 0; i < children.length; i += 2) {
      const keyNode = children[i];
      const valNode = children[i + 1];
      if (!keyNode || keyNode.nodeName !== 'key') continue;
      obj[keyNode.textContent] = parsePlistNode(valNode);
    }
    return obj;
  }
  if (tag === 'array') return [...node.childNodes].filter((n) => n.nodeType === 1).map(parsePlistNode);
  if (tag === 'integer') return parseInt(node.textContent, 10);
  if (tag === 'real') return parseFloat(node.textContent);
  if (tag === 'true') return true;
  if (tag === 'false') return false;
  if (tag === 'string' || tag === 'key' || tag === 'date' || tag === 'data') return node.textContent;
  return node.textContent;
}

function intsFromString(v) {
  return String(v || '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
}

function parsePoint(v, fallback = { x: 0, y: 0 }) {
  if (!v) return fallback;
  if (typeof v === 'object') {
    return {
      x: Number(v.x ?? v.X ?? v[0] ?? fallback.x),
      y: Number(v.y ?? v.Y ?? v[1] ?? fallback.y),
    };
  }
  const nums = intsFromString(v);
  return nums.length >= 2 ? { x: nums[0], y: nums[1] } : fallback;
}

function parseSize(v, fallback = { w: 1, h: 1 }) {
  if (!v) return fallback;
  if (typeof v === 'object') {
    return {
      w: Number(v.w ?? v.width ?? v.W ?? v[0] ?? fallback.w),
      h: Number(v.h ?? v.height ?? v.H ?? v[1] ?? fallback.h),
    };
  }
  const nums = intsFromString(v);
  return nums.length >= 2 ? { w: nums[0], h: nums[1] } : fallback;
}

function parseRect(v) {
  if (!v) return null;
  if (typeof v === 'object') {
    if ('x' in v || 'y' in v || 'w' in v || 'h' in v) {
      return {
        x: Number(v.x ?? 0),
        y: Number(v.y ?? 0),
        w: Number(v.w ?? v.width ?? 0),
        h: Number(v.h ?? v.height ?? 0),
      };
    }
    if ('origin' in v && 'size' in v) {
      return {
        x: Number(v.origin.x ?? 0),
        y: Number(v.origin.y ?? 0),
        w: Number(v.size.w ?? v.size.width ?? 0),
        h: Number(v.size.h ?? v.size.height ?? 0),
      };
    }
  }
  const nums = intsFromString(v);
  if (nums.length >= 4) return { x: nums[0], y: nums[1], w: nums[2], h: nums[3] };
  return null;
}

function getFrameInfo(info) {
  const rect = parseRect(info.frame || info.textureRect || info.textureRectInPixels || info.spriteFrame);
  if (!rect) throw new Error('frame / textureRect 字段无法解析。');
  const rotated = Boolean(info.rotated ?? info.textureRotated ?? info.isRotated ?? false);
  const sourceSize = parseSize(info.sourceSize || info.spriteSourceSize || info.spriteSize, { w: rect.w, h: rect.h });
  const sourceColorRect = parseRect(info.sourceColorRect || info.sourceColorRectInPixels || info.spriteSourceColorRect) || {
    x: 0,
    y: 0,
    w: rect.w,
    h: rect.h,
  };
  const offset = parsePoint(info.offset || info.spriteOffset || info.spriteOffsetInPixels, { x: 0, y: 0 });
  return { rect, rotated, sourceSize, sourceColorRect, offset };
}

function drawUnrotatedCrop(atlasImg, frame) {
  const { rect, rotated } = frame;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rect.w));
  canvas.height = Math.max(1, Math.round(rect.h));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (rotated) {
    // TexturePacker/Cocos convention: packed rect is h*w; rotate back CCW.
    ctx.translate(0, rect.h);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(atlasImg, rect.x, rect.y, rect.h, rect.w, 0, 0, rect.h, rect.w);
  } else {
    ctx.drawImage(atlasImg, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  }
  return canvas;
}

function makeSourceSizeCanvas(trimmedCanvas, frame) {
  const sw = Math.max(1, Math.round(frame.sourceSize.w));
  const sh = Math.max(1, Math.round(frame.sourceSize.h));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(frame.sourceColorRect.x || 0);
  const y = Math.round(frame.sourceColorRect.y || 0);
  ctx.drawImage(trimmedCanvas, x, y);
  return canvas;
}

async function unpackAtlas() {
  const logEl = $('unpackLog');
  const files = state.unpackFiles.length ? state.unpackFiles : [...$('unpackFiles').files];
  const plistFile = files.find((f) => f.name.toLowerCase().endsWith('.plist'));
  const imageFiles = files.filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
  if (!plistFile || !imageFiles.length) {
    log(logEl, '请同时选择 .plist 和对应的 .png/.jpg/.webp 图集图片。');
    return;
  }

  log(logEl, '正在读取 plist...');
  const plist = parsePlistXml(await readText(plistFile));
  if (!plist.frames) throw new Error('plist 中没有 frames 字段。');

  const meta = plist.metadata || {};
  const textureName = meta.realTextureFileName || meta.textureFileName || '';
  const atlasFile = imageFiles.find((f) => f.name === textureName) || imageFiles[0];
  const atlasImg = await fileToImage(atlasFile);
  const frameEntries = Object.entries(plist.frames);
  const zip = new JSZip();
  const exportTrimmed = $('unpackTrimmed').checked;
  const exportSource = $('unpackSourceSize').checked;
  const used = new Set();
  const rows = [];
  let rotatedCount = 0;

  $('unpackPreview').innerHTML = '';
  appendLog(logEl, `图集图片：${atlasFile.name} (${atlasImg.width}x${atlasImg.height})`);
  appendLog(logEl, `发现图块：${frameEntries.length} 个`);

  for (let i = 0; i < frameEntries.length; i += 1) {
    const [rawName, rawInfo] = frameEntries[i];
    const name = uniqueName(rawName, used);
    const frame = getFrameInfo(rawInfo);
    if (frame.rotated) rotatedCount += 1;
    const trimmed = drawUnrotatedCrop(atlasImg, frame);

    if (exportTrimmed) {
      const blob = await canvasToBlob(trimmed);
      zip.file(`01_trimmed_png_blocks/${name}`, blob);
    }
    if (exportSource) {
      const full = makeSourceSizeCanvas(trimmed, frame);
      const blob = await canvasToBlob(full);
      zip.file(`02_source_size_png_blocks/${name}`, blob);
    }

    rows.push(`${name} | trimmed ${trimmed.width}x${trimmed.height} | source ${frame.sourceSize.w}x${frame.sourceSize.h} | rotated ${frame.rotated}`);

    if (i < 24) {
      const card = document.createElement('div');
      card.className = 'preview-card';
      const img = document.createElement('img');
      img.src = trimmed.toDataURL('image/png');
      const cap = document.createElement('div');
      cap.textContent = name;
      card.append(img, cap);
      $('unpackPreview').appendChild(card);
    }
  }

  const readme = [
    'Plist 图集解包结果',
    '===================',
    `plist: ${plistFile.name}`,
    `atlas: ${atlasFile.name}`,
    `frames: ${frameEntries.length}`,
    `rotated fixed: ${rotatedCount}`,
    '',
    '目录说明：',
    '01_trimmed_png_blocks：实际裁切图块，已修正 rotated。',
    '02_source_size_png_blocks：按 sourceSize / sourceColorRect 还原透明留白。',
    '',
    '清单：',
    ...rows,
  ].join('\n');
  zip.file('README.txt', readme);

  log(logEl, `正在压缩 ${frameEntries.length} 个图块...`);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  downloadBlob(blob, `${plistFile.name.replace(/\.plist$/i, '')}_sliced_blocks.zip`);
  log(logEl, `完成：切出 ${frameEntries.length} 个图块，修正旋转 ${rotatedCount} 个。`);
}

function imageToCanvas(img) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, img.naturalWidth || img.width);
  canvas.height = Math.max(1, img.naturalHeight || img.height);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 1) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    const blank = document.createElement('canvas');
    blank.width = 1;
    blank.height = 1;
    return { canvas: blank, sourceColorRect: { x: 0, y: 0, w: 1, h: 1 }, sourceSize: { w: width, h: height } };
  }

  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  out.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return { canvas: out, sourceColorRect: { x: minX, y: minY, w, h }, sourceSize: { w: width, h: height } };
}

async function loadSpritesFromFiles(files) {
  const images = files.filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
  const trim = $('trimTransparent').checked;
  const sprites = [];
  const used = new Set();
  for (const file of images) {
    const img = await fileToImage(file);
    const original = imageToCanvas(img);
    const packed = trim ? trimCanvas(original) : {
      canvas: original,
      sourceColorRect: { x: 0, y: 0, w: original.width, h: original.height },
      sourceSize: { w: original.width, h: original.height },
    };
    sprites.push({
      name: uniqueName(file.webkitRelativePath || file.name, used),
      canvas: packed.canvas,
      sourceColorRect: packed.sourceColorRect,
      sourceSize: packed.sourceSize,
      originalFile: file.name,
      page: 0,
      x: 0,
      y: 0,
      rotated: false,
    });
  }
  return sprites;
}

function packSprites(sprites, opts) {
  const sorted = [...sprites].sort((a, b) => Math.max(b.canvas.width, b.canvas.height) - Math.max(a.canvas.width, a.canvas.height));
  const pages = [];
  let page = newPage();

  function newPage() {
    return { sprites: [], x: 0, y: 0, rowH: 0, usedW: 0, usedH: 0 };
  }

  function startNextPage() {
    pages.push(page);
    page = newPage();
  }

  function place(sprite) {
    const normal = { w: sprite.canvas.width, h: sprite.canvas.height, rotated: false };
    const rotated = { w: sprite.canvas.height, h: sprite.canvas.width, rotated: true };
    const candidates = opts.allowRotate ? [normal, rotated].sort((a, b) => a.h - b.h) : [normal];

    for (const candidate of candidates) {
      if (candidate.w > opts.maxWidth || candidate.h > opts.maxHeight) continue;
      let x = page.x;
      let y = page.y;
      let rowH = page.rowH;
      if (x !== 0 && x + candidate.w > opts.maxWidth) {
        x = 0;
        y = page.y + page.rowH + opts.padding;
        rowH = 0;
      }
      if (y + candidate.h <= opts.maxHeight) {
        sprite.x = x;
        sprite.y = y;
        sprite.rotated = candidate.rotated;
        page.sprites.push(sprite);
        page.x = x + candidate.w + opts.padding;
        page.y = y;
        page.rowH = Math.max(rowH, candidate.h);
        page.usedW = Math.max(page.usedW, x + candidate.w);
        page.usedH = Math.max(page.usedH, y + candidate.h);
        return true;
      }
    }
    return false;
  }

  for (const sprite of sorted) {
    if (!place(sprite)) {
      if (page.sprites.length) startNextPage();
      if (!place(sprite)) throw new Error(`图片过大，无法放入最大图集：${sprite.name}`);
    }
  }
  if (page.sprites.length) pages.push(page);
  return pages;
}

function drawPageCanvas(page, opts) {
  const rawW = Math.max(1, page.usedW);
  const rawH = Math.max(1, page.usedH);
  const width = opts.powerOfTwo ? Math.min(opts.maxWidth, nextPowerOfTwo(rawW)) : rawW;
  const height = opts.powerOfTwo ? Math.min(opts.maxHeight, nextPowerOfTwo(rawH)) : rawH;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (const sprite of page.sprites) {
    if (sprite.rotated) {
      ctx.save();
      ctx.translate(sprite.x + sprite.canvas.height, sprite.y);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(sprite.canvas, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(sprite.canvas, sprite.x, sprite.y);
    }
  }
  return canvas;
}

function escXml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function plistString(page, textureFileName, canvas) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">');
  lines.push('<plist version="1.0">');
  lines.push('<dict>');
  lines.push('  <key>frames</key>');
  lines.push('  <dict>');
  for (const sprite of page.sprites) {
    const w = sprite.canvas.width;
    const h = sprite.canvas.height;
    const scr = sprite.sourceColorRect;
    const ss = sprite.sourceSize;
    lines.push(`    <key>${escXml(sprite.name)}</key>`);
    lines.push('    <dict>');
    const offsetX = (scr.x + w / 2) - ss.w / 2;
    const offsetY = ss.h / 2 - scr.y - h / 2;
    const ox = Number.isInteger(offsetX) ? offsetX : Number(offsetX.toFixed(2));
    const oy = Number.isInteger(offsetY) ? offsetY : Number(offsetY.toFixed(2));
    lines.push(`      <key>frame</key><string>{{${sprite.x},${sprite.y}},{${w},${h}}}</string>`);
    lines.push(`      <key>offset</key><string>{${ox},${oy}}</string>`);
    lines.push(`      <key>rotated</key><${sprite.rotated ? 'true' : 'false'}/>`);
    lines.push(`      <key>sourceColorRect</key><string>{{${scr.x},${scr.y}},{${scr.w},${scr.h}}}</string>`);
    lines.push(`      <key>sourceSize</key><string>{${ss.w},${ss.h}}</string>`);
    lines.push('    </dict>');
  }
  lines.push('  </dict>');
  lines.push('  <key>metadata</key>');
  lines.push('  <dict>');
  lines.push('    <key>format</key><integer>3</integer>');
  lines.push('    <key>pixelFormat</key><string>RGBA8888</string>');
  lines.push('    <key>premultiplyAlpha</key><false/>');
  lines.push(`    <key>realTextureFileName</key><string>${escXml(textureFileName)}</string>`);
  lines.push(`    <key>textureFileName</key><string>${escXml(textureFileName)}</string>`);
  lines.push(`    <key>size</key><string>{${canvas.width},${canvas.height}}</string>`);
  lines.push('  </dict>');
  lines.push('</dict>');
  lines.push('</plist>');
  return lines.join('\n');
}

async function packAtlas() {
  const logEl = $('packLog');
  const files = state.packFiles.length ? state.packFiles : [...$('packFiles').files, ...$('packFilesLoose').files];
  if (!files.length) {
    log(logEl, '请先选择一个图片文件夹，或选择多张图片。');
    return;
  }

  const opts = {
    name: ($('atlasName').value || 'atlas').replace(/[^\w\u4e00-\u9fa5-]+/g, '_'),
    maxWidth: Number($('maxWidth').value),
    maxHeight: Number($('maxHeight').value),
    padding: Math.max(0, Number($('padding').value || 0)),
    allowRotate: $('allowRotate').checked,
    powerOfTwo: $('powerOfTwo').checked,
  };

  log(logEl, '正在读取图片...');
  const sprites = await loadSpritesFromFiles(files);
  if (!sprites.length) {
    log(logEl, '没有读取到可用图片。支持 png / jpg / jpeg / webp。');
    return;
  }
  appendLog(logEl, `读取图片：${sprites.length} 张`);
  appendLog(logEl, `最大图集：${opts.maxWidth}x${opts.maxHeight}，padding ${opts.padding}`);

  const pages = packSprites(sprites, opts);
  appendLog(logEl, `生成图集页：${pages.length} 页`);

  const zip = new JSZip();
  const previewWrap = $('atlasPreviewWrap');
  previewWrap.innerHTML = '';
  const summary = [];

  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    const canvas = drawPageCanvas(page, opts);
    const imageName = `${opts.name}_${i}.png`;
    const plistName = `${opts.name}_${i}.plist`;
    const pngBlob = await canvasToBlob(canvas);
    zip.file(imageName, pngBlob);
    zip.file(plistName, plistString(page, imageName, canvas));
    summary.push(`${plistName} / ${imageName} | ${canvas.width}x${canvas.height} | ${page.sprites.length} frames`);

    if (i < 3) {
      const label = document.createElement('div');
      label.textContent = `${imageName} - ${canvas.width}x${canvas.height}，${page.sprites.length} 个图块`;
      const shown = document.createElement('canvas');
      shown.width = canvas.width;
      shown.height = canvas.height;
      shown.getContext('2d').drawImage(canvas, 0, 0);
      previewWrap.append(label, shown);
    }
  }

  zip.file('README.txt', [
    'Plist 图集打包结果',
    '===================',
    `sprites: ${sprites.length}`,
    `pages: ${pages.length}`,
    `max size: ${opts.maxWidth}x${opts.maxHeight}`,
    `padding: ${opts.padding}`,
    `trim transparent: ${$('trimTransparent').checked}`,
    `allow rotate: ${opts.allowRotate}`,
    '',
    ...summary,
  ].join('\n'));

  appendLog(logEl, '正在压缩导出...');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  downloadBlob(blob, `${opts.name}_atlas_plist.zip`);
  appendLog(logEl, `完成：${sprites.length} 张图片打成 ${pages.length} 页图集。`);
}

function setupDrop(dropId, inputId, stateKey, acceptFn) {
  const drop = $(dropId);
  const input = $(inputId);
  input.addEventListener('change', () => {
    state[stateKey] = [...input.files].filter(acceptFn);
  });
  drop.addEventListener('dragover', (e) => {
    e.preventDefault();
    drop.classList.add('dragover');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('dragover');
    state[stateKey] = [...e.dataTransfer.files].filter(acceptFn);
    const names = state[stateKey].slice(0, 8).map((f) => f.name).join(', ');
    if (stateKey === 'unpackFiles') log($('unpackLog'), `已选择 ${state[stateKey].length} 个文件：${names}`);
    if (stateKey === 'packFiles') log($('packLog'), `已选择 ${state[stateKey].length} 个文件：${names}`);
  });
}

$('btnUnpack').addEventListener('click', () => unpackAtlas().catch((err) => log($('unpackLog'), `错误：${err.message}`)));
$('btnPack').addEventListener('click', () => packAtlas().catch((err) => log($('packLog'), `错误：${err.message}`)));
$('packFilesLoose').addEventListener('change', () => {
  state.packFiles = [...$('packFilesLoose').files];
  log($('packLog'), `已选择 ${state.packFiles.length} 张图片。`);
});
setupDrop('unpackDrop', 'unpackFiles', 'unpackFiles', (f) => /\.(plist|png|jpg|jpeg|webp)$/i.test(f.name));
setupDrop('packDrop', 'packFiles', 'packFiles', (f) => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
