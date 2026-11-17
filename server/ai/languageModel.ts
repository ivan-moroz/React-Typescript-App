import * as tf from "@tensorflow/tfjs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TrainingExample = {
  question: string;
  answer: string;
};

type ModelCheckpoint = {
  version: 1;
  vocabulary: string[];
  weights: Array<{ shape: number[]; values: number[] }>;
};

type LoadedModel = {
  model: tf.LayersModel;
  tokenToId: Map<string, number>;
  vocabulary: string[];
};

const MODEL_PATH = join(process.cwd(), ".models", "tiny-language-model.json");
const CONTEXT_SIZE = 24;
const MAX_GENERATED_TOKENS = 32;
const UNKNOWN_TOKEN = 1;
const END_TOKEN = 2;
const EMBEDDING_SIZE = 16;
const HIDDEN_UNITS = 32;
const PAD_TOKEN = 0;
const TOKEN_PATTERN =
  /\r?\n|[^\S\r\n]+|[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*|[^\s]/gu;
const TRAINING_EXAMPLES_PATH = join(
  process.cwd(),
  "server",
  "ai",
  "training-data.json",
);

export class LlmModelUnavailableError extends Error {
  constructor() {
    super("The locally trained language model is unavailable.");
    this.name = "LlmModelUnavailableError";
  }
}

function formattedExample(example: TrainingExample) {
  const question = example.question.trim().toLowerCase();
  const language = /[\u0400-\u04ff]/i.test(question) ? "uk" : "en";
  return `Language: ${language}\nUser: ${question}\nAssistant: ${example.answer.trim()}`;
}

function createModel(vocabularySize: number): tf.LayersModel {
  return tf.sequential({
    layers: [
      tf.layers.embedding({
        inputDim: vocabularySize,
        outputDim: EMBEDDING_SIZE,
        inputLength: CONTEXT_SIZE,
      }),
      tf.layers.flatten(),
      tf.layers.dense({ units: HIDDEN_UNITS, activation: "relu" }),
      tf.layers.dense({ units: vocabularySize, activation: "softmax" }),
    ],
  });
}

function vocabularyFor(examples: TrainingExample[]) {
  const tokens = new Set<string>();
  for (const example of examples) {
    for (const token of tokenize(formattedExample(example))) tokens.add(token);
  }
  return ["<pad>", "<unk>", "<eos>", ...Array.from(tokens).sort()];
}

function tokenize(text: string) {
  return text.match(TOKEN_PATTERN) ?? [];
}

function encodeText(text: string, tokenToId: Map<string, number>) {
  return tokenize(text).map((token) => tokenToId.get(token) ?? UNKNOWN_TOKEN);
}

async function prepareTensorflow() {
  await tf.setBackend("cpu");
  await tf.ready();
}

export async function trainLanguageModel(
  examples: TrainingExample[],
  options: { epochs?: number; modelPath?: string } = {},
) {
  if (!examples.length) {
    throw new Error("Training requires at least one question-and-answer example.");
  }
  for (const example of examples) {
    if (!example.question.trim() || !example.answer.trim()) {
      throw new Error("Each training example needs a question and an answer.");
    }
  }

  await prepareTensorflow();
  const vocabulary = vocabularyFor(examples);
  const tokenToId = new Map(vocabulary.map((token, id) => [token, id]));
  const inputs: number[][] = [];
  const targets: number[] = [];

  for (const example of examples) {
    const question = example.question.trim().toLowerCase();
    const language = /[\u0400-\u04ff]/i.test(question) ? "uk" : "en";
    const prompt = encodeText(
      `Language: ${language}\nUser: ${question}\nAssistant: `,
      tokenToId,
    );
    const sequence = [
      ...prompt,
      ...encodeText(example.answer.trim(), tokenToId),
      END_TOKEN,
    ];
    for (let targetIndex = prompt.length; targetIndex < sequence.length; targetIndex += 1) {
      const context = sequence.slice(
        Math.max(0, targetIndex - CONTEXT_SIZE),
        targetIndex,
      );
      while (context.length < CONTEXT_SIZE) context.unshift(PAD_TOKEN);
      inputs.push(context);
      targets.push(sequence[targetIndex]);
    }
  }

  const epochs = options.epochs ?? Number(process.env.TINY_LLM_EPOCHS ?? 50);
  if (!Number.isSafeInteger(epochs) || epochs < 1) {
    throw new Error("Training epochs must be a positive integer.");
  }
  const model = createModel(vocabulary.length);
  model.compile({ optimizer: tf.train.adam(0.02), loss: "categoricalCrossentropy" });
  const inputTensor = tf.tensor2d(inputs, [inputs.length, CONTEXT_SIZE], "int32");
  const targetIds = tf.tensor1d(targets, "int32");
  const targetTensor = tf.oneHot(targetIds, vocabulary.length);

  try {
    await model.fit(inputTensor, targetTensor, {
      epochs,
      batchSize: 512,
      shuffle: true,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (options.modelPath) return;
          console.log(
            `Training epoch ${epoch + 1}/${epochs} - loss ${(logs?.loss ?? 0).toFixed(4)}`,
          );
        },
      },
    });

    const checkpoint: ModelCheckpoint = {
      version: 1,
      vocabulary,
      weights: await Promise.all(
        model.getWeights().map(async (weight) => ({
          shape: weight.shape,
          values: Array.from(await weight.data()),
        })),
      ),
    };
    const modelPath = options.modelPath ?? MODEL_PATH;
    await mkdir(dirname(modelPath), { recursive: true });
    await writeFile(modelPath, JSON.stringify(checkpoint), "utf8");
    return { modelPath, vocabularySize: vocabulary.length };
  } finally {
    inputTensor.dispose();
    targetIds.dispose();
    targetTensor.dispose();
    model.dispose();
  }
}

