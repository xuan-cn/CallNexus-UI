const escapeHtml = (value: string) =>
  (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const trimTrailingPunctuation = (value: string) => {
  const match = value.match(/[),，。.!！？?；;：:]+$/);
  if (!match) return { url: value, trailing: '' };
  return { url: value.slice(0, -match[0].length), trailing: match[0] };
};

const miniProgramLinkRegex = /#小程序:\/\/[^\s<>"']+/gi;
const webUrlRegex = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

export const renderTextWithLinks = (value?: string) => {
  const escaped = escapeHtml(value || '');
  return escaped
    .replace(miniProgramLinkRegex, (matched) => {
      const { url, trailing } = trimTrailingPunctuation(matched);
      if (!url) return matched;
      return `<a href="javascript:void(0)" data-miniprogram-link="${url}" title="点击复制小程序链接">${url}</a>${trailing}`;
    })
    .replace(webUrlRegex, (matched) => {
      const { url, trailing } = trimTrailingPunctuation(matched);
      if (!url) return matched;
      const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>${trailing}`;
    })
    .replace(/\n/g, '<br>');
};

export const copyMiniProgramLinkFromEvent = async (event: MouseEvent) => {
  const target = event.target as HTMLElement | null;
  const link = target?.closest<HTMLAnchorElement>('a[data-miniprogram-link]');
  const miniProgramLink = link?.dataset.miniprogramLink;
  if (!miniProgramLink) return false;

  event.preventDefault();
  event.stopPropagation();

  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(miniProgramLink);
    return true;
  }

  const textArea = document.createElement('textarea');
  textArea.value = miniProgramLink;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  textArea.style.top = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textArea);
  return copied;
};
