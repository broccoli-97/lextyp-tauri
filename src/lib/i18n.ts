import type { Locale } from "../stores/settings-store";
import { useSettingsStore } from "../stores/settings-store";

const translations = {
  en: {
    // Sidebar
    "sidebar.files": "Files",
    "sidebar.references": "References",
    "sidebar.newDocument": "New Document",
    "sidebar.newFolder": "New Folder",
    "sidebar.openFile": "Open File...",
    "sidebar.openWorkspace": "Open Workspace",
    "sidebar.switchWorkspace": "Switch Workspace",

    "sidebar.noWorkspace": "No workspace open",
    "sidebar.noWorkspaceHint": "Open a folder to manage your documents",
    "sidebar.collapse": "Collapse sidebar",
    "sidebar.expand": "Expand sidebar",
    "sidebar.new": "New...",
    "sidebar.closeWorkspace": "Close Workspace",

    // Editor
    "editor.noDocument": "Start your essay",
    "editor.noDocumentHint": "Create or open a document from the sidebar. OSCOLA citations are on by default — switch styles from the chip in the status bar.",
    "editor.outline": "Outline",

    // Empty-state actions
    "empty.openExample": "Open the example template",
    "empty.openingExample": "Opening…",

    // PDF Preview
    "pdf.preview": "Preview",
    "pdf.error": "Error",
    "pdf.loading": "Loading PDF...",
    "pdf.compiling": "Compiling document...",
    "pdf.willAppear": "Preview will appear here",
    "pdf.startTyping": "Start typing to see your document",
    "pdf.download": "Download",
    "pdf.collapse": "Collapse preview",
    "pdf.expand": "Expand preview",
    "pdf.pages": "pages",
    "pdf.page": "page",

    // Status bar
    "status.compiling": "Compiling...",
    "status.error": "Error",
    "status.ready": "Ready",

    // Settings
    "settings.title": "Settings",
    "settings.theme": "Theme",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.language": "Language",
    "settings.langEn": "English",
    "settings.langZh": "简体中文",
    "settings.updates": "Updates",
    "settings.checkNow": "Check now",
    "settings.checking": "Checking...",
    "settings.upToDate": "You're up to date (v{version})",
    "settings.newVersion": "v{version} available",
    "settings.checkFailed": "Check failed",
    "settings.viewRelease": "View release",
    "settings.about": "About",
    "settings.aboutTagline": "Citation format-free academic document editor.",
    "settings.projectLicense": "Project license",
    "settings.poweredBy": "Powered by",
    "settings.typstLicense": "Apache License 2.0",
    "settings.viewRepo": "View repository",
    "settings.viewTypst": "typst.app",

    // Context menu
    "context.rename": "Rename",
    "context.delete": "Delete",

    // References panel
    "refs.search": "Search references...",
    "refs.style": "Citation Style",
    "refs.importBib": "Import .bib",
    "refs.noRefs": "No references yet",
    "refs.noRefsHint": "Import a .bib file to get started",
    "refs.insert": "Insert",
    "refs.newRef": "New Reference",
    "refs.editRef": "Edit Reference",
    "refs.addNew": "Add Reference",
    "refs.add": "Add",
    "refs.references": "references",
    "refs.noMatches": "No matches",
    "refs.modeForm": "Form",
    "refs.cancel": "Cancel",
    "refs.save": "Save",
    "refs.create": "Create",
    "refs.delete": "Delete",
    "refs.deleteConfirm": "Delete this reference?",
    "refs.fieldType": "Type",
    "refs.fieldKey": "Citation Key",
    "refs.errorKeyRequired": "Citation key is required",
    "refs.errorKeyInvalid": "Key may only contain letters, digits, :, ., /, -",
    "refs.errorKeyDuplicate": "A reference with this key already exists",
    "refs.errorFieldRequired": "Required field is empty",
    "refs.errorBibEmpty": "BibTeX text is empty",
    "refs.errorBibParseFail": "Could not parse BibTeX entry",
    "refs.edit": "Edit",
    "refs.needDocument": "Open a document to manage references",
    "refs.needDocumentHint": "Each document has its own bibliography saved inside it.",

    // Files panel
    "files.saveAs": "Save As",
    "files.export": "Export .typ",

    // Status bar tips
    "tip.slash": "Type / to open the slash menu and insert headings, lists, or citations",
    "tip.citationStyle": "Switch citation styles anytime from the chip in the status bar",
    "tip.pdfDoubleClick": "Double-click the PDF preview to jump to that paragraph in the editor",
    "tip.collapsePanel": "Collapse the sidebar or PDF panel for distraction-free writing",
    "tip.outline": "Use the outline button at the bottom-left to navigate long documents",
    "tip.darkMode": "Toggle dark mode from the sidebar settings",
    "tip.bold": "Ctrl+B for bold, Ctrl+I for italic, Ctrl+U for underline",
    "tip.bibImport": "Import a .bib file to manage all your references in one place",

    // Update
    "update.available": "v{version} available — click to download",

    // Word count
    "words.label": "words",
    "words.tooltip": "Words before the cursor / total words in the document",

    // Cover page
    "cover.tag": "COVER PAGE",
    "cover.dialogSubtitle": "Title page metadata",
    "cover.edit": "Edit",
    "cover.preview": "Preview",
    "cover.togglePreview": "Show or hide the preview",
    "cover.close": "Close",
    "cover.cancel": "Cancel",
    "cover.save": "Save cover page",
    "cover.resetDefaults": "Reset to defaults",
    "cover.resetDefaultsHint": "Clear every field and revert to the built-in defaults",
    "cover.optional": "Optional",
    "cover.title": "Title",
    "cover.titlePlaceholder": "Welcome to LexTyp",
    "cover.subtitle": "Subtitle",
    "cover.subtitlePlaceholder": "A guided tour of the editor",
    "cover.author": "Author",
    "cover.authorPlaceholder": "Your name",
    "cover.supervisor": "Supervisor",
    "cover.supervisorPlaceholder": "e.g. Dr A. Smith",
    "cover.institution": "Institution",
    "cover.institutionPlaceholder": "King's College London",
    "cover.department": "Department",
    "cover.departmentPlaceholder": "Department or programme",
    "cover.date": "Date",
    "cover.datePlaceholder": "e.g. May 2026",
    "cover.dateAuto": "Auto",
    "cover.dateAutoActive": "Updates to today's date on every compile",
    "cover.dateAutoSet": "Set the date to today (and keep it auto-updated)",
    "cover.wordCount": "Word count",
    "cover.wordCountAuto": "Auto",
    "cover.wordCountAutoActive": "Live total — updates as you type",
    "cover.wordCountAutoSet": "Show the live word count on the cover page",
    "cover.wordCountHidden": "Hidden",
    "cover.targetPlaceholder": "No target",
    "cover.additionalLines": "Additional lines",
    "cover.additionalLinesHint": "One per line — e.g. candidate number, module code",
    "cover.extra": "Extra lines",
    "cover.extraPlaceholder": "Candidate number: 12345\nModule: Tort Law (LAW2003)",
    "cover.layout": "Layout",
    "cover.layoutClassic": "Classic",
    "cover.layoutCentered": "Centered",
    "cover.layoutMinimal": "Minimal",
    "cover.previewEmpty": "Untitled cover page",
    "cover.previewEmptyHint": "Click to add the title, author, and other details",

    // Document output
    "doc.references": "References",
  },
  "zh-CN": {
    // Sidebar
    "sidebar.files": "文件",
    "sidebar.references": "参考文献",
    "sidebar.newDocument": "新建文档",
    "sidebar.newFolder": "新建文件夹",
    "sidebar.openFile": "打开文件...",
    "sidebar.openWorkspace": "打开工作区",
    "sidebar.switchWorkspace": "切换工作区",

    "sidebar.noWorkspace": "未打开工作区",
    "sidebar.noWorkspaceHint": "打开文件夹以管理您的文档",
    "sidebar.collapse": "收起侧边栏",
    "sidebar.expand": "展开侧边栏",
    "sidebar.new": "新建...",
    "sidebar.closeWorkspace": "关闭工作区",

    // Editor
    "editor.noDocument": "开始撰写论文",
    "editor.noDocumentHint": "从侧边栏新建或打开文档。默认使用 OSCOLA 引注 — 可在状态栏的标签切换样式。",
    "editor.outline": "大纲",

    // Empty-state actions
    "empty.openExample": "打开示例模板",
    "empty.openingExample": "正在打开…",

    // PDF Preview
    "pdf.preview": "预览",
    "pdf.error": "错误",
    "pdf.loading": "正在加载 PDF...",
    "pdf.compiling": "正在编译文档...",
    "pdf.willAppear": "预览将显示在这里",
    "pdf.startTyping": "开始输入以查看文档",
    "pdf.download": "下载",
    "pdf.collapse": "收起预览",
    "pdf.expand": "展开预览",
    "pdf.pages": "页",
    "pdf.page": "页",

    // Status bar
    "status.compiling": "编译中...",
    "status.error": "错误",
    "status.ready": "就绪",

    // Settings
    "settings.title": "设置",
    "settings.theme": "主题",
    "settings.light": "浅色",
    "settings.dark": "深色",
    "settings.language": "语言",
    "settings.langEn": "English",
    "settings.langZh": "简体中文",
    "settings.updates": "更新",
    "settings.checkNow": "检查更新",
    "settings.checking": "正在检查...",
    "settings.upToDate": "已是最新版本 (v{version})",
    "settings.newVersion": "发现新版本 v{version}",
    "settings.checkFailed": "检查失败",
    "settings.viewRelease": "查看发布",
    "settings.about": "关于",
    "settings.aboutTagline": "无需手写引用格式的学术文档编辑器。",
    "settings.projectLicense": "项目许可证",
    "settings.poweredBy": "技术支持",
    "settings.typstLicense": "Apache 许可证 2.0",
    "settings.viewRepo": "查看仓库",
    "settings.viewTypst": "typst.app",

    // Context menu
    "context.rename": "重命名",
    "context.delete": "删除",

    // References panel
    "refs.search": "搜索参考文献...",
    "refs.style": "引用样式",
    "refs.importBib": "导入 .bib",
    "refs.noRefs": "暂无参考文献",
    "refs.noRefsHint": "导入 .bib 文件以开始使用",
    "refs.insert": "插入",
    "refs.newRef": "新建参考文献",
    "refs.editRef": "编辑参考文献",
    "refs.addNew": "添加参考文献",
    "refs.add": "添加",
    "refs.references": "条文献",
    "refs.noMatches": "无匹配项",
    "refs.modeForm": "表单",
    "refs.cancel": "取消",
    "refs.save": "保存",
    "refs.create": "创建",
    "refs.delete": "删除",
    "refs.deleteConfirm": "确定删除此参考文献？",
    "refs.fieldType": "类型",
    "refs.fieldKey": "引用键",
    "refs.errorKeyRequired": "引用键不能为空",
    "refs.errorKeyInvalid": "键只能包含字母、数字、:、.、/、-",
    "refs.errorKeyDuplicate": "此引用键已存在",
    "refs.errorFieldRequired": "必填字段为空",
    "refs.errorBibEmpty": "BibTeX 文本为空",
    "refs.errorBibParseFail": "无法解析 BibTeX 条目",
    "refs.edit": "编辑",
    "refs.needDocument": "请先打开一篇文档以管理参考文献",
    "refs.needDocumentHint": "每篇文档都保存自己的参考文献库。",

    // Files panel
    "files.saveAs": "另存为",
    "files.export": "导出 .typ",

    // Status bar tips
    "tip.slash": "输入 / 打开斜杠菜单，插入标题、列表或引用",
    "tip.citationStyle": "可在状态栏的引注样式标签随时切换",
    "tip.pdfDoubleClick": "双击 PDF 预览可跳转到编辑器中的对应段落",
    "tip.collapsePanel": "收起侧边栏或 PDF 面板，获得无干扰的写作体验",
    "tip.outline": "使用左下角的大纲按钮浏览长文档",
    "tip.darkMode": "在侧边栏设置中切换深色模式",
    "tip.bold": "Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+U 下划线",
    "tip.bibImport": "导入 .bib 文件，集中管理所有参考文献",

    // Update
    "update.available": "v{version} 可用 — 点击下载",

    // Word count
    "words.label": "字",
    "words.tooltip": "光标前字数 / 全文字数",

    // Cover page
    "cover.tag": "封面",
    "cover.dialogSubtitle": "封面页元数据",
    "cover.edit": "编辑",
    "cover.preview": "预览",
    "cover.togglePreview": "显示或隐藏预览",
    "cover.close": "关闭",
    "cover.cancel": "取消",
    "cover.save": "保存封面",
    "cover.resetDefaults": "恢复默认",
    "cover.resetDefaultsHint": "清除所有字段并恢复为默认值",
    "cover.optional": "可选",
    "cover.title": "标题",
    "cover.titlePlaceholder": "论文标题",
    "cover.subtitle": "副标题",
    "cover.subtitlePlaceholder": "副标题",
    "cover.author": "作者",
    "cover.authorPlaceholder": "作者姓名",
    "cover.supervisor": "导师",
    "cover.supervisorPlaceholder": "导师姓名",
    "cover.institution": "学校",
    "cover.institutionPlaceholder": "学校或机构名称",
    "cover.department": "院系",
    "cover.departmentPlaceholder": "院系或专业",
    "cover.date": "日期",
    "cover.datePlaceholder": "例如 2026 年 5 月",
    "cover.dateAuto": "自动",
    "cover.dateAutoActive": "编译时自动更新为今天",
    "cover.dateAutoSet": "设为自动（每次编译都使用当天日期）",
    "cover.wordCount": "字数",
    "cover.wordCountAuto": "自动",
    "cover.wordCountAutoActive": "实时字数 — 编辑时自动更新",
    "cover.wordCountAutoSet": "在封面显示实时字数",
    "cover.wordCountHidden": "隐藏",
    "cover.targetPlaceholder": "无目标",
    "cover.additionalLines": "其他信息",
    "cover.additionalLinesHint": "每行一条，例如考生编号、课程代码等",
    "cover.extra": "其他信息",
    "cover.extraPlaceholder": "考生编号：12345\n课程：侵权法（LAW2003）",
    "cover.layout": "排版",
    "cover.layoutClassic": "经典",
    "cover.layoutCentered": "居中",
    "cover.layoutMinimal": "极简",
    "cover.previewEmpty": "未命名封面",
    "cover.previewEmptyHint": "点击此处填写标题、作者等信息",

    // Document output
    "doc.references": "参考文献",
  },
} as const;

type TranslationKey = keyof (typeof translations)["en"];

export function t(key: TranslationKey, locale?: Locale): string {
  const l = locale ?? useSettingsStore.getState().locale;
  return translations[l]?.[key] ?? translations.en[key] ?? key;
}

/** React hook — re-renders when locale changes */
export function useT() {
  const locale = useSettingsStore((s) => s.locale);
  return (key: TranslationKey) => translations[locale]?.[key] ?? translations.en[key] ?? key;
}
