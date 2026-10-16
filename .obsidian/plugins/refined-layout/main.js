/* Refined Layout - generated file */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => RefinedLayoutPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/blank-line-navigation.ts
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");
var EXCLUDED = ".canvas-wrapper, .canvas-node, .mermaid, .block-language-dataviewjs, .markdown-embed, .callout, .cm-callout, .cm-table-widget";
function hasBlockingWidget(dom) {
  return Array.from(dom.querySelectorAll('[contenteditable="false"], .cm-widgetBuffer')).some((widget) => {
    if (widget.closest(".cm-fold-indicator") || widget.matches('img.cm-widgetBuffer[aria-hidden="true"]')) return false;
    return !(widget.tagName === "SPAN" && widget.childNodes.length === 0 && widget.getBoundingClientRect().width === 0);
  });
}
function textLineElement(view, line) {
  if (!view.visibleRanges.some(({ from, to }) => from <= line.from && to >= line.to)) return null;
  const block = view.lineBlockAt(line.from);
  if (block.type !== import_view.BlockType.Text || block.from !== line.from || block.to !== line.to) return null;
  const { node } = view.domAtPos(line.from);
  const element = node.nodeType === 1 ? node : node.parentElement;
  const dom = element?.closest(".cm-line");
  if (!dom || dom.parentElement !== view.contentDOM || view.posAtDOM(dom, 0) !== line.from) return null;
  if (dom.closest(EXCLUDED) || hasBlockingWidget(dom)) return null;
  if (dom.getClientRects().length === 0) return null;
  return dom;
}
function compressedBlank(view, line, dom) {
  if (line.length !== 0 || !dom.matches(":has(> br:only-child)")) return false;
  const classes = dom.ownerDocument.body.classList;
  const bodyRule = classes.contains("rl-edit-body");
  const codeRule = classes.contains("rl-edit-code-blocks") && dom.matches(".HyperMD-codeblock.HyperMD-codeblock-bg");
  const headingRule = classes.contains("rl-edit-heading-gaps") && dom.previousElementSibling?.matches('[class*="HyperMD-header"]') && dom.nextElementSibling?.matches('.cm-line:not([class*="HyperMD-header"]), .cm-callout, .cm-table-widget, .image-embed');
  if (!bodyRule && !codeRule && !headingRule) return false;
  const style = dom.ownerDocument.defaultView.getComputedStyle(dom);
  return style.visibility !== "hidden" && Number.parseFloat(style.lineHeight) < Math.max(view.defaultLineHeight, Number.parseFloat(style.fontSize)) - 0.5;
}
function insideAtomicRange(view, pos) {
  let inside = false;
  for (const ranges of view.state.facet(import_view.EditorView.atomicRanges)) {
    ranges(view).between(pos, pos, (from, to) => {
      if (from < pos && to > pos) inside = true;
    });
  }
  return inside;
}
function cursorAt(head, original, goalColumn) {
  return import_state.EditorSelection.cursor(head, original.assoc || -1, original.bidiLevel ?? void 0, goalColumn);
}
function moveAcrossBlankLines(view, forward, extend = false) {
  const selection = view.state.selection;
  if (!view.hasFocus || view.composing || view.compositionStarted || view.state.readOnly || selection.ranges.length !== 1 || !extend && !selection.main.empty) return false;
  if (!view.dom.closest(".markdown-source-view.mod-cm6") || view.dom.closest(EXCLUDED) || view.dom.classList.contains("cm-vimMode")) return false;
  const body = view.dom.ownerDocument.body;
  if (!body.classList.contains("refined-layout-enabled")) return false;
  const start = selection.main;
  const doc = view.state.doc;
  const current = doc.lineAt(start.head);
  const nextNumber = current.number + (forward ? 1 : -1);
  if (nextNumber < 1 || nextNumber > doc.lines) return false;
  const next = doc.line(nextNumber);
  if (current.length !== 0 && next.length !== 0) return false;
  const currentDOM = textLineElement(view, current);
  const nextDOM = textLineElement(view, next);
  if (!currentDOM || !nextDOM) return false;
  const currentBlank = compressedBlank(view, current, currentDOM);
  const nextBlank = compressedBlank(view, next, nextDOM);
  if (!currentBlank && !nextBlank) return false;
  if (Array.from(body.querySelectorAll(".suggestion-container")).some((element) => element.getClientRects().length > 0 && element.ownerDocument.defaultView.getComputedStyle(element).visibility !== "hidden")) return false;
  const cursor = cursorAt(start.head, start, start.goalColumn);
  if (!currentBlank) {
    const boundary = view.moveToLineBoundary(cursor, forward, true);
    if (boundary.head !== (forward ? current.to : current.from)) return false;
  }
  const native = view.moveVertically(cursor, forward);
  let target;
  if (nextBlank) {
    if (native.head === next.from) return false;
    target = cursorAt(next.from, native, native.goalColumn);
  } else {
    if (!currentBlank || next.length === 0) return false;
    const edge = forward ? next.from : next.to;
    const coords = view.coordsAtPos(edge, forward ? 1 : -1);
    if (!coords || native.goalColumn === void 0) return false;
    const y = (coords.top + coords.bottom) / 2;
    const pos = view.posAtCoords({
      x: view.contentDOM.getBoundingClientRect().left + native.goalColumn,
      y
    });
    if (pos === null || pos < next.from || pos > next.to) return false;
    const after = view.coordsAtPos(pos, 1);
    const assoc = after && y < after.top ? -1 : 1;
    if (pos === native.head && assoc === native.assoc) return false;
    target = import_state.EditorSelection.cursor(pos, assoc, void 0, native.goalColumn);
  }
  if (target.head === start.head || insideAtomicRange(view, target.head)) return false;
  view.dispatch({
    selection: import_state.EditorSelection.create([extend ? import_state.EditorSelection.range(start.anchor, target.head, target.goalColumn, target.bidiLevel ?? void 0) : target]),
    scrollIntoView: true,
    userEvent: extend ? "select.extend" : "select"
  });
  return true;
}
function createBlankLineNavigation() {
  const views = /* @__PURE__ */ new Set();
  const lifecycle = import_view.ViewPlugin.define((view) => {
    views.add(view);
    view.requestMeasure();
    return { destroy: () => {
      views.delete(view);
    } };
  });
  return {
    extension: [
      lifecycle,
      // Host/plugin arrow keymaps can already occupy the high-precedence group.
      // Run before those handlers; unaffected keys still fall through to them.
      import_state.Prec.highest(import_view.keymap.of([
        { key: "ArrowUp", run: (view) => moveAcrossBlankLines(view, false), shift: (view) => moveAcrossBlankLines(view, false, true) },
        { key: "ArrowDown", run: (view) => moveAcrossBlankLines(view, true), shift: (view) => moveAcrossBlankLines(view, true, true) }
      ]))
    ],
    requestMeasure() {
      for (const view of views) view.requestMeasure();
    }
  };
}

// src/i18n/index.ts
var import_obsidian = require("obsidian");

// src/i18n/en.ts
var en = {
  "actions.back": "Back",
  "language.name": "Language",
  "language.description": "Choose the plugin's language. Changes apply immediately.",
  "language.auto": "Follow Obsidian",
  "mode.edit": "Editing view",
  "mode.read": "Reading view",
  "tabs.body": "Body & lists",
  "tabs.bodyDesc": "Line height, blank lines, and list spacing in the main body.",
  "tabs.headings": "Headings H1\u2013H6",
  "tabs.headingsDesc": "Line height and vertical spacing for each heading level in the main body.",
  "tabs.headingDecoration": "Heading decorations",
  "tabs.headingDecorationDesc": "Position, size, and offset of heading decorations provided by the theme.",
  "tabs.calloutDesc": "Appearance, title bar, body, and inner elements of Callout cards.",
  "context.blockquote": "Blockquote",
  "tabs.blockquoteDesc": "Body text, tables, and headings inside blockquotes.",
  "tabs.image": "Images",
  "tabs.imageDesc": "Size, corner radius, and borders of images in the main body.",
  "tabs.mermaid": "Mermaid diagrams",
  "tabs.mermaidDesc": "Responsive width rules for portrait and landscape Mermaid diagrams.",
  "tabs.table": "Body tables",
  "tabs.tableDesc": "Cell padding, borders, corner radius, and margins of body tables.",
  "tabs.codeBlock": "Code blocks",
  "tabs.codeBlockDesc": "Code block line height and vertical spacing for each view.",
  "tabs.headingGap": "After headings",
  "tabs.headingGapDesc": "Spacing adjustments for text, lists, code blocks, and other elements after headings.",
  "actions.export": "Export settings",
  "actions.exportDesc": "Export the current settings for both views as a JSON file.",
  "actions.import": "Import settings",
  "actions.importDesc": "Import settings from a JSON file, replacing the current settings on success.",
  "actions.resetAll": "Reset all",
  "actions.resetAllDesc": "Restore defaults for both views and all module switches.",
  "actions.cancel": "Cancel",
  "resetAll.title": "Reset all settings?",
  "resetAll.description": "This will restore defaults for both views and all module switches, replacing your current layout adjustments.",
  "aria.mode": "Settings view",
  "aria.sections": "Settings sections",
  "actions.resetSection": "Reset this section",
  "aria.headingLevel": "Heading level",
  "body.group": "Body typography",
  "body.groupDesc": "Line height, paragraph spacing, and blank line height in the main body.",
  "body.lineHeight": "Body line height",
  "body.lineHeightDesc": "Line height of regular body text.",
  "body.emptyLine": "Blank line height",
  "body.emptyLineDesc": "Height of blank lines in the CodeMirror source view.",
  "body.paragraphSpacing": "Paragraph spacing",
  "body.paragraphSpacingDesc": "Vertical spacing between regular paragraphs in reading view.",
  "list.group": "List spacing",
  "list.groupDesc": "Item spacing controls gaps between items. List spacing controls the space above the first and below the last item, separating the list from surrounding content. At these outer edges, only list spacing applies; item spacing is not added.",
  "list.itemTop": "Space above list items",
  "list.itemBottom": "Space below list items",
  "list.blockTop": "Space above the list",
  "list.blockBottom": "Space below the list",
  "body.listItemTopDesc": "Space between each body list item and the previous item.",
  "body.listItemBottomDesc": "Space between each body list item and the next item.",
  "body.listBlockTopDesc": "Space between the first body list item and the preceding content.",
  "body.listBlockBottomDesc": "Space between the last body list item and the following content.",
  "headings.firstLine": "First document line",
  "headings.firstLineDesc": "Special adjustment when the first line of the document is a heading.",
  "headings.firstTop": "First-line heading top adjustment",
  "headings.firstTopDesc": "Fine adjustment above a heading on the first document line.",
  "headings.group": "Heading typography & spacing",
  "headings.groupDesc": "Use the H1\u2013H6 tabs below to adjust line height and vertical margins for each heading level.",
  "headings.lineHeight": "{level} line height",
  "headings.top": "Space above {level}",
  "headings.bottom": "Space below {level}",
  "headings.lineHeightDesc": "Line height of heading text.",
  "headings.topDesc": "Space above the heading.",
  "headings.bottomDesc": "Space below the heading.",
  "decoration.group": "Position & appearance",
  "decoration.groupDesc": "Adjust heading decoration lines supplied by the theme's ::before pseudo-element. No decoration is added if the theme does not provide one.",
  "decoration.left": "Horizontal offset",
  "decoration.leftDesc": "Horizontal offset of the pseudo-element relative to the heading text.",
  "decoration.width": "Width",
  "decoration.widthDesc": "Width of the pseudo-element decoration line.",
  "decoration.radius": "Corner radius",
  "decoration.radiusDesc": "Corner radius of the pseudo-element decoration line.",
  "decoration.right": "Right spacing",
  "decoration.rightDesc": "Space between the right edge of the pseudo-element and the heading text.",
  "decoration.firstOffset": "First-line decoration adjustment",
  "decoration.firstOffsetDesc": "Additional offset only when the first document line is a heading. Positive values move down; negative values move up.",
  "decoration.levels": "Decoration height & vertical adjustment",
  "decoration.levelsDesc": "Use the H1\u2013H6 tabs below to adjust each decoration's height and vertical centering.",
  "decoration.height": "{level} height",
  "decoration.offset": "{level} vertical adjustment",
  "decoration.heightDesc": "Height of the pseudo-element.",
  "decoration.offsetDesc": "Fine adjustment from vertical centering on the first line. Positive values move down; negative values move up.",
  "callout.appearance": "Card appearance & margins",
  "callout.appearanceDesc": "Corner radius and space around Callout cards.",
  "callout.radius": "Card corner radius",
  "callout.radiusDesc": "Corner radius of Callout cards.",
  "callout.marginTop": "Card top margin",
  "callout.marginTopDesc": "Space between the Callout and the preceding content.",
  "callout.marginBottom": "Card bottom margin",
  "callout.marginBottomDesc": "Space between the Callout and the following content.",
  "callout.padding": "Card padding",
  "callout.paddingDesc": "Space between the edges of the Callout and its contents.",
  "callout.paddingTop": "Card top padding",
  "callout.paddingTopDesc": "Padding at the top of the Callout card.",
  "callout.paddingBottom": "Card bottom padding",
  "callout.paddingBottomDesc": "Padding at the bottom of the Callout card.",
  "callout.paddingLeft": "Card left padding",
  "callout.paddingLeftDesc": "Padding on the left of the Callout card.",
  "callout.paddingRight": "Card right padding",
  "callout.paddingRightDesc": "Padding on the right of the Callout card.",
  "callout.title": "Title bar typography & padding",
  "callout.titleDesc": "Text and standard padding of the Callout title bar.",
  "callout.titleLineHeight": "Title line height",
  "callout.titleLineHeightDesc": "Line height of the title bar text.",
  "callout.titleTop": "Title top padding",
  "callout.titleTopDesc": "Padding at the top of the title bar.",
  "callout.titleBottom": "Title bottom padding",
  "callout.titleBottomDesc": "Padding below the title bar. Conflicting space is suppressed automatically for title-only or collapsed cards, or when a heading follows.",
  "callout.titleLeft": "Title left padding",
  "callout.titleLeftDesc": "Padding on the left of the title bar.",
  "callout.titleRight": "Title right padding",
  "callout.titleRightDesc": "Padding on the right of the title bar.",
  "callout.specialTitle": "Title padding in special states",
  "callout.specialTitleDesc": "Separate padding controls for title-only and collapsed cards.",
  "callout.titleOnlyTop": "Title-only top padding",
  "callout.titleOnlyTopDesc": "Top padding when the Callout contains only a title.",
  "callout.titleOnlyBottom": "Title-only bottom padding",
  "callout.titleOnlyBottomDesc": "Bottom padding for title-only Callouts, independent of the card bottom padding used for Callouts with content.",
  "callout.collapsedTop": "Collapsed top padding",
  "callout.collapsedTopDesc": "Top padding of collapsed Callouts.",
  "callout.collapsedBottom": "Collapsed bottom padding",
  "callout.collapsedBottomDesc": "Bottom padding of collapsed Callouts.",
  "context.bodyGroup": "Inner body & lists",
  "callout.bodyDesc": "Independent paragraph and list spacing inside Callouts, with separate controls for list items and the whole list.",
  "context.lineHeight": "Inner body line height",
  "callout.lineHeightDesc": "Body line height inside Callouts, independent of regular body text.",
  "context.paragraphSpacing": "Inner paragraph spacing",
  "callout.paragraphSpacingDesc": "Paragraph spacing inside Callouts.",
  "callout.listItemTopDesc": "Space between each Callout list item and the previous item.",
  "callout.listItemBottomDesc": "Space between each Callout list item and the next item.",
  "callout.listBlockTopDesc": "Space between the first Callout list item and the preceding content.",
  "callout.listBlockBottomDesc": "Space between the last Callout list item and the following content.",
  "callout.lastList": "Space below a final list",
  "callout.lastListDesc": "Override the space below the list when it is the last element in a Callout.",
  "callout.image": "Callout images",
  "callout.imageDesc": "Size and appearance of images inside Callouts.",
  "callout.table": "Callout tables",
  "callout.tableDesc": "Padding, borders, and spacing of tables inside Callouts.",
  "blockquote.bodyDesc": "Independent typography and spacing for paragraphs and lists inside blockquotes, with separate controls for list items and the whole list.",
  "blockquote.lineHeightDesc": "Body line height inside blockquotes, independent of regular body text.",
  "blockquote.paragraphSpacingDesc": "Paragraph spacing inside blockquotes.",
  "blockquote.listItemTopDesc": "Space between each blockquote list item and the previous item.",
  "blockquote.listItemBottomDesc": "Space between each blockquote list item and the next item.",
  "blockquote.listBlockTopDesc": "Space between the first blockquote list item and the preceding content.",
  "blockquote.listBlockBottomDesc": "Space between the last blockquote list item and the following content.",
  "blockquote.table": "Blockquote tables",
  "blockquote.tableDesc": "Padding, borders, and spacing of tables inside blockquotes.",
  "context.headings": "Headings inside {context} (H1\u2013H6)",
  "context.headingsDesc": "Use the H1\u2013H6 tabs below to adjust heading line height and spacing inside {context}.",
  "context.headingLineHeightDesc": "Line height of inner headings.",
  "context.headingTopDesc": "Space above inner headings.",
  "context.headingBottomDesc": "Space below inner headings.",
  "image.group": "Body image size & appearance",
  "image.groupDesc": "Size, corner radius, and borders of regular body images.",
  "image.marginTop": "Image top spacing",
  "image.marginBottom": "Image bottom spacing",
  "image.marginTopEditDesc": "Space above the image. Source blank lines are controlled by Body \u2192 Blank line height.",
  "image.marginBottomEditDesc": "Space below the image. Source blank lines are controlled by Body \u2192 Blank line height.",
  "image.marginTopReadDesc": "Top margin of a body image paragraph, replacing its regular paragraph margin.",
  "image.marginBottomReadDesc": "Bottom margin of a body image paragraph, replacing its regular paragraph margin.",
  "image.maxWidth": "Maximum width",
  "image.maxWidthDesc": "Maximum image width relative to its containing content area.",
  "image.radius": "Image corner radius",
  "image.radiusDesc": "Corner radius of images.",
  "image.border": "Image border",
  "image.borderDesc": "Width of image borders.",
  "mermaid.group": "Responsive diagram widths",
  "mermaid.groupDesc": "Classify portrait and regular/landscape diagrams using the original SVG viewBox aspect ratio.",
  "mermaid.portraitWidth": "Portrait maximum width",
  "mermaid.portraitWidthDesc": "Center portrait diagrams at their original size without enlarging them. Scale down proportionally only when they exceed this percentage of the body width.",
  "mermaid.portraitRatio": "Portrait aspect ratio threshold",
  "mermaid.portraitRatioDesc": "Original SVG width divided by height. Ratios at or below this value are treated as portrait.",
  "mermaid.landscapeWidth": "Landscape minimum width",
  "mermaid.landscapeWidthDesc": "Minimum width for regular or landscape Mermaid diagrams. Allow horizontal scrolling when space is insufficient.",
  "table.group": "Body table appearance & spacing",
  "table.groupDesc": "Cell padding, inner and outer borders, corner radius, and vertical spacing of body tables.",
  "table.cellPadding": "Cell padding",
  "table.cellPaddingDesc": "Padding inside table cells.",
  "table.innerBorder": "Inner border width",
  "table.innerBorderDesc": "Width of borders inside the table.",
  "table.outerBorder": "Outer border width",
  "table.outerBorderDesc": "Width of the table's outer border.",
  "table.radius": "Table corner radius",
  "table.radiusDesc": "Corner radius of the whole table.",
  "table.top": "Space above tables",
  "table.topDesc": "Space between a table and the preceding content.",
  "table.bottom": "Space below tables",
  "table.bottomDesc": "Space between a table and the following content.",
  "code.group": "Code block typography & spacing",
  "code.groupDesc": "Code block line height and spacing in each view.",
  "code.lineHeight": "Code line height",
  "code.lineHeightDesc": "Line height inside code blocks.",
  "code.emptyLine": "Inner blank line spacing",
  "code.emptyLineDesc": "Blank line spacing inside code blocks in editing view.",
  "code.top": "Space above code blocks",
  "code.topDesc": "Space above code blocks in reading view.",
  "code.bottom": "Space below code blocks",
  "code.bottomDesc": "Space below code blocks in reading view.",
  "context.body": "Body",
  "context.quote": "Blockquote",
  "gap.group": "Spacing after headings: {context}",
  "gap.groupDesc": "Top spacing adjustments for the first element following a heading in {context}.",
  "gap.emptyLine": "Blank line height after headings",
  "gap.emptyLineDesc": "Height of a blank line between a heading and a non-heading element.",
  "gap.paragraph": "Following paragraph spacing",
  "gap.paragraphDesc": "Top spacing adjustment for body text immediately after a heading, with no blank line.",
  "gap.list": "Following list spacing",
  "gap.listDesc": "Top spacing adjustment for a list immediately after a body heading.",
  "gap.quote": "Following blockquote spacing",
  "gap.quoteDesc": "Top spacing adjustment for a blockquote immediately after a body heading.",
  "gap.code": "Following code block spacing",
  "gap.codeDesc": "Top spacing adjustment for a code block immediately after a body heading.",
  "gap.table": "Following table spacing",
  "gap.tableDesc": "Top spacing adjustment for a table immediately after a body heading.",
  "gap.image": "Following image spacing",
  "gap.imageDesc": "Top spacing adjustment for an image immediately after a body heading.",
  "gap.callout": "Following Callout spacing",
  "gap.calloutDesc": "Top spacing adjustment for a Callout immediately after a body heading.",
  "gap.contextEmptyLine": "Height of blank lines after headings in {context}.",
  "gap.contextParagraph": "Spacing for body text immediately after a heading in {context}.",
  "gap.contextList": "Spacing for a list immediately after a heading in {context}.",
  "gap.contextQuote": "Spacing for a blockquote immediately after a heading in {context}.",
  "gap.contextCode": "Spacing for a code block immediately after a heading in {context}.",
  "gap.contextTable": "Spacing for a table immediately after a heading in {context}.",
  "gap.contextImage": "Spacing for an image immediately after a heading in {context}.",
  "gap.contextCallout": "Spacing for a Callout immediately after a heading in {context}.",
  "unit.ratio": "\xD7",
  "notice.exported": "Refined Layout: Settings exported.",
  "notice.imported": "Refined Layout: Settings imported.",
  "notice.resetAll": "Refined Layout: Settings for both views have been reset.",
  "notice.readFailed": "Refined Layout: Could not read the settings file.",
  "notice.importFailed": "Refined Layout: Import failed. {detail}.",
  "error.invalidJson": "The file is not valid JSON",
  "error.invalidRoot": "The settings file must contain a JSON object at its root",
  "error.unsupportedVersion": "The settings file's schemaVersion must be 1, 2, or 3",
  "error.invalidFile": "The file format is invalid"
};

