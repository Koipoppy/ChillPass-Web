/// <reference types="vite/client" />

/** 构建期注入的应用版本号，来源为 package.json */
declare const __APP_VERSION__: string

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
