import React, { useEffect, useMemo, useRef, useState, useCallback, memo, lazy, Suspense } from "react";
import { Card, CardContent, Typography } from '@mui/material';
import * as THREE from "three";

// 지연 로딩으로 초기 번들 크기 감소
const ForceGraph3D = lazy(() => import("react-force-graph-3d"));
const ZonePage = lazy(() => import("./ZonePage"));
const InternalLog = lazy(() => import("./Internal_Log"));

// 강화된 캐싱 시스템
const VIEW_CACHE = new Map();
const GEOMETRY_CACHE = new Map();
const MATERIAL_CACHE = new Map();

// 성능 최적화된 데이터 fetch 함수
async function fetchNetworkData(activeView = "internaltopology", project = null) {
  try {
    let url = `http://localhost:8000/neo4j/nodes?activeView=internaltopology`;
    if (project) url += `&project=${encodeURIComponent(project)}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();

    const nodesMap = new Map();
    const rawLinks = [];
    
    // 배치 처리로 성능 개선
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

    // 중복 제거 최적화
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

// 초경량 그래프 유틸리티
const idOf = (n) => typeof n === "object" ? n.id : n;
const getId = (end) => (end && typeof end === "object") ? (end.id ?? String(end)) : String(end);
const hashId = (s) => { 
  s = String(s || ""); 
  let h = 0; 
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) >>> 0; 
  return h; 
};

// 메모이제이션된 인접성 빌드
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

// ------------------------------
// 3) 레이아웃: 존별 원형 토폴로지
// ------------------------------
const LAYOUT = {
  ZONE_RADIUS: 420,
  ROLE_BASE_R: 34,
  ROLE_STEP_R: 18,
  FW_R_RATIO: 0.0,
  FW_SPREAD: 8,
  DEPTH_Z: { firewall: 51, router: 41, l3switch: 27, switchrouter: 27, layer3: 27, switch: 14, server: 0, host: -14, hub: -14, default: -7 },
  OUTER_RING_MULT: 10,
  ZONE_GAP_MARGIN: 40
};

const UI = {
  NODE_SCALE_MULT: 1.7,
  PHYSICAL_LINK_WIDTH: { base: 4, inc: 6 },
};

function computeZoneCenters(zones) {
  const centers = new Map();
  const CORE_CENTER = { x: 0, y: 0, z: 0 };
  if (zones.includes(null)) centers.set(null, CORE_CENTER);
  const others = zones.filter((z) => z !== null);
  const n = others.length;
  const baseR = LAYOUT.ZONE_RADIUS;
  const OUTER_R = LAYOUT.ROLE_BASE_R + LAYOUT.ROLE_STEP_R * LAYOUT.OUTER_RING_MULT;
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

// ------------------------------
// 4) 필터링 헬퍼
// ------------------------------
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

// ------------------------------
// 5) 곡선/대시 유틸 (logical을 굵은 점선 튜브로 렌더)
// ------------------------------
const DASH_CONF = {
  count: 16,
  ratio: 0.58,
  baseRadius: 1.35,
  incRadius: 2.8,
  baseColor: 0x87aafc,
  incColor: 0x3a6fe2
};

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
  while (cur.length > dashCount) { const m = cur.pop(); group.remove(m); /* 공유 지오메트리 사용: dispose 금지 */ }
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

// === 노드 클리어런스(끝단 트림) 계산 ===
function estimateNodeScale(n) {
  const base = n.kind === "core" ? 1.8 : 1.35 + (n.__deg || 0) * 0.08;
  const s = Math.max(1.2, Math.min(3.2, base));
  return s * UI.NODE_SCALE_MULT;
}
function getNodeBaseRadius(kind) {
  switch ((kind || 'default').toLowerCase()) {
    case 'core': return 7.5;
    case 'firewall': return 4.8;
    case 'router': return 4.6;
    case 'l3switch':
    case 'switchrouter':
    case 'layer3': return 5.0;
    case 'switch':
    case 'l2switch': return 4.2;
    case 'hub': return 4.2;
    default: return 3.4;
  }
}
function getNodeClearance(n) {
  return getNodeBaseRadius(n.kind) * estimateNodeScale(n) + 2.0;
}

// ------------------------------
// 6) 컴포넌트
// ------------------------------
function NetworkTopology3D_LeftSidebar({ activeView = "default", onInspectorChange }) {
  const fgRef = useRef(null);
  const [graph, setGraph] = useState({ nodes: [], links: [] });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  // === 쿼리(View) 상태 ===
  const [view, setView] = useState(activeView);
  useEffect(() => { setView(activeView); }, [activeView]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // 캐시가 있으면 재사용; 원본 변형 방지 위해 얕은 복사 사용
        let base = VIEW_CACHE.get(view);
        if (!base) {
          base = await fetchNetworkData(view);
          VIEW_CACHE.set(view, base);
        }
        const g = {
          nodes: base.nodes.map(n => ({ ...n })),
          links: base.links.map(l => ({ ...l }))
        };

        const deg = new Map();
        g.links.forEach((l) => { deg.set(idOf(l.source), (deg.get(idOf(l.source)) || 0) + 1); deg.set(idOf(l.target), (deg.get(idOf(l.target)) || 0) + 1); });
        g.nodes.forEach((n) => (n.__deg = deg.get(n.id) || 0));

        // Include zone 0
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
        if (mounted) {
          setGraph(g);
          setSelected(null);
        }
      } catch (err) {
        console.error('fetchNetworkData error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [view]);

  useEffect(() => {
    const fg = fgRef.current; if (!fg) return;
    try { const charge = fg.d3Force('charge'); if (charge) charge.strength(-48); } catch (e) {}
    try {
      const linkForce = fg.d3Force('link');
      if (linkForce) linkForce
        .distance((lnk) => { try {
          const s = lnk.source || {}; const t = lnk.target || {};
          const sz = normalizeZoneVal(s.zone); const tz = normalizeZoneVal(t.zone);
          const sk = String(s.kind || '').toLowerCase(); const tk = String(t.kind || '').toLowerCase();
          if ((sz === 0 && sk === 'firewall') || (tz === 0 && tk === 'firewall')) return 52;
          const base = (String(lnk.type || '').toLowerCase() === 'physical' ? 90 : 130);
          const edgeKinds = ['host', 'server', 'hub'];
          const netKinds = ['router','switch','l3switch','switchrouter','layer3'];
          const isEdgeNet = (edgeKinds.includes(sk) && netKinds.includes(tk)) || (edgeKinds.includes(tk) && netKinds.includes(sk));
          return isEdgeNet ? Math.round(base * 1.2) : base;
        } catch { return 120; } })
        .strength((lnk) => { try {
          const s = lnk.source || {}; const t = lnk.target || {};
          const sz = normalizeZoneVal(s.zone); const tz = normalizeZoneVal(t.zone);
          const sk = String(s.kind || '').toLowerCase(); const tk = String(t.kind || '').toLowerCase();
          if ((sz === 0 && sk === 'firewall') || (tz === 0 && tk === 'firewall')) return 1.0;
          return 0.9;
        } catch { return 0.85; } });
    } catch (e) {}
  }, [graph.nodes.length, graph.links.length]);

  // useMemo로 모든 존 계산 최적화
  const allZones = useMemo(() => {
    const set = new Set();
    graph.nodes.forEach((n) => { const z = normalizeZoneVal(n.zone); if (z !== null && !Number.isNaN(z)) set.add(z); });
    return Array.from(set).sort((a, b) => a - b);
  }, [graph.nodes]);

  // useMemo로 존별 카운트 계산 최적화
  const countByZone = useMemo(() => {
    const m = new Map(); allZones.forEach((z) => m.set(z, 0));
    graph.nodes.forEach((n) => { const z = normalizeZoneVal(n.zone); if (m.has(z)) m.set(z, (m.get(z) || 0) + 1); });
    return m;
  }, [graph.nodes, allZones]);

  const [selectedZones, setSelectedZones] = useState([]);
  useEffect(() => { setSelectedZones(allZones); }, [allZones]);

  // Local UI-only link type filter
  const [linkTypeFilter, setLinkTypeFilter] = useState('all');

  const [activeZone, setActiveZone] = useState(null);
  
  // useMemo로 필터링된 그래프 데이터 최적화 (대용량 데이터 처리 핵심)
  const filtered = useMemo(() => {
    const base = buildFilteredGraph(graph, selectedZones);
    if (!base || !base.links) return base;

    // apply link type filter
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

  // useMemo로 인접 노드 맵 최적화
  const adjacency = useMemo(() => buildAdjacency(filtered.links), [filtered.links]);
  
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => { setSelectedId(selected?.id ?? null); }, [selected]);
  
  // useCallback로 노드/링크 하이라이트 함수 최적화
  const isHLNode = useCallback((n) => selectedId && (n.id === selectedId || adjacency.get(selectedId)?.has(n.id)), [selectedId, adjacency]);
  const isIncident = useCallback((l) => selectedId && (idOf(l.source) === selectedId || idOf(l.target) === selectedId), [selectedId]);

  // node Inspector
  useEffect(() => {
    const inspectorJsx = (
      <div
        style={{
          height: '78vh',
          borderRadius: 16,
          background: 'linear-gradient(180deg, rgba(128,90,213,0.12), rgba(99,102,241,0.10))',
          padding: 12,
          overflow: 'auto',
          border: '1px solid rgba(124,58,237,0.25)',
          boxShadow: '0 6px 20px rgba(91,76,155,0.18)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#3b2c6b', margin: 0 }}>Node</h2>
          {selected && (
            <span style={{ fontSize: 11, color: '#6d4dd6', background: 'rgba(109,77,214,0.12)', padding: '2px 8px', borderRadius: 999 }}>
              Zone {String(normalizeZoneVal(selected.zone))}
            </span>
          )}
        </div>
        {selected ? (
          <div style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 12, padding: 10 }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <tbody>
                {["label","kind","ip","subnet","zone","id"].map((key) => (
                  <tr key={key} style={{ borderBottom: '1px solid rgba(124,58,237,0.12)' }}>
                    <td style={{ padding: '6px 4px', fontWeight: 600, color: '#6553a7' }}>{key}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', color: '#2a2050', wordBreak: 'break-all' }}>{String(selected[key] ?? '')}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '6px 4px', fontWeight: 600, color: '#6553a7' }}>이웃연결수</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', color: '#2a2050' }}>{adjacency.get(selected.id)?.size ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: '#5e5a7f', fontSize: 12 }}>노드를 클릭하면 상세 정보가 표시됩니다.</div>
        )}
      </div>
    );
    onInspectorChange?.(inspectorJsx);
  }, [selected, onInspectorChange, adjacency]);

  // Three.js 지오메트리 & 머티리얼 공유 (useMemo로 캐싱하여 성능 최적화)
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

  // 머티리얼 캐싱 (useMemo로 불필요한 재생성 방지)
  const nodeMatCache = useMemo(() => ({
    base: new Map(),
    highlight: new THREE.MeshStandardMaterial({ color: 0xffda79, metalness: 0.25, roughness: 0.72 }),
    dim: new THREE.MeshStandardMaterial({ color: 0x324055, metalness: 0.25, roughness: 0.72 }),
    ledUp: new THREE.MeshBasicMaterial({ color: 0x00ff99 }),
    ledDown: new THREE.MeshBasicMaterial({ color: 0xff3355 }),
    hit: new THREE.MeshBasicMaterial({ opacity: 0.0, transparent: true, depthWrite: false }),
    dashedBase: new THREE.MeshStandardMaterial({ color: DASH_CONF.baseColor, metalness: 0.15, roughness: 0.6, transparent: true, opacity: 0.98 }),
    dashedInc: new THREE.MeshStandardMaterial({ color: DASH_CONF.incColor, metalness: 0.2, roughness: 0.55, transparent: true, opacity: 1.0 })
  }), []);

  // useCallback로 머티리얼 가져오기 최적화
  const getBaseMat = useCallback((hex) => { 
    let m = nodeMatCache.base.get(hex); 
    if (!m) { 
      m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), metalness: 0.25, roughness: 0.72 }); 
      nodeMatCache.base.set(hex, m); 
    } 
    return m; 
  }, [nodeMatCache]);

  // 링크 머티리얼 (물리 링크용) - useMemo로 캐싱
  const linkMats = useMemo(() => ({
    dashed: new THREE.LineDashedMaterial({ color: 0x87aafc, dashSize: 2.2, gapSize: 2.2, transparent: true, opacity: 0.95 }),
    dashedInc: new THREE.LineDashedMaterial({ color: 0x3a6fe2, dashSize: 4.4, gapSize: 3.2, transparent: true, opacity: 1.0 }),
    basic: new THREE.MeshBasicMaterial({ color: 0xa9b9ff }),
    basicInc: new THREE.MeshBasicMaterial({ color: 0x3a6fe2 })
  }), []);

  // useCallback로 노드 렌더링 함수 최적화 (핵심 성능 개선)
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
      topCyl.position.y = 2.6;
      const g = new THREE.Group(); g.add(baseBox); g.add(topCyl); mesh = g;
    } else if (node.kind === "hub") mesh = new THREE.Mesh(geoCache.octa, mat);
    else mesh = new THREE.Mesh(geoCache.sphere, mat);

    // 노드 크기 (연결수 영향 + 전역 배율)
    const s = estimateNodeScale(node);
    mesh.scale.set(s, s, s);
    mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);

    const led = new THREE.Mesh(geoCache.led, node.status === "up" ? nodeMatCache.ledUp : nodeMatCache.ledDown);
    led.position.set(0, node.kind === "core" ? 8 : 6 * s * 0.9, 0);
    group.add(led);

    const hit = new THREE.Mesh(geoCache.hit, nodeMatCache.hit); hit.name = "hit-proxy"; group.add(hit);
    return group;
  }, [selectedId, getBaseMat, isHLNode, nodeMatCache, geoCache]);

  // useCallback로 링크 타입 체크 함수 최적화
  const isLogicalLink = useCallback((l) => String(l.type || "").toLowerCase() === "logical", []);
  const isPhysicalLink = useCallback((l) => String(l.type || "").toLowerCase() === "physical", []);

  // useCallback로 링크 렌더링 속성 함수들 최적화
  const linkWidth = useCallback((l) => {
    if (isLogicalLink(l)) return 0; // 기본 선 숨김 (대신 커스텀 대시 렌더)
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

  // === Logical 전용: 커스텀 굵은 점선 튜브 ===
  const linkThreeObject = useCallback((l) => {
    if (!isLogicalLink(l)) return undefined;
    const group = new THREE.Group();
    group.userData = { type: 'logical-dashed', link: l, dashes: [] };
    return group;
  }, [isLogicalLink]);

  const updateLogicalDashed = useCallback((l, group) => {
    // 안전 해석 (ID → 노드)
    const sid = getId(l.source);
    const tid = getId(l.target);
    const src = (typeof l.source === 'object' && l.source) ||
                filtered.nodes.find(n => n.id === sid) ||
                graph.nodes.find(n => n.id === sid);
    const tgt = (typeof l.target === 'object' && l.target) ||
                filtered.nodes.find(n => n.id === tid) ||
                graph.nodes.find(n => n.id === tid);

    if (!src || !tgt) { group.visible = false; return; }
    if ([src.x, src.y, src.z, tgt.x, tgt.y, tgt.z].some(v => typeof v !== 'number')) {
      group.visible = false; // 좌표 준비 전이면 잠깐 숨김
      return;
    }

    const start = new THREE.Vector3(src.x, src.y, src.z);
    const end   = new THREE.Vector3(tgt.x, tgt.y, tgt.z);

    // 곡선 생성
    const curve = getCurve(start, end, linkCurvature(l), ((hashId(sid) + hashId(tid)) % 628) / 100);

    // 양 끝 트림 (노드 반경 + 여유)
    const totalLen     = Math.max(1e-6, curve.getLength());
    const startTrimLen = getNodeClearance(src);
    const endTrimLen   = getNodeClearance(tgt);
    if (totalLen <= (startTrimLen + endTrimLen) * 1.05) { group.visible = false; return; }
    const tStart = Math.min(0.49, startTrimLen / totalLen);
    const tEnd   = 1 - Math.min(0.49, endTrimLen   / totalLen);

    const dashCount = DASH_CONF.count, dashRatio = DASH_CONF.ratio;
    ensureDashMeshes(group, dashCount, geoCache.dashUnit, nodeMatCache.dashedBase, nodeMatCache.dashedInc);

    const incident = !!(selectedId && (sid === selectedId || tid === selectedId));
    const radius   = incident ? DASH_CONF.incRadius  : DASH_CONF.baseRadius;
    const mat      = incident ? group.userData.matInc : group.userData.matBase;
    const capTrim  = Math.min(0.6 * radius, 1.2);

    const segSpan = (tEnd - tStart);
    if (segSpan <= 1e-4) { group.visible = false; return; }

    for (let i = 0; i < dashCount; i++) {
      const base_t0 = tStart + (i / dashCount) * segSpan;
      const base_t1 = tStart + Math.min(tEnd, (i + dashRatio) / dashCount * segSpan);

      const t0 = Math.max(tStart, base_t0);
      const t1 = Math.min(tEnd,   base_t1);
      const mesh = group.userData.dashes[i];
      if (!mesh || t1 - t0 <= 1e-4) { if (mesh) mesh.visible = false; continue; }

      const a = curve.getPoint(t0);
      const b = curve.getPoint(t1);
      const dir = new THREE.Vector3().subVectors(b, a);
      const L = dir.length();
      if (L < 1e-3) { mesh.visible = false; continue; }
      dir.normalize();

      const a2 = a.clone().addScaledVector(dir,  capTrim);
      const b2 = b.clone().addScaledVector(dir, -capTrim);

      mesh.material = mat;
      mesh.renderOrder = 2;
      if (mesh.material) { mesh.material.depthTest = true; mesh.material.depthWrite = false; mesh.material.needsUpdate = true; }
      placeCylinderBetween(mesh, a2, b2, Math.max(0.18, radius));
    }

    group.visible = true;
  }, [filtered.nodes, graph.nodes, geoCache.dashUnit, nodeMatCache.dashedBase, nodeMatCache.dashedInc, selectedId, linkCurvature]);

  const refreshAllDashed = useCallback(() => {
    const scene = fgRef.current?.scene?.(); if (!scene) return;
    scene.traverse((obj) => { if (obj.userData?.type === 'logical-dashed' && obj.userData.link) { updateLogicalDashed(obj.userData.link, obj); obj.visible = true; } });
  }, [updateLogicalDashed]);

  useEffect(() => { refreshAllDashed(); }, [selectedId, filtered.links, refreshAllDashed]);

  // useCallback로 노드 포커스 함수 최적화
  const focusNodeById = useCallback((nodeId) => {
    const node = filtered.nodes.find((n) => n.id === nodeId) || graph.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setSelected(node);
    const distance = 300;
    const zFixed = 640;
    const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    fgRef.current?.cameraPosition({ x: (node.x || 1) * distRatio, y: (node.y || 1) * distRatio, z: zFixed }, node, 900);
  }, [filtered.nodes, graph.nodes]);

  useEffect(() => {
    const timer = setTimeout(() => { const core = graph.nodes.find((n) => n.kind === "core"); if (core) focusNodeById(core.id); }, 300);
    return () => clearTimeout(timer);
  }, [graph.nodes, focusNodeById]);

  // useCallback로 존 토글 함수들 최적화
  const toggleZone = useCallback((z) => {
    setSelected((prev) => (prev && normalizeZoneVal(prev.zone) === z ? null : prev));
    setSelectedZones((prev) => { const set = new Set(prev); if (set.has(z)) set.delete(z); else set.add(z); return Array.from(set).sort((a,b)=>a-b); });
  }, []);

  const selectAll = useCallback(() => setSelectedZones(allZones), [allZones]);
  const selectNone = useCallback(() => setSelectedZones([]), []);

  // Space 키 + 드래그로 패닝
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

  // Zone 상태 관리
  const [selectedNode, setSelectedNode] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const mainGraphContainerRef = useRef(null);

  // Zone 상세는 모달로 오버레이 렌더: 메인 그래프가 언마운트되지 않도록 함

  // 컨테이너 정확 맞춤: 메인 그래프 컨테이너 크기 측정해 ForceGraph3D width/height 전달
  // useMemo와 useCallback으로 최적화하여 불필요한 재측정 방지
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  const measureContainer = useCallback(() => {
    const el = mainGraphContainerRef.current;
    if (!el) return;
    try { 
      setContainerSize({ width: el.clientWidth || 0, height: el.clientHeight || 0 }); 
    } catch {}
  }, []);

  useEffect(() => {
    const el = mainGraphContainerRef.current;
    if (!el) return;
    measureContainer();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measureContainer);
      try { ro.observe(el); } catch {}
    } else {
      window.addEventListener('resize', measureContainer);
    }
    return () => {
      try { if (ro && el) ro.unobserve(el); } catch {}
      window.removeEventListener('resize', measureContainer);
    };
  }, [measureContainer]);

  return (
    <Card sx={{
      width: '100%',
      height: 'calc(100vh - 120px)',
      bgcolor: 'background.paper',
      borderRadius: 2,
      boxShadow: 3,
      overflow: 'hidden'
    }}>
      <CardContent sx={{ p: 2, height: '100%', display: 'flex', gap: 2 }}>
        {/* 왼쪽 툴바 */}
        <Card sx={{
          width: 280,
          flex: 'none',
          bgcolor: '#f0edfd',
          color: '#000',
          border: '1px solid #d0c9f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, fontSize: '1rem', color: '#000000ff' }}>
              Network Topology
            </Typography>
            <div style={{height:1, background:'rgba(0,0,0,0.10)', margin:'6px 0 10px'}} />
          {/* 링크 유형 */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#000000ff' }}>Link Type</Typography>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:14}}>
            <button onClick={()=>{ setLinkTypeFilter('physical'); }} style={{ padding:'7px 0',borderRadius:8,fontSize:12, background:(view==="physical" || linkTypeFilter==='physical')?'#2563ebcc':'rgba(240,237,253, 1)', color:'#000000ff',border:'1px solid',cursor:'pointer' }} title="물리 링크만 보기">Physical</button>
            <button onClick={()=>{ setLinkTypeFilter('logical'); }} style={{ padding:'7px 0',borderRadius:8,fontSize:12, background:(view==="logical" || linkTypeFilter==='logical')?'#2563ebcc':'rgba(240,237,253, 1)', color:'#000000ff',border:'1px solid',cursor:'pointer' }} title="논리 링크(점선)만 보기">Logical</button>
          </div>
          {/* 뷰 초기화 */}
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <button onClick={() => { setSelected(null); setSelectedZones(allZones); setLinkTypeFilter('all'); const core = graph.nodes.find((n) => n.kind === "core"); if (core && fgRef.current) { const distance = 150; const zFixed = 640; const distRatio = 1 + distance / Math.hypot(core.x || 1, core.y || 1, core.z || 1); fgRef.current.cameraPosition({ x: (core.x || 1) * distRatio, y: (core.y || 1) * distRatio, z: zFixed }, core, 800); } }} style={{flex:1,padding:'7px 0', borderRadius:8,fontSize:13,background:'#39306b',color:'#fff',border:'1px solid #3b82f6',cursor:'pointer'}}>뷰 초기화</button>
          </div>
          {/* Zones 목록 */}
          <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0 10px'}}>
            <div style={{width:12,height:12,borderRadius:6,background:'#60a5fa',boxShadow:'0 0 4px #60a5fa'}}></div>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#000000ff' }}>Zones</Typography>
          </div>

          <div style={{flex:1,overflowY:'auto',paddingRight:4}}>
            {allZones.map((z) => {
              const active = selectedZones.includes(z);
              const ct = countByZone.get(z) || 0;
              return (
                <div key={z} style={{border:'1px solid '+(active?'#3b82f6':'#e5e7eb22'),borderRadius:8,marginBottom:8,background:'rgba(255,255,255,0.05)'}}>
                  <button onClick={() => setActiveZone(z)} style={{ width:'100%',textAlign:'left',padding:'10px 14px',fontSize:13,color:'#000000ff',fontWeight:active?600:400,background:'transparent',border:'none',cursor:'pointer' }}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span>Zone {z}</span>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:999,background:'rgba(255,255,255,0.12)',color:'#000000ff'}}>{ct}</span>
                    </div>
                  </button>
                  <div style={{display:'flex',gap:6,padding:'0 10px 10px'}}>
                    <button onClick={() => setActiveZone(z)} title="존 상세 보기" style={{flex:1,padding:'6px 0',borderRadius:8,fontSize:12,background:'#39306b',color:'#fff',border:'1px solid #3b82f6',cursor:'pointer'}}>Details</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Zone filter checkboxes */}
          <div style={{marginTop:'auto',paddingTop:18}}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#000000ff' }}>Zone Filter</Typography>
            <form style={{display:'flex',flexDirection:'column',gap:6,marginBottom:10}}>
              {allZones.map((z) => (
                <label key={z} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#000000ff',cursor:'pointer'}}>
                  <input type="checkbox" checked={selectedZones.includes(z)} onChange={() => toggleZone(z)} style={{accentColor:'#2563eb',width:16,height:16,margin:0}} />
                  <span>Zone {z} <span style={{fontSize:11,marginLeft:4,color:'#000000ff'}}>({countByZone.get(z) || 0})</span></span>
                </label>
              ))}
            </form>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <button onClick={selectAll}  style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:13,background:'rgba(255,255,255,0.10)',color:'#F0EDFD',border:'1px solid rgba(255,255,255,0.10)',cursor:'pointer'}}>All</button>
              <button onClick={selectNone} style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:13,background:'rgba(255,255,255,0.10)',color:'#F0EDFD',border:'1px solid rgba(255,255,255,0.10)',cursor:'pointer'}}>None</button>
            </div>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#000000ff' }}>
              {filtered.nodes.length} nodes • {filtered.links.length} links
            </Typography>
          </div>
        </CardContent>
      </Card>

      {/* 그래프 영역 */}
      <Card sx={{
        flex: 1,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(57, 48, 107, 0.07)',
        background: '#856affff'
      }}>
        <div ref={mainGraphContainerRef} style={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}>
          <Suspense fallback={
            <div style={{position:'absolute',left:0,top:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{background:'rgba(0,0,0,0.6)',color:'#fff',padding:'12px 18px',borderRadius:8,backdropFilter:'blur(4px)'}}>
                Loading Graph...
              </div>
          </div>
        }>
            <ForceGraph3D
            ref={fgRef}
            graphData={filtered}
            backgroundColor="#F0EDFD"
            width={containerSize.width}
            height={containerSize.height}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend
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
          linkDirectionalArrowLength={6.0}
          linkDirectionalArrowRelPos={0.58}
          onEngineTick={useCallback(() => {
            const scene = fgRef.current?.scene?.(); if (!scene) return;
            scene.traverse((obj) => { if (obj.userData?.type === 'logical-dashed' && obj.userData.link) { updateLogicalDashed(obj.userData.link, obj); } });
          }, [updateLogicalDashed])}
          onEngineStop={useCallback(() => { refreshAllDashed(); }, [refreshAllDashed])}
          onLinkUpdate={useCallback((l, obj) => {
            try { if (obj && obj.computeLineDistances) obj.computeLineDistances(); } catch {}
            if (String(l.type || '').toLowerCase() === 'logical') {
              const scene = fgRef.current?.scene?.(); if (!scene) return;
              scene.traverse((o) => { if (o.userData?.type === 'logical-dashed' && o.userData.link === l) { updateLogicalDashed(l, o); } });
            }
          }, [updateLogicalDashed])}
          onNodeClick={useCallback((n)=>{
            setSelected(n);
            if (n) {
              // 연결된 노드 정보 수집
              const connectedNodes = adjacency.get(n.id) || new Set();
              const connectedIps = Array.from(connectedNodes)
                .map(nid => {
                  const node = filtered.nodes.find(node => node.id === nid);
                  return node?.ip;
                })
                .filter(ip => ip);
              
              // 클릭한 노드와 연결된 모든 링크의 상세 정보 수집 (dbInfo)
              const dbInfo = filtered.links
                .filter(link => {
                  const sid = typeof link.source === 'object' ? link.source.id : link.source;
                  const tid = typeof link.target === 'object' ? link.target.id : link.target;
                  return sid === n.id || tid === n.id;
                })
                .map(link => {
                  const sid = typeof link.source === 'object' ? link.source.id : link.source;
                  const tid = typeof link.target === 'object' ? link.target.id : link.target;
                  const srcNode = filtered.nodes.find(node => node.id === sid) || graph.nodes.find(node => node.id === sid);
                  const dstNode = filtered.nodes.find(node => node.id === tid) || graph.nodes.find(node => node.id === tid);
                  
                  return {
                    src_IP: srcNode ? {
                      id: srcNode.id,
                      ip: srcNode.ip,
                      __labels: [srcNode.kind],
                      __id: srcNode.id,
                      index: srcNode.zone
                    } : null,
                    dst_IP: dstNode ? {
                      id: dstNode.id,
                      ip: dstNode.ip,
                      __labels: [dstNode.kind],
                      __id: dstNode.id,
                      index: dstNode.zone
                    } : null,
                    edge: {
                      sourceIP: sid,
                      targetIP: tid,
                      type: link.type,
                      count: link.count
                    }
                  };
                });
              
              const newLog = {
                message: `노드 선택: ${n.label || n.id}`,
                nodeInfo: { kind: n.kind, zone: n.zone, ip: n.ip },
                connectedCount: connectedNodes.size,
                connectedIps: connectedIps,
                dbInfo: dbInfo
              };
              setEventLogs([newLog]);
            }
          }, [adjacency, filtered.nodes, filtered.links, graph.nodes])}
          onBackgroundClick={useCallback(()=>{
            setSelected(null);
            setEventLogs([]);
          }, [])}
          enableNodeDrag={false}
          showNavInfo={false}
          warmupTicks={10}
          cooldownTicks={30}
          d3AlphaDecay={0.05}
          d3VelocityDecay={0.4}
          />
          </Suspense>
          {loading && (
            <div style={{position:'absolute',left:0,top:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
              <div style={{background:'rgba(0,0,0,0.6)',color:'#fff',padding:'12px 18px',borderRadius:8,backdropFilter:'blur(4px)'}}>Loading…</div>
            </div>
          )}

          {/* 컨테이너 리사이즈 또는 데이터 변경 시 그래프 중앙 정렬 유지 */}
            {useEffect(()=>{
            const recenter = () => { try { fgRef.current && fgRef.current.zoomToFit(600, 40); } catch {} };
            // 데이터 로딩 이후
            if (filtered.nodes?.length || filtered.links?.length) requestAnimationFrame(recenter);
            const el = mainGraphContainerRef.current;
            let ro;
            if (el && typeof ResizeObserver !== 'undefined') {
              ro = new ResizeObserver(() => requestAnimationFrame(recenter));
              ro.observe(el);
            } else {
              window.addEventListener('resize', recenter);
            }
            return () => {
              if (ro && el) ro.unobserve(el);
              window.removeEventListener('resize', recenter);
            };
          }, [filtered])}

          {/* Zone 상세를 메인 그래프 영역 안에서 오버레이로 렌더링 (메인 좌표계 정렬) */}
          {activeZone !== null && (
            <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:60}}>
              {/* 클릭 시 닫히는 반투명 배경 (메인 영역 전체) */}
              <div onClick={() => setActiveZone(null)} style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.6)'}} />
              {/* 콘텐츠는 주변에 여백을 두어 바깥 클릭 닫기가 가능하도록 함 */}
              <div
                onClick={(e)=>e.stopPropagation()}
                style={{
                  position:'relative',
                  width:'calc(100% - 48px)',
                  height:'calc(100% - 48px)',
                  margin:'24px',
                  background:'#0b0f14',
                  borderRadius:12,
                  boxShadow:'0 12px 40px rgba(0,0,0,0.8)',
                  overflow:'hidden',
                  border:'1px solid rgba(255,255,255,0.04)'
                }}>
                <Suspense fallback={<div style={{color:'#fff',padding:20}}>Loading...</div>}>
                  <ZonePage zone={activeZone} onBack={() => setActiveZone(null)} onInspectorChange={onInspectorChange} setEventLogs={setEventLogs} />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 우측 이벤트 로그 패널 */}
      <Suspense fallback={<div style={{width:280}}></div>}>
        <InternalLog eventLogs={eventLogs} />
      </Suspense>

      {/* Zone 상세 오버레이는 메인 내부에서 렌더됨 */}
      </CardContent>
    </Card>
  );
}

// React.memo로 export하여 불필요한 재렌더링 방지
export default React.memo(NetworkTopology3D_LeftSidebar);
