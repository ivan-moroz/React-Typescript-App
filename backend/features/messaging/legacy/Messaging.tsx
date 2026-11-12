import { formatUnreadCount } from "../../../features/messaging/utils/utils";
import { useMessagingUnread } from "./hooks/useMessagingUnread";

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
