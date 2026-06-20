(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let active = false;
  const callbacks = { partial: null, final: null, error: null, end: null };

  function isSupported() { return Boolean(SpeechRecognition); }

  function createRecognition(language) {
    const instance = new SpeechRecognition();
    instance.lang = language;
    instance.continuous = true;
    instance.interimResults = true;

    instance.onresult = (event) => {
      let partial = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else partial += transcript;
      }
      if (partial && callbacks.partial) callbacks.partial(partial);
      if (finalText && callbacks.final) callbacks.final(finalText);
    };

    instance.onerror = (event) => {
      active = false;
      if (callbacks.error) callbacks.error(event.error || "unknown");
    };

    instance.onend = () => {
      active = false;
      if (callbacks.end) callbacks.end();
    };

    return instance;
  }

  function start(language) {
    if (!isSupported()) throw new Error("SpeechRecognition is not supported.");
    if (active) return;
    recognition = createRecognition(language);
    active = true;
    recognition.start();
  }

  function stop() {
    if (recognition && active) recognition.stop();
    active = false;
  }

  window.VoiceAdapter = {
    isSupported,
    start,
    stop,
    isActive: () => active,
    onPartial(callback) { callbacks.partial = callback; },
    onFinal(callback) { callbacks.final = callback; },
    onError(callback) { callbacks.error = callback; },
    onEnd(callback) { callbacks.end = callback; }
  };
})();
