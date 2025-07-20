import { DiscordSDK } from "@discord/embedded-app-sdk";

import "./style.css";

// Will eventually store the authenticated user's access_token
let auth: any;

// Discord SDKの初期化（環境変数が存在しない場合はnull）
const discordSdk = import.meta.env.VITE_DISCORD_CLIENT_ID 
  ? new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID)
  : null;

// 色の配列をグローバルに定義
const WHEEL_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#a8e6cf', '#dcedc1'];

// ルーレット機能の状態管理
interface RouletteState {
  items: string[];
  isSpinning: boolean;
  result: string;
}

let rouletteState: RouletteState = {
  items: [],
  isSpinning: false,
  result: ''
};

// Discord SDKの初期化を試行し、失敗してもルーレット機能は動作するようにする
setupDiscordSdk().then(() => {
  console.log("Discord SDK is authenticated");

  // appendVoiceChannelName();
  // appendGuildAvatar();
  
  // We can now make API calls within the scopes we requested in setupDiscordSdk()
  // Note: the access_token returned is a sensitive secret and should be treated as such
}).catch((error) => {
  console.error("Discord SDK setup failed:", error);
  // Discord SDKの初期化に失敗しても、ルーレット機能は動作する
});

// ルーレット機能の初期化
function initializeRoulette() {
  const app = document.querySelector('#app');
  if (!app) return;

  // ルーレットUIを追加
  app.innerHTML = `
    <div class="main-content">
      <div class="roulette-container">
        <h2 class="roulette-title">🎯 ランダムルーレット</h2>
        
        <div class="wheel-section">
          <div class="wheel-pointer"></div>
          <div class="wheel-container" id="wheelContainer"></div>
        </div>
        
        <div class="result-display" id="resultDisplay">
          ${rouletteState.result || '結果がここに表示されます'}
        </div>
        
        <div class="input-section">
          <div class="input-group">
            <input type="text" id="itemInput" placeholder="項目を入力してください" />
            <button class="add-button" id="addButton">追加</button>
          </div>
          
          <div class="items-list" id="itemsList">
            ${rouletteState.items.map(item => `
              <span class="item-tag">
                ${item}
                <button class="remove-item" data-item="${item}">×</button>
              </span>
            `).join('')}
          </div>
          
          <button class="spin-button" id="spinButton" ${rouletteState.items.length === 0 ? 'disabled' : ''}>
            🎲 ルーレットを回す
          </button>
        </div>
      </div>
    </div>
  `;
  
  // イベントリスナーを設定
  setupEventListeners();
  updateWheel();
}

// 項目を追加する関数
function addItem() {
  console.log('addItem function called');
  const input = document.getElementById('itemInput') as HTMLInputElement;
  if (!input) {
    console.error('itemInput element not found');
    return;
  }
  
  const item = input.value.trim();
  console.log('Input value:', item);
  
  if (item && !rouletteState.items.includes(item)) {
    rouletteState.items.push(item);
    input.value = '';
    console.log('Item added:', item);
    console.log('Current items:', rouletteState.items);
    updateUI();
  } else if (!item) {
    console.log('Empty input, ignoring');
  } else {
    console.log('Item already exists:', item);
  }
}

// 項目を削除する関数
function removeItem(item: string) {
  rouletteState.items = rouletteState.items.filter(i => i !== item);
  updateUI();
}

// ルーレットを回す関数
function spinRoulette() {
  if (rouletteState.items.length === 0 || rouletteState.isSpinning) return;
  
  rouletteState.isSpinning = true;
  updateUI();
  
  // ランダムな結果を選択
  const randomIndex = Math.floor(Math.random() * rouletteState.items.length);
  const selectedItem = rouletteState.items[randomIndex];
  
  // アニメーション効果
  const wheelContainer = document.getElementById('wheelContainer');
  const resultDisplay = document.getElementById('resultDisplay');
  
  if (wheelContainer && resultDisplay) {
    // 現在の回転角度を取得
    const currentTransform = wheelContainer.style.transform;
    const currentMatch = currentTransform.match(/rotate\(([^)]+)deg\)/);
    const startRotation = currentMatch ? parseFloat(currentMatch[1]) : 0;
    
    // ホイールの回転アニメーション
    const rotations = 5 + Math.random() * 5; // 5-10回転
    const finalRotation = startRotation + rotations * 360 + (randomIndex * (360 / rouletteState.items.length));
    
    // 回転アニメーションの開始時刻
    const startTime = Date.now();
    const animationDuration = 3000; // 3秒
    
    // リアルタイムで回転角度を更新するアニメーション
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // イージング関数（ease-out）
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentRotation = startRotation + (finalRotation - startRotation) * easeOut;
      wheelContainer.style.transform = `rotate(${currentRotation}deg)`;
      
      // 現在指している項目を表示
      const currentItem = getCurrentPointedItemFromRotation(currentRotation);
      resultDisplay.textContent = currentItem;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // アニメーション完了
        resultDisplay.textContent = selectedItem;
        rouletteState.result = selectedItem;
        rouletteState.isSpinning = false;
        updateUI();
      }
    };
    
    // アニメーション開始
    requestAnimationFrame(animate);
  }
}

