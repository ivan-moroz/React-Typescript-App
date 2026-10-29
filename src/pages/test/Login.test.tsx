import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import LoginPage from "../Login";

describe("LoginPage", () => {
	test("shows the login page when sessionStorage has a stale user", () => {
		sessionStorage.setItem(
			"authenticatedUser",
			JSON.stringify({ id: 1, name: "Jane" }),
		);
		render(
			<MemoryRouter initialEntries={["/login?from=/users"]}>
				<LoginPage />
			</MemoryRouter>,
		);
		expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		sessionStorage.clear();
	});

	test.each([
		"/",
		"/todo?sort=name#details",
		"/assets?sort=name#details",
		"/users",
		"/messaging?conversation=123",
	])(
		"requests the destination from the server after login: %s",
		async (destination) => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				json: async () => ({ id: 1, name: "Jane" }),
			} as Response);
			render(
				<MemoryRouter
					initialEntries={[
						`/login?from=${encodeURIComponent(destination)}`,
					]}
				>
					<LoginPage />
				</MemoryRouter>,
			);
			fireEvent.change(screen.getByLabelText("Email"), {
				target: { value: "jane@example.com" },
			});
			fireEvent.change(screen.getByLabelText("Password"), {
				target: { value: "12345" },
			});
			const assign = vi.fn();
			const browser = Object.create(window);
			Object.defineProperty(browser, "location", { value: { assign } });
			vi.stubGlobal("window", browser);
			fireEvent.click(screen.getByRole("button", { name: "Log in" }));
			await waitFor(() =>
				expect(assign).toHaveBeenCalledWith(destination),
			);
		},
	);

	test("authenticates with email and password", async () => {
		const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
			ok: true,
			json: async () => ({
				id: 1,
				name: "User 1",
				email: "user1@example.com",
			}),
		} as Response);
		const assign = vi.fn();
		const browser = Object.create(window);
		Object.defineProperty(browser, "location", { value: { assign } });
		vi.stubGlobal("window", browser);

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
		expect(assign).toHaveBeenCalledWith("/");
		expect(sessionStorage.getItem("authenticatedUser")).toContain(
			"user1@example.com",
		);
	});

	test.each([undefined, "/login", "//example.com", "/\\example.com"])(
		"falls back to Home for an absent or invalid return page: %s",
		async (from) => {
			vi.spyOn(global, "fetch").mockResolvedValue({
				ok: true,
				json: async () => ({ name: "Jane" }),
			} as Response);

			const assign = vi.fn();
			const browser = Object.create(window);
			Object.defineProperty(browser, "location", { value: { assign } });
			vi.stubGlobal("window", browser);

			render(
				<MemoryRouter initialEntries={[{ pathname: "/login", state: { from } }]}>
					<LoginPage />
				</MemoryRouter>,
			);

			fireEvent.change(screen.getByLabelText("Email"), {
				target: { value: "jane@example.com" },
			});
			fireEvent.change(screen.getByLabelText("Password"), {
				target: { value: "12345" },
			});
			fireEvent.click(screen.getByRole("button", { name: "Log in" }));

			await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
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
