// ABOUTME: The ItemView that hosts the plugin: nav sidebar + client-side routed content area.
// ABOUTME: Owns the data service, per-vault persisted orders/tier-list, and shared book handlers.
import { ItemView, WorkspaceLeaf, setIcon } from "obsidian";
import type { Book } from "./types";
import { BookDataService } from "./services/BookDataService";
import { renderDashboard } from "./views/DashboardView";
import { CatalogView } from "./views/CatalogView";
import { renderBookDetail } from "./views/BookDetailView";
import { renderTopList } from "./views/TopListView";
import { renderAuthors } from "./views/AuthorView";
import { renderSeries } from "./views/SeriesView";
import { renderReviews } from "./views/ReviewsView";
import { renderStats } from "./views/StatsView";
import { renderSearch } from "./views/SearchView";
import { renderTierList, TierListData } from "./views/TierListView";

export const BOOK_VIEW_TYPE = "book-visualizer-view";

type Route =
	| "dashboard"
	| "catalog"
	| "to-read"
	| "reading"
	| "read"
	| "favorites"
	| "search"
	| "top"
	| "authors"
	| "series"
	| "reviews"
	| "stats"
	| "tierlist"
	| "detail";

interface NavItem {
	id: Route;
	label: string;
	icon: string;
}

const NAV_ITEMS: NavItem[] = [
	{ id: "dashboard", label: "Dashboard", icon: "home" },
	{ id: "search", label: "Search", icon: "search" },
	{ id: "catalog", label: "Catalog", icon: "grid-2x2" },
	{ id: "to-read", label: "To Read", icon: "bookmark" },
	{ id: "reading", label: "Reading", icon: "book-open" },
	{ id: "read", label: "Read", icon: "check-circle" },
	{ id: "favorites", label: "Favorites", icon: "heart" },
	{ id: "top", label: "Top Lists", icon: "trophy" },
	{ id: "authors", label: "Authors", icon: "pen-tool" },
	{ id: "series", label: "Series", icon: "library" },
	{ id: "reviews", label: "My Reviews", icon: "file-text" },
	{ id: "stats", label: "Stats", icon: "bar-chart-2" },
	{ id: "tierlist", label: "Tier List", icon: "layout-list" },
];

const PLUGIN_DIR = ".obsidian/plugins/book-visualizer";
const RANK_ORDER_PATH = `${PLUGIN_DIR}/rank-order.json`;
const ALL_ORDER_PATH = `${PLUGIN_DIR}/all-order.json`;
const TIERLIST_PATH = `${PLUGIN_DIR}/tierlist.json`;

