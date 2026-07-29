// ABOUTME: Stats view: summary cards plus bar charts and a pages-finished timeline.
// ABOUTME: Purely derived from computeStats(); no persistence or mutation here.
import { setIcon } from "obsidian";
import { BookDataService } from "../services/BookDataService";
import { StatsEngine } from "../services/StatsEngine";

const engine = new StatsEngine();

export function renderStats(container: HTMLElement, service: BookDataService): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--stats";

	const stats = service.getStats();

	const h1 = document.createElement("h1");
	h1.className = "bkv-view__title";
	h1.textContent = "Stats";
	container.appendChild(h1);

	if (stats.total === 0) {
		const empty = document.createElement("div");
		empty.className = "bkv-empty";
		const iconEl = document.createElement("div");
		iconEl.className = "bkv-empty__icon";
		setIcon(iconEl, "bar-chart-2");
		const p = document.createElement("p");
		p.textContent = "No data yet.";
		empty.appendChild(iconEl);
		empty.appendChild(p);
		container.appendChild(empty);
		return;
	}

	const summary = document.createElement("div");
	summary.className = "bkv-stats-summary";
	const summaryItems = [
		{ icon: "book", value: stats.total, label: "Total books" },
		{ icon: "check-circle", value: stats.read, label: "Read" },
		{ icon: "book-open", value: stats.reading, label: "Reading" },
		{ icon: "bookmark", value: stats.toRead, label: "To read" },
		{ icon: "heart", value: stats.favorites, label: "Favorites" },
		{ icon: "star", value: stats.avgRating > 0 ? stats.avgRating.toFixed(2) : "—", label: "Avg rating" },
		{ icon: "file-text", value: engine.formatPages(stats.pagesRead), label: "Pages read" },
		{ icon: "users", value: stats.authors, label: "Authors" },
		{ icon: "library", value: stats.series, label: "Series" },
	];
	summaryItems.forEach(({ icon, value, label }) => {
		const item = document.createElement("div");
		item.className = "bkv-stats-card";
		const iconEl = document.createElement("div");
		iconEl.className = "bkv-stats-card__icon";
		setIcon(iconEl, icon);
		const valueEl = document.createElement("span");
		valueEl.className = "bkv-stats-card__value";
		valueEl.textContent = String(value);
		const labelEl = document.createElement("span");
		labelEl.className = "bkv-stats-card__label";
		labelEl.textContent = label;
		item.appendChild(iconEl);
		item.appendChild(valueEl);
		item.appendChild(labelEl);
		summary.appendChild(item);
	});
	container.appendChild(summary);

	const chartsGrid = document.createElement("div");
	chartsGrid.className = "bkv-charts-grid";

	const genreEntries = Object.entries(stats.genres).sort((a, b) => b[1] - a[1]).slice(0, 10);
	if (genreEntries.length > 0) chartsGrid.appendChild(buildBarChart("Books by genre", genreEntries));

	const ratingEntries = Object.entries(stats.ratingDist)
		.sort((a, b) => Number(a[0]) - Number(b[0]))
		.map(([k, v]) => [`${k}/10`, v] as [string, number]);
	if (ratingEntries.length > 0) chartsGrid.appendChild(buildBarChart("My rating distribution", ratingEntries));

	const formatEntries = Object.entries(stats.formats).sort((a, b) => b[1] - a[1]);
	if (formatEntries.length > 0) chartsGrid.appendChild(buildBarChart("Books by format", formatEntries));

	const yearEntries = Object.entries(stats.byYear)
		.sort((a, b) => Number(a[0]) - Number(b[0]))
		.map(([k, v]) => [k, v] as [string, number]);
	if (yearEntries.length > 0) chartsGrid.appendChild(buildTimeline("Books by publication year", yearEntries));

	const finishedEntries = Object.entries(stats.finishedByYear)
		.sort((a, b) => Number(a[0]) - Number(b[0]))
		.map(([k, v]) => [k, v] as [string, number]);
	if (finishedEntries.length > 0) chartsGrid.appendChild(buildTimeline("Books finished by year", finishedEntries));

	if (stats.topAuthors.length > 0) {
		const entries = stats.topAuthors.map((a) => [a.name.split(" ").slice(-1)[0], a.count] as [string, number]);
		chartsGrid.appendChild(buildBarChart("Top authors", entries));
	}

	container.appendChild(chartsGrid);
}

