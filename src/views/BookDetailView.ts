// ABOUTME: Full detail view for one book: cover, scores, series position, reading progress and edits.
// ABOUTME: Rating, status, current page, review and mood write back to frontmatter on change.
import { setIcon } from "obsidian";
import type { Book, BookStatus } from "../types";
import { BookDataService } from "../services/BookDataService";
import { StatsEngine } from "../services/StatsEngine";
import { createStarRating } from "../components/StarRating";
import { createCarousel } from "../components/Carousel";
import { readingProgress, cleanSearchTitle } from "../services/frontmatter";

const stats = new StatsEngine();

const STATUS_ORDER: BookStatus[] = ["to-read", "reading", "read", "dnf"];
const STATUS_LABEL: Record<BookStatus, string> = {
	"to-read": "To read",
	reading: "Reading",
	read: "Read",
	dnf: "Did not finish",
};

export interface BookDetailOptions {
	book: Book;
	service: BookDataService;
	onBack: () => void;
	onBookClick: (book: Book) => void;
	onFavToggle: (book: Book) => void;
}

function today(): string {
	return new Date().toISOString().split("T")[0];
}

export function renderBookDetail(container: HTMLElement, opts: BookDetailOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--detail";

	const { book, service, onBack, onBookClick, onFavToggle } = opts;

	const header = document.createElement("div");
	header.className = "bkv-detail__header";

	const back = document.createElement("button");
	back.className = "bkv-btn bkv-btn--ghost bkv-detail__back";
	setIcon(back, "arrow-left");
	back.addEventListener("click", onBack);
	header.appendChild(back);

	const bgSrc = book.coverBackdrop ?? book.cover;
	if (bgSrc) {
		const bgWrap = document.createElement("div");
		bgWrap.className = "bkv-detail__header-bg";
		const bgImg = document.createElement("img");
		bgImg.src = bgSrc;
		bgImg.alt = "";
		bgImg.className = "bkv-detail__header-bg-img";
		bgWrap.appendChild(bgImg);
		const bgGrad = document.createElement("div");
		bgGrad.className = "bkv-detail__header-bg-grad";
		bgWrap.appendChild(bgGrad);
		header.appendChild(bgWrap);
	}

	const inner = document.createElement("div");
	inner.className = "bkv-detail__header-inner";

	const coverWrap = document.createElement("div");
	coverWrap.className = "bkv-detail__cover-wrap";
	if (book.cover) {
		const cover = document.createElement("img");
		cover.src = book.cover;
		cover.alt = book.title;
		cover.className = "bkv-detail__cover";
		coverWrap.appendChild(cover);
	}
	inner.appendChild(coverWrap);

	const info = document.createElement("div");
	info.className = "bkv-detail__info";

	const title = document.createElement("h1");
	title.className = "bkv-detail__title";
	title.textContent = book.title;
	info.appendChild(title);

	if (book.titleOriginal && book.titleOriginal !== book.title) {
		const orig = document.createElement("p");
		orig.className = "bkv-detail__title-orig";
		orig.textContent = book.titleOriginal;
		info.appendChild(orig);
	}

	if (book.author.length) {
		const author = document.createElement("p");
		author.className = "bkv-detail__author";
		author.textContent = `by ${book.author.join(", ")}`;
		info.appendChild(author);
	}

	const metaLine = document.createElement("div");
	metaLine.className = "bkv-detail__meta-line";
	const metaParts: string[] = [];
	if (book.series) metaParts.push(book.seriesNumber != null ? `${book.series} #${book.seriesNumber}` : book.series);
	if (book.year) metaParts.push(String(book.year));
	if (book.pages) metaParts.push(stats.formatBookPages(book.pages));
	if (book.publisher) metaParts.push(book.publisher);
	if (book.language) metaParts.push(book.language.toUpperCase());
	if (book.format) metaParts.push(book.format);
	metaLine.textContent = metaParts.join(" · ");
	info.appendChild(metaLine);

	if (book.genre.length) {
		const genres = document.createElement("div");
		genres.className = "bkv-detail__genres";
		book.genre.forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "bkv-chip bkv-chip--sm";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	const scoresRow = document.createElement("div");
	scoresRow.className = "bkv-detail__scores";
	if (book.scoreGoodreads != null) {
		scoresRow.appendChild(buildScoreBadge("Goodreads", book.scoreGoodreads.toFixed(2), "goodreads"));
	}
	if (scoresRow.children.length) info.appendChild(scoresRow);

	// Reading progress (editable while reading)
	if (book.status === "reading") {
		info.appendChild(buildProgressEditor(book, service));
	}

	// User rating
	const ratingSection = document.createElement("div");
	ratingSection.className = "bkv-detail__rating-section";
	const ratingLabel = document.createElement("label");
	ratingLabel.className = "bkv-label";
	ratingLabel.textContent = "My rating";
	ratingSection.appendChild(ratingLabel);
	ratingSection.appendChild(createStarRating({
		value: book.rating,
		readonly: false,
		size: "lg",
		onChange: async (val) => { book.rating = val; await service.updateField(book, { rating: val }); },
	}));
	info.appendChild(ratingSection);

	// Actions
	const actions = document.createElement("div");
	actions.className = "bkv-detail__actions";

	const favBtn = document.createElement("button");
	favBtn.className = `bkv-btn bkv-btn--sm${book.favorite ? " bkv-btn--active" : ""}`;
	favBtn.textContent = book.favorite ? "In favorites" : "Add to favorites";
	setIcon(favBtn, "heart");
	favBtn.addEventListener("click", async () => {
		const newVal = !book.favorite;
		await service.updateField(book, { favorite: newVal });
		book.favorite = newVal;
		favBtn.textContent = newVal ? "In favorites" : "Add to favorites";
		setIcon(favBtn, "heart");
		favBtn.classList.toggle("bkv-btn--active", newVal);
		onFavToggle(book);
	});
	actions.appendChild(favBtn);

	// Status cycle button
	const statusBtn = document.createElement("button");
	statusBtn.className = "bkv-btn bkv-btn--sm bkv-btn--active";
	const paintStatus = () => {
		statusBtn.textContent = STATUS_LABEL[book.status];
		setIcon(statusBtn, book.status === "read" ? "check-circle" : book.status === "reading" ? "book-open" : book.status === "dnf" ? "x-circle" : "bookmark");
	};
	paintStatus();
	statusBtn.title = "Cycle reading status";
	statusBtn.addEventListener("click", async () => {
		const nextStatus = STATUS_ORDER[(STATUS_ORDER.indexOf(book.status) + 1) % STATUS_ORDER.length];
		const updates: Parameters<BookDataService["updateField"]>[1] = { status: nextStatus };
		if (nextStatus === "reading" && !book.started) { updates.started = today(); book.started = updates.started; }
		if (nextStatus === "read") {
			updates.finished = today();
			updates.timesRead = (book.timesRead || 0) + 1;
			book.finished = updates.finished;
			book.timesRead = updates.timesRead;
		}
		book.status = nextStatus;
		await service.updateField(book, updates);
		paintStatus();
		// Re-render so the progress editor appears/disappears with the new status.
		renderBookDetail(container, opts);
	});
	actions.appendChild(statusBtn);

	// External Goodreads link (search by ISBN13 when present, else title+author).
	// book.title falls back to the note's filename — which carries this vault's
	// capture-timestamp prefix — when there's no explicit `title` frontmatter
	// field, so it must be cleaned before it's used in a search query.
	const grHref = book.isbn13
		? `https://www.goodreads.com/search?q=${encodeURIComponent(book.isbn13)}`
		: `https://www.goodreads.com/search?q=${encodeURIComponent([cleanSearchTitle(book.title), ...book.author].join(" "))}`;
	const grLink = document.createElement("a");
	grLink.href = grHref;
	grLink.className = "bkv-btn bkv-btn--sm bkv-btn--ghost";
	grLink.textContent = "Goodreads";
	grLink.target = "_blank";
	grLink.rel = "noopener noreferrer";
	actions.appendChild(grLink);

	info.appendChild(actions);
	inner.appendChild(info);
	header.appendChild(inner);
	container.appendChild(header);

	// Body
	const body = document.createElement("div");
	body.className = "bkv-detail__body";

	if (book.synopsis) {
		const s = buildBodySection(body, "Synopsis");
		const p = document.createElement("p");
		p.className = "bkv-detail__synopsis";
		p.textContent = book.synopsis;
		s.appendChild(p);
	}

	// Reading history
	if (book.started || book.finished || book.timesRead > 0) {
		const s = buildBodySection(body, "Reading history");
		const p = document.createElement("p");
		p.className = "bkv-text-inline";
		const parts: string[] = [];
		if (book.started) parts.push(`Started ${book.started}`);
		if (book.finished) parts.push(`Finished ${book.finished}`);
		if (book.timesRead > 0) parts.push(`Read ${book.timesRead}×`);
		p.textContent = parts.join(" · ");
		s.appendChild(p);
	}

	if (book.awards) {
		const s = buildBodySection(body, "Awards");
		const p = document.createElement("p");
		p.className = "bkv-text-inline";
		p.textContent = book.awards;
		s.appendChild(p);
	}

	// Mood
	const moodSection = buildBodySection(body, "Mood");
	const moodInput = document.createElement("input");
	moodInput.type = "text";
	moodInput.className = "bkv-input bkv-input--sm";
	moodInput.placeholder = "e.g. cozy, bleak, propulsive...";
	moodInput.value = book.mood ?? "";
	let moodTimeout: ReturnType<typeof setTimeout>;
	moodInput.addEventListener("input", () => {
		clearTimeout(moodTimeout);
		moodTimeout = setTimeout(async () => { await service.updateField(book, { mood: moodInput.value }); }, 600);
	});
	moodSection.appendChild(moodInput);

	// Review
	const reviewSection = buildBodySection(body, "My review");
	const textarea = document.createElement("textarea");
	textarea.className = "bkv-detail__review";
	textarea.placeholder = "Write your review...";
	textarea.value = book.review ?? "";
	textarea.rows = 5;
	let reviewTimeout: ReturnType<typeof setTimeout>;
	textarea.addEventListener("input", () => {
		clearTimeout(reviewTimeout);
		reviewTimeout = setTimeout(async () => { await service.updateField(book, { review: textarea.value }); }, 800);
	});
	reviewSection.appendChild(textarea);

	container.appendChild(body);

	// More from author
	if (book.author.length) {
		const author = book.author[0];
		const authorBooks = service.getByAuthor(author).filter((b) => b.id !== book.id);
		if (authorBooks.length > 0) {
			const more = document.createElement("div");
			more.className = "bkv-detail__more";
			more.appendChild(createCarousel({
				title: `More from ${author}`,
				books: authorBooks,
				size: "compact",
				onCardClick: onBookClick,
			}));
			container.appendChild(more);
		}
	}
}

function buildProgressEditor(book: Book, service: BookDataService): HTMLElement {
	const wrap = document.createElement("div");
	wrap.className = "bkv-detail__progress";

	const label = document.createElement("label");
	label.className = "bkv-label";
	label.textContent = "Reading progress";
	wrap.appendChild(label);

	const barRow = document.createElement("div");
	barRow.className = "bkv-detail__progress-row";

	const bar = document.createElement("div");
	bar.className = "bkv-detail__progress-bar";
	const fill = document.createElement("div");
	fill.className = "bkv-detail__progress-fill";
	bar.appendChild(fill);
	barRow.appendChild(bar);

	const pctLabel = document.createElement("span");
	pctLabel.className = "bkv-detail__progress-pct";
	barRow.appendChild(pctLabel);
	wrap.appendChild(barRow);

	const inputRow = document.createElement("div");
	inputRow.className = "bkv-detail__progress-input";
	const pageInput = document.createElement("input");
	pageInput.type = "number";
	pageInput.min = "0";
	if (book.pages) pageInput.max = String(book.pages);
	pageInput.className = "bkv-input bkv-input--sm";
	pageInput.value = book.currentPage != null ? String(book.currentPage) : "";
	pageInput.placeholder = "0";
	const suffix = document.createElement("span");
	suffix.className = "bkv-detail__progress-suffix";
	suffix.textContent = book.pages ? `of ${book.pages} pages` : "pages read";
	inputRow.appendChild(pageInput);
	inputRow.appendChild(suffix);
	wrap.appendChild(inputRow);

	const paint = () => {
		const pct = Math.round(readingProgress(book) * 100);
		fill.style.width = `${pct}%`;
		pctLabel.textContent = `${pct}%`;
	};
	paint();

	let t: ReturnType<typeof setTimeout>;
	pageInput.addEventListener("input", () => {
		clearTimeout(t);
		t = setTimeout(async () => {
			const val = pageInput.value.trim() === "" ? undefined : Math.max(0, Number(pageInput.value));
			book.currentPage = val;
			await service.updateField(book, { currentPage: val ?? 0 });
			paint();
		}, 400);
	});

	return wrap;
}

function buildScoreBadge(label: string, value: string, mod: string): HTMLElement {
	const el = document.createElement("div");
	el.className = `bkv-score-badge bkv-score-badge--${mod}`;
	el.innerHTML = `<span class="bkv-score-badge__val">${value}</span><span class="bkv-score-badge__src">${label}</span>`;
	return el;
}

function buildBodySection(parent: HTMLElement, title: string): HTMLElement {
	const section = document.createElement("div");
	section.className = "bkv-detail__section";
	const h = document.createElement("h3");
	h.className = "bkv-detail__section-title";
	h.textContent = title;
	section.appendChild(h);
	parent.appendChild(section);
	return section;
}
