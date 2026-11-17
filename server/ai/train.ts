import { trainBundledDataset } from "./languageModel";

const result = await trainBundledDataset();
console.log(
  `Trained model with vocabulary size ${result.vocabularySize} and saved it to ${result.modelPath}`,
);
