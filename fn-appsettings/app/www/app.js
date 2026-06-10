const API_ENDPOINT = location.pathname.includes("/app/fn-appsettings")
  ? "/app/fn-appsettings/api"
  : "./api";

const state = {
  apps: [],
  services: [],
  env: [],
  runAs: {},
  selectedAppId: null,
  selectedServiceIndex: 0,
  selectedEnvIndex: 0,
  query: "",
  language: "zh-CN",
  theme: "light",
  saving: false,
  restartBaseline: {},
};

const I18N = {
  "zh-CN": {
    appTitle: "应用设置",
    apps: "应用",
    refresh: "刷新",
    searchApps: "搜索应用",
    about: "关于",
    save: "保存修改",
    saving: "保存中...",
    appConfig: "应用配置",
    installInfo: "安装信息",
    privilegeConfig: "权限配置",
    wizardParams: "Wizard 参数",
    uiConfig: "UI 配置",
    addEntry: "新增条目",
    deleteEntry: "删除条目",
    loading: "正在加载...",
    emptyApps: "暂无应用",
    editorTitle: "{name} 配置",
    entry: "条目 {index}",
    saveSuccess: "保存成功",
    refreshed: "已刷新",
    close: "关闭",
    aboutDeclaration: "本项目由社区维护，免费开源，仅用于学习与交流，请遵守所在地法律法规与平台服务条款。",
    communitySupport: "社区支持",
    sponsorSupport: "赞助支持",
    join: "点击加入",
  },
  "en-US": {
    appTitle: "App Settings",
    apps: "Apps",
    refresh: "Refresh",
    searchApps: "Search apps",
    about: "About",
    save: "Save Changes",
    saving: "Saving...",
    appConfig: "App Config",
    installInfo: "Install Info",
    privilegeConfig: "Privilege",
    wizardParams: "Wizard Params",
    uiConfig: "UI Config",
    addEntry: "Add Entry",
    deleteEntry: "Delete Entry",
    loading: "Loading...",
    emptyApps: "No apps",
    editorTitle: "{name} Config",
    entry: "Entry {index}",
    saveSuccess: "Saved",
    refreshed: "Refreshed",
    close: "Close",
    aboutDeclaration: "This community-maintained open source project is free and open source, intended only for learning and communication. Please follow local laws and platform terms.",
    communitySupport: "Community Support",
    sponsorSupport: "Sponsor Support",
    join: "Join",
  },
};

const appFields = [
  { name: "id", label: "id", readonly: true },
  { name: "app_name", label: "app_name" },
  { name: "name", label: "name" },
  { name: "version", label: "version" },
  { name: "version_id", label: "version_id", readonly: true },
  { name: "tags", label: "tags" },
  { name: "maintainer", label: "maintainer" },
  { name: "distributor", label: "distributor" },
  { name: "download_count", label: "download_count" },
  { name: "install_type", label: "install_type", readonly: true },
  { name: "path", label: "path", readonly: true },
  { name: "install_volume_id", label: "install_volume_id", readonly: true },
  { name: "data_share_volume_id", label: "data_share_volume_id", readonly: true },
  { name: "data_volume_id", label: "data_volume_id", readonly: true },
  { name: "manual_install", label: "manual_install", type: "bool" },
  { name: "is_stop", label: "is_stop", type: "bool" },
  { name: "is_uninstall", label: "is_uninstall", type: "bool" },
  { name: "is_beta", label: "is_beta", type: "bool" },
  { name: "is_docker", label: "is_docker", type: "bool", readonly: true },
  { name: "min_size", label: "min_size" },
  { name: "service_url", label: "service_url" },
  { name: "source", label: "source", options: ["thirdparty", "official"] },
  { name: "source_id", label: "source_id", readonly: true },
  { name: "status", label: "status", readonly: true },
  { name: "is_non_manual_stop", label: "is_non_manual_stop", type: "bool" },
  { name: "is_systemd_uint", label: "is_systemd_uint", type: "bool" },
  {
    name: "disable_authorization_path",
    label: "disable_authorization_path",
    type: "bool",
  },
  { name: "features", label: "features", textarea: true },
  { name: "micro_app", label: "micro_app", type: "bool" },
  { name: "native_app", label: "native_app", type: "bool" },
  { name: "file_types", label: "file_types" },
  { name: "is_power_off_stop", label: "is_power_off_stop" },
  { name: "i18n_matadata", label: "i18n_matadata", textarea: true },
  { name: "disabled_reason", label: "disabled_reason", readonly: true },
  { name: "disabled_at", label: "disabled_at", readonly: true },
];

