// assets/highlight.js
// WHAT: A tiny JavaScript syntax highlighter: turns code text into HTML with
//       <span class="tok-..."> around comments, strings, numbers, keywords and calls.
// WHY:  The playground editor and the example pages need colored code, and a full
//       library (Prism, highlight.js) is far more than we need. One regular
//       expression with one group per token kind does the whole job in one pass.
// DOC:  colors live in assets/kindling.css (.tok-comment, .tok-string, ...)
//
// Usage:
//   import { highlight } from "../assets/highlight.js";
//   pre.innerHTML = highlight(sourceCode);

const KEYWORDS = new Set([
  "import", "from", "export", "default", "const", "let", "var", "function", "return",
  "if", "else", "for", "while", "do", "of", "in", "new", "class", "extends", "this",
  "true", "false", "null", "undefined", "typeof", "instanceof", "break", "continue",
  "switch", "case", "async", "await", "try", "catch", "finally", "throw", "yield", "static", "get", "set",
]);

// The order of the groups matters: a comment wins over a string inside it, and so on.
const TOKEN = new RegExp([
  "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)",                       // 1 comment
  "(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`)", // 2 string
  "(\\b(?:0x[0-9a-fA-F]+|\\d+\\.?\\d*(?:e[+-]?\\d+)?|\\.\\d+)\\b)",  // 3 number
  "([A-Za-z_$][\\w$]*)",                                           // 4 word
].join("|"), "g");

function escapeHTML(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function highlight(code) {
  let html = "";
  let last = 0;
  TOKEN.lastIndex = 0;
  let match;
  while ((match = TOKEN.exec(code))) {
    html += escapeHTML(code.slice(last, match.index));
    const [whole, comment, string, number, word] = match;
    let kind = "";
    if (comment) kind = "comment";
    else if (string) kind = "string";
    else if (number) kind = "number";
    else if (word && KEYWORDS.has(word)) kind = "keyword";
    // A word followed by "(" is a function call or definition.
    else if (word && /^\s*\(/.test(code.slice(TOKEN.lastIndex, TOKEN.lastIndex + 4))) kind = "function";
    html += kind ? '<span class="tok-' + kind + '">' + escapeHTML(whole) + "</span>" : escapeHTML(whole);
    last = TOKEN.lastIndex;
  }
  return html + escapeHTML(code.slice(last));
}
