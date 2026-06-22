# Changelog

## [v0.0.8] — 22-06-2026

### Added

- **Anti-Slop Style Guide**: Integrated a strict writing guidelines block (`ANTI_SLOP_GUIDE`) to eliminate generic AI writing patterns and slop in comment/post generation.

### Changed

- **Professional Summary Limit**: Increased the maximum character length for professional summary fields from 500 to 2000 characters in `SettingsManager`.
- **Release Workflow Link**: Appended a direct URL reference to the latest release tags `CHANGELOG.md` file within `.github/workflows/release.yml`.

## [v0.0.7] — 22-06-2026

### Added

- **Intelligent DOM-Positional Comment Thread Scraper**: Introduced a chronological thread scraper that walks backwards from a reply target and extracts only the unique parent comment history (A -> B -> C), avoiding unrelated threads in flat comment columns.
- **Shadow DOM Traversal Helpers**: Introduced `findInShadows`, `findAllInShadows`, and `findClosestIncludingShadows` functions to cross open shadow boundaries recursively.
- **Dynamic Shadow Root Mutation Observers**: Dynamically registers MutationObservers on discovered shadow hosts' roots, capturing inputs with loading delays (e.g. the post creation modal inside `#interop-outlet`).
- **Social Action Filtering**: Introduced ancestor checks to ignore profile links within social headers (e.g., "likes this", "commented on", "reposted") when resolving the post author.
- **Robust Comment Replies**: Thread replies now work consistently by searching for valid name links, extracting preceding thread history chronologically, and verifying sub-replies via placeholder text checks (matching `/reply/i`).
- **Modal Overlay Support**: Enabled full commenting support when viewing posts in modal overlays (theater/details view) by querying across panes for post content and placing the Copilot dropdown correctly under the input.

### Changed

- **AI Post Creation Modal Detour Integration**:
  - Replaced the intrusive top banner and text tip with a clean **"Write with AI"** action button integrated directly into the footer's detour buttons list (`ul.artdeco-carousel__slider`).
  - Added dashed highlight border and blue background styling matching native LinkedIn aesthetics.
  - Implemented multi-stage fallbacks to action bar containers or the top-of-editor pane to handle layout variations.
- **Profile Name Resolution**: Strip connection states (e.g. `• 2nd`, `1st`) and extra whitespace in `extractNameFromLink`.
- **Selector Refactoring**: Swapped standard querySelector and `.closest` lookups in all key layers (including appending `[aria-label="Primary content"]` for detail views) with shadow-aware query functions.
- **Dropdown Layout Styling**: Bounded the capsule dropdown and adjusted spacing margins to align correctly under the input editor.

---

## [v0.0.6] — 21-06-2026

This is the first release on `main` after the codebase split. v0.0.5 and everything before it lives on the `deprecated` branch.

### What changed

LinkedIn's feed started rotating their CSS class names on each deployment. The selectors that powered feed commenting since v0.0.2 all broke at once. This release rebuilds the entire feed detection layer around DOM anchors that are tied to accessibility compliance rather than styling.

### Changed

- **Feed comment detection** rebuilt from scratch:
  - Editor found via `[aria-label="Text editor for creating comment"]` instead of the now-dead `.ql-editor`
  - Copilot bar inserted relative to `[data-testid="ui-core-tiptap-text-editor-wrapper"]`
  - Post content read from the first `[data-testid="expandable-text-box"]` inside `[role="listitem"]`
  - Author name extracted via `a[href*="/in/"] strong` traversal
- **Input injection** now uses `execCommand` (selectAll, delete, insertText) instead of `innerHTML` assignment, which stopped working when LinkedIn switched their comment editor from Quill to TipTap/ProseMirror
- **Template capsule bar** now scrolls horizontally with the scrollbar hidden. Padding reduced so it no longer covers the input area

### Notes

- Feed commenting (top-level) is working. DMs are unaffected throughout.
- Post creation and thread replies rely on selectors that are still being updated. Marked as in-progress.

---

## [v0.0.5] — 21-06-2026

### Added

- **Comment thread replies** — AI can reply to comments on comments (sub-threads)
  - Detects when the reply input targets a specific commenter
  - Extracts the full comment thread for rich AI context
  - Uses a dedicated `AiThreadReplySystemMessage` prompt tuned for thread conversations
  - Smart input handling: preserves the LinkedIn `@mention` tag on first reply attempt
- `PostCommentThreadItem` type for structured comment thread data
- `extractLinkedInComments()` utility to scrape comment thread items from the DOM
- `formatPostCommentThreadItems()` utility to serialize threads for the AI prompt

### Changed

