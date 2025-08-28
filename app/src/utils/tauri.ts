import { openUrl } from "@tauri-apps/plugin-opener";

export async function openInBrowser(uri: string | null) {
    if (uri) {
        await openUrl(uri);
    }
}

export const isTauri = !!(window as any).__TAURI_INTERNALS__;
