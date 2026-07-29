// ABOUTME: Indexes vault notes categorized as Books into an in-memory model and writes edits back.
// ABOUTME: Thin Obsidian wrapper around the pure frontmatter/aggregation/stats helpers.
import { App, TFile } from "obsidian";
import type { Book, VaultStats, AuthorCard, SeriesCard } from "../types";
import { parseBookFields, isBookFrontmatter } from "./frontmatter";
import { buildAuthorCards, buildSeriesCards, computeStats } from "./aggregations";

export class BookDataService {
	private app: App;
	private _books: Map<string, Book> = new Map();
	private listeners: Set<() => void> = new Set();
	private eventRef: ReturnType<App["metadataCache"]["on"]> | null = null;
	private vaultEventRef: ReturnType<App["vault"]["on"]> | null = null;

	constructor(app: App) {
		this.app = app;
	}

	async init(): Promise<void> {
		this.indexAll();

		this.eventRef = this.app.metadataCache.on("changed", (file) => {
			if (file.extension !== "md") return;
			this.indexFile(file);
			this.notify();
		});

		this.vaultEventRef = this.app.vault.on("delete", (file) => {
			if (!(file instanceof TFile)) return;
			if (this._books.has(file.basename)) {
				this._books.delete(file.basename);
				this.notify();
			}
		});
	}

	destroy(): void {
		if (this.eventRef) this.app.metadataCache.offref(this.eventRef);
		if (this.vaultEventRef) this.app.vault.offref(this.vaultEventRef);
	}

	private indexAll(): void {
		for (const file of this.app.vault.getMarkdownFiles()) {
			this.indexFile(file);
		}
	}

	private indexFile(file: TFile): void {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!isBookFrontmatter(cache?.frontmatter)) {
			this._books.delete(file.basename);
			return;
		}
		const fm = cache!.frontmatter as Record<string, unknown>;
		const fields = parseBookFields(fm);
		if (fields.title === "Untitled") fields.title = file.basename;
		this._books.set(file.basename, { id: file.basename, file, ...fields });
	}

	get books(): Book[] {
		return Array.from(this._books.values());
	}

	getById(id: string): Book | undefined {
		return this._books.get(id);
	}

	getByAuthor(author: string): Book[] {
		return this.books.filter((b) => b.author.some((a) => a.toLowerCase() === author.toLowerCase()));
	}

	getBySeries(series: string): Book[] {
		return this.books.filter((b) => (b.series ?? "").toLowerCase() === series.toLowerCase());
	}

	search(query: string): Book[] {
		const q = query.toLowerCase();
		return this.books.filter(
			(b) =>
				b.title.toLowerCase().includes(q) ||
				(b.titleOriginal ?? "").toLowerCase().includes(q) ||
				b.author.some((a) => a.toLowerCase().includes(q)) ||
				(b.series ?? "").toLowerCase().includes(q) ||
				b.genre.some((g) => g.toLowerCase().includes(q)) ||
				(b.synopsis ?? "").toLowerCase().includes(q)
		);
	}

	getAllGenres(): string[] {
		const set = new Set<string>();
		for (const b of this.books) b.genre.forEach((g) => set.add(g));
		return Array.from(set).sort();
	}

	getAllAuthors(): string[] {
		const set = new Set<string>();
		for (const b of this.books) b.author.forEach((a) => set.add(a));
		return Array.from(set).sort();
	}

	getAllSeries(): string[] {
		const set = new Set<string>();
		for (const b of this.books) if (b.series) set.add(b.series);
		return Array.from(set).sort();
	}

	getAuthorCards(): AuthorCard[] {
		return buildAuthorCards(this.books);
	}

	getSeriesCards(): SeriesCard[] {
		return buildSeriesCards(this.books);
	}

	getStats(): VaultStats {
		return computeStats(this.books);
	}

	async updateField(
		book: Book,
		updates: Partial<Pick<Book, "rating" | "favorite" | "status" | "started" | "finished" | "currentPage" | "timesRead" | "review" | "mood">>
	): Promise<void> {
		await this.app.fileManager.processFrontMatter(book.file, (fm) => {
			if (updates.rating !== undefined) fm.rating = updates.rating;
			if (updates.favorite !== undefined) fm.favorite = updates.favorite;
			if (updates.status !== undefined) fm.status = updates.status;
			if (updates.started !== undefined) fm.started = updates.started;
			if (updates.finished !== undefined) fm.finished = updates.finished;
			if (updates.currentPage !== undefined) fm.currentPage = updates.currentPage;
			if (updates.timesRead !== undefined) fm.timesRead = updates.timesRead;
			if (updates.review !== undefined) fm.review = updates.review;
			if (updates.mood !== undefined) fm.mood = updates.mood;
		});
	}

	subscribe(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => this.listeners.delete(fn);
	}

	private notify(): void {
		this.listeners.forEach((fn) => fn());
	}
}
