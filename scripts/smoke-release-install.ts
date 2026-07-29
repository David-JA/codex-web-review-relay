import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from "node:fs";
import {execFileSync, spawn} from "node:child_process";
import {randomUUID} from "node:crypto";
import {join, dirname} from "node:path";
import {tmpdir} from "node:os";
import {NativeMessageDecoder, encodeNativeMessage} from "../src/native-framing.ts";
import {NATIVE_SCHEMA_VERSION} from "../src/native-protocol.ts";

function argument(name: string): string {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return process.argv[index + 1];
}

const launcher = argument("--launcher");
const configPath = argument("--config");
const tokenPath = argument("--token");
const config = JSON.parse(readFileSync(configPath, "utf8")) as {listenPort: number};
const token = readFileSync(tokenPath, "utf8").trim();
const child = spawn(launcher, [], {stdio: ["pipe", "pipe", "pipe"], windowsHide: true});
const decoder = new NativeMessageDecoder();
const messages: Record<string, unknown>[] = [];
let stderr = "";
child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString("utf8")).slice(-4_000); });
child.stdout.on("data", (chunk) => messages.push(...decoder.push(chunk) as Record<string, unknown>[]));

async function waitFor(type: string, timeoutMs = 10_000): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const found = messages.find((message) => message.type === type);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`SMOKE_TIMEOUT:${type}:${stderr}`);
}

async function request(path: string, body?: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Promise<Record<string, unknown>> {
  const response = await fetch(`http://127.0.0.1:${config.listenPort}${path}`, {
    method: body ? "POST" : "GET",
    headers: {authorization: `Bearer ${token}`, ...(body ? {"content-type": "application/json", accept: "application/json, text/event-stream"} : {}), ...extraHeaders},
    body: body ? JSON.stringify(body) : undefined,
  });
  return await response.json() as Record<string, unknown>;
}

const sessionId = randomUUID();
child.stdin.write(encodeNativeMessage({schemaVersion: NATIVE_SCHEMA_VERSION, type: "ARM_SESSION", requestId: "smoke-arm", sessionId, extensionVersion: "0.3.0"}));
await waitFor("SESSION_ARMED");
let health: Record<string, unknown> | undefined;
for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    health = await request("/health");
    if (health.status === "ok") break;
  } catch { /* listener is still starting */ }
  await new Promise((resolve) => setTimeout(resolve, 50));
}
if (health?.status !== "ok" || (health.schema_version as Record<string, unknown>)?.major !== 2 || (health.schema_version as Record<string, unknown>)?.minor !== 1) throw new Error("SMOKE_HEALTH_INVALID");
const initialized = await request("/mcp", {jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
const initializeResult = initialized.result as Record<string, unknown>;
const serverInfo = initializeResult?.serverInfo as Record<string, unknown>;
if (serverInfo?.version !== "0.3.0" || !String(initializeResult?.instructions).includes("absolute handoff_file")) throw new Error("SMOKE_INITIALIZE_INVALID");
const listed = await request("/mcp", {jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, {"mcp-protocol-version": "2025-11-25"});
const tools = (listed.result as Record<string, unknown>)?.tools as Array<Record<string, unknown>>;
if (!Array.isArray(tools) || !tools.some((tool) => tool.name === "request_review")) throw new Error("SMOKE_TOOLS_LIST_INVALID");
child.stdin.write(encodeNativeMessage({schemaVersion: NATIVE_SCHEMA_VERSION, type: "DISARM_SESSION", requestId: "smoke-disarm", sessionId}));
await waitFor("SESSION_DISARMED");
child.stdin.end();
await new Promise<void>((resolve, reject) => {
  child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`SMOKE_HOST_EXIT:${code}:${stderr}`)));
  child.once("error", reject);
});
// --- Installed exporter E2E ---
const installRoot = dirname(configPath);
const exporterPath = join(installRoot, "relay_export_helper.py");
const repoConfig = JSON.parse(readFileSync(configPath, "utf8")) as {pythonExecutable: string};
const smokeRepo = mkdtempSync(join(tmpdir(), "smoke-exporter-"));
const git = (args: string[]) => execFileSync("git", args, {cwd: smokeRepo, encoding: "utf8", windowsHide: true}).trim();
git(["init"]);
git(["config", "user.email", "smoke@test"]);
git(["config", "user.name", "smoke"]);
git(["remote", "add", "origin", "https://github.com/smoke-owner/smoke-repo.git"]);
const handoffDir = join(smokeRepo, ".agents", "review_handoffs", "review-smoke", "smoke-stream");
mkdirSync(handoffDir, {recursive: true});
const handoffContent = [
  "# Review Request", "",
  "Package kind: `review-request`",
  "Review stream: `smoke-stream`",
  "Effective round: `1`",
  "Target kind: `commit`",
  "Target ID: `review-smoke`",
  "Review scope: smoke test", "",
  "## Review request", "", "Smoke.", "",
].join("\n");
writeFileSync(join(handoffDir, "round-01-review-request.md"), handoffContent, "utf8");
git(["add", "."]);
git(["commit", "-m", "smoke handoff"]);
const handoffRel = ".agents/review_handoffs/review-smoke/smoke-stream/round-01-review-request.md";
const exportRaw = execFileSync(repoConfig.pythonExecutable, [exporterPath, "relay-export", handoffRel], {cwd: smokeRepo, encoding: "utf8", windowsHide: true});
const exportResult = JSON.parse(exportRaw) as Record<string, unknown>;
if (exportResult.repository !== "smoke-owner/smoke-repo") throw new Error("SMOKE_EXPORTER_REPOSITORY");
if (exportResult.handoff_path !== handoffRel) throw new Error("SMOKE_EXPORTER_PATH");
if (exportResult.review_stream !== "smoke-stream") throw new Error("SMOKE_EXPORTER_STREAM");
if (exportResult.target_id !== "review-smoke") throw new Error("SMOKE_EXPORTER_TARGET");

console.log(JSON.stringify({clean_install: true, health: true, initialize_version: serverInfo.version, tools: tools.map((tool) => tool.name).sort(), exporter_e2e: true}));
