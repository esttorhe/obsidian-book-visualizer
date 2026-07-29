// ABOUTME: Catalog view: filterable, sortable grid/list of books with lazy batch rendering.
// ABOUTME: Composes the FilterSidebar, FilterEngine and SortEngine over the full collection.
import { setIcon } from "obsidian";
import type { Book, FilterState, SortKey, SortDirection, ViewMode } from "../types";
import { BookDataService } from "../services/BookDataService";
import { FilterEngine } from "../services/FilterEngine";
import { SortEngine } from "../services/SortEngine";
import { createBookCard } from "../components/BookCard";
import { createFilterSidebar } from "../components/FilterSidebar";

const filterEngine = new FilterEngine();
const sortEngine = new SortEngine();
const PAGE_SIZE = 48;

export interface CatalogViewOptions {
	service: BookDataService;
	onBookClick: (book: Book) => void;
	onFavToggle: (book: Book) => void;
	onToggleRead: (book: Book) => void;
	initialFilter?: Partial<FilterState>;
}

export class CatalogView {
	private container!: HTMLElement;
	private grid!: HTMLElement;
	private countEl!: HTMLElement;
	private filter: FilterState;
	private sort: { key: SortKey; direction: SortDirection } = { key: "title", direction: "asc" };
	private viewMode: ViewMode = "grid-large";
	private opts: CatalogViewOptions;
	private sidebarOpen = true;
	private observer?: IntersectionObserver;
	private sortedBooks: Book[] = [];
	private renderedCount = 0;
	private gridEl?: HTMLElement;

	constructor(opts: CatalogViewOptions) {
		this.opts = opts;
		this.filter = { genres: [], status: "all", ...opts.initialFilter };
	}

	render(container: HTMLElement): void {
		this.container = container;
		container.innerHTML = "";
		container.className = "bkv-view bkv-view--catalog";

		const toolbar = document.createElement("div");
		toolbar.className = "bkv-toolbar";

		const leftTools = document.createElement("div");
		leftTools.className = "bkv-toolbar__left";

		const toggleSidebar = document.createElement("button");
		toggleSidebar.className = "bkv-btn bkv-btn--icon-plain";
		toggleSidebar.title = "Filters";
		setIcon(toggleSidebar, "sliders-horizontal");
		toggleSidebar.addEventListener("click", () => {
			this.sidebarOpen = !this.sidebarOpen;
			layout.classList.toggle("bkv-layout--no-sidebar", !this.sidebarOpen);
		});
		leftTools.appendChild(toggleSidebar);

		const searchInput = document.createElement("input");
		searchInput.type = "text";
		searchInput.placeholder = "Search title, author, series...";
		searchInput.className = "bkv-search-input";
		searchInput.value = this.filter.query ?? "";
		let searchTimeout: ReturnType<typeof setTimeout>;
		searchInput.addEventListener("input", () => {
			clearTimeout(searchTimeout);
			searchTimeout = setTimeout(() => {
				this.filter = { ...this.filter, query: searchInput.value };
				this.renderGrid();
			}, 200);
		});
		leftTools.appendChild(searchInput);

		this.countEl = document.createElement("span");
		this.countEl.className = "bkv-toolbar__count";
		leftTools.appendChild(this.countEl);

		toolbar.appendChild(leftTools);
		container.appendChild(toolbar);

		const layout = document.createElement("div");
		layout.className = `bkv-layout${this.sidebarOpen ? "" : " bkv-layout--no-sidebar"}`;

		const sidebarWrapper = document.createElement("div");
		sidebarWrapper.className = "bkv-layout__sidebar";

		const renderSidebar = () => {
			sidebarWrapper.innerHTML = "";
			sidebarWrapper.appendChild(createFilterSidebar({
				filter: this.filter,
				sort: this.sort,
				viewMode: this.viewMode,
				genres: this.opts.service.getAllGenres(),
				onFilterChange: (f) => { this.filter = f; this.renderGrid(); renderSidebar(); },
				onSortChange: (key, dir) => { this.sort = { key, direction: dir }; this.renderGrid(); renderSidebar(); },
				onViewModeChange: (mode) => { this.viewMode = mode; this.renderGrid(); renderSidebar(); },
			}));
		};
		renderSidebar();
		layout.appendChild(sidebarWrapper);

		const gridWrapper = document.createElement("div");
		gridWrapper.className = "bkv-layout__content";
		this.grid = gridWrapper;
		layout.appendChild(gridWrapper);

		container.appendChild(layout);
		this.renderGrid();
	}

	private renderGrid(): void {
		this.observer?.disconnect();
		this.observer = undefined;

		this.grid.innerHTML = "";
		this.renderedCount = 0;

		const filtered = filterEngine.apply(this.opts.service.books, this.filter);
		this.sortedBooks = sortEngine.sort(filtered, this.sort.key, this.sort.direction);

		this.countEl.textContent = `${this.sortedBooks.length} book${this.sortedBooks.length !== 1 ? "s" : ""}`;

		if (this.sortedBooks.length === 0) {
			const empty = document.createElement("div");
			empty.className = "bkv-empty";
			empty.innerHTML = `<p class="bkv-empty__msg">No results for these filters.</p>`;
			this.grid.appendChild(empty);
			return;
		}

		const modeClass = {
			"grid-large": "bkv-grid bkv-grid--large",
			"grid-compact": "bkv-grid bkv-grid--compact",
			list: "bkv-list",
			poster: "bkv-grid bkv-grid--poster",
		}[this.viewMode];

		this.gridEl = document.createElement("div");
		this.gridEl.className = modeClass;
		this.grid.appendChild(this.gridEl);

		this.renderNextBatch();
	}

	private renderNextBatch(): void {
		if (!this.gridEl) return;

		const size = this.viewMode === "grid-large" ? "normal"
			: this.viewMode === "grid-compact" ? "compact"
			: this.viewMode === "list" ? "list"
			: "poster";

		const start = this.renderedCount;
		const end = Math.min(start + PAGE_SIZE, this.sortedBooks.length);
		const fragment = document.createDocumentFragment();

		for (let i = start; i < end; i++) {
			fragment.appendChild(createBookCard({
				book: this.sortedBooks[i],
				size,
				onClick: this.opts.onBookClick,
				onFavToggle: this.opts.onFavToggle,
				onToggleRead: this.opts.onToggleRead,
			}));
		}

		this.gridEl.appendChild(fragment);
		this.renderedCount = end;

		if (this.renderedCount >= this.sortedBooks.length) return;

		const sentinel = document.createElement("div");
		sentinel.className = "bkv-sentinel";
		this.grid.appendChild(sentinel);

		this.observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				this.observer?.disconnect();
				this.observer = undefined;
				sentinel.remove();
				this.renderNextBatch();
			}
		}, { root: this.grid, rootMargin: "200px" });

		this.observer.observe(sentinel);
	}
}
