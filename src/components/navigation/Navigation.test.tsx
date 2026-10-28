import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import Navigation from "./Navigation";

describe("Navigation", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		sessionStorage.clear();
	});

	test("shows the logged-in user name and allows logout", async () => {
		const logout = vi.spyOn(global, "fetch").mockResolvedValue({ ok: true } as Response);
		sessionStorage.setItem(
			"authenticatedUser",
			JSON.stringify({ name: "Jane", email: "jane@example.com" }),
		);

		render(
			<MemoryRouter>
				<Navigation />
			</MemoryRouter>,
		);

		expect(screen.getByText("Jane")).toBeInTheDocument();
		expect(
			screen.queryByRole("link", { name: "Login" }),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Log out" }));

		await waitFor(() => expect(sessionStorage.getItem("authenticatedUser")).toBeNull());
		expect(logout).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
	});
});
