// ABOUTME: Unit tests for author/series aggregation and vault stats computation.
// ABOUTME: Covers series ordering, multi-author counting, completion and pages-read logic.
import { describe, it, expect } from "vitest";
import { orderSeriesBooks, buildAuthorCards, buildSeriesCards, computeStats } from "../src/services/aggregations";
import { StatsEngine } from "../src/services/StatsEngine";
import { makeBook } from "./helpers";

describe("orderSeriesBooks", () => {
	it("orders by series number, undefined last, then title", () => {
		const books = [
			makeBook({ id: "3", title: "Third", seriesNumber: 3 }),
			makeBook({ id: "x", title: "Zeta", seriesNumber: undefined }),
			makeBook({ id: "1", title: "First", seriesNumber: 1 }),
			makeBook({ id: "a", title: "Alpha", seriesNumber: undefined }),
		];
		expect(orderSeriesBooks(books).map((b) => b.id)).toEqual(["1", "3", "a", "x"]);
	});
});

describe("buildAuthorCards", () => {
	it("counts co-authored books under each author", () => {
		const books = [
			makeBook({ id: "1", author: ["Gaiman", "Pratchett"], rating: 9 }),
			makeBook({ id: "2", author: ["Gaiman"], rating: 7, status: "read" }),
		];
		const cards = buildAuthorCards(books);
		const gaiman = cards.find((c) => c.name === "Gaiman")!;
		const pratchett = cards.find((c) => c.name === "Pratchett")!;
		expect(gaiman.count).toBe(2);
		expect(gaiman.avgRating).toBeCloseTo(8);
		expect(gaiman.readCount).toBe(1);
		expect(pratchett.count).toBe(1);
	});

	it("orders authors by book count", () => {
		const books = [
			makeBook({ id: "1", author: ["A"] }),
			makeBook({ id: "2", author: ["B"] }),
			makeBook({ id: "3", author: ["B"] }),
		];
		expect(buildAuthorCards(books)[0].name).toBe("B");
	});
});

describe("buildSeriesCards", () => {
	it("groups, orders and computes completion", () => {
		const books = [
			makeBook({ id: "2", title: "Two", series: "Foundation", seriesNumber: 2, status: "read" }),
			makeBook({ id: "1", title: "One", series: "Foundation", seriesNumber: 1, status: "read" }),
			makeBook({ id: "3", title: "Three", series: "Foundation", seriesNumber: 3, status: "to-read" }),
			makeBook({ id: "solo", title: "Solo", status: "read" }),
		];
		const cards = buildSeriesCards(books);
		expect(cards).toHaveLength(1);
		const found = cards[0];
		expect(found.name).toBe("Foundation");
		expect(found.count).toBe(3);
		expect(found.books.map((b) => b.id)).toEqual(["1", "2", "3"]);
		expect(found.completion).toBeCloseTo(2 / 3);
	});
});

describe("computeStats", () => {
	it("summarizes statuses, favorites and unique authors/series", () => {
		const books = [
			makeBook({ id: "1", author: ["A"], series: "S", status: "read", rating: 8, scoreGoodreads: 4.0, pages: 300, finished: "2026-01-10", favorite: true, genre: ["Sci-Fi"], format: "physical", year: 1990 }),
			makeBook({ id: "2", author: ["A"], status: "reading", currentPage: 50, pages: 200, genre: ["Sci-Fi"], format: "ebook" }),
			makeBook({ id: "3", author: ["B"], status: "to-read", genre: ["Fantasy"] }),
			makeBook({ id: "4", author: ["B"], status: "dnf" }),
		];
		const s = computeStats(books);
		expect(s.total).toBe(4);
		expect(s.read).toBe(1);
		expect(s.reading).toBe(1);
		expect(s.toRead).toBe(1);
		expect(s.dnf).toBe(1);
		expect(s.favorites).toBe(1);
		expect(s.authors).toBe(2);
		expect(s.series).toBe(1);
		// pages read = full pages of read (300) + current page of reading (50)
		expect(s.pagesRead).toBe(350);
		expect(s.avgGoodreads).toBeCloseTo(4.0);
		expect(s.genres["Sci-Fi"]).toBe(2);
		expect(s.formats["physical"]).toBe(1);
		expect(s.finishedByYear[2026]).toBe(1);
		expect(s.topAuthors[0].count).toBe(2);
	});

	it("handles an empty vault without NaN", () => {
		const s = computeStats([]);
		expect(s.total).toBe(0);
		expect(s.avgRating).toBe(0);
		expect(s.pagesRead).toBe(0);
		expect(s.topAuthors).toEqual([]);
	});
});

describe("StatsEngine carousels", () => {
	const engine = new StatsEngine();
	const books = [
		makeBook({ id: "r1", status: "reading", started: "2026-05-01" }),
		makeBook({ id: "r2", status: "reading", started: "2026-06-01" }),
		makeBook({ id: "f1", status: "read", finished: "2026-04-01", rating: 9 }),
		makeBook({ id: "f2", status: "read", finished: "2026-05-15", rating: 6 }),
		makeBook({ id: "t1", status: "to-read", scoreGoodreads: 4.5 }),
	];

	it("currentlyReading is newest-started first", () => {
		expect(engine.currentlyReading(books).map((b) => b.id)).toEqual(["r2", "r1"]);
	});
	it("recentlyFinished is newest-finished first", () => {
		expect(engine.recentlyFinished(books, 5).map((b) => b.id)).toEqual(["f2", "f1"]);
	});
	it("topByRating orders by rating", () => {
		expect(engine.topByRating(books, 5).map((b) => b.id)).toEqual(["f1", "f2"]);
	});
	it("toRead surfaces to-read books", () => {
		expect(engine.toRead(books).map((b) => b.id)).toEqual(["t1"]);
	});
	it("formats page counts", () => {
		expect(engine.formatPages(12480)).toBe("12,480 pages");
		expect(engine.formatBookPages(352)).toBe("352p");
		expect(engine.formatBookPages(undefined)).toBe("");
	});
});
