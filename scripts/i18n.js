(function () {
  const dictionaries = {};
  let currentLocale = window.AppConfig.defaultLocale;

  function getStoredLocale() {
    try { return localStorage.getItem(window.AppConfig.storageKeys.locale); }
    catch (_) { return null; }
  }

  function detectLocale() {
    const stored = getStoredLocale();
    if (stored && window.AppConfig.supportedLocales.includes(stored)) return stored;
    const candidates = [navigator.language].concat(navigator.languages || []);
    for (const candidate of candidates) {
      if (!candidate) continue;
      const exact = window.AppConfig.supportedLocales.find(
        (item) => item.toLowerCase() === candidate.toLowerCase()
      );
      if (exact) return exact;
      const base = candidate.split("-")[0];
      const partial = window.AppConfig.supportedLocales.find(
        (item) => item.split("-")[0] === base
      );
      if (partial) return partial;
    }
    return window.AppConfig.defaultLocale;
  }

  async function fetchNamespace(locale, namespace) {
    const response = await fetch(`locales/${locale}/${namespace}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  async function loadLocale(locale) {
    if (!window.AppConfig.supportedLocales.includes(locale)) {
      locale = window.AppConfig.defaultLocale;
    }

    if (!dictionaries[locale]) {
      dictionaries[locale] = {};
      try {
        const results = await Promise.all(
          window.AppConfig.localeNamespaces.map((namespace) => fetchNamespace(locale, namespace))
        );
        window.AppConfig.localeNamespaces.forEach((namespace, index) => {
          const publicNamespace = namespace === "system-messages" ? "system" : namespace;
          dictionaries[locale][publicNamespace] = results[index];
        });
      } catch (error) {
        if (locale !== window.AppConfig.fallbackLocale) {
          window.ErrorHandler.emit(window.ErrorHandler.create(
            "FC-I18N-001", "errors.localeLoadFailed", error.message, true
          ));
          return loadLocale(window.AppConfig.fallbackLocale);
        }
        throw error;
      }
    }

    currentLocale = locale;
    try { localStorage.setItem(window.AppConfig.storageKeys.locale, locale); } catch (_) {}
    document.documentElement.lang =
      locale === "zh-TW" ? "zh-Hant" : locale === "zh-CN" ? "zh-Hans" : locale;
    return locale;
  }

  function readPath(obj, path) {
    return path.split(".").reduce((value, key) => value && value[key], obj);
  }

  function t(key, replacements) {
    const [namespace, ...parts] = key.split(".");
    const path = parts.join(".");
    let value = readPath(dictionaries[currentLocale] && dictionaries[currentLocale][namespace], path);
    if (value == null) {
      value = readPath(
        dictionaries[window.AppConfig.fallbackLocale] &&
        dictionaries[window.AppConfig.fallbackLocale][namespace],
        path
      );
    }
    if (value == null) value = key;
    if (typeof value !== "string") return value;

    return Object.entries(replacements || {}).reduce(
      (text, [name, replacement]) => text.split(`{${name}}`).join(replacement),
      value
    );
  }

  function applyTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
    scope.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
  }

  window.I18n = {
    detectLocale,
    loadLocale,
    applyTranslations,
    t,
    getLocale: () => currentLocale
  };
})();
