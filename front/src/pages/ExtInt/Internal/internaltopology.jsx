import React, { useEffect, useMemo, useRef, useState, useCallback, memo, lazy, Suspense } from "react";
import { Card, CardContent, Typography } from '@mui/material';
import * as THREE from "three";
import './internaltopology.scss';

// === 지연 로딩으로 초기 번들 크기 감소 ===
const ForceGraph3D = lazy(() => import("react-force-graph-3d"));
const ZonePage = lazy(() => import("./ZonePage"));
const InternalLog = lazy(() => import("./Internal_Log"));

// === 캐시 ===
const VIEW_CACHE = new Map();

// === 네트워크 데이터 fetch ===
async function fetchNetworkData(activeView = "internaltopology", project = null) {
  try {
    let url = `http://localhost:8000/neo4j/nodes?activeView=internaltopology`;
    if (project) url += `&project=${encodeURIComponent(project)}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();

    const nodesMap = new Map();
    const rawLinks = [];

    data.forEach((item) => {
      if (item.src_IP?.id) nodesMap.set(item.src_IP.id, item.src_IP);
      if (item.dst_IP?.id) nodesMap.set(item.dst_IP.id, item.dst_IP);
      if (item.edge?.sourceIP && item.edge?.targetIP) {
        rawLinks.push({ source: item.edge.sourceIP, target: item.edge.targetIP, ...item.edge });
      }
    });

    const nodeIds = new Set(nodesMap.keys());
    const filtered = rawLinks.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));
    const orphan = rawLinks.filter((l) => !nodeIds.has(l.source) || !nodeIds.has(l.target));

    if (orphan.length) {
      const coreId = "__core__";
      if (!nodesMap.has(coreId)) {
        nodesMap.set(coreId, {
          id: coreId, label: "CORE", kind: "core", type: "core",
          color: "#ffffff", status: "up", zone: null
        });
      }
      orphan.forEach((l) => {
        const srcOK = nodeIds.has(l.source);
        const tgtOK = nodeIds.has(l.target);
        if (srcOK && !tgtOK) filtered.push({ ...l, target: coreId, type: l.type || "logical" });
        else if (!srcOK && tgtOK) filtered.push({ ...l, source: coreId, type: l.type || "logical" });
      });
    }

    const linkMap = new Map();
    filtered.forEach((l) => {
      const a = String(l.source);
      const b = String(l.target);
      const key = a < b ? `${a}__${b}__${l.type || ""}` : `${b}__${a}__${l.type || ""}`;
      if (!linkMap.has(key)) linkMap.set(key, l);
    });
    const links = Array.from(linkMap.values());

    const TYPE_COLORS = {
      core: "#ffffff", firewall: "#e55353", router: "#f6a609",
      l3switch: "#f6a609", switchrouter: "#f6a609", layer3: "#f6a609",
      switch: "#3fb950", hub: "#26c6da", server: "#6aa7ff",
      host: "#6aa7ff", default: "#a0b4ff",
    };

    const nodes = Array.from(nodesMap.values()).map((n) => {
      const kind = (n.kind || n.type || "host").toLowerCase();
      const label = n.label || n.ip || String(n.id);
      const color = n.color || TYPE_COLORS[kind] || TYPE_COLORS.default;
      const status = n.status || "up";
      const subnet = n.subnet || (typeof n.ip === "string" && n.ip.includes(".")
        ? n.ip.split(".").slice(0, 3).join(".") + ".0/24" : "unknown/24");
      const zone = Number.isFinite(n.zone) ? n.zone : n.kind === "core" ? null : 0;
      return { ...n, kind, label, color, status, subnet, zone };
    });

    return { nodes, links };
  } catch (error) {
    console.error('fetchNetworkData error:', error);
    return { nodes: [], links: [] };
  }
}

// === 유틸 ===
const idOf = (n) => typeof n === "object" ? n.id : n;
const getId = (end) => (end && typeof end === "object") ? (end.id ?? String(end)) : String(end);
const hashId = (s) => { s = String(s || ""); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) >>> 0; return h; };

const buildAdjacency = (() => {
  const cache = new WeakMap();
  return (links) => {
    if (cache.has(links)) return cache.get(links);
    const m = new Map();
    links.forEach((l) => {
      const a = idOf(l.source);
      const b = idOf(l.target);
      if (!m.has(a)) m.set(a, new Set());
      if (!m.has(b)) m.set(b, new Set());
      m.get(a).add(b);
      m.get(b).add(a);
    });
    cache.set(links, m);
    return m;
  };
})();

// === 레이아웃 상수 ===
const LAYOUT = {
  ZONE_RADIUS: 420,
  DEPTH_Z: { firewall: 51, router: 41, l3switch: 27, switchrouter: 27, layer3: 27, switch: 14, server: 0, host: -14, hub: -14, default: -7 },
  ZONE_GAP_MARGIN: 40
};

const UI = { NODE_SCALE_MULT: 1.7, PHYSICAL_LINK_WIDTH: { base: 4, inc: 6 } };

function computeZoneCenters(zones) {
  const centers = new Map();
  const others = zones.filter((z) => z !== null);
  const n = others.length;
  const baseR = LAYOUT.ZONE_RADIUS;
  const OUTER_R = 34 + 18 * 10;
  let R = baseR;
  if (n > 1) {
    const s = Math.sin(Math.PI / n) || 0.001;
    const needed = (OUTER_R + LAYOUT.ZONE_GAP_MARGIN / 2) / s;
    R = Math.max(baseR, Math.ceil(needed));
  }
  const step = (2 * Math.PI) / Math.max(1, n);
  others.forEach((z, i) => { centers.set(z, { x: Math.cos(i * step) * R, y: Math.sin(i * step) * R, z: 0 }); });
  return centers;
}
function anchorNode(n, { x, y, z }) { n.x = x; n.y = y; n.z = z; }

function normalizeZoneVal(z) { return (z === null || z === undefined) ? null : Number.isFinite(z) ? z : Number(z); }
function buildFilteredGraph(fullGraph, selectedZones) {
  if (!fullGraph || !fullGraph.nodes) return { nodes: [], links: [] };
  const zonesSet = new Set(selectedZones ?? []);
  if (zonesSet.size === 0) return { nodes: [], links: [] };
  const inSelectedZone = new Set(fullGraph.nodes.filter((n) => zonesSet.has(normalizeZoneVal(n.zone))).map((n) => n.id));
  const linkStage1 = fullGraph.links.filter((l) => inSelectedZone.has(idOf(l.source)) || inSelectedZone.has(idOf(l.target)));
  const nodeIds = new Set([...inSelectedZone]);
  linkStage1.forEach((l) => { nodeIds.add(idOf(l.source)); nodeIds.add(idOf(l.target)); });
  const coreIds = new Set(fullGraph.nodes.filter((n) => n.kind === "core").map((n) => n.id));
  if (coreIds.size) {
    fullGraph.links.forEach((l) => {
      const a = idOf(l.source); const b = idOf(l.target);
      if ((coreIds.has(a) && nodeIds.has(b)) || (coreIds.has(b) && nodeIds.has(a))) { nodeIds.add(a); nodeIds.add(b); }
    });
  }
  fullGraph.nodes.forEach((n) => { if (normalizeZoneVal(n.zone) === 0 && String(n.kind).toLowerCase() === 'firewall') nodeIds.add(n.id); });
  const links = fullGraph.links.filter((l) => nodeIds.has(idOf(l.source)) && nodeIds.has(idOf(l.target)));
  const nodes = fullGraph.nodes.filter((n) => nodeIds.has(n.id) || zonesSet.has(normalizeZoneVal(n.zone)));
  return { nodes, links };
}

// === 논리 링크 대시 설정 ===
const DASH_CONF = { count: 16, ratio: 0.58, baseRadius: 1.35, incRadius: 2.8, baseColor: 0x87aafc, incColor: 0x3a6fe2 };
function getCurve(start, end, curvature, rotation) {
  const v = new THREE.Vector3().subVectors(end, start);
  const len = v.length() || 1;
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const a = Math.abs(v.x) < 0.9 ? new THREE.Vector3(1,0,0) : new THREE.Vector3(0,1,0);
  const perp = new THREE.Vector3().crossVectors(v, a).normalize();
  perp.applyAxisAngle(v.clone().normalize(), rotation);
  const amp = curvature * len * 2.0;
  const ctrl = perp.multiplyScalar(amp).add(mid);
  return new THREE.QuadraticBezierCurve3(start, ctrl, end);
}
function ensureDashMeshes(group, dashCount, geo, matBase, matInc) {
  if (!group.userData.dashes) group.userData.dashes = [];
  const cur = group.userData.dashes;
  while (cur.length < dashCount) { const m = new THREE.Mesh(geo, matBase); m.castShadow = false; m.receiveShadow = false; cur.push(m); group.add(m); }
  while (cur.length > dashCount) { const m = cur.pop(); group.remove(m); }
  group.userData.matBase = matBase; group.userData.matInc = matInc;
}
function placeCylinderBetween(mesh, a, b, radius) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const L = dir.length();
  if (L < 1e-6) { mesh.visible = false; return; }
  mesh.visible = true;
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.clone().normalize());
  mesh.scale.set(radius, L, radius);
}
function estimateNodeScale(n) { const base = n.kind === "core" ? 1.8 : 1.35 + (n.__deg || 0) * 0.08; const s = Math.max(1.2, Math.min(3.2, base)); return s * UI.NODE_SCALE_MULT; }
function getNodeBaseRadius(kind) { switch ((kind || 'default').toLowerCase()) { case 'core': return 7.5; case 'firewall': return 4.8; case 'router': return 4.6; case 'l3switch': case 'switchrouter': case 'layer3': return 5.0; case 'switch': case 'l2switch': return 4.2; case 'hub': return 4.2; default: return 3.4; } }
function getNodeClearance(n) { return getNodeBaseRadius(n.kind) * estimateNodeScale(n) + 2.0; }

// === 컴포넌트 ===
function NetworkTopology3D_LeftSidebar({ activeView = "default", onInspectorChange }) {
  const fgRef = useRef(null);
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // NEW: 포인터 인터랙션 토글(초기 OFF → 레이아웃 종료 시 ON)
  const [pointerEnabled, setPointerEnabled] = useState(false);

  const [view, setView] = useState(activeView);
  useEffect(() => { setView(activeView); }, [activeView]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setPointerEnabled(false); // 데이터 로딩 중에는 비활성화 (성능 + 안정성)
      try {
        let base = VIEW_CACHE.get(view);
        if (!base) { base = await fetchNetworkData(view); VIEW_CACHE.set(view, base); }
        const g = { nodes: base.nodes.map(n => ({ ...n })), links: base.links.map(l => ({ ...l })) };
        const deg = new Map();
        g.links.forEach((l) => { deg.set(idOf(l.source), (deg.get(idOf(l.source)) || 0) + 1); deg.set(idOf(l.target), (deg.get(idOf(l.target)) || 0) + 1); });
        g.nodes.forEach((n) => (n.__deg = deg.get(n.id) || 0));

        const nodesFiltered = g.nodes.filter((n) => normalizeZoneVal(n.zone) !== null);
        const nodeIds = new Set(nodesFiltered.map((n) => n.id));
        g.links = g.links.filter((l) => nodeIds.has(idOf(l.source)) && nodeIds.has(idOf(l.target)));
        g.nodes = nodesFiltered;

        const zonesFetched = Array.from(new Set(g.nodes.map((n) => normalizeZoneVal(n.zone)))).filter((z) => z !== null);
        const centersFetched = computeZoneCenters(zonesFetched);
        const ZONE_RADIUS = Math.max(280, LAYOUT.ZONE_RADIUS);
        g.nodes.forEach((n) => {
          if (n.kind === 'core') { anchorNode(n, { x: 0, y: 0, z: 0 }); n.fx = 0; n.fy = 0; n.fz = 0; return; }
          if (normalizeZoneVal(n.zone) === 0 && String(n.kind).toLowerCase() === 'firewall') {
            anchorNode(n, { x: 0, y: 0, z: (LAYOUT.DEPTH_Z.firewall || 0) }); n.fx = 0; n.fy = 0; n.fz = (LAYOUT.DEPTH_Z.firewall || 0); return;
          }
          const zval = normalizeZoneVal(n.zone);
          const center = centersFetched.get(zval) || { x: (Math.random() - 0.5) * ZONE_RADIUS * 2, y: (Math.random() - 0.5) * ZONE_RADIUS * 2, z: 0 };
          const r = ZONE_RADIUS * (0.12 + Math.random() * 0.45);
          const ang = Math.random() * Math.PI * 2;
          const x = center.x + Math.cos(ang) * r;
          const y = center.y + Math.sin(ang) * r;
          const z = (LAYOUT.DEPTH_Z[n.kind] ?? 0) + (Math.random() - 0.5) * 18;
          anchorNode(n, { x, y, z });
        });
        if (mounted) { setGraph(g); setSelected(null); }
      } catch (err) { console.error('fetchNetworkData error', err); }
      finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [view]);

  // === link force 캐시 ===
  const linkDistanceCache = useMemo(() => new Map(), []);
  const linkStrengthCache = useMemo(() => new Map(), []);
  useEffect(() => {
    const fg = fgRef.current; if (!fg) return;
    try { const charge = fg.d3Force('charge'); if (charge) charge.strength(-48); } catch (e) {}
    try {
      const linkForce = fg.d3Force('link');
      if (!linkForce) return;
      linkForce
        .distance((lnk) => {
          const a = String(lnk.source?.id ?? lnk.source);
          const b = String(lnk.target?.id ?? lnk.target);
          const k = a < b ? `${a}/${b}/${lnk.type||''}` : `${b}/${a}/${lnk.type||''}`;
          if (linkDistanceCache.has(k)) return linkDistanceCache.get(k);
          const sk = String(lnk.source?.kind || '').toLowerCase();
          const tk = String(lnk.target?.kind || '').toLowerCase();
          const isFirewallEdge = ((lnk.source?.zone===0 && sk==='firewall') || (lnk.target?.zone===0 && tk==='firewall'));
          const base = (String(lnk.type || '').toLowerCase() === 'physical' ? 90 : 130);
          const edgeKinds = ['host', 'server', 'hub'];
          const netKinds = ['router','switch','l3switch','switchrouter','layer3'];
          const isEdgeNet = (edgeKinds.includes(sk) && netKinds.includes(tk)) || (edgeKinds.includes(tk) && netKinds.includes(sk));
          const dist = isFirewallEdge ? 52 : (isEdgeNet ? Math.round(base * 1.2) : base);
          linkDistanceCache.set(k, dist); return dist;
        })
        .strength((lnk) => {
          const a = String(lnk.source?.id ?? lnk.source);
          const b = String(lnk.target?.id ?? lnk.target);
          const k = a < b ? `${a}/${b}/${lnk.type||''}` : `${b}/${a}/${lnk.type||''}`;
          if (linkStrengthCache.has(k)) return linkStrengthCache.get(k);
          const sk = String(lnk.source?.kind || '').toLowerCase();
          const tk = String(lnk.target?.kind || '').toLowerCase();
          const s = ((lnk.source?.zone===0 && sk==='firewall') || (lnk.target?.zone===0 && tk==='firewall')) ? 1.0 : 0.9;
          linkStrengthCache.set(k, s); return s;
        });
    } catch (e) {}
  }, [graph?.links?.length]);

  // === Zones ===
  const allZones = useMemo(() => {
    const set = new Set();
    graph.nodes.forEach((n) => { const z = normalizeZoneVal(n.zone); if (z !== null && !Number.isNaN(z)) set.add(z); });
    return Array.from(set).sort((a, b) => a - b);
  }, [graph.nodes]);

  const countByZone = useMemo(() => {
    const m = new Map(); allZones.forEach((z) => m.set(z, 0));
    graph.nodes.forEach((n) => { const z = normalizeZoneVal(n.zone); if (m.has(z)) m.set(z, (m.get(z) || 0) + 1); });
    return m;
  }, [graph.nodes, allZones]);

  const [selectedZones, setSelectedZones] = useState([]);
  useEffect(() => { setSelectedZones(allZones); }, [allZones]);

  const [linkTypeFilter, setLinkTypeFilter] = useState('all');
  const [activeZone, setActiveZone] = useState(null);

  const filtered = useMemo(() => {
    const base = buildFilteredGraph(graph, selectedZones);
    if (!base || !base.links) return base;
    let links = base.links;
    if (linkTypeFilter !== 'all') {
      const wantPhysical = linkTypeFilter === 'physical';
      links = links.filter((l) => (String(l.type || '').toLowerCase() === (wantPhysical ? 'physical' : 'logical')));
    }
    const nodeIds = new Set();
    links.forEach((l) => { nodeIds.add(idOf(l.source)); nodeIds.add(idOf(l.target)); });
    let nodes;
    if (linkTypeFilter === 'all') {
      nodes = base.nodes.filter((n) => nodeIds.has(n.id) || selectedZones.includes(normalizeZoneVal(n.zone)));
    } else {
      nodes = base.nodes.filter((n) => nodeIds.has(n.id));
    }
    return { nodes, links };
  }, [graph, selectedZones, linkTypeFilter]);

  const adjacency = useMemo(() => buildAdjacency(filtered.links), [filtered.links]);
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => { setSelectedId(selected?.id ?? null); }, [selected]);

  const isHLNode = useCallback((n) => selectedId && (n.id === selectedId || adjacency.get(selectedId)?.has(n.id)), [selectedId, adjacency]);
  const isIncident = useCallback((l) => selectedId && (idOf(l.source) === selectedId || idOf(l.target) === selectedId), [selectedId]);

  // === Inspector ===
  useEffect(() => {
    const inspectorJsx = (
      <div className="inspector-panel">
        <div className="inspector-header">
          <h2>Node</h2>
          {selected && (
            <span className="node-label">
              Zone {String(normalizeZoneVal(selected.zone))}
            </span>
          )}
        </div>
        {selected ? (
          <div className="inspector-content">
            <table>
              <tbody>
                {['label','kind','ip','subnet','zone','id'].map((key) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{String(selected[key] ?? '')}</td>
                  </tr>
                ))}
                <tr>
                  <td>이웃연결수</td>
                  <td>{adjacency.get(selected.id)?.size ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="inspector-placeholder">노드를 클릭하면 상세 정보가 표시됩니다.</div>
        )}
      </div>
    );
    onInspectorChange?.(inspectorJsx);
  }, [selected, onInspectorChange, adjacency]);

  // === 지오메트리/머티리얼 캐시 ===
  const geoCache = useMemo(() => ({
    torus: new THREE.TorusGeometry(7, 1.6, 16, 32),
    cone: new THREE.ConeGeometry(4.2, 9, 10),
    cylinder: new THREE.CylinderGeometry(4.2, 4.2, 8, 18),
    box: new THREE.BoxGeometry(8.2, 2.6, 6.2),
    l3top: new THREE.CylinderGeometry(2.8, 2.8, 2.2, 16),
    sphere: new THREE.SphereGeometry(3.0, 16, 16),
    octa: new THREE.OctahedronGeometry(4.2),
    led: new THREE.SphereGeometry(0.7, 8, 8),
    hit: new THREE.SphereGeometry(7, 8, 8),
    dashUnit: new THREE.CylinderGeometry(1, 1, 1, 10)
  }), []);

  const nodeMatCache = useMemo(() => ({
    base: new Map(),
    highlight: new THREE.MeshStandardMaterial({ color: 0xffda79, metalness: 0.25, roughness: 0.72 }),
    dim: new THREE.MeshStandardMaterial({ color: 0x324055, metalness: 0.25, roughness: 0.72 }),
    ledUp: new THREE.MeshBasicMaterial({ color: 0x00ff99 }),
    ledDown: new THREE.MeshBasicMaterial({ color: 0xff3355 }),
    hit: new THREE.MeshBasicMaterial({ opacity: 0.0, transparent: true, depthWrite: false }),
    // 논리 대시는 조명 불필요 → Basic으로 경량화
    dashedBase: new THREE.MeshBasicMaterial({ color: DASH_CONF.baseColor, transparent: true, opacity: 0.95 }),
    dashedInc:  new THREE.MeshBasicMaterial({ color: DASH_CONF.incColor,  transparent: true, opacity: 1.0 })
  }), []);

  const getBaseMat = useCallback((hex) => {
    let m = nodeMatCache.base.get(hex);
    if (!m) { m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), metalness: 0.25, roughness: 0.72 }); nodeMatCache.base.set(hex, m); }
    return m;
  }, [nodeMatCache]);

  // === 링크 재질 ===
  const linkMats = useMemo(() => ({
    dashed: new THREE.LineDashedMaterial({ color: 0x87aafc, dashSize: 2.2, gapSize: 2.2, transparent: true, opacity: 0.95 }),
    dashedInc: new THREE.LineDashedMaterial({ color: 0x3a6fe2, dashSize: 4.4, gapSize: 3.2, transparent: true, opacity: 1.0 }),
    basic: new THREE.MeshBasicMaterial({ color: 0xa9b9ff }),
    basicInc: new THREE.MeshBasicMaterial({ color: 0x3a6fe2 })
  }), []);

  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    const baseHex = (node.color || "#a0b4ff");
    const mat = !selectedId ? getBaseMat(baseHex) : (isHLNode(node) ? nodeMatCache.highlight : nodeMatCache.dim);
    let mesh;
    if (node.kind === "core") mesh = new THREE.Mesh(geoCache.torus, mat);
    else if (node.kind === "firewall") mesh = new THREE.Mesh(geoCache.cone, mat);
    else if (node.kind === "router") mesh = new THREE.Mesh(geoCache.cylinder, mat);
    else if (node.kind === "switch" || node.kind === "l2switch") mesh = new THREE.Mesh(geoCache.box, mat);
    else if (node.kind === "l3switch" || node.kind === "switchrouter" || node.kind === "layer3") {
      const baseBox = new THREE.Mesh(geoCache.box, mat);
      const topCyl = new THREE.Mesh(geoCache.l3top, mat);
      topCyl.position.y = 2.6; const g = new THREE.Group(); g.add(baseBox); g.add(topCyl); mesh = g;
    } else if (node.kind === "hub") mesh = new THREE.Mesh(geoCache.octa, mat);
    else mesh = new THREE.Mesh(geoCache.sphere, mat);

    const s = estimateNodeScale(node);
    mesh.scale.set(s, s, s);
    // 그림자 비활성화 (GPU 부하↓)
    mesh.castShadow = false; mesh.receiveShadow = false;
    group.add(mesh);

    const led = new THREE.Mesh(geoCache.led, node.status === "up" ? nodeMatCache.ledUp : nodeMatCache.ledDown);
    led.position.set(0, node.kind === "core" ? 8 : 6 * s * 0.9, 0);
    group.add(led);

    const hit = new THREE.Mesh(geoCache.hit, nodeMatCache.hit); hit.name = "hit-proxy"; group.add(hit);
    return group;
  }, [selectedId, getBaseMat, isHLNode, nodeMatCache, geoCache]);

  const isLogicalLink = useCallback((l) => String(l.type || "").toLowerCase() === "logical", []);
  const isPhysicalLink = useCallback((l) => String(l.type || "").toLowerCase() === "physical", []);

  const linkWidth = useCallback((l) => {
    if (isLogicalLink(l)) return 0; // 논리 링크는 커스텀 대시만
    return selectedId ? (isIncident(l) ? UI.PHYSICAL_LINK_WIDTH.inc : UI.PHYSICAL_LINK_WIDTH.base) : UI.PHYSICAL_LINK_WIDTH.base;
  }, [isLogicalLink, selectedId, isIncident]);

  const linkMaterial = useCallback((l) => {
    if (isLogicalLink(l)) { return (selectedId && isIncident(l)) ? linkMats.dashedInc : linkMats.dashed; }
    return (selectedId && isIncident(l)) ? linkMats.basicInc : linkMats.basic;
  }, [isLogicalLink, selectedId, isIncident, linkMats]);

  const linkColor = useCallback((l) => selectedId ? (isIncident(l) ? "#3a6fe2" : (isLogicalLink(l) ? "#87aafc" : "#7f90b8")) : (isLogicalLink(l) ? "#87aafc" : "#a9b9ff"), [selectedId, isIncident, isLogicalLink]);
  const linkDirectionalParticles = useCallback((l) => isLogicalLink(l) ? 0 : (selectedId ? (isIncident(l) ? 4 : 0) : 2), [isLogicalLink, selectedId, isIncident]);
  const linkDirectionalParticleSpeed = useCallback((l) => (isPhysicalLink(l) ? 0.006 : 0.0), [isPhysicalLink]);
  const linkCurvature = useCallback((l) => (isPhysicalLink(l) ? 0.05 : 0.16), [isPhysicalLink]);
  const linkCurveRotation = useCallback((l) => ((hashId(idOf(l.source)) + hashId(idOf(l.target))) % 628) / 100, []);

  // 논리 링크 오브젝트는 필요할 때만 생성 → 오브젝트 수 감소
  const linkThreeObject = useCallback((l) => {
    if (!isLogicalLink(l)) return undefined;
    // 논리 링크만 보기거나, 노드가 선택된 상태에서만 생성 (성능)
    if (linkTypeFilter !== 'logical' && !selectedId) return undefined;
    const group = new THREE.Group();
    group.userData = { type: 'logical-dashed', link: l, dashes: [] };
    return group;
  }, [isLogicalLink, linkTypeFilter, selectedId]);

  const updateLogicalDashed = useCallback((l, group) => {
    const sid = getId(l.source); const tid = getId(l.target);
    const src = (typeof l.source === 'object' && l.source) || filtered.nodes.find(n => n.id === sid) || graph.nodes.find(n => n.id === sid);
    const tgt = (typeof l.target === 'object' && l.target) || filtered.nodes.find(n => n.id === tid) || graph.nodes.find(n => n.id === tid);
    if (!src || !tgt) { group.visible = false; return; }
    if ([src.x, src.y, src.z, tgt.x, tgt.y, tgt.z].some(v => typeof v !== 'number')) { group.visible = false; return; }

    const start = new THREE.Vector3(src.x, src.y, src.z);
    const end   = new THREE.Vector3(tgt.x, tgt.y, tgt.z);
    const curve = getCurve(start, end, linkCurvature(l), ((hashId(sid) + hashId(tid)) % 628) / 100);

    const totalLen     = Math.max(1e-6, curve.getLength());
    const startTrimLen = getNodeClearance(src);
    const endTrimLen   = getNodeClearance(tgt);
    if (totalLen <= (startTrimLen + endTrimLen) * 1.05) { group.visible = false; return; }
    const tStart = Math.min(0.49, startTrimLen / totalLen);
    const tEnd   = 1 - Math.min(0.49, endTrimLen   / totalLen);

    // 줌 레벨에 따라 대시 수 조절 → 성능 안정화
    const camZ = fgRef.current?.camera()?.position?.z ?? 800;
    const dashCount = camZ > 900 ? 6 : camZ > 700 ? 10 : DASH_CONF.count;
    ensureDashMeshes(group, dashCount, geoCache.dashUnit, nodeMatCache.dashedBase, nodeMatCache.dashedInc);

    const incident = !!(selectedId && (sid === selectedId || tid === selectedId));
    const radius   = incident ? DASH_CONF.incRadius  : DASH_CONF.baseRadius;
    const mat      = incident ? group.userData.matInc : group.userData.matBase;
    const capTrim  = Math.min(0.6 * radius, 1.2);

    const segSpan = (tEnd - tStart);
    if (segSpan <= 1e-4) { group.visible = false; return; }

    for (let i = 0; i < dashCount; i++) {
      const base_t0 = tStart + (i / dashCount) * segSpan;
      const base_t1 = tStart + Math.min(tEnd, (i + DASH_CONF.ratio) / dashCount * segSpan);
      const t0 = Math.max(tStart, base_t0);
      const t1 = Math.min(tEnd,   base_t1);
      const mesh = group.userData.dashes[i];
      if (!mesh || t1 - t0 <= 1e-4) { if (mesh) mesh.visible = false; continue; }
      const a = curve.getPoint(t0); const b = curve.getPoint(t1);
      const dir = new THREE.Vector3().subVectors(b, a); const L = dir.length(); if (L < 1e-3) { mesh.visible = false; continue; }
      dir.normalize(); const a2 = a.clone().addScaledVector(dir,  capTrim); const b2 = b.clone().addScaledVector(dir, -capTrim);
      mesh.material = mat; mesh.renderOrder = 2; if (mesh.material) { mesh.material.depthTest = true; mesh.material.depthWrite = false; mesh.material.needsUpdate = true; }
      placeCylinderBetween(mesh, a2, b2, Math.max(0.18, radius));
    }
    group.visible = true;
  }, [filtered.nodes, graph.nodes, geoCache.dashUnit, nodeMatCache.dashedBase, nodeMatCache.dashedInc, selectedId, linkCurvature]);

  const refreshAllDashed = useCallback(() => {
    const scene = fgRef.current?.scene?.(); if (!scene) return;
    scene.traverse((obj) => { if (obj.userData?.type === 'logical-dashed' && obj.userData.link) { updateLogicalDashed(obj.userData.link, obj); obj.visible = true; } });
  }, [updateLogicalDashed]);

  // === 포커스 ===
  const focusNodeById = useCallback((nodeId) => {
    const node = filtered.nodes.find((n) => n.id === nodeId) || graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setSelected(node);
    const distance = 300; const zFixed = 640;
    const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    fgRef.current?.cameraPosition({ x: (node.x || 1) * distRatio, y: (node.y || 1) * distRatio, z: zFixed }, node, 900);
  }, [filtered.nodes, graph.nodes]);

  useEffect(() => { const t = setTimeout(() => { const core = graph.nodes.find((n) => n.kind === "core"); if (core) focusNodeById(core.id); }, 300); return () => clearTimeout(t); }, [graph.nodes, focusNodeById]);

  const toggleZone = useCallback((z) => {
    setSelected((prev) => (prev && normalizeZoneVal(prev.zone) === z ? null : prev));
    setSelectedZones((prev) => { const set = new Set(prev); if (set.has(z)) set.delete(z); else set.add(z); return Array.from(set).sort((a,b)=>a-b); });
  }, []);
  const selectAll = useCallback(() => setSelectedZones(allZones), [allZones]);
  const selectNone = useCallback(() => setSelectedZones([]), []);

  // === Space 패닝 ===
  const spaceDownRef = useRef(false);
  useEffect(() => {
    const fg = fgRef.current; if (!fg) return;
    const controls = fg.controls && fg.controls();
    const renderer = fg.renderer && fg.renderer();
    if (!controls || !renderer) return;
    controls.enablePan = true; controls.screenSpacePanning = true; controls.listenToKeyEvents && controls.listenToKeyEvents(window); controls.keyPanSpeed = 8.0;
    const el = renderer.domElement; let space = false; const setCursor = () => { if (el) el.style.cursor = space ? "grab" : ""; };
    const onKeyDown = (e) => { if (e.code === "Space" || e.key === " ") { if (!space) { space = true; spaceDownRef.current = true; setCursor(); controls.mouseButtons.LEFT = 2; e.preventDefault(); } } };
    const onKeyUp = (e) => { if (e.code === "Space" || e.key === " ") { space = false; spaceDownRef.current = false; setCursor(); controls.mouseButtons.LEFT = 0; } };
    const onMouseDown = () => { if (space && el) el.style.cursor = "grabbing"; };
    const onMouseUp = () => { if (space && el) el.style.cursor = "grab"; };
    window.addEventListener("keydown", onKeyDown, { passive: false }); window.addEventListener("keyup", onKeyUp); el.addEventListener("mousedown", onMouseDown); window.addEventListener("mouseup", onMouseUp); controls.mouseButtons.RIGHT = 2;
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); el.removeEventListener("mousedown", onMouseDown); window.removeEventListener("mouseup", onMouseUp); };
  }, []);

  // === 사이즈 측정 ===
  const mainGraphContainerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const measureContainer = useCallback(() => {
    const el = mainGraphContainerRef.current; if (!el) return;
    try { setContainerSize({ width: el.clientWidth || 0, height: el.clientHeight || 0 }); } catch {}
  }, []);
  useEffect(() => {
    const el = mainGraphContainerRef.current; if (!el) return; measureContainer();
    let ro; if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(measureContainer); try { ro.observe(el); } catch {} } else { window.addEventListener('resize', measureContainer); }
    return () => { try { if (ro && el) ro.unobserve(el); } catch {}; window.removeEventListener('resize', measureContainer); };
  }, [measureContainer]);

  // === DPR 제한 ===
  useEffect(() => {
    const r = fgRef.current?.renderer?.();
    try { r?.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); } catch {}
  }, [containerSize.width, containerSize.height]);

  // === 중앙 정렬 유지 ===
  useEffect(() => {
    const recenter = () => { try { fgRef.current?.zoomToFit(600, 40); } catch {} };
    if (filtered.nodes?.length || filtered.links?.length) requestAnimationFrame(recenter);
    const el = mainGraphContainerRef.current; let ro;
    if (el && typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(() => requestAnimationFrame(recenter)); ro.observe(el); }
    else { window.addEventListener('resize', recenter); }
    return () => { if (ro && el) ro.unobserve(el); window.removeEventListener('resize', recenter); };
  }, [filtered]);

  // === 메모리 정리 ===
  useEffect(() => {
    return () => {
      Object.values(geoCache).forEach((g) => { try { g.dispose?.(); } catch {} });
      nodeMatCache.base.forEach((m) => { try { m.dispose?.(); } catch {} });
      [nodeMatCache.highlight, nodeMatCache.dim, nodeMatCache.ledUp, nodeMatCache.ledDown, nodeMatCache.hit, nodeMatCache.dashedBase, nodeMatCache.dashedInc]
        .forEach((m) => { try { m.dispose?.(); } catch {} });
    };
  }, [geoCache, nodeMatCache]);

  // === 이벤트 로그 ===
  const [eventLogs, setEventLogs] = useState([]);

  // === 애니메이션 제어 ===
  const resume = useCallback(() => fgRef.current?.resumeAnimation(), []);

  return (
    <Card sx={{ width: '100%', height: 'calc(100vh - 120px)', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3, overflow: 'hidden' }}>
      <CardContent sx={{ p: 2, height: '100%', display: 'flex', gap: 2 }}>
        {/* 왼쪽 툴바 (UI 변경 없음) */}
        <Card sx={{ width: 280, flex: 'none', bgcolor: '#f0edfd', color: '#000', border: '1px solid #d0c9f0', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRadius: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }} className="left-sidebar">
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, fontSize: '1rem', color: '#000000ff' }}>Network Topology</Typography>
            <div className="divider" />
            {/* 링크 유형 */}
            <div className="link-type-header">
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#000000ff' }}>Link Type</Typography>
            </div>
            <div className="link-type-buttons">
              <button onClick={()=>{ setLinkTypeFilter('physical'); }} className={linkTypeFilter==='physical' ? 'active' : 'inactive'} title="물리 링크만 보기">Physical</button>
              <button onClick={()=>{ setLinkTypeFilter('logical'); }} className={linkTypeFilter==='logical' ? 'active' : 'inactive'} title="논리 링크(점선)만 보기">Logical</button>
            </div>
            {/* 뷰 초기화 */}
            <div className="view-reset-container">
              <button onClick={() => {
                setSelected(null); setSelectedZones(allZones); setLinkTypeFilter('all');
                const core = graph.nodes.find((n) => n.kind === "core"); if (core && fgRef.current) {
                  const distance = 150; const zFixed = 640; const distRatio = 1 + distance / Math.hypot(core.x || 1, core.y || 1, core.z || 1);
                  fgRef.current.cameraPosition({ x: (core.x || 1) * distRatio, y: (core.y || 1) * distRatio, z: zFixed }, core, 800);
                }
              }}>뷰 초기화</button>
            </div>
            {/* Zones 목록 */}
            <div className="zones-header">
              <div className="zone-indicator"></div>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#000000ff' }}>Zones</Typography>
            </div>
            <div className="zones-list">
              {allZones.map((z) => {
                const active = selectedZones.includes(z);
                const ct = countByZone.get(z) || 0;
                return (
                  <div key={z} className={`zone-item ${active ? 'active' : 'inactive'}`}>
                    <button onClick={() => setActiveZone(z)} className={`zone-button ${active ? 'active' : 'inactive'}`}>
                      <div className="zone-header">
                        <span>Zone {z}</span>
                        <span className="zone-count">{ct}</span>
                      </div>
                    </button>
                    <div className="zone-actions">
                      <button onClick={() => setActiveZone(z)} title="존 상세 보기">Details</button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Zone filter checkboxes */}
            <div className="zone-filter-section">
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#000000ff' }}>Zone Filter</Typography>
              <form>
                {allZones.map((z) => (
                  <label key={z}>
                    <input type="checkbox" checked={selectedZones.includes(z)} onChange={() => toggleZone(z)} />
                    <span>Zone {z} <span className="zone-count-inline">({countByZone.get(z) || 0})</span></span>
                  </label>
                ))}
              </form>
              <div className="filter-buttons">
                <button onClick={selectAll}>All</button>
                <button onClick={selectNone}>None</button>
              </div>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#000000ff' }}>
                {filtered.nodes.length} nodes • {filtered.links.length} links
              </Typography>
            </div>
          </CardContent>
        </Card>

        {/* 그래프 영역 */}
        <Card sx={{ flex: 1, height: '100%', position: 'relative', overflow: 'hidden', borderRadius: '20px', boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)', background: '#856affff' }}>
          <div ref={mainGraphContainerRef} className="graph-container" role="img" aria-label="Internal network topology (800 nodes)">
            <Suspense fallback={
              <div className="loading-overlay">
                <div className="loading-box">Loading Graph...</div>
              </div>
            }>
              <ForceGraph3D
                ref={fgRef}
                rendererConfig={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
                graphData={filtered}
                backgroundColor="#F0EDFD"
                width={containerSize.width}
                height={containerSize.height}
                nodeThreeObject={nodeThreeObject}
                nodeThreeObjectExtend={false}
                linkThreeObject={linkThreeObject}
                linkThreeObjectExtend={false}
                linkWidth={linkWidth}
                linkColor={linkColor}
                linkMaterial={linkMaterial}
                linkDirectionalParticles={linkDirectionalParticles}
                linkDirectionalParticleSpeed={linkDirectionalParticleSpeed}
                linkDirectionalParticleWidth={2.0}
                linkCurvature={linkCurvature}
                linkCurveRotation={linkCurveRotation}
                onEngineTick={useCallback(() => {
                  // logical 필터이거나 선택이 있을 때만 부분 갱신
                  if (linkTypeFilter !== 'logical' && !selectedId) return;
                  const scene = fgRef.current?.scene?.(); if (!scene) return;
                  scene.traverse((obj) => {
                    if (obj.userData?.type !== 'logical-dashed') return;
                    const l = obj.userData.link;
                    const sid = (typeof l.source === 'object' ? l.source.id : l.source);
                    const tid = (typeof l.target === 'object' ? l.target.id : l.target);
                    if (!selectedId || sid === selectedId || tid === selectedId) updateLogicalDashed(l, obj);
                  });
                }, [updateLogicalDashed, selectedId, linkTypeFilter])}
                onEngineStop={useCallback(() => { 
                  refreshAllDashed(); 
                  fgRef.current?.pauseAnimation(); 
                  // 레이아웃 종료 시에만 포인터 인터랙션 활성화 (UX 그대로 + 성능 이점)
                  setPointerEnabled(true);
                }, [refreshAllDashed])}
                onLinkUpdate={useCallback((l, obj) => { try { if (obj && obj.computeLineDistances) obj.computeLineDistances(); } catch {} if (String(l.type || '').toLowerCase() === 'logical') { const scene = fgRef.current?.scene?.(); if (!scene) return; scene.traverse((o) => { if (o.userData?.type === 'logical-dashed' && o.userData.link === l) { updateLogicalDashed(l, o); } }); } }, [updateLogicalDashed])}
                onNodeClick={useCallback((n)=>{
                  resume(); setSelected(n);
                  if (n) {
                    const connectedNodes = adjacency.get(n.id) || new Set();
                    const connectedIps = Array.from(connectedNodes)
                      .map(nid => { const node = filtered.nodes.find(node => node.id === nid); return node?.ip; })
                      .filter(ip => ip);
                    const dbInfo = filtered.links
                      .filter(link => { const sid = typeof link.source === 'object' ? link.source.id : link.source; const tid = typeof link.target === 'object' ? link.target.id : link.target; return sid === n.id || tid === n.id; })
                      .map(link => {
                        const sid = typeof link.source === 'object' ? link.source.id : link.source;
                        const tid = typeof link.target === 'object' ? link.target.id : link.target;
                        const srcNode = filtered.nodes.find(node => node.id === sid) || graph.nodes.find(node => node.id === sid);
                        const dstNode = filtered.nodes.find(node => node.id === tid) || graph.nodes.find(node => node.id === tid);
                        return {
                          src_IP: srcNode ? { id: srcNode.id, ip: srcNode.ip, subnet: srcNode.subnet, gateway: srcNode.gateway, __labels: [srcNode.kind], __id: srcNode.id, index: srcNode.zone } : null,
                          dst_IP: dstNode ? { id: dstNode.id, ip: dstNode.ip, subnet: dstNode.subnet, gateway: dstNode.gateway, __labels: [dstNode.kind], __id: dstNode.id, index: dstNode.zone } : null,
                          edge: { sourceIP: sid, targetIP: tid, type: link.type, count: link.count }
                        };
                      });
                    const newLog = { message: `노드 선택: ${n.label || n.id}`, nodeInfo: { kind: n.kind, zone: n.zone, ip: n.ip }, connectedCount: connectedNodes.size, connectedIps, dbInfo };
                    setEventLogs([newLog]);
                  }
                }, [adjacency, filtered.nodes, filtered.links, graph.nodes, resume])}
                onBackgroundClick={useCallback(()=>{ setSelected(null); setEventLogs([]); resume(); }, [resume])}
                enableNodeDrag={false}
                // 🔒 성능: 초기에는 OFF, 레이아웃 끝나면 onEngineStop에서 ON
                enablePointerInteraction={pointerEnabled}
                showNavInfo={false}
                warmupTicks={12}
                cooldownTicks={0}
                d3AlphaDecay={0.06}
                d3VelocityDecay={0.4}
              />
            </Suspense>
            {loading && (
              <div className="loading-overlay no-pointer-events">
                <div className="loading-box">Loading…</div>
              </div>
            )}

            {/* Zone 상세 오버레이 (UI 변경 없음) */}
            {activeZone !== null && (
              <div className="zone-detail-overlay">
                <div onClick={() => setActiveZone(null)} className="overlay-backdrop" />
                <div onClick={(e)=>e.stopPropagation()} className="overlay-content">
                  <Suspense fallback={<div className="overlay-loading">Loading...</div>}>
                    <ZonePage zone={activeZone} onBack={() => setActiveZone(null)} onInspectorChange={onInspectorChange} setEventLogs={setEventLogs} />
                  </Suspense>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 우측 이벤트 로그 패널 (UI 변경 없음) */}
        <Suspense fallback={<div className="right-sidebar-fallback"></div>}>
          <InternalLog eventLogs={eventLogs} />
        </Suspense>
      </CardContent>
    </Card>
  );
}

export default memo(NetworkTopology3D_LeftSidebar);