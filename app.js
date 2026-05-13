const STORAGE_KEY = "fintrack-state-v1";

const categories = ["Food", "Shopping", "Bills", "Transportation", "Entertainment", "Salary", "Freelance", "Investments"];
const accountTypes = ["Cash", "Bank", "Credit Card", "E-wallet"];
const viewTitles = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  budgets: "Budgets",
  goals: "Goals",
  reports: "Reports",
  accounts: "Accounts",
};

const today = new Date();
const isoToday = today.toISOString().slice(0, 10);

const seedState = {
  users: [
    {
      name: "Demo User",
      email: "demo@fintrack.local",
      password: "password",
    },
    {
      name: "Development Admin",
      email: "admin@fintrack.local",
      password: "admin123",
      role: "admin",
    },
  ],
  sessionEmail: null,
  accounts: [
    { id: crypto.randomUUID(), name: "Main Checking", balance: 4250, type: "Bank" },
    { id: crypto.randomUUID(), name: "Cash Wallet", balance: 320, type: "Cash" },
    { id: crypto.randomUUID(), name: "Rewards Card", balance: -780, type: "Credit Card" },
    { id: crypto.randomUUID(), name: "Momo Wallet", balance: 260, type: "E-wallet" },
  ],
  transactions: [
    { id: crypto.randomUUID(), title: "Monthly salary", amount: 5200, type: "Income", category: "Salary", account: "Main Checking", date: monthDate(2), notes: "May payroll" },
    { id: crypto.randomUUID(), title: "Client invoice", amount: 900, type: "Income", category: "Freelance", account: "Main Checking", date: monthDate(5), notes: "Landing page project" },
    { id: crypto.randomUUID(), title: "Groceries", amount: 168, type: "Expense", category: "Food", account: "Rewards Card", date: monthDate(6), notes: "Weekly shop" },
    { id: crypto.randomUUID(), title: "Electric bill", amount: 92, type: "Expense", category: "Bills", account: "Main Checking", date: monthDate(7), notes: "" },
    { id: crypto.randomUUID(), title: "Ride share", amount: 34, type: "Expense", category: "Transportation", account: "Momo Wallet", date: monthDate(9), notes: "" },
    { id: crypto.randomUUID(), title: "Dinner", amount: 64, type: "Expense", category: "Entertainment", account: "Rewards Card", date: monthDate(11), notes: "Friends" },
  ],
  budgets: [
    { id: crypto.randomUUID(), category: "Food", limit: 650, month: currentMonth() },
    { id: crypto.randomUUID(), category: "Shopping", limit: 450, month: currentMonth() },
    { id: crypto.randomUUID(), category: "Bills", limit: 900, month: currentMonth() },
    { id: crypto.randomUUID(), category: "Transportation", limit: 240, month: currentMonth() },
    { id: crypto.randomUUID(), category: "Entertainment", limit: 350, month: currentMonth() },
  ],
  goals: [
    { id: crypto.randomUUID(), name: "Emergency fund", target: 8000, current: 5100, deadline: nextMonthDate(75) },
    { id: crypto.randomUUID(), name: "Japan trip", target: 3500, current: 1100, deadline: nextMonthDate(160) },
  ],
};

let state = loadState();
let activeView = "dashboard";
let editingTransactionId = null;
let editingAccountId = null;
let editingBudgetId = null;
let editingGoalId = null;

const authScreen = document.querySelector("#authScreen");
const appShell = document.querySelector("#appShell");
const authMessage = document.querySelector("#authMessage");
const viewTitle = document.querySelector("#viewTitle");
const activeUser = document.querySelector("#activeUser");

init();

function init() {
  migrateState();
  bindAuth();
  bindNavigation();
  document.querySelector("#logoutButton").addEventListener("click", logout);
  updateSessionVisibility();
}

