(function () {
  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const SAFE_EXPORT_EXCLUDE = new Set(["comfortAuthUser", "comfortSession", "comfortLegacyEmail", "comfortLegacyUid", "comfortSyncPendingKeys"]);
  let currentReviewId = null;
  let notificationTimer = null;
  let activeQuiz = null;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (_) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function list(key) { const value = read(key, []); return Array.isArray(value) ? value : []; }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }
  function safePdfDataUrl(value) { return typeof value === "string" && /^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/i.test(value); }
  function safeStoragePdfUrl(file) {
    try {
      const url = new URL(file && file.storageUrl || "");
      const bucket = window.COMFORT_FIREBASE_CONFIG && window.COMFORT_FIREBASE_CONFIG.storageBucket;
      const path = decodeURIComponent(url.pathname);
      return file && file.type === "application/pdf" && url.protocol === "https:" && url.hostname === "firebasestorage.googleapis.com" && bucket && path.startsWith("/v0/b/" + bucket + "/o/users/") ? url.href : "";
    } catch (_) { return ""; }
  }
  function localDate(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }
  function today() { return localDate(new Date()); }
  function shiftDate(dateString, amount) {
    const parts = String(dateString).split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12);
    date.setDate(date.getDate() + amount);
    return localDate(date);
  }
  function niceDate(dateString) {
    if (!dateString) return "";
    const parts = String(dateString).split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2], 12).toLocaleDateString("pt-BR");
  }
  function subjects() {
    const custom = read("comfortSubjects", []);
    const names = ["Matemática", "Português", "História", "Geografia", "Física", "Química", "Biologia", "Inglês"];
    if (Array.isArray(custom)) custom.forEach(function (item) { if (item && item.name) names.push(item.name); });
    return Array.from(new Set(names));
  }
  function subjectOptions(selected) {
    return subjects().map(function (name) {
      return '<option value="' + esc(name) + '"' + (name === selected ? " selected" : "") + ">" + esc(name) + "</option>";
    }).join("");
  }
  function empty(text) { return '<p class="feature-empty">' + esc(text) + "</p>"; }
  function formatHours(seconds) {
    const minutes = Math.floor((Number(seconds) || 0) / 60);
    return Math.floor(minutes / 60) + "h " + String(minutes % 60).padStart(2, "0") + "min";
  }

  function renderGoal() {
    const form = document.getElementById("weeklyGoalForm");
    const bar = document.getElementById("weeklyGoalBar");
    const label = document.getElementById("weeklyGoalText");
    if (!form || !bar || !label) return;
    const target = Number(read("comfortWeeklyGoal", 5)) || 5;
    const goalInput = document.getElementById("weeklyGoalHours");
    if (goalInput && document.activeElement !== goalInput) goalInput.value = target;
    const log = read("comfortStudyLog", {});
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    const day = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - day);
    const start = localDate(monday);
    let seconds = 0;
    Object.keys(log || {}).forEach(function (date) { if (date >= start && date <= today()) seconds += Number(log[date]) || 0; });
    const studiedHours = seconds / 3600;
    const percent = Math.min(100, Math.round((studiedHours / target) * 100));
    bar.style.width = percent + "%";
    label.textContent = studiedHours.toFixed(1).replace(".", ",") + " de " + target.toLocaleString("pt-BR") + " horas nesta semana (" + percent + "%)";
    const dailyInput = document.getElementById("dailyGoalMinutes");
    const dailyBar = document.getElementById("dailyGoalBar");
    const dailyLabel = document.getElementById("dailyGoalText");
    if (dailyInput && dailyBar && dailyLabel) {
      const dailyTarget = Math.max(10, Number(read("comfortDailyGoalMinutes", 60)) || 60);
      if (document.activeElement !== dailyInput) dailyInput.value = dailyTarget;
      const dailyMinutes = (Number(log[today()]) || 0) / 60;
      const dailyPercent = Math.min(100, Math.round(dailyMinutes / dailyTarget * 100));
      dailyBar.style.width = dailyPercent + "%";
      dailyLabel.textContent = dailyMinutes.toFixed(0) + " de " + dailyTarget + " minutos hoje (" + dailyPercent + "%)";
    }
  }

  function renderSubjectStudyTime() {
    const host = document.getElementById("subjectStudyTimeList");
    if (!host) return;
    const dailyLog = read("comfortStudySubjectLog", {});
    const totals = {};
    Object.values(dailyLog || {}).forEach(day => {
      Object.entries(day || {}).forEach(([subject, seconds]) => { totals[subject] = (totals[subject] || 0) + (Number(seconds) || 0); });
    });
    const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    if (!rows.length) { host.innerHTML = empty("Escolha uma matéria no cronômetro para começar a acompanhar seu tempo por assunto."); return; }
    const max = rows[0][1] || 1;
    host.innerHTML = rows.map(([subject, seconds]) => '<div class="subject-study-time-row"><strong>' + esc(subject) + '</strong><div class="performance-bar"><span style="width:' + Math.max(2, Math.round(seconds / max * 100)) + '%"></span></div><span>' + formatHours(seconds) + '</span></div>').join("");
  }

  function renderSchedule() {
    const host = document.getElementById("classScheduleList");
    if (!host) return;
    const rows = list("comfortClassSchedule").sort(function (a, b) {
      return Number(a.day) - Number(b.day) || String(a.start).localeCompare(String(b.start));
    });
    if (!rows.length) { host.innerHTML = empty("Seu horário ainda está vazio."); return; }
    host.innerHTML = rows.map(function (item) {
      return '<div class="feature-row"><div><strong>' + esc(DAY_NAMES[Number(item.day)] || "") + " • " + esc(item.start) + "–" + esc(item.end) + "</strong><span>" + esc(item.subject) + (item.label ? " · " + esc(item.label) : "") + '</span></div><button type="button" class="small-button" data-extra-action="delete-class" data-id="' + Number(item.id) + '" aria-label="Excluir aula">🗑️</button></div>';
    }).join("");
  }

  function renderStudyPlan() {
    const host = document.getElementById("studyPlanList");
    const select = document.getElementById("studyPlanExam");
    if (!host || !select) return;
    const exams = list("comfortExams").filter(function (exam) { return !exam.completed && exam.date > today(); });
    const selected = select.value;
    select.innerHTML = '<option value="">Escolha uma prova</option>' + exams.map(function (exam) {
      return '<option value="' + Number(exam.id) + '">' + esc(exam.name) + " · " + esc(exam.subject) + " · " + niceDate(exam.date) + "</option>";
    }).join("");
    if (exams.some(function (exam) { return String(exam.id) === selected; })) select.value = selected;
    const plans = list("comfortStudyPlans").sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    if (!plans.length) { host.innerHTML = empty("Gere um plano a partir de uma prova cadastrada."); return; }
    host.innerHTML = plans.map(function (session) {
      return '<div class="feature-row' + (session.done ? " feature-done" : "") + '"><label><input type="checkbox" data-extra-action="toggle-plan" data-id="' + esc(session.id) + '"' + (session.done ? " checked" : "") + '> <span><strong>' + esc(session.title) + "</strong><small>" + esc(session.subject) + " · " + niceDate(session.date) + "</small></span></label><button type=\"button\" class=\"small-button\" data-extra-action=\"delete-plan\" data-id=\"" + esc(session.id) + '" aria-label="Excluir sessão">🗑️</button></div>';
    }).join("");
  }

  function renderFlashcards() {
    const host = document.getElementById("flashcardList");
    const dueCount = document.getElementById("flashcardDueCount");
    if (!host || !dueCount) return;
    const cards = list("comfortFlashcards").sort(function (a, b) { return String(a.dueAt || "").localeCompare(String(b.dueAt || "")); });
    const due = cards.filter(function (card) { return String(card.dueAt || today()) <= today(); }).length;
    dueCount.textContent = due + " para revisar";
    if (!cards.length) { host.innerHTML = empty("Você ainda não criou flashcards."); return; }
    host.innerHTML = cards.map(function (card) {
      return '<div class="feature-row"><div><strong>' + esc(card.front) + '</strong><span>' + esc(card.subject) + " · revisão " + niceDate(card.dueAt || today()) + '</span></div><button type="button" class="small-button" data-extra-action="delete-card" data-id="' + Number(card.id) + '" aria-label="Excluir flashcard">🗑️</button></div>';
    }).join("");
  }

  function renderQuizBank() {
    const host = document.getElementById("quizQuestionList");
    const start = document.getElementById("startQuizSimulation");
    if (!host) return;
    const questions = list("comfortQuizQuestions").filter(item => item && Array.isArray(item.options) && item.options.length === 4 && Number.isInteger(Number(item.correct)) && Number(item.correct) >= 0 && Number(item.correct) < 4);
    if (start) start.disabled = !questions.length;
    host.innerHTML = questions.length ? questions.map(function (item) {
      return '<div class="feature-row"><div><strong>' + esc(item.prompt) + '</strong><span>' + esc(item.subject) + ' · ' + (Array.isArray(item.options) ? item.options.length : 0) + ' alternativas</span></div><button type="button" class="small-button" data-extra-action="delete-quiz-question" data-id="' + Number(item.id) + '" aria-label="Excluir questão">🗑️</button></div>';
    }).join("") : empty("Adicione questões ao seu banco para montar um simulado.");
  }

  function renderQuizSession() {
    const panel = document.getElementById("quizSessionPanel");
    const host = document.getElementById("quizSessionBody");
    if (!panel || !host || !activeQuiz) return;
    const item = activeQuiz.questions[activeQuiz.index];
    panel.hidden = false;
    host.innerHTML = '<p class="quiz-progress">Questão ' + (activeQuiz.index + 1) + ' de ' + activeQuiz.questions.length + ' · ' + esc(item.subject) + '</p>' +
      '<h4 class="quiz-prompt">' + esc(item.prompt) + '</h4>' +
      '<fieldset class="quiz-answer-options"><legend>Escolha uma alternativa</legend>' + item.options.map(function (option, index) {
        return '<label class="quiz-answer-option"><input type="radio" name="quizAnswer" value="' + index + '"' + (activeQuiz.answered ? ' disabled' : '') + (activeQuiz.selected === index ? ' checked' : '') + '><span><strong>' + String.fromCharCode(65 + index) + '.</strong> ' + esc(option) + '</span></label>';
      }).join("") + '</fieldset><p class="quiz-feedback" id="quizFeedback" aria-live="polite">' + (activeQuiz.answered ? (activeQuiz.lastCorrect ? "Resposta correta!" : "Resposta incorreta. A alternativa correta está destacada abaixo.") : "") + '</p>' +
      (activeQuiz.answered ? '<button type="button" class="btn-primary" id="quizNextQuestion">' + (activeQuiz.index + 1 === activeQuiz.questions.length ? "Ver resultado" : "Próxima questão") + '</button>' : '<button type="button" class="btn-primary" id="quizAnswerButton">Corrigir resposta</button>');
    if (activeQuiz.answered && !activeQuiz.lastCorrect) {
      const correct = host.querySelectorAll(".quiz-answer-option")[item.correct];
      if (correct) correct.classList.add("quiz-correct-option");
    }
  }

  function beginQuiz() {
    const questions = list("comfortQuizQuestions").filter(item => item && typeof item.prompt === "string" && Array.isArray(item.options) && item.options.length === 4 && Number.isInteger(Number(item.correct)) && Number(item.correct) >= 0 && Number(item.correct) < 4).slice();
    if (!questions.length) return;
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    activeQuiz = { questions: questions, index: 0, correct: 0, answered: false, selected: null, lastCorrect: false, bySubject: {} };
    renderQuizSession();
    document.getElementById("quizSessionPanel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function answerQuizQuestion() {
    if (!activeQuiz || activeQuiz.answered) return;
    const selected = document.querySelector('input[name="quizAnswer"]:checked');
    if (!selected) {
      const feedback = document.getElementById("quizFeedback");
      if (feedback) feedback.textContent = "Selecione uma alternativa para continuar.";
      return;
    }
    const question = activeQuiz.questions[activeQuiz.index];
    activeQuiz.selected = Number(selected.value);
    activeQuiz.lastCorrect = activeQuiz.selected === Number(question.correct);
    if (activeQuiz.lastCorrect) activeQuiz.correct++;
    const subject = question.subject;
    if (!activeQuiz.bySubject[subject]) activeQuiz.bySubject[subject] = { correct: 0, total: 0 };
    activeQuiz.bySubject[subject].total++;
    if (activeQuiz.lastCorrect) activeQuiz.bySubject[subject].correct++;
    if (!activeQuiz.lastCorrect) {
      const cards = list("comfortFlashcards");
      let card = cards.find(item => String(item.sourceQuestionId) === String(question.id));
      const correctAnswer = String(question.options[Number(question.correct)] || "");
      const chosenAnswer = String(question.options[activeQuiz.selected] || "");
      const answerText = "Resposta correta: " + String.fromCharCode(65 + Number(question.correct)) + ". " + correctAnswer + "\nSua resposta: " + String.fromCharCode(65 + activeQuiz.selected) + ". " + chosenAnswer;
      if (card) {
        card.back = answerText;
        card.dueAt = today();
        card.repetitions = 0;
        card.lastWrongAt = today();
      } else {
        card = { id: Date.now(), subject: String(subject || "Geral"), front: String(question.prompt), back: answerText, dueAt: today(), repetitions: 0, sourceQuestionId: question.id, createdFrom: "simulado", lastWrongAt: today() };
        cards.push(card);
      }
      write("comfortFlashcards", cards);
      renderFlashcards();
    }
    activeQuiz.answered = true;
    renderQuizSession();
  }

  function nextQuizQuestion() {
    if (!activeQuiz || !activeQuiz.answered) return;
    if (activeQuiz.index + 1 < activeQuiz.questions.length) {
      activeQuiz.index++;
      activeQuiz.answered = false;
      activeQuiz.selected = null;
      activeQuiz.lastCorrect = false;
      renderQuizSession();
      return;
    }
    const bySubject = activeQuiz.bySubject;
    const result = { id: Date.now(), date: today(), correct: activeQuiz.correct, total: activeQuiz.questions.length, percent: Math.round(activeQuiz.correct / activeQuiz.questions.length * 100), bySubject: bySubject };
    const results = list("comfortQuizResults");
    results.push(result);
    write("comfortQuizResults", results);
    activeQuiz = null;
    const host = document.getElementById("quizSessionBody");
    const weakSubjects = Object.entries(bySubject).filter(([, score]) => score.correct / score.total < .7).map(([subject]) => subject);
    if (host) host.innerHTML = '<h4>Simulado concluído!</h4><p>Você acertou <strong>' + result.correct + ' de ' + result.total + '</strong> questões (' + result.percent + '%).</p>' + (weakSubjects.length ? '<p>Vale revisar: <strong>' + weakSubjects.map(esc).join(", ") + '</strong>.</p>' : '<p>Bom resultado! Continue revisando para manter o ritmo.</p>') + '<button type="button" class="btn-secondary" id="closeQuizResult">Fechar resultado</button>';
    renderReports();
  }

  function renderReviewCard() {
    const panel = document.getElementById("flashcardReview");
    const question = document.getElementById("flashcardQuestion");
    const answer = document.getElementById("flashcardAnswer");
    const reveal = document.getElementById("saveFlashcardAnswer");
    const gradeButtons = document.getElementById("flashcardGradeButtons");
    if (!panel || !question || !answer) return;
    const card = list("comfortFlashcards").find(function (item) { return Number(item.id) === Number(currentReviewId); });
    if (!card) { panel.hidden = true; currentReviewId = null; return; }
    panel.hidden = false;
    question.textContent = card.front;
    answer.textContent = card.back;
    answer.hidden = true;
    if (reveal) reveal.hidden = false;
    if (gradeButtons) gradeButtons.hidden = true;
  }

  function beginReview() {
    const due = list("comfortFlashcards").filter(function (card) { return String(card.dueAt || today()) <= today(); }).sort(function (a, b) { return String(a.dueAt || "").localeCompare(String(b.dueAt || "")); });
    const panel = document.getElementById("flashcardReview");
    if (!due.length) {
      const question = document.getElementById("flashcardQuestion");
      const answer = document.getElementById("flashcardAnswer");
      const reveal = document.getElementById("saveFlashcardAnswer");
      const gradeButtons = document.getElementById("flashcardGradeButtons");
      if (panel) panel.hidden = false;
      if (question) question.textContent = "Nenhum flashcard pendente. Volte amanhã para revisar.";
      if (answer) answer.hidden = true;
      if (reveal) reveal.hidden = true;
      if (gradeButtons) gradeButtons.hidden = true;
      currentReviewId = null;
      return;
    }
    currentReviewId = due[0].id;
    renderReviewCard();
  }

  function gradeCurrentCard(remembered) {
    const cards = list("comfortFlashcards");
    const card = cards.find(function (item) { return Number(item.id) === Number(currentReviewId); });
    if (!card) return;
    const repetitions = Number(card.repetitions) || 0;
    const intervals = [1, 3, 7, 14, 30];
    const days = remembered ? intervals[Math.min(repetitions, intervals.length - 1)] : 1;
    card.repetitions = remembered ? repetitions + 1 : 0;
    card.dueAt = shiftDate(today(), days);
    card.lastReviewed = today();
    write("comfortFlashcards", cards);
    beginReview();
    renderFlashcards();
  }

  function renderGrades() {
    const host = document.getElementById("gradeList");
    const averages = document.getElementById("gradeAverages");
    if (!host || !averages) return;
    const grades = list("comfortGrades").sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    const totals = {};
    grades.forEach(function (grade) {
      const percent = Number(grade.score) / Number(grade.maximum) * 100;
      if (!totals[grade.subject]) totals[grade.subject] = [];
      totals[grade.subject].push(percent);
    });
    const names = Object.keys(totals);
    averages.innerHTML = names.length ? names.map(function (name) {
      const values = totals[name];
      const average = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
      return '<div class="grade-average"><span>' + esc(name) + '</span><strong>' + average.toFixed(1).replace(".", ",") + "%</strong></div>";
    }).join("") : empty("As médias aparecem depois que você registrar notas.");
    if (!grades.length) { host.innerHTML = empty("Nenhuma nota registrada."); return; }
    host.innerHTML = grades.map(function (grade) {
      const percent = Number(grade.score) / Number(grade.maximum) * 100;
      return '<div class="feature-row"><div><strong>' + esc(grade.title) + " · " + esc(grade.subject) + '</strong><span>' + esc(grade.score) + "/" + esc(grade.maximum) + " (" + percent.toFixed(1).replace(".", ",") + "%) · " + niceDate(grade.date) + '</span></div><button type="button" class="small-button" data-extra-action="delete-grade" data-id="' + Number(grade.id) + '" aria-label="Excluir nota">🗑️</button></div>';
    }).join("");
  }

  function fillSubjectSelect(id) {
    const select = document.getElementById(id);
    if (!select) return;
    const previous = select.value;
    select.innerHTML = '<option value="">Escolha uma matéria</option>' + subjectOptions();
    if (subjects().indexOf(previous) >= 0) select.value = previous;
  }

  function renderToday() {
    const taskHost = document.getElementById("todayPriorityTasks");
    const examHost = document.getElementById("todayUpcomingExams");
    if (!taskHost || !examHost) return;
    const tasks = list("comfortTasks").filter(item => !item.completed).sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999"))).slice(0, 3);
    taskHost.innerHTML = tasks.length ? tasks.map(task => '<div class="feature-row"><div><strong>' + esc(task.name || "Tarefa") + '</strong><span>' + esc(task.subject || "") + ' · ' + (task.date ? niceDate(task.date) : "Sem prazo") + '</span></div><button type="button" class="small-button" onclick="window.toggleTask && window.toggleTask(' + Number(task.id) + ')">Concluir</button></div>').join("") : empty("Nenhuma tarefa pendente. Aproveite para revisar!");
    const exams = list("comfortExams").filter(item => !item.completed && item.date >= today()).sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 3);
    examHost.innerHTML = exams.length ? exams.map(exam => '<div class="feature-row"><div><strong>' + esc(exam.name || "Prova") + '</strong><span>' + esc(exam.subject || "") + ' · ' + niceDate(exam.date) + '</span></div><span class="feature-badge">' + Math.max(0, Math.ceil((new Date(exam.date + "T12:00:00") - new Date(today() + "T12:00:00")) / 86400000)) + ' dia(s)</span></div>').join("") : empty("Nenhuma prova próxima cadastrada.");
  }

  function weekDates() {
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    const result = [];
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); result.push(localDate(d)); }
    return result;
  }

  function agendaItemsFor(date) {
    const weekday = new Date(date + "T12:00:00").getDay();
    const items = [];
    list("comfortClassSchedule").filter(item => Number(item.day) === weekday).forEach(item => items.push({ kind: "Aula", title: item.subject, detail: item.start + "–" + item.end + (item.label ? " · " + item.label : ""), time: item.start }));
    list("comfortTasks").filter(item => !item.completed && item.date === date).forEach(item => items.push({ kind: "Tarefa", title: item.name, detail: item.subject || "", time: "23:59" }));
    list("comfortExams").filter(item => !item.completed && item.date === date).forEach(item => items.push({ kind: "Prova", title: item.name, detail: item.subject || "", time: "23:58" }));
    list("comfortStudyPlans").filter(item => !item.done && item.date === date).forEach(item => items.push({ kind: "Estudo", title: item.title, detail: item.subject || "", time: "23:57" }));
    return items.sort((a, b) => a.time.localeCompare(b.time));
  }

  function renderAgenda() {
    const host = document.getElementById("weeklyAgenda");
    const suggestions = document.getElementById("smartStudySuggestions");
    if (!host || !suggestions) return;
    const dates = weekDates();
    host.innerHTML = '<div class="agenda-days">' + dates.map((date, i) => {
      const items = agendaItemsFor(date);
      const label = i === 0 ? "Hoje" : new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
      return '<section class="agenda-day"><strong>' + esc(label) + '</strong><small>' + niceDate(date) + '</small><div class="feature-list">' + (items.length ? items.map(item => '<div class="agenda-item"><span class="agenda-kind">' + esc(item.kind) + '</span><strong>' + esc(item.title) + '</strong><small>' + esc(item.detail) + (item.kind === "Aula" ? "" : " · " + esc(item.time)) + '</small></div>').join("") : '<p class="feature-empty">Sem compromissos</p>') + '</div></section>';
    }).join("") + '</div>';

    const classes = list("comfortClassSchedule");
    const deadlines = list("comfortTasks").filter(item => !item.completed && item.date >= today()).concat(list("comfortExams").filter(item => !item.completed && item.date >= today())).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const subjectLog = read("comfortStudySubjectLog", {});
    const recentStart = shiftDate(today(), -6);
    const subjectTotals = {};
    Object.entries(subjectLog || {}).forEach(([date, day]) => { if (date >= recentStart && date <= today()) Object.entries(day || {}).forEach(([subject, seconds]) => { subjectTotals[subject] = (subjectTotals[subject] || 0) + (Number(seconds) || 0); }); });
    const balancedSubjects = subjects().sort((a, b) => (subjectTotals[a] || 0) - (subjectTotals[b] || 0));
    const picks = [];
    dates.forEach(date => {
      const weekday = new Date(date + "T12:00:00").getDay();
      const busy = classes.filter(item => Number(item.day) === weekday).map(item => [toMinutes(item.start), toMinutes(item.end)]).filter(pair => pair[0] >= 0 && pair[1] > pair[0]).sort((a, b) => a[0] - b[0]);
      let cursor = 8 * 60;
      busy.concat([[20 * 60, 20 * 60]]).forEach(pair => {
        const start = Math.max(cursor, 8 * 60);
        const end = Math.min(pair[0], 20 * 60);
        if (end - start >= 45 && picks.length < 5) {
          const deadline = deadlines.find(item => item.date >= date && item.subject) || deadlines.find(item => item.subject) || null;
          const suggestedSubject = balancedSubjects.length ? balancedSubjects[picks.length % balancedSubjects.length] : "revisão livre";
          picks.push({ date: date, start: start, end: Math.min(start + 60, end), focus: deadline ? deadline.subject : suggestedSubject, reason: deadline ? "prazo próximo" : "matéria com menos tempo recente" });
        }
        cursor = Math.max(cursor, pair[1]);
      });
    });
    suggestions.innerHTML = picks.length ? picks.map(slot => '<div class="feature-row"><div><strong>' + niceDate(slot.date) + ' · ' + minutesText(slot.start) + '–' + minutesText(slot.end) + '</strong><span>Sugestão de estudo: ' + esc(slot.focus) + ' · ' + esc(slot.reason) + '</span></div></div>').join("") : empty("Cadastre suas aulas para encontrar intervalos livres.");
    const notificationButton = document.getElementById("enableStudyNotifications");
    if (notificationButton) notificationButton.textContent = reminderSettings().browserEnabled ? "Avisos do navegador ativos" : "Ativar avisos";
  }
  function toMinutes(value) { const parts = String(value || "").split(":").map(Number); return parts.length === 2 && parts.every(Number.isFinite) ? parts[0] * 60 + parts[1] : -1; }
  function minutesText(value) { return String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0"); }

  function renderDiary() {
    const dueHost = document.getElementById("diaryDueList");
    const host = document.getElementById("studyDiaryList");
    if (!dueHost || !host) return;
    const entries = list("comfortStudyDiary").sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const due = entries.filter(item => item.review && item.nextReviewAt && item.nextReviewAt <= today()).map(item => ({ kind: "diary", id: item.id, subject: item.subject, text: item.review, date: item.date }));
    const contents = read("comfortSubjectContents", {}); let notesChanged = false;
    Object.keys(contents || {}).forEach(subject => {
      (Array.isArray(contents[subject]) ? contents[subject] : []).forEach(item => {
        if (!item.important) return;
        if (!item.nextReviewAt) { item.nextReviewAt = shiftDate(String(item.createdAt || today()).slice(0, 10), 1); item.reviewCount = 0; notesChanged = true; }
        if (item.nextReviewAt <= today()) due.push({ kind: "note", id: item.id, subject: subject, text: item.title || item.text || "Anotação importante", date: item.nextReviewAt });
      });
    });
    if (notesChanged) write("comfortSubjectContents", contents);
    dueHost.innerHTML = due.length ? due.map(item => '<div class="feature-row"><div><strong>' + esc(item.subject) + '</strong><span>' + esc(item.text) + ' · ' + niceDate(item.date) + '</span></div><button type="button" class="small-button" data-extra-action="review-' + item.kind + '" data-id="' + Number(item.id) + '" data-subject="' + esc(item.subject) + '">Marcar revisada</button></div>').join("") : empty("Sem revisões pendentes para hoje.");
    host.innerHTML = entries.length ? entries.slice(0, 8).map(item => '<div class="feature-row"><div><strong>' + esc(item.subject) + ' · ' + niceDate(item.date) + '</strong><span>' + esc(item.studied) + (item.review ? ' · Revisar: ' + esc(item.review) : "") + '</span></div><button type="button" class="small-button" data-extra-action="delete-diary" data-id="' + Number(item.id) + '" aria-label="Excluir registro">🗑️</button></div>').join("") : empty("Seus registros de estudo aparecerão aqui.");
  }

  function renderReports() {
    const report = document.getElementById("monthlyReport");
    const rhythm = document.getElementById("studyRhythmSummary");
    const monthLabel = document.getElementById("monthlyReportMonth");
    if (!report || !rhythm) return;
    const month = today().slice(0, 7);
    const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    if (monthLabel) monthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const log = read("comfortStudyLog", {});
    const studySeconds = Object.keys(log || {}).filter(date => date.slice(0, 7) === month).reduce((sum, date) => sum + (Number(log[date]) || 0), 0);
    const tasks = list("comfortTasks");
    const completed = tasks.filter(task => task.completed && task.completedAt && String(task.completedAt).slice(0, 7) === month).length;
    const grades = list("comfortGrades").filter(grade => String(grade.date || "").slice(0, 7) === month);
    const average = grades.length ? grades.reduce((sum, grade) => sum + (Number(grade.score) / (Number(grade.maximum) || 1)) * 100, 0) / grades.length : null;
    const quizResults = list("comfortQuizResults").filter(result => String(result.date || "").slice(0, 7) === month);
    const quizAverage = quizResults.length ? Math.round(quizResults.reduce((sum, result) => sum + (Number(result.percent) || 0), 0) / quizResults.length) : null;
    report.innerHTML = '<div class="report-metric"><strong>' + formatHours(studySeconds) + '</strong><span>tempo estudado</span></div><div class="report-metric"><strong>' + completed + '</strong><span>tarefas concluídas</span></div><div class="report-metric"><strong>' + (average === null ? "—" : average.toFixed(1).replace(".", ",") + "%") + '</strong><span>média das notas do mês</span></div><div class="report-metric"><strong>' + (quizAverage === null ? "—" : quizAverage + "%") + '</strong><span>média dos simulados (' + quizResults.length + ')</span></div>';
    const now = new Date(); const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const start = localDate(monday);
    const weekSeconds = Object.keys(log || {}).filter(date => date >= start && date <= today()).reduce((sum, date) => sum + (Number(log[date]) || 0), 0);
    const weekCompleted = tasks.filter(task => task.completed && task.completedAt && String(task.completedAt).slice(0, 10) >= start && String(task.completedAt).slice(0, 10) <= today()).length;
    const studiedDays = new Set(Object.keys(log || {}).filter(date => date >= start && date <= today() && Number(log[date]) > 0)).size;
    const diaryWeek = list("comfortStudyDiary").filter(item => item.date >= start && item.date <= today()).length;
    const days = Object.keys(log || {}).filter(date => Number(log[date]) > 0).sort().reverse();
    let streak = 0; const cursor = new Date(); cursor.setHours(12, 0, 0, 0);
    if (!days.includes(today())) cursor.setDate(cursor.getDate() - 1);
    while (days.includes(localDate(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
    rhythm.innerHTML = '<div class="report-metric"><strong>' + formatHours(weekSeconds) + '</strong><span>estudo nesta semana</span></div><div class="report-metric"><strong>' + studiedDays + '</strong><span>dias estudados</span></div><div class="report-metric"><strong>' + streak + '</strong><span>dias seguidos</span></div><div class="report-metric"><strong>' + weekCompleted + ' · ' + diaryWeek + '</strong><span>tarefas concluídas · registros no diário</span></div>';
    const achievements = document.getElementById("studyAchievements");
    if (achievements) {
      const totalStudySeconds = Object.values(log || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const totalCompleted = tasks.filter(task => task.completed).length;
      const diaryCount = list("comfortStudyDiary").length;
      const badges = [
        [totalStudySeconds >= 3600, "Primeira hora", "Acumule uma hora de estudo."],
        [totalCompleted >= 10, "Tarefas em dia", "Conclua 10 tarefas."],
        [streak >= 7, "Ritmo constante", "Estude por 7 dias seguidos."],
        [diaryCount >= 5, "Diário de bordo", "Registre 5 sessões de estudo."]
      ];
      achievements.innerHTML = badges.map(([unlocked, title, description]) => '<div class="achievement-badge' + (unlocked ? " is-unlocked" : "") + '" aria-label="' + (unlocked ? "Conquista desbloqueada: " : "Conquista a desbloquear: ") + title + '"><span aria-hidden="true">' + (unlocked ? "★" : "☆") + '</span><div><strong>' + title + '</strong><small>' + description + '</small></div></div>').join("");
    }
  }

  function calculateGradeTarget(event) {
    event.preventDefault();
    const subject = document.getElementById("gradeTargetSubject").value;
    const target = Number(document.getElementById("gradeTargetAverage").value);
    const maximum = Number(document.getElementById("gradeTargetMaximum").value);
    const result = document.getElementById("gradeTargetResult");
    const grades = list("comfortGrades").filter(item => item.subject === subject);
    const sum = grades.reduce((total, item) => total + (Number(item.score) / (Number(item.maximum) || 1)) * 100, 0);
    const needed = target * (grades.length + 1) - sum;
    if (needed <= 0) result.textContent = "Você já está na média desejada. Uma nota baixa ainda pode manter essa média.";
    else if (needed > 100) result.textContent = "Para atingir essa média com apenas mais uma avaliação, seria necessário mais que 100%";
    else result.textContent = "Você precisa tirar aproximadamente " + (needed / 100 * maximum).toFixed(1).replace(".", ",") + " de " + maximum.toLocaleString("pt-BR") + " na próxima avaliação.";
  }

  function appearance() { return read("comfortAppearance", { theme: "blue", avatar: "👤", visibleCards: ["today", "tasks", "exams", "notices"] }); }
  function applyAppearance() {
    const prefs = appearance();
    document.documentElement.dataset.theme = ["blue", "violet", "green", "rose"].includes(prefs.theme) ? prefs.theme : "blue";
    const selectTheme = document.getElementById("appearanceTheme"); if (selectTheme) selectTheme.value = document.documentElement.dataset.theme;
    const selectAvatar = document.getElementById("appearanceAvatar"); if (selectAvatar) selectAvatar.value = prefs.avatar || "👤";
    document.querySelectorAll(".sidebar .avatar").forEach(host => { host.textContent = prefs.avatar || "👤"; host.classList.add("emoji-avatar"); });
    const bigAvatar = document.querySelector(".big-avatar");
    const profile = read("comfortProfile", {});
    const photoData = profile && typeof profile.photoData === "string" && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(profile.photoData) ? profile.photoData : "";
    if (bigAvatar && photoData) {
      const image = document.createElement("img"); image.src = photoData; image.alt = "Foto de perfil";
      bigAvatar.replaceChildren(image); bigAvatar.classList.add("profile-photo-avatar"); bigAvatar.classList.remove("emoji-avatar");
    } else if (bigAvatar) {
      bigAvatar.textContent = prefs.avatar || "👤"; bigAvatar.classList.add("emoji-avatar"); bigAvatar.classList.remove("profile-photo-avatar");
    }
    document.querySelectorAll("[data-dashboard-card]").forEach(card => card.classList.toggle("dashboard-card-hidden", Array.isArray(prefs.visibleCards) && !prefs.visibleCards.includes(card.dataset.dashboardCard)));
    document.querySelectorAll('input[name="dashboardCard"]').forEach(input => { input.checked = Array.isArray(prefs.visibleCards) ? prefs.visibleCards.includes(input.value) : true; });
  }
  function saveAppearance(event) {
    event.preventDefault();
    const visibleCards = Array.from(document.querySelectorAll('input[name="dashboardCard"]:checked')).map(input => input.value);
    write("comfortAppearance", { theme: document.getElementById("appearanceTheme").value, avatar: document.getElementById("appearanceAvatar").value, visibleCards: visibleCards });
    applyAppearance();
  }

  function pdfFiles() { return list("comfortStudyReaderFiles"); }
  function annotations() { return read("comfortPdfAnnotations", {}); }
  function activePdf() { const id = Number(document.getElementById("studyPdfSelect") && document.getElementById("studyPdfSelect").value); return pdfFiles().find(file => Number(file.id) === id); }
  function renderPdf() {
    const select = document.getElementById("studyPdfSelect"); const workspace = document.getElementById("studyPdfWorkspace"); const emptyHost = document.getElementById("studyPdfEmpty");
    if (!select || !workspace || !emptyHost) return;
    const old = select.value; const files = pdfFiles();
    select.innerHTML = '<option value="">Escolha um PDF</option>' + files.map(file => '<option value="' + Number(file.id) + '">' + esc(file.name) + '</option>').join("");
    if (files.some(file => String(file.id) === old)) select.value = old; else if (files.length) select.value = String(files[0].id);
    const file = activePdf(); workspace.hidden = !file; emptyHost.hidden = Boolean(file);
    if (!file) { const viewer = document.getElementById("studyPdfViewer"); if (viewer) viewer.removeAttribute("src"); return; }
    const pdfSource = safePdfDataUrl(file.dataUrl) ? file.dataUrl : safeStoragePdfUrl(file);
    if (!pdfSource) {
      workspace.hidden = true; emptyHost.hidden = false; emptyHost.textContent = "Este PDF não pode ser aberto com segurança. Remova-o e adicione novamente um arquivo PDF válido.";
      const viewer = document.getElementById("studyPdfViewer"); if (viewer) viewer.removeAttribute("src"); return;
    }
    const page = Math.max(1, Number(document.getElementById("pdfPageNumber").value) || 1);
    document.getElementById("pdfPageNumber").value = page;
    document.getElementById("studyPdfViewer").src = pdfSource + "#page=" + page + "&toolbar=1";
    const data = annotations()[String(file.id)] || { bookmarks: [], notes: [] };
    const note = (data.notes || []).find(item => Number(item.page) === page);
    document.getElementById("pdfPageNote").value = note ? note.text : "";
    document.getElementById("pdfBookmarkList").innerHTML = data.bookmarks && data.bookmarks.length ? data.bookmarks.map(pageNum => '<div class="feature-row"><button type="button" class="small-button" data-pdf-page="' + Number(pageNum) + '">Página ' + Number(pageNum) + '</button><button type="button" class="small-button" data-extra-action="unbookmark-pdf" data-page="' + Number(pageNum) + '">Remover</button></div>').join("") : empty("Nenhuma página favorita ainda.");
    document.getElementById("pdfNoteList").innerHTML = data.notes && data.notes.length ? data.notes.map(item => '<div class="feature-row"><div><strong>Página ' + Number(item.page) + '</strong><span>' + esc(item.text) + '</span></div><button type="button" class="small-button" data-pdf-page="' + Number(item.page) + '">Abrir</button></div>').join("") : empty("Suas observações por página aparecerão aqui.");
  }
  function savePdfNote() {
    const file = activePdf(); if (!file) return;
    const page = Math.max(1, Number(document.getElementById("pdfPageNumber").value) || 1); const text = document.getElementById("pdfPageNote").value.trim();
    if (!text) { window.alert("Escreva uma observação antes de salvar."); return; }
    const all = annotations(); const data = all[String(file.id)] || { bookmarks: [], notes: [] };
    if (!Array.isArray(data.bookmarks)) data.bookmarks = []; if (!Array.isArray(data.notes)) data.notes = [];
    const existing = data.notes.find(item => Number(item.page) === page);
    if (existing) existing.text = text; else data.notes.push({ page: page, text: text });
    all[String(file.id)] = data; write("comfortPdfAnnotations", all); renderPdf();
  }
  async function addPdf(file) {
    if (!file) return;
    if (file.type !== "application/pdf") { window.alert("Escolha um arquivo PDF válido."); return; }
    const cloudStorageAvailable = Boolean(window.comfortStorage && window.comfortAuth && window.comfortAuth.currentUser && navigator.onLine !== false);
    if (file.size > 10 * 1024 * 1024) { window.alert("Cada PDF pode ter até 10 MB."); return; }
    if (!cloudStorageAvailable && file.size > 700 * 1024) { window.alert("Para PDFs acima de 700 KB, entre na sua conta e ative o Firebase Storage com conexão à internet."); return; }
    try {
      const data = window.comfortPrepareAttachmentFile ? await window.comfortPrepareAttachmentFile(file, "leitor-pdf") : await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, type: "application/pdf", size: file.size, dataUrl: reader.result }); reader.onerror = reject; reader.readAsDataURL(file); });
      if (data.dataUrl && !safePdfDataUrl(data.dataUrl)) throw new Error("O arquivo não parece ser um PDF válido.");
      const files = pdfFiles();
      files.push(Object.assign({ id: Date.now(), type: "application/pdf" }, data));
      write("comfortStudyReaderFiles", files);
      renderPdf();
      if (data.storagePending) window.alert("PDF salvo neste aparelho. O Firebase Storage não aceitou o arquivo; confira a configuração e as regras para sincronizá-lo.");
    } catch (error) {
      window.alert(error && error.message ? error.message : "Não foi possível salvar este PDF.");
    }
  }

  function applyReview(id) {
    const entries = list("comfortStudyDiary"); const item = entries.find(entry => Number(entry.id) === Number(id)); if (!item) return;
    item.reviewCount = (Number(item.reviewCount) || 0) + 1;
    item.nextReviewAt = shiftDate(today(), [3, 7, 14, 30][Math.min(item.reviewCount - 1, 3)]);
    write("comfortStudyDiary", entries);
  }

  function applyNoteReview(id, subject) {
    const contents = read("comfortSubjectContents", {}); const items = Array.isArray(contents[subject]) ? contents[subject] : [];
    const item = items.find(entry => Number(entry.id) === Number(id)); if (!item) return;
    item.reviewCount = (Number(item.reviewCount) || 0) + 1;
    item.nextReviewAt = shiftDate(today(), [3, 7, 14, 30][Math.min(item.reviewCount - 1, 3)]);
    contents[subject] = items; write("comfortSubjectContents", contents);
  }

  const DEFAULT_REMINDER_SETTINGS = { tasks: [0, 1], exams: [0, 1, 3, 7], reviews: [0, 1], browserEnabled: false };
  function reminderSettings() {
    const rawSettings = read("comfortReminderSettings", {});
    const saved = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
    return {
      tasks: Array.isArray(saved.tasks) ? saved.tasks.map(Number).filter(Number.isFinite) : DEFAULT_REMINDER_SETTINGS.tasks,
      exams: Array.isArray(saved.exams) ? saved.exams.map(Number).filter(Number.isFinite) : DEFAULT_REMINDER_SETTINGS.exams,
      reviews: Array.isArray(saved.reviews) ? saved.reviews.map(Number).filter(Number.isFinite) : DEFAULT_REMINDER_SETTINGS.reviews,
      browserEnabled: typeof saved.browserEnabled === "boolean" ? saved.browserEnabled : Boolean(read("comfortStudyNotifications", false))
    };
  }

  function initializeReminderSettings() {
    const form = document.getElementById("reminderSettingsForm");
    if (!form) return;
    if (form.dataset.dirty === "true") return;
    if (form.dataset.listeners !== "true") {
      form.dataset.listeners = "true";
      form.addEventListener("input", () => { form.dataset.dirty = "true"; });
      form.addEventListener("change", () => { form.dataset.dirty = "true"; });
    }
    const settings = reminderSettings();
    ["tasks", "exams", "reviews"].forEach(type => {
      form.querySelectorAll('input[name="reminder' + type[0].toUpperCase() + type.slice(1) + 'Days"]').forEach(input => {
        input.checked = settings[type].includes(Number(input.value));
      });
    });
    const browserToggle = document.getElementById("reminderBrowserEnabled");
    if (browserToggle) browserToggle.checked = settings.browserEnabled;
  }

  function saveReminderSettings(event) {
    event.preventDefault();
    const form = event.target;
    const collect = name => Array.from(form.querySelectorAll('input[name="' + name + '"]:checked')).map(input => Number(input.value)).filter(Number.isFinite).sort((a, b) => a - b);
    const settings = {
      tasks: collect("reminderTasksDays"),
      exams: collect("reminderExamsDays"),
      reviews: collect("reminderReviewsDays"),
      browserEnabled: Boolean(document.getElementById("reminderBrowserEnabled")?.checked)
    };
    write("comfortReminderSettings", settings);
    form.dataset.dirty = "false";
    const status = document.getElementById("reminderSettingsStatus");
    if (settings.browserEnabled && "Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(permission => {
        if (permission !== "granted") {
          settings.browserEnabled = false;
          write("comfortReminderSettings", settings);
          const toggle = document.getElementById("reminderBrowserEnabled");
          if (toggle) toggle.checked = false;
          if (status) status.textContent = "Lembretes salvos. O navegador não autorizou avisos fora da página; os avisos internos continuam ativos.";
        } else if (status) status.textContent = "Lembretes salvos. Avisos do navegador ativados.";
        checkStudyNotifications();
      }).catch(() => { if (status) status.textContent = "Lembretes salvos; não foi possível ativar os avisos do navegador."; });
    } else {
      if (status) status.textContent = settings.browserEnabled && !("Notification" in window) ? "Lembretes salvos. Este navegador não oferece avisos do sistema." : "Lembretes salvos.";
      checkStudyNotifications();
    }
    if (!notificationTimer) notificationTimer = window.setInterval(checkStudyNotifications, 60000);
  }

  function startNotifications() {
    const settings = reminderSettings();
    settings.browserEnabled = true;
    write("comfortReminderSettings", settings);
    if (!("Notification" in window)) {
      settings.browserEnabled = false;
      write("comfortReminderSettings", settings);
      const toggle = document.getElementById("reminderBrowserEnabled");
      if (toggle) toggle.checked = false;
      window.alert("Os lembretes internos continuam ativos, mas este navegador não oferece avisos do sistema.");
      return;
    }
    Notification.requestPermission().then(permission => {
      settings.browserEnabled = permission === "granted";
      write("comfortReminderSettings", settings);
      const toggle = document.getElementById("reminderBrowserEnabled");
      if (toggle) toggle.checked = settings.browserEnabled;
      const button = document.getElementById("enableStudyNotifications");
      if (button) button.textContent = settings.browserEnabled ? "Avisos do navegador ativos" : "Ativar avisos";
      const status = document.getElementById("reminderSettingsStatus");
      if (status) status.textContent = settings.browserEnabled ? "Avisos do navegador ativados." : "Permissão negada; os avisos internos continuam ativos.";
      checkStudyNotifications();
      if (!notificationTimer) notificationTimer = window.setInterval(checkStudyNotifications, 60000);
    }).catch(() => window.alert("Não foi possível ativar os avisos do navegador. Os avisos internos continuam ativos."));
  }

  function daysBetween(from, to) {
    const a = new Date(String(from) + "T12:00:00");
    const b = new Date(String(to) + "T12:00:00");
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  function createReminderNotice(type, item, subject, date, offset, settings, sent) {
    const dateOffset = daysBetween(today(), date);
    if (dateOffset === null || dateOffset < 0 || !settings[type].includes(offset)) return;
    const key = [type, item.id, item.reminderKeyDate || date, offset].join(":");
    if (sent[key]) return;
    const labels = { tasks: "Tarefa", exams: "Prova", reviews: "Revisão" };
    const timing = item.reminderOverdue ? "está pendente" : offset === 0 ? (dateOffset === 0 ? "é hoje" : "está pendente") : "em " + offset + " dia(s)";
    const title = labels[type] + " " + timing;
    const message = String(item.name || item.title || item.front || item.text || "Atividade") + (subject ? " · " + subject : "");
    const notices = list("comfortNotices");
    const existing = notices.some(notice => notice && notice.reminderKey === key);
    if (!existing) {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      notices.unshift({ id: id, title: title, message: message, date: new Date().toISOString(), readAt: "", reminderKey: key, notificationType: type });
      write("comfortNotices", notices);
      if (settings.browserEnabled && "Notification" in window && Notification.permission === "granted") {
        const notification = new Notification(title, { body: message, tag: "comfortstudy-" + key, data: { noticeId: id } });
        notification.onclick = function () {
          const current = list("comfortNotices");
          const notice = current.find(entry => String(entry.id) === String(id));
          if (notice) notice.readAt = new Date().toISOString();
          write("comfortNotices", current);
          window.focus();
          if (typeof window.openPage === "function") window.openPage("avisos");
          window.dispatchEvent(new Event("comfort-notices-updated"));
          notification.close();
        };
      }
    }
    sent[key] = true;
  }

  function checkStudyNotifications() {
    const date = today();
    const settings = reminderSettings();
    const sent = read("comfortNotificationSent", {});
    if (settings.browserEnabled) {
      const now = new Date();
      const minute = now.getHours() * 60 + now.getMinutes();
      list("comfortClassSchedule").filter(item => Number(item.day) === now.getDay() && Math.abs(toMinutes(item.start) - minute) <= 10).forEach(item => {
        const key = "class:" + item.id + ":" + date;
        if (sent[key]) return;
        const notices = list("comfortNotices");
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const title = "Aula em breve";
        const message = String(item.subject || "Aula") + " começa às " + item.start + ".";
        notices.unshift({ id: id, title: title, message: message, date: new Date().toISOString(), readAt: "", reminderKey: key, notificationType: "class" });
        write("comfortNotices", notices);
        if ("Notification" in window && Notification.permission === "granted") {
          const notification = new Notification(title, { body: message, tag: "comfortstudy-" + key });
          notification.onclick = function () { const current = list("comfortNotices"); const notice = current.find(entry => String(entry.id) === String(id)); if (notice) notice.readAt = new Date().toISOString(); write("comfortNotices", current); window.focus(); window.openPage?.("avisos"); window.dispatchEvent(new Event("comfort-notices-updated")); notification.close(); };
        }
        sent[key] = true;
      });
    }
    list("comfortTasks").filter(item => item && item.id != null && !item.completed && item.date).forEach(item => {
      const remaining = daysBetween(date, item.date);
      if (remaining === null) return;
      if (remaining < 0) {
        createReminderNotice("tasks", Object.assign({}, item, { reminderOverdue: true, reminderKeyDate: item.date }), item.subject, date, 0, settings, sent);
        return;
      }
      createReminderNotice("tasks", item, item.subject, item.date, remaining, settings, sent);
    });
    list("comfortExams").filter(item => item && item.id != null && !item.completed && item.date).forEach(item => {
      const remaining = daysBetween(date, item.date);
      if (remaining === null || remaining < 0) return;
      createReminderNotice("exams", item, item.subject, item.date, remaining, settings, sent);
    });
    const reviews = [];
    list("comfortFlashcards").forEach(item => reviews.push({ id: "card-" + item.id, title: item.front, subject: item.subject, date: item.dueAt || date }));
    list("comfortStudyDiary").filter(item => item.review).forEach(item => reviews.push({ id: "diary-" + item.id, title: item.review, subject: item.subject, date: item.nextReviewAt || date }));
    const noteContents = read("comfortSubjectContents", {});
    Object.keys(noteContents || {}).forEach(subject => {
      (Array.isArray(noteContents[subject]) ? noteContents[subject] : []).filter(item => item.important && item.nextReviewAt).forEach(item => reviews.push({ id: "note-" + subject + "-" + item.id, title: item.title, subject: subject, date: item.nextReviewAt }));
    });
    reviews.forEach(item => {
      const remaining = daysBetween(date, item.date);
      if (remaining === null || (remaining < 0 && !settings.reviews.includes(0))) return;
      createReminderNotice("reviews", item, item.subject, remaining < 0 ? date : item.date, remaining < 0 ? 0 : remaining, settings, sent);
    });
    const cutoff = shiftDate(date, -45);
    Object.keys(sent).forEach(key => {
      const sentDate = key.split(":")[2] || "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(sentDate) && sentDate < cutoff) delete sent[key];
    });
    write("comfortNotificationSent", sent);
    window.dispatchEvent(new Event("comfort-notices-updated"));
  }

  function searchNormalize(value) {
    return String(value == null ? "" : value).toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  let globalSearchItems = [];
  function collectGlobalSearchResults(query) {
    const needle = searchNormalize(query);
    const results = [];
    const add = (type, title, detail, haystack, data) => {
      if (!needle || !searchNormalize(haystack).includes(needle)) return;
      results.push({ type: type, title: String(title || "Item"), detail: String(detail || ""), data: data || {} });
    };
    list("comfortTasks").forEach(item => add("task", item.name, (item.subject || "Sem matéria") + (item.date ? " · " + niceDate(item.date) : ""), [item.name, item.subject, item.description, ...(Array.isArray(item.steps) ? item.steps.map(step => step.text) : [])].join(" "), { id: item.id, query: item.name }));
    list("comfortExams").forEach(item => add("exam", item.name, (item.subject || "Sem matéria") + (item.date ? " · " + niceDate(item.date) : ""), [item.name, item.subject].join(" "), { id: item.id, query: item.name }));
    const contents = read("comfortSubjectContents", {});
    const subjects = new Set(list("comfortSubjects").map(item => String(item.name || "").trim()).filter(Boolean));
    Array.from(document.querySelectorAll("#timerStudySubject option, #diarySubject option, #subjectSearch option")).forEach(option => { if (option.value && option.value !== "__none") subjects.add(option.value); });
    Object.keys(contents || {}).forEach(name => subjects.add(name));
    subjects.forEach(name => add("subject", name, "Matéria", name, { subject: name }));
    Object.keys(contents || {}).forEach(subject => {
      (Array.isArray(contents[subject]) ? contents[subject] : []).forEach(item => {
        const files = Array.isArray(item.files) ? item.files.map(file => file.name).join(" ") : "";
        add("note", item.title || item.topic || "Anotação", [subject, item.topic, item.important ? "Importante" : ""].filter(Boolean).join(" · "), [subject, item.topic, item.title, item.text, files].join(" "), { subject: subject, id: item.id, query: query });
      });
    });
    return results.slice(0, 14);
  }

  function renderGlobalSearch(query) {
    const host = document.getElementById("globalSearchResults");
    const input = document.getElementById("globalSearchInput");
    if (!host || !input) return;
    const clean = String(query || "").trim();
    if (clean.length < 2) { globalSearchItems = []; host.hidden = true; input.setAttribute("aria-expanded", "false"); return; }
    globalSearchItems = collectGlobalSearchResults(clean);
    host.innerHTML = globalSearchItems.length
      ? globalSearchItems.map((item, index) => '<button type="button" role="option" class="global-search-result" data-search-result="' + index + '"><strong>' + esc(item.title) + '</strong><span>' + esc(item.type === "task" ? "Tarefa" : item.type === "exam" ? "Prova" : item.type === "subject" ? "Matéria" : "Anotação") + (item.detail ? " · " + esc(item.detail) : "") + '</span></button>').join("")
      : '<div class="global-search-empty">Nenhum resultado para “' + esc(clean) + '”.</div>';
    host.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function openGlobalSearchResult(result) {
    if (!result) return;
    const input = document.getElementById("globalSearchInput");
    const host = document.getElementById("globalSearchResults");
    if (host) host.hidden = true;
    if (input) input.setAttribute("aria-expanded", "false");
    if (result.type === "task") {
      window.openPage?.("tarefas");
      document.querySelector('.filter[data-filter="all"]')?.click();
      const search = document.getElementById("taskSearch");
      if (search) { search.value = result.data.query || result.title; search.dispatchEvent(new Event("input", { bubbles: true })); }
      window.setTimeout(() => { const target = document.querySelector('#fullTaskList [data-task-id="' + String(result.data.id).replace(/[^\d]/g, "") + '"]'); target?.scrollIntoView({ behavior: "smooth", block: "center" }); target?.classList.add("global-search-highlight"); window.setTimeout(() => target?.classList.remove("global-search-highlight"), 1800); }, 80);
    } else if (result.type === "exam") {
      window.openPage?.("provas");
      window.setTimeout(() => { const target = document.querySelector('#examList [data-exam-id="' + String(result.data.id).replace(/[^\d]/g, "") + '"]'); target?.scrollIntoView({ behavior: "smooth", block: "center" }); target?.classList.add("global-search-highlight"); window.setTimeout(() => target?.classList.remove("global-search-highlight"), 1800); }, 80);
    } else {
      window.openPage?.("materias");
      if (typeof window.showSubjectModal === "function") window.showSubjectModal(result.data.subject || result.title);
      if (result.type === "note") window.setTimeout(() => { const search = document.getElementById("subjectContentSearch"); if (search && result.data.query) { search.value = result.data.query; search.dispatchEvent(new Event("input", { bubbles: true })); } }, 50);
    }
  }

  function quickStudyCandidates() {
    const date = today();
    const candidates = [];
    list("comfortTasks").filter(item => item && !item.completed && item.date).forEach(item => {
      const days = daysBetween(date, item.date);
      candidates.push({ title: "Concluir tarefa: " + item.name, subject: item.subject, detail: days < 0 ? "Prazo passou" : days === 0 ? "Prazo hoje" : "Prazo em " + days + " dia(s)", minutes: 20, score: days <= 1 ? 1 : 4 });
    });
    list("comfortExams").filter(item => item && !item.completed && item.date).forEach(item => {
      const days = daysBetween(date, item.date);
      if (days < 0 || days > 45) return;
      candidates.push({ title: "Estudar para a prova: " + item.name, subject: item.subject, detail: days === 0 ? "Prova hoje" : "Prova em " + days + " dia(s)", minutes: 25, score: days <= 3 ? 0 : days <= 10 ? 2 : 5 });
    });
    list("comfortFlashcards").filter(item => String(item.dueAt || date) <= date).slice(0, 8).forEach(item => candidates.push({ title: "Revisar flashcard: " + item.front, subject: item.subject, detail: "Revisão pendente", minutes: 8, score: 2 }));
    list("comfortStudyDiary").filter(item => item.review && item.nextReviewAt && item.nextReviewAt <= date).slice(0, 4).forEach(item => candidates.push({ title: "Rever seu diário de estudos", subject: item.subject, detail: item.review, minutes: 12, score: 2 }));
    const contents = read("comfortSubjectContents", {});
    Object.keys(contents || {}).forEach(subject => (Array.isArray(contents[subject]) ? contents[subject] : []).filter(item => item.important && item.nextReviewAt && item.nextReviewAt <= date).slice(0, 3).forEach(item => candidates.push({ title: "Revisar anotação: " + item.title, subject: subject, detail: item.topic || "Conteúdo importante", minutes: 12, score: 2 })));
    const latest = list("comfortQuizResults").slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))[0];
    const weakSubjects = latest && latest.bySubject ? Object.entries(latest.bySubject).filter(([, value]) => Number(value.total) && Number(value.correct) / Number(value.total) < .7).map(([name]) => name) : [];
    weakSubjects.forEach(subject => candidates.push({ title: "Praticar o assunto que precisa de reforço", subject: subject, detail: "Seu último simulado indicou que vale revisar esta matéria", minutes: 20, score: 3 }));
    const seen = new Set();
    return candidates.sort((a, b) => a.score - b.score).filter(item => { const key = item.title + "|" + item.subject; if (seen.has(key)) return false; seen.add(key); return true; });
  }

  function renderQuickStudyPlan(event) {
    if (event) event.preventDefault();
    const host = document.getElementById("quickStudySuggestions");
    const minutes = Math.max(10, Number(document.getElementById("quickStudyMinutes")?.value) || 45);
    if (!host) return;
    const candidates = quickStudyCandidates();
    if (!candidates.length) {
      const subject = document.getElementById("timerStudySubject")?.selectedOptions?.[0]?.textContent || "uma matéria";
      host.innerHTML = '<div class="quick-study-empty">Separe ' + minutes + ' minutos para estudar <strong>' + esc(subject) + '</strong>: releia suas anotações e escreva um resumo com o que lembrar sem consultar o material.</div>';
      return;
    }
    let remaining = minutes;
    let elapsed = 0;
    const steps = [];
    for (const item of candidates) {
      if (remaining <= 0) break;
      const block = Math.min(item.minutes, remaining);
      steps.push({ item: item, minutes: block, start: elapsed, end: elapsed + block });
      elapsed += block;
      remaining -= block;
    }
    const fallbackSubject = steps.length ? (steps[steps.length - 1].item.subject || "uma matéria") : (document.getElementById("timerStudySubject")?.selectedOptions?.[0]?.textContent || "uma matéria");
    while (remaining > 0) {
      const block = Math.min(25, remaining);
      steps.push({ item: { title: "Revisar anotações e praticar exercícios", subject: fallbackSubject, detail: "Continue no seu ritmo; faça uma pausa curta ao terminar este bloco" }, minutes: block, start: elapsed, end: elapsed + block });
      elapsed += block;
      remaining -= block;
    }
    host.innerHTML = steps.map(step => '<div class="quick-study-step"><span class="quick-study-time">' + step.start + '–' + step.end + ' min</span><div><strong>' + esc(step.item.title) + (step.item.subject ? ' · ' + esc(step.item.subject) : '') + '</strong><span>' + esc(step.item.detail || "Concentre-se nesta etapa") + (step.minutes < step.item.minutes ? " · continue depois se precisar" : "") + '</span></div></div>').join("");
  }

  function renderAll() {
    initializeReminderSettings();
    fillSubjectSelect("classSubject");
    fillSubjectSelect("flashcardSubject");
    fillSubjectSelect("quizSubject");
    fillSubjectSelect("timerStudySubject");
    fillSubjectSelect("gradeSubject");
    fillSubjectSelect("gradeTargetSubject");
    fillSubjectSelect("diarySubject");
    const diaryDate = document.getElementById("diaryDate");
    if (diaryDate && !diaryDate.value) diaryDate.value = today();
    applyAppearance();
    const gradeDate = document.getElementById("gradeDate");
    if (gradeDate && !gradeDate.value) gradeDate.value = today();
    renderGoal();
    renderSchedule();
    renderStudyPlan();
    renderFlashcards();
    renderQuizBank();
    renderSubjectStudyTime();
    renderGrades();
    renderToday();
    renderAgenda();
    renderDiary();
    renderReports();
    renderPdf();
  }

  function exportBackup() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.indexOf("comfort") === 0 && !SAFE_EXPORT_EXCLUDE.has(key)) data[key] = localStorage.getItem(key);
    }
    const file = new Blob([JSON.stringify({ app: "ComfortStudy", version: 1, savedAt: new Date().toISOString(), data: data }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "comfortstudy-backup-" + today() + ".json";
    link.click();
    const downloadUrl = link.href;
    setTimeout(function () { URL.revokeObjectURL(downloadUrl); }, 1000);
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = async function () {
      try {
        const backup = JSON.parse(String(reader.result || ""));
        if (!backup || backup.app !== "ComfortStudy" || !backup.data || typeof backup.data !== "object") throw new Error("invalid");
        if (!window.confirm("A restauração substituirá os dados atuais deste navegador. Continuar?")) return;
        Object.keys(backup.data).forEach(function (key) {
          if (key.indexOf("comfort") === 0 && !SAFE_EXPORT_EXCLUDE.has(key) && typeof backup.data[key] === "string") localStorage.setItem(key, backup.data[key]);
        });
        if (window.comfortCloudFlush) await window.comfortCloudFlush();
        window.alert("Backup restaurado. O app será atualizado.");
        window.location.reload();
      } catch (_) { window.alert("Não foi possível ler esse backup do ComfortStudy."); }
    };
    reader.onerror = function () { window.alert("Não foi possível abrir o arquivo."); };
    reader.readAsText(file);
  }

  function addStudyPlan(event) {
    event.preventDefault();
    const examId = Number(document.getElementById("studyPlanExam").value);
    const requestedDays = Math.max(1, Math.min(30, Number(document.getElementById("studyPlanDays").value) || 7));
    const exam = list("comfortExams").find(function (item) { return Number(item.id) === examId; });
    if (!exam || exam.date <= today()) { window.alert("Escolha uma prova que aconteça em outro dia."); return; }
    const daysUntilExam = Math.ceil((new Date(exam.date + "T12:00:00") - new Date(today() + "T12:00:00")) / 86400000);
    const days = Math.max(1, Math.min(requestedDays, daysUntilExam));
    const plans = list("comfortStudyPlans").filter(function (item) { return Number(item.examId) !== examId; });
    for (let offset = days; offset >= 1; offset--) {
      const date = shiftDate(exam.date, -offset);
      plans.push({ id: String(examId) + "-" + date, examId: examId, subject: exam.subject, title: "Estudar para " + exam.name, date: date, done: false });
    }
    write("comfortStudyPlans", plans);
    renderAll();
  }

  function handleSubmit(event) {
    const form = event.target;
    if (!form || !form.id) return;
    if (form.id === "quickStudyForm") {
      renderQuickStudyPlan(event);
    } else if (form.id === "reminderSettingsForm") {
      saveReminderSettings(event);
    } else if (form.id === "weeklyGoalForm") {
      event.preventDefault();
      const hours = Math.max(0.5, Math.min(100, Number(document.getElementById("weeklyGoalHours").value) || 5));
      write("comfortWeeklyGoal", hours);
      renderGoal();
    } else if (form.id === "dailyGoalForm") {
      event.preventDefault();
      const minutes = Math.max(10, Math.min(720, Number(document.getElementById("dailyGoalMinutes").value) || 60));
      write("comfortDailyGoalMinutes", minutes);
      renderGoal();
    } else if (form.id === "classScheduleForm") {
      event.preventDefault();
      const data = new FormData(form);
      const start = String(data.get("start") || "");
      const end = String(data.get("end") || "");
      if (start >= end) { window.alert("O horário de término precisa ser depois do início."); return; }
      const items = list("comfortClassSchedule");
      items.push({ id: Date.now(), day: Number(data.get("day")), subject: String(data.get("subject")), label: String(data.get("label") || "").trim(), start: start, end: end });
      write("comfortClassSchedule", items);
      form.reset();
      renderAll();
    } else if (form.id === "studyPlanForm") {
      addStudyPlan(event);
    } else if (form.id === "flashcardForm") {
      event.preventDefault();
      const data = new FormData(form);
      const front = String(data.get("front") || "").trim();
      const back = String(data.get("back") || "").trim();
      if (!front || !back) return;
      const cards = list("comfortFlashcards");
      cards.push({ id: Date.now(), subject: String(data.get("subject")), front: front, back: back, dueAt: today(), repetitions: 0 });
      write("comfortFlashcards", cards);
      form.reset();
      renderFlashcards();
    } else if (form.id === "quizQuestionForm") {
      event.preventDefault();
      const data = new FormData(form);
      const options = [0, 1, 2, 3].map(index => String(data.get("option" + index) || "").trim());
      const prompt = String(data.get("prompt") || "").trim();
      if (!prompt || options.some(option => !option)) return;
      const questions = list("comfortQuizQuestions");
      questions.push({ id: Date.now(), subject: String(data.get("subject")), prompt: prompt, options: options, correct: Number(data.get("correct")) });
      write("comfortQuizQuestions", questions);
      form.reset();
      renderQuizBank();
    } else if (form.id === "gradeForm") {
      event.preventDefault();
      const data = new FormData(form);
      const score = Number(data.get("score"));
      const maximum = Number(data.get("maximum"));
      if (maximum <= 0 || score < 0) { window.alert("Informe uma nota válida."); return; }
      const grades = list("comfortGrades");
      grades.push({ id: Date.now(), title: String(data.get("title") || "").trim(), subject: String(data.get("subject")), score: score, maximum: maximum, date: String(data.get("date")) });
      write("comfortGrades", grades);
      form.reset();
      document.getElementById("gradeDate").value = today();
      renderAll();
    } else if (form.id === "gradeTargetForm") {
      calculateGradeTarget(event);
    } else if (form.id === "studyDiaryForm") {
      event.preventDefault();
      const data = new FormData(form); const review = String(data.get("review") || "").trim(); const date = String(data.get("date") || today());
      const entries = list("comfortStudyDiary"); entries.push({ id: Date.now(), subject: String(data.get("subject")), studied: String(data.get("studied") || "").trim(), review: review, date: date, reviewCount: 0, nextReviewAt: review ? shiftDate(date, 1) : "" });
      write("comfortStudyDiary", entries); form.reset(); document.getElementById("diaryDate").value = today(); renderAll();
    } else if (form.id === "appearanceForm") {
      saveAppearance(event);
    } else if (form.id === "pdfPageForm") {
      event.preventDefault();
      const pageNumber = Math.max(1, Number(document.getElementById("pdfPageNumber").value) || 1); document.getElementById("pdfPageNumber").value = pageNumber; renderPdf();
    }
  }

  function handleClick(event) {
    const actionButton = event.target.closest("[data-extra-action]");
    if (actionButton) {
      const action = actionButton.dataset.extraAction; const id = actionButton.dataset.id;
      if (action === "delete-class") write("comfortClassSchedule", list("comfortClassSchedule").filter(item => Number(item.id) !== Number(id)));
      if (action === "delete-plan") write("comfortStudyPlans", list("comfortStudyPlans").filter(item => String(item.id) !== String(id)));
      if (action === "toggle-plan") { const plans = list("comfortStudyPlans"); const item = plans.find(session => String(session.id) === String(id)); if (item) item.done = Boolean(actionButton.checked); write("comfortStudyPlans", plans); }
      if (action === "delete-card") write("comfortFlashcards", list("comfortFlashcards").filter(item => Number(item.id) !== Number(id)));
      if (action === "delete-quiz-question") write("comfortQuizQuestions", list("comfortQuizQuestions").filter(item => Number(item.id) !== Number(id)));
      if (action === "delete-grade") write("comfortGrades", list("comfortGrades").filter(item => Number(item.id) !== Number(id)));
      if (action === "review-diary") applyReview(id);
      if (action === "review-note") applyNoteReview(id, actionButton.dataset.subject);
      if (action === "delete-diary") write("comfortStudyDiary", list("comfortStudyDiary").filter(item => Number(item.id) !== Number(id)));
      if (action === "unbookmark-pdf") { const file = activePdf(); if (file) { const all = annotations(); const data = all[String(file.id)] || { bookmarks: [], notes: [] }; data.bookmarks = (data.bookmarks || []).filter(page => Number(page) !== Number(actionButton.dataset.page)); all[String(file.id)] = data; write("comfortPdfAnnotations", all); } }
      renderAll(); return;
    }
    const control = event.target.closest("button[id], [data-pdf-page]"); const id = control ? control.id : event.target.id;
    if (control && control.hasAttribute("data-pdf-page")) { document.getElementById("pdfPageNumber").value = Math.max(1, Number(control.dataset.pdfPage) || 1); renderPdf(); }
    else if (id === "saveFlashcardAnswer") { const answer = document.getElementById("flashcardAnswer"); const reveal = document.getElementById("saveFlashcardAnswer"); const gradeButtons = document.getElementById("flashcardGradeButtons"); if (answer) answer.hidden = false; if (reveal) reveal.hidden = true; if (gradeButtons) gradeButtons.hidden = false; }
    else if (id === "flashcardRemembered") gradeCurrentCard(true);
    else if (id === "flashcardForgot") gradeCurrentCard(false);
    else if (id === "startFlashcardReview") beginReview();
    else if (id === "startQuizSimulation") beginQuiz();
    else if (id === "quizAnswerButton") answerQuizQuestion();
    else if (id === "quizNextQuestion") nextQuizQuestion();
    else if (id === "closeQuizResult") { const panel = document.getElementById("quizSessionPanel"); if (panel) panel.hidden = true; }
    else if (id === "exportBackup") exportBackup();
    else if (id === "removeStudyPdf") { const file = activePdf(); if (file && window.confirm("Remover este PDF e suas marcações? A cópia sincronizada na nuvem também será removida.")) { window.comfortDeleteAttachment?.(file); write("comfortStudyReaderFiles", pdfFiles().filter(item => Number(item.id) !== Number(file.id))); const all = annotations(); delete all[String(file.id)]; write("comfortPdfAnnotations", all); renderPdf(); } }
    else if (id === "savePdfBookmark") { const file = activePdf(); if (file) { const page = Math.max(1, Number(document.getElementById("pdfPageNumber").value) || 1); const all = annotations(); const data = all[String(file.id)] || { bookmarks: [], notes: [] }; if (!data.bookmarks.includes(page)) data.bookmarks.push(page); all[String(file.id)] = data; write("comfortPdfAnnotations", all); renderPdf(); } }
    else if (id === "savePdfNote") savePdfNote();
    else if (id === "enableStudyNotifications") startNotifications();
  }

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.getElementById("page-planejamento");
    if (!page) return;
    page.addEventListener("submit", handleSubmit);
    page.addEventListener("click", handleClick);
    document.getElementById("page-perfil")?.addEventListener("submit", handleSubmit);
    const importInput = document.getElementById("importBackup");
    if (importInput) importInput.addEventListener("change", function () { if (importInput.files && importInput.files[0]) importBackup(importInput.files[0]); importInput.value = ""; });
    window.addEventListener("comfort-data-updated", function () { renderAll(); checkStudyNotifications(); });
    const searchInput = document.getElementById("globalSearchInput");
    const searchResults = document.getElementById("globalSearchResults");
    searchInput?.addEventListener("input", () => renderGlobalSearch(searchInput.value));
    searchInput?.addEventListener("keydown", event => {
      if (event.key === "Escape") { if (searchResults) searchResults.hidden = true; searchInput.setAttribute("aria-expanded", "false"); }
      if (event.key === "Enter" && globalSearchItems.length) { event.preventDefault(); openGlobalSearchResult(globalSearchItems[0]); }
      if (event.key === "ArrowDown" && searchResults && !searchResults.hidden) { event.preventDefault(); searchResults.querySelector("button")?.focus(); }
    });
    searchResults?.addEventListener("click", event => {
      const button = event.target.closest("[data-search-result]");
      if (!button) return;
      openGlobalSearchResult(globalSearchItems[Number(button.dataset.searchResult)]);
    });
    document.addEventListener("click", event => {
      if (!event.target.closest("#globalSearchBox") && searchResults) {
        searchResults.hidden = true;
        searchInput?.setAttribute("aria-expanded", "false");
      }
    });
    page.addEventListener("change", function (event) {
      if (!event.target) return;
      if (event.target.id === "studyPdfSelect") renderPdf();
      if (event.target.id === "studyPdfUpload") { if (event.target.files && event.target.files[0]) addPdf(event.target.files[0]); event.target.value = ""; }
    });
    renderAll();
    checkStudyNotifications();
    if (!notificationTimer) notificationTimer = window.setInterval(checkStudyNotifications, 60000);
  });
})();
