class TestResizeObserver {
  public constructor(_callback: ResizeObserverCallback) {}

  public observe(_target: Element): void {}

  public unobserve(_target: Element): void {}

  public disconnect(): void {}
}

class TestIntersectionObserver {
  public constructor(
    _callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {}

  public observe(_target: Element): void {}

  public unobserve(_target: Element): void {}

  public disconnect(): void {}

  public takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  public readonly root = null;
  public readonly rootMargin = '0px';
  public readonly thresholds = [0];
}

class TestPointerEvent extends MouseEvent {
  public readonly pointerId: number;

  public constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

Object.defineProperties(globalThis, {
  ResizeObserver: { configurable: true, value: TestResizeObserver },
  IntersectionObserver: { configurable: true, value: TestIntersectionObserver },
  PointerEvent: { configurable: true, value: TestPointerEvent },
  requestAnimationFrame: { configurable: true, value: () => 1 },
  cancelAnimationFrame: { configurable: true, value: () => undefined },
});

Object.defineProperties(HTMLElement.prototype, {
  setPointerCapture: { configurable: true, value: () => undefined },
  releasePointerCapture: { configurable: true, value: () => undefined },
});

Object.defineProperty(document, 'elementsFromPoint', {
  configurable: true,
  value: () => [],
});
