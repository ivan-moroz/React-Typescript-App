const features = [
	{
		title: "Asset library",
		description: "Keep your files and creative work in one place.",
		href: "/assets",
		category: "YOUR LIBRARY",
		className: "feature-card-library",
		icon: "photo_library",
	},
	{
		title: "People",
		description: "Manage your team and keep everyone connected.",
		href: "/users",
		category: "YOUR TEAM",
		className: "feature-card-people",
		icon: "groups",
	},
	{
		title: "Messages",
		description: "Pick up the conversation right where you left off.",
		href: "/messaging",
		category: "STAY IN TOUCH",
		className: "feature-card-messages",
		icon: "forum",
	},
	{
		title: "ToDo",
		description: "Turn your next idea into a finished task.",
		href: "/todo",
		category: "YOUR NEXT MOVE",
		className: "feature-card-todo",
		icon: "task_alt",
	},
	{
		title: "Number puzzle",
		description: "Find the longest chain in your number sequence.",
		href: "/puzzle",
		category: "A QUICK CHALLENGE",
		className: "feature-card-puzzle",
		icon: "extension",
	},
	{
		title: "Calculator",
		description: "A simple tool for the numbers that matter.",
		href: "/calculator",
		category: "HANDY TOOLS",
		className: "feature-card-calculator",
		icon: "calculate",
	},
	{
		title: "Smart select",
		description: "Explore a flexible single and multi-select control.",
		href: "/select",
		category: "INTERACTIVE",
		className: "feature-card-select",
		icon: "tune",
	},
];

export default function HomePage() {
	return (
		<main className="home-catalog">
			<section className="home-hero">
				<div className="hero-copy">
					<p className="hero-eyebrow">YOUR DIGITAL STUDIO</p>
					<h1>Good ideas deserve a place to go.</h1>
					<p>
						Your files, people, conversations, and everyday tools
						are all here. Pick up where you left off.
					</p>
					<a className="hero-button" href="/assets">
						<span className="material-icons" aria-hidden="true">
							play_arrow
						</span>
						Explore your library
					</a>
				</div>
				<div className="hero-art" aria-hidden="true">
					<span className="hero-art-orbit hero-art-orbit-one" />
					<span className="hero-art-orbit hero-art-orbit-two" />
					<span className="hero-art-core">
						<span className="material-icons">auto_awesome</span>
					</span>
				</div>
				<div className="hero-shade" />
			</section>

			<section className="feature-section" aria-labelledby="features-title">
				<div className="feature-heading">
					<div>
						<p className="section-eyebrow">MADE FOR YOUR MOMENT</p>
						<h2 id="features-title">Explore your studio</h2>
					</div>
					<span>Choose what you want to work on</span>
				</div>
				<div className="feature-rail">
					{features.map((feature) => (
						<a
							key={feature.href}
							href={feature.href}
							className={`feature-card ${feature.className}`}
						>
							<div className="feature-card-art" aria-hidden="true">
								<span className="feature-card-glow" />
								<span className="material-icons">
									{feature.icon}
								</span>
							</div>
							<div className="feature-card-copy">
								<p>{feature.category}</p>
								<h3>{feature.title}</h3>
								<span>{feature.description}</span>
							</div>
							<span className="material-icons feature-arrow" aria-hidden="true">
								arrow_forward
							</span>
						</a>
					))}
				</div>
			</section>
		</main>
	);
}