export class BookVisualizerView extends ItemView {
	private service!: BookDataService;
	private currentRoute: Route = "dashboard";
	private navEl!: HTMLElement;
	private viewContentEl!: HTMLElement;
	private unsubscribe?: () => void;
	private rankOrder: string[] = [];
	private allOrder: string[] = [];
	private tierListData: TierListData = { tiers: [] };

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return BOOK_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Book Visualizer";
	}

	getIcon(): string {
		return "book-open";
	}

	async onOpen(): Promise<void> {
		this.service = new BookDataService(this.app);
		await this.service.init();

		this.rankOrder = await this.readJson<string[]>(RANK_ORDER_PATH, []);
		this.allOrder = await this.readJson<string[]>(ALL_ORDER_PATH, []);
		this.tierListData = await this.readJson<TierListData>(TIERLIST_PATH, { tiers: [] });

		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass("bkv-root");

		this.navEl = root.createDiv("bkv-nav");
		this.buildNav();

		this.viewContentEl = root.createDiv("bkv-content");

		this.unsubscribe = this.service.subscribe(() => {
			if (this.currentRoute !== "detail") this.renderRoute(this.currentRoute);
		});

		this.renderRoute("dashboard");
	}

	async onClose(): Promise<void> {
		this.unsubscribe?.();
		this.service?.destroy();
	}

	private async readJson<T>(path: string, fallback: T): Promise<T> {
		try {
			const raw = await this.app.vault.adapter.read(path);
			return JSON.parse(raw) as T;
		} catch {
			return fallback;
		}
	}

	private async writeJson(path: string, data: unknown): Promise<void> {
		try {
			if (!(await this.app.vault.adapter.exists(PLUGIN_DIR))) {
				await this.app.vault.adapter.mkdir(PLUGIN_DIR);
			}
		} catch { /* directory may already exist */ }
		await this.app.vault.adapter.write(path, JSON.stringify(data));
	}

	private buildNav(): void {
		this.navEl.empty();

		const logo = this.navEl.createDiv("bkv-nav__logo");
		const logoIcon = logo.createSpan("bkv-nav__logo-icon");
		setIcon(logoIcon, "book-open");
		logo.createSpan("bkv-nav__logo-text").setText("Book Visualizer");

		const stats = this.service.getStats();
		const badge = this.navEl.createDiv("bkv-nav__badge");
		badge.setText(`${stats.total} book${stats.total !== 1 ? "s" : ""}`);

		const items = this.navEl.createDiv("bkv-nav__items");
		NAV_ITEMS.forEach(({ id, label, icon }) => {
			const item = items.createDiv(`bkv-nav__item${this.currentRoute === id ? " bkv-nav__item--active" : ""}`);
			item.dataset.route = id;

			const iconEl = item.createSpan("bkv-nav__item-icon");
			setIcon(iconEl, icon);
			item.createSpan("bkv-nav__item-label").setText(label);

			item.addEventListener("click", () => {
				if (id === this.currentRoute) return;
				this.navigateTo(id);
			});
		});
	}

	private navigateTo(route: Route, data?: unknown): void {
		this.currentRoute = route;

		this.navEl.querySelectorAll(".bkv-nav__item").forEach((el) => {
			const r = (el as HTMLElement).dataset.route;
			el.classList.toggle("bkv-nav__item--active", r === route);
		});

		this.viewContentEl.classList.add("bkv-content--exit");
		setTimeout(() => {
			this.viewContentEl.classList.remove("bkv-content--exit");
			this.renderRoute(route, data);
			this.viewContentEl.classList.add("bkv-content--enter");
			setTimeout(() => this.viewContentEl.classList.remove("bkv-content--enter"), 300);
		}, 150);
	}

	private get bookHandlers() {
		return {
			onBookClick: (book: Book) => this.openBookDetail(book),
			onFavToggle: async (book: Book) => {
				const newVal = !book.favorite;
				book.favorite = newVal;
				await this.service.updateField(book, { favorite: newVal });
			},
			onToggleRead: async (book: Book) => {
				if (book.status === "read") {
					book.status = "to-read";
					book.finished = "";
					await this.service.updateField(book, { status: "to-read", finished: "" });
				} else {
					const finished = new Date().toISOString().split("T")[0];
					const timesRead = (book.timesRead || 0) + 1;
					book.status = "read";
					book.finished = finished;
					book.timesRead = timesRead;
					await this.service.updateField(book, { status: "read", finished, timesRead });
				}
			},
		};
	}

	private renderRoute(route: Route, data?: unknown): void {
		const nav = (r: Route) => this.navigateTo(r);
		const handlers = this.bookHandlers;

		switch (route) {
			case "dashboard":
				renderDashboard(this.viewContentEl, {
					service: this.service,
					...handlers,
					onViewAll: (r) => nav(r as Route),
				});
				break;

			case "catalog":
				new CatalogView({ service: this.service, ...handlers }).render(this.viewContentEl);
				break;

			case "to-read":
				new CatalogView({ service: this.service, ...handlers, initialFilter: { genres: [], status: "to-read" } }).render(this.viewContentEl);
				break;

			case "reading":
				new CatalogView({ service: this.service, ...handlers, initialFilter: { genres: [], status: "reading" } }).render(this.viewContentEl);
				break;

			case "read":
				new CatalogView({ service: this.service, ...handlers, initialFilter: { genres: [], status: "read" } }).render(this.viewContentEl);
				break;

			case "favorites":
				new CatalogView({ service: this.service, ...handlers, initialFilter: { genres: [], status: "favorites" } }).render(this.viewContentEl);
				break;

			case "search":
				renderSearch(this.viewContentEl, { service: this.service, ...handlers });
				break;

			case "top":
				renderTopList(this.viewContentEl, {
					service: this.service,
					onBookClick: handlers.onBookClick,
					onFavToggle: handlers.onFavToggle,
					onToggleRead: handlers.onToggleRead,
					customOrder: this.rankOrder,
					onSaveOrder: async (ids) => { this.rankOrder = ids; await this.writeJson(RANK_ORDER_PATH, ids); },
					allOrder: this.allOrder,
					onSaveAllOrder: async (ids) => { this.allOrder = ids; await this.writeJson(ALL_ORDER_PATH, ids); },
				});
				break;

			case "authors":
				renderAuthors(this.viewContentEl, { service: this.service, ...handlers });
				break;

			case "series":
				renderSeries(this.viewContentEl, { service: this.service, onBookClick: handlers.onBookClick });
				break;

			case "reviews":
				renderReviews(this.viewContentEl, { service: this.service, onBookClick: handlers.onBookClick });
				break;

			case "stats":
				renderStats(this.viewContentEl, this.service);
				break;

			case "tierlist":
				renderTierList(this.viewContentEl, {
					service: this.service,
					onBookClick: (book) => this.openBookDetail(book),
					savedData: this.tierListData,
					onSave: async (d) => { this.tierListData = d; await this.writeJson(TIERLIST_PATH, d); },
				});
				break;

			case "detail":
				if (data instanceof Object && "id" in data) {
					const book = this.service.getById((data as Book).id);
					if (book) this.renderDetail(book);
				}
				break;
		}
	}

	private openBookDetail(book: Book): void {
		this.currentRoute = "detail";
		this.navEl.querySelectorAll(".bkv-nav__item").forEach((el) => el.classList.remove("bkv-nav__item--active"));

		this.viewContentEl.classList.add("bkv-content--exit");
		setTimeout(() => {
			this.viewContentEl.classList.remove("bkv-content--exit");
			this.renderDetail(book);
			this.viewContentEl.classList.add("bkv-content--enter");
			setTimeout(() => this.viewContentEl.classList.remove("bkv-content--enter"), 300);
		}, 150);
	}

	private renderDetail(book: Book): void {
		const handlers = this.bookHandlers;
		renderBookDetail(this.viewContentEl, {
			book,
			service: this.service,
			onBack: () => this.navigateTo("catalog"),
			onBookClick: (b) => this.openBookDetail(b),
			onFavToggle: handlers.onFavToggle,
		});
	}
}
