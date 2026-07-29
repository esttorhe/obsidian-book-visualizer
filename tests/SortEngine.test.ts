// ABOUTME: Unit tests for the SortEngine across keys and directions.
// ABOUTME: Covers gap fallbacks, string vs numeric keys and series-number tie-breaking.
import { describe, it, expect } from "vitest";
import { SortEngine } from "../src/services/SortEngine";
import { makeBook } from "./helpers";

const engine = new SortEngine();

describe("SortEngine.sort", () => {
	it("sorts by title ascending and descending", () => {
		const books = [makeBook({ id: "b", title: "Banana" }), makeBook({ id: "a", title: "apple" })];
		expect(engine.sort(books, "title", "asc").map((b) => b.id)).toEqual(["a", "b"]);
		expect(engine.sort(books, "title", "desc").map((b) => b.id)).toEqual(["b", "a"]);
	});

	it("sorts by rating with unrated last (desc)", () => {
		const books = [
			makeBook({ id: "none" }),
			makeBook({ id: "high", rating: 9 }),
			makeBook({ id: "low", rating: 4 }),
		];
		expect(engine.sort(books, "rating", "desc").map((b) => b.id)).toEqual(["high", "low", "none"]);
	});

	it("sorts by pages, treating missing as 0", () => {
		const books = [makeBook({ id: "big", pages: 900 }), makeBook({ id: "none" }), makeBook({ id: "sm", pages: 120 })];
		expect(engine.sort(books, "pages", "asc").map((b) => b.id)).toEqual(["none", "sm", "big"]);
	});

	it("sorts by finished date descending (empty last)", () => {
		const books = [
			makeBook({ id: "old", finished: "2020-01-01" }),
			makeBook({ id: "new", finished: "2026-05-01" }),
			makeBook({ id: "never" }),
		];
		expect(engine.sort(books, "finished", "desc").map((b) => b.id)).toEqual(["new", "old", "never"]);
	});

	it("sorts by author using the first author", () => {
		const books = [
			makeBook({ id: "z", author: ["Zelazny"] }),
			makeBook({ id: "a", author: ["Asimov", "Someone"] }),
		];
		expect(engine.sort(books, "author", "asc").map((b) => b.id)).toEqual(["a", "z"]);
	});

	it("breaks series ties by series number", () => {
		const books = [
			makeBook({ id: "c", series: "Foundation", seriesNumber: 3 }),
			makeBook({ id: "a", series: "Foundation", seriesNumber: 1 }),
			makeBook({ id: "b", series: "Foundation", seriesNumber: 2 }),
		];
		expect(engine.sort(books, "series", "asc").map((b) => b.id)).toEqual(["a", "b", "c"]);
	});

	it("does not mutate the input array", () => {
		const books = [makeBook({ id: "b", title: "B" }), makeBook({ id: "a", title: "A" })];
		const before = books.map((b) => b.id);
		engine.sort(books, "title", "asc");
		expect(books.map((b) => b.id)).toEqual(before);
	});
});