// ホイールを更新する関数
function updateWheel() {
  const wheelContainer = document.getElementById('wheelContainer');
  if (!wheelContainer) return;
  
  if (rouletteState.items.length === 0) {
    wheelContainer.style.background = 'conic-gradient(from 0deg, #ccc 0deg 360deg)';
    wheelContainer.innerHTML = '';
    return;
  }
  
  const segmentAngle = 360 / rouletteState.items.length;
  let gradient = 'conic-gradient(from 0deg';
  
  rouletteState.items.forEach((item, index) => {
    const color = WHEEL_COLORS[index % WHEEL_COLORS.length];
    const startAngle = index * segmentAngle;
    const endAngle = (index + 1) * segmentAngle;
    gradient += `, ${color} ${startAngle}deg ${endAngle}deg`;
  });
  
  gradient += ')';
  wheelContainer.style.background = gradient;
  
  // 項目名をホイールに表示
  const itemLabels = rouletteState.items.map((item, index) => {
    const angle = index * segmentAngle + segmentAngle / 2; // セグメントの中心
    const radius = 110; // ラベルの位置（ホイールの中心からの距離）
    const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
    const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
    
    return `
      <div class="wheel-label" style="
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(${x}px, ${y}px) rotate(${angle}deg);
        color: white;
        font-weight: bold;
        font-size: 16px;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.9);
        white-space: nowrap;
        pointer-events: none;
        z-index: 5;
        text-align: center;
        width: 80px;
        margin-left: -40px;
      ">
        ${item}
      </div>
    `;
  }).join('');
  
  wheelContainer.innerHTML = itemLabels;
}

// 回転角度から指している項目を取得する関数
function getCurrentPointedItemFromRotation(rotation: number): string {
  if (rouletteState.items.length === 0) return '';
  
  // 正規化された角度を計算（0-360度の範囲に）
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  
  // 三角形は上部（0度）を指しているので、回転角度から項目を計算
  const segmentAngle = 360 / rouletteState.items.length;
  const itemIndex = Math.floor(((360 - normalizedRotation) % 360) / segmentAngle);
  
  return rouletteState.items[itemIndex] || '';
}

// 現在指している項目を取得する関数
function getCurrentPointedItem(): string {
  if (rouletteState.items.length === 0) return '';
  
  const wheelContainer = document.getElementById('wheelContainer');
  if (!wheelContainer) return '';
  
  // 現在の回転角度を取得
  const transform = wheelContainer.style.transform;
  const match = transform.match(/rotate\(([^)]+)deg\)/);
  const rotation = match ? parseFloat(match[1]) : 0;
  
  return getCurrentPointedItemFromRotation(rotation);
}

// UIを更新する関数
function updateUI() {
  const itemsList = document.getElementById('itemsList');
  const spinButton = document.getElementById('spinButton');
  const resultDisplay = document.getElementById('resultDisplay');
  
  if (itemsList) {
    itemsList.innerHTML = rouletteState.items.map((item, index) => {
      const color = WHEEL_COLORS[index % WHEEL_COLORS.length];
      return `
        <span class="item-tag" style="border-left: 4px solid ${color}">
          ${item}
          <button class="remove-item" data-item="${item}" style="background-color: ${color}">×</button>
        </span>
      `;
    }).join('');
  }
  
  if (spinButton) {
    (spinButton as HTMLButtonElement).disabled = rouletteState.items.length === 0 || rouletteState.isSpinning;
    spinButton.textContent = rouletteState.isSpinning ? '🎲 回転中...' : '🎲 ルーレットを回す';
    if (rouletteState.isSpinning) {
      spinButton.classList.add('spinning');
    } else {
      spinButton.classList.remove('spinning');
    }
  }
  
  if (resultDisplay && !rouletteState.isSpinning) {
    const currentItem = getCurrentPointedItem();
    resultDisplay.textContent = currentItem || rouletteState.result || '結果がここに表示されます';
  }
  
  updateWheel();
}

