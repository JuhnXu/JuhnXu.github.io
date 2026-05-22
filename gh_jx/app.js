(function () {
  "use strict";

  var canvas = document.getElementById("cardCanvas");
  var ctx = canvas.getContext("2d");
  var input = document.getElementById("jsonInput");
  var renderBtn = document.getElementById("renderBtn");
  var downloadBtn = document.getElementById("downloadBtn");
  var resetBtn = document.getElementById("resetBtn");
  var message = document.getElementById("message");
  var statusDot = document.getElementById("statusDot");

  var SHEET_W = 1420;
  var HERO_H = 520;
  var CARD_W = 400;
  var CARD_H = 610;
  var GAP = 34;
  var MARGIN = 50;

  var sampleData = {
    character: {
      name: "潮刃守卫",
      title: "Harbor Warden",
      level: 1,
      handSize: 10,
      initiative: 47,
      stamina: 10,
      element: "冰",
      traits: ["近战压制", "护盾", "潮汐位移"],
      notes: [
        "回合开始时可选择获得 1 点护盾或移动 1 格。",
        "若本轮消耗冰元素，下一次攻击附加推开 1。"
      ],
      health: [10, 12, 14, 16, 18, 21, 24, 27, 30],
      portrait: {
        primary: "#c7a467",
        secondary: "#24475a",
        glow: "#8bf3ff",
        sigil: "W"
      }
    },
    skills: [
      {
        name: "裂潮斩",
        level: 1,
        initiative: 32,
        cardNo: "001",
        top: {
          type: "Attack",
          value: 3,
          range: 1,
          target: 1,
          effects: ["Push 1", "若目标相邻水域或陷阱，再造成 +1 伤害。"],
          xp: 1,
          area: [
            [0, 0, "red"],
            [1, 0, "red"],
            [0, 1, "gray"]
          ]
        },
        bottom: {
          type: "Move",
          value: 3,
          effects: ["Jump", "移动结束后，相邻一名盟友获得 Shield 1。"],
          element: "冰"
        }
      },
      {
        name: "盐雾壁垒",
        level: 1,
        initiative: 18,
        cardNo: "002",
        top: {
          type: "Shield",
          value: 2,
          effects: ["Affect self and adjacent allies.", "本轮受到的第一次伤害减少 1。"],
          xp: 1
        },
        bottom: {
          type: "Attack",
          value: 2,
          range: 2,
          effects: ["Immobilize", "消耗冰元素：再选择一个目标。"],
          area: [
            [0, 0, "red"],
            [1, 0, "gray"],
            [0, -1, "red"]
          ]
        }
      },
      {
        name: "锚链横扫",
        level: 1,
        initiative: 54,
        cardNo: "003",
        top: {
          type: "Attack",
          value: 2,
          target: 3,
          effects: ["所有目标必须与你相邻。", "每命中一个目标，获得 1 XP。"],
          loss: true,
          area: [
            [-1, 0, "red"],
            [0, 0, "gray"],
            [1, 0, "red"],
            [0, 1, "red"]
          ]
        },
        bottom: {
          type: "Move",
          value: 2,
          effects: ["Pull 1", "之后执行 Attack 1。"]
        }
      },
      {
        name: "寒灯突进",
        level: 1,
        initiative: 69,
        cardNo: "004",
        top: {
          type: "Attack",
          value: 4,
          effects: ["若本轮已移动至少 3 格，附加 Wound。"],
          xp: 1
        },
        bottom: {
          type: "Move",
          value: 5,
          effects: ["若穿过敌人相邻格，每经过一名敌人获得 1 XP。"],
          loss: true,
          element: "光"
        }
      },
      {
        name: "低潮回旋",
        level: 1,
        initiative: 41,
        cardNo: "005",
        top: {
          type: "Attack",
          value: 2,
          range: 3,
          effects: ["Curse", "若目标已受伤，附加 Disadvantage。"]
        },
        bottom: {
          type: "Heal",
          value: 3,
          range: 1,
          effects: ["Affect one ally.", "该盟友可移动 1 格。"],
          xp: 1
        }
      },
      {
        name: "港门戒令",
        level: 1,
        initiative: 12,
        cardNo: "006",
        top: {
          type: "Retaliate",
          value: 2,
          effects: ["Self", "Round bonus.", "每次反击后可 Push 1。"]
        },
        bottom: {
          type: "Move",
          value: 2,
          effects: ["Loot 1", "若拾取金币，获得 Shield 1。"]
        }
      }
    ]
  };

  input.value = JSON.stringify(sampleData, null, 2);
  renderFromInput();

  renderBtn.addEventListener("click", renderFromInput);
  resetBtn.addEventListener("click", function () {
    input.value = JSON.stringify(sampleData, null, 2);
    renderFromInput();
  });
  downloadBtn.addEventListener("click", function () {
    try {
      renderFromInput();
      var name = safeFileName((readData().character || {}).name || "character-cards");
      var link = document.createElement("a");
      link.download = name + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      setMessage("导出失败：" + error.message, true);
    }
  });

  function readData() {
    return JSON.parse(input.value);
  }

  function renderFromInput() {
    try {
      var data = readData();
      normalizeData(data);
      drawSheet(data);
      setMessage("已生成 " + getCards(data).length + " 张技能卡。", false);
    } catch (error) {
      setMessage("JSON 无法解析：" + error.message, true);
    }
  }

  function setMessage(text, isError) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
    statusDot.classList.toggle("is-error", isError);
  }

  function normalizeData(data) {
    data.character = data.character || {};
    data.skills = getCards(data);
    if (!Array.isArray(data.skills)) data.skills = [];
  }

  function getCards(data) {
    return Array.isArray(data.skills) ? data.skills : Array.isArray(data.cards) ? data.cards : [];
  }

  function drawSheet(data) {
    var cards = getCards(data);
    var rows = Math.max(1, Math.ceil(cards.length / 3));
    var height = MARGIN + HERO_H + GAP + rows * CARD_H + (rows - 1) * GAP + MARGIN;

    canvas.width = SHEET_W;
    canvas.height = height;

    drawBackground(ctx, SHEET_W, height, hashString((data.character || {}).name || "sheet"));
    drawHeroBoard(ctx, data.character || {}, MARGIN, MARGIN, SHEET_W - MARGIN * 2, HERO_H);

    cards.forEach(function (card, index) {
      var col = index % 3;
      var row = Math.floor(index / 3);
      var totalW = CARD_W * 3 + GAP * 2;
      var startX = (SHEET_W - totalW) / 2;
      var x = startX + col * (CARD_W + GAP);
      var y = MARGIN + HERO_H + GAP + row * (CARD_H + GAP);
      drawSkillCard(ctx, card, x, y, CARD_W, CARD_H);
    });
  }

  function drawBackground(c, w, h, seed) {
    var bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#1b1f20");
    bg.addColorStop(0.5, "#0f1719");
    bg.addColorStop(1, "#242321");
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);

    var rnd = seeded(seed);
    for (var i = 0; i < 5200; i += 1) {
      var alpha = rnd() * 0.14;
      c.fillStyle = "rgba(255,255,255," + alpha + ")";
      c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }

    c.strokeStyle = "rgba(132, 170, 174, 0.11)";
    c.lineWidth = 1;
    for (var j = 0; j < 90; j += 1) {
      var x = rnd() * w;
      var y = rnd() * h;
      c.beginPath();
      c.moveTo(x, y);
      for (var k = 0; k < 3; k += 1) {
        x += rnd() * 80 - 40;
        y += rnd() * 60 - 30;
        c.lineTo(x, y);
      }
      c.stroke();
    }
  }

  function drawHeroBoard(c, hero, x, y, w, h) {
    drawStonePanel(c, x, y, w, h, 12);
    drawNeonFrame(c, x + 8, y + 8, w - 16, h - 16, 14);

    var portraitW = 420;
    drawPortrait(c, hero, x + 34, y + 42, portraitW, h - 84);
    drawNeonFrame(c, x + 34, y + 42, portraitW, h - 84, 10);

    var infoX = x + portraitW + 76;
    var infoY = y + 40;
    var infoW = w - portraitW - 118;

    c.save();
    c.textAlign = "center";
    c.shadowColor = "rgba(152, 242, 255, 0.8)";
    c.shadowBlur = 10;
    c.fillStyle = "#f5f0e7";
    c.font = "700 58px Georgia, serif";
    c.fillText(hero.name || "未命名角色", infoX + infoW / 2, infoY + 62);
    c.shadowBlur = 0;
    c.fillStyle = "rgba(184, 248, 255, 0.85)";
    c.font = "22px Georgia, serif";
    c.fillText(hero.title || "Adventurer", infoX + infoW / 2, infoY + 98);
    c.restore();

    drawCornerBadge(c, x + w - 104, y + 36, hero.handSize || hero.stamina || 10);

    drawInfoRows(c, hero, infoX, infoY + 132, infoW, 168);
    drawTraits(c, hero, infoX, infoY + 318, infoW, 72);
    drawHealthTrack(c, hero.health || [], infoX, y + h - 84, infoW, 44);
  }

  function drawPortrait(c, hero, x, y, w, h) {
    var colors = hero.portrait || {};
    var bg = c.createRadialGradient(x + w * 0.5, y + h * 0.52, 30, x + w * 0.5, y + h * 0.5, w * 0.72);
    bg.addColorStop(0, "rgba(127, 229, 255, 0.3)");
    bg.addColorStop(0.45, colors.secondary || "#173746");
    bg.addColorStop(1, "#081216");
    c.fillStyle = bg;
    roundRect(c, x, y, w, h, 10);
    c.fill();

    for (var i = 0; i < 42; i += 1) {
      c.strokeStyle = "rgba(255,255,255,0.05)";
      c.beginPath();
      c.moveTo(x + Math.random() * w, y + Math.random() * h);
      c.lineTo(x + Math.random() * w, y + Math.random() * h);
      c.stroke();
    }

    var cx = x + w / 2;
    var base = y + h * 0.83;
    var gold = colors.primary || "#c8a86c";
    var glow = colors.glow || "#8bf3ff";

    c.save();
    c.shadowColor = glow;
    c.shadowBlur = 18;
    c.strokeStyle = "rgba(210, 246, 255, 0.5)";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(cx - 54, y + 90);
    c.quadraticCurveTo(cx - 108, y + 36, cx - 134, y + 118);
    c.moveTo(cx + 54, y + 90);
    c.quadraticCurveTo(cx + 108, y + 36, cx + 134, y + 118);
    c.stroke();
    c.shadowBlur = 0;

    var armor = c.createLinearGradient(cx - 70, y + 120, cx + 80, base);
    armor.addColorStop(0, "#fff2bd");
    armor.addColorStop(0.25, gold);
    armor.addColorStop(1, "#4f3c27");

    c.fillStyle = armor;
    c.beginPath();
    c.ellipse(cx, y + 110, 44, 56, 0, 0, Math.PI * 2);
    c.fill();

    c.beginPath();
    c.moveTo(cx - 86, y + 176);
    c.lineTo(cx + 86, y + 176);
    c.lineTo(cx + 118, base - 18);
    c.lineTo(cx - 118, base - 18);
    c.closePath();
    c.fill();

    c.fillStyle = "rgba(13, 24, 27, 0.58)";
    c.beginPath();
    c.moveTo(cx - 42, y + 192);
    c.lineTo(cx + 42, y + 192);
    c.lineTo(cx + 24, base - 34);
    c.lineTo(cx - 24, base - 34);
    c.closePath();
    c.fill();

    c.strokeStyle = "rgba(255, 248, 219, 0.82)";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(cx - 106, y + 210);
    c.lineTo(cx - 162, base - 42);
    c.moveTo(cx + 106, y + 210);
    c.lineTo(cx + 162, base - 42);
    c.moveTo(cx - 46, base - 18);
    c.lineTo(cx - 62, base + 38);
    c.moveTo(cx + 46, base - 18);
    c.lineTo(cx + 62, base + 38);
    c.stroke();

    c.fillStyle = "rgba(255,255,255,0.84)";
    c.font = "700 52px Georgia, serif";
    c.textAlign = "center";
    c.fillText((colors.sigil || "G").slice(0, 1), cx, y + h - 34);
    c.restore();
  }

  function drawInfoRows(c, hero, x, y, w, h) {
    var rows = [
      ["Start of round", "选择两张牌，长休或短休。"],
      ["Initiative", String(hero.initiative || "由主牌决定")],
      ["On turn", "执行上半与下半行动，顺序自定。"],
      ["End of round", (hero.notes || []).join(" ")]
    ];

    c.save();
    c.strokeStyle = "rgba(127, 229, 255, 0.34)";
    c.lineWidth = 1;
    c.font = "18px Georgia, serif";
    rows.forEach(function (row, i) {
      var rowY = y + (h / rows.length) * i;
      c.strokeRect(x, rowY, w, h / rows.length);
      c.fillStyle = "rgba(118, 232, 255, 0.84)";
      c.fillText(row[0], x + 14, rowY + 29);
      c.fillStyle = "#f3eee4";
      c.font = "18px 'Segoe UI', 'Microsoft YaHei', sans-serif";
      wrapText(c, row[1], x + 188, rowY + 28, w - 208, 23, 2);
      c.font = "18px Georgia, serif";
    });
    c.restore();
  }

  function drawTraits(c, hero, x, y, w, h) {
    var traits = hero.traits || [];
    c.save();
    c.strokeStyle = "rgba(127, 229, 255, 0.32)";
    c.strokeRect(x, y, w, h);
    c.fillStyle = "rgba(118, 232, 255, 0.86)";
    c.font = "18px Georgia, serif";
    c.fillText("Traits", x + 14, y + 28);
    var tx = x + 100;
    traits.forEach(function (trait) {
      var bw = Math.max(86, c.measureText(trait).width + 30);
      drawChip(c, tx, y + 15, bw, 34, trait);
      tx += bw + 12;
    });
    c.restore();
  }

  function drawHealthTrack(c, health, x, y, w, h) {
    var levels = health.length ? health : [8, 9, 11, 12, 14, 16, 18, 20, 22];
    var boxW = Math.min(72, (w - 112) / levels.length);
    c.save();
    c.font = "18px Georgia, serif";
    c.fillStyle = "#f5f0e7";
    c.fillText("HP", x, y + 29);
    levels.forEach(function (hp, i) {
      var bx = x + 58 + i * boxW;
      c.strokeStyle = "rgba(255,255,255,0.42)";
      c.strokeRect(bx, y, boxW, h / 2);
      c.strokeRect(bx, y + h / 2, boxW, h / 2);
      c.fillStyle = "#f2eee7";
      c.fillText(String(i + 1), bx + boxW / 2 - 5, y + 16);
      c.fillStyle = "#ff7474";
      c.fillText(String(hp), bx + boxW / 2 - String(hp).length * 5, y + 38);
    });
    c.restore();
  }

  function drawSkillCard(c, card, x, y, w, h) {
    drawStonePanel(c, x, y, w, h, 18);
    drawNeonFrame(c, x + 14, y + 14, w - 28, h - 28, 12);
    drawHeader(c, card, x + 32, y + 24, w - 64);

    var topY = y + 112;
    var midY = y + 314;
    var bottomY = y + 374;

    drawAction(c, card.top || {}, x + 40, topY, w - 80, 180, "top");
    drawInitiativeBand(c, card, x + 34, midY, w - 68);
    drawAction(c, card.bottom || {}, x + 40, bottomY, w - 80, 168, "bottom");

    c.save();
    c.fillStyle = "rgba(245, 240, 231, 0.82)";
    c.font = "13px Georgia, serif";
    c.textAlign = "center";
    c.fillText(card.cardNo || card.number || "", x + w / 2, y + h - 32);
    c.restore();
  }

  function drawHeader(c, card, x, y, w) {
    c.save();
    c.textAlign = "center";
    c.fillStyle = "#f7f1e6";
    c.shadowColor = "rgba(184, 248, 255, 0.9)";
    c.shadowBlur = 9;
    c.font = "700 31px Georgia, 'Microsoft YaHei', serif";
    c.fillText(card.name || "Unnamed Skill", x + w / 2, y + 34);
    c.shadowBlur = 0;

    drawHex(c, x + w / 2, y + 62, 24, "#496db0", "rgba(221, 241, 255, 0.96)");
    c.fillStyle = "#ffffff";
    c.font = "700 20px Georgia, serif";
    c.fillText(String(card.level || 1), x + w / 2, y + 69);
    c.restore();
  }

  function drawAction(c, action, x, y, w, h, slot) {
    var centerX = x + w / 2;
    c.save();
    c.textAlign = "center";
    c.fillStyle = "#f7f0e5";
    c.font = "700 30px Georgia, 'Microsoft YaHei', serif";
    var title = action.type ? action.type + (action.value !== undefined ? " " + action.value : "") : slot === "top" ? "Attack 2" : "Move 2";
    c.fillText(title, centerX, y + 40);

    c.fillStyle = "rgba(118, 232, 255, 0.7)";
    c.beginPath();
    c.arc(centerX + Math.min(120, c.measureText(title).width / 2 + 26), y + 31, 5, 0, Math.PI * 2);
    c.fill();

    var icons = [];
    if (action.range !== undefined) icons.push("Range " + action.range);
    if (action.target !== undefined) icons.push("Target " + action.target);
    if (action.xp) icons.push("XP " + action.xp);
    if (action.loss) icons.push("Lost");

    c.font = "18px Georgia, 'Microsoft YaHei', serif";
    c.fillStyle = "#f4eee3";
    c.fillText(icons.join("  |  "), centerX, y + 72);

    c.textAlign = "left";
    c.font = "18px 'Segoe UI', 'Microsoft YaHei', sans-serif";
    c.fillStyle = "#f3eee7";
    var effects = Array.isArray(action.effects) ? action.effects : action.text ? [action.text] : [];
    var textX = x + 8;
    var textW = action.area ? w - 128 : w - 16;
    wrapText(c, effects.join(" "), textX, y + 104, textW, 24, 4);

    if (action.area) {
      drawArea(c, action.area, x + w - 94, y + 88, 28);
    }

    if (action.element) {
      drawElement(c, action.element, centerX, y + h - 18);
    }
    c.restore();
  }

  function drawInitiativeBand(c, card, x, y, w) {
    c.save();
    c.strokeStyle = "rgba(127, 229, 255, 0.74)";
    c.shadowColor = "rgba(127, 229, 255, 0.8)";
    c.shadowBlur = 10;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x, y + 24);
    c.lineTo(x + w * 0.38, y + 24);
    c.lineTo(x + w * 0.45, y);
    c.lineTo(x + w * 0.55, y);
    c.lineTo(x + w * 0.62, y + 24);
    c.lineTo(x + w, y + 24);
    c.stroke();

    c.shadowBlur = 0;
    drawHex(c, x + w / 2, y + 28, 42, "#242728", "rgba(255,255,255,0.92)");
    c.fillStyle = "#ffffff";
    c.font = "700 48px Georgia, serif";
    c.textAlign = "center";
    c.fillText(pad2(card.initiative || 50), x + w / 2, y + 43);
    c.restore();
  }

  function drawArea(c, area, x, y, size) {
    var cells = Array.isArray(area) ? area : [];
    c.save();
    cells.forEach(function (cell) {
      var q = Number(cell[0] || 0);
      var r = Number(cell[1] || 0);
      var color = cell[2] === "red" ? "#d52b35" : "#4c5555";
      var px = x + q * size * 0.86;
      var py = y + (r + q * 0.5) * size * 0.98;
      drawHex(c, px, py, size / 2, color, "#f0f0f0");
    });
    c.restore();
  }

  function drawElement(c, element, x, y) {
    c.save();
    c.beginPath();
    c.arc(x, y, 22, 0, Math.PI * 2);
    c.fillStyle = "rgba(216, 244, 247, 0.78)";
    c.fill();
    c.fillStyle = "#38535a";
    c.font = "700 18px Georgia, 'Microsoft YaHei', serif";
    c.textAlign = "center";
    c.fillText(String(element).slice(0, 2), x, y + 6);
    c.restore();
  }

  function drawStonePanel(c, x, y, w, h, radius) {
    var grad = c.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, "#2f3332");
    grad.addColorStop(0.48, "#101a1d");
    grad.addColorStop(1, "#313231");
    c.save();
    roundRect(c, x, y, w, h, radius);
    c.fillStyle = grad;
    c.fill();
    c.strokeStyle = "rgba(255,255,255,0.16)";
    c.stroke();
    c.restore();
  }

  function drawNeonFrame(c, x, y, w, h, radius) {
    c.save();
    c.shadowColor = "rgba(112, 232, 255, 0.95)";
    c.shadowBlur = 15;
    c.lineWidth = 4;
    c.strokeStyle = "rgba(153, 246, 255, 0.94)";
    roundRect(c, x, y, w, h, radius);
    c.stroke();
    c.shadowBlur = 0;
    c.lineWidth = 1;
    c.strokeStyle = "rgba(255, 255, 255, 0.7)";
    roundRect(c, x + 5, y + 5, w - 10, h - 10, Math.max(2, radius - 4));
    c.stroke();
    c.restore();
  }

  function drawCornerBadge(c, x, y, value) {
    c.save();
    drawHex(c, x, y, 42, "#4bbde7", "rgba(255,255,255,0.92)");
    c.fillStyle = "#10232a";
    c.font = "700 28px Georgia, serif";
    c.textAlign = "center";
    c.fillText(String(value), x, y + 10);
    c.restore();
  }

  function drawChip(c, x, y, w, h, text) {
    c.save();
    roundRect(c, x, y, w, h, 6);
    c.fillStyle = "rgba(127, 229, 255, 0.12)";
    c.fill();
    c.strokeStyle = "rgba(127, 229, 255, 0.42)";
    c.stroke();
    c.fillStyle = "#f3eee7";
    c.font = "16px 'Segoe UI', 'Microsoft YaHei', sans-serif";
    c.textAlign = "center";
    c.fillText(text, x + w / 2, y + 22);
    c.restore();
  }

  function drawHex(c, x, y, radius, fill, stroke) {
    c.save();
    c.beginPath();
    for (var i = 0; i < 6; i += 1) {
      var angle = Math.PI / 6 + (Math.PI * 2 * i) / 6;
      var px = x + Math.cos(angle) * radius;
      var py = y + Math.sin(angle) * radius;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.lineWidth = Math.max(2, radius * 0.11);
    c.strokeStyle = stroke;
    c.stroke();
    c.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + radius, y);
    c.arcTo(x + w, y, x + w, y + h, radius);
    c.arcTo(x + w, y + h, x, y + h, radius);
    c.arcTo(x, y + h, x, y, radius);
    c.arcTo(x, y, x + w, y, radius);
    c.closePath();
  }

  function wrapText(c, text, x, y, maxWidth, lineHeight, maxLines) {
    var words = tokenizeText(String(text || ""));
    var line = "";
    var lines = 0;

    for (var i = 0; i < words.length; i += 1) {
      var token = words[i];
      var spacer = shouldJoinWithoutSpace(line, token) ? "" : " ";
      var testLine = line ? line + spacer + token : token;
      if (c.measureText(testLine).width > maxWidth && line) {
        c.fillText(line, x, y + lines * lineHeight);
        lines += 1;
        line = words[i];
        if (maxLines && lines >= maxLines) return;
      } else {
        line = testLine;
      }
    }

    if (line && (!maxLines || lines < maxLines)) {
      c.fillText(line, x, y + lines * lineHeight);
    }
  }

  function tokenizeText(text) {
    var tokens = [];
    var current = "";
    for (var i = 0; i < text.length; i += 1) {
      var ch = text[i];
      if (/\s/.test(ch)) {
        if (current) tokens.push(current);
        current = "";
      } else if (/[\u3400-\u9fff]/.test(ch)) {
        if (current) tokens.push(current);
        current = "";
        tokens.push(ch);
      } else {
        current += ch;
      }
    }
    if (current) tokens.push(current);
    return tokens;
  }

  function shouldJoinWithoutSpace(left, right) {
    return /[\u3400-\u9fff]$/.test(left) || /^[\u3400-\u9fff。，、：；！？]/.test(right);
  }

  function safeFileName(name) {
    return String(name).replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 60);
  }

  function pad2(value) {
    var num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return num < 10 ? "0" + num : String(num);
  }

  function hashString(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  function seeded(seed) {
    var state = seed || 123456789;
    return function () {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
})();
