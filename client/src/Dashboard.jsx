"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  memo,
} from "react";


const API_URL = "http://localhost:5000/api/nodes";
const WS_URL = "ws://localhost:5000";
const NODE_COUNT = 10_000;
const CANVAS_W = 8400;
const CANVAS_H = 6400;
const HISTORY_COUNT = 120;

const ZOOM_MIN = 0.10;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.10;


const PROJECTS = [
  { id: "medhub-core", label: "MedHub Enterprise Command" }, 
  { id: "nexus-global-core", label: "Global Health Mesh (10k Nodes)" }, 
  { id: "alpha-1", label: "Engineering Alpha" },
  { id: "design-system", label: "Design System" },
];


const STATUSES = ["active", "idle", "error", "offline"];
const PREFIXES = [
  "PROC","DATA","LINK","SYNC","AUTH","HASH","PIPE","GATE",
  "NODE","CORE","CELL","GRID","MESH","BYTE","FLUX","WIRE",
];
const SUFFIXES = [
  "alpha","beta","gamma","delta","sigma","omega","theta","kappa",
  "prime","relay","proxy","cache","queue","stack","pulse","drift",
];

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateNodes(count) {
  const rand = seededRandom(42);
  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  const nodes = [];

  for (let i = 0; i < count; i++) {
    const prefix = PREFIXES[Math.floor(rand() * PREFIXES.length)];
    const suffix = SUFFIXES[Math.floor(rand() * SUFFIXES.length)];
    const id = `n-${i.toString(16).padStart(4, "0")}`;

    const isOrphan = rand() < 0.05;
    let parentId = null;
    if (isOrphan) {
      parentId = `deleted-${Math.floor(rand() * 9999)}`;
    } else if (i > 0 && rand() < 0.4) {
      parentId = `n-${Math.floor(rand() * i).toString(16).padStart(4, "0")}`;
    }

    nodes.push({
      id,
      title: `${prefix}-${suffix}-${i.toString(16).toUpperCase().padStart(3, "0")}`,
      status: STATUSES[Math.floor(rand() * STATUSES.length)],
      x: Math.floor(rand() * 8000),
      y: Math.floor(rand() * 6000),
      width: 180,
      height: 48,
      parentId,
      lastModified: Math.floor(twoHoursAgo + rand() * (now - twoHoursAgo)),
    });
  }
  return nodes;
}

function generateHistory(count) {
  const entries = [];
  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;
  for (let i = 0; i < count; i++) {
    const t = twoHoursAgo + (i / (count - 1)) * (now - twoHoursAgo);
    entries.push({
      id: `h-${i}`,
      timestamp: Math.floor(t),
      label: `Snapshot ${i + 1}`,
      nodeCount: 8000 + Math.floor(Math.random() * 4000),
    });
  }
  return entries;
}


function isNodeVisible(node, viewport, buffer = 100) {
  const vL = viewport.scrollX - buffer;
  const vT = viewport.scrollY - buffer;
  const vR = viewport.scrollX + viewport.windowWidth + buffer;
  const vB = viewport.scrollY + viewport.windowHeight + buffer;
  const nR = node.x + node.width;
  const nB = node.y + node.height;
  if (node.x > vR) return false;
  if (nR < vL) return false;
  if (node.y > vB) return false;
  if (nB < vT) return false;
  return true;
}

function findOrphanNodes(nodes, nodeMap) {
  return nodes.filter((n) => n.parentId !== null && !nodeMap.has(n.parentId));
}function filterNodesByTime(nodes, currentTime, draggingNodeId) {
  return nodes.filter(
    (n) => n.lastModified <= (currentTime + 2000) || n.id === draggingNodeId
  );
}

const DOT_COLOR = {
  active: "#00ff00",
  idle: "#ffcc00",
  error: "#e63333",
  offline: "#4d4d4d",
};
const DOT_SHADOW = {
  active: "0 0 6px rgba(0,255,0,0.6)",
  idle: "none",
  error: "0 0 6px rgba(230,51,51,0.6)",
  offline: "none",
};

