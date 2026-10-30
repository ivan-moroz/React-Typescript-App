import { act, render, screen } from "@testing-library/react";
import NavigationRealtime from "../NavigationRealtime";

test("updates the unread badge through React state", () => {
  const { unmount } = render(
    <NavigationRealtime userId={1} unreadCount={1} />,
  );
  expect(screen.getByRole("link", { name: "Messages, 1 unread" })).toBeInTheDocument();

  act(() => {
    window.dispatchEvent(
      new CustomEvent<number>("messaging:unread", { detail: 0 }),
    );
  });

  expect(screen.getByRole("link", { name: "Messages" })).not.toHaveTextContent(
    "1",
  );
  expect(
    screen.queryByText("1", { selector: ".messages-link-badge" }),
  ).not.toBeInTheDocument();

  unmount();
});
