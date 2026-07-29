// ABOUTME: Interactive 10-point star rating widget with 0.5-step half-star support.
// ABOUTME: Renders 10 stars where each right/left click zone maps to whole/half points.
export interface StarRatingOptions {
	value?: number; // 1–10, supports 0.5 steps (e.g. 9.5, 8.5)
	readonly?: boolean;
	size?: "sm" | "md" | "lg";
	onChange?: (value: number) => void;
}

export function createStarRating(opts: StarRatingOptions): HTMLElement {
	const { readonly = false, size = "md", onChange } = opts;
	let currentValue = opts.value;

	const container = document.createElement("div");
	container.className = `bkv-stars bkv-stars--${size}${readonly ? " bkv-stars--readonly" : ""}`;

	const STARS = 10;

	const getStarClass = (pos: number, displayVal: number | undefined): string => {
		const v = displayVal ?? 0;
		const full = Math.floor(v);
		const halfPos = Math.ceil(v);
		if (pos <= full) return "bkv-star bkv-star--filled";
		if (pos === halfPos && halfPos > full) return "bkv-star bkv-star--half";
		return "bkv-star";
	};

	const updateDisplay = (displayVal?: number) => {
		container.querySelectorAll(".bkv-star").forEach((s, idx) => {
			(s as HTMLElement).className = getStarClass(idx + 1, displayVal);
		});
	};

	const updateLabel = (v: number) => {
		let label = container.querySelector(".bkv-stars__label");
		if (!label) {
			label = document.createElement("span");
			label.className = "bkv-stars__label";
			container.appendChild(label);
		}
		label.textContent = `${v}/10`;
	};

	for (let i = 1; i <= STARS; i++) {
		const star = document.createElement("span");
		star.className = getStarClass(i, currentValue);
		star.textContent = "★";

		if (!readonly) {
			const leftZone = document.createElement("span");
			leftZone.className = "bkv-star__zone bkv-star__zone--left";
			leftZone.addEventListener("mouseenter", () => updateDisplay(Math.max(1, i - 0.5)));
			leftZone.addEventListener("click", (e) => {
				e.stopPropagation();
				const v = Math.max(1, i - 0.5);
				currentValue = v;
				onChange?.(v);
				updateDisplay(v);
				star.animate(
					[{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
					{ duration: 250, easing: "ease-out" }
				);
				updateLabel(v);
			});

			const rightZone = document.createElement("span");
			rightZone.className = "bkv-star__zone bkv-star__zone--right";
			rightZone.addEventListener("mouseenter", () => updateDisplay(i));
			rightZone.addEventListener("click", (e) => {
				e.stopPropagation();
				const v = i;
				currentValue = v;
				onChange?.(v);
				updateDisplay(v);
				star.animate(
					[{ transform: "scale(1)" }, { transform: "scale(1.4)" }, { transform: "scale(1)" }],
					{ duration: 300, easing: "ease-out" }
				);
				updateLabel(v);
			});

			star.appendChild(leftZone);
			star.appendChild(rightZone);
		}

		container.appendChild(star);
	}

	if (!readonly) {
		container.addEventListener("mouseleave", () => updateDisplay(currentValue));
	}

	if (currentValue != null) {
		const label = document.createElement("span");
		label.className = "bkv-stars__label";
		label.textContent = `${currentValue}/10`;
		container.appendChild(label);
	}

	return container;
}
