(function () {
  let prompt = "";
  let promptName = "";
  let fingerprint = "";
  let updatedAt = null;
  let rememberSession = false;

  function normalize(value) {
    return String(value || "")
      .replace(/\u0000/g, "")
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .trim();
  }

  async function hashText(text) {
    if (window.crypto && window.crypto.subtle) {
      const data = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 12);
    }
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `f${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function estimateTokens(text) {
    const value = String(text || "");
    const cjk = (value.match(/[\u3400-\u9FFF\uF900-\uFAFF]/g) || []).length;
    const nonCjk = Math.max(0, value.length - cjk);
    return Math.max(0, Math.ceil(cjk / 1.6 + nonCjk / 4));
  }

  function validate(value) {
    const normalized = normalize(value);
    if (!normalized) return { valid: false, code: "FC-PROMPT-001", messageKey: "prompt-editor.errorEmpty" };
    if (normalized.length < window.AppConfig.minPromptLength) {
      return { valid: false, code: "FC-PROMPT-002", messageKey: "prompt-editor.errorTooShort" };
    }
    if (normalized.length > window.AppConfig.maxPromptLength) {
      return { valid: false, code: "FC-PROMPT-003", messageKey: "prompt-editor.errorTooLong" };
    }
    if (window.SecurityPolicy.containsLikelyCredential(normalized)) {
      return { valid: false, code: "FC-KEY-009", messageKey: "prompt-editor.errorCredentialDetected" };
    }
    return { valid: true, value: normalized };
  }

  async function set(value, name, options) {
    const result = validate(value);
    if (!result.valid) return result;

    prompt = result.value;
    promptName = normalize(name) || "Family Medicine Prompt";
    rememberSession = Boolean(options && options.rememberSession);
    fingerprint = await hashText(window.SecurityPolicy.combine(prompt));
    updatedAt = new Date().toISOString();

    try {
      if (rememberSession) {
        sessionStorage.setItem(window.AppConfig.storageKeys.sessionPrompt, prompt);
        sessionStorage.setItem(window.AppConfig.storageKeys.sessionPromptName, promptName);
      } else {
        sessionStorage.removeItem(window.AppConfig.storageKeys.sessionPrompt);
        sessionStorage.removeItem(window.AppConfig.storageKeys.sessionPromptName);
      }
    } catch (_) {}

    return { valid: true, prompt, promptName, fingerprint, updatedAt };
  }

  function restore() {
    try {
      const storedPrompt = sessionStorage.getItem(window.AppConfig.storageKeys.sessionPrompt) || "";
      const storedName = sessionStorage.getItem(window.AppConfig.storageKeys.sessionPromptName) || "";
      return { prompt: storedPrompt, promptName: storedName, remembered: Boolean(storedPrompt) };
    } catch (_) {
      return { prompt: "", promptName: "", remembered: false };
    }
  }

  function clear() {
    prompt = "";
    promptName = "";
    fingerprint = "";
    updatedAt = null;
    rememberSession = false;
    try {
      sessionStorage.removeItem(window.AppConfig.storageKeys.sessionPrompt);
      sessionStorage.removeItem(window.AppConfig.storageKeys.sessionPromptName);
    } catch (_) {}
  }

  window.PromptManager = {
    normalize,
    validate,
    set,
    clear,
    restore,
    estimateTokens,
    getPrompt: () => prompt,
    getName: () => promptName,
    getFingerprint: () => fingerprint,
    getUpdatedAt: () => updatedAt,
    getCombinedPrompt: () => window.SecurityPolicy.combine(prompt),
    isReady: () => Boolean(prompt && fingerprint)
  };
})();
