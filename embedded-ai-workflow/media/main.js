(function(){
  const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
  const generateBtn = document.getElementById('generate');
  const workflowTextarea = document.getElementById('workflowJson');
  const statusEl = document.getElementById('status');

  function setStatus(level, text){
    if (!statusEl) return;
    const color = level === 'error' ? '#ef4444' : level === 'warn' ? '#f59e0b' : level === 'success' ? '#22c55e' : '#9ca3af';
    const prefix = level === 'error' ? '错误' : level === 'warn' ? '警告' : level === 'success' ? '成功' : '状态';
    statusEl.innerHTML = `<div style="white-space:pre-wrap;line-height:1.4;color:${color}"><strong>${prefix}:</strong> ${escapeHtml(String(text))}</div>`;
  }

  function escapeHtml(str){
    return str.replace(/[&<>"']/g, (c)=>({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    })[c] || c);
  }

  if (generateBtn && vscode) {
    generateBtn.addEventListener('click', () => {
      try {
        const raw = workflowTextarea && 'value' in workflowTextarea ? workflowTextarea.value : '';
        const json = JSON.parse(raw || '{}');
        setStatus('info', '已提交生成请求...');
        vscode.postMessage({ type: 'generate-code', workflow: json });
      } catch (e) {
        setStatus('error', `JSON 解析失败：${e && e.message ? e.message : String(e)}`);
      }
    });
  }

  window.addEventListener('message', (event)=>{
    const msg = event.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'status') {
      setStatus(msg.level || 'info', msg.text || '');
    }
  });
})();