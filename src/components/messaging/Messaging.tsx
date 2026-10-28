import { useEffect, useState } from "react";
import { fetchData } from "../../utils/fetchData";

// The SPA owns only a navigation link; the inbox and chat render in Next.js.
export default function Messaging() {
	const [unread, setUnread] = useState(0);
	useEffect(() => {
		let stopped = false;
		let busy = false;
		let unauthorized = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		let controller: AbortController | undefined;
		const poll = async () => {
			if (stopped || busy || unauthorized || document.hidden) return;
			busy = true;
			controller = new AbortController();
			const result = await fetchData<{ unreadCount: number }>(
				"/api/messaging/unread",
				{ signal: controller.signal },
			);
			busy = false;
			if (stopped) return;
			if (controller.signal.aborted) {
				if (!document.hidden) timer = setTimeout(poll, 15000);
				return;
			}
			if (result.success) setUnread(result.data.unreadCount ?? 0);
			else if (result.error.status === 401) unauthorized = true;
			if (!unauthorized && !document.hidden)
				timer = setTimeout(poll, 15000);
		};
		const visible = () => {
			clearTimeout(timer);
			if (document.hidden) controller?.abort();
			else void poll();
		};
		void poll();
		document.addEventListener("visibilitychange", visible);
		return () => {
			stopped = true;
			controller?.abort();
			clearTimeout(timer);
			document.removeEventListener("visibilitychange", visible);
		};
	}, []);
	return (
		<a
			href="/messaging"
			className="messages-link"
			aria-label={`Messages${unread ? `, ${unread} unread` : ""}`}
		>
			<span className="material-icons" aria-hidden="true">
				chat_bubble_outline
			</span>
			{unread > 0 && (
				<span className="messages-link-badge" aria-hidden="true">
					{unread > 99 ? "99+" : unread}
				</span>
			)}
		</a>
	);
}
