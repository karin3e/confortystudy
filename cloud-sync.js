/* Sincronização por conta: cada usuário só acessa sua própria coleção Firestore. */
(function () {
  const KEYS = ['comfortTasks', 'comfortExams', 'comfortNotices', 'comfortStudySeconds', 'comfortSubjectContents', 'comfortProfile'];
  let activeUid = null;
  let hydrating = false;
  let timers = new Map();
  let resolveReady;
  window.comfortCloudReady = new Promise(resolve => { resolveReady = resolve; });
  const originalSet = localStorage.setItem.bind(localStorage);
  const originalRemove = localStorage.removeItem.bind(localStorage);
  const safeParse = (value) => { try { return JSON.parse(value); } catch { return value; } };
  const dbReady = () => window.comfortFirebaseConfigured && window.comfortDb && window.comfortAuth;

  async function writeKey(key, raw) {
    if (!activeUid || hydrating || !KEYS.includes(key) || !dbReady()) return;
    try {
      const value = raw === null ? null : safeParse(raw);
      await comfortDb.collection('users').doc(activeUid).collection('data').doc(key).set({ value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (error) { console.error('ComfortStudy: falha ao sincronizar', key, error); }
  }
  localStorage.setItem = function (key, value) {
    originalSet(key, value);
    if (KEYS.includes(key) && !hydrating && activeUid) {
      clearTimeout(timers.get(key));
      timers.set(key, setTimeout(() => writeKey(key, String(value)), 350));
    }
  };
  localStorage.removeItem = function (key) {
    originalRemove(key);
    if (KEYS.includes(key) && !hydrating && activeUid && dbReady()) {
      comfortDb.collection('users').doc(activeUid).collection('data').doc(key).delete().catch(console.error);
    }
  };

  async function hydrate(user) {
    if (!user || !dbReady()) { resolveReady(false); return; }
    activeUid = user.uid;
    hydrating = true;
    try {
      const root = comfortDb.collection('users').doc(user.uid);
      const collection = await root.collection('data').get();
      const remote = new Map(collection.docs.map(doc => [doc.id, doc.data().value]));
      // Importa apenas chaves ausentes na nuvem. Dados antigos de estudo só são importados
      // quando o e-mail da conta local anterior corresponde à conta Firebase atual.
      let oldAccount = null;
      try { oldAccount = JSON.parse(localStorage.getItem('comfortAuthUser') || 'null'); } catch {}
      const legacyEmail = localStorage.getItem('comfortLegacyEmail') || (oldAccount && oldAccount.email) || '';
      const legacyMatches = String(legacyEmail).trim().toLowerCase() === String(user.email || '').trim().toLowerCase();
      for (const key of KEYS) {
        if (remote.has(key)) continue;
        const local = localStorage.getItem(key);
        if (local !== null && legacyMatches) {
          const value = safeParse(local);
          await root.collection('data').doc(key).set({ value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          remote.set(key, value);
        }
      }
      for (const key of KEYS) {
        if (remote.has(key)) {
          const value = remote.get(key);
          originalSet(key, typeof value === 'string' && key === 'comfortStudySeconds' ? value : JSON.stringify(value));
        }
      }
      const account = { uid: user.uid, name: user.displayName || (remote.get('comfortProfile') || {}).name || 'Estudante', email: user.email || '' };
      originalSet('comfortAuthUser', JSON.stringify(account));
      localStorage.removeItem('comfortLegacyEmail');
      originalSet('comfortSession', '1');
      if (!remote.has('comfortProfile')) originalSet('comfortProfile', JSON.stringify({ name: account.name, email: account.email, school: '', course: '', bio: '' }));
    } catch (error) {
      console.error('ComfortStudy: erro ao carregar dados da nuvem', error);
      window.comfortCloudError = error;
    } finally {
      hydrating = false;
      resolveReady(true);
      window.dispatchEvent(new CustomEvent('comfort-cloud-ready'));
    }
  }

  if (!dbReady()) {
    window.comfortCloudReady = Promise.resolve(false);
    return;
  }
  comfortAuth.onAuthStateChanged(async user => {
    if (!user) {
      activeUid = null;
      resolveReady(false);
      return;
    }
    await hydrate(user);
  });
})();