// src/i18n/zh-CN.ts
var translations = {
  "actions.back": "\u8FD4\u56DE",
  "language.name": "\u754C\u9762\u8BED\u8A00",
  "language.description": "\u9009\u62E9\u63D2\u4EF6\u7684\u663E\u793A\u8BED\u8A00\uFF0C\u5207\u6362\u540E\u7ACB\u5373\u751F\u6548\u3002",
  "language.auto": "\u8DDF\u968F Obsidian",
  "mode.edit": "\u7F16\u8F91\u6A21\u5F0F",
  "mode.read": "\u9605\u8BFB\u6A21\u5F0F",
  "tabs.body": "\u6B63\u6587\u4E0E\u5217\u8868",
  "tabs.bodyDesc": "\u666E\u901A\u6B63\u6587\u3001\u7A7A\u884C\u548C\u5217\u8868\u95F4\u8DDD\u8BBE\u7F6E\u3002",
  "tabs.headings": "\u6B63\u6587\u6807\u9898 H1\u2013H6",
  "tabs.headingsDesc": "\u6B63\u6587\u6807\u9898\u5404\u7EA7\u522B\u7684\u884C\u9AD8\u548C\u4E0A\u4E0B\u8FB9\u8DDD\u3002",
  "tabs.headingDecoration": "\u6807\u9898\u4F2A\u5143\u7D20",
  "tabs.headingDecorationDesc": "\u4E3B\u9898\u6807\u9898\u88C5\u9970\u7EBF\u7684\u4F4D\u7F6E\u3001\u5C3A\u5BF8\u548C\u504F\u79FB\u3002",
  "tabs.calloutDesc": "Callout \u5361\u7247\u5916\u89C2\u3001\u6807\u9898\u680F\u3001\u6B63\u6587\u53CA\u5185\u90E8\u5143\u7D20\u6392\u7248\u3002",
  "context.blockquote": "\u5F15\u7528\u5757",
  "tabs.blockquoteDesc": "\u5F15\u7528\u5757\u5185\u90E8\u6B63\u6587\u3001\u8868\u683C\u548C\u5404\u7EA7\u6807\u9898\u6392\u7248\u3002",
  "tabs.image": "\u56FE\u7247",
  "tabs.imageDesc": "\u6B63\u6587\u56FE\u7247\u7684\u5C3A\u5BF8\u3001\u5706\u89D2\u4E0E\u8FB9\u6846\u5916\u89C2\u3002",
  "tabs.mermaid": "Mermaid \u56FE\u8868",
  "tabs.mermaidDesc": "\u7EB5\u5411\u4E0E\u6A2A\u5411 Mermaid \u56FE\u8868\u7684\u81EA\u9002\u5E94\u5BBD\u5EA6\u89C4\u5219\u3002",
  "tabs.table": "\u6B63\u6587\u8868\u683C",
  "tabs.tableDesc": "\u6B63\u6587\u8868\u683C\u7684\u5355\u5143\u683C\u5185\u8FB9\u8DDD\u3001\u6846\u7EBF\u3001\u5706\u89D2\u548C\u5916\u8FB9\u8DDD\u3002",
  "tabs.codeBlock": "\u4EE3\u7801\u5757",
  "tabs.codeBlockDesc": "\u4EE3\u7801\u5757\u884C\u9AD8\u53CA\u6A21\u5F0F\u76F8\u5173\u7684\u4E0A\u4E0B\u8FB9\u8DDD\u8BBE\u7F6E\u3002",
  "tabs.headingGap": "\u6807\u9898\u540E\u9996\u5143\u7D20",
  "tabs.headingGapDesc": "\u6807\u9898\u540E\u63A5\u6B63\u6587\u3001\u5217\u8868\u3001\u4EE3\u7801\u5757\u7B49\u5143\u7D20\u65F6\u7684\u95F4\u8DDD\u8865\u507F\u3002",
  "actions.export": "\u5BFC\u51FA\u914D\u7F6E",
  "actions.exportDesc": "\u628A\u5F53\u524D\u7F16\u8F91\u548C\u9605\u8BFB\u4E24\u5957\u8BBE\u7F6E\u5BFC\u51FA\u4E3A JSON \u6587\u4EF6\u3002",
  "actions.import": "\u5BFC\u5165\u914D\u7F6E",
  "actions.importDesc": "\u4ECE JSON \u6587\u4EF6\u5BFC\u5165\u8BBE\u7F6E\uFF0C\u5BFC\u5165\u6210\u529F\u540E\u7ACB\u5373\u66FF\u6362\u5F53\u524D\u914D\u7F6E\u3002",
  "actions.resetAll": "\u5168\u90E8\u91CD\u7F6E",
  "actions.resetAllDesc": "\u6062\u590D\u7F16\u8F91\u548C\u9605\u8BFB\u4E24\u5957\u8BBE\u7F6E\u4EE5\u53CA\u5168\u90E8\u6A21\u5757\u5F00\u5173\u3002",
  "actions.cancel": "\u53D6\u6D88",
  "resetAll.title": "\u91CD\u7F6E\u5168\u90E8\u914D\u7F6E\uFF1F",
  "resetAll.description": "\u8FD9\u4F1A\u5C06\u7F16\u8F91\u548C\u9605\u8BFB\u4E24\u5957\u914D\u7F6E\u53CA\u5168\u90E8\u6A21\u5757\u5F00\u5173\u6062\u590D\u4E3A\u9ED8\u8BA4\u503C\uFF0C\u66FF\u6362\u4F60\u5F53\u524D\u7684\u6392\u7248\u8C03\u6574\u3002",
  "aria.mode": "\u8BBE\u7F6E\u6A21\u5F0F",
  "aria.sections": "\u8BBE\u7F6E\u5206\u533A",
  "actions.resetSection": "\u6062\u590D\u672C\u533A\u9ED8\u8BA4\u503C",
  "aria.headingLevel": "\u6807\u9898\u7EA7\u522B",
  "body.group": "\u6B63\u6587\u6392\u7248",
  "body.groupDesc": "\u666E\u901A\u6B63\u6587\u884C\u9AD8\u3001\u6BB5\u843D\u6216\u7A7A\u884C\u9AD8\u5EA6\u8BBE\u7F6E\u3002",
  "body.lineHeight": "\u6B63\u6587\u884C\u9AD8",
  "body.lineHeightDesc": "\u666E\u901A\u6B63\u6587\u6587\u672C\u7684\u884C\u9AD8\u3002",
  "body.emptyLine": "\u7A7A\u884C\u9AD8\u5EA6",
  "body.emptyLineDesc": "CodeMirror \u6E90\u7801\u89C6\u56FE\u4E2D\u7A7A\u767D\u884C\u7684\u9AD8\u5EA6\u3002",
  "body.paragraphSpacing": "\u6BB5\u843D\u95F4\u8DDD",
  "body.paragraphSpacingDesc": "\u9605\u8BFB\u89C6\u56FE\u4E2D\u666E\u901A\u6BB5\u843D\u4E4B\u95F4\u7684\u5782\u76F4\u95F4\u8DDD\u3002",
  "list.group": "\u5217\u8868\u95F4\u8DDD",
  "list.groupDesc": "\u300C\u6761\u76EE\u300D\u63A7\u5236\u6761\u76EE\u4E0E\u6761\u76EE\u4E4B\u95F4\uFF1B\u300C\u6574\u4F53\u300D\u63A7\u5236\u5217\u8868\u9996\u9879\u4E0A\u65B9\u548C\u672B\u9879\u4E0B\u65B9\uFF0C\u5373\u5217\u8868\u4E0E\u524D\u540E\u5185\u5BB9\u7684\u8DDD\u79BB\u3002\u9996\u672B\u4E24\u7AEF\u7531\u300C\u6574\u4F53\u300D\u51B3\u5B9A\uFF0C\u4E0D\u4E0E\u300C\u6761\u76EE\u300D\u53E0\u52A0\u3002",
  "list.itemTop": "\u5217\u8868\u6761\u76EE\u4E0A\u95F4\u8DDD",
  "list.itemBottom": "\u5217\u8868\u6761\u76EE\u4E0B\u95F4\u8DDD",
  "list.blockTop": "\u5217\u8868\u6574\u4F53\u4E0A\u95F4\u8DDD",
  "list.blockBottom": "\u5217\u8868\u6574\u4F53\u4E0B\u95F4\u8DDD",
  "body.listItemTopDesc": "\u6B63\u6587\u5217\u8868\u4E2D\uFF0C\u6BCF\u4E2A\u6761\u76EE\u4E0E\u4E0A\u4E00\u4E2A\u6761\u76EE\u7684\u95F4\u8DDD\u3002",
  "body.listItemBottomDesc": "\u6B63\u6587\u5217\u8868\u4E2D\uFF0C\u6BCF\u4E2A\u6761\u76EE\u4E0E\u4E0B\u4E00\u4E2A\u6761\u76EE\u7684\u95F4\u8DDD\u3002",
  "body.listBlockTopDesc": "\u6B63\u6587\u5217\u8868\u9996\u9879\u4E0E\u524D\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "body.listBlockBottomDesc": "\u6B63\u6587\u5217\u8868\u672B\u9879\u4E0E\u540E\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "headings.firstLine": "\u6587\u6863\u9996\u884C",
  "headings.firstLineDesc": "\u4EC5\u5728\u6587\u6863\u7B2C\u4E00\u884C\u5373\u4E3A\u6807\u9898\u65F6\u7684\u4E13\u9879\u8865\u507F\u3002",
  "headings.firstTop": "\u9996\u884C\u6807\u9898\u9876\u90E8\u8865\u507F",
  "headings.firstTopDesc": "\u6587\u6863\u7B2C\u4E00\u884C\u662F\u6807\u9898\u65F6\u7684\u9876\u90E8\u5FAE\u8C03\u8865\u507F\u3002",
  "headings.group": "\u5404\u7EA7\u6807\u9898\u6392\u7248\u4E0E\u95F4\u8DDD",
  "headings.groupDesc": "\u5207\u6362\u4E0B\u65B9 H1\u2013H6 \u6807\u7B7E\u9875\uFF0C\u5FAE\u8C03\u5BF9\u5E94\u7EA7\u522B\u6807\u9898\u7684\u884C\u9AD8\u4E0E\u4E0A\u4E0B\u5916\u8FB9\u8DDD\u3002",
  "headings.lineHeight": "{level} \u884C\u9AD8",
  "headings.top": "{level} \u4E0A\u95F4\u8DDD",
  "headings.bottom": "{level} \u4E0B\u95F4\u8DDD",
  "headings.lineHeightDesc": "\u6807\u9898\u6587\u5B57\u884C\u9AD8\u3002",
  "headings.topDesc": "\u6807\u9898\u9876\u90E8\u95F4\u8DDD\u3002",
  "headings.bottomDesc": "\u6807\u9898\u5E95\u90E8\u95F4\u8DDD\u3002",
  "decoration.group": "\u4F4D\u7F6E\u4E0E\u5916\u89C2",
  "decoration.groupDesc": "\u8C03\u6574\u4E3B\u9898\u5DF2\u7ECF\u63D0\u4F9B\u7684\u6807\u9898 ::before \u4F2A\u5143\u7D20\u88C5\u9970\u7EBF\uFF1B\u6CA1\u6709\u6807\u9898\u4F2A\u5143\u7D20\u7684\u4E3B\u9898\u4E0D\u4F1A\u65B0\u589E\u88C5\u9970\u3002",
  "decoration.left": "\u6C34\u5E73\u504F\u79FB",
  "decoration.leftDesc": "\u4F2A\u5143\u7D20\u76F8\u5BF9\u6807\u9898\u6587\u5B57\u7684\u6C34\u5E73\u504F\u79FB\u4F4D\u7F6E\u3002",
  "decoration.width": "\u5BBD\u5EA6",
  "decoration.widthDesc": "\u4F2A\u5143\u7D20\u88C5\u9970\u7EBF\u7684\u5BBD\u5EA6\u3002",
  "decoration.radius": "\u5706\u89D2",
  "decoration.radiusDesc": "\u4F2A\u5143\u7D20\u88C5\u9970\u7EBF\u7684\u5706\u89D2\u534A\u5F84\u3002",
  "decoration.right": "\u53F3\u95F4\u8DDD",
  "decoration.rightDesc": "\u4F2A\u5143\u7D20\u53F3\u4FA7\u4E0E\u6807\u9898\u6587\u672C\u7684\u8DDD\u79BB\u3002",
  "decoration.firstOffset": "\u6587\u6863\u9996\u6807\u9898\u989D\u5916\u8865\u507F",
  "decoration.firstOffsetDesc": "\u4EC5\u5728\u6587\u6863\u7B2C\u4E00\u884C\u5C31\u662F\u6807\u9898\u65F6\u53E0\u52A0\uFF1B\u6B63\u503C\u5411\u4E0B\uFF0C\u8D1F\u503C\u5411\u4E0A\u3002",
  "decoration.levels": "\u5404\u7EA7\u6807\u9898\u88C5\u9970\u9AD8\u5EA6\u4E0E\u5782\u76F4\u8865\u507F",
  "decoration.levelsDesc": "\u5207\u6362\u4E0B\u65B9 H1\u2013H6 \u6807\u7B7E\u9875\uFF0C\u5FAE\u8C03\u5404\u7EA7\u6807\u9898\u88C5\u9970\u7EBF\u7684\u9AD8\u5EA6\u548C\u5782\u76F4\u5C45\u4E2D\u8865\u507F\u3002",
  "decoration.height": "{level} \u9AD8\u5EA6",
  "decoration.offset": "{level} \u5782\u76F4\u8865\u507F",
  "decoration.heightDesc": "\u4F2A\u5143\u7D20\u9AD8\u5EA6\u3002",
  "decoration.offsetDesc": "\u5728\u7B2C\u4E00\u884C\u5782\u76F4\u5C45\u4E2D\u7684\u57FA\u7840\u4E0A\u5FAE\u8C03\uFF1B\u6B63\u503C\u5411\u4E0B\uFF0C\u8D1F\u503C\u5411\u4E0A\u3002",
  "callout.appearance": "\u5361\u7247\u5916\u89C2\u4E0E\u5916\u8FB9\u8DDD",
  "callout.appearanceDesc": "Callout \u5361\u7247\u7684\u5706\u89D2\u4EE5\u53CA\u4E0E\u524D\u540E\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "callout.radius": "\u5361\u7247\u5706\u89D2",
  "callout.radiusDesc": "Callout \u5361\u7247\u5706\u89D2\u534A\u5F84\u3002",
  "callout.marginTop": "\u5361\u7247\u4E0A\u5916\u8FB9\u8DDD",
  "callout.marginTopDesc": "Callout \u4E0E\u524D\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "callout.marginBottom": "\u5361\u7247\u4E0B\u5916\u8FB9\u8DDD",
  "callout.marginBottomDesc": "Callout \u4E0E\u540E\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "callout.padding": "\u5361\u7247\u5185\u8FB9\u8DDD",
  "callout.paddingDesc": "Callout \u5185\u90E8\u5404\u8FB9\u7F18\u4E0E\u5185\u5BB9\u7684\u5185\u8FB9\u8DDD\u3002",
  "callout.paddingTop": "\u5361\u7247\u4E0A\u5185\u8FB9\u8DDD",
  "callout.paddingTopDesc": "Callout \u5361\u7247\u9876\u90E8\u5185\u8FB9\u8DDD\u3002",
  "callout.paddingBottom": "\u5361\u7247\u4E0B\u5185\u8FB9\u8DDD",
  "callout.paddingBottomDesc": "Callout \u5361\u7247\u5E95\u90E8\u5185\u8FB9\u8DDD\u3002",
  "callout.paddingLeft": "\u5361\u7247\u5DE6\u5185\u8FB9\u8DDD",
  "callout.paddingLeftDesc": "Callout \u5361\u7247\u5DE6\u4FA7\u5185\u8FB9\u8DDD\u3002",
  "callout.paddingRight": "\u5361\u7247\u53F3\u5185\u8FB9\u8DDD",
  "callout.paddingRightDesc": "Callout \u5361\u7247\u53F3\u4FA7\u5185\u8FB9\u8DDD\u3002",
  "callout.title": "\u6807\u9898\u680F\u6392\u7248\u4E0E\u5E38\u89C4\u5185\u8FB9\u8DDD",
  "callout.titleDesc": "Callout \u6807\u9898\u680F\u6587\u5B57\u53CA\u6807\u51C6\u5185\u8FB9\u8DDD\u3002",
  "callout.titleLineHeight": "\u6807\u9898\u884C\u9AD8",
  "callout.titleLineHeightDesc": "\u6807\u9898\u680F\u6587\u5B57\u884C\u9AD8\u3002",
  "callout.titleTop": "\u6807\u9898\u4E0A\u5185\u8FB9\u8DDD",
  "callout.titleTopDesc": "\u6807\u9898\u680F\u9876\u90E8\u5185\u8FB9\u8DDD\u3002",
  "callout.titleBottom": "\u6807\u9898\u4E0B\u5185\u8FB9\u8DDD",
  "callout.titleBottomDesc": "\u6807\u9898\u680F\u5E95\u90E8\u5185\u8FB9\u8DDD\uFF1B\u4EC5\u6807\u9898\u3001\u6298\u53E0\u6216\u540E\u63A5\u6807\u9898\u65F6\u4F1A\u81EA\u52A8\u6291\u5236\u51B2\u7A81\u7A7A\u767D\u3002",
  "callout.titleLeft": "\u6807\u9898\u5DE6\u5185\u8FB9\u8DDD",
  "callout.titleLeftDesc": "\u6807\u9898\u680F\u5DE6\u4FA7\u5185\u8FB9\u8DDD\u3002",
  "callout.titleRight": "\u6807\u9898\u53F3\u5185\u8FB9\u8DDD",
  "callout.titleRightDesc": "\u6807\u9898\u680F\u53F3\u4FA7\u5185\u8FB9\u8DDD\u3002",
  "callout.specialTitle": "\u7279\u6B8A\u72B6\u6001\u6807\u9898\u680F\u5185\u8FB9\u8DDD",
  "callout.specialTitleDesc": "\u4EC5\u6807\u9898\u72B6\u6001\u6216\u6298\u53E0\u72B6\u6001\u4E0B\u7684\u4E13\u5C5E\u5185\u8FB9\u8DDD\u63A7\u5236\u3002",
  "callout.titleOnlyTop": "\u4EC5\u6807\u9898\u65F6\u4E0A\u5185\u8FB9\u8DDD",
  "callout.titleOnlyTopDesc": "Callout \u53EA\u6709\u6807\u9898\u65F6\u7684\u9876\u90E8\u5185\u8FB9\u8DDD\u3002",
  "callout.titleOnlyBottom": "\u4EC5\u6807\u9898\u65F6\u4E0B\u5185\u8FB9\u8DDD",
  "callout.titleOnlyBottomDesc": "Callout \u53EA\u6709\u6807\u9898\u65F6\u7684\u5E95\u90E8\u5185\u8FB9\u8DDD\uFF1B\u72EC\u7ACB\u4E8E\u6709\u5185\u5BB9 Callout \u7684\u5361\u7247\u4E0B\u5185\u8FB9\u8DDD\u3002",
  "callout.collapsedTop": "\u6298\u53E0\u72B6\u6001\u4E0A\u5185\u8FB9\u8DDD",
  "callout.collapsedTopDesc": "\u6298\u53E0 Callout \u7684\u9876\u90E8\u5185\u8FB9\u8DDD\u3002",
  "callout.collapsedBottom": "\u6298\u53E0\u72B6\u6001\u4E0B\u5185\u8FB9\u8DDD",
  "callout.collapsedBottomDesc": "\u6298\u53E0 Callout \u7684\u5E95\u90E8\u5185\u8FB9\u8DDD\u3002",
  "context.bodyGroup": "\u5185\u90E8\u6B63\u6587\u4E0E\u5217\u8868",
  "callout.bodyDesc": "Callout \u5185\u90E8\u6BB5\u843D\u53CA\u5217\u8868\u7684\u72EC\u7ACB\u95F4\u8DDD\uFF1B\u5217\u8868\u5206\u300C\u6761\u76EE\u300D\u4E0E\u300C\u6574\u4F53\u300D\u4E24\u5C42\u3002",
  "context.lineHeight": "\u5185\u90E8\u6B63\u6587\u884C\u9AD8",
  "callout.lineHeightDesc": "Callout \u6B63\u6587\u884C\u9AD8\uFF0C\u72EC\u7ACB\u4E8E\u666E\u901A\u6B63\u6587\u3002",
  "context.paragraphSpacing": "\u5185\u90E8\u6BB5\u843D\u95F4\u8DDD",
  "callout.paragraphSpacingDesc": "Callout \u6BB5\u843D\u95F4\u8DDD\u3002",
  "callout.listItemTopDesc": "Callout \u5217\u8868\u4E2D\uFF0C\u6BCF\u4E2A\u6761\u76EE\u4E0E\u4E0A\u4E00\u4E2A\u6761\u76EE\u7684\u95F4\u8DDD\u3002",
  "callout.listItemBottomDesc": "Callout \u5217\u8868\u4E2D\uFF0C\u6BCF\u4E2A\u6761\u76EE\u4E0E\u4E0B\u4E00\u4E2A\u6761\u76EE\u7684\u95F4\u8DDD\u3002",
  "callout.listBlockTopDesc": "Callout \u5217\u8868\u9996\u9879\u4E0E\u524D\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "callout.listBlockBottomDesc": "Callout \u5217\u8868\u672B\u9879\u4E0E\u540E\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "callout.lastList": "\u672B\u5C3E\u5217\u8868\u6574\u4F53\u4E0B\u95F4\u8DDD",
  "callout.lastListDesc": "\u5217\u8868\u662F Callout \u6700\u540E\u4E00\u4E2A\u5143\u7D20\u65F6\uFF0C\u8986\u76D6\u300C\u5217\u8868\u6574\u4F53\u4E0B\u95F4\u8DDD\u300D\u3002",
  "callout.image": "Callout \u5185\u90E8\u56FE\u7247",
  "callout.imageDesc": "Callout \u5185\u90E8\u56FE\u7247\u7684\u5C3A\u5BF8\u548C\u5916\u89C2\u8BBE\u7F6E\u3002",
  "callout.table": "Callout \u5185\u90E8\u8868\u683C",
  "callout.tableDesc": "Callout \u5185\u90E8\u8868\u683C\u7684\u5185\u8FB9\u8DDD\u3001\u8FB9\u6846\u548C\u95F4\u8DDD\u3002",
  "blockquote.bodyDesc": "\u5F15\u7528\u5757\u5185\u90E8\u6BB5\u843D\u53CA\u5217\u8868\u7684\u72EC\u7ACB\u6392\u7248\u4E0E\u95F4\u8DDD\uFF1B\u5217\u8868\u5206\u300C\u6761\u76EE\u300D\u4E0E\u300C\u6574\u4F53\u300D\u4E24\u5C42\u3002",
  "blockquote.lineHeightDesc": "\u5F15\u7528\u5757\u6B63\u6587\u884C\u9AD8\uFF0C\u72EC\u7ACB\u4E8E\u666E\u901A\u6B63\u6587\u3002",
  "blockquote.paragraphSpacingDesc": "\u5F15\u7528\u5757\u6BB5\u843D\u95F4\u8DDD\u3002",
  "blockquote.listItemTopDesc": "\u5F15\u7528\u5757\u5217\u8868\u4E2D\uFF0C\u6BCF\u4E2A\u6761\u76EE\u4E0E\u4E0A\u4E00\u4E2A\u6761\u76EE\u7684\u95F4\u8DDD\u3002",
  "blockquote.listItemBottomDesc": "\u5F15\u7528\u5757\u5217\u8868\u4E2D\uFF0C\u6BCF\u4E2A\u6761\u76EE\u4E0E\u4E0B\u4E00\u4E2A\u6761\u76EE\u7684\u95F4\u8DDD\u3002",
  "blockquote.listBlockTopDesc": "\u5F15\u7528\u5757\u5217\u8868\u9996\u9879\u4E0E\u524D\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "blockquote.listBlockBottomDesc": "\u5F15\u7528\u5757\u5217\u8868\u672B\u9879\u4E0E\u540E\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "blockquote.table": "\u5F15\u7528\u5757\u5185\u90E8\u8868\u683C",
  "blockquote.tableDesc": "\u5F15\u7528\u5757\u5185\u90E8\u8868\u683C\u7684\u5185\u8FB9\u8DDD\u3001\u8FB9\u6846\u548C\u95F4\u8DDD\u3002",
  "context.headings": "{context} \u5185\u90E8\u5404\u7EA7\u6807\u9898 (H1\u2013H6)",
  "context.headingsDesc": "\u5207\u6362\u4E0B\u65B9 H1\u2013H6 \u6807\u7B7E\u9875\uFF0C\u5FAE\u8C03 {context} \u5185\u90E8\u5404\u7EA7\u6807\u9898\u7684\u884C\u9AD8\u4E0E\u95F4\u8DDD\u3002",
  "context.headingLineHeightDesc": "\u5185\u90E8\u6807\u9898\u884C\u9AD8\u3002",
  "context.headingTopDesc": "\u5185\u90E8\u6807\u9898\u9876\u90E8\u95F4\u8DDD\u3002",
  "context.headingBottomDesc": "\u5185\u90E8\u6807\u9898\u5E95\u90E8\u95F4\u8DDD\u3002",
  "image.group": "\u6B63\u6587\u56FE\u7247\u5C3A\u5BF8\u4E0E\u5916\u89C2",
  "image.groupDesc": "\u666E\u901A\u6B63\u6587\u56FE\u7247\u7684\u5C3A\u5BF8\u3001\u5706\u89D2\u548C\u8FB9\u6846\u8BBE\u7F6E\u3002",
  "image.marginTop": "\u56FE\u7247\u4E0A\u95F4\u8DDD",
  "image.marginBottom": "\u56FE\u7247\u4E0B\u95F4\u8DDD",
  "image.marginTopEditDesc": "\u56FE\u7247\u4E0A\u65B9\u7684\u7559\u767D\u3002\u6E90\u7801\u4E2D\u7684\u5B9E\u9645\u7A7A\u884C\u4ECD\u7531\u300C\u6B63\u6587 \u2192 \u7A7A\u884C\u9AD8\u5EA6\u300D\u63A7\u5236\u3002",
  "image.marginBottomEditDesc": "\u56FE\u7247\u4E0B\u65B9\u7684\u7559\u767D\u3002\u6E90\u7801\u4E2D\u7684\u5B9E\u9645\u7A7A\u884C\u4ECD\u7531\u300C\u6B63\u6587 \u2192 \u7A7A\u884C\u9AD8\u5EA6\u300D\u63A7\u5236\u3002",
  "image.marginTopReadDesc": "\u6B63\u6587\u56FE\u7247\u6240\u5728\u6BB5\u843D\u7684\u4E0A\u8FB9\u8DDD\uFF0C\u66FF\u4EE3\u8BE5\u6BB5\u843D\u539F\u6709\u7684\u4E0A\u8FB9\u8DDD\u3002",
  "image.marginBottomReadDesc": "\u6B63\u6587\u56FE\u7247\u6240\u5728\u6BB5\u843D\u7684\u4E0B\u8FB9\u8DDD\uFF0C\u66FF\u4EE3\u8BE5\u6BB5\u843D\u539F\u6709\u7684\u4E0B\u8FB9\u8DDD\u3002",
  "image.maxWidth": "\u6700\u5927\u5BBD\u5EA6",
  "image.maxWidthDesc": "\u56FE\u7247\u76F8\u5BF9\u6240\u5728\u5185\u5BB9\u533A\u57DF\u7684\u6700\u5927\u5BBD\u5EA6\u3002",
  "image.radius": "\u56FE\u7247\u5706\u89D2",
  "image.radiusDesc": "\u56FE\u7247\u5706\u89D2\u534A\u5F84\u3002",
  "image.border": "\u56FE\u7247\u8FB9\u6846",
  "image.borderDesc": "\u56FE\u7247\u8FB9\u6846\u5BBD\u5EA6\u3002",
  "mermaid.group": "\u56FE\u8868\u81EA\u9002\u5E94\u4E0E\u5BBD\u5EA6\u89C4\u5219",
  "mermaid.groupDesc": "\u6309 SVG \u539F\u59CB viewBox \u5BBD\u9AD8\u6BD4\u533A\u5206\u7EB5\u5411\u56FE\u548C\u666E\u901A/\u6A2A\u5411\u56FE\u3002",
  "mermaid.portraitWidth": "\u7EB5\u5411\u56FE\u6700\u5927\u5BBD\u5EA6",
  "mermaid.portraitWidthDesc": "\u7EB5\u5411\u56FE\u6309\u539F\u59CB\u5C3A\u5BF8\u5C45\u4E2D\u663E\u793A\uFF0C\u4E0D\u4E3B\u52A8\u653E\u5927\uFF1B\u8D85\u8FC7\u6B64\u6B63\u6587\u5BBD\u5EA6\u6BD4\u4F8B\u65F6\u624D\u7B49\u6BD4\u7F29\u5C0F\u3002",
  "mermaid.portraitRatio": "\u7EB5\u5411\u5224\u5B9A\u5BBD\u9AD8\u6BD4",
  "mermaid.portraitRatioDesc": "SVG \u539F\u59CB\u5BBD\u5EA6\u9664\u4EE5\u9AD8\u5EA6\uFF1B\u5C0F\u4E8E\u6216\u7B49\u4E8E\u8BE5\u503C\u65F6\u89C6\u4E3A\u7EB5\u5411\u56FE\u3002",
  "mermaid.landscapeWidth": "\u6A2A\u5411\u56FE\u6700\u5C0F\u5BBD\u5EA6",
  "mermaid.landscapeWidthDesc": "\u666E\u901A\u6216\u6A2A\u5411 Mermaid \u7684\u6700\u5C0F\u5BBD\u5EA6\uFF1B\u7A7A\u95F4\u4E0D\u8DB3\u65F6\u5141\u8BB8\u6A2A\u5411\u6EDA\u52A8\u3002",
  "table.group": "\u6B63\u6587\u8868\u683C\u5916\u89C2\u4E0E\u95F4\u8DDD",
  "table.groupDesc": "\u6B63\u6587\u8868\u683C\u7684\u5355\u5143\u683C\u5185\u8FB9\u8DDD\u3001\u5185\u5916\u90E8\u8FB9\u6846\u3001\u5706\u89D2\u548C\u4E0A\u4E0B\u95F4\u8DDD\u3002",
  "table.cellPadding": "\u5355\u5143\u683C\u5185\u8FB9\u8DDD",
  "table.cellPaddingDesc": "\u8868\u683C\u5355\u5143\u683C\u5185\u8FB9\u8DDD\u3002",
  "table.innerBorder": "\u5185\u6846\u7EBF\u5BBD\u5EA6",
  "table.innerBorderDesc": "\u8868\u683C\u5185\u90E8\u8FB9\u6846\u5BBD\u5EA6\u3002",
  "table.outerBorder": "\u5916\u8FB9\u6846\u5BBD\u5EA6",
  "table.outerBorderDesc": "\u8868\u683C\u5916\u8FB9\u6846\u5BBD\u5EA6\u3002",
  "table.radius": "\u8868\u683C\u5706\u89D2",
  "table.radiusDesc": "\u8868\u683C\u6574\u4F53\u5706\u89D2\u3002",
  "table.top": "\u8868\u683C\u4E0A\u95F4\u8DDD",
  "table.topDesc": "\u8868\u683C\u4E0E\u524D\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "table.bottom": "\u8868\u683C\u4E0B\u95F4\u8DDD",
  "table.bottomDesc": "\u8868\u683C\u4E0E\u540E\u65B9\u5185\u5BB9\u7684\u8DDD\u79BB\u3002",
  "code.group": "\u4EE3\u7801\u5757\u6392\u7248\u4E0E\u95F4\u8DDD",
  "code.groupDesc": "\u4EE3\u7801\u5757\u5185\u90E8\u884C\u9AD8\u53CA\u5728\u4E0D\u540C\u6A21\u5F0F\u4E0B\u7684\u8FB9\u8DDD\u3002",
  "code.lineHeight": "\u4EE3\u7801\u884C\u9AD8",
  "code.lineHeightDesc": "\u4EE3\u7801\u5757\u5185\u90E8\u884C\u9AD8\u3002",
  "code.emptyLine": "\u5185\u90E8\u7A7A\u884C\u95F4\u8DDD",
  "code.emptyLineDesc": "\u7F16\u8F91\u6A21\u5F0F\u4EE3\u7801\u5757\u5185\u90E8\u7A7A\u884C\u7684\u95F4\u8DDD\u3002",
  "code.top": "\u4EE3\u7801\u5757\u4E0A\u95F4\u8DDD",
  "code.topDesc": "\u9605\u8BFB\u6A21\u5F0F\u4EE3\u7801\u5757\u9876\u90E8\u95F4\u8DDD\u3002",
  "code.bottom": "\u4EE3\u7801\u5757\u4E0B\u95F4\u8DDD",
  "code.bottomDesc": "\u9605\u8BFB\u6A21\u5F0F\u4EE3\u7801\u5757\u5E95\u90E8\u95F4\u8DDD\u3002",
  "context.body": "\u6B63\u6587",
  "context.quote": "Quote (\u5F15\u7528\u5757)",
  "gap.group": "{context} \u5185\u6807\u9898\u540E\u9996\u5143\u7D20\u95F4\u8DDD",
  "gap.groupDesc": "{context} \u5185\u6807\u9898\u540E\u63A5\u4E0D\u540C\u7C7B\u578B\u9996\u5143\u7D20\u65F6\u7684\u9876\u90E8\u8865\u507F\u95F4\u8DDD\u3002",
  "gap.emptyLine": "\u6807\u9898\u540E\u7A7A\u884C\u9AD8\u5EA6",
  "gap.emptyLineDesc": "\u6807\u9898\u3001\u7A7A\u884C\u3001\u975E\u6807\u9898\u5143\u7D20\u7EC4\u5408\u4E2D\u7684\u7A7A\u884C\u9AD8\u5EA6\u3002",
  "gap.paragraph": "\u7D27\u90BB\u6B63\u6587\u95F4\u8DDD",
  "gap.paragraphDesc": "\u6B63\u6587\u6807\u9898\u540E\u6CA1\u6709\u7A7A\u884C\u4E14\u7D27\u90BB\u6B63\u6587\u65F6\u7684\u9876\u90E8\u8865\u507F\u3002",
  "gap.list": "\u7D27\u90BB\u5217\u8868\u95F4\u8DDD",
  "gap.listDesc": "\u6B63\u6587\u6807\u9898\u540E\u7D27\u90BB\u5217\u8868\u65F6\u7684\u9876\u90E8\u8865\u507F\u3002",
  "gap.quote": "\u7D27\u90BB Quote \u95F4\u8DDD",
  "gap.quoteDesc": "\u6B63\u6587\u6807\u9898\u540E\u7D27\u90BB Quote \u65F6\u7684\u9876\u90E8\u8865\u507F\u3002",
  "gap.code": "\u7D27\u90BB\u4EE3\u7801\u5757\u95F4\u8DDD",
  "gap.codeDesc": "\u6B63\u6587\u6807\u9898\u540E\u7D27\u90BB\u4EE3\u7801\u5757\u65F6\u7684\u9876\u90E8\u8865\u507F\u3002",
  "gap.table": "\u7D27\u90BB\u8868\u683C\u95F4\u8DDD",
  "gap.tableDesc": "\u6B63\u6587\u6807\u9898\u540E\u7D27\u90BB\u8868\u683C\u65F6\u7684\u9876\u90E8\u8865\u507F\u3002",
  "gap.image": "\u7D27\u90BB\u56FE\u7247\u95F4\u8DDD",
  "gap.imageDesc": "\u6B63\u6587\u6807\u9898\u540E\u7D27\u90BB\u56FE\u7247\u65F6\u7684\u9876\u90E8\u8865\u507F\u3002",
  "gap.callout": "\u7D27\u90BB Callout \u95F4\u8DDD",
  "gap.calloutDesc": "\u6B63\u6587\u6807\u9898\u540E\u7D27\u90BB Callout \u65F6\u7684\u9876\u90E8\u8865\u507F\u3002",
  "gap.contextEmptyLine": "{context} \u5185\u6807\u9898\u540E\u7A7A\u884C\u7684\u9AD8\u5EA6\u3002",
  "gap.contextParagraph": "{context} \u5185\u6807\u9898\u540E\u7D27\u90BB\u6B63\u6587\u65F6\u7684\u95F4\u8DDD\u3002",
  "gap.contextList": "{context} \u5185\u6807\u9898\u540E\u7D27\u90BB\u5217\u8868\u65F6\u7684\u95F4\u8DDD\u3002",
  "gap.contextQuote": "{context} \u5185\u6807\u9898\u540E\u7D27\u90BB Quote \u65F6\u7684\u95F4\u8DDD\u3002",
  "gap.contextCode": "{context} \u5185\u6807\u9898\u540E\u7D27\u90BB\u4EE3\u7801\u5757\u65F6\u7684\u95F4\u8DDD\u3002",
  "gap.contextTable": "{context} \u5185\u6807\u9898\u540E\u7D27\u90BB\u8868\u683C\u65F6\u7684\u95F4\u8DDD\u3002",
  "gap.contextImage": "{context} \u5185\u6807\u9898\u540E\u7D27\u90BB\u56FE\u7247\u65F6\u7684\u95F4\u8DDD\u3002",
  "gap.contextCallout": "{context} \u5185\u6807\u9898\u540E\u7D27\u90BB Callout \u65F6\u7684\u95F4\u8DDD\u3002",
  "unit.ratio": "\u500D",
  "notice.exported": "Refined Layout\uFF1A\u914D\u7F6E\u5DF2\u5BFC\u51FA\u3002",
  "notice.imported": "Refined Layout\uFF1A\u914D\u7F6E\u5DF2\u5BFC\u5165\u3002",
  "notice.resetAll": "Refined Layout\uFF1A\u7F16\u8F91\u548C\u9605\u8BFB\u4E24\u5957\u914D\u7F6E\u5DF2\u6062\u590D\u9ED8\u8BA4\u503C\u3002",
  "notice.readFailed": "Refined Layout\uFF1A\u65E0\u6CD5\u8BFB\u53D6\u914D\u7F6E\u6587\u4EF6\u3002",
  "notice.importFailed": "Refined Layout\uFF1A\u5BFC\u5165\u5931\u8D25\uFF0C{detail}\u3002",
  "error.invalidJson": "\u6587\u4EF6\u4E0D\u662F\u6709\u6548\u7684 JSON",
  "error.invalidRoot": "\u914D\u7F6E\u6587\u4EF6\u6839\u8282\u70B9\u5FC5\u987B\u662F\u5BF9\u8C61",
  "error.unsupportedVersion": "\u914D\u7F6E\u6587\u4EF6\u7684 schemaVersion \u5FC5\u987B\u662F 1\u30012 \u6216 3",
  "error.invalidFile": "\u6587\u4EF6\u683C\u5F0F\u65E0\u6548"
};

