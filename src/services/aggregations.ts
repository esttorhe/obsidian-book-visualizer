// ABOUTME: Pure aggregation helpers that derive author cards, series cards and vault stats.
// ABOUTME: Operate on Book[] only (no Obsidian imports) so they are unit-testable.
import type { Book, AuthorCard, SeriesCard, VaultStats } from "../types";

function avg(nums: number[]): number {
	return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

// Order books within a series: by seriesNumber ascending (undefined last), then title.
export function orderSeriesBooks(books: Book[]): Book[] {
	return [...books].sort((a, b) => {
		const an = a.seriesNumber ?? Number.POSITIVE_INFINITY;
		const bn = b.seriesNumber ?? Number.POSITIVE_INFINITY;
		if (an !== bn) return an - bn;
		return a.title.localeCompare(b.title);
	});
}

export function buildAuthorCards(books: Book[]): AuthorCard[] {
	const map = new Map<string, Book[]>();
	for (const b of books) {
		for (const a of b.author) {
			if (!map.has(a)) map.set(a, []);
			map.get(a)!.push(b);
		}
	}
	const cards: AuthorCard[] = [];
	for (const [name, authored] of map.entries()) {
		const ratings = authored.filter((b) => b.rating != null).map((b) => b.rating!);
		const goodreads = authored.filter((b) => b.scoreGoodreads != null).map((b) => b.scoreGoodreads!);
		const sorted = [...authored].sort((a, b) => (b.rating ?? b.scoreGoodreads ?? 0) - (a.rating ?? a.scoreGoodreads ?? 0));
		cards.push({
			name,
			count: authored.length,
			readCount: authored.filter((b) => b.status === "read").length,
			avgRating: avg(ratings),
			avgGoodreads: avg(goodreads),
			books: sorted,
			cover: sorted.find((b) => b.cover)?.cover,
		});
	}
	return cards.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function buildSeriesCards(books: Book[]): SeriesCard[] {
	const map = new Map<string, Book[]>();
	for (const b of books) {
		if (!b.series) continue;
		if (!map.has(b.series)) map.set(b.series, []);
		map.get(b.series)!.push(b);
	}
	const cards: SeriesCard[] = [];
	for (const [name, entries] of map.entries()) {
		const ordered = orderSeriesBooks(entries);
		const ratings = ordered.filter((b) => b.rating != null).map((b) => b.rating!);
		const readCount = ordered.filter((b) => b.status === "read").length;
		cards.push({
			name,
			count: ordered.length,
			readCount,
			avgRating: avg(ratings),
			completion: ordered.length ? readCount / ordered.length : 0,
			books: ordered,
			cover: ordered.find((b) => b.cover)?.cover,
		});
	}
	return cards.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function computeStats(books: Book[]): VaultStats {
	const read = books.filter((b) => b.status === "read");
	const reading = books.filter((b) => b.status === "reading");
	const toRead = books.filter((b) => b.status === "to-read");
	const dnf = books.filter((b) => b.status === "dnf");
	const favorites = books.filter((b) => b.favorite);
	const rated = books.filter((b) => b.rating != null);
	const goodreadsRated = books.filter((b) => b.scoreGoodreads != null);

	const genres: Record<string, number> = {};
	const formats: Record<string, number> = {};
	const byYear: Record<number, number> = {};
	const finishedByYear: Record<number, number> = {};
	const ratingDist: Record<number, number> = {};
	const authorSet = new Set<string>();
	const seriesSet = new Set<string>();
	const authorMap = new Map<string, { count: number; ratings: number[] }>();

	for (const b of books) {
		b.genre.forEach((g) => { genres[g] = (genres[g] ?? 0) + 1; });
		if (b.format) formats[b.format] = (formats[b.format] ?? 0) + 1;
		if (b.year) byYear[b.year] = (byYear[b.year] ?? 0) + 1;
		if (b.status === "read" && b.finished) {
			const fy = Number(b.finished.slice(0, 4));
			if (!isNaN(fy)) finishedByYear[fy] = (finishedByYear[fy] ?? 0) + 1;
		}
		if (b.rating != null) {
			const r = Math.round(b.rating);
			ratingDist[r] = (ratingDist[r] ?? 0) + 1;
		}
		if (b.series) seriesSet.add(b.series);
		for (const a of b.author) {
			authorSet.add(a);
			if (!authorMap.has(a)) authorMap.set(a, { count: 0, ratings: [] });
			const entry = authorMap.get(a)!;
			entry.count++;
			if (b.rating != null) entry.ratings.push(b.rating);
		}
	}

	// Pages read: full page count for read books, current progress for reading books.
	const pagesRead = books.reduce((sum, b) => {
		if (b.status === "read") return sum + (b.pages ?? 0);
		if (b.status === "reading") return sum + (b.currentPage ?? 0);
		return sum;
	}, 0);

	const topAuthors = Array.from(authorMap.entries())
		.map(([name, { count, ratings }]) => ({ name, count, avgRating: avg(ratings) }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
		.slice(0, 10);

	return {
		total: books.length,
		read: read.length,
		reading: reading.length,
		toRead: toRead.length,
		dnf: dnf.length,
		favorites: favorites.length,
		avgRating: avg(rated.map((b) => b.rating!)),
		avgGoodreads: avg(goodreadsRated.map((b) => b.scoreGoodreads!)),
		pagesRead,
		authors: authorSet.size,
		series: seriesSet.size,
		genres,
		formats,
		byYear,
		finishedByYear,
		ratingDist,
		topAuthors,
	};
}
