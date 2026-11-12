import {
  subscribeMessagingRealtime,
  type MessagingRealtimeEvent,
} from "../client/realtime";

class MockWebSocket extends EventTarget {
  static OPEN = 1;
  static instances: MockWebSocket[] = [];
  readyState = 0;

  constructor(readonly url: string) {
    super();
    MockWebSocket.instances.push(this);
  }

  open() {
    this.readyState = MockWebSocket.OPEN;
    this.dispatchEvent(new Event("open"));
  }

  receive(event: MessagingRealtimeEvent) {
    this.dispatchEvent(
      new MessageEvent("message", { data: JSON.stringify(event) }),
    );
  }

  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
}

afterEach(() => {
  MockWebSocket.instances = [];
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("shares one authenticated connection and delivers update events to subscribers", () => {
  vi.stubGlobal("WebSocket", MockWebSocket);
  const first = vi.fn();
  const second = vi.fn();
  const unsubscribeFirst = subscribeMessagingRealtime(first);
  const unsubscribeSecond = subscribeMessagingRealtime(second);
  const socket = MockWebSocket.instances[0];

  expect(MockWebSocket.instances).toHaveLength(1);
  expect(socket.url).toBe("ws://localhost:3000/api/messaging/socket");
  socket.open();
  const update: MessagingRealtimeEvent = {
    type: "update",
    conversationId: "conversation-id",
    actorId: 2,
    kind: "message-sent",
  };
  socket.receive(update);

  expect(first).toHaveBeenNthCalledWith(1, {
    type: "connected",
    reconnected: false,
  });
  expect(first).toHaveBeenNthCalledWith(2, update);
  expect(second).toHaveBeenNthCalledWith(2, update);

  unsubscribeFirst();
  expect(socket.readyState).toBe(MockWebSocket.OPEN);
  unsubscribeSecond();
  expect(socket.readyState).toBe(3);
});

test("reconnects with capped-backoff scheduling and signals reconnection", () => {
  vi.useFakeTimers();
  vi.stubGlobal("WebSocket", MockWebSocket);
  const listener = vi.fn();
  const unsubscribe = subscribeMessagingRealtime(listener);
  MockWebSocket.instances[0].open();
  MockWebSocket.instances[0].close();

  vi.advanceTimersByTime(1000);
  const reconnectedSocket = MockWebSocket.instances[1];
  reconnectedSocket.open();

  expect(listener).toHaveBeenLastCalledWith({
    type: "connected",
    reconnected: true,
  });
  unsubscribe();
});
