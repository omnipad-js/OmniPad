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

> **打破设备壁垒：用一套配置，将任何 Web 游戏装进手机。**

OmniPad 是一个专为 Web 游戏（HTML5 Canvas、Ruffle Flash 模拟器、Godot Web 导出等）设计的 **高性能、无头化 (Headless)** 虚拟输入引擎。

它提供了一整套从“屏幕触控 / 实体手柄”到“浏览器原生键盘 / 鼠标事件”的翻译调度系统。无需修改游戏内核源码，即可为老派网页游戏赋予原生手游级别的操控体验。

🚨 **[Live Demo: 立即在手机上体验](https://omnipad-demo.coocoodaegap.com)** 🚨

---

## 🆚 为什么选择 OmniPad？
市面上的普通摇杆库（如 nipple.js）仅提供纯粹的 UI 和坐标计算。而 OmniPad 是一个**完整的输入适配层**：我们不仅提供 UI，更解决了 **Shadow DOM 穿透**、**系统焦点丢失**、**多指触控冲突**等 Web 游戏移植过程中的终极痛点。

## ✨ 核心架构与特性

* 🚀 **无头架构 (Headless Design)**：输入状态机、手势识别与核心调度完全封装在零依赖的 `@omnipad/core` 中，天然支持跨框架移植。目前提供开箱即用的 Vue 3 适配层 `@omnipad/vue`。
* 🌲 **扁平配置与多根森林 (Flat Profile & Forest)**：创新的 JSON 解析引擎。支持将一份扁平的配置表解析为多个独立的根节点，允许你利用原生 CSS Flex/Grid 轻松实现横竖屏的宏观响应式布局。
* 👻 **事件穿透与焦点保护**：独创高保真合成事件路由，优雅穿透 Ruffle 等 WebAssembly 模拟器的 Shadow DOM 隔离边界，精准投递合成事件；内置“焦点自动夺回”逻辑，彻底告别按键卡死与失灵。
* 🎛️ **Touch-to-Spawn (动态挂载)**：支持在 `InputZone` 分区的任意空白处按下时**就地生成**摇杆或按键，完美契合现代移动端动作游戏习惯。
* ⚡️ **性能原力 (Performance First)**：拒绝昂贵的 DOM 重排。所有位移计算均在内存中完成，并通过 translate3d 强制开启硬件加速。内置 rAF 节流机制，完美适配高刷屏幕。
* 📐 **响应式单位支持**：LayoutBox 约束系统原生支持 px、%、vh/vw 等多种 CSS 单位，结合灵活的锚点 (Anchor) 系统，一套配置即可适配从 iPhone SE 到 iPad Pro 的所有尺寸。
* 🔌 **多端输入融合**：采用底层状态机统一管理，同时支持屏幕触摸、鼠标点击以及 **实体游戏手柄 (Physical Gamepad)** 映射驱动，并实现虚拟 UI 反馈的实时同步。

---

## 📦 安装 (Installation)

确保您的项目中已安装 Vue 3 (`peerDependencies`)。

```bash
npm install @omnipad/core @omnipad/vue
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
      :layout="{ left: 0, top: 0, height: '100%', width: '100%' }"/>
  </div>
</template>
```

### 模式二：数据驱动模式 (Data-Driven Mode)
推荐在复杂应用中使用。通过一份扁平化的 JSON 描述屏幕分区（Zones）和所有按键的映射关系。
让 **RootLayer 或者任意 Omnipad 组件**作为根节点，承载解析后的 ConfigTreeNode。你可以将复杂的游戏 UI 拆分为多个独立逻辑块，由 CSS 决定它们的物理分布。

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
          "up": { "code": "ArrowUp" },
          "down": { "code": "ArrowDown" },
          "left": { "code": "ArrowLeft" },
          "right": { "code": "ArrowRight" }
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
        "mapping": { "code": "Space" }, 
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
import { parseProfileJson, parseProfileTrees } from '@omnipad/core/utils';
import { RootLayer } from '@omnipad/vue';
import profileRaw from './profile.json';

// 解析扁平配置并构建运行时组件森林
const forest = computed(() => parseProfileTrees(parseProfileJson(profileRaw)));
</script>

<template>
  <div class="viewport">
    <!-- 播放器元素，可替换为 Ruffle / H5 播放器 -->
    <canvas id="my-game"></canvas>
    <!-- 传入根节点，引擎将自动递归生成整套交互界面 -->
    <RootLayer
      class="ui-layer" 
      v-if="forest.roots['$ui-layer']"
      :tree-node="forest.roots['$ui-layer']" />
  </div>
</template>

<style>
.viewport, #my-game, .ui-layer {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
}
</style>
```

---

## 🕹️ 进阶拓展：实体手柄接入 (Gamepad API)

想在网页里使用 Xbox 或 PlayStation 手柄？只需在配置中添加映射表，OmniPad 将自动接管手柄轮询。当你在实体手柄上按下按键时，屏幕上对应的虚拟按钮将**同步触发**按下动画，提供完美的交互回馈。

```typescript
import { GamepadManager } from '@omnipad/core';

