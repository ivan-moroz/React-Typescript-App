import { act, fireEvent, render, screen, within } from "@testing-library/react";
import AIChatPanelHost from "../ui/AIChatPanelHost";

function renderChat() {
  render(
    <>
      <button type="button" data-open-ai-chat>
        Open AI chat
      </button>
      <AIChatPanelHost />
    </>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open AI chat" }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("sends a chat message, renders the response as text, and closes with Escape", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    Response.json({ message: "<script>not executable</script>" }),
  );
  renderChat();

  fireEvent.change(screen.getByLabelText("Message to AI assistant"), {
    target: { value: "Hello AI" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(await screen.findByText("<script>not executable</script>")).toBeInTheDocument();
  expect(document.querySelector("script")).toBeNull();
  expect(screen.getByLabelText("Message to AI assistant")).toHaveValue("");
  expect(fetch).toHaveBeenCalledWith(
    "/api/ai/chat",
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello AI" }],
      }),
    }),
  );

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "AI chat" })).not.toBeInTheDocument();
});

test("shows the sent message before the AI thinking indicator", async () => {
  let resolveResponse!: (response: Response) => void;
  const fetch = vi.spyOn(globalThis, "fetch").mockReturnValue(
    new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    }),
  );
  renderChat();

  fireEvent.change(screen.getByLabelText("Message to AI assistant"), {
    target: { value: "Hello AI" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  const history = screen.getByRole("log", { name: "AI chat history" });
  expect(within(history).getByText("Hello AI")).toBeInTheDocument();
  expect(within(history).getByRole("status")).toHaveTextContent(
    "Generating an answer…",
  );
  expect(history.lastElementChild).toBe(within(history).getByRole("status"));
  expect(fetch).toHaveBeenCalledOnce();

  await act(async () => {
    resolveResponse(Response.json({ message: "Hello there" }));
  });
  expect(await within(history).findByText("Hello there")).toBeInTheDocument();
});

test("sends only the bounded recent history and retains the draft on error", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    Response.json({ message: "answer" }),
  );
  renderChat();

  for (let index = 0; index < 11; index += 1) {
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Message to AI assistant"), {
        target: { value: `question ${index}` },
      });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));
    });
    expect(await screen.findByText(`question ${index}`)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(index + 1);
  }

  const requests = fetch.mock.calls.map(([, options]) =>
    JSON.parse(String(options?.body)) as {
      messages: Array<{ role: string; content: string }>;
    },
  );
  const latestHistory = requests[requests.length - 1].messages;
  expect(latestHistory).toHaveLength(19);
  expect(latestHistory[0]).toEqual({ role: "user", content: "question 1" });
  expect(latestHistory.at(-1)).toEqual({ role: "user", content: "question 10" });

  fetch.mockResolvedValueOnce(
    Response.json({ message: "temporarily unavailable" }, { status: 503 }),
  );
  fireEvent.change(screen.getByLabelText("Message to AI assistant"), {
    target: { value: "keep this draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "temporarily unavailable",
  );
  expect(screen.getByLabelText("Message to AI assistant")).toHaveValue(
    "keep this draft",
  );
  expect(
    within(screen.getByRole("log", { name: "AI chat history" })).queryByText(
      "keep this draft",
    ),
  ).not.toBeInTheDocument();
});
