/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { access, constants as FsConstants, writeFile } from "fs/promises";
import { VENCORD_FILES_DIR } from "main/vencordFilesDir";
import { join } from "path";

import { USER_AGENT } from "../constants";
import { downloadFile, fetchie } from "./http";

const API_BASE = "https://api.github.com";

export const FILES_TO_DOWNLOAD = [
    "vencordDesktopMain.js",
    "vencordDesktopPreload.js",
    "vencordDesktopRenderer.js",
    "vencordDesktopRenderer.css"
];

export interface ReleaseData {
    name: string;
    tag_name: string;
    html_url: string;
    assets: Array<{
        name: string;
        browser_download_url: string;
    }>;
}

export async function githubGet(endpoint: string) {
    const opts: RequestInit = {
        headers: {
            Accept: "application/vnd.github+json",
            "User-Agent": USER_AGENT
        }
    };

    if (process.env.GITHUB_TOKEN) (opts.headers! as any).Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    return fetchie(API_BASE + endpoint, opts, { retryOnNetworkError: true });
}

export async function downloadVencordFiles() {
    const release = await githubGet("/repos/Vendicated/Vencord/releases/latest");

    const { assets }: ReleaseData = await release.json();

    await Promise.all(
        assets
            .filter(({ name }) => FILES_TO_DOWNLOAD.some(f => name.startsWith(f)))
            .map(({ name, browser_download_url }) =>
                downloadFile(browser_download_url, join(VENCORD_FILES_DIR, name), {}, { retryOnNetworkError: true })
            )
    );
}

const existsAsync = (path: string) =>
    access(path, FsConstants.F_OK)
        .then(() => true)
        .catch(() => false);

export async function isValidVencordInstall(dir: string) {
    const results = await Promise.all(["package.json", ...FILES_TO_DOWNLOAD].map(f => existsAsync(join(dir, f))));
    return !results.includes(false);
}

function tryUseBundledVencord(): boolean {
    const bundledDir = join(app.getAppPath(), "static", "dist", "vencord");
    if (!existsSync(bundledDir)) return false;

    const allExist = FILES_TO_DOWNLOAD.every(f => existsSync(join(bundledDir, f)));
    if (!allExist) return false;

    console.log("[VencordLoader] Using bundled Vencord files");
    mkdirSync(VENCORD_FILES_DIR, { recursive: true });

    for (const file of FILES_TO_DOWNLOAD) {
        copyFileSync(join(bundledDir, file), join(VENCORD_FILES_DIR, file));
    }
    return true;
}

export async function ensureVencordFiles() {
    if (await isValidVencordInstall(VENCORD_FILES_DIR)) return;

    mkdirSync(VENCORD_FILES_DIR, { recursive: true });

    if (tryUseBundledVencord()) {
        await writeFile(join(VENCORD_FILES_DIR, "package.json"), "{}");
        return;
    }

    await Promise.all([downloadVencordFiles(), writeFile(join(VENCORD_FILES_DIR, "package.json"), "{}")]);
}

// TODO: remove this once enough time has passed
export function vencordSupportsSandboxing() {
    const supports = readFileSync(join(VENCORD_FILES_DIR, "vencordDesktopMain.js"), "utf-8").includes(
        "VencordGetRendererCss"
    );
    if (!supports) {
        console.warn(
            "⚠️  [VencordLoader] Vencord version is outdated and does not support sandboxing. Please update Vencord to the latest version."
        );
    }
    return supports;
}
