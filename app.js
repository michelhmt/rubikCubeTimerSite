// Supabase設定（適宜自分のキーに書き換えてください）
const SUPABASE_URL = 'https://sqknnxyumrbiunsllzcl.supabase.co';
const SUPABASE_KEY = 'sb_publishable_QKQjNX4H8SLKclkvH8zrUg_DQOeLl_I';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 状態管理
let playerCount = 5;
let players = [];
let spacePressTimer = null;
let isReady = false;
let globalState = 'IDLE'; // 'IDLE', 'HOLDING', 'READY', 'RUNNING'

const timerGrid = document.getElementById('timer-grid');
const countButtons = document.querySelectorAll('.player-count-btn');
const saveAllBtn = document.getElementById('save-all-btn');

// --- 1. プレイヤーUIの初期化 ---
function initPlayers(count) {
  playerCount = count;
  players = [];
  timerGrid.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const p = {
      id: i + 1,
      name: `プレイヤー ${i + 1}`,
      startTime: 0,
      elapsedTime: 0,
      intervalId: null,
      isFinished: false
    };
    players.push(p);

    // DaisyUI の card / input / btn クラスを使用したカード構造
    const card = document.createElement('div');
    card.id = `player-card-${p.id}`;
    card.className = "card bg-base-100 shadow-xl border border-base-200 p-4 flex flex-col items-center justify-between";
    card.innerHTML = `
      <input type="text" value="${p.name}" class="player-name input input-ghost input-sm text-center font-bold text-base w-3/4 mb-1" data-id="${p.id}" />
      <div id="timer-${p.id}" class="timer-font text-5xl sm:text-6xl font-black text-base-content my-2 select-none">
        00.00
      </div>
      <button class="stop-btn btn btn-error btn-sm w-full font-bold text-white mt-2" data-id="${p.id}">
        ストップ
      </button>
    `;
    timerGrid.appendChild(card);
  }

  // 名前変更イベント
  document.querySelectorAll('.player-name').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id) - 1;
      players[id].name = e.target.value;
    });
  });

  // 個別ストップボタン（画面タップ操作用）
  document.querySelectorAll('.stop-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id) - 1;
      stopIndividualTimer(id);
    });
  });
}

// --- 2. スペースキー長押し ＆ 一斉スタート処理 ---

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.repeat) return;
  if (document.activeElement.tagName === 'INPUT') return;
  e.preventDefault();

  // 1. 全員スタート前の準備（0.3秒長押し判定）
  if (globalState === 'IDLE') {
    globalState = 'HOLDING';
    
    // 赤色（押し始め）
    setAllTimerColor('text-error');

    // 0.3秒長押しタイマー
    spacePressTimer = setTimeout(() => {
      isReady = true;
      globalState = 'READY';
      // 0.3秒経ったら「緑色」に点灯！
      setAllTimerColor('text-success');
    }, 300);
  } 
  // 2. 実行中：スペースキーを押すと「未ゴールの中で一番若い番号のプレイヤー」を停止
  else if (globalState === 'RUNNING') {
    const runningPlayerIndex = players.findIndex(p => !p.isFinished);
    if (runningPlayerIndex !== -1) {
      stopIndividualTimer(runningPlayerIndex);
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code !== 'Space') return;
  if (document.activeElement.tagName === 'INPUT') return;

  if (globalState === 'HOLDING' || globalState === 'READY') {
    clearTimeout(spacePressTimer);

    if (isReady) {
      // 0.3秒以上長押し完了していたら「一斉スタート！」
      startAllTimers();
    } else {
      // 0.3秒未満で放した場合はキャンセル（元の色に戻す）
      setAllTimerColor('text-base-content');
      globalState = 'IDLE';
    }
  }
});

// 全タイマー一斉スタート
function startAllTimers() {
  globalState = 'RUNNING';
  isReady = false;
  setAllTimerColor('text-warning');

  const now = Date.now();
  players.forEach((p) => {
    p.startTime = now;
    p.elapsedTime = 0;
    p.isFinished = false;
    
    p.intervalId = setInterval(() => {
      p.elapsedTime = Date.now() - p.startTime;
      const el = document.getElementById(`timer-${p.id}`);
      if (el) el.textContent = (p.elapsedTime / 1000).toFixed(2);
    }, 10);
  });
}

// プレイヤー個別のタイマー停止
function stopIndividualTimer(index) {
  const p = players[index];
  if (!p || p.isFinished || !p.intervalId) return;

  clearInterval(p.intervalId);
  p.intervalId = null;
  p.isFinished = true;

  // タイム確定表示（元の色に戻す）
  const timerEl = document.getElementById(`timer-${p.id}`);
  if (timerEl) {
    timerEl.className = "timer-font text-5xl sm:text-6xl font-black text-base-content my-2 select-none";
  }

  // 全員ストップしたか判定
  const allFinished = players.every(p => p.isFinished);
  if (allFinished) {
    globalState = 'IDLE';
  }
}

// タイマー文字色の一括変更
function setAllTimerColor(colorClass) {
  players.forEach(p => {
    if (!p.isFinished) {
      const el = document.getElementById(`timer-${p.id}`);
      if (el) el.className = `timer-font text-5xl sm:text-6xl font-black ${colorClass} my-2 select-none`;
    }
  });
}

// --- 3. 人数変更ボタンのイベント ---
countButtons.forEach(btn => {
  btn.addEventListener('click', (e) => {
    countButtons.forEach(b => {
      b.className = "player-count-btn join-item btn btn-sm btn-neutral";
    });
    e.target.className = "player-count-btn join-item btn btn-sm btn-warning";

    const count = parseInt(e.target.dataset.count);
    initPlayers(count);
  });
});

// --- 4. Supabaseへの一括保存 ---
saveAllBtn.addEventListener('click', async () => {
  const recordsToInsert = players
    .filter(p => p.elapsedTime > 0)
    .map(p => ({
      player_name: p.name,
      time_seconds: parseFloat((p.elapsedTime / 1000).toFixed(2)),
      created_at: new Date()
    }));

  if (recordsToInsert.length === 0) {
    alert('保存する記録がありません');
    return;
  }

  const { data, error } = await supabase.from('records').insert(recordsToInsert);

  if (error) {
    console.error(error);
    alert('保存に失敗しました');
  } else {
    alert(`${recordsToInsert.length}人分の記録を保存しました！`);
  }
});

// 初期表示（5人で起動）
initPlayers(5);