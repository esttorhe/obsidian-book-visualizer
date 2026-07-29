// ABOUTME: Catalog filter/sort/view-mode sidebar for the book catalog.
// ABOUTME: Emits changes via callbacks; the CatalogView owns the actual FilterState.
import type { FilterState, SortKey, SortDirection, ViewMode, BookFormat } from "../types";

export interface FilterSidebarOptions {
	filter: FilterState;
	sort: { key: SortKey; direction: SortDirection };
	viewMode: ViewMode;
	genres: string[];
	onFilterChange: (f: FilterState) => void;
	onSortChange: (key: SortKey, dir: SortDirection) => void;
	onViewModeChange: (mode: ViewMode) => void;
}

export function createFilterSidebar(opts: FilterSidebarOptions): HTMLElement {
	const { filter, sort, viewMode, genres, onFilterChange, onSortChange, onViewModeChange } = opts;

	const sidebar = document.createElement("div");
	sidebar.className = "bkv-sidebar";

	// View mode
	const viewGroup = buildSection(sidebar, "View");
	const viewModes: { mode: ViewMode; label: string; icon: string }[] = [
		{ mode: "grid-large", label: "Grid", icon: "⊞" },
		{ mode: "grid-compact", label: "Compact", icon: "⊟" },
		{ mode: "list", label: "List", icon: "≡" },
		{ mode: "poster", label: "Covers", icon: "▦" },
	];
	const vmGroup = document.createElement("div");
	vmGroup.className = "bkv-view-mode-group";
	viewModes.forEach(({ mode, label, icon }) => {
		const btn = document.createElement("button");
		btn.className = `bkv-view-mode-btn${viewMode === mode ? " bkv-view-mode-btn--active" : ""}`;
		btn.title = label;
		btn.textContent = icon;
		btn.addEventListener("click", () => {
			vmGroup.querySelectorAll(".bkv-view-mode-btn").forEach((b) => b.classList.remove("bkv-view-mode-btn--active"));
			btn.classList.add("bkv-view-mode-btn--active");
			onViewModeChange(mode);
		});
		vmGroup.appendChild(btn);
	});
	viewGroup.appendChild(vmGroup);

	// Sort
	const sortSection = buildSection(sidebar, "Sort");
	const sortKeys: { key: SortKey; label: string }[] = [
		{ key: "title", label: "Title" },
		{ key: "author", label: "Author" },
		{ key: "series", label: "Series" },
		{ key: "year", label: "Year" },
		{ key: "scoreGoodreads", label: "Goodreads" },
		{ key: "rating", label: "My rating" },
		{ key: "pages", label: "Pages" },
		{ key: "finished", label: "Finished" },
		{ key: "timesRead", label: "Times read" },
	];

	const sortSelect = document.createElement("select");
	sortSelect.className = "bkv-select";
	sortKeys.forEach(({ key, label }) => {
		const opt = document.createElement("option");
		opt.value = key;
		opt.textContent = label;
		opt.selected = sort.key === key;
		sortSelect.appendChild(opt);
	});

	const sortDirBtn = document.createElement("button");
	sortDirBtn.className = "bkv-btn bkv-btn--sm";
	sortDirBtn.textContent = sort.direction === "asc" ? "↑ Asc" : "↓ Desc";

	sortSelect.addEventListener("change", () => onSortChange(sortSelect.value as SortKey, sort.direction));
	sortDirBtn.addEventListener("click", () => {
		const newDir = sort.direction === "asc" ? "desc" : "asc";
		sortDirBtn.textContent = newDir === "asc" ? "↑ Asc" : "↓ Desc";
		onSortChange(sort.key, newDir);
	});

	sortSection.appendChild(sortSelect);
	sortSection.appendChild(sortDirBtn);

	// Status
	const statusSection = buildSection(sidebar, "Status");
	const statuses: { value: FilterState["status"]; label: string }[] = [
		{ value: "all", label: "All" },
		{ value: "to-read", label: "To read" },
		{ value: "reading", label: "Reading" },
		{ value: "read", label: "Read" },
		{ value: "dnf", label: "Did not finish" },
		{ value: "favorites", label: "Favorites" },
	];
	const statusGroup = document.createElement("div");
	statusGroup.className = "bkv-status-group";
	statuses.forEach(({ value, label }) => {
		const btn = document.createElement("button");
		btn.className = `bkv-status-btn${filter.status === value ? " bkv-status-btn--active" : ""}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			statusGroup.querySelectorAll(".bkv-status-btn").forEach((b) => b.classList.remove("bkv-status-btn--active"));
			btn.classList.add("bkv-status-btn--active");
			onFilterChange({ ...filter, status: value });
		});
		statusGroup.appendChild(btn);
	});
	statusSection.appendChild(statusGroup);

	// Format
	const formatSection = buildSection(sidebar, "Format");
	const formats: { value: BookFormat | ""; label: string }[] = [
		{ value: "", label: "All" },
		{ value: "physical", label: "Physical" },
		{ value: "ebook", label: "E-book" },
		{ value: "audiobook", label: "Audiobook" },
	];
	const fmtGroup = document.createElement("div");
	fmtGroup.className = "bkv-status-group";
	formats.forEach(({ value, label }) => {
		const btn = document.createElement("button");
		btn.className = `bkv-status-btn${(filter.format ?? "") === value ? " bkv-status-btn--active" : ""}`;
		btn.textContent = label;
		btn.addEventListener("click", () => {
			fmtGroup.querySelectorAll(".bkv-status-btn").forEach((b) => b.classList.remove("bkv-status-btn--active"));
			btn.classList.add("bkv-status-btn--active");
			onFilterChange({ ...filter, format: (value || undefined) as BookFormat | undefined });
		});
		fmtGroup.appendChild(btn);
	});
	formatSection.appendChild(fmtGroup);

	// Genre
	if (genres.length > 0) {
		const genreSection = buildSection(sidebar, "Genre");
		const genreGrid = document.createElement("div");
		genreGrid.className = "bkv-genre-grid";
		genres.forEach((genre) => {
			const chip = document.createElement("button");
			chip.className = `bkv-chip bkv-chip--filter${filter.genres.includes(genre) ? " bkv-chip--active" : ""}`;
			chip.textContent = genre;
			chip.addEventListener("click", () => {
				const selected = filter.genres.includes(genre)
					? filter.genres.filter((g) => g !== genre)
					: [...filter.genres, genre];
				chip.classList.toggle("bkv-chip--active", selected.includes(genre));
				onFilterChange({ ...filter, genres: selected });
			});
			genreGrid.appendChild(chip);
		});
		genreSection.appendChild(genreGrid);
	}

	// Reset
	const resetBtn = document.createElement("button");
	resetBtn.className = "bkv-btn bkv-btn--ghost bkv-btn--full";
	resetBtn.textContent = "Clear filters";
	resetBtn.addEventListener("click", () => onFilterChange({ genres: [], status: "all" }));
	sidebar.appendChild(resetBtn);

	return sidebar;
}

function buildSection(parent: HTMLElement, title: string): HTMLElement {
	const section = document.createElement("div");
	section.className = "bkv-sidebar__section";
	const h = document.createElement("h4");
	h.className = "bkv-sidebar__section-title";
	h.textContent = title;
	section.appendChild(h);
	parent.appendChild(section);
	return section;
}
