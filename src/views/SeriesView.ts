// ABOUTME: Series view: cards per series with completion, plus an ordered reading-order detail.
// ABOUTME: A book-specific feature with no movie analog; tracks progress through each series.
import { setIcon } from "obsidian";
import type { Book, SeriesCard } from "../types";
import { BookDataService } from "../services/BookDataService";
import { createStarRating } from "../components/StarRating";

type SortMode = "count" | "completion" | "rating" | "alpha";

const STATUS_LABEL: Record<Book["status"], string> = {
	"to-read": "To read",
	reading: "Reading",
	read: "Read",
	dnf: "DNF",
};

export interface SeriesViewOptions {
	service: BookDataService;
	onBookClick: (book: Book) => void;
}

export function renderSeries(container: HTMLElement, opts: SeriesViewOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--series";

	const series = opts.service.getSeriesCards();

	if (series.length === 0) {
		emptyState(container, "library", "No series found. Add a 'series' field to your book notes.");
		return;
	}

	const header = document.createElement("div");
	header.className = "bkv-people__header";
	const h1 = document.createElement("h1");
	h1.className = "bkv-view__title";
	h1.textContent = "Series";
	header.appendChild(h1);
	const countBadge = document.createElement("span");
	countBadge.className = "bkv-people__count-badge";
	countBadge.textContent = `${series.length} series`;
	header.appendChild(countBadge);
	container.appendChild(header);

	const toolbar = document.createElement("div");
	toolbar.className = "bkv-people__toolbar";
	const searchInput = document.createElement("input");
	searchInput.type = "text";
	searchInput.placeholder = "Search series...";
	searchInput.className = "bkv-search-input bkv-search-input--standalone";
	toolbar.appendChild(searchInput);

	let sortMode: SortMode = "count";
	const sortGroup = document.createElement("div");
	sortGroup.className = "bkv-btn-group";
	const sortConfigs: { key: SortMode; label: string }[] = [
		{ key: "count", label: "Most books" },
		{ key: "completion", label: "Completion" },
		{ key: "rating", label: "My rating" },
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
	grid.className = "bkv-series-grid";

	const getSorted = (list: SeriesCard[]): SeriesCard[] => {
		switch (sortMode) {
			case "completion": return [...list].sort((a, b) => b.completion - a.completion);
			case "rating": return [...list].sort((a, b) => b.avgRating - a.avgRating);
			case "alpha": return [...list].sort((a, b) => a.name.localeCompare(b.name));
			default: return [...list].sort((a, b) => b.count - a.count);
		}
	};

	const renderGrid = (query = "") => {
		grid.innerHTML = "";
		const filtered = query
			? series.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
			: series;
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

		sorted.forEach((s, i) => {
			const card = document.createElement("div");
			card.className = "bkv-series-card";
			card.style.animationDelay = `${i * 20}ms`;

			const cover = document.createElement("div");
			cover.className = "bkv-series-card__cover";
			if (s.cover) {
				const img = document.createElement("img");
				img.src = s.cover;
				img.alt = s.name;
				img.loading = "lazy";
				cover.appendChild(img);
			} else {
				const icon = document.createElement("div");
				icon.className = "bkv-people-card__cover-fallback";
				setIcon(icon, "library");
				cover.appendChild(icon);
			}

			const info = document.createElement("div");
			info.className = "bkv-series-card__info";
			const name = document.createElement("h3");
			name.className = "bkv-series-card__name";
			name.textContent = s.name;
			info.appendChild(name);

			const st = document.createElement("div");
			st.className = "bkv-people-card__stats";
			const parts: string[] = [`${s.count} book${s.count !== 1 ? "s" : ""}`];
			if (s.avgRating > 0) parts.push(`★ ${s.avgRating.toFixed(1)}`);
			parts.forEach((p) => {
				const span = document.createElement("span");
				span.textContent = p;
				st.appendChild(span);
			});
			info.appendChild(st);

			// Completion bar
			const barWrap = document.createElement("div");
			barWrap.className = "bkv-series-card__progress";
			const bar = document.createElement("div");
			bar.className = "bkv-series-card__progress-bar";
			const fill = document.createElement("div");
			fill.className = "bkv-series-card__progress-fill";
			fill.style.width = `${Math.round(s.completion * 100)}%`;
			bar.appendChild(fill);
			const label = document.createElement("span");
			label.className = "bkv-series-card__progress-label";
			label.textContent = `${s.readCount}/${s.count} read`;
			barWrap.appendChild(bar);
			barWrap.appendChild(label);
			info.appendChild(barWrap);

			card.appendChild(cover);
			card.appendChild(info);
			card.addEventListener("click", () => renderSeriesDetail(container, s, opts));
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

function renderSeriesDetail(container: HTMLElement, seriesName: string, opts: SeriesViewOptions): void;
function renderSeriesDetail(container: HTMLElement, card: SeriesCard, opts: SeriesViewOptions): void;
function renderSeriesDetail(container: HTMLElement, arg: SeriesCard | string, opts: SeriesViewOptions): void {
	// Re-read live data so completion reflects any edits made since the grid rendered.
	const name = typeof arg === "string" ? arg : arg.name;
	const card = opts.service.getSeriesCards().find((s) => s.name === name);
	if (!card) { renderSeries(container, opts); return; }

	container.innerHTML = "";
	container.className = "bkv-view bkv-view--series-detail";

	const back = document.createElement("button");
	back.className = "bkv-btn bkv-btn--ghost bkv-detail__back";
	back.textContent = "← Series";
	back.addEventListener("click", () => renderSeries(container, opts));
	container.appendChild(back);

	const h1 = document.createElement("h1");
	h1.className = "bkv-view__title";
	h1.textContent = card.name;
	container.appendChild(h1);

	const sub = document.createElement("p");
	sub.className = "bkv-text-muted";
	sub.textContent = `${card.count} book${card.count !== 1 ? "s" : ""} · ${card.readCount} read · ${Math.round(card.completion * 100)}% complete`;
	container.appendChild(sub);

	const list = document.createElement("div");
	list.className = "bkv-series-order";

	card.books.forEach((book) => {
		const row = document.createElement("div");
		row.className = `bkv-series-row bkv-series-row--${book.status}`;

		const num = document.createElement("span");
		num.className = "bkv-series-row__num";
		num.textContent = book.seriesNumber != null ? `#${book.seriesNumber}` : "–";
		row.appendChild(num);

		const cover = document.createElement("div");
		cover.className = "bkv-series-row__cover";
		if (book.cover) {
			const img = document.createElement("img");
			img.src = book.cover;
			img.alt = book.title;
			img.loading = "lazy";
			cover.appendChild(img);
		}
		row.appendChild(cover);

		const info = document.createElement("div");
		info.className = "bkv-series-row__info";
		const title = document.createElement("span");
		title.className = "bkv-series-row__title";
		title.textContent = book.title;
		info.appendChild(title);
		const meta = document.createElement("span");
		meta.className = "bkv-series-row__sub";
		const parts: string[] = [];
		if (book.author.length) parts.push(book.author[0]);
		if (book.year) parts.push(String(book.year));
		meta.textContent = parts.join(" · ");
		info.appendChild(meta);
		if (book.rating != null) {
			info.appendChild(createStarRating({ value: book.rating, readonly: true, size: "sm" }));
		}
		row.appendChild(info);

		const status = document.createElement("span");
		status.className = `bkv-series-row__status bkv-series-row__status--${book.status}`;
		status.textContent = STATUS_LABEL[book.status];
		row.appendChild(status);

		row.addEventListener("click", () => opts.onBookClick(book));
		list.appendChild(row);
	});

	container.appendChild(list);
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
