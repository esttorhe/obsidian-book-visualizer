// ABOUTME: Pure helpers for dashboard carousels (top rated, recently finished, etc.) and formatting.
// ABOUTME: No Obsidian imports so it can be unit-tested directly.
import type { Book } from "../types";

export class StatsEngine {
	topByRating(books: Book[], n: number): Book[] {
		return [...books]
			.filter((b) => b.rating != null)
			.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
			.slice(0, n);
	}

	topByGoodreads(books: Book[], n: number): Book[] {
		return [...books]
			.filter((b) => b.scoreGoodreads != null)
			.sort((a, b) => (b.scoreGoodreads ?? 0) - (a.scoreGoodreads ?? 0))
			.slice(0, n);
	}

	currentlyReading(books: Book[], n?: number): Book[] {
		const reading = books
			.filter((b) => b.status === "reading")
			.sort((a, b) => (b.started ?? "").localeCompare(a.started ?? ""));
		return n != null ? reading.slice(0, n) : reading;
	}

	recentlyFinished(books: Book[], n: number): Book[] {
		return [...books]
			.filter((b) => b.status === "read" && b.finished != null)
			.sort((a, b) => (b.finished ?? "").localeCompare(a.finished ?? ""))
			.slice(0, n);
	}

	toRead(books: Book[], n?: number): Book[] {
		const list = books
			.filter((b) => b.status === "to-read")
			.sort((a, b) => (b.scoreGoodreads ?? 0) - (a.scoreGoodreads ?? 0));
		return n != null ? list.slice(0, n) : list;
	}

	favorites(books: Book[], n?: number): Book[] {
		const favs = books
			.filter((b) => b.favorite)
			.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
		return n != null ? favs.slice(0, n) : favs;
	}

	// Human-friendly page count, e.g. "12,480 pages".
	formatPages(pages: number): string {
		return `${pages.toLocaleString("en-US")} page${pages === 1 ? "" : "s"}`;
	}

	// Compact page label for cards, e.g. "352p".
	formatBookPages(pages: number | undefined): string {
		if (!pages) return "";
		return `${pages}p`;
	}
}