// 启动全局实体手柄监控
GamepadManager.getInstance().setConfig(forest.value.runtimeGamepadMappings);
GamepadManager.getInstance().start();
```
```json
// 在 profile.json 的根部添加映射数组：
"gamepadMappings":[
  {
    "buttons": { "A": "btn-jump", "RT": "btn-fire" },
    "leftStick": "my-joystick"
  }
]
```
> *💡 Tip：支持映射数组结构，完美兼容双人同屏 (Local Co-op) 的多手柄场景！Player 1 与 Player 2 互不干扰。*

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

* 🔘 **VirtualButton**: 支持轻点、长按。统一映射键盘或鼠标按键。
* 🖱️ **VirtualTrackpad**: 基于相对位移的触摸板。自带 `GestureRecognizer` 手势引擎，支持双击拖拽 (Double-tap & Hold)。
* ➕ **VirtualDPad**: 原汁原味的 8 向数字十字键，专为复古动作游戏优化的零延迟判定。
* 🕹️ **VirtualJoystick**: 360° 模拟摇杆。支持 L3 下压，内置“方向键离散映射”与“鼠标光标持续速度映射”双引擎。
* 🎛️ **TargetZone**: 焦点与事件接收靶区，负责调度底层 DOM 事件并发射焦点回归波纹反馈。
* 📥 **InputZone**: 交互逻辑容器。用于界定触控有效区域，支持静态组件嵌套，并承载“空白处触发动态控件（如动态摇杆）”的核心逻辑。
* 🏗️ **RootLayer**: 系统的核心入口。负责解析 GamepadProfile 配置树，管理所有子实体的生命周期，并为整个图层提供依赖注入上下文。

---

## 🗺️ 路线图与未来计划 (Roadmap)

OmniPad 目前已完成了极其稳固的底层输入状态机与 Vue 3 适配层。未来，我们将向着“全生态、全自动化”的方向演进。以下是我们规划中的功能特性（欢迎社区提交 PR 共同建设！）：

- [ ] **高阶宏指令系统 (Macro & Combo System)**
  - 连发模式 (Turbo) 与 开关模式 (Toggle) 支持。
  - **自定义按键序列**：支持录制或配置“一键连招”（如按键间隔、顺序触发）。
  - **自定义事件钩子 (Custom Hooks)**：允许在按键生命周期的不同阶段插入业务代码（如触发特定的音频播放或 API 调用）。
- [ ] **跨框架适配层 (Framework Adapters)**
  - 得益于绝对解耦的 `@omnipad/core` 无头架构，核心逻辑已与 DOM 渲染彻底分离。
  - 计划推出 `@omnipad/react`、`@omnipad/svelte` 以及无依赖的 Vanilla JS Web Components 版本。*(Looking for Maintainers!)*
- [ ] **可视化配置编辑器 (OmniPad Studio)**
  - 打造一个独立的 Web 拖拽编辑工作台。用户可以直接在可视化的画布上拖拽、缩放控件，调整死区参数，并一键导出 `profile.json` 配置文件。
- [ ] **万能浏览器插件版 (Browser Extension)**
  - 将 OmniPad 封装为 Chrome/Edge 扩展。让玩家可以在访问 Poki、Newgrounds 等任意传统游戏网站时，一键呼出虚拟手柄或接管实体手柄。

---

## 📜 许可证 (License)

本项目基于 [MIT License](./LICENSE) 协议开源。

---
**Built with ❤️ for the Web Gaming community.**
