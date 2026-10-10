import { Component, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type Props = { children: ReactNode };
type State = { hasError: boolean };

class RouteErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	render() {
		if (this.state.hasError) {
			return (
				<section className="route-feedback" role="alert">
					<h1>Unable to load this page</h1>
					<p>Please check your connection and try again.</p>
					{/* Reload to clear React.lazy's cached rejection and request fresh chunks. */}
					<button
						type="button"
						onClick={() => window.location.reload()}
					>
						Try again
					</button>
				</section>
			);
		}

		return this.props.children;
	}
}

export default function RouteBoundary({ children }: Props) {
	const location = useLocation();

	return (
		<RouteErrorBoundary key={location.key}>
			<Suspense
				fallback={
					<div className="route-feedback" role="status">
						Loading page…
					</div>
				}
			>
				{children}
			</Suspense>
		</RouteErrorBoundary>
	);
}
