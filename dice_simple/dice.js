// 1. 每个点数应该显示哪些格子
// 骰子面是 3x3 网格，编号如下：
// 1 2 3
// 4 5 6
// 7 8 9
const DOTS = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9]
};

// 2. 要显示某个点数时，骰子应该旋转到哪个角度
const ROTATE_TO_VALUE = {
  1: { x: 0, y: 0 },
  2: { x: -90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: 90, y: 0 },
  6: { x: 0, y: 180 }
};

let historyList = [];

// 页面打开时，先把 6 个面的点画出来
initDiceFaces();

function initDiceFaces() {
  document.querySelectorAll('.face').forEach(face => {
    const value = Number(face.dataset.value);
    face.innerHTML = makeDots(value);
  });
}

function makeDots(value) {
  const onDots = DOTS[value];
  let html = '';

  for (let i = 1; i <= 9; i++) {
    html += `<div class="dot ${onDots.includes(i) ? 'on' : ''}"></div>`;
  }

  return html;
}

function randomD6() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice(count, mode) {
  const die1 = document.getElementById('die1');
  const die2 = document.getElementById('die2');
  const die2Wrap = document.getElementById('die2-wrap');
  const result = document.getElementById('result');

  die2Wrap.style.display = count === 2 ? 'block' : 'none';

  const rolls = [randomD6()];
  if (count === 2) rolls.push(randomD6());

  rotateDice(die1, rolls[0]);
  if (count === 2) rotateDice(die2, rolls[1]);

  let diceValue;
  let modeText;

  if (mode === 'high') {
    diceValue = Math.max(...rolls);
    modeText = '取高';
  } else if (mode === 'low') {
    diceValue = Math.min(...rolls);
    modeText = '取低';
  } else {
    diceValue = rolls.reduce((sum, n) => sum + n, 0);
    modeText = count === 2 ? '求和' : '';
  }

  const modifier = Number(document.getElementById('modifier').value) || 0;
  const total = diceValue + modifier;

  result.textContent = '投掷中...';

  setTimeout(() => {
    const modText = modifier === 0 ? '' : ` ${modifier > 0 ? '+' : ''}${modifier}`;
    result.textContent = `${rolls.join(' + ')} ${modeText} = ${diceValue}${modText}，最终：${total}`;
    addHistory(`${count}d6 ${modeText}：${rolls.join(', ')}${modText} = ${total}`);
  }, 650);
}

function rotateDice(diceElement, value) {
  const rotate = ROTATE_TO_VALUE[value];

  // 加一点固定倾斜，让最终画面更有立体感
  const finalX = rotate.x - 18;
  const finalY = rotate.y + 18;

  diceElement.animate([
    { transform: diceElement.style.transform || 'rotateX(-18deg) rotateY(18deg)' },
    { transform: 'rotateX(180deg) rotateY(260deg)' },
    { transform: `rotateX(${finalX}deg) rotateY(${finalY}deg)` }
  ], {
    duration: 600,
    easing: 'ease-out',
    fill: 'forwards'
  });

  diceElement.style.transform = `rotateX(${finalX}deg) rotateY(${finalY}deg)`;
}

function addHistory(text) {
  historyList.unshift(text);
  historyList = historyList.slice(0, 10);
  renderHistory();
}

function renderHistory() {
  document.getElementById('history').innerHTML = historyList
    .map(item => `<div class="history-item">${item}</div>`)
    .join('');
}

function clearHistory() {
  historyList = [];
  renderHistory();
  document.getElementById('result').textContent = '记录已清空';
}
