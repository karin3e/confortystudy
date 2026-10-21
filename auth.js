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
      'auth/operation-not-allowed': 'Esse método de login ainda não foi ativado no Firebase Console.',
      'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.'
    };
    return messages[code] || 'Não foi possível concluir. Confira a configuração do Firebase e tente novamente.';
  };
  const preserveLegacyEmail = () => {
    try {
      const old = JSON.parse(localStorage.getItem('comfortAuthUser') || 'null');
      if (old && old.email) localStorage.setItem('comfortLegacyEmail', String(old.email).trim().toLowerCase());
    } catch {}
  };
  const ready = () => {
    if (!window.comfortFirebaseConfigured || !window.comfortAuth) {
      show('O sistema de contas ainda não está configurado. Siga CONFIGURAR_FIREBASE.md antes de publicar.');
      return false;
    }
    return true;
  };

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
        localStorage.setItem('comfortSession', '1');
        localStorage.setItem('comfortAuthUser', JSON.stringify({
          uid: credential.user.uid, name: credential.user.displayName || 'Estudante',
          email: credential.user.email || email
        }));
        location.href = 'index_2.html';
      } catch (error) { show(explain(error)); }
      finally { if (button) button.disabled = false; }
    });

    const googleHost = $('googleBtn');
    if (googleHost) {
      googleHost.innerHTML = '<button type="button" id="firebaseGoogleLogin" class="btn-primary" style="width:100%;margin-top:0">Continuar com Google</button>';
      $('firebaseGoogleLogin').addEventListener('click', async () => {
        if (!ready()) return;
        try {
          preserveLegacyEmail();
          const provider = new firebase.auth.GoogleAuthProvider();
          const credential = await comfortAuth.signInWithPopup(provider);
          localStorage.setItem('comfortSession', '1');
          localStorage.setItem('comfortAuthUser', JSON.stringify({ uid: credential.user.uid, name: credential.user.displayName || 'Estudante', email: credential.user.email || '' }));
          location.href = 'index_2.html';
        } catch (error) { show(explain(error)); }
      });
      const oldError = $('googleError'); if (oldError) oldError.style.display = 'none';
    }
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
          await comfortDb.collection('users').doc(credential.user.uid).collection('data').doc('profile').set({ value: profile, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
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
