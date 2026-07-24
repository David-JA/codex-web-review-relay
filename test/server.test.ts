import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { RelayConfig } from "../src/config.ts";
import { JobStore } from "../src/job-store.ts";
import { createRelayServer, listen, MCP_PROTOCOL_VERSION } from "../src/server.ts";
import type { ReviewTransportService } from "../src/review-transport.ts";
import { DiagnosticLogger } from "../src/diagnostic-log.ts";

test("MCP tool contract uses a portable OpenAI-compatible schema subset", () => {
  const contract = JSON.parse(
    readFileSync(new URL("../contracts/mcp-tools.schema.json", import.meta.url), "utf8"),
  ) as {schema_version: {major: number; minor: number}; tools: Array<{name: string; inputSchema: Record<string, unknown>}>};
  assert.equal(contract.schema_version.major, 2);
  for (const tool of contract.tools) {
    assert.equal(tool.inputSchema.type, "object", `${tool.name}: inputSchema.type must be "object"`);
    assert.equal("oneOf" in tool.inputSchema, false, `${tool.name}: root-level oneOf is not portable`);
    assert.equal("anyOf" in tool.inputSchema, false, `${tool.name}: root-level anyOf is not portable`);
    assert.equal("allOf" in tool.inputSchema, false, `${tool.name}: root-level allOf is not portable`);
    const properties = tool.inputSchema.properties as Record<string, Record<string, unknown>>;
    for (const [key, schema] of Object.entries(properties)) {
      assert.equal("const" in schema, false, `${tool.name}.${key}: const is not portable`);
      assert.equal("format" in schema, false, `${tool.name}.${key}: format is not portable`);
    }
  }
});