function buildBarChart(title: string, entries: [string, number][]): HTMLElement {
	const section = document.createElement("div");
	section.className = "bkv-chart";

	const h = document.createElement("h3");
	h.className = "bkv-chart__title";
	h.textContent = title;
	section.appendChild(h);

	const max = Math.max(...entries.map((e) => e[1]));
	const bars = document.createElement("div");
	bars.className = "bkv-chart__bars";

	entries.forEach(([label, value]) => {
		const row = document.createElement("div");
		row.className = "bkv-chart__row";

		const labelEl = document.createElement("span");
		labelEl.className = "bkv-chart__label";
		labelEl.textContent = label;
		labelEl.title = label;

		const barWrap = document.createElement("div");
		barWrap.className = "bkv-chart__bar-wrap";
		const bar = document.createElement("div");
		bar.className = "bkv-chart__bar";
		const pct = max > 0 ? (value / max) * 100 : 0;
		bar.style.width = "0%";
		setTimeout(() => { bar.style.width = `${pct}%`; }, 50);

		const valEl = document.createElement("span");
		valEl.className = "bkv-chart__value";
		valEl.textContent = String(value);

		barWrap.appendChild(bar);
		row.appendChild(labelEl);
		row.appendChild(barWrap);
		row.appendChild(valEl);
		bars.appendChild(row);
	});

	section.appendChild(bars);
	return section;
}

function buildTimeline(title: string, entries: [string, number][]): HTMLElement {
	const section = document.createElement("div");
	section.className = "bkv-chart bkv-chart--timeline";

	const h = document.createElement("h3");
	h.className = "bkv-chart__title";
	h.textContent = title;
	section.appendChild(h);

	const max = Math.max(...entries.map((e) => e[1]));
	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("viewBox", `0 0 ${entries.length * 20} 60`);
	svg.setAttribute("preserveAspectRatio", "none");
	svg.setAttribute("class", "bkv-sparkline");

	if (entries.length > 1) {
		const points = entries.map((e, i) => {
			const x = i * 20 + 10;
			const y = max > 0 ? 55 - (e[1] / max) * 50 : 55;
			return `${x},${y}`;
		});
		const polyline = document.createElementNS(svgNS, "polyline");
		polyline.setAttribute("points", points.join(" "));
		polyline.setAttribute("fill", "none");
		polyline.setAttribute("stroke", "var(--interactive-accent)");
		polyline.setAttribute("stroke-width", "2");
		polyline.setAttribute("stroke-linecap", "round");
		polyline.setAttribute("stroke-linejoin", "round");
		svg.appendChild(polyline);

		entries.forEach((e, i) => {
			const x = i * 20 + 10;
			const y = max > 0 ? 55 - (e[1] / max) * 50 : 55;
			const circle = document.createElementNS(svgNS, "circle");
			circle.setAttribute("cx", String(x));
			circle.setAttribute("cy", String(y));
			circle.setAttribute("r", "3");
			circle.setAttribute("fill", "var(--interactive-accent)");
			const t = document.createElementNS(svgNS, "title");
			t.textContent = `${e[0]}: ${e[1]}`;
			circle.appendChild(t);
			svg.appendChild(circle);
		});
	}

	section.appendChild(svg);

	const xLabels = document.createElement("div");
	xLabels.className = "bkv-sparkline__labels";
	const step = Math.max(1, Math.floor(entries.length / 8));
	entries.forEach((e, i) => {
		if (i % step === 0 || i === entries.length - 1) {
			const label = document.createElement("span");
			label.textContent = e[0];
			xLabels.appendChild(label);
		}
	});
	section.appendChild(xLabels);

	return section;
}
