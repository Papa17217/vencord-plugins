import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findComponentByCodeLazy } from "@webpack";
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
    UserStore,
    ChannelStore,
    ChannelRouter
} from "@webpack/common";
import { Devs } from "@utils/constants";
import "./styles.css";

export const settings = definePluginSettings({
    historyJson: {
        type: OptionType.STRING,
        description: "Ghost ping history (JSON)",
        default: "[]",
    }
});

interface GhostPing {
    id: string;
    channelId: string;
    channelName: string;
    guildId: string | null;
    content: string;
    author: {
        id: string;
        username: string;
        globalName?: string;
        avatar?: string;
    };
    timestamp: number;
    deletedAt: number;
}

const messageCache = new Map<string, {
    id: string;
    channelId: string;
    content: string;
    author: any;
    timestamp: number;
}>();

const MAX_CACHE_SIZE = 1000;

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

function GhostIcon() {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
            <path d="M12 2A10 10 0 0 0 2 12v9a1 1 0 0 0 1.22.97l3.05-.61a1 1 0 0 1 .49 0l3.05.61a1 1 0 0 0 .48 0l3.05-.61a1 1 0 0 1 .49 0l3.05.61A1 1 0 0 0 22 21v-9A10 10 0 0 0 12 2zm-3 8a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 9 10zm6 0a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5z"/>
        </svg>
    );
}

function GhostPingModal({ modalProps }: { modalProps: any }) {
    const [history, setHistory] = useState<GhostPing[]>(() => {
        try {
            return JSON.parse(settings.store.historyJson ?? "[]");
        } catch {
            return [];
        }
    });

    const handleClearHistory = () => {
        setHistory([]);
        settings.store.historyJson = "[]";
        Toasts.show({
            message: "Ghost ping history cleared!",
            type: Toasts.Type.SUCCESS
        });
    };

    const handleJumpToChannel = (channelId: string) => {
        try {
            ChannelRouter.transitionToChannel(channelId);
            modalProps.onClose();
        } catch (e) {
            console.error("[GhostPingDetector] Error transitioning to channel:", e);
        }
    };

    return (
        <Modal
            {...modalProps}
            size="lg"
            title="Detected Ghost Pings 👻"
            subtitle="History of deleted messages that mentioned you."
            className="gp-modal"
        >
            <div className="gp-container">
                <div className="gp-header-bar">
                    <h3>History ({history.length})</h3>
                    {history.length > 0 && (
                        <button onClick={handleClearHistory} className="gp-clear-btn">
                            🗑️ Clear History
                        </button>
                    )}
                </div>

                <div className="gp-list">
                    {history.length === 0 ? (
                        <div className="gp-empty-state">
                            <div className="gp-empty-icon">👻</div>
                            <h3>No ghost pings found!</h3>
                            <p>Nobody has ghost pinged you. Clean and peaceful.</p>
                        </div>
                    ) : (
                        history.map(ping => (
                            <div key={ping.id + "-" + ping.deletedAt} className="gp-card">
                                <div className="gp-card-header">
                                    <div className="gp-user-info">
                                        <span className="gp-username">
                                            {ping.author.globalName || ping.author.username}
                                        </span>
                                        <span className="gp-user-tag">@{ping.author.username}</span>
                                    </div>
                                    <div className="gp-meta-info">
                                        <span className="gp-channel-badge">
                                            #{ping.channelName}
                                        </span>
                                        <span className="gp-time">
                                            {new Date(ping.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                <div className="gp-card-content">
                                    {ping.content || <span className="gp-no-text">[Empty Message / Attachment]</span>}
                                </div>

                                <div className="gp-card-actions">
                                    <Button
                                        onClick={() => handleJumpToChannel(ping.channelId)}
                                        color={Button.Colors.BRAND}
                                        size={Button.Sizes.SMALL}
                                    >
                                        🌐 Jump to Channel
                                    </Button>
                                    <span className="gp-deleted-at">
                                        Deleted: {new Date(ping.deletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Modal>
    );
}

function GhostHeaderButton() {
    const buttonRef = useRef(null);

    return (
        <HeaderBarIcon
            ref={buttonRef}
            className="gp-header-btn"
            onClick={() => {
                openModal(props => <GhostPingModal modalProps={props} />);
            }}
            tooltip="Ghost Pings"
            icon={() => <GhostIcon />}
        />
    );
}

(window as any).ghostPingButton = GhostHeaderButton;

function addGhostPingToHistory(ping: GhostPing) {
    try {
        const history: GhostPing[] = JSON.parse(settings.store.historyJson ?? "[]");
        const updated = [ping, ...history].slice(0, 100);
        settings.store.historyJson = JSON.stringify(updated);
    } catch (e) {
        console.error("[GhostPingDetector] Error saving history:", e);
    }
}

export default definePlugin({
    name: "GhostPingDetector",
    description: "Detects when someone pings you and deletes their message. Includes a history modal to view past ghost pings.",
    authors: [Devs.papa],

    settings,

    start() {
        console.log("[GhostPingDetector] Plugin started.");
    },

    stop() {
        console.log("[GhostPingDetector] Plugin stopped.");
        messageCache.clear();
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
                if (!myUser) return;
                
                const myId = myUser.id;

                if (message.author.id === myId) return;

                const mentionsMe = message.mentions?.some((m: any) => m.id === myId);
                const mentionsEveryone = message.mentionEveryone;

                if (mentionsMe || mentionsEveryone) {
                    messageCache.set(message.id, {
                        id: message.id,
                        channelId: message.channel_id,
                        content: message.content,
                        author: {
                            id: message.author.id,
                            username: message.author.username,
                            globalName: message.author.globalName,
                            avatar: message.author.avatar
                        },
                        timestamp: Date.now()
                    });

                    if (messageCache.size > MAX_CACHE_SIZE) {
                        const firstKey = messageCache.keys().next().value;
                        if (firstKey) messageCache.delete(firstKey);
                    }
                }
            } catch (e) {
                console.error("[GhostPingDetector] Error in MESSAGE_CREATE:", e);
            }
        },

        MESSAGE_DELETE({ id, channelId }) {
            try {
                if (messageCache.has(id)) {
                    const cached = messageCache.get(id)!;
                    messageCache.delete(id);

                    const channel = ChannelStore.getChannel(channelId);
                    const channelName = channel?.name || (channel?.type === 1 ? "DM" : "Channel");

                    const newPing: GhostPing = {
                        ...cached,
                        channelName,
                        guildId: channel?.guild_id || null,
                        deletedAt: Date.now()
                    };

                    addGhostPingToHistory(newPing);

                    const authorName = cached.author.globalName || cached.author.username;
                    Toasts.show({
                        message: `👻 Ghost Ping from @${authorName} in #${channelName}!`,
                        type: Toasts.Type.WARNING
                    });

                    console.log(`[GhostPingDetector] Ghost Ping detected by ${authorName} in #${channelName}`);
                }
            } catch (e) {
                console.error("[GhostPingDetector] Error in MESSAGE_DELETE:", e);
            }
        }
    }
});
