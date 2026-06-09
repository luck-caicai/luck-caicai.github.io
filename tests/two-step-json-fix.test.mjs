import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

class FakeClassList {
  constructor() {
    this.items = new Set();
  }

  add(name) {
    this.items.add(name);
  }

  remove(name) {
    this.items.delete(name);
  }

  toggle(name, force) {
    if (force) {
      this.add(name);
      return true;
    }
    this.remove(name);
    return false;
  }
}

class FakeElement {
  constructor(selector, dataset = {}) {
    this.selector = selector;
    this.dataset = dataset;
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.style = {};
    this.value = "";
    this.textContent = "";
    this.innerHTML = "";
    this.disabled = false;
    this.hidden = false;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  select() {}

  async dispatch(type, event = {}) {
    const listener = this.listeners.get(type);
    if (!listener) {
      return;
    }
    await listener({
      target: this,
      ...event,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

async function loadApp() {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const script = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  assert.ok(script, "expected inline app script");

  const formatButtons = Array.from(html.matchAll(/data-format="([^"]+)"/g), ([, format]) => (
    new FakeElement(`[data-format="${format}"]`, { format })
  ));
  const elements = new Map();

  const getElement = (selector) => {
    if (!elements.has(selector)) {
      elements.set(selector, new FakeElement(selector));
    }
    return elements.get(selector);
  };

  const document = {
    body: { append() {} },
    createElement: () => new FakeElement("created"),
    execCommand: () => true,
    querySelector: (selector) => getElement(selector),
    querySelectorAll: (selector) => selector === "[data-format]" ? formatButtons : [],
  };

  const context = vm.createContext({
    Blob,
    Date,
    JSON,
    Map,
    Math,
    Number,
    Object,
    Promise,
    Set,
    String,
    TextDecoder,
    TextEncoder,
    URL,
    Uint8Array,
    WeakSet,
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    btoa: (value) => Buffer.from(value, "binary").toString("base64"),
    console,
    document,
    globalThis: {
      crypto: {
        getRandomValues(bytes) {
          bytes.fill(7);
          return bytes;
        },
        randomUUID() {
          return "00000000-0000-4000-8000-000000000000";
        },
      },
    },
    navigator: {
      clipboard: {
        writeText: async () => {},
      },
    },
    setTimeout,
  });

  vm.runInContext(script, context);
  return { elements, formatButtons };
}

test("二验json修正 replaces refresh JSON access_token with the pasted session token", async () => {
  const { elements, formatButtons } = await loadApp();
  const repairButton = formatButtons.find((button) => button.dataset.format === "second-verify");
  assert.ok(repairButton, "expected a 二验json修正 format button");

  const session = {
    user: { email: "mark@example.com" },
    account: { id: "acct_123", planType: "plus" },
    accessToken: "session-access-token-new",
    sessionToken: "session-token-kept-in-session-only",
    expires: "2026-08-06T14:29:36.155Z",
  };
  const refreshJson = {
    type: "codex",
    email: "mark@example.com",
    account_id: "acct_123",
    access_token: "old-access-token",
    refresh_token: "rt_keep_this_value",
    nested: { keep: true },
  };

  await repairButton.dispatch("click");

  const sessionInput = elements.get("#session-input");
  sessionInput.value = JSON.stringify(session);
  await sessionInput.dispatch("input");

  const repairFileInput = elements.get("#repair-file-input");
  await repairFileInput.dispatch("change", {
    target: {
      files: [{
        name: "mark@example.com.json",
        async text() {
          return JSON.stringify(refreshJson);
        },
      }],
      value: "",
    },
  });

  const output = JSON.parse(elements.get("#output").value);
  assert.equal(output.access_token, "session-access-token-new");
  assert.equal(output.refresh_token, "rt_keep_this_value");
  assert.deepEqual(output.nested, { keep: true });
});

function fakeJwt(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value))
    .toString("base64url");
  return `${encode({ alg: "RS256", typ: "JWT" })}.${encode(payload)}.fake-signature`;
}

test("Team转sub converts token-only team CPA JSON into a sub2api account", async () => {
  const { elements, formatButtons } = await loadApp();
  const teamSubButton = formatButtons.find((button) => button.dataset.format === "team-sub2api");
  assert.ok(teamSubButton, "expected a Team转sub format button");

  const teamCpa = {
    type: "codex",
    access_token: fakeJwt({
      aud: ["https://api.openai.com/v1"],
      client_id: "app_team_client",
      exp: 1781331737,
      "https://api.openai.com/auth": {
        chatgpt_account_id: "acct_team_123",
        chatgpt_user_id: "user_team_123",
        user_id: "user_team_123",
        chatgpt_plan_type: "team",
      },
      "https://api.openai.com/profile": {
        email: "team@example.com",
        email_verified: true,
      },
      iat: 1780467737,
      iss: "https://auth.openai.com",
      session_id: "authsess_team",
      sub: "auth0|team-user",
    }),
    refresh_token: "team-refresh-token",
  };

  await teamSubButton.dispatch("click");

  const sessionInput = elements.get("#session-input");
  sessionInput.value = JSON.stringify(teamCpa);
  await sessionInput.dispatch("input");

  const output = JSON.parse(elements.get("#output").value);
  assert.equal(output.accounts.length, 1);
  assert.equal(output.accounts[0].platform, "openai");
  assert.equal(output.accounts[0].type, "oauth");
  assert.equal(output.accounts[0].credentials.email, "team@example.com");
  assert.equal(output.accounts[0].credentials.chatgpt_account_id, "acct_team_123");
  assert.equal(output.accounts[0].credentials.chatgpt_user_id, "user_team_123");
  assert.equal(output.accounts[0].credentials.plan_type, "team");
  assert.equal(output.accounts[0].credentials.refresh_token, "team-refresh-token");
});

test("上传txt文件 converts JSON session text into a sub2api account", async () => {
  const { elements } = await loadApp();
  const session = {
    user: { email: "txt-session@example.com" },
    account: { id: "acct_txt_123", planType: "plus" },
    accessToken: "txt-access-token",
    sessionToken: "txt-session-token",
    expires: "2026-08-06T14:29:36.155Z",
  };

  const fileInput = elements.get("#file-input");
  await fileInput.dispatch("change", {
    target: {
      files: [{
        name: "session.txt",
        type: "text/plain",
        async text() {
          return JSON.stringify(session);
        },
      }],
      value: "",
    },
  });

  const output = JSON.parse(elements.get("#output").value);
  assert.equal(output.accounts.length, 1);
  assert.equal(output.accounts[0].credentials.email, "txt-session@example.com");
  assert.equal(output.accounts[0].credentials.access_token, "txt-access-token");
});