const serviceFields = [
  { name: "id", label: "id", readonly: true },
  { name: "app_id", label: "app_id", readonly: true },
  { name: "service_name", label: "service_name" },
  { name: "title", label: "title" },
  { name: "desc", label: "desc" },
  { name: "icon", label: "icon" },
  { name: "type", label: "type", options: ["iframe", "url"] },
  { name: "url", label: "url" },
  { name: "default_url", label: "default_url" },
  { name: "is_admin", label: "is_admin", type: "bool" },
  { name: "control", label: "control", textarea: true },
  { name: "full_url", label: "full_url" },
  { name: "no_display", label: "no_display", type: "bool" },
  { name: "gateway_socket", label: "gateway_socket" },
  { name: "gateway_prefix", label: "gateway_prefix" },
  { name: "file_types", label: "file_types" },
  { name: "i18n_matadata", label: "i18n_matadata", textarea: true },
];

const serviceRestartFieldNames = serviceFields
  .map((field) => field.name)
  .filter((name) => name !== "id" && name !== "app_id");

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
    return window.parent.localStorage.getItem(name) || window.parent.sessionStorage.getItem(name) || "";
  } catch (_error) {
    return "";
  }
}

function queryValue(name) {
  return new URLSearchParams(location.search).get(name) || "";
}

function documentThemeValue(doc) {
  if (!doc) return "";
  const root = doc.documentElement;
  const body = doc.body;
  return [
    body?.getAttribute("theme-mode"),
    body?.dataset?.theme,
    root?.dataset?.theme,
    root?.classList?.contains("dark") ? "dark" : "",
    root?.classList?.contains("light") ? "light" : "",
  ].find(Boolean) || "";
}

function parentDocumentThemeValue() {
  try {
    if (!window.parent || window.parent === window) return "";
    return documentThemeValue(window.parent.document);
  } catch (_error) {
    return "";
  }
}

