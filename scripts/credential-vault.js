(function () {
  let apiKey = "";
  let lastFour = "";
  let verifiedAt = null;
  let verified = false;
  let rememberSession = false;

  function normalize(value) {
    return String(value || "").trim().replace(/\s+/g, "");
  }

  function set(value, options) {
    const normalized = normalize(value);
    if (!normalized) {
      return { valid: false, code: "FC-KEY-001", messageKey: "api-errors.emptyKey" };
    }
    apiKey = normalized;
    lastFour = normalized.slice(-4);
    verified = false;
    verifiedAt = null;
    rememberSession = Boolean(options && options.rememberSession);
    persist();
    return { valid: true, lastFour };
  }

  function persist() {
    try {
      if (rememberSession && apiKey) {
        sessionStorage.setItem(window.AppConfig.storageKeys.sessionApiKey, apiKey);
      } else {
        sessionStorage.removeItem(window.AppConfig.storageKeys.sessionApiKey);
      }
    } catch (_) {}
  }

  function restore() {
    try {
      const stored = sessionStorage.getItem(window.AppConfig.storageKeys.sessionApiKey) || "";
      if (stored) {
        apiKey = normalize(stored);
        lastFour = apiKey.slice(-4);
        rememberSession = true;
      }
      return { restored: Boolean(stored), lastFour };
    } catch (_) {
      return { restored: false, lastFour: "" };
    }
  }

  function markVerified() {
    verified = true;
    verifiedAt = new Date().toISOString();
    persist();
  }

  function markInvalid() {
    verified = false;
    verifiedAt = null;
  }

  function clear() {
    apiKey = "";
    lastFour = "";
    verifiedAt = null;
    verified = false;
    rememberSession = false;
    try { sessionStorage.removeItem(window.AppConfig.storageKeys.sessionApiKey); } catch (_) {}
  }

  window.CredentialVault = {
    set,
    restore,
    markVerified,
    markInvalid,
    clear,
    getKey: () => apiKey,
    getLastFour: () => lastFour,
    getVerifiedAt: () => verifiedAt,
    isVerified: () => verified && Boolean(apiKey),
    hasKey: () => Boolean(apiKey)
  };
})();