function bindAuth() {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-auth-tab]").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      document.querySelectorAll("[data-auth-form]").forEach((form) => form.classList.add("hidden"));
      document.querySelector(`[data-auth-form="${button.dataset.authTab}"]`).classList.remove("hidden");
      authMessage.textContent = "";
    });
  });

  document.querySelector("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const user = state.users.find((item) => item.email === data.email && item.password === data.password);
    if (!user) {
      authMessage.textContent = "Invalid email or password. Try demo@fintrack.local / password.";
      return;
    }
    state.sessionEmail = user.email;
    saveState();
    updateSessionVisibility();
  });

  document.querySelector("#registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (state.users.some((user) => user.email === data.email)) {
      authMessage.textContent = "An account with this email already exists.";
      return;
    }
    state.users.push({ name: data.name, email: data.email, password: data.password });
    state.sessionEmail = data.email;
    saveState();
    updateSessionVisibility();
  });
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.view;
      document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active-view"));
      document.querySelector(`#${activeView}View`).classList.add("active-view");
      viewTitle.textContent = viewTitles[activeView];
      render();
    });
  });
}

function updateSessionVisibility() {
  const user = currentUser();
  authScreen.classList.toggle("hidden", Boolean(user));
  appShell.classList.toggle("hidden", !user);
  if (user) {
    activeUser.textContent = user.name || user.email;
    render();
  }
}

function logout() {
  state.sessionEmail = null;
  saveState();
  updateSessionVisibility();
}

function render() {
  renderDashboard();
  renderTransactions();
  renderBudgets();
  renderGoals();
  renderReports();
  renderAccounts();
}

function renderDashboard() {
  const metrics = calculateMetrics();
  document.querySelector("#dashboardView").innerHTML = `
    <div class="summary-grid">
      ${summaryCard("Total Balance", money(metrics.totalBalance))}
      ${summaryCard("Monthly Income", money(metrics.monthlyIncome))}
      ${summaryCard("Monthly Expenses", money(metrics.monthlyExpenses))}
      ${summaryCard("Savings", money(metrics.savings))}
    </div>
    <div class="content-grid">
      <div class="panel">
        <div class="panel-header"><h3>Income vs Expense</h3><span class="status-pill">${currentMonth()}</span></div>
        <canvas id="incomeExpenseChart" class="chart"></canvas>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Expense Breakdown</h3></div>
        <canvas id="breakdownChart" class="chart"></canvas>
      </div>
    </div>
    <div class="content-grid">
      <div class="panel">
        <div class="panel-header"><h3>Recent Transactions</h3></div>
        ${transactionTable(state.transactions.slice().sort(byDateDesc).slice(0, 5), false)}
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Budget Progress</h3></div>
        ${progressList(budgetProgress(), "budget")}
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Goal Progress</h3></div>
      ${progressList(goalProgress(), "goal")}
    </div>
  `;
  drawBarChart("incomeExpenseChart", [
    { label: "Income", value: metrics.monthlyIncome, color: "#217a57" },
    { label: "Expenses", value: metrics.monthlyExpenses, color: "#b84646" },
    { label: "Savings", value: Math.max(metrics.savings, 0), color: "#276a9f" },
  ]);
  drawDonutChart("breakdownChart", expenseBreakdown());
}

function renderTransactions() {
  document.querySelector("#transactionsView").innerHTML = `
    <div class="panel">
      <div class="panel-header"><h3>${editingTransactionId ? "Edit" : "Add"} Transaction</h3></div>
      <form id="transactionForm" class="form-grid">
        <label>Title<input name="title" required /></label>
        <label>Amount<input name="amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Type<select name="type"><option>Expense</option><option>Income</option></select></label>
        <label>Category<select name="category">${options(categories)}</select></label>
        <label>Account<select name="account">${options(state.accounts.map((account) => account.name))}</select></label>
        <label>Date<input name="date" type="date" value="${isoToday}" required /></label>
        <label class="full-width">Notes<textarea name="notes"></textarea></label>
        <div class="row-actions full-width">
          <button class="primary-button" type="submit">${editingTransactionId ? "Save changes" : "Add transaction"}</button>
          ${editingTransactionId ? '<button id="cancelTransactionEdit" class="ghost-button" type="button">Cancel</button>' : ""}
        </div>
      </form>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Search and Filter</h3></div>
      <div class="filter-row" id="transactionFilters">
        <input data-filter="search" placeholder="Search title or notes" />
        <input data-filter="date" type="date" />
        <select data-filter="category"><option value="">All categories</option>${options(categories)}</select>
        <select data-filter="account"><option value="">All accounts</option>${options(state.accounts.map((account) => account.name))}</select>
        <select data-filter="type"><option value="">Income and expense</option><option>Income</option><option>Expense</option></select>
      </div>
    </div>
    <div id="transactionTableHost"></div>
  `;
  hydrateTransactionForm();
  bindTransactionForm();
  bindTransactionFilters();
  updateTransactionTable();
}

