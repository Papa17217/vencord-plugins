import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findByPropsLazy } from "@webpack";
import { SelectedChannelStore, React } from "@webpack/common";
import { Devs } from "@utils/constants";

// Konfiguracja skrótów klawiszowych dla emoji
export const settings = definePluginSettings({
    emoji1: { type: OptionType.STRING, description: "Klawisz 1 (Domyślnie 👍)", default: "👍" },
    emoji2: { type: OptionType.STRING, description: "Klawisz 2 (Domyślnie 🔥)", default: "🔥" },
    emoji3: { type: OptionType.STRING, description: "Klawisz 3 (Domyślnie 😂)", default: "😂" },
    emoji4: { type: OptionType.STRING, description: "Klawisz 4 (Domyślnie 👀)", default: "👀" },
    emoji5: { type: OptionType.STRING, description: "Klawisz 5 (Domyślnie ❤️)", default: "❤️" }
});

const handleKeyDown = (e: KeyboardEvent) => {
    // Sprawdzamy klawisze 1-5
    if (e.key >= "1" && e.key <= "5") {
        const activeEl = document.activeElement;
        
        // Zabezpieczenie: Ignorujemy klawisze, gdy użytkownik pisze na czacie lub w inpucie
        if (activeEl && (
            activeEl.tagName === "INPUT" || 
            activeEl.tagName === "TEXTAREA" || 
            activeEl.hasAttribute("contenteditable") ||
            activeEl.classList.contains("slateTextArea")
        )) {
            return;
        }

        // Wyszukiwanie elementu wiadomości pod kursorem myszy
        const hoveredMessage = document.querySelector("[class*='message-']:hover, [id^='chat-messages-']:hover");
        if (!hoveredMessage) return;

        const msgDomId = hoveredMessage.id;
        if (!msgDomId || !msgDomId.startsWith("chat-messages-")) return;
        const messageId = msgDomId.replace("chat-messages-", "");

        const channelId = SelectedChannelStore.getChannelId();
        if (!channelId || !messageId) return;

        // Wybór odpowiedniego emoji
        let emojiName = "👍";
        if (e.key === "1") emojiName = settings.store.emoji1 ?? "👍";
        else if (e.key === "2") emojiName = settings.store.emoji2 ?? "🔥";
        else if (e.key === "3") emojiName = settings.store.emoji3 ?? "😂";
        else if (e.key === "4") emojiName = settings.store.emoji4 ?? "👀";
        else if (e.key === "5") emojiName = settings.store.emoji5 ?? "❤️";

        console.log(`[QuickReactions] Dodawanie reakcji: ${emojiName} do wiadomości ${messageId}`);
        try {
            const ReactionModule = findByPropsLazy("addReaction");
            ReactionModule.addReaction(channelId, messageId, { name: emojiName });
        } catch (err) {
            console.error("[QuickReactions] Błąd podczas dodawania reakcji:", err);
        }
    }
};

export default definePlugin({
    name: "QuickReactions",
    description: "Szybkie reagowanie na wiadomości. Najedź myszką na wiadomość i wciśnij klawisz 1-5, aby dodać emoji.",
    authors: [Devs.papa],
    settings,
    
    start() {
        console.log("[QuickReactions] Wtyczka uruchomiona.");
        window.addEventListener("keydown", handleKeyDown);
    },
    
    stop() {
        console.log("[QuickReactions] Wtyczka zatrzymana.");
        window.removeEventListener("keydown", handleKeyDown);
    }
});