function normalizeLanguage(value) {
  const language = safeDecode(value).replace("_", "-");
  return language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

function currentLanguage() {
  return normalizeLanguage(cookieValue("language") || queryValue("language") || navigator.language || "zh-CN");
}

function normalizeTheme(value) {
  const theme = safeDecode(value).toLowerCase();
  if (theme.includes("dark") || theme === "night") return "dark";
  if (theme.includes("light") || theme === "day") return "light";
  if (theme === "10") return "light";
  if (theme === "20") return "dark";
  if (theme === "system" || theme === "auto" || theme === "os") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "";
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
  ].map(normalizeTheme).find(Boolean);
  if (fromSystem) return fromSystem;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function t(key, params = {}) {
  const messages = I18N[state.language] || I18N["zh-CN"];
  return String(messages[key] || I18N["zh-CN"][key] || key).replace(/\{(\w+)\}/g, (_match, name) => params[name] ?? "");
}

function applyPreferences({ rerender = false } = {}) {
  const nextLanguage = currentLanguage();
  const nextTheme = currentTheme();
  const languageChanged = nextLanguage !== state.language;

  state.language = nextLanguage;
  state.theme = nextTheme;
  document.documentElement.lang = nextLanguage;
  document.documentElement.dataset.theme = nextTheme;
  document.body.dataset.theme = nextTheme;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
  document.title = t("appTitle");
  if (!currentApp()) {
    document.getElementById("pageTitle").textContent = t("appConfig");
  }
  if (state.saving) {
    document.getElementById("saveBtn").textContent = t("saving");
  }

  if (rerender && languageChanged) {
    renderEditor();
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function boolValue(value) {
  return value === true || value === "t" || value === "true" || value === 1;
}

async function api(action, data = {}) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

function setSaving(isSaving) {
  state.saving = isSaving;
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = isSaving;
  saveBtn.textContent = isSaving ? t("saving") : t("save");
}

function openAbout() {
  document.getElementById("aboutModal").classList.remove("hidden");
}

function closeModals() {
  document
    .querySelectorAll(".modal")
    .forEach((modal) => modal.classList.add("hidden"));
}

function currentApp() {
  return state.apps.find((app) => app.id === state.selectedAppId) || null;
}

function currentServices() {
  return state.services.filter((item) => item.app_id === state.selectedAppId && !item._delete);
}

function currentEnv() {
  return state.env.filter((item) => item.app_id === state.selectedAppId && !item._delete);
}

function currentRunAs() {
  return state.runAs[String(state.selectedAppId)] === "package" ? "package" : "root";
}

function uniqueValue(base, existing) {
  const cleanBase = String(base || "item");
  if (!existing.has(cleanBase)) return cleanBase;
  let index = 2;
  while (existing.has(`${cleanBase}_${index}`)) index += 1;
  return `${cleanBase}_${index}`;
}

function restartSnapshot(appId) {
  const id = Number(appId);
  return JSON.stringify({
    runAs: state.runAs[String(id)] === "package" ? "package" : "root",
    services: state.services
      .filter((item) => item.app_id === id)
      .map((item) => {
        const snapshot = { id: item.id || "", delete: Boolean(item._delete) };
        serviceRestartFieldNames.forEach((name) => {
          snapshot[name] = item[name] ?? "";
        });
        return snapshot;
      }),
    env: state.env
      .filter((item) => item.app_id === id)
      .map((item) => ({
        id: item.id || "",
        delete: Boolean(item._delete),
        k: item.k ?? "",
        v: item.v ?? "",
      })),
  });
}

function rebuildRestartBaseline() {
  state.restartBaseline = {};
  state.apps.forEach((app) => {
    state.restartBaseline[String(app.id)] = restartSnapshot(app.id);
  });
}

function fallbackIcon(app) {
  return escapeHtml((app.name || app.app_name || "?").slice(0, 1).toUpperCase());
}

function iconUrl(app) {
  const version = encodeURIComponent(app.updated_at || app.version || "");
  return `${API_ENDPOINT}?action=icon&id=${encodeURIComponent(app.id)}&v=${version}`;
}

function renderAppList() {
  const query = state.query.trim().toLowerCase();
  const list = document.getElementById("appList");
  const apps = state.apps.filter((app) => {
    if (!query) return true;
    return [app.name, app.app_name, app.version].some((value) =>
      String(value || "").toLowerCase().includes(query),
    );
  });
  list.innerHTML = apps.map((app) => `
    <button class="app-item ${app.id === state.selectedAppId ? "active" : ""}" data-id="${app.id}" type="button">
      <span class="app-icon">
        <img src="${iconUrl(app)}" alt="" loading="lazy" onerror="this.classList.add('hidden')">
        <span>${fallbackIcon(app)}</span>
      </span>
      <span class="app-meta">
        <strong>${escapeHtml(app.name || app.app_name)}</strong>
        <small>${escapeHtml(app.app_name || "")}</small>
      </span>
    </button>
  `).join("");
}

function fieldInput(source, field) {
  if (field.hidden) return "";
  const value = source?.[field.name] ?? "";
  const attrs = field.readonly
    ? `value="${escapeHtml(value)}" readonly tabindex="-1"`
    : `data-field="${field.name}" value="${escapeHtml(value)}" spellcheck="false"`;
  let tag = `<input ${attrs}>`;
  if (field.type === "bool") {
    const selected = boolValue(value);
    tag = `
      <select ${field.readonly ? 'disabled tabindex="-1"' : `data-field="${field.name}"`} data-kind="bool">
        <option value="true" ${selected ? "selected" : ""}>true</option>
        <option value="false" ${!selected ? "selected" : ""}>false</option>
      </select>
    `;
  } else if (field.options) {
    const selectedValue = String(value || field.options[0] || "");
    tag = `
      <select ${field.readonly ? 'disabled tabindex="-1"' : `data-field="${field.name}"`}>
        ${field.options.map((option) =>
          `<option value="${escapeHtml(option)}" ${option === selectedValue ? "selected" : ""}>${escapeHtml(option)}</option>`,
        ).join("")}
      </select>
    `;
  } else if (field.textarea) {
    tag = field.readonly
      ? `<textarea readonly tabindex="-1" spellcheck="false">${escapeHtml(value)}</textarea>`
      : `<textarea data-field="${field.name}" spellcheck="false">${escapeHtml(value)}</textarea>`;
  }
  return `<label class="field ${field.textarea ? "wide" : ""}"><span>${escapeHtml(field.label)}</span>${tag}</label>`;
}

function renderAppFields(app) {
  document.getElementById("appFields").innerHTML = appFields.map((field) =>
    fieldInput(app, field),
  ).join("");
}

function optionLabel(item, index) {
  if (!item) return t("entry", { index: index + 1 });
  return item.service_name || item.k || t("entry", { index: index + 1 });
}

function renderSelect(selectId, items, selectedIndex) {
  const select = document.getElementById(selectId);
  select.innerHTML = items.map((item, index) =>
    `<option value="${index}" ${index === selectedIndex ? "selected" : ""}>${escapeHtml(optionLabel(item, index))}</option>`,
  ).join("");
  select.disabled = items.length === 0;
}

function renderServiceFields() {
  const services = currentServices();
  state.selectedServiceIndex = Math.min(state.selectedServiceIndex, Math.max(services.length - 1, 0));
  renderSelect("serviceSelect", services, state.selectedServiceIndex);
  const service = services[state.selectedServiceIndex] || {};
  document.getElementById("serviceFields").innerHTML = serviceFields.map((field) =>
    fieldInput(service, { ...field, hidden: field.name === "id" || field.name === "app_id" }),
  ).join("");
}

function renderEnvFields() {
  const env = currentEnv();
  state.selectedEnvIndex = Math.min(state.selectedEnvIndex, Math.max(env.length - 1, 0));
  renderSelect("envSelect", env, state.selectedEnvIndex);
  const item = env[state.selectedEnvIndex] || {};
  document.getElementById("envFields").innerHTML =
    fieldInput(item, { name: "id", label: "id", readonly: true, hidden: true }) +
    fieldInput(item, { name: "app_id", label: "app_id", readonly: true, hidden: true }) +
    fieldInput(item, { name: "k", label: "k" }) +
    fieldInput(item, { name: "v", label: "v" });
}

function renderPrivilege() {
  document.getElementById("runAsSelect").value = currentRunAs();
}

function renderEditor() {
  const app = currentApp();
  const empty = document.getElementById("emptyState");
  const editor = document.getElementById("editor");
  if (!app) {
    empty.textContent = t("emptyApps");
    empty.classList.remove("hidden");
    editor.classList.add("hidden");
    document.getElementById("pageTitle").textContent = t("appConfig");
    return;
  }
  document.getElementById("pageTitle").textContent = t("editorTitle", { name: app.name || app.app_name });
  empty.classList.add("hidden");
  editor.classList.remove("hidden");
  renderAppFields(app);
  renderPrivilege();
  renderEnvFields();
  renderServiceFields();
}

function collectFields(container, target) {
  container.querySelectorAll("[data-field]").forEach((input) => {
    target[input.dataset.field] = input.dataset.kind === "bool"
      ? input.value === "true"
      : input.value;
  });
}

function applyCurrentEdits() {
  const app = currentApp();
  if (!app) return;
  collectFields(document.getElementById("appFields"), app);
  state.runAs[String(app.id)] = document.getElementById("runAsSelect").value;

  const services = currentServices();
  const service = services[state.selectedServiceIndex];
  if (service) {
    collectFields(document.getElementById("serviceFields"), service);
  }

  const env = currentEnv();
  const item = env[state.selectedEnvIndex];
  if (item) collectFields(document.getElementById("envFields"), item);
}

function refreshAll(data) {
  state.apps = data.apps || [];
  state.services = data.services || [];
  state.env = data.env || [];
  state.runAs = data.runAs || {};
  rebuildRestartBaseline();
  if (!state.apps.some((app) => app.id === state.selectedAppId)) {
    state.selectedAppId = state.apps[0]?.id ?? null;
  }
  renderAppList();
  renderEditor();
}

async function loadData() {
  document.getElementById("emptyState").textContent = t("loading");
  const data = await api("list");
  refreshAll(data);
}

async function saveData() {
  if (state.saving) return;
  applyCurrentEdits();
  const app = currentApp();
  if (!app) return;
  setSaving(true);
  try {
    const restart = restartSnapshot(app.id) !== state.restartBaseline[String(app.id)];
    const payload = {
      app,
      restart,
    };
    if (restart) {
      payload.runAs = state.runAs[String(app.id)] || "root";
      payload.services = state.services.filter((item) => item.app_id === app.id);
      payload.env = state.env.filter((item) => item.app_id === app.id);
    }
    const data = await api("save", payload);
    refreshAll(data);
    showToast(t("saveSuccess"));
  } finally {
    setSaving(false);
  }
}

function addService() {
  applyCurrentEdits();
  const app = currentApp();
  if (!app) return;
  const existing = new Set(currentServices().map((item) => item.service_name).filter(Boolean));
  const item = {
    app_id: app.id,
    service_name: uniqueValue(`${app.app_name}.Application`, existing),
    title: app.name || app.app_name,
    desc: "",
    icon: "ui/images/icon_{0}.png",
    type: "iframe",
    url: "",
    default_url: "",
    is_admin: true,
    control: "",
    full_url: "",
    no_display: false,
    gateway_socket: "",
    gateway_prefix: "",
    file_types: "[]",
    i18n_matadata: "",
  };
  state.services.push(item);
  state.selectedServiceIndex = currentServices().length - 1;
  renderServiceFields();
}

function deleteService() {
  applyCurrentEdits();
  const services = currentServices();
  const item = services[state.selectedServiceIndex];
  if (!item) return;
  if (item.id) item._delete = true;
  else state.services.splice(state.services.indexOf(item), 1);
  state.selectedServiceIndex = Math.max(0, state.selectedServiceIndex - 1);
  renderServiceFields();
}

function addEnv() {
  applyCurrentEdits();
  const app = currentApp();
  if (!app) return;
  const existing = new Set(currentEnv().map((item) => item.k).filter(Boolean));
  state.env.push({ app_id: app.id, k: uniqueValue("wizard_key", existing), v: "" });
  state.selectedEnvIndex = currentEnv().length - 1;
  renderEnvFields();
}

function deleteEnv() {
  applyCurrentEdits();
  const env = currentEnv();
  const item = env[state.selectedEnvIndex];
  if (!item) return;
  if (item.id) item._delete = true;
  else state.env.splice(state.env.indexOf(item), 1);
  state.selectedEnvIndex = Math.max(0, state.selectedEnvIndex - 1);
  renderEnvFields();
}

document.getElementById("appList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  applyCurrentEdits();
  state.selectedAppId = Number(button.dataset.id);
  state.selectedServiceIndex = 0;
  state.selectedEnvIndex = 0;
  renderAppList();
  renderEditor();
});

document.getElementById("serviceSelect").addEventListener("change", (event) => {
  applyCurrentEdits();
  state.selectedServiceIndex = Number(event.target.value || 0);
  renderServiceFields();
});

document.getElementById("envSelect").addEventListener("change", (event) => {
  applyCurrentEdits();
  state.selectedEnvIndex = Number(event.target.value || 0);
  renderEnvFields();
});

document.getElementById("searchInput").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderAppList();
});
document.getElementById("runAsSelect").addEventListener("change", (event) => {
  const app = currentApp();
  if (!app) return;
  state.runAs[String(app.id)] = event.target.value === "package" ? "package" : "root";
});

document.getElementById("refreshBtn").addEventListener("click", () => {
  loadData().then(() => showToast(t("refreshed"))).catch((error) => showToast(error.message, true));
});
document.getElementById("saveBtn").addEventListener("click", () => {
  saveData().catch((error) => showToast(error.message, true));
});
document.getElementById("addServiceBtn").addEventListener("click", addService);
document.getElementById("deleteServiceBtn").addEventListener("click", deleteService);
document.getElementById("addEnvBtn").addEventListener("click", addEnv);
document.getElementById("deleteEnvBtn").addEventListener("click", deleteEnv);
document.getElementById("aboutBtn").addEventListener("click", openAbout);
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", closeModals);
});
document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModals();
  });
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModals();
});

applyPreferences();
window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => applyPreferences());
window.addEventListener("storage", () => applyPreferences({ rerender: true }));
setInterval(() => applyPreferences({ rerender: true }), 1500);

loadData().catch((error) => {
  document.getElementById("emptyState").textContent = error.message;
  showToast(error.message, true);
});