test("localhost MCP server enforces auth, origin and protocol version", async () => {
  const root = mkdtempSync(join(tmpdir(), "review-relay-server-"));
  const store = new JobStore(join(root, "state.sqlite"));
  const token = "t".repeat(48);
  const config = {
    listenHost: "127.0.0.1",
    listenPort: 0,
    allowedOrigins: ["http://127.0.0.1:43127"],
    bearerTokenPath: "unused",
    stateDbPath: "unused",
    pythonExecutable: "python",
    exporterPath: "C:\\relay\\relay_export_helper.py", trustedInstallRoot: "C:\\relay",
    nativeHostName: "dev.test.relay",
    extensionId: "a".repeat(32),
    requestWaitSliceMs: 300_000,
    turnDeadlineMs: 900_000,
  } as RelayConfig;
  const transport = {
    async requestReview(handoffFile: string) { return {job_id: "job-1", handoff_path: handoffFile, phase: "TURN_IDLE"}; },
    async getStatus(input: {job_id?: string; handoff_file?: string}) {
      const hasJob = typeof input.job_id === "string";
      const hasPath = typeof input.handoff_file === "string";
      if (hasJob === hasPath) throw new Error("STATUS_LOOKUP_KEY_INVALID");
      return {job_id: hasJob ? input.job_id : "job-1", phase: "TURN_IDLE", lookup: input};
    },
  } as unknown as ReviewTransportService;
  const diagnostics = new DiagnosticLogger(join(root, "events.jsonl"), "info", 65_536, 2);
  diagnostics.write("info", "extension-content", "user_turn_observed", {job_id: "048af8d5-acf9-47c6-9448-2c85918710f7"});
  const server = createRelayServer(config, token, store, transport, diagnostics);
  const address = await listen(server, config);
  const base = `http://127.0.0.1:${address.port}`;
  const unauthorized = await fetch(`${base}/health`);
  assert.equal(unauthorized.status, 401);
  const forbidden = await fetch(`${base}/health`, {
    headers: {authorization: `Bearer ${token}`, origin: "https://example.invalid"},
  });
  assert.equal(forbidden.status, 403);
  const health = await fetch(`${base}/health`, {headers: {authorization: `Bearer ${token}`}});
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.schema_version.major, 2);
  assert.equal(healthBody.schema_version.minor, 1);

  const headers = {
    authorization: `Bearer ${token}`,
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
  };
  const initialized = await fetch(`${base}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "initialize", params: {protocolVersion: MCP_PROTOCOL_VERSION}}),
  });
  assert.equal(initialized.status, 200);
  const initializeBody = await initialized.json();
  assert.equal(initializeBody.result.protocolVersion, MCP_PROTOCOL_VERSION);
  assert.equal(initializeBody.result.serverInfo.version, "0.3.0");
  assert.match(initializeBody.result.instructions, /absolute handoff_file/);

  const missingVersion = await fetch(`${base}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify({jsonrpc: "2.0", id: 2, method: "tools/list"}),
  });
  assert.equal(missingVersion.status, 400);
  const mcpHeaders = {...headers, "mcp-protocol-version": MCP_PROTOCOL_VERSION};
  const tools = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: mcpHeaders,
    body: JSON.stringify({jsonrpc: "2.0", id: 3, method: "tools/list"}),
  });
  assert.equal(tools.status, 200);
  assert.deepEqual((await tools.json()).result.tools.map((tool: {name: string}) => tool.name), [
    "request_review", "recover_review", "get_review_transport_status", "get_review_diagnostics",
  ]);
  const call = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: mcpHeaders,
    body: JSON.stringify({jsonrpc: "2.0", id: 4, method: "tools/call", params: {name: "request_review", arguments: {handoff_file: "C:\\repo\\.agent\\review_handoffs\\pr-41\\stage-c-delivery\\round-01-review-request.md"}}}),
  });
  const callBody = await call.json();
  assert.equal(callBody.result.isError, false);
  assert.equal(callBody.result.structuredContent.phase, "TURN_IDLE");
  const invalidCall = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: mcpHeaders,
    body: JSON.stringify({jsonrpc: "2.0", id: 5, method: "tools/call", params: {name: "request_review", arguments: {handoff_path: "x"}}}),
  });
  assert.equal((await invalidCall.json()).result.structuredContent.error_code, "REQUEST_REVIEW_INPUT_INVALID");
  const diagnosticCall = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: mcpHeaders,
    body: JSON.stringify({jsonrpc: "2.0", id: 6, method: "tools/call", params: {name: "get_review_diagnostics", arguments: {job_id: "048af8d5-acf9-47c6-9448-2c85918710f7", limit: 10}}}),
  });
  const diagnosticBody = await diagnosticCall.json();
  assert.equal(diagnosticBody.result.structuredContent.events[0].event, "user_turn_observed");

  const statusByJobId = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: mcpHeaders,
    body: JSON.stringify({jsonrpc: "2.0", id: 7, method: "tools/call", params: {name: "get_review_transport_status", arguments: {job_id: "048af8d5-acf9-47c6-9448-2c85918710f7"}}}),
  });
  const statusJobBody = await statusByJobId.json();
  assert.equal(statusJobBody.result.isError, false);
  assert.equal(statusJobBody.result.structuredContent.phase, "TURN_IDLE");

  const statusByPath = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: mcpHeaders,
    body: JSON.stringify({jsonrpc: "2.0", id: 8, method: "tools/call", params: {name: "get_review_transport_status", arguments: {handoff_file: "C:\\repo\\.agent\\review_handoffs\\pr-41\\round-01.md"}}}),
  });
  const statusPathBody = await statusByPath.json();
  assert.equal(statusPathBody.result.isError, false);
  assert.equal(statusPathBody.result.structuredContent.phase, "TURN_IDLE");

  const statusBothKeys = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: mcpHeaders,
    body: JSON.stringify({jsonrpc: "2.0", id: 9, method: "tools/call", params: {name: "get_review_transport_status", arguments: {job_id: "048af8d5-acf9-47c6-9448-2c85918710f7", handoff_file: "C:\\repo\\handoff.md"}}}),
  });
  assert.equal((await statusBothKeys.json()).result.structuredContent.error_code, "STATUS_LOOKUP_KEY_INVALID");

  const statusNoKey = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: mcpHeaders,
    body: JSON.stringify({jsonrpc: "2.0", id: 10, method: "tools/call", params: {name: "get_review_transport_status", arguments: {}}}),
  });
  assert.equal((await statusNoKey.json()).result.structuredContent.error_code, "STATUS_LOOKUP_KEY_INVALID");

  const get = await fetch(`${base}/mcp`, {headers: {authorization: `Bearer ${token}`, accept: "text/event-stream"}});
  assert.equal(get.status, 405);

  await new Promise<void>((resolve) => server.close(() => resolve()));
  store.close();
  rmSync(root, {recursive: true, force: true});
});
