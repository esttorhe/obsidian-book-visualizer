// ABOUTME: Unit tests for frontmatter coercion and Book field parsing.
// ABOUTME: Covers missing fields, malformed page counts, status inference and multi-author input.
import { describe, it, expect } from "vitest";
import {
	stripWikilink,
	toStringArray,
	toNumber,
	toStringValue,
	parsePages,
	parseBoolean,
	parseStatus,
	parseFormat,
	parseBookFields,
	isBookFrontmatter,
	readingProgress,
} from "../src/services/frontmatter";

describe("stripWikilink", () => {
	it("removes brackets and keeps the alias when present", () => {
		expect(stripWikilink("[[Dune]]")).toBe("Dune");
		expect(stripWikilink("[[authors/Herbert|Frank Herbert]]")).toBe("Frank Herbert");
		expect(stripWikilink("plain")).toBe("plain");
	});
});

describe("toStringArray", () => {
	it("handles arrays, scalars, and empties", () => {
		expect(toStringArray(["A", "B"])).toEqual(["A", "B"]);
		expect(toStringArray("Solo")).toEqual(["Solo"]);
		expect(toStringArray(null)).toEqual([]);
		expect(toStringArray("")).toEqual([]);
	});

	it("trims, strips wikilinks and drops blanks", () => {
		expect(toStringArray([" [[Herbert]] ", "", "  ", "Tolkien"])).toEqual(["Herbert", "Tolkien"]);
	});
});

describe("toNumber", () => {
	it("coerces numeric strings and rejects junk", () => {
		expect(toNumber("8.2")).toBe(8.2);
		expect(toNumber(5)).toBe(5);
		expect(toNumber("")).toBeUndefined();
		expect(toNumber(null)).toBeUndefined();
		expect(toNumber("abc")).toBeUndefined();
		expect(toNumber(true)).toBeUndefined();
	});
});

describe("toStringValue", () => {
	it("trims and treats empty as undefined", () => {
		expect(toStringValue("  hi ")).toBe("hi");
		expect(toStringValue("")).toBeUndefined();
		expect(toStringValue(null)).toBeUndefined();
		expect(toStringValue(2020)).toBe("2020");
	});
});

describe("parsePages", () => {
	it("parses plain numbers", () => {
		expect(parsePages(352)).toBe(352);
	});
	it("parses noisy strings and separators", () => {
		expect(parsePages("352 pages")).toBe(352);
		expect(parsePages("1,024")).toBe(1024);
		expect(parsePages("448.0")).toBe(448);
	});
	it("rejects malformed / non-positive values", () => {
		expect(parsePages("")).toBeUndefined();
		expect(parsePages("unknown")).toBeUndefined();
		expect(parsePages(0)).toBeUndefined();
		expect(parsePages(-5)).toBeUndefined();
		expect(parsePages(null)).toBeUndefined();
	});
});

describe("parseBoolean", () => {
	it("accepts true, 'true', 'yes'", () => {
		expect(parseBoolean(true)).toBe(true);
		expect(parseBoolean("true")).toBe(true);
		expect(parseBoolean("yes")).toBe(true);
		expect(parseBoolean(false)).toBe(false);
		expect(parseBoolean("nope")).toBe(false);
		expect(parseBoolean(undefined)).toBe(false);
	});
});

describe("parseStatus", () => {
	it("honors explicit recognized status", () => {
		expect(parseStatus("reading", {})).toBe("reading");
		expect(parseStatus("READ", {})).toBe("read");
		expect(parseStatus("did not finish", {})).toBe("dnf");
		expect(parseStatus("want to read", {})).toBe("to-read");
	});

	it("infers read from finished date or timesRead", () => {
		expect(parseStatus(undefined, { finished: "2026-01-02" })).toBe("read");
		expect(parseStatus(undefined, { timesRead: 2 })).toBe("read");
	});

	it("infers reading from started date or currentPage", () => {
		expect(parseStatus(undefined, { started: "2026-01-02" })).toBe("reading");
		expect(parseStatus(undefined, { currentPage: 40 })).toBe("reading");
	});

	it("defaults to to-read", () => {
		expect(parseStatus(undefined, {})).toBe("to-read");
		expect(parseStatus("garbage", {})).toBe("to-read");
	});
});

describe("parseFormat", () => {
	it("recognizes canonical and common aliases", () => {
		expect(parseFormat("physical")).toBe("physical");
		expect(parseFormat("Hardcover")).toBe("physical");
		expect(parseFormat("kindle")).toBe("ebook");
		expect(parseFormat("audible")).toBe("audiobook");
		expect(parseFormat("scroll")).toBeUndefined();
		expect(parseFormat(undefined)).toBeUndefined();
	});
});

describe("parseBookFields", () => {
	it("fills defaults when frontmatter is nearly empty", () => {
		const b = parseBookFields({});
		expect(b.title).toBe("Untitled");
		expect(b.author).toEqual([]);
		expect(b.genre).toEqual([]);
		expect(b.status).toBe("to-read");
		expect(b.favorite).toBe(false);
		expect(b.timesRead).toBe(0);
		expect(b.pages).toBeUndefined();
	});

	it("parses a full book with multiple authors and a series", () => {
		const b = parseBookFields({
			title: "Good Omens",
			author: ["Terry Pratchett", "Neil Gaiman"],
			series: "Discworld-adjacent",
			seriesNumber: 1,
			year: 1990,
			pages: "412 pages",
			format: "paperback",
			scoreGoodreads: 4.24,
			rating: 9,
			favorite: "true",
			finished: "2026-03-01",
			categories: ["Books"],
		});
		expect(b.author).toEqual(["Terry Pratchett", "Neil Gaiman"]);
		expect(b.seriesNumber).toBe(1);
		expect(b.pages).toBe(412);
		expect(b.format).toBe("physical");
		expect(b.rating).toBe(9);
		expect(b.favorite).toBe(true);
		expect(b.status).toBe("read");
	});

	it("uses title as titleOriginal fallback", () => {
		expect(parseBookFields({ title: "Solaris" }).titleOriginal).toBe("Solaris");
		expect(parseBookFields({ title: "Solaris", titleOriginal: "Solaris (PL)" }).titleOriginal).toBe("Solaris (PL)");
	});
});

describe("isBookFrontmatter", () => {
	it("matches Books category case-insensitively", () => {
		expect(isBookFrontmatter({ categories: ["Books"] })).toBe(true);
		expect(isBookFrontmatter({ categories: ["My books"] })).toBe(true);
		expect(isBookFrontmatter({ categories: "Books" })).toBe(true);
		expect(isBookFrontmatter({ categories: ["Movies"] })).toBe(false);
		expect(isBookFrontmatter(undefined)).toBe(false);
	});
});

describe("readingProgress", () => {
	it("is 1 for read books regardless of pages", () => {
		expect(readingProgress({ status: "read", pages: undefined, currentPage: undefined })).toBe(1);
	});
	it("computes a clamped fraction while reading", () => {
		expect(readingProgress({ status: "reading", pages: 400, currentPage: 100 })).toBeCloseTo(0.25);
		expect(readingProgress({ status: "reading", pages: 400, currentPage: 900 })).toBe(1);
	});
	it("is 0 without usable data", () => {
		expect(readingProgress({ status: "reading", pages: undefined, currentPage: 100 })).toBe(0);
		expect(readingProgress({ status: "to-read", pages: 400, currentPage: 0 })).toBe(0);
	});
});
