const STORAGE_KEY = "prop-firm-tracker:v1";
const EURO = "EUR";

const categoryLabels = {
  challenge: "Compra challenge",
  reset: "Reset",
  activation: "Activacion",
  subscription: "Mensualidad",
  platform: "Plataforma",
  commission: "Comision",
  payout: "Payout",
  refund: "Refund",
  other: "Otro",
};

const expenseCategories = ["challenge", "reset", "activation", "subscription", "platform", "commission", "other"];
const incomeCategories = ["payout", "refund", "other"];

const statusLabels = {
  active: "Activa",
  passed: "Pasada",
  funded: "Fondeada",
  failed: "Fallada",
  closed: "Cerrada",
};

const defaultState = {
  firms: [],
  accounts: [],
  transactions: [],
};

let state = loadState();
let confirmHandler = null;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  setCurrentDate();
  bindEvents();
  refreshAll();
});

function bindElements() {
  [
    "pageTitle",
    "currentDateLabel",
    "metricNet",
    "metricNetHint",
    "metricExpenses",
    "metricIncome",
    "metricRoi",
    "metricRoiHint",
    "metricBreakEven",
    "metricActiveAccounts",
    "metricAccountHint",
    "monthExpenses",
    "monthIncome",
    "monthNet",
    "netChart",
    "monthChart",
    "netChartEmpty",
    "monthChartEmpty",
    "firmsTableBody",
    "accountsTableBody",
    "transactionsTableBody",
    "firmsEmpty",
    "accountsEmpty",
    "transactionsEmpty",
    "accountFirmFilter",
    "accountStatusFilter",
    "accountSearch",
    "transactionFirmFilter",
    "transactionKindFilter",
    "transactionFromFilter",
    "transactionToFilter",
    "transactionSearch",
    "firmDialog",
    "firmForm",
    "firmDialogTitle",
    "firmId",
    "firmName",
    "firmType",
    "firmNotes",
    "accountDialog",
    "accountForm",
    "accountDialogTitle",
    "accountId",
    "accountFirm",
    "accountName",
    "accountSize",
    "accountStatus",
    "accountPurchasedAt",
    "accountNotes",
    "transactionDialog",
    "transactionForm",
    "transactionDialogTitle",
    "transactionId",
    "transactionDate",
    "transactionKind",
    "transactionCategory",
    "transactionAmount",
    "transactionFirm",
    "transactionAccount",
    "transactionNote",
    "confirmDialog",
    "confirmTitle",
    "confirmMessage",
    "confirmAcceptButton",
    "importFileInput",
    "toast",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setActiveSection(button.dataset.section));
  });

  document.getElementById("addFirmButton").addEventListener("click", () => openFirmDialog());
  document.getElementById("addFirmButtonInline").addEventListener("click", () => openFirmDialog());
  document.getElementById("addAccountButton").addEventListener("click", () => openAccountDialog());
  document.getElementById("addAccountButtonInline").addEventListener("click", () => openAccountDialog());
  document.getElementById("addTransactionButton").addEventListener("click", () => openTransactionDialog());
  document.getElementById("addTransactionButtonInline").addEventListener("click", () => openTransactionDialog());

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.dataset.closeDialog));
  });

  els.firmForm.addEventListener("submit", saveFirmFromForm);
  els.accountForm.addEventListener("submit", saveAccountFromForm);
  els.transactionForm.addEventListener("submit", saveTransactionFromForm);

  els.transactionKind.addEventListener("change", () => {
    fillTransactionCategories(els.transactionKind.value, els.transactionCategory.value);
  });
  els.transactionFirm.addEventListener("change", () => {
    fillAccountSelect(els.transactionAccount, els.transactionFirm.value, true);
  });
  els.transactionAccount.addEventListener("change", () => {
    const account = getAccount(els.transactionAccount.value);
    if (account) {
      els.transactionFirm.value = account.firmId;
      fillAccountSelect(els.transactionAccount, account.firmId, true, account.id);
    }
  });

  ["accountFirmFilter", "accountStatusFilter", "accountSearch"].forEach((id) => {
    els[id].addEventListener("input", renderAccountsTable);
  });

  [
    "transactionFirmFilter",
    "transactionKindFilter",
    "transactionFromFilter",
    "transactionToFilter",
    "transactionSearch",
  ].forEach((id) => {
    els[id].addEventListener("input", renderTransactionsTable);
  });

  els.firmsTableBody.addEventListener("click", handleTableAction);
  els.accountsTableBody.addEventListener("click", handleTableAction);
  els.transactionsTableBody.addEventListener("click", handleTableAction);

  document.getElementById("exportJsonButton").addEventListener("click", exportJson);
  document.getElementById("exportCsvButton").addEventListener("click", exportCsv);
  document.getElementById("importJsonButton").addEventListener("click", () => els.importFileInput.click());
  els.importFileInput.addEventListener("change", importJson);

  els.confirmAcceptButton.addEventListener("click", () => {
    if (confirmHandler) {
      confirmHandler();
      confirmHandler = null;
    }
    closeDialog("confirmDialog");
  });

  window.addEventListener("resize", debounce(() => {
    drawCharts(getSummary());
  }, 120));
}

