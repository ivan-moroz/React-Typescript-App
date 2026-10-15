import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import PuzzlePage from "./Puzzle";
import { longestSequence } from "./puzzle/solver";

afterEach(() => vi.unstubAllGlobals());

it("uploads a text file and displays the merged result in one row", async () => {
	class SolverWorker {
		onmessage?: (event: { data: { sequence: string[] } }) => void;
		terminate() {}
		postMessage(numbers: string[]) {
			this.onmessage?.({ data: { sequence: longestSequence(numbers) } });
		}
	}
	vi.stubGlobal("Worker", SolverWorker);
	render(<PuzzlePage />);
	const file = new File(["1234 3456 5678"], "numbers.txt");
	Object.defineProperty(file, "text", {
		value: async () => "1234 3456 5678",
	});
	fireEvent.change(screen.getByLabelText("Choose a .txt file"), {
		target: { files: [file] },
	});
	await waitFor(() =>
		expect(
			screen.getByRole("region", { name: "Merged result" }),
		).toHaveTextContent("12345678"),
	);
	expect(screen.getByText(/Used 3 of 3/)).toBeInTheDocument();
});

it("rejects files with invalid numbers", async () => {
	render(<PuzzlePage />);
	const file = new File(["1234 invalid"], "numbers.txt");
	Object.defineProperty(file, "text", { value: async () => "1234 invalid" });
	fireEvent.change(screen.getByLabelText("Choose a .txt file"), {
		target: { files: [file] },
	});
	expect(await screen.findByRole("alert")).toHaveTextContent(
		"Use whole numbers",
	);
});
