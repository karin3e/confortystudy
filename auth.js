(function () {
  const $ = (id) => document.getElementById(id);
  const show = (message, type = 'error') => {
    const box = $('msg') || $('loginMessage');
    if (!box) return;
    box.textContent = message;
    box.style.display = 'block';
    box.className = box.id === 'loginMessage' ? `login-message ${type}` : 'msg';
    if (box.id === 'msg') {
      box.style.background = type === 'success' ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)';
      box.style.color = type === 'success' ? '#86efac' : '#fca5a5';
    }
  };
  const explain = (error) => {
    const code = error && error.code;
    const messages = {
      'auth/email-already-in-use': 'Este e-mail já possui uma conta. Tente entrar.',
      'auth/invalid-email': 'Digite um e-mail válido.',
      'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
      'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
      'auth/wrong-password': 'E-mail ou senha incorretos.',
      'auth/invalid-credential': 'E-mail ou senha incorretos.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
      'auth/popup-blocked': 'O navegador bloqueou a janela de login. Permita pop-ups e tente novamente.',
      'auth/operation-not-allowed': 'Ative o login Google em Authentication > Sign-in method no Firebase Console.',
      'auth/account-exists-with-different-credential': 'Este e-mail já tem uma conta. Entre com a senha dela para conectar o Google à mesma conta.',
      'auth/credential-already-in-use': 'Esta conta Google já está conectada a outro cadastro do ComfortStudy.',
      'auth/popup-closed-by-user': 'A janela do Google foi fechada antes de concluir o login.',
      'auth/unauthorized-domain': 'Este endereço ainda não está autorizado no Firebase Authentication.',
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.'
    };
    return messages[code] || 'Não foi possível concluir. Confira a configuração do Firebase e tente novamente.';
  };
  const preserveLegacyEmail = () => {
    const parse = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
    const old = parse('comfortAuthUser');
    const profile = parse('comfortProfile');
    const legacyEmail = old && old.email || profile && profile.email || '';
    localStorage.setItem('comfortLegacyEmail', String(legacyEmail).trim().toLowerCase());
    localStorage.setItem('comfortLegacyUid', String(old && old.uid || ''));
  };
  const ready = () => {
    if (!window.comfortFirebaseConfigured || !window.comfortAuth) {
      show('O sistema de contas ainda não está configurado. Siga CONFIGURAR_FIREBASE.md antes de publicar.');
      return false;
    }
    return true;
  };

  let pendingGoogleCredential = null;
  let pendingGoogleEmail = '';
  const googleLinkPanel = $('googleLinkPanel');
  const googleLinkForm = $('googleLinkForm');

  function finishLogin(user) {
    if (!user) return;
    localStorage.setItem('comfortSession', '1');
    localStorage.setItem('comfortAuthUser', JSON.stringify({
      uid: user.uid,
      name: user.displayName || 'Estudante',
      email: user.email || pendingGoogleEmail || ''
    }));
    location.replace('index_2.html');
  }

  function requestPasswordToLinkGoogle(error) {
    pendingGoogleCredential = firebase.auth.GoogleAuthProvider.credentialFromError(error) || error.credential || null;
    pendingGoogleEmail = String(error && (error.customData && error.customData.email || error.email) || '').trim().toLowerCase();
    if (!pendingGoogleCredential || !pendingGoogleEmail || !googleLinkPanel || !googleLinkForm) {
      show(explain(error));
      return;
    }
    $('googleLinkEmail').value = pendingGoogleEmail;
    $('googleLinkPassword').value = '';
    googleLinkPanel.hidden = false;
    $('googleLinkPassword').focus();
    show('Este e-mail já tem uma conta. Confirme a senha dela para adicionar o Google sem criar outro cadastro.');
  }

  async function handleGoogleError(error, allowRedirectFallback = false) {
    if (error && error.code === 'auth/account-exists-with-different-credential') {
      requestPasswordToLinkGoogle(error);
      return;
    }
    if (allowRedirectFallback && error && ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'].includes(error.code)) {
      try {
        preserveLegacyEmail();
        await comfortAuth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        return;
      } catch (redirectError) { error = redirectError; }
    }
    show(explain(error));
  }

  const loginForm = $('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!ready()) return;
      const email = $('loginEmail').value.trim().toLowerCase();
      const password = $('loginPassword').value;
      const button = loginForm.querySelector('[type="submit"]');
      if (button) button.disabled = true;
      try {
        preserveLegacyEmail();
        const credential = await comfortAuth.signInWithEmailAndPassword(email, password);
        finishLogin(credential.user);
      } catch (error) { show(explain(error)); }
      finally { if (button) button.disabled = false; }
    });

    const googleHost = $('googleBtn');
    if (googleHost) {
      googleHost.innerHTML = '<button type="button" id="firebaseGoogleLogin" class="btn-primary" style="width:100%;margin-top:0">Continuar com Google</button>';
      $('firebaseGoogleLogin').addEventListener('click', async () => {
        if (!ready()) return;
        const button = $('firebaseGoogleLogin');
        button.disabled = true;
        try {
          preserveLegacyEmail();
          const provider = new firebase.auth.GoogleAuthProvider();
          const credential = await comfortAuth.signInWithPopup(provider);
          finishLogin(credential.user);
        } catch (error) { await handleGoogleError(error, true); }
        finally { button.disabled = false; }
      });
      const oldError = $('googleError'); if (oldError) oldError.style.display = 'none';
    }
  }

  if (googleLinkForm) {
    googleLinkForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!ready() || !pendingGoogleCredential) return;
      const button = $('googleLinkSubmit');
      if (button) button.disabled = true;
      let signedIntoExistingAccount = false;
      try {
        const email = String($('googleLinkEmail').value || pendingGoogleEmail).trim().toLowerCase();
        const password = $('googleLinkPassword').value;
        const existingAccount = await comfortAuth.signInWithEmailAndPassword(email, password);
        signedIntoExistingAccount = true;
        const existingEmail = String(existingAccount.user.email || '').trim().toLowerCase();
        if (!pendingGoogleEmail || email !== pendingGoogleEmail || existingEmail !== pendingGoogleEmail) {
          await comfortAuth.signOut();
          signedIntoExistingAccount = false;
          show('O Google e a conta existente precisam usar o mesmo e-mail para serem conectados.');
          return;
        }
        const linkedAccount = await existingAccount.user.linkWithCredential(pendingGoogleCredential);
        pendingGoogleCredential = null;
        pendingGoogleEmail = '';
        if (googleLinkPanel) googleLinkPanel.hidden = true;
        finishLogin(linkedAccount.user);
      } catch (error) {
        if (signedIntoExistingAccount) {
          try { await comfortAuth.signOut(); } catch (_) {}
        }
        if (error && error.code === 'auth/credential-already-in-use') {
          show('Este Google já pertence a outro cadastro. Entre com esse Google para acessar os dados vinculados a ele.');
        } else {
          show(explain(error));
        }
      } finally { if (button) button.disabled = false; }
    });
    $('cancelGoogleLink')?.addEventListener('click', () => {
      pendingGoogleCredential = null;
      pendingGoogleEmail = '';
      if (googleLinkPanel) googleLinkPanel.hidden = true;
      if ($('loginMessage')) $('loginMessage').style.display = 'none';
    });
  }

  if ($('loginForm') && window.comfortAuth && typeof comfortAuth.getRedirectResult === 'function') {
    comfortAuth.getRedirectResult().then(result => {
      if (result && result.user) finishLogin(result.user);
    }).catch(error => handleGoogleError(error, false));
  }

  const registerForm = $('form');
  if (registerForm && $('confirm') && $('name')) {
    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!ready()) return;
      const name = $('name').value.trim();
      const email = $('email').value.trim().toLowerCase();
      const password = $('password').value;
      const confirm = $('confirm').value;
      if (password !== confirm) return show('As senhas não coincidem.');
      const button = registerForm.querySelector('[type="submit"]');
      if (button) button.disabled = true;
      try {
        preserveLegacyEmail();
        const credential = await comfortAuth.createUserWithEmailAndPassword(email, password);
        await credential.user.updateProfile({ displayName: name });
        const profile = { name, email, school: '', course: '', bio: '' };
        if (window.comfortDb) {
          await comfortDb.collection('users').doc(credential.user.uid).collection('data').doc('comfortProfile').set({ value: profile, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
        localStorage.setItem('comfortSession', '1');
        localStorage.setItem('comfortAuthUser', JSON.stringify({ uid: credential.user.uid, name, email }));
        localStorage.setItem('comfortProfile', JSON.stringify(profile));
        location.href = 'index_2.html';
      } catch (error) { show(explain(error)); }
      finally { if (button) button.disabled = false; }
    });
  }

  const resetForm = $('resetForm');
  if (resetForm && $('email') && !$('confirm') && !$('name')) {
    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!ready()) return;
      const email = $('email').value.trim().toLowerCase();
      try {
        await comfortAuth.sendPasswordResetEmail(email);
        show('Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha.', 'success');
      } catch (error) { show(explain(error)); }
    });
  }

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js', { scope: './' }).catch(() => {}));
})();
