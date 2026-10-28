/* Sincronização por conta. Cada usuário acessa os próprios dados. */
(function () {
  const KEYS = [
    "comfortTasks", "comfortTaskFiles", "comfortExams", "comfortNotices", "comfortStudySeconds",
    "comfortStudyLog", "comfortSubjectContents", "comfortSubjects", "comfortProfile",
    "comfortWeeklyGoal", "comfortClassSchedule", "comfortStudyPlans", "comfortFlashcards", "comfortGrades",
    "comfortStudyDiary", "comfortAppearance", "comfortQuizQuestions", "comfortQuizResults", "comfortPdfAnnotations",
    "comfortDailyGoalMinutes", "comfortStudySubjectLog", "comfortReminderSettings", "comfortStudyReaderFiles"
  ];
  const LOCAL_ONLY_KEYS = ["comfortStudyNotifications", "comfortNotificationSent", "comfortSyncPendingKeys"];
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
  const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
  const LOCAL_ATTACHMENT_BYTES = 700 * 1024;
  const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"]);
  const signatureTypes = {
    "application/pdf": bytes => Array.from(bytes.slice(0, 1024), byte => String.fromCharCode(byte)).join("").includes("%PDF-"),
    "image/png": bytes => bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte),
    "image/jpeg": bytes => bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    "image/gif": bytes => bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(Array.from(bytes.slice(0, 6), byte => String.fromCharCode(byte)).join("")),
    "image/webp": bytes => bytes.length >= 12 && Array.from(bytes.slice(0, 4), byte => String.fromCharCode(byte)).join("") === "RIFF" && Array.from(bytes.slice(8, 12), byte => String.fromCharCode(byte)).join("") === "WEBP"
  };
  const storageReady = uid => Boolean(window.comfortStorage && uid && window.comfortAuth && window.comfortAuth.currentUser && window.comfortAuth.currentUser.uid === uid && navigator.onLine !== false);

  async function inspectAttachmentType(file) {
    if (!file || typeof file.slice !== "function" || !file.size) return "";
    let bytes;
    try {
      const header = file.slice(0, 1024);
      const buffer = header.arrayBuffer
        ? await header.arrayBuffer()
        : await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(header);
          });
      bytes = new Uint8Array(buffer);
    } catch (_) { return ""; }
    for (const [type, matches] of Object.entries(signatureTypes)) if (matches(bytes)) return type;
    return "";
  }

  window.comfortInspectAttachmentType = inspectAttachmentType;

  function safeFileName(name) {
    return String(name || "arquivo").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120) || "arquivo";
  }

  async function uploadFile(file, category, uid) {
    if (!storageReady(uid)) throw new Error("O Firebase Storage não está disponível para esta conta.");
    if (!file || !allowedTypes.has(file.type)) throw new Error("Tipo de anexo não permitido.");
    if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Cada anexo pode ter até 10 MB.");
    const attachmentId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    const path = "users/" + uid + "/attachments/" + safeFileName(category || "estudos") + "/" + attachmentId + "-" + safeFileName(file.name);
    const ref = window.comfortStorage.ref(path);
    await ref.put(file, { contentType: file.type, customMetadata: { ownerUid: uid, originalName: safeFileName(file.name) } });
    const storageUrl = await ref.getDownloadURL();
    return { attachmentId: attachmentId, name: String(file.name || "arquivo"), type: file.type, size: Number(file.size) || 0, storagePath: path, storageUrl: storageUrl, ownerUid: uid };
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  window.comfortPrepareAttachmentFile = async function (file, category) {
    const detectedType = await inspectAttachmentType(file);
    if (!allowedTypes.has(detectedType)) {
      const isHeic = /\.hei[cf]$/i.test(String(file && file.name || "")) || /image\/hei[cf]/i.test(String(file && file.type || ""));
      throw new Error(isHeic ? "Esta foto está em HEIC. Salve ou exporte como JPG para anexá-la." : "Não reconheci o arquivo. Use um PDF, PNG, JPG, WEBP ou GIF válido.");
    }
    if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("Cada anexo pode ter até 10 MB.");
    const normalizedFile = file.type === detectedType ? file : new File([file], file.name || "arquivo", { type: detectedType });
    const uid = activeUid;
    if (storageReady(uid)) {
      try { return await uploadFile(normalizedFile, category, uid); }
      catch (error) {
        console.error("ComfortStudy: falha ao enviar anexo ao Firebase Storage", error);
        if (file.size > LOCAL_ATTACHMENT_BYTES) throw new Error("Não foi possível enviar ao Firebase Storage. Confira se o Storage está ativado e se as regras foram publicadas.");
        const localData = await readFileAsDataUrl(normalizedFile);
        return { name: String(file.name || "arquivo"), type: detectedType, size: Number(file.size) || 0, dataUrl: localData, storagePending: true };
      }
    }
    if (file.size > LOCAL_ATTACHMENT_BYTES) throw new Error("Anexos acima de 700 KB precisam do Firebase Storage ativado e de conexão com a internet.");
    return { name: String(file.name || "arquivo"), type: detectedType, size: Number(file.size) || 0, dataUrl: await readFileAsDataUrl(normalizedFile), storagePending: Boolean(uid && navigator.onLine !== false) };
  };

  window.comfortDeleteAttachment = function (file) {
    if (!file || !file.storagePath || !window.comfortStorage || !activeUid) return Promise.resolve(false);
    const prefix = "users/" + activeUid + "/attachments/";
    if (!String(file.storagePath).startsWith(prefix)) return Promise.resolve(false);
    return window.comfortStorage.ref(file.storagePath).delete().then(() => true).catch(error => {
      if (error && error.code !== "storage/object-not-found") console.warn("ComfortStudy: anexo removido localmente; não foi possível remover a cópia da nuvem.", error);
      return false;
    });
  };

  async function cloudSafeFile(file, uid) {
    if (!file || typeof file !== "object") return file;
    if (!file.storagePath && typeof file.dataUrl === "string" && storageReady(uid)) {
      try {
        const response = await fetch(file.dataUrl);
        const blob = await response.blob();
        const uploaded = await uploadFile(new File([blob], file.name || "arquivo", { type: file.type || blob.type }), "migrados", uid);
        Object.assign(file, uploaded);
        delete file.storagePending;
      } catch (error) {
        console.error("ComfortStudy: não foi possível migrar um anexo antigo", error);
        if (Number(file.size) > LOCAL_ATTACHMENT_BYTES) throw error;
        file.storagePending = true;
      }
    } else if (!file.storagePath && typeof file.dataUrl === "string" && uid && navigator.onLine !== false && !window.comfortStorage) {
      file.storagePending = true;
    }
    const clean = Object.assign({}, file);
    delete clean.dataUrl;
    delete clean.storageUrl;
    return clean;
  }

  async function cloudSafeValue(key, value, uid) {
    if (key === "comfortSubjectContents" && value && typeof value === "object" && !Array.isArray(value)) {
      const clean = {};
      for (const subject of Object.keys(value)) {
        const entries = value[subject];
        clean[subject] = Array.isArray(entries) ? await Promise.all(entries.map(async item => Object.assign({}, item, {
          files: await Promise.all((Array.isArray(item.files) ? item.files : []).map(file => cloudSafeFile(file, uid)))
        }))) : entries;
      }
      return clean;
    }
    if (key === "comfortTaskFiles" && value && typeof value === "object" && !Array.isArray(value)) {
      const clean = {};
      for (const taskId of Object.keys(value)) clean[taskId] = await Promise.all((Array.isArray(value[taskId]) ? value[taskId] : []).map(file => cloudSafeFile(file, uid)));
      return clean;
    }
    if (key === "comfortStudyReaderFiles" && Array.isArray(value)) return Promise.all(value.map(file => cloudSafeFile(file, uid)));
    return value;
  }

  async function resolveStorageUrls(key, value, uid) {
    if (!window.comfortStorage || !value) return value;
    const resolveFile = async file => {
      if (!file || !file.storagePath || file.storageUrl || !String(file.storagePath).startsWith("users/" + uid + "/attachments/")) return file;
      try { file.storageUrl = await window.comfortStorage.ref(file.storagePath).getDownloadURL(); }
      catch (error) { console.warn("ComfortStudy: anexo da nuvem indisponível", error); }
      return file;
    };
    if (key === "comfortSubjectContents" && typeof value === "object" && !Array.isArray(value)) {
      for (const subject of Object.keys(value)) if (Array.isArray(value[subject])) for (const item of value[subject]) if (Array.isArray(item.files)) for (const file of item.files) await resolveFile(file);
    } else if (key === "comfortTaskFiles" && typeof value === "object") {
      for (const taskId of Object.keys(value)) if (Array.isArray(value[taskId])) for (const file of value[taskId]) await resolveFile(file);
    } else if (key === "comfortStudyReaderFiles" && Array.isArray(value)) {
      for (const file of value) await resolveFile(file);
    }
    return value;
  }
  function hasLocalFilesToUpload(key, value) {
    const hasFile = file => Boolean(file && typeof file.dataUrl === "string" && !file.storagePath);
    if (key === "comfortSubjectContents" && value && typeof value === "object") return Object.keys(value).some(subject => (Array.isArray(value[subject]) ? value[subject] : []).some(item => (Array.isArray(item.files) ? item.files : []).some(hasFile)));
    if (key === "comfortTaskFiles" && value && typeof value === "object") return Object.keys(value).some(taskId => (Array.isArray(value[taskId]) ? value[taskId] : []).some(hasFile));
    if (key === "comfortStudyReaderFiles" && Array.isArray(value)) return value.some(hasFile);
    return false;
  }
  function combineFileReference(remoteFile, localFile) {
    return Object.assign({}, remoteFile || {}, localFile || {}, {
      storagePath: (remoteFile && remoteFile.storagePath) || (localFile && localFile.storagePath) || "",
      storageUrl: (localFile && localFile.storageUrl) || (remoteFile && remoteFile.storageUrl) || ""
    });
  }
  function mergeFileLists(remoteList, localList, matchById) {
    const localFiles = Array.isArray(localList) ? localList.slice() : [];
    const merged = (Array.isArray(remoteList) ? remoteList : []).map(remoteFile => {
      const index = localFiles.findIndex(localFile => (matchById && String(localFile.id) === String(remoteFile.id)) || (localFile.attachmentId && localFile.attachmentId === remoteFile.attachmentId) || (localFile.name && localFile.name === remoteFile.name));
      if (index < 0) return remoteFile;
      return combineFileReference(remoteFile, localFiles.splice(index, 1)[0]);
    });
    return merged.concat(localFiles);
  }
  function mergeLocalTaskFiles(remoteValue, localValue) {
    const merged = Object.assign({}, remoteValue && typeof remoteValue === "object" ? remoteValue : {});
    const local = localValue && typeof localValue === "object" ? localValue : {};
    Object.keys(local).forEach(taskId => { merged[taskId] = mergeFileLists(merged[taskId], local[taskId], false); });
    return merged;
  }
  function mergeLocalReaderFiles(remoteValue, localValue) {
    return mergeFileLists(remoteValue, localValue, true);
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
          ? Object.assign({}, item, { files: local.files.map(localFile => {
            const remoteFile = (Array.isArray(item.files) ? item.files : []).find(candidate => (candidate.attachmentId && candidate.attachmentId === localFile.attachmentId) || (candidate.name && candidate.name === localFile.name));
            return combineFileReference(remoteFile, localFile);
          }) })
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
      const localValue = raw === null ? null : safeParse(raw);
      const value = raw === null ? null : await cloudSafeValue(key, localValue, uid);
      if (raw !== null && JSON.stringify(localValue) !== raw) originalSet(key, JSON.stringify(localValue));
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
    if (!uid || !dbReady()) return pendingKeys.size === 0;
    const pending = [];
    timers.forEach((timer, key) => {
      clearTimeout(timer);
      timers.delete(key);
      pending.push(writeKey(key, localStorage.getItem(key), uid));
    });
    const immediateResults = await Promise.all(pending);
    await flushOfflineChanges();
    return immediateResults.every(Boolean) && pendingKeys.size === 0;
  };

  async function flushOfflineChanges() {
    if (!activeUid || !dbReady() || hydrating || navigator.onLine === false || !pendingKeys.size) return pendingKeys.size === 0;
    const uid = activeUid;
    for (const key of Array.from(pendingKeys)) {
      const raw = originalGet(key);
      if (raw === null) await deleteKey(key, uid);
      else await writeKey(key, raw, uid);
    }
    return pendingKeys.size === 0;
  }

  window.comfortClearLocalUserData = function () {
    if (pendingKeys.size || timers.size) return false;
    for (const key of KEYS) originalRemove(key);
    for (const key of LOCAL_ONLY_KEYS) originalRemove(key);
    originalRemove("comfortAuthUser");
    originalRemove("comfortSession");
    originalRemove("comfortLegacyEmail");
    originalRemove("comfortLegacyUid");
    pendingKeys.clear();
    originalRemove(PENDING_KEY);
    return true;
  };

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
      const savedLegacyEmail = originalGet("comfortLegacyEmail");
      const legacyEmail = savedLegacyEmail !== null ? savedLegacyEmail : (oldAccount && oldAccount.email) || "";
      const legacyUid = originalGet("comfortLegacyUid");
      let legacyMatches;
      if (legacyUid !== null) {
        legacyMatches = legacyUid
          ? String(legacyUid) === String(user.uid)
          : String(legacyEmail).trim().toLowerCase() === String(user.email || "").trim().toLowerCase();
      } else if (oldAccount && oldAccount.uid) {
        legacyMatches = String(oldAccount.uid) === String(user.uid);
      } else {
        legacyMatches = String(legacyEmail).trim().toLowerCase() === String(user.email || "").trim().toLowerCase();
      }
      let localSubjectContents = safeParse(localStorage.getItem("comfortSubjectContents") || "{}");
      let localTaskFiles = safeParse(originalGet("comfortTaskFiles") || "{}");
      let localReaderFiles = safeParse(originalGet("comfortStudyReaderFiles") || "[]");
      if (!legacyMatches) {
        for (const key of KEYS) originalRemove(key);
        for (const key of LOCAL_ONLY_KEYS) originalRemove(key);
        pendingKeys.clear();
        persistPendingKeys();
        localSubjectContents = {};
        localTaskFiles = {};
        localReaderFiles = [];
      }
      const collection = await root.collection("data").get();
      const remote = new Map(collection.docs.map(doc => [doc.id, doc.data().value]));

      if (!remote.has("comfortProfile") && remote.has("profile")) {
        const legacyProfile = remote.get("profile");
        await root.collection("data").doc("comfortProfile").set({
          value: legacyProfile,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        remote.set("comfortProfile", legacyProfile);
      }

      for (const key of KEYS) {
        if (remote.has(key)) continue;
        const local = localStorage.getItem(key);
        if (local !== null && legacyMatches) {
          const value = await cloudSafeValue(key, safeParse(local), user.uid);
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
        if (key === "comfortTaskFiles") value = mergeLocalTaskFiles(value, localTaskFiles);
        if (key === "comfortStudyReaderFiles") value = mergeLocalReaderFiles(value, localReaderFiles);
        value = await resolveStorageUrls(key, value, user.uid);
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
      originalRemove("comfortLegacyUid");
      originalSet("comfortSession", "1");
      if (!remote.has("comfortProfile")) {
        const profile = { name: account.name, email: account.email, school: "", course: "", bio: "" };
        originalSet("comfortProfile", JSON.stringify(profile));
        await root.collection("data").doc("comfortProfile").set({
          value: profile,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      if (navigator.onLine !== false) {
        ["comfortSubjectContents", "comfortTaskFiles", "comfortStudyReaderFiles"].forEach(key => {
          const localValue = safeParse(originalGet(key) || "null");
          if (hasLocalFilesToUpload(key, localValue)) pendingKeys.add(key);
        });
        persistPendingKeys();
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
