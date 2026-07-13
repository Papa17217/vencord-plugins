import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findByPropsLazy } from "@webpack";
import { 
    SelectedChannelStore, 
    VoiceStateStore, 
    Toasts
} from "@webpack/common";
import { Devs } from "@utils/constants";

export const settings = definePluginSettings({
    timeoutMinutes: {
        type: OptionType.NUMBER,
        description: "Idle time in minutes before automatically disconnecting",
        default: 5,
    }
});

let aloneTimeoutId: any = null;
let isAlone = false;

function getTimeoutMs(): number {
    try {
        const mins = settings.store.timeoutMinutes ?? 5;
        return mins * 60 * 1000;
    } catch {
        return 5 * 60 * 1000;
    }
}

function startAloneTimer() {
    clearAloneTimer();
    const timeoutMins = settings.store.timeoutMinutes ?? 5;
    
    console.log(`[VoiceAutoLeave] Countdown started: ${timeoutMins} min until disconnect.`);
    
    Toasts.show({
        message: `You are alone in the channel. Disconnecting in ${timeoutMins} min.`,
        type: Toasts.Type.INFO
    });

    aloneTimeoutId = setTimeout(() => {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        if (myChannelId) {
            console.log("[VoiceAutoLeave] Timeout reached. Leaving voice channel...");
            try {
                const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");
                selectVoiceChannel(null);
                
                Toasts.show({
                    message: "Disconnected automatically (no other users left in channel)",
                    type: Toasts.Type.SUCCESS
                });
            } catch (err) {
                console.error("[VoiceAutoLeave] Error leaving voice channel:", err);
            }
        }
        isAlone = false;
    }, getTimeoutMs());
}

function clearAloneTimer() {
    if (aloneTimeoutId) {
        console.log("[VoiceAutoLeave] Countdown cancelled.");
        clearTimeout(aloneTimeoutId);
        aloneTimeoutId = null;
    }
}

function checkVoiceChannelState() {
    try {
        const myChannelId = SelectedChannelStore.getVoiceChannelId();
        if (!myChannelId) {
            if (isAlone) {
                isAlone = false;
                clearAloneTimer();
            }
            return;
        }

        const voiceStates = VoiceStateStore.getVoiceStatesForChannel(myChannelId);
        const userCount = Object.keys(voiceStates || {}).length;

        console.log(`[VoiceAutoLeave] Checking channel ${myChannelId} - User count: ${userCount}`);

        if (userCount === 1) {
            if (!isAlone) {
                isAlone = true;
                startAloneTimer();
            }
        } else if (userCount > 1) {
            if (isAlone) {
                isAlone = false;
                clearAloneTimer();
                Toasts.show({
                    message: "Auto-disconnect cancelled (someone joined the channel)",
                    type: Toasts.Type.SUCCESS
                });
            }
        }
    } catch (e) {
        console.error("[VoiceAutoLeave] Error in checkVoiceChannelState:", e);
    }
}

export default definePlugin({
    name: "VoiceAutoLeave",
    description: "Automatically disconnects you from a voice channel or call if you are left alone for a set period of time.",
    authors: [Devs.papa],

    settings,

    start() {
        console.log("[VoiceAutoLeave] Plugin started.");
        checkVoiceChannelState();
    },

    stop() {
        console.log("[VoiceAutoLeave] Plugin stopped.");
        clearAloneTimer();
        isAlone = false;
    },

    flux: {
        VOICE_STATE_UPDATES() {
            checkVoiceChannelState();
        }
    }
});
