/* Sincronização por conta. Cada usuário acessa os próprios dados. */
(function () {
  const KEYS = [
    "comfortTasks", "comfortExams", "comfortNotices", "comfortStudySeconds",
    "comfortStudyLog", "comfortSubjectContents", "comfortSubjects", "comfortProfile",
    "comfortWeeklyGoal", "comfortClassSchedule", "comfortStudyPlans", "comfortFlashcards", "comfortGrades",
    "comfortStudyDiary", "comfortAppearance", "comfortQuizQuestions", "comfortQuizResults",
    "comfortDailyGoalMinutes", "comfortStudySubjectLog"
  ];
  const LOCAL_ONLY_KEYS = ["comfortTaskFiles", "comfortPdfAnnotations", "comfortStudyReaderFiles", "comfortStudyNotifications", "comfortNotificationSent", "comfortSyncPendingKeys"];
  const PENDING_KEY = "comfortSyncPendingKeys";
  let activeUid = null;
  let hydrating = false;
  let pendingKeys = new Set();
  const timers = new Map();
  let resolveReady;
  window.comfortCloudReady = new Promise(resolve => { resolveReady = resolve; });
  const originalSet = localStorage.setItem.bind(localStorage);
  const originalGet = localStorage.getItem.bind(localStorage);
  const originalRemove = localStorage.removeItem.bind(localStorage);
  const safeParse = value => { try { return JSON.parse(value); } catch (_) { return value; } };
  function cloudSafeValue(key, value) {
    if (key !== "comfortSubjectContents" || !value || typeof value !== "object" || Array.isArray(value)) return value;
    const clean = {};
    Object.keys(value).forEach(subject => {
      clean[subject] = Array.isArray(value[subject])
        ? value[subject].map(item => Object.assign({}, item, { files: [] }))
        : value[subject];
    });
    return clean;
  }
  function mergeLocalSubjectFiles(remoteValue, localValue) {
    if (!remoteValue || typeof remoteValue !== "object" || Array.isArray(remoteValue)) return remoteValue;
    const merged = Object.assign({}, remoteValue);
    Object.keys(merged).forEach(subject => {
      const remoteList = merged[subject];
      const localList = localValue && Array.isArray(localValue[subject]) ? localValue[subject] : [];
      if (!Array.isArray(remoteList)) return;
      merged[subject] = remoteList.map(item => {
        const local = localList.find(candidate => Number(candidate.id) === Number(item.id));
        return local && Array.isArray(local.files) && local.files.length
          ? Object.assign({}, item, { files: local.files })
          : item;
      });
    });
    return merged;
  }
  const dbReady = () => window.comfortFirebaseConfigured && window.comfortDb && window.comfortAuth;

  function clearPendingWrites() {
    timers.forEach((timer, key) => { clearTimeout(timer); markPending(key); });
    timers.clear();
  }

  function persistPendingKeys() {
    try { originalSet(PENDING_KEY, JSON.stringify(Array.from(pendingKeys))); } catch (_) {}
  }

  function markPending(key) {
    if (!KEYS.includes(key)) return;
    pendingKeys.add(key);
    persistPendingKeys();
  }

  async function writeKey(key, raw, uid) {
    if (!uid || activeUid !== uid || hydrating || !KEYS.includes(key) || !dbReady()) return false;
    try {
      const value = raw === null ? null : cloudSafeValue(key, safeParse(raw));
      await comfortDb.collection("users").doc(uid).collection("data").doc(key).set({
        value: value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      pendingKeys.delete(key);
      persistPendingKeys();
      return true;
    } catch (error) {
      console.error("ComfortStudy: falha ao sincronizar", key, error);
      markPending(key);
      return false;
    }
  }

  async function deleteKey(key, uid) {
    if (!uid || activeUid !== uid || hydrating || !KEYS.includes(key) || !dbReady()) return false;
    try {
      await comfortDb.collection("users").doc(uid).collection("data").doc(key).delete();
      pendingKeys.delete(key);
      persistPendingKeys();
      return true;
    } catch (error) {
      console.error("ComfortStudy: falha ao sincronizar remoção", key, error);
      markPending(key);
      return false;
    }
  }

  localStorage.setItem = function (key, value) {
    originalSet(key, value);
    if (!KEYS.includes(key) || hydrating || !activeUid) return;
    if (navigator.onLine === false) { markPending(key); return; }
    const uid = activeUid;
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => {
      timers.delete(key);
      writeKey(key, String(value), uid);
    }, 350));
  };

  localStorage.removeItem = function (key) {
    originalRemove(key);
    if (!KEYS.includes(key) || hydrating || !activeUid || !dbReady()) return;
    if (timers.has(key)) { clearTimeout(timers.get(key)); timers.delete(key); }
    const uid = activeUid;
    if (navigator.onLine === false) { markPending(key); return; }
    deleteKey(key, uid);
  };
  window.comfortCloudFlush = async function () {
    const uid = activeUid;
    if (!uid || !dbReady()) return;
    const pending = [];
    timers.forEach((timer, key) => {
      clearTimeout(timer);
      timers.delete(key);
      pending.push(writeKey(key, localStorage.getItem(key), uid));
    });
    await Promise.all(pending);
    await flushOfflineChanges();
  };

  async function flushOfflineChanges() {
    if (!activeUid || !dbReady() || hydrating || navigator.onLine === false || !pendingKeys.size) return;
    const uid = activeUid;
    for (const key of Array.from(pendingKeys)) {
      const raw = originalGet(key);
      if (raw === null) await deleteKey(key, uid);
      else await writeKey(key, raw, uid);
    }
  }

  window.addEventListener("online", flushOfflineChanges);

  async function hydrate(user) {
    if (!user || !dbReady()) { resolveReady(false); return; }

    clearPendingWrites();
    activeUid = user.uid;
    hydrating = true;
    try {
      const savedPending = JSON.parse(originalGet(PENDING_KEY) || "[]");
      pendingKeys = new Set(Array.isArray(savedPending) ? savedPending.filter(key => KEYS.includes(key)) : []);
    } catch (_) { pendingKeys = new Set(); }
    try {
      const root = comfortDb.collection("users").doc(user.uid);
      let oldAccount = null;
      try { oldAccount = JSON.parse(localStorage.getItem("comfortAuthUser") || "null"); } catch (_) {}
      const legacyEmail = localStorage.getItem("comfortLegacyEmail") || (oldAccount && oldAccount.email) || "";
      const legacyMatches = String(legacyEmail).trim().toLowerCase() === String(user.email || "").trim().toLowerCase();
      let localSubjectContents = safeParse(localStorage.getItem("comfortSubjectContents") || "{}");
      if (!legacyMatches) {
        for (const key of KEYS) originalRemove(key);
        for (const key of LOCAL_ONLY_KEYS) originalRemove(key);
        pendingKeys.clear();
        persistPendingKeys();
        localSubjectContents = {};
      }
      const collection = await root.collection("data").get();
      const remote = new Map(collection.docs.map(doc => [doc.id, doc.data().value]));

      for (const key of KEYS) {
        if (remote.has(key)) continue;
        const local = localStorage.getItem(key);
        if (local !== null && legacyMatches) {
          const value = cloudSafeValue(key, safeParse(local));
          await root.collection("data").doc(key).set({
            value: value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          remote.set(key, value);
        }
      }

      for (const key of KEYS) {
        if (!remote.has(key) || pendingKeys.has(key)) continue;
        let value = remote.get(key);
        if (key === "comfortSubjectContents") value = mergeLocalSubjectFiles(value, localSubjectContents);
        originalSet(key, typeof value === "string" && key === "comfortStudySeconds" ? value : JSON.stringify(value));
      }

      const remoteProfile = remote.get("comfortProfile") || {};
      const account = {
        uid: user.uid,
        name: user.displayName || remoteProfile.name || "Estudante",
        email: user.email || ""
      };
      originalSet("comfortAuthUser", JSON.stringify(account));
      originalRemove("comfortLegacyEmail");
      originalSet("comfortSession", "1");
      if (!remote.has("comfortProfile")) {
        originalSet("comfortProfile", JSON.stringify({ name: account.name, email: account.email, school: "", course: "", bio: "" }));
      }
    } catch (error) {
      console.error("ComfortStudy: erro ao carregar dados da nuvem", error);
      window.comfortCloudError = error;
    } finally {
      hydrating = false;
      resolveReady(true);
      window.dispatchEvent(new CustomEvent("comfort-cloud-ready"));
      if (navigator.onLine !== false && pendingKeys.size) setTimeout(flushOfflineChanges, 0);
    }
  }

  if (!dbReady()) {
    window.comfortCloudReady = Promise.resolve(false);
    return;
  }

  comfortAuth.onAuthStateChanged(async user => {
    if (!user) {
      clearPendingWrites();
      activeUid = null;
      resolveReady(false);
      return;
    }
    if (activeUid && activeUid !== user.uid) clearPendingWrites();
    await hydrate(user);
  });
})();
