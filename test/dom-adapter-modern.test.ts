import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {webcrypto} from "node:crypto";

// A small tree fixture, rather than selector-to-node answers: selectors walk
// ancestors, queries walk descendants, and order follows the actual tree.
class Element {
  tagName: string;
  attrs: Record<string, string>;
  children: Element[] = [];
  parentElement: Element | null = null;
  text = "";
  connected = false;
  disabled = false;
  constructor(tag = "div", attrs: Record<string, string> = {}, text = "") { this.tagName = tag; this.attrs = attrs; this.text = text; }
  append(...children: Element[]) { for (const child of children) { child.remove(); child.parentElement = this; this.children.push(child); } return this; }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter((node) => node !== this); this.parentElement = null; }
  replaceChildren(...children: Element[]) { for (const child of [...this.children]) child.remove(); return this.append(...children); }
  get isConnected(): boolean { return this.parentElement ? this.parentElement.isConnected : this.connected; }
  get innerText(): string { return [this.text, ...this.children.map((child) => child.innerText)].filter(Boolean).join("\n"); }
  get textContent() { return this.innerText; }
  set textContent(text: string) { this.replaceChildren(); this.text = text; }
  getAttribute(name: string) { return this.attrs[name] ?? null; }
  getClientRects() { return this.isConnected ? [{}] : []; }
  focus() {}
  dispatchEvent() {}
  simple(selector: string): boolean {
    let valid = true;
    selector = selector.replace(/\[([^\s=\^*\]]+)(?:(\^=|\*=|=)['"]?([^'"\]]*)['"]?)?\]/g, (_whole, name, operator, expected) => {
      const value = this.getAttribute(name);
      valid &&= value !== null && (!operator || (operator === "=" ? value === expected : operator === "^=" ? value.startsWith(expected) : value.includes(expected)));
      return "";
    });
    selector = selector.replace(/\.([\w-]+)/g, (_whole, name) => { valid &&= (this.attrs.class ?? "").split(/\s+/).includes(name); return ""; });
    selector = selector.replace(/#([\w-]+)/g, (_whole, id) => { valid &&= this.attrs.id === id; return ""; });
    return valid && (!selector || selector === "*" || selector.toLowerCase() === this.tagName.toLowerCase());
  }
  matches(selector: string): boolean {
    return selector.split(",").some((choice) => {
      const parts = choice.trim().match(/(?:\[[^\]]*\]|[^\s\[])+/g) ?? [];
      if (!parts.length || !this.simple(parts.pop()!)) return false;
      let ancestor = this.parentElement;
      while (parts.length) {
        const part = parts.pop()!;
        while (ancestor && !ancestor.simple(part)) ancestor = ancestor.parentElement;
        if (!ancestor) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });
  }
  descendants(): Element[] { return this.children.flatMap((child) => [child, ...child.descendants()]); }
  querySelectorAll(selector: string) { return this.descendants().filter((node) => node.matches(selector)); }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
  closest(selector: string): Element | null { return this.matches(selector) ? this : this.parentElement?.closest(selector) ?? null; }
  compareDocumentPosition(other: Element) {
    let root: Element = this;
    while (root.parentElement) root = root.parentElement;
    const nodes = [root, ...root.descendants()];
    const a = nodes.indexOf(this), b = nodes.indexOf(other);
    return b < 0 ? 1 : a < b ? 4 : a > b ? 2 : 0;
  }
}
const el = (tag = "div", attrs: Record<string, string> = {}, text = "") => new Element(tag, attrs, text);
function documentOf(...children: Element[]) { const document = el("document"); document.connected = true; return document.append(...children); }
function shell(id: string) { return el("div", {"data-turn-key": id, "data-content-search-turn-key": "fallback-turn-0"}); }
function user(id: string, text = "envelope", fallback = "fallback-turn-0") {
  return el("div", {"data-chatgpt-search-unit-key": `${fallback}:0:user`, "data-chatgpt-search-message-ids": id})
    .append(el("div", {"data-user-message-bubble": "true"}).append(el("div", {class: "whitespace-pre-wrap"}, text)), actions("复制消息"));
}
function assistant(messages: Array<[string, string]>, fallback = "fallback-turn-0") {
  const node = el("div", {"data-chatgpt-search-unit-key": `${fallback}:2:assistant`, "data-content-search-unit-key": `${fallback}:2:assistant`, "data-chatgpt-search-message-ids": messages.flatMap(([id]) => [id, id]).join(" ")});
  node.append(el("h4", {"data-conversation-role": "assistant"}, "ChatGPT said:"));
  for (const [id, text] of messages) node.append(el("div", {"data-chatgpt-selection-message-id": id})
    .append(el("div", {"data-markdown-text-style": "assistant-message"}, text)));
  return node;
}
function actions(label = "复制") { return el("div", {class: "turn-action-controls"}).append(el("button", {"aria-label": label})); }
function conversation(id: string, prompt = "envelope", output = "Verdict: PASS", fallback = "fallback-turn-0") {
  const u = user(`${id}-user`, prompt, fallback), a = assistant([[`${id}-assistant`, output]], fallback);
  const s = shell(id).append(u, el("div").append(el("div", {}, "思考了 28s"), a), actions());
  return {s, u, a};
}
await import("../extension/dom-adapter.js");
const adapter = (globalThis as unknown as {ReviewRelayDomAdapter: Record<string, (...args: any[]) => any>}).ReviewRelayDomAdapter;

