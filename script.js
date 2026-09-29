document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       CONFIGURAÇÕES
    ========================================================= */

    const STORAGE = {
        tasks: "comfortTasks",
        exams: "comfortExams",
        notices: "comfortNotices",
        studySeconds: "comfortStudySeconds"
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


    /* =========================================================
       LOCAL STORAGE
    ========================================================= */

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


    /* =========================================================
       SEGURANÇA / FORMATAÇÃO
    ========================================================= */

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

        const date = new Date(`${dateString}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleDateString("pt-BR");
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

        const today = new Date(`${getTodayString()}T00:00:00`);
        const date = new Date(`${dateString}T00:00:00`);

        const difference = date.getTime() - today.getTime();

        return Math.round(
            difference / (1000 * 60 * 60 * 24)
        );
    }

    function getDaysLabel(dateString) {
        const days = getDaysUntil(dateString);

        if (days < 0) return "Passada";
        if (days === 0) return "Hoje";
        if (days === 1) return "Amanhã";

        return `Em ${days} dias`;
    }


    /* =========================================================
       NAVEGAÇÃO
    ========================================================= */

    function openPage(page) {

        document.querySelectorAll(".page-section").forEach(section => {
            section.classList.remove("active-page");
            section.style.display = "none";
        });

        const selectedPage = document.getElementById(`page-${page}`);

        if (selectedPage) {
            selectedPage.classList.add("active-page");
            selectedPage.style.display = "block";
        }

        document.querySelectorAll("[data-page]").forEach(item => {
            item.classList.remove("active");
        });

        document
            .querySelectorAll(`[data-page="${page}"]`)
            .forEach(item => {
                item.classList.add("active");
            });

        const title = document.getElementById("page-title");

        if (title) {
            title.textContent = pageNames[page] || "ComfortStudy";
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

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    window.openPage = openPage;

    document.querySelectorAll("[data-page]").forEach(button => {

        button.addEventListener("click", event => {
            event.preventDefault();

            const page = button.getAttribute("data-page");

            if (page) {
                openPage(page);
            }
        });

    });


    /* =========================================================
       MODAL
    ========================================================= */

    const modal = document.getElementById("modal");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");
    const closeModalButton = document.getElementById("closeModal");

    function openModal(title, content) {

        if (!modal) return;

        if (modalTitle) {
            modalTitle.textContent = title;
        }

        if (modalBody) {
            modalBody.innerHTML = content;
        }

        modal.classList.add("show");
        modal.classList.add("active");
        modal.style.display = "flex";
    }

    function closeModal() {

        if (!modal) return;

        modal.classList.remove("show");
        modal.classList.remove("active");
        modal.style.display = "none";
    }

    window.openModal = openModal;
    window.closeModal = closeModal;

    if (closeModalButton) {
        closeModalButton.addEventListener("click", closeModal);
    }

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }
    });


    /* =========================================================
       TAREFAS
    ========================================================= */

    function taskForm() {

        return `
            <form id="taskForm" class="modal-form">

                <label for="taskName">
                    Nome da tarefa
                </label>

                <input
                    type="text"
                    id="taskName"
                    placeholder="Ex: Fazer exercícios de matemática"
                    required
                >

                <label for="taskSubject">
                    Matéria
                </label>

                <select id="taskSubject" required>

                    <option value="">
                        Selecione a matéria
                    </option>

                    ${FIXED_SUBJECTS.map(subject => `
                        <option value="${escapeHTML(subject.name)}">
                            ${escapeHTML(subject.name)}
                        </option>
                    `).join("")}

                </select>

                <label for="taskDate">
                    Data
                </label>

                <input
                    type="date"
                    id="taskDate"
                    min="${getTodayString()}"
                    required
                >

                <button
                    type="submit"
                    class="btn-primary">

                    Adicionar tarefa

                </button>

            </form>
        `;
    }

    function showTaskModal() {

        openModal("Nova Tarefa", taskForm());

        const form = document.getElementById("taskForm");

        if (form) {
            form.addEventListener("submit", event => {
                event.preventDefault();
                addTask();
            });
        }
    }

    function addTask() {

        const nameInput = document.getElementById("taskName");
        const subjectInput = document.getElementById("taskSubject");
        const dateInput = document.getElementById("taskDate");

        if (!nameInput || !subjectInput || !dateInput) {
            return;
        }

        const name = nameInput.value.trim();
        const subject = subjectInput.value;
        const date = dateInput.value;

        if (!name || !subject || !date) {
            alert("Preencha todos os campos.");
            return;
        }

        const tasks = getTasks();

        tasks.push({
            id: Date.now(),
            name,
            subject,
            date,
            completed: false,
            createdAt: new Date().toISOString()
        });

        saveTasks(tasks);

        closeModal();
        updateEverything();

        alert("Tarefa adicionada com sucesso! ✅");
    }

    window.addTask = addTask;


    [
        "newTaskButton",
        "dashboardAddTask",
        "newTaskPageButton"
    ].forEach(id => {

        const button = document.getElementById(id);

        if (button) {
            button.addEventListener("click", showTaskModal);
        }

    });


    let currentTaskFilter = "all";

    function renderTasks() {

        const list = document.getElementById("fullTaskList");

        if (!list) return;

        const searchInput = document.getElementById("taskSearch");

        const search = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        let tasks = getTasks();

        if (search) {
            tasks = tasks.filter(task =>
                String(task.name)
                    .toLowerCase()
                    .includes(search) ||
                String(task.subject)
                    .toLowerCase()
                    .includes(search)
            );
        }

        if (currentTaskFilter === "pending") {
            tasks = tasks.filter(task => !task.completed);
        }

        if (currentTaskFilter === "completed") {
            tasks = tasks.filter(task => task.completed);
        }

        tasks.sort((a, b) => {

            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }

            return String(a.date).localeCompare(
                String(b.date)
            );
        });

        if (tasks.length === 0) {

            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>

                    <h3>
                        Nenhuma tarefa encontrada
                    </h3>

                    <p>
                        ${
                            search
                                ? "Tente pesquisar outro termo."
                                : "Adicione uma nova tarefa para começar."
                        }
                    </p>
                </div>
            `;

            return;
        }

        list.innerHTML = tasks.map(task => {

            const safeId = Number(task.id);

            return `
                <div class="task-item ${task.completed ? "completed" : ""}">

                    <div class="task-check">

                        <button
                            type="button"
                            class="task-check-button"
                            onclick="toggleTask(${safeId})"
                            aria-label="Concluir tarefa">

                            ${task.completed ? "✓" : ""}

                        </button>

                    </div>

                    <div class="task-info">

                        <strong>
                            ${escapeHTML(task.name)}
                        </strong>

                        <span>
                            ${escapeHTML(task.subject)}
                        </span>

                    </div>

                    <div class="task-date">
                        ${formatDate(task.date)}
                    </div>

                    <button
                        type="button"
                        class="delete-button"
                        onclick="deleteTask(${safeId})"
                        title="Excluir tarefa">

                        🗑️

                    </button>

                </div>
            `;

        }).join("");
    }

    function toggleTask(id) {

        const tasks = getTasks();

        const task = tasks.find(
            item => Number(item.id) === Number(id)
        );

        if (!task) return;

        task.completed = !task.completed;

        if (task.completed) {
            task.completedAt = new Date().toISOString();
        } else {
            delete task.completedAt;
        }

        saveTasks(tasks);

        updateEverything();
    }

    window.toggleTask = toggleTask;


    function deleteTask(id) {

        if (!confirm("Deseja realmente excluir esta tarefa?")) {
            return;
        }

        const tasks = getTasks().filter(
            task => Number(task.id) !== Number(id)
        );

        saveTasks(tasks);

        updateEverything();
    }

    window.deleteTask = deleteTask;


    const taskSearch = document.getElementById("taskSearch");

    if (taskSearch) {
        taskSearch.addEventListener("input", renderTasks);
    }

    document.querySelectorAll(".filter").forEach(button => {

        button.addEventListener("click", () => {

            document
                .querySelectorAll(".filter")
                .forEach(item => item.classList.remove("active"));

            button.classList.add("active");

            currentTaskFilter =
                button.dataset.filter || "all";

            renderTasks();
        });

    });


    /* =========================================================
       DASHBOARD
    ========================================================= */

    function updateDashboard() {

        const tasks = getTasks();
        const exams = getExams();
        const notices = getNotices();

        const pending = tasks.filter(
            task => !task.completed
        ).length;

        const completed = tasks.filter(
            task => task.completed
        ).length;


        const prazo = document.getElementById(
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


        const concluidas = document.getElementById(
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


        const materias = document.getElementById(
            "dashboard-materias"
        );

        if (materias) {
            materias.textContent =
                `${FIXED_SUBJECTS.length} Disciplinas`;
        }


        /* TAREFAS DO DASHBOARD */

        const dashboardTaskList =
            document.getElementById("dashboardTaskList");

        if (dashboardTaskList) {

            const pendingTasks = tasks
                .filter(task => !task.completed)
                .sort((a, b) =>
                    String(a.date).localeCompare(
                        String(b.date)
                    )
                )
                .slice(0, 5);

            if (pendingTasks.length === 0) {

                dashboardTaskList.innerHTML = `
                    <div class="empty-state">

                        <div class="empty-icon">
                            ✓
                        </div>

                        <h3>
                            Nenhuma tarefa pendente
                        </h3>

                        <p>
                            Você está em dia!
                        </p>

                    </div>
                `;

            } else {

                dashboardTaskList.innerHTML =
                    pendingTasks.map(task => `

                        <div class="task-item">

                            <div class="task-check">

                                <button
                                    type="button"
                                    class="task-check-button"
                                    onclick="toggleTask(${Number(task.id)})">

                                </button>

                            </div>

                            <div class="task-info">

                                <strong>
                                    ${escapeHTML(task.name)}
                                </strong>

                                <span>
                                    ${escapeHTML(task.subject)}
                                </span>

                            </div>

                            <div class="task-date">
                                ${formatDate(task.date)}
                            </div>

                        </div>

                    `).join("");
            }
        }


        /* PROVAS DO DASHBOARD */

        const dashboardExamList =
            document.getElementById("dashboardExamList");

        if (dashboardExamList) {

            const today = getTodayString();

            const upcomingExams = exams
                .filter(exam =>
                    exam.date &&
                    exam.date >= today
                )
                .sort((a, b) =>
                    String(a.date).localeCompare(
                        String(b.date)
                    )
                )
                .slice(0, 5);

            if (upcomingExams.length === 0) {

                dashboardExamList.innerHTML = `
                    <div class="empty-state">

                        <div class="empty-icon">
                            📅
                        </div>

                        <h3>
                            Nenhuma prova cadastrada
                        </h3>

                        <p>
                            Cadastre uma prova para acompanhar.
                        </p>

                    </div>
                `;

            } else {

                dashboardExamList.innerHTML =
                    upcomingExams.map(exam => `

                        <div class="exam-preview">

                            <div class="exam-icon">
                                📝
                            </div>

                            <div>

                                <strong>
                                    ${escapeHTML(exam.name)}
                                </strong>

                                <p>
                                    ${escapeHTML(exam.subject)}
                                    • ${formatDate(exam.date)}
                                </p>

                            </div>

                            <div class="days-left">

                                <strong>
                                    ${
                                        getDaysUntil(exam.date) < 0
                                            ? "-"
                                            : getDaysUntil(exam.date)
                                    }
                                </strong>

                                <span>
                                    ${
                                        getDaysUntil(exam.date) === 0
                                            ? "hoje"
                                            : "dias"
                                    }
                                </span>

                            </div>

                        </div>

                    `).join("");
            }
        }


        /* AVISOS DO DASHBOARD */

        const dashboardNoticeList =
            document.getElementById("dashboardNoticeList");

        if (dashboardNoticeList) {

            const latestNotices = notices.slice(0, 3);

            if (latestNotices.length === 0) {

                dashboardNoticeList.innerHTML = `
                    <div class="empty-state">

                        <div class="empty-icon">
                            🔔
                        </div>

                        <h3>
                            Nenhum aviso
                        </h3>

                        <p>
                            Você não possui avisos no momento.
                        </p>

                    </div>
                `;

            } else {

                dashboardNoticeList.innerHTML =
                    latestNotices.map(notice => `

                        <div class="notice">

                            <i class="ph ph-bell"></i>

                            <div>

                                <strong>
                                    ${escapeHTML(notice.title)}
                                </strong>

                                <p>
                                    ${escapeHTML(notice.message)}
                                </p>

                            </div>

                        </div>

                    `).join("");
            }
        }


        updateNotificationCount();
    }


    /* =========================================================
       PROVAS
    ========================================================= */

    function examForm() {

        return `
            <form id="examForm" class="modal-form">

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

                <select id="examSubject" required>

                    <option value="">
                        Selecione a matéria
                    </option>

                    ${FIXED_SUBJECTS.map(subject => `
                        <option value="${escapeHTML(subject.name)}">
                            ${escapeHTML(subject.name)}
                        </option>
                    `).join("")}

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

        openModal("Nova Prova", examForm());

        const form = document.getElementById("examForm");

        if (form) {

            form.addEventListener("submit", event => {

                event.preventDefault();

                addExam();

            });

        }
    }

    function addExam() {

        const nameInput =
            document.getElementById("examName");

        const subjectInput =
            document.getElementById("examSubject");

        const dateInput =
            document.getElementById("examDate");

        if (!nameInput || !subjectInput || !dateInput) {
            return;
        }

        const name = nameInput.value.trim();
        const subject = subjectInput.value;
        const date = dateInput.value;

        if (!name || !subject || !date) {

            alert("Preencha todos os campos.");

            return;
        }

        const exams = getExams();

        exams.push({
            id: Date.now(),
            name,
            subject,
            date,
            createdAt: new Date().toISOString()
        });

        saveExams(exams);

        closeModal();
        updateEverything();

        alert("Prova adicionada com sucesso! 📚");
    }

    window.addExam = addExam;


    const newExamButton =
        document.getElementById("newExamButton");

    if (newExamButton) {
        newExamButton.addEventListener(
            "click",
            showExamModal
        );
    }


    function renderExams() {

        const list =
            document.getElementById("examList");

        if (!list) return;

        const exams = [...getExams()].sort((a, b) =>
            String(a.date).localeCompare(
                String(b.date)
            )
        );

        if (exams.length === 0) {

            list.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        📝
                    </div>

                    <h3>
                        Nenhuma prova cadastrada
                    </h3>

                    <p>
                        Adicione uma prova para começar.
                    </p>

                </div>
            `;

            return;
        }

        list.innerHTML =
            exams.map(exam => `

                <div class="exam-preview">

                    <div class="exam-icon">
                        📝
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(exam.name)}
                        </strong>

                        <p>
                            ${escapeHTML(exam.subject)}
                            • ${formatDate(exam.date)}
                        </p>

                        <small>
                            ${getDaysLabel(exam.date)}
                        </small>

                    </div>

                    <button
                        type="button"
                        class="delete-button"
                        onclick="deleteExam(${Number(exam.id)})"
                        title="Excluir prova">

                        🗑️

                    </button>

                </div>

            `).join("");
    }

    function deleteExam(id) {

        if (!confirm("Deseja realmente excluir esta prova?")) {
            return;
        }

        const exams = getExams().filter(
            exam => Number(exam.id) !== Number(id)
        );

        saveExams(exams);

        updateEverything();
    }

    window.deleteExam = deleteExam;


    /* =========================================================
       MATÉRIAS
    ========================================================= */

    function getSubjectProgress(subjectName) {

        const subjectTasks = getTasks().filter(task =>
            String(task.subject).toLowerCase() ===
            String(subjectName).toLowerCase()
        );

        if (subjectTasks.length === 0) {
            return 0;
        }

        const completed = subjectTasks.filter(
            task => task.completed
        ).length;

        return Math.round(
            (completed / subjectTasks.length) * 100
        );
    }


    function renderSubjects() {

        const grid =
            document.getElementById("subjectsGrid");

        if (!grid) return;

        grid.innerHTML =
            FIXED_SUBJECTS.map(subject => {

                const progress =
                    getSubjectProgress(subject.name);

                return `
                    <div class="subject-card">

                        <div
                            class="subject-color ${subject.className}">
                        </div>

                        <div class="subject-icon">
                            ${subject.icon}
                        </div>

                        <h3>
                            ${escapeHTML(subject.name)}
                        </h3>

                        <p>
                            Progresso baseado nas tarefas concluídas
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

            }).join("");
    }


    /* =========================================================
       DESEMPENHO
    ========================================================= */

    function formatStudyTime(seconds) {

        seconds = Number(seconds) || 0;

        const hours = Math.floor(seconds / 3600);

        const minutes = Math.floor(
            (seconds % 3600) / 60
        );

        if (hours > 0) {
            return `${hours}h ${minutes}min`;
        }

        return `${minutes}min`;
    }


    function getPerformanceData() {

        const tasks = getTasks();

        const totalTasks = tasks.length;

        const completedTasks = tasks.filter(
            task => task.completed
        ).length;

        const percentage =
            totalTasks === 0
                ? 0
                : Math.round(
                    (completedTasks / totalTasks) * 100
                );

        return {
            totalTasks,
            completedTasks,
            percentage,
            studySeconds: getStudySeconds()
        };
    }


    function getEvolution() {

        const tasks = getTasks();

        if (tasks.length === 0) {
            return 0;
        }

        const completedTasks = tasks.filter(
            task => task.completed
        );

        if (completedTasks.length === 0) {
            return 0;
        }

        const now = Date.now();

        const sevenDays =
            7 * 24 * 60 * 60 * 1000;

        const recentCompleted =
            completedTasks.filter(task => {

                if (!task.completedAt) {
                    return false;
                }

                const completedAt =
                    new Date(task.completedAt).getTime();

                return (
                    now - completedAt >= 0 &&
                    now - completedAt <= sevenDays
                );

            }).length;

        return Math.round(
            (recentCompleted / completedTasks.length) * 100
        );
    }


    function updatePerformance() {

        const data = getPerformanceData();

        const performanceTasks =
            document.getElementById("performanceTasks");

        if (performanceTasks) {
            performanceTasks.textContent =
                data.completedTasks;
        }


        const performanceCards =
            document.querySelectorAll(".performance-card");


        /* CARD 1 */

        if (performanceCards[0]) {

            const strong =
                performanceCards[0]
                    .querySelector("strong");

            if (strong) {
                strong.textContent =
                    data.completedTasks;
            }
        }


        /* CARD 2 */

        if (performanceCards[1]) {

            const strong =
                performanceCards[1]
                    .querySelector("strong");

            if (strong) {

                strong.textContent =
                    formatStudyTime(
                        data.studySeconds
                    );
            }
        }


        /* CARD 3 */

        if (performanceCards[2]) {

            const strong =
                performanceCards[2]
                    .querySelector("strong");

            if (strong) {

                strong.textContent =
                    `+${getEvolution()}%`;
            }
        }


        /* DESEMPENHO POR MATÉRIA */

        const subjectList =
            document.getElementById(
                "performanceSubjectList"
            );

        if (!subjectList) return;

        subjectList.innerHTML =
            FIXED_SUBJECTS.map(subject => {

                const progress =
                    getSubjectProgress(
                        subject.name
                    );

                return `
                    <div class="performance-row">

                        <span>
                            ${escapeHTML(subject.name)}
                        </span>

                        <div class="performance-bar">

                            <span
                                style="width:${progress}%">
                            </span>

                        </div>

                        <strong>
                            ${progress}%
                        </strong>

                    </div>
                `;

            }).join("");
    }


    /* =========================================================
       CRONÔMETRO
    ========================================================= */

    let timerSeconds = 25 * 60;
    let timerInterval = null;
    let timerRunning = false;


    function updateTimerDisplay() {

        const display =
            document.getElementById("timerDisplay");

        if (!display) return;

        const minutes =
            Math.floor(timerSeconds / 60);

        const seconds =
            timerSeconds % 60;

        display.textContent =
            `${String(minutes).padStart(2, "0")}:${String(
                seconds
            ).padStart(2, "0")}`;
    }


    function startTimer() {

        if (timerRunning) return;

        if (timerSeconds <= 0) {
            timerSeconds = 25 * 60;
        }

        timerRunning = true;

        timerInterval = setInterval(() => {

            if (timerSeconds <= 0) {
                pauseTimer();
                return;
            }

            timerSeconds--;

            saveStudySeconds(
                getStudySeconds() + 1
            );

            updateTimerDisplay();
            updatePerformance();

            if (timerSeconds <= 0) {

                pauseTimer();

                alert(
                    "Tempo de estudo concluído! 🎉"
                );
            }

        }, 1000);
    }


    function pauseTimer() {

        timerRunning = false;

        if (timerInterval !== null) {

            clearInterval(timerInterval);

            timerInterval = null;
        }
    }


    function resetTimer() {

        pauseTimer();

        timerSeconds = 25 * 60;

        updateTimerDisplay();
    }


    const startTimerButton =
        document.getElementById("startTimer");

    const pauseTimerButton =
        document.getElementById("pauseTimer");

    const resetTimerButton =
        document.getElementById("resetTimer");


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
        .querySelectorAll(".timer-presets button")
        .forEach(button => {

            button.addEventListener("click", () => {

                const time =
                    Number(button.dataset.time);

                if (!Number.isFinite(time) || time <= 0) {
                    return;
                }

                pauseTimer();

                timerSeconds =
                    time * 60;

                updateTimerDisplay();
            });

        });


    /* =========================================================
       CALENDÁRIO
    ========================================================= */

    const calendarNow = new Date();

    let currentCalendarYear =
        calendarNow.getFullYear();

    let currentCalendarMonth =
        calendarNow.getMonth();


    function createCalendar() {

        const calendar =
            document.getElementById("calendarDays");

        if (!calendar) return;

        const monthTitle =
            document.getElementById("calendarMonth");

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


        /*
            JavaScript:
            Domingo = 0
            Segunda = 1
            ...

            Como o calendário começa na SEGUNDA,
            transformamos para:
            Segunda = 0
            Domingo = 6
        */

        const firstWeekday =
            (firstDay.getDay() + 6) % 7;


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
                monthName.charAt(0).toUpperCase() +
                monthName.slice(1);

            monthTitle.textContent =
                monthName;
        }


        const tasks = getTasks();
        const exams = getExams();

        let html = "";


        /* DIAS DO MÊS ANTERIOR */

        const previousLastDay =
            new Date(
                currentCalendarYear,
                currentCalendarMonth,
                0
            ).getDate();

        for (
            let i = firstWeekday - 1;
            i >= 0;
            i--
        ) {

            const day =
                previousLastDay - i;

            html += `
                <div class="calendar-day other-month">
                    <span>${day}</span>
                </div>
            `;
        }


        /* DIAS DO MÊS ATUAL */

        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {

            const dateString =
                `${currentCalendarYear}-${String(
                    currentCalendarMonth + 1
                ).padStart(2, "0")}-${String(
                    day
                ).padStart(2, "0")}`;


            const dayTasks =
                tasks.filter(
                    task => task.date === dateString
                );


            const dayExams =
                exams.filter(
                    exam => exam.date === dateString
                );


            const hasTask =
                dayTasks.length > 0;

            const hasExam =
                dayExams.length > 0;

            const isToday =
                dateString === getTodayString();


            html += `
                <div
                    class="calendar-day
                    ${isToday ? "today" : ""}
                    ${hasTask ? "has-task" : ""}
                    ${hasExam ? "has-exam" : ""}"
                    data-date="${dateString}">

                    <span class="calendar-number">
                        ${day}
                    </span>

                    ${
                        hasTask || hasExam
                            ? `
                                <div class="calendar-indicators">

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

                                </div>
                            `
                            : ""
                    }

                    <div class="calendar-events">

                        ${dayTasks
                            .slice(0, 3)
                            .map(task => `
                                <div
                                    class="calendar-event task"
                                    title="${escapeHTML(task.name)}">

                                    ${escapeHTML(task.name)}

                                </div>
                            `)
                            .join("")}

                        ${dayExams
                            .slice(0, 3)
                            .map(exam => `
                                <div
                                    class="calendar-event exam"
                                    title="${escapeHTML(exam.name)}">

                                    ${escapeHTML(exam.name)}

                                </div>
                            `)
                            .join("")}

                    </div>

                </div>
            `;
        }


        /* DIAS DO PRÓXIMO MÊS */

        const totalCells =
            firstWeekday + daysInMonth;

        const remaining =
            (7 - (totalCells % 7)) % 7;

        for (
            let day = 1;
            day <= remaining;
            day++
        ) {

            html += `
                <div class="calendar-day other-month">
                    <span>${day}</span>
                </div>
            `;
        }


        calendar.innerHTML = html;


        calendar
            .querySelectorAll(
                ".calendar-day:not(.other-month)"
            )
            .forEach(dayElement => {

                dayElement.addEventListener(
                    "click",
                    () => {

                        const date =
                            dayElement.dataset.date;

                        if (date) {
                            showCalendarDay(date);
                        }

                    }
                );

            });
    }


    function showCalendarDay(date) {

        const tasks =
            getTasks().filter(
                task => task.date === date
            );

        const exams =
            getExams().filter(
                exam => exam.date === date
            );


        let content = `
            <div class="calendar-day-details">

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

            if (tasks.length > 0) {

                content += `
                    <h4>
                        📝 Tarefas
                    </h4>

                    <div class="day-list">
                `;

                tasks.forEach(task => {

                    content += `
                        <div class="day-event task">

                            <strong>
                                ${escapeHTML(task.name)}
                            </strong>

                            <span>
                                ${escapeHTML(task.subject)}
                            </span>

                            <small>
                                ${
                                    task.completed
                                        ? "✓ Concluída"
                                        : "Pendente"
                                }
                            </small>

                        </div>
                    `;

                });

                content += `</div>`;
            }


            if (exams.length > 0) {

                content += `
                    <h4>
                        📚 Provas
                    </h4>

                    <div class="day-list">
                `;

                exams.forEach(exam => {

                    content += `
                        <div class="day-event exam">

                            <strong>
                                ${escapeHTML(exam.name)}
                            </strong>

                            <span>
                                ${escapeHTML(exam.subject)}
                            </span>

                        </div>
                    `;

                });

                content += `</div>`;
            }
        }


        content += `</div>`;


        openModal(
            `Agenda — ${formatDate(date)}`,
            content
        );
    }


    const previousMonth =
        document.getElementById("previousMonth");

    if (previousMonth) {

        previousMonth.addEventListener(
            "click",
            () => {

                currentCalendarMonth--;

                if (currentCalendarMonth < 0) {

                    currentCalendarMonth = 11;
                    currentCalendarYear--;
                }

                createCalendar();
            }
        );
    }


    const nextMonth =
        document.getElementById("nextMonth");

    if (nextMonth) {

        nextMonth.addEventListener(
            "click",
            () => {

                currentCalendarMonth++;

                if (currentCalendarMonth > 11) {

                    currentCalendarMonth = 0;
                    currentCalendarYear++;
                }

                createCalendar();
            }
        );
    }


    /* =========================================================
       ADICIONAR PELO CALENDÁRIO
    ========================================================= */

    const calendarAddButton =
        document.getElementById("calendarAddButton");

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


    /* =========================================================
       AVISOS
    ========================================================= */

    function updateNotificationCount() {

        const count =
            document.getElementById(
                "notificationCount"
            );

        if (!count) return;

        const total =
            getNotices().length;

        count.textContent = total;

        count.style.display =
            total > 0
                ? "flex"
                : "none";
    }


    function renderNotices() {

        const container =
            document.getElementById("noticeList");

        const dashboardContainer =
            document.getElementById(
                "dashboardNoticeList"
            );

        const notices =
            getNotices();


        /* PÁGINA DE AVISOS */

        if (container) {

            if (notices.length === 0) {

                container.innerHTML = `
                    <div class="empty-state">

                        <div class="empty-icon">
                            🔔
                        </div>

                        <h3>
                            Nenhum aviso
                        </h3>

                        <p>
                            Você não possui avisos no momento.
                        </p>

                    </div>
                `;

            } else {

                container.innerHTML =
                    notices.map(notice => `

                        <div class="notice">

                            <i class="ph ph-bell"></i>

                            <div>

                                <strong>
                                    ${escapeHTML(notice.title)}
                                </strong>

                                <p>
                                    ${escapeHTML(notice.message)}
                                </p>

                            </div>

                        </div>

                    `).join("");
            }
        }


        /* AVISOS DO DASHBOARD */

        if (dashboardContainer) {

            const latest =
                notices.slice(0, 3);

            if (latest.length === 0) {

                dashboardContainer.innerHTML = `
                    <div class="empty-state">

                        <div class="empty-icon">
                            🔔
                        </div>

                        <h3>
                            Nenhum aviso
                        </h3>

                        <p>
                            Você não possui avisos no momento.
                        </p>

                    </div>
                `;

            } else {

                dashboardContainer.innerHTML =
                    latest.map(notice => `

                        <div class="notice">

                            <i class="ph ph-bell"></i>

                            <div>

                                <strong>
                                    ${escapeHTML(notice.title)}
                                </strong>

                                <p>
                                    ${escapeHTML(notice.message)}
                                </p>

                            </div>

                        </div>

                    `).join("");
            }
        }


        updateNotificationCount();
    }


    /* NOVO AVISO */

    const newNoticeButton =
        document.getElementById("newNoticeButton");

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

                            <label for="noticeTitle">
                                Título
                            </label>

                            <input
                                type="text"
                                id="noticeTitle"
                                placeholder="Título do aviso"
                                required
                            >

                            <label for="noticeMessage">
                                Aviso
                            </label>

                            <textarea
                                id="noticeMessage"
                                placeholder="Digite o aviso..."
                                rows="5"
                                required></textarea>

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


                            if (!title || !message) {

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


                            saveNotices(notices);

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


    /* BOTÃO DE NOTIFICAÇÃO */

    const notificationButton =
        document.getElementById(
            "notificationButton"
        );

    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            () => {

                openPage("avisos");

            }
        );
    }


    /* =========================================================
       ATUALIZA TUDO
    ========================================================= */

    function updateEverything() {

        renderTasks();

        renderExams();

        renderSubjects();

        renderNotices();

        createCalendar();

        updateDashboard();

        updatePerformance();

        updateTimerDisplay();
    }


    /* =========================================================
       INICIALIZAÇÃO
    ========================================================= */

    renderTasks();

    renderExams();

    renderSubjects();

    renderNotices();

    createCalendar();

    updateDashboard();

    updatePerformance();

    updateTimerDisplay();

});