const INSTALL_TIMEOUT_MS = 60_000;
const ACTIVATE_TIMEOUT_MS = 20_000;

function waitForWorkerInstalled(worker: ServiceWorker, timeoutMs = INSTALL_TIMEOUT_MS) {
  if (worker.state === 'installed' || worker.state === 'activated') return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      worker.removeEventListener('statechange', handleStateChange);
      if (error) reject(error);
      else resolve();
    };
    const handleStateChange = () => {
      if (worker.state === 'installed' || worker.state === 'activated') finish();
      else if (worker.state === 'redundant') finish(new Error('service worker install failed'));
    };
    const timeout = window.setTimeout(
      () => finish(new Error('service worker install timeout')),
      timeoutMs,
    );
    worker.addEventListener('statechange', handleStateChange);
    // 监听器绑定期间状态也可能变化，立即复查可避免错过唯一一次 installed 事件。
    handleStateChange();
  });
}

function waitForControllerChange(
  serviceWorker: ServiceWorkerContainer,
  previousController: ServiceWorker,
  timeoutMs = ACTIVATE_TIMEOUT_MS,
) {
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      if (error) reject(error);
      else resolve();
    };
    const handleControllerChange = () => {
      if (serviceWorker.controller !== previousController) finish();
    };
    const timeout = window.setTimeout(
      () => finish(new Error('service worker activation timeout')),
      timeoutMs,
    );
    serviceWorker.addEventListener('controllerchange', handleControllerChange);
  });
}

export async function prepareServiceWorkerUpdate(
  registration: ServiceWorkerRegistration,
  serviceWorker: ServiceWorkerContainer,
) {
  await registration.update();

  if (registration.installing) await waitForWorkerInstalled(registration.installing);

  const waiting = registration.waiting;
  if (!waiting) {
    // 首次安装时页面没有旧控制器，刷新会直接使用网络上的最新资源。
    if (!serviceWorker.controller) return;
    throw new Error('updated service worker is not ready');
  }

  const previousController = serviceWorker.controller;
  const controllerChanged = previousController
    ? waitForControllerChange(serviceWorker, previousController)
    : Promise.resolve();
  waiting.postMessage({ type: 'SKIP_WAITING' });
  await controllerChanged;
}
