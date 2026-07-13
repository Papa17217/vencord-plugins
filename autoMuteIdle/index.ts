import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findByPropsLazy } from "@webpack";
import { 
    SelectedChannelStore, 
    VoiceStateStore, 
    UserStore,
    Toasts
} from "@webpack/common";
import { Devs } from "@utils/constants";

export const settings = definePluginSettings({
    idleMinutes: {
        type: OptionType.NUMBER,
        description: "Idle time in minutes before automatically muting",
        default: 3,
    },
    action: {
        type: OptionType.SELECT,
        description: "Action to perform when idle timeout is reached",
        default: "mute",
        options: [
            { label: "Mute Microphone", value: "mute" },
            { label: "Deafen Sound", value: "deafen" }
        ]
    }
});

let checkIntervalId: any = null;
let lastSpokeAt = Date.now();
let lastMuteState = false;

function getIdleLimitMs(): number {
    try {
        const mins = settings.store.idleMinutes ?? 3;
        return mins * 60 * 1000;
    } catch {
        return 3 * 60 * 1000;
    }
}

function startCheckLoop() {
    stopCheckLoop();
    lastSpokeAt = Date.now();
    
    checkIntervalId = setInterval(() => {
        try {
            const myChannelId = SelectedChannelStore.getVoiceChannelId();
            if (!myChannelId) return;

            const myUser = UserStore.getCurrentUser();
            if (!myUser) return;

            const myVoiceState = VoiceStateStore.getVoiceStateForUser(myUser.id);
            if (!myVoiceState) return;

            const action = settings.store.action ?? "mute";
            
            if (action === "mute" && (myVoiceState.selfMute || myVoiceState.selfDeaf)) return;
            if (action === "deafen" && myVoiceState.selfDeaf) return;

            if (Date.now() - lastSpokeAt > getIdleLimitMs()) {
                console.log("[AutoMuteIdle] Idle timeout reached. Muting user voice state...");
                const VoiceActions = findByPropsLazy("toggleSelfMute", "toggleSelfDeaf");

                if (action === "deafen") {
                    VoiceActions.toggleSelfDeaf();
                    Toasts.show({
                        message: "You were automatically deafened due to voice inactivity",
                        type: Toasts.Type.SUCCESS
                    });
                } else {
                    VoiceActions.toggleSelfMute();
                    Toasts.show({
                        message: "You were automatically muted due to voice inactivity",
                        type: Toasts.Type.SUCCESS
                    });
                }
                
                lastSpokeAt = Date.now();
            }
        } catch (e) {
            console.error("[AutoMuteIdle] Error in check loop:", e);
        }
    }, 5000);
}

function stopCheckLoop() {
    if (checkIntervalId) {
        clearInterval(checkIntervalId);
        checkIntervalId = null;
    }
}

function handleVoiceStateUpdate() {
    try {
        const myUser = UserStore.getCurrentUser();
        if (!myUser) return;

        const myVoiceState = VoiceStateStore.getVoiceStateForUser(myUser.id);
        if (!myVoiceState) return;

        const isMuted = myVoiceState.selfMute || myVoiceState.selfDeaf;
        
        if (lastMuteState && !isMuted) {
            console.log("[AutoMuteIdle] Microphone unmuted. Resetting idle timer.");
            lastSpokeAt = Date.now();
        }
        
        lastMuteState = isMuted;
    } catch (e) {
        console.error("[AutoMuteIdle] Error in handleVoiceStateUpdate:", e);
    }
}

export default definePlugin({
    name: "AutoMuteIdle",
    description: "Automatically mutes your microphone or deafens your client if you don't speak for a configured amount of time.",
    authors: [Devs.papa],

    settings,

    start() {
        console.log("[AutoMuteIdle] Plugin started.");
        lastSpokeAt = Date.now();
        startCheckLoop();
    },

    stop() {
        console.log("[AutoMuteIdle] Plugin stopped.");
        stopCheckLoop();
    },

    flux: {
        SPEAKING({ userId, speakingFlags }) {
            try {
                const myUser = UserStore.getCurrentUser();
                if (myUser && userId === myUser.id && speakingFlags > 0) {
                    lastSpokeAt = Date.now();
                }
            } catch (e) {
                // ignore
            }
        },

        VOICE_STATE_UPDATES() {
            handleVoiceStateUpdate();
        }
    }
});
