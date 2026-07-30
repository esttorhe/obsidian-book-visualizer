// ABOUTME: Tier List view: drag books into customizable, colored tiers persisted per vault.
// ABOUTME: Supports adding/reordering/deleting tiers, editing labels/colors and PNG export.
import { setIcon } from "obsidian";
import type { Book } from "../types";
import { BookDataService } from "../services/BookDataService";

export interface TierEntry {
	id: string;
	label: string;
	color: string;
	bookIds: string[];
}

export interface TierListData {
	tiers: TierEntry[];
}

export interface TierListOptions {
	service: BookDataService;
	onBookClick: (book: Book) => void;
	savedData?: TierListData;
	onSave?: (data: TierListData) => void;
}

let _idSeq = 0;
function uid(): string {
	return `tier-${Date.now()}-${_idSeq++}`;
}

const DEFAULT_TIER_DEFS = [
	{ label: "S", color: "#ff7f7f" },
	{ label: "A", color: "#ffbf7f" },
	{ label: "B", color: "#ffdf7f" },
	{ label: "C", color: "#bfdf7f" },
	{ label: "D", color: "#7fbfbf" },
];

export function renderTierList(container: HTMLElement, opts: TierListOptions): void {
	container.innerHTML = "";
	container.className = "bkv-view bkv-view--tierlist";

	// Native HTML5 drag-and-drop only auto-scrolls the window/document, not an inner
	// scrollable pane like this one — so dragging near the top/bottom edge here would
	// otherwise do nothing. Drive it manually off drag events, which bubble to `container`.
	const autoScroll = attachAutoScroll(container);
	container.addEventListener("dragstart", autoScroll.onDragStart);
	container.addEventListener("dragover", autoScroll.onDragOver);
	container.addEventListener("dragend", autoScroll.onDragEnd);

	const books = opts.service.books;
	const bookMap = new Map(books.map((b) => [b.id, b]));

	let tiers: TierEntry[] = opts.savedData?.tiers?.length
		? opts.savedData.tiers.map((t) => ({ ...t, bookIds: t.bookIds.filter((id) => bookMap.has(id)) }))
		: DEFAULT_TIER_DEFS.map((def) => ({ id: uid(), ...def, bookIds: [] }));

	const save = () => opts.onSave?.({ tiers });

	const assignedIds = (): Set<string> => {
		const s = new Set<string>();
		tiers.forEach((t) => t.bookIds.forEach((id) => s.add(id)));
		return s;
	};

	const toolbar = document.createElement("div");
	toolbar.className = "bkv-tierlist__toolbar";
	container.appendChild(toolbar);

	const tiersEl = document.createElement("div");
	tiersEl.className = "bkv-tierlist__tiers";
	container.appendChild(tiersEl);

	const poolSection = document.createElement("div");
	poolSection.className = "bkv-tierlist__pool-section";
	container.appendChild(poolSection);

	const spacer = document.createElement("div");
	spacer.style.flex = "1";
	toolbar.appendChild(spacer);

	const addBtn = document.createElement("button");
	addBtn.className = "bkv-btn bkv-btn--sm bkv-btn--ghost";
	setIcon(addBtn, "plus");
	addBtn.appendChild(document.createTextNode(" Add tier"));
	addBtn.addEventListener("click", () => {
		tiers.push({ id: uid(), label: "New", color: "#9b9bcc", bookIds: [] });
		save();
		renderAll();
	});
	toolbar.appendChild(addBtn);

	const exportBtn = document.createElement("button");
	exportBtn.className = "bkv-btn bkv-btn--sm bkv-btn--ghost";
	setIcon(exportBtn, "camera");
	exportBtn.appendChild(document.createTextNode(" Save image"));
	exportBtn.addEventListener("click", () => exportTierList(tiers, bookMap));
	toolbar.appendChild(exportBtn);

	const resetBtn = document.createElement("button");
	resetBtn.className = "bkv-btn bkv-btn--sm bkv-btn--ghost bkv-btn--danger";
	setIcon(resetBtn, "rotate-ccw");
	resetBtn.appendChild(document.createTextNode(" Reset"));
	resetBtn.title = "Reset tier list to defaults (all books go back to pool)";
	resetBtn.addEventListener("click", () => {
		if (!confirm("Reset the entire tier list? All assignments will be cleared.")) return;
		tiers = DEFAULT_TIER_DEFS.map((def) => ({ id: uid(), ...def, bookIds: [] }));
		save();
		renderAll();
	});
	toolbar.appendChild(resetBtn);

	const poolHeader = document.createElement("div");
	poolHeader.className = "bkv-tierlist__pool-header";
	const poolLabelEl = document.createElement("span");
	poolLabelEl.className = "bkv-tierlist__pool-title";
	poolLabelEl.textContent = "Unranked";
	poolHeader.appendChild(poolLabelEl);
	poolSection.appendChild(poolHeader);

	const poolEl = document.createElement("div");
	poolEl.className = "bkv-tierlist__pool";
	poolSection.appendChild(poolEl);

	const onDropToTier = (tierId: string, bookId: string, sourceTierId: string) => {
		if (sourceTierId !== "pool") {
			const src = tiers.find((t) => t.id === sourceTierId);
			if (src) src.bookIds = src.bookIds.filter((id) => id !== bookId);
		}
		const dst = tiers.find((t) => t.id === tierId);
		if (dst && !dst.bookIds.includes(bookId)) dst.bookIds.push(bookId);
		save();
		renderAll();
	};

	const onDropToPool = (bookId: string, sourceTierId: string) => {
		if (sourceTierId === "pool") return;
		const src = tiers.find((t) => t.id === sourceTierId);
		if (src) src.bookIds = src.bookIds.filter((id) => id !== bookId);
		save();
		renderAll();
	};

	const renderTierRow = (tier: TierEntry, idx: number): HTMLElement => {
		const row = document.createElement("div");
		row.className = "bkv-tierlist__row";

		const labelCell = document.createElement("div");
		labelCell.className = "bkv-tierlist__label";
		labelCell.style.backgroundColor = tier.color;

		const labelText = document.createElement("span");
		labelText.className = "bkv-tierlist__label-text";
		labelText.textContent = tier.label;
		labelCell.appendChild(labelText);

		const editIcon = document.createElement("span");
		editIcon.className = "bkv-tierlist__label-edit-icon";
		setIcon(editIcon, "pencil");
		labelCell.appendChild(editIcon);

		labelCell.addEventListener("click", () => showTierEditor(tier, () => { save(); renderAll(); }));
		row.appendChild(labelCell);

		const booksCell = document.createElement("div");
		booksCell.className = "bkv-tierlist__books";
		attachDropZone(booksCell, (bookId, sourceTierId) => onDropToTier(tier.id, bookId, sourceTierId));
		tier.bookIds.forEach((id) => {
			const book = bookMap.get(id);
			if (book) booksCell.appendChild(createItem(book, tier.id, opts.onBookClick));
		});
		row.appendChild(booksCell);

		const controls = document.createElement("div");
		controls.className = "bkv-tierlist__row-controls";

		if (idx > 0) {
			const upBtn = document.createElement("button");
			upBtn.className = "bkv-btn bkv-btn--icon-plain";
			upBtn.title = "Move up";
			setIcon(upBtn, "chevron-up");
			upBtn.addEventListener("click", () => {
				[tiers[idx - 1], tiers[idx]] = [tiers[idx], tiers[idx - 1]];
				save(); renderAll();
			});
			controls.appendChild(upBtn);
		}

		if (idx < tiers.length - 1) {
			const downBtn = document.createElement("button");
			downBtn.className = "bkv-btn bkv-btn--icon-plain";
			downBtn.title = "Move down";
			setIcon(downBtn, "chevron-down");
			downBtn.addEventListener("click", () => {
				[tiers[idx], tiers[idx + 1]] = [tiers[idx + 1], tiers[idx]];
				save(); renderAll();
			});
			controls.appendChild(downBtn);
		}

		const delBtn = document.createElement("button");
		delBtn.className = "bkv-btn bkv-btn--icon-plain";
		delBtn.title = "Delete tier (books return to pool)";
		setIcon(delBtn, "trash-2");
		delBtn.addEventListener("click", () => {
			tiers = tiers.filter((t) => t.id !== tier.id);
			save(); renderAll();
		});
		controls.appendChild(delBtn);

		row.appendChild(controls);
		return row;
	};

	const renderAll = () => {
		tiersEl.innerHTML = "";
		tiers.forEach((tier, i) => tiersEl.appendChild(renderTierRow(tier, i)));

		poolEl.innerHTML = "";
		attachDropZone(poolEl, (bookId, sourceTierId) => onDropToPool(bookId, sourceTierId));

		const assigned = assignedIds();
		const pool = books.filter((b) => !assigned.has(b.id)).sort((a, b) => a.title.localeCompare(b.title));
		poolLabelEl.textContent = `Unranked (${pool.length})`;

		if (pool.length === 0) {
			const msg = document.createElement("p");
			msg.className = "bkv-tierlist__pool-empty";
			msg.textContent = "All books ranked!";
			poolEl.appendChild(msg);
		} else {
			pool.forEach((book) => poolEl.appendChild(createItem(book, "pool", opts.onBookClick)));
		}
	};

	renderAll();
}

