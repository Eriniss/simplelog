export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const renderMarkdown = (content: string): string => {
  let html = escapeHtml(content);

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

export const getPreview = (content: string, maxLength: number = 50): string => {
  const text = content.replace(/[#*\-]/g, '').trim();
  return text.length > maxLength
    ? text.substring(0, maxLength) + '...'
    : text;
};

export const countAllComments = (comments: any[]): number => {
  let count = comments.length;
  for (const comment of comments) {
    if (comment.Replies && comment.Replies.length > 0) {
      count += countAllComments(comment.Replies);
    }
  }
  return count;
};
