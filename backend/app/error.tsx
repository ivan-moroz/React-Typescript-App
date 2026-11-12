"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="app route-feedback" role="alert">
      <h1>Something went wrong</h1>
      <p>The page could not be loaded. Try again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
