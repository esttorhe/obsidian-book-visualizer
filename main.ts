// ABOUTME: Plugin entry point: registers the Book Visualizer view, ribbon icon and command.
// ABOUTME: Opens the visualizer in a workspace tab, reusing an existing leaf when present.
import { Plugin, WorkspaceLeaf } from "obsidian";
import { BookVisualizerView, BOOK_VIEW_TYPE } from "./src/BookVisualizerView";

export default class BookVisualizerPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(BOOK_VIEW_TYPE, (leaf: WorkspaceLeaf) => new BookVisualizerView(leaf));

		this.addRibbonIcon("book-open", "Book Visualizer", () => {
			this.activateView();
		});

		this.addCommand({
			id: "open-book-visualizer",
			name: "Open Book Visualizer",
			callback: () => this.activateView(),
		});
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(BOOK_VIEW_TYPE);
	}

	private async activateView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(BOOK_VIEW_TYPE);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({ type: BOOK_VIEW_TYPE, active: true });
		this.app.workspace.revealLeaf(leaf);
	}
}
