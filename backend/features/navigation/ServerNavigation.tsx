type ServerNavigationProps = {
  pathname: string;
  from: string;
  user: { name: string } | null;
  unreadCount: number;
};

const links = [
  ["/", "Home"],
  ["/assets", "Library"],
  ["/users", "People"],
  ["/messaging", "Messages"],
  ["/todo", "ToDo"],
  ["/select", "Select"],
  ["/calculator", "Calculator"],
  ["/puzzle", "Puzzle"],
] as const;

export default function ServerNavigation({
  pathname,
  from,
  user,
  unreadCount,
}: ServerNavigationProps) {
  return (
    <nav className="app-navigation">
      <div className="navigation-inner">
        <a href="/" className="brand-mark" aria-label="Studio home">
          <span className="brand-symbol">V</span>
          <span>STUDIO</span>
        </a>
        <div className="navigation-links">
          {links.map(([href, label]) => (
            <a key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
              {label}
            </a>
          ))}
        </div>
        <div className="header-account">
          {user ? (
            <div className="authenticated-user">
              <b>{user.name}</b>
              <form action="/api/auth/logout" method="post">
                <input type="hidden" name="from" value={from} />
                <button type="submit">Log out</button>
              </form>
            </div>
          ) : (
            <a href={`/login?from=${encodeURIComponent(from)}`}>Login</a>
          )}
          <a
            href="/messaging"
            className="messages-link"
            aria-label={`Messages${unreadCount ? `, ${unreadCount} unread` : ""}`}
            data-open-messaging-panel
          >
            <span className="material-icons" aria-hidden="true">chat_bubble_outline</span>
            {unreadCount > 0 && (
              <span className="messages-link-badge">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </a>
        </div>
      </div>
    </nav>
  );
}
