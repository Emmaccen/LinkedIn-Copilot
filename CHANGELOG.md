# Changelog

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
