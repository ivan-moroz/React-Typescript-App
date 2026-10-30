import { lazy } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LoginPage = lazy(() => import("./Login"));

export default function LoginRoute() {
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<LoginPage
			from={location.state?.from ?? new URLSearchParams(location.search).get("from")}
			onNavigate={navigate}
		/>
	);
}
