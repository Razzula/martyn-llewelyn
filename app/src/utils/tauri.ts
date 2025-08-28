import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri as isTauriTauri } from "@tauri-apps/api/core";

export async function openInBrowser(uri: string | null) {
    if (uri) {
        await openUrl(uri);
    }
}

export const isTauri = isTauriTauri();