function setCurrentDate() {
  const formatter = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  els.currentDateLabel.textContent = formatter.format(new Date());
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return {
      firms: Array.isArray(parsed.firms) ? parsed.firms : [],
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function refreshAll() {
  fillFirmSelects();
  fillAccountSelect(els.transactionAccount, els.transactionFirm.value, true);
  renderDashboard();
  renderFirmsTable();
  renderAccountsTable();
  renderTransactionsTable();
  refreshIcons();
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function setActiveSection(section) {
  const titles = {
    overview: "Panel",
    firms: "Firms",
    accounts: "Cuentas",
    transactions: "Movimientos",
  };

  document.querySelectorAll(".section-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${section}Section`);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === section);
  });
  els.pageTitle.textContent = titles[section] || "Panel";
  drawCharts(getSummary());
}

function fillFirmSelects() {
  const firmOptions = state.firms
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((firm) => `<option value="${escapeHtml(firm.id)}">${escapeHtml(firm.name)}</option>`)
    .join("");

  const filterOptions = `<option value="all">Todas</option>${firmOptions}`;
  els.accountFirmFilter.innerHTML = filterOptions;
  els.transactionFirmFilter.innerHTML = filterOptions;
  els.accountFirm.innerHTML = firmOptions || `<option value="">Crea una firm primero</option>`;
  els.transactionFirm.innerHTML = firmOptions || `<option value="">Crea una firm primero</option>`;
}

function fillAccountSelect(select, firmId, includeEmpty, selectedId = "") {
  const accounts = state.accounts
    .filter((account) => !firmId || account.firmId === firmId)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const empty = includeEmpty ? `<option value="">Sin cuenta concreta</option>` : "";
  select.innerHTML = `${empty}${accounts
    .map((account) => `<option value="${escapeHtml(account.id)}">${escapeHtml(account.name)}</option>`)
    .join("")}`;
  select.value = selectedId || "";
}

function fillTransactionCategories(kind, selected = "") {
  const categories = kind === "income" ? incomeCategories : expenseCategories;
  els.transactionCategory.innerHTML = categories
    .map((category) => `<option value="${category}">${categoryLabels[category]}</option>`)
    .join("");
  if (categories.includes(selected)) {
    els.transactionCategory.value = selected;
  }
}

function getSummary() {
  const transactions = state.transactions.map((transaction) => ({
    ...transaction,
    resolvedFirmId: resolveFirmId(transaction),
  }));
  const expenses = sum(transactions.filter((tx) => tx.kind === "expense").map((tx) => tx.amount));
  const income = sum(transactions.filter((tx) => tx.kind === "income").map((tx) => tx.amount));
  const net = income - expenses;
  const roi = expenses > 0 ? (net / expenses) * 100 : 0;
  const breakEven = Math.max(0, expenses - income);
  const activeAccounts = state.accounts.filter((account) =>
    ["active", "passed", "funded"].includes(account.status)
  ).length;

  return {
    transactions,
    expenses,
    income,
    net,
    roi,
    breakEven,
    activeAccounts,
  };
}

function renderDashboard() {
  const summary = getSummary();

  els.metricNet.textContent = formatMoney(summary.net);
  els.metricExpenses.textContent = formatMoney(summary.expenses);
  els.metricIncome.textContent = formatMoney(summary.income);
  els.metricRoi.textContent = formatPercent(summary.roi);
  els.metricBreakEven.textContent = formatMoney(summary.breakEven);
  els.metricActiveAccounts.textContent = String(summary.activeAccounts);
  els.metricAccountHint.textContent = `${state.accounts.length} cuentas registradas`;
  els.metricNetHint.textContent =
    summary.transactions.length === 0
      ? "Sin movimientos"
      : summary.net >= 0
        ? "Retiros por encima de gastos"
        : "Gastos por encima de retiros";

  document.querySelector(".metric-net").classList.toggle("positive", summary.net > 0);
  document.querySelector(".metric-net").classList.toggle("negative", summary.net < 0);

  const now = new Date();
  const monthKey = toMonthKey(now.toISOString().slice(0, 10));
  const monthTransactions = summary.transactions.filter((tx) => toMonthKey(tx.date) === monthKey);
  const monthExpenses = sum(monthTransactions.filter((tx) => tx.kind === "expense").map((tx) => tx.amount));
  const monthIncome = sum(monthTransactions.filter((tx) => tx.kind === "income").map((tx) => tx.amount));
  const monthNet = monthIncome - monthExpenses;
  els.monthExpenses.textContent = formatMoney(monthExpenses);
  els.monthIncome.textContent = formatMoney(monthIncome);
  els.monthNet.textContent = formatMoney(monthNet);
  els.monthNet.className = monthNet >= 0 ? "amount positive" : "amount negative";

  drawCharts(summary);
}

function renderFirmsTable() {
  const rows = state.firms
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((firm) => {
      const firmTransactions = state.transactions.filter((tx) => resolveFirmId(tx) === firm.id);
      const expenses = sum(firmTransactions.filter((tx) => tx.kind === "expense").map((tx) => tx.amount));
      const income = sum(firmTransactions.filter((tx) => tx.kind === "income").map((tx) => tx.amount));
      const net = income - expenses;
      const roi = expenses > 0 ? (net / expenses) * 100 : 0;
      const accountCount = state.accounts.filter((account) => account.firmId === firm.id).length;
      return `
        <tr>
          <td>
            <div class="table-title">
              <strong>${escapeHtml(firm.name)}</strong>
              <span>${escapeHtml(firm.notes || "")}</span>
            </div>
          </td>
          <td>${escapeHtml(firm.type)}</td>
          <td>${accountCount}</td>
          <td class="amount negative">${formatMoney(expenses)}</td>
          <td class="amount positive">${formatMoney(income)}</td>
          <td class="amount ${net >= 0 ? "positive" : "negative"}">${formatMoney(net)}</td>
          <td>${formatPercent(roi)}</td>
          <td>
            <div class="row-actions">
              ${actionButton("edit-firm", firm.id, "Editar", "pencil")}
              ${actionButton("delete-firm", firm.id, "Eliminar", "trash-2")}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  els.firmsTableBody.innerHTML = rows;
  els.firmsEmpty.style.display = state.firms.length ? "none" : "block";
  refreshIcons();
}

function renderAccountsTable() {
  const firmFilter = els.accountFirmFilter.value || "all";
  const statusFilter = els.accountStatusFilter.value || "all";
  const search = normalize(els.accountSearch.value);

  const accounts = state.accounts
    .filter((account) => firmFilter === "all" || account.firmId === firmFilter)
    .filter((account) => statusFilter === "all" || account.status === statusFilter)
    .filter((account) => {
      if (!search) return true;
      const firm = getFirm(account.firmId);
      return normalize(`${account.name} ${account.size} ${firm?.name || ""} ${account.notes || ""}`).includes(search);
    })
    .sort((a, b) => (b.purchasedAt || "").localeCompare(a.purchasedAt || ""));

  els.accountsTableBody.innerHTML = accounts
    .map((account) => {
      const firm = getFirm(account.firmId);
      const txs = state.transactions.filter((tx) => tx.accountId === account.id);
      const expenses = sum(txs.filter((tx) => tx.kind === "expense").map((tx) => tx.amount));
      const income = sum(txs.filter((tx) => tx.kind === "income").map((tx) => tx.amount));
      const net = income - expenses;
      return `
        <tr>
          <td>
            <div class="table-title">
              <strong>${escapeHtml(account.name)}</strong>
              <span>${escapeHtml(account.notes || "")}</span>
            </div>
          </td>
          <td>${escapeHtml(firm?.name || "Sin firm")}</td>
          <td>${escapeHtml(account.size || "-")}</td>
          <td><span class="badge ${account.status}">${statusLabels[account.status] || account.status}</span></td>
          <td>${formatDate(account.purchasedAt)}</td>
          <td class="amount negative">${formatMoney(expenses)}</td>
          <td class="amount positive">${formatMoney(income)}</td>
          <td class="amount ${net >= 0 ? "positive" : "negative"}">${formatMoney(net)}</td>
          <td>
            <div class="row-actions">
              ${actionButton("edit-account", account.id, "Editar", "pencil")}
              ${actionButton("delete-account", account.id, "Eliminar", "trash-2")}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  els.accountsEmpty.style.display = accounts.length ? "none" : "block";
  refreshIcons();
}

function renderTransactionsTable() {
  const firmFilter = els.transactionFirmFilter.value || "all";
  const kindFilter = els.transactionKindFilter.value || "all";
  const from = els.transactionFromFilter.value;
  const to = els.transactionToFilter.value;
  const search = normalize(els.transactionSearch.value);

  const transactions = state.transactions
    .filter((tx) => firmFilter === "all" || resolveFirmId(tx) === firmFilter)
    .filter((tx) => kindFilter === "all" || tx.kind === kindFilter)
    .filter((tx) => !from || tx.date >= from)
    .filter((tx) => !to || tx.date <= to)
    .filter((tx) => {
      if (!search) return true;
      const firm = getFirm(resolveFirmId(tx));
      const account = getAccount(tx.accountId);
      return normalize(`${categoryLabels[tx.category] || tx.category} ${tx.note || ""} ${firm?.name || ""} ${account?.name || ""}`).includes(search);
    })
    .sort((a, b) => {
      const byDate = (b.date || "").localeCompare(a.date || "");
      return byDate || (b.createdAt || "").localeCompare(a.createdAt || "");
    });

  els.transactionsTableBody.innerHTML = transactions
    .map((tx) => {
      const firm = getFirm(resolveFirmId(tx));
      const account = getAccount(tx.accountId);
      const signed = tx.kind === "income" ? tx.amount : -tx.amount;
      return `
        <tr>
          <td>${formatDate(tx.date)}</td>
          <td><span class="badge ${tx.kind}">${tx.kind === "income" ? "Retiro" : "Gasto"}</span></td>
          <td>${categoryLabels[tx.category] || escapeHtml(tx.category)}</td>
          <td>${escapeHtml(firm?.name || "Sin firm")}</td>
          <td>${escapeHtml(account?.name || "-")}</td>
          <td>${escapeHtml(tx.note || "-")}</td>
          <td class="amount ${signed >= 0 ? "positive" : "negative"}">${formatMoney(signed)}</td>
          <td>
            <div class="row-actions">
              ${actionButton("edit-transaction", tx.id, "Editar", "pencil")}
              ${actionButton("delete-transaction", tx.id, "Eliminar", "trash-2")}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  els.transactionsEmpty.style.display = transactions.length ? "none" : "block";
  refreshIcons();
}

function drawCharts(summary) {
  drawNetChart(summary.transactions);
  drawMonthChart(summary.transactions);
}

function drawNetChart(transactions) {
  const canvas = els.netChart;
  const ctx = canvas.getContext("2d");
  const series = buildCapitalSeries(transactions);

  setupCanvas(canvas, ctx);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!series.length) {
    els.netChartEmpty.style.display = "grid";
    return;
  }
  els.netChartEmpty.style.display = "none";

  const values = series.flatMap((point) => [point.net, point.income, point.expense]);
  const rawMin = Math.min(0, ...series.map((point) => point.net));
  const rawMax = Math.max(0, ...values);
  const padding = Math.max((rawMax - rawMin) * 0.08, rawMax > 0 ? rawMax * 0.04 : 1);
  const min = rawMin < 0 ? rawMin - padding : 0;
  const max = rawMax + padding;
  drawGrid(ctx, canvas, min, max);

  const pad = chartPadding(canvas);
  const range = max - min || 1;
  const xFor = (index) => pad.left + (index / Math.max(series.length - 1, 1)) * (canvas.width - pad.left - pad.right);
  const yFor = (value) => pad.top + ((max - value) / range) * (canvas.height - pad.top - pad.bottom);

  const zeroY = yFor(0);
  drawCapitalArea(ctx, series, xFor, yFor, zeroY);

  ctx.strokeStyle = "#aebbb5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, zeroY);
  ctx.lineTo(canvas.width - pad.right, zeroY);
  ctx.stroke();

  drawSeriesLine(ctx, series, "expense", xFor, yFor, "#c64242", 2);
  drawSeriesLine(ctx, series, "income", xFor, yFor, "#0f8a5f", 2);
  drawSeriesLine(ctx, series, "net", xFor, yFor, "#7c3aed", 3);

  const last = series[series.length - 1];
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.arc(xFor(series.length - 1), yFor(last.net), 5, 0, Math.PI * 2);
  ctx.fill();

  drawXAxisLabels(ctx, canvas, series);
  drawChartLabel(ctx, canvas, `${formatMoney(last.net)}`, canvas.width - pad.right, yFor(last.net), "right");
}

function buildCapitalSeries(transactions) {
  const validTransactions = transactions.filter((tx) => tx.date && Number(tx.amount) > 0);
  if (!validTransactions.length) return [];

  const totalsByDate = new Map();
  validTransactions.forEach((tx) => {
    const current = totalsByDate.get(tx.date) || { income: 0, expense: 0 };
    if (tx.kind === "income") current.income += Number(tx.amount);
    else current.expense += Number(tx.amount);
    totalsByDate.set(tx.date, current);
  });

  const dates = [...totalsByDate.keys()].sort();
  let cursor = shiftIsoDate(dates[0], -1);
  const end = shiftIsoDate(dates[dates.length - 1], 1);
  let net = 0;
  const series = [];

  while (cursor <= end) {
    const totals = totalsByDate.get(cursor) || { income: 0, expense: 0 };
    net += totals.income - totals.expense;
    series.push({
      date: cursor,
      income: totals.income,
      expense: totals.expense,
      net,
    });
    cursor = shiftIsoDate(cursor, 1);
  }

  return series;
}

function drawCapitalArea(ctx, series, xFor, yFor, zeroY) {
  ctx.fillStyle = "rgba(124, 58, 237, 0.14)";
  ctx.beginPath();
  ctx.moveTo(xFor(0), zeroY);
  drawSmoothSeriesPath(ctx, series, "net", xFor, yFor, true);
  ctx.lineTo(xFor(series.length - 1), zeroY);
  ctx.closePath();
  ctx.fill();
}

function drawSeriesLine(ctx, series, key, xFor, yFor, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  drawSmoothSeriesPath(ctx, series, key, xFor, yFor);
  ctx.stroke();
}

function drawSmoothSeriesPath(ctx, series, key, xFor, yFor, connectFromCurrentPoint = false) {
  if (!series.length) return;

  const points = series.map((point, index) => ({
    x: xFor(index),
    y: yFor(point[key]),
  }));

  if (connectFromCurrentPoint) ctx.lineTo(points[0].x, points[0].y);
  else ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 1) return;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const midX = (previous.x + current.x) / 2;
    const midY = (previous.y + current.y) / 2;
    ctx.quadraticCurveTo(previous.x, previous.y, midX, midY);
  }

  const penultimate = points[points.length - 2];
  const last = points[points.length - 1];
  ctx.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
}

function drawXAxisLabels(ctx, canvas, series) {
  const pad = chartPadding(canvas);
  const first = series[0];
  const last = series[series.length - 1];
  ctx.fillStyle = "#62706b";
  ctx.font = "12px Inter, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(formatShortDate(first.date), pad.left, canvas.height - 10);
  ctx.textAlign = "right";
  ctx.fillText(formatShortDate(last.date), canvas.width - pad.right, canvas.height - 10);
}

function drawMonthChart(transactions) {
  const canvas = els.monthChart;
  const ctx = canvas.getContext("2d");
  setupCanvas(canvas, ctx);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!transactions.length) {
    els.monthChartEmpty.style.display = "grid";
    return;
  }
  els.monthChartEmpty.style.display = "none";

  const months = getLastMonths(6);
  const grouped = months.map((month) => {
    const txs = transactions.filter((tx) => toMonthKey(tx.date) === month.key);
    const expenses = sum(txs.filter((tx) => tx.kind === "expense").map((tx) => tx.amount));
    const income = sum(txs.filter((tx) => tx.kind === "income").map((tx) => tx.amount));
    return { ...month, expenses, income };
  });
  const max = Math.max(1, ...grouped.flatMap((item) => [item.expenses, item.income]));
  const pad = chartPadding(canvas);
  const innerWidth = canvas.width - pad.left - pad.right;
  const innerHeight = canvas.height - pad.top - pad.bottom;
  const groupWidth = innerWidth / grouped.length;
  const barWidth = Math.max(8, Math.min(26, groupWidth * 0.25));

  drawGrid(ctx, canvas, 0, max);

  grouped.forEach((item, index) => {
    const center = pad.left + index * groupWidth + groupWidth / 2;
    const expenseHeight = (item.expenses / max) * innerHeight;
    const incomeHeight = (item.income / max) * innerHeight;
    const baseline = pad.top + innerHeight;

    ctx.fillStyle = "#c64242";
    roundRect(ctx, center - barWidth - 2, baseline - expenseHeight, barWidth, expenseHeight, 4);
    ctx.fill();

    ctx.fillStyle = "#0f8a5f";
    roundRect(ctx, center + 2, baseline - incomeHeight, barWidth, incomeHeight, 4);
    ctx.fill();

    ctx.fillStyle = "#62706b";
    ctx.font = "12px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(item.label, center, canvas.height - 10);
  });
}

function setupCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.width = Math.floor(rect.width);
  canvas.height = Math.floor(rect.height);
}

function chartPadding(canvas) {
  return {
    top: 18,
    right: 18,
    bottom: canvas.height < 210 ? 28 : 34,
    left: 18,
  };
}

function drawGrid(ctx, canvas, min, max) {
  const pad = chartPadding(canvas);
  const lines = 4;
  ctx.strokeStyle = "#e2e8e5";
  ctx.lineWidth = 1;
  for (let i = 0; i <= lines; i += 1) {
    const y = pad.top + (i / lines) * (canvas.height - pad.top - pad.bottom);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(canvas.width - pad.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#62706b";
  ctx.font = "12px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(formatMoney(max), pad.left, pad.top + 2);
  ctx.fillText(formatMoney(min), pad.left, canvas.height - pad.bottom - 2);
}

function drawChartLabel(ctx, canvas, label, x, y, align = "left") {
  ctx.font = "12px Inter, sans-serif";
  const width = ctx.measureText(label).width + 14;
  const height = 26;
  const left = align === "right" ? x - width : x;
  const top = Math.max(8, Math.min(canvas.height - height - 8, y - height - 8));
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#d9e0dd";
  roundRect(ctx, left, top, width, height, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#15201d";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, left + width / 2, top + height / 2 + 1);
  ctx.textBaseline = "alphabetic";
}

function openFirmDialog(firm = null) {
  els.firmForm.reset();
  els.firmId.value = firm?.id || "";
  els.firmName.value = firm?.name || "";
  els.firmType.value = firm?.type || "Futuros";
  els.firmNotes.value = firm?.notes || "";
  els.firmDialogTitle.textContent = firm ? "Editar firm" : "Nueva firm";
  showDialog(els.firmDialog);
}

function openAccountDialog(account = null) {
  if (!state.firms.length) {
    openFirmDialog();
    toast("Crea una firm antes de anadir cuentas.");
    return;
  }

  fillFirmSelects();
  els.accountForm.reset();
  els.accountId.value = account?.id || "";
  els.accountFirm.value = account?.firmId || state.firms[0].id;
  els.accountName.value = account?.name || "";
  els.accountSize.value = account?.size || "";
  els.accountStatus.value = account?.status || "active";
  els.accountPurchasedAt.value = account?.purchasedAt || today();
  els.accountNotes.value = account?.notes || "";
  els.accountDialogTitle.textContent = account ? "Editar cuenta" : "Nueva cuenta";
  showDialog(els.accountDialog);
}

function openTransactionDialog(transaction = null) {
  if (!state.firms.length) {
    openFirmDialog();
    toast("Crea una firm antes de anadir movimientos.");
    return;
  }

  fillFirmSelects();
  els.transactionForm.reset();
  const firmId = transaction?.firmId || resolveFirmId(transaction || {}) || state.firms[0].id;
  els.transactionId.value = transaction?.id || "";
  els.transactionDate.value = transaction?.date || today();
  els.transactionKind.value = transaction?.kind || "expense";
  fillTransactionCategories(els.transactionKind.value, transaction?.category);
  els.transactionAmount.value = transaction?.amount ?? "";
  els.transactionFirm.value = firmId;
  fillAccountSelect(els.transactionAccount, firmId, true, transaction?.accountId || "");
  els.transactionNote.value = transaction?.note || "";
  els.transactionDialogTitle.textContent = transaction ? "Editar movimiento" : "Nuevo movimiento";
  showDialog(els.transactionDialog);
}

function saveFirmFromForm(event) {
  event.preventDefault();
  const id = els.firmId.value || createId("firm");
  const existing = state.firms.find((firm) => firm.id === id);
  const firm = {
    id,
    name: els.firmName.value.trim(),
    type: els.firmType.value,
    notes: els.firmNotes.value.trim(),
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  if (!firm.name) return;

  if (existing) {
    state.firms = state.firms.map((item) => (item.id === id ? firm : item));
  } else {
    state.firms.push(firm);
  }

  persist();
  closeDialog("firmDialog");
  refreshAll();
  toast("Firm guardada.");
}

function saveAccountFromForm(event) {
  event.preventDefault();
  const id = els.accountId.value || createId("account");
  const existing = state.accounts.find((account) => account.id === id);
  const account = {
    id,
    firmId: els.accountFirm.value,
    name: els.accountName.value.trim(),
    size: els.accountSize.value.trim(),
    status: els.accountStatus.value,
    purchasedAt: els.accountPurchasedAt.value,
    notes: els.accountNotes.value.trim(),
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  if (!account.firmId || !account.name) return;

  if (existing) {
    state.accounts = state.accounts.map((item) => (item.id === id ? account : item));
    state.transactions = state.transactions.map((tx) =>
      tx.accountId === id ? { ...tx, firmId: account.firmId, updatedAt: nowIso() } : tx
    );
  } else {
    state.accounts.push(account);
  }

  persist();
  closeDialog("accountDialog");
  refreshAll();
  toast("Cuenta guardada.");
}

function saveTransactionFromForm(event) {
  event.preventDefault();
  const id = els.transactionId.value || createId("tx");
  const existing = state.transactions.find((tx) => tx.id === id);
  const amount = Math.abs(Number(els.transactionAmount.value));
  const account = getAccount(els.transactionAccount.value);
  const transaction = {
    id,
    date: els.transactionDate.value,
    kind: els.transactionKind.value,
    category: els.transactionCategory.value,
    amount,
    currency: EURO,
    firmId: account?.firmId || els.transactionFirm.value,
    accountId: account?.id || "",
    note: els.transactionNote.value.trim(),
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  if (!transaction.date || !transaction.kind || !transaction.category || !transaction.amount || !transaction.firmId) return;

  if (existing) {
    state.transactions = state.transactions.map((item) => (item.id === id ? transaction : item));
  } else {
    state.transactions.push(transaction);
  }

  persist();
  closeDialog("transactionDialog");
  refreshAll();
  toast("Movimiento guardado.");
}

function handleTableAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === "edit-firm") openFirmDialog(getFirm(id));
  if (action === "edit-account") openAccountDialog(getAccount(id));
  if (action === "edit-transaction") openTransactionDialog(getTransaction(id));
  if (action === "delete-firm") requestDeleteFirm(id);
  if (action === "delete-account") requestDeleteAccount(id);
  if (action === "delete-transaction") requestDeleteTransaction(id);
}

function requestDeleteFirm(id) {
  const firm = getFirm(id);
  const hasAccounts = state.accounts.some((account) => account.firmId === id);
  const hasTransactions = state.transactions.some((tx) => resolveFirmId(tx) === id);

  if (hasAccounts || hasTransactions) {
    toast("No puedes eliminar una firm con cuentas o movimientos.");
    return;
  }

  openConfirm("Eliminar firm", `Eliminar ${firm?.name || "esta firm"}?`, () => {
    state.firms = state.firms.filter((item) => item.id !== id);
    persist();
    refreshAll();
    toast("Firm eliminada.");
  });
}

function requestDeleteAccount(id) {
  const account = getAccount(id);
  const hasTransactions = state.transactions.some((tx) => tx.accountId === id);

  if (hasTransactions) {
    toast("No puedes eliminar una cuenta con movimientos.");
    return;
  }

  openConfirm("Eliminar cuenta", `Eliminar ${account?.name || "esta cuenta"}?`, () => {
    state.accounts = state.accounts.filter((item) => item.id !== id);
    persist();
    refreshAll();
    toast("Cuenta eliminada.");
  });
}

function requestDeleteTransaction(id) {
  openConfirm("Eliminar movimiento", "Eliminar este movimiento?", () => {
    state.transactions = state.transactions.filter((item) => item.id !== id);
    persist();
    refreshAll();
    toast("Movimiento eliminado.");
  });
}

function openConfirm(title, message, handler) {
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  confirmHandler = handler;
  showDialog(els.confirmDialog);
}

function showDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
  refreshIcons();
}

function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function exportJson() {
  const payload = {
    exportedAt: nowIso(),
    app: "Prop Firm Tracker",
    version: 1,
    data: state,
  };
  downloadFile(`prop-firm-tracker-${today()}.json`, JSON.stringify(payload, null, 2), "application/json");
  toast("JSON exportado.");
}

function exportCsv() {
  const rows = [
    ["fecha", "tipo", "categoria", "firm", "cuenta", "nota", "importe", "moneda"],
    ...state.transactions
      .slice()
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map((tx) => {
        const firm = getFirm(resolveFirmId(tx));
        const account = getAccount(tx.accountId);
        const signed = tx.kind === "income" ? tx.amount : -tx.amount;
        return [
          tx.date,
          tx.kind === "income" ? "retiro" : "gasto",
          categoryLabels[tx.category] || tx.category,
          firm?.name || "",
          account?.name || "",
          tx.note || "",
          signed.toFixed(2),
          tx.currency || EURO,
        ];
      }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile(`prop-firm-tracker-movimientos-${today()}.csv`, csv, "text/csv;charset=utf-8");
  toast("CSV exportado.");
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const imported = parsed.data || parsed;
      if (!Array.isArray(imported.firms) || !Array.isArray(imported.accounts) || !Array.isArray(imported.transactions)) {
        throw new Error("Invalid file");
      }
      state = {
        firms: imported.firms,
        accounts: imported.accounts,
        transactions: imported.transactions,
      };
      persist();
      refreshAll();
      toast("Datos importados.");
    } catch {
      toast("El archivo no es valido.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getFirm(id) {
  return state.firms.find((firm) => firm.id === id);
}

function getAccount(id) {
  return state.accounts.find((account) => account.id === id);
}

function getTransaction(id) {
  return state.transactions.find((transaction) => transaction.id === id);
}

function resolveFirmId(transaction) {
  if (!transaction) return "";
  if (transaction.firmId) return transaction.firmId;
  const account = getAccount(transaction.accountId);
  return account?.firmId || "";
}

function actionButton(action, id, label, icon) {
  return `
    <button class="icon-button" type="button" data-action="${action}" data-id="${escapeHtml(id)}" aria-label="${label}">
      <i data-lucide="${icon}"></i>
    </button>
  `;
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: EURO,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value || 0))}%`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return "";
  const date = parseLocalDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function getLastMonths(count) {
  const months = [];
  const date = new Date();
  date.setDate(1);
  for (let index = count - 1; index >= 0; index -= 1) {
    const item = new Date(date);
    item.setMonth(date.getMonth() - index);
    const key = `${item.getFullYear()}-${String(item.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(item).replace(".", "");
    months.push({ key, label });
  }
  return months;
}

function toMonthKey(dateString) {
  return String(dateString || "").slice(0, 7);
}

function shiftIsoDate(dateString, days) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return dateToIsoDate(date);
}

function parseLocalDate(dateString) {
  const [year, month, day] = String(dateString || "")
    .split("-")
    .map((value) => Number(value));
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function dateToIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function roundRect(ctx, x, y, width, height, radius) {
  const safeHeight = Math.max(0, height);
  const safeY = height < 0 ? y + height : y;
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(safeHeight) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, safeY);
  ctx.lineTo(x + width - r, safeY);
  ctx.quadraticCurveTo(x + width, safeY, x + width, safeY + r);
  ctx.lineTo(x + width, safeY + safeHeight - r);
  ctx.quadraticCurveTo(x + width, safeY + safeHeight, x + width - r, safeY + safeHeight);
  ctx.lineTo(x + r, safeY + safeHeight);
  ctx.quadraticCurveTo(x, safeY + safeHeight, x, safeY + safeHeight - r);
  ctx.lineTo(x, safeY + r);
  ctx.quadraticCurveTo(x, safeY, x + r, safeY);
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    els.toast.classList.remove("visible");
  }, 2600);
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}
