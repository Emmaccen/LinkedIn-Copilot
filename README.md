# LinkedIn Copilot

An AI-powered Chrome extension that helps you write better LinkedIn comments and replies without sounding like a LinkedIn influencer.

> Active development is on the `main` branch (v0.0.6+). The `deprecated` branch holds everything up through v0.0.5 and is frozen there.

---

## What happened to the old version?

LinkedIn started hashing their feed CSS class names on every deployment. What was `.ql-editor` one week became `_863acf9a` the next, and the whole feed-commenting pipeline stopped working. Everything up to v0.0.5 is on the `deprecated` branch. v0.0.6 onward is a rebuild using DOM anchors that stay stable regardless of what LinkedIn does to their styles.


---

## Feature status

Things shift as LinkedIn does. This is where things actually stand.

| Feature | Status |
|---|---|
| Feed commenting (top-level) | Working |
| DMs (single message reply) | Working |
| DMs (full chat history) | Working |
| Templates | Working (scrollable capsule bar) |
| Post creation (Pilot button) | In progress |
| Thread replies (sub-comments) | In progress |

---

## Quick setup

### Install the extension

1. Go to [Releases](https://github.com/Emmaccen/LinkedIn-Copilot/releases) and download the latest zip
2. Open `chrome://extensions/` and enable **Developer mode**
3. Click **Load unpacked** and select the extracted folder

### Get a free API key

LinkedIn Copilot uses [Groq](https://console.groq.com/keys) for AI generation. Sign up, create a key, paste it into the extension settings.

---

## Privacy

- Nothing goes externally except the post or comment text sent to Groq for generation
- Templates and settings are stored in Chrome local storage only
- The extension fills the input box. You click Send. Always.

---

## For developers

```bash
git clone https://github.com/Emmaccen/LinkedIn-Copilot.git
cd LinkedIn-Copilot
yarn install
yarn dev
```

Load the `build/chrome-mv3-dev` folder as an unpacked extension in Chrome.

### Stack

- [Plasmo](https://docs.plasmo.com/) for Chrome extension scaffolding
- React and TypeScript
- Tailwind CSS
- Groq SDK
- Chrome Storage API

### Project layout

```
components/       React components (settings UI etc.)
contents/         Content scripts. copilot.ts is the brain.
lib/              AI generation logic
static-data/      System prompts and static templates
types/            TypeScript definitions
utils/            DOM helpers, storage, encryption
```

### Why the selectors look the way they do

LinkedIn rotates their CSS class names. Open DevTools on the feed and you will see hashes like `_863acf9a` that change every few weeks. So instead of class selectors, everything targets attributes LinkedIn has to keep stable for accessibility tooling.

```
[aria-label="Text editor for creating comment"]   the comment editor
[data-testid="ui-core-tiptap-text-editor-wrapper"]  the editor container
[role="listitem"]                                  the post card
[data-testid="expandable-text-box"]               the post body text
a[href*="/in/"] strong                            the post author name
```

If something stops working, check whether any of these labels changed first.

### Contributing

Open an issue before starting anything large. For small fixes, PRs are welcome. Test against a live LinkedIn feed before submitting.

---

## License

MIT. See [LICENSE](LICENSE).
