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
  language: "zh-CN",
};

const I18N = {
  "zh-CN": {
    appTitle: "应用管理",
    search: "搜索",
    settings: "设置",
    about: "关于",
    shop: "商店",
    allShops: "全部商店",
    officialShop: "官方商店",
    thirdPartyShop: "三方商店",
    source: "来源",
    allSources: "全部来源",
    status: "状态",
    all: "全部",
    downloaded: "已下载",
    undownloaded: "未下载",
    downloading: "下载中",
    failed: "失败",
    refresh: "刷新",
    icon: "图标",
    name: "名称",
    version: "版本",
    action: "操作",
    emptyApps: "暂无应用",
    loading: "正在加载...",
    loadFailed: "加载失败",
    totalItems: "共 {total} 项",
    pageSize: "每页条数:",
    jumpTo: "跳至",
    pageUnit: "页",
    savePath: "保存路径",
    sourceUrl: "源地址",
    addSource: "添加源",
    cancel: "取消",
    save: "保存",
    close: "关闭",
    sourceName: "名称",
    url: "URL",
    toggleSource: "开启/关闭",
    removeSource: "删除源",
    officialStore: "官方商店",
    thirdPartyStore: "三方商店",
    delete: "删除",
    download: "下载",
    deleting: "删除中",
    downloadingAction: "下载中",
    deleted: "已删除",
    downloadStarted: "已开始下载",
    refreshed: "已刷新",
    settingsSaved: "设置已保存",
    store: "商店",
    aboutDeclaration: "本项目由社区维护，免费开源，仅用于学习与交流，请遵守所在地法律法规与平台服务条款。",
    communitySupport: "社区支持",
    sponsorSupport: "赞助支持",
    join: "点击加入",
  },
  "en-US": {
    appTitle: "App Download",
    search: "Search",
    settings: "Settings",
    about: "About",
    shop: "Store",
    allShops: "All Stores",
    officialShop: "Official Store",
    thirdPartyShop: "Third-party Store",
    source: "Source",
    allSources: "All Sources",
    status: "Status",
    all: "All",
    downloaded: "Downloaded",
    undownloaded: "Not Downloaded",
    downloading: "Downloading",
    failed: "Failed",
    refresh: "Refresh",
    icon: "Icon",
    name: "Name",
    version: "Version",
    action: "Action",
    emptyApps: "No apps",
    loading: "Loading...",
    loadFailed: "Load failed",
    totalItems: "{total} items",
    pageSize: "Per page:",
    jumpTo: "Go to",
    pageUnit: "page",
    savePath: "Save Path",
    sourceUrl: "Source URL",
    addSource: "Add Source",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    sourceName: "Name",
    url: "URL",
    toggleSource: "Enable/Disable",
    removeSource: "Remove source",
    officialStore: "Official Store",
    thirdPartyStore: "Third-party Store",
    delete: "Delete",
    download: "Download",
    deleting: "Deleting",
    downloadingAction: "Downloading",
    deleted: "Deleted",
    downloadStarted: "Download started",
    refreshed: "Refreshed",
    settingsSaved: "Settings saved",
    store: "Store",
    aboutDeclaration: "This community-maintained open source project is free and open source, intended only for learning and communication. Please follow local laws and platform terms.",
    communitySupport: "Community Support",
    sponsorSupport: "Sponsor Support",
    join: "Join",
  },
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

function statusAppPayload() {
  return state.apps.map((app) => ({
    store: app.store,
    id: app.id,
    version: app.version,
  }));
}

function applyFileStatus(files = {}) {
  state.apps.forEach((app) => {
    const file = files[taskKey(app)];
    if (!file) return;
    app.downloaded = Boolean(file.exists);
    app.path = file.exists ? file.path || app.path || "" : "";
    if (file.exists) {
      app.status = "downloaded";
    } else if (
      [
        "downloaded",
        "done",
        "success",
        "succeed",
        "finished",
        "completed",
      ].includes(normalizeStatus(app.status)) ||
      ["已下载", "下载完成"].includes(app.status)
    ) {
      app.status = "";
    }
  });
}

function rowsStateSignature() {
  return filteredApps()
    .map((app) => {
      const task = taskFor(app);
      const kind = statusKind(app);
      return [
        taskKey(app),
        kind,
        task.status || "",
        app.status || "",
        task.fileExists === false ? "0" : task.fileExists === true ? "1" : "",
        app.downloaded ? "1" : "0",
        task.path || app.path || "",
      ].join("|");
    })
    .join("\n");
}

function normalizeStatus(value = "") {
  return String(value || "").toLowerCase();
}

function isDownloaded(app) {
  const task = taskFor(app);
  if (task.deleted) return false;
  if (task.fileExists === false) return false;
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
    Boolean(app.downloaded) ||
    (task.fileExists === true && Boolean(task.path || app.path) && doneStatus)
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
  if (kind === "downloaded") return t("downloaded");
  if (kind === "downloading") return t("downloading");
  if (kind === "failed") return t("failed");
  return t("undownloaded");
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

function storedValue(name) {
  try {
    return localStorage.getItem(name) || sessionStorage.getItem(name) || "";
  } catch (_error) {
    return "";
  }
}

function parentStoredValue(name) {
  try {
    if (!window.parent || window.parent === window) return "";
    return (
      window.parent.localStorage.getItem(name) ||
      window.parent.sessionStorage.getItem(name) ||
      ""
    );
  } catch (_error) {
    return "";
  }
}

function queryValue(name) {
  return new URLSearchParams(location.search).get(name) || "";
}

function normalizeLanguage(value) {
  const language = safeDecode(value).replace("_", "-");
  return language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function currentLanguage() {
  return normalizeLanguage(
    cookieValue("language") ||
      queryValue("language") ||
      navigator.language ||
      "zh-CN",
  );
}

function t(key, params = {}) {
  const messages = I18N[state.language] || I18N["zh-CN"];
  return String(messages[key] || I18N["zh-CN"][key] || key).replace(
    /\{(\w+)\}/g,
    (_match, name) => params[name] ?? "",
  );
}

function documentThemeValue(doc) {
  if (!doc) return "";
  const root = doc.documentElement;
  const body = doc.body;
  return (
    [
      body?.getAttribute("theme-mode"),
      body?.dataset?.theme,
      root?.dataset?.theme,
      root?.classList?.contains("dark") ? "dark" : "",
      root?.classList?.contains("light") ? "light" : "",
    ].find(Boolean) || ""
  );
}

function parentDocumentThemeValue() {
  try {
    if (!window.parent || window.parent === window) return "";
    return documentThemeValue(window.parent.document);
  } catch (_error) {
    return "";
  }
}

function normalizeTheme(value) {
  const theme = safeDecode(value).toLowerCase();
  if (theme.includes("dark") || theme === "night") return "dark";
  if (theme.includes("light") || theme === "day") return "light";
  if (theme === "system" || theme === "auto" || theme === "os") {
    return prefersDarkTheme() ? "dark" : "light";
  }
  return "";
}

function themeMedia() {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;
}

function prefersDarkTheme() {
  return Boolean(themeMedia()?.matches);
}

function currentTheme() {
  const fromSystem = [
    queryValue("theme"),
    cookieValue("fnos-theme-mode"),
    cookieValue("os-theme-mode"),
    storedValue("fnos-theme-mode"),
    storedValue("os-theme-mode"),
    parentStoredValue("fnos-theme-mode"),
    parentStoredValue("os-theme-mode"),
    documentThemeValue(document),
    parentDocumentThemeValue(),
    queryValue("fnos-theme-mode"),
  ]
    .map(normalizeTheme)
    .find(Boolean);
  if (fromSystem) return fromSystem;
  return prefersDarkTheme() ? "dark" : "light";
}

function applyTheme() {
  const theme = currentTheme();
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
}

function applyPreferences({ rerender = false } = {}) {
  const nextLanguage = currentLanguage();
  const languageChanged = nextLanguage !== state.language;

  state.language = nextLanguage;
  document.documentElement.lang = nextLanguage;
  document.title = t("appTitle");
  applyTheme();

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
    node.setAttribute("aria-label", t(node.dataset.i18nTitle));
  });

  if (rerender && languageChanged) {
    renderSourceSelect();
    renderSourceList(state.settings.thirdPartySources || []);
    renderRows();
  }
  return languageChanged;
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
  document.getElementById("summary").textContent = t("totalItems", { total });
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
        <td>${app.store === "official" ? t("officialStore") : t("thirdPartyStore")}</td>
        <td>${escapeHtml(app.source || "-")}</td>
        <td><span class="status-pill ${kind}">${escapeHtml(statusText(app))}</span></td>
        <td>
          <button class="download-btn ${downloaded ? "delete-btn" : ""}" data-action="${downloaded ? "delete" : "download"}" data-app-key="${escapeHtml(taskKey(app))}" ${!downloaded && !canDownload ? "disabled" : ""} type="button">
            ${downloaded ? t("delete") : t("download")}
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
  document.getElementById("summary").textContent = t("loading");
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
        source: t("store"),
        message: result.reason?.message || t("loadFailed"),
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
    const before = rowsStateSignature();
    const result = await api("status", { apps: statusAppPayload() });
    state.tasks = result.tasks || {};
    applyFileStatus(result.files || {});
    if (rowsStateSignature() !== before) {
      renderRows();
    }
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
      <label class="source-switch" title="${escapeHtml(t("toggleSource"))}">
        <input class="source-enabled" type="checkbox" ${enabled}>
        <span></span>
      </label>
      <input class="source-name" type="text" spellcheck="false" placeholder="${escapeHtml(t("sourceName"))}" value="${name}">
      <input class="source-url" type="text" spellcheck="false" placeholder="${escapeHtml(t("url"))}" value="${url}">
      <button class="icon-btn source-remove" type="button" aria-label="${escapeHtml(t("removeSource"))}" title="${escapeHtml(t("removeSource"))}">×</button>
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
  const fragments = [`<option value="all">${escapeHtml(t("allSources"))}</option>`];
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
  const shopSelect = document.getElementById("shopSelect");
  if (shopSelect) shopSelect.value = state.view;
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
  document.getElementById("shopSelect").addEventListener("change", (event) => {
    state.view = event.target.value;
    state.sourceFilter = "all";
    syncSourceControls();
    resetPaging();
    renderRows();
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
      showToast(t("refreshed"));
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
        showToast(t("settingsSaved"));
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
      button.textContent =
        action === "delete" ? t("deleting") : t("downloadingAction");
      try {
        const result = await api(action, { app });
        if (action === "delete") {
          delete state.tasks[taskKey(app)];
          app.downloaded = false;
          app.path = "";
          app.status = "";
          showToast(t("deleted"));
        } else {
          state.tasks[taskKey(app)] = result.task || {};
          showToast(t("downloadStarted"));
        }
        renderRows();
      } catch (error) {
        showToast(error.message, true);
        button.disabled = false;
        button.textContent = action === "delete" ? t("delete") : t("download");
      }
    });
}

window.addEventListener("load", async () => {
  applyPreferences();
  bindEvents();
  try {
    await loadSettings();
    await loadApps();
    syncSourceControls();
    setInterval(refreshStatus, 4000);
  } catch (error) {
    showToast(error.message, true);
    document.getElementById("summary").textContent = t("loadFailed");
  }
});

themeMedia()?.addEventListener?.("change", () => applyPreferences());
window.addEventListener("storage", () => applyPreferences({ rerender: true }));
setInterval(() => applyPreferences({ rerender: true }), 1500);
