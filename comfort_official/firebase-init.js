(function () {
  const config = window.COMFORT_FIREBASE_CONFIG;
  const required = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
  const valid = Boolean(config && required.every(key => config[key] && !String(config[key]).startsWith('COLOQUE_')));
  window.comfortFirebaseConfigured = Boolean(valid && window.firebase);
  if (!window.comfortFirebaseConfigured) {
    console.warn('ComfortStudy: configure firebase-config-v2.js para habilitar contas e sincronizaÃ§Ã£o na nuvem.');
    return;
  }
  if (!firebase.apps.length) firebase.initializeApp(config);
  window.comfortAuth = firebase.auth();
  if (firebase.firestore) window.comfortDb = firebase.firestore();
})();

