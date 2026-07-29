// ABOUTME: Vitest configuration for the plugin's pure-logic unit tests.
// ABOUTME: Runs the node environment and only picks up files under tests/.
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
	},
});
