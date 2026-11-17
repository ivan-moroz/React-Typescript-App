import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { trainLanguageModel } from "./languageModel";

test("trains and saves a word-token model from question-answer examples", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tiny-language-model-"));
  const modelPath = join(directory, "model.json");

  try {
    const result = await trainLanguageModel(
      [
        { question: "hello", answer: "Hello there!" },
        { question: "thanks", answer: "You are welcome!" },
      ],
      { epochs: 1, modelPath },
    );
    const checkpoint: unknown = JSON.parse(await readFile(modelPath, "utf8"));

    expect(result.modelPath).toBe(modelPath);
    expect(result.vocabularySize).toBeGreaterThan(10);
    expect(checkpoint).toMatchObject({
      version: 1,
      vocabulary: expect.arrayContaining(["hello", "Hello", "User", "Assistant"]),
      weights: expect.any(Array),
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("rejects empty or incomplete training examples", async () => {
  await expect(trainLanguageModel([], { epochs: 1 })).rejects.toThrow(
    "at least one question-and-answer example",
  );
  await expect(
    trainLanguageModel([{ question: "hello", answer: " " }], { epochs: 1 }),
  ).rejects.toThrow("needs a question and an answer");
});