test("modern shared shells create ordered role records and extract only message content", () => {
  const {s, u, a} = conversation("turn-a");
  const document = documentOf(s);
  assert.deepEqual(adapter.turns(document), [u, a]);
  const tracker = adapter.createTurnTracker(document, false);
  assert.deepEqual(tracker.order, ["turn-key:turn-a:user", "turn-key:turn-a:assistant"]);
  const target = adapter.findTrackedUserTurn(document, tracker, "envelope", true);
  const [answer] = adapter.trackedAssistantTurnsAfter(document, tracker, target);
  assert.equal(adapter.turnRecordText(answer, true), "Verdict: PASS");
  assert.equal(adapter.trackedAssistantComplete(document, answer), true);
  assert.equal(adapter.rawTurnText(document, a), "Verdict: PASS");
  assert.equal(adapter.reconcile(document, "envelope").user, u);
});

test("modern UUID identities survive replacement and changing fallback turn indexes", () => {
  const first = conversation("turn-a", "envelope", "partial");
  const document = documentOf(first.s);
  const baseline = adapter.snapshotTurns(document);
  const tracker = adapter.createTurnTracker(document, false);
  const target = adapter.findTrackedUserTurn(document, tracker, "envelope", true);
  const replacement = conversation("turn-a", "envelope", "complete", "fallback-turn-99");
  document.replaceChildren(replacement.s);
  assert.deepEqual(adapter.newTurns(document, baseline, "assistant"), []);
  assert.deepEqual(adapter.assistantTurnsAfter(document, first.u), [replacement.a]);
  const [answer] = adapter.trackedAssistantTurnsAfter(document, tracker, target);
  assert.equal(adapter.turnRecordText(answer, true), "complete");
  assert.equal(answer.fragments.size, 1);
  assert.equal(adapter.isAssistantComplete(document, first.a), false);
});

test("modern fragment UUIDs deduplicate repeated attributes and preserve multi-message harvest", () => {
  const u = user("user");
  const s = shell("turn").append(u, assistant([["a", "first"], ["b", "last"]]), actions());
  const document = documentOf(s);
  const tracker = adapter.createTurnTracker(document, false);
  const answer = tracker.records.get("turn-key:turn:assistant");
  assert.equal(answer.fragments.size, 2);
  assert.equal(adapter.turnRecordText(answer, true), "first\n\nlast");
  s.replaceChildren(u, assistant([["b", "last updated"]]), actions());
  adapter.harvestTurnTracker(document, tracker);
  assert.equal(answer.fragments.size, 2);
  assert.equal(adapter.turnRecordText(answer, true), "first\n\nlast updated");
  const duplicate = assistant([["b", "one"], ["b", "two"]]);
  s.replaceChildren(u, duplicate);
  assert.throws(() => adapter.harvestTurnTracker(document, tracker), /MESSAGE_IDENTITY_AMBIGUOUS/);
});

