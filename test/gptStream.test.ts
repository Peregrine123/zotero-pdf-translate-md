import assert from "node:assert/strict";
import test from "node:test";

import {
  extractStreamedResultFromRaw,
  parseStreamChunk,
} from "../src/modules/services/gptStreamParser";

test("extractStreamedResultFromRaw: stops at stream finish marker", () => {
  const raw = [
    'data: {"choices":[{"delta":{"content":"done"},"finish_reason":null}]}',
    'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}',
    'data: {"choices":[{"delta":{"content":"stale"},"finish_reason":null}]}',
  ].join("\n");

  assert.equal(extractStreamedResultFromRaw(raw, false), "done");
});

test("parseStreamChunk: keeps literal data marker inside JSON content", () => {
  const raw =
    'data: {"choices":[{"delta":{"content":"literal data: text"},"finish_reason":null}]}\n';

  assert.equal(parseStreamChunk(raw, false).content, "literal data: text");
});

test("parseStreamChunk: flushes a final line without full-response reparse", () => {
  const first = parseStreamChunk(
    'data: {"choices":[{"delta":{"content":"hel"},"finish_reason":null}]}\n' +
      'data: {"choices":[{"delta":{"content":"lo"},"finish_reason":null}]}',
    false,
  );
  const second = parseStreamChunk(first.buffer, false, true);

  assert.equal(first.content + second.content, "hello");
});
