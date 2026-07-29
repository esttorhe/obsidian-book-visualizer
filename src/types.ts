// ABOUTME: Shared domain types for the Book Visualizer plugin.
// ABOUTME: Defines the Book model, filter/sort state, and aggregate card/stat shapes.
import type { TFile } from "obsidian";

export type BookStatus = "to-read" | "reading" | "read" | "dnf";

export type BookFormat = "physical" | "ebook" | "audiobook";

export interface Book {
	// Identity
	id: string;
	title: string;
	titleOriginal?: string;
	file: TFile;
	isbn?: string;
	isbn13?: string;

	// Authorship / publication
	author: string[];
	series?: string;
	seriesNumber?: number;
	year?: number; // publication year
	publisher?: string;
	pages?: number;
	language?: string;
	genre: string[];
	format?: BookFormat;

	// Scores
	scoreGoodreads?: number;
	rating?: number; // user 1–10 (supports 0.5 steps)

	// Visual
	cover?: string;
	coverBackdrop?: string;

	// User / reading state
	status: BookStatus;
	favorite: boolean;
	started?: string; // ISO date
	finished?: string; // ISO date
	currentPage?: number;
	timesRead: number;
	review?: string;
	mood?: string;

	// Meta
	synopsis?: string;
	awards?: string;
	tags: string[];
	created?: string;
	categories: string[];
}

export type SortKey =
	| "title"
	| "year"
	| "scoreGoodreads"
	| "rating"
	| "pages"
	| "finished"
	| "started"
	| "timesRead"
	| "author"
	| "series";

export type SortDirection = "asc" | "desc";

export type ViewMode = "grid-large" | "grid-compact" | "list" | "poster";

export type StatusFilter = "all" | "to-read" | "reading" | "read" | "dnf" | "favorites";

export interface FilterState {
	genres: string[];
	status: StatusFilter;
	format?: BookFormat;
	yearMin?: number;
	yearMax?: number;
	ratingMin?: number;
	ratingMax?: number;
	goodreadsMin?: number;
	author?: string;
	series?: string;
	query?: string;
}

export interface SortState {
	key: SortKey;
	direction: SortDirection;
}

export interface VaultStats {
	total: number;
	read: number;
	reading: number;
	toRead: number;
	dnf: number;
	favorites: number;
	avgRating: number;
	avgGoodreads: number;
	pagesRead: number;
	authors: number;
	series: number;
	genres: Record<string, number>;
	formats: Record<string, number>;
	byYear: Record<number, number>;
	finishedByYear: Record<number, number>;
	ratingDist: Record<number, number>;
	topAuthors: { name: string; count: number; avgRating: number }[];
}

export interface AuthorCard {
	name: string;
	count: number;
	readCount: number;
	avgRating: number;
	avgGoodreads: number;
	books: Book[];
	cover?: string;
}

export interface SeriesCard {
	name: string;
	count: number;
	readCount: number;
	avgRating: number;
	completion: number; // 0–1 fraction of entries with status "read"
	books: Book[]; // ordered by seriesNumber, then title
	cover?: string;
}
