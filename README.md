# LinkedIn Copilot

A lightweight, open-source **LinkedIn copilot** that helps you craft replies and posts fast-**fully in your control**, tuned to **your tone**, and built with a clean, privacy-first architecture.

---

## ✨ What it does (Beta)

* **Template Replies** — Save reusable replies (e.g., congrats, thanks, quick follow-ups) and drop them into comments in a click.
* **AI Replies** — Get AI-drafted replies that match your voice; you always review/approve before posting.
* **AI Posts** — Generate post drafts tailored to your style (tone/length/voice controls).
* **Template Management** — Import/export JSON, validate with Zod, organize by category and context.
* **AI Manager** — Central place to configure models, tone presets, and behavior.

> **Design principle:** AI is a copilot, not an autopilot. You’re always in charge.

---

## Future plans

* AI-powered **DM replies**
* **Connection request** messages & workflows
* Deeper engagement flows (auto-suggested posts, follow actions, etc.)

---

## ⚙️ How it works

* **Options Page as Control Center**  
 All management (templates, AI settings, theme, import/export) lives in the **Options page** for a focused workflow.

* **Your Voice, Your Rules**  
  Drafts are generated from prompts designed to reflect your profile’s vibe and preferences you set (tone, formality, length). You always review before posting.

* **Lean, Extensible Architecture**

  * **Plasmo (MV3)** with separate entries for background, content, and options
  * **Headless UI** for accessible building blocks
  * **Tailwind v3** with a grayscale CSS-variable theme (light/dark)
  * **Zod** to validate imported template files
  * **Groq** for fast, low-latency AI generation

---

## 🤝 Contributing

* **Star** the repo to support early development (huge help right now!)
* Open issues for bugs/ideas
* PRs welcome: small fixes, docs, templates, prompts, UX polish

**Good first PRs**

* New template categories (JSON)
* Prompt tuning for better tone-matching
* Feature suggestions

---

## 🗺️ Roadmap (living)

* [x] Options page (Templates, AI Manager, Theme)
* [x] Template replies & management
* [x] AI replies
* [x] AI posts
* [x] Zod validation for imports
* [ ] DM replies
* [ ] Connection request flows
* [ ] Deeper engagement copilot

---

## ⚖️ Disclaimer

This project is not affiliated with, endorsed, or sponsored by LinkedIn. Use responsibly and in accordance with LinkedIn’s Terms of Service.

---

## 👤 About the Creator

I’m Lucius Emmanuel. I build in public to prove a simple belief: **engineering is the ultimate superpower.**
I’m using open-source projects as training grounds for real entrepreneurship, and I share everything I learn.

* ✍️ Substack: **[https://substack.com/@emmaccen](https://substack.com/@emmaccen)**
* 🐦 Twitter/X: **[@emmaccen](https://x.com/emmaccen)**

If this resonates, **star the repo** and follow along. More to come. 🚀

---

**MIT licensed.**