function createItem(book: Book, sourceTierId: string, onClick: (b: Book) => void): HTMLElement {
	const item = document.createElement("div");
	item.className = "bkv-tierlist__item";
	item.draggable = true;
	item.title = book.title;

	if (book.cover) {
		const img = document.createElement("img");
		img.src = book.cover;
		img.alt = book.title;
		img.loading = "lazy";
		item.appendChild(img);
	} else {
		const fb = document.createElement("div");
		fb.className = "bkv-tierlist__item-fallback";
		fb.textContent = book.title.slice(0, 2).toUpperCase();
		item.appendChild(fb);
	}

	item.addEventListener("dragstart", (e) => {
		e.dataTransfer!.setData("text/plain", JSON.stringify({ bookId: book.id, sourceTierId }));
		e.dataTransfer!.effectAllowed = "move";
		setTimeout(() => item.classList.add("bkv-tierlist__item--dragging"), 0);
	});
	item.addEventListener("dragend", () => item.classList.remove("bkv-tierlist__item--dragging"));
	item.addEventListener("click", () => onClick(book));

	return item;
}

const AUTOSCROLL_EDGE_ZONE = 60; // px from the container's top/bottom edge that triggers scrolling
const AUTOSCROLL_MAX_SPEED = 18; // px per animation frame at the very edge

