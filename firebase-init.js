
(function () {
  function iniciarFirebase() {
    const config = window.COMFORT_FIREBASE_CONFIG;

    if (!config) {
      console.error(
        'ComfortStudy: firebase-config.js não disponibilizou a configuração.'
      );
      return;
    }

    if (!window.firebase) {
      console.error('ComfortStudy: biblioteca Firebase não carregada.');
      return;
    }

    const required = [
      'apiKey',
      'authDomain',
      'projectId',
      'messagingSenderId',
      'appId'
    ];

    const valid = required.every(key =>
      typeof config[key] === 'string' &&
      config[key].trim() !== ''
    );

    if (!valid) {
      console.error('ComfortStudy: configuração Firebase inválida.');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }

      window.comfortAuth = firebase.auth();
      window.comfortDb = firebase.firestore();
      window.comfortFirebaseConfigured = true;

      console.log('ComfortStudy: Firebase inicializado com sucesso.');
    } catch (error) {
      window.comfortFirebaseConfigured = false;
      console.error('ComfortStudy: falha ao inicializar Firebase:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarFirebase, {
      once: true
    });
  } else {
    iniciarFirebase();
  }
})();
