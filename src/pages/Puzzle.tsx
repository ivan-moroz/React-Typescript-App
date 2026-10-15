import { useEffect, useRef, useState } from "react";
import { mergeSequence, parseNumbers } from "./puzzle/solver";
import "./puzzle/styles.scss";

export default function PuzzlePage() {
	const worker = useRef<Worker | null>(null);
	const request = useRef(0);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [fileName, setFileName] = useState("");
	const [total, setTotal] = useState(0);
	const [sequence, setSequence] = useState<string[] | null>(null);

	useEffect(
		() => () => {
			request.current++;
			worker.current?.terminate();
		},
		[],
	);

	const cancel = () => {
		request.current++;
		worker.current?.terminate();
		worker.current = null;
		setBusy(false);
	};

	const upload = async (file: File) => {
		cancel();
		const current = request.current;
		setSequence(null);
		setError("");
		setTotal(0);
		setFileName(file.name);
		if (!/\.txt$/i.test(file.name)) {
			setError("Choose a .txt file.");
			return;
		}
		setBusy(true);
		try {
			const text = await file.text();
			if (current !== request.current) return;
			const numbers = parseNumbers(text);
			setTotal(numbers.length);
			const solver = new Worker(
				new URL("./puzzle/solver.worker.ts", import.meta.url),
				{ type: "module" },
			);
			worker.current = solver;
			const finish = () => {
				solver.terminate();
				worker.current = null;
				setBusy(false);
			};
			solver.onmessage = (
				event: MessageEvent<{ sequence?: string[]; error?: string }>,
			) => {
				if (current !== request.current) return;
				if (event.data.error) setError(event.data.error);
				else setSequence(event.data.sequence ?? []);
				finish();
			};
			solver.onerror = () => {
				if (current !== request.current) return;
				setError(
					"Could not solve this file. Try again with a smaller file.",
				);
				finish();
			};
			solver.postMessage(numbers);
		} catch (error) {
			if (current !== request.current) return;
			setError(
				error instanceof Error
					? error.message
					: "Could not read the file.",
			);
			setBusy(false);
		}
	};

	return (
		<main className="app puzzle-page">
			<h1>Number puzzle</h1>
			<p>
				Upload numbers and find the longest chain. The last two digits
				of each number must match the first two of the next.
			</p>
			<label htmlFor="puzzle-file">Choose a .txt file</label>
			<input
				id="puzzle-file"
				type="file"
				accept=".txt,text/plain"
				onChange={(event) => {
					const file = event.target.files?.[0];
					event.target.value = "";
					if (file) void upload(file);
				}}
			/>
			<p className="puzzle-help">
				Separate numbers with spaces, newlines, commas, or semicolons.
				Use at least two digits per number. Leading zeros are preserved;
				each entry can be used once, including duplicate entries.
			</p>
			<p className="puzzle-example">
				Example: <code>1234 3456 5678</code> → <code>12345678</code>
			</p>
			{busy && (
				<div role="status">
					<p>
						Finding the longest sequence for {fileName}… Complex
						files may take time.
					</p>
					<button type="button" onClick={cancel}>
						Cancel
					</button>
				</div>
			)}
			{error && <p role="alert">{error}</p>}
			{sequence && (
				<section
					aria-labelledby="puzzle-result-title"
					aria-live="polite"
				>
					<h2 id="puzzle-result-title">Longest sequence</h2>
					<p>
						Used {sequence.length} of {total} numbers from{" "}
						{fileName}.
					</p>
					<div
						className="puzzle-row"
						tabIndex={0}
						role="region"
						aria-label="Merged result"
					>
						<code>{mergeSequence(sequence)}</code>
					</div>
					<h3>Number order</h3>
					<div
						className="puzzle-row"
						tabIndex={0}
						role="region"
						aria-label="Number order"
					>
						<code>{sequence.join(" → ")}</code>
					</div>
				</section>
			)}
		</main>
	);
}
