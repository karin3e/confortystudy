/* ComfortStudy Official — módulos adicionais */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const subjects = ["Matemática","Português","História","Geografia","Física","Química","Biologia","Inglês"];
  const KEYS = { grades:"comfortOfficialGrades", notes:"comfortOfficialNotes" };
  let gradesEventsBound=false, notesEventsBound=false, groupsEventsBound=false;
  const read = (key, fallback=[]) => { try { const v=JSON.parse(localStorage.getItem(key)||"null"); return v ?? fallback; } catch { return fallback; } };
  const write = (key, value) => { localStorage.setItem(key, JSON.stringify(value)); };
  const escapeHTML = (s) => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function notifyInline(message,type="info"){
    let host=$("csInlineNotice");
    if(!host){
      host=document.createElement("div");host.id="csInlineNotice";host.className="cs-inline-notice";
      host.setAttribute("role","status");host.setAttribute("aria-live","polite");
      document.body.appendChild(host);
    }
    host.textContent=String(message||"");
    host.dataset.state=type;host.hidden=false;
    clearTimeout(host._hideTimer);
    host._hideTimer=setTimeout(()=>{host.hidden=true;},5500);
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
      const content=editor.innerHTML, plain=editor.innerText.trim();
      if(!title||!plain){setInlineStatus("csNoteStatus","Preencha o título e escreva sua anotação antes de salvar.","error");if(!title)$("csNoteTitle").focus();else editor.focus();return;}
      const button=$("csSaveNote");button.disabled=true;
      const selectedFiles=Array.from($("csNoteFiles").files||[]);
      const rows=read(KEYS.notes,[]);
      const note={id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),subject:$("csNoteSubject").value,title,content,favorite:$("csNoteFavorite").checked,attachments:[],updatedAt:new Date().toISOString()};
      rows.push(note); write(KEYS.notes,rows); renderNotes();
      $("csNoteTitle").value="";editor.innerHTML="";$("csNoteFiles").value="";$("csNoteFavorite").checked=false;
      let uploadErrors=[];
      try{
        for(const f of selectedFiles){
          try{note.attachments.push(await uploadAttachment(f,"notes"));}
          catch(err){uploadErrors.push(f.name+": "+(err.message||"falha no envio"));}
        }
        if(uploadErrors.length===0 && note.attachments.length) {
          const updated=read(KEYS.notes,[]).map(n=>n.id===note.id?note:n);write(KEYS.notes,updated);
        }
        try{await saveCloud(KEYS.notes,read(KEYS.notes,[]));}
        catch(err){console.warn("Anotação salva localmente; sincronização pendente.",err);}
        renderNotes();
        const message=uploadErrors.length
          ?"Anotação salva neste dispositivo, mas alguns anexos não foram enviados: "+uploadErrors.join("; ")
          :"Anotação salva com sucesso.";
        setInlineStatus("csNoteStatus",message,uploadErrors.length?"error":"success");
      } finally {button.disabled=false;}
    });
    $("csNoteList")?.addEventListener("click",async e=>{
      const button=e.target.closest("[data-note-delete]");if(!button)return;
      const id=button.dataset.noteDelete;
      const rows=read(KEYS.notes).filter(n=>String(n.id)!==String(id));
      write(KEYS.notes,rows);renderNotes();
      setInlineStatus("csNoteStatus","Anotação apagada deste dispositivo.","success");
      try{await saveCloud(KEYS.notes,rows);}
      catch(err){setInlineStatus("csNoteStatus","Anotação apagada deste dispositivo. A sincronização ficará pendente.","error");}
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
    el.innerHTML=rows.length?rows.map(n=>`<div class="official-row official-note-row"><div><strong>${escapeHTML(n.favorite?"★ ":"")}${escapeHTML(n.title)}</strong><small>${escapeHTML(n.subject)} · ${new Date(n.updatedAt).toLocaleDateString("pt-BR")} · ${n.attachments?.length||0} anexo(s)</small></div><button type="button" class="official-danger" data-note-delete="${escapeHTML(n.id)}" aria-label="Apagar anotação ${escapeHTML(n.title)}">Apagar</button></div>`).join(""):"<div class='official-empty'><strong>Nenhuma anotação salva</strong><span>Suas anotações aparecerão aqui. Você poderá apagá-las individualmente ou todas de uma vez.</span></div>";
    const bulk=$("csDeleteAllNotes");if(bulk)bulk.disabled=!rows.length;
  }
  async function initGroups(){
    const el=$("csGroups");if(!el)return;
    const u=user();if(!u||!db()){el.textContent="Entre na sua conta para usar grupos.";return;}
    const col=db().collection("studyGroups");
    async function list(){
      try{
        const snap=await col.where("memberUids","array-contains",u.uid).get();
        el.innerHTML=snap.empty?"<article class='official-card'><p>Você ainda não participa de grupos.</p></article>":snap.docs.map(d=>{const g=d.data();return `<article class="official-card"><h3>${escapeHTML(g.name)}</h3><p>${escapeHTML(g.description||"Sem descrição")}</p><div class="official-feedback">Código: <b>${escapeHTML(g.inviteCode)}</b></div><small>${(g.memberUids||[]).length} participante(s)</small><div class="official-form"><label>Material (link)<input id="link-${d.id}" placeholder="https://..."></label><button type="button" data-share="${d.id}">Compartilhar link</button></div><div>${(g.materials||[]).map(m=>`<p><a href="${escapeHTML(m.url)}" target="_blank" rel="noopener">${escapeHTML(m.title)}</a></p>`).join("")}</div></article>`}).join("");
      }catch(e){el.innerHTML="<article class='official-card'><p>Não foi possível carregar grupos. Verifique as regras de acesso do Firestore.</p></article>";}
    }
    if(!groupsEventsBound){groupsEventsBound=true;
    $("csJoinGroupForm")?.addEventListener("submit",async e=>{
      e.preventDefault();const code=$("csJoinGroupCode").value.trim().toUpperCase();
      try{if(!firebase.functions)throw new Error("Firebase Functions não está disponível.");await firebase.functions().httpsCallable("joinStudyGroup")({inviteCode:code});e.target.reset();await list();notifyInline("Você entrou no grupo!");}
      catch(err){notifyInline(err.message||"Não foi possível entrar no grupo. Verifique o código.");}
    });
    $("csGroupForm")?.addEventListener("submit",async e=>{
      e.preventDefault();const name=$("csGroupName").value.trim();if(!name)return;
      const code=Array.from(crypto.getRandomValues(new Uint8Array(5))).map(n=>(n%36).toString(36)).join("").toUpperCase();
      try{await col.add({name,description:$("csGroupDescription").value.trim(),ownerUid:u.uid,memberUids:[u.uid],inviteCode:code,materials:[],createdAt:firebase.firestore.FieldValue.serverTimestamp()});e.target.reset();await list();}
      catch(err){notifyInline("Grupo não criado. As regras do Firestore precisam permitir criação segura de grupos.");}
    });
    el.addEventListener("click",async e=>{
      const id=e.target.dataset.share;if(!id)return;const url=$("link-"+id)?.value.trim();if(!url||!/^https?:\/\//i.test(url)){notifyInline("Informe um link http ou https válido.");return;}
      try{await col.doc(id).update({materials:firebase.firestore.FieldValue.arrayUnion({title:url,url,addedBy:u.uid,createdAt:new Date().toISOString()})});await list();}catch{notifyInline("Não foi possível compartilhar. Verifique sua participação e as regras.");}
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
