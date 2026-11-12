import { ERROR_MESSAGES } from "../../../../constants/errors";
import { extname } from "node:path";
import prisma from "../../../../server/db/prisma";
import { runApiHandler } from "../../../../server/api/runApiHandler";
import handler from "../../../../server/api/assets/[id]";

type RouteContext = { params: Promise<{ id: string }> };
const CHUNK_SIZE = 8 * 1024 * 1024;

function requestedRange(
  rangeHeader: string | null,
  size: number,
): { start: number; end: number } | null {
  if (!rangeHeader) return { start: 0, end: size - 1 };
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) return null;
  const [, startValue, endValue] = match;
  const start = startValue ? Number(startValue) : Math.max(0, size - Number(endValue));
  const end = endValue ? Math.min(Number(endValue), size - 1) : size - 1;
  return Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    start <= end &&
    end < size
    ? { start, end }
    : null;
}

function userIdFrom(value: string | null): number | null {
  const userId = value === null ? NaN : Number(value);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

function corsHeaders(): Headers {
  return new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const userId = userIdFrom(new URL(request.url).searchParams.get("userId"));
  const headers = corsHeaders();
  if (!id || !userId) {
    return Response.json(
      { message: ERROR_MESSAGES.ASSET_ID_AND_USER_REQUIRED },
      { status: 400, headers },
    );
  }

  let asset;
  try {
    asset = await prisma.asset.findFirst({
      where: { id, OR: [{ userId }, { authorization: "PUBLIC" }] },
    });
  } catch {
    return Response.json(
      { message: ERROR_MESSAGES.ASSET_DOWNLOAD_FAILED },
      { status: 500, headers },
    );
  }
  if (!asset) {
    return Response.json(
      { message: ERROR_MESSAGES.ASSET_NOT_FOUND },
      { status: 404, headers },
    );
  }

  const rangeHeader = request.headers.get("range");
  const range = requestedRange(rangeHeader, asset.size);
  if (!range) {
    headers.set("Content-Range", `bytes */${asset.size}`);
    return new Response(null, { status: 416, headers });
  }

  const rangeLength = range.end - range.start + 1;
  const extension = asset.fileExtension || extname(asset.name);
  const downloadName =
    extension && !asset.name.toLowerCase().endsWith(extension.toLowerCase())
      ? `${asset.name}${extension}`
      : asset.name;
  headers.set("Content-Type", asset.mimeType);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Content-Length", String(rangeLength));
  if (rangeHeader) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${asset.size}`);
  }
  headers.set(
    "Content-Disposition",
    `${new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
  );
  headers.set("X-Content-Type-Options", "nosniff");

  const status = rangeHeader ? 206 : 200;
  if (asset.storageMode === "INLINE" && asset.data) {
    return new Response(
      Buffer.from(asset.data).subarray(range.start, range.end + 1),
      { status, headers },
    );
  }

  let position = Math.floor(range.start / CHUNK_SIZE);
  let remaining = rangeLength;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (remaining === 0) controller.close();
    },
    async pull(controller) {
      if (remaining === 0) return;
      try {
        const chunk = await prisma.assetChunk.findUnique({
          where: { assetId_position: { assetId: id, position } },
        });
        if (!chunk) throw new Error(ERROR_MESSAGES.ASSET_CHUNK_MISSING);
        const bytes = Buffer.from(chunk.data);
        const offset =
          position === Math.floor(range.start / CHUNK_SIZE)
            ? range.start % CHUNK_SIZE
            : 0;
        const part = bytes.subarray(offset, offset + remaining);
        if (!part.length) throw new Error(ERROR_MESSAGES.ASSET_CHUNK_MISSING);
        remaining -= part.length;
        position += 1;
        controller.enqueue(part);
        if (remaining === 0) controller.close();
      } catch (error) {
        console.error(ERROR_MESSAGES.ASSET_DOWNLOAD_FAILED, error);
        controller.error(error);
      }
    },
  });
  return new Response(stream, { status, headers });
}

async function dispatch(request: Request, context: RouteContext) {
  return runApiHandler(request, handler, await context.params);
}

export const PUT = dispatch;
export const DELETE = dispatch;
export const OPTIONS = dispatch;
