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

> **Add native-level touch controls and physical gamepad mapping to ANY web game, without touching the source code!**

OmniPad is a headless virtual input engine specifically built for **Web Games** (HTML5 Canvas, Ruffle Flash emulator, Godot web exports, etc.). It provides a complete translation system from "Screen Touch / Physical Gamepads" to "Native Browser Keyboard / Mouse Events."

> 🚨 **[Live Demo: Try it Now](https://omnipad-demo.coocoodaegap.com)** 🚨
> <br> (⚠️ Mobile browser highly recommended / PC browser with Xbox gamepad)

> (Note: Currently supporting Vanilla JS & Vue 3; React version is in development.)

---

## 🎯 OmniPad Use Cases

If you are developing or operating web games, OmniPad helps you achieve the following:

- **Revive Classic Web Games**: Bring Flash / H5 games that only support keyboard and mouse to mobile devices. Players can play normally via on-screen D-pads, joysticks, and buttons.
- **Save "Mouse-Only" Games**: Provides rare **"Virtual Trackpad"** and **"Cursor-mode Joystick"** logic, making RTS or Tower Defense games that require precision aiming and hovering playable on touch screens.
- **Overlay for Game Portals**: If you operate a game portal, use OmniPad as a universal overlay. Dynamically load key mappings for different games without interfering with the original game logic.
- **Dynamic Key Mapping Config**: Save independent controller layouts for each game via a lightweight JSON system. Automatically hot-reload UI layouts and mapping logic when switching profiles.
- **Hardware Gamepad Support**：Map physical controller (Xbox/PS) inputs directly to browser keyboard events, with real-time visual feedback on the virtual UI.

---

## 🛠️ Why OmniPad

| Common Issues                                                                           | OmniPad Solutions                                                                                                                                                                                                                                   |
| :-------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Game loses focus when touching UI or unexpected event occurred, causing stuck keys.** | **Focus Protection**: UI components never steal focus. Automatically reclaims focus to the game Canvas upon interaction to prevent input lag.                                                                                                       |
| **Movement joystick cuts out when tapping buttons.**                                    | **Touch Isolation**: Locked via native Pointer Capture. Each finger is tracked independently and remains active even when sliding outside button boundaries.                                                                                        |
| **Cannot control games inside cross-origin `<iframe>`.**                                | **Iframe Tunneling**: Include a lightweight **OmniPad Guest** script in the child page to enable cross-context input bridging via the secure `postMessage` protocol, thereby achieving high-precision coordinate mapping and native event delivery. |
| **Synthetic cursor events fail to reach Shadow DOM targets.**                           | **Shadow DOM Support**: Designed for Web Components (like Ruffle). Recursively penetrates isolation boundaries to ensure hits on the actual Canvas.                                                                                                 |
| **The page scrolls, and the target zone becomes misaligned.**                           | **Sticky Layout**: Locks the target zone to the game container via CSS selectors. Coordinates remain pixel-perfect regardless of scrolling, zooming, or fullscreen transitions.                                                                     |

---

## 📦 Installation

This document focuses on the **direct integration mode without build tools (via tag import)**. If you are developing a standard modern web application (such as one using build tools like Vite or Webpack) or using a specific frontend framework, please follow the links below to read the corresponding instructions:

- **Guide to Modern Web Modular Development (Vite / ESM)**：[👉 <code>@omnipad/vanilla</code> Instruction](./packages/vanilla)
- **Guide to Native Integration with the Vue 3 Framework**：[👉 <code>@omnipad/vue</code> Instruction](./packages/vue)

### Tag Import (Zero-Build Mode)

In your HTML file, simply include the fully compiled UMD resource directly via free global CDN:

```html
<!-- 1. Import OmniPad Style file -->
<link rel="stylesheet" href="https://unpkg.com/@omnipad/vanilla/dist/index.css" />

<!-- 2. Import OmniPad Logic and Component Packages (to be mounted on the global variable `window.OmniPad`) -->
<script src="https://unpkg.com/@omnipad/vanilla/dist/index.global.js"></script>
```

---

## 🚀 Quick Start

### Pattern 1: Standalone Mode

Ideal for simple scenarios where you need to add fixed buttons to specific corners. No complex configuration required; just use them as standard UI components.

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <title>OmniPad - Standalone Mode Demo</title>

    <link rel="stylesheet" href="https://unpkg.com/@omnipad/vanilla/dist/index.css" />
    <script src="https://unpkg.com/@omnipad/vanilla/dist/index.global.js"></script>

    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        overflow: hidden;
        background: #111;
      }
      #app {
        position: relative;
        width: 100vw;
        height: 100vh;
      }
      /* Mock game/player container */
      #mock-game-canvas {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 550px;
        height: 400px;
        background: #000;
        border: 4px solid #333;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #555;
        font-family: sans-serif;
      }
      /* Provide a container that serves as a coordinate system for relative positioning */
      #omnipad-container {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none; /* Pass through the blank area */
      }
      /* Responsive Design for Small Mobile Screens */
      @media (max-width: 600px) {
        #mock-game-canvas {
          width: 100%;
          height: 50%;
          top: 0;
          left: 0;
          transform: none;
          border: none;
        }
      }
    </style>
  </head>
  <body>
    <div id="app">
      <!-- Mock game/player container -->
      <div id="mock-game-canvas">
        <span>GAME CANVAS PLACEHOLDER</span>
      </div>

      <!-- Provide a container that serves as a coordinate system for relative positioning -->
      <div id="omnipad-container"></div>
    </div>

    <script>
      // Destructuring components from the global namespace
      const { TargetZone, VirtualButton, VirtualJoystick } = window.OmniPad;

      const container = document.getElementById('omnipad-container');

      if (container) {
        // Deploy a full-screen reception zone to handle simulated events
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

        // Deploy an action button mapped to the W key
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

        // Deploy an analog stick with 360° cursor displacement
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
    </script>
  </body>
</html>
```

### Pattern 2: Data-Driven Mode

Recommended for complex applications. Define screen partitions (Zones) and all key mappings via a flat JSON profile. Use **RootLayer (or any OmniPad component)** as the root node to carry the parsed `ConfigTreeNode`.

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <title>OmniPad - Data-Driven Mode Demo</title>

    <link rel="stylesheet" href="https://unpkg.com/@omnipad/vanilla/dist/index.css" />
    <script src="https://unpkg.com/@omnipad/vanilla/dist/index.global.js"></script>

    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        overflow: hidden;
        background: #111;
      }
      #app {
        position: relative;
        width: 100vw;
        height: 100vh;
      }
      #mock-game-canvas {
        position: absolute;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        width: 550px;
        height: 400px;
        background: #000;
        border: 4px solid #333;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #555;
        font-family: sans-serif;
      }
      #omnipad-container {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      @media (max-width: 600px) {
        #mock-game-canvas {
          width: 100%;
          height: 50%;
          top: 0;
          left: 0;
          transform: none;
          border: none;
        }
      }
    </style>
  </head>
  <body>
    <div id="app">
      <!-- Mock game/player container -->
      <div id="mock-game-canvas">
        <span>GAME CANVAS PLACEHOLDER</span>
      </div>

      <!-- Provide a container that serves as a coordinate system for relative positioning -->
      <div id="omnipad-container"></div>
    </div>

    <script>
      const { parseProfileForest, RootLayer } = window.OmniPad;

      // 1. Define flat configuration
      const profileRaw = {
        meta: { name: 'Action Layout' },
        items: [
          {
            id: '$ui-layer',
            type: 'root-layer',
            config: {
              layout: { width: '100%', height: '100%' },
            },
          },
          {
            id: '$game-canvas',
            type: 'target-zone',
            parentId: '$ui-layer',
            config: {
              cursorEnabled: true,
              layout: { stickySelector: '#mock-game-canvas' }, // Stuck to the player canvas
            },
          },
          {
            id: 'movement',
            type: 'd-pad',
            parentId: '$ui-layer',
            config: {
              mapping: {
                up: 'ArrowUp',
                down: 'ArrowDown',
                left: 'ArrowLeft',
                right: 'ArrowRight',
              },
              layout: { left: '10%', bottom: '20%', height: '20%', isSquare: true },
            },
          },
          {
            id: 'btn-fire',
            type: 'button',
            parentId: '$ui-layer',
            config: {
              label: 'FIRE',
              mapping: 'Space',
              layout: { right: '10%', bottom: '20%', height: '10%', isSquare: true },
            },
          },
        ],
      };

      // 2. Analyze flat configuration and build the runtime component forest
      const forest = parseProfileForest(profileRaw);

      // 3. Retrieve the root node and directly instantiate a RootLayer for mounting
      const rootNode = forest.roots['$ui-layer'];
      const container = document.getElementById('omnipad-container');

      if (rootNode && container) {
        // This will recursively generate the entire D-pad, fire button, and TargetZone!
        new RootLayer(container, { treeNode: rootNode });
      }
    </script>
  </body>
</html>
```

---

## 🕹️ Gamepad API Integration

Want to use an Xbox or PlayStation controller? Simply add a mapping table. OmniPad automatically handles controller polling. When you press a physical button, the corresponding virtual button on the screen will **synchronously trigger** its press animation, providing perfect haptic feedback.

```html
<script>
  const { GamepadManager } = window.OmniPad;

  // Start global physical gamepad monitoring
  GamepadManager.getInstance().setConfig(forest.runtimeGamepadMappings);
  GamepadManager.getInstance().start();
</script>
```

```json
// Add a mapping array at the root of `profileRaw`:
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

## 🌐 Iframe Penetration & Security Guide

OmniPad provides robust cross-origin iframe penetration capabilities. To prevent malicious scripts from hijacking input signals, we implement a **"Double-Handshake + Whitelist Validation"** security mechanism.

### Step 1: Configure Whitelist in the Host Document

The **Host** is the main page where your virtual gamepad UI resides. For security reasons, the `IframeManager` will **NOT** send coordinates or key signals to unauthorized domains.

```html
<script>
  const { IframeManager } = window.OmniPad;
  const iframeMgr = IframeManager.getInstance();

  // 1. By default, IframeManager trusts the current origin (window.location.origin).
  // 2. If the game runs on a different domain, explicitly add it to the whitelist:
  iframeMgr.addTrustedOrigin('https://game-provider.com');

  // ⚠️ WARNING: Using '*' (wildcard) in production is strongly discouraged. (Will be Rejected by IframeManager)
</script>
```

### Step 2: Initialize the Receiver in the Guest (Iframe)

You must inject a lightweight receiver script into the environment where the game (Iframe) is running. To prevent unauthorized sites from controlling the game, the receiver also requires a whitelist.

```html
<!-- Within the Iframe page running the game/emulator -->
<head>
  <!-- 1. Introducing an ultra-lightweight custom guest receiver script -->
  <script src="https://unpkg.com/@omnipad/vanilla/dist/guest.global.js"></script>

  <script>
    // 2. Start the listener and configure it to accept only messages from your main site, rejecting any `postMessage` requests from other sources.
    OmniPad.initIframeReceiver({
      allowedOrigins: ['https://your-main-site.com'],
    });
  </script>
</head>
```

### Step 3: Configure CSP (Content Security Policy)

As a final layer of browser-level defense, it is recommended to set the `frame-ancestors` directive in the game server's response headers or via a Meta tag to restrict which sites can embed the game.

```html
<!-- Only allow embedding by the current domain and your trusted host -->
<meta
  http-equiv="Content-Security-Policy"
  content="frame-ancestors 'self' https://your-main-site.com"
/>
```

### 🔒 Security Deep Dive (FAQ)

#### Q: What are "Trusted Sources"?

**A:** In Web Security, an **Origin** consists of `Protocol + Domain + Port`.

- **Host-side Whitelist**: Prevents gamepad coordinates (which may contain user interaction data) from being leaked to unrelated ad iframes or malicious third-party containers.
- **Guest-side Whitelist**: Prevents unauthorized websites from masquerading as the host to send input commands (e.g., simulating clicks on "Buy Now" buttons) to the game.

#### Q: Why does the Iframe application need to verify a "Signature"?

**A:** A single web page may run dozens of extensions (translators, ad blockers, etc.), many of which use `postMessage` for communication.
The `OMNIPAD_IPC_SIGNATURE` (e.g., `__OMNIPAD_IPC_V1__`) acts as a **private key**. It ensures the Guest receiver only processes valid OmniPad protocol data and ignores noise from other scripts, preventing logic errors or crashes.

#### Q: Why is the `*` wildcard prohibited?

**A:** Using `*` opens a door to the entire internet.

1.  **Host side**: If a malicious iframe is injected into your page, it could capture all your gamepad interactions.
2.  **Guest side**: Any website embedding your game could use simple scripts to take full control of the game character.
    **In production, explicit whitelist configuration is a mandatory security obligation.**

### 🛠️ Troubleshooting

1.  **Signals not being sent?**
    - Verify the host page calls `IframeManager.getInstance().addTrustedOrigin()`.
    - Ensure the string includes the full protocol (e.g., `https://`).
2.  **No response inside the Iframe?**
    - Ensure `initIframeReceiver` is executed correctly within the iframe.
    - Check the browser console for `[OmniPad-Security] Blocking untrusted iframe from origin` warnings.
3.  **Coordinate offsets are incorrect?**
    - Ensure the `IframeManager` can accurately retrieve the Iframe element's `getBoundingClientRect`. If the Iframe has complex CSS transforms (like `scale`), ensure you are using the **Sticky Layout** logic introduced in `v0.5+`.

---

## 🧩 Widgets Overview

- 🔘 **VirtualButton**: Supports taps and long-presses. Maps to keyboard or mouse buttons.
- 🖱️ **VirtualTrackpad**: Relative displacement trackpad with a built-in gesture engine supporting Double-tap & Hold.
- ➕ **VirtualDPad**: Authentic 8-way digital D-pad optimized for zero-latency in retro action games.
- 🕹️ **VirtualJoystick**: 360° analog stick with L3 support. Dual engines for discrete key mapping and continuous cursor velocity.
- 🎛️ **TargetZone**: The reception stage for events. Dispatches low-level DOM events and renders focus-return feedback.
- 📥 **InputZone**: A logic container that defines interactive regions and handles the "Touch-to-Spawn" dynamic widget logic.
- 🏗️ **RootLayer**: The pure entry point. Responsible for parsing the `OmniPadProfile` configuration tree and managing the lifecycle of all child entities.

---

## 🗺️ Status & Vision

> **📢 Current Status: Maintenance Mode** \
> The core of OmniPad (v0.7) has fully achieved its design objectives, delivering an exceptionally robust underlying input state machine. Due to limited personal capacity, **we will primarily focus on core bug fixes and stability maintenance at this time, with no plans for large-scale new feature development in the near future.**
>
> However, OmniPad's underlying architecture (Headless Core) inherently possesses limitless scalability potential. Below are evolutionary directions we consider highly valuable, and **we warmly welcome community participation through PRs to build together**:

- [ ] **Advanced Macro & Combo System**
  - Turbo (Auto-fire) and Toggle mode support.
  - Custom sequences for "One-tap combos."
- [ ] **OmniPad Studio**
  - A visual drag-and-drop editor for creating and exporting `profile.json` files.
- [ ] **Universal Browser Extension**
  - A Chrome/Edge extension to bring OmniPad to any gaming site (Poki, Newgrounds, etc.) instantly.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

**Built with ❤️ for the Web Gaming community.**
