import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import LoginPage from "./Login";
import Navigation from "../components/navigation/Navigation";

function CurrentLocation() {
	const location = useLocation();
	return (
		<output data-testid="location">
			{location.pathname}
			{location.search}
			{location.hash}
		</output>
	);
}

describe("LoginPage", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		sessionStorage.clear();
	});

	test("authenticates with email and password", async () => {
		const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 1,
				name: "User 1",
				email: "user1@example.com",
			}),
		} as Response);

		render(
			<MemoryRouter>
				<LoginPage />
			</MemoryRouter>,
		);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "user1@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "12345" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Log in" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: "user1@example.com",
					password: "12345",
				}),
			});
		});
		expect(sessionStorage.getItem("authenticatedUser")).toContain(
			"user1@example.com",
		);
	});

	test("returns to the previous page with its query and fragment after logging in", async () => {
		vi.spyOn(global, "fetch").mockResolvedValue({
			ok: true,
			json: async () => ({ name: "Jane" }),
		} as Response);

		render(
			<MemoryRouter initialEntries={["/assets?sort=name#details"]}>
				<Navigation />
				<CurrentLocation />
				<Routes>
					<Route path="/login" element={<LoginPage />} />
				</Routes>
			</MemoryRouter>,
		);

		fireEvent.click(screen.getByRole("link", { name: "Login" }));
		// Clicking Login again must preserve the original destination.
		fireEvent.click(screen.getByRole("link", { name: "Login" }));
		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "jane@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "12345" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Log in" }));

		await waitFor(() =>
			expect(screen.getByTestId("location")).toHaveTextContent(
				"/assets?sort=name#details",
			),
		);
		expect(screen.getByText("Jane")).toBeInTheDocument();
	});

	test.each([undefined, "/login", "//example.com", "/\\example.com"])(
		"falls back to Home for an absent or invalid return page: %s",
		async (from) => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				json: async () => ({ name: "Jane" }),
			} as Response);

			render(
				<MemoryRouter
					initialEntries={[{ pathname: "/login", state: { from } }]}
				>
					<CurrentLocation />
					<Routes>
						<Route path="/login" element={<LoginPage />} />
					</Routes>
				</MemoryRouter>,
			);

			fireEvent.change(screen.getByLabelText("Email"), {
				target: { value: "jane@example.com" },
			});
			fireEvent.change(screen.getByLabelText("Password"), {
				target: { value: "12345" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Log in" }));

			await waitFor(() =>
				expect(screen.getByTestId("location").textContent).toBe("/"),
			);
		},
	);

	test("shows an authentication error returned by the server", async () => {
		vi.spyOn(global, "fetch").mockResolvedValue({
			ok: false,
			json: async () => ({ message: "Invalid email or password" }),
		} as Response);

		render(
			<MemoryRouter>
				<LoginPage />
			</MemoryRouter>,
		);

		fireEvent.change(screen.getByLabelText("Email"), {
			target: { value: "user1@example.com" },
		});
		fireEvent.change(screen.getByLabelText("Password"), {
			target: { value: "wrong" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Log in" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Invalid email or password",
		);
	});
});
