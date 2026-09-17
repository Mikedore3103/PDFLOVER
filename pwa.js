(() => {
  const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const canRegister = 'serviceWorker' in navigator && (window.isSecureContext || isLocalhost);
  let installPrompt = null;

  if (canRegister) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
        .catch(error => console.warn('PDF LOVERS app installation is unavailable:', error.message));
    });
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  document.documentElement.classList.toggle('standalone-app', standalone);
  const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const installButton = document.getElementById('installAppBtn');

  function showInstallButton() {
    if (installButton && !standalone) installButton.classList.remove('hidden');
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    showInstallButton();
  });

  if (isIos) showInstallButton();

  installButton?.addEventListener('click', async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.classList.add('hidden');
      return;
    }

    if (isIos) {
      window.alert('To install PDF LOVERS, tap the Share button in Safari, then choose “Add to Home Screen”.');
    }
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton?.classList.add('hidden');
  });
})();