function renderBudgets() {
  document.querySelector("#budgetsView").innerHTML = `
    <div class="content-grid">
      <div class="panel">
        <div class="panel-header"><h3>${editingBudgetId ? "Edit" : "Create"} Budget</h3></div>
        <form id="budgetForm" class="form-grid">
          <label>Category<select name="category">${options(categories.filter((item) => !["Salary", "Freelance", "Investments"].includes(item)))}</select></label>
          <label>Monthly limit<input name="limit" type="number" min="1" step="1" required /></label>
          <label>Month<input name="month" type="month" value="${currentMonth()}" required /></label>
          <div class="row-actions full-width">
            <button class="primary-button" type="submit">${editingBudgetId ? "Save changes" : "Add budget"}</button>
            ${editingBudgetId ? '<button id="cancelBudgetEdit" class="ghost-button" type="button">Cancel</button>' : ""}
          </div>
        </form>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Budget Alerts</h3></div>
        ${budgetAlerts()}
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Spending Progress</h3></div>
      ${progressList(budgetProgress(), "budget")}
    </div>
    ${budgetTable()}
  `;
  hydrateBudgetForm();
  bindBudgetForm();
}

function renderGoals() {
  document.querySelector("#goalsView").innerHTML = `
    <div class="content-grid">
      <div class="panel">
        <div class="panel-header"><h3>${editingGoalId ? "Edit" : "Create"} Saving Goal</h3></div>
        <form id="goalForm" class="form-grid">
          <label>Goal name<input name="name" required /></label>
          <label>Target amount<input name="target" type="number" min="1" step="1" required /></label>
          <label>Current amount<input name="current" type="number" min="0" step="1" required /></label>
          <label>Deadline<input name="deadline" type="date" required /></label>
          <div class="row-actions full-width">
            <button class="primary-button" type="submit">${editingGoalId ? "Save changes" : "Add goal"}</button>
            ${editingGoalId ? '<button id="cancelGoalEdit" class="ghost-button" type="button">Cancel</button>' : ""}
          </div>
        </form>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Goal Progress</h3></div>
        ${progressList(goalProgress(), "goal")}
      </div>
    </div>
    ${goalTable()}
  `;
  hydrateGoalForm();
  bindGoalForm();
}

