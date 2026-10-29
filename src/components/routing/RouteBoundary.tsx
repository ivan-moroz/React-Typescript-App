import { ERROR_MESSAGES } from "../../constants/errors";
import { Component, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import RouteLoading from "./RouteLoading";

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
					<h1>{ERROR_MESSAGES.PAGE_LOAD_FAILED}</h1>
					<p>{ERROR_MESSAGES.PAGE_RETRY_HINT}</p>
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
				fallback={<RouteLoading />}
			>
				{children}
			</Suspense>
		</RouteErrorBoundary>
	);
}
