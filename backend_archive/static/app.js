/* ─────────────────────────────────────────────────────────────────────────── *
 *  Home Accountant – Frontend
 * ─────────────────────────────────────────────────────────────────────────── */

// ── State ────────────────────────────────────────────────────────────────────
let persons = [];
let categories = [];
let currentPage = "dashboard";

// ── API helpers ───────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch("/api" + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Ошибка сервера");
  }
  if (res.status === 204) return null;
  return res.json();
}

const GET = (path) => api("GET", path);
const POST = (path, body) => api("POST", path, body);
const PUT = (path, body) => api("PUT", path, body);
const DEL = (path) => api("DELETE", path);

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = "toast"; }, 3000);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

// Close on overlay click
document.querySelectorAll(".modal-overlay").forEach(el => {
  el.addEventListener("click", e => {
    if (e.target === el) closeModal(el.id);
  });
});

// ── Format helpers ────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s) => new Date(s).toLocaleDateString("ru-RU", { day: "2-digit", month: "short" });

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ── Load shared data ──────────────────────────────────────────────────────────
async function loadShared() {
  [persons, categories] = await Promise.all([GET("/persons"), GET("/categories")]);
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.page === page);
  });
  const titles = { dashboard: "Обзор", expenses: "Расходы", settings: "Настройки" };
  document.getElementById("pageTitle").textContent = titles[page] || page;
  document.getElementById("addExpenseBtn").style.display = page === "settings" ? "none" : "block";
  renderPage(page);
}