// src/i18n/zh-TW.ts
var translations2 = {
  "actions.back": "\u8FD4\u56DE",
  "language.name": "\u4ECB\u9762\u8A9E\u8A00",
  "language.description": "\u9078\u64C7\u5916\u639B\u7A0B\u5F0F\u7684\u986F\u793A\u8A9E\u8A00\uFF0C\u5207\u63DB\u5F8C\u7ACB\u5373\u751F\u6548\u3002",
  "language.auto": "\u8DDF\u96A8 Obsidian",
  "mode.edit": "\u7DE8\u8F2F\u6A21\u5F0F",
  "mode.read": "\u95B1\u8B80\u6A21\u5F0F",
  "tabs.body": "\u5167\u6587\u8207\u6E05\u55AE",
  "tabs.bodyDesc": "\u4E00\u822C\u5167\u6587\u3001\u7A7A\u767D\u884C\u8207\u6E05\u55AE\u9593\u8DDD\u8A2D\u5B9A\u3002",
  "tabs.headings": "\u5167\u6587\u6A19\u984C H1\u2013H6",
  "tabs.headingsDesc": "\u5167\u6587\u5404\u5C64\u7D1A\u6A19\u984C\u7684\u884C\u9AD8\u8207\u4E0A\u4E0B\u908A\u8DDD\u3002",
  "tabs.headingDecoration": "\u6A19\u984C\u507D\u5143\u7D20",
  "tabs.headingDecorationDesc": "\u4F48\u666F\u4E3B\u984C\u6A19\u984C\u88DD\u98FE\u7DDA\u7684\u4F4D\u7F6E\u3001\u5C3A\u5BF8\u8207\u504F\u79FB\u3002",
  "tabs.calloutDesc": "Callout \u5361\u7247\u5916\u89C0\u3001\u6A19\u984C\u5217\u3001\u5167\u6587\u8207\u5167\u90E8\u5143\u7D20\u6392\u7248\u3002",
  "context.blockquote": "\u5F15\u7528\u5340\u584A",
  "tabs.blockquoteDesc": "\u5F15\u7528\u5340\u584A\u5167\u7684\u5167\u6587\u3001\u8868\u683C\u8207\u5404\u5C64\u7D1A\u6A19\u984C\u6392\u7248\u3002",
  "tabs.image": "\u5716\u7247",
  "tabs.imageDesc": "\u5167\u6587\u5716\u7247\u7684\u5C3A\u5BF8\u3001\u5713\u89D2\u8207\u6846\u7DDA\u5916\u89C0\u3002",
  "tabs.mermaid": "Mermaid \u5716\u8868",
  "tabs.mermaidDesc": "\u76F4\u5411\u8207\u6A6B\u5411 Mermaid \u5716\u8868\u7684\u81EA\u9069\u61C9\u5BEC\u5EA6\u898F\u5247\u3002",
  "tabs.table": "\u5167\u6587\u8868\u683C",
  "tabs.tableDesc": "\u5167\u6587\u8868\u683C\u7684\u5132\u5B58\u683C\u5167\u8DDD\u3001\u6846\u7DDA\u3001\u5713\u89D2\u8207\u5916\u8DDD\u3002",
  "tabs.codeBlock": "\u7A0B\u5F0F\u78BC\u5340\u584A",
  "tabs.codeBlockDesc": "\u7A0B\u5F0F\u78BC\u5340\u584A\u884C\u9AD8\u8207\u5404\u6A21\u5F0F\u7684\u4E0A\u4E0B\u908A\u8DDD\u8A2D\u5B9A\u3002",
  "tabs.headingGap": "\u6A19\u984C\u5F8C\u9996\u500B\u5143\u7D20",
  "tabs.headingGapDesc": "\u6A19\u984C\u5F8C\u63A5\u5167\u6587\u3001\u6E05\u55AE\u3001\u7A0B\u5F0F\u78BC\u5340\u584A\u7B49\u5143\u7D20\u6642\u7684\u9593\u8DDD\u88DC\u511F\u3002",
  "actions.export": "\u532F\u51FA\u8A2D\u5B9A",
  "actions.exportDesc": "\u5C07\u76EE\u524D\u7DE8\u8F2F\u8207\u95B1\u8B80\u5169\u5957\u8A2D\u5B9A\u532F\u51FA\u70BA JSON \u6A94\u6848\u3002",
  "actions.import": "\u532F\u5165\u8A2D\u5B9A",
  "actions.importDesc": "\u5F9E JSON \u6A94\u6848\u532F\u5165\u8A2D\u5B9A\uFF0C\u6210\u529F\u5F8C\u7ACB\u5373\u53D6\u4EE3\u76EE\u524D\u8A2D\u5B9A\u3002",
  "actions.resetAll": "\u5168\u90E8\u91CD\u8A2D",
  "actions.resetAllDesc": "\u9084\u539F\u7DE8\u8F2F\u8207\u95B1\u8B80\u5169\u5957\u8A2D\u5B9A\u53CA\u6240\u6709\u6A21\u7D44\u958B\u95DC\u7684\u9810\u8A2D\u503C\u3002",
  "actions.cancel": "\u53D6\u6D88",
  "resetAll.title": "\u91CD\u8A2D\u6240\u6709\u8A2D\u5B9A\uFF1F",
  "resetAll.description": "\u9019\u6703\u5C07\u7DE8\u8F2F\u8207\u95B1\u8B80\u5169\u5957\u8A2D\u5B9A\u53CA\u6240\u6709\u6A21\u7D44\u958B\u95DC\u9084\u539F\u70BA\u9810\u8A2D\u503C\uFF0C\u53D6\u4EE3\u4F60\u76EE\u524D\u7684\u6392\u7248\u8ABF\u6574\u3002",
  "aria.mode": "\u8A2D\u5B9A\u6A21\u5F0F",
  "aria.sections": "\u8A2D\u5B9A\u5206\u5340",
  "actions.resetSection": "\u9084\u539F\u6B64\u5340\u9810\u8A2D\u503C",
  "aria.headingLevel": "\u6A19\u984C\u5C64\u7D1A",
  "body.group": "\u5167\u6587\u6392\u7248",
  "body.groupDesc": "\u4E00\u822C\u5167\u6587\u884C\u9AD8\u3001\u6BB5\u843D\u9593\u8DDD\u8207\u7A7A\u767D\u884C\u9AD8\u5EA6\u8A2D\u5B9A\u3002",
  "body.lineHeight": "\u5167\u6587\u884C\u9AD8",
  "body.lineHeightDesc": "\u4E00\u822C\u5167\u6587\u6587\u5B57\u7684\u884C\u9AD8\u3002",
  "body.emptyLine": "\u7A7A\u767D\u884C\u9AD8\u5EA6",
  "body.emptyLineDesc": "CodeMirror \u539F\u59CB\u78BC\u6AA2\u8996\u4E2D\u7A7A\u767D\u884C\u7684\u9AD8\u5EA6\u3002",
  "body.paragraphSpacing": "\u6BB5\u843D\u9593\u8DDD",
  "body.paragraphSpacingDesc": "\u95B1\u8B80\u6AA2\u8996\u4E2D\u4E00\u822C\u6BB5\u843D\u4E4B\u9593\u7684\u5782\u76F4\u9593\u8DDD\u3002",
  "list.group": "\u6E05\u55AE\u9593\u8DDD",
  "list.groupDesc": "\u300C\u9805\u76EE\u300D\u63A7\u5236\u9805\u76EE\u4E4B\u9593\u7684\u9593\u8DDD\uFF1B\u300C\u6574\u9AD4\u300D\u63A7\u5236\u6E05\u55AE\u9996\u9805\u4E0A\u65B9\u8207\u672B\u9805\u4E0B\u65B9\uFF0C\u4E5F\u5C31\u662F\u6E05\u55AE\u8207\u524D\u5F8C\u5167\u5BB9\u7684\u8DDD\u96E2\u3002\u9996\u5C3E\u5169\u7AEF\u7531\u300C\u6574\u9AD4\u300D\u6C7A\u5B9A\uFF0C\u4E0D\u8207\u300C\u9805\u76EE\u300D\u758A\u52A0\u3002",
  "list.itemTop": "\u6E05\u55AE\u9805\u76EE\u4E0A\u9593\u8DDD",
  "list.itemBottom": "\u6E05\u55AE\u9805\u76EE\u4E0B\u9593\u8DDD",
  "list.blockTop": "\u6E05\u55AE\u6574\u9AD4\u4E0A\u9593\u8DDD",
  "list.blockBottom": "\u6E05\u55AE\u6574\u9AD4\u4E0B\u9593\u8DDD",
  "body.listItemTopDesc": "\u5167\u6587\u6E05\u55AE\u4E2D\uFF0C\u5404\u9805\u76EE\u8207\u524D\u4E00\u9805\u7684\u9593\u8DDD\u3002",
  "body.listItemBottomDesc": "\u5167\u6587\u6E05\u55AE\u4E2D\uFF0C\u5404\u9805\u76EE\u8207\u4E0B\u4E00\u9805\u7684\u9593\u8DDD\u3002",
  "body.listBlockTopDesc": "\u5167\u6587\u6E05\u55AE\u9996\u9805\u8207\u524D\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "body.listBlockBottomDesc": "\u5167\u6587\u6E05\u55AE\u672B\u9805\u8207\u5F8C\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "headings.firstLine": "\u6587\u4EF6\u9996\u884C",
  "headings.firstLineDesc": "\u50C5\u5728\u6587\u4EF6\u7B2C\u4E00\u884C\u5C31\u662F\u6A19\u984C\u6642\u5957\u7528\u7684\u88DC\u511F\u3002",
  "headings.firstTop": "\u9996\u884C\u6A19\u984C\u9802\u90E8\u88DC\u511F",
  "headings.firstTopDesc": "\u6587\u4EF6\u7B2C\u4E00\u884C\u662F\u6A19\u984C\u6642\u7684\u9802\u90E8\u5FAE\u8ABF\u88DC\u511F\u3002",
  "headings.group": "\u5404\u5C64\u7D1A\u6A19\u984C\u6392\u7248\u8207\u9593\u8DDD",
  "headings.groupDesc": "\u5207\u63DB\u4E0B\u65B9 H1\u2013H6 \u5206\u9801\uFF0C\u5FAE\u8ABF\u5404\u5C64\u7D1A\u6A19\u984C\u7684\u884C\u9AD8\u8207\u4E0A\u4E0B\u5916\u8DDD\u3002",
  "headings.lineHeight": "{level} \u884C\u9AD8",
  "headings.top": "{level} \u4E0A\u9593\u8DDD",
  "headings.bottom": "{level} \u4E0B\u9593\u8DDD",
  "headings.lineHeightDesc": "\u6A19\u984C\u6587\u5B57\u884C\u9AD8\u3002",
  "headings.topDesc": "\u6A19\u984C\u9802\u90E8\u9593\u8DDD\u3002",
  "headings.bottomDesc": "\u6A19\u984C\u5E95\u90E8\u9593\u8DDD\u3002",
  "decoration.group": "\u4F4D\u7F6E\u8207\u5916\u89C0",
  "decoration.groupDesc": "\u8ABF\u6574\u4F48\u666F\u4E3B\u984C\u65E2\u6709\u7684\u6A19\u984C ::before \u507D\u5143\u7D20\u88DD\u98FE\u7DDA\uFF1B\u82E5\u4E3B\u984C\u672A\u63D0\u4F9B\u6A19\u984C\u507D\u5143\u7D20\uFF0C\u4E0D\u6703\u65B0\u589E\u88DD\u98FE\u3002",
  "decoration.left": "\u6C34\u5E73\u504F\u79FB",
  "decoration.leftDesc": "\u507D\u5143\u7D20\u76F8\u5C0D\u65BC\u6A19\u984C\u6587\u5B57\u7684\u6C34\u5E73\u504F\u79FB\u4F4D\u7F6E\u3002",
  "decoration.width": "\u5BEC\u5EA6",
  "decoration.widthDesc": "\u507D\u5143\u7D20\u88DD\u98FE\u7DDA\u7684\u5BEC\u5EA6\u3002",
  "decoration.radius": "\u5713\u89D2",
  "decoration.radiusDesc": "\u507D\u5143\u7D20\u88DD\u98FE\u7DDA\u7684\u5713\u89D2\u534A\u5F91\u3002",
  "decoration.right": "\u53F3\u9593\u8DDD",
  "decoration.rightDesc": "\u507D\u5143\u7D20\u53F3\u5074\u8207\u6A19\u984C\u6587\u5B57\u7684\u8DDD\u96E2\u3002",
  "decoration.firstOffset": "\u6587\u4EF6\u9996\u6A19\u984C\u984D\u5916\u88DC\u511F",
  "decoration.firstOffsetDesc": "\u50C5\u5728\u6587\u4EF6\u7B2C\u4E00\u884C\u5C31\u662F\u6A19\u984C\u6642\u758A\u52A0\uFF1B\u6B63\u503C\u5411\u4E0B\uFF0C\u8CA0\u503C\u5411\u4E0A\u3002",
  "decoration.levels": "\u5404\u5C64\u7D1A\u6A19\u984C\u88DD\u98FE\u9AD8\u5EA6\u8207\u5782\u76F4\u88DC\u511F",
  "decoration.levelsDesc": "\u5207\u63DB\u4E0B\u65B9 H1\u2013H6 \u5206\u9801\uFF0C\u5FAE\u8ABF\u5404\u5C64\u7D1A\u6A19\u984C\u88DD\u98FE\u7DDA\u7684\u9AD8\u5EA6\u8207\u5782\u76F4\u7F6E\u4E2D\u88DC\u511F\u3002",
  "decoration.height": "{level} \u9AD8\u5EA6",
  "decoration.offset": "{level} \u5782\u76F4\u88DC\u511F",
  "decoration.heightDesc": "\u507D\u5143\u7D20\u9AD8\u5EA6\u3002",
  "decoration.offsetDesc": "\u4EE5\u7B2C\u4E00\u884C\u5782\u76F4\u7F6E\u4E2D\u70BA\u57FA\u6E96\u5FAE\u8ABF\uFF1B\u6B63\u503C\u5411\u4E0B\uFF0C\u8CA0\u503C\u5411\u4E0A\u3002",
  "callout.appearance": "\u5361\u7247\u5916\u89C0\u8207\u5916\u8DDD",
  "callout.appearanceDesc": "Callout \u5361\u7247\u7684\u5713\u89D2\u53CA\u8207\u524D\u5F8C\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "callout.radius": "\u5361\u7247\u5713\u89D2",
  "callout.radiusDesc": "Callout \u5361\u7247\u5713\u89D2\u534A\u5F91\u3002",
  "callout.marginTop": "\u5361\u7247\u4E0A\u5916\u8DDD",
  "callout.marginTopDesc": "Callout \u8207\u524D\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "callout.marginBottom": "\u5361\u7247\u4E0B\u5916\u8DDD",
  "callout.marginBottomDesc": "Callout \u8207\u5F8C\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "callout.padding": "\u5361\u7247\u5167\u8DDD",
  "callout.paddingDesc": "Callout \u5404\u908A\u7DE3\u8207\u5167\u90E8\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "callout.paddingTop": "\u5361\u7247\u4E0A\u5167\u8DDD",
  "callout.paddingTopDesc": "Callout \u5361\u7247\u9802\u90E8\u5167\u8DDD\u3002",
  "callout.paddingBottom": "\u5361\u7247\u4E0B\u5167\u8DDD",
  "callout.paddingBottomDesc": "Callout \u5361\u7247\u5E95\u90E8\u5167\u8DDD\u3002",
  "callout.paddingLeft": "\u5361\u7247\u5DE6\u5167\u8DDD",
  "callout.paddingLeftDesc": "Callout \u5361\u7247\u5DE6\u5074\u5167\u8DDD\u3002",
  "callout.paddingRight": "\u5361\u7247\u53F3\u5167\u8DDD",
  "callout.paddingRightDesc": "Callout \u5361\u7247\u53F3\u5074\u5167\u8DDD\u3002",
  "callout.title": "\u6A19\u984C\u5217\u6392\u7248\u8207\u4E00\u822C\u5167\u8DDD",
  "callout.titleDesc": "Callout \u6A19\u984C\u5217\u6587\u5B57\u8207\u6A19\u6E96\u5167\u8DDD\u3002",
  "callout.titleLineHeight": "\u6A19\u984C\u884C\u9AD8",
  "callout.titleLineHeightDesc": "\u6A19\u984C\u5217\u6587\u5B57\u884C\u9AD8\u3002",
  "callout.titleTop": "\u6A19\u984C\u4E0A\u5167\u8DDD",
  "callout.titleTopDesc": "\u6A19\u984C\u5217\u9802\u90E8\u5167\u8DDD\u3002",
  "callout.titleBottom": "\u6A19\u984C\u4E0B\u5167\u8DDD",
  "callout.titleBottomDesc": "\u6A19\u984C\u5217\u5E95\u90E8\u5167\u8DDD\uFF1B\u50C5\u6709\u6A19\u984C\u3001\u5DF2\u647A\u758A\u6216\u5F8C\u63A5\u6A19\u984C\u6642\uFF0C\u6703\u81EA\u52D5\u6291\u5236\u885D\u7A81\u7684\u7A7A\u767D\u3002",
  "callout.titleLeft": "\u6A19\u984C\u5DE6\u5167\u8DDD",
  "callout.titleLeftDesc": "\u6A19\u984C\u5217\u5DE6\u5074\u5167\u8DDD\u3002",
  "callout.titleRight": "\u6A19\u984C\u53F3\u5167\u8DDD",
  "callout.titleRightDesc": "\u6A19\u984C\u5217\u53F3\u5074\u5167\u8DDD\u3002",
  "callout.specialTitle": "\u7279\u6B8A\u72C0\u614B\u6A19\u984C\u5217\u5167\u8DDD",
  "callout.specialTitleDesc": "\u50C5\u6709\u6A19\u984C\u6216\u5DF2\u647A\u758A\u72C0\u614B\u7684\u5C08\u5C6C\u5167\u8DDD\u63A7\u5236\u3002",
  "callout.titleOnlyTop": "\u50C5\u6709\u6A19\u984C\u6642\u4E0A\u5167\u8DDD",
  "callout.titleOnlyTopDesc": "Callout \u50C5\u6709\u6A19\u984C\u6642\u7684\u9802\u90E8\u5167\u8DDD\u3002",
  "callout.titleOnlyBottom": "\u50C5\u6709\u6A19\u984C\u6642\u4E0B\u5167\u8DDD",
  "callout.titleOnlyBottomDesc": "Callout \u50C5\u6709\u6A19\u984C\u6642\u7684\u5E95\u90E8\u5167\u8DDD\uFF1B\u7368\u7ACB\u65BC\u6709\u5167\u5BB9 Callout \u7684\u5361\u7247\u4E0B\u5167\u8DDD\u3002",
  "callout.collapsedTop": "\u647A\u758A\u72C0\u614B\u4E0A\u5167\u8DDD",
  "callout.collapsedTopDesc": "\u5DF2\u647A\u758A Callout \u7684\u9802\u90E8\u5167\u8DDD\u3002",
  "callout.collapsedBottom": "\u647A\u758A\u72C0\u614B\u4E0B\u5167\u8DDD",
  "callout.collapsedBottomDesc": "\u5DF2\u647A\u758A Callout \u7684\u5E95\u90E8\u5167\u8DDD\u3002",
  "context.bodyGroup": "\u5167\u90E8\u5167\u6587\u8207\u6E05\u55AE",
  "callout.bodyDesc": "Callout \u5167\u90E8\u6BB5\u843D\u8207\u6E05\u55AE\u7684\u7368\u7ACB\u9593\u8DDD\uFF1B\u6E05\u55AE\u5206\u70BA\u300C\u9805\u76EE\u300D\u8207\u300C\u6574\u9AD4\u300D\u5169\u5C64\u3002",
  "context.lineHeight": "\u5167\u90E8\u5167\u6587\u884C\u9AD8",
  "callout.lineHeightDesc": "Callout \u5167\u6587\u884C\u9AD8\uFF0C\u7368\u7ACB\u65BC\u4E00\u822C\u5167\u6587\u3002",
  "context.paragraphSpacing": "\u5167\u90E8\u6BB5\u843D\u9593\u8DDD",
  "callout.paragraphSpacingDesc": "Callout \u6BB5\u843D\u9593\u8DDD\u3002",
  "callout.listItemTopDesc": "Callout \u6E05\u55AE\u4E2D\uFF0C\u5404\u9805\u76EE\u8207\u524D\u4E00\u9805\u7684\u9593\u8DDD\u3002",
  "callout.listItemBottomDesc": "Callout \u6E05\u55AE\u4E2D\uFF0C\u5404\u9805\u76EE\u8207\u4E0B\u4E00\u9805\u7684\u9593\u8DDD\u3002",
  "callout.listBlockTopDesc": "Callout \u6E05\u55AE\u9996\u9805\u8207\u524D\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "callout.listBlockBottomDesc": "Callout \u6E05\u55AE\u672B\u9805\u8207\u5F8C\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "callout.lastList": "\u672B\u5C3E\u6E05\u55AE\u6574\u9AD4\u4E0B\u9593\u8DDD",
  "callout.lastListDesc": "\u6E05\u55AE\u662F Callout \u6700\u5F8C\u4E00\u500B\u5143\u7D20\u6642\uFF0C\u8986\u5BEB\u300C\u6E05\u55AE\u6574\u9AD4\u4E0B\u9593\u8DDD\u300D\u3002",
  "callout.image": "Callout \u5167\u90E8\u5716\u7247",
  "callout.imageDesc": "Callout \u5167\u90E8\u5716\u7247\u7684\u5C3A\u5BF8\u8207\u5916\u89C0\u8A2D\u5B9A\u3002",
  "callout.table": "Callout \u5167\u90E8\u8868\u683C",
  "callout.tableDesc": "Callout \u5167\u90E8\u8868\u683C\u7684\u5167\u8DDD\u3001\u6846\u7DDA\u8207\u9593\u8DDD\u3002",
  "blockquote.bodyDesc": "\u5F15\u7528\u5340\u584A\u5167\u6BB5\u843D\u8207\u6E05\u55AE\u7684\u7368\u7ACB\u6392\u7248\u53CA\u9593\u8DDD\uFF1B\u6E05\u55AE\u5206\u70BA\u300C\u9805\u76EE\u300D\u8207\u300C\u6574\u9AD4\u300D\u5169\u5C64\u3002",
  "blockquote.lineHeightDesc": "\u5F15\u7528\u5340\u584A\u5167\u6587\u884C\u9AD8\uFF0C\u7368\u7ACB\u65BC\u4E00\u822C\u5167\u6587\u3002",
  "blockquote.paragraphSpacingDesc": "\u5F15\u7528\u5340\u584A\u6BB5\u843D\u9593\u8DDD\u3002",
  "blockquote.listItemTopDesc": "\u5F15\u7528\u5340\u584A\u6E05\u55AE\u4E2D\uFF0C\u5404\u9805\u76EE\u8207\u524D\u4E00\u9805\u7684\u9593\u8DDD\u3002",
  "blockquote.listItemBottomDesc": "\u5F15\u7528\u5340\u584A\u6E05\u55AE\u4E2D\uFF0C\u5404\u9805\u76EE\u8207\u4E0B\u4E00\u9805\u7684\u9593\u8DDD\u3002",
  "blockquote.listBlockTopDesc": "\u5F15\u7528\u5340\u584A\u6E05\u55AE\u9996\u9805\u8207\u524D\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "blockquote.listBlockBottomDesc": "\u5F15\u7528\u5340\u584A\u6E05\u55AE\u672B\u9805\u8207\u5F8C\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "blockquote.table": "\u5F15\u7528\u5340\u584A\u5167\u90E8\u8868\u683C",
  "blockquote.tableDesc": "\u5F15\u7528\u5340\u584A\u5167\u90E8\u8868\u683C\u7684\u5167\u8DDD\u3001\u6846\u7DDA\u8207\u9593\u8DDD\u3002",
  "context.headings": "{context} \u5167\u90E8\u5404\u5C64\u7D1A\u6A19\u984C (H1\u2013H6)",
  "context.headingsDesc": "\u5207\u63DB\u4E0B\u65B9 H1\u2013H6 \u5206\u9801\uFF0C\u5FAE\u8ABF{context}\u5167\u5404\u5C64\u7D1A\u6A19\u984C\u7684\u884C\u9AD8\u8207\u9593\u8DDD\u3002",
  "context.headingLineHeightDesc": "\u5167\u90E8\u6A19\u984C\u884C\u9AD8\u3002",
  "context.headingTopDesc": "\u5167\u90E8\u6A19\u984C\u9802\u90E8\u9593\u8DDD\u3002",
  "context.headingBottomDesc": "\u5167\u90E8\u6A19\u984C\u5E95\u90E8\u9593\u8DDD\u3002",
  "image.group": "\u5167\u6587\u5716\u7247\u5C3A\u5BF8\u8207\u5916\u89C0",
  "image.groupDesc": "\u4E00\u822C\u5167\u6587\u5716\u7247\u7684\u5C3A\u5BF8\u3001\u5713\u89D2\u8207\u6846\u7DDA\u8A2D\u5B9A\u3002",
  "image.marginTop": "\u5716\u7247\u4E0A\u9593\u8DDD",
  "image.marginBottom": "\u5716\u7247\u4E0B\u9593\u8DDD",
  "image.marginTopEditDesc": "\u5716\u7247\u4E0A\u65B9\u7684\u7559\u767D\u3002\u539F\u59CB\u78BC\u4E2D\u7684\u5BE6\u969B\u7A7A\u767D\u884C\u4ECD\u7531\u300C\u5167\u6587 \u2192 \u7A7A\u767D\u884C\u9AD8\u5EA6\u300D\u63A7\u5236\u3002",
  "image.marginBottomEditDesc": "\u5716\u7247\u4E0B\u65B9\u7684\u7559\u767D\u3002\u539F\u59CB\u78BC\u4E2D\u7684\u5BE6\u969B\u7A7A\u767D\u884C\u4ECD\u7531\u300C\u5167\u6587 \u2192 \u7A7A\u767D\u884C\u9AD8\u5EA6\u300D\u63A7\u5236\u3002",
  "image.marginTopReadDesc": "\u5167\u6587\u5716\u7247\u6240\u5728\u6BB5\u843D\u7684\u4E0A\u908A\u754C\uFF0C\u53D6\u4EE3\u8A72\u6BB5\u843D\u539F\u6709\u7684\u4E0A\u908A\u754C\u3002",
  "image.marginBottomReadDesc": "\u5167\u6587\u5716\u7247\u6240\u5728\u6BB5\u843D\u7684\u4E0B\u908A\u754C\uFF0C\u53D6\u4EE3\u8A72\u6BB5\u843D\u539F\u6709\u7684\u4E0B\u908A\u754C\u3002",
  "image.maxWidth": "\u6700\u5927\u5BEC\u5EA6",
  "image.maxWidthDesc": "\u5716\u7247\u76F8\u5C0D\u65BC\u6240\u5728\u5167\u5BB9\u5340\u57DF\u7684\u6700\u5927\u5BEC\u5EA6\u3002",
  "image.radius": "\u5716\u7247\u5713\u89D2",
  "image.radiusDesc": "\u5716\u7247\u5713\u89D2\u534A\u5F91\u3002",
  "image.border": "\u5716\u7247\u6846\u7DDA",
  "image.borderDesc": "\u5716\u7247\u6846\u7DDA\u5BEC\u5EA6\u3002",
  "mermaid.group": "\u5716\u8868\u81EA\u9069\u61C9\u8207\u5BEC\u5EA6\u898F\u5247",
  "mermaid.groupDesc": "\u4F9D SVG \u539F\u59CB viewBox \u7684\u5BEC\u9AD8\u6BD4\uFF0C\u5340\u5206\u76F4\u5411\u5716\u8207\u4E00\u822C\uFF0F\u6A6B\u5411\u5716\u3002",
  "mermaid.portraitWidth": "\u76F4\u5411\u5716\u6700\u5927\u5BEC\u5EA6",
  "mermaid.portraitWidthDesc": "\u76F4\u5411\u5716\u4EE5\u539F\u59CB\u5C3A\u5BF8\u7F6E\u4E2D\u986F\u793A\uFF0C\u4E0D\u4E3B\u52D5\u653E\u5927\uFF1B\u8D85\u904E\u6B64\u5167\u6587\u5BEC\u5EA6\u6BD4\u4F8B\u6642\u624D\u7B49\u6BD4\u4F8B\u7E2E\u5C0F\u3002",
  "mermaid.portraitRatio": "\u76F4\u5411\u5224\u5B9A\u5BEC\u9AD8\u6BD4",
  "mermaid.portraitRatioDesc": "SVG \u539F\u59CB\u5BEC\u5EA6\u9664\u4EE5\u9AD8\u5EA6\uFF1B\u5C0F\u65BC\u6216\u7B49\u65BC\u6B64\u503C\u6642\u8996\u70BA\u76F4\u5411\u5716\u3002",
  "mermaid.landscapeWidth": "\u6A6B\u5411\u5716\u6700\u5C0F\u5BEC\u5EA6",
  "mermaid.landscapeWidthDesc": "\u4E00\u822C\u6216\u6A6B\u5411 Mermaid \u5716\u8868\u7684\u6700\u5C0F\u5BEC\u5EA6\uFF1B\u7A7A\u9593\u4E0D\u8DB3\u6642\u5141\u8A31\u6C34\u5E73\u6372\u52D5\u3002",
  "table.group": "\u5167\u6587\u8868\u683C\u5916\u89C0\u8207\u9593\u8DDD",
  "table.groupDesc": "\u5167\u6587\u8868\u683C\u7684\u5132\u5B58\u683C\u5167\u8DDD\u3001\u5167\u5916\u6846\u7DDA\u3001\u5713\u89D2\u8207\u4E0A\u4E0B\u9593\u8DDD\u3002",
  "table.cellPadding": "\u5132\u5B58\u683C\u5167\u8DDD",
  "table.cellPaddingDesc": "\u8868\u683C\u5132\u5B58\u683C\u5167\u8DDD\u3002",
  "table.innerBorder": "\u5167\u6846\u7DDA\u5BEC\u5EA6",
  "table.innerBorderDesc": "\u8868\u683C\u5167\u90E8\u6846\u7DDA\u5BEC\u5EA6\u3002",
  "table.outerBorder": "\u5916\u6846\u7DDA\u5BEC\u5EA6",
  "table.outerBorderDesc": "\u8868\u683C\u5916\u6846\u7DDA\u5BEC\u5EA6\u3002",
  "table.radius": "\u8868\u683C\u5713\u89D2",
  "table.radiusDesc": "\u8868\u683C\u6574\u9AD4\u5713\u89D2\u3002",
  "table.top": "\u8868\u683C\u4E0A\u9593\u8DDD",
  "table.topDesc": "\u8868\u683C\u8207\u524D\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "table.bottom": "\u8868\u683C\u4E0B\u9593\u8DDD",
  "table.bottomDesc": "\u8868\u683C\u8207\u5F8C\u65B9\u5167\u5BB9\u7684\u8DDD\u96E2\u3002",
  "code.group": "\u7A0B\u5F0F\u78BC\u5340\u584A\u6392\u7248\u8207\u9593\u8DDD",
  "code.groupDesc": "\u7A0B\u5F0F\u78BC\u5340\u584A\u5167\u90E8\u884C\u9AD8\u8207\u5404\u6A21\u5F0F\u7684\u908A\u8DDD\u3002",
  "code.lineHeight": "\u7A0B\u5F0F\u78BC\u884C\u9AD8",
  "code.lineHeightDesc": "\u7A0B\u5F0F\u78BC\u5340\u584A\u5167\u90E8\u884C\u9AD8\u3002",
  "code.emptyLine": "\u5167\u90E8\u7A7A\u767D\u884C\u9593\u8DDD",
  "code.emptyLineDesc": "\u7DE8\u8F2F\u6A21\u5F0F\u4E2D\u7A0B\u5F0F\u78BC\u5340\u584A\u5167\u90E8\u7A7A\u767D\u884C\u7684\u9593\u8DDD\u3002",
  "code.top": "\u7A0B\u5F0F\u78BC\u5340\u584A\u4E0A\u9593\u8DDD",
  "code.topDesc": "\u95B1\u8B80\u6A21\u5F0F\u4E2D\u7A0B\u5F0F\u78BC\u5340\u584A\u7684\u9802\u90E8\u9593\u8DDD\u3002",
  "code.bottom": "\u7A0B\u5F0F\u78BC\u5340\u584A\u4E0B\u9593\u8DDD",
  "code.bottomDesc": "\u95B1\u8B80\u6A21\u5F0F\u4E2D\u7A0B\u5F0F\u78BC\u5340\u584A\u7684\u5E95\u90E8\u9593\u8DDD\u3002",
  "context.body": "\u5167\u6587",
  "context.quote": "\u5F15\u7528\u5340\u584A",
  "gap.group": "{context}\u5167\u6A19\u984C\u5F8C\u9996\u500B\u5143\u7D20\u9593\u8DDD",
  "gap.groupDesc": "{context}\u5167\u6A19\u984C\u5F8C\u63A5\u4E0D\u540C\u985E\u578B\u9996\u500B\u5143\u7D20\u6642\u7684\u9802\u90E8\u88DC\u511F\u9593\u8DDD\u3002",
  "gap.emptyLine": "\u6A19\u984C\u5F8C\u7A7A\u767D\u884C\u9AD8\u5EA6",
  "gap.emptyLineDesc": "\u6A19\u984C\u3001\u7A7A\u767D\u884C\u3001\u975E\u6A19\u984C\u5143\u7D20\u7D44\u5408\u4E2D\u7684\u7A7A\u767D\u884C\u9AD8\u5EA6\u3002",
  "gap.paragraph": "\u7DCA\u9130\u5167\u6587\u9593\u8DDD",
  "gap.paragraphDesc": "\u5167\u6587\u6A19\u984C\u5F8C\u6C92\u6709\u7A7A\u767D\u884C\u4E14\u7DCA\u9130\u5167\u6587\u6642\u7684\u9802\u90E8\u88DC\u511F\u3002",
  "gap.list": "\u7DCA\u9130\u6E05\u55AE\u9593\u8DDD",
  "gap.listDesc": "\u5167\u6587\u6A19\u984C\u5F8C\u7DCA\u9130\u6E05\u55AE\u6642\u7684\u9802\u90E8\u88DC\u511F\u3002",
  "gap.quote": "\u7DCA\u9130\u5F15\u7528\u5340\u584A\u9593\u8DDD",
  "gap.quoteDesc": "\u5167\u6587\u6A19\u984C\u5F8C\u7DCA\u9130\u5F15\u7528\u5340\u584A\u6642\u7684\u9802\u90E8\u88DC\u511F\u3002",
  "gap.code": "\u7DCA\u9130\u7A0B\u5F0F\u78BC\u5340\u584A\u9593\u8DDD",
  "gap.codeDesc": "\u5167\u6587\u6A19\u984C\u5F8C\u7DCA\u9130\u7A0B\u5F0F\u78BC\u5340\u584A\u6642\u7684\u9802\u90E8\u88DC\u511F\u3002",
  "gap.table": "\u7DCA\u9130\u8868\u683C\u9593\u8DDD",
  "gap.tableDesc": "\u5167\u6587\u6A19\u984C\u5F8C\u7DCA\u9130\u8868\u683C\u6642\u7684\u9802\u90E8\u88DC\u511F\u3002",
  "gap.image": "\u7DCA\u9130\u5716\u7247\u9593\u8DDD",
  "gap.imageDesc": "\u5167\u6587\u6A19\u984C\u5F8C\u7DCA\u9130\u5716\u7247\u6642\u7684\u9802\u90E8\u88DC\u511F\u3002",
  "gap.callout": "\u7DCA\u9130 Callout \u9593\u8DDD",
  "gap.calloutDesc": "\u5167\u6587\u6A19\u984C\u5F8C\u7DCA\u9130 Callout \u6642\u7684\u9802\u90E8\u88DC\u511F\u3002",
  "gap.contextEmptyLine": "{context}\u5167\u6A19\u984C\u5F8C\u7A7A\u767D\u884C\u7684\u9AD8\u5EA6\u3002",
  "gap.contextParagraph": "{context}\u5167\u6A19\u984C\u5F8C\u7DCA\u9130\u5167\u6587\u6642\u7684\u9593\u8DDD\u3002",
  "gap.contextList": "{context}\u5167\u6A19\u984C\u5F8C\u7DCA\u9130\u6E05\u55AE\u6642\u7684\u9593\u8DDD\u3002",
  "gap.contextQuote": "{context}\u5167\u6A19\u984C\u5F8C\u7DCA\u9130\u5F15\u7528\u5340\u584A\u6642\u7684\u9593\u8DDD\u3002",
  "gap.contextCode": "{context}\u5167\u6A19\u984C\u5F8C\u7DCA\u9130\u7A0B\u5F0F\u78BC\u5340\u584A\u6642\u7684\u9593\u8DDD\u3002",
  "gap.contextTable": "{context}\u5167\u6A19\u984C\u5F8C\u7DCA\u9130\u8868\u683C\u6642\u7684\u9593\u8DDD\u3002",
  "gap.contextImage": "{context}\u5167\u6A19\u984C\u5F8C\u7DCA\u9130\u5716\u7247\u6642\u7684\u9593\u8DDD\u3002",
  "gap.contextCallout": "{context}\u5167\u6A19\u984C\u5F8C\u7DCA\u9130 Callout \u6642\u7684\u9593\u8DDD\u3002",
  "unit.ratio": "\u500D",
  "notice.exported": "Refined Layout\uFF1A\u8A2D\u5B9A\u5DF2\u532F\u51FA\u3002",
  "notice.imported": "Refined Layout\uFF1A\u8A2D\u5B9A\u5DF2\u532F\u5165\u3002",
  "notice.resetAll": "Refined Layout\uFF1A\u7DE8\u8F2F\u8207\u95B1\u8B80\u5169\u5957\u8A2D\u5B9A\u5DF2\u9084\u539F\u70BA\u9810\u8A2D\u503C\u3002",
  "notice.readFailed": "Refined Layout\uFF1A\u7121\u6CD5\u8B80\u53D6\u8A2D\u5B9A\u6A94\u3002",
  "notice.importFailed": "Refined Layout\uFF1A\u532F\u5165\u5931\u6557\uFF0C{detail}\u3002",
  "error.invalidJson": "\u6A94\u6848\u4E0D\u662F\u6709\u6548\u7684 JSON",
  "error.invalidRoot": "\u8A2D\u5B9A\u6A94\u7684\u6839\u7BC0\u9EDE\u5FC5\u9808\u662F\u7269\u4EF6",
  "error.unsupportedVersion": "\u8A2D\u5B9A\u6A94\u7684 schemaVersion \u5FC5\u9808\u662F 1\u30012 \u6216 3",
  "error.invalidFile": "\u6A94\u6848\u683C\u5F0F\u7121\u6548"
};