- `ReplyPostCommentWithAI()` now accepts an optional `threadCommentData` argument to switch between standard comment and thread-reply prompts
- User name extraction now captures the full name instead of just the first name
- Notification toast: 4s display duration, `max-width: 300px`, slide-in offset increased to prevent clipping

---

## [v0.0.4] — 1-10-2025

- Improved region event analytics gathering
  - Replaced old ipapi with a new and more reliable CORS friendly api

## [v0.0.3] — 18-09-2025

### Changed

- Remove HEAD check for GitHub asset availability in the update flow.
  - The extension now opens the release asset URL directly to avoid CORS failures in the extension environment.
  - This simplifies update checks and improves reliability for end users.

### Added

- Build status checks in Github actions
  - This ensures PRs pointed to the `main` branch builds successfully before allowing merge
  - Keeps workflow clean and free of build errors

### Updated

- Updated system messages for comment creation
- Increased `max_completion_tokens` for AI generation
- Reduced `temperature` to `0.2` to increase deterministic tendencies

### Fixed

- Ensure download link normalization: the app now prepends `v` to numeric package.json versions when constructing release URLs (e.g. `0.0.2` -> `v0.0.2`) so direct downloads work consistently.
- Build/release workflow clarified: releases are produced from tags (`vX.Y.Z`) and uploaded as GitHub Release assets (`linkedin-copilot-vX.Y.Z.zip` + `linkedin-copilot-latest.zip`).

### Notes (v0.0.2)

- Beta / prerelease workflow was removed to keep versioning numeric and Chrome-compatible (manifest version constraints). If you previously had `-beta` tags, those have been cleaned up.
- To update: the repo uses numeric semantic versions (no `-beta`). Create a numeric tag (e.g. `v0.0.2`) to trigger the release pipeline.

## [v0.0.2] - 16-09-2025

### Initial Release

### ✨ Features

- **AI-Powered Content Generation**

  - Smart replies to LinkedIn feed posts with full context awareness
  - Direct message responses based on chat history or individual messages
  - Post creation and editing assistance via "Pilot Button" in LinkedIn's compose dialog
  - All AI responses personalized based on user's professional profile

- **Template System**

  - Pre-built response templates organized by categories (Business DMs, etc.)
  - Support for smart placeholders ({{name}} auto-replacement)
  - Template management with import/export functionality (JSON format)
  - Context-aware template suggestions (Feed, DM, Connection, Post)
  - Individual template activation/deactivation controls

- **Smart Context Detection**

  - Automatic detection of LinkedIn feed comments vs direct messages
  - Post content extraction for relevant AI responses
  - User information extraction for personalized template placeholders
  - Real-time DOM monitoring for dynamic LinkedIn content

- **Enhanced User Experience**

  - Realistic typing simulation with configurable delays
  - Streaming AI responses for immediate feedback
  - Visual processing indicators during AI generation
  - Clean, integrated UI that matches LinkedIn's design

- **Settings & Customization**
  - Groq API integration for free AI processing
  - User profile configuration (name, title, professional summary)
  - Typing simulation preferences
  - Template category management
  - Light/Dark theme support

### 🛠 Technical Implementation

- **Built with Plasmo Framework** for modern Chrome extension development
- **React + TypeScript** frontend with Tailwind CSS styling
- **Chrome Storage API** for local data persistence
- **Mutation Observers** for real-time LinkedIn content detection
- **Stream-based AI Processing** for responsive user experience
- **Analytics Integration** for usage tracking and improvement insights

### 🔒 Privacy & Security

- **Local Data Storage** - all templates and settings stored in browser
- **No Automated Actions** - extension only drafts content, users retain full control
- **Context-Only Processing** - LinkedIn content analyzed locally for AI context
- **User-Controlled Sending** - all messages/posts require manual user approval

### 📊 Analytics & Insights

- Anonymous usage tracking for feature optimization
- Error reporting for stability improvements
- Template usage statistics
- AI generation success metrics

### 📌 Known Limitations

- **Groq API Dependency** - requires user to obtain free Groq API key
- **LinkedIn Layout Changes** - may need updates if LinkedIn modifies their UI structure
- **Template Randomization** - currently uses random selection from active templates (smart selection planned for future)

### 🛠 Future Considerations

Planned enhancements based on user feedback and analytics:

- **AI-Generated Templates** - automatic template creation based on user behavior
- **Smart Template Selection** - context-aware template recommendations
- **Enhanced Personalization** - deeper LinkedIn profile integration
- **Multi-language Support** - AI responses in different languages
- **Advanced Analytics Dashboard** - detailed usage insights for users

---

### 📝 Installation Notes

- Chrome extension requires "Developer mode" for manual installation
- Groq API key setup required (free tier with generous limits)
- User profile completion recommended for optimal AI personalization
