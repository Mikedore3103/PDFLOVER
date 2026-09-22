(() => {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const canRegister = 'serviceWorker' in navigator && (window.isSecureContext || isLocalhost);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const isAndroid = /android/i.test(window.navigator.userAgent);
  let installPrompt = null;
  let registration = null;
  let refreshing = false;
  let updateRequested = false;

  document.documentElement.classList.toggle('standalone-app', isStandalone);

  function showToast(message, actionLabel, onAction) {
    document.querySelector('.pwa-toast')?.remove();
    const toast = document.createElement('div');
    toast.className = 'pwa-toast';
    toast.setAttribute('role', 'status');
    const messageElement = document.createElement('span');
    messageElement.textContent = message;
    toast.appendChild(messageElement);
    if (actionLabel && onAction) {
      const action = document.createElement('button');
      action.type = 'button';
      action.textContent = actionLabel;
      action.addEventListener('click', onAction);
      toast.appendChild(action);
    }
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    if (!actionLabel) {
      window.setTimeout(() => {
        toast.classList.remove('is-visible');
        window.setTimeout(() => toast.remove(), 250);
      }, 4000);
    }
  }

  function installCopy() {
    if (isIos) {
      return {
        title: 'Install on iPhone or iPad',
        intro: 'Add PDF LOVERS as a web app so it opens in its own app window.',
        steps: [
          'Open this page in Safari.',
          'Tap the Share button in the Safari toolbar.',
          'Choose Add to Home Screen.',
          'Keep Open as Web App enabled if that option appears, then tap Add.'
        ]
      };
    }
    if (isAndroid) {
      return {
        title: 'Install on Android',
        intro: 'Install PDF LOVERS for a full-screen app experience and quick Home Screen access.',
        steps: installPrompt ? [] : [
          'Open your browser menu.',
          'Choose Install app or Add to Home screen.',
          'Confirm Install.'
        ]
      };
    }
    return {
      title: 'Install PDF LOVERS',
      intro: 'Install PDF LOVERS to open it in a focused app window from your desktop.',
      steps: installPrompt ? [] : ['Open your browser menu and choose Install PDF LOVERS or Install app.']
    };
  }

  function ensureInstallDialog() {
    let dialog = document.getElementById('pwaInstallDialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'pwaInstallDialog';
    dialog.className = 'pwa-install-dialog';
    dialog.setAttribute('aria-labelledby', 'pwaInstallTitle');
    dialog.innerHTML = `
      <form method="dialog" class="pwa-install-card">
        <button class="pwa-dialog-close" value="cancel" aria-label="Close installation instructions">&times;</button>
        <img src="assets/app-icon-192.png" alt="" width="72" height="72">
        <p class="pwa-dialog-kicker">PDF LOVERS APP</p>
        <h2 id="pwaInstallTitle"></h2>
        <p id="pwaInstallIntro"></p>
        <ol id="pwaInstallSteps"></ol>
        <button id="pwaInstallConfirm" class="pwa-install-confirm" type="button">Install PDF LOVERS</button>
        <button class="pwa-install-later" value="cancel">Not now</button>
      </form>`;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }

  function openInstallDialog() {
    if (isStandalone) return;
    const dialog = ensureInstallDialog();
    const copy = installCopy();
    dialog.querySelector('#pwaInstallTitle').textContent = copy.title;
    dialog.querySelector('#pwaInstallIntro').textContent = copy.intro;
    const steps = dialog.querySelector('#pwaInstallSteps');
    steps.innerHTML = '';
    copy.steps.forEach(step => {
      const item = document.createElement('li');
      item.textContent = step;
      steps.appendChild(item);
    });
    steps.hidden = copy.steps.length === 0;
    const confirm = dialog.querySelector('#pwaInstallConfirm');
    confirm.hidden = !installPrompt;
    confirm.onclick = async () => {
      if (!installPrompt) return;
      dialog.close();
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') installPrompt = null;
      updateInstallButtons();
    };
    dialog.showModal();
  }

  function installButtons() {
    return [...document.querySelectorAll('[data-install-pwa], #installAppBtn')];
  }

  function updateInstallButtons() {
    installButtons().forEach(button => {
      button.classList.toggle('hidden', isStandalone);
      button.setAttribute('aria-haspopup', 'dialog');
      button.onclick = openInstallDialog;
    });
  }

  function offerUpdate(worker) {
    showToast('A new version of PDF LOVERS is ready.', 'Update', () => {
      updateRequested = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    });
  }

  if (canRegister) {
    window.addEventListener('load', async () => {
      try {
        registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
        if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
          });
        });
        registration.update().catch(() => {});
      } catch (error) {
        console.warn('PDF LOVERS app installation is unavailable:', error.message);
      }
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!updateRequested || refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallButtons();
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButtons().forEach(button => button.classList.add('hidden'));
    showToast('PDF LOVERS was installed successfully.');
  });

  window.addEventListener('offline', () => showToast('You are offline. Saved pages remain available, but file tools need an internet connection.'));
  window.addEventListener('online', () => showToast('You are back online.'));

  updateInstallButtons();
})();
