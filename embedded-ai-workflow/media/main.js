(function(){
  const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
  const generateBtn = document.getElementById('generate');
  const workflowTextarea = document.getElementById('workflowJson');
  const statusEl = document.getElementById('status');
  const platformSel = document.getElementById('platform');
  const importBtn = document.getElementById('importJson');
  const exportBtn = document.getElementById('exportJson');

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

  // Node library: clicking a node template inserts into JSON
  function setupNodeLibrary(){
    const lib = document.getElementById('nodeLibrary');
    if (!lib) return;
    lib.addEventListener('click', (e)=>{
      const target = e.target;
      if (!target || !target.classList || !target.classList.contains('node')) return;
      try {
        const raw = workflowTextarea && 'value' in workflowTextarea ? workflowTextarea.value : '';
        const wf = JSON.parse(raw || '{"nodes":[],"edges":[]}');
        wf.nodes = Array.isArray(wf.nodes) ? wf.nodes : [];
        const type = target.getAttribute('data-node-type') || 'Node';
        const label = target.getAttribute('data-node-label') || type;
        const nextId = computeNextId(wf.nodes);
        wf.nodes.push({ id: nextId, type, label });
        workflowTextarea.value = JSON.stringify(wf, null, 2);
        setStatus('success', `已添加节点：${type}`);
      } catch (e) {
        setStatus('error', `无法添加节点，JSON 解析失败：${e && e.message ? e.message : String(e)}`);
      }
    });
  }

  function computeNextId(nodes){
    let maxId = 0;
    if (Array.isArray(nodes)){
      for (const n of nodes){
        const v = typeof n.id === 'number' ? n.id : parseInt(n.id, 10);
        if (!isNaN(v)) maxId = Math.max(maxId, v);
      }
    }
    return maxId + 1;
  }

  if (generateBtn && vscode) {
    generateBtn.addEventListener('click', () => {
      try {
        const raw = workflowTextarea && 'value' in workflowTextarea ? workflowTextarea.value : '';
        const json = JSON.parse(raw || '{}');
        const platform = platformSel && 'value' in platformSel ? platformSel.value : 'stm32-hal';
        setStatus('info', '已提交生成请求...');
        vscode.postMessage({ type: 'generate-code', workflow: json, platform });
      } catch (e) {
        setStatus('error', `JSON 解析失败：${e && e.message ? e.message : String(e)}`);
      }
    });
  }

  if (importBtn && vscode) {
    importBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'import-workflow' });
    });
  }

  if (exportBtn && vscode) {
    exportBtn.addEventListener('click', () => {
      try {
        const raw = workflowTextarea && 'value' in workflowTextarea ? workflowTextarea.value : '';
        const json = JSON.parse(raw || '{}');
        vscode.postMessage({ type: 'export-workflow', workflow: json });
      } catch (e) {
        setStatus('error', `无法导出，JSON 解析失败：${e && e.message ? e.message : String(e)}`);
      }
    });
  }

  window.addEventListener('message', (event)=>{
    const msg = event.data;
    if (!msg || !msg.type) return;
    if (msg.type === 'status') {
      setStatus(msg.level || 'info', msg.text || '');
    } else if (msg.type === 'workflow-loaded') {
      if (workflowTextarea) {
        workflowTextarea.value = JSON.stringify(msg.workflow || {}, null, 2);
        setStatus('success', '已导入工作流 JSON');
      }
    } else if (msg.type === 'save-complete') {
      setStatus('success', '已导出工作流 JSON');
    }
  });

  setupNodeLibrary();
})();