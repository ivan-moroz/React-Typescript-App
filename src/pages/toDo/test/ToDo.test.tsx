import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import ToDo from "../ToDo";

describe("ToDo Component", () => {
	beforeEach(() => {
		global.fetch = vi.fn<typeof fetch>().mockImplementation(
			async (_input, init) =>
				init?.method === "DELETE"
					? new Response(null, { status: 204 })
					: new Response(JSON.stringify(
					init?.method === "POST"
						? {
								id: 2,
								text: "New Todo",
								completed: false,
							}
						: [
								{
									id: 1,
									text: "Learn React + TypeScript",
									completed: false,
								},
							],
					),
					{
						status: 200,
						headers: { "Content-Type": "application/json" },
					},
				),
		);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	test("adds a new todo", async () => {
		render(<ToDo />);
		const input = await screen.findByTestId("todo-input");
		const addButton = screen.getByTestId("todo-add-button");

		fireEvent.change(input, { target: { value: "New Todo" } });
		fireEvent.click(addButton);

		expect(await screen.findByText("New Todo")).toBeInTheDocument();
		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/todo",
				expect.objectContaining({
					method: "POST",
					body: JSON.stringify({ text: "New Todo" }),
				}),
			);
		});
	});

	test("hides the add form for users without a valid login session", async () => {
		global.fetch = vi.fn<typeof fetch>().mockResolvedValue(
			new Response(JSON.stringify({ message: "Please log in to continue." }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			}),
		);

		render(<ToDo />);

		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(screen.queryByTestId("todo-input")).not.toBeInTheDocument();
		expect(screen.queryByTestId("todo-add-button")).not.toBeInTheDocument();
	});

	test("deletes the todo from PostgreSQL and removes it from the list", async () => {
		render(<ToDo />);

		const removeButton = await screen.findByRole("button", {
			name: "Remove todo",
		});
		fireEvent.click(removeButton);

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				"/api/todo?id=1",
				expect.objectContaining({ method: "DELETE" }),
			);
			expect(
				screen.queryByText("Learn React + TypeScript"),
			).not.toBeInTheDocument();
		});
		expect(
			screen.queryByTestId("deleted-items-section"),
		).not.toBeInTheDocument();
	});
});
