
(function () {
  function iniciarFirebase() {
    const config = window.COMFORT_FIREBASE_CONFIG;

    if (!config) {
      console.error(
        'ComfortStudy: firebase-config-v2.js nÃ£o disponibilizou a configuraÃ§Ã£o.'
      );
      return;
    }

    if (!window.firebase) {
      console.error('ComfortStudy: biblioteca Firebase nÃ£o carregada.');
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
      console.error('ComfortStudy: configuraÃ§Ã£o Firebase invÃ¡lida.');
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }

      window.comfortAuth = firebase.auth();
      window.comfortDb = firebase.firestore();
      try {
        window.comfortStorage = config.storageBucket && firebase.storage ? firebase.storage() : null;
      } catch (storageError) {
        window.comfortStorage = null;
        console.warn('ComfortStudy: Firebase Storage indisponível; os anexos continuarão no modo local.', storageError);
      }
      window.comfortFirebaseConfigured = true;

      console.log('ComfortStudy: Firebase inicializado com sucesso.');
    } catch (error) {
      window.comfortFirebaseConfigured = false;
      console.error('ComfortStudy: falha ao inicializar Firebase:', error);
    }
  }

  
  iniciarFirebase();
})();
