// ABOUTME: Reviews view: aggregates books that have a review, sorted by personal rating.
// ABOUTME: Read-only presentation; editing happens in the book detail view.
import { setIcon } from "obsidian";
import type { Book } from "../types";
import { BookDataService } from "../services/BookDataService";
import { createStarRating } from "../components/StarRating";

export interface ReviewsViewOptions {
	service: BookDataService;
	onBookClick: (book: Book) => void;
}

export function renderReviews(container: HTMLElement, opts: ReviewsViewOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--reviews";

	const h1 = document.createElement("h1");
	h1.className = "bkv-view__title";
	h1.textContent = "My Reviews";
	container.appendChild(h1);

	const reviewed = opts.service.books
		.filter((b) => b.review && b.review.trim().length > 0)
		.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

	if (reviewed.length === 0) {
		const empty = document.createElement("div");
		empty.className = "bkv-empty";
		const iconEl = document.createElement("div");
		iconEl.className = "bkv-empty__icon";
		setIcon(iconEl, "file-text");
		const p = document.createElement("p");
		p.textContent = "No reviews yet. Open a book and write your thoughts.";
		empty.appendChild(iconEl);
		empty.appendChild(p);
		container.appendChild(empty);
		return;
	}

	const count = document.createElement("p");
	count.className = "bkv-text-muted";
	count.textContent = `${reviewed.length} review${reviewed.length !== 1 ? "s" : ""}`;
	container.appendChild(count);

	const list = document.createElement("div");
	list.className = "bkv-reviews-list";

	reviewed.forEach((book, i) => {
		const card = document.createElement("div");
		card.className = "bkv-review-card";
		card.style.animationDelay = `${i * 40}ms`;

		const left = document.createElement("div");
		left.className = "bkv-review-card__left";
		if (book.cover) {
			const img = document.createElement("img");
			img.src = book.cover;
			img.alt = book.title;
			img.className = "bkv-review-card__cover";
			img.loading = "lazy";
			left.appendChild(img);
		}

		const right = document.createElement("div");
		right.className = "bkv-review-card__right";

		const header = document.createElement("div");
		header.className = "bkv-review-card__header";
		const title = document.createElement("h3");
		title.className = "bkv-review-card__title";
		title.textContent = book.title;
		header.appendChild(title);
		const meta = document.createElement("span");
		meta.className = "bkv-text-muted";
		const parts: string[] = [];
		if (book.author.length) parts.push(book.author.join(", "));
		if (book.year) parts.push(String(book.year));
		meta.textContent = parts.join(" · ");
		header.appendChild(meta);
		right.appendChild(header);

		if (book.rating != null) {
			right.appendChild(createStarRating({ value: book.rating, readonly: true, size: "sm" }));
		}

		const reviewText = document.createElement("p");
		reviewText.className = "bkv-review-card__text";
		reviewText.textContent = book.review ?? "";
		right.appendChild(reviewText);

		const readMore = document.createElement("button");
		readMore.className = "bkv-btn bkv-btn--ghost bkv-btn--sm";
		readMore.textContent = "View book";
		readMore.addEventListener("click", () => opts.onBookClick(book));
		right.appendChild(readMore);

		card.appendChild(left);
		card.appendChild(right);
		list.appendChild(card);
	});

	container.appendChild(list);
}
