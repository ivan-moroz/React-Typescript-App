const db = vi.hoisted(() => ({ $queryRaw: vi.fn() }));
vi.mock("../../../server/db/prisma", () => ({ default: db }));

import { publishMessagingUpdate } from "../server/realtime";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  globalThis.publishMessagingUpdate = undefined;
});

test("does not wait for PostgreSQL fan-out after locally publishing a message", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const localPublish = vi.fn();
  globalThis.publishMessagingUpdate = localPublish;
  let finishNotification!: () => void;
  db.$queryRaw.mockReturnValue(
    new Promise<void>((resolve) => {
      finishNotification = resolve;
    }),
  );
  const update = {
    type: "update" as const,
    conversationId: "conversation-id",
    actorId: 1,
    kind: "message-sent" as const,
  };

  await publishMessagingUpdate([1, 2], update);

  expect(localPublish).toHaveBeenCalledWith([1, 2], update);
  expect(db.$queryRaw).toHaveBeenCalledOnce();
  finishNotification();
});

test("logs PostgreSQL fan-out errors without blocking message delivery", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const localPublish = vi.fn();
  globalThis.publishMessagingUpdate = localPublish;
  const failure = new Error("notification connection failed");
  db.$queryRaw.mockRejectedValue(failure);
  const log = vi.spyOn(console, "error").mockImplementation(() => {});

  await publishMessagingUpdate(
    [1, 2],
    {
      type: "update",
      conversationId: "conversation-id",
      actorId: 1,
      kind: "message-sent",
    },
  );
  await vi.waitFor(() =>
    expect(log).toHaveBeenCalledWith(
      "PostgreSQL messaging notification failed after local delivery.",
      failure,
    ),
  );
});
