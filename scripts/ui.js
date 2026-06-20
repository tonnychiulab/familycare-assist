(function () {
  const refs = {};

  function cacheElements() {
    [
      "app","languageSelect","resetButton","exampleSelect","loadExampleButton",
      "exampleFileInput","messageList","chatForm","messageInput","clearInputButton",
      "voiceButton","voiceButtonLabel","sendButton","voiceStatus","characterCount",
      "connectionStatus","summaryEmpty","soapSummary","soapSubjective",
      "soapObjective","soapAssessment","soapPlan","safetyReminderText",
      "patientCode","patientAge","patientSex","visitType","appVersion","toastRegion"
    ].forEach((id) => { refs[id] = document.getElementById(id); });
  }

  function roleLabel(role) {
    const map = {
      doctor: "ui.doctor", assistant: "ui.aiAssistant", system: "ui.system",
      warning: "ui.warning", error: "ui.error"
    };
    return window.I18n.t(map[role] || "ui.system");
  }

  function roleAvatar(role) {
    return { doctor: "DR", assistant: "AI", system: "i", warning: "!", error: "×" }[role] || "i";
  }

  function formatTime(value) {
    try {
      return new Intl.DateTimeFormat(window.I18n.getLocale(), {
        hour: "2-digit", minute: "2-digit"
      }).format(new Date(value));
    } catch (_) { return ""; }
  }

  function appendMessage(message) {
    const wrapper = document.createElement("article");
    wrapper.className = `message message-${message.role}`;
    wrapper.dataset.messageId = message.id;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = roleAvatar(message.role);

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    const meta = document.createElement("div");
    meta.className = "message-meta";

    const name = document.createElement("strong");
    name.textContent = roleLabel(message.role);

    const time = document.createElement("time");
    time.dateTime = message.createdAt;
    time.textContent = formatTime(message.createdAt);

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = message.content;

    meta.append(name, time);
    bubble.append(meta, content);
    wrapper.append(avatar, bubble);
    refs.messageList.appendChild(wrapper);
    refs.messageList.scrollTop = refs.messageList.scrollHeight;
  }

  function setProcessing(isProcessing) {
    refs.sendButton.disabled = isProcessing;
    refs.messageInput.disabled = isProcessing;
    refs.connectionStatus.textContent = window.I18n.t(
      isProcessing ? "system.processing" : "system.ready"
    );
    refs.connectionStatus.className = `status-chip ${isProcessing ? "" : "status-ready"}`;
    refs.app.setAttribute("aria-busy", String(isProcessing));

    const existing = refs.messageList.querySelector("[data-typing='true']");
    if (isProcessing && !existing) {
      const typing = document.createElement("div");
      typing.className = "message message-assistant";
      typing.dataset.typing = "true";

      const avatar = document.createElement("div");
      avatar.className = "message-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "AI";

      const bubble = document.createElement("div");
      bubble.className = "message-bubble";
      const content = document.createElement("div");
      content.className = "message-content";
      const indicator = document.createElement("span");
      indicator.className = "typing-indicator";
      indicator.setAttribute("aria-label", window.I18n.t("system.processing"));
      indicator.append(document.createElement("span"), document.createElement("span"), document.createElement("span"));
      content.appendChild(indicator);
      bubble.appendChild(content);
      typing.append(avatar, bubble);
      refs.messageList.appendChild(typing);
      refs.messageList.scrollTop = refs.messageList.scrollHeight;
    } else if (!isProcessing && existing) {
      existing.remove();
    }
  }

  function renderList(container, value) {
    container.textContent = "";
    if (Array.isArray(value)) {
      const list = document.createElement("ul");
      value.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      container.appendChild(list);
    } else {
      container.textContent = value || "—";
    }
  }

  function renderSummary(example) {
    refs.summaryEmpty.hidden = true;
    refs.soapSummary.hidden = false;
    renderList(refs.soapSubjective, example.soap.subjective);
    renderList(refs.soapObjective, example.soap.objective);
    renderList(refs.soapAssessment, example.soap.assessment);
    renderList(refs.soapPlan, example.soap.plan);
    refs.safetyReminderText.textContent =
      (example.safety && example.safety.disclaimer) ||
      window.I18n.t("ui.defaultSafetyReminder");
  }

  function clearSummary() {
    refs.summaryEmpty.hidden = false;
    refs.soapSummary.hidden = true;
  }

  function renderPatient(patient) {
    refs.patientCode.textContent = patient && patient.code ? patient.code : "DEMO";
    refs.patientAge.textContent =
      patient && patient.age != null ? String(patient.age) : "—";
    refs.patientSex.textContent =
      patient && patient.sexLabel ? patient.sexLabel : window.I18n.t("ui.notSpecified");
    refs.visitType.textContent =
      patient && patient.visitTypeLabel ? patient.visitTypeLabel : window.I18n.t("ui.firstVisit");
  }

  function updateCharacterCount() {
    refs.characterCount.textContent =
      `${refs.messageInput.value.length} / ${window.AppConfig.maxInputLength}`;
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type || "info"}`;
    toast.textContent = message;
    refs.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 5000);
  }

  function resetConversation() {
    refs.messageList.textContent = "";
    refs.messageInput.value = "";
    updateCharacterCount();
    clearSummary();
  }

  function initialize() {
    cacheElements();
    refs.appVersion.textContent = `v${window.AppConfig.version}`;
    updateCharacterCount();
  }

  window.UI = {
    refs, initialize, appendMessage, setProcessing, renderSummary, renderPatient,
    clearSummary, updateCharacterCount, showToast, resetConversation
  };
})();
