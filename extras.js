(function () {
  const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const SAFE_EXPORT_EXCLUDE = new Set(["comfortAuthUser", "comfortSession", "comfortLegacyEmail"]);
  let currentReviewId = null;

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

  function renderAll() {
    fillSubjectSelect("classSubject");
    fillSubjectSelect("flashcardSubject");
    fillSubjectSelect("gradeSubject");
    const gradeDate = document.getElementById("gradeDate");
    if (gradeDate && !gradeDate.value) gradeDate.value = today();
    renderGoal();
    renderSchedule();
    renderStudyPlan();
    renderFlashcards();
    renderGrades();
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
    renderStudyPlan();
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
      renderSchedule();
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
      renderGrades();
    }
  }

  function handleClick(event) {
    const button = event.target.closest("[data-extra-action]");
    if (button) {
      const action = button.dataset.extraAction;
      const id = button.dataset.id;
      if (action === "delete-class") write("comfortClassSchedule", list("comfortClassSchedule").filter(function (item) { return Number(item.id) !== Number(id); }));
      if (action === "delete-plan") write("comfortStudyPlans", list("comfortStudyPlans").filter(function (item) { return String(item.id) !== String(id); }));
      if (action === "toggle-plan") {
        const plans = list("comfortStudyPlans");
        const item = plans.find(function (session) { return String(session.id) === String(id); });
        if (item) item.done = Boolean(button.checked);
        write("comfortStudyPlans", plans);
      }
      if (action === "delete-card") write("comfortFlashcards", list("comfortFlashcards").filter(function (item) { return Number(item.id) !== Number(id); }));
      if (action === "delete-grade") write("comfortGrades", list("comfortGrades").filter(function (item) { return Number(item.id) !== Number(id); }));
      renderAll();
      return;
    }
    if (event.target.id === "saveFlashcardAnswer") {
      const answer = document.getElementById("flashcardAnswer");
      const reveal = document.getElementById("saveFlashcardAnswer");
      const gradeButtons = document.getElementById("flashcardGradeButtons");
      if (answer) answer.hidden = false;
      if (reveal) reveal.hidden = true;
      if (gradeButtons) gradeButtons.hidden = false;
    } else if (event.target.id === "flashcardRemembered") gradeCurrentCard(true);
    else if (event.target.id === "flashcardForgot") gradeCurrentCard(false);
    else if (event.target.id === "startFlashcardReview") beginReview();
    else if (event.target.id === "exportBackup") exportBackup();
  }

  document.addEventListener("DOMContentLoaded", function () {
    const page = document.getElementById("page-planejamento");
    if (!page) return;
    page.addEventListener("submit", handleSubmit);
    page.addEventListener("click", handleClick);
    const importInput = document.getElementById("importBackup");
    if (importInput) importInput.addEventListener("change", function () { if (importInput.files && importInput.files[0]) importBackup(importInput.files[0]); importInput.value = ""; });
    window.addEventListener("comfort-data-updated", renderAll);
    renderAll();
  });
})();