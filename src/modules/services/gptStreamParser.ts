interface ParsedResponse {
  content: string;
  finished: boolean;
}

export interface StreamChunkParseResult extends ParsedResponse {
  buffer: string;
}

/**
 * Parse streaming response for OpenAI Responses API.
 * Event format: { "type": "response.output_text.delta", "delta": "text", ... }
 */
export function parseResponsesApiStreamResponse(obj: any): ParsedResponse {
  const eventType = obj.type || "";

  if (eventType === "response.output_text.delta") {
    return {
      content: obj.delta || "",
      finished: false,
    };
  }

  if (
    eventType === "response.completed" ||
    eventType === "response.done" ||
    eventType === "response.failed" ||
    eventType === "response.incomplete"
  ) {
    return {
      content: "",
      finished: true,
    };
  }

  return { content: "", finished: false };
}

export function parseStreamResponse(obj: any): ParsedResponse {
  if (obj.choices && obj.choices[0]) {
    const choice = obj.choices[0];
    return {
      content: choice.delta?.content || "",
      finished:
        choice.finish_reason !== undefined && choice.finish_reason !== null,
    };
  } else if (obj.message) {
    return {
      content: obj.message.content || "",
      finished: obj.done === true,
    };
  }
  return { content: "", finished: false };
}

function isSseDataLine(line: string): boolean {
  return line.trimStart().startsWith("data:");
}

function parsePayload(
  payload: string,
  useResponsesApi: boolean,
): ParsedResponse | null {
  const trimmed = payload.trim();
  if (!trimmed) return null;
  if (trimmed === "[DONE]") return { content: "", finished: true };

  try {
    const obj = JSON.parse(trimmed);
    return useResponsesApi
      ? parseResponsesApiStreamResponse(obj)
      : parseStreamResponse(obj);
  } catch {
    return null;
  }
}

export function parseStreamChunk(
  chunk: string,
  useResponsesApi: boolean,
  flush = false,
): StreamChunkParseResult {
  if (!chunk) return { content: "", finished: false, buffer: "" };

  const lines = chunk.split(/\r?\n/g);
  const completeLines = flush ? lines : lines.slice(0, -1);
  const buffer = flush ? "" : (lines[lines.length - 1] ?? "");
  const isSse = completeLines.some(isSseDataLine);
  let content = "";
  let finished = false;

  for (const rawLine of completeLines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isSse && !isSseDataLine(line)) {
      continue;
    }

    const payload = isSse ? line.replace(/^data:\s*/i, "") : line;
    const parsed = parsePayload(payload, useResponsesApi);
    if (!parsed) continue;

    content += parsed.content;
    if (parsed.finished) {
      finished = true;
      break;
    }
  }

  return {
    content,
    finished,
    buffer: finished ? "" : buffer,
  };
}

export function extractStreamedResultFromRaw(
  raw: string,
  useResponsesApi: boolean,
): string {
  return parseStreamChunk(raw, useResponsesApi, true).content;
}
