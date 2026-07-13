# Vencord Custom Plugins Collection

A collection of clean, custom-made quality-of-life plugins for Vencord. Designed to extend Vencord with premium and highly useful features.

## 🚀 Plugins Included

1. **🔥 DMStreaks (`dmStreaks`)**: A Snapchat-like message streak indicator that displays a glowing flame badge and day count (e.g. `🔥 15`) next to names in the DM list. It uses a zero-width unicode metadata handshake to automatically sync the streak count between clients invisibly.
2. **🎵 CustomDMSounds (`customDMSounds`)**: Allows you to assign customized notification sounds for specific friends. Supports direct MP3/WAV URLs and YouTube video links (which are resolved via public Invidious streams). Automatically overrides and blocks the default Discord message sound when active.
3. **👻 GhostPingDetector (`ghostPingDetector`)**: Instantly alerts you via custom Toast notifications when someone pings you and deletes their message. Features a beautiful floating header widget with a full history of past ghost pings and quick navigation buttons to jump directly to the target channels.
4. **📝 QuickNotes (`quickNotes`)**: An integrated split-pane notepad directly inside your Discord client. Save code snippets, links, templates, or drafts. Send drafts to the active text channel or copy notes to the clipboard in one click.
5. **⚡ QuickReactions (`quickReactions`)**: Allows you to add reactions to hovered messages instantaneously by pressing keyboard shortcuts `1` through `5` (configurable).
6. **🎵 SpotifyLyricsStatus (`spotifyLyricsStatus`)**: Automatically fetches synced LRC lyrics for the song playing on your Spotify and updates your Discord custom status in real-time as the song plays.
7. **🔇 AutoMuteIdle (`autoMuteIdle`)**: Automatically mutes your microphone or deafens your client if you remain silent on a voice channel for a configured time limit.
8. **🚪 VoiceAutoLeave (`voiceAutoLeave`)**: Automatically disconnects you from a voice channel if you are left alone in the channel for a set amount of time.

---

## 🛠️ Installation

To use these plugins, you need a local development setup of Vencord.

1. **Clone Vencord** (or use your existing Vencord repository):
   ```bash
   git clone https://github.com/Vendicated/Vencord.git
   cd Vencord
   pnpm install
   ```

2. **Copy the desired plugin folder(s)** from this repository to your Vencord directory under `src/userplugins/`:
   * Example: Copy `dmStreaks` to `src/userplugins/dmStreaks`

3. **Build Vencord**:
   ```bash
   pnpm build
   ```

4. **Restart Discord** to apply the changes. The plugins will appear under the **Plugins** section in your Vencord Settings.