async function loadModel(modelPath = MODEL_PATH): Promise<LoadedModel> {
  try {
    await prepareTensorflow();
    const raw: unknown = JSON.parse(await readFile(modelPath, "utf8"));
    if (
      typeof raw !== "object" ||
      raw === null ||
      !("version" in raw) ||
      raw.version !== 1 ||
      !("vocabulary" in raw) ||
      !Array.isArray(raw.vocabulary) ||
      !raw.vocabulary.every((item) => typeof item === "string") ||
      !("weights" in raw) ||
      !Array.isArray(raw.weights)
    ) {
      throw new Error("Invalid model checkpoint.");
    }

    const checkpoint = raw as ModelCheckpoint;
    const model = createModel(checkpoint.vocabulary.length);
    const weights = checkpoint.weights.map((weight) =>
      tf.tensor(weight.values, weight.shape),
    );
    model.setWeights(weights);
    weights.forEach((weight) => weight.dispose());
    return {
      model,
      tokenToId: new Map(
        checkpoint.vocabulary.map((token, id) => [token, id]),
      ),
      vocabulary: checkpoint.vocabulary,
    };
  } catch (error) {
    if (error instanceof LlmModelUnavailableError) throw error;
    throw new LlmModelUnavailableError();
  }
}

let loadedModelPromise: Promise<LoadedModel> | undefined;

async function getLoadedModel() {
  if (!loadedModelPromise) {
    loadedModelPromise = loadModel();
    loadedModelPromise.catch(() => {
      loadedModelPromise = undefined;
    });
  }
  return loadedModelPromise;
}

function disposePrediction(prediction: tf.Tensor | tf.Tensor[]) {
  if (Array.isArray(prediction)) prediction.forEach((tensor) => tensor.dispose());
  else prediction.dispose();
}

export async function generateAssistantMessage(
  messages: ChatMessage[],
): Promise<string> {
  const question = [...messages]
    .reverse()
    .find((message) => message.role === "user")?.content;
  if (!question?.trim()) {
    throw new Error("A user question is required.");
  }

  const { model, tokenToId, vocabulary } = await getLoadedModel();
  const normalizedQuestion = question
    .trim()
    .toLowerCase()
    .replace(/[!?.,\s]+$/g, "")
    .slice(0, 120);
  const language = /[\u0400-\u04ff]/i.test(normalizedQuestion) ? "uk" : "en";
  const prompt = `Language: ${language}\nUser: ${normalizedQuestion}\nAssistant: `;
  const tokens = encodeText(prompt, tokenToId);
  const generated: string[] = [];

  for (let index = 0; index < MAX_GENERATED_TOKENS; index += 1) {
    const context = tokens.slice(-CONTEXT_SIZE);
    while (context.length < CONTEXT_SIZE) context.unshift(PAD_TOKEN);
    const input = tf.tensor2d([context], [1, CONTEXT_SIZE], "int32");
    const prediction = model.predict(input) as tf.Tensor2D;
    input.dispose();

    const probabilities = prediction.dataSync();
    let nextToken = PAD_TOKEN;
    let highestProbability = Number.NEGATIVE_INFINITY;
    for (let token = 0; token < vocabulary.length; token += 1) {
      const probability =
        token === PAD_TOKEN || token === UNKNOWN_TOKEN
          ? Number.NEGATIVE_INFINITY
          : probabilities[token];
      if (probability > highestProbability) {
        highestProbability = probability;
        nextToken = token;
      }
    }
    disposePrediction(prediction);

    if (nextToken === END_TOKEN || nextToken === PAD_TOKEN) break;
    const token = vocabulary[nextToken];
    if (!token) break;
    if (token === "\n") break;
    generated.push(token);
    tokens.push(nextToken);
  }

  const answer = generated.join("").trim();
  if (!answer) {
    throw new LlmModelUnavailableError();
  }
  return answer;
}

export async function trainBundledDataset() {
  const data: unknown = JSON.parse(await readFile(TRAINING_EXAMPLES_PATH, "utf8"));
  if (
    !Array.isArray(data) ||
    !data.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "question" in item &&
        typeof item.question === "string" &&
        "answer" in item &&
        typeof item.answer === "string",
    )
  ) {
    throw new Error("Training data must be an array of question-and-answer examples.");
  }
  loadedModelPromise = undefined;
  return trainLanguageModel(data);
}