test("modern shell positions remain ordered through hydration and stop at the next user", () => {
  const first = conversation("one"), next = conversation("two", "unrelated", "must not capture");
  const document = documentOf(first.s, next.s);
  const tracker = adapter.createTurnTracker(document, false);
  const target = adapter.findTrackedUserTurn(document, tracker, "envelope", true);
  assert.deepEqual(tracker.order, ["turn-key:one:user", "turn-key:one:assistant", "turn-key:two:user", "turn-key:two:assistant"]);
  first.u.remove();
  assert.deepEqual(adapter.trackedAssistantTurnsAfter(document, tracker, target).map((record: any) => adapter.turnRecordText(record, true)), ["Verdict: PASS"]);
});

test("modern tracker reads only the confirmed shell without crossing unknown later shells", () => {
  const first = conversation("one"), history = conversation("history", "old", "historical");
  const unknown = shell("unknown");
  const document = documentOf(first.s, unknown, history.s);
  const tracker = adapter.createTurnTracker(document, false);
  const target = adapter.findTrackedUserTurn(document, tracker, "envelope", true);
  assert.deepEqual(adapter.trackedAssistantTurnsAfter(document, tracker, target).map((record: any) => adapter.turnRecordText(record, true)), ["Verdict: PASS"]);
  assert.equal(adapter.reconcileTracked(document, "envelope").assistantRecords.length, 1);
  unknown.append(user("next-user", "next"));
  assert.equal(adapter.trackedAssistantTurnsAfter(document, tracker, target).length, 1);
});

test("modern pending assistant hydrates in its reserved slot", () => {
  const s = shell("pending").append(user("u"));
  const document = documentOf(s);
  const tracker = adapter.createTurnTracker(document, false);
  const target = adapter.findTrackedUserTurn(document, tracker, "envelope", true);
  assert.deepEqual(adapter.trackedAssistantTurnsAfter(document, tracker, target), []);
  const recovered = adapter.reconcileTracked(document, "envelope");
  assert.equal(recovered.state, "user-present");
  assert.deepEqual(recovered.assistantRecords, []);
  s.append(assistant([["a", "done"]]), actions());
  assert.equal(adapter.trackedAssistantTurnsAfter(document, tracker, target).length, 1);
  assert.equal(adapter.trackedAssistantTurnsAfter(document, recovered.tracker, recovered.userRecord).length, 1);
  assert.deepEqual(tracker.order, ["turn-key:pending:user", "turn-key:pending:assistant"]);
});

test("modern completion ignores user controls, code controls and earlier assistant controls", () => {
  const a = assistant([["a", "partial"]]);
  const s = shell("one").append(user("u"), a);
  const document = documentOf(s);
  assert.equal(adapter.isAssistantComplete(document, a), false);
  a.querySelector("[data-markdown-text-style]")!.append(el("pre").append(actions()));
  assert.equal(adapter.isAssistantComplete(document, a), false);
  s.append(actions());
  assert.equal(adapter.isAssistantComplete(document, a), true);
  const later = assistant([["b", "later partial"]]);
  s.append(later);
  assert.equal(adapter.isAssistantComplete(document, later), false);
  assert.equal(adapter.isAssistantComplete(document, a), false);
  s.append(actions("复制消息"));
  assert.equal(adapter.isAssistantComplete(document, later), false);
  s.append(actions());
  assert.equal(adapter.isAssistantComplete(document, later), true);
});

test("legacy and modern shell order is combined by document order", () => {
  const legacy = el("article", {"data-turn-id": "old"}).append(el("div", {"data-message-author-role": "user", "data-message-id": "old-u"})
    .append(el("div", {class: "whitespace-pre-wrap"}, "old prompt")));
  const modern = conversation("new");
  const document = documentOf(legacy, modern.s);
  const tracker = adapter.createTurnTracker(document, false);
  assert.deepEqual(tracker.order, ["turn-id:old", "turn-key:new:user", "turn-key:new:assistant"]);
});

test("modern composer and send selectors are scoped while stop and voice states differ", () => {
  const input = el("div", {contenteditable: "true", "data-composer-markdown": "", role: "textbox", class: "ProseMirror"});
  const send = el("button", {type: "submit", "aria-label": "发送"});
  const form = el("form", {"data-chatgpt-composer": ""}).append(input, send);
  const document = documentOf(el("button", {type: "submit"}), form);
  assert.equal(adapter.composer(document), input);
  assert.equal(adapter.sendButton(document), send);
  assert.equal(adapter.isResponseIdle(document), true);
  send.attrs = {type: "button", "aria-label": "停止"};
  assert.equal(adapter.isGenerating(document), true);
  assert.equal(adapter.isResponseIdle(document), false);
  assert.throws(() => adapter.sendButton(document), /SEND_BUTTON_IDENTITY_MISMATCH/);
  send.attrs = {type: "button", "aria-label": "开始语音"};
  assert.equal(adapter.isGenerating(document), false);
  assert.equal(adapter.isIdle(document), true);
  assert.throws(() => adapter.sendButton(document), /SEND_BUTTON_IDENTITY_MISMATCH/);
});

