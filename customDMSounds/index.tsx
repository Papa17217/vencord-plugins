import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findComponentByCodeLazy, findByPropsLazy } from "@webpack";
import { 
    Modal, 
    openModal, 
    Button, 
    Toasts,
    React,
    useState,
    useMemo,
    useEffect,
    useRef,
    UserStore
} from "@webpack/common";
import { Devs } from "@utils/constants";
import "./styles.css";

export const settings = definePluginSettings({
    soundsJson: {
        type: OptionType.STRING,
        description: "Custom notification sounds map (JSON)",
        default: "{}",
    }
});

interface UserSound {
    userId: string;
    username: string;
    soundUrl: string;
}

let lastMessageAuthorId = "";
let lastMessageReceivedAt = 0;
let originalPlaySound: any = null;

async function resolveAudioUrl(url: string): Promise<string> {
    if (!url) return "";
    
    const miMatch = url.match(/myinstants\.com\/(?:[a-z]{2}\/)?instant\/([^/?#]+)/);
    if (miMatch && miMatch[1]) {
        const slug = miMatch[1];
        const directMp3 = `https://www.myinstants.com/media/sounds/` + slug + `.mp3`;
        console.log("[CustomDMSounds] Resolved MyInstants share URL to direct MP3:", directMp3);
        return directMp3;
    }

    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/);
    if (ytMatch && ytMatch[1]) {
        const videoId = ytMatch[1];
        console.log("[CustomDMSounds] YouTube URL detected, resolving audio stream for video:", videoId);
        
        const instances = [
            "https://yewtu.to",
            "https://invidious.projectsegfau.lt",
            "https://invidious.lunar.icu"
        ];
        
        for (const instance of instances) {
            try {
                const res = await fetch(`${instance}/api/v1/videos/${videoId}`);
                if (res.ok) {
                    const data = await res.json();
                    const audioFormat = data.adaptiveFormats?.find((f: any) => f.mimeType?.startsWith("audio/"));
                    if (audioFormat && audioFormat.url) {
                        let streamUrl = audioFormat.url;
                        if (streamUrl.startsWith("/")) {
                            streamUrl = instance + streamUrl;
                        }
                        console.log("[CustomDMSounds] Resolved YouTube stream via Invidious:", streamUrl);
                        return streamUrl;
                    }
                }
            } catch (err) {
                console.warn(`[CustomDMSounds] Invidious instance ${instance} failed:`, err);
            }
        }
        console.error("[CustomDMSounds] Failed to resolve YouTube audio stream.");
    }
    
    return url;
}

async function playAudio(url: string) {
    try {
        const resolvedUrl = await resolveAudioUrl(url);
        if (!resolvedUrl) return;

        console.log("[CustomDMSounds] Playing audio:", resolvedUrl);
        const audio = new Audio(resolvedUrl);
        audio.volume = 0.5;
        await audio.play();
    } catch (e) {
        console.error("[CustomDMSounds] Error playing audio:", e);
        Toasts.show({
            message: "Failed to load or play this sound.",
            type: Toasts.Type.FAILURE
        });
    }
}

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

function MusicIcon() {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h6V3h-8z"/>
        </svg>
    );
}

function SoundManagerModal({ modalProps }: { modalProps: any }) {
    const [sounds, setSounds] = useState<UserSound[]>(() => {
        try {
            const map = JSON.parse(settings.store.soundsJson ?? "{}");
            return Object.entries(map).map(([userId, soundUrl]) => ({
                userId,
                username: "Loading...",
                soundUrl: soundUrl as string
            }));
        } catch {
            return [];
        }
    });

    const [newUserId, setNewUserId] = useState("");
    const [newSoundUrl, setNewSoundUrl] = useState("");

    useEffect(() => {
        let active = true;
        const fetchUsernames = async () => {
            const updated = await Promise.all(sounds.map(async (s) => {
                if (s.username !== "Loading...") return s;
                try {
                    const user = await UserStore.getUser(s.userId);
                    return { ...s, username: user ? `${user.globalName || user.username} (@${user.username})` : s.userId };
                } catch {
                    return { ...s, username: `ID: ${s.userId}` };
                }
            }));
            if (active) setSounds(updated);
        };
        fetchUsernames();
        return () => { active = false; };
    }, []);

    const saveSounds = (list: UserSound[]) => {
        setSounds(list);
        const map: Record<string, string> = {};
        list.forEach(s => {
            map[s.userId] = s.soundUrl;
        });
        settings.store.soundsJson = JSON.stringify(map);
    };

    const handleAdd = async () => {
        const cleanedId = newUserId.trim();
        const cleanedUrl = newSoundUrl.trim();
        if (!cleanedId || !cleanedUrl) return;

        let username = cleanedId;
        try {
            const user = await UserStore.getUser(cleanedId);
            if (user) {
                username = `${user.globalName || user.username} (@${user.username})`;
            }
        } catch {
            Toasts.show({
                message: "User ID not found. Verify the ID is correct.",
                type: Toasts.Type.FAILURE
            });
        }

        const newSound: UserSound = {
            userId: cleanedId,
            username,
            soundUrl: cleanedUrl
        };

        const updated = [...sounds.filter(s => s.userId !== cleanedId), newSound];
        saveSounds(updated);
        setNewUserId("");
        setNewSoundUrl("");
        Toasts.show({
            message: "Custom sound added successfully!",
            type: Toasts.Type.SUCCESS
        });
    };

    const handleDelete = (userId: string) => {
        const updated = sounds.filter(s => s.userId !== userId);
        saveSounds(updated);
    };

    return (
        <Modal
            {...modalProps}
            size="lg"
            title="Custom Notification Sounds 🎵"
            subtitle="Assign custom sounds (direct MP3/WAV links or YouTube URLs) to specific friends."
            className="cs-modal"
        >
            <div className="cs-container">
                <div className="cs-form">
                    <div className="cs-input-group">
                        <label>User ID</label>
                        <input
                            type="text"
                            placeholder="Paste friend's user ID (e.g. 343383572805058560)"
                            value={newUserId}
                            onChange={(e) => setNewUserId(e.target.value)}
                            className="cs-input"
                        />
                    </div>
                    <div className="cs-input-group">
                        <label>Sound URL (Direct MP3 / YouTube / MyInstants)</label>
                        <input
                            type="text"
                            placeholder="Paste direct MP3 URL, YouTube URL, or MyInstants link"
                            value={newSoundUrl}
                            onChange={(e) => setNewSoundUrl(e.target.value)}
                            className="cs-input"
                        />
                    </div>
                    <button onClick={handleAdd} className="cs-add-btn" disabled={!newUserId || !newSoundUrl}>
                        + Add Sound
                    </button>
                </div>

                <div className="cs-list-section">
                    <h3>Assigned Sounds ({sounds.length})</h3>
                    <div className="cs-list">
                        {sounds.length === 0 ? (
                            <div className="cs-empty-state">
                                No custom sounds assigned. Everyone plays the default Discord notification.
                            </div>
                        ) : (
                            sounds.map(s => (
                                <div key={s.userId} className="cs-card">
                                    <div className="cs-card-info">
                                        <div className="cs-card-user">{s.username}</div>
                                        <div className="cs-card-url" title={s.soundUrl}>{s.soundUrl}</div>
                                    </div>
                                    <div className="cs-card-actions">
                                        <button onClick={() => playAudio(s.soundUrl)} className="cs-btn cs-btn-test">
                                            ▶️ Test
                                        </button>
                                        <button onClick={() => handleDelete(s.userId)} className="cs-btn cs-btn-delete">
                                            🗑️ Remove
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function SoundHeaderButton() {
    const buttonRef = useRef(null);

    return (
        <HeaderBarIcon
            ref={buttonRef}
            className="cs-header-btn"
            onClick={() => {
                openModal(props => <SoundManagerModal modalProps={props} />);
            }}
            tooltip="Notification Sounds"
            icon={() => <MusicIcon />}
        />
    );
}

(window as any).customDMButton = SoundHeaderButton;

export default definePlugin({
    name: "CustomDMSounds",
    description: "Assign custom notification sounds to specific friends using direct MP3 URLs or YouTube links.",
    authors: [Devs.papa],
    settings,

    start() {
        console.log("[CustomDMSounds] Plugin started.");
        
        try {
            const SoundModule = findByPropsLazy("playSound");
            if (SoundModule && !originalPlaySound) {
                originalPlaySound = SoundModule.playSound;
                SoundModule.playSound = function(soundName: string, volume: number) {
                    if (soundName === "message1" && Date.now() - lastMessageReceivedAt < 1000) {
                        let configMap: Record<string, string> = {};
                        try {
                            configMap = JSON.parse(settings.store.soundsJson ?? "{}");
                        } catch {
                            configMap = {};
                        }

                        const customUrl = configMap[lastMessageAuthorId];
                        if (customUrl) {
                            console.log(`[CustomDMSounds] Overriding default sound with custom sound for: ${lastMessageAuthorId}`);
                            playAudio(customUrl);
                            return;
                        }
                    }
                    return originalPlaySound.apply(this, arguments);
                };
            }
        } catch (e) {
            console.error("[CustomDMSounds] Failed to intercept playSound:", e);
        }
    },

    stop() {
        console.log("[CustomDMSounds] Plugin stopped.");
        try {
            const SoundModule = findByPropsLazy("playSound");
            if (SoundModule && originalPlaySound) {
                SoundModule.playSound = originalPlaySound;
                originalPlaySound = null;
            }
        } catch (e) {
            // ignore
        }
    },

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(trailing:.{0,50}?)(\i\.Fragment|[\w.]+\.HeaderWrapper),(?=\{children:\[)/,
                replace: "$1$self.HeaderWrapper,"
            }
        }
    ],

    HeaderWrapper({ children }: React.PropsWithChildren<{}>) {
        const NotepadBtn = (window as any).quickNotesButton;
        const GhostBtn = (window as any).ghostPingButton;
        const MusicBtn = (window as any).customDMButton;

        return (
            <>
                {children}
                {NotepadBtn && <NotepadBtn />}
                {GhostBtn && <GhostBtn />}
                {MusicBtn && <MusicBtn />}
            </>
        );
    },

    flux: {
        MESSAGE_CREATE({ message }) {
            try {
                if (!message || !message.author) return;
                const myUser = UserStore.getCurrentUser();
                if (myUser && message.author.id !== myUser.id) {
                    lastMessageAuthorId = message.author.id;
                    lastMessageReceivedAt = Date.now();
                }
            } catch (e) {
                // ignore
            }
        }
    }
});
