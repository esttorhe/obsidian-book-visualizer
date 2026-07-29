// ABOUTME: Placeholder skeleton card/grid shown while content is being prepared.
// ABOUTME: Purely decorative; mirrors the book card layout for a smooth first paint.
export function createSkeletonCard(): HTMLElement {
	const card = document.createElement("div");
	card.className = "bkv-card bkv-skeleton";
	card.innerHTML = `
		<div class="bkv-card__cover bkv-skeleton__cover"></div>
		<div class="bkv-card__body">
			<div class="bkv-skeleton__line bkv-skeleton__line--title"></div>
			<div class="bkv-skeleton__line bkv-skeleton__line--sub"></div>
			<div class="bkv-skeleton__line bkv-skeleton__line--short"></div>
		</div>
	`;
	return card;
}

export function createSkeletonGrid(count = 12): HTMLElement {
	const grid = document.createElement("div");
	grid.className = "bkv-grid bkv-grid--large";
	for (let i = 0; i < count; i++) {
		const card = createSkeletonCard();
		card.style.animationDelay = `${i * 50}ms`;
		grid.appendChild(card);
	}
	return grid;
}