function renderReports() {
  document.querySelector("#reportsView").innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h3>Report Filters</h3>
        <select id="reportRange">
          <option value="weekly">Weekly</option>
          <option value="monthly" selected>Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="custom">Custom range</option>
        </select>
      </div>
      <div id="customReportFilters" class="filter-row hidden">
        <input id="reportStart" type="date" />
        <input id="reportEnd" type="date" />
      </div>
    </div>
    <div id="reportContent"></div>
  `;
  bindReportFilters();
  updateReportContent();
}

function renderAccounts() {
  document.querySelector("#accountsView").innerHTML = `
    <div class="content-grid">
      <div class="panel">
        <div class="panel-header"><h3>${editingAccountId ? "Edit" : "Add"} Account</h3></div>
        <form id="accountForm" class="form-grid">
          <label>Account name<input name="name" required /></label>
          <label>Balance<input name="balance" type="number" step="0.01" required /></label>
          <label>Type<select name="type">${options(accountTypes)}</select></label>
          <div class="row-actions full-width">
            <button class="primary-button" type="submit">${editingAccountId ? "Save changes" : "Add account"}</button>
            ${editingAccountId ? '<button id="cancelAccountEdit" class="ghost-button" type="button">Cancel</button>' : ""}
          </div>
        </form>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Account Mix</h3></div>
        <canvas id="accountChart" class="chart"></canvas>
      </div>
    </div>
    ${accountTable()}
  `;
  hydrateAccountForm();
  bindAccountForm();
  drawDonutChart("accountChart", state.accounts.map((account, index) => ({
    label: account.name,
    value: Math.abs(Number(account.balance)),
    color: ["#217a57", "#276a9f", "#b7791f", "#7c5cbd", "#b84646"][index % 5],
  })));
}

function bindTransactionForm() {
  const form = document.querySelector("#transactionForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const transaction = {
      id: editingTransactionId || crypto.randomUUID(),
      title: data.title,
      amount: Number(data.amount),
      type: data.type,
      category: data.category,
      account: data.account,
      date: data.date,
      notes: data.notes,
    };
    state.transactions = editingTransactionId
      ? state.transactions.map((item) => (item.id === editingTransactionId ? transaction : item))
      : [transaction, ...state.transactions];
    editingTransactionId = null;
    saveState();
    render();
  });
  document.querySelector("#cancelTransactionEdit")?.addEventListener("click", () => {
    editingTransactionId = null;
    renderTransactions();
  });
}

function bindTransactionFilters() {
  document.querySelectorAll("#transactionFilters [data-filter]").forEach((input) => {
    input.addEventListener("input", updateTransactionTable);
    input.addEventListener("change", updateTransactionTable);
  });
}

function updateTransactionTable() {
  const filters = {};
  document.querySelectorAll("#transactionFilters [data-filter]").forEach((input) => {
    filters[input.dataset.filter] = input.value;
  });
  const rows = state.transactions.filter((transaction) => {
    const text = `${transaction.title} ${transaction.notes}`.toLowerCase();
    return (!filters.search || text.includes(filters.search.toLowerCase()))
      && (!filters.date || transaction.date === filters.date)
      && (!filters.category || transaction.category === filters.category)
      && (!filters.account || transaction.account === filters.account)
      && (!filters.type || transaction.type === filters.type);
  });
  document.querySelector("#transactionTableHost").innerHTML = transactionTable(rows.sort(byDateDesc), true);
  bindTransactionRowActions();
}

function bindTransactionRowActions() {
  document.querySelectorAll("[data-edit-transaction]").forEach((button) => {
    button.addEventListener("click", () => {
      editingTransactionId = button.dataset.editTransaction;
      renderTransactions();
    });
  });
  document.querySelectorAll("[data-delete-transaction]").forEach((button) => {
    button.addEventListener("click", () => {
      state.transactions = state.transactions.filter((item) => item.id !== button.dataset.deleteTransaction);
      saveState();
      render();
    });
  });
}

function bindBudgetForm() {
  const form = document.querySelector("#budgetForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const budget = { id: editingBudgetId || crypto.randomUUID(), category: data.category, limit: Number(data.limit), month: data.month };
    state.budgets = editingBudgetId ? state.budgets.map((item) => (item.id === editingBudgetId ? budget : item)) : [budget, ...state.budgets];
    editingBudgetId = null;
    saveState();
    render();
  });
  document.querySelector("#cancelBudgetEdit")?.addEventListener("click", () => {
    editingBudgetId = null;
    renderBudgets();
  });
  document.querySelectorAll("[data-edit-budget]").forEach((button) => button.addEventListener("click", () => {
    editingBudgetId = button.dataset.editBudget;
    renderBudgets();
  }));
  document.querySelectorAll("[data-delete-budget]").forEach((button) => button.addEventListener("click", () => {
    state.budgets = state.budgets.filter((item) => item.id !== button.dataset.deleteBudget);
    saveState();
    render();
  }));
}

function bindGoalForm() {
  const form = document.querySelector("#goalForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const goal = { id: editingGoalId || crypto.randomUUID(), name: data.name, target: Number(data.target), current: Number(data.current), deadline: data.deadline };
    state.goals = editingGoalId ? state.goals.map((item) => (item.id === editingGoalId ? goal : item)) : [goal, ...state.goals];
    editingGoalId = null;
    saveState();
    render();
  });
  document.querySelector("#cancelGoalEdit")?.addEventListener("click", () => {
    editingGoalId = null;
    renderGoals();
  });
  document.querySelectorAll("[data-edit-goal]").forEach((button) => button.addEventListener("click", () => {
    editingGoalId = button.dataset.editGoal;
    renderGoals();
  }));
  document.querySelectorAll("[data-delete-goal]").forEach((button) => button.addEventListener("click", () => {
    state.goals = state.goals.filter((item) => item.id !== button.dataset.deleteGoal);
    saveState();
    render();
  }));
}

function bindAccountForm() {
  const form = document.querySelector("#accountForm");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const original = state.accounts.find((account) => account.id === editingAccountId);
    const account = { id: editingAccountId || crypto.randomUUID(), name: data.name, balance: Number(data.balance), type: data.type };
    state.accounts = editingAccountId ? state.accounts.map((item) => (item.id === editingAccountId ? account : item)) : [account, ...state.accounts];
    if (original && original.name !== account.name) {
      state.transactions = state.transactions.map((transaction) => transaction.account === original.name ? { ...transaction, account: account.name } : transaction);
    }
    editingAccountId = null;
    saveState();
    render();
  });
  document.querySelector("#cancelAccountEdit")?.addEventListener("click", () => {
    editingAccountId = null;
    renderAccounts();
  });
  document.querySelectorAll("[data-edit-account]").forEach((button) => button.addEventListener("click", () => {
    editingAccountId = button.dataset.editAccount;
    renderAccounts();
  }));
  document.querySelectorAll("[data-delete-account]").forEach((button) => button.addEventListener("click", () => {
    state.accounts = state.accounts.filter((item) => item.id !== button.dataset.deleteAccount);
    saveState();
    render();
  }));
}

function bindReportFilters() {
  const range = document.querySelector("#reportRange");
  const customFilters = document.querySelector("#customReportFilters");
  const update = () => {
    customFilters.classList.toggle("hidden", range.value !== "custom");
    updateReportContent();
  };
  range.addEventListener("change", update);
  document.querySelector("#reportStart").addEventListener("change", update);
  document.querySelector("#reportEnd").addEventListener("change", update);
}

function updateReportContent() {
  const range = document.querySelector("#reportRange").value;
  const start = document.querySelector("#reportStart").value;
  const end = document.querySelector("#reportEnd").value;
  const rows = transactionsForRange(range, start, end);
  const income = sum(rows.filter((item) => item.type === "Income").map((item) => item.amount));
  const expenses = sum(rows.filter((item) => item.type === "Expense").map((item) => item.amount));
  const savings = income - expenses;
  document.querySelector("#reportContent").innerHTML = `
    <div class="summary-grid">
      ${summaryCard("Expenses", money(expenses))}
      ${summaryCard("Income", money(income))}
      ${summaryCard("Net Savings", money(savings))}
      ${summaryCard("Savings Rate", `${income ? Math.round((savings / income) * 100) : 0}%`)}
    </div>
    <div class="content-grid">
      <div class="panel">
        <div class="panel-header"><h3>Spending Trends</h3></div>
        <canvas id="trendChart" class="chart"></canvas>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Income Analysis</h3></div>
        ${reportMetrics(rows)}
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h3>Savings Growth</h3></div>
      <canvas id="savingsChart" class="chart"></canvas>
    </div>
  `;
  drawLineChart("trendChart", seriesFromTransactions(rows, "Expense"), "#b84646");
  drawLineChart("savingsChart", savingsSeriesFromTransactions(rows), "#217a57");
}

function hydrateTransactionForm() {
  const item = state.transactions.find((transaction) => transaction.id === editingTransactionId);
  if (!item) return;
  const form = document.querySelector("#transactionForm");
  Object.entries(item).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
}

function hydrateBudgetForm() {
  const item = state.budgets.find((budget) => budget.id === editingBudgetId);
  if (!item) return;
  const form = document.querySelector("#budgetForm");
  form.elements.category.value = item.category;
  form.elements.limit.value = item.limit;
  form.elements.month.value = item.month;
}

function hydrateGoalForm() {
  const item = state.goals.find((goal) => goal.id === editingGoalId);
  if (!item) return;
  const form = document.querySelector("#goalForm");
  form.elements.name.value = item.name;
  form.elements.target.value = item.target;
  form.elements.current.value = item.current;
  form.elements.deadline.value = item.deadline;
}

function hydrateAccountForm() {
  const item = state.accounts.find((account) => account.id === editingAccountId);
  if (!item) return;
  const form = document.querySelector("#accountForm");
  form.elements.name.value = item.name;
  form.elements.balance.value = item.balance;
  form.elements.type.value = item.type;
}

function transactionTable(rows, actions) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th><th>Amount</th><th>Type</th><th>Category</th><th>Account</th><th>Date</th>${actions ? "<th>Actions</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${rows.map((transaction) => `
            <tr>
              <td><strong>${escapeHtml(transaction.title)}</strong><br><span class="muted">${escapeHtml(transaction.notes || "")}</span></td>
              <td class="${transaction.type === "Income" ? "amount-income" : "amount-expense"}">${transaction.type === "Income" ? "+" : "-"}${money(transaction.amount)}</td>
              <td>${transaction.type}</td>
              <td>${transaction.category}</td>
              <td>${transaction.account}</td>
              <td>${formatDate(transaction.date)}</td>
              ${actions ? `<td><div class="row-actions"><button class="icon-button" title="Edit" data-edit-transaction="${transaction.id}" type="button">Edit</button><button class="icon-button" title="Delete" data-delete-transaction="${transaction.id}" type="button">Del</button></div></td>` : ""}
            </tr>
          `).join("") || `<tr><td colspan="${actions ? 7 : 6}">No transactions found.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
}