async function renderPage(page) {
  await loadShared();
  const el = document.getElementById("pageContent");
  if (page === "dashboard")  el.innerHTML = await buildDashboard();
  if (page === "expenses")   el.innerHTML = buildExpenses();
  if (page === "settings")   el.innerHTML = buildSettings();

  if (page === "dashboard")  bindDashboard();
  if (page === "expenses")   bindExpenses();
  if (page === "settings")   bindSettings();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function periodDefaults() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

async function buildDashboard(from, to) {
  const { from: df, to: dt } = periodDefaults();
  const f = from || df;
  const t = to || dt;

  const data = await GET(`/dashboard?date_from=${f}&date_to=${t}`);

  const maxCat = data.by_category[0]?.total || 1;
  const maxPer = data.by_person[0]?.total || 1;

  const categoryBars = data.by_category.length
    ? data.by_category.map(c => `
      <div class="bar-item">
        <div class="bar-meta">
          <span class="bar-name"><span>${c.icon}</span> ${esc(c.name)}</span>
          <span style="font-weight:700">${fmt(c.total)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(c.total/maxCat*100).toFixed(1)}%;background:${c.color}"></div>
        </div>
      </div>`).join("")
    : `<p style="color:var(--text2);font-size:.9rem">Нет данных</p>`;

  const personBars = data.by_person.length
    ? data.by_person.map(p => `
      <div class="bar-item">
        <div class="bar-meta">
          <span class="bar-name">
            <span class="color-dot" style="background:${p.color}"></span>
            ${esc(p.name)}
          </span>
          <span style="font-weight:700">${fmt(p.total)}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(p.total/maxPer*100).toFixed(1)}%;background:${p.color}"></div>
        </div>
      </div>`).join("")
    : `<p style="color:var(--text2);font-size:.9rem">Нет данных</p>`;

  return `
    <div class="period-bar">
      <select id="periodSelect">
        <option value="month">Этот месяц</option>
        <option value="prev_month">Прошлый месяц</option>
        <option value="year">Этот год</option>
        <option value="custom">Произвольный период</option>
      </select>
      <span id="customRange" style="display:none;gap:.5rem;display:none;align-items:center">
        <input type="date" id="dateFrom" value="${f}" />
        <span style="color:var(--text2)">—</span>
        <input type="date" id="dateTo" value="${t}" />
        <button class="btn btn-primary btn-sm" id="applyRange">Применить</button>
      </span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Всего расходов</div>
        <div class="stat-value">${fmt(data.total)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Категорий</div>
        <div class="stat-value">${data.by_category.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Участников</div>
        <div class="stat-value">${data.by_person.length}</div>
      </div>
    </div>

    <div class="charts-row">
      <div class="card">
        <div class="chart-title">По категориям</div>
        ${categoryBars}
      </div>
      <div class="card">
        <div class="chart-title">По участникам</div>
        ${personBars}
      </div>
    </div>
  `;
}

function bindDashboard() {
  const sel = document.getElementById("periodSelect");
  const customRange = document.getElementById("customRange");

  sel.addEventListener("change", async () => {
    const v = sel.value;
    const now = new Date();
    let f, t;

    if (v === "month") {
      f = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      t = now.toISOString().slice(0, 10);
      customRange.style.display = "none";
    } else if (v === "prev_month") {
      const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      f = pm.toISOString().slice(0, 10);
      t = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      customRange.style.display = "none";
    } else if (v === "year") {
      f = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      t = now.toISOString().slice(0, 10);
      customRange.style.display = "none";
    } else {
      customRange.style.display = "flex";
      return;
    }

    document.getElementById("pageContent").innerHTML = await buildDashboard(f, t);
    bindDashboard();
    document.getElementById("periodSelect").value = v;
  });

  const applyBtn = document.getElementById("applyRange");
  if (applyBtn) {
    applyBtn.addEventListener("click", async () => {
      const f = document.getElementById("dateFrom").value;
      const t = document.getElementById("dateTo").value;
      document.getElementById("pageContent").innerHTML = await buildDashboard(f, t);
      bindDashboard();
      document.getElementById("periodSelect").value = "custom";
      document.getElementById("customRange").style.display = "flex";
    });
  }
}

// ── Expenses ──────────────────────────────────────────────────────────────────
let expenseFilters = { person_id: "", category_id: "", date_from: "", date_to: "" };
let expenseData = [];

function buildExpenses() {
  const personOpts = persons.map(p =>
    `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  const catOpts = categories.map(c =>
    `<option value="${c.id}">${c.icon} ${esc(c.name)}</option>`).join("");

  return `
    <div class="filters">
      <select id="fPerson">
        <option value="">Все участники</option>
        ${personOpts}
      </select>
      <select id="fCategory">
        <option value="">Все категории</option>
        ${catOpts}
      </select>
      <input type="date" id="fDateFrom" placeholder="С" title="Дата от" />
      <input type="date" id="fDateTo"   placeholder="По" title="Дата до" />
    </div>
    <div class="card" style="padding:0;overflow:auto">
      <table class="expense-table">
        <thead>
          <tr>
            <th>Дата</th>
            <th>Описание</th>
            <th>Категория</th>
            <th>Участник</th>
            <th>Сумма</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="expenseBody">
          <tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text2)">Загрузка…</td></tr>
        </tbody>
      </table>
    </div>
  `;
}

async function loadExpenses() {
  const params = new URLSearchParams();
  if (expenseFilters.person_id)   params.set("person_id",   expenseFilters.person_id);
  if (expenseFilters.category_id) params.set("category_id", expenseFilters.category_id);
  if (expenseFilters.date_from)   params.set("date_from",   expenseFilters.date_from);
  if (expenseFilters.date_to)     params.set("date_to",     expenseFilters.date_to);

  expenseData = await GET(`/expenses?${params}`);
  renderExpenseBody();
}

function renderExpenseBody() {
  const tbody = document.getElementById("expenseBody");
  if (!tbody) return;

  if (!expenseData.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="emoji">📭</div>
          <div>Расходов нет</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = expenseData.map(e => `
    <tr data-id="${e.id}">
      <td data-label="Дата">${fmtDate(e.date)}</td>
      <td data-label="Описание">${esc(e.description)}</td>
      <td data-label="Категория">
        <span class="pill" style="background:${e.category.color}22;color:${e.category.color}">
          ${e.category.icon} ${esc(e.category.name)}
        </span>
      </td>
      <td data-label="Участник">
        <span class="pill" style="background:${e.person.color}22;color:${e.person.color}">
          ${esc(e.person.name)}
        </span>
      </td>
      <td data-label="Сумма" class="amount-cell">${fmt(e.amount)}</td>
      <td class="actions-cell">
        <button class="btn btn-icon edit-btn" data-id="${e.id}" title="Редактировать">✏️</button>
        <button class="btn btn-icon delete-btn" data-id="${e.id}" title="Удалить">🗑️</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", () => openEditExpense(+btn.dataset.id));
  });
  tbody.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteExpense(+btn.dataset.id));
  });
}

