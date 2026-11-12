import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import HomePage from "../ui/Home";

test("hides the People feature card by default", () => {
	render(<HomePage />);

	expect(screen.queryByRole("link", { name: /People/ })).not.toBeInTheDocument();
});

test("shows the People feature card when enabled for the admin", () => {
	render(<HomePage showPeople />);

	expect(screen.getByRole("link", { name: /People/ })).toHaveAttribute(
		"href",
		"/users",
	);
});