function budgetTable() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Category</th><th>Month</th><th>Limit</th><th>Spent</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.budgets.map((budget) => {
            const spent = spentForBudget(budget);
            const percent = budget.limit ? Math.round((spent / budget.limit) * 100) : 0;
            return `<tr><td>${budget.category}</td><td>${budget.month}</td><td>${money(budget.limit)}</td><td>${money(spent)}</td><td><span class="status-pill">${percent}% used</span></td><td><div class="row-actions"><button class="icon-button" data-edit-budget="${budget.id}" type="button">Edit</button><button class="icon-button" data-delete-budget="${budget.id}" type="button">Del</button></div></td></tr>`;
          }).join("") || '<tr><td colspan="6">No budgets yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function goalTable() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Goal</th><th>Target</th><th>Current</th><th>Deadline</th><th>Progress</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.goals.map((goal) => `<tr><td>${escapeHtml(goal.name)}</td><td>${money(goal.target)}</td><td>${money(goal.current)}</td><td>${formatDate(goal.deadline)}</td><td><span class="status-pill">${Math.round((goal.current / goal.target) * 100)}%</span></td><td><div class="row-actions"><button class="icon-button" data-edit-goal="${goal.id}" type="button">Edit</button><button class="icon-button" data-delete-goal="${goal.id}" type="button">Del</button></div></td></tr>`).join("") || '<tr><td colspan="6">No goals yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function accountTable() {
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Account</th><th>Type</th><th>Balance</th><th>Transactions</th><th>Actions</th></tr></thead>
        <tbody>
          ${state.accounts.map((account) => `<tr><td><strong>${escapeHtml(account.name)}</strong></td><td>${account.type}</td><td class="${account.balance >= 0 ? "amount-income" : "amount-expense"}">${money(account.balance)}</td><td>${state.transactions.filter((transaction) => transaction.account === account.name).length}</td><td><div class="row-actions"><button class="icon-button" data-edit-account="${account.id}" type="button">Edit</button><button class="icon-button" data-delete-account="${account.id}" type="button">Del</button></div></td></tr>`).join("") || '<tr><td colspan="5">No accounts yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function progressList(items, kind) {
  return `
    <div class="progress-list">
      ${items.map((item) => `
        <div class="progress-item">
          <div class="progress-head"><span>${escapeHtml(item.label)}</span><span>${item.percent}%</span></div>
          <div class="progress-track"><div class="progress-fill ${item.status}" style="width: ${Math.min(item.percent, 100)}%"></div></div>
          <p class="muted">${kind === "budget" ? `${money(item.current)} spent of ${money(item.target)}` : `${money(item.current)} saved of ${money(item.target)} by ${formatDate(item.deadline)}`}</p>
        </div>
      `).join("") || '<p class="muted">No progress items yet.</p>'}
    </div>
  `;
}

function budgetAlerts() {
  const alerts = budgetProgress().filter((item) => item.percent >= 80);
  if (!alerts.length) return '<p class="muted">No active alerts. Budgets are under control.</p>';
  return alerts.map((item) => `<div class="metric-inline"><span>${item.label}</span><strong>${item.percent}% used</strong></div>`).join("");
}

function reportMetrics(rows = state.transactions.filter((transaction) => transaction.date.startsWith(currentMonth()))) {
  const incomeByCategory = rows.filter((transaction) => transaction.type === "Income").reduce((acc, transaction) => {
    acc[transaction.category] = (acc[transaction.category] || 0) + Number(transaction.amount);
    return acc;
  }, {});
  return Object.entries(incomeByCategory).map(([label, value]) => `<div class="metric-inline"><span>${label}</span><strong>${money(value)}</strong></div>`).join("") || '<p class="muted">No income recorded.</p>';
}

function calculateMetrics() {
  const current = currentMonth();
  const monthlyIncome = sum(state.transactions.filter((item) => item.type === "Income" && item.date.startsWith(current)).map((item) => item.amount));
  const monthlyExpenses = sum(state.transactions.filter((item) => item.type === "Expense" && item.date.startsWith(current)).map((item) => item.amount));
  return {
    totalBalance: sum(state.accounts.map((account) => Number(account.balance))),
    monthlyIncome,
    monthlyExpenses,
    savings: monthlyIncome - monthlyExpenses,
  };
}

function budgetProgress() {
  return state.budgets.map((budget) => {
    const spent = spentForBudget(budget);
    const percent = budget.limit ? Math.round((spent / budget.limit) * 100) : 0;
    return { label: budget.category, current: spent, target: budget.limit, percent, status: percent >= 100 ? "danger" : percent >= 80 ? "warning" : "" };
  });
}

function goalProgress() {
  return state.goals.map((goal) => {
    const percent = goal.target ? Math.round((goal.current / goal.target) * 100) : 0;
    return { label: goal.name, current: goal.current, target: goal.target, deadline: goal.deadline, percent, status: percent >= 100 ? "" : percent >= 80 ? "warning" : "" };
  });
}

function spentForBudget(budget) {
  return sum(state.transactions.filter((transaction) => transaction.type === "Expense" && transaction.category === budget.category && transaction.date.startsWith(budget.month)).map((item) => item.amount));
}

function expenseBreakdown() {
  const grouped = groupTransactions("Expense");
  const colors = ["#217a57", "#276a9f", "#b7791f", "#7c5cbd", "#b84646", "#4f6f52"];
  return Object.entries(grouped).map(([label, value], index) => ({ label, value, color: colors[index % colors.length] }));
}

function groupTransactions(type) {
  return state.transactions.filter((transaction) => transaction.type === type && transaction.date.startsWith(currentMonth())).reduce((acc, transaction) => {
    acc[transaction.category] = (acc[transaction.category] || 0) + Number(transaction.amount);
    return acc;
  }, {});
}

function transactionsForRange(range, start, end) {
  const now = new Date(`${isoToday}T00:00:00`);
  let from = new Date(now);
  let to = new Date(now);
  if (range === "weekly") from.setDate(now.getDate() - 6);
  if (range === "monthly") from = new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "yearly") from = new Date(now.getFullYear(), 0, 1);
  if (range === "custom") {
    from = start ? new Date(`${start}T00:00:00`) : new Date("1970-01-01T00:00:00");
    to = end ? new Date(`${end}T00:00:00`) : new Date("2999-12-31T00:00:00");
  }
  return state.transactions.filter((transaction) => {
    const date = new Date(`${transaction.date}T00:00:00`);
    return date >= from && date <= to;
  });
}

