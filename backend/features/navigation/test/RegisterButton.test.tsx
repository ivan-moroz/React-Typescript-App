import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { ModalProvider } from "../../../../src/components/modal/ModalProvider";
import ServerNavigation from "../ServerNavigation";
import RegistrationModalHost from "../../users/RegistrationModalHost";

test("opens the user registration modal and submits to the users API", async () => {
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      Response.json(
        [{ id: 8, name: "Alex", email: "alex@example.com", age: 30, city: "Kyiv" }],
        { status: 201 },
      ),
    );

  render(
    <ModalProvider>
      <RegistrationModalHost />
      <ServerNavigation
        pathname="/"
        from="/"
        user={null}
        unreadCount={0}
      />
    </ModalProvider>,
  );
  expect(screen.getByRole("link", { name: "Login" })).toBeInTheDocument();
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
      "/api/users",
      expect.objectContaining({
        method: "POST",
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
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
