import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { findComponentByCodeLazy } from "@webpack";
import { 
    Modal, 
    openModal, 
    TextInput, 
    TextArea, 
    Button, 
    MessageActions, 
    SelectedChannelStore,
    Toasts,
    React,
    useState,
    useMemo,
    useEffect,
    useRef
} from "@webpack/common";
import { Devs } from "@utils/constants";
import "./styles.css";

export const settings = definePluginSettings({
    notesJson: {
        type: OptionType.STRING,
        description: "Saved notes (JSON)",
        default: "[]",
    }
});

interface Note {
    id: string;
    title: string;
    content: string;
    updatedAt: number;
}

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_BOTTOM,", 'position:"bottom"');

function NotepadIcon() {
    return (
        <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
        </svg>
    );
}

function NotepadModal({ modalProps }: { modalProps: any }) {
    const [notes, setNotes] = useState<Note[]>(() => {
        try {
            return JSON.parse(settings.store.notesJson ?? "[]");
        } catch {
            return [];
        }
    });

    const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const saveNotes = (updatedNotes: Note[]) => {
        setNotes(updatedNotes);
        settings.store.notesJson = JSON.stringify(updatedNotes);
    };

    const activeNote = useMemo(() => {
        return notes.find(note => note.id === activeNoteId) || null;
    }, [notes, activeNoteId]);

    const filteredNotes = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return notes;
        return notes.filter(
            note =>
                note.title.toLowerCase().includes(query) ||
                note.content.toLowerCase().includes(query)
        );
    }, [notes, searchQuery]);

    const handleAddNote = () => {
        const newNote: Note = {
            id: Date.now().toString(),
            title: "New Note",
            content: "",
            updatedAt: Date.now()
        };
        const updated = [newNote, ...notes];
        saveNotes(updated);
        setActiveNoteId(newNote.id);
    };

    const handleTitleChange = (newTitle: string) => {
        if (!activeNoteId) return;
        const updated = notes.map(note => {
            if (note.id === activeNoteId) {
                return { ...note, title: newTitle, updatedAt: Date.now() };
            }
            return note;
        });
        saveNotes(updated);
    };

    const handleContentChange = (newContent: string) => {
        if (!activeNoteId) return;
        const updated = notes.map(note => {
            if (note.id === activeNoteId) {
                return { ...note, content: newContent, updatedAt: Date.now() };
            }
            return note;
        });
        saveNotes(updated);
    };

    const handleDeleteNote = (id: string) => {
        const updated = notes.filter(note => note.id !== id);
        saveNotes(updated);
        if (activeNoteId === id) {
            setActiveNoteId(updated[0]?.id || null);
        }
    };

    const handleCopy = () => {
        if (!activeNote) return;
        navigator.clipboard.writeText(activeNote.content);
        Toasts.show({
            message: "Note copied to clipboard!",
            type: Toasts.Type.SUCCESS
        });
    };

    const handleSendToChat = () => {
        if (!activeNote || !activeNote.content.trim()) return;
        const channelId = SelectedChannelStore.getChannelId();
        if (channelId) {
            MessageActions.sendMessage(channelId, { content: activeNote.content });
            modalProps.onClose();
            Toasts.show({
                message: "Note sent to chat!",
                type: Toasts.Type.SUCCESS
            });
        } else {
            Toasts.show({
                message: "No active text channel found!",
                type: Toasts.Type.FAILURE
            });
        }
    };

    return (
        <Modal
            {...modalProps}
            size="lg"
            title="Quick Notes"
            subtitle="Write down links, templates, and important notes directly inside Discord."
            className="qn-modal"
        >
            <div className="qn-notepad-container">
                <div className="qn-sidebar">
                    <div className="qn-sidebar-header">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="qn-search-input"
                        />
                        <button onClick={handleAddNote} className="qn-add-button">
                            + New
                        </button>
                    </div>

                    <div className="qn-notes-list">
                        {filteredNotes.length === 0 ? (
                            <div className="qn-empty-list">No notes found</div>
                        ) : (
                            filteredNotes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setActiveNoteId(note.id)}
                                    className={`qn-note-item ${activeNoteId === note.id ? "active" : ""}`}
                                >
                                    <div className="qn-note-item-title">
                                        {note.title || "Untitled"}
                                    </div>
                                    <div className="qn-note-item-preview">
                                        {note.content || "Empty note..."}
                                    </div>
                                    <div className="qn-note-item-date">
                                        {new Date(note.updatedAt).toLocaleDateString()}{" "}
                                        {new Date(note.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="qn-editor-area">
                    {activeNote ? (
                        <div className="qn-active-editor">
                            <input
                                type="text"
                                value={activeNote.title}
                                onChange={(e) => handleTitleChange(e.target.value)}
                                placeholder="Enter note title..."
                                className="qn-title-input"
                            />
                            
                            <textarea
                                value={activeNote.content}
                                onChange={(e) => handleContentChange(e.target.value)}
                                placeholder="Start writing here... (Supports Markdown formatting)"
                                className="qn-content-textarea"
                            />

                            <div className="qn-actions-bar">
                                <Button
                                    onClick={handleSendToChat}
                                    disabled={!activeNote.content.trim()}
                                    color={Button.Colors.BRAND}
                                    size={Button.Sizes.MEDIUM}
                                    className="qn-action-btn"
                                >
                                    🚀 Send to Chat
                                </Button>
                                
                                <Button
                                    onClick={handleCopy}
                                    disabled={!activeNote.content.trim()}
                                    color={Button.Colors.PRIMARY}
                                    look={Button.Looks.OUTLINED}
                                    size={Button.Sizes.MEDIUM}
                                    className="qn-action-btn"
                                >
                                    📋 Copy
                                </Button>

                                <Button
                                    onClick={() => handleDeleteNote(activeNote.id)}
                                    color={Button.Colors.RED}
                                    size={Button.Sizes.MEDIUM}
                                    className="qn-action-btn qn-delete-btn"
                                >
                                    🗑️ Delete
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="qn-no-active-note">
                            <svg viewBox="0 0 24 24" width={48} height={48} className="qn-placeholder-icon">
                                <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                            <h3>Select a note or create a new one</h3>
                            <p>Your notes are automatically saved locally.</p>
                            <button onClick={handleAddNote} className="qn-add-button-large">
                                + Create your first note
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function NotepadHeaderButton() {
    const buttonRef = useRef(null);

    return (
        <HeaderBarIcon
            ref={buttonRef}
            className="qn-header-btn"
            onClick={() => {
                openModal(props => <NotepadModal modalProps={props} />);
            }}
            tooltip="Open Notepad"
            icon={() => <NotepadIcon />}
        />
    );
}

(window as any).quickNotesButton = NotepadHeaderButton;

export default definePlugin({
    name: "QuickNotes",
    description: "An integrated, clean notepad inside Discord. Save info and send it to chat with one click.",
    authors: [Devs.papa],

    settings,

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
    }
});
