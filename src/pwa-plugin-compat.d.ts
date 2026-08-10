/**
 * vite-plugin-pwa exposes types from its optional asset generator even when
 * that generator is not used. Keep those optional types local so the app can
 * be type-checked without pulling in the image-processing toolchain.
 */
declare module '@vite-pwa/assets-generator/api' {
  export type ImageAssetsInstructions = unknown;
  export type FaviconLink = Record<string, unknown>;
  export type HtmlLink = Record<string, unknown>;
  export type AppleSplashScreenLink = Record<string, unknown>;
  export type HtmlLinkPreset = unknown;

  export interface IconAsset<TLink = Record<string, unknown>> {
    buffer: Promise<Buffer>;
    link?: TLink;
    [key: string]: unknown;
  }
}

declare module '@vite-pwa/assets-generator/config' {
  export type BuiltInPreset = string;
  export type Preset = Record<string, unknown>;
}

/** Service Worker lifecycle event used by Workbox's public type definitions. */
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

/** Compatibility for an omitted helper alias in unconfig 7.x declarations. */
type Args = [force?: boolean];