// src/i18n/ja.ts
var translations3 = {
  "actions.back": "\u623B\u308B",
  "language.name": "\u8868\u793A\u8A00\u8A9E",
  "language.description": "\u30D7\u30E9\u30B0\u30A4\u30F3\u306E\u8868\u793A\u8A00\u8A9E\u3092\u9078\u629E\u3057\u307E\u3059\u3002\u5909\u66F4\u306F\u3059\u3050\u306B\u53CD\u6620\u3055\u308C\u307E\u3059\u3002",
  "language.auto": "Obsidian \u306B\u5408\u308F\u305B\u308B",
  "mode.edit": "\u7DE8\u96C6\u30D3\u30E5\u30FC",
  "mode.read": "\u95B2\u89A7\u30D3\u30E5\u30FC",
  "tabs.body": "\u672C\u6587\u3068\u30EA\u30B9\u30C8",
  "tabs.bodyDesc": "\u901A\u5E38\u306E\u672C\u6587\u3001\u7A7A\u884C\u3001\u30EA\u30B9\u30C8\u306E\u9593\u9694\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "tabs.headings": "\u898B\u51FA\u3057 H1\u2013H6",
  "tabs.headingsDesc": "\u672C\u6587\u306E\u5404\u898B\u51FA\u3057\u30EC\u30D9\u30EB\u306E\u884C\u306E\u9AD8\u3055\u3068\u4E0A\u4E0B\u306E\u4F59\u767D\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "tabs.headingDecoration": "\u898B\u51FA\u3057\u306E\u88C5\u98FE",
  "tabs.headingDecorationDesc": "\u30C6\u30FC\u30DE\u304C\u63D0\u4F9B\u3059\u308B\u898B\u51FA\u3057\u306E\u88C5\u98FE\u7DDA\u306E\u4F4D\u7F6E\u3001\u30B5\u30A4\u30BA\u3001\u30AA\u30D5\u30BB\u30C3\u30C8\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "tabs.calloutDesc": "Callout \u30AB\u30FC\u30C9\u306E\u5916\u89B3\u3001\u30BF\u30A4\u30C8\u30EB\u30D0\u30FC\u3001\u672C\u6587\u3001\u5185\u90E8\u8981\u7D20\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "context.blockquote": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF",
  "tabs.blockquoteDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u672C\u6587\u3001\u8868\u3001\u5404\u30EC\u30D9\u30EB\u306E\u898B\u51FA\u3057\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "tabs.image": "\u753B\u50CF",
  "tabs.imageDesc": "\u672C\u6587\u306E\u753B\u50CF\u306E\u30B5\u30A4\u30BA\u3001\u89D2\u306E\u4E38\u307F\u3001\u67A0\u7DDA\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "tabs.mermaid": "Mermaid \u56F3",
  "tabs.mermaidDesc": "\u7E26\u9577\u30FB\u6A2A\u9577\u306E Mermaid \u56F3\u306E\u5E45\u306E\u8ABF\u6574\u30EB\u30FC\u30EB\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "tabs.table": "\u672C\u6587\u306E\u8868",
  "tabs.tableDesc": "\u672C\u6587\u306E\u8868\u306E\u30BB\u30EB\u5185\u4F59\u767D\u3001\u67A0\u7DDA\u3001\u89D2\u306E\u4E38\u307F\u3001\u5916\u5074\u306E\u4F59\u767D\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "tabs.codeBlock": "\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF",
  "tabs.codeBlockDesc": "\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u884C\u306E\u9AD8\u3055\u3068\u30D3\u30E5\u30FC\u3054\u3068\u306E\u4E0A\u4E0B\u306E\u4F59\u767D\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "tabs.headingGap": "\u898B\u51FA\u3057\u76F4\u5F8C\u306E\u9593\u9694",
  "tabs.headingGapDesc": "\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u7D9A\u304F\u672C\u6587\u3001\u30EA\u30B9\u30C8\u3001\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306A\u3069\u306E\u9593\u9694\u3092\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "actions.export": "\u8A2D\u5B9A\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8",
  "actions.exportDesc": "\u7DE8\u96C6\u30FB\u95B2\u89A7\u306E\u4E21\u30D3\u30E5\u30FC\u306E\u73FE\u5728\u306E\u8A2D\u5B9A\u3092 JSON \u30D5\u30A1\u30A4\u30EB\u306B\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3057\u307E\u3059\u3002",
  "actions.import": "\u8A2D\u5B9A\u3092\u30A4\u30F3\u30DD\u30FC\u30C8",
  "actions.importDesc": "JSON \u30D5\u30A1\u30A4\u30EB\u304B\u3089\u8A2D\u5B9A\u3092\u8AAD\u307F\u8FBC\u307F\u3001\u6210\u529F\u3059\u308B\u3068\u73FE\u5728\u306E\u8A2D\u5B9A\u3092\u7F6E\u304D\u63DB\u3048\u307E\u3059\u3002",
  "actions.resetAll": "\u3059\u3079\u3066\u30EA\u30BB\u30C3\u30C8",
  "actions.resetAllDesc": "\u4E21\u30D3\u30E5\u30FC\u306E\u8A2D\u5B9A\u3068\u3059\u3079\u3066\u306E\u30E2\u30B8\u30E5\u30FC\u30EB\u5207\u308A\u66FF\u3048\u3092\u521D\u671F\u5024\u306B\u623B\u3057\u307E\u3059\u3002",
  "actions.cancel": "\u30AD\u30E3\u30F3\u30BB\u30EB",
  "resetAll.title": "\u3059\u3079\u3066\u306E\u8A2D\u5B9A\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3059\u304B\uFF1F",
  "resetAll.description": "\u4E21\u30D3\u30E5\u30FC\u306E\u8A2D\u5B9A\u3068\u3059\u3079\u3066\u306E\u30E2\u30B8\u30E5\u30FC\u30EB\u5207\u308A\u66FF\u3048\u3092\u521D\u671F\u5024\u306B\u623B\u3057\u3001\u73FE\u5728\u306E\u30EC\u30A4\u30A2\u30A6\u30C8\u8ABF\u6574\u3092\u7F6E\u304D\u63DB\u3048\u307E\u3059\u3002",
  "aria.mode": "\u8A2D\u5B9A\u5BFE\u8C61\u306E\u30D3\u30E5\u30FC",
  "aria.sections": "\u8A2D\u5B9A\u30AB\u30C6\u30B4\u30EA\u30FC",
  "actions.resetSection": "\u3053\u306E\u30AB\u30C6\u30B4\u30EA\u30FC\u3092\u30EA\u30BB\u30C3\u30C8",
  "aria.headingLevel": "\u898B\u51FA\u3057\u30EC\u30D9\u30EB",
  "body.group": "\u672C\u6587\u306E\u66F8\u5F0F",
  "body.groupDesc": "\u901A\u5E38\u306E\u672C\u6587\u306E\u884C\u306E\u9AD8\u3055\u3001\u6BB5\u843D\u9593\u9694\u3001\u7A7A\u884C\u306E\u9AD8\u3055\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "body.lineHeight": "\u672C\u6587\u306E\u884C\u306E\u9AD8\u3055",
  "body.lineHeightDesc": "\u901A\u5E38\u306E\u672C\u6587\u306E\u884C\u306E\u9AD8\u3055\u3002",
  "body.emptyLine": "\u7A7A\u884C\u306E\u9AD8\u3055",
  "body.emptyLineDesc": "CodeMirror \u306E\u30BD\u30FC\u30B9\u30D3\u30E5\u30FC\u3067\u306E\u7A7A\u884C\u306E\u9AD8\u3055\u3002",
  "body.paragraphSpacing": "\u6BB5\u843D\u9593\u9694",
  "body.paragraphSpacingDesc": "\u95B2\u89A7\u30D3\u30E5\u30FC\u3067\u306E\u901A\u5E38\u306E\u6BB5\u843D\u9593\u306E\u7E26\u65B9\u5411\u306E\u9593\u9694\u3002",
  "list.group": "\u30EA\u30B9\u30C8\u306E\u9593\u9694",
  "list.groupDesc": "\u300C\u9805\u76EE\u9593\u9694\u300D\u306F\u9805\u76EE\u540C\u58EB\u306E\u9593\u9694\u3092\u8ABF\u6574\u3057\u307E\u3059\u3002\u300C\u30EA\u30B9\u30C8\u5168\u4F53\u306E\u9593\u9694\u300D\u306F\u5148\u982D\u9805\u76EE\u306E\u4E0A\u3068\u672B\u5C3E\u9805\u76EE\u306E\u4E0B\u3001\u3064\u307E\u308A\u524D\u5F8C\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3092\u8ABF\u6574\u3057\u307E\u3059\u3002\u30EA\u30B9\u30C8\u306E\u4E21\u7AEF\u306B\u306F\u5168\u4F53\u306E\u9593\u9694\u306E\u307F\u304C\u9069\u7528\u3055\u308C\u3001\u9805\u76EE\u9593\u9694\u306F\u52A0\u7B97\u3055\u308C\u307E\u305B\u3093\u3002",
  "list.itemTop": "\u30EA\u30B9\u30C8\u9805\u76EE\u306E\u4E0A\u306E\u9593\u9694",
  "list.itemBottom": "\u30EA\u30B9\u30C8\u9805\u76EE\u306E\u4E0B\u306E\u9593\u9694",
  "list.blockTop": "\u30EA\u30B9\u30C8\u5168\u4F53\u306E\u4E0A\u306E\u9593\u9694",
  "list.blockBottom": "\u30EA\u30B9\u30C8\u5168\u4F53\u306E\u4E0B\u306E\u9593\u9694",
  "body.listItemTopDesc": "\u672C\u6587\u306E\u30EA\u30B9\u30C8\u3067\u3001\u5404\u9805\u76EE\u3068\u524D\u306E\u9805\u76EE\u3068\u306E\u9593\u9694\u3002",
  "body.listItemBottomDesc": "\u672C\u6587\u306E\u30EA\u30B9\u30C8\u3067\u3001\u5404\u9805\u76EE\u3068\u6B21\u306E\u9805\u76EE\u3068\u306E\u9593\u9694\u3002",
  "body.listBlockTopDesc": "\u672C\u6587\u306E\u30EA\u30B9\u30C8\u306E\u5148\u982D\u9805\u76EE\u3068\u305D\u306E\u524D\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "body.listBlockBottomDesc": "\u672C\u6587\u306E\u30EA\u30B9\u30C8\u306E\u672B\u5C3E\u9805\u76EE\u3068\u305D\u306E\u5F8C\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "headings.firstLine": "\u6587\u66F8\u306E\u5148\u982D\u884C",
  "headings.firstLineDesc": "\u6587\u66F8\u306E\u5148\u982D\u884C\u304C\u898B\u51FA\u3057\u306E\u5834\u5408\u306B\u306E\u307F\u9069\u7528\u3059\u308B\u8ABF\u6574\u3002",
  "headings.firstTop": "\u5148\u982D\u884C\u306E\u898B\u51FA\u3057\u306E\u4E0A\u90E8\u8ABF\u6574",
  "headings.firstTopDesc": "\u6587\u66F8\u306E\u5148\u982D\u884C\u304C\u898B\u51FA\u3057\u306E\u5834\u5408\u306B\u3001\u4E0A\u90E8\u306E\u4F59\u767D\u3092\u5FAE\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "headings.group": "\u5404\u30EC\u30D9\u30EB\u306E\u898B\u51FA\u3057\u306E\u66F8\u5F0F\u3068\u9593\u9694",
  "headings.groupDesc": "\u4E0B\u306E H1\u2013H6 \u30BF\u30D6\u3067\u3001\u5404\u30EC\u30D9\u30EB\u306E\u898B\u51FA\u3057\u306E\u884C\u306E\u9AD8\u3055\u3068\u4E0A\u4E0B\u306E\u4F59\u767D\u3092\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "headings.lineHeight": "{level} \u306E\u884C\u306E\u9AD8\u3055",
  "headings.top": "{level} \u306E\u4E0A\u306E\u9593\u9694",
  "headings.bottom": "{level} \u306E\u4E0B\u306E\u9593\u9694",
  "headings.lineHeightDesc": "\u898B\u51FA\u3057\u306E\u6587\u5B57\u306E\u884C\u306E\u9AD8\u3055\u3002",
  "headings.topDesc": "\u898B\u51FA\u3057\u306E\u4E0A\u306E\u9593\u9694\u3002",
  "headings.bottomDesc": "\u898B\u51FA\u3057\u306E\u4E0B\u306E\u9593\u9694\u3002",
  "decoration.group": "\u4F4D\u7F6E\u3068\u5916\u89B3",
  "decoration.groupDesc": "\u30C6\u30FC\u30DE\u306E ::before \u7591\u4F3C\u8981\u7D20\u306B\u3088\u308B\u898B\u51FA\u3057\u306E\u88C5\u98FE\u7DDA\u3092\u8ABF\u6574\u3057\u307E\u3059\u3002\u30C6\u30FC\u30DE\u306B\u88C5\u98FE\u304C\u306A\u3044\u5834\u5408\u3001\u65B0\u305F\u306A\u88C5\u98FE\u306F\u8FFD\u52A0\u3057\u307E\u305B\u3093\u3002",
  "decoration.left": "\u6A2A\u65B9\u5411\u306E\u30AA\u30D5\u30BB\u30C3\u30C8",
  "decoration.leftDesc": "\u898B\u51FA\u3057\u306E\u6587\u5B57\u306B\u5BFE\u3059\u308B\u7591\u4F3C\u8981\u7D20\u306E\u6A2A\u65B9\u5411\u306E\u30AA\u30D5\u30BB\u30C3\u30C8\u3002",
  "decoration.width": "\u5E45",
  "decoration.widthDesc": "\u7591\u4F3C\u8981\u7D20\u306E\u88C5\u98FE\u7DDA\u306E\u5E45\u3002",
  "decoration.radius": "\u89D2\u306E\u4E38\u307F",
  "decoration.radiusDesc": "\u7591\u4F3C\u8981\u7D20\u306E\u88C5\u98FE\u7DDA\u306E\u89D2\u306E\u534A\u5F84\u3002",
  "decoration.right": "\u53F3\u5074\u306E\u9593\u9694",
  "decoration.rightDesc": "\u7591\u4F3C\u8981\u7D20\u306E\u53F3\u7AEF\u3068\u898B\u51FA\u3057\u306E\u6587\u5B57\u3068\u306E\u8DDD\u96E2\u3002",
  "decoration.firstOffset": "\u5148\u982D\u884C\u306E\u88C5\u98FE\u306E\u8FFD\u52A0\u8ABF\u6574",
  "decoration.firstOffsetDesc": "\u6587\u66F8\u306E\u5148\u982D\u884C\u304C\u898B\u51FA\u3057\u306E\u5834\u5408\u306E\u307F\u52A0\u7B97\u3057\u307E\u3059\u3002\u6B63\u306E\u5024\u3067\u4E0B\u3078\u3001\u8CA0\u306E\u5024\u3067\u4E0A\u3078\u79FB\u52D5\u3057\u307E\u3059\u3002",
  "decoration.levels": "\u898B\u51FA\u3057\u306E\u88C5\u98FE\u306E\u9AD8\u3055\u3068\u7E26\u4F4D\u7F6E\u8ABF\u6574",
  "decoration.levelsDesc": "\u4E0B\u306E H1\u2013H6 \u30BF\u30D6\u3067\u3001\u5404\u30EC\u30D9\u30EB\u306E\u88C5\u98FE\u7DDA\u306E\u9AD8\u3055\u3068\u7E26\u65B9\u5411\u306E\u4E2D\u592E\u4F4D\u7F6E\u3092\u5FAE\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "decoration.height": "{level} \u306E\u9AD8\u3055",
  "decoration.offset": "{level} \u306E\u7E26\u4F4D\u7F6E\u8ABF\u6574",
  "decoration.heightDesc": "\u7591\u4F3C\u8981\u7D20\u306E\u9AD8\u3055\u3002",
  "decoration.offsetDesc": "\u6700\u521D\u306E\u884C\u306E\u7E26\u65B9\u5411\u306E\u4E2D\u592E\u3092\u57FA\u6E96\u306B\u5FAE\u8ABF\u6574\u3057\u307E\u3059\u3002\u6B63\u306E\u5024\u3067\u4E0B\u3078\u3001\u8CA0\u306E\u5024\u3067\u4E0A\u3078\u79FB\u52D5\u3057\u307E\u3059\u3002",
  "callout.appearance": "\u30AB\u30FC\u30C9\u306E\u5916\u89B3\u3068\u5916\u5074\u306E\u4F59\u767D",
  "callout.appearanceDesc": "Callout \u30AB\u30FC\u30C9\u306E\u89D2\u306E\u4E38\u307F\u3068\u524D\u5F8C\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "callout.radius": "\u30AB\u30FC\u30C9\u306E\u89D2\u306E\u4E38\u307F",
  "callout.radiusDesc": "Callout \u30AB\u30FC\u30C9\u306E\u89D2\u306E\u534A\u5F84\u3002",
  "callout.marginTop": "\u30AB\u30FC\u30C9\u306E\u4E0A\u306E\u5916\u5074\u4F59\u767D",
  "callout.marginTopDesc": "Callout \u3068\u305D\u306E\u524D\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "callout.marginBottom": "\u30AB\u30FC\u30C9\u306E\u4E0B\u306E\u5916\u5074\u4F59\u767D",
  "callout.marginBottomDesc": "Callout \u3068\u305D\u306E\u5F8C\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "callout.padding": "\u30AB\u30FC\u30C9\u306E\u5185\u5074\u4F59\u767D",
  "callout.paddingDesc": "Callout \u306E\u5404\u8FBA\u3068\u5185\u90E8\u306E\u5185\u5BB9\u3068\u306E\u9593\u306E\u4F59\u767D\u3002",
  "callout.paddingTop": "\u30AB\u30FC\u30C9\u306E\u4E0A\u306E\u5185\u5074\u4F59\u767D",
  "callout.paddingTopDesc": "Callout \u30AB\u30FC\u30C9\u306E\u4E0A\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.paddingBottom": "\u30AB\u30FC\u30C9\u306E\u4E0B\u306E\u5185\u5074\u4F59\u767D",
  "callout.paddingBottomDesc": "Callout \u30AB\u30FC\u30C9\u306E\u4E0B\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.paddingLeft": "\u30AB\u30FC\u30C9\u306E\u5DE6\u306E\u5185\u5074\u4F59\u767D",
  "callout.paddingLeftDesc": "Callout \u30AB\u30FC\u30C9\u306E\u5DE6\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.paddingRight": "\u30AB\u30FC\u30C9\u306E\u53F3\u306E\u5185\u5074\u4F59\u767D",
  "callout.paddingRightDesc": "Callout \u30AB\u30FC\u30C9\u306E\u53F3\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.title": "\u30BF\u30A4\u30C8\u30EB\u30D0\u30FC\u306E\u66F8\u5F0F\u3068\u4F59\u767D",
  "callout.titleDesc": "Callout \u30BF\u30A4\u30C8\u30EB\u30D0\u30FC\u306E\u6587\u5B57\u3068\u6A19\u6E96\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.titleLineHeight": "\u30BF\u30A4\u30C8\u30EB\u306E\u884C\u306E\u9AD8\u3055",
  "callout.titleLineHeightDesc": "\u30BF\u30A4\u30C8\u30EB\u30D0\u30FC\u306E\u6587\u5B57\u306E\u884C\u306E\u9AD8\u3055\u3002",
  "callout.titleTop": "\u30BF\u30A4\u30C8\u30EB\u306E\u4E0A\u306E\u5185\u5074\u4F59\u767D",
  "callout.titleTopDesc": "\u30BF\u30A4\u30C8\u30EB\u30D0\u30FC\u306E\u4E0A\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.titleBottom": "\u30BF\u30A4\u30C8\u30EB\u306E\u4E0B\u306E\u5185\u5074\u4F59\u767D",
  "callout.titleBottomDesc": "\u30BF\u30A4\u30C8\u30EB\u30D0\u30FC\u306E\u4E0B\u5074\u306E\u5185\u5074\u4F59\u767D\u3002\u30BF\u30A4\u30C8\u30EB\u306E\u307F\u3001\u6298\u308A\u305F\u305F\u307F\u4E2D\u3001\u307E\u305F\u306F\u898B\u51FA\u3057\u304C\u7D9A\u304F\u5834\u5408\u306F\u3001\u91CD\u8907\u3059\u308B\u7A7A\u767D\u3092\u81EA\u52D5\u7684\u306B\u6291\u3048\u307E\u3059\u3002",
  "callout.titleLeft": "\u30BF\u30A4\u30C8\u30EB\u306E\u5DE6\u306E\u5185\u5074\u4F59\u767D",
  "callout.titleLeftDesc": "\u30BF\u30A4\u30C8\u30EB\u30D0\u30FC\u306E\u5DE6\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.titleRight": "\u30BF\u30A4\u30C8\u30EB\u306E\u53F3\u306E\u5185\u5074\u4F59\u767D",
  "callout.titleRightDesc": "\u30BF\u30A4\u30C8\u30EB\u30D0\u30FC\u306E\u53F3\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.specialTitle": "\u7279\u6B8A\u306A\u72B6\u614B\u306E\u30BF\u30A4\u30C8\u30EB\u4F59\u767D",
  "callout.specialTitleDesc": "\u30BF\u30A4\u30C8\u30EB\u306E\u307F\u306E\u30AB\u30FC\u30C9\u3068\u6298\u308A\u305F\u305F\u307F\u4E2D\u306E\u30AB\u30FC\u30C9\u306E\u5185\u5074\u4F59\u767D\u3092\u500B\u5225\u306B\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "callout.titleOnlyTop": "\u30BF\u30A4\u30C8\u30EB\u306E\u307F\u306E\u5834\u5408\u306E\u4E0A\u306E\u4F59\u767D",
  "callout.titleOnlyTopDesc": "Callout \u304C\u30BF\u30A4\u30C8\u30EB\u306E\u307F\u306E\u5834\u5408\u306E\u4E0A\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.titleOnlyBottom": "\u30BF\u30A4\u30C8\u30EB\u306E\u307F\u306E\u5834\u5408\u306E\u4E0B\u306E\u4F59\u767D",
  "callout.titleOnlyBottomDesc": "\u30BF\u30A4\u30C8\u30EB\u306E\u307F\u306E Callout \u306E\u4E0B\u5074\u306E\u5185\u5074\u4F59\u767D\u3002\u672C\u6587\u304C\u3042\u308B Callout \u306E\u30AB\u30FC\u30C9\u4E0B\u5074\u4F59\u767D\u3068\u306F\u72EC\u7ACB\u3057\u3066\u3044\u307E\u3059\u3002",
  "callout.collapsedTop": "\u6298\u308A\u305F\u305F\u307F\u6642\u306E\u4E0A\u306E\u4F59\u767D",
  "callout.collapsedTopDesc": "\u6298\u308A\u305F\u305F\u3093\u3060 Callout \u306E\u4E0A\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "callout.collapsedBottom": "\u6298\u308A\u305F\u305F\u307F\u6642\u306E\u4E0B\u306E\u4F59\u767D",
  "callout.collapsedBottomDesc": "\u6298\u308A\u305F\u305F\u3093\u3060 Callout \u306E\u4E0B\u5074\u306E\u5185\u5074\u4F59\u767D\u3002",
  "context.bodyGroup": "\u5185\u90E8\u306E\u672C\u6587\u3068\u30EA\u30B9\u30C8",
  "callout.bodyDesc": "Callout \u5185\u306E\u6BB5\u843D\u3068\u30EA\u30B9\u30C8\u306E\u9593\u9694\u3092\u500B\u5225\u306B\u8A2D\u5B9A\u3057\u307E\u3059\u3002\u30EA\u30B9\u30C8\u306F\u9805\u76EE\u3068\u30EA\u30B9\u30C8\u5168\u4F53\u306B\u5206\u3051\u3066\u8ABF\u6574\u3067\u304D\u307E\u3059\u3002",
  "context.lineHeight": "\u5185\u90E8\u306E\u672C\u6587\u306E\u884C\u306E\u9AD8\u3055",
  "callout.lineHeightDesc": "Callout \u5185\u306E\u672C\u6587\u306E\u884C\u306E\u9AD8\u3055\u3002\u901A\u5E38\u306E\u672C\u6587\u3068\u306F\u72EC\u7ACB\u3057\u3066\u3044\u307E\u3059\u3002",
  "context.paragraphSpacing": "\u5185\u90E8\u306E\u6BB5\u843D\u9593\u9694",
  "callout.paragraphSpacingDesc": "Callout \u5185\u306E\u6BB5\u843D\u9593\u9694\u3002",
  "callout.listItemTopDesc": "Callout \u5185\u306E\u30EA\u30B9\u30C8\u3067\u3001\u5404\u9805\u76EE\u3068\u524D\u306E\u9805\u76EE\u3068\u306E\u9593\u9694\u3002",
  "callout.listItemBottomDesc": "Callout \u5185\u306E\u30EA\u30B9\u30C8\u3067\u3001\u5404\u9805\u76EE\u3068\u6B21\u306E\u9805\u76EE\u3068\u306E\u9593\u9694\u3002",
  "callout.listBlockTopDesc": "Callout \u5185\u306E\u30EA\u30B9\u30C8\u306E\u5148\u982D\u9805\u76EE\u3068\u305D\u306E\u524D\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "callout.listBlockBottomDesc": "Callout \u5185\u306E\u30EA\u30B9\u30C8\u306E\u672B\u5C3E\u9805\u76EE\u3068\u305D\u306E\u5F8C\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "callout.lastList": "\u672B\u5C3E\u30EA\u30B9\u30C8\u306E\u4E0B\u306E\u9593\u9694",
  "callout.lastListDesc": "\u30EA\u30B9\u30C8\u304C Callout \u306E\u6700\u5F8C\u306E\u8981\u7D20\u306E\u5834\u5408\u3001\u300C\u30EA\u30B9\u30C8\u5168\u4F53\u306E\u4E0B\u306E\u9593\u9694\u300D\u3092\u4E0A\u66F8\u304D\u3057\u307E\u3059\u3002",
  "callout.image": "Callout \u5185\u306E\u753B\u50CF",
  "callout.imageDesc": "Callout \u5185\u306E\u753B\u50CF\u306E\u30B5\u30A4\u30BA\u3068\u5916\u89B3\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "callout.table": "Callout \u5185\u306E\u8868",
  "callout.tableDesc": "Callout \u5185\u306E\u8868\u306E\u5185\u5074\u4F59\u767D\u3001\u67A0\u7DDA\u3001\u9593\u9694\u3002",
  "blockquote.bodyDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u6BB5\u843D\u3068\u30EA\u30B9\u30C8\u306E\u66F8\u5F0F\u30FB\u9593\u9694\u3092\u500B\u5225\u306B\u8A2D\u5B9A\u3057\u307E\u3059\u3002\u30EA\u30B9\u30C8\u306F\u9805\u76EE\u3068\u30EA\u30B9\u30C8\u5168\u4F53\u306B\u5206\u3051\u3066\u8ABF\u6574\u3067\u304D\u307E\u3059\u3002",
  "blockquote.lineHeightDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u672C\u6587\u306E\u884C\u306E\u9AD8\u3055\u3002\u901A\u5E38\u306E\u672C\u6587\u3068\u306F\u72EC\u7ACB\u3057\u3066\u3044\u307E\u3059\u3002",
  "blockquote.paragraphSpacingDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u6BB5\u843D\u9593\u9694\u3002",
  "blockquote.listItemTopDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u30EA\u30B9\u30C8\u3067\u3001\u5404\u9805\u76EE\u3068\u524D\u306E\u9805\u76EE\u3068\u306E\u9593\u9694\u3002",
  "blockquote.listItemBottomDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u30EA\u30B9\u30C8\u3067\u3001\u5404\u9805\u76EE\u3068\u6B21\u306E\u9805\u76EE\u3068\u306E\u9593\u9694\u3002",
  "blockquote.listBlockTopDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u30EA\u30B9\u30C8\u306E\u5148\u982D\u9805\u76EE\u3068\u305D\u306E\u524D\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "blockquote.listBlockBottomDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u30EA\u30B9\u30C8\u306E\u672B\u5C3E\u9805\u76EE\u3068\u305D\u306E\u5F8C\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "blockquote.table": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u8868",
  "blockquote.tableDesc": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u8868\u306E\u5185\u5074\u4F59\u767D\u3001\u67A0\u7DDA\u3001\u9593\u9694\u3002",
  "context.headings": "{context} \u5185\u306E\u898B\u51FA\u3057 (H1\u2013H6)",
  "context.headingsDesc": "\u4E0B\u306E H1\u2013H6 \u30BF\u30D6\u3067\u3001{context}\u5185\u306E\u5404\u30EC\u30D9\u30EB\u306E\u898B\u51FA\u3057\u306E\u884C\u306E\u9AD8\u3055\u3068\u9593\u9694\u3092\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "context.headingLineHeightDesc": "\u5185\u90E8\u306E\u898B\u51FA\u3057\u306E\u884C\u306E\u9AD8\u3055\u3002",
  "context.headingTopDesc": "\u5185\u90E8\u306E\u898B\u51FA\u3057\u306E\u4E0A\u306E\u9593\u9694\u3002",
  "context.headingBottomDesc": "\u5185\u90E8\u306E\u898B\u51FA\u3057\u306E\u4E0B\u306E\u9593\u9694\u3002",
  "image.group": "\u672C\u6587\u306E\u753B\u50CF\u306E\u30B5\u30A4\u30BA\u3068\u5916\u89B3",
  "image.groupDesc": "\u901A\u5E38\u306E\u672C\u6587\u306E\u753B\u50CF\u306E\u30B5\u30A4\u30BA\u3001\u89D2\u306E\u4E38\u307F\u3001\u67A0\u7DDA\u3092\u8A2D\u5B9A\u3057\u307E\u3059\u3002",
  "image.marginTop": "\u753B\u50CF\u306E\u4E0A\u90E8\u9593\u9694",
  "image.marginBottom": "\u753B\u50CF\u306E\u4E0B\u90E8\u9593\u9694",
  "image.marginTopEditDesc": "\u753B\u50CF\u306E\u4E0A\u5074\u306E\u4F59\u767D\u3002\u30BD\u30FC\u30B9\u5185\u306E\u7A7A\u884C\u306F\u300C\u672C\u6587 \u2192 \u7A7A\u884C\u306E\u9AD8\u3055\u300D\u3067\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "image.marginBottomEditDesc": "\u753B\u50CF\u306E\u4E0B\u5074\u306E\u4F59\u767D\u3002\u30BD\u30FC\u30B9\u5185\u306E\u7A7A\u884C\u306F\u300C\u672C\u6587 \u2192 \u7A7A\u884C\u306E\u9AD8\u3055\u300D\u3067\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "image.marginTopReadDesc": "\u672C\u6587\u306E\u753B\u50CF\u3092\u542B\u3080\u6BB5\u843D\u306E\u4E0A\u30DE\u30FC\u30B8\u30F3\u3002\u901A\u5E38\u306E\u6BB5\u843D\u306E\u4E0A\u30DE\u30FC\u30B8\u30F3\u306B\u4EE3\u308F\u3063\u3066\u9069\u7528\u3057\u307E\u3059\u3002",
  "image.marginBottomReadDesc": "\u672C\u6587\u306E\u753B\u50CF\u3092\u542B\u3080\u6BB5\u843D\u306E\u4E0B\u30DE\u30FC\u30B8\u30F3\u3002\u901A\u5E38\u306E\u6BB5\u843D\u306E\u4E0B\u30DE\u30FC\u30B8\u30F3\u306B\u4EE3\u308F\u3063\u3066\u9069\u7528\u3057\u307E\u3059\u3002",
  "image.maxWidth": "\u6700\u5927\u5E45",
  "image.maxWidthDesc": "\u753B\u50CF\u3092\u542B\u3080\u9818\u57DF\u306B\u5BFE\u3059\u308B\u753B\u50CF\u306E\u6700\u5927\u5E45\u3002",
  "image.radius": "\u753B\u50CF\u306E\u89D2\u306E\u4E38\u307F",
  "image.radiusDesc": "\u753B\u50CF\u306E\u89D2\u306E\u534A\u5F84\u3002",
  "image.border": "\u753B\u50CF\u306E\u67A0\u7DDA",
  "image.borderDesc": "\u753B\u50CF\u306E\u67A0\u7DDA\u306E\u5E45\u3002",
  "mermaid.group": "\u56F3\u306E\u5E45\u306E\u81EA\u52D5\u8ABF\u6574",
  "mermaid.groupDesc": "SVG \u306E\u5143\u306E viewBox \u306E\u7E26\u6A2A\u6BD4\u306B\u57FA\u3065\u3044\u3066\u3001\u7E26\u9577\u306E\u56F3\u3068\u901A\u5E38\u30FB\u6A2A\u9577\u306E\u56F3\u3092\u533A\u5225\u3057\u307E\u3059\u3002",
  "mermaid.portraitWidth": "\u7E26\u9577\u306E\u56F3\u306E\u6700\u5927\u5E45",
  "mermaid.portraitWidthDesc": "\u7E26\u9577\u306E\u56F3\u306F\u5143\u306E\u30B5\u30A4\u30BA\u3067\u4E2D\u592E\u306B\u914D\u7F6E\u3057\u3001\u62E1\u5927\u3057\u307E\u305B\u3093\u3002\u672C\u6587\u5E45\u306B\u5BFE\u3059\u308B\u3053\u306E\u5272\u5408\u3092\u8D85\u3048\u308B\u5834\u5408\u306E\u307F\u3001\u7E26\u6A2A\u6BD4\u3092\u4FDD\u3063\u3066\u7E2E\u5C0F\u3057\u307E\u3059\u3002",
  "mermaid.portraitRatio": "\u7E26\u9577\u3068\u5224\u5B9A\u3059\u308B\u7E26\u6A2A\u6BD4",
  "mermaid.portraitRatioDesc": "SVG \u306E\u5143\u306E\u5E45\u3092\u9AD8\u3055\u3067\u5272\u3063\u305F\u5024\u304C\u3001\u3053\u306E\u5024\u4EE5\u4E0B\u306E\u5834\u5408\u306B\u7E26\u9577\u3068\u5224\u5B9A\u3057\u307E\u3059\u3002",
  "mermaid.landscapeWidth": "\u6A2A\u9577\u306E\u56F3\u306E\u6700\u5C0F\u5E45",
  "mermaid.landscapeWidthDesc": "\u901A\u5E38\u30FB\u6A2A\u9577\u306E Mermaid \u56F3\u306E\u6700\u5C0F\u5E45\u3002\u8868\u793A\u9818\u57DF\u304C\u8DB3\u308A\u306A\u3044\u5834\u5408\u306F\u6A2A\u30B9\u30AF\u30ED\u30FC\u30EB\u3067\u304D\u307E\u3059\u3002",
  "table.group": "\u672C\u6587\u306E\u8868\u306E\u5916\u89B3\u3068\u9593\u9694",
  "table.groupDesc": "\u672C\u6587\u306E\u8868\u306E\u30BB\u30EB\u5185\u4F59\u767D\u3001\u5185\u5074\u30FB\u5916\u5074\u306E\u67A0\u7DDA\u3001\u89D2\u306E\u4E38\u307F\u3001\u4E0A\u4E0B\u306E\u9593\u9694\u3002",
  "table.cellPadding": "\u30BB\u30EB\u5185\u306E\u4F59\u767D",
  "table.cellPaddingDesc": "\u8868\u306E\u30BB\u30EB\u5185\u306E\u4F59\u767D\u3002",
  "table.innerBorder": "\u5185\u5074\u306E\u67A0\u7DDA\u306E\u5E45",
  "table.innerBorderDesc": "\u8868\u306E\u5185\u5074\u306E\u67A0\u7DDA\u306E\u5E45\u3002",
  "table.outerBorder": "\u5916\u5074\u306E\u67A0\u7DDA\u306E\u5E45",
  "table.outerBorderDesc": "\u8868\u306E\u5916\u5074\u306E\u67A0\u7DDA\u306E\u5E45\u3002",
  "table.radius": "\u8868\u306E\u89D2\u306E\u4E38\u307F",
  "table.radiusDesc": "\u8868\u5168\u4F53\u306E\u89D2\u306E\u4E38\u307F\u3002",
  "table.top": "\u8868\u306E\u4E0A\u306E\u9593\u9694",
  "table.topDesc": "\u8868\u3068\u305D\u306E\u524D\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "table.bottom": "\u8868\u306E\u4E0B\u306E\u9593\u9694",
  "table.bottomDesc": "\u8868\u3068\u305D\u306E\u5F8C\u306E\u5185\u5BB9\u3068\u306E\u8DDD\u96E2\u3002",
  "code.group": "\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u66F8\u5F0F\u3068\u9593\u9694",
  "code.groupDesc": "\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u884C\u306E\u9AD8\u3055\u3068\u5404\u30D3\u30E5\u30FC\u3067\u306E\u4F59\u767D\u3002",
  "code.lineHeight": "\u30B3\u30FC\u30C9\u306E\u884C\u306E\u9AD8\u3055",
  "code.lineHeightDesc": "\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u884C\u306E\u9AD8\u3055\u3002",
  "code.emptyLine": "\u5185\u90E8\u306E\u7A7A\u884C\u306E\u9593\u9694",
  "code.emptyLineDesc": "\u7DE8\u96C6\u30D3\u30E5\u30FC\u3067\u306E\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u5185\u306E\u7A7A\u884C\u306E\u9593\u9694\u3002",
  "code.top": "\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u4E0A\u306E\u9593\u9694",
  "code.topDesc": "\u95B2\u89A7\u30D3\u30E5\u30FC\u3067\u306E\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u4E0A\u306E\u9593\u9694\u3002",
  "code.bottom": "\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u4E0B\u306E\u9593\u9694",
  "code.bottomDesc": "\u95B2\u89A7\u30D3\u30E5\u30FC\u3067\u306E\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u4E0B\u306E\u9593\u9694\u3002",
  "context.body": "\u672C\u6587",
  "context.quote": "\u5F15\u7528\u30D6\u30ED\u30C3\u30AF",
  "gap.group": "{context}\u5185\u306E\u898B\u51FA\u3057\u76F4\u5F8C\u306E\u9593\u9694",
  "gap.groupDesc": "{context}\u5185\u306E\u898B\u51FA\u3057\u76F4\u5F8C\u306B\u7D9A\u304F\u8981\u7D20\u306E\u7A2E\u985E\u306B\u5FDC\u3058\u3066\u3001\u4E0A\u90E8\u306E\u9593\u9694\u3092\u8ABF\u6574\u3057\u307E\u3059\u3002",
  "gap.emptyLine": "\u898B\u51FA\u3057\u5F8C\u306E\u7A7A\u884C\u306E\u9AD8\u3055",
  "gap.emptyLineDesc": "\u898B\u51FA\u3057\u3068\u898B\u51FA\u3057\u4EE5\u5916\u306E\u8981\u7D20\u306E\u9593\u306B\u3042\u308B\u7A7A\u884C\u306E\u9AD8\u3055\u3002",
  "gap.paragraph": "\u76F4\u5F8C\u306E\u672C\u6587\u3068\u306E\u9593\u9694",
  "gap.paragraphDesc": "\u672C\u6587\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u7A7A\u884C\u306A\u3057\u3067\u672C\u6587\u304C\u7D9A\u304F\u5834\u5408\u306E\u4E0A\u90E8\u306E\u9593\u9694\u8ABF\u6574\u3002",
  "gap.list": "\u76F4\u5F8C\u306E\u30EA\u30B9\u30C8\u3068\u306E\u9593\u9694",
  "gap.listDesc": "\u672C\u6587\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u30EA\u30B9\u30C8\u304C\u7D9A\u304F\u5834\u5408\u306E\u4E0A\u90E8\u306E\u9593\u9694\u8ABF\u6574\u3002",
  "gap.quote": "\u76F4\u5F8C\u306E\u5F15\u7528\u3068\u306E\u9593\u9694",
  "gap.quoteDesc": "\u672C\u6587\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u304C\u7D9A\u304F\u5834\u5408\u306E\u4E0A\u90E8\u306E\u9593\u9694\u8ABF\u6574\u3002",
  "gap.code": "\u76F4\u5F8C\u306E\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u3068\u306E\u9593\u9694",
  "gap.codeDesc": "\u672C\u6587\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u304C\u7D9A\u304F\u5834\u5408\u306E\u4E0A\u90E8\u306E\u9593\u9694\u8ABF\u6574\u3002",
  "gap.table": "\u76F4\u5F8C\u306E\u8868\u3068\u306E\u9593\u9694",
  "gap.tableDesc": "\u672C\u6587\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u8868\u304C\u7D9A\u304F\u5834\u5408\u306E\u4E0A\u90E8\u306E\u9593\u9694\u8ABF\u6574\u3002",
  "gap.image": "\u76F4\u5F8C\u306E\u753B\u50CF\u3068\u306E\u9593\u9694",
  "gap.imageDesc": "\u672C\u6587\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u753B\u50CF\u304C\u7D9A\u304F\u5834\u5408\u306E\u4E0A\u90E8\u306E\u9593\u9694\u8ABF\u6574\u3002",
  "gap.callout": "\u76F4\u5F8C\u306E Callout \u3068\u306E\u9593\u9694",
  "gap.calloutDesc": "\u672C\u6587\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B Callout \u304C\u7D9A\u304F\u5834\u5408\u306E\u4E0A\u90E8\u306E\u9593\u9694\u8ABF\u6574\u3002",
  "gap.contextEmptyLine": "{context}\u5185\u306E\u898B\u51FA\u3057\u5F8C\u306E\u7A7A\u884C\u306E\u9AD8\u3055\u3002",
  "gap.contextParagraph": "{context}\u5185\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u672C\u6587\u304C\u7D9A\u304F\u5834\u5408\u306E\u9593\u9694\u3002",
  "gap.contextList": "{context}\u5185\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u30EA\u30B9\u30C8\u304C\u7D9A\u304F\u5834\u5408\u306E\u9593\u9694\u3002",
  "gap.contextQuote": "{context}\u5185\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u5F15\u7528\u30D6\u30ED\u30C3\u30AF\u304C\u7D9A\u304F\u5834\u5408\u306E\u9593\u9694\u3002",
  "gap.contextCode": "{context}\u5185\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u304C\u7D9A\u304F\u5834\u5408\u306E\u9593\u9694\u3002",
  "gap.contextTable": "{context}\u5185\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u8868\u304C\u7D9A\u304F\u5834\u5408\u306E\u9593\u9694\u3002",
  "gap.contextImage": "{context}\u5185\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B\u753B\u50CF\u304C\u7D9A\u304F\u5834\u5408\u306E\u9593\u9694\u3002",
  "gap.contextCallout": "{context}\u5185\u306E\u898B\u51FA\u3057\u306E\u76F4\u5F8C\u306B Callout \u304C\u7D9A\u304F\u5834\u5408\u306E\u9593\u9694\u3002",
  "unit.ratio": "\u500D",
  "notice.exported": "Refined Layout\uFF1A\u8A2D\u5B9A\u3092\u30A8\u30AF\u30B9\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F\u3002",
  "notice.imported": "Refined Layout\uFF1A\u8A2D\u5B9A\u3092\u30A4\u30F3\u30DD\u30FC\u30C8\u3057\u307E\u3057\u305F\u3002",
  "notice.resetAll": "Refined Layout\uFF1A\u4E21\u30D3\u30E5\u30FC\u306E\u8A2D\u5B9A\u3092\u521D\u671F\u5024\u306B\u623B\u3057\u307E\u3057\u305F\u3002",
  "notice.readFailed": "Refined Layout\uFF1A\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002",
  "notice.importFailed": "Refined Layout\uFF1A\u30A4\u30F3\u30DD\u30FC\u30C8\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002{detail}\u3002",
  "error.invalidJson": "\u30D5\u30A1\u30A4\u30EB\u304C\u6709\u52B9\u306A JSON \u3067\u306F\u3042\u308A\u307E\u305B\u3093",
  "error.invalidRoot": "\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB\u306E\u30EB\u30FC\u30C8\u306F JSON \u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "error.unsupportedVersion": "\u8A2D\u5B9A\u30D5\u30A1\u30A4\u30EB\u306E schemaVersion \u306F 1\u30012\u30013 \u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
  "error.invalidFile": "\u30D5\u30A1\u30A4\u30EB\u5F62\u5F0F\u304C\u7121\u52B9\u3067\u3059"
};

