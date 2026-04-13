interface ImportMetaEnv {
  readonly DEV: boolean;
  // ... 其他变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
