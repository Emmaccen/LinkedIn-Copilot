# LinkedIn Copilot

**An AI-powered Chrome extension that helps you craft engaging LinkedIn content and responses with ease.**

Transform your LinkedIn networking with intelligent, personalized responses for posts, comments, DMs, and content creation. LinkedIn Copilot understands context and your professional profile to generate authentic, relevant content that sounds like you.

## ✨ Features

### 🤖 AI-Powered Content Generation

- **Smart Post Replies**: Generate contextual responses to LinkedIn posts based on the content and author
- **DM Assistant**: Reply to direct messages with AI that understands chat history or individual messages
- **Content Creation**: Use the "Pilot Button" to write and edit LinkedIn posts with AI assistance
- **Profile-Based Personalization**: All responses are tailored to your professional background and writing style

### 📝 Template System

- **Pre-built Templates**: Quick access to common responses like congratulations, birthday wishes, and more
- **Category Organization**: Organize templates by context (Feed, DM, Connections, Posts)
- **Smart Placeholders**: Automatically insert names and context-specific information
- **Import/Export**: Backup and share your template collections

### ⚙️ Smart Features

- **Typing Simulation**: Realistic typing animation to make responses feel natural
- **Context Awareness**: Different behavior for feed comments vs direct messages
- **Real-time Processing**: Streaming AI responses for immediate feedback
- **Usage Analytics**: Track your productivity and most-used features

## 🚀 Quick Installation

### For End Users (Recommended)

1. **Download the Latest Release**

   - Go to [Releases](https://github.com/Emmaccen/LinkedIn-Copilot/releases)
   - Download the latest version `linkedin-copilot-[version-number].zip`

2. **Install in Chrome**

   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the extracted folder from the downloaded zip

3. **Setup Your Profile**
   - Click the extension icon and go to Options page
   - Navigate to the Settings tab
   - Add your Groq API key (free - see setup guide below)
   - Fill out your professional details (name, title, summary)
   - Start using LinkedIn with AI assistance!

### API Key Setup (Free & Easy)

LinkedIn Copilot uses Groq's free AI API, which offers generous limits for personal use:

1. **Get Your Free API Key**

   - Visit [Groq Console](https://console.groq.com/keys)
   - Sign up with GitHub (recommended - instant approval with organization)
   - Create a new API key
   - Copy your key

2. **Add to Extension**
   - Open LinkedIn Copilot settings
   - Paste your API key
   - Save settings

> **Note**: Groq's free tier is generous - you'd need to generate responses multiple times per minute to hit limits, which reset regularly.

## 📖 How to Use

### 1. Post Comments

- Click on any LinkedIn post comment box
- See AI and template options appear
- Choose "Reply with AI" for contextual responses
- Or select a template category for quick replies

### 2. Direct Messages

- Open any LinkedIn chat
- AI options appear in the message input area
- Generate responses based on chat history or individual messages

### 3. Create Posts

- Click "Write a post" on LinkedIn
- Describe your post idea in the text box
- Click the "Pilot ✨" button
- AI will generate/improve your content

### 4. Templates

- Manage templates in the extension page
- Create categories for different scenarios
- Use placeholders like `{{name}}` for personalization
- Import/export template collections

## 🔒 Privacy & Compliance

### Responsible Usage

LinkedIn Copilot is designed as a **writing assistant tool** that helps you create content - it never takes actions on your behalf. Here's what it does and doesn't do:

**What it DOES:**

- Generates text suggestions for your review
- Fills in input fields with AI-generated content
- Provides template-based quick responses
- Analyzes LinkedIn content for context (locally processed)

**What it DOESN'T do:**

- Automatically send messages or comments
- Post content without your approval
- Store your LinkedIn data externally
- Take any actions without your explicit click

### User Control

- **You're always in control**: All generated content appears in input fields for your review
- **You decide what to send**: The extension never clicks "Send" or "Post" for you
- **Local processing**: Your templates and settings are stored locally in your browser
- **No data collection**: Your LinkedIn activity and content are not stored or transmitted

### Platform Compliance

This extension operates similarly to writing tools like Grammarly - it assists with content creation but leaves all posting decisions to you. Since it doesn't automate actions or violate LinkedIn's user experience, it maintains compliance with platform policies.

**Use responsibly**: While the tool helps with efficiency, always ensure your interactions remain genuine and authentic to maintain trust in your professional network.

## 🛠️ For Developers

### Development Setup

```bash
# Clone the repository
git clone https://github.com/emmaccen/linkedin-copilot.git
cd linkedin-copilot

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Tech Stack

- **Framework**: [Plasmo](https://docs.plasmo.com/) (Chrome Extension Framework)
- **Frontend**: React + TypeScript
- **Styling**: Tailwind CSS
- **AI**: Groq SDK
- **Storage**: Chrome Extension Storage API

### Project Structure

```
├── components/          # React components
├── contents/           # Content scripts
├── lib/               # Utilities and AI logic
├── store/             # State management
├── types/             # TypeScript definitions
├── utils/             # Helper functions
└── static-data/       # Constants and templates
```

### Contributing

Contributions are welcome! This project is actively maintained with data-driven development decisions based on real user feedback and analytics.

**Before contributing:**

- Check existing issues and discussions
- For major features, open an issue to discuss the approach
- Follow the existing code style and patterns
- Test your changes thoroughly

**Development workflow:**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with the development build
5. Submit a pull request

### Building from Source

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Package for distribution
npm run package
```

The built extension will be in the `build/` directory.

## 📊 Analytics & Privacy

This extension includes privacy-focused analytics to improve user experience:

- **Usage patterns**: Which features are used most
- **Error tracking**: Technical issues for bug fixes
- **No personal data**: LinkedIn content, messages, or personal information is never collected
- **Local storage**: All your data stays in your browser

Analytics help prioritize development and ensure the extension meets user needs effectively.

## 🤝 Support & Community

- **Issues**: Report bugs or request features via [GitHub Issues](https://github.com/emmaccen/linkedin-copilot/issues)
- **Discussions**: Join conversations in [GitHub Discussions](https://github.com/emmaccen/linkedin-copilot/discussions)
- **Updates**: Follow development updates and releases

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built with [Plasmo](https://www.plasmo.com/) - the browser extension framework that makes development a joy.

Powered by [Groq](https://groq.com/) for fast, intelligent AI responses.

---

**Ready to transform your LinkedIn networking?** Download the latest release and start crafting better content with AI assistance!
