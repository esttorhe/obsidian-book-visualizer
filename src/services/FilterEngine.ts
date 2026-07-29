// ABOUTME: Applies the catalog FilterState to a list of books (status, genre, format, ranges, text).
// ABOUTME: Pure module with no Obsidian imports so it can be unit-tested directly.
import type { Book, FilterState } from "../types";

export class FilterEngine {
	apply(books: Book[], filter: FilterState): Book[] {
		let result = books;

		if (filter.query && filter.query.trim()) {
			const q = filter.query.toLowerCase();
			result = result.filter(
				(b) =>
					b.title.toLowerCase().includes(q) ||
					(b.titleOriginal ?? "").toLowerCase().includes(q) ||
					b.author.some((a) => a.toLowerCase().includes(q)) ||
					(b.series ?? "").toLowerCase().includes(q) ||
					b.genre.some((g) => g.toLowerCase().includes(q)) ||
					(b.synopsis ?? "").toLowerCase().includes(q)
			);
		}

		if (filter.genres.length > 0) {
			result = result.filter((b) =>
				filter.genres.some((g) => b.genre.some((bg) => bg.toLowerCase() === g.toLowerCase()))
			);
		}

		switch (filter.status) {
			case "to-read":
			case "reading":
			case "read":
			case "dnf":
				result = result.filter((b) => b.status === filter.status);
				break;
			case "favorites":
				result = result.filter((b) => b.favorite);
				break;
		}

		if (filter.format) result = result.filter((b) => b.format === filter.format);

		if (filter.yearMin != null) result = result.filter((b) => (b.year ?? 0) >= filter.yearMin!);
		if (filter.yearMax != null) result = result.filter((b) => (b.year ?? 9999) <= filter.yearMax!);

		if (filter.ratingMin != null) result = result.filter((b) => b.rating != null && b.rating >= filter.ratingMin!);
		if (filter.ratingMax != null) result = result.filter((b) => b.rating != null && b.rating <= filter.ratingMax!);

		if (filter.goodreadsMin != null) result = result.filter((b) => b.scoreGoodreads != null && b.scoreGoodreads >= filter.goodreadsMin!);

		if (filter.author) {
			const a = filter.author.toLowerCase();
			result = result.filter((b) => b.author.some((ba) => ba.toLowerCase() === a));
		}

		if (filter.series) {
			const s = filter.series.toLowerCase();
			result = result.filter((b) => (b.series ?? "").toLowerCase() === s);
		}

		return result;
	}
}
