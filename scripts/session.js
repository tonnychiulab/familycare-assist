(function () {
  function createId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createInitialState() {
    return {
      id: createId(),
      createdAt: new Date().toISOString(),
      messages: [],
      currentExample: null,
      summary: null
    };
  }

  let state = createInitialState();

  window.SessionStore = {
    getState: () => state,
    reset() { state = createInitialState(); return state; },
    addMessage(message) { state.messages.push(message); return message; },
    setExample(example) { state.currentExample = example; },
    setSummary(summary) { state.summary = summary; }
  };
})();
