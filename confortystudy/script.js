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
        customSubjects: "comfortCustomSubjects",
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
        const saved = getStorage(STORAGE.customSubjects, []);
        return Array.isArray(saved) ? saved.filter(item => item && item.name) : [];
    }

    function getAllSubjects() {
        const all = [...FIXED_SUBJECTS, ...getCustomSubjects()];
        const seen = new Set();
        return all.filter(subject => {
            const key = String(subject.name).trim().toLocaleLowerCase('pt-BR');
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function saveCustomSubjects(subjects) {
        setStorage(STORAGE.customSubjects, subjects);
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
        perfil: "Meu Perfil"
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

        if (!Array.isArray(allContents[subjectName])) {
            allContents[subjectName] = [];
        }

        allContents[subjectName].push({
            id: Date.now(),
            text: content,
            createdAt: new Date().toISOString()
        });

        saveSubjectContents(allContents);
    }


    function editSubjectContent(subjectName, contentId) {
        const contents = getContentsForSubject(subjectName);
        const item = contents.find(content => Number(content.id) === Number(contentId));
        if (!item) return;
        const updated = prompt("Edite o conteúdo:", item.text || "");
        if (updated === null) return;
        if (!updated.trim()) { alert("O conteúdo não pode ficar vazio."); return; }
        item.text = updated.trim();
        item.updatedAt = new Date().toISOString();
        const allContents = getSubjectContents();
        allContents[subjectName] = contents;
        saveSubjectContents(allContents);
        renderSubjects();
        showSubjectModal(subjectName);
    }

    window.editSubjectContent = editSubjectContent;

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


    function renderProfile() {

        const profile = getProfile();

       

        const fields = {
            profileName: profile.name,
            userName: profile.name,
            profileEmail: profile.email,
            userEmail: profile.email,
            profileSchool: profile.school,
            profileCourse: profile.course,
            profileBio: profile.bio
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


        

        const profilePage =
            document.getElementById("page-perfil");

        if (!profilePage) return;


        let editButton =
            document.getElementById(
                "editProfileButton"
            );


        if (!editButton) {

            editButton =
                document.createElement("button");

            editButton.id =
                "editProfileButton";

            editButton.type =
                "button";

            editButton.className =
                "btn-primary";

            editButton.textContent =
                "✏️ Editar perfil";


            

            profilePage.prepend(editButton);

            editButton.addEventListener(
                "click",
                showProfileModal
            );
        }
    }


    function profileForm() {

        const profile = getProfile();

        return `
            <form
                id="profileForm"
                class="modal-form">

                <label for="profileFormName">
                    Nome
                </label>

                <input
                    type="text"
                    id="profileFormName"
                    value="${escapeHTML(profile.name)}"
                    placeholder="Seu nome"
                    required
                >

                <label for="profileFormEmail">
                    E-mail
                </label>

                <input
                    type="email"
                    id="profileFormEmail"
                    value="${escapeHTML(profile.email)}"
                    placeholder="seuemail@email.com"
                >

                <label for="profileFormSchool">
                    Escola
                </label>

                <input
                    type="text"
                    id="profileFormSchool"
                    value="${escapeHTML(profile.school)}"
                    placeholder="Nome da escola"
                >

                <label for="profileFormCourse">
                    Curso / Série
                </label>

                <input
                    type="text"
                    id="profileFormCourse"
                    value="${escapeHTML(profile.course)}"
                    placeholder="Ex: 3ª série"
                >

                <label for="profileFormBio">
                    Sobre você
                </label>

                <textarea
                    id="profileFormBio"
                    rows="4"
                    placeholder="Escreva algo sobre você..."
                >${escapeHTML(profile.bio)}</textarea>

                <button
                    type="submit"
                    class="btn-primary">

                    Salvar perfil

                </button>

            </form>
        `;
    }


    function showProfileModal() {

        openModal(
            "Editar meu perfil",
            profileForm()
        );

        const form =
            document.getElementById(
                "profileForm"
            );

        if (!form) return;

        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                const profile = {
                    name:
                        document
                            .getElementById(
                                "profileFormName"
                            )
                            .value
                            .trim(),

                    email:
                        document
                            .getElementById(
                                "profileFormEmail"
                            )
                            .value
                            .trim(),

                    school:
                        document
                            .getElementById(
                                "profileFormSchool"
                            )
                            .value
                            .trim(),

                    course:
                        document
                            .getElementById(
                                "profileFormCourse"
                            )
                            .value
                            .trim(),

                    bio:
                        document
                            .getElementById(
                                "profileFormBio"
                            )
                            .value
                            .trim()
                };


                if (!profile.name) {

                    alert(
                        "Digite pelo menos o seu nome."
                    );

                    return;
                }


                saveProfile(profile);

                closeModal();

                renderProfile();

                alert(
                    "Perfil atualizado com sucesso! ✅"
                );
            }
        );
    }


    
    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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


    function openModal(
        title,
        content
    ) {

        if (!modal) return;

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
    }


    function closeModal() {

        if (!modal) return;

        modal.classList.remove("show");
        modal.style.display =
            "none";
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


    
    function taskForm(task = null) {
        const editing = Boolean(task);
        return `
            <form id="taskForm" class="modal-form">
                <label for="taskName">Nome da atividade</label>
                <input type="text" id="taskName" value="${escapeHTML(task?.name || "")}" placeholder="Ex.: Fazer exercícios de Matemática" maxlength="120" required>

                <label for="taskSubject">Matéria</label>
                <select id="taskSubject" required>
                    <option value="">Selecione a matéria</option>
                    ${getAllSubjects().map(subject => `
                        <option value="${escapeHTML(subject.name)}" ${task?.subject === subject.name ? "selected" : ""}>${subject.icon} ${escapeHTML(subject.name)}</option>
                    `).join("")}
                </select>

                <label for="taskDate">Data de entrega</label>
                <input type="date" id="taskDate" ${editing ? "" : `min="${getTodayString()}"`} value="${escapeHTML(task?.date || "")}" required>

                <label for="taskDescription">Instruções / observações (opcional)</label>
                <textarea id="taskDescription" rows="3" maxlength="1000" placeholder="Anote o que o professor pediu...">${escapeHTML(task?.description || "")}</textarea>

                <label for="taskPriority">Prioridade</label>
                <select id="taskPriority">
                    <option value="normal" ${!task?.priority || task.priority === "normal" ? "selected" : ""}>Normal</option>
                    <option value="alta" ${task?.priority === "alta" ? "selected" : ""}>Alta</option>
                    <option value="baixa" ${task?.priority === "baixa" ? "selected" : ""}>Baixa</option>
                </select>

                <button type="submit" class="btn-primary">${editing ? "Salvar alterações" : "+ Adicionar atividade"}</button>
            </form>
        `;
    }


    function showTaskModal(taskId = null) {
        const task = taskId == null ? null : getTasks().find(item => Number(item.id) === Number(taskId));
        if (taskId != null && !task) return;
        openModal(task ? "Editar atividade" : "Nova atividade", taskForm(task));

        const form =
            document.getElementById(
                "taskForm"
            );


        if (form) {
            if (task) form.dataset.editingId = String(task.id);
            form.addEventListener(
                "submit",
                event => {
                    event.preventDefault();
                    addTask();
                }
            );
        }
    }


    function addTask() {

        const nameInput =
            document.getElementById(
                "taskName"
            );

        const subjectInput =
            document.getElementById(
                "taskSubject"
            );

        const dateInput = document.getElementById("taskDate");
        const descriptionInput = document.getElementById("taskDescription");
        const priorityInput = document.getElementById("taskPriority");
        const editingId = document.getElementById("taskForm")?.dataset.editingId;

        if (!nameInput || !subjectInput || !dateInput) {
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


        const tasks = getTasks();
        const description = descriptionInput ? descriptionInput.value.trim() : "";
        const priority = priorityInput ? priorityInput.value : "normal";
        const now = new Date().toISOString();

        if (editingId) {
            const existing = tasks.find(item => Number(item.id) === Number(editingId));
            if (!existing) {
                alert("Não foi possível localizar esta atividade. Atualize a lista e tente novamente.");
                return;
            }
            Object.assign(existing, { name, subject, date, description, priority, updatedAt: now });
        } else {
            tasks.push({ id: Date.now(), name, subject, date, description, priority, completed: false, createdAt: now });
        }

        saveTasks(tasks);

        closeModal();

        updateEverything();

        /*
         * Se a permissão já estiver ativa, a nova tarefa
         * passa a participar imediatamente das verificações.
         */
        checkDueDateNotifications();


        alert(editingId ? "Atividade atualizada com sucesso! ✅" : "Atividade adicionada com sucesso! ✅");
    }


    window.addTask = addTask;
    window.editTask = function (id) { showTaskModal(id); };


    [
        "newTaskButton",
        "dashboardAddTask",
        "newTaskPageButton"
    ].forEach(id => {

        const button =
            document.getElementById(id);

        if (button) {

            button.addEventListener(
                "click",
                showTaskModal
            );
        }
    });


    let currentTaskFilter =
        "all";


    function renderTaskItem(
        task,
        showDelete = true
    ) {

        const subject =
            getSubject(task.subject);


        return `
            <div
                class="task-item
                ${task.completed ? "completed" : ""}">

                <div class="task-check">

                    <button
                        type="button"
                        class="small-button"
                        onclick="toggleTask(${Number(task.id)})"
                        title="${
                            task.completed
                                ? "Desmarcar tarefa"
                                : "Marcar como concluída"
                        }">

                        ${
                            task.completed
                                ? "✓"
                                : "○"
                        }

                    </button>

                </div>


                <span
                    class="task-subject ${subject.className}">

                    ${subject.icon}
                    ${escapeHTML(subject.name)}

                </span>


                <span class="task-title">

                    ${escapeHTML(task.name)}

                </span>


                <span class="task-date">

                    ${formatDate(task.date)}

                </span>
                ${task.priority === "alta" ? '<span class="task-priority-high" title="Prioridade alta">🔴 Alta</span>' : ""}
                ${task.description ? `<span class="task-description-preview" title="${escapeHTML(task.description)}">${escapeHTML(task.description)}</span>` : ""}

                ${
                    showDelete
                        ? `
                            <button type="button" class="small-button" onclick="editTask(${Number(task.id)})" title="Editar atividade" aria-label="Editar atividade">✏️</button>
                            <button
                                type="button"
                                class="small-button"
                                onclick="deleteTask(${Number(task.id)})"
                                title="Excluir tarefa">

                                🗑️

                            </button>
                        `
                        : ""
                }

            </div>
        `;
    }


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


        saveTasks(tasks);

        updateEverything();
    }


    window.toggleTask =
        toggleTask;


    function deleteTask(id) {

        if (
            !confirm(
                "Deseja realmente excluir esta tarefa?"
            )
        ) {
            return;
        }


        const tasks =
            getTasks().filter(
                task =>
                    Number(task.id) !==
                    Number(id)
            );


        saveTasks(tasks);

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
                `${getAllSubjects().length} Disciplinas`;
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
            "Prova adicionada com sucesso! 📚"
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


        grid.innerHTML = `
            <button type="button" class="btn-primary" id="addSubjectButton" style="grid-column:1/-1; justify-self:start; margin-bottom:4px;">+ Adicionar matéria</button>
            ${getAllSubjects().map(
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
                                onclick="showSubjectModal('${escapeHTML(subject.name)}')"
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
                ).join("")}
        `;
        const addSubjectButton = document.getElementById("addSubjectButton");
        if (addSubjectButton) addSubjectButton.addEventListener("click", showAddSubjectModal);
    }

    function showAddSubjectModal() {
        openModal("Adicionar matéria", `
            <form id="customSubjectForm" class="modal-form">
                <label for="customSubjectName">Nome da matéria</label>
                <input id="customSubjectName" type="text" maxlength="50" placeholder="Ex.: Filosofia" required>
                <label for="customSubjectIcon">Ícone (opcional)</label>
                <input id="customSubjectIcon" type="text" maxlength="8" placeholder="📘">
                <button type="submit" class="btn-primary">Salvar matéria</button>
            </form>`);
        const form = document.getElementById("customSubjectForm");
        if (!form) return;
        form.addEventListener("submit", event => {
            event.preventDefault();
            const name = document.getElementById("customSubjectName").value.trim();
            const icon = document.getElementById("customSubjectIcon").value.trim() || "📘";
            if (!name) return;
            if (getAllSubjects().some(subject => subject.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) {
                alert("Essa matéria já está cadastrada.");
                return;
            }
            const subjects = getCustomSubjects();
            subjects.push({ name, icon, className: "portuguese", custom: true, createdAt: new Date().toISOString() });
            saveCustomSubjects(subjects);
            closeModal();
            renderSubjects();
            updateEverything();
            alert("Matéria adicionada com sucesso! 📚");
        });
    }

    function editSubject(subjectName) {
        const subject = getSubject(subjectName);
        const newName = prompt("Nome da matéria:", subject.name);
        if (newName === null) return;
        const name = newName.trim();
        if (!name) { alert("O nome da matéria não pode ficar vazio."); return; }
        const duplicate = getAllSubjects().some(item => item.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR") && item.name !== subjectName);
        if (duplicate) { alert("Já existe uma matéria com esse nome."); return; }
        const newIcon = prompt("Ícone ou emoji da matéria:", subject.icon || "📘");
        if (newIcon === null) return;
        if (subject.custom) {
            const custom = getCustomSubjects();
            const item = custom.find(entry => entry.name === subjectName);
            if (!item) return;
            item.name = name;
            item.icon = newIcon.trim() || "📘";
            saveCustomSubjects(custom);
        } else {
            // As disciplinas padrão podem ser renomeadas sem removê-las da lista padrão.
            const custom = getCustomSubjects();
            custom.push({ name, icon: newIcon.trim() || subject.icon, className: subject.className || "portuguese", custom: true, createdAt: new Date().toISOString() });
            saveCustomSubjects(custom);
            alert("As matérias padrão continuam disponíveis. A nova versão foi adicionada como matéria personalizada para preservar os dados originais.");
        }
        const allContents = getSubjectContents();
        if (name !== subjectName && Object.prototype.hasOwnProperty.call(allContents, subjectName)) {
            allContents[name] = [...(allContents[name] || []), ...allContents[subjectName]];
            delete allContents[subjectName];
            saveSubjectContents(allContents);
        }
        // Atualiza o vínculo das atividades e provas sem apagar seus registros.
        saveTasks(getTasks().map(item => item.subject === subjectName ? { ...item, subject: name } : item));
        saveExams(getExams().map(item => item.subject === subjectName ? { ...item, subject: name } : item));
        closeModal();
        updateEverything();
        if (getAllSubjects().some(item => item.name === name)) showSubjectModal(name);
    }
    window.editSubject = editSubject;

    function deleteCustomSubject(subjectName) {
        const subject = getCustomSubjects().find(item => item.name === subjectName);
        if (!subject) { alert("As matérias padrão não podem ser excluídas."); return; }
        const usedTasks = getTasks().filter(item => item.subject === subjectName).length;
        const usedExams = getExams().filter(item => item.subject === subjectName).length;
        const usedContents = getContentsForSubject(subjectName).length;
        const message = `Excluir a matéria "${subjectName}"? ${usedTasks} atividade(s), ${usedExams} prova(s) e ${usedContents} conteúdo(s) estão vinculados. Os registros serão mantidos, mas ficarão sem essa matéria.`;
        if (!confirm(message)) return;
        saveCustomSubjects(getCustomSubjects().filter(item => item.name !== subjectName));
        const allContents = getSubjectContents();
        delete allContents[subjectName];
        saveSubjectContents(allContents);
        saveTasks(getTasks().map(item => item.subject === subjectName ? { ...item, subject: "Sem matéria" } : item));
        saveExams(getExams().map(item => item.subject === subjectName ? { ...item, subject: "Sem matéria" } : item));
        closeModal();
        updateEverything();
    }
    window.deleteCustomSubject = deleteCustomSubject;

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
                            ${escapeHTML(subject.name)}
                        </h3>
                        <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:8px;">
                            <button type="button" class="btn-secondary" onclick="editSubject('${escapeHTML(subjectName)}')">✏️ Editar matéria</button>
                            ${subject.custom ? `<button type="button" class="btn-secondary" onclick="deleteCustomSubject('${escapeHTML(subjectName)}')">🗑️ Excluir matéria</button>` : ""}
                        </div>

                        <p>
                            Progresso:
                            <strong>
                                ${progress}%
                            </strong>
                        </p>

                    </div>


                    <form
                        id="subjectContentForm"
                        class="modal-form">

                        <label
                            for="subjectContentInput">

                            Adicionar conteúdo estudado

                        </label>


                        <textarea
                            id="subjectContentInput"
                            rows="3"
                            maxlength="3000"
                            placeholder="Escreva o conteúdo, resumo ou anotação..."
                            required
                        ></textarea>


                        <button
                            type="submit"
                            class="btn-primary">

                            + Adicionar conteúdo

                        </button>

                    </form>


                    <div
                        style="
                            margin-top:20px;
                        ">

                        <h4>
                            📚 Conteúdos
                        </h4>


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
                                            <div
                                                style="
                                                    display:flex;
                                                    align-items:center;
                                                    justify-content:space-between;
                                                    gap:10px;
                                                    padding:10px 0;
                                                    border-bottom:1px solid #eee;
                                                ">

                                                <span>
                                                    📖
                                                    ${escapeHTML(
                                                        content.text
                                                    )}
                                                </span>


                                                <button type="button" class="small-button" title="Editar conteúdo" onclick="editSubjectContent('${escapeHTML(subjectName)}', ${Number(content.id)})">✏️</button>
                                                <button
                                                    type="button"
                                                    class="small-button"
                                                    title="Excluir conteúdo"
                                                    onclick="deleteSubjectContent(
                                                        '${escapeHTML(subjectName)}',
                                                        ${Number(content.id)}
                                                    )">

                                                    🗑️

                                                </button>

                                            </div>
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


        if (!form) return;


        form.addEventListener(
            "submit",
            event => {

                event.preventDefault();


                const input =
                    document.getElementById(
                        "subjectContentInput"
                    );


                const content =
                    input.value.trim();


                if (!content) {

                    alert(
                        "Digite um conteúdo."
                    );

                    return;
                }


                addSubjectContent(
                    subjectName,
                    content
                );


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

    let timerRunning =
        false;


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

                                📝 Adicionar tarefa

                            </button>


                            <button
                                type="button"
                                class="btn-secondary"
                                id="calendarAddExam">

                                📚 Adicionar prova

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