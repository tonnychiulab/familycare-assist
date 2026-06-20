(function () {
  let models = [];
  let selectedModel = "";

  function lifecycle(model) {
    const text = `${model.name || ""} ${model.displayName || ""} ${model.description || ""}`.toLowerCase();
    if (/experimental|\bexp\b/.test(text)) return "experimental";
    if (/preview/.test(text)) return "preview";
    if (/latest/.test(text)) return "latest";
    return "stable";
  }

  function isTextGenerationModel(model) {
    const methods = model.supportedGenerationMethods || [];
    if (!methods.includes("generateContent")) return false;
    const name = String(model.name || "").toLowerCase();
    const excluded = ["embedding", "imagen", "veo", "tts", "aqa", "robotics", "computer-use"];
    return !excluded.some((term) => name.includes(term));
  }

  function rank(model) {
    const stage = lifecycle(model);
    const stageRank = { stable: 0, latest: 1, preview: 2, experimental: 3 }[stage] ?? 4;
    const name = String(model.name || "");
    const familyRank = /flash/.test(name) ? 0 : /pro/.test(name) ? 1 : 2;
    return stageRank * 10 + familyRank;
  }

  async function listModels(apiKey) {
    const collected = [];
    let pageToken = "";
    let pageCount = 0;

    do {
      const url = new URL(`${window.AppConfig.geminiApiBaseUrl}/models`);
      url.searchParams.set("pageSize", "1000");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "x-goog-api-key": apiKey, "Accept": "application/json" },
        cache: "no-store",
        referrerPolicy: "no-referrer"
      });

      if (!response.ok) throw await createApiError(response);
      const data = await response.json();
      collected.push(...(data.models || []));
      pageToken = data.nextPageToken || "";
      pageCount += 1;
    } while (pageToken && pageCount < 5);

    models = collected.filter(isTextGenerationModel).sort((a, b) => rank(a) - rank(b) || String(a.name).localeCompare(String(b.name)));
    if (!models.length) {
      const error = new Error("No generateContent model available.");
      error.code = "FC-KEY-006";
      error.messageKey = "api-errors.noModels";
      throw error;
    }
    return models.slice();
  }

  async function createApiError(response) {
    let body = {};
    try { body = await response.json(); } catch (_) {}
    const error = new Error(body.error && body.error.message ? body.error.message : `HTTP ${response.status}`);
    error.status = response.status;
    error.code = response.status === 401 ? "FC-KEY-002" :
      response.status === 403 ? "FC-KEY-003" :
      response.status === 429 ? "FC-KEY-004" :
      response.status >= 500 ? "FC-KEY-005" : "FC-KEY-002";
    error.messageKey = response.status === 401 ? "api-errors.invalidKey" :
      response.status === 403 ? "api-errors.forbidden" :
      response.status === 429 ? "api-errors.quota" :
      response.status >= 500 ? "api-errors.serviceUnavailable" : "api-errors.validationFailed";
    return error;
  }

  function select(name) {
    const model = models.find((item) => item.name === name);
    selectedModel = model ? model.name : "";
    return model || null;
  }

  function getVisible(includePreview) {
    return models.filter((model) => includePreview || !["preview", "experimental"].includes(lifecycle(model)));
  }

  window.GeminiModelService = {
    listModels,
    select,
    getModels: () => models.slice(),
    getVisible,
    getSelected: () => models.find((item) => item.name === selectedModel) || null,
    getLifecycle: lifecycle,
    clear() { models = []; selectedModel = ""; }
  };
})();
