export default function RouteLoading({ label = "Loading page…" }: { label?: string }) {
	return (
		<div className="route-loading" role="status" aria-live="polite">
			<span className="route-loading-spinner" aria-hidden="true" />
			<span>{label}</span>
		</div>
	);
}
