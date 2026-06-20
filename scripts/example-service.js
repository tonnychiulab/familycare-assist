(function () {
  let index = [];

  function localize(value) {
    if (typeof value === "string") return value;
    const locale = window.I18n.getLocale();
    return (value && (value[locale] || value.en || value["zh-TW"])) || "";
  }

  async function loadIndex() {
    const response = await fetch(window.AppConfig.exampleIndexUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    index = await response.json();
    return index;
  }

  function getIndex() { return index.slice(); }

  async function loadById(id) {
    const item = index.find((entry) => entry.id === id);
    if (!item) throw new Error(`Example not found: ${id}`);
    const response = await fetch(`data/examples/${item.file}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const example = await response.json();
    const validation = window.Validation.validateExample(example);
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    return example;
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const example = JSON.parse(reader.result);
          const validation = window.Validation.validateExample(example);
          if (!validation.valid) throw new Error(validation.errors.join(" "));
          resolve(example);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error || new Error("File read failed."));
      reader.readAsText(file, "utf-8");
    });
  }

  function getTitle(entryOrExample) { return localize(entryOrExample.title); }

  window.ExampleService = { loadIndex, getIndex, loadById, readFile, getTitle };
})();
