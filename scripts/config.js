(function () {
  window.AppConfig = Object.freeze({
    version: "1.0.0",
    defaultLocale: "zh-TW",
    fallbackLocale: "en",
    supportedLocales: ["zh-TW", "zh-CN", "en", "th", "id", "vi"],
    localeNamespaces: [
      "ui", "buttons", "system-messages", "errors", "chatbot", "accessibility",
      "setup", "security", "api-errors", "prompt-editor", "model-selector"
    ],
    exampleIndexUrl: "data/examples/index.json",
    geminiApiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    maxInputLength: 6000,
    maxPromptLength: 30000,
    minPromptLength: 80,
    maxHistoryMessages: 24,
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      maxOutputTokens: 4096
    },
    storageKeys: {
      locale: "familycare-assist.locale",
      sessionPrompt: "familycare-assist.session.prompt",
      sessionPromptName: "familycare-assist.session.prompt-name",
      sessionApiKey: "familycare-assist.session.api-key"
    }
  });
})();
