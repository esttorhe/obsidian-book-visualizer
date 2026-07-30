// ABOUTME: Pure frontmatter parsing and coercion helpers for the Book model.
// ABOUTME: No Obsidian runtime imports so this module is unit-testable in isolation.
import type { Book, BookStatus, BookFormat } from "../types";

// Strip [[wikilink]] syntax (and optional alias) from a string.
export function stripWikilink(s: string): string {
	const inner = s.replace(/^\[\[/, "").replace(/\]\]$/, "");
	const pipe = inner.indexOf("|");
	return pipe >= 0 ? inner.slice(pipe + 1) : inner;
}

// Coerce a frontmatter value to a trimmed string[], dropping empty entries.
export function toStringArray(val: unknown): string[] {
	if (val === null || val === undefined || val === "") return [];
	const raw = Array.isArray(val) ? val : [val];
	return raw
		.map((v) => stripWikilink(String(v).trim()).trim())
		.filter((s) => s.length > 0);
}

export function toNumber(val: unknown): number | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	if (typeof val === "boolean") return undefined;
	const n = Number(val);
	return isNaN(n) ? undefined : n;
}

export function toStringValue(val: unknown): string | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	const s = String(val).trim();
	return s.length > 0 ? s : undefined;
}

// Parse a page count. Accepts a plain number or a string that may include
// separators or a "p"/"pages" suffix (e.g. "352", "352 pages", "1,024").
export function parsePages(val: unknown): number | undefined {
	if (val === null || val === undefined || val === "") return undefined;
	if (typeof val === "number") return isNaN(val) || val <= 0 ? undefined : Math.round(val);
	const s = String(val).replace(/,/g, "").trim();
	const m = s.match(/(\d+(?:\.\d+)?)/);
	if (!m) return undefined;
	const n = Number(m[1]);
	return isNaN(n) || n <= 0 ? undefined : Math.round(n);
}

export function parseBoolean(val: unknown): boolean {
	return val === true || val === "true" || val === "yes";
}

const VALID_STATUSES: BookStatus[] = ["to-read", "reading", "read", "dnf"];

// Resolve the reading status. An explicit, recognized `status` wins; otherwise
// infer from progress signals (finished/timesRead -> read, started/currentPage -> reading).
export function parseStatus(val: unknown, fm: Record<string, unknown>): BookStatus {
	const raw = toStringValue(val)?.toLowerCase().replace(/\s+/g, "-");
	if (raw) {
		if (VALID_STATUSES.includes(raw as BookStatus)) return raw as BookStatus;
		if (raw === "did-not-finish" || raw === "abandoned") return "dnf";
		if (raw === "finished" || raw === "done" || raw === "completed") return "read";
		if (raw === "currently-reading" || raw === "in-progress") return "reading";
		if (raw === "to-read" || raw === "unread" || raw === "want-to-read") return "to-read";
	}
	const finished = toStringValue(fm.finished);
	const timesRead = toNumber(fm.timesRead) ?? 0;
	if (finished || timesRead > 0) return "read";
	const started = toStringValue(fm.started);
	const currentPage = parsePages(fm.currentPage) ?? 0;
	if (started || currentPage > 0) return "reading";
	return "to-read";
}

const VALID_FORMATS: BookFormat[] = ["physical", "ebook", "audiobook"];

export function parseFormat(val: unknown): BookFormat | undefined {
	const raw = toStringValue(val)?.toLowerCase();
	if (!raw) return undefined;
	if (VALID_FORMATS.includes(raw as BookFormat)) return raw as BookFormat;
	if (raw === "paper" || raw === "paperback" || raw === "hardcover" || raw === "print") return "physical";
	if (raw === "kindle" || raw === "epub" || raw === "digital" || raw === "e-book") return "ebook";
	if (raw === "audio" || raw === "audible") return "audiobook";
	return undefined;
}

// Build the Book fields (everything except id + file) from a frontmatter object.
export function parseBookFields(fm: Record<string, unknown>): Omit<Book, "id" | "file"> {
	const rawTitle = toStringValue(fm.title);
	return {
		title: rawTitle ?? "Untitled",
		titleOriginal: toStringValue(fm.titleOriginal) ?? rawTitle,
		isbn: toStringValue(fm.isbn),
		isbn13: toStringValue(fm.isbn13),

		author: toStringArray(fm.author),
		series: toStringValue(fm.series),
		seriesNumber: toNumber(fm.seriesNumber),
		year: toNumber(fm.year),
		publisher: toStringValue(fm.publisher),
		pages: parsePages(fm.pages),
		language: toStringValue(fm.language),
		genre: toStringArray(fm.genre),
		format: parseFormat(fm.format),

		scoreGoodreads: toNumber(fm.scoreGoodreads),
		rating: toNumber(fm.rating),

		cover: toStringValue(fm.cover),
		coverBackdrop: toStringValue(fm.coverBackdrop),

		status: parseStatus(fm.status, fm),
		favorite: parseBoolean(fm.favorite),
		started: toStringValue(fm.started),
		finished: toStringValue(fm.finished),
		currentPage: parsePages(fm.currentPage),
		timesRead: toNumber(fm.timesRead) ?? 0,
		review: toStringValue(fm.review),
		mood: toStringValue(fm.mood),

		synopsis: toStringValue(fm.plot) ?? toStringValue(fm.synopsis),
		awards: toStringValue(fm.awards),
		tags: toStringArray(fm.tags),
		created: toStringValue(fm.created),
		categories: toStringArray(fm.categories),
	};
}

// Whether a frontmatter block marks a note as a Book (categories contains "Books").
export function isBookFrontmatter(fm: Record<string, unknown> | undefined): boolean {
	if (!fm) return false;
	const categories = toStringArray(fm.categories);
	return categories.some((c) => c === "Books" || c.toLowerCase().includes("books"));
}

// Fraction of a book that has been read, based on currentPage/pages. Clamped 0–1.
export function readingProgress(book: Pick<Book, "currentPage" | "pages" | "status">): number {
	if (book.status === "read") return 1;
	if (!book.pages || book.pages <= 0) return 0;
	if (!book.currentPage || book.currentPage <= 0) return 0;
	return Math.max(0, Math.min(1, book.currentPage / book.pages));
}
