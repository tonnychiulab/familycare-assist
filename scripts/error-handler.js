(function () {
  const listeners = new Set();

  function emit(error) {
    const normalized = {
      code: error && error.code ? error.code : "FC-UNKNOWN-001",
      messageKey: error && error.messageKey ? error.messageKey : "errors.unknown",
      detail: error && error.detail ? String(error.detail) : "",
      recoverable: error && typeof error.recoverable === "boolean" ? error.recoverable : true
    };
    console.error("[FamilyCare Assist]", normalized.code, normalized.detail);
    listeners.forEach((listener) => listener(normalized));
    return normalized;
  }

  window.ErrorHandler = {
    onError(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    emit,
    create(code, messageKey, detail, recoverable) {
      return { code, messageKey, detail, recoverable };
    }
  };
})();
