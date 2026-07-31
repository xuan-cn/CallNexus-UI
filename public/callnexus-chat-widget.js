(function () {
  'use strict';
  var script = document.currentScript;
  if (!script) return;
  var channelKey = script.getAttribute('data-channel-key');
  if (!channelKey) {
    console.error('[CallNexus Chat] data-channel-key is required');
    return;
  }
  var baseUrl = (script.getAttribute('data-base-url') || new URL(script.src).origin).replace(/\/+$/, '');
  var title = script.getAttribute('data-title') || '在线客服';
  var color = script.getAttribute('data-color') || '#0c568f';
  var position = script.getAttribute('data-position') === 'left' ? 'left' : 'right';

  var root = document.createElement('div');
  root.setAttribute('data-callnexus-chat-widget', channelKey);
  root.style.cssText = 'position:fixed;z-index:2147483000;bottom:24px;' + position + ':24px;font-family:Arial,"Microsoft YaHei",sans-serif;';

  var frame = document.createElement('iframe');
  frame.title = title;
  frame.src = baseUrl + '/chat/' + encodeURIComponent(channelKey);
  frame.allow = 'clipboard-write';
  frame.style.cssText =
    'display:none;width:min(420px,calc(100vw - 32px));height:min(680px,calc(100vh - 110px));border:0;border-radius:16px;' +
    'background:#fff;box-shadow:0 18px 60px rgba(20,45,75,.24);margin-bottom:12px;';

  var button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', title);
  button.innerHTML = '<span style="font-size:20px">●</span><span>' + escapeHtml(title) + '</span>';
  button.style.cssText =
    'float:' + position + ';display:flex;align-items:center;gap:9px;height:48px;padding:0 18px;border:0;border-radius:24px;' +
    'color:#fff;background:' + color + ';font-size:15px;cursor:pointer;box-shadow:0 10px 28px rgba(20,45,75,.22);';

  var opened = false;
  button.addEventListener('click', function () {
    opened = !opened;
    frame.style.display = opened ? 'block' : 'none';
    button.querySelector('span:first-child').textContent = opened ? '×' : '●';
  });
  root.appendChild(frame);
  root.appendChild(button);
  document.body.appendChild(root);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
})();
