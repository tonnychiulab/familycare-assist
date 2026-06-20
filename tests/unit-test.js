const fs = require("fs");
const vm = require("vm");
const { webcrypto } = require("crypto");

global.window = global;
global.crypto = webcrypto;
global.TextEncoder = TextEncoder;
global.sessionStorage = (() => {
  const values = new Map();
  return {
    setItem: (key, value) => values.set(key, String(value)),
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    removeItem: (key) => values.delete(key)
  };
})();

function load(name) {
  const path = `${__dirname}/../scripts/${name}`;
  vm.runInThisContext(fs.readFileSync(path, "utf8"), { filename: name });
}

async function main() {
  load("config.js");
  load("security-policy.js");
  load("prompt-manager.js");
  load("credential-vault.js");
  load("gemini-model-service.js");
  load("session.js");
  load("request-builder.js");

  const prompt = "你是一位家庭醫學科問診輔助系統。請依序詢問主訴、紅旗症狀、病史、用藥與過敏，資訊不足時明確要求補充，不得自行診斷或開藥，並將結果整理為需由醫師確認的 SOAP 草稿。";
  const promptResult = await PromptManager.set(prompt, "test", { rememberSession: true });
  if (!promptResult.valid || !PromptManager.getFingerprint()) throw new Error("Prompt manager failed");

  const keyResult = CredentialVault.set("TEST_BROWSER_KEY_1234567890", { rememberSession: true });
  if (!keyResult.valid || CredentialVault.getLastFour() !== "7890") throw new Error("Credential vault failed");

  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/models?")) {
      return {
        ok: true,
        json: async () => ({
          models: [
            {
              name: "models/gemini-test-flash",
              displayName: "Test Flash",
              supportedGenerationMethods: ["generateContent"],
              inputTokenLimit: 1000,
              outputTokenLimit: 500
            },
            { name: "models/text-embedding-test", supportedGenerationMethods: ["embedContent"] }
          ]
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "測試回覆" }] }, finishReason: "STOP" }]
      })
    };
  };

  const models = await GeminiModelService.listModels(CredentialVault.getKey());
  if (models.length !== 1) throw new Error("Model filtering failed");
  GeminiModelService.select(models[0].name);
  CredentialVault.markVerified();
  SessionStore.addMessage({ role: "doctor", content: "頭痛三天", createdAt: new Date().toISOString() });

  load("api-client.js");
  const response = await ApiClient.sendMessage();
  if (response.content !== "測試回覆") throw new Error("API response parsing failed");

  const post = calls.find((call) => call.options && call.options.method === "POST");
  const body = JSON.parse(post.options.body);
  if (!body.systemInstruction || body.contents[0].role !== "user") throw new Error("Request body failed");
  if (post.options.headers["x-goog-api-key"] !== "TEST_BROWSER_KEY_1234567890") throw new Error("Header key failed");
  if (post.url.includes("AIza")) throw new Error("API key leaked into URL");

  console.log("UNIT TESTS OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
