const API_ENDPOINT = location.pathname.includes("/app/fn-appdownload")
  ? "/app/fn-appdownload/api"
  : location.pathname.includes("index.cgi")
    ? "../www/api.cgi"
    : "./api.cgi";

const state = {
  apps: [],
  tasks: {},
  settings: { downloadDir: "", thirdPartySources: [] },
  query: "",
  view: "all",
  sourceFilter: "all",
  statusFilter: "all",
  page: 1,
  pageSize: 50,
};

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char],
  );
}

function taskKey(app) {
  return `${app.store}:${app.id}:${app.version}`;
}

function taskFor(app) {
  return state.tasks[taskKey(app)] || {};
}

function normalizeStatus(value = "") {
  return String(value || "").toLowerCase();
}

function isDownloaded(app) {
  const task = taskFor(app);
  if (task.deleted) return false;
  const status = normalizeStatus(task.status || app.status);
  const doneStatus =
    [
      "downloaded",
      "done",
      "success",
      "succeed",
      "finished",
      "completed",
    ].includes(status) ||
    ["已下载", "下载完成"].includes(task.status || app.status);
  return (
    Boolean(app.downloaded) || (Boolean(task.path || app.path) && doneStatus)
  );
}

function statusKind(app) {
  if (isDownloaded(app)) return "downloaded";
  const status = normalizeStatus(taskFor(app).status || app.status);
  if (status === "downloading") return "downloading";
  if (status === "failed") return "failed";
  return "undownloaded";
}

function statusText(app) {
  const kind = statusKind(app);
  if (kind === "downloaded") return "已下载";
  if (kind === "downloading") return "下载中";
  if (kind === "failed") return "失败";
  return "未下载";
}

function cookieValue(name) {
  const prefix = `${name}=`;
  return (
    document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(prefix))
      ?.slice(prefix.length) || ""
  );
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value || "");
  } catch (_error) {
    return value || "";
  }
}

function authToken() {
  return safeDecode(
    cookieValue("fnos-token") ||
      cookieValue("trim_token") ||
      cookieValue("token"),
  );
}

async function api(action, data = {}) {
  const token = authToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `trim ${token}`;
  }
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers,
    cache: "no-store",
    credentials: "include",
    body: JSON.stringify({ action, ...data }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.message || `HTTP ${response.status}`);
  }
  return result;
}

function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

function fallbackIcon(app) {
  const name = app.name || app.id || "?";
  return `<div class="fallback-icon">${escapeHtml(name.slice(0, 1).toUpperCase())}</div>`;
}

function filteredApps() {
  const query = state.query.trim().toLowerCase();
  return state.apps.filter((app) => {
    const kind = statusKind(app);
    if (state.view === "official" && app.store !== "official") return false;
    if (state.view === "thirdparty" && app.store !== "thirdparty") return false;
    if (state.view === "downloaded" && kind !== "downloaded") return false;
    if (state.view === "undownloaded" && kind === "downloaded") return false;
    if (state.sourceFilter !== "all" && app.source !== state.sourceFilter)
      return false;
    if (state.statusFilter !== "all" && kind !== state.statusFilter)
      return false;
    if (!query) return true;
    return [app.name, app.id, app.version, app.source].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(query),
    );
  });
}

function pageItems(items) {
  const totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.page = Math.min(Math.max(1, state.page), totalPages);
  const start = (state.page - 1) * state.pageSize;
  return {
    totalPages,
    rows: items.slice(start, start + state.pageSize),
  };
}

function pageButton(
  page,
  label = String(page),
  active = false,
  disabled = false,
) {
  return `<button class="page-btn ${active ? "active" : ""}" data-page="${page}" ${disabled ? "disabled" : ""} type="button">${escapeHtml(label)}</button>`;
}

function renderPager(total, totalPages) {
  const numbers = document.getElementById("pageNumbers");
  const prev = document.getElementById("prevPageBtn");
  const next = document.getElementById("nextPageBtn");
  const pages = [];
  const addPage = (page) =>
    pages.push(pageButton(page, String(page), page === state.page));

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) addPage(page);
  } else {
    addPage(1);
    if (state.page > 4) pages.push(pageButton(state.page - 3, "...", false));
    const start = Math.max(2, state.page - 1);
    const end = Math.min(totalPages - 1, state.page + 1);
    for (let page = start; page <= end; page += 1) addPage(page);
    if (state.page < totalPages - 3)
      pages.push(pageButton(state.page + 3, "...", false));
    addPage(totalPages);
  }

  numbers.innerHTML = pages.join("");
  prev.disabled = state.page <= 1;
  next.disabled = state.page >= totalPages;
  document.getElementById("jumpPageInput").max = String(totalPages);
  document.getElementById("summary").textContent = `共 ${total} 项`;
}

