// ABOUTME: Top List view: rank books by combined/personal/Goodreads score with drag-reorder.
// ABOUTME: Custom orders (all and rating modes) persist per vault via the parent view.
import { setIcon } from "obsidian";
import type { Book } from "../types";
import { BookDataService } from "../services/BookDataService";
import { createBookCard } from "../components/BookCard";
import { createStarRating } from "../components/StarRating";

type TopMode = "all" | "rating" | "goodreads";
type TopViewMode = "rank" | "grid-large" | "grid-compact" | "poster";
const TOP_SIZES = [10, 20, 30] as const;

export interface TopListOptions {
	service: BookDataService;
	onBookClick: (book: Book) => void;
	onFavToggle: (book: Book) => void;
	onToggleRead?: (book: Book) => void;
	customOrder?: string[];
	onSaveOrder?: (ids: string[]) => void;
	allOrder?: string[];
	onSaveAllOrder?: (ids: string[]) => void;
}

export function renderTopList(container: HTMLElement, opts: TopListOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--top";

	let mode: TopMode = "all";
	let topN = 10;
	let viewMode: TopViewMode = "rank";
	let genreFilter = "";
	let customOrder: string[] = [...(opts.customOrder ?? [])];
	let allOrder: string[] = [...(opts.allOrder ?? [])];

	const controls = document.createElement("div");
	controls.className = "bkv-top__controls";

	const mainRow = document.createElement("div");
	mainRow.className = "bkv-top__row--main";

	const modeGroup = document.createElement("div");
	modeGroup.className = "bkv-btn-group";
	const modeConfigs: { key: TopMode; label: string }[] = [
		{ key: "all", label: "All" },
		{ key: "rating", label: "My Rating" },
		{ key: "goodreads", label: "Goodreads" },
	];
	modeConfigs.forEach(({ key, label }) => {
		const btn = document.createElement("button");
		btn.className = `bkv-btn${mode === key ? " bkv-btn--primary" : " bkv-btn--ghost"}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			mode = key;
			modeGroup.querySelectorAll(".bkv-btn").forEach((b) => (b.className = "bkv-btn bkv-btn--ghost"));
			btn.className = "bkv-btn bkv-btn--primary";
			renderList();
		});
		modeGroup.appendChild(btn);
	});
	mainRow.appendChild(modeGroup);

	const nGroup = document.createElement("div");
	nGroup.className = "bkv-btn-group";
	TOP_SIZES.forEach((n) => {
		const btn = document.createElement("button");
		btn.className = `bkv-btn bkv-btn--sm${topN === n ? " bkv-btn--primary" : " bkv-btn--ghost"}`;
		btn.textContent = `Top ${n}`;
		btn.addEventListener("click", () => {
			topN = n;
			nGroup.querySelectorAll(".bkv-btn").forEach((b) => (b.className = "bkv-btn bkv-btn--sm bkv-btn--ghost"));
			btn.className = "bkv-btn bkv-btn--sm bkv-btn--primary";
			renderList();
		});
		nGroup.appendChild(btn);
	});
	mainRow.appendChild(nGroup);

	const viewGroup = document.createElement("div");
	viewGroup.className = "bkv-btn-group bkv-btn-group--view";
	const viewConfigs: { key: TopViewMode; icon: string; title: string }[] = [
		{ key: "rank", icon: "list", title: "Ranking" },
		{ key: "grid-large", icon: "grid-2x2", title: "Grid" },
		{ key: "grid-compact", icon: "layout-grid", title: "Compact" },
		{ key: "poster", icon: "image", title: "Covers" },
	];
	const viewBtns: HTMLElement[] = [];
	viewConfigs.forEach(({ key, icon, title }) => {
		const btn = document.createElement("button");
		btn.className = `bkv-btn bkv-btn--icon${viewMode === key ? " bkv-btn--primary" : " bkv-btn--ghost"}`;
		btn.title = title;
		setIcon(btn, icon);
		btn.addEventListener("click", () => {
			viewMode = key;
			viewBtns.forEach((b) => (b.className = "bkv-btn bkv-btn--icon bkv-btn--ghost"));
			btn.className = "bkv-btn bkv-btn--icon bkv-btn--primary";
			renderList();
		});
		viewGroup.appendChild(btn);
		viewBtns.push(btn);
	});
	mainRow.appendChild(viewGroup);
	controls.appendChild(mainRow);

	const genreRow = document.createElement("div");
	genreRow.className = "bkv-top__genre-row";
	controls.appendChild(genreRow);
	container.appendChild(controls);

	const listContainer = document.createElement("div");
	listContainer.className = "bkv-top__list";
	container.appendChild(listContainer);

	const renderGenreRow = () => {
		genreRow.innerHTML = "";
		const allBtn = document.createElement("button");
		allBtn.className = `bkv-chip bkv-chip--filter${!genreFilter ? " bkv-chip--active" : ""}`;
		allBtn.textContent = "All genres";
		allBtn.addEventListener("click", () => { genreFilter = ""; renderGenreRow(); renderList(); });
		genreRow.appendChild(allBtn);

		opts.service.getAllGenres().forEach((genre) => {
			const chip = document.createElement("button");
			chip.className = `bkv-chip bkv-chip--filter${genreFilter === genre ? " bkv-chip--active" : ""}`;
			chip.textContent = genre;
			chip.addEventListener("click", () => {
				genreFilter = genreFilter === genre ? "" : genre;
				renderGenreRow();
				renderList();
			});
			genreRow.appendChild(chip);
		});
	};

	const getSortedSource = (): Book[] => {
		const books = opts.service.books;
		let source: Book[];

		if (mode === "all") {
			source = [...books];
			if (allOrder.length > 0) {
				const orderMap = new Map(allOrder.map((id, i) => [id, i]));
				const inOrder = source.filter((b) => orderMap.has(b.id)).sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));
				const newOnes = source.filter((b) => !orderMap.has(b.id)).sort((a, b) => a.title.localeCompare(b.title));
				source = [...inOrder, ...newOnes];
			} else {
				source = source.sort((a, b) => a.title.localeCompare(b.title));
			}
		} else if (mode === "rating") {
			source = books.filter((b) => b.rating != null);
			if (customOrder.length > 0) {
				const orderMap = new Map(customOrder.map((id, i) => [id, i]));
				const inOrder = source.filter((b) => orderMap.has(b.id)).sort((a, b) => (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999));
				const newOnes = source.filter((b) => !orderMap.has(b.id)).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
				source = [...inOrder, ...newOnes];
			} else {
				source = source.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
			}
		} else {
			source = books.filter((b) => b.scoreGoodreads != null).sort((a, b) => (b.scoreGoodreads ?? 0) - (a.scoreGoodreads ?? 0));
		}

		if (genreFilter) source = source.filter((b) => b.genre.includes(genreFilter));
		return source;
	};

	const getRanked = (): Book[] => {
		const source = getSortedSource();
		return mode === "all" ? source : source.slice(0, topN);
	};
	const getTotal = (): number => getSortedSource().length;

	const renderList = () => {
		listContainer.innerHTML = "";
		const ranked = getRanked();

		if (ranked.length === 0) {
			const empty = document.createElement("div");
			empty.className = "bkv-empty";
			const iconEl = document.createElement("div");
			iconEl.className = "bkv-empty__icon";
			setIcon(iconEl, "trophy");
			const p = document.createElement("p");
			p.textContent = "No books found.";
			empty.appendChild(iconEl);
			empty.appendChild(p);
			listContainer.appendChild(empty);
			return;
		}

		if (viewMode !== "rank") {
			const gridEl = document.createElement("div");
			const modeClass: Record<string, string> = {
				"grid-large": "bkv-grid bkv-grid--large",
				"grid-compact": "bkv-grid bkv-grid--compact",
				poster: "bkv-grid bkv-grid--poster",
			};
			gridEl.className = modeClass[viewMode] ?? "bkv-grid bkv-grid--large";
			ranked.forEach((book) => {
				const size = viewMode === "grid-compact" ? "compact" : viewMode === "poster" ? "poster" : "normal";
				gridEl.appendChild(createBookCard({
					book,
					size,
					onClick: opts.onBookClick,
					onFavToggle: opts.onFavToggle,
					onToggleRead: opts.onToggleRead,
				}));
			});
			listContainer.appendChild(gridEl);
			return;
		}

		const isDraggable = (mode === "rating" || mode === "all") && !genreFilter;

		const infoBar = document.createElement("div");
		infoBar.className = "bkv-top__info-bar";
		const total = getTotal();
		const countEl = document.createElement("span");
		countEl.className = "bkv-top__count";
		countEl.textContent = genreFilter
			? `${ranked.length} of ${total} books · "${genreFilter}"`
			: mode === "all"
				? `${ranked.length} books`
				: `${ranked.length} of ${total} ${mode === "rating" ? "rated" : "with Goodreads score"}`;
		infoBar.appendChild(countEl);

		if (mode === "rating" && customOrder.length > 0) {
			infoBar.appendChild(buildResetButton("Reset to default sort by rating", () => { customOrder = []; opts.onSaveOrder?.([]); renderList(); }));
		}
		if (mode === "all" && allOrder.length > 0) {
			infoBar.appendChild(buildResetButton("Reset to alphabetical order", () => { allOrder = []; opts.onSaveAllOrder?.([]); renderList(); }));
		}

		if (isDraggable) {
			const hint = document.createElement("span");
			hint.className = "bkv-top__drag-hint";
			hint.textContent = "Drag rows to reorder";
			infoBar.appendChild(hint);
		} else if ((mode === "rating" || mode === "all") && genreFilter) {
			const hint = document.createElement("span");
			hint.className = "bkv-top__drag-hint bkv-top__drag-hint--off";
			hint.textContent = "Clear genre filter to reorder";
			infoBar.appendChild(hint);
		}

		listContainer.appendChild(infoBar);

		let startIdx = 0;
		if (!isDraggable && ranked.length >= 3) {
			const podium = document.createElement("div");
			podium.className = "bkv-podium";
			[1, 0, 2].forEach((rankIdx) => {
				const book = ranked[rankIdx];
				if (!book) return;
				const item = document.createElement("div");
				const tierClass = ["bkv-podium__item--gold", "bkv-podium__item--silver", "bkv-podium__item--bronze"][rankIdx];
				item.className = `bkv-podium__item ${tierClass}`;

				const medal = document.createElement("div");
				medal.className = "bkv-podium__medal";
				medal.textContent = ["🥇", "🥈", "🥉"][rankIdx];

				const cover = document.createElement("div");
				cover.className = "bkv-podium__cover";
				if (book.cover) {
					const img = document.createElement("img");
					img.src = book.cover;
					img.alt = book.title;
					cover.appendChild(img);
				}

				const title = document.createElement("p");
				title.className = "bkv-podium__title";
				title.textContent = book.title;

				const score = document.createElement("p");
				score.className = "bkv-podium__score";
				const val = mode === "goodreads" ? book.scoreGoodreads : book.rating;
				score.textContent = val != null ? (mode === "goodreads" ? val.toFixed(2) : String(val)) : "—";

				item.appendChild(medal);
				item.appendChild(cover);
				item.appendChild(title);
				item.appendChild(score);
				item.addEventListener("click", () => opts.onBookClick(book));
				podium.appendChild(item);
			});
			listContainer.appendChild(podium);
			startIdx = 3;
		}

		const rankList = document.createElement("div");
		rankList.className = "bkv-rank-list";

		let currentOrder = [...ranked];
		let dragSrcIdx: number | null = null;

		const reRenderRows = (skipAnimation = false) => {
			rankList.innerHTML = "";
			currentOrder.slice(startIdx).forEach((book, i) => {
				const absIdx = startIdx + i;
				const rank = absIdx + 1;
				const row = createRankRow(book, rank, mode, isDraggable);

				if (skipAnimation) {
					row.style.animation = "none";
					row.style.opacity = "1";
				} else {
					row.style.animationDelay = `${i * 30}ms`;
				}

				if (isDraggable) {
					row.draggable = true;
					row.dataset.idx = String(absIdx);
					row.addEventListener("dragstart", () => {
						dragSrcIdx = absIdx;
						setTimeout(() => row.classList.add("bkv-rank-row--dragging"), 0);
					});
					row.addEventListener("dragend", () => {
						row.classList.remove("bkv-rank-row--dragging");
						rankList.querySelectorAll(".bkv-rank-row--dragover").forEach((el) => el.classList.remove("bkv-rank-row--dragover"));
					});
					row.addEventListener("dragover", (e) => {
						e.preventDefault();
						rankList.querySelectorAll(".bkv-rank-row--dragover").forEach((el) => el.classList.remove("bkv-rank-row--dragover"));
						row.classList.add("bkv-rank-row--dragover");
					});
					row.addEventListener("dragleave", (e) => {
						if (!row.contains(e.relatedTarget as Node)) row.classList.remove("bkv-rank-row--dragover");
					});
					row.addEventListener("drop", (e) => {
						e.preventDefault();
						row.classList.remove("bkv-rank-row--dragover");
						if (dragSrcIdx === null || dragSrcIdx === absIdx) return;
						const newOrder = [...currentOrder];
						const [moved] = newOrder.splice(dragSrcIdx, 1);
						newOrder.splice(absIdx, 0, moved);
						currentOrder = newOrder;
						dragSrcIdx = null;
						if (mode === "all") {
							allOrder = newOrder.map((b) => b.id);
							opts.onSaveAllOrder?.(allOrder);
						} else {
							customOrder = newOrder.map((b) => b.id);
							opts.onSaveOrder?.(customOrder);
						}
						reRenderRows(true);
					});
				}

				row.addEventListener("click", () => opts.onBookClick(book));
				rankList.appendChild(row);
			});
		};

		reRenderRows(false);
		listContainer.appendChild(rankList);
	};

	renderGenreRow();
	renderList();
}

function buildResetButton(title: string, onClick: () => void): HTMLElement {
	const btn = document.createElement("button");
	btn.className = "bkv-btn bkv-btn--xs bkv-btn--ghost";
	btn.title = title;
	setIcon(btn, "rotate-ccw");
	btn.appendChild(document.createTextNode(" Reset order"));
	btn.addEventListener("click", onClick);
	return btn;
}

function createRankRow(book: Book, rank: number, mode: TopMode, isDraggable: boolean): HTMLElement {
	const row = document.createElement("div");
	row.className = "bkv-rank-row";

	if (isDraggable) {
		const handle = document.createElement("span");
		handle.className = "bkv-rank-row__handle";
		setIcon(handle, "grip-vertical");
		row.appendChild(handle);
	}

	const rankNum = document.createElement("span");
	rankNum.className = "bkv-rank-row__num";
	rankNum.textContent = String(rank);
	row.appendChild(rankNum);

	const cover = document.createElement("div");
	cover.className = "bkv-rank-row__cover";
	if (book.cover) {
		const img = document.createElement("img");
		img.src = book.cover;
		img.alt = book.title;
		cover.appendChild(img);
	}
	row.appendChild(cover);

	const info = document.createElement("div");
	info.className = "bkv-rank-row__info";
	const title = document.createElement("span");
	title.className = "bkv-rank-row__title";
	title.textContent = book.title;
	info.appendChild(title);
	const sub = document.createElement("span");
	sub.className = "bkv-rank-row__sub";
	const parts: string[] = [];
	if (book.author.length) parts.push(book.author[0]);
	if (book.year) parts.push(String(book.year));
	if (book.genre.length) parts.push(book.genre[0]);
	sub.textContent = parts.join(" · ");
	info.appendChild(sub);
	row.appendChild(info);

	if ((mode === "rating" || mode === "all") && book.rating != null) {
		const stars = createStarRating({ value: book.rating, readonly: true, size: "sm" });
		stars.classList.add("bkv-rank-row__stars");
		row.appendChild(stars);
	} else if (mode === "all" && book.scoreGoodreads != null) {
		const scoreEl = document.createElement("span");
		scoreEl.className = "bkv-rank-row__score";
		scoreEl.textContent = book.scoreGoodreads.toFixed(2);
		row.appendChild(scoreEl);
	} else if (mode === "goodreads") {
		const scoreEl = document.createElement("span");
		scoreEl.className = "bkv-rank-row__score";
		scoreEl.textContent = book.scoreGoodreads != null ? book.scoreGoodreads.toFixed(2) : "—";
		row.appendChild(scoreEl);
	}

	return row;
}