// イベントリスナーを設定する関数
function setupEventListeners() {
  // 追加ボタンのイベントリスナー
  const addButton = document.getElementById('addButton');
  if (addButton) {
    addButton.addEventListener('click', addItem);
  }

  // 入力フィールドのEnterキーイベントリスナー
  const itemInput = document.getElementById('itemInput') as HTMLInputElement;
  if (itemInput) {
    itemInput.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        addItem();
      }
    });
  }

  // ルーレットを回すボタンのイベントリスナー
  const spinButton = document.getElementById('spinButton');
  if (spinButton) {
    spinButton.addEventListener('click', spinRoulette);
  }

  // 削除ボタンのイベントリスナー（イベント委譲を使用）
  const itemsList = document.getElementById('itemsList');
  if (itemsList) {
    itemsList.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('remove-item')) {
        const item = target.getAttribute('data-item');
        if (item) {
          removeItem(item);
        }
      }
    });
  }
}

async function setupDiscordSdk(): Promise<void> {
  try {
    if (!discordSdk) {
      throw new Error("Discord SDK is not available");
    }
    
    await discordSdk.ready();
    console.log("Discord SDK is ready");

    // Authorize with Discord Client
    const { code } = await discordSdk.commands.authorize({
      client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
      response_type: "code",
      state: "",
      prompt: "none",
      scope: [
        "identify",
        "guilds",
        "applications.commands"
      ],
    });

    // Retrieve an access_token from your activity's server
    // Note: We need to prefix our backend `/api/token` route with `/.proxy` to stay compliant with the CSP.
    // Read more about constructing a full URL and using external resources at
    // https://discord.com/developers/docs/activities/development-guides/networking#construct-a-full-url
    const response = await fetch("/.proxy/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
    }
    
    const { access_token }: { access_token: string } = await response.json();

    // Authenticate with Discord client (using the access_token)
    auth = await discordSdk!.commands.authenticate({
      access_token,
    });

    if (auth == null) {
      throw new Error("Authenticate command failed");
    }
  } catch (error) {
    console.error("Discord SDK setup error:", error);
    throw error; // エラーを再スローして、呼び出し元でキャッチできるようにする
  }
}

async function appendVoiceChannelName(): Promise<void> {
  try {
    const app = document.querySelector('#app');
    if (!app) return;

    let activityChannelName = 'Unknown';

    // Requesting the channel in GDMs (when the guild ID is null) requires
    // the dm_channels.read scope which requires Discord approval.
    if (discordSdk && discordSdk.channelId != null && discordSdk.guildId != null) {
      // Over RPC collect info about the channel
      const channel = await discordSdk.commands.getChannel({channel_id: discordSdk.channelId});
      if (channel.name != null) {
        activityChannelName = channel.name;
      }
    }

    // Update the UI with the name of the current voice channel
    const textTagString = `Activity Channel: "${activityChannelName}"`;
    const textTag = document.createElement('p');
    textTag.textContent = textTagString;
    app.appendChild(textTag);
  } catch (error) {
    console.error("Failed to append voice channel name:", error);
    // エラーが発生してもアプリケーションは継続して動作する
  }
}

interface Guild {
  id: string;
  icon: string;
}

async function appendGuildAvatar(): Promise<void> {
  try {
    const app = document.querySelector('#app');
    if (!app) return;

    // authが存在しない場合はスキップ
    if (!auth || !auth.access_token) {
      console.log("No auth token available, skipping guild avatar");
      return;
    }

    // 1. From the HTTP API fetch a list of all of the user's guilds
    const guilds: Guild[] = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
      headers: {
        // NOTE: we're using the access_token provided by the "authenticate" command
        Authorization: `Bearer ${auth.access_token}`,
        'Content-Type': 'application/json',
      },
    }).then((response) => response.json());

    // 2. Find the current guild's info, including it's "icon"
    const currentGuild = guilds.find((g) => g.id === discordSdk?.guildId);

    // 3. Append to the UI an img tag with the related information
    if (currentGuild != null) {
      const guildImg = document.createElement('img');
      guildImg.setAttribute(
        'src',
        // More info on image formatting here: https://discord.com/developers/docs/reference#image-formatting
        `https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.webp?size=128`
      );
      guildImg.setAttribute('width', '128px');
      guildImg.setAttribute('height', '128px');
      guildImg.setAttribute('style', 'border-radius: 50%;');
      app.appendChild(guildImg);
    }
  } catch (error) {
    console.error("Failed to append guild avatar:", error);
    // エラーが発生してもアプリケーションは継続して動作する
  }
}

// 初期化時にルーレット機能を設定（Discord SDKの初期化とは独立して実行）
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, initializing roulette");
  initializeRoulette();
});

// フォールバック: DOMContentLoadedが既に発火している場合の対策
if (document.readyState === 'loading') {
  // DOMContentLoadedがまだ発火していない場合
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded (fallback), initializing roulette");
    initializeRoulette();
  });
} else {
  // DOMContentLoadedが既に発火している場合
  console.log("DOM already loaded, initializing roulette immediately");
  initializeRoulette();
} 