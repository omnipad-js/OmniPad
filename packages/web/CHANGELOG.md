# @omnipad/web

## 0.7.0

### Minor Changes

- Release v0.7.0
  - Major architectural overhaul: decoupled core logic from the DOM into a truly headless `@omnipad/core` and introduced `@omnipad/web` for browser-specific drivers.
  - Implemented dynamic dependency injection for rAF, Gamepad API, and DOM side-effects.
  - Unlocked multi-layered Iframe penetration with reliable cross-origin focus reclamation via an enhanced Guest module.
  - Fixed critical state synchronization bugs in dynamic widgets and optimized TargetZone focus timing for improved performance.

### Patch Changes

- Updated dependencies
  - @omnipad/core@0.7.0
