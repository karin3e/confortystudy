/* ComfortStudy Support — authenticated Firestore requests; e-mail delivery is handled by Cloud Functions. */
(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('comfortSupportForm');
  const statusEl = $('comfortSupportStatus');
  const historyEl = $('comfortSupportHistory');
  if (!form || !statusEl || !historyEl) return;
  const CONTACT = 'karinevitoriasousa6@gmail.com';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const statusLabel = (s) => ({received:'Recebido',in_review:'Em análise',answered:'Respondido',closed:'Concluído'}[s] || 'Recebido');
  function currentUser() { return window.comfortAuth && window.comfortAuth.currentUser; }
  function db() { return window.comfortDb; }
  function say(message, isError=false) { statusEl.textContent=message; statusEl.style.color=isError?'#b91c1c':'var(--primary-dark)'; }
  function showUnavailable() { historyEl.innerHTML = `<p class="comfort-muted">Não foi possível conectar ao suporte agora. Verifique sua conexão e tente novamente ou escreva para <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`; }
  async function loadRequests() {
    const user=currentUser(), firestore=db();
    if (!user || !firestore) { showUnavailable(); return; }
    try {
      const snap=await firestore.collection('users').doc(user.uid).collection('supportRequests').orderBy('createdAt','desc').limit(30).get();
      if (snap.empty) { historyEl.innerHTML='<p class="comfort-muted">Você ainda não enviou solicitações.</p>'; return; }
      historyEl.innerHTML=snap.docs.map(doc=>{const d=doc.data()||{}; const date=d.createdAt&&d.createdAt.toDate?d.createdAt.toDate().toLocaleString('pt-BR'):'Data registrada'; return `<article class="comfort-support-item"><span class="comfort-support-badge">${escapeHtml(statusLabel(d.status))}</span><h4>${escapeHtml(d.subject||'Solicitação de suporte')}</h4><p><strong>Protocolo:</strong> ${escapeHtml(d.protocol||doc.id)}</p><p><strong>Categoria:</strong> ${escapeHtml(d.category||'')}</p><p><strong>Aberto em:</strong> ${escapeHtml(date)}</p>${d.latestMessage?`<p><strong>Atualização:</strong> ${escapeHtml(d.latestMessage)}</p>`:''}</article>`;}).join('');
    } catch(error) { console.error('ComfortStudy suporte: falha ao carregar pedidos',error); showUnavailable(); }
  }
  form.addEventListener('submit', async (event)=>{
    event.preventDefault();
    const user=currentUser(), firestore=db();
    if (!user || !firestore) { say('Entre na sua conta e verifique a conexão com o Firebase antes de enviar.',true); return; }
    const category=$('supportCategory').value.trim(), subject=$('supportSubject').value.trim(), description=$('supportDescription').value.trim();
    if (!category || subject.length<3 || description.length<10) { say('Preencha a categoria, um assunto e uma descrição com pelo menos 10 caracteres.',true); return; }
    const submit=$('comfortSupportSubmit'); submit.disabled=true; submit.setAttribute('aria-busy','true'); say('Enviando sua solicitação...');
    try {
      const ref=firestore.collection('users').doc(user.uid).collection('supportRequests').doc();
      const protocol='CS-'+new Date().getFullYear()+'-'+ref.id.slice(0,8).toUpperCase();
      await ref.set({protocol,uid:user.uid,email:user.email||'',category,subject,description,status:'received',createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),latestMessage:''});
      form.reset(); say(`Solicitação enviada! Seu protocolo é ${protocol}. Você receberá atualizações por e-mail quando o serviço de envio estiver configurado.`); await loadRequests();
    } catch(error) { console.error('ComfortStudy suporte: falha ao enviar pedido',error); say('Não foi possível salvar o pedido. Confira as regras do Firestore e tente novamente. Se continuar, escreva para '+CONTACT+'.',true); }
    finally { submit.disabled=false; submit.removeAttribute('aria-busy'); }
  });
  document.querySelectorAll('[data-page="suporte"]').forEach(el=>el.addEventListener('click',()=>{loadRequests();}));
  if (window.comfortAuth && typeof window.comfortAuth.onAuthStateChanged==='function') window.comfortAuth.onAuthStateChanged(()=>loadRequests());
  else window.addEventListener('load',loadRequests);
})();
