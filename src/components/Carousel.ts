// ABOUTME: Horizontally scrollable row of book cards with prev/next arrows.
// ABOUTME: Returns an empty node when there are no books so callers can skip rendering.
import type { Book } from "../types";
import { createBookCard } from "./BookCard";

export interface CarouselOptions {
	title: string;
	books: Book[];
	size?: "normal" | "compact" | "poster";
	onCardClick?: (book: Book) => void;
	onFavToggle?: (book: Book) => void;
	onToggleRead?: (book: Book) => void;
	onViewAll?: () => void;
}

export function createCarousel(opts: CarouselOptions): HTMLElement {
	const { title, books, size = "normal", onCardClick, onFavToggle, onToggleRead, onViewAll } = opts;

	if (books.length === 0) {
		return document.createElement("div");
	}

	const section = document.createElement("section");
	section.className = "bkv-carousel";

	const header = document.createElement("div");
	header.className = "bkv-carousel__header";

	const titleEl = document.createElement("h2");
	titleEl.className = "bkv-carousel__title";
	titleEl.textContent = title;
	header.appendChild(titleEl);

	if (onViewAll) {
		const viewAll = document.createElement("button");
		viewAll.className = "bkv-btn bkv-btn--ghost";
		viewAll.textContent = "View all";
		viewAll.addEventListener("click", onViewAll);
		header.appendChild(viewAll);
	}

	section.appendChild(header);

	const wrapper = document.createElement("div");
	wrapper.className = "bkv-carousel__wrapper";

	const track = document.createElement("div");
	track.className = `bkv-carousel__track bkv-carousel__track--${size}`;

	books.forEach((book, i) => {
		const card = createBookCard({ book, size, onClick: onCardClick, onFavToggle, onToggleRead });
		card.style.animationDelay = `${i * 40}ms`;
		track.appendChild(card);
	});

	const btnPrev = document.createElement("button");
	btnPrev.className = "bkv-carousel__arrow bkv-carousel__arrow--prev";
	btnPrev.innerHTML = "‹";
	btnPrev.addEventListener("click", () => {
		track.scrollBy({ left: -(track.clientWidth * 0.8), behavior: "smooth" });
	});

	const btnNext = document.createElement("button");
	btnNext.className = "bkv-carousel__arrow bkv-carousel__arrow--next";
	btnNext.innerHTML = "›";
	btnNext.addEventListener("click", () => {
		track.scrollBy({ left: track.clientWidth * 0.8, behavior: "smooth" });
	});

	const updateArrows = () => {
		btnPrev.classList.toggle("bkv-carousel__arrow--hidden", track.scrollLeft <= 0);
		btnNext.classList.toggle(
			"bkv-carousel__arrow--hidden",
			track.scrollLeft + track.clientWidth >= track.scrollWidth - 4
		);
	};

	track.addEventListener("scroll", updateArrows, { passive: true });
	setTimeout(updateArrows, 100);

	wrapper.appendChild(btnPrev);
	wrapper.appendChild(track);
	wrapper.appendChild(btnNext);
	section.appendChild(wrapper);

	return section;
}
