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

> **Break the device barrier: Wrap any Web game for mobile with a single configuration.**

OmniPad is a **high-performance, headless** virtual input engine specifically designed for Web-based games (HTML5 Canvas, Ruffle Flash Emulator, Godot Web exports, etc.).

It provides a comprehensive orchestration system that translates "Touch Gestures / Physical Gamepad Inputs" into "Native Browser Keyboard / Mouse Events." Without modifying a single line of your game's core source code, OmniPad empowers legacy web games with a native-mobile-like control experience.

🚨 **[Live Demo: Try it on your Mobile Device](https://omnipad-demo.coocoodaegap.com)** 🚨

---

## 🆚 Why OmniPad?

Most joystick libraries (like nipple.js) only provide raw UI and coordinate calculations. OmniPad is a **complete input adaptation layer**: We don't just provide the UI; we solve the "end-game" pain points of web game porting, such as **Shadow DOM isolation**, **browser focus loss**, and **multi-touch conflicts**.

## ✨ Core Architecture & Features

- 🚀 **Headless Design**: The input state machine, gesture recognition, and core scheduling are fully encapsulated in the zero-dependency `@omnipad/core`. It is natively framework-agnostic. We currently provide `@omnipad/vue`, a production-ready Vue 3 adapter.
- 🌐 **Cross-Origin Iframe Bridge**: **A major feature in v0.6**. Built-in secure IPC communication protocol based on `postMessage`. Automatically detects `<iframe>` containers on the page to enable real-time coordinate conversion and keyboard signal tunneling, allowing games “behind the Great Firewall” to be controlled just like native web pages.
- 🌲 **Flat Profile & Forest**: An innovative JSON parsing engine. It supports parsing a single flat configuration into multiple independent root nodes, allowing you to use native CSS Flex/Grid to build complex responsive layouts for both landscape and portrait modes.
- 👻 **Event Penetration & Focus Protection**: Features high-fidelity synthetic event routing that elegantly penetrates the Shadow DOM boundaries of WebAssembly emulators (like Ruffle). Built-in "Auto-Focus Reclaim" logic ensures keys never get stuck or unresponsive.
- 📐 **Smart Sticky & Adaptive Layout**: The `LayoutBox` constraint system not only natively supports various CSS units such as `px`, `%`, and `vh/vw`, but also enables component-level sticking via `stickySelector`. It automatically tracks position changes of any DOM element on the page and synchronizes coordinates in real time, making it the ultimate tool for developing game overlay UIs and browser extensions.
- 🎛️ **Touch-to-Spawn (Dynamic Mounting)**: Supports **spawning** joysticks or buttons anywhere in an `InputZone` upon touch. This perfectly mimics the control habits of modern mobile action games.
- ⚡️ **Performance First**: No expensive DOM reflows. Introduce a singleton `ResizeObserver` pool and the Rect caching mechanism. All displacement calculations happen in memory, with hardware acceleration forced via `translate3d`. Built-in **rAF (requestAnimationFrame) throttling** ensures perfect synchronization with high-refresh-rate screens.
- 🔌 **Input Fusion**: Managed by a unified underlying state machine, OmniPad supports simultaneous inputs from screen touch, mouse clicks, and **Physical Gamepads**, with real-time synchronized feedback on the virtual UI.

---

## 📦 Installation

Ensure you have Vue 3 installed in your project (`peerDependencies`).

```bash
npm install @omnipad/core @omnipad/vue
```

> ⚠️ **Note**: Don't forget to import the base styles in your entry file (e.g., `main.ts` or `App.vue`): `import '@omnipad/vue/style.css';`

---

## 🚀 Quick Start

### Pattern 1: Standalone Mode

Ideal for simple scenarios where you need to add fixed buttons to specific corners. No complex configuration required; just use them as standard UI components.

```vue
<script setup>
import { TargetZone, VirtualButton, VirtualJoystick } from '@omnipad/vue';
import '@omnipad/vue/style.css';
</script>

<template>
  <div class="game-container">
    <!-- Deploy an action button mapped to the W key -->
    <VirtualButton
      label="JUMP"
      target-stage-id="$stage"
      :mapping="{ code: 'KeyW' }"
      style="width: 80px; height: 80px; z-index: 100;"
    />

    <!-- Deploy an analog stick with 360° cursor displacement -->
    <VirtualJoystick
      :cursor-mode="true"
      :cursor-sensitivity="1.2"
      target-stage-id="$stage"
      :mapping="{ stick: { type: 'mouse', button: 0 } }"
      :layout="{ bottom: '120px', left: '120px', width: '150px', height: '150px', zIndex: 100 }"
    />

    <!-- Deploy a full-screen reception zone to handle simulated events -->
    <TargetZone
      widget-id="$stage"
      cursor-enabled
      :layout="{ left: 0, top: 0, height: '100%', width: '100%' }"
    />
  </div>
</template>
```

### Pattern 2: Data-Driven Mode

Recommended for complex applications. Define screen partitions (Zones) and all key mappings via a flat JSON profile. Use **RootLayer (or any OmniPad component)** as the root node to carry the parsed `ConfigTreeNode`.

**1. Define `profile.json`:**

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

**2. Parse and Render in Vue:**

```vue
<script setup>
import { computed } from 'vue';
import { parseProfileJson, parseProfileTrees } from '@omnipad/core/utils';
import { RootLayer } from '@omnipad/vue';
import profileRaw from './profile.json';

// Analyze flat configuration and build the runtime component forest
const forest = computed(() => parseProfileTrees(parseProfileJson(profileRaw)));
</script>

<template>
  <div class="viewport">
    <!-- Player element, replace with Ruffle / H5 player -->
    <canvas id="my-game"></canvas>
    <!-- Upon receiving the root node, the engine will automatically generate the entire interactive interface through recursion. -->
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

## 🕹️ Advanced: Gamepad API Integration

Want to use an Xbox or PlayStation controller? Simply add a mapping table. OmniPad automatically handles controller polling. When you press a physical button, the corresponding virtual button on the screen will **synchronously trigger** its press animation, providing perfect haptic feedback.

```typescript
import { GamepadManager } from '@omnipad/core/dom';

// Start global physical gamepad monitoring
GamepadManager.getInstance().setConfig(forest.value.runtimeGamepadMappings);
GamepadManager.getInstance().start();
```

```json
// Add a mapping array at the root of profile.json:
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

> _💡 Tip: Supports array-based mapping for Local Co-op scenarios! Player 1 and Player 2 can play together without interference._

---

## 🛠️ Advanced Customization

OmniPad’s core philosophy is **"Logic Closed, UI Open."**

### 1. CSS Theming

The library separates layout from style. The `layout` property handles physical coordinates, while visual aesthetics are managed by CSS variables.

```css
/* Modify the global theme */
:root {
  --omnipad-btn-bg: rgba(0, 255, 100, 0.2);
  --omnipad-btn-border: 2px solid #00ff6a;
}

/* Use the className field in config for specific button styles */
.danger-btn {
  --omnipad-btn-bg: rgba(255, 0, 0, 0.4);
}
```

### 2. Factory Extension

You can write your own custom components and **register them into the parsing engine** seamlessly.

```typescript
import { registerComponent } from '@omnipad/vue';
import CustomTrackpad from './components/CustomTrackpad.vue';

// Register the custom component as 'custom-trackpad'
registerComponent('custom-trackpad', CustomTrackpad);
```

After registration, you can directly use `"type": "custom-trackpad"` in your JSON configuration. The engine will automatically instantiate and bind the Core logic for you.

---

## 🧩 Widgets Overview

- 🔘 **VirtualButton**: Supports taps and long-presses. Maps to keyboard or mouse buttons.
- 🖱️ **VirtualTrackpad**: Relative displacement trackpad with a built-in gesture engine supporting Double-tap & Hold.
- ➕ **VirtualDPad**: Authentic 8-way digital D-pad optimized for zero-latency in retro action games.
- 🕹️ **VirtualJoystick**: 360° analog stick with L3 support. Dual engines for discrete key mapping and continuous cursor velocity.
- 🎛️ **TargetZone**: The reception stage for events. Dispatches low-level DOM events and renders focus-return feedback.
- 📥 **InputZone**: A logic container that defines interactive regions and handles the "Touch-to-Spawn" dynamic widget logic.
- 🏗️ **RootLayer**: The entry point. Manages the lifecycle of entities and provides the dependency injection context.

---

## 🗺️ Status & Vision

> **📢 Current Status: Maintenance Mode** \
> The core of OmniPad (v0.6) has fully achieved its design objectives, delivering an exceptionally robust underlying input state machine. Due to limited personal capacity, **we will primarily focus on core bug fixes and stability maintenance at this time, with no plans for large-scale new feature development in the near future.**
>
> However, OmniPad's underlying architecture (Headless Core) inherently possesses limitless scalability potential. Below are evolutionary directions we consider highly valuable, and **we warmly welcome community participation through PRs to build together**:

- [ ] **Advanced Macro & Combo System**
  - Turbo (Auto-fire) and Toggle mode support.
  - Custom sequences for "One-tap combos."
- [ ] **Framework Adapters**
  - Launching `@omnipad/react`, `@omnipad/svelte`, and a dependency-free Web Components version. _(Looking for Maintainers!)_
- [ ] **OmniPad Studio**
  - A visual drag-and-drop editor for creating and exporting `profile.json` files.
- [ ] **Universal Browser Extension**
  - A Chrome/Edge extension to bring OmniPad to any gaming site (Poki, Newgrounds, etc.) instantly.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

**Built with ❤️ for the Web Gaming community.**
