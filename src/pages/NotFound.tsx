import { ERROR_MESSAGES } from "../constants/errors";
export default function NotFoundPage() {
  return (
    <main className="app route-feedback">
      <p>404</p>
      <h1>{ERROR_MESSAGES.PAGE_NOT_FOUND}</h1>
      <p>{ERROR_MESSAGES.PAGE_NOT_FOUND_DESCRIPTION}</p>
      <a href="/">Go to Home</a>
    </main>
  );
}
