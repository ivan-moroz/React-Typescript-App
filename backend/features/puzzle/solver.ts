import { ERROR_MESSAGES } from "../../constants/errors";
export function parseNumbers(text: string): string[] {
	const numbers = text
		.trim()
		.split(/[\s,;]+/)
		.filter(Boolean);
	if (!numbers.length)
		throw new Error(ERROR_MESSAGES.PUZZLE_FILE_EMPTY);
	if (numbers.some((number) => !/^\d{2,}$/.test(number))) {
		throw new Error(
			ERROR_MESSAGES.PUZZLE_NUMBERS_INVALID,
		);
	}
	return numbers;
}

export function mergeSequence(sequence: string[]): string {
	return sequence
		.map((number, index) => (index === 0 ? number : number.slice(2)))
		.join("");
}

// Numbers are directed edges between two-digit prefixes and suffixes.
// Equivalent edges share a counter, avoiding permutations of interchangeable edges.
export function longestSequence(numbers: string[]): string[] {
	const groups: {
		from: string;
		to: string;
		values: string[];
		remaining: number;
	}[] = [];
	const byPair = new Map<string, number>();
	const outgoing = new Map<string, number[]>();
	for (const number of numbers) {
		const from = number.slice(0, 2);
		const to = number.slice(-2);
		const key = `${from}:${to}`;
		let index = byPair.get(key);
		if (index === undefined) {
			index = groups.length;
			byPair.set(key, index);
			groups.push({ from, to, values: [], remaining: 0 });
			outgoing.set(from, [...(outgoing.get(from) ?? []), index]);
		}
		groups[index].values.push(number);
		groups[index].remaining++;
	}

	// Reachability is an optimistic bound: unreachable edges cannot extend a trail.
	function reachableCount(node: string): number {
		const seen = new Set<string>();
		const pending = [node];
		let count = 0;
		while (pending.length) {
			const current = pending.pop()!;
			if (seen.has(current)) continue;
			seen.add(current);
			for (const index of outgoing.get(current) ?? []) {
				const group = groups[index];
				if (group.remaining) {
					count += group.remaining;
					pending.push(group.to);
				}
			}
		}
		return count;
	}

	let best: string[] = [];
	const path: string[] = [];
	type Frame = { node: string; next: number; via?: number; entered: boolean };
	for (const start of outgoing.keys()) {
		const stack: Frame[] = [{ node: start, next: 0, entered: false }];
		while (stack.length) {
			const frame = stack[stack.length - 1];
			if (!frame.entered) {
				frame.entered = true;
				if (path.length > best.length) best = [...path];
				if (best.length === numbers.length) return best;
				if (path.length + reachableCount(frame.node) <= best.length) {
					frame.next = (outgoing.get(frame.node) ?? []).length;
				}
			}
			const options = outgoing.get(frame.node) ?? [];
			let index: number | undefined;
			while (frame.next < options.length) {
				const candidate = options[frame.next++];
				if (groups[candidate].remaining) {
					index = candidate;
					break;
				}
			}
			if (index === undefined) {
				stack.pop();
				if (frame.via !== undefined) {
					groups[frame.via].remaining++;
					path.pop();
				}
			} else {
				const group = groups[index];
				path.push(group.values[group.values.length - group.remaining]);
				group.remaining--;
				stack.push({
					node: group.to,
					next: 0,
					via: index,
					entered: false,
				});
			}
		}
	}
	return best;
}
