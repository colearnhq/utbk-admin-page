export const toHtml = (text) => {
  let html = text;

  // Code blocks (must be processed before other formatting)
  html = html.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Tables
  html = html.replace(
    /(\|.+\|[\r\n]+\|[-\s|:]+\|[\r\n]+(?:\|.+\|[\r\n]*)*)/g,
    (match) => {
      const lines = match.trim().split(/[\r\n]+/);
      const headerLine = lines[0];
      const bodyLines = lines.slice(2);

      // Parse header
      const headerCells = headerLine
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell);
      const headerRow = `<tr>${headerCells
        .map((cell) => `<th>${cell}</th>`)
        .join("")}</tr>`;

      // Parse body rows
      const bodyRows = bodyLines
        .map((line) => {
          if (!line.trim()) return "";
          const cells = line
            .split("|")
            .map((cell) => cell.trim())
            .filter((cell) => cell);
          return `<tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr>`;
        })
        .filter((row) => row)
        .join("");

      return `<table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
    }
  );

  // Headers
  html = html.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
  html = html.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
  html = html.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Strikethrough
  html = html.replace(/~~(.*?)~~/g, "<del>$1</del>");

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Process underscores but avoid those in LaTeX expressions
  html = html.replace(/_([^_\n]+?)_/g, (match, content, offset, string) => {
    // Find if we're inside a LaTeX math expression (between $ signs)
    const beforeMatch = string.substring(0, offset);
    // const afterMatch = string.substring(offset + match.length);

    // Count unescaped dollar signs before and after
    const dollarsBefore = (beforeMatch.match(/(?<!\\)\$/g) || []).length;
    // const dollarsAfter = (afterMatch.match(/(?<!\\)\$/g) || []).length;

    // If odd number of dollars before, we're inside a math expression
    if (dollarsBefore % 2 === 1) {
      return match;
    }

    // Don't process if the underscore appears to be in a LaTeX context
    if (content.includes("\\") || content.match(/[a-zA-Z]+\{.*\}/)) {
      return match;
    }
    return `<em>${content}</em>`;
  });
  html = html.replace(/\*\*_(.*?)_\*\*/g, "<strong><em>$1</em></strong>");

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />');

  // Blockquotes
  html = html.replace(/^> (.*$)/gim, "<blockquote>$1</blockquote>");

  // Lists - process line by line to handle consecutive items
  const lines = html.split("\n");
  const processedLines = [];
  let inOrderedList = false;
  let inUnorderedList = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const isOrderedItem = /^\d+\.\s(.*)/.test(line);
    const isUnorderedItem = /^[-*+]\s(.*)/.test(line);

    if (isOrderedItem) {
      const content = line.replace(/^\d+\.\s(.*)/, "$1");
      if (!inOrderedList) {
        if (inUnorderedList) {
          processedLines.push("</ul>");
          inUnorderedList = false;
        }
        processedLines.push("<ol>");
        inOrderedList = true;
      }
      processedLines.push(`<li>${content}</li>`);
    } else if (isUnorderedItem) {
      const content = line.replace(/^[-*+]\s(.*)/, "$1");
      if (!inUnorderedList) {
        if (inOrderedList) {
          processedLines.push("</ol>");
          inOrderedList = false;
        }
        processedLines.push("<ul>");
        inUnorderedList = true;
      }
      processedLines.push(`<li>${content}</li>`);
    } else {
      if (inOrderedList) {
        processedLines.push("</ol>");
        inOrderedList = false;
      }
      if (inUnorderedList) {
        processedLines.push("</ul>");
        inUnorderedList = false;
      }
      processedLines.push(line);
    }
  }

  // Close any remaining lists
  if (inOrderedList) processedLines.push("</ol>");
  if (inUnorderedList) processedLines.push("</ul>");

  html = processedLines.join("\n");

  // Convert line breaks to <br> tags
  html = html.replace(/\n/g, "<br>");

  // Remove <br> tags that appear immediately after closing block elements
  html = html.replace(
    /<\/(h[1-6]|ol|ul|li|blockquote|pre|table)><br>/g,
    "</$1>"
  );

  // Remove <br> tags that appear immediately before opening block elements
  html = html.replace(
    /<br><(h[1-6]|ol|ul|li|blockquote|pre|table)([^>]*>)/g,
    "<$1$2"
  );

  // Remove <br> tags inside list items (lists handle their own spacing)
  html = html.replace(/<li>([^<]*)<br>/g, "<li>$1");
  html = html.replace(/<br>([^<]*)<\/li>/g, "$1</li>");

  return html;
};