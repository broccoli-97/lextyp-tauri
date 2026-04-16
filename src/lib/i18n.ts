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
    "editor.noDocument": "No document open",
    "editor.noDocumentHint": "Create or open a document from the sidebar",
    "editor.outline": "Outline",

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

    // Files panel
    "files.saveAs": "Save As",
    "files.export": "Export .typ",

    // Status bar tips
    "tip.slash": "Type / to open the slash menu and insert headings, lists, or citations",
    "tip.citationStyle": "Switch citation styles anytime from the sidebar dropdown",
    "tip.pdfDoubleClick": "Double-click the PDF preview to jump to that paragraph in the editor",
    "tip.collapsePanel": "Collapse the sidebar or PDF panel for distraction-free writing",
    "tip.outline": "Use the outline button at the bottom-left to navigate long documents",
    "tip.darkMode": "Toggle dark mode from the sidebar settings",
    "tip.bold": "Ctrl+B for bold, Ctrl+I for italic, Ctrl+U for underline",
    "tip.bibImport": "Import a .bib file to manage all your references in one place",

    // Review
    "sidebar.review": "Review",
    "review.title": "Review Mode",
    "review.enable": "Enable Review Mode",
    "review.disable": "Exit Review Mode",
    "review.authorName": "Your Name",
    "review.authorPlaceholder": "Enter your name...",
    "review.addComment": "Add Comment",
    "review.resolve": "Resolve",
    "review.unresolve": "Reopen",
    "review.delete": "Delete",
    "review.noComments": "No comments yet",
    "review.noCommentsHint": "Select text in review mode to add comments",
    "review.commentPlaceholder": "Write a comment...",
    "review.resolved": "Resolved",
    "review.comments": "comments",
    "review.unresolved": "unresolved",

    // History / Versions
    "sidebar.history": "History",
    "history.title": "Version History",
    "history.saveVersion": "Save Version",
    "history.versionName": "Version Name",
    "history.namePlaceholder": "e.g. Draft 1, Final...",
    "history.description": "Description (optional)",
    "history.descPlaceholder": "What changed...",
    "history.noVersions": "No versions saved",
    "history.noVersionsHint": "Save a version to track your document's history",
    "history.view": "View",
    "history.delete": "Delete",
    "history.deleteConfirm": "Delete this version?",
    "history.compare": "Compare",
    "history.viewing": "Viewing:",
    "history.backToCurrent": "Back to current",
    "history.diffTitle": "Comparing versions",
    "history.closeDiff": "Close diff",
    "history.added": "Added",
    "history.removed": "Removed",
    "history.modified": "Modified",
    "history.unchanged": "Unchanged",
    "history.selectTwo": "Select two versions to compare",
    "history.blocks": "blocks",
    "history.save": "Save",
    "history.cancel": "Cancel",

    // Update
    "update.available": "v{version} available — click to download",
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
    "editor.noDocument": "未打开文档",
    "editor.noDocumentHint": "从侧边栏创建或打开文档",
    "editor.outline": "大纲",

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

    // Files panel
    "files.saveAs": "另存为",
    "files.export": "导出 .typ",

    // Status bar tips
    "tip.slash": "输入 / 打开斜杠菜单，插入标题、列表或引用",
    "tip.citationStyle": "随时从侧边栏下拉菜单切换引用样式",
    "tip.pdfDoubleClick": "双击 PDF 预览可跳转到编辑器中的对应段落",
    "tip.collapsePanel": "收起侧边栏或 PDF 面板，获得无干扰的写作体验",
    "tip.outline": "使用左下角的大纲按钮浏览长文档",
    "tip.darkMode": "在侧边栏设置中切换深色模式",
    "tip.bold": "Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+U 下划线",
    "tip.bibImport": "导入 .bib 文件，集中管理所有参考文献",

    // Review
    "sidebar.review": "审阅",
    "review.title": "审阅模式",
    "review.enable": "启用审阅模式",
    "review.disable": "退出审阅模式",
    "review.authorName": "您的姓名",
    "review.authorPlaceholder": "输入您的姓名...",
    "review.addComment": "添加批注",
    "review.resolve": "标记已解决",
    "review.unresolve": "重新打开",
    "review.delete": "删除",
    "review.noComments": "暂无批注",
    "review.noCommentsHint": "在审阅模式下选择文本以添加批注",
    "review.commentPlaceholder": "输入批注...",
    "review.resolved": "已解决",
    "review.comments": "条批注",
    "review.unresolved": "条未解决",

    // History / Versions
    "sidebar.history": "历史",
    "history.title": "版本历史",
    "history.saveVersion": "保存版本",
    "history.versionName": "版本名称",
    "history.namePlaceholder": "例如 初稿、终稿...",
    "history.description": "描述（可选）",
    "history.descPlaceholder": "修改了什么...",
    "history.noVersions": "暂无保存的版本",
    "history.noVersionsHint": "保存版本以追踪文档历史",
    "history.view": "查看",
    "history.delete": "删除",
    "history.deleteConfirm": "确定删除此版本？",
    "history.compare": "比较",
    "history.viewing": "正在查看：",
    "history.backToCurrent": "返回当前版本",
    "history.diffTitle": "版本比较",
    "history.closeDiff": "关闭比较",
    "history.added": "新增",
    "history.removed": "删除",
    "history.modified": "修改",
    "history.unchanged": "未变",
    "history.selectTwo": "选择两个版本进行比较",
    "history.blocks": "个段落",
    "history.save": "保存",
    "history.cancel": "取消",

    // Update
    "update.available": "v{version} 可用 — 点击下载",
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