function seriesFromTransactions(rows, type) {
  const grouped = rows.filter((transaction) => transaction.type === type).reduce((acc, transaction) => {
    const label = transaction.date.slice(5);
    acc[label] = (acc[label] || 0) + Number(transaction.amount);
    return acc;
  }, {});
  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value })).slice(-8);
}

function savingsSeriesFromTransactions(rows) {
  const grouped = rows.reduce((acc, transaction) => {
    const label = transaction.date.slice(5);
    if (!acc[label]) acc[label] = { income: 0, expenses: 0 };
    if (transaction.type === "Income") acc[label].income += Number(transaction.amount);
    if (transaction.type === "Expense") acc[label].expenses += Number(transaction.amount);
    return acc;
  }, {});
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value: Math.max(value.income - value.expenses, 0) }))
    .slice(-8);
}

function drawBarChart(id, data) {
  const canvas = document.querySelector(`#${id}`);
  const { ctx, width, height } = prepareCanvas(canvas);
  const max = Math.max(...data.map((item) => item.value), 1);
  const gap = 28;
  const barWidth = (width - gap * (data.length + 1)) / data.length;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#68746d";
  ctx.font = "13px system-ui";
  data.forEach((item, index) => {
    const x = gap + index * (barWidth + gap);
    const barHeight = (height - 72) * (item.value / max);
    const y = height - 42 - barHeight;
    ctx.fillStyle = item.color;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = "#17211c";
    ctx.fillText(item.label, x, height - 16);
    ctx.fillStyle = "#68746d";
    ctx.fillText(compactMoney(item.value), x, Math.max(18, y - 8));
  });
}

