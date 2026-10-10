import { lazy } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import RouteBoundary from "./RouteBoundary";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("RouteBoundary", () => {
	it("keeps navigation visible while a lazy page loads, then displays the page", async () => {
		let resolvePage!: (value: { default: () => React.JSX.Element }) => void;
		const Page = lazy(
			() =>
				new Promise<{ default: () => React.JSX.Element }>((resolve) => {
					resolvePage = resolve;
				}),
		);

		render(
			<MemoryRouter>
				<nav>Navigation</nav>
				<RouteBoundary>
					<Page />
				</RouteBoundary>
			</MemoryRouter>,
		);

		expect(screen.getByText("Navigation")).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("Loading page");

		await act(async () => {
			resolvePage({ default: () => <h1>Loaded page</h1> });
		});

		expect(
			screen.getByRole("heading", { name: "Loaded page" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("shows recovery UI for a rejected chunk and reloads on retry", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const Page = lazy(() =>
			Promise.reject(
				new Error("Failed to fetch dynamically imported module"),
			),
		);
		render(
			<MemoryRouter>
				<RouteBoundary>
					<Page />
				</RouteBoundary>
			</MemoryRouter>,
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Unable to load this page",
		);
		const reload = vi.fn();
		vi.stubGlobal("window", { location: { reload } });
		fireEvent.click(screen.getByRole("button", { name: "Try again" }));
		expect(reload).toHaveBeenCalledOnce();
		vi.unstubAllGlobals();
	});

	it("clears a route error when navigating to another page", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		function BrokenPage(): never {
			throw new Error("Page failed");
		}
		render(
			<MemoryRouter>
				<Link to="/other">Other page</Link>
				<RouteBoundary>
					<Routes>
						<Route path="/" element={<BrokenPage />} />
						<Route
							path="/other"
							element={<h1>Other page loaded</h1>}
						/>
					</Routes>
				</RouteBoundary>
			</MemoryRouter>,
		);

		expect(await screen.findByRole("alert")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("link", { name: "Other page" }));
		expect(
			await screen.findByRole("heading", { name: "Other page loaded" }),
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
