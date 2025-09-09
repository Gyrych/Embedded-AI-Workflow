(function(){
  const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;
  const button = document.getElementById('action');
  if (button) {
    button.addEventListener('click', () => {
      if (vscode) {
        vscode.postMessage({ type: 'hello', text: 'Hello from Webview' });
      }
    });
  }
})();