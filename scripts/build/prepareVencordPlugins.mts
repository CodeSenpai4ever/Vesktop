/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { execSync } from "child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";

interface PluginEntry {
    name: string;
    url: string;
    branch?: string;
}

interface UserPluginsConfig {
    plugins: PluginEntry[];
}

const VENCORD_REPO = "https://github.com/Vendicated/Vencord.git";
const VENCORD_OUTPUT_FILES = [
    "vencordDesktopMain.js",
    "vencordDesktopPreload.js",
    "vencordDesktopRenderer.js",
    "vencordDesktopRenderer.css"
];

function run(cmd: string, cwd?: string) {
    console.log(`> ${cmd}` + (cwd ? ` (in ${cwd})` : ""));
    execSync(cmd, { cwd, stdio: "inherit" });
}

function main() {
    const configPath = resolve("userplugins.json");
    if (!existsSync(configPath)) {
        console.log("No userplugins.json found, skipping custom Vencord build.");
        return;
    }

    const config: UserPluginsConfig = JSON.parse(readFileSync(configPath, "utf-8"));
    if (!config.plugins || config.plugins.length === 0) {
        console.log("No plugins specified in userplugins.json, skipping custom Vencord build.");
        return;
    }

    console.log(`Found ${config.plugins.length} plugin(s) to install.`);

    // Clone Vencord into a temporary directory
    const workDir = join(tmpdir(), "vesktop-vencord-build");
    const vencordDir = join(workDir, "Vencord");

    mkdirSync(workDir, { recursive: true });

    if (existsSync(vencordDir)) {
        console.log("Removing previous Vencord clone...");
        run(`rm -rf "${vencordDir}"`);
    }

    console.log("Cloning Vencord...");
    run(`git clone --depth 1 ${VENCORD_REPO} "${vencordDir}"`);

    // Clone each plugin into Vencord's src/userplugins directory
    const userPluginsDir = join(vencordDir, "src", "userplugins");
    mkdirSync(userPluginsDir, { recursive: true });

    for (const plugin of config.plugins) {
        const pluginDir = join(userPluginsDir, plugin.name);
        console.log(`Cloning plugin "${plugin.name}" from ${plugin.url}...`);

        const branchArg = plugin.branch ? `--branch ${plugin.branch}` : "";
        run(`git clone --depth 1 ${branchArg} ${plugin.url} "${pluginDir}"`);
    }

    // Install Vencord dependencies and build
    console.log("Installing Vencord dependencies...");
    run("pnpm install --no-frozen-lockfile", vencordDir);

    console.log("Building Vencord...");
    run("pnpm build", vencordDir);

    // Copy built Vencord files to Vesktop's static directory
    const outputDir = resolve("static", "dist", "vencord");
    mkdirSync(outputDir, { recursive: true });

    const vencordDistDir = join(vencordDir, "dist");
    let copiedCount = 0;

    for (const file of VENCORD_OUTPUT_FILES) {
        const src = join(vencordDistDir, file);
        const dest = join(outputDir, file);
        if (existsSync(src)) {
            copyFileSync(src, dest);
            console.log(`Copied ${file}`);
            copiedCount++;
        } else {
            console.warn(`Warning: Expected Vencord output file not found: ${src}`);
        }
    }

    // Write a minimal package.json for validation
    writeFileSync(join(outputDir, "package.json"), "{}");

    if (copiedCount === VENCORD_OUTPUT_FILES.length) {
        console.log(`\nSuccessfully built Vencord with ${config.plugins.length} custom plugin(s).`);
        console.log(`Output files placed in: ${outputDir}`);
    } else {
        console.error(`\nWarning: Only ${copiedCount}/${VENCORD_OUTPUT_FILES.length} files were copied.`);
        process.exit(1);
    }
}

main();
