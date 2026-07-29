// ABOUTME: Dashboard view: hero, stats bar and themed carousels of the collection.
// ABOUTME: Highlights the current read or best-rated book and links out to other views.
import type { Book } from "../types";
import { BookDataService } from "../services/BookDataService";
import { StatsEngine } from "../services/StatsEngine";
import { createHeroSection } from "../components/HeroSection";
import { createCarousel } from "../components/Carousel";

const engine = new StatsEngine();

export interface DashboardViewOptions {
	service: BookDataService;
	onBookClick: (book: Book) => void;
	onFavToggle: (book: Book) => void;
	onToggleRead: (book: Book) => void;
	onViewAll: (route: string) => void;
}

export function renderDashboard(container: HTMLElement, opts: DashboardViewOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--dashboard";

	const books = opts.service.books;

	if (books.length === 0) {
		const empty = document.createElement("div");
		empty.className = "bkv-empty";
		empty.innerHTML = `
			<h2>No books yet</h2>
			<p>Add notes with <code>categories: [Books]</code> in their frontmatter, or use the Obsidian Clipper on a Goodreads page.</p>
		`;
		container.appendChild(empty);
		return;
	}

	const stats = opts.service.getStats();

	const heroBook =
		engine.currentlyReading(books, 1)[0] ??
		engine.topByRating(books, 1)[0] ??
		engine.topByGoodreads(books, 1)[0] ??
		books[0];

	if (heroBook) {
		container.appendChild(createHeroSection({
			book: heroBook,
			onDetail: opts.onBookClick,
			onFavToggle: opts.onFavToggle,
		}));
	}

	const statsBar = document.createElement("div");
	statsBar.className = "bkv-stats-bar";
	const statsItems = [
		{ value: stats.total, label: "Total" },
		{ value: stats.read, label: "Read" },
		{ value: stats.reading, label: "Reading" },
		{ value: stats.toRead, label: "To read" },
		{ value: stats.favorites, label: "Favorites" },
		{ value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—", label: "My rating" },
		{ value: stats.avgGoodreads > 0 ? stats.avgGoodreads.toFixed(2) : "—", label: "Goodreads" },
		{ value: stats.authors, label: "Authors" },
	];
	statsItems.forEach(({ value, label }) => {
		const item = document.createElement("div");
		item.className = "bkv-stats-bar__item";
		item.innerHTML = `<span class="bkv-stats-bar__value">${value}</span><span class="bkv-stats-bar__label">${label}</span>`;
		statsBar.appendChild(item);
	});
	container.appendChild(statsBar);

	const carouselContainer = document.createElement("div");
	carouselContainer.className = "bkv-dashboard__carousels";

	const carousels = [
		{ title: "Currently reading", books: engine.currentlyReading(books, 20), route: "reading" },
		{ title: "Recently finished", books: engine.recentlyFinished(books, 20), route: "read" },
		{ title: "My favorites", books: engine.favorites(books, 20), route: "favorites" },
		{ title: "Top rated", books: engine.topByRating(books, 20), route: "top" },
		{ title: "To read", books: engine.toRead(books, 20), route: "to-read" },
	];

	carousels.forEach(({ title, books: carouselBooks, route }) => {
		const carousel = createCarousel({
			title,
			books: carouselBooks,
			size: "normal",
			onCardClick: opts.onBookClick,
			onFavToggle: opts.onFavToggle,
			onToggleRead: opts.onToggleRead,
			onViewAll: () => opts.onViewAll(route),
		});
		if (carousel.childNodes.length > 0) carouselContainer.appendChild(carousel);
	});

	container.appendChild(carouselContainer);

	if (stats.pagesRead > 0) {
		const badge = document.createElement("div");
		badge.className = "bkv-runtime-badge";
		badge.textContent = `You've read approx. ${engine.formatPages(stats.pagesRead)}`;
		container.appendChild(badge);
	}
}
