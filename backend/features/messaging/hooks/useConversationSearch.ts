import { useEffect, useState } from "react";
import { fetchData } from "../../../../src/utils/fetchData";
import type { MessagingUser } from "../types/types";

export function useConversationSearch(
  active: boolean,
  onExpired: () => void,
) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<MessagingUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    setUsers([]);
    setError("");
    if (!active || trimmed.length < 2) {
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(async () => {
      const result = await fetchData<MessagingUser[]>(
        `/api/messaging/users?q=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setSearching(false);
      if (result.success) setUsers(result.data);
      else if (result.error.status === 401) onExpired();
      else setError(result.error.message);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, onExpired, active]);

  return {
    query,
    setQuery,
    users,
    searching,
    searchError: error,
    setSearchError: setError,
  };
}
