// ABOUTME: Full-text search view across title, author, series, genre and synopsis.
// ABOUTME: Debounced input renders a responsive grid of matching book cards.
import { setIcon } from "obsidian";
import type { Book } from "../types";
import { BookDataService } from "../services/BookDataService";
import { createBookCard } from "../components/BookCard";

export interface SearchViewOptions {
	service: BookDataService;
	onBookClick: (book: Book) => void;
	onFavToggle: (book: Book) => void;
	onToggleRead: (book: Book) => void;
	initialQuery?: string;
}

export function renderSearch(container: HTMLElement, opts: SearchViewOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--search";

	const searchWrap = document.createElement("div");
	searchWrap.className = "bkv-search-hero";

	const input = document.createElement("input");
	input.type = "text";
	input.placeholder = "Search title, author, series, genre...";
	input.className = "bkv-search-hero__input";
	input.value = opts.initialQuery ?? "";
	searchWrap.appendChild(input);
	container.appendChild(searchWrap);

	const resultsEl = document.createElement("div");
	resultsEl.className = "bkv-search__results";
	container.appendChild(resultsEl);

	const renderResults = (query: string) => {
		resultsEl.innerHTML = "";

		if (!query.trim()) {
			const hint = document.createElement("p");
			hint.className = "bkv-search__hint";
			hint.textContent = "Type to search your library...";
			resultsEl.appendChild(hint);
			return;
		}

		const results = opts.service.search(query);

		const countEl = document.createElement("p");
		countEl.className = "bkv-text-muted";
		countEl.textContent = results.length > 0
			? `${results.length} result${results.length !== 1 ? "s" : ""} for "${query}"`
			: `No results for "${query}"`;
		resultsEl.appendChild(countEl);

		if (results.length === 0) {
			const empty = document.createElement("div");
			empty.className = "bkv-empty";
			const iconEl = document.createElement("div");
			iconEl.className = "bkv-empty__icon";
			setIcon(iconEl, "search");
			empty.appendChild(iconEl);
			resultsEl.appendChild(empty);
			return;
		}

		const grid = document.createElement("div");
		grid.className = "bkv-grid bkv-grid--large";
		results.forEach((book, i) => {
			const card = createBookCard({
				book,
				size: "normal",
				onClick: opts.onBookClick,
				onFavToggle: opts.onFavToggle,
				onToggleRead: opts.onToggleRead,
			});
			card.style.animationDelay = `${i * 30}ms`;
			grid.appendChild(card);
		});
		resultsEl.appendChild(grid);
	};

	let timeout: ReturnType<typeof setTimeout>;
	input.addEventListener("input", () => {
		clearTimeout(timeout);
		timeout = setTimeout(() => renderResults(input.value), 200);
	});

	setTimeout(() => input.focus(), 100);
	renderResults(input.value);
}
