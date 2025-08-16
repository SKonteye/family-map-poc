
import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { computeLayout, computeFriendlyLayout } from './layout.js';
import { makeId, hasPartnerEdge } from './graphUtils.js';

function PersonNode({ data }) {
  const genderAccent = data.gender === 'female' ? '#d96fd9' : data.gender === 'male' ? '#3b82f6' : '#94a3b8';
  const initials = (data.name || 'New Person').split(/\s+/).slice(0,2).map(w=>w[0]?.toUpperCase()).join('');
  const isChild = data.isChild;
  return (
    <div className="person-node">
      <Handle type="target" position={Position.Top} />
      <div className="avatar" style={{ background: genderAccent }}>{initials || '?'}</div>
      <div className="info">
        <div className="title">{data?.name || 'New Person'} {isChild && <span className="child-badge" title="Child">Child</span>}</div>
        <div className="meta">
          {(data?.birth || data?.death) ? (
            <>
              {data?.birth ? `b. ${data.birth}` : ''}
              {data?.death ? ` · d. ${data.death}` : ''}
            </>
          ) : <span className="placeholder">Add details</span>}
        </div>
      </div>
      <div className="actions">
        <button onClick={data.onEdit} title="Edit">Edit</button>
        <button onClick={data.onDelete} title="Delete" className="danger">✕</button>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function UnionNode({ data }) {
  return (
    <div className="union-line-node" title="Union / Marriage">
      <Handle type="target" position={Position.Top} />
      <div className="union-line">
        <span className="union-icon" aria-hidden="true">💍</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { person: PersonNode, union: UnionNode };

const demoNodes = [
  { id: 'P1', type: 'person', data: { name: 'Awa' }, position: { x: 0, y: 0 }, style: { width: 180, height: 72 } },
  { id: 'P2', type: 'person', data: { name: 'Ibrahima' }, position: { x: 0, y: 0 }, style: { width: 180, height: 72 } },
  { id: 'C1', type: 'person', data: { name: 'Mariam' }, position: { x: 0, y: 0 }, style: { width: 180, height: 72 } },
];

const demoEdges = [
  // partner edge will be created via connect
];

export default function App() {
  const [nodes, setNodes] = useState(demoNodes);
  const [edges, setEdges] = useState(demoEdges);
  const [dir, setDir] = useState('TB'); // fixed (Left→Right removed)
  const [friendlyMode, setFriendlyMode] = useState(true);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [editingNode, setEditingNode] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBirth, setEditBirth] = useState('');
  const [editDeath, setEditDeath] = useState('');
  const [editGender, setEditGender] = useState('');
  // Handler to open edit modal
  const handleEdit = useCallback((node) => {
    setEditingNode(node);
    setEditName(node.data.name || '');
    setEditBirth(node.data.birth || '');
    setEditDeath(node.data.death || '');
    setEditGender(node.data.gender || '');
  }, []);

  // Handler to save edits
  const handleSaveEdit = useCallback(() => {
    if (!editingNode) return;
    setHistory(h => [...h, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }]);
    setFuture([]);
    setNodes((nds) => nds.map(n =>
      n.id === editingNode.id
        ? { ...n, data: { ...n.data, name: editName, birth: editBirth, death: editDeath, gender: editGender } }
        : n
    ));
  }, [editingNode, editName, editBirth, editDeath, editGender, nodes, edges, dir]);

  // Handler to delete a person node
  const handleDelete = useCallback((nodeId) => {
  setHistory(h => [...h, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }]);
  setFuture([]);
    setNodes((nds) => {
      // Remove the node
      let filtered = nds.filter(n => n.id !== nodeId);
      // If a person, check for unions that should be deleted
      const unionsToRemove = nds
        .filter(n => n.type === 'union')
        .filter(union => {
          // If this union's partners include the deleted node, remove it
          return union.data?.partners?.includes(nodeId);
        })
        .map(union => union.id);
      // Remove those unions
      filtered = filtered.filter(n => !unionsToRemove.includes(n.id));
      return filtered;
    });
    setEdges((eds) => {
      // Remove all edges connected to the deleted node
      let filtered = eds.filter(e => e.source !== nodeId && e.target !== nodeId);
      // Remove edges connected to deleted unions
      const unionIds = new Set(
        nodes
          .filter(n => n.type === 'union' && n.data?.partners?.includes(nodeId))
          .map(n => n.id)
      );
      filtered = filtered.filter(e => !unionIds.has(e.source) && !unionIds.has(e.target));
      return filtered;
    });
    if (editingNode && editingNode.id === nodeId) setEditingNode(null);
  }, [editingNode, nodes]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Connect semantics:
  // - person -> person : create or find union node, connect both as parents
  // - union -> person : add child to union
  const onConnect = useCallback(
    (connection) => {
      const source = connection.source;
      const target = connection.target;
      if (!source || !target || source === target) return;

      const srcNode = nodes.find(n => n.id === source);
      const tgtNode = nodes.find(n => n.id === target);
      if (!srcNode || !tgtNode) return;

      // person -> person: create/find union node
      if (srcNode.type === 'person' && tgtNode.type === 'person') {
  setHistory(h => [...h, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }]);
  setFuture([]);
        // Check if a union already exists for this couple
        const key = [source, target].sort().join('|');
        let unionNode = nodes.find(n => n.type === 'union' && n.data?.key === key);
        let unionId;
        let newNodes = nodes;
        if (!unionNode) {
          unionId = makeId('U');
          unionNode = {
            id: unionId,
            type: 'union',
            data: { key, partners: [source, target].sort() },
            position: { x: (srcNode.position.x + tgtNode.position.x) / 2, y: (srcNode.position.y + tgtNode.position.y) / 2 },
            style: { width: 80, height: 40 }
          };
          newNodes = [...nodes, unionNode];
        } else {
          unionId = unionNode.id;
        }
        // Connect both as parents to union
        const parentEdges = [
          { id: makeId('E'), source, target: unionId, kind: 'parent' },
          { id: makeId('E'), source: target, target: unionId, kind: 'parent' }
        ];
        const nextEdges = (() => {
          const add = parentEdges.filter(e => !edges.some(ed => ed.source === e.source && ed.target === e.target && ed.kind === 'parent'));
            return [...edges, ...add];
        })();
        const layoutFn = friendlyMode ? computeFriendlyLayout : computeLayout;
  const { nodes: laidNodes, edges: laidEdges } = layoutFn(newNodes, nextEdges, 'TB');
        setNodes(laidNodes);
        setEdges(laidEdges);
        return;
      }

      // union -> person: add child
    if (srcNode.type === 'union' && tgtNode.type === 'person') {
  setHistory(h => [...h, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }]);
  setFuture([]);
  const nextEdges = [...edges, { id: makeId('E'), source, target, kind: 'child' }];
  const layoutFn = friendlyMode ? computeFriendlyLayout : computeLayout;
  const { nodes: laidNodes, edges: laidEdges } = layoutFn(nodes, nextEdges, 'TB');
  setNodes(laidNodes);
  setEdges(laidEdges);
        return;
      }

      alert('Connect person→person to create a union, or union→person to add a child.');
    },
    [nodes, edges, dir, friendlyMode]
  );

  const layout = useCallback(() => {
    // Always top-bottom now
    const direction = 'TB';
    setHistory(h => [...h, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }]);
    setFuture([]);
    const layoutFn = friendlyMode ? computeFriendlyLayout : computeLayout;
  const { nodes: laid, edges: eds } = layoutFn(nodes, edges, 'TB');
    setNodes(laid);
    setEdges(eds);
    setDir(direction);
  }, [nodes, edges, dir, friendlyMode]);

  const addPerson = useCallback(() => {
    const id = makeId('P');
    setHistory(h => [...h, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }]);
    setFuture([]);
    setNodes((nds) => [
      ...nds,
      { id, type: 'person', data: { name: 'New Person' }, position: { x: 40, y: 40 }, style: { width: 180, height: 72 } },
    ]);
  }, [nodes, edges, dir]);

  const exportJSON = useCallback(() => {
    const obj = { nodes, edges, layoutDirection: dir };
    const defaultBase = `family-map-${new Date().toISOString().slice(0,10)}`;
    const input = window.prompt('Enter filename (without extension):', defaultBase);
    if (input === null) return; // user cancelled
    const trimmed = input.trim() || defaultBase;
    // Sanitize filename: allow alphanum, dash, underscore
    const safeBase = trimmed.replace(/[^a-z0-9-_]/gi, '_').replace(/_+/g,'_');
    const filename = safeBase.toLowerCase().endsWith('.json') ? safeBase.toLowerCase() : safeBase.toLowerCase() + '.json';
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed');
      console.error('Export error', e);
    }
  }, [nodes, edges, dir]);

  const onImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { nodes: n, edges: ed, layoutDirection } = JSON.parse(reader.result);
  setHistory(h => [...h, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }]);
  setFuture([]);
        setNodes(n || []);
        setEdges(ed || []);
        if (layoutDirection) setDir(layoutDirection);
      } catch (err) {
        alert('Invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const previous = history[history.length - 1];
    const current = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir };
    setHistory(h => h.slice(0, h.length - 1));
    setFuture(f => [...f, current]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
    setDir(previous.dir || 'TB');
  }, [canUndo, history, nodes, edges, dir]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const next = future[future.length - 1];
    const current = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir };
    setFuture(f => f.slice(0, f.length - 1));
    setHistory(h => [...h, current]);
    setNodes(next.nodes);
    setEdges(next.edges);
    setDir(next.dir || 'TB');
  }, [canRedo, future, nodes, edges, dir]);

  React.useEffect(() => {
    const handler = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (mod && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Baseline snapshot once on mount
  React.useEffect(() => {
    setHistory(h => h.length === 0 ? [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }] : h);
    // Apply initial layout using current mode
    const layoutFn = friendlyMode ? computeFriendlyLayout : computeLayout;
  const { nodes: laid, edges: eds } = layoutFn(nodes, edges, 'TB');
    setNodes(laid);
    setEdges(eds);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app">
      <div className="toolbar">
        <button onClick={addPerson}>Add Person</button>
  <button onClick={undo} disabled={!canUndo}>Undo</button>
  <button onClick={redo} disabled={!canRedo}>Redo</button>
  <button onClick={layout}>Auto-layout (Top→Bottom)</button>
        <button onClick={() => {
          setHistory(h => [...h, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)), dir }]);
          setFuture([]);
          setFriendlyMode(m => !m);
          // Re-run current layout using new mode
          const layoutFn = !friendlyMode ? computeFriendlyLayout : computeLayout; // !friendlyMode is the new value
          const { nodes: laid, edges: eds } = layoutFn(nodes, edges, dir);
          setNodes(laid);
          setEdges(eds);
        }}>
          Friendly Mode: {friendlyMode ? 'On' : 'Off'}
        </button>
        <span className="badge">Drag: person→person to link partners; union→person to add child.</span>
        <button onClick={exportJSON}>Export JSON</button>
        <label className="import">
          Import JSON
          <input type="file" accept="application/json" onChange={onImport} />
        </label>
      </div>
  <div className="canvas">
        <ReactFlow
          nodes={nodes.map(node => {
            if (node.type === 'person') {
              // Mark as child if any edge is a child edge to this node
              const isChild = edges.some(e => e.kind === 'child' && e.target === node.id);
              return { ...node, data: { ...node.data, onEdit: () => handleEdit(node), onDelete: () => handleDelete(node.id), isChild } };
            }
            return node;
          })}
          edges={edges.map(e => ({
            ...e,
            type: 'smoothstep', // all edges are smooth, tree-like
            animated: false,
            label: undefined
          }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => { if (node.type === 'person') handleEdit(node); }}
          nodeTypes={nodeTypes}
          fitView
          proOptions={proOptions}
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
        <button className="fab" onClick={addPerson} title="Add Person">＋</button>
      </div>
      <div className="side-panel">
        {editingNode ? (
          <>
            <h3>Edit Person</h3>
            <div className="form-group">
              <label>Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={editGender} onChange={e => setEditGender(e.target.value)}>
                <option value="">Unspecified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="form-group">
              <label>Birth</label>
              <input value={editBirth} onChange={e => setEditBirth(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Death</label>
              <input value={editDeath} onChange={e => setEditDeath(e.target.value)} />
            </div>
            <div style={{display:'flex', gap:'8px'}}>
              <button className="primary" onClick={handleSaveEdit}>Save Changes</button>
              <button className="danger" onClick={() => { handleDelete(editingNode.id); setEditingNode(null); }}>Delete</button>
              <button onClick={() => setEditingNode(null)}>Close</button>
            </div>
          </>
        ) : (
          <div className="empty-state">Select a person node to edit details.</div>
        )}
      </div>
    </div>
  );
}