// src/i18n/language.ts
function normalizeLanguagePreference(value) {
  switch (value) {
    case "en":
    case "zh-CN":
    case "zh-TW":
    case "ja":
      return value;
    default:
      return "auto";
  }
}

// src/i18n/core.ts
var dictionaries = {
  en,
  "zh-CN": translations,
  "zh-TW": translations2,
  ja: translations3
};
function resolveLocale(language) {
  if (typeof language !== "string") return "en";
  const [base, ...tags] = language.trim().toLowerCase().replace(/_/g, "-").split("-");
  if (base === "ja") return "ja";
  if (base !== "zh") return "en";
  if (tags.includes("hans")) return "zh-CN";
  if (tags.includes("hant")) return "zh-TW";
  if (tags.some((tag) => ["tw", "hk", "mo"].includes(tag))) return "zh-TW";
  return "zh-CN";
}
function detectLocale(readLanguage) {
  try {
    return resolveLocale(readLanguage());
  } catch {
    return "en";
  }
}
function selectLocale(preference, readLanguage) {
  const language = normalizeLanguagePreference(preference);
  return language === "auto" ? detectLocale(readLanguage) : language;
}
function createTranslator(dictionary) {
  return (key, params = {}) => {
    const template = dictionary[key] || en[key];
    return template.replace(/\{(\w+)\}/g, (placeholder, name) => Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder);
  };
}
function translatorForLocale(locale) {
  return createTranslator(dictionaries[locale]);
}

