# 🎮 OmniPad/Vanilla-JS

<div align="center">
<a href="https://github.com/omnipad-js/omnipad/blob/main/packages/vanilla/README.md">English</a> |
<a href="https://github.com/omnipad-js/omnipad/blob/main/packages/vanilla/README_cn.md">简体中文</a>
</div>

> **Add native-level touch controls and physical gamepad mapping to ANY web game, without touching the source code!**

OmniPad is a headless virtual input engine specifically built for **Web Games** (HTML5 Canvas, Ruffle Flash emulator, Godot web exports, etc.). It provides a complete translation system from "Screen Touch / Physical Gamepads" to "Native Browser Keyboard / Mouse Events."

> 🚨 **[Live Demo: Try it Now](https://omnipad-demo.coocoodaegap.com)** 🚨
> <br> (⚠️ Mobile browser highly recommended / PC browser with Xbox gamepad)

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

```bash
npm install @omnipad/vanilla
```

> ⚠️ **Note**: Don't forget to import the base styles in your entry file (e.g., `main.ts` or `App.vue`): `import '@omnipad/vanilla/style.css';`

---

## 🚀 Quick Start

### Pattern 1: Standalone Mode

Ideal for simple scenarios where you need to add fixed buttons to specific corners. No complex configuration required; just use them as standard UI components.

**1. HTML Structure `index.html`**

```html
<div id="app">
  <!-- game/player container -->
  <canvas id="my-game"></canvas>
  <!-- Provide a container that serves as a coordinate system for relative positioning -->
  <div class="omnipad-container"></div>
</div>

<style>
  #app,
  #my-game,
  .omnipad-container {
    position: absolute;
    inset: 0;
    height: 100%;
    width: 100%;
  }
</style>
```

**2. Logic Assembly `main.ts / main.js`**

```typescript
import { TargetZone, VirtualButton, VirtualJoystick } from '@omnipad/vanilla';
import '@omnipad/vanilla/style.css';

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

**2. Parse and Render in RootLayer:**

```typescript
import { parseProfileForest, RootLayer } from '@omnipad/vanilla';
import '@omnipad/vanilla/style.css';
import profileRaw from './profile.json';

// Analyze flat configuration and build the runtime component forest
const forest = parseProfileForest(profileRaw);

// Retrieve the root node and directly instantiate a RootLayer for mounting
const rootNode = forest.roots['$ui-layer'];
if (rootNode) {
  const container = document.getElementById('omnipad-container');
  if (container) {
    new RootLayer(container, { treeNode: rootNode });
  }
}
```

---

## 🕹️ Gamepad API Integration

Want to use an Xbox or PlayStation controller? Simply add a mapping table. OmniPad automatically handles controller polling. When you press a physical button, the corresponding virtual button on the screen will **synchronously trigger** its press animation, providing perfect haptic feedback.

```typescript
import { GamepadManager } from '@omnipad/vanilla';

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

## 🌐 Iframe Penetration & Security Guide

OmniPad provides robust cross-origin iframe penetration capabilities. To prevent malicious scripts from hijacking input signals, we implement a **"Double-Handshake + Whitelist Validation"** security mechanism.

### Step 1: Configure Whitelist in the Host Document

The **Host** is the main page where your virtual gamepad UI resides. For security reasons, the `IframeManager` will **NOT** send coordinates or key signals to unauthorized domains.

```typescript
import { IframeManager } from '@omnipad/vanilla';

const iframeMgr = IframeManager.getInstance();

// 1. By default, IframeManager trusts the current origin (window.location.origin).
// 2. If the game runs on a different domain, explicitly add it to the whitelist:
iframeMgr.addTrustedOrigin('https://game-provider.com');

// ⚠️ WARNING: Using '*' (wildcard) in production is strongly discouraged. (Will be Rejected by IframeManager)
```

### Step 2: Initialize the Receiver in the Guest (Iframe)

You must inject a lightweight receiver script into the environment where the game (Iframe) is running. To prevent unauthorized sites from controlling the game, the receiver also requires a whitelist.

```typescript
// Script running INSIDE the game Iframe
import { initIframeReceiver } from '@omnipad/vanilla/guest';

initIframeReceiver({
  // CORE SECURITY: Only accept signals from your main site.
  // Reject postMessage from any other sources.
  allowedOrigins: ['https://your-main-site.com'],
});
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

## 🎨 Advanced Customization

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
import { registerComponent } from '@omnipad/vanilla';
import CustomTrackpad from './components/CustomTrackpad.ts';
import './styles/custom-trackpad.css';

// Register the custom component as 'custom-trackpad'
registerComponent('custom-trackpad', CustomTrackpad);
```

After registration, you can directly use `"type": "custom-trackpad"` in your JSON configuration. The engine will automatically instantiate and bind the Core logic for you.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

**Built with ❤️ for the Web Gaming community.**
