/* ComfortStudy Official — módulos adicionais */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const subjects = ["Matemática","Português","História","Geografia","Física","Química","Biologia","Inglês"];
  const KEYS = { grades:"comfortOfficialGrades", notes:"comfortOfficialNotes" };
  let gradesEventsBound=false, notesEventsBound=false, groupsEventsBound=false, editingNoteId=null;
  const read = (key, fallback=[]) => { try { const v=JSON.parse(localStorage.getItem(key)||"null"); return v ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { localStorage.setItem(key, JSON.stringify(value)); };
  const escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function sanitizeNoteHTML(html){
    const doc=new DOMParser().parseFromString(String(html||""),"text/html");
    const allowed=new Set(["P","BR","DIV","SPAN","STRONG","B","EM","I","U","UL","OL","LI","H1","H2","H3","BLOCKQUOTE","TABLE","TBODY","THEAD","TR","TD","TH","A"]);
    doc.body.querySelectorAll("*").forEach(node=>{
      if(!allowed.has(node.tagName)){node.replaceWith(...node.childNodes);return;}
      [...node.attributes].forEach(attr=>{
        if(node.tagName==="A"&&attr.name==="href"&&/^(https?:|mailto:)/i.test(attr.value))return;
        node.removeAttribute(attr.name);
      });
      if(node.tagName==="A")node.setAttribute("rel","noopener noreferrer");
    });
    return doc.body.innerHTML;
  }
  function notifyInline(message,type="info"){
    if(typeof window.comfortNotify==="function"){
      window.comfortNotify(String(message||""),type==="error"?"error":type==="success"?"success":"info");
      return;
    }
    const status=$("csNoteStatus");
    if(status){status.textContent=String(message||"");status.hidden=!message;status.dataset.state=type;}
  }
  function setInlineStatus(id,message,type="info"){
    const el=$(id);if(!el)return;
    el.textContent=message;el.dataset.state=type;el.hidden=!message;
  }
  const user = () => window.comfortAuth?.currentUser || null;
  const db = () => window.comfortDb || null;
  const userDoc = (key) => db().collection("users").doc(user().uid).collection("data").doc(key);
  async function saveCloud(key,value) {
    if (!user() || !db()) return;
    await userDoc(key).set({value,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
  }
  async function loadCloud(key, localValue) {
    if (!user() || !db()) return localValue;
    try { const snap=await userDoc(key).get(); if(snap.exists && snap.data().value!==undefined){ write(key,snap.data().value); return snap.data().value; } } catch(e){ console.warn("Sync oficial indisponível:",e); }
    return localValue;
  }
  function fillSubjects(id) {
    const el=$(id); if(!el)return;
    el.innerHTML=subjects.map(s=>`<option value="${s}">${s}</option>`).join("");
  }
  function weightedAverage(rows) {
    const weight=rows.reduce((a,x)=>a+Number(x.weight||1),0);
    return weight ? rows.reduce((a,x)=>a+Number(x.grade)*Number(x.weight||1),0)/weight : null;
  }
  function renderGrades() {
    const grades=read(KEYS.grades);
    const list=$("csGradeRows"); if(!list)return;
    list.innerHTML=grades.length?grades.slice().reverse().map(g=>`<div class="official-row"><div><strong>${escapeHTML(g.subject)} · ${escapeHTML(g.title)}</strong><small>${escapeHTML(g.term)} · Peso ${g.weight}</small></div><b>${Number(g.grade).toFixed(1).replace(".",",")}</b><button type="button" data-grade-delete="${g.id}" aria-label="Excluir nota">Excluir</button></div>`).join(""):"<p class='official-muted'>Nenhuma avaliação cadastrada.</p>";
    const averages=subjects.map(s=>weightedAverage(grades.filter(g=>g.subject===s))).filter(v=>v!==null);
    $("csOverallAverage").textContent="Média geral: "+(averages.length?(averages.reduce((a,b)=>a+b,0)/averages.length).toFixed(2).replace(".",","):"—");
    calcGrade();
  }
  function calcGrade() {
    const subject=$("csCalcSubject")?.value, target=Number($("csTarget")?.value||7), remaining=Math.max(1,Number($("csRemaining")?.value||1));
    const rows=read(KEYS.grades).filter(g=>g.subject===subject);
    const avg=weightedAverage(rows); const out=$("csGradeCalc"); if(!out)return;
    if(avg===null){out.textContent="Cadastre ao menos uma nota desta matéria para calcular.";return;}
    // Supõe avaliações futuras de peso 1. A média é ponderada das notas já lançadas.
    const currentWeight=rows.reduce((a,g)=>a+Number(g.weight||1),0);
    const required=(target*(currentWeight+remaining)-avg*currentWeight)/remaining;
    out.textContent=required<=0?"Você já atingiu a média desejada.":required>10?`Com ${remaining} avaliação(ões) restante(s), seria necessário ${required.toFixed(2).replace(".",",")} em cada uma; a meta não é alcançável apenas com notas até 10.`:`Você precisa de aproximadamente ${required.toFixed(2).replace(".",",")} em cada avaliação restante (peso 1) para alcançar média ${target.toFixed(1).replace(".",",")}.`;
  }
  async function initGrades() {
    fillSubjects("csGradeSubject");fillSubjects("csCalcSubject");
    const v=await loadCloud(KEYS.grades,read(KEYS.grades));write(KEYS.grades,v);renderGrades();
    if(!gradesEventsBound){gradesEventsBound=true;
    $("csGradeForm")?.addEventListener("submit",async e=>{
      e.preventDefault(); const grade=Number($("csGradeValue").value),weight=Number($("csGradeWeight").value);
      if(!Number.isFinite(grade)||grade<0||grade>10||!Number.isFinite(weight)||weight<=0)return;
      const rows=read(KEYS.grades);rows.push({id:crypto.randomUUID(),subject:$("csGradeSubject").value,term:$("csGradeTerm").value,title:$("csGradeTitle").value.trim(),grade,weight,createdAt:new Date().toISOString()});
      write(KEYS.grades,rows);renderGrades();e.target.reset();$("csGradeWeight").value=1;
      try{await saveCloud(KEYS.grades,rows);}catch(err){notifyInline("Nota salva neste dispositivo; a sincronização será retomada quando possível.");}
    });
    ["csCalcSubject","csTarget","csRemaining"].forEach(id=>$(id)?.addEventListener("change",calcGrade));
    $("csGradeRows")?.addEventListener("click",async e=>{const id=e.target.dataset.gradeDelete;if(!id)return;const rows=read(KEYS.grades).filter(g=>g.id!==id);write(KEYS.grades,rows);renderGrades();try{await saveCloud(KEYS.grades,rows);}catch{}});
    }
  }
  async function uploadAttachment(file,folder) {
    const u=user(); if(!u)throw new Error("Entre na sua conta para anexar arquivos.");
    if(file.size>10*1024*1024)throw new Error("Cada arquivo deve ter até 10 MB.");
    if(!/^(application\/pdf|image\/(png|jpeg|webp|gif))$/i.test(file.type))throw new Error("Formato não permitido. Use PDF ou imagem.");
    const token=await u.getIdToken();
    const cfg=window.COMFORT_SUPABASE_CONFIG||{};
    const endpoint=cfg.functionUrl||"https://qcferdvpdtiernawkojm.supabase.co/functions/v1/comfort-attachments";
    const key=cfg.publishableKey||"sb_publishable_5jd7_1RyY65fLm9TWsRLqw_X3ggp2i_";
    const path=`users/${u.uid}/attachments/${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const form=new FormData();form.append("action","upload");form.append("path",path);form.append("file",file,file.name);
    const res=await fetch(endpoint,{method:"POST",headers:{Authorization:`Bearer ${token}`,apikey:key},body:form});
    if(!res.ok)throw new Error("Não foi possível enviar o anexo ("+res.status+").");
    const data=await res.json();
    return {name:file.name,path:data.path||path,url:data.signedUrl||data.signed_url||null,type:file.type,size:file.size};
  }
  async function initNotes() {
    fillSubjects("csNoteSubject");
    const localNotes=read(KEYS.notes,[]);
    let notes=localNotes;
    try { notes=await loadCloud(KEYS.notes,localNotes); if(!Array.isArray(notes))notes=localNotes; write(KEYS.notes,notes); }
    catch(err){ console.warn("Caderno: sincronização indisponível; usando dados locais.",err); }
    renderNotes();
    if(!notesEventsBound){notesEventsBound=true;
    document.querySelectorAll("[data-cs-cmd]").forEach(b=>b.addEventListener("click",()=>{ $("csNoteEditor").focus();document.execCommand(b.dataset.csCmd,false,b.dataset.csValue||null); }));
    $("csInsertTable")?.addEventListener("click",()=>{ $("csNoteEditor").focus();document.execCommand("insertHTML",false,"<table><tbody><tr><td> </td><td> </td></tr><tr><td> </td><td> </td></tr></tbody></table><p></p>");});
    $("csSaveNote")?.addEventListener("click",async()=>{
      const title=$("csNoteTitle").value.trim(), editor=$("csNoteEditor");
      const content=sanitizeNoteHTML(editor.innerHTML), plain=editor.innerText.trim();
      if(!title||!plain){setInlineStatus("csNoteStatus","Preencha o título e escreva sua anotação antes de salvar.","error");if(!title)$("csNoteTitle").focus();else editor.focus();return;}
      const button=$("csSaveNote");button.disabled=true;
      const selectedFiles=Array.from($("csNoteFiles").files||[]);
      const rows=read(KEYS.notes,[]);
      const previous=editingNoteId?rows.find(n=>String(n.id)===String(editingNoteId)):null;
      const note={...(previous||{}),id:previous?.id||(crypto.randomUUID?crypto.randomUUID():String(Date.now())),subject:$("csNoteSubject").value,title,content,favorite:$("csNoteFavorite").checked,attachments:Array.isArray(previous?.attachments)?previous.attachments.slice():[],updatedAt:new Date().toISOString()};
      if(previous){const index=rows.findIndex(n=>String(n.id)===String(previous.id));rows[index]=note;}else rows.push(note);
      write(KEYS.notes,rows); renderNotes();
      let uploadErrors=[];
      try{
        for(const f of selectedFiles){
          try{note.attachments.push(await uploadAttachment(f,"notes"));}
          catch(err){uploadErrors.push(f.name+": "+(err.message||"falha no envio"));}
        }
        const updated=read(KEYS.notes,[]).map(n=>String(n.id)===String(note.id)?note:n);write(KEYS.notes,updated);
        try{await saveCloud(KEYS.notes,updated);}
        catch(err){console.warn("Anotação salva localmente; sincronização pendente.",err);}
        editingNoteId=null;
        $("csNoteTitle").value="";editor.innerHTML="";$("csNoteFiles").value="";$("csNoteFavorite").checked=false;
        button.textContent="Salvar anotação";
        renderNotes();
        const message=uploadErrors.length
          ?"Anotação salva, mas alguns anexos não foram enviados: "+uploadErrors.join("; ")
          :previous?"Anotação atualizada com sucesso.":"Anotação salva com sucesso.";
        setInlineStatus("csNoteStatus",message,uploadErrors.length?"error":"success");
      } finally {button.disabled=false;}
    });
    $("csNoteList")?.addEventListener("click",async e=>{
      const button=e.target.closest("[data-note-delete],[data-note-edit],[data-note-favorite],[data-note-duplicate]");
      if(!button)return;
      const id=button.dataset.noteDelete||button.dataset.noteEdit||button.dataset.noteFavorite||button.dataset.noteDuplicate;
      const rows=read(KEYS.notes,[]);
      const target=rows.find(n=>String(n.id)===String(id));
      if(!target)return;
      if(button.hasAttribute("data-note-edit")){
        editingNoteId=target.id;
        $("csNoteSubject").value=target.subject||subjects[0];
        $("csNoteTitle").value=target.title||"";
        $("csNoteEditor").innerHTML=sanitizeNoteHTML(target.content||"");
        $("csNoteFavorite").checked=Boolean(target.favorite);
        $("csSaveNote").textContent="Atualizar anotação";
        $("csNoteTitle").focus();
        setInlineStatus("csNoteStatus","Editando anotação. Salve para registrar as alterações.","info");
        return;
      }
      let next;
      if(button.hasAttribute("data-note-delete")){
        next=rows.filter(n=>String(n.id)!==String(id));
        setInlineStatus("csNoteStatus","Anotação apagada.","success");
      }else if(button.hasAttribute("data-note-favorite")){
        next=rows.map(n=>String(n.id)===String(id)?{...n,favorite:!n.favorite,updatedAt:new Date().toISOString()}:n);
      }else{
        const copy={...target,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),title:(target.title||"Anotação")+" (cópia)",attachments:Array.isArray(target.attachments)?target.attachments.slice():[],updatedAt:new Date().toISOString()};
        next=[...rows,copy];
      }
      write(KEYS.notes,next);renderNotes();
      try{await saveCloud(KEYS.notes,next);}
      catch(err){setInlineStatus("Alteração salva neste aparelho. A sincronização será retomada quando possível.","warning");}
    });
    $("csDeleteAllNotes")?.addEventListener("click",async()=>{
      const button=$("csDeleteAllNotes");
      if(button.dataset.confirm!=="yes"){
        button.dataset.confirm="yes";button.textContent="Confirmar apagar todas";
        setInlineStatus("csNoteStatus","Clique novamente para apagar todas as anotações. Esta ação não pode ser desfeita.","warning");
        return;
      }
      const rows=[];write(KEYS.notes,rows);renderNotes();
      button.dataset.confirm="no";button.textContent="Apagar todas";
      setInlineStatus("csNoteStatus","Todas as anotações foram apagadas deste dispositivo.","success");
      try{await saveCloud(KEYS.notes,rows);}
      catch(err){setInlineStatus("csNoteStatus","Anotações apagadas localmente; sincronização pendente.","error");}
    });
    }
  }
  function renderNotes(){
    const el=$("csNoteList");if(!el)return;const rows=read(KEYS.notes).slice().reverse();
    el.innerHTML=rows.length?rows.map(n=>`<article class="official-row official-note-row"><div class="official-note-main"><strong>${escapeHTML(n.favorite?"★ ":"")}${escapeHTML(n.title)}</strong><small>${escapeHTML(n.subject)} · ${new Date(n.updatedAt).toLocaleDateString("pt-BR")} · ${n.attachments?.length||0} anexo(s)</small><p>${escapeHTML(String(n.content||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,180))}</p></div><div class="official-note-actions-list"><button type="button" data-note-edit="${escapeHTML(n.id)}">Editar</button><button type="button" data-note-favorite="${escapeHTML(n.id)}">${n.favorite?"Desfavoritar":"Favoritar"}</button><button type="button" data-note-duplicate="${escapeHTML(n.id)}">Duplicar</button><button type="button" class="official-danger" data-note-delete="${escapeHTML(n.id)}">Apagar</button></div></article>`).join(""):"<div class='official-empty'><strong>Nenhuma anotação salva</strong><span>Suas anotações aparecerão aqui. Você poderá editar, favoritar, duplicar ou apagar cada uma.</span></div>";
    const bulk=$("csDeleteAllNotes");if(bulk)bulk.disabled=!rows.length;
  }
  async function initGroups(){
    const el=$("csGroups");
    if(!el)return;

    async function list(){
      const u=user(), firestore=db();
      if(!u || !firestore){
        el.innerHTML="<article class='official-card'><p>Entre na sua conta para visualizar seus grupos.</p></article>";
        return;
      }
      try{
        const snap=await firestore.collection("studyGroups")
          .where("memberUids","array-contains",u.uid).get();
        el.innerHTML=snap.empty
          ? "<article class='official-card'><p>Você ainda não participa de grupos.</p></article>"
          : snap.docs.map(d=>{
              const g=d.data()||{};
              return `<article class="official-card">
                <h3>${escapeHTML(g.name||"Grupo de estudos")}</h3>
                <p>${escapeHTML(g.description||"Sem descrição")}</p>
                <div class="official-feedback">Código de convite: <b>${escapeHTML(g.inviteCode||d.id)}</b></div>
                <small>${(g.memberUids||[]).length} participante(s)</small>
                <div class="official-form">
                  <label>Material (link)<input id="link-${escapeHTML(d.id)}" placeholder="https://..."></label>
                  <button type="button" data-share="${escapeHTML(d.id)}">Compartilhar link</button>
                </div>
                <div>${(g.materials||[]).map(m=>`<p><a href="${escapeHTML(m.url)}" target="_blank" rel="noopener">${escapeHTML(m.title||m.url)}</a></p>`).join("")}</div>
              </article>`;
            }).join("");
      }catch(err){
        console.error("ComfortStudy grupos: erro ao listar",err);
        el.innerHTML="<article class='official-card'><p>Não foi possível carregar os grupos. Confira sua conexão e tente novamente.</p></article>";
      }
    }

    // Os eventos são registrados mesmo que o Firebase Auth ainda esteja restaurando a sessão.
    // Antes, initGroups retornava sem registrar o submit quando currentUser ainda era null.
    // O navegador então submetia o formulário normalmente e recarregava index_2.html no Dashboard.
    if(!groupsEventsBound){
      groupsEventsBound=true;

      $("csGroupForm")?.addEventListener("submit",async e=>{
        e.preventDefault();
        e.stopPropagation();
        const form=e.currentTarget;
        const u=user(), firestore=db();
        if(!u || !firestore){
          notifyInline("Sua sessão ainda está carregando. Aguarde um instante e tente novamente.");
          return;
        }
        const name=$("csGroupName")?.value.trim()||"";
        const description=$("csGroupDescription")?.value.trim()||"";
        if(name.length<2){
          notifyInline("Informe um nome com pelo menos 2 caracteres.");
          $("csGroupName")?.focus();
          return;
        }
        const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const bytes=new Uint8Array(10);
        if(!window.crypto?.getRandomValues){
          notifyInline("Este navegador não oferece geração segura de código. Atualize o navegador.");
          return;
        }
        window.crypto.getRandomValues(bytes);
        const code=Array.from(bytes,n=>alphabet[n%alphabet.length]).join("");
        const button=form.querySelector('button[type="submit"]');
        if(button){button.disabled=true;button.dataset.originalText=button.textContent;button.textContent="Criando...";}
        try{
          await firestore.collection("studyGroups").doc(code).set({
            name,description,ownerUid:u.uid,memberUids:[u.uid],
            inviteCode:code,materials:[],
            createdAt:firebase.firestore.FieldValue.serverTimestamp()
          });
          form.reset();
          await list();
          notifyInline("Grupo criado! Código de convite: "+code);
        }catch(err){
          console.error("ComfortStudy criar grupo:",err);
          const detail=err?.code==="permission-denied"
            ?"O Firestore recusou a criação. Confira se as regras novas foram publicadas no projeto correto."
            :err?.message||"Não foi possível criar o grupo.";
          notifyInline(detail);
        }finally{
          if(button){button.disabled=false;button.textContent=button.dataset.originalText||"Criar grupo";}
        }
      });

      $("csJoinGroupForm")?.addEventListener("submit",async e=>{
        e.preventDefault();
        e.stopPropagation();
        const form=e.currentTarget;
        const u=user(), firestore=db();
        if(!u || !firestore){notifyInline("Entre na sua conta para entrar em um grupo.");return;}
        const code=$("csJoinGroupCode")?.value.trim().toUpperCase()||"";
        if(!/^[A-Z0-9]{10}$/.test(code)){notifyInline("O código deve ter exatamente 10 letras ou números.");return;}
        const button=form.querySelector('button[type="submit"]');
        if(button){button.disabled=true;button.textContent="Entrando...";}
        try{
          const ref=firestore.collection("studyGroups").doc(code);
          const snap=await ref.get();
          if(!snap.exists)throw new Error("Grupo não encontrado. Confira o código.");
          const members=snap.data().memberUids||[];
          if(members.includes(u.uid)){notifyInline("Você já participa deste grupo.");return;}
          if(members.length>=100)throw new Error("Este grupo atingiu o limite de 100 participantes.");
          await ref.update({memberUids:firebase.firestore.FieldValue.arrayUnion(u.uid)});
          form.reset();await list();notifyInline("Você entrou no grupo!");
        }catch(err){
          console.error("ComfortStudy entrar no grupo:",err);
          notifyInline(err?.code==="permission-denied"?"O Firestore bloqueou a entrada. Confira as regras publicadas.":err.message||"Não foi possível entrar no grupo.");
        }finally{if(button){button.disabled=false;button.textContent="Entrar no grupo";}}
      });

      el.addEventListener("click",async e=>{
        const button=e.target.closest("[data-share]");
        if(!button)return;
        const u=user(),firestore=db();
        if(!u||!firestore){notifyInline("Entre na sua conta para compartilhar materiais.");return;}
        const id=button.dataset.share;
        const url=$("link-"+id)?.value.trim()||"";
        if(!/^https?:\/\//i.test(url)){notifyInline("Informe um link http ou https válido.");return;}
        button.disabled=true;
        try{
          await firestore.collection("studyGroups").doc(id).update({
            materials:firebase.firestore.FieldValue.arrayUnion({
              title:url,url,addedBy:u.uid,createdAt:new Date().toISOString()
            })
          });
          await list();notifyInline("Material compartilhado!");
        }catch(err){
          console.error("ComfortStudy compartilhar material:",err);
          notifyInline("Não foi possível compartilhar. Verifique sua participação no grupo.");
        }finally{button.disabled=false;}
      });
    }

    await list();
  }
  function initTheme(){
    const profile=(()=>{try{return JSON.parse(localStorage.getItem("comfortProfile")||"{}")}catch{return {}}})();
    const picker=$("appearanceMode");
    const saved=localStorage.getItem("comfortTheme")||profile.theme||picker?.value||"auto";
    function apply(mode){
      const normalized=["auto","light","dark"].includes(mode)?mode:"auto";
      const dark=normalized==="dark"||(normalized==="auto"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.dataset.mode=dark?"dark":"light";
      document.documentElement.dataset.modePreference=normalized;
      localStorage.setItem("comfortTheme",normalized);
      if(picker) picker.value=normalized;
    }
    apply(saved);
    picker?.addEventListener("change",e=>apply(e.target.value));
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",()=>{if((localStorage.getItem("comfortTheme")||"auto")==="auto")apply("auto");});
  }
  function initProfileExtras(){
    const form=$("profileSettingsForm");
    if(!form || form.querySelector('[name="classroom"]')) return;
    const grid=form.querySelector(".profile-fields-grid");
    if(!grid) return;
    const field=document.createElement("div");
    field.className="profile-field";
    field.innerHTML='<label for="profileClassroom">Série / turma</label><input id="profileClassroom" name="classroom" type="text" maxlength="60" placeholder="Ex.: 3ª série A">';
    grid.appendChild(field);
    const profile=(()=>{try{return JSON.parse(localStorage.getItem("comfortProfile")||"{}")}catch{return {}}})();
    field.querySelector("input").value=profile.classroom||"";
    form.addEventListener("submit",()=>{
      const data=JSON.parse(localStorage.getItem("comfortProfile")||"{}");
      data.classroom=field.querySelector("input").value.trim();
      localStorage.setItem("comfortProfile",JSON.stringify(data));
    },{capture:true});
  }

  function initInstitution(){
    const u=user();const role=u?.getIdTokenResult?null:null;
    if(!u)return;
    u.getIdTokenResult().then(result=>{
      const claims=result.claims||{};const allowed=claims.institutionAdmin===true||claims.role==="school_admin"||claims.role==="institution_admin";
      const link=$("institutionNav");if(link)link.hidden=!allowed;
      if(!allowed)return;
      const area=$("csInstitutionArea");if(area)area.innerHTML="<strong>Acesso autorizado.</strong><p>Permissões institucionais reconhecidas. Cadastre escolas, turmas e alunos somente após configurar as coleções administrativas e suas regras no Firestore.</p>";
    }).catch(()=>{});
  }

  function initPlanning(){
    $("csGeneratePlan")?.addEventListener("click",()=>{
      const exams=read("comfortExams",[]),tasks=read("comfortTasks",[]);
      const now=new Date();const items=[];
      exams.forEach(x=>{const d=new Date(x.date||x.dueDate);if(!isNaN(d)&&d>=new Date(now.toDateString()))items.push({kind:"Prova",title:x.title||x.name||x.subject||"Prova",subject:x.subject||"Revisão geral",date:d});});
      tasks.forEach(x=>{if(x.completed||x.done)return;const d=new Date(x.date||x.dueDate||x.deadline);if(!isNaN(d))items.push({kind:"Tarefa",title:x.title||x.name||"Tarefa",subject:x.subject||"Organização",date:d});});
      items.sort((a,b)=>a.date-b.date);
      const el=$("csSmartPlanResult");if(!el)return;
      if(!items.length){el.innerHTML="<p class='official-muted'>Cadastre provas com data e tarefas pendentes para montar seu plano.</p>";return;}
      el.innerHTML=items.slice(0,12).map((x,i)=>`<div class="official-row"><div><strong>${i+1}. ${escapeHTML(x.kind)}: ${escapeHTML(x.title)}</strong><small>${escapeHTML(x.subject)} · ${x.date.toLocaleDateString("pt-BR")}</small></div><span>${Math.max(0,Math.ceil((x.date-now)/86400000))} dia(s)</span></div>`).join("");
    });
  }
  function initBackup(){
    $("csExportBackup")?.addEventListener("click",()=>{
      const data={product:"ComfortStudy",formatVersion:1,exportedAt:new Date().toISOString(),data:{}};
      const keys=["comfortProfile","comfortTasks","comfortExams","comfortNotices","comfortStudySeconds","comfortSubjectContents","comfortGrades","comfortStudyPlans","comfortFlashcards","comfortStudyDiary","comfortOfficialGrades","comfortOfficialNotes","comfortAppearance","comfortClassSchedule"];
      keys.forEach(k=>{const raw=localStorage.getItem(k);if(raw!==null){try{data.data[k]=JSON.parse(raw)}catch{data.data[k]=raw}}});
      const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
      const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`comfortstudy-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);
    });
    $("csImportBackup")?.addEventListener("change",async e=>{
      const file=e.target.files?.[0];if(!file)return;
      if(file.size>15*1024*1024){notifyInline("Arquivo de backup muito grande.");return;}
      try{
        const parsed=JSON.parse(await file.text());if(parsed.product!=="ComfortStudy"||!parsed.data||typeof parsed.data!=="object")throw new Error("Arquivo não reconhecido.");
        if(!confirm("Restaurar esta cópia substituirá os dados locais correspondentes. Deseja continuar?"))return;
        Object.entries(parsed.data).forEach(([k,v])=>{if(/^comfort[A-Za-z0-9]+$/.test(k))localStorage.setItem(k,JSON.stringify(v));});
        notifyInline("Cópia restaurada neste dispositivo. Recarregue a página para atualizar todas as telas.");
        location.reload();
      }catch(err){notifyInline(err.message||"Não foi possível restaurar o backup.");}finally{e.target.value="";}
    });
  }
  function init(){
    fillSubjects("csGradeSubject");fillSubjects("csCalcSubject");fillSubjects("csNoteSubject");
    initGrades();initNotes();initGroups();initTheme();initProfileExtras();initInstitution();initPlanning();initBackup();
    document.addEventListener("comfort-cloud-ready",()=>{initGrades();initNotes();initGroups();});
    document.querySelectorAll('[data-page="boletim"]').forEach(a=>a.addEventListener("click",()=>renderGrades()));
    document.querySelectorAll('[data-page="caderno-avancado"]').forEach(a=>a.addEventListener("click",renderNotes));
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
