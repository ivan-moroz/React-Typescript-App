import type { MessagingUser } from "../types/types";

export default function ConversationSearch({
  query,
  users,
  searching,
  error,
  starting,
  active,
  onQueryChange,
  onStart,
}: {
  query: string;
  users: MessagingUser[];
  searching: boolean;
  error: string;
  starting: boolean;
  active: boolean;
  onQueryChange: (query: string) => void;
  onStart: (recipient: MessagingUser) => void;
}) {
  return (
    <>
      <label className="messaging-search">
        Start a conversation
        <input
          type="search"
          placeholder="Search users by name"
          maxLength={100}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoFocus={active}
        />
      </label>
      {query.trim().length >= 2 && (
        <div className="messaging-search-results">
          {searching ? (
            <p role="status">Searching…</p>
          ) : users.length === 0 && !error ? (
            <p>No users found.</p>
          ) : null}
          {error && <p role="alert">{error}</p>}
          {users.map((recipient) => (
            <button
              type="button"
              key={recipient.id}
              disabled={starting}
              onClick={() => onStart(recipient)}
            >
              {recipient.name}
              <span>Start chat</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
