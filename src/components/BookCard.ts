// ABOUTME: Renders a single book as a card in grid/compact/list/poster layouts.
// ABOUTME: Shows cover, status badges, scores, a reading-progress bar and quick actions.
import { setIcon } from "obsidian";
import type { Book } from "../types";
import { createStarRating } from "./StarRating";
import { StatsEngine } from "../services/StatsEngine";
import { readingProgress } from "../services/frontmatter";

const stats = new StatsEngine();

export type CardSize = "normal" | "compact" | "list" | "poster";

export interface BookCardOptions {
	book: Book;
	size?: CardSize;
	onClick?: (book: Book) => void;
	onFavToggle?: (book: Book) => void;
	onToggleRead?: (book: Book) => void;
}

const STATUS_ICON: Record<Book["status"], string> = {
	"to-read": "bookmark",
	reading: "book-open",
	read: "check-circle",
	dnf: "x-circle",
};

const STATUS_LABEL: Record<Book["status"], string> = {
	"to-read": "To read",
	reading: "Reading",
	read: "Read",
	dnf: "Did not finish",
};

export function createBookCard(opts: BookCardOptions): HTMLElement {
	const { book, size = "normal", onClick, onFavToggle, onToggleRead } = opts;

	const card = document.createElement("div");
	card.className = `bkv-card bkv-card--${size} bkv-card--status-${book.status}`;
	card.dataset.id = book.id;

	if (size === "list") {
		renderListCard(card, book, onClick, onFavToggle, onToggleRead);
	} else {
		renderGridCard(card, book, size, onClick, onFavToggle, onToggleRead);
	}

	return card;
}

function buildCover(book: Book): HTMLElement {
	const poster = document.createElement("div");
	poster.className = "bkv-card__cover";
	if (book.cover) {
		const img = document.createElement("img");
		img.src = book.cover;
		img.alt = book.title;
		img.loading = "lazy";
		img.className = "bkv-card__img";
		img.onerror = () => { img.style.display = "none"; poster.classList.add("bkv-card__cover--fallback"); };
		poster.appendChild(img);
	} else {
		poster.classList.add("bkv-card__cover--fallback");
		const fb = document.createElement("span");
		fb.className = "bkv-card__cover-title";
		fb.textContent = book.title;
		poster.appendChild(fb);
	}
	return poster;
}

function renderGridCard(
	card: HTMLElement,
	book: Book,
	size: CardSize,
	onClick?: (b: Book) => void,
	onFavToggle?: (b: Book) => void,
	onToggleRead?: (b: Book) => void
): void {
	const poster = buildCover(book);

	if (book.favorite) {
		const fav = document.createElement("span");
		fav.className = "bkv-card__badge bkv-card__badge--fav";
		setIcon(fav, "heart");
		poster.appendChild(fav);
	}

	const statusBadge = document.createElement("span");
	statusBadge.className = `bkv-card__badge bkv-card__badge--status bkv-card__badge--${book.status}`;
	statusBadge.title = STATUS_LABEL[book.status];
	setIcon(statusBadge, STATUS_ICON[book.status]);
	poster.appendChild(statusBadge);

	// Reading progress bar (only while reading with a known percentage)
	const progress = readingProgress(book);
	if (book.status === "reading" && progress > 0) {
		const bar = document.createElement("div");
		bar.className = "bkv-card__progress";
		const fill = document.createElement("div");
		fill.className = "bkv-card__progress-fill";
		fill.style.width = `${Math.round(progress * 100)}%`;
		bar.appendChild(fill);
		poster.appendChild(bar);
	}

	if (size !== "compact" && size !== "poster") {
		const overlay = document.createElement("div");
		overlay.className = "bkv-card__overlay";

		const synopsis = document.createElement("p");
		synopsis.className = "bkv-card__synopsis";
		synopsis.textContent = book.synopsis ?? "";
		overlay.appendChild(synopsis);

		const actions = document.createElement("div");
		actions.className = "bkv-card__actions";

		const btnFav = document.createElement("button");
		btnFav.className = `bkv-btn bkv-btn--icon${book.favorite ? " bkv-btn--active" : ""}`;
		btnFav.title = book.favorite ? "Remove from favorites" : "Add to favorites";
		setIcon(btnFav, "heart");
		btnFav.addEventListener("click", (e) => { e.stopPropagation(); onFavToggle?.(book); });

		const isRead = book.status === "read";
		const btnRead = document.createElement("button");
		btnRead.className = `bkv-btn bkv-btn--icon${isRead ? " bkv-btn--active" : ""}`;
		btnRead.title = isRead ? "Mark as unread" : "Mark as read";
		setIcon(btnRead, isRead ? "check-circle" : "circle");
		btnRead.addEventListener("click", (e) => { e.stopPropagation(); onToggleRead?.(book); });

		actions.appendChild(btnFav);
		actions.appendChild(btnRead);
		overlay.appendChild(actions);
		poster.appendChild(overlay);
	}

	card.appendChild(poster);

	if (size === "poster") {
		card.addEventListener("click", () => onClick?.(book));
		return;
	}

	const body = document.createElement("div");
	body.className = "bkv-card__body";

	const titleEl = document.createElement("h3");
	titleEl.className = "bkv-card__title";
	titleEl.textContent = book.title;
	body.appendChild(titleEl);

	if (size !== "compact") {
		const meta = document.createElement("div");
		meta.className = "bkv-card__meta";
		const parts: string[] = [];
		if (book.author.length) parts.push(book.author.join(", "));
		if (book.year) parts.push(String(book.year));
		meta.textContent = parts.join(" · ");
		body.appendChild(meta);

		if (book.series) {
			const series = document.createElement("div");
			series.className = "bkv-card__series";
			series.textContent = book.seriesNumber != null ? `${book.series} #${book.seriesNumber}` : book.series;
			body.appendChild(series);
		}

		const scores = document.createElement("div");
		scores.className = "bkv-card__scores";
		if (book.scoreGoodreads != null) {
			const gr = document.createElement("span");
			gr.className = "bkv-score bkv-score--goodreads";
			gr.innerHTML = `<span class="bkv-score__src">GR</span>${book.scoreGoodreads.toFixed(2)}`;
			scores.appendChild(gr);
		}
		if (book.pages) {
			const p = document.createElement("span");
			p.className = "bkv-score bkv-score--pages";
			p.innerHTML = `<span class="bkv-score__src">Pages</span>${book.pages}`;
			scores.appendChild(p);
		}
		if (scores.children.length) body.appendChild(scores);

		if (book.rating != null) {
			body.appendChild(createStarRating({ value: book.rating, readonly: true, size: "sm" }));
		}

		if (book.genre.length) {
			const genres = document.createElement("div");
			genres.className = "bkv-card__genres";
			book.genre.slice(0, 3).forEach((g) => {
				const chip = document.createElement("span");
				chip.className = "bkv-chip";
				chip.textContent = g;
				genres.appendChild(chip);
			});
			body.appendChild(genres);
		}
	} else {
		const meta = document.createElement("div");
		meta.className = "bkv-card__meta";
		const parts: string[] = [];
		if (book.author.length) parts.push(book.author[0]);
		if (book.scoreGoodreads != null) parts.push(book.scoreGoodreads.toFixed(2));
		meta.textContent = parts.join(" · ");
		body.appendChild(meta);
	}

	card.appendChild(body);
	card.addEventListener("click", () => onClick?.(book));
}

