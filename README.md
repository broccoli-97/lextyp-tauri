# LexTyp

> **A citation-free essay & coursework editor tailored for law students and OSCOLA users. Focus on legal writing and research, not citation headaches.**
>
> **专为法学生与 OSCOLA 使用者打造的「免引用烦恼」论文/作业编辑器：告别繁琐注脚与格式内耗，专注法学内容创作。**

LexTyp is a modern desktop editor engineered to eliminate the frustration of legal citation and footnote formatting. Whether you are drafting a legal essay, dissertation, case note, or coursework, simply import your `.bib` references and write naturally. LexTyp automatically formats complex OSCOLA conventions (cases with neutral citations, statutes, short forms, pinpoints, and *ibid*) and renders publication-ready PDFs in real time via Typst.

<!-- TODO: add screenshot here -->
<!-- ![LexTyp screenshot](docs/screenshot.png) -->

## Features / 核心特性

- ⚖️ **Tailored for Law & OSCOLA (法学专属支持)** -- First-class, out-of-the-box support for OSCOLA citations (cases, legislation, books, journals, pinpoint citations, `(n X)` cross-references, and automatic `ibid`). Also supports one-click switching to Harvard, APA, Chicago, or IEEE.
- ✍️ **Citation-Free Writing (免格式创作体验)** -- Insert `@citation` tags naturally as you type. Never hand-format a footnote or assemble a bibliography manually again.
- ⚡ **Live PDF Preview (实时排版预览)** -- Millisecond-speed compilation via the built-in Typst engine side-by-side with your BlockNote editor.
- 🎯 **Source Map Navigation (双向点击定位)** -- Click-to-scroll between the WYSIWYG editor and the rendered PDF page.
- 🌓 **Dark / Light Theme (深浅色模式)** -- Thoughtfully crafted themes for late-night essay writing.
- 🌐 **Bilingual Interface (中英双语)** -- Full English and Simplified Chinese (`zh-CN`) support.
- 💻 **Cross-Platform & Offline (跨平台与本地优先)** -- Runs natively on Windows, macOS, and Linux via Tauri v2. Your drafts and notes stay 100% private and offline on your computer.

## File Format

LexTyp documents (`.lextyp`) are ZIP archives containing:

| File | Description |
|---|---|
| `meta.json` | Title, citation style, timestamps |
| `document.json` | BlockNote editor state |
| `document.typ` | Compiled Typst source |
| `references.bib` | BibTeX bibliography (optional) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

#### Linux notes

LexTyp uses the system WebView2 (webkit2gtk) on Linux. If the app fails to launch or you see WebView-related errors, install the required libraries:

```bash
# Debian / Ubuntu
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel

# Arch
sudo pacman -S webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg
```

See the [Tauri v2 prerequisites guide](https://v2.tauri.app/start/prerequisites/#linux) for the full list.

### Install & Run

```bash
# clone the repo
git clone https://github.com/broccoli-97/lextyp-tauri.git
cd lextyp-tauri

# install frontend dependencies
npm install

# start the app in development mode
npm run tauri dev
```

### Other Commands

```bash
npm run dev          # frontend-only dev server (port 1420)
npm run build        # TypeScript check + Vite production build
npx tsc --noEmit     # type-check frontend TypeScript
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 (Rust) |
| Frontend | React 19, TypeScript, Vite |
| UI | Mantine v8, Tailwind CSS v4 |
| Editor | BlockNote |
| State | Zustand |
| Typesetting | Typst |
| PDF rendering | react-pdf |

## Project Structure

```
src/
  components/   # React UI components
  editor/       # BlockNote editor schema and setup
  lib/           # Typst serializer, citation formatters, i18n
  stores/        # Zustand state stores
  types/         # TypeScript type definitions
src-tauri/
  src/           # Rust backend (Tauri commands, Typst compilation, project I/O)
test/            # Tests
```

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

You are free to use, modify, and distribute LexTyp for any **personal, non-commercial** purpose -- including research, education, hobby projects, and use by non-profit organizations. Commercial use requires a separate license from the author.

LexTyp bundles the [Typst](https://github.com/typst/typst) compiler (Apache-2.0). See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for details.