function drawDonutChart(id, data) {
  const canvas = document.querySelector(`#${id}`);
  const { ctx, width, height } = prepareCanvas(canvas);
  const total = sum(data.map((item) => item.value));
  ctx.clearRect(0, 0, width, height);
  if (!total) {
    ctx.fillStyle = "#68746d";
    ctx.font = "14px system-ui";
    ctx.fillText("No data yet", 20, 30);
    return;
  }
  const radius = Math.min(width, height) * 0.28;
  const cx = width * 0.36;
  const cy = height * 0.5;
  let start = -Math.PI / 2;
  data.forEach((item) => {
    const angle = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    start += angle;
  });
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.58, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.font = "13px system-ui";
  data.forEach((item, index) => {
    const y = 32 + index * 24;
    ctx.fillStyle = item.color;
    ctx.fillRect(width * 0.67, y - 11, 12, 12);
    ctx.fillStyle = "#17211c";
    ctx.fillText(`${item.label} ${compactMoney(item.value)}`, width * 0.67 + 20, y);
  });
}

function drawLineChart(id, data, color) {
  const canvas = document.querySelector(`#${id}`);
  const { ctx, width, height } = prepareCanvas(canvas);
  const max = Math.max(...data.map((item) => item.value), 1);
  const left = 38;
  const bottom = height - 34;
  const step = (width - left - 24) / Math.max(data.length - 1, 1);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#dce4de";
  ctx.beginPath();
  ctx.moveTo(left, 16);
  ctx.lineTo(left, bottom);
  ctx.lineTo(width - 16, bottom);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  data.forEach((item, index) => {
    const x = left + index * step;
    const y = bottom - ((bottom - 22) * item.value) / max;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = "#17211c";
  ctx.font = "13px system-ui";
  data.forEach((item, index) => {
    const x = left + index * step;
    ctx.fillText(item.label, x - 10, height - 10);
  });
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  return { ctx, width: rect.width, height: rect.height };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return structuredClone(seedState);
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
    return structuredClone(seedState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrateState() {
  const requiredUsers = seedState.users;
  let changed = false;
  requiredUsers.forEach((requiredUser) => {
    if (!state.users.some((user) => user.email === requiredUser.email)) {
      state.users.push(requiredUser);
      changed = true;
    }
  });
  if (changed) saveState();
}

function currentUser() {
  return state.users.find((user) => user.email === state.sessionEmail);
}

function summaryCard(label, value) {
  return `<article class="summary-card"><span>${label}</span><strong>${value}</strong></article>`;
}

function options(items) {
  return items.map((item) => `<option>${escapeHtml(item)}</option>`).join("");
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function compactMoney(value) {
  return new Intl.NumberFormat("en-US", { notation: "compact", style: "currency", currency: "USD" }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function byDateDesc(a, b) {
  return b.date.localeCompare(a.date);
}

function currentMonth() {
  return today.toISOString().slice(0, 7);
}

function monthDate(day) {
  return `${currentMonth()}-${String(day).padStart(2, "0")}`;
}

function nextMonthDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
