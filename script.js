/* =====================================================
   COMFORTSTUDY — SCRIPT PRINCIPAL
   ===================================================== */


/* =====================================================
   NAVEGAÇÃO ENTRE TELAS
   ===================================================== */

const menuLinks = document.querySelectorAll("[data-page]");
const pages = document.querySelectorAll(".page-section");
const pageTitle = document.getElementById("page-title");


const pageNames = {
    dashboard: "Visão Geral",
    materias: "Minhas Matérias",
    calendario: "Meu Calendário",
    tarefas: "Minhas Tarefas",
    provas: "Próximas Provas",
    cronometro: "Cronômetro de Estudos",
    avisos: "Meus Avisos",
    desempenho: "Meu Desempenho",
    premium: "ComfortStudy Premium",
    perfil: "Meu Perfil"
};


menuLinks.forEach(link => {

    link.addEventListener("click", function(event) {

        event.preventDefault();

        const page = this.dataset.page;

        openPage(page);

    });

});


function openPage(page) {

    pages.forEach(section => {
        section.classList.remove("active-page");
    });


    const selectedPage =
        document.getElementById(`page-${page}`);


    if (selectedPage) {
        selectedPage.classList.add("active-page");
    }


    if (pageTitle && pageNames[page]) {
        pageTitle.textContent = pageNames[page];
    }


    menuLinks.forEach(link => {

        link.classList.remove("active");

        if (link.dataset.page === page) {
            link.classList.add("active");
        }

    });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =====================================================
   MODAL
   ===================================================== */

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");


function openModal(title, content) {

    modalTitle.textContent = title;

    modalBody.innerHTML = content;

    modal.classList.add("show");

}


function hideModal() {

    modal.classList.remove("show");

}


closeModal.addEventListener("click", hideModal);


modal.addEventListener("click", function(event) {

    if (event.target === modal) {
        hideModal();
    }

});


/* =====================================================
   NOVA TAREFA
   ===================================================== */

function taskForm() {

    return `

        <form class="modal-form" id="taskForm">

            <label>Nome da tarefa</label>

            <input
                type="text"
                id="taskName"
                placeholder="Ex: Fazer exercícios de matemática"
                required
            >


            <label>Matéria</label>

            <select id="taskSubject">

                <option value="Matemática">
                    Matemática
                </option>

                <option value="Português">
                    Português
                </option>

                <option value="História">
                    História
                </option>

                <option value="Física">
                    Física
                </option>

                <option value="Química">
                    Química
                </option>

                <option value="Inglês">
                    Inglês
                </option>

            </select>


            <label>Data de entrega</label>

            <input
                type="date"
                id="taskDate"
                required
            >


            <button
                type="submit"
                class="btn-primary">

                <i class="ph ph-plus"></i>

                Adicionar Tarefa

            </button>

        </form>

    `;
}


function showTaskModal() {

    openModal(
        "Nova Tarefa",
        taskForm()
    );


    document
        .getElementById("taskForm")
        .addEventListener("submit", addTask);

}


function addTask(event) {

    event.preventDefault();


    const name =
        document.getElementById("taskName").value;

    const subject =
        document.getElementById("taskSubject").value;

    const date =
        document.getElementById("taskDate").value;


    const task = {
        id: Date.now(),
        name,
        subject,
        date,
        completed: false
    };


    const tasks =
        JSON.parse(localStorage.getItem("comfortTasks")) || [];


    tasks.push(task);


    localStorage.setItem(
        "comfortTasks",
        JSON.stringify(tasks)
    );


    hideModal();


    renderTasks();

    updateDashboard();


    alert("✅ Tarefa adicionada com sucesso!");

}


/* BOTÕES DE NOVA TAREFA */

document
    .getElementById("newTaskButton")
    .addEventListener("click", showTaskModal);


document
    .getElementById("dashboardAddTask")
    .addEventListener("click", showTaskModal);


document
    .getElementById("newTaskPageButton")
    .addEventListener("click", showTaskModal);


/* =====================================================
   RENDERIZAR TAREFAS
   ===================================================== */

function renderTasks() {

    const container =
        document.getElementById("fullTaskList");


    if (!container) return;


    const tasks =
        JSON.parse(localStorage.getItem("comfortTasks")) || [];


    container.innerHTML = "";


    if (tasks.length === 0) {

        container.innerHTML = `

            <div style="
                text-align:center;
                padding:40px;
                color:#718096;
            ">

                <i
                    class="ph ph-check-square"
                    style="
                        font-size:45px;
                        color:#3b82f6;
                    ">
                </i>

                <h3 style="margin-top:10px;">
                    Nenhuma tarefa adicionada
                </h3>

                <p style="margin-top:5px;">
                    Clique em "Nova Tarefa" para começar.
                </p>

            </div>

        `;

        return;

    }


    tasks.forEach(task => {

        const item =
            document.createElement("div");


        item.className =
            "task-item";


        if (task.completed) {
            item.classList.add("completed");
        }


        item.innerHTML = `

            <div class="task-subject ${getSubjectClass(task.subject)}">
                ${task.subject}
            </div>

            <div class="task-title">
                ${task.name}
            </div>

            <div class="task-date">
                ${formatDate(task.date)}
            </div>

            <button
                class="small-button"
                onclick="toggleTask(${task.id})">

                ${task.completed ? "Desfazer" : "Concluir"}

            </button>

        `;


        container.appendChild(item);

    });

}


/* =====================================================
   CONCLUIR TAREFA
   ===================================================== */

function toggleTask(id) {

    const tasks =
        JSON.parse(localStorage.getItem("comfortTasks")) || [];


    const task =
        tasks.find(item => item.id === id);


    if (!task) return;


    task.completed =
        !task.completed;


    localStorage.setItem(
        "comfortTasks",
        JSON.stringify(tasks)
    );


    renderTasks();

    updateDashboard();

}


/* =====================================================
   MATÉRIA — CORES
   ===================================================== */

function getSubjectClass(subject) {

    const classes = {

        "Matemática": "math",

        "Português": "portuguese",

        "História": "history",

        "Física": "math",

        "Química": "history",

        "Inglês": "portuguese"

    };


    return classes[subject] || "portuguese";

}


/* =====================================================
   FORMATAR DATA
   ===================================================== */

function formatDate(date) {

    if (!date) {
        return "";
    }


    const parts =
        date.split("-");


    if (parts.length !== 3) {
        return date;
    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


/* =====================================================
   ATUALIZAR DASHBOARD
   ===================================================== */

function updateDashboard() {

    const tasks =
        JSON.parse(localStorage.getItem("comfortTasks")) || [];


    const completed =
        tasks.filter(task => task.completed).length;


    const pending =
        tasks.filter(task => !task.completed).length;


    const completedElement =
        document.getElementById("dashboard-concluidas");


    const pendingElement =
        document.getElementById("dashboard-prazos");


    if (completedElement) {

        completedElement.textContent =
            `${completed} Tarefas`;

    }


    if (pendingElement) {

        pendingElement.textContent =
            `${pending} Atividades`;

    }

}


/* =====================================================
   NOVA PROVA
   ===================================================== */

document
    .getElementById("newExamButton")
    .addEventListener("click", showExamModal);


function showExamModal() {

    openModal(

        "Nova Prova",

        `

        <form
            class="modal-form"
            id="examForm">

            <label>Nome da prova</label>

            <input
                type="text"
                id="examName"
                placeholder="Ex: Prova de Matemática"
                required
            >


            <label>Matéria</label>

            <select id="examSubject">

                <option>Matemática</option>
                <option>Português</option>
                <option>História</option>
                <option>Física</option>
                <option>Química</option>

            </select>


            <label>Data</label>

            <input
                type="date"
                id="examDate"
                required
            >


            <button
                type="submit"
                class="btn-primary">

                <i class="ph ph-calendar-plus"></i>

                Adicionar Prova

            </button>

        </form>

        `

    );


    document
        .getElementById("examForm")
        .addEventListener(
            "submit",
            addExam
        );

}


function addExam(event) {

    event.preventDefault();


    const name =
        document.getElementById("examName").value;

    const subject =
        document.getElementById("examSubject").value;

    const date =
        document.getElementById("examDate").value;


    const exams =
        JSON.parse(localStorage.getItem("comfortExams")) || [];


    exams.push({

        id: Date.now(),

        name,

        subject,

        date

    });


    localStorage.setItem(
        "comfortExams",
        JSON.stringify(exams)
    );


    hideModal();

    renderExams();


    alert("📚 Prova adicionada!");

}


/* =====================================================
   RENDERIZAR PROVAS
   ===================================================== */

function renderExams() {

    const container =
        document.getElementById("examList");


    if (!container) return;


    const exams =
        JSON.parse(localStorage.getItem("comfortExams")) || [];


    container.innerHTML = "";


    if (exams.length === 0) {

        container.innerHTML = `

            <div style="
                text-align:center;
                padding:40px;
                color:#718096;
            ">

                <i
                    class="ph ph-exam"
                    style="
                        font-size:45px;
                        color:#7c3aed;
                    ">
                </i>

                <h3>
                    Nenhuma prova cadastrada
                </h3>

                <p>
                    Adicione suas próximas avaliações.
                </p>

            </div>

        `;

        return;

    }


    exams.forEach(exam => {

        const item =
            document.createElement("div");


        item.innerHTML = `

            <div style="
                display:flex;
                align-items:center;
                gap:15px;
            ">

                <div class="exam-icon">

                    <i class="ph ph-exam"></i>

                </div>


                <div style="flex:1;">

                    <strong>
                        ${exam.name}
                    </strong>

                    <p style="
                        color:#718096;
                        font-size:12px;
                        margin-top:4px;
                    ">

                        ${exam.subject}
                        •
                        ${formatDate(exam.date)}

                    </p>

                </div>


                <i
                    class="ph ph-warning-circle"
                    style="
                        color:#f59e0b;
                        font-size:23px;
                    ">
                </i>

            </div>

        `;


        container.appendChild(item);

    });

}


/* =====================================================
   CRONÔMETRO
   ===================================================== */

let timerSeconds = 1500;

let timerInterval = null;

let timerRunning = false;


const timerDisplay =
    document.getElementById("timerDisplay");


function updateTimerDisplay() {

    const minutes =
        Math.floor(timerSeconds / 60);


    const seconds =
        timerSeconds % 60;


    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

}


document
    .getElementById("startTimer")
    .addEventListener("click", startTimer);


document
    .getElementById("pauseTimer")
    .addEventListener("click", pauseTimer);


document
    .getElementById("resetTimer")
    .addEventListener("click", resetTimer);


function startTimer() {

    if (timerRunning) return;


    timerRunning = true;


    timerInterval =
        setInterval(() => {

            if (timerSeconds <= 0) {

                clearInterval(timerInterval);

                timerRunning = false;

                alert("🎉 Tempo encerrado! Hora de descansar.");

                return;

            }


            timerSeconds--;

            updateTimerDisplay();

        }, 1000);

}


function pauseTimer() {

    clearInterval(timerInterval);

    timerRunning = false;

}


function resetTimer() {

    clearInterval(timerInterval);

    timerRunning = false;

    timerSeconds = 1500;

    updateTimerDisplay();

}


/* PRESETS */

document
    .querySelectorAll(".timer-presets button")
    .forEach(button => {

        button.addEventListener(
            "click",
            function() {

                pauseTimer();

                timerSeconds =
                    Number(this.dataset.time);

                updateTimerDisplay();

            }
        );

    });


/* =====================================================
   CALENDÁRIO
   ===================================================== */

function createCalendar() {

    const container =
        document.getElementById("calendarDays");


    if (!container) return;


    container.innerHTML = "";


    const year = 2026;

    const month = 8;


    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    const totalDays =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    let startDay =
        firstDay === 0
            ? 6
            : firstDay - 1;


    for (
        let i = 0;
        i < startDay;
        i++
    ) {

        const empty =
            document.createElement("div");

        empty.style.border = "none";

        container.appendChild(empty);

    }


    for (
        let day = 1;
        day <= totalDays;
        day++
    ) {

        const dayElement =
            document.createElement("div");


        dayElement.textContent =
            day;


        if (day === 23) {

            dayElement.classList.add(
                "today"
            );

        }


        dayElement.addEventListener(
            "click",
            () => {

                alert(
                    `📅 Dia ${day} selecionado!`
                );

            }
        );


        container.appendChild(
            dayElement
        );

    }

}


/* =====================================================
   AVISOS
   ===================================================== */

function renderNotices() {

    const container =
        document.getElementById("noticeList");


    if (!container) return;


    const notices = [

        {
            icon: "ph-warning",
            title: "Prova de Matemática",
            text: "Sua prova está se aproximando."
        },

        {
            icon: "ph-clock",
            title: "Hora de estudar",
            text: "Você programou estudos para hoje."
        },

        {
            icon: "ph-check-circle",
            title: "Tarefa concluída",
            text: "Você está mantendo sua rotina."
        }

    ];


    container.innerHTML = "";


    notices.forEach(notice => {

        const item =
            document.createElement("div");


        item.innerHTML = `

            <div style="
                display:flex;
                align-items:center;
                gap:15px;
            ">

                <i
                    class="ph ${notice.icon}"
                    style="
                        font-size:25px;
                        color:#3b82f6;
                    ">
                </i>

                <div>

                    <strong>
                        ${notice.title}
                    </strong>

                    <p style="
                        color:#718096;
                        font-size:12px;
                        margin-top:4px;
                    ">

                        ${notice.text}

                    </p>

                </div>

            </div>

        `;


        container.appendChild(item);

    });

}


/* =====================================================
   BOTÃO DE NOVO AVISO
   ===================================================== */

document
    .getElementById("newNoticeButton")
    .addEventListener("click", () => {

        openModal(

            "Novo Aviso",

            `

            <form
                class="modal-form"
                id="noticeForm">

                <label>Título</label>

                <input
                    type="text"
                    id="noticeTitle"
                    placeholder="Ex: Estudar matemática"
                    required
                >


                <label>Mensagem</label>

                <textarea
                    id="noticeMessage"
                    rows="4"
                    placeholder="Digite seu aviso..."
                    required
                ></textarea>


                <button
                    type="submit"
                    class="btn-primary">

                    <i class="ph ph-bell"></i>

                    Criar Aviso

                </button>

            </form>

            `

        );


        document
            .getElementById("noticeForm")
            .addEventListener(
                "submit",
                function(event) {

                    event.preventDefault();

                    hideModal();

                    alert(
                        "🔔 Aviso criado com sucesso!"
                    );

                    renderNotices();

                }
            );

    });


/* =====================================================
   NOVA MATÉRIA
   ===================================================== */

document
    .getElementById("newSubjectButton")
    .addEventListener("click", () => {

        openModal(

            "Nova Matéria",

            `

            <form
                class="modal-form"
                id="subjectForm">

                <label>Nome da matéria</label>

                <input
                    type="text"
                    id="subjectName"
                    placeholder="Ex: Biologia"
                    required
                >


                <label>Professor</label>

                <input
                    type="text"
                    id="teacherName"
                    placeholder="Ex: Professor João"
                >


                <button
                    type="submit"
                    class="btn-primary">

                    <i class="ph ph-plus"></i>

                    Adicionar Matéria

                </button>

            </form>

            `

        );


        document
            .getElementById("subjectForm")
            .addEventListener(
                "submit",
                function(event) {

                    event.preventDefault();


                    const name =
                        document
                        .getElementById("subjectName")
                        .value;


                    const teacher =
                        document
                        .getElementById("teacherName")
                        .value;


                    const grid =
                        document
                        .getElementById("subjectsGrid");


                    const card =
                        document.createElement("div");


                    card.className =
                        "subject-card";


                    card.innerHTML = `

                        <div class="subject-color blue"></div>

                        <h3>
                            ${name}
                        </h3>

                        <p>
                            ${teacher || "Professor não informado"}
                        </p>

                        <div class="progress-info">

                            <span>
                                Progresso
                            </span>

                            <strong>
                                0%
                            </strong>

                        </div>

                        <div class="progress">

                            <span style="width:0%"></span>

                        </div>

                    `;


                    grid.appendChild(card);


                    hideModal();


                    alert(
                        "📚 Matéria adicionada!"
                    );

                }
            );

    });


/* =====================================================
   BOTÃO DE NOTIFICAÇÕES
   ===================================================== */

document
    .getElementById("notificationButton")
    .addEventListener("click", () => {

        openPage("avisos");

    });


/* =====================================================
   INICIALIZAÇÃO
   ===================================================== */

renderTasks();

renderExams();

renderNotices();

createCalendar();

updateDashboard();

updateTimerDisplay();


console.log(
    "ComfortStudy carregado com sucesso! 🚀"
);