const CanvasNode = memo(function CanvasNode({
  node,
  isSelected,
  isFound,
  onSelect,
  onDragEnd,
  onDragStart,
  onContextMenu: onCtxMenu,
  zoom,
}) {
  const dragRef = useRef(null);
  const elRef = useRef(null);

  const handlePointerDown = useCallback(
    (e) => {
      if (e.button === 2) return; 
      e.preventDefault();
      const el = elRef.current;
      if (!el) return;
      el.setPointerCapture(e.pointerId);
      dragRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startNodeX: node.x,
        startNodeY: node.y,
        dragging: false,
      };
    },
    [node.x, node.y]
  );

  const handlePointerMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (e.clientX - d.startMouseX) / zoom;
      const dy = (e.clientY - d.startMouseY) / zoom;
      if (!d.dragging && Math.abs(dx) + Math.abs(dy) > 3) {
        d.dragging = true;
        onDragStart(node.id);
      }
      if (d.dragging && elRef.current) {
        elRef.current.style.left = `${d.startNodeX + dx}px`;
        elRef.current.style.top = `${d.startNodeY + dy}px`;
      }
    },
    [zoom, node.id, onDragStart]
  );

  const handlePointerUp = useCallback(
    (e) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d) return;
      if (d.dragging) {
        const nx = d.startNodeX + (e.clientX - d.startMouseX) / zoom;
        const ny = d.startNodeY + (e.clientY - d.startMouseY) / zoom;
        onDragEnd(node.id, Math.max(0, nx), Math.max(0, ny));
      } else {
        onSelect(node.id);
      }
    },
    [node.id, onSelect, onDragEnd, zoom]
  );

  const handleContextMenu = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      onCtxMenu(node.id, e.clientX, e.clientY);
    },
    [node.id, onCtxMenu]
  );

  return (
  <button
    ref={elRef}
    type="button"
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    onContextMenu={handleContextMenu}
    className={`absolute flex items-center gap-2 px-3 font-mono text-xs border 
    transition-colors duration-100   /* IMPORTANT: only colors */
    cursor-grab active:cursor-grabbing select-none touch-none ${
      isSelected
        ? "neon-border border-[#00ff00] bg-[rgba(0,255,0,0.05)] text-[#d9d9d9] z-50"
        : isFound
        ? "border-[#ff8800] bg-[rgba(255,136,0,0.15)] shadow-[0_0_12px_rgba(255,136,0,0.5)] text-[#ffffff] z-40"
        : "border-[#262626] bg-[#0d0d0d] text-[#737373] hover:border-[#404040] hover:text-[#d9d9d9]"
    }`}
    style={{
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
    }}
    aria-label={`Node ${node.title}, status ${node.status}`}
  >
    <span
      className="inline-block w-2 h-2 shrink-0"
      style={{
        backgroundColor: isFound
          ? "#ff8800"
          : DOT_COLOR[node.status],
        boxShadow: isFound
          ? "0 0 8px #ff8800"
          : DOT_SHADOW[node.status],
      }}
      aria-hidden="true"
    />
    <span className="truncate">{node.title}</span>
  </button>
);

});

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const NodeConnections = ({ nodes, zoom }) => {
  const children = nodes.filter(n => n.parentId);

  return (
    <svg className="absolute top-0 left-0 pointer-events-none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {children.map(child => {
        const parent = nodes.find(p => (p.nodeId || p.id) === child.parentId);
        if (!parent) return null;

        const x1 = parent.x + 90;
        const y1 = parent.y + 24;
        const x2 = child.x + 90;
        const y2 = child.y + 24;

        return (
          <line
            key={`${child.nodeId || child.id}-link`}
            x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="rgba(0, 255, 0, 0.15)"
            strokeWidth={2 / zoom}
            strokeDasharray="4 4"
          />
        );
      })}
    </svg>
  );
};
export default function Dashboard({ currentUser, onLogout }) {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [searchIndex, setSearchIndex] = useState(0); 
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectInput, setNewProjectInput] = useState("");
  const [timelineWindow, setTimelineWindow] = useState(24); 
  const [showNoodles, setShowNoodles] = useState(false);

    const [isProjectInputVisible, setIsProjectInputVisible] = useState(false);
    const [customProjectId, setCustomProjectId] = useState("");
  const history = useMemo(() => generateHistory(HISTORY_COUNT), []);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [draggingNodeId, setDraggingNodeId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [renameState, setRenameState] = useState(null); 

  const [currentProject, setCurrentProject] = useState(() => {
    if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const projectFromUrl = urlParams.get('project');
        if (projectFromUrl) return projectFromUrl;

        return localStorage.getItem("nexus-current-project") || "medhub-core"; 
    }
    return "alpha-1";
    });
  const [otherUsers, setOtherUsers] = useState({}); 
    useEffect(() => {
        if (currentProject) {
            localStorage.setItem("nexus-current-project", currentProject);
        }
    }, [currentProject]);("alpha-1");
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [sideFilter, setSideFilter] = useState("");
  const [sideStatus, setSideStatus] = useState("all");
  const scrollRef = useRef(null);
  const [viewport, setViewport] = useState({
    scrollX: 0,
    scrollY: 0,
    windowWidth: typeof window !== "undefined" ? window.innerWidth : 1200,
    windowHeight: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const wsRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const panRef = useRef(null);
  const [inviteMode, setInviteMode] = useState("edit"); 
  
  useEffect(() => {
    let cancelled = false;
    async function fetchNodes() {
      try {
        setLoading(true);
        setFetchError(null);
      
        const res = await fetch(`/api/nodes/${currentProject}`); 
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        
        const data = await res.json();
        
        if (!cancelled) {
          const formattedNodes = data.map(n => ({
            ...n,
            id: n.nodeId, 
            title: n.name,
            lastModified: new Date(n.lastModified).getTime(),
            width: n.width || 180,
            height: n.height || 48
          }));

          console.log("✅ Database Nodes Loaded:", formattedNodes.length);
          setNodes(formattedNodes);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("❌ Fetch Error:", err.message);
          setFetchError(err.message);
          setNodes([]); 
          setLoading(false);
        }
      }
    }
    fetchNodes();
    return () => { cancelled = true; };
  }, [currentProject]); 
  useEffect(() => {
  let ws = null;
  try {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => { wsRef.current = ws; setWsConnected(true); };
    
    ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === "presence:mouse") {
        setOtherUsers(prev => ({
          ...prev,
          [msg.userId]: { x: msg.x, y: msg.y, userName: msg.userName, color: msg.color }
        }));
      }

      if (msg.type === "node:move" || msg.type === "node:rename") {
        setNodes(prev => prev.map(n => 
          n.id === msg.nodeId ? { ...n, ...msg } : n
        ));
      } else if (msg.type === "node:create") {
        const newNode = { ...msg.node, id: msg.node.nodeId, title: msg.node.name };
        setNodes(prev => [...prev, newNode]);
      } else if (msg.type === "node:delete") {
        setNodes(prev => prev.filter(n => n.id !== msg.nodeId));
      }
    } catch (e) { console.error("Malformed WS message", e); }
  };

    ws.onclose = () => { wsRef.current = null; setWsConnected(false); };
    ws.onerror = () => { wsRef.current = null; setWsConnected(false); };
  } catch { /* backend not running */ }
  
  return () => { if (ws) ws.close(); wsRef.current = null; };
}, [setSelectedNodeId]); 

  const wsSend = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  
  const updateViewport = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setViewport({
      scrollX: el.scrollLeft / zoom,
      scrollY: el.scrollTop / zoom,
      windowWidth: window.innerWidth / zoom,
      windowHeight: window.innerHeight / zoom,
    });
  }, [zoom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateViewport();
    el.addEventListener("scroll", updateViewport, { passive: true });
    window.addEventListener("resize", updateViewport);
    return () => {
      el.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [updateViewport]);

  const handleDragStart = useCallback((nodeId) => {
    setDraggingNodeId(nodeId);
  }, []);


const handleDragEnd = useCallback(async (nodeId, x, y) => {
    const now = Date.now();
    setDraggingNodeId(null);
    setCurrentTime(now);
    
    setNodes((prev) =>
        prev.map((n) => (n.id === nodeId ? { ...n, x, y, lastModified: now } : n))
    );

    wsSend({ type: "node:move", nodeId, x, y });
}, [wsSend]);
const handleCreateNode = useCallback(async () => {
    const now = Date.now();
    const el = scrollRef.current;
    
    const cx = (el ? el.scrollLeft / zoom : 0) + window.innerWidth / zoom / 2 - 90;
    const cy = (el ? el.scrollTop / zoom : 0) + window.innerHeight / zoom / 2 - 24;

    const parentNode = nodes.find(n => n.id === selectedNodeId);
    const isParentFolder = parentNode && parentNode.type === 'folder';
    const persistentNodeId = `n-${now}-${Math.floor(Math.random() * 1000)}`;

    const newNodeData = {
        nodeId: persistentNodeId,
        name: isParentFolder ? "New Resource" : "New Department",
        type: isParentFolder ? "node" : "folder",
        parentId: isParentFolder ? parentNode.id : null,
        projectId: currentProject, 
        x: parentNode ? Math.round(parentNode.x + 40) : Math.round(cx),
        y: parentNode ? Math.round(parentNode.y + 100) : Math.round(cy),
        status: "active",
        timestamp: now 
    };

    try {
        const res = await fetch('/api/nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newNodeData)
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const savedNode = await res.json();
        
        const uiNode = { 
            ...savedNode, 
            id: savedNode.nodeId, 
            title: savedNode.name, 
            width: 180, 
            height: 48, 
            lastModified: now 
        };

        setNodes((prev) => [...prev, uiNode]);
        setCurrentTime(now); 
        setSelectedNodeId(uiNode.id);
        
        setRenameState({ nodeId: uiNode.id, title: uiNode.title });
        setContextMenu({ nodeId: uiNode.id, x: window.innerWidth / 2, y: window.innerHeight / 2 });
        
        wsSend({ type: "node:create", node: uiNode });
    } catch (err) { 
        console.error("Create failed", err); 
    }
}, [zoom, currentProject, nodes, selectedNodeId, wsSend]); 

  const handleDeleteNode = useCallback(async (nodeId) => {
  try {
    await fetch(`/api/nodes/${nodeId}`, { method: 'DELETE' });
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    
    setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
    setContextMenu(null);
    setRenameState(null);

    wsSend({ type: "node:delete", nodeId });
  } catch (err) {
    console.error("Delete failed:", err);
  }
}, [wsSend]);

  const handleRenameNode = useCallback(async (nodeId, newTitle) => {
  if (!newTitle.trim()) return;
  const now = Date.now();
  
  const currentNode = nodes.find(n => n.id === nodeId);
  if (!currentNode) return;

  try {
    setNodes((prev) => prev.map((n) => 
      n.id === nodeId ? { ...n, title: newTitle.trim(), lastModified: now } : n
    ));
    setCurrentTime(now);

    await fetch('/api/nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...currentNode,    
        nodeId: nodeId,     
        name: newTitle.trim(),
        timestamp: now,     
        lastModified: now
      })
    });

    setRenameState(null);
    setContextMenu(null);
    wsSend({ type: "node:rename", nodeId, title: newTitle.trim() });
  } catch (err) {
    console.error("Rename failed:", err);
  }
}, [nodes, wsSend]);
const isViewOnly = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'view';

