import { describe, expect, it } from "vitest";
import { longestSequence, mergeSequence, parseNumbers } from "./solver";

function bruteForce(numbers: string[]): number {
  let best = 0;
  const used = new Set<number>();
  function visit(suffix?: string) {
    best = Math.max(best, used.size);
    numbers.forEach((number, index) => {
      if (used.has(index) || (suffix !== undefined && number.slice(0, 2) !== suffix)) return;
      used.add(index);
      visit(number.slice(-2));
      used.delete(index);
    });
  }
  visit();
  return best;
}

describe("puzzle solver", () => {
  it("parses separators and preserves leading zeros and large integers", () => {
    expect(parseNumbers("\uFEFF0012, 1234;\n3456789012345678901234")).toEqual(["0012", "1234", "3456789012345678901234"]);
    for (const input of ["", "  ", "1 1234", "12.34", "-1234", "1234 hello"]) {
      expect(() => parseNumbers(input)).toThrow();
    }
  });

  it("merges only the matching boundary digits", () => {
    expect(mergeSequence(longestSequence(["5678", "1234", "3456"]))).toBe("12345678");
    expect(mergeSequence(["0012", "12", "1234"])).toBe("001234");
  });

  it("finds a longer route than a greedy first choice", () => {
    const sequence = longestSequence(["1234", "3456", "3412", "1299"]);
    expect(sequence.length).toBe(3);
  });

  it("uses duplicate entries once each and handles cycles and disconnected numbers", () => {
    expect(longestSequence(["1212", "1212", "1234", "9999"])).toEqual(["1212", "1212", "1234"]);
    expect(longestSequence(["1234", "3412", "5678"]).length).toBe(2);
    expect(longestSequence([])).toEqual([]);
    expect(longestSequence(["1234"])).toEqual(["1234"]);
  });

  it("matches exhaustive search on generated graphs", () => {
    let seed = 42;
    const next = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed; };
    const nodes = ["01", "12", "34", "56"];
    for (let trial = 0; trial < 100; trial++) {
      const numbers = Array.from({ length: 7 }, () => {
        const from = nodes[(next() >>> 16) % nodes.length];
        const to = nodes[(next() >>> 16) % nodes.length];
        return from + to;
      });
      const result = longestSequence(numbers);
      expect(result.length).toBe(bruteForce(numbers));
      const remaining = [...numbers];
      result.forEach((number, index) => {
        expect(remaining.indexOf(number)).toBeGreaterThanOrEqual(0);
        remaining.splice(remaining.indexOf(number), 1);
        if (index) expect(result[index - 1].slice(-2)).toBe(number.slice(0, 2));
      });
    }
  });
});
