# 🎮 OmniPad (Web Virtual Gamepad)

<div align="center">
<a href="https://github.com/omnipad-js/omnipad/blob/main/README.md">English</a> |
<a href="https://github.com/omnipad-js/omnipad/blob/main/README_cn.md">简体中文</a>
</div>
<br/>

[![npm](https://img.shields.io/npm/v/@omnipad/core?color=ffba43&logo=npm&logoColor=ffba43)](https://www.npmjs.com/package/@omnipad/core)
[![npm](https://img.shields.io/npm/v/@omnipad/vanilla?color=f7df1e&logo=javascript&logoColor=f7df1e)](https://www.npmjs.com/package/@omnipad/vanilla)
[![npm](https://img.shields.io/npm/v/@omnipad/vue?color=4caf50&logo=vue.js&logoColor=4caf50)](https://www.npmjs.com/package/@omnipad/vue)
![Vue3](https://img.shields.io/badge/Vue-3.x-4fc08d?logo=vue.js)
![license](https://img.shields.io/badge/license-MIT-blue)

> **为任何网页游戏赋予原生级的移动端触控与物理手柄映射能力，无需修改游戏源码！**

OmniPad 是一个专为 **Web 游戏**（HTML5 Canvas、Ruffle Flash 模拟器、Godot Web 导出等）打造的虚拟输入引擎。它提供了一整套从“屏幕触控/实体手柄”到“浏览器原生键盘/鼠标事件”的翻译系统。

> 🚨 **[Live Demo: 立即体验](https://omnipad-demo.coocoodaegap.com)** 🚨
> <br> (⚠️ 强烈建议使用手机浏览器打开以获得最佳触控体验；PC 端可直接连接实体手柄体验)

> (注：目前仅提供 Vanilla JS 和 Vue 3 适配层，React 适配层开发中。)

---

## 🎯 OmniPad 能干什么

如果你正在开发或运营网页游戏，OmniPad 可以帮你实现以下需求：

- **复活经典 PC 网页游戏**：将原本只支持键盘和鼠标的 Flash / H5 游戏（通过 Ruffle 等模拟器）直接搬到移动端，玩家可以通过屏幕上的十字键、摇杆和按键正常游玩。
- **拯救“纯鼠标”类游戏**：提供极度稀缺的 **“虚拟触控板 (Trackpad)”** 和 **“光标模式摇杆”**，让需要在手机上进行精确瞄准、悬停拖拽的 RTS 或塔防游戏变得真正可玩。
- **游戏大厅覆盖层**：如果你在运营一个包含数千款小游戏的聚合站（如 Poki），你可以将 OmniPad 作为一个通用插件层覆盖在网页之上。根据不同游戏动态加载对应的键位配置，且完全不干扰游戏原本的运行逻辑。
- **千游千面，动态键位下发**：通过极其轻量的 JSON 配置系统，你可以为平台上的每一款游戏独立保存一份手柄布局。玩家切换配置时，屏幕上的手柄会自动热重载为对应的专属按键，甚至可以针对不同游戏动态更换 UI 皮肤。
- **支持外接实体手柄**：连上实体手柄（Xbox/PS）后，实体按键会直接映射为对应的浏览器键盘事件，并且屏幕上的虚拟按键会同步亮起。

---

## 🛠️ 为什么你需要 OmniPad

在 Web 环境中手搓一个虚拟摇杆很容易，但要让它在真实的复杂网页中稳定运行，会面临无数个“底层深坑”。OmniPad 已经在底层替你全部填平：

| 常见的翻车场景                                   | OmniPad 的保障机制                                                                                                                                            |
| :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **点虚拟按键或发生意外事件时，游戏角色失去控制** | **焦点防劫持**：虚拟控件绝不抢夺浏览器焦点；一旦发生系统级失焦，下次触发按键时会自动将物理焦点强行拉回靶区下的游戏 Canvas，杜绝按键粘连或失灵。               |
| **左手推着摇杆，右手一开火，摇杆断触了**         | **多点触控隔离**：基于原生的 Pointer Capture 锁定。每根手指独立追踪，滑出按钮边界依然有效，两只手疯狂操作绝不互相干扰。                                       |
| **游戏嵌在跨域的 `<iframe>` 里，根本控制不了**   | **Iframe 隧道通信**：在子页面中引入一个轻量级 **OmniPad Guest** 脚本，通过安全的 `postMessage` 协议实现跨上下文输入桥接，实现高精度的坐标映射与原生事件投递。 |
| **鼠标模拟信号无法投射到游戏画面**               | **Shadow DOM 穿透**：专治 Web Components（如 Ruffle 模拟器）。自动穿透隔离墙，确保点击精准命中底层的真实 Canvas。                                             |
| **网页上下滑动，游戏画面位置错乱**               | **智能吸附 (Sticky)**：填入 CSS 选择器，靶区会像强力胶一样“粘”在游戏画面容器上。网页怎么滚、怎么缩放甚至全屏，靶区坐标都绝对精准。                            |

---

## 📦 安装 (Installation)

```bash
npm install @omnipad/vanilla
```

> ⚠️ **注意**：别忘了在您的入口文件 (如 `main.ts` 或 `App.vue`) 中引入基础样式：`import '@omnipad/vanilla/style.css';`

---

## 🚀 快速上手 (Quick Start)

### 模式一：手动部署模式 (Standalone Mode)

适用于在页面角落快速添加固定按钮的简单场景。无需复杂配置，直接作为 UI 组件引入。

**1. HTML 结构 `index.html`**

```html
<div id="app">
  <!-- 游戏/播放器容器 -->
  <canvas id="my-game"></canvas>
  <!-- 提供一个充当相对定位坐标系的容器 -->
  <div id="omnipad-container"></div>
</div>

<style>
  #app,
  #my-game,
  #omnipad-container {
    position: absolute;
    inset: 0;
    height: 100%;
    width: 100%;
  }
</style>
```

**2. 逻辑装配 `main.ts / main.js`**

```typescript
import { TargetZone, VirtualButton, VirtualJoystick } from '@omnipad/vanilla';
import '@omnipad/vanilla/style.css';

const container = document.getElementById('omnipad-container');

if (container) {
  // 部署一个铺满全屏的靶区，开启光标显示，在底层部署游戏播放器即可被靶区接管
  const stage = new TargetZone(container, {
    widgetId: '$stage',
    cursorEnabled: true,
    layout: {
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
    },
  });

  // 部署一个绑定了 W 键的动作按钮
  const jumpButton = new VirtualButton(container, {
    label: 'JUMP',
    targetStageId: '$stage',
    mapping: { code: 'KeyW' },
    layout: {
      width: '80px',
      height: '80px',
      zIndex: 100,
      right: '40px',
      bottom: '40px',
      anchor: 'center',
    },
  });

  // 部署一个支持 360 度绝对光标位移的模拟摇杆
  const joystick = new VirtualJoystick(container, {
    cursorMode: true,
    cursorSensitivity: 1.2,
    targetStageId: '$stage',
    mapping: {
      stick: { type: 'mouse', button: 0 },
    },
    layout: {
      bottom: '120px',
      left: '120px',
      width: '150px',
      height: '150px',
      zIndex: 100,
    },
  });
}
```

### 模式二：数据驱动模式 (Data-Driven Mode)

推荐在复杂应用中使用。通过一份扁平化的 JSON 描述屏幕分区（Zones）和所有按键的映射关系。
让 **RootLayer 或者任意 OmniPad 组件**作为根节点，承载解析后的 ConfigTreeNode。你可以将复杂的游戏 UI 拆分为多个独立逻辑块，由 CSS 决定它们的物理分布。

**1. 定义 `profile.json`:**

```json
{
  "meta": { "name": "Action Layout" },
  "items": [
    {
      "id": "$ui-layer",
      "type": "root-layer"
    },
    {
      "id": "$game-canvas",
      "type": "target-zone",
      "parentId": "$ui-layer",
      "config": {
        "cursorEnabled": true,
        "layout": { "left": 0, "top": 0, "height": "100%", "width": "100%" }
      }
    },
    {
      "id": "movement",
      "type": "d-pad",
      "parentId": "$ui-layer",
      "config": {
        "mapping": {
          "up": "ArrowUp",
          "down": "ArrowDown",
          "left": "ArrowLeft",
          "right": "ArrowRight"
        },
        "layout": { "left": "10%", "bottom": "20%", "height": "20%", "isSquare": true }
      }
    },
    {
      "id": "btn-fire",
      "type": "button",
      "parentId": "$ui-layer",
      "config": {
        "label": "FIRE",
        "mapping": "Space",
        "layout": { "right": "10%", "bottom": "20%", "height": "10%", "isSquare": true }
      }
    }
  ]
}
```

**2. 在 RootLayer 中一键解析与渲染:**

```typescript
import { parseProfileForest, RootLayer } from '@omnipad/vanilla';
import '@omnipad/vanilla/style.css';
import profileRaw from './profile.json';

// 解析扁平配置并构建运行时组件森林
const forest = parseProfileForest(profileRaw);

// 提取根节点并直接实例化 RootLayer 进行挂载
const rootNode = forest.roots['$ui-layer'];
if (rootNode) {
  const container = document.getElementById('omnipad-container');
  if (container) {
    new RootLayer(container, { treeNode: rootNode });
  }
}
```

---

## 🕹️ 实体手柄接入 (Gamepad API)

想在网页里使用 Xbox 或 PlayStation 手柄？只需在配置中添加映射表，OmniPad 将自动接管手柄轮询。当你在实体手柄上按下按键时，屏幕上对应的虚拟按钮将**同步触发**按下动画，提供完美的交互回馈。

```typescript
import { GamepadManager } from '@omnipad/vanilla';

// 启动全局实体手柄监控
GamepadManager.getInstance().setConfig(forest.runtimeGamepadMappings);
GamepadManager.getInstance().start();
```

```json
// 在 profile.json 的根部添加映射数组：
"gamepadMappings": [
  {
    "buttons": { "RT": "btn-fire" }
  },
  {
    "buttons": { "A": "btn-jump" },
    "leftStick": "my-joystick"
  }
]
```

> _💡 Tip：支持映射数组结构，完美兼容双人同屏 (Local Co-op) 的多手柄场景！Player 1 与 Player 2 互不干扰。_

---

## 🌐 Iframe 穿透与安全指南 (Iframe Penetration & Security Guide)

OmniPad 引入了强大的跨域 Iframe 穿透能力。为了防止恶意脚本劫持输入信号，我们采用了一套 **“双向握手 + 白名单校验”** 的安全机制。

### 步骤 1：在主文档（Host）中配置白名单

主文档是存放虚拟手柄 UI 的页面。出于安全考虑，`IframeManager` **不会**向未经授权的域名发送任何坐标或按键信号。

```typescript
import { IframeManager } from '@omnipad/vanilla';

const iframeMgr = IframeManager.getInstance();

// 1. 默认情况下，IframeManager 已经信任了当前域名 (window.location.origin)
// 2. 如果游戏运行在其他域名，请显式添加信任：
iframeMgr.addTrustedOrigin('https://game-provider.com');

// ⚠️ 警告：在生产环境中，禁止使用 '*' 通配符。(会被 IframeManager 直接拒绝)
```

### 步骤 2：在 Iframe 内部（Guest）初始化接收器

你需要将一段轻量的接收器脚本注入到游戏所在的 Iframe 环境中。为了防止恶意网站通过 Iframe 控制游戏，接收器也需要配置白名单。

```typescript
// 在 Iframe 内部运行的脚本
import { initIframeReceiver } from '@omnipad/vanilla/guest';

initIframeReceiver({
  // 核心安全：只接收来自你主站点的信号，拒绝其他任何来源的 postMessage
  allowedOrigins: ['https://your-main-site.com'],
});
```

### 步骤 3：配置 CSP（内容安全策略）

作为浏览器层面的终极防御，建议在游戏服务器响应头或 Meta 标签中设置 `frame-ancestors`，限制谁可以嵌套这个游戏页面。

```html
<!-- 仅允许被当前域和信任的主站嵌套 -->
<meta
  http-equiv="Content-Security-Policy"
  content="frame-ancestors 'self' https://your-main-site.com"
/>
```

### 🔒 安全机制深度解析 (FAQ)

#### Q: 什么是 "Trusted Sources" (信任的源)？

**A:** 在 Web 安全中，源（Origin）由 `协议 + 域名 + 端口` 组成。

- **Host 端白名单**：防止手柄坐标（可能包含用户隐私）被发送到页面中不相关的广告 Iframe 或恶意第三方容器中。
- **Guest 端白名单**：防止非法网页伪装成主站通过 `postMessage` 向游戏下达按键指令（例如模拟点击内购按钮）。

#### Q: 为什么 Iframe 应用还要校验 "Signature" (签名)？

**A:** 一个网页中可能运行着数十个插件（如翻译助手、广告拦截）。它们都在使用 `postMessage` 进行通信。
`OMNIPAD_IPC_SIGNATURE`（即 `__OMNIPAD_IPC_V1__`）像是一把**专用的钥匙**。它能确保 Guest 接收器只处理属于 OmniPad 的协议数据，而不会因为误读了其他插件的消息而导致逻辑错误或崩溃。

#### Q: 为什么不能直接使用 `*` 通配符？

**A:** 使用 `*` 意味着你向全互联网敞开了大门。

1.  **Host 侧**：如果你的页面被植入了恶意 Iframe，它能捕获你所有的手柄操作。
2.  **Guest 侧**：任何网页只要嵌套了你的游戏，都能通过 JS 脚本完全控制游戏角色的行为。
    **在生产环境下，显式配置白名单是绕不开的安全义务。**

### 🛠️ 常见问题排查

1.  **信号发不出去？**
    - 检查主页面是否调用了 `IframeManager.getInstance().addTrustedOrigin()`。
    - 确认传入的字符串是否包含完整的协议和域名（如 `https://`）。
2.  **Iframe 内部没反应？**
    - 检查 Iframe 内部是否正确执行了 `initIframeReceiver`。
    - 检查浏览器控制台，看是否有 `[OmniPad-Security] Blocking untrusted iframe from origin` 警告。
3.  **坐标偏移不对？**
    - 确保 `IframeManager` 能够正确获取 Iframe 标签的 `getBoundingClientRect`。如果 Iframe 存在复杂的 CSS 变换（如 `scale`），请确保在 `v0.5+` 的吸附逻辑下运行。

---

## 🧩 核心组件概览 (Widgets)

- 🔘 **VirtualButton**: 支持轻点、长按。统一映射键盘或鼠标按键。
- 🖱️ **VirtualTrackpad**: 基于相对位移的触摸板。自带手势识别引擎，支持双击拖拽 (Double-tap & Hold)。
- ➕ **VirtualDPad**: 原汁原味的 8 向数字十字键，专为复古动作游戏优化的零延迟判定。
- 🕹️ **VirtualJoystick**: 360° 模拟摇杆。支持 L3 下压，内置“方向键离散映射”与“鼠标光标持续速度映射”双引擎。
- 🎛️ **TargetZone**: 焦点与事件接收靶区，负责调度底层 DOM 事件并发射焦点回归波纹反馈。
- 📥 **InputZone**: 交互逻辑容器。用于界定触控有效区域，支持静态组件嵌套，并承载“空白处触发动态控件（如动态摇杆）”的核心逻辑。
- 🏗️ **RootLayer**: 纯净的核心入口。负责解析 `OmniPadProfile` 配置树，管理所有子实体的生命周期。

---

## 🗺️ 项目状态与未来愿景 (Status & Vision)

> **📢 当前状态：维护模式 (Maintenance Mode)** \
> OmniPad (v0.7) 的核心已经完全达成了设计初衷，提供了极其稳固的底层输入状态机。由于个人精力有限，**目前我将主要负责核心 Bug 修复与稳定性维护，短期内暂无大规模新功能开发计划。**
>
> 然而，OmniPad 的底层架构（Headless Core）天生具备无限的扩展可能。以下是我们认为非常有价值的演进方向，**非常欢迎社区通过 PR 参与共建**：

- [ ] **高阶宏指令系统 (Macro & Combo System)**
  - 连发模式 (Turbo) 与 开关模式 (Toggle) 支持。
  - **自定义按键序列**：支持录制或配置“一键连招”（如按键间隔、顺序触发）。
  - **自定义事件钩子 (Custom Hooks)**：允许在按键生命周期的不同阶段插入业务代码（如触发特定的音频播放或 API 调用）。
- [ ] **可视化配置编辑器 (OmniPad Studio)**
  - 打造一个独立的 Web 拖拽编辑工作台。用户可以直接在可视化的画布上拖拽、缩放控件，调整死区参数，并一键导出 `profile.json` 配置文件。
- [ ] **万能浏览器插件版 (Browser Extension)**
  - 将 OmniPad 封装为 Chrome/Edge 扩展。让玩家可以在访问 Poki、Newgrounds 等任意传统游戏网站时，一键呼出虚拟手柄或接管实体手柄。

---

## 📜 许可证 (License)

本项目基于 [MIT License](./LICENSE) 协议开源。

---

**Built with ❤️ for the Web Gaming community.**
