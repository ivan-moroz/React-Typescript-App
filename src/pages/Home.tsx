export default function HomePage() {
	return (
		<div className="app">
			<h1>React TypeScript Next.js application</h1>
			<p>
				This app features lazy loading of JavaScript, a router, 
				several simple components written in React and TypeScript,
				covered by Jest tests, added storybook. Some parts are generated
				using AI. Next.js + PostgreSQL + Prisma is used for the backend.				
			</p>
			<p>
				Added User Management and Asset Management functionality.
				Users can upload any type of file as an asset and provide metadata such as asset name, 
				description, and access level (Internal or Public).
				Public assets are visible to all users.
				Internal assets are visible only to the user who uploaded them.
			</p>
			<p>
				Added Messaging functionality. Users can send messages to each other.
				Messages are stored in the database and can be viewed in the messaging panel.
				Users can delete their own messages and conversations.
			</p>
		</div>
	);
}
