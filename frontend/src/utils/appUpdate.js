// Lets the user tap an "Update" button to check for a newer deployed
// version RIGHT NOW, instead of waiting for the browser's own lazy
// background check. When a new service worker takes over, main.jsx already
// dispatches 'pwa-update-available' (shown by App.jsx as a reload toast) —
// this utility just triggers that check on demand.
//
// Returns one of: 'updated' | 'up-to-date' | 'unsupported' | 'error'

export const checkForUpdate = async () => {
  if (!('serviceWorker' in navigator)) return 'unsupported';

  try {
    const registration = await navigator.serviceWorker.ready;
    const previousWaiting = !!registration.waiting;

    // This SW calls skipWaiting() on install, so a newly installed worker
    // takes control almost immediately and registration.waiting usually
    // never gets populated. Detect the take-over via the controllerchange
    // event instead of polling registration.waiting.
    const tookOver = await new Promise((resolve) => {
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        resolve(value);
      };
      const onControllerChange = () => finish(true);
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      setTimeout(() => finish(false), 5000);
    });

    await registration.update();

    if (tookOver) {
      // A new version activated and controls the page. main.jsx's
      // controllerchange listener already fired the reload toast.
      return 'updated';
    }

    // Give the browser a moment to finish installing if it found something.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (registration.waiting) {
      // A new version is installed and waiting — tell it to take over.
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      return 'updated';
    }

    return previousWaiting ? 'updated' : 'up-to-date';
  } catch (err) {
    console.error('[appUpdate] Update check failed:', err);
    return 'error';
  }
};
