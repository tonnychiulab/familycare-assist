(function () {
  function createMessage(role, content, metadata) {
    return {
      id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role,
      content,
      createdAt: new Date().toISOString(),
      metadata: metadata || {}
    };
  }

  async function sendDoctorMessage(text) {
    const validation = window.Validation.validateMessage(text);
    if (!validation.valid) {
      const issue = window.ErrorHandler.create(validation.code, validation.messageKey, "", true);
      window.ErrorHandler.emit(issue);
      throw issue;
    }

    const doctorMessage = createMessage("doctor", validation.value);
    window.SessionStore.addMessage(doctorMessage);
    window.UI.appendMessage(doctorMessage);
    window.UI.setProcessing(true);

    try {
      const response = await window.ApiClient.sendMessage();
      window.SessionStore.addMessage(response);
      window.UI.appendMessage(response);
      return response;
    } catch (error) {
      const normalized = window.ErrorHandler.create(
        error.code || "FC-AI-001",
        error.messageKey || "errors.aiUnavailable",
        error.message || "",
        true
      );
      normalized.status = error.status;
      window.ErrorHandler.emit(normalized);
      if (window.SetupGate) window.SetupGate.handleRuntimeApiError(error);
      throw normalized;
    } finally {
      window.UI.setProcessing(false);
    }
  }

  function addSystemMessage(content, level) {
    const role = level === "warning" ? "warning" : level === "error" ? "error" : "system";
    const message = createMessage(role, content);
    window.SessionStore.addMessage(message);
    window.UI.appendMessage(message);
    return message;
  }

  window.Chatbot = { sendDoctorMessage, addSystemMessage, createMessage };
})();