// src/i18n/index.ts
function getTranslator(preference = "auto") {
  return translatorForLocale(selectLocale(preference, import_obsidian.getLanguage));
}

// src/settings.ts
var MODE_KEYS = ["edit", "read"];
var MODULE_KEYS = [
  "body",
  "headings",
  "callouts",
  "blockquotes",
  "images",
  "mermaid",
  "tables",
  "codeBlocks",
  "headingGaps"
];
var HEADING_LEVELS = ["h1", "h2", "h3", "h4", "h5", "h6"];
var EDIT_TABLE = {
  cellPaddingPx: 0.6,
  innerBorderPx: 1,
  outerBorderPx: 2,
  radiusPx: 8,
  spacingTopPx: 3.2,
  spacingBottomPx: 6
};
var READ_TABLE = {
  cellPaddingPx: 6,
  innerBorderPx: 1,
  outerBorderPx: 2,
  radiusPx: 8,
  spacingTopPx: 4,
  spacingBottomPx: 6
};
var EDIT_IMAGE = { maxWidthPct: 85, radiusPx: 8, borderPx: 2 };
var READ_IMAGE = { maxWidthPct: 85, radiusPx: 8, borderPx: 2 };
var EDIT_HEADINGS = {
  h1: { lineHeight: 1.4, topEm: 0.4, bottomEm: 4e-3, decorHeightPx: 20, decorOffsetPx: 0 },
  h2: { lineHeight: 1.4, topEm: 0.4, bottomEm: 4e-3, decorHeightPx: 19.5, decorOffsetPx: 0 },
  h3: { lineHeight: 1.4, topEm: 0.4, bottomEm: 4e-3, decorHeightPx: 19, decorOffsetPx: 0 },
  h4: { lineHeight: 1.4, topEm: 0.4, bottomEm: 4e-3, decorHeightPx: 18.5, decorOffsetPx: 0 },
  h5: { lineHeight: 1.38, topEm: 0.35, bottomEm: 35e-4, decorHeightPx: 17, decorOffsetPx: 0 },
  h6: { lineHeight: 1.36, topEm: 0.5, bottomEm: 0.1625, decorHeightPx: 16, decorOffsetPx: 0.5 }
};
var READ_HEADINGS = {
  h1: { lineHeight: 1.47, topEm: 0.6, bottomEm: 0.32, decorHeightPx: 20, decorOffsetPx: 0 },
  h2: { lineHeight: 1.47, topEm: 0.6, bottomEm: 0.32, decorHeightPx: 19.5, decorOffsetPx: 0 },
  h3: { lineHeight: 1.47, topEm: 0.6, bottomEm: 0.32, decorHeightPx: 19, decorOffsetPx: 0 },
  h4: { lineHeight: 1.47, topEm: 0.6, bottomEm: 0.32, decorHeightPx: 18.5, decorOffsetPx: 0 },
  h5: { lineHeight: 1.449, topEm: 0.7, bottomEm: 0.28, decorHeightPx: 17, decorOffsetPx: 0 },
  h6: { lineHeight: 1.428, topEm: 0.7, bottomEm: 0.28, decorHeightPx: 16, decorOffsetPx: 0.5 }
};
var EDIT_CALLOUT_HEADINGS = {
  h1: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0.4, bottomPx: 0 },
  h2: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0.4, bottomPx: 0 },
  h3: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0.4, bottomPx: 0 },
  h4: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0.4, bottomPx: 0 },
  h5: { lineHeight: 1.3524, topEm: 0.35, bottomEm: 0.35, bottomPx: 0 },
  h6: { lineHeight: 1.3328, topEm: 0.35, bottomEm: 0.35, bottomPx: 0 }
};
var READ_CALLOUT_HEADINGS = {
  h1: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0, bottomPx: 4 },
  h2: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0, bottomPx: 1 },
  h3: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0, bottomPx: 0 },
  h4: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0, bottomPx: 8 },
  h5: { lineHeight: 1.3524, topEm: 0.35, bottomEm: 0, bottomPx: -4 },
  h6: { lineHeight: 1.3328, topEm: 0.35, bottomEm: 0, bottomPx: -2 }
};
var EDIT_BLOCKQUOTE_HEADINGS = {
  h1: { lineHeight: 1.4, topEm: 0.4, bottomEm: 4e-3, bottomPx: 0 },
  h2: { lineHeight: 1.4, topEm: 0.4, bottomEm: 4e-3, bottomPx: 0 },
  h3: { lineHeight: 1.4, topEm: 0.4, bottomEm: 4e-3, bottomPx: 0 },
  h4: { lineHeight: 1.4, topEm: 0.4, bottomEm: 4e-3, bottomPx: 0 },
  h5: { lineHeight: 1.38, topEm: 0.35, bottomEm: 35e-4, bottomPx: 0 },
  h6: { lineHeight: 1.36, topEm: 0.35, bottomEm: 35e-4, bottomPx: 0 }
};
var READ_BLOCKQUOTE_HEADINGS = {
  h1: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0.24, bottomPx: 0 },
  h2: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0.24, bottomPx: 0 },
  h3: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0.24, bottomPx: 0 },
  h4: { lineHeight: 1.372, topEm: 0.4, bottomEm: 0.2, bottomPx: 0 },
  h5: { lineHeight: 1.3524, topEm: 0.35, bottomEm: 0.175, bottomPx: 0 },
  h6: { lineHeight: 1.3328, topEm: 0.35, bottomEm: 0.14, bottomPx: 0 }
};
var ALL_MODULES = {
  body: true,
  headings: true,
  callouts: true,
  blockquotes: true,
  images: true,
  mermaid: true,
  tables: true,
  codeBlocks: true,
  headingGaps: true
};
var DEFAULT_SETTINGS = {
  language: "auto",
  schemaVersion: 3,
  edit: {
    modules: { ...ALL_MODULES },
    body: {
      lineHeight: 1.7,
      paragraphSpacingEm: 0,
      emptyLineHeightEm: 0.45,
      listItemStartEm: 0,
      listItemEndEm: 0,
      listBlockStartEm: 0,
      listBlockEndEm: 0.15
    },
    headings: EDIT_HEADINGS,
    headingDecoration: {
      leftPx: -8,
      widthPx: 2,
      radiusPx: 1,
      marginRightPx: 0,
      firstHeadingPaddingTopPx: 7.5,
      firstHeadingDecorOffsetPx: 0.5
    },
    callout: {
      radiusPx: 10,
      paddingTopPx: 12,
      paddingBottomPx: 7,
      paddingLeftPx: 18,
      paddingRightPx: 18,
      marginTopPx: 4,
      marginBottomPx: 2,
      titleLineHeight: 1.4,
      titlePaddingTopEm: 0.15,
      titlePaddingBottomEm: 0.35,
      titlePaddingLeftPx: 0,
      titlePaddingRightPx: 0,
      titleOnlyPaddingTopEm: 0.05,
      titleOnlyPaddingBottomEm: 0.4,
      collapsedPaddingTopEm: 0.75,
      collapsedPaddingBottomEm: 0.95,
      paragraphLineHeight: 1.64825,
      paragraphSpacingEm: 0.33,
      listItemStartEm: 0,
      listItemEndEm: 0,
      listBlockStartEm: 0,
      listBlockEndEm: 0.2,
      lastListEndEm: 0,
      headings: EDIT_CALLOUT_HEADINGS,
      image: { ...EDIT_IMAGE },
      table: { ...EDIT_TABLE, cellPaddingPx: 8 }
    },
    blockquote: {
      paragraphLineHeight: 1.735,
      paragraphSpacingEm: 0,
      listItemStartEm: 0,
      listItemEndEm: 0,
      listBlockStartEm: 0,
      listBlockEndEm: 0,
      headings: EDIT_BLOCKQUOTE_HEADINGS,
      table: { ...EDIT_TABLE }
    },
    image: { ...EDIT_IMAGE, marginTopPx: 5, marginBottomPx: 10 },
    mermaid: {
      portraitMaxWidthPct: 55,
      portraitAspectRatio: 1,
      landscapeMinWidthPx: 450
    },
    table: { ...EDIT_TABLE },
    codeBlock: {
      lineHeight: 1.62,
      innerSpacingEm: 0.2,
      marginTopEm: 0,
      marginBottomEm: 0
    },
    headingGap: {
      body: {
        emptyLineEm: 0.3,
        paragraphEm: 0.3,
        listEm: 0.45,
        quoteEm: 0.3,
        codeEm: 0.3,
        tableEm: 0.3,
        imageEm: 0.3,
        calloutEm: 0.3
      },
      callout: {
        emptyLineEm: 0,
        paragraphPx: -3,
        listPx: -5,
        quotePx: 0,
        codePx: 0,
        tablePx: -1,
        imagePx: 0,
        calloutPx: 0
      },
      blockquote: {
        emptyLineEm: 0,
        paragraphPx: 0,
        listPx: 0,
        quotePx: 0,
        codePx: 0,
        tablePx: 0,
        imagePx: 0,
        calloutPx: 0
      }
    }
  },
  read: {
    modules: { ...ALL_MODULES },
    body: {
      lineHeight: 1.735,
      paragraphSpacingEm: 0.5,
      emptyLineHeightEm: 0.5,
      listItemStartEm: 0,
      listItemEndEm: 0,
      listBlockStartEm: 0,
      listBlockEndEm: 0
    },
    headings: READ_HEADINGS,
    headingDecoration: {
      leftPx: -8,
      widthPx: 2,
      radiusPx: 1,
      marginRightPx: 0,
      firstHeadingPaddingTopPx: 0,
      firstHeadingDecorOffsetPx: 0
    },
    callout: {
      radiusPx: 10,
      paddingTopPx: 12,
      paddingBottomPx: 5,
      paddingLeftPx: 18,
      paddingRightPx: 18,
      marginTopPx: 10,
      marginBottomPx: 9,
      titleLineHeight: 1.4,
      titlePaddingTopEm: 0.25,
      titlePaddingBottomEm: 0.55,
      titlePaddingLeftPx: 0,
      titlePaddingRightPx: 0,
      titleOnlyPaddingTopEm: 0.15,
      titleOnlyPaddingBottomEm: 0.4725,
      collapsedPaddingTopEm: 0.75,
      collapsedPaddingBottomEm: 0.9,
      paragraphLineHeight: 1.64825,
      paragraphSpacingEm: 0.51,
      listItemStartEm: 0,
      listItemEndEm: 0,
      listBlockStartEm: 0,
      listBlockEndEm: 0,
      lastListEndEm: 0,
      headings: READ_CALLOUT_HEADINGS,
      image: { ...READ_IMAGE },
      table: { ...READ_TABLE }
    },
    blockquote: {
      paragraphLineHeight: 1.64825,
      paragraphSpacingEm: 0.51,
      listItemStartEm: 0,
      listItemEndEm: 0,
      listBlockStartEm: 0,
      listBlockEndEm: 0,
      headings: READ_BLOCKQUOTE_HEADINGS,
      table: { ...READ_TABLE }
    },
    image: { ...READ_IMAGE, marginTopPx: 0, marginBottomPx: 10 },
    mermaid: {
      portraitMaxWidthPct: 55,
      portraitAspectRatio: 1,
      landscapeMinWidthPx: 450
    },
    table: { ...READ_TABLE },
    codeBlock: {
      lineHeight: 1.35,
      innerSpacingEm: 0.2,
      marginTopEm: 0.5,
      marginBottomEm: 0.5
    },
    headingGap: {
      body: {
        emptyLineEm: 0,
        paragraphEm: 0,
        listEm: 0,
        quoteEm: 0,
        codeEm: 0,
        tableEm: 0,
        imageEm: 0,
        calloutEm: 0
      },
      callout: {
        emptyLineEm: 0,
        paragraphPx: 0,
        listPx: 6,
        quotePx: 0,
        codePx: 0,
        tablePx: 8,
        imagePx: 0,
        calloutPx: 0
      },
      blockquote: {
        emptyLineEm: 0,
        paragraphPx: 0,
        listPx: 0,
        quotePx: 0,
        codePx: 0,
        tablePx: 0,
        imagePx: 0,
        calloutPx: 0
      }
    }
  }
};
function mergeKnown(defaults, candidate) {
  if (typeof defaults === "number") {
    return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : defaults;
  }
  if (typeof defaults === "boolean") {
    return typeof candidate === "boolean" ? candidate : defaults;
  }
  if (typeof defaults !== "object" || defaults === null) {
    return defaults;
  }
  const source = typeof candidate === "object" && candidate !== null ? candidate : {};
  const merged = {};
  for (const [key, value] of Object.entries(defaults)) {
    merged[key] = mergeKnown(value, source[key]);
  }
  return merged;
}
function cloneDefaultSettings() {
  return structuredClone(DEFAULT_SETTINGS);
}
function migrateV1ToV2(source) {
  for (const mode of MODE_KEYS) {
    const modeSettings = source[mode];
    if (typeof modeSettings !== "object" || modeSettings === null) {
      continue;
    }
    const modeRecord = modeSettings;
    const legacyGap = modeRecord.headingGap;
    if (typeof legacyGap !== "object" || legacyGap === null) {
      continue;
    }
    const gap = legacyGap;
    const body = {
      emptyLineEm: gap.emptyLineEm,
      paragraphEm: gap.paragraphEm,
      listEm: gap.listEm,
      quoteEm: gap.quoteEm,
      codeEm: gap.codeEm,
      tableEm: gap.tableEm,
      imageEm: gap.imageEm,
      calloutEm: gap.calloutEm
    };
    const callout = {
      emptyLineEm: 0,
      paragraphPx: gap.calloutParagraphPx,
      listPx: gap.calloutListPx,
      quotePx: 0,
      codePx: 0,
      tablePx: gap.calloutTablePx,
      imagePx: 0,
      calloutPx: 0
    };
    const blockquote = {
      emptyLineEm: 0,
      paragraphPx: 0,
      listPx: 0,
      quotePx: 0,
      codePx: 0,
      tablePx: 0,
      imagePx: 0,
      calloutPx: 0
    };
    modeRecord.headingGap = { body, callout, blockquote };
  }
  source.schemaVersion = 2;
  return source;
}
function migrateV2ToV3(source) {
  const ITEM_LEVEL_CONTEXTS = {
    edit: ["body", "blockquote"],
    read: []
  };
  for (const mode of MODE_KEYS) {
    const modeSettings = source[mode];
    if (typeof modeSettings !== "object" || modeSettings === null) {
      continue;
    }
    const modeRecord = modeSettings;
    for (const context of ["body", "callout", "blockquote"]) {
      const contextSettings = modeRecord[context];
      if (typeof contextSettings !== "object" || contextSettings === null) {
        continue;
      }
      const contextRecord = contextSettings;
      const legacyStart = contextRecord.listStartEm;
      const legacyEnd = contextRecord.listEndEm;
      delete contextRecord.listStartEm;
      delete contextRecord.listEndEm;
      contextRecord.listBlockStartEm = legacyStart;
      contextRecord.listBlockEndEm = legacyEnd;
      const drovesItems = ITEM_LEVEL_CONTEXTS[mode].includes(context);
      contextRecord.listItemStartEm = drovesItems ? legacyStart : 0;
      contextRecord.listItemEndEm = drovesItems ? legacyEnd : 0;
    }
  }
  source.schemaVersion = 3;
  return source;
}
function migrateSettings(candidate) {
  if (typeof candidate !== "object" || candidate === null) {
    return candidate;
  }
  let source = structuredClone(candidate);
  if (source.schemaVersion === 1) {
    source = migrateV1ToV2(source);
  }
  if (source.schemaVersion === 2) {
    source = migrateV2ToV3(source);
  }
  return source;
}
function mergeSettings(candidate) {
  const settings = mergeKnown(cloneDefaultSettings(), migrateSettings(candidate));
  settings.language = normalizeLanguagePreference(
    typeof candidate === "object" && candidate !== null ? candidate.language : void 0
  );
  return settings;
}
var SettingsImportError = class extends Error {
  constructor(code, originalError) {
    super(`Invalid settings file: ${code}`);
    this.code = code;
    this.originalError = originalError;
    this.name = "SettingsImportError";
  }
};
function parseSettingsJson(json) {
  let candidate;
  try {
    candidate = JSON.parse(json);
  } catch (error) {
    throw new SettingsImportError("invalidJson", error);
  }
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    throw new SettingsImportError("invalidRoot");
  }
  const schemaVersion = candidate.schemaVersion;
  if (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== 3) {
    throw new SettingsImportError("unsupportedVersion");
  }
  return mergeSettings(candidate);
}

// src/i18n/import-error.ts
function formatImportError(error, t) {
  const detail = t(error instanceof SettingsImportError ? `error.${error.code}` : "error.invalidFile");
  return t("notice.importFailed", { detail });
}

