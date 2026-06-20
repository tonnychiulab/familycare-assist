(function () {
  let chatInitialized = false;

  async function populateExampleSelect() {
    const entries = await window.ExampleService.loadIndex();
    const select = window.UI.refs.exampleSelect;
    select.textContent = "";
    entries.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = window.ExampleService.getTitle(entry);
      select.appendChild(option);
    });
  }

  function refreshExampleTitles() {
    const select = window.UI.refs.exampleSelect;
    if (!select) return;
    const entries = window.ExampleService.getIndex();
    Array.from(select.options).forEach((option) => {
      const entry = entries.find((item) => item.id === option.value);
      if (entry) option.textContent = window.ExampleService.getTitle(entry);
    });
  }

  function getSpeechLanguage(locale) {
    const map = {
      "zh-TW": "zh-TW", "zh-CN": "zh-CN", "en": "en-US",
      "th": "th-TH", "id": "id-ID", "vi": "vi-VN"
    };
    return map[locale] || "en-US";
  }

  async function applyLocale(locale) {
    const resolved = await window.I18n.loadLocale(locale);
    window.I18n.applyTranslations();
    window.BrandService.apply(resolved);
    window.UI.refs.languageSelect.value = resolved;
    refreshExampleTitles();
    if (window.SetupGate) window.SetupGate.refreshLocalization();
  }

  function addWelcomeMessage() {
    const safety = window.Chatbot.createMessage(
      "system",
      window.I18n.t("chatbot.welcome"),
      { excludeFromModel: true }
    );
    window.SessionStore.addMessage(safety);
    window.UI.appendMessage(safety);

    const welcome = window.Chatbot.createMessage(
      "assistant",
      window.I18n.t("chatbot.chiefComplaintPrompt"),
      { excludeFromModel: true }
    );
    window.SessionStore.addMessage(welcome);
    window.UI.appendMessage(welcome);
  }

  function startChatSession() {
    window.SessionStore.reset();
    window.UI.resetConversation();
    window.UI.renderPatient({
      code: "DEMO-018",
      age: 18,
      sexLabel: window.I18n.t("ui.male"),
      visitTypeLabel: window.I18n.t("ui.firstVisit")
    });
    addWelcomeMessage();
    chatInitialized = true;
    window.UI.refs.messageInput.focus();
  }

  async function loadExample(example) {
    window.SessionStore.reset();
    window.SessionStore.setExample(example);
    window.SessionStore.setSummary(example.soap);
    window.UI.resetConversation();

    if (example.patient) {
      window.UI.renderPatient({
        code: example.patient.code,
        age: example.patient.age,
        sexLabel: example.patient.sexLabel || window.I18n.t("ui.male"),
        visitTypeLabel: example.patient.visitTypeLabel || window.I18n.t("ui.firstVisit")
      });
    }

    const intro = window.Chatbot.createMessage(
      "system",
      window.I18n.t("chatbot.exampleLoaded", {
        title: window.ExampleService.getTitle(example)
      }),
      { excludeFromModel: true }
    );
    window.SessionStore.addMessage(intro);
    window.UI.appendMessage(intro);

    (example.conversation || []).forEach((item) => {
      const message = window.Chatbot.createMessage(item.role, item.content, { example: true });
      window.SessionStore.addMessage(message);
      window.UI.appendMessage(message);
    });

    window.UI.renderSummary(example);
    window.UI.showToast(window.I18n.t("system.exampleLoaded"), "success");
  }

  async function onLoadSelectedExample() {
    try {
      const example = await window.ExampleService.loadById(window.UI.refs.exampleSelect.value);
      await loadExample(example);
    } catch (error) {
      window.ErrorHandler.emit(window.ErrorHandler.create(
        "FC-EXAMPLE-001", "errors.exampleLoadFailed", error.message, true
      ));
    }
  }

  async function onImportExample(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const example = await window.ExampleService.readFile(file);
      await loadExample(example);
    } catch (error) {
      window.ErrorHandler.emit(window.ErrorHandler.create(
        "FC-EXAMPLE-002", "errors.exampleInvalid", error.message, true
      ));
    } finally {
      event.target.value = "";
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    const text = window.UI.refs.messageInput.value;
    try {
      await window.Chatbot.sendDoctorMessage(text);
      window.UI.refs.messageInput.value = "";
      window.UI.updateCharacterCount();
      window.UI.refs.messageInput.focus();
    } catch (_) {}
  }

  function stopVoiceUi() {
    window.UI.refs.voiceButton.classList.remove("is-recording");
    window.UI.refs.voiceButton.setAttribute("aria-pressed", "false");
    window.UI.refs.voiceButtonLabel.textContent = window.I18n.t("buttons.startVoice");
    window.UI.refs.voiceStatus.textContent = "";
    window.UI.refs.voiceStatus.classList.remove("is-recording");
  }

  function toggleVoice() {
    if (!window.VoiceAdapter.isSupported()) {
      window.ErrorHandler.emit(window.ErrorHandler.create(
        "FC-VOICE-001", "errors.voiceUnsupported", "", true
      ));
      return;
    }

    if (window.VoiceAdapter.isActive()) {
      window.VoiceAdapter.stop();
      stopVoiceUi();
      return;
    }

    try {
      window.VoiceAdapter.start(getSpeechLanguage(window.I18n.getLocale()));
      window.UI.refs.voiceButton.classList.add("is-recording");
      window.UI.refs.voiceButton.setAttribute("aria-pressed", "true");
      window.UI.refs.voiceButtonLabel.textContent = window.I18n.t("buttons.stopVoice");
      window.UI.refs.voiceStatus.textContent = window.I18n.t("system.voiceListening");
      window.UI.refs.voiceStatus.classList.add("is-recording");
    } catch (error) {
      window.ErrorHandler.emit(window.ErrorHandler.create(
        "FC-VOICE-003", "errors.voiceStartFailed", error.message, true
      ));
    }
  }

  function setupVoice() {
    window.VoiceAdapter.onPartial((text) => {
      window.UI.refs.voiceStatus.textContent = `${window.I18n.t("system.voiceListening")} ${text}`;
    });
    window.VoiceAdapter.onFinal((text) => {
      const input = window.UI.refs.messageInput;
      const spacer = input.value && !input.value.endsWith(" ") ? " " : "";
      input.value += `${spacer}${text}`;
      window.UI.updateCharacterCount();
    });
    window.VoiceAdapter.onError((code) => {
      stopVoiceUi();
      const key = code === "not-allowed" || code === "service-not-allowed"
        ? "errors.microphoneDenied" : "errors.voiceRecognitionFailed";
      window.ErrorHandler.emit(window.ErrorHandler.create("FC-VOICE-002", key, code, true));
    });
    window.VoiceAdapter.onEnd(stopVoiceUi);
  }

  function bindChatEvents() {
    const refs = window.UI.refs;
    refs.languageSelect.addEventListener("change", async (event) => {
      await applyLocale(event.target.value);
      window.UI.showToast(window.I18n.t("system.languageChanged"), "success");
    });
    refs.resetButton.addEventListener("click", () => {
      window.VoiceAdapter.stop();
      startChatSession();
      window.UI.showToast(window.I18n.t("system.sessionReset"), "success");
    });
    refs.loadExampleButton.addEventListener("click", onLoadSelectedExample);
    refs.exampleFileInput.addEventListener("change", onImportExample);
    refs.chatForm.addEventListener("submit", onSubmit);
    refs.clearInputButton.addEventListener("click", () => {
      refs.messageInput.value = "";
      window.UI.updateCharacterCount();
      refs.messageInput.focus();
    });
    refs.messageInput.addEventListener("input", window.UI.updateCharacterCount);
    refs.messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        refs.chatForm.requestSubmit();
      }
    });
    refs.voiceButton.addEventListener("click", toggleVoice);
  }

  async function init() {
    window.UI.initialize();
    window.ErrorHandler.onError((error) => {
      const message = window.I18n.t(error.messageKey);
      window.UI.showToast(`${message} (${error.code})`, "error");
    });

    await window.I18n.loadLocale(window.I18n.detectLocale());
    window.I18n.applyTranslations();
    window.BrandService.apply(window.I18n.getLocale());
    window.UI.refs.languageSelect.value = window.I18n.getLocale();

    await populateExampleSelect();
    bindChatEvents();
    setupVoice();
    await window.SetupGate.initialize({ onReady: startChatSession });

    if (!window.VoiceAdapter.isSupported()) {
      window.UI.refs.voiceButton.title = window.I18n.t("errors.voiceUnsupported");
    }

    window.UI.refs.app.setAttribute("aria-busy", "false");
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      console.error(error);
      document.body.textContent = "FamilyCare Assist failed to initialize.";
    });
  });
})();
