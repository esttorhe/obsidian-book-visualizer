// ABOUTME: Sorts a list of books by a SortKey and direction, with sensible fallbacks for gaps.
// ABOUTME: Pure module with no Obsidian imports so it can be unit-tested directly.
import type { Book, SortKey, SortDirection } from "../types";

export class SortEngine {
	sort(books: Book[], key: SortKey, direction: SortDirection): Book[] {
		const copy = [...books];
		const dir = direction === "asc" ? 1 : -1;

		copy.sort((a, b) => {
			let va: number | string = 0;
			let vb: number | string = 0;

			switch (key) {
				case "title":
					va = a.title.toLowerCase();
					vb = b.title.toLowerCase();
					break;
				case "year":
					va = a.year ?? 0;
					vb = b.year ?? 0;
					break;
				case "scoreGoodreads":
					va = a.scoreGoodreads ?? -1;
					vb = b.scoreGoodreads ?? -1;
					break;
				case "rating":
					va = a.rating ?? -1;
					vb = b.rating ?? -1;
					break;
				case "pages":
					va = a.pages ?? 0;
					vb = b.pages ?? 0;
					break;
				case "finished":
					va = a.finished ?? "";
					vb = b.finished ?? "";
					break;
				case "started":
					va = a.started ?? "";
					vb = b.started ?? "";
					break;
				case "timesRead":
					va = a.timesRead;
					vb = b.timesRead;
					break;
				case "author":
					va = (a.author[0] ?? "").toLowerCase();
					vb = (b.author[0] ?? "").toLowerCase();
					break;
				case "series":
					va = (a.series ?? "").toLowerCase();
					vb = (b.series ?? "").toLowerCase();
					// tie-break by series number when in the same series
					if (va === vb) {
						const an = a.seriesNumber ?? Number.POSITIVE_INFINITY;
						const bn = b.seriesNumber ?? Number.POSITIVE_INFINITY;
						return (an - bn) * dir;
					}
					break;
			}

			if (typeof va === "string" && typeof vb === "string") {
				return va < vb ? -dir : va > vb ? dir : 0;
			}
			return ((va as number) - (vb as number)) * dir;
		});

		return copy;
	}
}