// src/mermaid.ts
function isPositiveFiniteNumber(value) {
  return Number.isFinite(value) && value > 0;
}
function isPortraitMermaid(width, height, portraitAspectRatio) {
  if (!isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height)) {
    throw new RangeError(`Mermaid viewBox dimensions must be positive finite numbers: ${width} x ${height}`);
  }
  if (!isPositiveFiniteNumber(portraitAspectRatio)) {
    throw new RangeError(`Mermaid portrait aspect ratio must be a positive finite number: ${portraitAspectRatio}`);
  }
  return width / height <= portraitAspectRatio;
}

// src/settings-tab.ts
var import_obsidian2 = require("obsidian");

// src/settings-catalog.ts
function getModeLabels(t) {
  return {
    edit: t("mode.edit"),
    read: t("mode.read")
  };
}
var HEADING_LABELS = {
  h1: "H1",
  h2: "H2",
  h3: "H3",
  h4: "H4",
  h5: "H5",
  h6: "H6"
};
function getSettingsTabs(t) {
  return [
    { id: "body", label: t("tabs.body"), description: t("tabs.bodyDesc"), module: "body", reset: "body" },
    { id: "headings", label: t("tabs.headings"), description: t("tabs.headingsDesc"), module: "headings", reset: "headings" },
    { id: "headingDecoration", label: t("tabs.headingDecoration"), description: t("tabs.headingDecorationDesc"), module: "headings", reset: "headingDecoration" },
    { id: "callout", label: "Callout", description: t("tabs.calloutDesc"), module: "callouts", reset: "callout" },
    { id: "blockquote", label: t("context.blockquote"), description: t("tabs.blockquoteDesc"), module: "blockquotes", reset: "blockquote" },
    { id: "image", label: t("tabs.image"), description: t("tabs.imageDesc"), module: "images", reset: "image" },
    { id: "mermaid", label: t("tabs.mermaid"), description: t("tabs.mermaidDesc"), module: "mermaid", reset: "mermaid" },
    { id: "table", label: t("tabs.table"), description: t("tabs.tableDesc"), module: "tables", reset: "table" },
    { id: "codeBlock", label: t("tabs.codeBlock"), description: t("tabs.codeBlockDesc"), module: "codeBlocks", reset: "codeBlock" },
    { id: "headingGap", label: t("tabs.headingGap"), description: t("tabs.headingGapDesc"), module: "headingGaps", reset: "headingGap" }
  ];
}
function inferNumberOptions(path, mode) {
  const key = path[path.length - 1] ?? "";
  const joined = path.join(".").toLowerCase();
  const unit = key.endsWith("Em") ? "em" : key.endsWith("Px") ? "px" : key.endsWith("Pct") ? "%" : "";
  if (unit === "%") {
    return { unit, min: 10, max: 100, step: 1 };
  }
  if (unit === "" && key.toLowerCase().includes("lineheight")) {
    return { unit: "ratio", min: 0.5, max: 3, step: 0.01 };
  }
  const isSourceViewPadding = mode === "edit" && /^(?:body|blockquote)\.list/.test(joined);
  const allowsNegative = !isSourceViewPadding && (joined.includes("margin") || joined.includes("offset") || joined.includes("headinggap") || joined.includes("list") || key === "topEm" || key === "bottomEm" || key === "bottomPx" || key === "leftPx");
  const isSize = joined.includes("radius") || joined.includes("border") || joined.includes("width") || joined.includes("height") || joined.includes("padding");
  if (unit === "em") {
    return { unit, min: allowsNegative ? -5 : 0, max: 10, step: 0.01 };
  }
  if (unit === "px") {
    return {
      unit,
      min: allowsNegative ? -64 : 0,
      max: isSize ? 128 : 256,
      step: 0.5
    };
  }
  return { unit, min: allowsNegative ? -10 : 0, max: 100, step: 0.01 };
}
var SettingsCatalog = class {
  constructor(t, mode) {
    this.t = t;
    this.mode = mode;
  }
  build(tab) {
    const panel = [];
    switch (tab.id) {
      case "body":
        this.renderBodySection(panel);
        break;
      case "headings":
        this.renderHeadingsSection(panel);
        break;
      case "headingDecoration":
        this.renderHeadingDecorationSection(panel);
        break;
      case "callout":
        this.renderCalloutSection(panel);
        break;
      case "blockquote":
        this.renderBlockquoteSection(panel);
        break;
      case "image":
        this.renderImageSection(panel);
        break;
      case "mermaid":
        this.renderMermaidSection(panel);
        break;
      case "table":
        this.renderTableSection(panel);
        break;
      case "codeBlock":
        this.renderCodeBlockSection(panel);
        break;
      case "headingGap":
        this.renderHeadingGapSection(panel);
        break;
    }
    return panel;
  }
  addGroup(groups, title, description) {
    const fields = [];
    groups.push({ title, description, fields });
    return fields;
  }
  addHeadingGroup(groups, title, description, context) {
    const levels = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };
    groups.push({ title, description, context, levels });
    return levels;
  }
  addNumber(fields, path, name, description, options = {}) {
    fields.push({ path, name, description, options: { ...inferNumberOptions(path, this.mode), ...options } });
  }
  renderBodySection(container) {
    const content = container;
    const bodyCard = this.addGroup(content, this.t("body.group"), this.t("body.groupDesc"));
    this.addNumber(bodyCard, ["body", "lineHeight"], this.t("body.lineHeight"), this.t("body.lineHeightDesc"));
    if (this.mode === "edit") {
      this.addNumber(bodyCard, ["body", "emptyLineHeightEm"], this.t("body.emptyLine"), this.t("body.emptyLineDesc"));
    } else {
      this.addNumber(bodyCard, ["body", "paragraphSpacingEm"], this.t("body.paragraphSpacing"), this.t("body.paragraphSpacingDesc"));
    }
    const listCard = this.addGroup(content, this.t("list.group"), this.t("list.groupDesc"));
    this.addNumber(listCard, ["body", "listItemStartEm"], this.t("list.itemTop"), this.t("body.listItemTopDesc"));
    this.addNumber(listCard, ["body", "listItemEndEm"], this.t("list.itemBottom"), this.t("body.listItemBottomDesc"));
    this.addNumber(listCard, ["body", "listBlockStartEm"], this.t("list.blockTop"), this.t("body.listBlockTopDesc"));
    this.addNumber(listCard, ["body", "listBlockEndEm"], this.t("list.blockBottom"), this.t("body.listBlockBottomDesc"));
  }
  renderHeadingsSection(container) {
    const content = container;
    if (this.mode === "edit") {
      const firstHeadingCard = this.addGroup(content, this.t("headings.firstLine"), this.t("headings.firstLineDesc"));
      this.addNumber(firstHeadingCard, ["headingDecoration", "firstHeadingPaddingTopPx"], this.t("headings.firstTop"), this.t("headings.firstTopDesc"));
    }
    const levels = this.addHeadingGroup(
      content,
      this.t("headings.group"),
      this.t("headings.groupDesc"),
      "headings"
    );
    for (const level of HEADING_LEVELS) {
      const fieldsContainer = levels[level];
      this.addNumber(fieldsContainer, ["headings", level, "lineHeight"], this.t("headings.lineHeight", { level: HEADING_LABELS[level] }), this.t("headings.lineHeightDesc"));
      this.addNumber(fieldsContainer, ["headings", level, "topEm"], this.t("headings.top", { level: HEADING_LABELS[level] }), this.t("headings.topDesc"));
      this.addNumber(fieldsContainer, ["headings", level, "bottomEm"], this.t("headings.bottom", { level: HEADING_LABELS[level] }), this.t("headings.bottomDesc"));
    }
  }
  renderHeadingDecorationSection(container) {
    const content = container;
    const appearanceCard = this.addGroup(content, this.t("decoration.group"), this.t("decoration.groupDesc"));
    this.addNumber(appearanceCard, ["headingDecoration", "leftPx"], this.t("decoration.left"), this.t("decoration.leftDesc"));
    this.addNumber(appearanceCard, ["headingDecoration", "widthPx"], this.t("decoration.width"), this.t("decoration.widthDesc"));
    this.addNumber(appearanceCard, ["headingDecoration", "radiusPx"], this.t("decoration.radius"), this.t("decoration.radiusDesc"));
    this.addNumber(appearanceCard, ["headingDecoration", "marginRightPx"], this.t("decoration.right"), this.t("decoration.rightDesc"), { min: 0 });
    if (this.mode === "edit") {
      this.addNumber(appearanceCard, ["headingDecoration", "firstHeadingDecorOffsetPx"], this.t("decoration.firstOffset"), this.t("decoration.firstOffsetDesc"));
    }
    const levels = this.addHeadingGroup(
      content,
      this.t("decoration.levels"),
      this.t("decoration.levelsDesc"),
      "headingDecoration"
    );
    for (const level of HEADING_LEVELS) {
      const fieldsContainer = levels[level];
      this.addNumber(fieldsContainer, ["headings", level, "decorHeightPx"], this.t("decoration.height", { level: HEADING_LABELS[level] }), this.t("decoration.heightDesc"));
      this.addNumber(fieldsContainer, ["headings", level, "decorOffsetPx"], this.t("decoration.offset", { level: HEADING_LABELS[level] }), this.t("decoration.offsetDesc"));
    }
  }
  renderCalloutSection(container) {
    const content = container;
    const appearanceCard = this.addGroup(content, this.t("callout.appearance"), this.t("callout.appearanceDesc"));
    this.addNumber(appearanceCard, ["callout", "radiusPx"], this.t("callout.radius"), this.t("callout.radiusDesc"));
    this.addNumber(appearanceCard, ["callout", "marginTopPx"], this.t("callout.marginTop"), this.t("callout.marginTopDesc"));
    this.addNumber(appearanceCard, ["callout", "marginBottomPx"], this.t("callout.marginBottom"), this.t("callout.marginBottomDesc"));
    const paddingCard = this.addGroup(content, this.t("callout.padding"), this.t("callout.paddingDesc"));
    this.addNumber(paddingCard, ["callout", "paddingTopPx"], this.t("callout.paddingTop"), this.t("callout.paddingTopDesc"));
    this.addNumber(paddingCard, ["callout", "paddingBottomPx"], this.t("callout.paddingBottom"), this.t("callout.paddingBottomDesc"));
    this.addNumber(paddingCard, ["callout", "paddingLeftPx"], this.t("callout.paddingLeft"), this.t("callout.paddingLeftDesc"));
    this.addNumber(paddingCard, ["callout", "paddingRightPx"], this.t("callout.paddingRight"), this.t("callout.paddingRightDesc"));
    const titleCard = this.addGroup(content, this.t("callout.title"), this.t("callout.titleDesc"));
    this.addNumber(titleCard, ["callout", "titleLineHeight"], this.t("callout.titleLineHeight"), this.t("callout.titleLineHeightDesc"));
    this.addNumber(titleCard, ["callout", "titlePaddingTopEm"], this.t("callout.titleTop"), this.t("callout.titleTopDesc"));
    this.addNumber(titleCard, ["callout", "titlePaddingBottomEm"], this.t("callout.titleBottom"), this.t("callout.titleBottomDesc"));
    this.addNumber(titleCard, ["callout", "titlePaddingLeftPx"], this.t("callout.titleLeft"), this.t("callout.titleLeftDesc"));
    this.addNumber(titleCard, ["callout", "titlePaddingRightPx"], this.t("callout.titleRight"), this.t("callout.titleRightDesc"));
    const specialTitleCard = this.addGroup(content, this.t("callout.specialTitle"), this.t("callout.specialTitleDesc"));
    this.addNumber(specialTitleCard, ["callout", "titleOnlyPaddingTopEm"], this.t("callout.titleOnlyTop"), this.t("callout.titleOnlyTopDesc"));
    this.addNumber(specialTitleCard, ["callout", "titleOnlyPaddingBottomEm"], this.t("callout.titleOnlyBottom"), this.t("callout.titleOnlyBottomDesc"));
    this.addNumber(specialTitleCard, ["callout", "collapsedPaddingTopEm"], this.t("callout.collapsedTop"), this.t("callout.collapsedTopDesc"));
    this.addNumber(specialTitleCard, ["callout", "collapsedPaddingBottomEm"], this.t("callout.collapsedBottom"), this.t("callout.collapsedBottomDesc"));
    const bodyCard = this.addGroup(content, this.t("context.bodyGroup"), this.t("callout.bodyDesc"));
    this.addNumber(bodyCard, ["callout", "paragraphLineHeight"], this.t("context.lineHeight"), this.t("callout.lineHeightDesc"));
    this.addNumber(bodyCard, ["callout", "paragraphSpacingEm"], this.t("context.paragraphSpacing"), this.t("callout.paragraphSpacingDesc"));
    this.addNumber(bodyCard, ["callout", "listItemStartEm"], this.t("list.itemTop"), this.t("callout.listItemTopDesc"));
    this.addNumber(bodyCard, ["callout", "listItemEndEm"], this.t("list.itemBottom"), this.t("callout.listItemBottomDesc"));
    this.addNumber(bodyCard, ["callout", "listBlockStartEm"], this.t("list.blockTop"), this.t("callout.listBlockTopDesc"));
    this.addNumber(bodyCard, ["callout", "listBlockEndEm"], this.t("list.blockBottom"), this.t("callout.listBlockBottomDesc"));
    this.addNumber(bodyCard, ["callout", "lastListEndEm"], this.t("callout.lastList"), this.t("callout.lastListDesc"));
    this.renderImageFields(content, ["callout", "image"], this.t("callout.image"), this.t("callout.imageDesc"));
    this.renderTableFields(content, ["callout", "table"], this.t("callout.table"), this.t("callout.tableDesc"));
    this.renderContextHeadings(content, "callout", this.mode === "read");
  }
  renderBlockquoteSection(container) {
    const content = container;
    const bodyCard = this.addGroup(content, this.t("context.bodyGroup"), this.t("blockquote.bodyDesc"));
    this.addNumber(bodyCard, ["blockquote", "paragraphLineHeight"], this.t("context.lineHeight"), this.t("blockquote.lineHeightDesc"));
    this.addNumber(bodyCard, ["blockquote", "paragraphSpacingEm"], this.t("context.paragraphSpacing"), this.t("blockquote.paragraphSpacingDesc"));
    this.addNumber(bodyCard, ["blockquote", "listItemStartEm"], this.t("list.itemTop"), this.t("blockquote.listItemTopDesc"));
    this.addNumber(bodyCard, ["blockquote", "listItemEndEm"], this.t("list.itemBottom"), this.t("blockquote.listItemBottomDesc"));
    this.addNumber(bodyCard, ["blockquote", "listBlockStartEm"], this.t("list.blockTop"), this.t("blockquote.listBlockTopDesc"));
    this.addNumber(bodyCard, ["blockquote", "listBlockEndEm"], this.t("list.blockBottom"), this.t("blockquote.listBlockBottomDesc"));
    this.renderTableFields(content, ["blockquote", "table"], this.t("blockquote.table"), this.t("blockquote.tableDesc"));
    this.renderContextHeadings(content, "blockquote", false);
  }
  renderContextHeadings(container, context, bottomUsesPx) {
    const label = context === "callout" ? "Callout" : this.t("context.blockquote");
    const levels = this.addHeadingGroup(
      container,
      this.t("context.headings", { context: label }),
      this.t("context.headingsDesc", { context: label }),
      `${context}-headings`
    );
    for (const level of HEADING_LEVELS) {
      const fieldsContainer = levels[level];
      const prefix = [context, "headings", level];
      this.addNumber(fieldsContainer, [...prefix, "lineHeight"], this.t("headings.lineHeight", { level: HEADING_LABELS[level] }), this.t("context.headingLineHeightDesc"));
      this.addNumber(fieldsContainer, [...prefix, "topEm"], this.t("headings.top", { level: HEADING_LABELS[level] }), this.t("context.headingTopDesc"));
      const bottomKey = bottomUsesPx ? "bottomPx" : "bottomEm";
      this.addNumber(fieldsContainer, [...prefix, bottomKey], this.t("headings.bottom", { level: HEADING_LABELS[level] }), this.t("context.headingBottomDesc"));
    }
  }
  renderImageSection(container) {
    const content = container;
    this.renderImageFields(content, ["image"], this.t("image.group"), this.t("image.groupDesc"));
  }
  renderImageFields(container, prefix, label, description) {
    const card = this.addGroup(container, label, description);
    this.addNumber(card, [...prefix, "maxWidthPct"], this.t("image.maxWidth"), this.t("image.maxWidthDesc"));
    this.addNumber(card, [...prefix, "radiusPx"], this.t("image.radius"), this.t("image.radiusDesc"));
    this.addNumber(card, [...prefix, "borderPx"], this.t("image.border"), this.t("image.borderDesc"));
    if (prefix.length === 1 && prefix[0] === "image") {
      this.addNumber(card, [...prefix, "marginTopPx"], this.t("image.marginTop"), this.t(this.mode === "edit" ? "image.marginTopEditDesc" : "image.marginTopReadDesc"), { min: 0 });
      this.addNumber(card, [...prefix, "marginBottomPx"], this.t("image.marginBottom"), this.t(this.mode === "edit" ? "image.marginBottomEditDesc" : "image.marginBottomReadDesc"), { min: 0 });
    }
  }
  renderMermaidSection(container) {
    const content = container;
    const card = this.addGroup(content, this.t("mermaid.group"), this.t("mermaid.groupDesc"));
    this.addNumber(card, ["mermaid", "portraitMaxWidthPct"], this.t("mermaid.portraitWidth"), this.t("mermaid.portraitWidthDesc"));
    this.addNumber(card, ["mermaid", "portraitAspectRatio"], this.t("mermaid.portraitRatio"), this.t("mermaid.portraitRatioDesc"), { min: 0.05, max: 5, step: 0.05 });
    this.addNumber(card, ["mermaid", "landscapeMinWidthPx"], this.t("mermaid.landscapeWidth"), this.t("mermaid.landscapeWidthDesc"), { min: 0, max: 4096, step: 10 });
  }
  renderTableSection(container) {
    const content = container;
    this.renderTableFields(content, ["table"], this.t("table.group"), this.t("table.groupDesc"));
  }
  renderTableFields(container, prefix, label, description) {
    const card = this.addGroup(container, label, description);
    this.addNumber(card, [...prefix, "cellPaddingPx"], this.t("table.cellPadding"), this.t("table.cellPaddingDesc"));
    this.addNumber(card, [...prefix, "innerBorderPx"], this.t("table.innerBorder"), this.t("table.innerBorderDesc"));
    this.addNumber(card, [...prefix, "outerBorderPx"], this.t("table.outerBorder"), this.t("table.outerBorderDesc"));
    this.addNumber(card, [...prefix, "radiusPx"], this.t("table.radius"), this.t("table.radiusDesc"));
    this.addNumber(card, [...prefix, "spacingTopPx"], this.t("table.top"), this.t("table.topDesc"));
    this.addNumber(card, [...prefix, "spacingBottomPx"], this.t("table.bottom"), this.t("table.bottomDesc"));
  }
  renderCodeBlockSection(container) {
    const content = container;
    const card = this.addGroup(content, this.t("code.group"), this.t("code.groupDesc"));
    this.addNumber(card, ["codeBlock", "lineHeight"], this.t("code.lineHeight"), this.t("code.lineHeightDesc"));
    if (this.mode === "edit") {
      this.addNumber(card, ["codeBlock", "innerSpacingEm"], this.t("code.emptyLine"), this.t("code.emptyLineDesc"));
    } else {
      this.addNumber(card, ["codeBlock", "marginTopEm"], this.t("code.top"), this.t("code.topDesc"));
      this.addNumber(card, ["codeBlock", "marginBottomEm"], this.t("code.bottom"), this.t("code.bottomDesc"));
    }
  }
  renderHeadingGapSection(container) {
    const content = container;
    this.renderHeadingGapGroup(content, "body", this.t("context.body"));
    this.renderHeadingGapGroup(content, "callout", "Callout");
    this.renderHeadingGapGroup(content, "blockquote", this.t("context.quote"));
  }
  renderHeadingGapGroup(container, context, label) {
    const card = this.addGroup(container, this.t("gap.group", { context: label }), this.t("gap.groupDesc", { context: label }));
    if (context === "body") {
      const bodyFields = [
        ["emptyLineEm", this.t("gap.emptyLine"), this.t("gap.emptyLineDesc")],
        ["paragraphEm", this.t("gap.paragraph"), this.t("gap.paragraphDesc")],
        ["listEm", this.t("gap.list"), this.t("gap.listDesc")],
        ["quoteEm", this.t("gap.quote"), this.t("gap.quoteDesc")],
        ["codeEm", this.t("gap.code"), this.t("gap.codeDesc")],
        ["tableEm", this.t("gap.table"), this.t("gap.tableDesc")],
        ["imageEm", this.t("gap.image"), this.t("gap.imageDesc")],
        ["calloutEm", this.t("gap.callout"), this.t("gap.calloutDesc")]
      ];
      for (const [key, name, description] of bodyFields) {
        this.addNumber(card, ["headingGap", "body", key], name, description);
      }
      return;
    }
    if (this.mode === "edit") {
      this.addNumber(card, ["headingGap", context, "emptyLineEm"], this.t("gap.emptyLine"), this.t("gap.contextEmptyLine", { context: label }));
    }
    const contextFields = [
      ["paragraphPx", this.t("gap.paragraph"), this.t("gap.contextParagraph", { context: label })],
      ["listPx", this.t("gap.list"), this.t("gap.contextList", { context: label })],
      ["quotePx", this.t("gap.quote"), this.t("gap.contextQuote", { context: label })],
      ["codePx", this.t("gap.code"), this.t("gap.contextCode", { context: label })],
      ["tablePx", this.t("gap.table"), this.t("gap.contextTable", { context: label })],
      ["imagePx", this.t("gap.image"), this.t("gap.contextImage", { context: label })],
      ["calloutPx", this.t("gap.callout"), this.t("gap.contextCallout", { context: label })]
    ];
    for (const [key, name, description] of contextFields) {
      this.addNumber(card, ["headingGap", context, key], name, description);
    }
  }
};

