(function () {
  function mapMessage(message) {
    if (message.metadata && message.metadata.excludeFromModel) return null;
    if (message.role === "doctor") {
      return { role: "user", parts: [{ text: message.content }] };
    }
    if (message.role === "assistant") {
      return { role: "model", parts: [{ text: message.content }] };
    }
    return null;
  }

  function build(sessionMessages) {
    const history = (sessionMessages || [])
      .map(mapMessage)
      .filter(Boolean)
      .slice(-window.AppConfig.maxHistoryMessages);

    return {
      systemInstruction: {
        parts: [{ text: window.PromptManager.getCombinedPrompt() }]
      },
      contents: history,
      generationConfig: Object.assign({}, window.AppConfig.generationConfig)
    };
  }

  window.RequestBuilder = { build };
})();
