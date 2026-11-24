import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import Calculator from "../ui/Calculator";

describe("Calculator Component", () => {
	test("handles number button clicks", () => {
		render(<Calculator />);
		const button1 = screen.getByText("1");
		const button2 = screen.getByText("2");

		fireEvent.click(button1);
		fireEvent.click(button2);

		expect(screen.getByText("12")).toBeInTheDocument();
	});

	test("handles percentage calculations", () => {
		render(<Calculator />);
		const button2 = screen.getByText("2");
		const button0 = screen.getByRole("button", { name: "0" });
		const buttonPercent = screen.getByText("%");
		const button1 = screen.getByText("1");
		const equalsButton = screen.getByText("=");

		fireEvent.click(button2);
		fireEvent.click(button0);
		fireEvent.click(button0);
		fireEvent.click(buttonPercent);
		fireEvent.click(button1);
		fireEvent.click(button0);
		fireEvent.click(equalsButton);

		expect(screen.getByText("20")).toBeInTheDocument();
	});

	test("handles operation button clicks", () => {
		render(<Calculator />);
		const button1 = screen.getByText("6");
		const buttonPlus = screen.getByText("+");
		const button2 = screen.getByText("7");
		const equalsButton = screen.getByText("=");

		fireEvent.click(button1);
		fireEvent.click(buttonPlus);
		fireEvent.click(button2);
		fireEvent.click(equalsButton);

		expect(screen.getByText("13")).toBeInTheDocument();
	});

	test("supports decimals, sign changes, and deleting the last digit", () => {
		render(<Calculator />);
		expect(
			screen
				.getByRole("button", { name: "Delete last digit" })
				.querySelector(".material-icons"),
		).toHaveTextContent("backspace");
		fireEvent.click(screen.getByText("1"));
		fireEvent.click(screen.getByRole("button", { name: "Decimal point" }));
		fireEvent.click(screen.getByText("2"));
		fireEvent.click(screen.getByRole("button", { name: "Change sign" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("-1.2");

		fireEvent.click(screen.getByRole("button", { name: "Delete last digit" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("-1.");
	});

	test("calculates powers and square roots", () => {
		render(<Calculator />);
		fireEvent.click(screen.getByText("2"));
		fireEvent.click(screen.getByRole("button", { name: "Power" }));
		fireEvent.click(screen.getByText("3"));
		fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("8");

		fireEvent.click(screen.getByRole("button", { name: "Square root" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("2.82842712475");
	});

	test("evaluates trigonometric functions in degrees and radians", () => {
		render(<Calculator />);
		fireEvent.click(screen.getByText("9"));
		fireEvent.click(screen.getByText("0"));
		fireEvent.click(screen.getByRole("button", { name: "sin" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("1");

		fireEvent.click(screen.getByRole("button", { name: /Angle mode/ }));
		fireEvent.click(screen.getByRole("button", { name: "Clear calculator" }));
		fireEvent.click(screen.getByText("1"));
		fireEvent.click(screen.getByRole("button", { name: "tan" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("1.55740772465");
	});

	test("calculates base-10 logarithms and reports invalid domains", () => {
		render(<Calculator />);
		fireEvent.click(screen.getByText("1"));
		fireEvent.click(screen.getByText("0"));
		fireEvent.click(screen.getByText("0"));
		fireEvent.click(screen.getByRole("button", { name: "Base-10 logarithm" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("2");

		fireEvent.click(screen.getByRole("button", { name: "Clear calculator" }));
		fireEvent.click(screen.getByText("1"));
		fireEvent.click(screen.getByRole("button", { name: "Change sign" }));
		fireEvent.click(screen.getByRole("button", { name: "Square root" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("Error");

		fireEvent.click(screen.getByRole("button", { name: "Clear calculator" }));
		fireEvent.click(screen.getByRole("button", { name: "Base-10 logarithm" }));
		expect(screen.getByLabelText("Display")).toHaveTextContent("Error");
	});
});
