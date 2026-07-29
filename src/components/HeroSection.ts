// ABOUTME: Large hero banner for the dashboard featuring one highlighted book.
// ABOUTME: Blurred cover backdrop, prominent cover, metadata, scores and quick actions.
import type { Book } from "../types";
import { StatsEngine } from "../services/StatsEngine";
import { readingProgress } from "../services/frontmatter";

const stats = new StatsEngine();

export interface HeroSectionOptions {
	book: Book;
	onDetail?: (book: Book) => void;
	onFavToggle?: (book: Book) => void;
}

export function createHeroSection(opts: HeroSectionOptions): HTMLElement {
	const { book, onDetail, onFavToggle } = opts;
	const hero = document.createElement("div");
	hero.className = "bkv-hero";

	const bgSrc = book.coverBackdrop ?? book.cover;
	if (bgSrc) {
		const bg = document.createElement("div");
		bg.className = "bkv-hero__bg-wrap";
		const img = document.createElement("img");
		img.src = bgSrc;
		img.alt = "";
		img.className = "bkv-hero__bg-img";
		bg.appendChild(img);
		const grad = document.createElement("div");
		grad.className = "bkv-hero__bg-grad";
		bg.appendChild(grad);
		hero.appendChild(bg);
	}

	const content = document.createElement("div");
	content.className = "bkv-hero__content";

	if (book.cover) {
		const cover = document.createElement("img");
		cover.src = book.cover;
		cover.alt = book.title;
		cover.className = "bkv-hero__cover";
		content.appendChild(cover);
	}

	const info = document.createElement("div");
	info.className = "bkv-hero__info";

	if (book.status === "reading") {
		const badge = document.createElement("span");
		badge.className = "bkv-hero__eyebrow";
		badge.textContent = "Currently reading";
		info.appendChild(badge);
	}

	const title = document.createElement("h1");
	title.className = "bkv-hero__title";
	title.textContent = book.title;
	info.appendChild(title);

	if (book.titleOriginal && book.titleOriginal !== book.title) {
		const orig = document.createElement("p");
		orig.className = "bkv-hero__title-orig";
		orig.textContent = book.titleOriginal;
		info.appendChild(orig);
	}

	if (book.author.length) {
		const author = document.createElement("p");
		author.className = "bkv-hero__author";
		author.textContent = `by ${book.author.join(", ")}`;
		info.appendChild(author);
	}

	const meta = document.createElement("div");
	meta.className = "bkv-hero__meta";
	const metaParts: string[] = [];
	if (book.series) metaParts.push(book.seriesNumber != null ? `${book.series} #${book.seriesNumber}` : book.series);
	if (book.year) metaParts.push(String(book.year));
	if (book.pages) metaParts.push(stats.formatBookPages(book.pages));
	meta.textContent = metaParts.join(" · ");
	info.appendChild(meta);

	if (book.genre.length) {
		const genres = document.createElement("div");
		genres.className = "bkv-hero__genres";
		book.genre.slice(0, 4).forEach((g) => {
			const chip = document.createElement("span");
			chip.className = "bkv-chip bkv-chip--sm";
			chip.textContent = g;
			genres.appendChild(chip);
		});
		info.appendChild(genres);
	}

	const scores = document.createElement("div");
	scores.className = "bkv-hero__scores";
	if (book.scoreGoodreads != null) {
		const s = document.createElement("span");
		s.className = "bkv-score-pill";
		s.innerHTML = `<span class="bkv-score-pill__src">Goodreads</span><span class="bkv-score-pill__val">${book.scoreGoodreads.toFixed(2)}</span>`;
		scores.appendChild(s);
	}
	if (book.rating != null) {
		const s = document.createElement("span");
		s.className = "bkv-score-pill bkv-score-pill--rating";
		s.innerHTML = `<span class="bkv-score-pill__src">My rating</span><span class="bkv-score-pill__val">${book.rating}/10</span>`;
		scores.appendChild(s);
	}
	if (scores.children.length) info.appendChild(scores);

	// Reading progress bar for the currently-reading hero
	const progress = readingProgress(book);
	if (book.status === "reading" && progress > 0) {
		const wrap = document.createElement("div");
		wrap.className = "bkv-hero__progress";
		const bar = document.createElement("div");
		bar.className = "bkv-hero__progress-bar";
		const fill = document.createElement("div");
		fill.className = "bkv-hero__progress-fill";
		fill.style.width = `${Math.round(progress * 100)}%`;
		bar.appendChild(fill);
		const label = document.createElement("span");
		label.className = "bkv-hero__progress-label";
		label.textContent = book.pages
			? `${book.currentPage ?? 0} / ${book.pages} pages · ${Math.round(progress * 100)}%`
			: `${Math.round(progress * 100)}%`;
		wrap.appendChild(bar);
		wrap.appendChild(label);
		info.appendChild(wrap);
	}

	if (book.synopsis) {
		const syn = document.createElement("p");
		syn.className = "bkv-hero__synopsis";
		syn.textContent = book.synopsis;
		info.appendChild(syn);
	}

	const actions = document.createElement("div");
	actions.className = "bkv-hero__actions";

	const btnDetail = document.createElement("button");
	btnDetail.className = "bkv-btn bkv-btn--primary";
	btnDetail.textContent = "View details";
	btnDetail.addEventListener("click", () => onDetail?.(book));
	actions.appendChild(btnDetail);

	const btnFav = document.createElement("button");
	btnFav.className = `bkv-btn bkv-btn--ghost${book.favorite ? " bkv-btn--active" : ""}`;
	btnFav.textContent = book.favorite ? "In favorites" : "Add to favorites";
	btnFav.addEventListener("click", () => onFavToggle?.(book));
	actions.appendChild(btnFav);

	info.appendChild(actions);
	content.appendChild(info);
	hero.appendChild(content);

	return hero;
}
