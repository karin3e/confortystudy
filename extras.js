(function () {
  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const SAFE_EXPORT_EXCLUDE = new Set(["comfortAuthUser", "comfortSession", "comfortLegacyEmail"]);
  let currentReviewId = null;
  let notificationTimer = null;

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
    const picks = [];
    dates.forEach(date => {
      const weekday = new Date(date + "T12:00:00").getDay();
      const busy = classes.filter(item => Number(item.day) === weekday).map(item => [toMinutes(item.start), toMinutes(item.end)]).filter(pair => pair[0] >= 0 && pair[1] > pair[0]).sort((a, b) => a[0] - b[0]);
      let cursor = 8 * 60;
      busy.concat([[20 * 60, 20 * 60]]).forEach(pair => {
        const start = Math.max(cursor, 8 * 60);
        const end = Math.min(pair[0], 20 * 60);
        if (end - start >= 45 && picks.length < 5) {
          const focus = deadlines.find(item => item.date >= date && item.subject) || deadlines.find(item => item.subject) || null;
          picks.push({ date: date, start: start, end: Math.min(start + 60, end), focus: focus ? focus.subject : "revisão livre" });
        }
        cursor = Math.max(cursor, pair[1]);
      });
    });
    suggestions.innerHTML = picks.length ? picks.map(slot => '<div class="feature-row"><div><strong>' + niceDate(slot.date) + ' · ' + minutesText(slot.start) + '–' + minutesText(slot.end) + '</strong><span>Sugestão de estudo: ' + esc(slot.focus) + '</span></div></div>').join("") : empty("Cadastre suas aulas para encontrar intervalos livres.");
    const notificationButton = document.getElementById("enableStudyNotifications");
    if (notificationButton) notificationButton.textContent = read("comfortStudyNotifications", false) ? "Avisos ativos" : "Ativar avisos";
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
    report.innerHTML = '<div class="report-metric"><strong>' + formatHours(studySeconds) + '</strong><span>tempo estudado</span></div><div class="report-metric"><strong>' + completed + '</strong><span>tarefas concluídas</span></div><div class="report-metric"><strong>' + (average === null ? "—" : average.toFixed(1).replace(".", ",") + "%") + '</strong><span>média das notas do mês</span></div>';
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
    const page = Math.max(1, Number(document.getElementById("pdfPageNumber").value) || 1);
    document.getElementById("pdfPageNumber").value = page;
    document.getElementById("studyPdfViewer").src = file.dataUrl + "#page=" + page + "&toolbar=1";
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
  function addPdf(file) {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) { window.alert("Escolha um arquivo PDF."); return; }
    if (file.size > 700 * 1024) { window.alert("Para manter o app estável, o PDF deve ter até 700 KB. PDFs maiores precisarão de armazenamento em nuvem."); return; }
    const reader = new FileReader(); reader.onload = function () {
      try { const files = pdfFiles(); files.push({ id: Date.now(), name: file.name, type: "application/pdf", dataUrl: reader.result }); write("comfortStudyReaderFiles", files); renderPdf(); }
      catch (_) { window.alert("Não há espaço suficiente neste navegador para guardar esse PDF."); }
    }; reader.onerror = function () { window.alert("Não foi possível abrir esse PDF."); }; reader.readAsDataURL(file);
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

  function startNotifications() {
    if (!("Notification" in window)) { window.alert("Este navegador não oferece avisos do app."); return; }
    Notification.requestPermission().then(permission => {
      if (permission !== "granted") { window.alert("Os avisos não foram autorizados no navegador."); return; }
      write("comfortStudyNotifications", true);
      new Notification("ComfortStudy", { body: "Avisos de aulas, prazos, provas e revisões ativados enquanto o app estiver aberto." });
      checkStudyNotifications();
      if (!notificationTimer) notificationTimer = window.setInterval(checkStudyNotifications, 60000);
      const button = document.getElementById("enableStudyNotifications"); if (button) button.textContent = "Avisos ativos";
    }).catch(() => window.alert("Não foi possível ativar avisos neste navegador. Confira as permissões do site."));
  }

  function checkStudyNotifications() {
    if (!read("comfortStudyNotifications", false) || !("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date(); const date = today(); const minute = now.getHours() * 60 + now.getMinutes(); const day = now.getDay(); const sent = read("comfortNotificationSent", {});
    list("comfortClassSchedule").filter(item => Number(item.day) === day && Math.abs(toMinutes(item.start) - minute) <= 10).forEach(item => {
      const key = "class-" + date + "-" + item.id;
      if (!sent[key]) { new Notification("Aula em breve", { body: item.subject + " começa às " + item.start + "." }); sent[key] = true; }
    });
    if (now.getHours() >= 7 && now.getHours() < 22) {
      const dueTasks = list("comfortTasks").filter(item => !item.completed && item.date === date).length;
      const dueExams = list("comfortExams").filter(item => !item.completed && item.date >= date && item.date <= shiftDate(date, 2)).length;
      const noteContents = read("comfortSubjectContents", {});
      const noteReviews = Object.keys(noteContents || {}).reduce((sum, subject) => sum + (Array.isArray(noteContents[subject]) ? noteContents[subject].filter(item => item.important && item.nextReviewAt && item.nextReviewAt <= date).length : 0), 0);
      const dueReviews = list("comfortStudyDiary").filter(item => item.review && item.nextReviewAt && item.nextReviewAt <= date).length + list("comfortFlashcards").filter(item => String(item.dueAt || date) <= date).length + noteReviews;
      const key = "daily-" + date;
      if (!sent[key] && (dueTasks || dueExams || dueReviews)) { new Notification("Seu lembrete de estudos", { body: dueTasks + " tarefa(s) para hoje, " + dueExams + " prova(s) nos próximos dias e " + dueReviews + " revisão(ões) pendente(s)." }); sent[key] = true; }
    }
    write("comfortNotificationSent", sent);
  }

  function renderAll() {
    fillSubjectSelect("classSubject");
    fillSubjectSelect("flashcardSubject");
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
    if (form.id === "weeklyGoalForm") {
      event.preventDefault();
      const hours = Math.max(0.5, Math.min(100, Number(document.getElementById("weeklyGoalHours").value) || 5));
      write("comfortWeeklyGoal", hours);
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
    else if (id === "exportBackup") exportBackup();
    else if (id === "removeStudyPdf") { const file = activePdf(); if (file && window.confirm("Remover este PDF e suas marcações deste navegador?")) { write("comfortStudyReaderFiles", pdfFiles().filter(item => Number(item.id) !== Number(file.id))); const all = annotations(); delete all[String(file.id)]; write("comfortPdfAnnotations", all); renderPdf(); } }
    else if (id === "savePdfBookmark") { const file = activePdf(); if (file) { const page = Math.max(1, Number(document.getElementById("pdfPageNumber").value) || 1); const all = annotations(); const data = all[String(file.id)] || { bookmarks: [], notes: [] }; if (!data.bookmarks.includes(page)) data.bookmarks.push(page); all[String(file.id)] = data; write("comfortPdfAnnotations", all); renderPdf(); } }
    else if (id === "savePdfNote") savePdfNote();
    else if (id === "enableStudyNotifications") startNotifications();
  }

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.getElementById("page-planejamento");
    if (!page) return;
    page.addEventListener("submit", handleSubmit);
    page.addEventListener("click", handleClick);
    const importInput = document.getElementById("importBackup");
    if (importInput) importInput.addEventListener("change", function () { if (importInput.files && importInput.files[0]) importBackup(importInput.files[0]); importInput.value = ""; });
    window.addEventListener("comfort-data-updated", renderAll);
    page.addEventListener("change", function (event) {
      if (!event.target) return;
      if (event.target.id === "studyPdfSelect") renderPdf();
      if (event.target.id === "studyPdfUpload") { if (event.target.files && event.target.files[0]) addPdf(event.target.files[0]); event.target.value = ""; }
    });
    renderAll();
    if (read("comfortStudyNotifications", false)) { checkStudyNotifications(); if (!notificationTimer) notificationTimer = window.setInterval(checkStudyNotifications, 60000); }
  });
})();