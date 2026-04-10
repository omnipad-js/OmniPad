/**
 * Generates a unique identifier (UID).
 *
 * Uses the Web Crypto API to ensure cryptographic randomness if available,
 * falling back to Math.random() in insecure or legacy environments.
 *
 * @param prefix - A prefix string to identify the entity type (e.g., 'btn').
 * @returns A unique string formatted as `prefix-timestamp-random`.
 */
export const generateUID = (prefix: string = 'omnipad'): string => {
  // 1. 生成基于时间戳的标识 / Generate timestamp part (Base36)
  const stamp = Date.now().toString(36);

  // 2. 初始化 4 字节的随机缓冲区 / Initialize 4-byte random buffer
  const bytes = new Uint8Array(4);
  const cryptoObj = globalThis.crypto;

  // 3. 优先使用加密级随机数 / Prioritize Web Crypto API
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    // 降级方案：保留逻辑形状但使用普通随机数 / Fallback to insecure random
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // 4. 将字节转换为 36 进制并截取 / Convert bytes to Base36 and slice
  const random = Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .substring(0, 4);

  return `${prefix}-${stamp}-${random}`;
};

/**
 * Checks if the provided ID is a reserved global identifier.
 *
 * In OmniPad, IDs starting with the `$` symbol are considered "Global IDs".
 * These identifiers are treated as static references and are not transformed
 * into dynamic UIDs during configuration parsing.
 *
 * @param id - The identifier string to check.
 * @returns `true` if the ID starts with `$`, otherwise `false`.
 *
 * @example
 * isGlobalID('$root-layer') // returns true
 * isGlobalID('btn-up')      // returns false
 */
export function isGlobalID(id: string): boolean {
  return id.startsWith('$');
}