test("modern tracked dispatch writes through the scoped selection and confirms the new exact user", async () => {
  const old = conversation("old", "old prompt");
  const input = el("div", {contenteditable: "true", "data-composer-markdown": "", role: "textbox"});
  const send = el("button", {type: "submit", "aria-label": "发送"});
  const form = el("form", {"data-chatgpt-composer": ""}).append(input, send);
  let selected: Element | null = null;
  let clicked = 0;
  const document = Object.assign(documentOf(old.s, form), {
    defaultView: {getSelection: () => ({removeAllRanges() {}, addRange() {}})},
    createRange: () => ({selectNodeContents(node: Element) { selected = node; }}),
    execCommand(command: string, _ui: boolean, value: string) {
      assert.equal(command, "insertText");
      assert.equal(selected, input);
      input.textContent = value;
      return true;
    },
  });
  Object.assign(send, {click() {
    clicked += 1;
    document.append(shell("new").append(user("new-user", input.innerText)));
    input.textContent = "";
  }});
  const state = await adapter.dispatchTracked(document, "Path: example\nReviewed head: abc");
  assert.equal(clicked, 1);
  assert.equal(state.userRecord.key, "turn-key:new:user");
  assert.equal(adapter.turnRecordText(state.userRecord), "Path: example\nReviewed head: abc");
  assert.equal(state.tracker.baselineKeys.has("turn-key:old:user"), true);
  assert.equal(state.tracker.baselineKeys.has("turn-key:new:user"), false);
});

test("modern harvest preserves three-message order when only the final fragment remains mounted", () => {
  const u = user("user");
  const s = shell("turn").append(u, assistant([["a", "first"], ["b", "middle"], ["c", "last"]]), actions());
  const document = documentOf(s);
  const tracker = adapter.createTurnTracker(document, false);
  const answer = tracker.records.get("turn-key:turn:assistant");
  s.replaceChildren(u, assistant([["c", "last updated"]]), actions());
  adapter.harvestTurnTracker(document, tracker);
  assert.equal(adapter.turnRecordText(answer, true), "first\n\nmiddle\n\nlast updated");
  assert.deepEqual(answer.fragmentOrder, ["message-id:a", "message-id:b", "message-id:c"]);
  s.replaceChildren(u, assistant([["b", "middle updated"]]), actions());
  adapter.harvestTurnTracker(document, tracker);
  assert.equal(adapter.turnRecordText(answer, true), "first\n\nmiddle updated\n\nlast updated");
});


test("full remount corrects fragment order learned from disjoint partial mounts", () => {
  const u = user("u");
  const s = shell("turn").append(u, assistant([["c", "last"]]), actions());
  const document = documentOf(s);
  const tracker = adapter.createTurnTracker(document, false);
  const answer = tracker.records.get("turn-key:turn:assistant");
  s.replaceChildren(u, assistant([["a", "first"], ["b", "middle"]]), actions());
  adapter.harvestTurnTracker(document, tracker);
  s.replaceChildren(u, assistant([["a", "first"], ["b", "middle"], ["c", "last"]]), actions());
  adapter.harvestTurnTracker(document, tracker);
  assert.equal(adapter.trackedAssistantComplete(document, answer), true);
  assert.equal(adapter.turnRecordText(answer, true), "first\n\nmiddle\n\nlast");
  s.replaceChildren(u, assistant([["b", "updated"]]), actions());
  adapter.harvestTurnTracker(document, tracker);
  assert.equal(adapter.turnRecordText(answer, true), "first\n\nupdated\n\nlast");
});