function renderListCard(
	card: HTMLElement,
	book: Book,
	onClick?: (b: Book) => void,
	onFavToggle?: (b: Book) => void,
	onToggleRead?: (b: Book) => void
): void {
	const posterWrap = buildCover(book);
	posterWrap.classList.add("bkv-card__cover--list");

	const info = document.createElement("div");
	info.className = "bkv-card__info";

	const header = document.createElement("div");
	header.className = "bkv-card__header";

	const title = document.createElement("h3");
	title.className = "bkv-card__title";
	title.textContent = book.title;
	header.appendChild(title);

	const actions = document.createElement("div");
	actions.className = "bkv-card__actions";

	const btnFav = document.createElement("button");
	btnFav.className = `bkv-btn bkv-btn--icon${book.favorite ? " bkv-btn--active" : ""}`;
	setIcon(btnFav, "heart");
	btnFav.addEventListener("click", (e) => { e.stopPropagation(); onFavToggle?.(book); });

	const isRead = book.status === "read";
	const btnRead = document.createElement("button");
	btnRead.className = `bkv-btn bkv-btn--icon${isRead ? " bkv-btn--active" : ""}`;
	btnRead.title = isRead ? "Mark as unread" : "Mark as read";
	setIcon(btnRead, isRead ? "check-circle" : "circle");
	btnRead.addEventListener("click", (e) => { e.stopPropagation(); onToggleRead?.(book); });

	actions.appendChild(btnFav);
	actions.appendChild(btnRead);
	header.appendChild(actions);
	info.appendChild(header);

	const meta = document.createElement("div");
	meta.className = "bkv-card__meta";
	const metaParts: string[] = [];
	if (book.author.length) metaParts.push(book.author.join(", "));
	if (book.year) metaParts.push(String(book.year));
	if (book.pages) metaParts.push(stats.formatBookPages(book.pages));
	metaParts.push(STATUS_LABEL[book.status]);
	meta.textContent = metaParts.join(" · ");
	info.appendChild(meta);

	if (book.series) {
		const series = document.createElement("div");
		series.className = "bkv-card__series";
		series.textContent = book.seriesNumber != null ? `${book.series} #${book.seriesNumber}` : book.series;
		info.appendChild(series);
	}

	const scores = document.createElement("div");
	scores.className = "bkv-card__scores";
	if (book.scoreGoodreads != null) {
		const s = document.createElement("span");
		s.className = "bkv-score bkv-score--goodreads";
		s.innerHTML = `<span class="bkv-score__src">GR</span>${book.scoreGoodreads.toFixed(2)}`;
		scores.appendChild(s);
	}
	if (book.rating != null) {
		scores.appendChild(createStarRating({ value: book.rating, readonly: true, size: "sm" }));
	}
	if (scores.children.length) info.appendChild(scores);

	if (book.genre.length) {
		const genres = document.createElement("div");
		genres.className = "bkv-card__genres";
		book.genre.slice(0, 4).forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "bkv-chip";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	if (book.synopsis) {
		const syn = document.createElement("p");
		syn.className = "bkv-card__synopsis bkv-card__synopsis--list";
		syn.textContent = book.synopsis;
		info.appendChild(syn);
	}

	card.appendChild(posterWrap);
	card.appendChild(info);
	card.addEventListener("click", () => onClick?.(book));
}