function bindExpenses() {
  ["fPerson", "fCategory", "fDateFrom", "fDateTo"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("change", () => {
      expenseFilters = {
        person_id:   document.getElementById("fPerson").value,
        category_id: document.getElementById("fCategory").value,
        date_from:   document.getElementById("fDateFrom").value,
        date_to:     document.getElementById("fDateTo").value,
      };
      loadExpenses();
    });
  });
  loadExpenses();
}

function openEditExpense(id) {
  const e = expenseData.find(x => x.id === id);
  if (!e) return;
  fillExpenseModal(e);
  openModal("expenseModal");
}

async function deleteExpense(id) {
  if (!confirm("Удалить расход?")) return;
  try {
    await DEL(`/expenses/${id}`);
    showToast("Удалено");
    loadExpenses();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────
function buildSettings() {
  const personItems = persons.map(p => `
    <div class="item-row">
      <span class="color-dot" style="background:${p.color}"></span>
      <span class="item-label">${esc(p.name)}</span>
      <button class="btn btn-icon edit-person-btn" data-id="${p.id}" title="Редактировать">✏️</button>
      <button class="btn btn-icon delete-person-btn" data-id="${p.id}" title="Удалить">🗑️</button>
    </div>`).join("") || `<p style="color:var(--text2);font-size:.9rem">Нет участников</p>`;

  const catItems = categories.map(c => `
    <div class="item-row">
      <span>${c.icon}</span>
      <span class="color-dot" style="background:${c.color}"></span>
      <span class="item-label">${esc(c.name)}</span>
      <button class="btn btn-icon edit-cat-btn" data-id="${c.id}" title="Редактировать">✏️</button>
      <button class="btn btn-icon delete-cat-btn" data-id="${c.id}" title="Удалить">🗑️</button>
    </div>`).join("") || `<p style="color:var(--text2);font-size:.9rem">Нет категорий</p>`;

  return `
    <div class="settings-section">
      <h2>Участники семьи</h2>
      <div class="item-list" id="personList">${personItems}</div>
      <button class="btn btn-primary btn-sm" id="addPersonBtn">+ Добавить участника</button>
    </div>

    <div class="settings-section">
      <h2>Категории расходов</h2>
      <div class="item-list" id="categoryList">${catItems}</div>
      <button class="btn btn-primary btn-sm" id="addCategoryBtn">+ Добавить категорию</button>
    </div>

    <div class="settings-section">
      <h2>Резервная копия</h2>
      <p style="color:var(--text2);font-size:.9rem;margin-bottom:.75rem">
        Скачать базу данных (SQLite файл)
      </p>
      <a href="/api/backup" class="btn btn-ghost btn-sm" download="backup.db">📥 Скачать базу данных</a>
    </div>
  `;
}

function bindSettings() {
  document.getElementById("addPersonBtn")?.addEventListener("click", () => {
    document.getElementById("personId").value = "";
    document.getElementById("personName").value = "";
    document.getElementById("personColor").value = "#6366f1";
    document.getElementById("personModalTitle").textContent = "Добавить участника";
    openModal("personModal");
  });

  document.getElementById("addCategoryBtn")?.addEventListener("click", () => {
    document.getElementById("categoryId").value = "";
    document.getElementById("categoryName").value = "";
    document.getElementById("categoryIcon").value = "💰";
    document.getElementById("categoryColor").value = "#10b981";
    document.getElementById("categoryModalTitle").textContent = "Добавить категорию";
    openModal("categoryModal");
  });

  document.querySelectorAll(".edit-person-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const p = persons.find(x => x.id === +btn.dataset.id);
      if (!p) return;
      document.getElementById("personId").value = p.id;
      document.getElementById("personName").value = p.name;
      document.getElementById("personColor").value = p.color;
      document.getElementById("personModalTitle").textContent = "Редактировать участника";
      openModal("personModal");
    });
  });

  document.querySelectorAll(".delete-person-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Удалить участника? Все его расходы также будут удалены.")) return;
      try {
        await DEL(`/persons/${btn.dataset.id}`);
        showToast("Участник удалён");
        renderPage("settings");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });

  document.querySelectorAll(".edit-cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const c = categories.find(x => x.id === +btn.dataset.id);
      if (!c) return;
      document.getElementById("categoryId").value = c.id;
      document.getElementById("categoryName").value = c.name;
      document.getElementById("categoryIcon").value = c.icon;
      document.getElementById("categoryColor").value = c.color;
      document.getElementById("categoryModalTitle").textContent = "Редактировать категорию";
      openModal("categoryModal");
    });
  });

  document.querySelectorAll(".delete-cat-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Удалить категорию?")) return;
      try {
        await DEL(`/categories/${btn.dataset.id}`);
        showToast("Категория удалена");
        renderPage("settings");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  });
}