if (isViewOnly) {
  alert("You are in VIEW ONLY mode.");
  return;
}

  const handleNodeContextMenu = useCallback((nodeId, clientX, clientY) => {
    setRenameState(null);
    setContextMenu({ nodeId, x: clientX, y: clientY });
    setSelectedNodeId(nodeId);
  }, []);
  useEffect(() => {
    if (!contextMenu && !projectDropdownOpen) return;
    const handleClick = () => {
      setContextMenu(null);
      setProjectDropdownOpen(false);
    };
    const id = requestAnimationFrame(() => {
      window.addEventListener("pointerdown", handleClick);
    });
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("pointerdown", handleClick);
    };
  }, [contextMenu, projectDropdownOpen]);
  const handleCanvasMouseMove = useCallback((e) => {
  if (!wsRef.current || wsRef.current.readyState !== 1 || !currentUser) return;

  const rect = scrollRef.current.getBoundingClientRect();
  const x = (e.clientX - rect.left + scrollRef.current.scrollLeft) / zoom;
  const y = (e.clientY - rect.top + scrollRef.current.scrollTop) / zoom;

  wsSend({
    type: "presence:mouse",
    userId: currentUser.email, 
    userName: currentUser.username || currentUser.email.split('@')[0],
    color: currentUser.color || "#00ff00",
    x, y
  });
}, [wsConnected, currentUser, zoom, wsSend]);
  const timeFiltered = useMemo(
    () => filterNodesByTime(nodes, currentTime, draggingNodeId),
    [nodes, currentTime, draggingNodeId]
  );