test("modern user-only reconcile starts monitoring and captures the later assistant", async () => {
  const s = shell("pending").append(user("u"));
  const transient = shell("temporary");
  const document = Object.assign(documentOf(s, transient), {documentElement: s});
  const events: any[] = [];
  const intervals = new Set<ReturnType<typeof setInterval>>();
  let listener: any;
  let mutated = () => {};
  let observing = false;
  const context = vm.createContext({
    ReviewRelayDomAdapter: adapter, document, crypto: webcrypto, TextEncoder,
    location: {origin: "https://chatgpt.com", pathname: "/c/test"},
    chrome: {runtime: {
      onMessage: {addListener(value: any) { listener = value; }},
      async sendMessage(message: any) { events.push(message); return {ok: true}; },
    }},
    MutationObserver: class {
      constructor(callback: () => void) { mutated = callback; }
      observe() { observing = true; }
      disconnect() { observing = false; }
    },
    setTimeout, clearTimeout,
    setInterval(callback: () => void, delay: number) {
      const timer = setInterval(callback, delay); intervals.add(timer); return timer;
    },
    clearInterval,
  });
  const waitFor = async (predicate: () => boolean, timeout = 1500) => {
    const deadline = Date.now() + timeout;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, "expected lifecycle progress before deadline");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  try {
    vm.runInContext(readFileSync(new URL("../extension/content.js", import.meta.url), "utf8"), context);
    let response: any;
    listener({kind: "RECONCILE_TRIGGER", jobId: "modern-recovery", envelope: "envelope",
      reviewMode: "relay-only", deadline: new Date(Date.now() + 10_000).toISOString()}, {}, (value: any) => { response = value; });
    assert.equal(response.ok, true);
    await waitFor(() => observing || events.some((event) => event.type === "SEND_UNCERTAIN"));
    assert.equal(observing, true);
    assert.deepEqual(events.filter((event) => event.kind === "LIFECYCLE").map((event) => event.type), ["USER_TURN_ACKED"]);
    transient.remove();
    s.append(assistant([["a", "recovered verdict"]]), actions());
    mutated();
    await waitFor(() => events.some((event) => event.type === "TURN_IDLE"), 4500);
    assert.deepEqual(events.filter((event) => event.kind === "LIFECYCLE").map((event) => event.type), ["USER_TURN_ACKED", "ASSISTANT_STARTED", "TURN_IDLE"]);
    assert.equal(events.find((event) => event.type === "TURN_IDLE").assistantOutput, "recovered verdict");
  } finally {
    for (const timer of intervals) clearInterval(timer);
  }
});


test("modern response survives a removed empty shell while preserving the cached boundary", () => {
  const first = conversation("one");
  const transient = shell("temporary");
  const document = documentOf(first.s, transient);
  const tracker = adapter.createTurnTracker(document, false);
  const target = adapter.findTrackedUserTurn(document, tracker, "envelope", true);
  transient.remove();
  const [answer] = adapter.trackedAssistantTurnsAfter(document, tracker, target);
  assert.equal(adapter.turnRecordText(answer, true), "Verdict: PASS");
  assert.equal(adapter.trackedAssistantComplete(document, answer), true);
  assert.ok(tracker.records.has("turn-key:temporary:user"));
  assert.ok(tracker.records.has("turn-key:temporary:assistant"));
});

test("modern pending response never adopts an assistant from another shell", () => {
  const pending = shell("pending").append(user("u"));
  const foreign = shell("foreign").append(assistant([["other", "must not capture"]]), actions());
  const document = documentOf(pending, foreign);
  const recovered = adapter.reconcileTracked(document, "envelope");
  assert.deepEqual(recovered.assistantRecords, []);
  pending.append(assistant([["owned", "target answer"]]), actions());
  const answers = adapter.trackedAssistantTurnsAfter(document, recovered.tracker, recovered.userRecord);
  assert.deepEqual(answers.map((answer: any) => adapter.turnRecordText(answer, true)), ["target answer"]);
});


test("modern response ownership survives reuse of the shell DOM element", () => {
  const first = conversation("one");
  const document = documentOf(first.s);
  const tracker = adapter.createTurnTracker(document, false);
  const target = adapter.findTrackedUserTurn(document, tracker, "envelope", true);
  first.s.attrs["data-turn-key"] = "different";
  first.s.replaceChildren(user("foreign-user", "unrelated"), assistant([["foreign-answer", "must not capture"]]), actions());
  const answers = adapter.trackedAssistantTurnsAfter(document, tracker, target);
  assert.deepEqual(answers.map((answer: any) => adapter.turnRecordText(answer, true)), ["Verdict: PASS"]);
  assert.equal(adapter.trackedAssistantComplete(document, answers[0]), false);
});
