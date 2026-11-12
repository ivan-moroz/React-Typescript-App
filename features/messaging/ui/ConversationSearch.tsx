import type { MessagingUser } from "../model/types";
import type { ChangeEvent } from "react";

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
  const onQueryChangeInput = (event: ChangeEvent<HTMLInputElement>) => {
    onQueryChange(event.target.value);
  };
  const onStartConversation = (recipient: MessagingUser) => () => {
    onStart(recipient);
  };

  return (
    <>
      <label className="messaging-search">
        Start a conversation
        <input
          type="search"
          placeholder="Search users by name"
          maxLength={100}
          value={query}
          onChange={onQueryChangeInput}
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
              onClick={onStartConversation(recipient)}
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
