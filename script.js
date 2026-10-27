/* =========================================================
   COMFORTSTUDY - AUTENTICAÇÃO LOCAL
   ========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    // Aguarda o Firebase restaurar a sessão antes de decidir redirecionar.
    if (!window.comfortFirebaseConfigured || !window.comfortAuth) {
        console.error("ComfortStudy: Firebase Auth não foi inicializado.");
        location.replace("index.html");
        return;
    }

    // Espera a restauração da sessão persistida antes de decidir se deve voltar ao login.
    let user = null;
    try {
        if (typeof window.comfortAuth.authStateReady === "function") {
            await window.comfortAuth.authStateReady();
            user = window.comfortAuth.currentUser;
        } else {
            user = await new Promise((resolve) => {
                let unsubscribe = () => {};
                unsubscribe = window.comfortAuth.onAuthStateChanged((currentUser) => {
                    unsubscribe();
                    resolve(currentUser);
                }, () => resolve(null));
            });
        }
    } catch (error) {
        console.error("ComfortStudy: erro ao restaurar a sessão Firebase.", error);
        user = window.comfortAuth.currentUser || null;
    }

    if (!user) {
        location.replace("index.html");
        return;
    }

    if (window.comfortCloudReady) {
        await window.comfortCloudReady;
    }

    const STORAGE = {
        tasks: "comfortTasks",
        exams: "comfortExams",
        notices: "comfortNotices",
        studySeconds: "comfortStudySeconds",
        subjectContents: "comfortSubjectContents",
        subjects: "comfortSubjects",
        profile: "comfortProfile"
    };

    const FIXED_SUBJECTS = [
        { name: "Matemática", icon: "📐", className: "math" },
        { name: "Português", icon: "📚", className: "portuguese" },
        { name: "História", icon: "🏛️", className: "history" },
        { name: "Geografia", icon: "🌎", className: "geography" },
        { name: "Física", icon: "⚡", className: "physics" },
        { name: "Química", icon: "🧪", className: "chemistry" },
        { name: "Biologia", icon: "🧬", className: "biology" },
        { name: "Inglês", icon: "🇺🇸", className: "english" }
    ];

    function getCustomSubjects() {
        const items = getStorage(STORAGE.subjects, []);
        return Array.isArray(items) ? items.filter(item => item && item.name) : [];
    }

    function getAllSubjects() {
        const all = [...FIXED_SUBJECTS, ...getCustomSubjects()];
        const seen = new Set();
        return all.filter(item => {
            const key = String(item.name).trim().toLocaleLowerCase('pt-BR');
            if (!key || seen.has(key)) return false;
            seen.add(key); return true;
        });
    }

    function addCustomSubject(name) {
        const clean = String(name || '').trim();
        if (!clean) return false;
        if (getAllSubjects().some(s => s.name.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'))) {
            alert('Essa matéria já existe.'); return false;
        }
        const items = getCustomSubjects();
        items.push({ name: clean, icon: '📘', className: 'custom' });
        setStorage(STORAGE.subjects, items);
        return true;
    }

    const pageNames = {
        dashboard: "Visão Geral",
        materias: "Minhas Matérias",
        calendario: "Meu Calendário",
        tarefas: "Minhas Tarefas",
        provas: "Próximas Provas",
        cronometro: "Cronômetro de Estudos",
        avisos: "Avisos",
        desempenho: "Meu Desempenho",
        premium: "Premium",
        perfil: "Meu Perfil",
        planejamento: "Meu Plano de Estudos"
    };


   
    function getStorage(key, fallback = []) {
        try {
            const data = JSON.parse(localStorage.getItem(key));
            return data ?? fallback;
        } catch {
            return fallback;
        }
    }

    function setStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }


    function getTasks() {
        const tasks = getStorage(STORAGE.tasks, []);
        return Array.isArray(tasks) ? tasks : [];
    }

    function saveTasks(tasks) {
        setStorage(STORAGE.tasks, tasks);
    }


    function getExams() {
        const exams = getStorage(STORAGE.exams, []);
        return Array.isArray(exams) ? exams : [];
    }

    function saveExams(exams) {
        setStorage(STORAGE.exams, exams);
    }


    function getNotices() {
        const notices = getStorage(STORAGE.notices, []);
        return Array.isArray(notices) ? notices : [];
    }

    function saveNotices(notices) {
        setStorage(STORAGE.notices, notices);
    }


    function getStudySeconds() {
        return Number(localStorage.getItem(STORAGE.studySeconds)) || 0;
    }

    function saveStudySeconds(seconds) {
        localStorage.setItem(
            STORAGE.studySeconds,
            String(Math.max(0, Number(seconds) || 0))
        );
    }


    function getSubjectContents() {
        const contents = getStorage(
            STORAGE.subjectContents,
            {}
        );

        return contents &&
            typeof contents === "object" &&
            !Array.isArray(contents)
            ? contents
            : {};
    }

    function saveSubjectContents(contents) {
        setStorage(STORAGE.subjectContents, contents);
    }


    function getContentsForSubject(subjectName) {

        const allContents = getSubjectContents();

        if (!Array.isArray(allContents[subjectName])) {
            return [];
        }

        return allContents[subjectName];
    }


    function addSubjectContent(subjectName, content) {
        const allContents = getSubjectContents();
        if (!Array.isArray(allContents[subjectName])) allContents[subjectName] = [];
        const record = typeof content === 'string'
            ? { id: Date.now(), topic: "", title: content.slice(0, 90), text: content, important: false, files: [], createdAt: new Date().toISOString() }
            : { id: Date.now(), topic: String(content.topic || "").trim(), title: String(content.title || 'Anotação').trim(), text: String(content.text || '').trim(), important: Boolean(content.important), files: Array.isArray(content.files) ? content.files : [], createdAt: new Date().toISOString() };
        allContents[subjectName].push(record);
        saveSubjectContents(allContents);
    }

    function updateSubjectContent(subjectName, contentId, changes) {
        const allContents = getSubjectContents();
        const list = allContents[subjectName];
        if (!Array.isArray(list)) return;
        const item = list.find(c => Number(c.id) === Number(contentId));
        if (!item) return;
        Object.assign(item, changes, { updatedAt: new Date().toISOString() });
        saveSubjectContents(allContents);
        showSubjectModal(subjectName);
    }

    window.updateSubjectContent = updateSubjectContent;
    window.addCustomSubject = addCustomSubject;

    function deleteSubjectContent(subjectName, contentId) {

        const allContents = getSubjectContents();

        if (!Array.isArray(allContents[subjectName])) {
            return;
        }

        allContents[subjectName] =
            allContents[subjectName].filter(
                content =>
                    Number(content.id) !== Number(contentId)
            );

        saveSubjectContents(allContents);

        showSubjectModal(subjectName);
    }


    window.deleteSubjectContent = deleteSubjectContent;


    const DEFAULT_PROFILE = {
        name: "Estudante",
        email: "",
        school: "",
        course: "",
        bio: ""
    };


    function getProfile() {

        const profile =
            getStorage(
                STORAGE.profile,
                DEFAULT_PROFILE
            );

        return {
            ...DEFAULT_PROFILE,
            ...(profile || {})
        };
    }


    function saveProfile(profile) {
        setStorage(STORAGE.profile, profile);
    }

    function renderProfileAvatar(photoData, name) {
        const avatar = document.querySelector(".big-avatar");
        if (!avatar) return;
        const safeImage = typeof photoData === "string" && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(photoData);
        if (safeImage) {
            const image = document.createElement("img");
            image.src = photoData;
            image.alt = "Foto de perfil de " + (name || "estudante");
            avatar.replaceChildren(image);
            avatar.classList.add("profile-photo-avatar");
            avatar.classList.remove("emoji-avatar");
        } else {
            const appearance = getStorage("comfortAppearance", {});
            avatar.textContent = appearance.avatar || "👤";
            avatar.classList.add("emoji-avatar");
            avatar.classList.remove("profile-photo-avatar");
        }
    }


    function renderProfile() {

        const profile = getProfile();

       

        const fields = {
            profileNameDisplay: profile.name,
            profileEmailDisplay: profile.email || "Plano Gratuito",
            userName: profile.name,
            userEmail: profile.email,
        };

        Object.entries(fields).forEach(
            ([id, value]) => {

                const element =
                    document.getElementById(id);

                if (!element) return;

                if (
                    element.tagName === "INPUT" ||
                    element.tagName === "TEXTAREA"
                ) {
                    element.value = value || "";
                } else {
                    element.textContent =
                        value || "Não informado";
                }
            }
        );


        

        const form = document.getElementById("profileSettingsForm");
        if (form) {
            if (form.dataset.dirty !== "true") {
                ["name", "email", "school", "course", "bio"].forEach(key => {
                    const field = form.elements.namedItem(key);
                    if (field) field.value = profile[key] || "";
                });
                form.dataset.photoData = profile.photoData || "";
                const photoInput = document.getElementById("profilePhotoFile");
                if (photoInput) photoInput.value = "";
            }
        }
        const draftName = form?.dataset.dirty === "true" ? form.elements.namedItem("name")?.value.trim() : profile.name;
        const draftPhoto = form?.dataset.dirty === "true" ? form.dataset.photoData : profile.photoData;
        renderProfileAvatar(draftPhoto, draftName);
    }

    function initializeProfileSettings() {
        const form = document.getElementById("profileSettingsForm");
        if (!form || form.dataset.ready === "true") return;
        form.dataset.ready = "true";
        const status = document.getElementById("profileSaveStatus");
        form.addEventListener("submit", event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            const profile = Object.fromEntries(["name", "email", "school", "course", "bio"].map(key => [key, form.elements.namedItem(key).value.trim()]));
            if (!profile.name) { form.elements.namedItem("name").focus(); return; }
            profile.photoData = form.dataset.photoData || "";
            saveProfile({ ...getProfile(), ...profile });
            form.dataset.dirty = "false";
            renderProfile();
            window.dispatchEvent(new Event("comfort-data-updated"));
            if (status) status.textContent = "Alterações salvas.";
        });
        document.getElementById("cancelProfileChanges")?.addEventListener("click", () => {
            form.dataset.dirty = "false";
            renderProfile();
            if (status) status.textContent = "Alterações descartadas.";
        });
        form.addEventListener("input", () => { form.dataset.dirty = "true"; if (status) status.textContent = ""; });
        form.addEventListener("change", () => { form.dataset.dirty = "true"; if (status) status.textContent = ""; });
        const photoInput = document.getElementById("profilePhotoFile");
        photoInput?.addEventListener("change", () => {
            const file = photoInput.files && photoInput.files[0];
            if (!file) return;
            if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type) || file.size > 350 * 1024) {
                photoInput.value = "";
                if (status) status.textContent = "Escolha uma imagem de até 350 KB.";
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result !== "string" || !/^data:image\/(png|jpeg|webp|gif);base64,/i.test(reader.result)) {
                    if (status) status.textContent = "Formato de imagem não compatível.";
                    return;
                }
                form.dataset.photoData = reader.result;
                form.dataset.dirty = "true";
                renderProfileAvatar(reader.result, form.elements.namedItem("name").value.trim());
                if (status) status.textContent = "Foto selecionada. Salve as alterações para confirmar.";
            };
            reader.onerror = () => { if (status) status.textContent = "Não foi possível abrir essa imagem."; };
            reader.readAsDataURL(file);
        });
        document.getElementById("removeProfilePhoto")?.addEventListener("click", () => {
            form.dataset.photoData = "";
            form.dataset.dirty = "true";
            if (photoInput) photoInput.value = "";
            renderProfileAvatar("", form.elements.namedItem("name").value.trim());
            if (status) status.textContent = "A foto será removida ao salvar.";
        });
    }


    
    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function safeAttachmentDataUrl(value) {
        return typeof value === "string" && /^data:(application\/pdf|image\/(png|jpeg|webp|gif));base64,[A-Za-z0-9+/=]+$/i.test(value) ? value : "";
    }


    function formatDate(dateString) {

        if (!dateString) return "";

        const date =
            new Date(
                `${dateString}T00:00:00`
            );

        if (Number.isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleDateString(
            "pt-BR"
        );
    }


    function getTodayString() {

        const today = new Date();

        return `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}-${String(
            today.getDate()
        ).padStart(2, "0")}`;
    }


    function getDaysUntil(dateString) {

        if (!dateString) return 0;

        const today =
            new Date(
                `${getTodayString()}T00:00:00`
            );

        const date =
            new Date(
                `${dateString}T00:00:00`
            );

        const difference =
            date.getTime() -
            today.getTime();

        return Math.round(
            difference /
            (1000 * 60 * 60 * 24)
        );
    }


    function getDaysLabel(dateString) {

        const days =
            getDaysUntil(dateString);

        if (days < 0) return "Passada";
        if (days === 0) return "Hoje";
        if (days === 1) return "Amanhã";

        return `Em ${days} dias`;
    }


    function getSubject(subjectName) {

        return getAllSubjects().find(
            subject =>
                subject.name.toLowerCase() ===
                String(subjectName).toLowerCase()
        ) || {
            name: subjectName,
            icon: "📚",
            className: "portuguese"
        };
    }


    function emptyMessage(
        icon,
        title,
        text
    ) {

        return `
            <div
                style="
                    padding:24px;
                    text-align:center;
                ">

                <div
                    style="
                        font-size:32px;
                        margin-bottom:8px;
                    ">

                    ${icon}

                </div>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p>
                    ${escapeHTML(text)}
                </p>

            </div>
        `;
    }


    function openPage(
        page,
        shouldScroll = true
    ) {

        document
            .querySelectorAll(".page-section")
            .forEach(section => {

                section.classList.remove(
                    "active-page"
                );

                section.style.display = "none";
            });


        const selectedPage =
            document.getElementById(
                `page-${page}`
            );


        if (selectedPage) {

            selectedPage.classList.add(
                "active-page"
            );

            selectedPage.style.display =
                "block";
        }


        document
            .querySelectorAll("[data-page]")
            .forEach(item => {

                item.classList.remove(
                    "active"
                );
            });


        document
            .querySelectorAll(
                `[data-page="${page}"]`
            )
            .forEach(item => {

                item.classList.add(
                    "active"
                );
            });


        const title =
            document.getElementById(
                "page-title"
            );


        if (title) {

            title.textContent =
                pageNames[page] ||
                "ComfortStudy";
        }


        if (page === "desempenho") {
            updatePerformance();
        }

        if (page === "materias") {
            renderSubjects();
        }

        if (page === "tarefas") {
            renderTasks();
        }

        if (page === "provas") {
            renderExams();
        }

        if (page === "avisos") {
            renderNotices();
        }

        if (page === "calendario") {
            createCalendar();
        }

        if (page === "perfil") {
            renderProfile();
        }


        if (shouldScroll) {

            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    }


    window.openPage =
        openPage;


    const mobileMoreButton = document.getElementById("mobileMoreButton");
    const mobileMoreMenu = document.getElementById("mobileMoreMenu");
    const mobileMoreBackdrop = document.getElementById("mobileMoreBackdrop");
    const closeMobileMore = document.getElementById("closeMobileMore");

    function setMobileMoreOpen(isOpen) {
        if (!mobileMoreMenu || !mobileMoreBackdrop || !mobileMoreButton) return;
        mobileMoreMenu.hidden = !isOpen;
        mobileMoreBackdrop.hidden = !isOpen;
        mobileMoreButton.setAttribute("aria-expanded", String(isOpen));
        document.body.classList.toggle("mobile-more-open", isOpen);
    }

    if (mobileMoreButton) {
        mobileMoreButton.addEventListener("click", () => {
            setMobileMoreOpen(mobileMoreMenu.hidden);
        });
    }
    if (closeMobileMore) closeMobileMore.addEventListener("click", () => setMobileMoreOpen(false));
    if (mobileMoreBackdrop) mobileMoreBackdrop.addEventListener("click", () => setMobileMoreOpen(false));

    document
        .querySelectorAll("[data-page]")
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const page = button.getAttribute("data-page");
                    if (page) {
                        openPage(page);
                        setMobileMoreOpen(false);
                    }
                }
            );
        });


    
    const modal =
        document.getElementById("modal");

    const modalTitle =
        document.getElementById(
            "modalTitle"
        );

    const modalBody =
        document.getElementById(
            "modalBody"
        );

    const closeModalButton =
        document.getElementById(
            "closeModal"
        );

    let modalPreviousFocus = null;


    function openModal(
        title,
        content
    ) {

        if (!modal) return;

        if (!modal.classList.contains("show")) {
            modalPreviousFocus = document.activeElement;
        }

        if (modalTitle) {
            modalTitle.textContent =
                title;
        }

        if (modalBody) {
            modalBody.innerHTML =
                content;
        }

        modal.classList.add("show");
        modal.style.display =
            "flex";
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
        modal.querySelector(".modal-content")?.focus({ preventScroll: true });
    }


    function closeModal() {

        if (!modal) return;

        modal.classList.remove("show");
        modal.style.display =
            "none";
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
        if (modalPreviousFocus?.isConnected) modalPreviousFocus.focus({ preventScroll: true });
        modalPreviousFocus = null;
    }


    window.openModal =
        openModal;

    window.closeModal =
        closeModal;


    if (closeModalButton) {

        closeModalButton.addEventListener(
            "click",
            closeModal
        );
    }


    if (modal) {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {
                    closeModal();
                }
            }
        );
    }


    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {
                closeModal();
            }
        }
    );


    
    function taskForm() {
        const options = getAllSubjects().map(subject =>
            '<option value="' + escapeHTML(subject.name) + '">' + escapeHTML(subject.name) + '</option>'
        ).join("");
        return '<form id="taskForm" class="modal-form">' +
            '<label for="taskName">Nome da tarefa</label>' +
            '<input type="text" id="taskName" placeholder="Ex: Fazer exercícios de matemática" required>' +
            '<label for="taskSubject">Matéria</label>' +
            '<select id="taskSubject" required><option value="">Selecione a matéria</option>' + options + '</select>' +
            '<label for="taskDate">Data de entrega</label>' +
            '<input type="date" id="taskDate" min="' + getTodayString() + '" required>' +
            '<label for="taskDescription">Instruções (opcional)</label>' +
            '<textarea id="taskDescription" rows="3" maxlength="1200" placeholder="Anote o que precisa fazer"></textarea>' +
            '<label for="taskSteps">Checklist (uma etapa por linha)</label>' +
            '<textarea id="taskSteps" rows="3" maxlength="1000" placeholder="Ler o capítulo&#10;Resolver os exercícios"></textarea>' +
            '<label for="taskRecurrence">Repetição</label>' +
            '<select id="taskRecurrence"><option value="">Não repetir</option><option value="daily">Todos os dias</option><option value="weekly">Toda semana</option></select>' +
            '<label for="taskFiles">Anexar PDF ou imagem (até 700 KB no total)</label>' +
            '<input type="file" id="taskFiles" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" multiple>' +
            '<small>Os arquivos ficam neste navegador e entram no backup; não são sincronizados com a nuvem.</small>' +
            '<button type="submit" class="btn-primary">Adicionar tarefa</button></form>';
    }

    function showTaskModal() {

        openModal(
            "Nova Tarefa",
            taskForm()
        );

        const form =
            document.getElementById(
                "taskForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    addTask();
                }
            );
        }
    }


    async function addTask() {
        const nameInput = document.getElementById("taskName");
        const subjectInput = document.getElementById("taskSubject");
        const dateInput = document.getElementById("taskDate");
        if (!nameInput || !subjectInput || !dateInput) return;

        const name = nameInput.value.trim();
        const subject = subjectInput.value;
        const date = dateInput.value;
        const description = (document.getElementById("taskDescription") || {}).value || "";
        const recurrence = (document.getElementById("taskRecurrence") || {}).value || "";
        const stepsText = (document.getElementById("taskSteps") || {}).value || "";
        const fileInput = document.getElementById("taskFiles");
        const files = Array.from(fileInput && fileInput.files || []);

        if (!name || !subject || !date) {
            alert("Preencha o nome, a matéria e a data.");
            return;
        }
        if (files.some(file => !["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type))) {
            alert("Anexe apenas arquivos PDF ou imagens PNG, JPG, WEBP e GIF.");
            return;
        }
        if (files.some(file => file.size > 700 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 700 * 1024) {
            alert("Os anexos desta tarefa podem somar até 700 KB. Para arquivos maiores, use o caderno ou um link para o arquivo.");
            return;
        }

        try {
            const fileData = await Promise.all(files.map(file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            })));
            const task = {
                id: Date.now(),
                name: name,
                subject: subject,
                date: date,
                description: description.trim(),
                steps: stepsText.split(/\r?\n/).map(step => step.trim()).filter(Boolean).slice(0, 10).map(text => ({ text: text, done: false })),
                recurrence: recurrence,
                completed: false,
                createdAt: new Date().toISOString()
            };
            const taskFiles = JSON.parse(localStorage.getItem("comfortTaskFiles") || "{}");
            if (fileData.length) taskFiles[String(task.id)] = fileData;
            localStorage.setItem("comfortTaskFiles", JSON.stringify(taskFiles));

            const tasks = getTasks();
            tasks.push(task);
            saveTasks(tasks);
            closeModal();
            updateEverything();
            checkDueDateNotifications();
            alert("Tarefa adicionada com sucesso! ✅");
        } catch (error) {
            console.error("ComfortStudy: não foi possível salvar a tarefa", error);
            alert("Não foi possível salvar a tarefa ou os anexos. Tente arquivos menores.");
        }
    }

    window.addTask = addTask;

    ["newTaskButton", "dashboardAddTask", "newTaskPageButton"].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.addEventListener("click", showTaskModal);
    });

    let currentTaskFilter =
        "all";


    function renderTaskItem(task, showDelete = true) {
        const subject = getSubject(task.subject);
        let taskFiles = [];
        try {
            const allFiles = JSON.parse(localStorage.getItem("comfortTaskFiles") || "{}");
            const fileKey = task.attachmentSourceId || task.id;
            taskFiles = Array.isArray(allFiles[String(task.id)]) ? allFiles[String(task.id)] : (Array.isArray(allFiles[String(fileKey)]) ? allFiles[String(fileKey)] : []);
        } catch (_) {}
        const steps = Array.isArray(task.steps) ? task.steps : [];
        const hasDetails = task.description || steps.length || taskFiles.length || task.recurrence;
        let html = '<div class="task-item ' + (task.completed ? "completed" : "") + '">' +
            '<div class="task-check"><button type="button" class="small-button" onclick="toggleTask(' + Number(task.id) + ')" title="' + (task.completed ? "Desmarcar tarefa" : "Marcar como concluída") + '">' + (task.completed ? "✓" : "○") + '</button></div>' +
            '<span class="task-subject ' + subject.className + '">' + subject.icon + " " + escapeHTML(subject.name) + '</span>' +
            '<span class="task-title">' + escapeHTML(task.name) + '</span>' +
            '<span class="task-date">' + formatDate(task.date) + '</span>';
        if (task.recurrence) html += '<span class="task-recurrence">' + (task.recurrence === "daily" ? "Diária" : "Semanal") + '</span>';
        if (showDelete) html += '<button type="button" class="small-button" onclick="deleteTask(' + Number(task.id) + ')" title="Excluir tarefa">🗑️</button>';
        if (hasDetails) {
            html += '<div class="task-extra"><details data-task-id="' + Number(task.id) + '"><summary>Instruções, checklist e anexos</summary>' +
                (task.description ? '<p>' + escapeHTML(task.description) + '</p>' : "");
            if (steps.length) {
                html += '<div class="task-checklist">' + steps.map((step, index) =>
                    '<label class="' + (step.done ? "task-step-done" : "") + '"><input type="checkbox" ' + (step.done ? "checked" : "") + ' onchange="toggleTaskStep(' + Number(task.id) + ',' + index + ',this.checked)"><span>' + escapeHTML(step.text) + '</span></label>'
                ).join("") + '</div>';
            }
            if (taskFiles.length) {
                html += '<div class="task-files">' + taskFiles.map(file =>
                    safeAttachmentDataUrl(file.dataUrl) ? '<a href="' + escapeHTML(safeAttachmentDataUrl(file.dataUrl)) + '" download="' + escapeHTML(file.name) + '">📎 ' + escapeHTML(file.name) + '</a>' : ''
                ).join("") + '</div>';
            }
            if (task.recurrence) html += '<p>Esta tarefa se repete ' + (task.recurrence === "daily" ? "diariamente" : "semanalmente") + ' quando for concluída.</p>';
            html += '</details></div>';
        }
        html += '</div>';
        return html;
    }

    window.toggleTaskStep = function (taskId, stepIndex, checked) {
        const tasks = getTasks();
        const task = tasks.find(item => Number(item.id) === Number(taskId));
        if (!task || !Array.isArray(task.steps) || !task.steps[stepIndex]) return;
        task.steps[stepIndex].done = Boolean(checked);
        const openedIds = new Set(Array.from(document.querySelectorAll("details[data-task-id][open]")).map(details => details.dataset.taskId));
        saveTasks(tasks);
        renderTasks();
        updateDashboard();
        document.querySelectorAll("details[data-task-id]").forEach(details => {
            if (openedIds.has(details.dataset.taskId)) details.open = true;
        });
    };

    function renderTasks() {

        const list =
            document.getElementById(
                "fullTaskList"
            );


        if (!list) return;


        const searchInput =
            document.getElementById(
                "taskSearch"
            );


        const search =
            searchInput
                ? searchInput.value
                    .trim()
                    .toLowerCase()
                : "";


        let tasks =
            getTasks();


        if (search) {

            tasks =
                tasks.filter(task =>

                    String(task.name)
                        .toLowerCase()
                        .includes(search)

                    ||

                    String(task.subject)
                        .toLowerCase()
                        .includes(search)

                );
        }


        if (
            currentTaskFilter ===
            "pending"
        ) {

            tasks =
                tasks.filter(
                    task =>
                        !task.completed
                );
        }


        if (
            currentTaskFilter ===
            "completed"
        ) {

            tasks =
                tasks.filter(
                    task =>
                        task.completed
                );
        }


        tasks.sort((a, b) => {

            if (
                a.completed !==
                b.completed
            ) {

                return a.completed
                    ? 1
                    : -1;
            }


            return String(a.date)
                .localeCompare(
                    String(b.date)
                );
        });


        if (tasks.length === 0) {

            list.innerHTML =
                emptyMessage(
                    "📝",
                    "Nenhuma tarefa encontrada",
                    search
                        ? "Tente pesquisar outro termo."
                        : "Adicione uma nova tarefa para começar."
                );

            return;
        }


        list.innerHTML =
            tasks
                .map(task =>
                    renderTaskItem(task)
                )
                .join("");
    }


    function toggleTask(id) {

        const tasks =
            getTasks();


        const task =
            tasks.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!task) return;


        task.completed =
            !task.completed;


        if (task.completed) {

            task.completedAt =
                new Date().toISOString();

        } else {

            delete task.completedAt;
        }


        if (task.completed && (task.recurrence === "daily" || task.recurrence === "weekly")) {
            const parts = String(task.date).split("-").map(Number);
            const nextDate = new Date(parts[0], parts[1] - 1, parts[2], 12);
            nextDate.setDate(nextDate.getDate() + (task.recurrence === "daily" ? 1 : 7));
            const nextDateText = nextDate.getFullYear() + "-" + String(nextDate.getMonth() + 1).padStart(2, "0") + "-" + String(nextDate.getDate()).padStart(2, "0");
            const alreadyGenerated = tasks.some(item => Number(item.recursFrom) === Number(task.id));
            if (!alreadyGenerated) {
                const nextId = Date.now() + Math.floor(Math.random() * 1000);
                tasks.push({
                    id: nextId,
                    name: task.name,
                    subject: task.subject,
                    date: nextDateText,
                    description: task.description || "",
                    steps: (Array.isArray(task.steps) ? task.steps : []).map(step => ({ text: step.text, done: false })),
                    recurrence: task.recurrence,
                    recursFrom: task.id,
                    attachmentSourceId: task.attachmentSourceId || task.id,
                    completed: false,
                    createdAt: new Date().toISOString()
                });
            }
        }

        saveTasks(tasks);

        updateEverything();
    }


    window.toggleTask =
        toggleTask;


    function deleteTask(id) {
        if (!confirm("Deseja realmente excluir esta tarefa?")) return;
        const allTasks = getTasks();
        const removed = allTasks.find(task => Number(task.id) === Number(id));
        const tasks = allTasks.filter(task => Number(task.id) !== Number(id));
        saveTasks(tasks);

        if (removed) {
            try {
                const files = JSON.parse(localStorage.getItem("comfortTaskFiles") || "{}");
                const fileKey = String(removed.attachmentSourceId || removed.id);
                const stillReferenced = tasks.some(task => String(task.attachmentSourceId || task.id) === fileKey);
                if (!stillReferenced) delete files[fileKey];
                delete files[String(removed.id)];
                localStorage.setItem("comfortTaskFiles", JSON.stringify(files));
            } catch (_) {}
        }
        updateEverything();
    }

    window.deleteTask =
        deleteTask;


    const taskSearch =
        document.getElementById(
            "taskSearch"
        );


    if (taskSearch) {

        taskSearch.addEventListener(
            "input",
            renderTasks
        );
    }


    document
        .querySelectorAll(".filter")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".filter"
                        )
                        .forEach(item =>
                            item.classList.remove(
                                "active"
                            )
                        );


                    button.classList.add(
                        "active"
                    );


                    currentTaskFilter =
                        button.dataset.filter ||
                        "all";


                    renderTasks();
                }
            );
        });


    
    function updateDashboard() {

        const tasks =
            getTasks();

        const exams =
            getExams();


        const pending =
            tasks.filter(
                task =>
                    !task.completed
            ).length;


        const completed =
            tasks.filter(
                task =>
                    task.completed
            ).length;


        const completedExams =
            exams.filter(
                exam =>
                    exam.completed
            ).length;


        const prazo =
            document.getElementById(
                "dashboard-prazos"
            );


        if (prazo) {

            prazo.textContent =
                `${pending} ${
                    pending === 1
                        ? "Atividade"
                        : "Atividades"
                }`;
        }


        const concluidas =
            document.getElementById(
                "dashboard-concluidas"
            );


        if (concluidas) {

            concluidas.textContent =
                `${completed} ${
                    completed === 1
                        ? "Tarefa"
                        : "Tarefas"
                }`;
        }


        const materias =
            document.getElementById(
                "dashboard-materias"
            );


        if (materias) {

            materias.textContent =
                `${FIXED_SUBJECTS.length} Disciplinas`;
        }


       

        const dashboardTaskList =
            document.getElementById(
                "dashboardTaskList"
            );


        if (dashboardTaskList) {

            const pendingTasks =
                tasks
                    .filter(
                        task =>
                            !task.completed
                    )
                    .sort(
                        (a, b) =>
                            String(a.date)
                                .localeCompare(
                                    String(b.date)
                                )
                    )
                    .slice(0, 5);


            if (
                pendingTasks.length ===
                0
            ) {

                dashboardTaskList.innerHTML =
                    emptyMessage(
                        "✓",
                        "Nenhuma tarefa pendente",
                        "Você está em dia!"
                    );

            } else {

                dashboardTaskList.innerHTML =
                    pendingTasks
                        .map(task =>
                            renderTaskItem(
                                task,
                                false
                            )
                        )
                        .join("");
            }
        }


       

        const dashboardExamList =
            document.getElementById(
                "dashboardExamList"
            );


        if (dashboardExamList) {

            const today =
                getTodayString();


            const upcomingExams =
                exams
                    .filter(
                        exam =>
                            exam.date &&
                            exam.date >= today &&
                            !exam.completed
                    )
                    .sort(
                        (a, b) =>
                            String(a.date)
                                .localeCompare(
                                    String(b.date)
                                )
                    )
                    .slice(0, 5);


            if (
                upcomingExams.length ===
                0
            ) {

                dashboardExamList.innerHTML =
                    emptyMessage(
                        "📅",
                        "Nenhuma prova pendente",
                        completedExams > 0
                            ? `${completedExams} prova(s) concluída(s).`
                            : "Cadastre uma prova para acompanhar."
                    );

            } else {

                dashboardExamList.innerHTML =
                    upcomingExams
                        .map(
                            exam =>
                                renderExamPreview(
                                    exam,
                                    false
                                )
                        )
                        .join("");
            }
        }


        updateNotificationCount();
    }


   
    function examForm() {

        return `
            <form
                id="examForm"
                class="modal-form">

                <label for="examName">
                    Nome da prova
                </label>

                <input
                    type="text"
                    id="examName"
                    placeholder="Ex: Prova de Matemática"
                    required
                >

                <label for="examSubject">
                    Matéria
                </label>

                <select
                    id="examSubject"
                    required>

                    <option value="">
                        Selecione a matéria
                    </option>

                    ${getAllSubjects().map(
                        subject => `
                            <option
                                value="${escapeHTML(subject.name)}">

                                ${escapeHTML(
                                    subject.name
                                )}

                            </option>
                        `
                    ).join("")}

                </select>

                <label for="examDate">
                    Data da prova
                </label>

                <input
                    type="date"
                    id="examDate"
                    min="${getTodayString()}"
                    required
                >

                <button
                    type="submit"
                    class="btn-primary">

                    Adicionar prova

                </button>

            </form>
        `;
    }


    function showExamModal() {

        openModal(
            "Nova Prova",
            examForm()
        );


        const form =
            document.getElementById(
                "examForm"
            );


        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    addExam();
                }
            );
        }
    }


    function addExam() {

        const nameInput =
            document.getElementById(
                "examName"
            );

        const subjectInput =
            document.getElementById(
                "examSubject"
            );

        const dateInput =
            document.getElementById(
                "examDate"
            );


        if (
            !nameInput ||
            !subjectInput ||
            !dateInput
        ) {
            return;
        }


        const name =
            nameInput.value.trim();

        const subject =
            subjectInput.value;

        const date =
            dateInput.value;


        if (
            !name ||
            !subject ||
            !date
        ) {

            alert(
                "Preencha todos os campos."
            );

            return;
        }


        const exams =
            getExams();


        exams.push({

            id: Date.now(),

            name,

            subject,

            date,

            completed: false,

            createdAt:
                new Date().toISOString()

        });


        saveExams(exams);

        closeModal();

        updateEverything();

        /*
         * Se a permissão já estiver ativa, a nova prova
         * passa a participar imediatamente das verificações.
         */
        checkDueDateNotifications();


        alert(
            "Prova adicionada com sucesso! "
        );
    }


    window.addExam =
        addExam;


    const newExamButton =
        document.getElementById(
            "newExamButton"
        );


    if (newExamButton) {

        newExamButton.addEventListener(
            "click",
            showExamModal
        );
    }


    function renderExamPreview(
        exam,
        showDelete = true
    ) {

        const days =
            getDaysUntil(exam.date);


        return `
            <div
                class="exam-preview
                ${exam.completed ? "completed" : ""}">

                <div class="exam-icon">
                    ${exam.completed ? "✓" : "📝"}
                </div>


                <div>

                    <strong>
                        ${escapeHTML(exam.name)}
                    </strong>

                    <p>
                        ${escapeHTML(exam.subject)}
                        •
                        ${formatDate(exam.date)}
                    </p>

                    <small>
                        ${
                            exam.completed
                                ? "✓ Prova concluída"
                                : getDaysLabel(exam.date)
                        }
                    </small>

                </div>


                <div class="days-left">

                    <strong>
                        ${
                            exam.completed
                                ? "✓"
                                : days < 0
                                    ? "-"
                                    : days
                        }
                    </strong>

                    <span>
                        ${
                            exam.completed
                                ? "feita"
                                : days === 0
                                    ? "hoje"
                                    : "dias"
                        }
                    </span>

                </div>


                <button
                    type="button"
                    class="small-button"
                    onclick="toggleExam(${Number(exam.id)})"
                    title="${
                        exam.completed
                            ? "Desmarcar prova"
                            : "Marcar prova como concluída"
                    }">

                    ${
                        exam.completed
                            ? "↩️"
                            : "✓"
                    }

                </button>


                ${
                    showDelete
                        ? `
                            <button
                                type="button"
                                class="small-button"
                                onclick="deleteExam(${Number(exam.id)})"
                                title="Excluir prova">

                                🗑️

                            </button>
                        `
                        : ""
                }

            </div>
        `;
    }


    function renderExams() {

        const list =
            document.getElementById(
                "examList"
            );


        if (!list) return;


        const exams =
            [...getExams()]
                .sort(
                    (a, b) =>
                        String(a.date)
                            .localeCompare(
                                String(b.date)
                            )
                );


        if (exams.length === 0) {

            list.innerHTML =
                emptyMessage(
                    "📝",
                    "Nenhuma prova cadastrada",
                    "Adicione uma prova para começar."
                );

            return;
        }


        list.innerHTML =
            exams
                .map(exam =>
                    renderExamPreview(
                        exam,
                        true
                    )
                )
                .join("");
    }


    function toggleExam(id) {

        const exams =
            getExams();


        const exam =
            exams.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!exam) return;


        exam.completed =
            !exam.completed;


        if (exam.completed) {

            exam.completedAt =
                new Date().toISOString();

        } else {

            delete exam.completedAt;
        }


        saveExams(exams);

        updateEverything();
    }


    window.toggleExam =
        toggleExam;


    function deleteExam(id) {

        if (
            !confirm(
                "Deseja realmente excluir esta prova?"
            )
        ) {
            return;
        }


        const exams =
            getExams().filter(
                exam =>
                    Number(exam.id) !==
                    Number(id)
            );


        saveExams(exams);

        updateEverything();
    }


    window.deleteExam =
        deleteExam;


    
    function getSubjectProgress(
        subjectName
    ) {

        const subjectTasks =
            getTasks().filter(
                task =>
                    String(
                        task.subject
                    ).toLowerCase() ===
                    String(
                        subjectName
                    ).toLowerCase()
            );


        if (
            subjectTasks.length ===
            0
        ) {
            return 0;
        }


        const completed =
            subjectTasks.filter(
                task =>
                    task.completed
            ).length;


        return Math.round(
            (
                completed /
                subjectTasks.length
            ) * 100
        );
    }


    function renderSubjects() {

        const grid =
            document.getElementById(
                "subjectsGrid"
            );


        if (!grid) return;

        const searchInput = document.getElementById("subjectSearch");
        if (searchInput && searchInput.dataset.ready !== "true") {
            searchInput.dataset.ready = "true";
            searchInput.addEventListener("input", renderSubjects);
        }
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const visibleSubjects = getAllSubjects().filter(subject => {
            if (!query || subject.name.toLowerCase().includes(query)) return true;
            return getContentsForSubject(subject.name).some(content => [content.topic, content.title, content.text].some(value => String(value || "").toLowerCase().includes(query)));
        });


        grid.innerHTML = `
            <div class="subject-card subject-add-card" role="button" tabindex="0" onclick="promptAddSubject()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();promptAddSubject()}" style="cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:150px;border:2px dashed #cbd5e1;box-shadow:none;">
                <div style="text-align:center"><div style="font-size:32px">＋</div><h3>Adicionar matéria</h3><p>Personalize conforme sua escola</p></div>
            </div>` + (visibleSubjects.length ? visibleSubjects
                .map(
                    (subject, index) => {

                        const progress =
                            getSubjectProgress(
                                subject.name
                            );


                        const contents =
                            getContentsForSubject(
                                subject.name
                            );


                        return `
            <div
                                class="subject-card"
                                data-subject-open="${escapeHTML(subject.name)}"
                                role="button"
                                tabindex="0"
                                style="cursor:pointer;">

                                <div
                                    class="subject-color ${[
                                        "red",
                                        "blue",
                                        "yellow",
                                        "green"
                                    ][index % 4]}">
                                </div>


                                <div class="subject-icon">

                                    ${subject.icon}

                                </div>


                                <h3>

                                    ${escapeHTML(
                                        subject.name
                                    )}

                                </h3>


                                <p>

                                    ${
                                        contents.length > 0
                                            ? `${contents.length} conteúdo(s) adicionado(s)`
                                            : "Clique para adicionar conteúdos"
                                    }

                                </p>


                                <div class="progress-info">

                                    <span>
                                        Progresso
                                    </span>

                                    <strong>
                                        ${progress}%
                                    </strong>

                                </div>


                                <div class="progress">

                                    <span
                                        style="width:${progress}%">
                                    </span>

                                </div>

                            </div>
                        `;
                    }
                )
                .join("") : query ? `<p class="feature-empty subject-search-empty">Nenhuma matéria ou anotação encontrada para “${escapeHTML(query)}”.</p>` : "");
        grid.querySelectorAll("[data-subject-open]").forEach(card => {
            card.addEventListener("click", () => showSubjectModal(card.dataset.subjectOpen));
            card.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showSubjectModal(card.dataset.subjectOpen); }
            });
        });
    }


    window.promptAddSubject = function () {
        const name = prompt("Qual é o nome da nova matéria?");
        if (name && addCustomSubject(name)) renderSubjects();
    };

    window.editSubjectContent = function (subjectName, contentId) {
        const item = getContentsForSubject(subjectName).find(c => Number(c.id) === Number(contentId));
        if (!item) return;
        openModal("Editar conteúdo", `<form id="editSubjectContentForm" class="modal-form">
            <label for="editSubjectTopic">Tópico (opcional)</label><input id="editSubjectTopic" type="text" maxlength="100" value="${escapeHTML(item.topic || "")}" placeholder="Ex.: Capítulo 2">
            <label for="editSubjectTitle">Título / assunto</label><input id="editSubjectTitle" type="text" maxlength="120" value="${escapeHTML(item.title || "Anotação")}" required>
            <label for="editSubjectText">Anotações</label><textarea id="editSubjectText" rows="6" maxlength="10000" required>${escapeHTML(item.text || "")}</textarea>
            <label class="checkbox-label"><input id="editSubjectImportant" type="checkbox"${item.important ? " checked" : ""}> Marcar como importante para revisar</label>
            <label for="editSubjectFiles">Adicionar mais PDFs ou fotos</label><input id="editSubjectFiles" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" multiple>
            <small>Arquivos atuais serão mantidos. Limite total do conteúdo: 900 KB.</small>
            <button type="submit" class="btn-primary">Salvar alterações</button></form>`);
        const form = document.getElementById("editSubjectContentForm");
        form?.addEventListener("submit", event => {
            event.preventDefault();
            const title = document.getElementById("editSubjectTitle").value.trim();
            const text = document.getElementById("editSubjectText").value.trim();
            const selectedFiles = Array.from(document.getElementById("editSubjectFiles").files || []);
            if (selectedFiles.some(file => !["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type))) { alert("Anexe apenas PDFs ou imagens PNG, JPG, WEBP e GIF."); return; }
            const currentFiles = Array.isArray(item.files) ? item.files : [];
            const currentBytes = currentFiles.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
            const newBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
            if (selectedFiles.some(file => file.size > 700 * 1024) || currentBytes + newBytes > 900 * 1024) { alert("O limite por arquivo é 700 KB e o limite total deste conteúdo é 900 KB."); return; }
            Promise.all(selectedFiles.map(file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }))).then(newFiles => updateSubjectContent(subjectName, contentId, {
                topic: document.getElementById("editSubjectTopic").value.trim(),
                title: title,
                text: text,
                important: document.getElementById("editSubjectImportant").checked,
                files: currentFiles.concat(newFiles)
            })).catch(() => alert("Não foi possível ler um dos arquivos."));
        });
    };

    window.generateSubjectReview = function (subjectName, contentId) {
        const item = getContentsForSubject(subjectName).find(c => Number(c.id) === Number(contentId));
        if (!item) return;
        const text = String(item.text || "").trim();
        if (!text) { alert("Adicione anotações antes de gerar uma revisão."); return; }
        const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
        const questions = sentences.slice(0, 8).map((sentence, i) => `<div style="padding:10px 0;border-bottom:1px solid #e5e7eb"><strong>Pergunta ${i+1}:</strong> Explique com suas palavras: “${escapeHTML(sentence)}”<details style="margin-top:6px"><summary>Ver resposta-base</summary><p>${escapeHTML(sentence)}</p></details></div>`).join("");
        openModal("Revisão: " + (item.title || subjectName), `<p>Esta revisão foi criada a partir das anotações salvas. Confira as respostas com o material da aula.</p><h3>Resumo</h3><p style="white-space:pre-wrap">${escapeHTML(text)}</p><h3 style="margin-top:16px">Perguntas para revisar</h3>${questions || "Não há texto suficiente."}<button type="button" class="btn-primary" onclick="window.print()">Imprimir / salvar em PDF</button>`);
    };

    window.showSubjectModal =
        showSubjectModal;


    function showSubjectModal(
        subjectName
    ) {

        const subject =
            getSubject(subjectName);


        const contents =
            getContentsForSubject(
                subjectName
            );


        const tasks =
            getTasks().filter(
                task =>
                    String(task.subject)
                        .toLowerCase() ===
                    String(subjectName)
                        .toLowerCase()
            );


        const exams =
            getExams().filter(
                exam =>
                    String(exam.subject)
                        .toLowerCase() ===
                    String(subjectName)
                        .toLowerCase()
            );


        const progress =
            getSubjectProgress(
                subjectName
            );


        openModal(
            `${subject.icon} ${subject.name}`,

            `
                <div>

                    <div
                        style="
                            text-align:center;
                            margin-bottom:20px;
                        ">

                        <div
                            style="
                                font-size:45px;
                            ">

                            ${subject.icon}

                        </div>

                        <h3>
                            ${escapeHTML(
                                subject.name
                            )}
                        </h3>

                        <p>
                            Progresso:
                            <strong>
                                ${progress}%
                            </strong>
                        </p>

                    </div>


                    <form id="subjectContentForm" class="modal-form">
                        <label for="subjectContentTopic">Tópico (opcional)</label>
                        <input type="text" id="subjectContentTopic" maxlength="100" placeholder="Ex.: Capítulo 2">
                        <label for="subjectContentTitle">Título / assunto</label>
                        <input type="text" id="subjectContentTitle" placeholder="Ex.: Ligações químicas" required>
                        <label for="subjectContentInput">Anotações do conteúdo</label>
                        <textarea id="subjectContentInput" rows="5" placeholder="Escreva o que aprendeu na aula..." required></textarea>
                        <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="subjectContentImportant"> Marcar como importante para revisar</label>
                        <label for="subjectContentFiles">Anexar PDF ou fotos (até 700 KB por arquivo e 900 KB no total)</label>
                        <input type="file" id="subjectContentFiles" accept="application/pdf,image/png,image/jpeg,image/webp,image/gif" multiple>
                        <p style="font-size:12px;color:#718096">Os arquivos ficam guardados junto ao conteúdo neste navegador. Para sincronizar anexos entre dispositivos, configure Firebase Storage.</p>
                        <button type="submit" class="btn-primary">＋ Salvar conteúdo</button>
                    </form>


                    <div
                        style="
                            margin-top:20px;
                        ">

                        <h4>
                            📚 Conteúdos
                        </h4>

                        ${contents.length ? '<label for="subjectContentSearch" class="subject-search-label">Buscar anotações</label><input type="search" id="subjectContentSearch" class="subject-content-search" placeholder="Pesquise por tópico, título ou texto">' : ''}


                        ${
                            contents.length === 0

                                ? `
                                    <p>
                                        Nenhum conteúdo
                                        adicionado ainda.
                                    </p>
                                `

                                : contents
                                    .map(
                                        content => `
                                            <article class="subject-note-card" data-note-search="${escapeHTML([content.topic, content.title, content.text, subjectName].join(" ").toLowerCase())}"
                                                style="
                                                    display:flex;
                                                    align-items:center;
                                                    justify-content:space-between;
                                                    gap:10px;
                                                    padding:10px 0;
                                                    border-bottom:1px solid #eee;
                                                ">

                                                <div style="flex:1;min-width:0">
                                                    <strong>${content.important ? '⭐ ' : '📖 '}${escapeHTML(content.title || content.text || 'Anotação')}</strong>
                                                    ${content.topic ? `<small class="subject-note-topic">${escapeHTML(content.topic)}</small>` : ''}
                                                    <p style="white-space:pre-wrap;margin:6px 0">${escapeHTML(content.text || '')}</p>
                                                    ${(content.files || []).map(file => { const url = safeAttachmentDataUrl(file.dataUrl); if (!url) return ''; const image = /^data:image\//i.test(url); return `<p class="subject-attachment">${image ? `<img src="${escapeHTML(url)}" alt="Prévia de ${escapeHTML(file.name)}" loading="lazy">` : ''}<a href="${escapeHTML(url)}" download="${escapeHTML(file.name)}" target="_blank" rel="noopener">📎 ${escapeHTML(file.name)}</a></p>`; }).join('')}
                                                    <button type="button" class="small-button" data-subject-action="edit" data-subject="${escapeHTML(subjectName)}" data-content-id="${Number(content.id)}">✏️ Editar</button>
                                                    <button type="button" class="small-button" data-subject-action="review" data-subject="${escapeHTML(subjectName)}" data-content-id="${Number(content.id)}">🧠 Revisar</button>
                                                </div>
                                                <button type="button" class="small-button" data-subject-action="delete" data-subject="${escapeHTML(subjectName)}" data-content-id="${Number(content.id)}" aria-label="Excluir conteúdo">🗑️</button>

                                            </article>
                                        `
                                    )
                                    .join("")
                        }

                    </div>


                    <div
                        style="
                            margin-top:20px;
                        ">

                        <p>
                            📝
                            ${
                                tasks.length
                            }
                            tarefa(s)
                        </p>

                        <p>
                            📚
                            ${
                                exams.length
                            }
                            prova(s)
                        </p>

                    </div>

                </div>
            `
        );


        const form =
            document.getElementById(
                "subjectContentForm"
            );

        if (modalBody && modalBody.dataset.subjectActionHandler !== "true") {
            modalBody.dataset.subjectActionHandler = "true";
            modalBody.addEventListener("click", event => {
                const button = event.target.closest("[data-subject-action]");
                if (!button) return;
                const name = button.dataset.subject;
                const id = Number(button.dataset.contentId);
                if (button.dataset.subjectAction === "edit") window.editSubjectContent(name, id);
                if (button.dataset.subjectAction === "review") window.generateSubjectReview(name, id);
                if (button.dataset.subjectAction === "delete") window.deleteSubjectContent(name, id);
            });
        }

        const searchInput = document.getElementById("subjectContentSearch");
        if (searchInput) searchInput.addEventListener("input", () => {
            const query = searchInput.value.trim().toLowerCase();
            document.querySelectorAll(".subject-note-card").forEach(note => {
                note.hidden = Boolean(query) && !String(note.dataset.noteSearch || "").includes(query);
            });
        });


        if (!form) return;


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                const input =
                    document.getElementById(
                        "subjectContentInput"
                    );


                const topic = document.getElementById("subjectContentTopic").value.trim();
                const title = document.getElementById("subjectContentTitle").value.trim();
                const content = input.value.trim();
                const fileInput = document.getElementById("subjectContentFiles");
                const files = Array.from(fileInput.files || []);
                if (!title || !content) { alert("Preencha o título e as anotações."); return; }
                if (files.some(file => !["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type))) { alert("Anexe apenas PDFs ou imagens PNG, JPG, WEBP e GIF."); return; }
                if (files.some(file => file.size > 700 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 900 * 1024) { alert("Para evitar erro de armazenamento, cada arquivo deve ter até 700 KB e o total por anotação até 900 KB. Para arquivos maiores, será necessário configurar o Firebase Storage."); return; }
                Promise.all(files.map(file => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve({ name: file.name, type: file.type, size: file.size, dataUrl: reader.result });
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }))).then(fileData => {
                    addSubjectContent(subjectName, { topic, title, text: content, important: document.getElementById("subjectContentImportant").checked, files: fileData });
                    renderSubjects();
                    showSubjectModal(subjectName);
                }).catch(() => alert("Não foi possível ler um dos arquivos."));
                return;


                renderSubjects();

                showSubjectModal(
                    subjectName
                );
            }
        );
    }


   
    function formatStudyTime(
        seconds
    ) {

        seconds =
            Number(seconds) || 0;


        const hours =
            Math.floor(
                seconds / 3600
            );


        const minutes =
            Math.floor(
                (seconds % 3600) /
                60
            );


        if (hours > 0) {

            return `${hours}h ${minutes}min`;
        }


        return `${minutes}min`;
    }


    function getPerformanceData() {

        const tasks =
            getTasks();

        const exams =
            getExams();


        const totalTasks =
            tasks.length;


        const completedTasks =
            tasks.filter(
                task =>
                    task.completed
            ).length;


        const totalExams =
            exams.length;


        const completedExams =
            exams.filter(
                exam =>
                    exam.completed
            ).length;


        const totalActivities =
            totalTasks +
            totalExams;


        const completedActivities =
            completedTasks +
            completedExams;


        const percentage =
            totalActivities === 0
                ? 0
                : Math.round(
                    (
                        completedActivities /
                        totalActivities
                    ) * 100
                );


        return {

            totalTasks,

            completedTasks,

            totalExams,

            completedExams,

            totalActivities,

            completedActivities,

            percentage,

            studySeconds:
                getStudySeconds()

        };
    }


    function getEvolution() {

        const tasks =
            getTasks();

        const exams =
            getExams();


        const completedTasks =
            tasks.filter(
                task =>
                    task.completed &&
                    task.completedAt
            );


        const completedExams =
            exams.filter(
                exam =>
                    exam.completed &&
                    exam.completedAt
            );


        const completed =
            [
                ...completedTasks,
                ...completedExams
            ];


        if (
            completed.length ===
            0
        ) {
            return 0;
        }


        const now =
            Date.now();


        const sevenDays =
            7 *
            24 *
            60 *
            60 *
            1000;


        const recentCompleted =
            completed.filter(
                item => {

                    const completedAt =
                        new Date(
                            item.completedAt
                        ).getTime();


                    return (
                        now -
                            completedAt >=
                            0 &&

                        now -
                            completedAt <=
                            sevenDays
                    );
                }
            ).length;


        return Math.round(
            (
                recentCompleted /
                completed.length
            ) * 100
        );
    }


    function updatePerformance() {

        const data =
            getPerformanceData();


        const performanceTasks =
            document.getElementById(
                "performanceTasks"
            );


        if (performanceTasks) {

            performanceTasks.textContent =
                data.completedActivities;
        }


        const performanceCards =
            document.querySelectorAll(
                ".performance-card"
            );



        if (performanceCards[0]) {

            const strong =
                performanceCards[0]
                    .querySelector(
                        "strong"
                    );


            if (strong) {

                strong.textContent =
                    data.completedActivities;
            }


            const description =
                performanceCards[0]
                    .querySelector("p");


            if (
                description &&
                !description.dataset.customized
            ) {

                description.textContent =
                    `${data.completedTasks} tarefa(s) e ${data.completedExams} prova(s) concluída(s).`;
            }
        }


        

        if (performanceCards[1]) {

            const strong =
                performanceCards[1]
                    .querySelector(
                        "strong"
                    );


            if (strong) {

                strong.textContent =
                    formatStudyTime(
                        data.studySeconds
                    );
            }
        }


        

        if (performanceCards[2]) {

            const strong =
                performanceCards[2]
                    .querySelector(
                        "strong"
                    );


            if (strong) {

                strong.textContent =
                    `+${getEvolution()}%`;
            }
        }



        const subjectList =
            document.getElementById(
                "performanceSubjectList"
            );


        if (!subjectList) return;


        subjectList.innerHTML =
            FIXED_SUBJECTS
                .map(
                    subject => {

                        const progress =
                            getSubjectProgress(
                                subject.name
                            );


                        return `
                            <div
                                class="performance-row">

                                <span>

                                    ${escapeHTML(
                                        subject.name
                                    )}

                                </span>


                                <div
                                    class="performance-bar">

                                    <span
                                        style="
                                            width:${progress}%
                                        ">

                                    </span>

                                </div>


                                <strong>

                                    ${progress}%

                                </strong>

                            </div>
                        `;
                    }
                )
                .join("");
    }


    
    let timerSeconds =
        25 * 60;

    let timerInterval =
        null;

    let timerRunning = false;

    let pendingStudyLogSeconds = 0;
    let pendingSubjectStudySeconds = {};
    let activeTimerSubject = "";

    function flushWeeklyStudyLog() {
        if (!pendingStudyLogSeconds) return;
        const log = getStorage("comfortStudyLog", {});
        const day = getTodayString();
        log[day] = (Number(log[day]) || 0) + pendingStudyLogSeconds;
        localStorage.setItem("comfortStudyLog", JSON.stringify(log));
        const subjects = getStorage("comfortStudySubjectLog", {});
        subjects[day] = subjects[day] && typeof subjects[day] === "object" ? subjects[day] : {};
        Object.entries(pendingSubjectStudySeconds).forEach(([subject, seconds]) => {
            subjects[day][subject] = (Number(subjects[day][subject]) || 0) + Number(seconds || 0);
        });
        if (Object.keys(pendingSubjectStudySeconds).length) localStorage.setItem("comfortStudySubjectLog", JSON.stringify(subjects));
        pendingStudyLogSeconds = 0;
        pendingSubjectStudySeconds = {};
        window.dispatchEvent(new Event("comfort-data-updated"));
    }

    function recordWeeklyStudySecond() {
        pendingStudyLogSeconds++;
        if (activeTimerSubject) pendingSubjectStudySeconds[activeTimerSubject] = (pendingSubjectStudySeconds[activeTimerSubject] || 0) + 1;
        if (pendingStudyLogSeconds >= 60) flushWeeklyStudyLog();
    }

    window.addEventListener("beforeunload", flushWeeklyStudyLog);


    function updateTimerDisplay() {

        const display =
            document.getElementById(
                "timerDisplay"
            );


        if (!display) return;


        const minutes =
            Math.floor(
                timerSeconds / 60
            );


        const seconds =
            timerSeconds % 60;


        display.textContent =
            `${String(minutes).padStart(
                2,
                "0"
            )}:${String(seconds).padStart(
                2,
                "0"
            )}`;
    }


    function startTimer() {

        if (timerRunning) return;


        if (
            timerSeconds <=
            0
        ) {

            timerSeconds =
                25 * 60;
        }


        timerRunning =
            true;

        activeTimerSubject = document.getElementById("timerStudySubject")?.value || "";


        timerInterval =
            setInterval(
                () => {

                    if (
                        timerSeconds <=
                        0
                    ) {

                        pauseTimer();

                        return;
                    }


                    timerSeconds--;


                    saveStudySeconds(
                        getStudySeconds() +
                        1
                    );
                    recordWeeklyStudySecond();


                    updateTimerDisplay();

                    updatePerformance();


                    if (
                        timerSeconds <=
                        0
                    ) {

                        pauseTimer();


                        alert(
                            "Tempo de estudo concluído! 🎉"
                        );
                    }

                },
                1000
            );
    }


    function pauseTimer() {

        timerRunning =
            false;
        flushWeeklyStudyLog();


        if (
            timerInterval !==
            null
        ) {

            clearInterval(
                timerInterval
            );

            timerInterval =
                null;
        }
    }


    function resetTimer() {

        pauseTimer();

        timerSeconds =
            25 * 60;

        updateTimerDisplay();
    }


    const startTimerButton =
        document.getElementById(
            "startTimer"
        );


    const pauseTimerButton =
        document.getElementById(
            "pauseTimer"
        );


    const resetTimerButton =
        document.getElementById(
            "resetTimer"
        );


    if (startTimerButton) {

        startTimerButton.addEventListener(
            "click",
            startTimer
        );
    }


    if (pauseTimerButton) {

        pauseTimerButton.addEventListener(
            "click",
            pauseTimer
        );
    }


    if (resetTimerButton) {

        resetTimerButton.addEventListener(
            "click",
            resetTimer
        );
    }


    document
        .querySelectorAll(
            ".timer-presets button"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const time =
                        Number(
                            button.dataset.time
                        );


                    if (
                        !Number.isFinite(
                            time
                        ) ||
                        time <= 0
                    ) {
                        return;
                    }


                    pauseTimer();


                    timerSeconds =
                        time * 60;


                    updateTimerDisplay();
                }
            );
        });


    const calendarNow =
        new Date();


    let currentCalendarYear =
        calendarNow.getFullYear();


    let currentCalendarMonth =
        calendarNow.getMonth();


    function createCalendar() {

        const calendar =
            document.getElementById(
                "calendarDays"
            );


        if (!calendar) return;


        const monthTitle =
            document.getElementById(
                "calendarMonth"
            );


        const firstDay =
            new Date(
                currentCalendarYear,
                currentCalendarMonth,
                1
            );


        const lastDay =
            new Date(
                currentCalendarYear,
                currentCalendarMonth + 1,
                0
            );


        const daysInMonth =
            lastDay.getDate();


        const firstWeekday =
            (
                firstDay.getDay() +
                6
            ) % 7;


        if (monthTitle) {

            let monthName =
                firstDay.toLocaleDateString(
                    "pt-BR",
                    {
                        month: "long",
                        year: "numeric"
                    }
                );


            monthName =
                monthName
                    .charAt(0)
                    .toUpperCase() +
                monthName.slice(1);


            monthTitle.textContent =
                monthName;
        }


        const tasks =
            getTasks();


        const exams =
            getExams();


        let html = "";


        

        const previousLastDay =
            new Date(
                currentCalendarYear,
                currentCalendarMonth,
                0
            ).getDate();


        for (
            let i =
                firstWeekday - 1;
            i >= 0;
            i--
        ) {

            const day =
                previousLastDay -
                i;


            html += `
                <div
                    class="calendar-day other-month">

                    <span>
                        ${day}
                    </span>

                </div>
            `;
        }


       

        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {

            const dateString =
                `${currentCalendarYear}-${String(
                    currentCalendarMonth + 1
                ).padStart(
                    2,
                    "0"
                )}-${String(
                    day
                ).padStart(
                    2,
                    "0"
                )}`;


            const dayTasks =
                tasks.filter(
                    task =>
                        task.date ===
                        dateString
                );


            const dayExams =
                exams.filter(
                    exam =>
                        exam.date ===
                        dateString
                );


            const hasTask =
                dayTasks.length >
                0;


            const hasExam =
                dayExams.length >
                0;


            const isToday =
                dateString ===
                getTodayString();


            html += `
                <div
                    class="
                        calendar-day
                        ${isToday ? "today" : ""}
                        ${hasTask ? "has-task" : ""}
                        ${hasExam ? "has-exam" : ""}
                    "
                    data-date="${dateString}">

                    <span
                        class="calendar-number">

                        ${day}

                    </span>


                    ${
                        hasTask || hasExam
                            ? `
                                <span
                                    class="calendar-indicators">

                                    ${
                                        hasTask
                                            ? `
                                                <span
                                                    class="calendar-dot task"
                                                    title="${dayTasks.length} tarefa(s)">
                                                </span>
                                            `
                                            : ""
                                    }


                                    ${
                                        hasExam
                                            ? `
                                                <span
                                                    class="calendar-dot exam"
                                                    title="${dayExams.length} prova(s)">
                                                </span>
                                            `
                                            : ""
                                    }

                                </span>
                            `
                            : ""
                    }


                    ${
                        dayTasks
                            .slice(0, 3)
                            .map(
                                task => `
                                    <span
                                        class="calendar-event task"
                                        title="${escapeHTML(
                                            task.name
                                        )}">

                                        ${escapeHTML(
                                            task.name
                                        )}

                                    </span>
                                `
                            )
                            .join("")
                    }


                    ${
                        dayExams
                            .slice(0, 3)
                            .map(
                                exam => `
                                    <span
                                        class="calendar-event exam"
                                        title="${escapeHTML(
                                            exam.name
                                        )}">

                                        ${escapeHTML(
                                            exam.name
                                        )}

                                    </span>
                                `
                            )
                            .join("")
                    }

                </div>
            `;
        }


        

        const totalCells =
            firstWeekday +
            daysInMonth;


        const remaining =
            (
                7 -
                (
                    totalCells %
                    7
                )
            ) % 7;


        for (
            let day = 1;
            day <= remaining;
            day++
        ) {

            html += `
                <div
                    class="calendar-day other-month">

                    <span>
                        ${day}
                    </span>

                </div>
            `;
        }


        calendar.innerHTML =
            html;


        calendar
            .querySelectorAll(
                ".calendar-day:not(.other-month)"
            )
            .forEach(
                dayElement => {

                    dayElement.addEventListener(
                        "click",
                        () => {

                            const date =
                                dayElement.dataset.date;


                            if (date) {

                                showCalendarDay(
                                    date
                                );
                            }
                        }
                    );
                }
            );
    }


    function showCalendarDay(
        date
    ) {

        const tasks =
            getTasks().filter(
                task =>
                    task.date ===
                    date
            );


        const exams =
            getExams().filter(
                exam =>
                    exam.date ===
                    date
            );


        let content = `
            <div>

                <h3>
                    ${formatDate(date)}
                </h3>
        `;


        if (
            tasks.length === 0 &&
            exams.length === 0
        ) {

            content += `
                <p>
                    Nenhuma tarefa ou prova
                    cadastrada para este dia.
                </p>
            `;

        } else {

            if (
                tasks.length >
                0
            ) {

                content += `
                    <h4>
                        📝 Tarefas
                    </h4>
                `;


                tasks.forEach(
                    task => {

                        content += `
                            <div
                                style="
                                    padding:10px 0;
                                    border-bottom:1px solid #eee;
                                ">

                                <strong>
                                    ${escapeHTML(
                                        task.name
                                    )}
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        task.subject
                                    )}
                                </p>

                                <small>
                                    ${
                                        task.completed
                                            ? "✓ Concluída"
                                            : "Pendente"
                                    }
                                </small>

                            </div>
                        `;
                    }
                );
            }


            if (
                exams.length >
                0
            ) {

                content += `
                    <h4
                        style="
                            margin-top:20px;
                        ">

                        📚 Provas

                    </h4>
                `;


                exams.forEach(
                    exam => {

                        content += `
                            <div
                                style="
                                    padding:10px 0;
                                    border-bottom:1px solid #eee;
                                ">

                                <strong>
                                    ${escapeHTML(
                                        exam.name
                                    )}
                                </strong>

                                <p>
                                    ${escapeHTML(
                                        exam.subject
                                    )}
                                </p>

                                <small>
                                    ${
                                        exam.completed
                                            ? "✓ Concluída"
                                            : "Pendente"
                                    }
                                </small>

                            </div>
                        `;
                    }
                );
            }
        }


        content += `
            </div>
        `;


        openModal(
            `Agenda — ${formatDate(date)}`,
            content
        );
    }


    const previousMonth =
        document.getElementById(
            "previousMonth"
        );


    if (previousMonth) {

        previousMonth.addEventListener(
            "click",
            () => {

                currentCalendarMonth--;


                if (
                    currentCalendarMonth <
                    0
                ) {

                    currentCalendarMonth =
                        11;

                    currentCalendarYear--;
                }


                createCalendar();
            }
        );
    }


    const nextMonth =
        document.getElementById(
            "nextMonth"
        );


    if (nextMonth) {

        nextMonth.addEventListener(
            "click",
            () => {

                currentCalendarMonth++;


                if (
                    currentCalendarMonth >
                    11
                ) {

                    currentCalendarMonth =
                        0;

                    currentCalendarYear++;
                }


                createCalendar();
            }
        );
    }


    
    const calendarAddButton =
        document.getElementById(
            "calendarAddButton"
        );


    if (calendarAddButton) {

        calendarAddButton.addEventListener(
            "click",
            () => {

                openModal(
                    "Adicionar ao calendário",

                    `
                        <div
                            style="
                                display:flex;
                                flex-direction:column;
                                gap:12px;
                            ">

                            <button
                                type="button"
                                class="btn-primary"
                                id="calendarAddTask">

                                 Adicionar tarefa

                            </button>


                            <button
                                type="button"
                                class="btn-secondary"
                                id="calendarAddExam">

                                 Adicionar prova

                            </button>

                        </div>
                    `
                );


                const addTaskButton =
                    document.getElementById(
                        "calendarAddTask"
                    );


                const addExamButton =
                    document.getElementById(
                        "calendarAddExam"
                    );


                if (addTaskButton) {

                    addTaskButton.addEventListener(
                        "click",
                        () => {

                            closeModal();


                            setTimeout(
                                showTaskModal,
                                100
                            );
                        }
                    );
                }


                if (addExamButton) {

                    addExamButton.addEventListener(
                        "click",
                        () => {

                            closeModal();


                            setTimeout(
                                showExamModal,
                                100
                            );
                        }
                    );
                }
            }
        );
    }


   
    function updateNotificationCount() {

        const count =
            document.getElementById(
                "notificationCount"
            );


        if (!count) return;


        const total =
            getNotices().length;


        count.textContent =
            total;


        count.style.display =
            total > 0
                ? "flex"
                : "none";
    }


    function renderNotices() {

        const container =
            document.getElementById(
                "noticeList"
            );


        const dashboardContainer =
            document.getElementById(
                "dashboardNoticeList"
            );


        const notices =
            getNotices();


        if (container) {

            if (
                notices.length ===
                0
            ) {

                container.innerHTML =
                    emptyMessage(
                        "🔔",
                        "Nenhum aviso",
                        "Você não possui avisos no momento."
                    );

            } else {

                container.innerHTML =
                    notices
                        .map(
                            notice => `

                                <div
                                    class="notice">

                                    <i
                                        class="ph ph-bell">
                                    </i>


                                    <div>

                                        <strong>
                                            ${escapeHTML(
                                                notice.title
                                            )}
                                        </strong>


                                        <p>
                                            ${escapeHTML(
                                                notice.message
                                            )}
                                        </p>

                                    </div>

                                </div>

                            `
                        )
                        .join("");
            }
        }


        if (dashboardContainer) {

            const latest =
                notices.slice(0, 3);


            if (
                latest.length ===
                0
            ) {

                dashboardContainer.innerHTML =
                    emptyMessage(
                        "🔔",
                        "Nenhum aviso",
                        "Você não possui avisos no momento."
                    );

            } else {

                dashboardContainer.innerHTML =
                    latest
                        .map(
                            notice => `

                                <div
                                    class="notice">

                                    <i
                                        class="ph ph-bell">
                                    </i>


                                    <div>

                                        <strong>
                                            ${escapeHTML(
                                                notice.title
                                            )}
                                        </strong>


                                        <p>
                                            ${escapeHTML(
                                                notice.message
                                            )}
                                        </p>

                                    </div>

                                </div>

                            `
                        )
                        .join("");
            }
        }


        updateNotificationCount();
    }


   
    const newNoticeButton =
        document.getElementById(
            "newNoticeButton"
        );


    if (newNoticeButton) {

        newNoticeButton.addEventListener(
            "click",
            () => {

                openModal(
                    "Novo Aviso",

                    `
                        <form
                            id="noticeForm"
                            class="modal-form">

                            <label
                                for="noticeTitle">

                                Título

                            </label>


                            <input
                                type="text"
                                id="noticeTitle"
                                placeholder="Título do aviso"
                                required
                            >


                            <label
                                for="noticeMessage">

                                Aviso

                            </label>


                            <textarea
                                id="noticeMessage"
                                placeholder="Digite o aviso..."
                                rows="5"
                                required>
                            </textarea>


                            <button
                                type="submit"
                                class="btn-primary">

                                Publicar aviso

                            </button>

                        </form>
                    `
                );


                const form =
                    document.getElementById(
                        "noticeForm"
                    );


                if (form) {

                    form.addEventListener(
                        "submit",
                        event => {

                            event.preventDefault();


                            const title =
                                document
                                    .getElementById(
                                        "noticeTitle"
                                    )
                                    .value
                                    .trim();


                            const message =
                                document
                                    .getElementById(
                                        "noticeMessage"
                                    )
                                    .value
                                    .trim();


                            if (
                                !title ||
                                !message
                            ) {

                                alert(
                                    "Preencha todos os campos."
                                );

                                return;
                            }


                            const notices =
                                getNotices();


                            notices.unshift({

                                id: Date.now(),

                                title,

                                message,

                                date:
                                    new Date()
                                        .toISOString()

                            });


                            saveNotices(
                                notices
                            );


                            closeModal();


                            updateEverything();


                            alert(
                                "Aviso publicado com sucesso! 🔔"
                            );
                        }
                    );
                }
            }
        );
    }


   


    /* =========================================================
       NOTIFICAÇÕES DE TAREFAS E PROVAS
       - Pede permissão quando o usuário toca no sino.
       - Avisa 1 dia antes e no dia do vencimento.
       - Evita notificações repetidas usando localStorage.
       - Verifica ao abrir a página, ao voltar para a aba
         e a cada 60 segundos enquanto o site estiver aberto.
    ========================================================= */

    const NOTIFICATION_STORAGE_KEY =
        "comfortSentNotifications";

    function getSentNotifications() {
        const data = getStorage(
            NOTIFICATION_STORAGE_KEY,
            []
        );

        return Array.isArray(data)
            ? data
            : [];
    }


    function saveSentNotifications(list) {
        setStorage(
            NOTIFICATION_STORAGE_KEY,
            list.slice(-300)
        );
    }


    function notificationSupported() {
        return (
            "Notification" in window
        );
    }


    async function requestNotificationPermission() {
        if (!notificationSupported()) {
            alert(
                "Seu navegador não oferece suporte a notificações."
            );
            return false;
        }

        if (
            Notification.permission ===
            "granted"
        ) {
            return true;
        }

        if (
            Notification.permission ===
            "denied"
        ) {
            alert(
                "As notificações estão bloqueadas no navegador. Ative-as nas configurações do navegador para receber lembretes."
            );
            return false;
        }

        try {
            const permission =
                await Notification.requestPermission();

            if (
                permission ===
                "granted"
            ) {
                alert(
                    "Notificações ativadas! 🔔 Você receberá lembretes de tarefas e provas."
                );

                checkDueDateNotifications();

                return true;
            }

            return false;
        } catch (error) {
            console.error(
                "Não foi possível solicitar permissão para notificações:",
                error
            );

            return false;
        }
    }


    function sendBrowserNotification(
        title,
        body,
        notificationId
    ) {
        if (
            !notificationSupported() ||
            Notification.permission !==
                "granted"
        ) {
            return false;
        }

        const sent =
            getSentNotifications();

        if (
            sent.includes(
                notificationId
            )
        ) {
            return false;
        }

        try {
            const notification =
                new Notification(
                    title,
                    {
                        body,
                        icon:
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%236c63ff'/%3E%3Ctext x='50' y='65' text-anchor='middle' font-size='55'%3E📚%3C/text%3E%3C/svg%3E",
                        tag:
                            notificationId,
                        renotify: false
                    }
                );

            notification.onclick =
                () => {
                    window.focus();

                    if (
                        notification.close
                    ) {
                        notification.close();
                    }

                    openPage(
                        "calendario"
                    );
                };

            sent.push(
                notificationId
            );

            saveSentNotifications(
                sent
            );

            return true;
        } catch (error) {
            console.error(
                "Erro ao mostrar notificação:",
                error
            );

            return false;
        }
    }


    function checkDueDateNotifications() {
        if (
            !notificationSupported() ||
            Notification.permission !==
                "granted"
        ) {
            return;
        }

        const today =
            getTodayString();

        const tasks =
            getTasks().filter(
                task =>
                    task &&
                    task.id != null &&
                    task.date &&
                    !task.completed
            );

        const exams =
            getExams().filter(
                exam =>
                    exam &&
                    exam.id != null &&
                    exam.date &&
                    !exam.completed
            );


        const items = [
            ...tasks.map(
                task => ({
                    ...task,
                    notificationType:
                        "tarefa"
                })
            ),
            ...exams.map(
                exam => ({
                    ...exam,
                    notificationType:
                        "prova"
                })
            )
        ];


        items.forEach(
            item => {
                const days =
                    getDaysUntil(
                        item.date
                    );

                if (
                    days !== 0 &&
                    days !== 1
                ) {
                    return;
                }

                const prefix =
                    item.notificationType ===
                    "prova"
                        ? "📚 Prova"
                        : "📝 Tarefa";

                const when =
                    days === 0
                        ? "É hoje!"
                        : "É amanhã!";

                const title =
                    `${prefix}: ${item.name}`;

                const body =
                    `${when} ${item.subject ? `Matéria: ${item.subject}. ` : ""}Data: ${formatDate(item.date)}.`;

                const notificationId =
                    `comfort-${item.notificationType}-${item.id}-${days}`;

                sendBrowserNotification(
                    title,
                    body,
                    notificationId
                );
            }
        );
    }


    window.enableComfortNotifications =
        requestNotificationPermission;

    window.checkComfortNotifications =
        checkDueDateNotifications;


    /* Verifica ao abrir/voltar para o site. */
    document.addEventListener(
        "visibilitychange",
        () => {
            if (
                document.visibilityState ===
                "visible"
            ) {
                checkDueDateNotifications();
            }
        }
    );


    window.addEventListener(
        "focus",
        checkDueDateNotifications
    );


    /* Verificação periódica enquanto o site estiver aberto. */
    setInterval(
        checkDueDateNotifications,
        60 * 1000
    );


    const notificationButton =
        document.getElementById(
            "notificationButton"
        );


    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            async () => {

                await requestNotificationPermission();

                checkDueDateNotifications();

                openPage(
                    "avisos"
                );
            }
        );
    }


    
    function updateEverything() {

        renderTasks();

        renderExams();

        renderSubjects();

        renderNotices();

        createCalendar();

        updateDashboard();

        updatePerformance();

        updateTimerDisplay();

        renderProfile();
        window.dispatchEvent(new Event("comfort-data-updated"));
    }


   

    const initialActivePage =
        document.querySelector(
            ".page-section.active-page"
        );


    if (initialActivePage) {

        const page =
            initialActivePage.id.replace(
                "page-",
                ""
            );


        openPage(
            page,
            false
        );

    } else {

        openPage(
            "dashboard",
            false
        );
    }


    

    const activeFilter =
        document.querySelector(
            ".filter.active"
        );


    if (!activeFilter) {

        const allFilter =
            document.querySelector(
                '.filter[data-filter="all"]'
            );


        if (allFilter) {

            allFilter.classList.add(
                "active"
            );
        }
    }


    renderTasks();

    renderExams();

    renderSubjects();

    renderNotices();

    createCalendar();

    updateDashboard();

    updatePerformance();

    updateTimerDisplay();

    initializeProfileSettings();
    renderProfile();

    /*
     * Faz uma verificação inicial. Se a permissão ainda
     * não foi concedida, nenhuma janela será aberta.
     */
    checkDueDateNotifications();


    /* =========================================================
       CONTA / SESSÃO
       ========================================================= */
    function getSessionUser() {
        try {
            return JSON.parse(localStorage.getItem("comfortAuthUser")) || { name: "Estudante", email: "" };
        } catch {
            return { name: "Estudante", email: "" };
        }
    }

    function updateLoggedUser() {
        const user = getSessionUser();
        document.querySelectorAll(".user-info .name, .profile-info h2").forEach(el => {
            if (el.classList.contains("name") || el.closest(".user-info")) el.textContent = user.name || "Estudante";
        });
        const profileEmail = document.querySelector(".profile-info p");
        if (profileEmail && user.email) profileEmail.textContent = user.email;

        const profileArea = document.querySelector(".profile-info");
        if (profileArea && !document.getElementById("logoutButton")) {
            const btn = document.createElement("button");
            btn.id = "logoutButton";
            btn.className = "btn-secondary";
            btn.style.marginLeft = "8px";
            btn.textContent = "Sair";
            btn.addEventListener("click", async () => {
                btn.disabled = true;
                try {
                    if (window.comfortAuth && window.comfortAuth.currentUser) await window.comfortAuth.signOut();
                } catch (error) {
                    console.error("ComfortStudy: erro ao sair", error);
                } finally {
                    const signedOutAccount = getSessionUser();
                    if (signedOutAccount.email) localStorage.setItem("comfortLegacyEmail", String(signedOutAccount.email).trim().toLowerCase());
                    localStorage.removeItem("comfortSession");
                    localStorage.removeItem("comfortAuthUser");
                    location.replace("index.html");
                }
            });
            profileArea.appendChild(btn);
        }
    }

    updateLoggedUser();

    /* =========================================================
       REGISTRO PWA
       ========================================================= */
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", async () => {
            try {
                const registration = await navigator.serviceWorker.register("./service-worker.js", { scope: "./" });
                console.log("ComfortStudy PWA ativo:", registration.scope);
            } catch (error) {
                console.error("Erro ao registrar o PWA:", error);
            }
        });
    }

});
