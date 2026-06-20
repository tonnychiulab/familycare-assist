(function () {
  const refs = {};
  let readyCallback = null;
  let currentModels = [];
  let promptDirty = true;
  let lastAppliedPrompt = "";

  function cacheElements() {
    [
      "setupGate", "chatApplication", "settingsButton", "lockButton", "resetButton",
      "securityConsent", "promptName", "systemPrompt", "promptCounter", "tokenEstimate",
      "promptFingerprint", "promptFileInput", "applyPromptButton", "previewPromptButton", "clearPromptButton",
      "rememberPromptSession", "promptValidationMessage", "apiKeyInput",
      "toggleKeyVisibilityButton", "rememberKeySession", "credentialStatus",
      "credentialStatusTitle", "credentialStatusDetail", "verifiedKeyMeta", "keyLastFour",
      "keyVerifiedAt", "validateKeyButton", "clearKeyButton", "modelSelect",
      "showPreviewModels", "modelDetails", "gateChecklist", "enterChatButton",
      "promptPreviewDialog", "promptPreviewContent", "closePromptPreviewButton",
      "activePromptName", "activePromptHash", "activeModelName", "activeKeyLastFour"
    ].forEach((id) => { refs[id] = document.getElementById(id); });
  }

  function setCredentialState(state, titleKey, detailKey, replacements) {
    refs.credentialStatus.dataset.state = state;
    refs.credentialStatusTitle.textContent = window.I18n.t(titleKey, replacements);
    refs.credentialStatusDetail.textContent = window.I18n.t(detailKey, replacements);
  }

  function setPromptMessage(key, type) {
    refs.promptValidationMessage.textContent = key ? window.I18n.t(key) : "";
    refs.promptValidationMessage.className = `field-message${type ? ` is-${type}` : ""}`;
  }

  async function applyPromptFromEditor(showMessage) {
    const result = await window.PromptManager.set(
      refs.systemPrompt.value,
      refs.promptName.value,
      { rememberSession: refs.rememberPromptSession.checked }
    );

    if (!result.valid) {
      refs.promptFingerprint.textContent = "—";
      if (showMessage) setPromptMessage(result.messageKey, "error");
      updateGateState();
      return result;
    }

    promptDirty = false;
    lastAppliedPrompt = result.prompt;
    refs.promptFingerprint.textContent = result.fingerprint;
    if (showMessage) setPromptMessage("prompt-editor.valid", "success");
    updateGateState();
    return result;
  }

  function updatePromptMetrics() {
    const value = refs.systemPrompt.value;
    refs.promptCounter.textContent = `${value.length} / ${window.AppConfig.maxPromptLength}`;
    refs.tokenEstimate.textContent = String(window.PromptManager.estimateTokens(value));
    promptDirty = value.trim() !== lastAppliedPrompt;
    if (promptDirty) refs.promptFingerprint.textContent = "—";
    setPromptMessage("", "");
    updateGateState();
  }

  function classifyModel(model) {
    return window.GeminiModelService.getLifecycle(model);
  }

  function modelLabel(model) {
    const shortName = String(model.name || "").replace(/^models\//, "");
    const display = model.displayName && model.displayName !== shortName
      ? `${model.displayName} · ${shortName}` : shortName;
    const stage = classifyModel(model);
    return stage === "stable" ? display : `${display} [${stage}]`;
  }

  function populateModels(preserveSelection) {
    const previous = preserveSelection || refs.modelSelect.value;
    refs.modelSelect.textContent = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = window.I18n.t("model-selector.choose");
    refs.modelSelect.appendChild(placeholder);

    const visible = window.GeminiModelService.getVisible(refs.showPreviewModels.checked);
    visible.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.name;
      option.textContent = modelLabel(model);
      refs.modelSelect.appendChild(option);
    });
    refs.modelSelect.disabled = !window.CredentialVault.isVerified();

    if (previous && visible.some((model) => model.name === previous)) {
      refs.modelSelect.value = previous;
      window.GeminiModelService.select(previous);
    } else {
      const preferred = visible.find((model) => /flash/i.test(model.name)) || visible[0];
      if (preferred) {
        refs.modelSelect.value = preferred.name;
        window.GeminiModelService.select(preferred.name);
      }
    }
    renderModelDetails();
    updateGateState();
  }

  function renderModelDetails() {
    const model = window.GeminiModelService.getSelected();
    refs.modelDetails.textContent = "";
    refs.modelDetails.hidden = !model;
    if (!model) return;

    const dl = document.createElement("dl");
    const rows = [
      [window.I18n.t("model-selector.resourceName"), model.name || "—"],
      [window.I18n.t("model-selector.lifecycle"), classifyModel(model)],
      [window.I18n.t("model-selector.inputLimit"), model.inputTokenLimit != null ? String(model.inputTokenLimit) : "—"],
      [window.I18n.t("model-selector.outputLimit"), model.outputTokenLimit != null ? String(model.outputTokenLimit) : "—"]
    ];
    rows.forEach(([label, value]) => {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      dl.append(dt, dd);
    });
    refs.modelDetails.appendChild(dl);
    if (model.description) {
      const p = document.createElement("p");
      p.textContent = model.description;
      p.className = "helper-text";
      refs.modelDetails.appendChild(p);
    }
  }

  async function validateApiKey() {
    if (!refs.securityConsent.checked) {
      window.UI.showToast(window.I18n.t("security.errorConsentRequired"), "error");
      updateGateState();
      return;
    }

    const promptResult = await applyPromptFromEditor(true);
    if (!promptResult.valid) return;

    const typedKey = refs.apiKeyInput.value;
    if (typedKey) {
      const keyResult = window.CredentialVault.set(typedKey, {
        rememberSession: refs.rememberKeySession.checked
      });
      if (!keyResult.valid) {
        setCredentialState("invalid", "setup.keyInvalid", keyResult.messageKey);
        updateGateState();
        return;
      }
    } else if (!window.CredentialVault.hasKey()) {
      setCredentialState("invalid", "setup.keyInvalid", "api-errors.emptyKey");
      updateGateState();
      return;
    }

    refs.validateKeyButton.disabled = true;
    refs.apiKeyInput.disabled = true;
    setCredentialState("validating", "setup.keyValidating", "setup.keyValidatingDetail");

    try {
      currentModels = await window.GeminiModelService.listModels(window.CredentialVault.getKey());
      window.CredentialVault.markVerified();
      refs.apiKeyInput.value = "";
      refs.apiKeyInput.disabled = false;
      refs.verifiedKeyMeta.hidden = false;
      refs.keyLastFour.textContent = window.CredentialVault.getLastFour();
      refs.keyVerifiedAt.textContent = formatDateTime(window.CredentialVault.getVerifiedAt());
      setCredentialState("valid", "setup.keyVerified", "setup.keyVerifiedDetail", { count: String(currentModels.length) });
      populateModels();
      window.UI.showToast(window.I18n.t("setup.keyVerified"), "success");
    } catch (error) {
      window.CredentialVault.markInvalid();
      window.GeminiModelService.clear();
      currentModels = [];
      refs.apiKeyInput.disabled = false;
      refs.verifiedKeyMeta.hidden = true;
      refs.modelSelect.disabled = true;
      refs.modelSelect.textContent = "";
      const option = document.createElement("option");
      option.value = "";
      option.textContent = window.I18n.t("model-selector.verifyFirst");
      refs.modelSelect.appendChild(option);
      const messageKey = error.messageKey || "api-errors.validationFailed";
      setCredentialState("invalid", "setup.keyInvalid", messageKey);
      window.ErrorHandler.emit(window.ErrorHandler.create(
        error.code || "FC-KEY-002", messageKey, error.message || "", true
      ));
    } finally {
      refs.validateKeyButton.disabled = false;
      updateGateState();
    }
  }

  function clearKey() {
    window.CredentialVault.clear();
    window.GeminiModelService.clear();
    currentModels = [];
    refs.apiKeyInput.value = "";
    refs.apiKeyInput.type = "password";
    refs.rememberKeySession.checked = false;
    refs.verifiedKeyMeta.hidden = true;
    refs.modelDetails.hidden = true;
    refs.modelSelect.disabled = true;
    refs.modelSelect.textContent = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = window.I18n.t("model-selector.verifyFirst");
    refs.modelSelect.appendChild(option);
    setCredentialState("unconfigured", "setup.keyNotVerified", "setup.keyNotVerifiedDetail");
    updateGateState();
  }

  function clearPrompt() {
    window.PromptManager.clear();
    refs.promptName.value = "";
    refs.systemPrompt.value = "";
    refs.rememberPromptSession.checked = false;
    lastAppliedPrompt = "";
    promptDirty = true;
    updatePromptMetrics();
  }

  async function importPrompt(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 150000) {
      window.UI.showToast(window.I18n.t("prompt-editor.errorFileTooLarge"), "error");
      event.target.value = "";
      return;
    }
    try {
      const text = await file.text();
      refs.systemPrompt.value = text.slice(0, window.AppConfig.maxPromptLength);
      if (!refs.promptName.value) refs.promptName.value = file.name.replace(/\.(txt|md)$/i, "");
      updatePromptMetrics();
      await applyPromptFromEditor(true);
    } catch (error) {
      window.ErrorHandler.emit(window.ErrorHandler.create(
        "FC-PROMPT-004", "prompt-editor.errorImport", error.message, true
      ));
    } finally {
      event.target.value = "";
    }
  }

  async function showPromptPreview() {
    const result = await applyPromptFromEditor(true);
    if (!result.valid) return;
    refs.promptPreviewContent.textContent = window.PromptManager.getCombinedPrompt();
    refs.promptPreviewDialog.hidden = false;
    refs.closePromptPreviewButton.focus();
  }

  function closePromptPreview() {
    refs.promptPreviewDialog.hidden = true;
    refs.previewPromptButton.focus();
  }

  function formatDateTime(value) {
    if (!value) return "—";
    try {
      return new Intl.DateTimeFormat(window.I18n.getLocale(), {
        dateStyle: "short", timeStyle: "medium"
      }).format(new Date(value));
    } catch (_) { return value; }
  }

  function conditions() {
    return {
      consent: refs.securityConsent.checked,
      prompt: window.PromptManager.isReady() && !promptDirty,
      key: window.CredentialVault.isVerified(),
      model: Boolean(window.GeminiModelService.getSelected())
    };
  }

  function updateGateState() {
    if (!refs.gateChecklist) return;
    const state = conditions();
    refs.enterChatButton.disabled = !Object.values(state).every(Boolean);
    refs.gateChecklist.textContent = "";
    const ul = document.createElement("ul");
    const items = [
      [state.consent, "setup.checkConsent"],
      [state.prompt, "setup.checkPrompt"],
      [state.key, "setup.checkKey"],
      [state.model, "setup.checkModel"]
    ];
    items.forEach(([done, key]) => {
      const li = document.createElement("li");
      li.className = done ? "ok" : "pending";
      li.textContent = `${done ? "✓" : "○"} ${window.I18n.t(key)}`;
      ul.appendChild(li);
    });
    refs.gateChecklist.appendChild(ul);
  }

  async function enterChat() {
    const promptResult = await applyPromptFromEditor(true);
    if (!promptResult.valid) return;
    if (!Object.values(conditions()).every(Boolean)) {
      updateGateState();
      return;
    }

    refs.activePromptName.textContent = window.PromptManager.getName();
    refs.activePromptHash.textContent = window.PromptManager.getFingerprint();
    const model = window.GeminiModelService.getSelected();
    refs.activeModelName.textContent = model ? model.name.replace(/^models\//, "") : "—";
    refs.activeKeyLastFour.textContent = `••••${window.CredentialVault.getLastFour()}`;
    refs.setupGate.hidden = true;
    refs.chatApplication.hidden = false;
    refs.lockButton.hidden = false;
    refs.resetButton.hidden = false;
    window.scrollTo({ top: 0, behavior: "auto" });
    if (readyCallback) readyCallback();
  }

  function showSettings() {
    refs.chatApplication.hidden = true;
    refs.setupGate.hidden = false;
    refs.lockButton.hidden = true;
    refs.resetButton.hidden = true;
    updateGateState();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function lockSystem() {
    clearKey();
    if (!refs.rememberPromptSession.checked) clearPrompt();
    window.SessionStore.reset();
    window.UI.resetConversation();
    showSettings();
    window.UI.showToast(window.I18n.t("setup.systemLocked"), "success");
  }

  function handleRuntimeApiError(error) {
    if (error && [401, 403].includes(error.status)) {
      window.CredentialVault.markInvalid();
      setCredentialState("invalid", "setup.keyInvalid", error.messageKey || "api-errors.keyExpired");
      refs.chatApplication.hidden = true;
      refs.setupGate.hidden = false;
      refs.lockButton.hidden = true;
      refs.resetButton.hidden = true;
      updateGateState();
    }
  }

  async function restoreSessionValues() {
    const storedPrompt = window.PromptManager.restore();
    if (storedPrompt.remembered) {
      refs.systemPrompt.value = storedPrompt.prompt;
      refs.promptName.value = storedPrompt.promptName;
      refs.rememberPromptSession.checked = true;
      await applyPromptFromEditor(false);
      updatePromptMetrics();
    } else {
      updatePromptMetrics();
    }

    const storedKey = window.CredentialVault.restore();
    if (storedKey.restored) {
      refs.rememberKeySession.checked = true;
      refs.verifiedKeyMeta.hidden = false;
      refs.keyLastFour.textContent = storedKey.lastFour;
      refs.keyVerifiedAt.textContent = "—";
      setCredentialState("unconfigured", "setup.keyRestored", "setup.keyRestoredDetail");
    }
  }

  function bindEvents() {
    refs.systemPrompt.addEventListener("input", updatePromptMetrics);
    refs.promptName.addEventListener("input", () => { promptDirty = true; updateGateState(); });
    refs.promptFileInput.addEventListener("change", importPrompt);
    refs.applyPromptButton.addEventListener("click", () => applyPromptFromEditor(true));
    refs.previewPromptButton.addEventListener("click", showPromptPreview);
    refs.closePromptPreviewButton.addEventListener("click", closePromptPreview);
    refs.promptPreviewDialog.addEventListener("click", (event) => {
      if (event.target === refs.promptPreviewDialog) closePromptPreview();
    });
    refs.clearPromptButton.addEventListener("click", clearPrompt);
    refs.securityConsent.addEventListener("change", updateGateState);
    refs.validateKeyButton.addEventListener("click", validateApiKey);
    refs.clearKeyButton.addEventListener("click", clearKey);
    refs.toggleKeyVisibilityButton.addEventListener("click", () => {
      const visible = refs.apiKeyInput.type === "text";
      refs.apiKeyInput.type = visible ? "password" : "text";
      refs.toggleKeyVisibilityButton.textContent = window.I18n.t(visible ? "setup.showKey" : "setup.hideKey");
    });
    refs.modelSelect.addEventListener("change", () => {
      window.GeminiModelService.select(refs.modelSelect.value);
      renderModelDetails();
      updateGateState();
    });
    refs.showPreviewModels.addEventListener("change", () => populateModels(refs.modelSelect.value));
    refs.enterChatButton.addEventListener("click", enterChat);
    refs.settingsButton.addEventListener("click", showSettings);
    refs.lockButton.addEventListener("click", lockSystem);
  }

  async function initialize(options) {
    cacheElements();
    readyCallback = options && options.onReady ? options.onReady : null;
    bindEvents();
    await restoreSessionValues();
    setCredentialState("unconfigured", "setup.keyNotVerified", "setup.keyNotVerifiedDetail");
    if (window.CredentialVault.hasKey()) {
      setCredentialState("unconfigured", "setup.keyRestored", "setup.keyRestoredDetail");
    }
    updateGateState();
  }

  function refreshLocalization() {
    updatePromptMetrics();
    if (window.CredentialVault.isVerified()) {
      setCredentialState("valid", "setup.keyVerified", "setup.keyVerifiedDetail", { count: String(currentModels.length) });
      populateModels(refs.modelSelect.value);
    } else if (window.CredentialVault.hasKey()) {
      setCredentialState("unconfigured", "setup.keyRestored", "setup.keyRestoredDetail");
    } else {
      setCredentialState("unconfigured", "setup.keyNotVerified", "setup.keyNotVerifiedDetail");
    }
    refs.toggleKeyVisibilityButton.textContent = window.I18n.t(
      refs.apiKeyInput.type === "text" ? "setup.hideKey" : "setup.showKey"
    );
    updateGateState();
  }

  window.SetupGate = {
    initialize,
    refreshLocalization,
    showSettings,
    lockSystem,
    handleRuntimeApiError,
    isReady: () => Object.values(conditions()).every(Boolean)
  };
})();
