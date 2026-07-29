// ABOUTME: Unit tests for the catalog FilterEngine.
// ABOUTME: Covers status, genre, format, numeric ranges, author/series and free-text filters.
import { describe, it, expect } from "vitest";
import { FilterEngine } from "../src/services/FilterEngine";
import { makeBook } from "./helpers";

const engine = new FilterEngine();

const books = [
	makeBook({ id: "1", title: "Dune", author: ["Frank Herbert"], series: "Dune", genre: ["Sci-Fi"], status: "read", rating: 9, scoreGoodreads: 4.2, year: 1965, format: "physical", favorite: true }),
	makeBook({ id: "2", title: "Neuromancer", author: ["William Gibson"], genre: ["Sci-Fi", "Cyberpunk"], status: "reading", scoreGoodreads: 3.9, year: 1984, format: "ebook" }),
	makeBook({ id: "3", title: "The Hobbit", author: ["J.R.R. Tolkien"], series: "Middle-earth", genre: ["Fantasy"], status: "to-read", year: 1937, format: "audiobook" }),
	makeBook({ id: "4", title: "Mistborn", author: ["Brandon Sanderson"], series: "Mistborn", genre: ["Fantasy"], status: "dnf", rating: 5, year: 2006 }),
];

describe("FilterEngine.apply", () => {
	it("returns all with a default filter", () => {
		expect(engine.apply(books, { genres: [], status: "all" })).toHaveLength(4);
	});

	it("filters by status", () => {
		expect(engine.apply(books, { genres: [], status: "reading" }).map((b) => b.id)).toEqual(["2"]);
		expect(engine.apply(books, { genres: [], status: "read" }).map((b) => b.id)).toEqual(["1"]);
		expect(engine.apply(books, { genres: [], status: "dnf" }).map((b) => b.id)).toEqual(["4"]);
	});

	it("filters favorites", () => {
		expect(engine.apply(books, { genres: [], status: "favorites" }).map((b) => b.id)).toEqual(["1"]);
	});

	it("filters by genre (case-insensitive, any match)", () => {
		expect(engine.apply(books, { genres: ["fantasy"], status: "all" }).map((b) => b.id)).toEqual(["3", "4"]);
		expect(engine.apply(books, { genres: ["Sci-Fi"], status: "all" })).toHaveLength(2);
	});

	it("filters by format", () => {
		expect(engine.apply(books, { genres: [], status: "all", format: "audiobook" }).map((b) => b.id)).toEqual(["3"]);
	});

	it("filters by year range", () => {
		expect(engine.apply(books, { genres: [], status: "all", yearMin: 1980, yearMax: 2010 }).map((b) => b.id)).toEqual(["2", "4"]);
	});

	it("filters by rating range (excludes unrated)", () => {
		expect(engine.apply(books, { genres: [], status: "all", ratingMin: 6 }).map((b) => b.id)).toEqual(["1"]);
	});

	it("filters by minimum Goodreads score", () => {
		expect(engine.apply(books, { genres: [], status: "all", goodreadsMin: 4.0 }).map((b) => b.id)).toEqual(["1"]);
	});

	it("filters by author and series exactly", () => {
		expect(engine.apply(books, { genres: [], status: "all", author: "frank herbert" }).map((b) => b.id)).toEqual(["1"]);
		expect(engine.apply(books, { genres: [], status: "all", series: "mistborn" }).map((b) => b.id)).toEqual(["4"]);
	});

	it("free-text searches across title, author, series, genre and synopsis", () => {
		expect(engine.apply(books, { genres: [], status: "all", query: "gibson" }).map((b) => b.id)).toEqual(["2"]);
		expect(engine.apply(books, { genres: [], status: "all", query: "middle" }).map((b) => b.id)).toEqual(["3"]);
		const withSynopsis = [makeBook({ id: "5", title: "X", synopsis: "a tale of dragons" })];
		expect(engine.apply(withSynopsis, { genres: [], status: "all", query: "dragons" })).toHaveLength(1);
	});

	it("combines multiple predicates", () => {
		const res = engine.apply(books, { genres: ["Fantasy"], status: "all", yearMax: 1950 });
		expect(res.map((b) => b.id)).toEqual(["3"]);
	});
});
