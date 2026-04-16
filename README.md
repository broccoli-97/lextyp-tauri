# LexTyp

A citation format-free academic document editor. Import your references, pick a citation style, and get a publication-ready PDF -- live, as you type. Built with Tauri v2, React 19, and BlockNote.

<!-- TODO: add screenshot here -->
<!-- ![LexTyp screenshot](docs/screenshot.png) -->

## Features

- **Citation format-free** -- OSCOLA, APA, Harvard, Chicago, IEEE -- switch styles with one click. Import your `.bib` file and never hand-format a footnote again
- **Live PDF preview** -- documents are compiled to PDF via the Typst engine in real time, side-by-side with the editor
- **Source map navigation** -- click-to-scroll between editor and PDF preview
- **Dark / Light theme** -- CSS custom-property-based theming
- **i18n** -- English and Simplified Chinese (`zh-CN`)
- **Cross-platform** -- runs on Windows, macOS, and Linux via Tauri

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
