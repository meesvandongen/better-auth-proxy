import { defineConfig } from "vite-plus";

export default defineConfig({
	// Mirrors Biome's defaults, which the code was formatted with: tabs,
	// double quotes, 80 columns, sorted imports, and only JS/TS/JSON files.
	fmt: {
		ignorePatterns: [
			"dist/**",
			"**/*.md",
			"**/*.yaml",
			"**/*.yml",
			"**/*.html",
			"**/*.css",
			"renovate.json",
			"package.json",
		],
		useTabs: true,
		printWidth: 80,
		sortImports: { newlinesBetween: false },
		sortPackageJson: false,
	},
	lint: {
		ignorePatterns: ["dist/**"],
		options: { typeAware: true, typeCheck: true },
	},
});
