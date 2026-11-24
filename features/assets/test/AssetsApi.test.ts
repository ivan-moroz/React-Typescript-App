import type { NextApiRequest, NextApiResponse } from "next";
import assetsHandler from "../../../server/api/assets";
import assetHandler from "../../../server/api/assets/[id]";
import assetFileHandler from "../../../server/api/assets/[id]/file";
import { getSessionUser } from "../../../server/auth/session";

const db = vi.hoisted(() => ({
	asset: {
		findMany: vi.fn(),
		create: vi.fn(),
		findFirst: vi.fn(),
		deleteMany: vi.fn(),
		updateMany: vi.fn(),
		update: vi.fn(),
	},
	assetChunk: { deleteMany: vi.fn(), create: vi.fn() },
}));

vi.mock("../../../server/db/prisma", () => ({ default: db }));
vi.mock("../../../server/auth/session", () => ({ getSessionUser: vi.fn() }));

function response() {
	const res = {
		status: vi.fn(),
		json: vi.fn(),
		end: vi.fn(),
		setHeader: vi.fn(),
		send: vi.fn(),
		write: vi.fn(),
	};
	res.status.mockReturnValue(res);
	return res;
}

function request(method: string, body?: unknown, query: Record<string, unknown> = {}) {
	return {
		method,
		body,
		query,
		headers: {},
	} as unknown as NextApiRequest;
}

beforeEach(() => {
	vi.resetAllMocks();
	vi.mocked(getSessionUser).mockResolvedValue(null);
});

test("does not use a query userId to list private assets without a session", async () => {
	const res = response();
	db.asset.findMany.mockResolvedValue([]);

	await assetsHandler(
		request("GET", undefined, { userId: "12" }),
		res as unknown as NextApiResponse,
	);

	expect(db.asset.findMany).toHaveBeenCalledWith(
		expect.objectContaining({ where: { authorization: "PUBLIC" } }),
	);
	expect(res.status).toHaveBeenCalledWith(200);
});

test("ignores a submitted userId when creating an asset", async () => {
	vi.mocked(getSessionUser).mockResolvedValue({ id: 7, name: "Owner" });
	db.asset.create.mockResolvedValue({
		id: "asset-1",
		name: "Notes",
		description: "",
		authorization: "INTERNAL",
		mimeType: "text/plain",
		size: 0,
		createdAt: new Date("2026-01-01T00:00:00Z"),
		userId: 7,
	});
	const res = response();

	await assetsHandler(
		request("POST", {
			userId: 12,
			name: "Notes",
			description: "",
			authorization: "INTERNAL",
			type: "text/plain",
			size: 0,
		}),
		res as unknown as NextApiResponse,
	);

	expect(db.asset.create).toHaveBeenCalledWith(
		expect.objectContaining({ data: expect.objectContaining({ userId: 7 }) }),
	);
	expect(res.status).toHaveBeenCalledWith(201);
});

test("rejects asset creation without a validated session", async () => {
	const res = response();

	await assetsHandler(
		request("POST", { userId: 12, name: "Notes" }),
		res as unknown as NextApiResponse,
	);

	expect(res.status).toHaveBeenCalledWith(401);
	expect(db.asset.create).not.toHaveBeenCalled();
});

test("binds asset deletion to the session owner, not a submitted userId", async () => {
	vi.mocked(getSessionUser).mockResolvedValue({ id: 7, name: "Owner" });
	db.asset.deleteMany.mockResolvedValue({ count: 1 });
	const res = response();

	await assetHandler(
		request("DELETE", { userId: 12 }, { id: "asset-1" }),
		res as unknown as NextApiResponse,
	);

	expect(db.asset.deleteMany).toHaveBeenCalledWith({
		where: { id: "asset-1", userId: 7 },
	});
	expect(res.status).toHaveBeenCalledWith(204);
});

test("requires a validated session for chunked file uploads", async () => {
	const req = {
		...request("PUT", undefined, { id: "asset-1", userId: "7" }),
		headers: { "content-length": "0" },
		async *[Symbol.asyncIterator]() {},
	} as unknown as NextApiRequest;
	const res = response();

	await assetFileHandler(req, res as unknown as NextApiResponse);

	expect(res.status).toHaveBeenCalledWith(401);
	expect(db.asset.findFirst).not.toHaveBeenCalled();
});
