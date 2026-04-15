import {
  AbstractGamepad,
  setDispatcherProvider,
  setGamepadProvider,
  setGlobalSignalHandler,
  setRafProvider,
  setSecurityPolicy,
} from '@omnipad/core';
import { dispatchKeyboardEvent, dispatchPointerEventAtPos, reclaimFocusAtPos } from './dom/action';
import { sanitizeCssClass, sanitizePrototypePollution } from './ts/security';
import { validateLayoutBox } from './ts/layout';
import { OmniPad } from '@omnipad/core/const';

export * from './dom';
export * from './ts';

export * from './singletons/ElementObserver';
export * from './singletons/IFrameManager';
export * from './singletons/WindowManager';

// =============================================================
// 1. Performance: Heartbeat Synchronization
// 将核心库的逻辑循环与浏览器的渲染节拍同步
// =============================================================
if (typeof window !== 'undefined') {
  setRafProvider(
    window.requestAnimationFrame.bind(window),
    window.cancelAnimationFrame.bind(window),
  );
}

// =============================================================
// 2. Dispatcher: Physical Action Execution
// 注入具体的 DOM 副作用实现，负责将抽象信号转化为真实的浏览器事件
// =============================================================
setDispatcherProvider({
  dispatchKeyboard: dispatchKeyboardEvent,
  dispatchPointerAtPos: dispatchPointerEventAtPos,
  reclaimFocus: reclaimFocusAtPos,
});

// =============================================================
// 3. Global Signals: Orphaned Signal Recovery
// 兜底策略：当输入控件没有绑定具体的 TargetZone 时，信号直接打在顶层 window 上
// =============================================================
setGlobalSignalHandler((signal) => {
  if (signal.type === OmniPad.ActionTypes.KEYDOWN || signal.type === OmniPad.ActionTypes.KEYUP) {
    dispatchKeyboardEvent(signal.type as any, signal.payload as any);
  }
});

// =============================================================
// 4. Gamepad: Hardware Input Polling
// 注入硬件采集能力。使用固定长度数组作为对象池，减少高频轮询产生的 GC 压力
// =============================================================
const gamepadSnapshot: (AbstractGamepad | null)[] = [null, null, null, null];

if (typeof navigator !== 'undefined' && navigator.getGamepads) {
  setGamepadProvider(() => {
    const rawPads = navigator.getGamepads();
    // 映射原生手柄数据到抽象接口，确保 Core 层平台无关性
    // Map native gamepad data to abstract interfaces for platform-agnostic core logic
    for (let i = 0; i < 4; i++) {
      gamepadSnapshot[i] = rawPads[i] || null;
    }
    return gamepadSnapshot;
  });
}

// =============================================================
// 5. Security: Policy Injection
// 注入针对 Web 环境的安全校验规则（如 CSS 单位白名单、原型链防护）
// =============================================================
setSecurityPolicy({
  // 过滤非法键名，防止恶意配置篡改运行时原型 / Prevent prototype pollution from malicious JSON
  sanitizeObject: (obj) => sanitizePrototypePollution(obj),

  // 执行业务层面的脱毒，确保布局参数符合浏览器 CSS 标准 / Sanitize business config for CSS standard
  validateConfig: (_, config) => {
    return {
      ...config,
      layout: validateLayoutBox(config.layout),
      cssClass: sanitizeCssClass(config.cssClass),
    };
  },
});
