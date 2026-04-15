# 🎮 OmniPad (Web Virtual Gamepad)

<div align="center">
<a href="https://github.com/omnipad-js/omnipad/blob/main/README.md">English</a> |
<a href="https://github.com/omnipad-js/omnipad/blob/main/README_cn.md">简体中文</a>
</div>
<br/>

![npm version](https://img.shields.io/npm/v/@omnipad/core?color=orange&label=@omnipad/core)
![npm version](https://img.shields.io/npm/v/@omnipad/vue?color=4caf50&label=@omnipad/vue)
![license](https://img.shields.io/badge/license-MIT-blue)
![Vue3](https://img.shields.io/badge/Vue-3.x-4fc08d?logo=vue.js)

> **跨端 Web 游戏输入的“破壁者”：用一套 JSON 配置，让任何 PC 网页游戏在手机端原地满血复活。**

OmniPad 是一个专为 **Web 游戏**（HTML5 Canvas、Ruffle Flash 模拟器、Godot Web 导出等）设计的 **无头化 (Headless)** 虚拟输入引擎。

它不只是 UI 库，而是一套完整的**输入协议转换系统**，提供了一整套从“屏幕触控 / 实体手柄”到“浏览器原生键盘 / 鼠标事件”的翻译调度系统。无需修改游戏内核源码，即可为老派网页游戏赋予原生手游级别的操控体验。

🚨 **[Live Demo: 立即在手机上体验](https://omnipad-demo.coocoodaegap.com)** 🚨

---

## 🛠️ 解决了哪些痛点？

| 痛点                 | OmniPad 解决方案                                             |
| :------------------- | :----------------------------------------------------------- |
| **Shadow DOM 隔离**  | 递归探测逻辑，信号可击穿 Ruffle 等 WebComponents 的物理边界。 |
| **跨域 Iframe 屏障** | 基于 `postMessage` 的安全 IPC 通信，实现多层嵌套 Iframe 的坐标自动换算与投递。 |
| **浏览器焦点丢失**   | 利用靶区的焦点夺回机制，解决点击虚拟按键以及各种意外事件导致游戏输入监听失效的问题。 |
| **多指触控冲突**     | 基于 `Pointer Capture` 的状态锁定，确保摇杆和按键在极速连招时互不干扰。 |

---

## ✨ 核心特性

### 🧠 极致解耦的 Headless 架构

*   **逻辑大脑 (`@omnipad/core`)**：纯 TypeScript 实现，**0 DOM 依赖**。负责数学计算、手势识别、全局实体的通信调度及跨组件信号分发。
*   **环境驱动 (`@omnipad/web`)**：将 `rAF` 时钟、`Gamepad API`、`DOM 副作用` 动态注入核心，支持在任何 JS 环境（小程序、Electron、插件）运行。
*   **适配层 (`@omnipad/vue`)**：官方 Vue 3 适配器，提供 100% 槽位（Slot）自定义能力的 UI 基座。

### 📐 声明式 JSON 驱动

*   **LayoutBox 布局系统**：原生支持 `px` / `%` / `vh` / `vw`。通过灵活的锚点（Anchor）系统，实现一套配置适配所有异形屏。
*   **组件级吸附 (Sticky)**：支持通过 `stickySelector` 将虚拟组件“粘”在页面动态元素上，自动追踪位移与缩放，专为浏览器插件设计。
*   **扁平化森林配置**：创新 JSON 解析引擎，支持单文件定义多个独立根节点，利用 CSS Flex/Grid 轻松构建宏观布局。

### ⚡️ 极致的性能压榨

*   **动态挂载**：支持在 `InputZone` 的任意空白处“点火”即刻生成摇杆等输入控件，并实现触点捕获的无缝交接。
*   **零重排性能**：所有位移计算均在内存完成，渲染强制开启 GPU `translate3d` 加速。
*   **执行端节流**：在 `TargetZone` 层面实施 rAF 节流，在高采样率（120Hz+）设备上依然保持极低的 CPU 占用。

### 🎮 硬件级融合

*   同时处理屏幕触摸、鼠标点击与 **实体游戏手柄 (Gamepad API)** 映射。支持**多手柄槽位并行（本地多人游玩）**，并实现实体按键与虚拟 UI 反馈的实时视觉同步，开启 Web 游戏的“主机模式”。

---

## 📦 安装 (Installation)

确保您的项目中已安装 Vue 3 (`peerDependencies`)。

```bash
npm install @omnipad/vue
```

> ⚠️ **注意**：别忘了在您的入口文件 (如 `main.ts` 或 `App.vue`) 中引入基础样式：`import '@omnipad/vue/style.css';`

---

## 🚀 快速上手 (Quick Start)

### 模式一：手动部署模式 (Standalone Mode)

适用于在页面角落快速添加固定按钮的简单场景。无需复杂配置，直接作为 UI 组件引入。

```vue
<script setup>
import { TargetZone, VirtualButton, VirtualJoystick } from '@omnipad/vue';
import '@omnipad/vue/style.css';
</script>

<template>
  <div class="game-container">
    <!-- 部署一个绑定了空格键的动作按钮，处于文档流中 -->
    <VirtualButton
      label="JUMP"
      target-stage-id="$stage"
      :mapping="{ code: 'ArrowUp' }"
      style="width: 80px; height: 80px; z-index: 100;"
    />

    <!-- 部署一个支持 360 度绝对光标位移的模拟摇杆，脱离文档流 -->
    <VirtualJoystick
      :cursor-mode="true"
      :cursor-sensitivity="1.2"
      target-stage-id="$stage"
      :mapping="{ stick: { type: 'mouse', button: 0 } }"
      :layout="{ bottom: '120px', left: '120px', width: '150px', height: '150px', zIndex: 100 }"
    />

    <!-- 部署一个铺满全屏的靶区，开启光标显示，在底层部署游戏播放器即可被靶区接管 -->
    <TargetZone
      widget-id="$stage"
      cursor-enabled
      :layout="{ left: 0, top: 0, height: '100%', width: '100%' }"
    />
  </div>
</template>
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

**2. 在 Vue 中一键解析与渲染:**

```vue
<script setup>
import { computed, onMounted } from 'vue';
import { parseProfileForest } from '@omnipad/core';
import { RootLayer } from '@omnipad/vue';
import profileRaw from './profile.json';

// 解析扁平配置并构建运行时组件森林
const forest = computed(() => parseProfileForest(profileRaw));
</script>

<template>
  <div class="viewport">
    <!-- 播放器元素，可替换为 Ruffle / H5 播放器 -->
    <canvas id="my-game"></canvas>
    <!-- 传入根节点，引擎将自动递归生成整套交互界面 -->
    <RootLayer
      class="ui-layer"
      v-if="forest.roots['$ui-layer']"
      :tree-node="forest.roots['$ui-layer']"
    />
  </div>
</template>

<style>
.viewport,
#my-game,
.ui-layer {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}
</style>
```

---

## 🕹️ 实体手柄接入 (Gamepad API)

想在网页里使用 Xbox 或 PlayStation 手柄？只需在配置中添加映射表，OmniPad 将自动接管手柄轮询。当你在实体手柄上按下按键时，屏幕上对应的虚拟按钮将**同步触发**按下动画，提供完美的交互回馈。

```typescript
import { GamepadManager } from '@omnipad/core';

// 启动全局实体手柄监控
GamepadManager.getInstance().setConfig(forest.value.runtimeGamepadMappings);
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
import { IframeManager } from '@omnipad/web';

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
import { initIframeReceiver } from '@omnipad/web/guest';

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

## 🛠️ 高度定制化 (Advanced Customization)

OmniPad 的核心设计理念是**“逻辑闭环，UI 开放”**。

### 1. 全局与局部换肤 (CSS Theming)

组件库采用“样式与布局分离”。`layout` 属性仅控制物理坐标，视觉表现均由 CSS 变量接管。

```css
/* 修改全局主题 */
:root {
  --omnipad-btn-bg: rgba(0, 255, 100, 0.2);
  --omnipad-btn-border: 2px solid #00ff6a;
}

/* 结合 config 中的 className 字段实现特定按钮变色 */
.danger-btn {
  --omnipad-btn-bg: rgba(255, 0, 0, 0.4);
}
```

### 2. 注册自定义组件 (Factory Extension)

你可以基于 `VirtualButton` 等基础组件，编写完全属于自己的特效组件（如发光的赛博朋克触摸板），并将其**无缝注册进解析引擎**中。

```typescript
import { registerComponent } from '@omnipad/vue';
import CustomTrackpad from './components/CustomTrackpad.vue';

// 将自定义组件注册为 'custom-trackpad'
registerComponent('custom-trackpad', CustomTrackpad);
```

注册后，你即可在 JSON 配置中直接使用 `"type": "fancy-trackpad"`，引擎会自动为你实例化并绑定 Core 逻辑。

---

## 🧩 核心组件概览 (Widgets)

- 🔘 **VirtualButton**: 支持轻点、长按。统一映射键盘或鼠标按键。
- 🖱️ **VirtualTrackpad**: 基于相对位移的触摸板。自带 `GestureRecognizer` 手势引擎，支持双击拖拽 (Double-tap & Hold)。
- ➕ **VirtualDPad**: 原汁原味的 8 向数字十字键，专为复古动作游戏优化的零延迟判定。
- 🕹️ **VirtualJoystick**: 360° 模拟摇杆。支持 L3 下压，内置“方向键离散映射”与“鼠标光标持续速度映射”双引擎。
- 🎛️ **TargetZone**: 焦点与事件接收靶区，负责调度底层 DOM 事件并发射焦点回归波纹反馈。
- 📥 **InputZone**: 交互逻辑容器。用于界定触控有效区域，支持静态组件嵌套，并承载“空白处触发动态控件（如动态摇杆）”的核心逻辑。
- 🏗️ **RootLayer**: 系统的核心入口。负责解析 GamepadProfile 配置树，管理所有子实体的生命周期，并为整个图层提供依赖注入上下文。

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
- [ ] **跨框架适配层 (Framework Adapters)**
  - 得益于绝对解耦的 `@omnipad/core` 无头架构，核心逻辑已与 DOM 渲染彻底分离。
  - 计划推出 `@omnipad/react`、`@omnipad/svelte` 以及无依赖的 Vanilla JS Web Components 版本。_(Looking for Maintainers!)_
- [ ] **可视化配置编辑器 (OmniPad Studio)**
  - 打造一个独立的 Web 拖拽编辑工作台。用户可以直接在可视化的画布上拖拽、缩放控件，调整死区参数，并一键导出 `profile.json` 配置文件。
- [ ] **万能浏览器插件版 (Browser Extension)**
  - 将 OmniPad 封装为 Chrome/Edge 扩展。让玩家可以在访问 Poki、Newgrounds 等任意传统游戏网站时，一键呼出虚拟手柄或接管实体手柄。

---

## 📜 许可证 (License)

本项目基于 [MIT License](./LICENSE) 协议开源。

---

**Built with ❤️ for the Web Gaming community.**
