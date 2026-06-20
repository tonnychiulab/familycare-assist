(function () {
  async function readError(response) {
    let data = {};
    try { data = await response.json(); } catch (_) {}
    const error = new Error(data.error && data.error.message ? data.error.message : `HTTP ${response.status}`);
    error.status = response.status;
    error.code = response.status === 400 ? "FC-AI-400" :
      response.status === 401 ? "FC-KEY-008" :
      response.status === 403 ? "FC-KEY-003" :
      response.status === 404 ? "FC-AI-404" :
      response.status === 429 ? "FC-KEY-004" :
      response.status >= 500 ? "FC-AI-500" : "FC-AI-001";
    error.messageKey = response.status === 400 ? "api-errors.badRequest" :
      response.status === 401 ? "api-errors.keyExpired" :
      response.status === 403 ? "api-errors.forbidden" :
      response.status === 404 ? "api-errors.modelUnavailable" :
      response.status === 429 ? "api-errors.quota" :
      response.status >= 500 ? "api-errors.serviceUnavailable" : "errors.aiUnavailable";
    return error;
  }

  function extractText(data) {
    const candidates = data && data.candidates ? data.candidates : [];
    const parts = candidates[0] && candidates[0].content && candidates[0].content.parts
      ? candidates[0].content.parts : [];
    const text = parts.map((part) => part.text || "").join("\n").trim();
    if (text) return text;

    const blockReason = data && data.promptFeedback && data.promptFeedback.blockReason;
    const error = new Error(blockReason || "Empty Gemini response");
    error.code = blockReason ? "FC-AI-SAFETY" : "FC-AI-EMPTY";
    error.messageKey = blockReason ? "api-errors.safetyBlocked" : "api-errors.emptyResponse";
    throw error;
  }

  async function sendMessage() {
    const apiKey = window.CredentialVault.getKey();
    const selectedModel = window.GeminiModelService.getSelected();
    if (!window.CredentialVault.isVerified() || !apiKey) {
      const error = new Error("API key is not verified.");
      error.code = "FC-KEY-008";
      error.messageKey = "api-errors.keyExpired";
      throw error;
    }
    if (!selectedModel) {
      const error = new Error("No model selected.");
      error.code = "FC-MODEL-001";
      error.messageKey = "model-selector.errorRequired";
      throw error;
    }

    const endpoint = `${window.AppConfig.geminiApiBaseUrl}/${selectedModel.name}:generateContent`;
    const body = window.RequestBuilder.build(window.SessionStore.getState().messages);
    let response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(body),
        cache: "no-store",
        referrerPolicy: "no-referrer"
      });
    } catch (networkError) {
      const error = new Error(networkError.message || "Network error");
      error.code = "FC-KEY-005";
      error.messageKey = "api-errors.network";
      throw error;
    }

    if (!response.ok) throw await readError(response);
    const data = await response.json();
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: extractText(data),
      createdAt: new Date().toISOString(),
      metadata: {
        model: selectedModel.name,
        finishReason: data.candidates && data.candidates[0] ? data.candidates[0].finishReason : ""
      }
    };
  }

  window.ApiClient = { sendMessage };
})();