const nodeMap = useMemo(() => {
  const m = new Map();
  for (const n of timeFiltered) {
    m.set(n.id, n); 
  }
  return m;
}, [timeFiltered]);

const orphanNodes = useMemo(() => {
  return timeFiltered.filter((n) => n.parentId !== null && !nodeMap.has(n.parentId));
}, [timeFiltered, nodeMap]);

  const canvasNodes = useMemo(() => {
    const ids = new Set(orphanNodes.map((n) => n.id));
    return timeFiltered.filter((n) => !ids.has(n.id));
  }, [timeFiltered, orphanNodes]);

  const visibleNodes = useMemo(
    () => canvasNodes.filter((n) => isNodeVisible(n, viewport)),
    [canvasNodes, viewport]
  );

  const filteredOrphans = useMemo(() => {
    let list = orphanNodes;
    if (sideStatus !== "all") list = list.filter((n) => n.status === sideStatus);
    if (sideFilter.trim()) {
      const q = sideFilter.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q));
    }
    return list.slice(0, 200);
  }, [orphanNodes, sideFilter, sideStatus]);

  const orphanStatusCounts = useMemo(() => {
    const c = { all: orphanNodes.length };
    for (const n of orphanNodes) c[n.status] = (c[n.status] || 0) + 1;
    return c;
  }, [orphanNodes]);


  const zoomIn = useCallback(() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), []);
  const zoomReset = useCallback(() => setZoom(1), []);
  useEffect(() => {
    function onWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom((z) => {
          const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
          return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(z + delta).toFixed(2)));
        });
      }
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, []);


  const handleCanvasPointerDown = useCallback((e) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 0 && e.target.closest("button")) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollLeft: el.scrollLeft,
      startScrollTop: el.scrollTop,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = "grabbing";
  }, []);

  const handleCanvasPointerMove = useCallback((e) => {
    const p = panRef.current;
    if (!p) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = p.startScrollLeft - (e.clientX - p.startX);
    el.scrollTop = p.startScrollTop - (e.clientY - p.startY);
  }, []);

  const handleCanvasPointerUp = useCallback((e) => {
    if (!panRef.current) return;
    panRef.current = null;
    e.currentTarget.style.cursor = "";
  }, []);
  const generateInviteLink = () => {
  const baseUrl = window.location.origin;
  const link = `${baseUrl}?project=${currentProject}&mode=${inviteMode}`;
  navigator.clipboard.writeText(link);
  alert(`Invite link copied to clipboard! (Mode: ${inviteMode})`);
};
 
  const statusCounts = useMemo(() => {
  const c = { active: 0, idle: 0, error: 0, offline: 0 };
  nodes.forEach((n) => {
    const s = n.status && c.hasOwnProperty(n.status) ? n.status : "idle";
    c[s]++;
  });
  return c;
}, [nodes]);

  const currentHistoryIndex = useMemo(() => {
    if (!history.length) return 0;
    let ci = 0;
    let md = Math.abs(history[0].timestamp - currentTime);
    for (let i = 1; i < history.length; i++) {
      const d = Math.abs(history[i].timestamp - currentTime);
      if (d < md) { md = d; ci = i; }
    }
    return ci;
  }, [history, currentTime]);

  const handleSelectNode = useCallback(
    (id) => setSelectedNodeId((prev) => (prev === id ? null : id)),
    []
  );

  const contextNode = contextMenu
    ? nodes.find((n) => n.id === contextMenu.nodeId)
    : null;

  const currentProjectLabel =
    PROJECTS.find((p) => p.id === currentProject)?.label ?? currentProject;

  
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#050505] text-[#d9d9d9] font-mono">
      <style>{`
        .nexus-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .neon-border {
          border-color: #00ff00;
          box-shadow: 0 0 6px rgba(0,255,0,0.3), inset 0 0 6px rgba(0,255,0,0.05);
        }
        .nexus-sb::-webkit-scrollbar { width: 4px; }
        .nexus-sb::-webkit-scrollbar-track { background: #0d0d0d; }
        .nexus-sb::-webkit-scrollbar-thumb { background: #333; }
        .nexus-sb::-webkit-scrollbar-thumb:hover { background: rgba(0,255,0,0.4); }
        input[type="range"].nxslider { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; width: 100%; }
        input[type="range"].nxslider::-webkit-slider-track { height: 2px; background: #333; }
        input[type="range"].nxslider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; background: #00ff00; border: none; margin-top: -6px; }
        input[type="range"].nxslider::-moz-range-track { height: 2px; background: #333; border: none; }
        input[type="range"].nxslider::-moz-range-thumb { width: 14px; height: 14px; background: #00ff00; border: none; border-radius: 0; }
        @keyframes pulse-neon { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      <header className="flex items-center justify-between px-4 py-2 border-b border-[#262626] bg-[#0d0d0d] shrink-0">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 bg-[#00ff00]" aria-hidden="true" />
          <h1 className="text-xs tracking-[0.2em] uppercase">NexusBoard</h1>
          <span className="text-[10px] text-[#737373] tracking-wider">v0.4.0</span>
          {fetchError && (
            <span className="text-[9px] text-[#ffcc00] tracking-wider uppercase">[demo mode]</span>
          )}

<div className="relative ml-2">
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      setProjectDropdownOpen((v) => !v);
    }}
    className="flex items-center gap-1.5 px-2 py-1 border border-[#262626] bg-[#1a1a1a] text-[10px] text-[#d9d9d9] hover:border-[#404040] transition-colors"
  >
    <span className="inline-block w-1.5 h-1.5 bg-[#00ff00]" aria-hidden="true" />
    <span className="max-w-[120px] truncate">{currentProjectLabel}</span>
    <svg width="8" height="8" viewBox="0 0 8 8" className="ml-0.5 text-[#737373]" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 3l3 3 3-3" />
    </svg>
  </button>

  {projectDropdownOpen && (
    <div 
      className="absolute top-full left-0 mt-1 w-64 bg-[#0d0d0d] border border-[#262626] z-50 shadow-2xl p-2"
      onPointerDown={(e) => e.stopPropagation()} 
    >
      <div className="text-[9px] text-[#737373] uppercase mb-2 px-1">Switch Workspace</div>
      
      <div className="max-h-48 overflow-y-auto nexus-sb">
        {PROJECTS.map(p => (
          <button 
            key={p.id} 
            onClick={() => {
              setCurrentProject(p.id);
              setProjectDropdownOpen(false); 
            }} 
            className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-[#1a1a1a] text-[#d9d9d9] transition-colors rounded-sm"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-[#262626]">
        <input 
          type="text" 
          placeholder="JUMP TO PROJECT ID..." 
          className="w-full bg-[#1a1a1a] border border-[#333] px-2 py-1.5 text-[10px] text-white outline-none focus:border-[#00ff00] mb-2 font-mono"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setCurrentProject(e.target.value);
              setProjectDropdownOpen(false);
            }
          }}
        />
        <button 
          onClick={() => {
            const name = prompt("Enter New Project Name:"); 
            if(name) {
              const id = name.toLowerCase().replace(/\s+/g, '-');
              setCurrentProject(id);
              setProjectDropdownOpen(false);
            }
          }}
          className="w-full bg-[#00ff00] text-[#050505] text-[10px] font-bold py-2 uppercase hover:bg-[#33ff33] transition-colors"
        >
          + Create New Project
        </button>
      </div>
    </div>
  )}
</div>

        </div>
        {/* SEARCH BAR */}
        <div className="flex items-center px-2 bg-[#1a1a1a] border border-[#262626] mx-4 h-7">
        <input 
            type="text" 
            placeholder="FIND NODE..." 
            className="bg-transparent text-[10px] py-1 outline-none w-32 uppercase"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchIndex(0); }}
            onKeyDown={(e) => {
            if (e.key === "Enter") {
                const found = nodes.filter(n => n.title?.toLowerCase().includes(searchQuery.toLowerCase()));
                if (found.length > 0) {
                const target = found[searchIndex % found.length];
                scrollRef.current.scrollTo({
                    left: (target.x * zoom) - (window.innerWidth / 2) + 90,
                    top: (target.y * zoom) - (window.innerHeight / 2) + 24,
                    behavior: 'smooth'
                });
                setSearchIndex(prev => prev + 1);
                }
            }
            }}
        />
        {searchQuery && (
            <span className="text-[9px] text-[#737373] ml-2">
            {nodes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 
                ? `${(searchIndex % nodes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).length) + 1}/${nodes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).length}`
                : "0/0"}
            </span>
        )}
        </div>
        <div className="flex items-center gap-2 border-l border-[#262626] ml-4 pl-4">
  <select 
    value={inviteMode} 
    onChange={(e) => setInviteMode(e.target.value)}
    className="bg-[#1a1a1a] border border-[#333] text-[9px] text-[#737373] outline-none"
  >
    <option value="edit">CAN EDIT</option>
    <option value="view">VIEW ONLY</option>
  </select>
  <button 
    onClick={generateInviteLink}
    className="px-2 py-1 bg-[#00ff00] text-black text-[9px] font-bold uppercase hover:bg-[#33ff33]"
  >
    + Invite
  </button>
</div>
        <button 
  onClick={() => setShowNoodles(!showNoodles)}
  className={`px-2 py-1 text-[9px] border transition-colors ${showNoodles ? 'border-[#00ff00] text-[#00ff00]' : 'border-[#404040] text-[#737373]'}`}
>
  {showNoodles ? "HIDE LINKS" : "SHOW LINKS"}
</button>

        <div className="hidden md:flex items-center gap-4 text-[10px] tracking-wider text-[#737373] uppercase">
          {["active","idle","error","offline"].map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="inline-block w-1 h-1" style={{ backgroundColor: DOT_COLOR[s] }} />
              {statusCounts[s]} {s}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[10px] text-[#737373] tabular-nums">
          <span>{timeFiltered.length.toLocaleString()} NODES</span>
          <span className="text-[#262626]">|</span>
          <span>{orphanNodes.length} ORPHANS</span>
          <span className="text-[#262626]">|</span>
          <span className={`flex items-center gap-1 ${wsConnected ? "text-[#00ff00]" : ""}`}>
            <span
              className="inline-block w-1.5 h-1.5"
              style={{ backgroundColor: wsConnected ? "#00ff00" : "#4d4d4d" }}
            />
            {wsConnected ? "WS LIVE" : "WS OFF"}
          </span>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-2 bg-[#0d0d0d] border-b border-[#262626] text-[10px] text-[#737373] tracking-widest uppercase">
          {"Fetching nodes from"} {API_URL}...
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">

        <aside className="flex flex-col w-64 border-r border-[#262626] bg-[#0d0d0d] shrink-0">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#262626]">
            <h2 className="text-[10px] tracking-widest uppercase text-[#737373]">Lost & Found</h2>
            <span className="text-[10px] text-[#00ff00] tabular-nums">{orphanNodes.length}</span>
          </div>
          <div className="px-3 py-1.5 border-b border-[#262626] text-[9px] text-[#737373] leading-relaxed">
            Nodes whose parentId references a missing node
          </div>
          <div className="px-3 py-2 border-b border-[#262626]">
            <input
              type="text"
              placeholder="Filter orphans..."
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#262626] px-2 py-1 text-xs text-[#d9d9d9] placeholder:text-[#737373] focus:outline-none focus:border-[#00ff00] font-mono"
              aria-label="Filter lost nodes"
            />
          </div>
          <div className="flex border-b border-[#262626]">
            {["all","active","idle","error","offline"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSideStatus(s)}
                className={`flex-1 text-[9px] uppercase tracking-wider py-1.5 transition-colors ${
                  sideStatus === s
                    ? "text-[#00ff00] border-b border-[#00ff00]"
                    : "text-[#737373] hover:text-[#d9d9d9]"
                }`}
              >
                {s}
                {orphanStatusCounts[s] != null && (
                  <span className="ml-0.5 tabular-nums">({orphanStatusCounts[s]})</span>
                )}
              </button>
            ))}
          </div>
          <nav className="flex-1 overflow-y-auto nexus-sb" aria-label="Lost nodes list">
            {filteredOrphans.length === 0 ? (
              <div className="px-3 py-8 text-center text-[10px] text-[#737373] uppercase tracking-wider">
                No orphan nodes
              </div>
            ) : (
              <ul className="py-1">
                {filteredOrphans.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectNode(node.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                        selectedNodeId === node.id
                          ? "bg-[rgba(0,255,0,0.06)] text-[#d9d9d9]"
                          : "text-[#737373] hover:bg-[#1a1a1a] hover:text-[#d9d9d9]"
                      }`}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 shrink-0"
                        style={{ backgroundColor: DOT_COLOR[node.status] }}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[11px] font-mono truncate">{node.title}</span>
                        <span className="text-[8px] text-[#737373] truncate">{"parent:"} {node.parentId}</span>
                      </div>
                      <span className="ml-auto text-[9px] text-[#737373] tabular-nums shrink-0">
                        {Math.round(node.x)},{Math.round(node.y)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </nav>
          <div className="px-3 py-2 border-t border-[#262626] text-[9px] text-[#737373] tracking-wider uppercase flex items-center justify-between">
            <span>{"SHOWING:"} {filteredOrphans.length}</span>
            <span>{"ORPHANS:"} {orphanNodes.length}</span>
          </div>
        </aside>

        <div className="relative flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-[#262626] bg-[#0d0d0d] text-[10px] text-[#737373] tracking-wider uppercase shrink-0">
            <div className="flex items-center gap-4">
              <span>
                {"VIEWPORT:"} {Math.round(viewport.scrollX)},{Math.round(viewport.scrollY)}
              </span>
              <span>
                {"VISIBLE:"} {visibleNodes.length} / {canvasNodes.length}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                {"WINDOW:"} {Math.round(viewport.windowWidth * zoom)} x {Math.round(viewport.windowHeight * zoom)}
              </span>
              <span>{"ZOOM:"} {Math.round(zoom * 10) * 10}%</span>
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 bg-[#00ff00]"
                  style={{ animation: "pulse-neon 2s infinite" }}
                  aria-hidden="true"
                />
                LIVE
              </span>
            </div>
          </div>

          <div className="absolute top-12 right-4 z-20 flex flex-col gap-1">
            <button
              type="button"
              onClick={zoomIn}
              className="w-8 h-8 flex items-center justify-center bg-[#0d0d0d] border border-[#262626] text-[#737373] hover:text-[#00ff00] hover:border-[#00ff00] transition-colors text-sm font-mono"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={zoomReset}
              className="w-8 h-8 flex items-center justify-center bg-[#0d0d0d] border border-[#262626] text-[10px] text-[#737373] hover:text-[#00ff00] hover:border-[#00ff00] transition-colors font-mono"
              aria-label="Reset zoom"
            >
              {Math.round(zoom * 100)}
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="w-8 h-8 flex items-center justify-center bg-[#0d0d0d] border border-[#262626] text-[#737373] hover:text-[#00ff00] hover:border-[#00ff00] transition-colors text-sm font-mono"
              aria-label="Zoom out"
            >
              -
            </button>
          </div>

          <button
            type="button"
            onClick={handleCreateNode}
            className="absolute bottom-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-[#00ff00] text-[#050505] text-xl font-bold hover:bg-[#33ff33] transition-colors shadow-lg shadow-[rgba(0,255,0,0.2)]"
            aria-label="Create new node"
            title="Create new node at viewport center"
          >
            +
          </button>

          <div
            ref={scrollRef}
            className="flex-1 overflow-auto nexus-sb"
            role="application"
            aria-label={`NexusBoard canvas with ${canvasNodes.length} nodes, ${visibleNodes.length} visible`}
          >
            <div
              className="relative nexus-grid cursor-grab"
              style={{
                width: CANVAS_W * zoom,
                height: CANVAS_H * zoom,
                backgroundColor: "#050505",
              }}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasMouseMove}
              onPointerUp={handleCanvasPointerUp}
              
              onContextMenu={(e) => {
                if (!e.target.closest("button")) e.preventDefault();
              }}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "0 0",
                  width: CANVAS_W,
                  height: CANVAS_H,
                  position: "absolute",
                  top: 0,
                  left: 0,
                }}
                
              >
                
                {showNoodles && <NodeConnections nodes={timeFiltered} zoom={zoom} />}
                {visibleNodes.map((node) => (
                  <CanvasNode
                    key={node.id}
                    node={node}
                    isSelected={node.id === selectedNodeId}
                    isFound={searchQuery && node.title.toLowerCase().includes(searchQuery.toLowerCase())}

                    onSelect={handleSelectNode}
                    onDragEnd={handleDragEnd}
                    onDragStart={handleDragStart}
                    onContextMenu={handleNodeContextMenu}
                    zoom={zoom}
                  />
                ))}
                {Object.entries(otherUsers).map(([id, u]) => (
                    <div 
                        key={id}
                        className="absolute pointer-events-none z-[100] transition-all duration-75 ease-out"
                        style={{ left: u.x, top: u.y }}
                    >
                        {/* The Cursor Arrow */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={u.color} stroke="black" strokeWidth="1">
                        <path d="M5.64 2l-.6.6 11.4 11.4-1.77 1.77L3.27 4.37l-.6.6L2 5.64l12 12 5.66-5.66L5.64 2z" />
                        </svg>
                        {/* The User Tag */}
                        <div 
                        className="px-1 py-0.5 text-[8px] font-bold whitespace-nowrap mt-1 shadow-lg"
                        style={{ backgroundColor: u.color, color: '#000' }}
                        >
                        {u.username}
                        </div>
                    </div>
                    ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 180),
            top: Math.min(contextMenu.y, window.innerHeight - 160),
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="w-44 bg-[#0d0d0d] border border-[#262626] shadow-lg shadow-black/60">
            <div className="px-3 py-1.5 border-b border-[#262626] text-[9px] text-[#737373] uppercase tracking-widest truncate">
              {contextNode ? contextNode.title : contextMenu.nodeId}
            </div>

            {renameState && renameState.nodeId === contextMenu.nodeId ? (
              <div className="p-2 border-b border-[#262626]">
                <input
                  type="text"
                  value={renameState.title}
                  onChange={(e) =>
                    setRenameState((prev) => ({ ...prev, title: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameNode(renameState.nodeId, renameState.title);
                    if (e.key === "Escape") { setRenameState(null); setContextMenu(null); }
                  }}
                  className="w-full bg-[#1a1a1a] border border-[#262626] px-2 py-1 text-xs text-[#d9d9d9] font-mono focus:outline-none focus:border-[#00ff00]"
                  autoFocus
                />
                <div className="flex gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => handleRenameNode(renameState.nodeId, renameState.title)}
                    className="flex-1 px-2 py-1 bg-[#00ff00] text-[#050505] text-[10px] font-bold uppercase tracking-wider hover:bg-[#33ff33] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRenameState(null); setContextMenu(null); }}
                    className="flex-1 px-2 py-1 border border-[#262626] text-[10px] text-[#737373] uppercase tracking-wider hover:text-[#d9d9d9] hover:border-[#404040] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameState({
                      nodeId: contextMenu.nodeId,
                      title: contextNode ? contextNode.title : "",
                    });
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-[#d9d9d9] hover:bg-[#1a1a1a] transition-colors flex items-center gap-2"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-[#737373]">
                    <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5z" />
                  </svg>
                  Rename
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(contextMenu.nodeId);
                  }}
                  className="w-full text-left px-3 py-2 text-[11px] text-[#e63333] hover:bg-[rgba(230,51,51,0.08)] transition-colors flex items-center gap-2 border-t border-[#262626]"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <path d="M2 3h8M4.5 3V2h3v1M3 3v7h6V3M5 5.5v3M7 5.5v3" />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-1 mt-2">
    {[2, 6, 12, 24].map(hours => (
      <button 
        key={hours}
        onClick={() => setTimelineWindow(hours)}
        className={`text-[8px] px-2 py-0.5 border ${timelineWindow === hours ? 'border-[#00ff00] text-[#00ff00]' : 'border-[#262626] text-[#737373]'}`}
      >
        LAST {hours}H
      </button>
    ))}
  </div>
      <div
        className="shrink-0 border-t border-[#262626] bg-[#0d0d0d] px-4 py-3"
        role="region"
        aria-label="History timeline"
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-0.5 w-32 shrink-0">
            <span className="text-[10px] tracking-widest uppercase text-[#737373]">Time Travel</span>
            <span className="text-[10px] text-[#00ff00] tabular-nums">
              {history[currentHistoryIndex] ? formatTime(history[currentHistoryIndex].timestamp) : "---"}
            </span>
          </div>
          <span className="text-[10px] text-[#737373] tabular-nums shrink-0">
            {history.length ? formatTime(history[0].timestamp) : "--:--:--"}
          </span>
          <div className="flex-1 flex items-center">
            <input 
                type="range" 
                min={Date.now() - (timelineWindow * 3600000)} 
                max={Date.now()} 
                value={currentTime} 
                style={{ accentColor: '#00ff00' }}
                onChange={(e) => setCurrentTime(parseInt(e.target.value))}
                className="nxslider flex-1"
                />
          </div>
          <span className="text-[10px] text-[#737373] tabular-nums shrink-0">
            {history.length ? formatTime(history[history.length - 1].timestamp) : "--:--:--"}
          </span>
          <div className="flex flex-col gap-0.5 w-44 shrink-0 items-end">
            <span className="text-[10px] text-[#737373] tabular-nums">
              {timeFiltered.length.toLocaleString()} / {nodes.length.toLocaleString()} nodes
            </span>
            <span className="text-[10px] text-[#737373] tabular-nums">
              {history[currentHistoryIndex] ? history[currentHistoryIndex].label : "---"}
            </span>
          </div>
        </div>
        {/* Tick marks */}
        <div className="mt-2 flex items-end justify-between h-3 mx-36" aria-hidden="true">
          {history
            .filter((_, i) => i % Math.ceil(history.length / 40) === 0)
            .map((entry) => {
              const ei = history.indexOf(entry);
              const near = Math.abs(ei - currentHistoryIndex) < 3;
              return (
                <div
                  key={entry.id}
                  className={`w-px ${near ? "h-3 bg-[#00ff00]" : "h-1.5 bg-[#262626]"}`}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
