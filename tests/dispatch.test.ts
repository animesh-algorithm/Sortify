import { test } from "node:test";
import assert from "node:assert/strict";
import { dispatchRun, DISPATCH_ERROR } from "../lib/dispatch";
import { failure } from "../lib/http";

test("successful dispatch preserves the event id without failing the run", async () => {
  let sent: unknown;
  await dispatchRun("run", "sortify/organize", "organization-run", {
    send: async (event) => {
      sent = event;
    },
    fail: async () => {
      assert.fail("accepted jobs must stay active");
    },
  });
  assert.deepEqual(sent, {
    id: "organization-run",
    name: "sortify/organize",
    data: { runId: "run" },
  });
});

for (const event of ["sortify/organize", "sortify/publish"] as const) {
  test(`rejected ${event} dispatch persists a recoverable failure and returns 503`, async () => {
    const failures: unknown[] = [];
    await assert.rejects(
      dispatchRun("run", event, undefined, {
        send: async () => {
          throw new Error("private provider details");
        },
        fail: async (id, name) => {
          failures.push({ id, name });
        },
      }),
      /Job dispatch failed/,
    );
    assert.deepEqual(failures, [{ id: "run", name: event }]);
    const response = failure(new Error("Job dispatch failed"));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: DISPATCH_ERROR });
  });
}
