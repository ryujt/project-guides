const LABEL_ESCAPES = { '&': '#amp;', '<': '#lt;', '>': '#gt;', '"': '#quot;', '#': '#35;', '\\': '#92;', $: '#36;', ':': '#58;', '%': '#37;', '`': '#96;' };
const LABEL_PATTERN = /[&<>":]|#(?=\w+;)|\\(?=n)|\$(?=\$)|(?<=\$)\$|%(?=%)|(?<=%)%|^`|`$/gi;

/** Escape text for use inside a quoted Mermaid flowchart label. */
export function escapeMermaidLabel(text) {
  return String(text).replace(LABEL_PATTERN, character => LABEL_ESCAPES[character]);
}
