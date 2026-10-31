import { formatUnreadCount } from "../../../backend/features/messaging/utils/utils";
import { useMessagingUnread } from "./hooks/useMessagingUnread";

// The SPA owns only a navigation link; the inbox and chat render in Next.js.
export default function Messaging() {
	const unread = useMessagingUnread();
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
					{formatUnreadCount(unread)}
				</span>
			)}
		</a>
	);
}
