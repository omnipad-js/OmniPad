import { Vec2 } from '../types';

/**
 * Options for configuring gesture recognition behavior.
 */
export interface GestureOptions {
  /**
   * Maximum duration in milliseconds for a touch to be considered a tap.
   * @default 250
   */
  tapTime?: number;

  /**
   * Maximum movement in pixels allowed for a touch to be considered a tap.
   * Prevents accidental taps while sliding.
   * @default 10
   */
  tapDistance?: number;

  /**
   * Maximum interval in milliseconds between two taps to trigger a double-tap.
   * @default 300
   */
  doubleTapGap?: number;

  /** Callback triggered on a single tap. */
  onTap?: () => void;

  /** Callback triggered on a double tap. */
  onDoubleTap?: () => void;

  /** Callback triggered when a "Double-tap and Hold" gesture begins (dragging). */
  onDoubleTapHoldStart?: () => void;

  /** Callback triggered when a "Double-tap and Hold" gesture ends. */
  onDoubleTapHoldEnd?: () => void;
}

/**
 * A lightweight gesture recognizer state machine.
 *
 * Designed to distinguish between single taps, double taps,
 * simple swipes, and double-tap-to-drag gestures.
 * Optimized for high-performance input components like Trackpads and Joysticks.
 */
export class GestureRecognizer {
  private options: Required<
    Omit<GestureOptions, 'onTap' | 'onDoubleTap' | 'onDoubleTapHoldStart' | 'onDoubleTapHoldEnd'>
  > &
    GestureOptions;

  private startTime = 0;
  private startPos: Vec2 = { x: 0, y: 0 };
  private lastTapTime = 0;

  /** Whether the pointer has moved beyond the tap threshold / 指针是否已移动超出轻点阈值 */
  public hasMoved = false;

  /** Whether the current gesture is a double-tap-and-hold drag / 当前是否处于双击按住拖拽状态 */
  public isDoubleTapHolding = false;

  /**
   * Creates an instance of GestureRecognizer.
   * @param options - Configuration options for sensitivity and timing.
   */
  constructor(options: GestureOptions = {}) {
    this.options = {
      tapTime: 250,
      tapDistance: 10,
      doubleTapGap: 300,
      ...options,
    };
  }

  /**
   * Processes the pointer down event.
   *
   * @param x - Viewport X coordinate.
   * @param y - Viewport Y coordinate.
   */
  public onPointerDown(x: number, y: number): void {
    const now = Date.now();

    // Initialize session data / 初始化本次会话数据
    this.startTime = now;
    this.startPos = { x, y };
    this.hasMoved = false;

    // Determine if this starts a double-tap hold (drag mode) / 判断是否触发双击拖拽开始
    if (now - this.lastTapTime < this.options.doubleTapGap) {
      this.isDoubleTapHolding = true;
      this.options.onDoubleTapHoldStart?.();
    } else {
      this.isDoubleTapHolding = false;
    }
  }

  /**
   * Processes the pointer move event to track displacement.
   *
   * @param x - Viewport X coordinate.
   * @param y - Viewport Y coordinate.
   */
  public onPointerMove(x: number, y: number): void {
    // If we haven't flagged movement yet, check against threshold / 如果尚未标记移动，检查是否超过阈值
    if (!this.hasMoved) {
      const dist = Math.hypot(x - this.startPos.x, y - this.startPos.y);
      if (dist > this.options.tapDistance) {
        this.hasMoved = true;
      }
    }
  }

  /**
   * Processes the pointer up event and resolves the final gesture.
   *
   * @param x - Viewport X coordinate.
   * @param y - Viewport Y coordinate.
   */
  public onPointerUp(x: number, y: number): void {
    const now = Date.now();
    const duration = now - this.startTime;

    if (this.isDoubleTapHolding) {
      // End drag mode / 结束拖拽模式
      this.isDoubleTapHolding = false;
      this.options.onDoubleTapHoldEnd?.();
      // Clear interval to prevent triple-tap confusion / 清除间隔防止连击干扰
      this.lastTapTime = 0;
    } else {
      // Evaluate if this was a valid tap / 评估这是否为一次有效的轻点
      if (duration <= this.options.tapTime && !this.hasMoved) {
        this.options.onTap?.();

        // Check for double-tap sequence / 检查双击序列
        if (now - this.lastTapTime < this.options.doubleTapGap) {
          this.options.onDoubleTap?.();
          this.lastTapTime = 0;
        } else {
          this.lastTapTime = now;
        }
      }
    }
  }

  /**
   * Resets the internal state machine.
   * Used to clear "stuck" gestures during window blur or layout resets.
   */
  public reset(): void {
    if (this.isDoubleTapHolding) {
      this.options.onDoubleTapHoldEnd?.();
    }
    this.isDoubleTapHolding = false;
    this.hasMoved = false;
    this.startTime = 0;
    this.lastTapTime = 0;
  }
}