// src/settings-tab.ts
var RefinedLayoutSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.t = getTranslator();
    this.mode = "edit";
    this.legacyPage = null;
  }
  display() {
    this.renderHome(this.containerEl);
  }
  refresh() {
    if ((0, import_obsidian2.requireApiVersion)("1.13.0")) {
      this.update();
    } else {
      this.renderHome(this.containerEl);
    }
  }
  renderHome(containerEl) {
    containerEl.empty();
    containerEl.addClass("refined-layout-settings");
    const items = this.getSettingDefinitions();
    const pages = items.flatMap((item) => "items" in item ? item.items ?? [] : []);
    const page = pages.find((item) => "type" in item && item.type === "page" && item.name === this.legacyPage);
    if (page) {
      new import_obsidian2.Setting(containerEl).setName(page.name).setHeading().addExtraButton((button) => {
        button.setIcon("arrow-left").setTooltip(this.t("actions.back")).onClick(() => {
          this.legacyPage = null;
          this.refresh();
        });
      });
    }
    this.renderLegacyItems(containerEl, page?.items ?? items);
  }
  // Older hosts use the same two-level definitions, without native navigation.
  renderLegacyItems(container, items) {
    for (const item of items) {
      if ("type" in item) {
        if (item.type === "page") {
          new import_obsidian2.Setting(container).setName(item.name).setDesc(item.desc ?? "").addExtraButton((button) => button.setIcon("chevron-right").setTooltip(item.name).onClick(() => {
            this.legacyPage = item.name;
            this.refresh();
          }));
        } else {
          const group = container.createDiv({ cls: `setting-group ${item.cls ?? ""}` });
          if (item.heading) new import_obsidian2.Setting(group).setName(item.heading).setHeading();
          this.renderLegacyItems(group, item.items ?? []);
        }
      } else if ("render" in item && item.render) {
        const setting = new import_obsidian2.Setting(container).setName(item.name).setDesc(item.desc ?? "");
        item.render(setting);
      }
    }
  }
  getSettingDefinitions() {
    this.t = getTranslator(this.plugin.settings.language);
    const t = this.t;
    const mode = this.mode;
    const modes = getModeLabels(t);
    const pages = getSettingsTabs(t).map((tab) => ({
      type: "page",
      name: `${modes[mode]} \xB7 ${tab.label}`,
      desc: tab.description,
      items: [
        {
          name: tab.label,
          desc: tab.description,
          render: (setting) => {
            this.renderModule(setting, mode, tab, () => this.refresh());
          }
        },
        ...new SettingsCatalog(t, mode).build(tab).flatMap((group) => {
          const makeGroup = (heading, fields) => ({
            type: "group",
            heading,
            cls: "refined-layout-settings rl-settings-native-group",
            items: fields.map((field) => ({
              name: field.name,
              desc: field.description,
              aliases: [modes[mode], tab.label, group.title, field.path.join(" ")],
              render: (setting) => {
                this.renderNumber(setting, mode, field);
                setting.setDisabled(!this.plugin.settings[mode].modules[tab.module]);
              }
            }))
          });
          return "fields" in group ? [makeGroup(group.title, group.fields)] : HEADING_LEVELS.map((level) => makeGroup(`${group.title} \xB7 ${HEADING_LABELS[level]}`, group.levels[level]));
        })
      ]
    }));
    return [
      {
        type: "group",
        items: [
          { name: t("language.name"), desc: t("language.description"), render: (setting) => {
            this.renderLanguage(setting);
          } },
          ...[
            ["actions.export", "actions.exportDesc", () => this.plugin.exportSettings()],
            ["actions.import", "actions.importDesc", (setting) => this.pickSettingsFile(setting.controlEl)],
            ["actions.resetAll", "actions.resetAllDesc", () => this.confirmResetAll()]
          ].map(([name, desc, onClick]) => ({
            name: t(name),
            desc: t(desc),
            render: (setting) => {
              setting.addButton((button) => button.setButtonText(t(name)).onClick(() => onClick(setting)));
            }
          }))
        ]
      },
      {
        type: "group",
        cls: "rl-settings-mode-group",
        items: [{
          name: "",
          searchable: false,
          render: (setting) => {
            setting.settingEl.empty();
            setting.settingEl.addClass("refined-layout-settings", "rl-settings-mode-row");
            this.renderModeSwitch(setting.settingEl);
          }
        }]
      },
      { type: "group", items: pages }
    ];
  }
  renderModeSwitch(container) {
    const modeSwitch = container.createDiv({
      cls: "rl-settings-mode-switch",
      attr: { role: "group", "aria-label": this.t("aria.mode") }
    });
    for (const mode of ["edit", "read"]) {
      const button = modeSwitch.createEl("button", {
        cls: `rl-settings-mode-button ${this.mode === mode ? "rl-settings-mode-active" : ""}`,
        text: getModeLabels(this.t)[mode],
        attr: { type: "button", "aria-pressed": String(this.mode === mode) }
      });
      button.addEventListener("click", () => {
        if (this.mode === mode) return;
        this.mode = mode;
        this.refresh();
        this.containerEl.querySelector(".rl-settings-mode-active")?.focus();
      });
    }
  }
  renderLanguage(setting) {
    setting.setName(this.t("language.name")).setDesc(this.t("language.description")).addDropdown((dropdown) => {
      dropdown.addOptions({
        auto: this.t("language.auto"),
        "zh-CN": "\u7B80\u4F53\u4E2D\u6587",
        "zh-TW": "\u7E41\u9AD4\u4E2D\u6587",
        en: "English",
        ja: "\u65E5\u672C\u8A9E"
      }).setValue(this.plugin.settings.language).onChange((value) => {
        this.plugin.setLanguage(value);
        this.refresh();
        setting.settingEl.doc.querySelector(".rl-settings-language")?.focus();
      });
      dropdown.selectEl.addClass("rl-settings-language");
      dropdown.selectEl.setAttribute("aria-label", this.t("language.name"));
    });
  }
  confirmResetAll() {
    new ResetAllModal(this.app, getTranslator(this.plugin.settings.language), () => {
      this.plugin.resetAll();
      this.refresh();
    }).open();
  }
  pickSettingsFile(container) {
    const input = container.createEl("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.hidden = true;
    input.addEventListener("cancel", () => input.remove(), { once: true });
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();
      if (file === void 0) {
        return;
      }
      void this.plugin.importSettings(file).then((imported) => {
        if (imported) {
          this.refresh();
        }
      });
    }, { once: true });
    input.click();
  }
  renderModule(setting, mode, tab, onToggle) {
    setting.setName(tab.label).setDesc(`${getModeLabels(this.t)[mode]} \xB7 ${tab.description}`).addToggle((toggle) => {
      toggle.setValue(this.plugin.settings[mode].modules[tab.module]).onChange((value) => {
        this.plugin.setModule(mode, tab.module, value);
        onToggle(value);
      });
    }).addExtraButton((button) => {
      button.setIcon("reset").setTooltip(this.t("actions.resetSection")).onClick(() => {
        if (tab.reset === "headingDecoration") {
          this.plugin.resetHeadingDecoration(mode);
        } else {
          this.plugin.resetSection(mode, tab.reset, tab.module);
        }
        this.refresh();
      });
    });
  }
  renderNumber(setting, mode, field) {
    const { path, name, description, options: config } = field;
    setting.setName(name).setDesc(description);
    setting.addText((text) => {
      text.setValue(String(this.plugin.getNumber(mode, path)));
      text.inputEl.type = "number";
      text.inputEl.step = String(config.step);
      text.inputEl.min = String(config.min);
      text.inputEl.max = String(config.max);
      text.inputEl.addClass("rl-settings-number");
      text.onChange((rawValue) => {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed) || parsed < config.min || parsed > config.max) return;
        this.plugin.setNumber(mode, path, parsed);
      });
    });
    if (config.unit !== "") {
      setting.controlEl.createSpan({ cls: "rl-settings-unit", text: config.unit === "ratio" ? this.t("unit.ratio") : config.unit });
    }
  }
};
var ResetAllModal = class extends import_obsidian2.Modal {
  constructor(app, t, onConfirm) {
    super(app);
    this.t = t;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.setTitle(this.t("resetAll.title"));
    this.setContent(this.t("resetAll.description"));
    new import_obsidian2.Setting(this.contentEl).addButton((button) => button.setButtonText(this.t("actions.cancel")).onClick(() => this.close())).addButton((button) => button.setButtonText(this.t("actions.resetAll")).setWarning().onClick(() => {
      this.close();
      this.onConfirm();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/update-notes.ts
var import_obsidian3 = require("obsidian");

// RELEASE_NOTES.md
var RELEASE_NOTES_default = "# Refined Layout \u2014 Release Notes\n\n**English** | [\u7B80\u4F53\u4E2D\u6587](RELEASE_NOTES_zh-CN.md)\n\n## 1.0.1\n\n#### Fixed an issue where the cursor skipped some blank lines when moving up or down with the arrow keys.\n\nIn Live Preview Mode, Up/Down now stop at blank lines compressed by the plugin. Shift+Up/Down also extends selections across these lines.\n\n#### Other fixes\n\n- Fixed an issue that prevented settings from being imported.\n- Fixed missing confirmation and completion messages when resetting all settings.\n\n## 1.0.0\n\n#### Fixed an issue where the cursor skipped some blank lines when moving up or down with the arrow keys.\n\nIn Live Preview Mode, Up/Down now stop at blank lines compressed by the plugin. Shift+Up/Down also extends selections across these lines.\n\n## 0.2.0\n\n- **Native settings search:** On Obsidian 1.13 and later, search follows your selection of Live Preview Mode or reading view and provides direct access to every heading level.\n- **Simpler settings navigation:** The home page brings together global controls, the view switcher, and category links. Each category opens its own detail page with native controls.\n- **Compatibility improvements:** Configuration import and export use native element helpers, and Mermaid diagram detection works more reliably across separate windows.\n\nExisting settings and configuration files remain compatible. The minimum supported Obsidian version is 1.12.7.\n\n## 0.1.0\n\nInitial release.\n\n- **Independent view settings:** Customize Live Preview Mode and Reading view separately, with module switches and layout values for each view. Changes apply immediately and save automatically.\n- **Typography and layout controls:** Adjust line height, spacing, and appearance for body text, lists, headings, callouts, blockquotes, images, tables, and code blocks. Set the gap after headings according to the content that follows.\n- **Mermaid diagram layout:** Control diagram width and centering, with horizontal scrolling for wide diagrams.\n- **Configuration management:** Reset individual sections or all layout settings, and import or export complete configurations as JSON files.\n- **Multilingual settings:** Choose English, Simplified Chinese, Traditional Chinese, or Japanese, or follow Obsidian\u2019s language.\n";

// RELEASE_NOTES_zh-CN.md
var RELEASE_NOTES_zh_CN_default = "# Refined Layout \u66F4\u65B0\u65E5\u5FD7\n\n[English](RELEASE_NOTES.md) | **\u7B80\u4F53\u4E2D\u6587**\n\n## 1.0.1\n\n#### \u4FEE\u590D\u4E86\u4F7F\u7528\u65B9\u5411\u952E\u4E0A\u4E0B\u5BFC\u822A\u8F93\u5165\u5149\u6807\u65F6\uFF0C\u5149\u6807\u4F1A\u8DF3\u8FC7\u90E8\u5206\u7A7A\u884C\u7684\u95EE\u9898\u3002\n\n\u7F16\u8F91\u6A21\u5F0F\u4E2D\u7684\u4E0A\u3001\u4E0B\u65B9\u5411\u952E\u73B0\u5728\u53EF\u4EE5\u9010\u884C\u505C\u7559\u5728\u88AB\u63D2\u4EF6\u538B\u7F29\u7684\u7A7A\u884C\u4E0A\uFF0C\u4E5F\u652F\u6301\u4F7F\u7528 Shift + \u2191/\u2193 \u8DE8\u8D8A\u8FD9\u4E9B\u7A7A\u884C\u6269\u5C55\u9009\u533A\u3002\n\n#### \u5176\u4ED6\u4FEE\u590D\n\n- \u4FEE\u590D\u4E86\u5BFC\u5165\u914D\u7F6E\u65E0\u6CD5\u4F7F\u7528\u7684\u95EE\u9898\u3002\n- \u4FEE\u590D\u4E86\u91CD\u7F6E\u914D\u7F6E\u6CA1\u6709\u4EFB\u4F55\u63D0\u793A\u7684\u95EE\u9898\u3002\n\n## 1.0.0\n\n#### \u4FEE\u590D\u4E86\u4F7F\u7528\u65B9\u5411\u952E\u4E0A\u4E0B\u5BFC\u822A\u8F93\u5165\u5149\u6807\u65F6\uFF0C\u5149\u6807\u4F1A\u8DF3\u8FC7\u90E8\u5206\u7A7A\u884C\u7684\u95EE\u9898\u3002\n\u7F16\u8F91\u6A21\u5F0F\u4E2D\u7684\u4E0A\u3001\u4E0B\u65B9\u5411\u952E\u73B0\u5728\u53EF\u4EE5\u9010\u884C\u505C\u7559\u5728\u88AB\u63D2\u4EF6\u538B\u7F29\u7684\u7A7A\u884C\u4E0A\uFF0C\u4E5F\u652F\u6301\u4F7F\u7528 Shift + \u2191/\u2193 \u8DE8\u8D8A\u8FD9\u4E9B\u7A7A\u884C\u6269\u5C55\u9009\u533A\u3002\n\n## 0.2.0\n\n- **\u539F\u751F\u8BBE\u7F6E\u641C\u7D22\uFF1A** Obsidian 1.13 \u53CA\u4EE5\u4E0A\u7248\u672C\u652F\u6301\u641C\u7D22\u5F53\u524D\u7F16\u8F91\u6216\u9605\u8BFB\u6A21\u5F0F\u7684\u8BBE\u7F6E\uFF0C\u5E76\u53EF\u76F4\u63A5\u5B9A\u4F4D\u5404\u7EA7\u6807\u9898\u9009\u9879\u3002\n- **\u66F4\u7B80\u6D01\u7684\u8BBE\u7F6E\u5BFC\u822A\uFF1A** \u9996\u9875\u96C6\u4E2D\u63D0\u4F9B\u5168\u5C40\u914D\u7F6E\u3001\u6A21\u5F0F\u5207\u6362\u548C\u5206\u7C7B\u5165\u53E3\uFF0C\u5404\u5206\u7C7B\u5728\u72EC\u7ACB\u7684\u8BE6\u60C5\u9875\u4E2D\u4F7F\u7528\u539F\u751F\u63A7\u4EF6\u5C55\u793A\u3002\n- **\u517C\u5BB9\u6027\u6539\u8FDB\uFF1A** \u914D\u7F6E\u5BFC\u5165\u3001\u5BFC\u51FA\u91C7\u7528\u539F\u751F\u5143\u7D20\u521B\u5EFA\u65B9\u6CD5\uFF0C\u6539\u5584\u72EC\u7ACB\u7A97\u53E3\u4E2D\u7684 Mermaid \u56FE\u8868\u8BC6\u522B\u3002\n\n\u5DF2\u6709\u8BBE\u7F6E\u548C\u914D\u7F6E\u6587\u4EF6\u4FDD\u6301\u517C\u5BB9\uFF0C\u6700\u4F4E\u652F\u6301\u7684 Obsidian \u7248\u672C\u4E3A 1.12.7\u3002\n\n## 0.1.0\n\n\u9996\u6B21\u53D1\u5E03\u3002\n\n- **\u4E24\u79CD\u6A21\u5F0F\u72EC\u7ACB\u914D\u7F6E\uFF1A** \u5B9E\u65F6\u9884\u89C8\u4E0E\u9605\u8BFB\u6A21\u5F0F\u5206\u522B\u62E5\u6709\u6A21\u5757\u5F00\u5173\u548C\u6392\u7248\u53C2\u6570\uFF0C\u4FEE\u6539\u5373\u65F6\u751F\u6548\u5E76\u81EA\u52A8\u4FDD\u5B58\u3002\n- **\u6B63\u6587\u4E0E\u5185\u5BB9\u6392\u7248\uFF1A** \u8C03\u6574\u6B63\u6587\u3001\u5217\u8868\u3001\u6807\u9898\u3001Callout\uFF08\u63D0\u793A\u5757\uFF09\u3001\u5F15\u7528\u5757\u3001\u56FE\u7247\u3001\u8868\u683C\u548C\u4EE3\u7801\u5757\u7684\u884C\u9AD8\u3001\u95F4\u8DDD\u4E0E\u5916\u89C2\uFF0C\u5E76\u6309\u6807\u9898\u540E\u7D27\u63A5\u7684\u5185\u5BB9\u7C7B\u578B\u8BBE\u7F6E\u8854\u63A5\u95F4\u8DDD\u3002\n- **Mermaid \u56FE\u8868\u5E03\u5C40\uFF1A** \u63A7\u5236\u56FE\u8868\u5BBD\u5EA6\u4E0E\u5C45\u4E2D\uFF0C\u4E3A\u8F83\u5BBD\u7684\u56FE\u8868\u63D0\u4F9B\u6A2A\u5411\u6EDA\u52A8\u3002\n- **\u914D\u7F6E\u7BA1\u7406\uFF1A** \u652F\u6301\u6309\u533A\u57DF\u6216\u5168\u90E8\u6062\u590D\u9ED8\u8BA4\u6392\u7248\uFF0C\u4EE5\u53CA\u901A\u8FC7 JSON \u6587\u4EF6\u5BFC\u5165\u3001\u5BFC\u51FA\u5B8C\u6574\u914D\u7F6E\u3002\n- **\u591A\u8BED\u8A00\u8BBE\u7F6E\uFF1A** \u652F\u6301\u7B80\u4F53\u4E2D\u6587\u3001\u7E41\u4F53\u4E2D\u6587\u3001\u82F1\u6587\u3001\u65E5\u6587\uFF0C\u4E5F\u53EF\u8DDF\u968F Obsidian \u7684\u8BED\u8A00\u3002\n";

// src/update-notes.ts
function shouldShowUpdateNotes(lastSeen, currentId) {
  return lastSeen !== currentId;
}
function extractVersionNotes(markdown, version) {
  const lines = markdown.split(/\r?\n/);
  let collecting = false;
  let fence;
  const content = [];
  for (const line of lines) {
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = void 0;
    }
    const heading = !fence && /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      if (collecting) break;
      collecting = heading[1] === version;
      continue;
    }
    if (collecting) content.push(line);
  }
  return content.join("\n").trim();
}
function getUpdateNotes(preference, version, readLanguage = import_obsidian3.getLanguage) {
  const locale = selectLocale(preference, readLanguage);
  const chinese = locale === "zh-CN" || locale === "zh-TW";
  const markdown = extractVersionNotes(chinese ? RELEASE_NOTES_zh_CN_default : RELEASE_NOTES_default, version);
  if (!markdown) return null;
  return {
    id: version,
    title: chinese ? `Refined Layout ${version} \u66F4\u65B0\u8BF4\u660E` : `Refined Layout ${version} Update Notes`,
    markdown,
    close: chinese ? "\u77E5\u9053\u4E86" : "Got it"
  };
}
var UpdateNotesModal = class extends import_obsidian3.Modal {
  constructor(app, notes, onShown) {
    super(app);
    this.notes = notes;
    this.onShown = onShown;
    this.renderComponent = new import_obsidian3.Component();
  }
  async onOpen() {
    this.setTitle(this.notes.title);
    this.renderComponent.load();
    try {
      await import_obsidian3.MarkdownRenderer.render(this.app, this.notes.markdown, this.contentEl, "", this.renderComponent);
      if (!this.containerEl.isConnected) return;
      new import_obsidian3.Setting(this.contentEl).addButton((button) => button.setButtonText(this.notes.close).setCta().onClick(() => this.close()));
      this.onShown();
    } catch (error) {
      console.error("[Refined Layout] Failed to render update notes.", error);
      this.close();
    }
  }
  onClose() {
    this.renderComponent.unload();
    this.contentEl.empty();
  }
};

// src/main.ts
var ROOT_CLASS = "refined-layout-enabled";
var MERMAID_PORTRAIT_CLASS = "rl-mermaid-portrait";
var MERMAID_NATURAL_WIDTH_PROPERTY = "--rl-mermaid-natural-width";
var MERMAID_SVG_SELECTOR = ".mermaid > svg";
var MERMAID_BYPASS_SELECTOR = ".block-language-dataviewjs, .canvas-wrapper, .canvas-node";
function toKebabCase(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/_/g, "-").toLowerCase();
}
function cssVariableName(mode, path) {
  return `--rl-${mode}-${path.map(toKebabCase).join("-")}`;
}
function cssValue(key, value) {
  if (key.endsWith("Em")) {
    return `${value}em`;
  }
  if (key.endsWith("Px")) {
    return `${value}px`;
  }
  if (key.endsWith("Pct")) {
    return `${value}%`;
  }
  return String(value);
}
function collectVariables(mode, source, path = [], output = /* @__PURE__ */ new Map()) {
  for (const [key, value] of Object.entries(source)) {
    if (key === "modules") {
      continue;
    }
    const nextPath = [...path, key];
    if (typeof value === "number") {
      output.set(cssVariableName(mode, nextPath), cssValue(key, value));
    } else if (typeof value === "object" && value !== null) {
      collectVariables(mode, value, nextPath, output);
    }
  }
  return output;
}
function readNestedNumber(source, path) {
  let cursor = source;
  for (const key of path) {
    if (typeof cursor !== "object" || cursor === null || !(key in cursor)) {
      throw new Error(`Unknown settings path: ${path.join(".")}`);
    }
    cursor = cursor[key];
  }
  if (typeof cursor !== "number") {
    throw new Error(`Settings path is not numeric: ${path.join(".")}`);
  }
  return cursor;
}
function writeNestedNumber(source, path, value) {
  let cursor = source;
  for (const key of path.slice(0, -1)) {
    const next = cursor[key];
    if (typeof next !== "object" || next === null) {
      throw new Error(`Unknown settings path: ${path.join(".")}`);
    }
    cursor = next;
  }
  const lastKey = path[path.length - 1];
  if (lastKey === void 0 || typeof cursor[lastKey] !== "number") {
    throw new Error(`Settings path is not numeric: ${path.join(".")}`);
  }
  cursor[lastKey] = value;
}
var RefinedLayoutPlugin = class extends import_obsidian4.Plugin {
  constructor() {
    super(...arguments);
    this.settings = cloneDefaultSettings();
    this.appliedProperties = /* @__PURE__ */ new Set();
    this.appliedModuleClasses = /* @__PURE__ */ new Set();
    this.saveTimer = null;
    this.mermaidObserver = null;
    this.invalidMermaidSvgs = /* @__PURE__ */ new WeakSet();
    this.blankLineNavigation = createBlankLineNavigation();
    this.saveQueue = Promise.resolve();
    this.unloaded = false;
    this.updateNotesModal = null;
  }
  async onload() {
    const data = await this.loadData();
    this.settings = mergeSettings(data);
    if (data && typeof data === "object" && "lastSeenUpdateNotesId" in data && typeof data.lastSeenUpdateNotesId === "string") {
      this.lastSeenUpdateNotesId = data.lastSeenUpdateNotesId;
    }
    this.registerEditorExtension(this.blankLineNavigation.extension);
    this.applySettings();
    this.startMermaidObserver();
    this.addSettingTab(new RefinedLayoutSettingTab(this.app, this));
    this.app.workspace.onLayoutReady(() => this.showUpdateNotes());
  }
  onunload() {
    this.unloaded = true;
    this.updateNotesModal?.close();
    this.updateNotesModal = null;
    this.stopMermaidObserver();
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
      void this.savePluginData();
    }
    this.clearAppliedStyles();
  }
  showUpdateNotes() {
    if (this.unloaded || this.updateNotesModal) return;
    const notes = getUpdateNotes(this.settings.language, this.manifest.version);
    if (!notes || !shouldShowUpdateNotes(this.lastSeenUpdateNotesId, notes.id)) return;
    this.updateNotesModal = new UpdateNotesModal(this.app, notes, () => {
      if (this.unloaded) return;
      this.lastSeenUpdateNotesId = notes.id;
      void this.savePluginData();
    });
    this.updateNotesModal.open();
  }
  savePluginData() {
    const data = structuredClone({
      ...this.settings,
      lastSeenUpdateNotesId: this.lastSeenUpdateNotesId
    });
    this.saveQueue = this.saveQueue.then(() => this.saveData(data)).catch((error) => console.error("[Refined Layout] Failed to save plugin data.", error));
    return this.saveQueue;
  }
  getNumber(mode, path) {
    return readNestedNumber(this.settings[mode], path);
  }
  setNumber(mode, path, value) {
    writeNestedNumber(this.settings[mode], path, value);
    this.applyAndScheduleSave();
  }
  setModule(mode, module2, enabled) {
    this.settings[mode].modules[module2] = enabled;
    this.applyAndScheduleSave();
  }
  setLanguage(language) {
    this.settings.language = normalizeLanguagePreference(language);
    this.applyAndScheduleSave();
  }
  resetSection(mode, section, module2) {
    const defaults = cloneDefaultSettings();
    this.settings[mode].modules[module2] = defaults[mode].modules[module2];
    if (section === "headings") {
      for (const level of HEADING_LEVELS) {
        this.settings[mode].headings[level].lineHeight = defaults[mode].headings[level].lineHeight;
        this.settings[mode].headings[level].topEm = defaults[mode].headings[level].topEm;
        this.settings[mode].headings[level].bottomEm = defaults[mode].headings[level].bottomEm;
      }
      this.settings[mode].headingDecoration.firstHeadingPaddingTopPx = defaults[mode].headingDecoration.firstHeadingPaddingTopPx;
    } else {
      this.settings[mode][section] = structuredClone(defaults[mode][section]);
    }
    this.applyAndScheduleSave();
  }
  resetHeadingDecoration(mode) {
    const defaults = cloneDefaultSettings();
    const firstHeadingPaddingTopPx = this.settings[mode].headingDecoration.firstHeadingPaddingTopPx;
    this.settings[mode].headingDecoration = structuredClone(defaults[mode].headingDecoration);
    this.settings[mode].headingDecoration.firstHeadingPaddingTopPx = firstHeadingPaddingTopPx;
    for (const level of HEADING_LEVELS) {
      this.settings[mode].headings[level].decorHeightPx = defaults[mode].headings[level].decorHeightPx;
      this.settings[mode].headings[level].decorOffsetPx = defaults[mode].headings[level].decorOffsetPx;
    }
    this.applyAndScheduleSave();
  }
  resetAll() {
    const language = this.settings.language;
    this.settings = cloneDefaultSettings();
    this.settings.language = language;
    this.applyAndScheduleSave();
    new import_obsidian4.Notice(getTranslator(language)("notice.resetAll"));
  }
  exportSettings() {
    const blob = new Blob([JSON.stringify(this.settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = createEl("a");
    anchor.href = url;
    anchor.download = "refined-layout-settings.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    new import_obsidian4.Notice(getTranslator(this.settings.language)("notice.exported"));
  }
  async importSettings(file) {
    let json;
    try {
      json = await file.text();
    } catch (error) {
      console.error("[Refined Layout] Failed to read settings file.", error);
      new import_obsidian4.Notice(getTranslator(this.settings.language)("notice.readFailed"));
      return false;
    }
    let imported;
    try {
      imported = parseSettingsJson(json);
    } catch (error) {
      console.error("[Refined Layout] Invalid settings file.", error);
      new import_obsidian4.Notice(formatImportError(error, getTranslator(this.settings.language)));
      return false;
    }
    this.settings = imported;
    this.applyAndScheduleSave();
    new import_obsidian4.Notice(getTranslator(this.settings.language)("notice.imported"));
    return true;
  }
  applyAndScheduleSave() {
    this.applySettings();
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
    }
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.savePluginData();
    }, 150);
  }
  applySettings() {
    const body = document.body;
    body.classList.add(ROOT_CLASS);
    for (const className of this.appliedModuleClasses) {
      body.classList.remove(className);
    }
    this.appliedModuleClasses.clear();
    for (const mode of ["edit", "read"]) {
      for (const module2 of MODULE_KEYS) {
        if (!this.settings[mode].modules[module2]) {
          continue;
        }
        const className = `rl-${mode}-${toKebabCase(module2)}`;
        body.classList.add(className);
        this.appliedModuleClasses.add(className);
      }
    }
    const variables = /* @__PURE__ */ new Map();
    collectVariables("edit", this.settings.edit, [], variables);
    collectVariables("read", this.settings.read, [], variables);
    for (const property of this.appliedProperties) {
      if (!variables.has(property)) {
        body.style.removeProperty(property);
      }
    }
    for (const [property, value] of variables) {
      body.style.setProperty(property, value);
    }
    this.appliedProperties = new Set(variables.keys());
    this.refreshMermaidClassifications();
    this.blankLineNavigation.requestMeasure();
  }
  startMermaidObserver() {
    this.mermaidObserver = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.target.instanceOf(Element) && record.target.matches(MERMAID_SVG_SELECTOR)) {
          this.classifyMermaid(record.target);
        }
        for (const node of record.addedNodes) {
          if (!node.instanceOf(Element)) {
            continue;
          }
          if (node.matches(MERMAID_SVG_SELECTOR)) {
            this.classifyMermaid(node);
          }
          for (const svg of node.querySelectorAll(MERMAID_SVG_SELECTOR)) {
            this.classifyMermaid(svg);
          }
        }
      }
    });
    this.mermaidObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["viewBox"]
    });
    this.refreshMermaidClassifications();
  }
  stopMermaidObserver() {
    this.mermaidObserver?.disconnect();
    this.mermaidObserver = null;
  }
  refreshMermaidClassifications() {
    for (const svg of document.querySelectorAll(MERMAID_SVG_SELECTOR)) {
      this.classifyMermaid(svg);
    }
  }
  classifyMermaid(svg) {
    const container = svg.parentElement;
    if (container === null || !container.classList.contains("mermaid")) {
      throw new Error("Mermaid SVG is missing its .mermaid parent container");
    }
    if (container.closest(MERMAID_BYPASS_SELECTOR) !== null) {
      container.classList.remove(MERMAID_PORTRAIT_CLASS);
      svg.style.removeProperty(MERMAID_NATURAL_WIDTH_PROPERTY);
      return;
    }
    const mode = container.closest(".markdown-source-view.mod-cm6") !== null ? "edit" : container.closest(".markdown-preview-view.markdown-rendered") !== null ? "read" : null;
    if (mode === null || !this.settings[mode].modules.mermaid) {
      container.classList.remove(MERMAID_PORTRAIT_CLASS);
      svg.style.removeProperty(MERMAID_NATURAL_WIDTH_PROPERTY);
      return;
    }
    const { width, height } = svg.viewBox.baseVal;
    const portraitAspectRatio = this.settings[mode].mermaid.portraitAspectRatio;
    if (!isPositiveFiniteNumber(width) || !isPositiveFiniteNumber(height) || !isPositiveFiniteNumber(portraitAspectRatio)) {
      container.classList.remove(MERMAID_PORTRAIT_CLASS);
      svg.style.removeProperty(MERMAID_NATURAL_WIDTH_PROPERTY);
      if (!this.invalidMermaidSvgs.has(svg)) {
        console.error(
          "[Refined Layout] Mermaid SVG has an invalid viewBox or portrait aspect-ratio setting; diagram left unclassified.",
          { width, height, portraitAspectRatio, svg }
        );
        this.invalidMermaidSvgs.add(svg);
      }
      return;
    }
    this.invalidMermaidSvgs.delete(svg);
    svg.style.setProperty(MERMAID_NATURAL_WIDTH_PROPERTY, `${width}px`);
    container.classList.toggle(
      MERMAID_PORTRAIT_CLASS,
      isPortraitMermaid(width, height, portraitAspectRatio)
    );
  }
  clearAppliedStyles() {
    const body = document.body;
    body.classList.remove(ROOT_CLASS);
    for (const className of this.appliedModuleClasses) {
      body.classList.remove(className);
    }
    for (const property of this.appliedProperties) {
      body.style.removeProperty(property);
    }
    this.appliedModuleClasses.clear();
    this.appliedProperties.clear();
    for (const svg of document.querySelectorAll(MERMAID_SVG_SELECTOR)) {
      svg.style.removeProperty(MERMAID_NATURAL_WIDTH_PROPERTY);
    }
    for (const container of document.querySelectorAll(`.mermaid.${MERMAID_PORTRAIT_CLASS}`)) {
      container.classList.remove(MERMAID_PORTRAIT_CLASS);
    }
    this.blankLineNavigation.requestMeasure();
  }
};

/* nosourcemap */