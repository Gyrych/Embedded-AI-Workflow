(function () {
  const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;

  // Guard globals from vendor scripts
  if (typeof Rete === 'undefined' || typeof VueRenderPlugin === 'undefined' || typeof ConnectionPlugin === 'undefined' || typeof AreaPlugin === 'undefined') {
    console.error('Missing Rete or plugins');
    return;
  }

  const container = document.getElementById('editor');
  if (!container) {
    console.error('#editor container not found');
    return;
  }

  const anySocket = new Rete.Socket('Any');

  class GpioInComponent extends Rete.Component {
    constructor() { super('GPIO In'); }
    async builder(node) {
      const out = new Rete.Output('out', 'Out', anySocket);
      node.addOutput(out);
      return node;
    }
    worker() {}
  }

  class GpioOutComponent extends Rete.Component {
    constructor() { super('GPIO Out'); }
    async builder(node) {
      const inp = new Rete.Input('in', 'In', anySocket);
      node.addInput(inp);
      return node;
    }
    worker() {}
  }

  class UartComponent extends Rete.Component {
    constructor() { super('UART'); }
    async builder(node) {
      const inp = new Rete.Input('in', 'In', anySocket);
      const out = new Rete.Output('out', 'Out', anySocket);
      node.addInput(inp);
      node.addOutput(out);
      return node;
    }
    worker() {}
  }

  class TaskComponent extends Rete.Component {
    constructor() { super('Task'); }
    async builder(node) {
      const inp = new Rete.Input('in', 'In', anySocket);
      const out = new Rete.Output('out', 'Out', anySocket);
      node.addInput(inp);
      node.addOutput(out);
      return node;
    }
    worker() {}
  }

  const editor = new Rete.NodeEditor('embedded-ai@1.0.0', container);
  editor.use(ConnectionPlugin.default);
  editor.use(AreaPlugin);
  editor.use(VueRenderPlugin.default);

  const engine = new Rete.Engine('embedded-ai@1.0.0');

  const components = [
    new GpioInComponent(),
    new GpioOutComponent(),
    new UartComponent(),
    new TaskComponent()
  ];

  components.forEach(c => {
    editor.register(c);
    engine.register(c);
  });

  function nextId(prefix) {
    const n = Math.floor(Math.random() * 100000);
    return `${prefix}-${n}`;
  }

  async function addNode(componentName, x, y) {
    const comp = components.find(c => c.name === componentName);
    if (!comp) return;
    const node = await comp.createNode({});
    node.id = editor.nodes.length ? Math.max(...editor.nodes.map(n => n.id)) + 1 : 1;
    node.position = [x, y];
    editor.addNode(node);
  }

  function getCenterPosition() {
    const rect = container.getBoundingClientRect();
    const x = rect.width / 2 - 100 + Math.random() * 40 - 20;
    const y = rect.height / 2 - 40 + Math.random() * 40 - 20;
    return [x, y];
  }

  function hookButton(id, componentName) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', async () => {
      const [x, y] = getCenterPosition();
      await addNode(componentName, x, y);
    });
  }

  hookButton('add-gpio-in', 'GPIO In');
  hookButton('add-gpio-out', 'GPIO Out');
  hookButton('add-uart', 'UART');
  hookButton('add-task', 'Task');

  const generateBtn = document.getElementById('generate');
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      try {
        const json = editor.toJSON();
        if (vscode) vscode.postMessage({ type: 'generateCode', payload: json });
      } catch (err) {
        console.error('Failed to export workflow', err);
      }
    });
  }

  function resize() {
    editor.view.resize();
  }
  window.addEventListener('resize', resize);
  resize();

  // Seed example nodes
  (async () => {
    await addNode('GPIO In', 80, 80);
    await addNode('Task', 380, 120);
  })();
})();