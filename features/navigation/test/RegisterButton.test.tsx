import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ModalProvider } from "../../../shared/ui/modal/ModalProvider";
import ServerNavigation from "../ui/ServerNavigation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

test("registers through the auth API and stores the signed-in user", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      Response.json(
        { id: 8, name: "Alex", email: "alex@example.com" },
        { status: 201 },
      ),
    );

  render(
    <ModalProvider>
      <ServerNavigation
        pathname="/"
        from="/"
        user={null}
        unreadCount={0}
      />
    </ModalProvider>,
  );
  expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Open AI chat" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Register" }));

  expect(screen.getByRole("dialog", { name: "Register" })).toBeInTheDocument();
  fireEvent.change(screen.getByPlaceholderText("Name"), {
    target: { value: "Alex" },
  });
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "alex@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("Age"), {
    target: { value: "30" },
  });
  fireEvent.change(screen.getByPlaceholderText("City"), {
    target: { value: "Kyiv" },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: "safe password" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Register",
    }),
  );

  await waitFor(() => {
    expect(fetch).toHaveBeenCalledWith(
      "/api/auth/register",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Alex",
          email: "alex@example.com",
          age: 30,
          city: "Kyiv",
          password: "safe password",
        }),
      }),
    );
  });
  expect(sessionStorage.getItem("authenticatedUser")).toBe(
    JSON.stringify({ id: 8, name: "Alex", email: "alex@example.com" }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
