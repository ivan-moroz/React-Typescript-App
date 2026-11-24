---
name: ai-chat-training
description: Change this project's AI chat endpoint, TensorFlow.js model, training examples, or model training workflow.
---

# Work on AI chat and training

- Inspect `server/api/ai/chat.ts`, `server/ai/languageModel.ts`, `server/ai/train.ts`, `server/ai/training-data.json`, and the AI feature tests before changing behavior.
- Keep model implementation and training server-side. The current TensorFlow.js model runs on CPU and saves its checkpoint under `.models/`; training examples live in `server/ai/training-data.json`.
- Validate training examples and model options through existing model functions. Preserve checkpoint format compatibility or deliberately handle old checkpoints when changing it.
- The `train` package command runs `npx tsx server/ai/train.ts`; Docker also trains during image build. Be mindful that training changes build time and that generated checkpoints should not be committed unless project conventions require it.
- Keep chat request validation, response bounds, and any existing access controls in place. Never expose secrets or internal model files through the API.
- Add focused tests for model or API behavior. Run them and `npx tsc --noEmit --incremental false`; for route changes also run `npm run build:backend`.
