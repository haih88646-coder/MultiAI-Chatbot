function formatForTelegram(text) {
  if (!text) return '';
  
  let formatted = text;

  // Escape HTML special chars first to prevent injection
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Extract and protect code blocks FIRST (``` ... ```)
  const codeBlocks = [];
  formatted = formatted.replace(/```[\s\S]*?```/g, match => {
    codeBlocks.push(match);
    return `§CB${codeBlocks.length - 1}§`;
  });

  // Extract and protect inline code (`...`)
  const inlineCodes = [];
  formatted = formatted.replace(/`[^`]+`/g, match => {
    inlineCodes.push(match);
    return `§IC${inlineCodes.length - 1}§`;
  });

  // Headers (# ## ### #### ##### ######)
  formatted = formatted.replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>');

  // Bold (**text** or __text__)
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  formatted = formatted.replace(/__(.+?)__/g, '<b>$1</b>');

  // Italic (*text* or _text_)
  formatted = formatted.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<i>$1</i>');
  formatted = formatted.replace(/_(.+?)_/g, '<i>$1</i>');

  // Strikethrough (~~text~~)
  formatted = formatted.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Blockquotes (> text)
  formatted = formatted.replace(/^&gt;\s*(.+)$/gm, '▸ $1');

  // Unordered lists (- item or • item)
  formatted = formatted.replace(/^[\-\•]\s+(.+)$/gm, '• $1');

  // Ordered lists (1. item)
  formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, (match, num, text) => `${num}. ${text}`);

  // Links [text](url) - convert to plain text with URL
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1\n$2');

  // Horizontal rules (---, ***, ___) - remove
  formatted = formatted.replace(/^[-*_]{3,}\s*$/gm, '─────────────────');

  // Restore inline code
  inlineCodes.forEach((code, i) => {
    const cleanCode = code.replace(/^`|`$/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    formatted = formatted.replace(`§IC${i}§`, `<code>${cleanCode}</code>`);
  });

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    const cleanBlock = block
      .replace(/^```\w*\n?/, '')
      .replace(/\n?```$/, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    formatted = formatted.replace(`§CB${i}§`, `<pre>${cleanBlock}</pre>`);
  });

  // Clean up excessive blank lines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
}

module.exports = { formatForTelegram };