function renderRows() {
  const rows = document.getElementById("appRows");
  const empty = document.getElementById("emptyState");
  const apps = filteredApps();
  const paged = pageItems(apps);

  empty.classList.toggle("hidden", apps.length > 0);
  renderPager(apps.length, paged.totalPages);

  rows.innerHTML = paged.rows
    .map((app) => {
      const kind = statusKind(app);
      const downloaded = kind === "downloaded";
      const canDownload =
        app.store === "official"
          ? app.id && app.version && app.sourceID
          : app.downloadUrl;
      const icon = app.icon
        ? `<img class="app-icon" src="${escapeHtml(app.icon)}" alt="" loading="lazy" onerror="this.classList.add('hidden');this.nextElementSibling.classList.remove('hidden')">${fallbackIcon(app).replace("fallback-icon", "fallback-icon hidden")}`
        : fallbackIcon(app);
      return `
      <tr>
        <td class="icon-cell">${icon}</td>
        <td>
          <div class="app-name">${escapeHtml(app.name || app.id)}</div>
          <div class="app-id">${escapeHtml(app.id || "")}</div>
        </td>
        <td>${escapeHtml(app.version || "-")}</td>
        <td>${app.store === "official" ? "官方商店" : "三方商店"}</td>
        <td>${escapeHtml(app.source || "-")}</td>
        <td><span class="status-pill ${kind}">${escapeHtml(statusText(app))}</span></td>
        <td>
          <button class="download-btn ${downloaded ? "delete-btn" : ""}" data-action="${downloaded ? "delete" : "download"}" data-app-key="${escapeHtml(taskKey(app))}" ${!downloaded && !canDownload ? "disabled" : ""} type="button">
            ${downloaded ? "删除" : "下载"}
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function loadSettings() {
  const result = await api("settings");
  state.settings = result.settings || {
    downloadDir: "",
    thirdPartySources: [],
  };
  document.getElementById("downloadDirInput").value =
    state.settings.downloadDir || "";
  renderSourceList(state.settings.thirdPartySources || []);
}

async function loadApps() {
  document.getElementById("summary").textContent = "正在加载...";
  const [official, thirdparty] = await Promise.allSettled([
    api("official-list"),
    api("thirdparty-list"),
  ]);
  const apps = [];
  const tasks = {};
  const errors = [];

  [official, thirdparty].forEach((result) => {
    if (result.status === "fulfilled") {
      apps.push(...(result.value.apps || []));
      Object.assign(tasks, result.value.tasks || {});
      errors.push(...(result.value.errors || []));
    } else {
      errors.push({
        source: "商店",
        message: result.reason?.message || "加载失败",
      });
    }
  });

  state.apps = apps;
  state.tasks = tasks;
  if (errors.length) {
    showToast(
      errors.map((item) => `${item.source}: ${item.message}`).join("；"),
      true,
    );
  }
  renderRows();
}

async function refreshStatus() {
  try {
    const result = await api("status");
    state.tasks = result.tasks || {};
    renderRows();
  } catch (_error) {
    // Keep polling quiet.
  }
}

function sourceRowTemplate(source = {}) {
  const name = escapeHtml(source.name || "");
  const url = escapeHtml(source.url || "");
  const enabled = source.enabled !== false ? "checked" : "";
  return `
    <div class="source-row">
      <label class="source-switch" title="开启/关闭">
        <input class="source-enabled" type="checkbox" ${enabled}>
        <span></span>
      </label>
      <input class="source-name" type="text" spellcheck="false" placeholder="名称" value="${name}">
      <input class="source-url" type="text" spellcheck="false" placeholder="URL" value="${url}">
      <button class="icon-btn source-remove" type="button" aria-label="删除源">×</button>
    </div>
  `;
}

function renderSourceList(sources = []) {
  const list = document.getElementById("sourceList");
  if (!list) return;
  const rows =
    Array.isArray(sources) && sources.length
      ? sources
      : [{ name: "", url: "", enabled: true }];
  list.innerHTML = rows.map((source) => sourceRowTemplate(source)).join("");
}

function collectSources() {
  const list = document.getElementById("sourceList");
  if (!list) return [];
  return Array.from(list.querySelectorAll(".source-row"))
    .map((row) => ({
      name: row.querySelector(".source-name")?.value.trim() || "",
      url: row.querySelector(".source-url")?.value.trim() || "",
      enabled: row.querySelector(".source-enabled")?.checked ?? true,
    }))
    .filter((source) => source.name || source.url);
}

function setPage(page) {
  state.page = Number(page) || 1;
  renderRows();
}

function resetPaging() {
  state.page = 1;
}

function sourceOptionsForView() {
  const scope =
    state.view === "official" || state.view === "thirdparty" ? state.view : "";
  const sources = new Set();
  state.apps.forEach((app) => {
    if (scope && app.store !== scope) return;
    if (app.source) sources.add(app.source);
  });
  return Array.from(sources).sort((left, right) =>
    left.localeCompare(right, "zh-Hans-CN"),
  );
}

function renderSourceSelect() {
  const sourceSelect = document.getElementById("storeSelect");
  if (!sourceSelect) return;
  const options = sourceOptionsForView();
  const current = state.sourceFilter;
  const fragments = ['<option value="all">全部来源</option>'];
  options.forEach((source) => {
    fragments.push(
      `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`,
    );
  });
  sourceSelect.innerHTML = fragments.join("");
  if (current !== "all" && !options.includes(current)) {
    state.sourceFilter = "all";
  }
  sourceSelect.value = state.sourceFilter;
}

function syncSourceControls() {
  document.querySelectorAll("[data-source-filter]").forEach((node) => {
    node.classList.toggle("active", node.dataset.sourceFilter === state.view);
  });
  renderSourceSelect();
}

function openSettings() {
  document.getElementById("settingsModal").classList.remove("hidden");
}

function openAbout() {
  document.getElementById("aboutModal").classList.remove("hidden");
}

function closeModals() {
  document
    .querySelectorAll(".modal")
    .forEach((modal) => modal.classList.add("hidden"));
}

function bindEvents() {
  document.querySelectorAll("[data-source-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.sourceFilter;
      state.sourceFilter = "all";
      syncSourceControls();
      resetPaging();
      renderRows();
    });
  });

  document.getElementById("storeSelect").addEventListener("change", (event) => {
    state.sourceFilter = event.target.value;
    syncSourceControls();
    resetPaging();
    renderRows();
  });

  document
    .getElementById("statusSelect")
    .addEventListener("change", (event) => {
      state.statusFilter = event.target.value;
      resetPaging();
      renderRows();
    });

  document.getElementById("searchInput").addEventListener("input", (event) => {
    state.query = event.target.value;
    resetPaging();
    renderRows();
  });

  document
    .getElementById("pageSizeSelect")
    .addEventListener("change", (event) => {
      state.pageSize = Number(event.target.value) || 50;
      resetPaging();
      renderRows();
    });

  document.getElementById("pageNumbers").addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (button) setPage(button.dataset.page);
  });

  document
    .getElementById("prevPageBtn")
    .addEventListener("click", () => setPage(state.page - 1));
  document
    .getElementById("nextPageBtn")
    .addEventListener("click", () => setPage(state.page + 1));
  document
    .getElementById("jumpPageInput")
    .addEventListener("change", (event) => setPage(event.target.value));

  document
    .getElementById("settingsBtn")
    .addEventListener("click", openSettings);

  document.getElementById("aboutBtn").addEventListener("click", openAbout);

  document.getElementById("refreshBtn").addEventListener("click", async () => {
    try {
      await loadApps();
      showToast("已刷新");
    } catch (error) {
      showToast(error.message, true);
    }
  });

  document
    .querySelectorAll("[data-close]")
    .forEach((node) => node.addEventListener("click", closeModals));

  document.getElementById("addSourceBtn").addEventListener("click", () => {
    const list = document.getElementById("sourceList");
    list.insertAdjacentHTML(
      "beforeend",
      sourceRowTemplate({ name: "", url: "", enabled: true }),
    );
  });

  document.getElementById("sourceList").addEventListener("click", (event) => {
    const button = event.target.closest(".source-remove");
    if (!button) return;
    const row = button.closest(".source-row");
    if (row) row.remove();
    const list = document.getElementById("sourceList");
    if (list && !list.querySelector(".source-row")) {
      list.insertAdjacentHTML(
        "beforeend",
        sourceRowTemplate({ name: "", url: "", enabled: true }),
      );
    }
  });

  document
    .getElementById("settingsForm")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const result = await api("save-settings", {
          downloadDir: document.getElementById("downloadDirInput").value.trim(),
          thirdPartySources: collectSources(),
        });
        state.settings = result.settings || state.settings;
        closeModals();
        showToast("设置已保存");
        await loadApps();
      } catch (error) {
        showToast(error.message, true);
      }
    });

  document
    .getElementById("appRows")
    .addEventListener("click", async (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const app = state.apps.find(
        (item) => taskKey(item) === button.dataset.appKey,
      );
      if (!app) return;
      const action = button.dataset.action;
      button.disabled = true;
      button.textContent = action === "delete" ? "删除中" : "下载中";
      try {
        const result = await api(action, { app });
        if (action === "delete") {
          delete state.tasks[taskKey(app)];
          app.downloaded = false;
          app.path = "";
          app.status = "";
          showToast("已删除");
        } else {
          state.tasks[taskKey(app)] = result.task || {};
          showToast("已开始下载");
        }
        renderRows();
      } catch (error) {
        showToast(error.message, true);
        button.disabled = false;
        button.textContent = action === "delete" ? "删除" : "下载";
      }
    });
}

window.addEventListener("load", async () => {
  bindEvents();
  try {
    await loadSettings();
    await loadApps();
    syncSourceControls();
    setInterval(refreshStatus, 4000);
  } catch (error) {
    showToast(error.message, true);
    document.getElementById("summary").textContent = "加载失败";
  }
});