interface AutoScrollController {
	onDragStart: () => void;
	onDragOver: (e: DragEvent) => void;
	onDragEnd: () => void;
}

function attachAutoScroll(scrollEl: HTMLElement): AutoScrollController {
	let pointerY: number | null = null;
	let rafId: number | null = null;

	const tick = () => {
		if (pointerY != null) {
			const rect = scrollEl.getBoundingClientRect();
			const distFromTop = pointerY - rect.top;
			const distFromBottom = rect.bottom - pointerY;
			if (distFromTop >= 0 && distFromTop < AUTOSCROLL_EDGE_ZONE) {
				scrollEl.scrollTop -= AUTOSCROLL_MAX_SPEED * (1 - distFromTop / AUTOSCROLL_EDGE_ZONE);
			} else if (distFromBottom >= 0 && distFromBottom < AUTOSCROLL_EDGE_ZONE) {
				scrollEl.scrollTop += AUTOSCROLL_MAX_SPEED * (1 - distFromBottom / AUTOSCROLL_EDGE_ZONE);
			}
		}
		rafId = requestAnimationFrame(tick);
	};

	return {
		onDragStart: () => {
			pointerY = null;
			if (rafId == null) rafId = requestAnimationFrame(tick);
		},
		onDragOver: (e: DragEvent) => {
			pointerY = e.clientY;
		},
		onDragEnd: () => {
			pointerY = null;
			if (rafId != null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
		},
	};
}

function attachDropZone(el: HTMLElement, onDrop: (bookId: string, sourceTierId: string) => void): void {
	el.addEventListener("dragover", (e) => {
		e.preventDefault();
		el.classList.add("bkv-tierlist__drop--active");
	});
	el.addEventListener("dragleave", (e) => {
		if (!el.contains(e.relatedTarget as Node)) el.classList.remove("bkv-tierlist__drop--active");
	});
	el.addEventListener("drop", (e) => {
		e.preventDefault();
		el.classList.remove("bkv-tierlist__drop--active");
		try {
			const { bookId, sourceTierId } = JSON.parse(e.dataTransfer!.getData("text/plain"));
			onDrop(bookId, sourceTierId);
		} catch { /* ignore malformed drag payloads */ }
	});
}

const PRESET_COLORS = [
	"#ff7f7f", "#ff4d4d", "#cc0000",
	"#ffbf7f", "#ff8c00", "#cc5500",
	"#ffef7f", "#ffd700", "#b8a000",
	"#bfff7f", "#80cc00", "#559900",
	"#7fffff", "#00bfbf", "#007a7a",
	"#7fbfff", "#1e90ff", "#0055cc",
	"#bf7fff", "#8844ee", "#550099",
	"#ff7fbf", "#ee44aa", "#aa0066",
	"#ffffff", "#aaaaaa", "#555555",
];

function showTierEditor(tier: TierEntry, onDone: () => void): void {
	document.querySelectorAll(".bkv-tierlist__modal-overlay").forEach((el) => el.remove());

	const overlay = document.createElement("div");
	overlay.className = "bkv-tierlist__modal-overlay";

	const modal = document.createElement("div");
	modal.className = "bkv-tierlist__modal";

	const header = document.createElement("div");
	header.className = "bkv-tierlist__modal-header";
	const title = document.createElement("span");
	title.className = "bkv-tierlist__modal-title";
	title.textContent = "Edit tier";
	header.appendChild(title);
	modal.appendChild(header);

	const nameLabel = document.createElement("span");
	nameLabel.className = "bkv-tierlist__editor-label";
	nameLabel.textContent = "Name";
	modal.appendChild(nameLabel);

	const labelInput = document.createElement("input");
	labelInput.type = "text";
	labelInput.value = tier.label;
	labelInput.className = "bkv-input bkv-tierlist__label-input";
	labelInput.maxLength = 12;
	labelInput.placeholder = "Tier name";
	modal.appendChild(labelInput);

	const colorLabel = document.createElement("span");
	colorLabel.className = "bkv-tierlist__editor-label";
	colorLabel.textContent = "Color";
	modal.appendChild(colorLabel);

	const previewRow = document.createElement("div");
	previewRow.className = "bkv-tierlist__editor-preview-row";

	const preview = document.createElement("div");
	preview.className = "bkv-tierlist__color-preview";
	preview.style.backgroundColor = tier.color;
	previewRow.appendChild(preview);

	const hexInput = document.createElement("input");
	hexInput.type = "text";
	hexInput.value = tier.color;
	hexInput.className = "bkv-input bkv-tierlist__hex-input";
	hexInput.placeholder = "#rrggbb";
	hexInput.maxLength = 7;
	previewRow.appendChild(hexInput);

	const nativePicker = document.createElement("input");
	nativePicker.type = "color";
	nativePicker.value = tier.color;
	nativePicker.className = "bkv-tierlist__native-picker";

	const pickerBtn = document.createElement("button");
	pickerBtn.className = "bkv-btn bkv-btn--sm bkv-btn--ghost bkv-tierlist__picker-btn";
	pickerBtn.title = "Custom color";
	setIcon(pickerBtn, "pipette");
	pickerBtn.appendChild(nativePicker);
	previewRow.appendChild(pickerBtn);
	modal.appendChild(previewRow);

	let selectedColor = tier.color;
	const applyColor = (hex: string) => {
		selectedColor = hex;
		preview.style.backgroundColor = hex;
		hexInput.value = hex;
		nativePicker.value = hex;
		modal.querySelectorAll(".bkv-tierlist__swatch").forEach((s) =>
			s.classList.toggle("bkv-tierlist__swatch--active", (s as HTMLElement).dataset.hex === hex)
		);
	};

	hexInput.addEventListener("input", () => {
		const v = hexInput.value.trim();
		if (/^#[0-9a-fA-F]{6}$/.test(v)) applyColor(v);
	});
	nativePicker.addEventListener("input", () => applyColor(nativePicker.value));

	const palette = document.createElement("div");
	palette.className = "bkv-tierlist__palette";
	PRESET_COLORS.forEach((hex) => {
		const swatch = document.createElement("button");
		swatch.className = "bkv-tierlist__swatch";
		swatch.dataset.hex = hex;
		swatch.style.backgroundColor = hex;
		swatch.title = hex;
		if (hex === tier.color) swatch.classList.add("bkv-tierlist__swatch--active");
		swatch.addEventListener("click", (e) => { e.stopPropagation(); applyColor(hex); });
		palette.appendChild(swatch);
	});
	modal.appendChild(palette);

	const actions = document.createElement("div");
	actions.className = "bkv-tierlist__editor-actions";

	const cancelBtn = document.createElement("button");
	cancelBtn.className = "bkv-btn bkv-btn--sm bkv-btn--ghost";
	cancelBtn.textContent = "Cancel";
	cancelBtn.addEventListener("click", () => overlay.remove());
	actions.appendChild(cancelBtn);

	const okBtn = document.createElement("button");
	okBtn.className = "bkv-btn bkv-btn--sm bkv-btn--primary";
	okBtn.textContent = "Apply";
	okBtn.addEventListener("click", () => {
		tier.label = labelInput.value.trim() || tier.label;
		tier.color = selectedColor;
		overlay.remove();
		onDone();
	});
	actions.appendChild(okBtn);
	modal.appendChild(actions);

	overlay.appendChild(modal);
	document.body.appendChild(overlay);

	overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
	labelInput.focus();
	labelInput.select();
}

async function exportTierList(tiers: TierEntry[], bookMap: Map<string, Book>): Promise<void> {
	const LABEL_W = 90;
	const ITEM_W = 66;
	const ITEM_H = 99;
	const GAP = 3;
	const PAD = 6;
	const ROW_H = ITEM_H + PAD * 2;
	const MIN_W = 900;

	const maxItems = Math.max(...tiers.map((t) => t.bookIds.length), 1);
	const canvasW = Math.max(MIN_W, LABEL_W + maxItems * (ITEM_W + GAP) + PAD * 2);
	const canvasH = tiers.length * ROW_H;

	const canvas = document.createElement("canvas");
	canvas.width = canvasW;
	canvas.height = canvasH;
	const ctx = canvas.getContext("2d")!;

	ctx.fillStyle = "#1a1a2e";
	ctx.fillRect(0, 0, canvasW, canvasH);

	const imgCache = new Map<string, HTMLImageElement>();
	const allIds = [...new Set(tiers.flatMap((t) => t.bookIds))];

	await Promise.allSettled(
		allIds.map(async (id) => {
			const book = bookMap.get(id);
			if (!book?.cover) return;
			try {
				const res = await fetch(book.cover);
				const blob = await res.blob();
				const objectUrl = URL.createObjectURL(blob);
				await new Promise<void>((resolve) => {
					const img = new Image();
					img.onload = () => { imgCache.set(id, img); URL.revokeObjectURL(objectUrl); resolve(); };
					img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(); };
					img.src = objectUrl;
				});
			} catch { /* fall back to text */ }
		})
	);

	tiers.forEach((tier, rowIdx) => {
		const y = rowIdx * ROW_H;

		ctx.fillStyle = "#0f172a";
		ctx.fillRect(LABEL_W, y, canvasW - LABEL_W, ROW_H);

		ctx.fillStyle = tier.color;
		ctx.fillRect(0, y, LABEL_W, ROW_H);

		const fontSize = tier.label.length > 6 ? 14 : tier.label.length > 3 ? 18 : 24;
		ctx.fillStyle = "#000000";
		ctx.font = `bold ${fontSize}px sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(tier.label, LABEL_W / 2, y + ROW_H / 2, LABEL_W - 8);

		tier.bookIds.forEach((id, i) => {
			const x = LABEL_W + PAD + i * (ITEM_W + GAP);
			const imgY = y + PAD;
			const img = imgCache.get(id);
			if (img) {
				ctx.drawImage(img, x, imgY, ITEM_W, ITEM_H);
			} else {
				const book = bookMap.get(id);
				ctx.fillStyle = "#2d2d4e";
				ctx.fillRect(x, imgY, ITEM_W, ITEM_H);
				if (book) {
					ctx.fillStyle = "#aaaacc";
					ctx.font = "bold 11px sans-serif";
					ctx.textAlign = "center";
					ctx.textBaseline = "middle";
					const words = book.title.split(" ");
					const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
					const line2 = words.slice(Math.ceil(words.length / 2)).join(" ");
					ctx.fillText(line1, x + ITEM_W / 2, imgY + ITEM_H / 2 - 8, ITEM_W - 4);
					if (line2) ctx.fillText(line2, x + ITEM_W / 2, imgY + ITEM_H / 2 + 8, ITEM_W - 4);
				}
			}
		});

		ctx.strokeStyle = "#334155";
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, y + ROW_H - 0.5);
		ctx.lineTo(canvasW, y + ROW_H - 0.5);
		ctx.stroke();
	});

	ctx.strokeStyle = "#334155";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(LABEL_W - 1, 0);
	ctx.lineTo(LABEL_W - 1, canvasH);
	ctx.stroke();

	canvas.toBlob((blob) => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "book-tierlist.png";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}, "image/png");
}
