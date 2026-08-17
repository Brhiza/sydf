interface DeferredWorkOptions {
  delayMs?: number;
  idleTimeoutMs?: number;
}

type IdleCapableWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/** 在页面 load 完成后，再利用空闲时间启动非关键工作。 */
export function scheduleAfterPageLoad(task: () => void, options: DeferredWorkOptions = {}) {
  const delayMs = options.delayMs ?? 0;
  const idleTimeoutMs = options.idleTimeoutMs ?? 4_000;
  const browserWindow = window as IdleCapableWindow;
  let cancelled = false;
  let timerId: number | undefined;
  let idleId: number | undefined;

  const runWhenIdle = () => {
    timerId = window.setTimeout(() => {
      if (cancelled) return;
      if (browserWindow.requestIdleCallback) {
        idleId = browserWindow.requestIdleCallback(() => {
          if (!cancelled) task();
        }, { timeout: idleTimeoutMs });
      } else {
        task();
      }
    }, delayMs);
  };

  if (document.readyState === 'complete') runWhenIdle();
  else window.addEventListener('load', runWhenIdle, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener('load', runWhenIdle);
    if (timerId !== undefined) window.clearTimeout(timerId);
    if (idleId !== undefined) browserWindow.cancelIdleCallback?.(idleId);
  };
}
