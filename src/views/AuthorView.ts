// ABOUTME: Authors view: a searchable, sortable grid of author cards.
// ABOUTME: Clicking an author opens their bibliography filtered in the catalog.
import { setIcon } from "obsidian";
import type { Book, AuthorCard } from "../types";
import { BookDataService } from "../services/BookDataService";
import { CatalogView } from "./CatalogView";

type SortMode = "count" | "rating" | "goodreads" | "alpha";

export interface AuthorViewOptions {
	service: BookDataService;
	onBookClick: (book: Book) => void;
	onFavToggle: (book: Book) => void;
	onToggleRead: (book: Book) => void;
}

export function renderAuthors(container: HTMLElement, opts: AuthorViewOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--authors";

	const authors = opts.service.getAuthorCards();

	if (authors.length === 0) {
		emptyState(container, "pen-tool", "No authors found. Add an 'author' field to your book notes.");
		return;
	}

	const header = document.createElement("div");
	header.className = "bkv-people__header";
	const h1 = document.createElement("h1");
	h1.className = "bkv-view__title";
	h1.textContent = "Authors";
	header.appendChild(h1);
	const countBadge = document.createElement("span");
	countBadge.className = "bkv-people__count-badge";
	countBadge.textContent = `${authors.length} authors`;
	header.appendChild(countBadge);
	container.appendChild(header);

	const toolbar = document.createElement("div");
	toolbar.className = "bkv-people__toolbar";

	const searchInput = document.createElement("input");
	searchInput.type = "text";
	searchInput.placeholder = "Search author...";
	searchInput.className = "bkv-search-input bkv-search-input--standalone";
	toolbar.appendChild(searchInput);

	let sortMode: SortMode = "count";
	const sortGroup = document.createElement("div");
	sortGroup.className = "bkv-btn-group";
	const sortConfigs: { key: SortMode; label: string }[] = [
		{ key: "count", label: "Most books" },
		{ key: "rating", label: "My rating" },
		{ key: "goodreads", label: "Goodreads" },
		{ key: "alpha", label: "A–Z" },
	];
	const sortBtns: HTMLElement[] = [];
	sortConfigs.forEach(({ key, label }) => {
		const btn = document.createElement("button");
		btn.className = `bkv-btn bkv-btn--sm${sortMode === key ? " bkv-btn--primary" : " bkv-btn--ghost"}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			sortMode = key;
			sortBtns.forEach((b) => (b.className = "bkv-btn bkv-btn--sm bkv-btn--ghost"));
			btn.className = "bkv-btn bkv-btn--sm bkv-btn--primary";
			renderGrid(searchInput.value);
		});
		sortGroup.appendChild(btn);
		sortBtns.push(btn);
	});
	toolbar.appendChild(sortGroup);
	container.appendChild(toolbar);

	const grid = document.createElement("div");
	grid.className = "bkv-people-grid";

	const getSorted = (list: AuthorCard[]): AuthorCard[] => {
		switch (sortMode) {
			case "rating": return [...list].sort((a, b) => b.avgRating - a.avgRating);
			case "goodreads": return [...list].sort((a, b) => b.avgGoodreads - a.avgGoodreads);
			case "alpha": return [...list].sort((a, b) => a.name.localeCompare(b.name));
			default: return [...list].sort((a, b) => b.count - a.count);
		}
	};

	const renderGrid = (query = "") => {
		grid.innerHTML = "";
		const filtered = query
			? authors.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
			: authors;
		const sorted = getSorted(filtered);

		if (sorted.length === 0) {
			const empty = document.createElement("div");
			empty.className = "bkv-empty";
			const p = document.createElement("p");
			p.textContent = "No results.";
			empty.appendChild(p);
			grid.appendChild(empty);
			return;
		}

		sorted.forEach((author, i) => {
			const card = document.createElement("div");
			card.className = "bkv-people-card";
			card.style.animationDelay = `${i * 20}ms`;

			const cover = document.createElement("div");
			cover.className = "bkv-people-card__cover";
			if (author.cover) {
				const img = document.createElement("img");
				img.src = author.cover;
				img.alt = author.name;
				img.loading = "lazy";
				cover.appendChild(img);
			} else {
				const icon = document.createElement("div");
				icon.className = "bkv-people-card__cover-fallback";
				setIcon(icon, "user");
				cover.appendChild(icon);
			}

			const info = document.createElement("div");
			info.className = "bkv-people-card__info";
			const name = document.createElement("h3");
			name.className = "bkv-people-card__name";
			name.textContent = author.name;
			info.appendChild(name);

			const st = document.createElement("div");
			st.className = "bkv-people-card__stats";
			const parts: string[] = [`${author.count} book${author.count !== 1 ? "s" : ""}`, `${author.readCount} read`];
			if (author.avgRating > 0) parts.push(`★ ${author.avgRating.toFixed(1)}`);
			if (author.avgGoodreads > 0) parts.push(`GR ${author.avgGoodreads.toFixed(2)}`);
			parts.forEach((p) => {
				const span = document.createElement("span");
				span.textContent = p;
				st.appendChild(span);
			});
			info.appendChild(st);

			card.appendChild(cover);
			card.appendChild(info);
			card.addEventListener("click", () => renderAuthorBooks(container, author.name, opts));
			grid.appendChild(card);
		});
	};

	let searchTimeout: ReturnType<typeof setTimeout>;
	searchInput.addEventListener("input", () => {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => renderGrid(searchInput.value), 200);
	});

	renderGrid();
	container.appendChild(grid);
}

function renderAuthorBooks(container: HTMLElement, author: string, opts: AuthorViewOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--catalog";

	const back = document.createElement("button");
	back.className = "bkv-btn bkv-btn--ghost bkv-detail__back";
	back.textContent = "← Authors";
	back.addEventListener("click", () => renderAuthors(container, opts));
	container.appendChild(back);

	const inner = document.createElement("div");
	inner.style.flex = "1";
	container.appendChild(inner);

	new CatalogView({
		service: opts.service,
		onBookClick: opts.onBookClick,
		onFavToggle: opts.onFavToggle,
		onToggleRead: opts.onToggleRead,
		initialFilter: { genres: [], status: "all", author },
	}).render(inner);
}

function emptyState(container: HTMLElement, icon: string, message: string): void {
	const empty = document.createElement("div");
	empty.className = "bkv-empty";
	const iconEl = document.createElement("div");
	iconEl.className = "bkv-empty__icon";
	setIcon(iconEl, icon);
	const p = document.createElement("p");
	p.textContent = message;
	empty.appendChild(iconEl);
	empty.appendChild(p);
	container.appendChild(empty);
}
