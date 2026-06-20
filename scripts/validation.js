(function () {
  function validateMessage(text) {
    const value = String(text || "").trim();
    if (!value) return { valid: false, code: "FC-INPUT-001", messageKey: "errors.emptyInput" };
    if (value.length > window.AppConfig.maxInputLength) {
      return { valid: false, code: "FC-INPUT-002", messageKey: "errors.inputTooLong" };
    }
    return { valid: true, value };
  }

  function validateExample(example) {
    const errors = [];
    if (!example || typeof example !== "object") errors.push("Root must be an object.");
    if (!example || !example.id || typeof example.id !== "string") errors.push("id is required.");
    if (!example || !example.title || typeof example.title !== "object") errors.push("title object is required.");
    if (!example || !example.soap || typeof example.soap !== "object") errors.push("soap object is required.");
    if (example && example.soap) {
      ["subjective", "objective", "assessment", "plan"].forEach((field) => {
        if (example.soap[field] == null) errors.push(`soap.${field} is required.`);
      });
    }
    return { valid: errors.length === 0, errors };
  }

  window.Validation = { validateMessage, validateExample };
})();
