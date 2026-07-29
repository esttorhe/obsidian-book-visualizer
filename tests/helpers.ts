// ABOUTME: Test helper to build fully-formed Book objects with sensible defaults.
// ABOUTME: Lets each test override only the fields relevant to the case under test.
import type { Book } from "../src/types";

export function makeBook(overrides: Partial<Book> = {}): Book {
	return {
		id: overrides.title ?? "book",
		title: "Book",
		file: {} as Book["file"],
		author: [],
		genre: [],
		status: "to-read",
		favorite: false,
		timesRead: 0,
		tags: [],
		categories: ["Books"],
		...overrides,
	};
}