// ── Expense modal ─────────────────────────────────────────────────────────────
function fillExpenseModal(e = null) {
  document.getElementById("modalTitle").textContent = e ? "Редактировать расход" : "Добавить расход";
  document.getElementById("expenseId").value = e?.id || "";
  document.getElementById("expenseAmount").value = e?.amount || "";
  document.getElementById("expenseDesc").value = e?.description || "";
  document.getElementById("expenseDate").value = e?.date || todayISO();

  const personSel = document.getElementById("expensePerson");
  personSel.innerHTML = persons.map(p =>
    `<option value="${p.id}" ${e?.person_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`
  ).join("");

  const catSel = document.getElementById("expenseCategory");
  catSel.innerHTML = categories.map(c =>
    `<option value="${c.id}" ${e?.category_id === c.id ? "selected" : ""}>${c.icon} ${esc(c.name)}</option>`
  ).join("");
}

// ── Forms ─────────────────────────────────────────────────────────────────────
document.getElementById("expenseForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("expenseId").value;
  const body = {
    amount:      +document.getElementById("expenseAmount").value,
    description: document.getElementById("expenseDesc").value.trim(),
    date:        document.getElementById("expenseDate").value,
    person_id:   +document.getElementById("expensePerson").value,
    category_id: +document.getElementById("expenseCategory").value,
  };
  try {
    if (id) {
      await PUT(`/expenses/${id}`, body);
      showToast("Расход обновлён");
    } else {
      await POST("/expenses", body);
      showToast("Расход добавлен");
    }
    closeModal("expenseModal");
    renderPage(currentPage);
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById("personForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("personId").value;
  const body = {
    name:  document.getElementById("personName").value.trim(),
    color: document.getElementById("personColor").value,
  };
  try {
    if (id) await PUT(`/persons/${id}`, body);
    else     await POST("/persons", body);
    showToast(id ? "Участник обновлён" : "Участник добавлен");
    closeModal("personModal");
    renderPage("settings");
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById("categoryForm").addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const id = document.getElementById("categoryId").value;
  const body = {
    name:  document.getElementById("categoryName").value.trim(),
    icon:  document.getElementById("categoryIcon").value || "💰",
    color: document.getElementById("categoryColor").value,
  };
  try {
    if (id) await PUT(`/categories/${id}`, body);
    else     await POST("/categories", body);
    showToast(id ? "Категория обновлена" : "Категория добавлена");
    closeModal("categoryModal");
    renderPage("settings");
  } catch (err) {
    showToast(err.message, "error");
  }
});

// ── Nav bindings ──────────────────────────────────────────────────────────────
document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navigate(link.dataset.page);
    // close sidebar on mobile
    document.getElementById("sidebar").classList.remove("open");
    document.querySelector(".overlay")?.classList.remove("show");
  });
});

document.getElementById("addExpenseBtn").addEventListener("click", () => {
  fillExpenseModal();
  openModal("expenseModal");
});

document.getElementById("modalClose").addEventListener("click", () => closeModal("expenseModal"));
document.getElementById("cancelBtn").addEventListener("click", () => closeModal("expenseModal"));

// Mobile burger
const burgerBtn = document.getElementById("burger");
const sidebar = document.getElementById("sidebar");

// Add overlay for mobile
const overlay = document.createElement("div");
overlay.className = "overlay";
document.body.appendChild(overlay);

burgerBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
});
overlay.addEventListener("click", () => {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
});

// ── XSS escape ────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
navigate("dashboard");
