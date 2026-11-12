import type { NextApiRequest, NextApiResponse } from "next";
import type { NextApiHandler } from "next";
import { ERROR_MESSAGES } from "../../constants/errors";

type RouteParams = Record<string, string | string[] | undefined>;

class PayloadTooLargeError extends Error {}

async function readBodyText(request: Request, maxBodySize: number): Promise<string> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBodySize) throw new PayloadTooLargeError();
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks).toString("utf8");
}

function queryFrom(request: Request, params: RouteParams): NextApiRequest["query"] {
  const query: NextApiRequest["query"] = {};
  const url = new URL(request.url);

  for (const [key, value] of url.searchParams) {
    const previous = query[key];
    query[key] =
      previous === undefined
        ? value
        : Array.isArray(previous)
          ? [...previous, value]
          : [previous, value];
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query[key] = value;
  }

  return query;
}

async function bodyFrom(
  request: Request,
  maxBodySize: number,
): Promise<unknown> {
  if (["GET", "HEAD"].includes(request.method) || !request.body) return undefined;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const text = await readBodyText(request, maxBodySize);
    return text ? JSON.parse(text) : undefined;
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(
      new URLSearchParams(await readBodyText(request, maxBodySize)),
    );
  }
  return undefined;
}

export async function runApiHandler(
  request: Request,
  handler: NextApiHandler,
  params: RouteParams = {},
  maxBodySize = 1024 * 1024,
): Promise<Response> {
  let body: unknown;
  try {
    body = await bodyFrom(request, maxBodySize);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return Response.json(
        { message: ERROR_MESSAGES.REQUEST_BODY_TOO_LARGE },
        { status: 413 },
      );
    }
    return Response.json(
      { message: ERROR_MESSAGES.REQUEST_BODY_INVALID },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const requestHeaders = Object.fromEntries(request.headers) as NextApiRequest["headers"];
  const legacyRequest = {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    headers: requestHeaders,
    query: queryFrom(request, params),
    body,
    socket: {
      encrypted: request.headers.get("x-forwarded-proto") === "https",
    },
    async *[Symbol.asyncIterator](): AsyncGenerator<Buffer> {
      if (!request.body) return;
      const reader = request.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield Buffer.from(value);
        }
      } finally {
        reader.releaseLock();
      }
    },
  } as unknown as NextApiRequest;

  let status = 200;
  let responseBody: Buffer[] = [];
  const headers = new Headers();
  const legacyResponse = {
    status(code: number) {
      status = code;
      return this;
    },
    setHeader(name: string, value: string | number | string[]) {
      headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
      return this;
    },
    json(value: unknown) {
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json; charset=utf-8");
      }
      responseBody = [Buffer.from(JSON.stringify(value))];
      return this;
    },
    send(value?: unknown) {
      if (value !== undefined) {
        responseBody = [
          Buffer.isBuffer(value)
            ? value
            : value instanceof Uint8Array
              ? Buffer.from(value)
              : Buffer.from(String(value)),
        ];
      }
      return this;
    },
    write(value: string | Uint8Array) {
      responseBody.push(
        typeof value === "string" ? Buffer.from(value) : Buffer.from(value),
      );
      return true;
    },
    end(value?: string | Uint8Array) {
      if (value !== undefined) {
        responseBody.push(
          typeof value === "string" ? Buffer.from(value) : Buffer.from(value),
        );
      }
      return this;
    },
    redirect(code: number, location: string) {
      status = code;
      headers.set("location", location);
      return this;
    },
  } as unknown as NextApiResponse;

  await handler(legacyRequest, legacyResponse);
  const response = Buffer.concat(responseBody);
  return new Response(
    status === 204 || status === 304 || request.method === "HEAD"
      ? null
      : response.length
        ? response
        : null,
    { status, headers },
  );
}
