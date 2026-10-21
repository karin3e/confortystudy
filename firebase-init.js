
(function () {
  try {
    const config = window.COMFORT_FIREBASE_CONFIG;
    const required = [
      'apiKey',
      'authDomain',
      'projectId',
      'messagingSenderId',
      'appId'
    ];

    const valid = Boolean(
      config &&
      required.every(key =>
        typeof config[key] === 'string' &&
        config[key].trim() !== '' &&
        !config[key].startsWith('COLOQUE_')
      )
    );

    if (!valid) {
      window.comfortFirebaseConfigured = false;
      console.error(
        'ConfortStudy: configuração do Firebase ausente ou inválida.',
        config
      );
      return;
    }

    if (!window.firebase) {
      window.comfortFirebaseConfigured = false;
      console.error('ConfortStudy: biblioteca Firebase não carregada.');
      return;
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    window.comfortAuth = firebase.auth();
    window.comfortDb = firebase.firestore();
    window.comfortFirebaseConfigured = true;

    console.log('ConfortStudy: Firebase inicializado com sucesso.');
  } catch (error) {
    window.comfortFirebaseConfigured = false;
    console.error('ConfortStudy: erro ao inicializar Firebase:', error);
  }
})();
