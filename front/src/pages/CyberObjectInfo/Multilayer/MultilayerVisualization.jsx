import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, IconButton } from '@mui/material';
import interactionTracker from '../../../utils/interactionTracker';
import { ClusterOutlined } from '@ant-design/icons';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import ThreelayerLog from './3layer_Log.jsx';

// ===================== 상수 =====================
const STATUS = ['up', 'down', 'unknown'];
const LAYER_COLORS = { physical: '#3BA3FF', logical: '#9B6BFF', persona: '#FF9E3B' };
const LAYOUT = {
  nodeSpread: 800,        // x/y 기본 분포 반경
  layerZ: { physical: -600, logical: 0, persona: 600 }, // 레이어별 z 분리 증가
  plane: { width: 2000, height: 1400 }, // 레이어 평면 크기 확대
  subnetRadius: 420      // 서브넷 클러스터 배치 반경
};
const KIND_COLORS = {
  CONNECTS_TO: '#A0AEC0',
  CONNECTED: '#A0AEC0',
  HOSTS: '#60A5FA',
  USES: '#F59E0B',
  IN_SUBNET: '#93C5FD',
  IN_VLAN: '#C084FC',
  MEMBER_OF: '#FBBF24'
};
const NODE_VISUAL_SCALE = 1.8;
const CANONICAL_DEVICE_KINDS = ['router', 'server', 'firewall', 'sensor', 'switch', 'laptop', 'workstation', 'printer', 'plc', 'persona'];
const LEGEND_COLOR_BY_KIND = {
  router: LAYER_COLORS.physical,
  server: LAYER_COLORS.physical,
  firewall: LAYER_COLORS.physical,
  sensor: LAYER_COLORS.physical,
  switch: LAYER_COLORS.physical,
  laptop: LAYER_COLORS.physical,
  workstation: LAYER_COLORS.physical,
  printer: LAYER_COLORS.physical,
  plc: LAYER_COLORS.physical,
  persona: LAYER_COLORS.persona
};

// 백엔드 API 베이스
const API_BASE = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_BASE) || 'http://localhost:8000';
const PROJECT_FILTER = 'multi-layer'; // 또는 null

// ===================== 유틸 =====================
const isCrossLayer = (a, b) => a.layer !== b.layer;

// CVE 추출 유틸
function extractCVE(node) {
  if (!node) return [];
  const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const out = new Set();
  const pullFromObject = (obj) => {
    if (!obj || typeof obj !== 'object') return '';
    return (
      obj.cve || obj.CVE || obj.id || obj.value || obj.name || obj.key || obj.description || ''
    );
  };
  const cveRegex = /CVE-\d{4}-\d+/gi;
  const addVals = (vals) => {
    toArray(vals).forEach((x) => {
      const raw = typeof x === 'string' ? x : pullFromObject(x);
      const s = String(raw || '').trim();
      if (!s) return;
      const matches = s.match(cveRegex);
      if (matches) matches.forEach((m) => out.add(m.toUpperCase()));
      else if (s.toUpperCase().includes('CVE')) out.add(s.toUpperCase());
    });
  };
  addVals(node.cve);
  addVals(node.CVE);
  addVals(node.cves);
  addVals(node.CVEs);
  addVals(node.cve_list);
  addVals(node.vulns);
  addVals(node.vulnerabilities);
  addVals(node.vulnerability);
  addVals(node.tags);
  addVals(node.description);
  return Array.from(out);
}

function resolveTopologyKind(node) {
  const layer = String(node?.layer || '').toLowerCase();
  const type = String(node?.type || '').toLowerCase();
  const text = [
    type,
    node?.label,
    node?.description,
    node?.id,
    node?.service_name,
    node?.key
  ].filter(Boolean).join(' ').toLowerCase();

  const classify = (value) => {
    const original = String(value || '').toLowerCase().trim();
    if (!original) return null;
    const s = original.replace(/[_\s]/g, '').replace(/-logical$/g, '').replace(/^logical-/g, '');
    if (/(persona|account|employee|analyst|admin|operator|user)/.test(s)) return 'persona';
    if (/(router|routing|gateway|vpn|dns|dhcp)/.test(s)) return 'router';
    if (/(firewall|\bfw\b|proxy|filter|threat|securitygateway|ssl|certificate)/.test(s)) return 'firewall';
    if (/(sensor|ids|ips|probe)/.test(s)) return 'sensor';
    if (/(switch|l2switch|l3switch|switchrouter|layer3|core|subnet|vlan|backbone|monitor|monitoring|snmp|netflow|siem|backup|policy|analyzer|sync|collector|detection|intrusion)/.test(s)) return 'switch';
    if (/(laptop|notebook)/.test(s)) return 'laptop';
    if (/(workstation|desktop|endpoint|client|pc)/.test(s)) return 'workstation';
    if (/(printer|print)/.test(s)) return 'printer';
    if (/(plc|controller|scada|hmi|ot|controldriver|controlservice|visualization)/.test(s)) return 'plc';
    if (/(server|service|app|application|identity|directory|sso|auth|ldap|database|db|mysql|mail|smtp|api|portal|platform|host|node|device|asset|system)/.test(s)) return 'server';
    return null;
  };

  const cleanedType = type.replace(/[_\s]/g, '').replace(/-logical$/g, '').replace(/^logical-/g, '');
  const isGenericType = /^(service|logical|physical|node|device|host|asset|entity|unknown|na)?$/.test(cleanedType);

  const fromType = classify(type);
  if (fromType && !isGenericType) return fromType;

  const fromText = classify(text);
  if (fromText) return fromText;

  if (layer === 'persona') return 'persona';
  return 'server';
}

function resolveLayerZ(layer) {
  if (layer === 'persona') return LAYOUT.layerZ.persona;
  if (layer === 'logical') return LAYOUT.layerZ.logical;
  return LAYOUT.layerZ.physical;
}

function formatDeviceType(typeName) {
  const base = String(typeName || 'server').replace(/^logical-/, '').toLowerCase();
  if (!base) return 'Server';
  if (base === 'plc') return 'PLC';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function createLegendModelObject(kind, colorHex) {
  let baseKind = String(kind || 'server').replace(/^logical-/, '');
  if (baseKind === 'core' || baseKind === 'l3switch' || baseKind === 'monitor') baseKind = 'switch';
  if (baseKind === 'client') baseKind = 'workstation';
  if (baseKind === 'app' || baseKind === 'identity' || baseKind === 'database' || baseKind === 'mail') baseKind = 'server';
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex || '#8B5CF6'),
    metalness: 0.2,
    roughness: 0.72
  });
  const makeMesh = (geometry) => new THREE.Mesh(geometry, material.clone());

  if (baseKind === 'core') {
    const mesh = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    mesh.scale.set(1.2, 0.95, 1.2);
    return mesh;
  }
  if (baseKind === 'router') return makeMesh(new THREE.CylinderGeometry(3.6, 3.6, 7.2, 18));
  if (baseKind === 'switch') {
    const mesh = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    mesh.scale.set(1.2, 0.95, 1.2);
    return mesh;
  }
  if (baseKind === 'laptop') {
    const group = new THREE.Group();
    const keyboard = makeMesh(new THREE.BoxGeometry(8.4, 0.95, 6.2));
    const screen = makeMesh(new THREE.BoxGeometry(8.2, 4.8, 0.7));
    keyboard.position.y = -1.8;
    screen.position.set(0, 1.1, -2.7);
    screen.rotation.x = -0.35;
    group.add(keyboard);
    group.add(screen);
    return group;
  }
  if (baseKind === 'workstation') {
    const group = new THREE.Group();
    const tower = makeMesh(new THREE.BoxGeometry(3.2, 7.8, 3.0));
    const monitor = makeMesh(new THREE.BoxGeometry(7.0, 4.4, 0.7));
    tower.position.set(-2.8, -0.2, 0);
    monitor.position.set(2.0, 0.6, 0);
    group.add(tower);
    group.add(monitor);
    return group;
  }
  if (baseKind === 'l3switch') {
    const group = new THREE.Group();
    const base = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    const top = makeMesh(new THREE.CylinderGeometry(2.8, 2.8, 2.2, 16));
    top.position.y = 2.6;
    group.add(base);
    group.add(top);
    return group;
  }
  if (baseKind === 'firewall') return makeMesh(new THREE.ConeGeometry(4.2, 9, 10));
  if (baseKind === 'plc') {
    const group = new THREE.Group();
    const core = makeMesh(new THREE.SphereGeometry(3.0, 16, 16));
    const base = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    base.scale.set(1.3, 0.4, 1.0);
    base.position.y = -2.0;
    group.add(core);
    group.add(base);
    return group;
  }
  if (baseKind === 'printer') {
    const group = new THREE.Group();
    const body = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    const tray = makeMesh(new THREE.BoxGeometry(7.6, 1.1, 1.8));
    body.scale.set(1.12, 0.58, 1.0);
    tray.scale.set(0.96, 0.36, 0.82);
    tray.position.y = 1.3;
    group.add(body);
    group.add(tray);
    return group;
  }
  if (baseKind === 'database') {
    const group = new THREE.Group();
    [-1.8, 0, 1.8].forEach((y) => {
      const disk = makeMesh(new THREE.CylinderGeometry(5.2, 5.2, 1.4, 24));
      disk.position.y = y;
      group.add(disk);
    });
    return group;
  }
  if (baseKind === 'mail') {
    const group = new THREE.Group();
    const body = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    const flap = makeMesh(new THREE.BoxGeometry(7.6, 1.1, 1.8));
    body.scale.set(1.2, 0.48, 0.9);
    flap.scale.set(1.08, 0.45, 0.66);
    flap.rotation.z = 0.52;
    flap.position.y = 1.2;
    group.add(body);
    group.add(flap);
    return group;
  }
  if (baseKind === 'monitor') {
    const group = new THREE.Group();
    const ring = makeMesh(new THREE.TorusGeometry(7, 1.6, 16, 32));
    const eye = makeMesh(new THREE.SphereGeometry(3.0, 16, 16));
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(0.86, 0.86, 0.86);
    eye.scale.set(0.52, 0.52, 0.52);
    eye.position.y = 0.5;
    group.add(ring);
    group.add(eye);
    return group;
  }
  if (baseKind === 'client') {
    const group = new THREE.Group();
    const core = makeMesh(new THREE.TetrahedronGeometry(4.4));
    const sat = makeMesh(new THREE.SphereGeometry(3.0, 16, 16));
    sat.scale.set(0.35, 0.35, 0.35);
    sat.position.set(2.4, 1.3, 0);
    group.add(core);
    group.add(sat);
    return group;
  }
  if (baseKind === 'app') {
    const group = new THREE.Group();
    const layer1 = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    const layer2 = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    const layer3 = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
    layer1.scale.set(1.25, 0.3, 1.0);
    layer1.position.y = -1.4;
    layer2.scale.set(1.0, 0.3, 0.85);
    layer2.position.y = 0.2;
    layer3.scale.set(0.8, 0.3, 0.7);
    layer3.position.y = 1.8;
    group.add(layer1);
    group.add(layer2);
    group.add(layer3);
    return group;
  }
  if (baseKind === 'identity') {
    const group = new THREE.Group();
    const column = makeMesh(new THREE.CylinderGeometry(1.6, 1.6, 8.6, 14));
    const head = makeMesh(new THREE.SphereGeometry(3.0, 16, 16));
    column.scale.set(0.66, 0.95, 0.66);
    head.scale.set(0.58, 0.58, 0.58);
    head.position.y = 3.9;
    group.add(column);
    group.add(head);
    return group;
  }
  if (baseKind === 'sensor') {
    const group = new THREE.Group();
    const body = makeMesh(new THREE.SphereGeometry(3.0, 16, 16));
    const tip = makeMesh(new THREE.ConeGeometry(4.2, 9, 10));
    tip.scale.set(0.45, 0.55, 0.45);
    tip.position.y = 2.4;
    group.add(body);
    group.add(tip);
    return group;
  }
  if (baseKind === 'persona') return makeMesh(new THREE.SphereGeometry(3.0, 16, 16));

  const fallback = new THREE.Group();
  const body = makeMesh(new THREE.BoxGeometry(8.2, 2.6, 6.2));
  const head = makeMesh(new THREE.CylinderGeometry(2.8, 2.8, 2.2, 16));
  body.scale.set(1.0, 1.8, 1.0);
  head.position.y = 3.6;
  head.scale.set(1.05, 1.0, 1.05);
  fallback.add(body);
  fallback.add(head);
  return fallback;
}

function renderLegendThumbnail(kind, colorHex) {
  if (typeof window === 'undefined') return null;
  let renderer;
  try {
    const size = 56;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, 24);
    camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 0.7);
    key.position.set(10, 14, 10);
    scene.add(ambient);
    scene.add(key);

    const model = createLegendModelObject(kind, colorHex);
    const bbox = new THREE.Box3().setFromObject(model);
    const center = bbox.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const sizeVec = bbox.getSize(new THREE.Vector3());
    const maxDim = Math.max(sizeVec.x || 0, sizeVec.y || 0, sizeVec.z || 0) || 1;
    const scale = 11 / maxDim;
    model.scale.set(scale, scale, scale);
    model.rotation.y = -Math.PI / 6;
    model.rotation.x = Math.PI / 10;
    scene.add(model);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    model.traverse((child) => {
      if (child && child.isMesh) {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) child.material.forEach((mat) => mat?.dispose?.());
        else child.material?.dispose?.();
      }
    });
    renderer.dispose();
    return dataUrl;
  } catch (e) {
    try { renderer && renderer.dispose(); } catch (disposeErr) {}
    return null;
  }
}

// ===================== 정규화: Node/Edge =====================
function normalizeNode(raw) {
  // __labels / layer 속성 기반으로 레이어 판정
  const labelsLower = (raw.__labels || []).map(s => String(s).toLowerCase());
  let layer =
    (raw.layer && String(raw.layer).toLowerCase()) ||
    (labelsLower.includes('persona') ? 'persona'
      : (labelsLower.includes('logical') || labelsLower.includes('service') || labelsLower.includes('subnet') || labelsLower.includes('vlan')) ? 'logical'
      : (labelsLower.includes('physical') || labelsLower.includes('device') || labelsLower.includes('host')) ? 'physical'
      : 'physical');

  // type/label 기본값
  let type = (raw.type || labelsLower[0] || 'device').toString().toLowerCase();
  let label = raw.label || raw.hostname || raw.name || raw.user_name || raw.service_name || raw.subnet || raw.ip || raw.id;
  if (!label && raw.vlan !== undefined) label = `VLAN-${raw.vlan}`;
  const layerZ = resolveLayerZ(layer);

    return {
    id: raw.id,
    layer,
    type,
    label: label || String(raw.id || ''),
    status: raw.status || 'up',
    severity: typeof raw.severity === 'number' ? raw.severity : 0,
    ip: raw.ip,
    hostname: raw.hostname,
    os: raw.os,
    subnet: raw.subnet,
  // ensure optional fields propagate for EventLog rendering
  dns: raw.dns,
  gateway: raw.gateway,
  description: raw.description,
  value: raw.value,
  key: raw.key,
  cve: raw.cve,
  cves: raw.cves,
  cve_list: raw.cve_list,
  vulns: raw.vulns,
  vulnerabilities: raw.vulnerabilities,
    service_name: raw.service_name,
    proto: raw.proto,
    port: raw.port,
    vlan: raw.vlan,
    user_name: raw.user_name,
    role: raw.role,
    dept: raw.dept,
    device_ids: raw.device_ids || [],
    tags: raw.tags || [],
  // 초기 위치 (레이어별 z 고정) — 노드를 레이어 평면 영역에 골고루 분포시킴
  x: (Math.random() - 0.5) * LAYOUT.plane.width * 0.9,
  y: (Math.random() - 0.5) * LAYOUT.plane.height * 0.9,
    z: layerZ,
    fz: layerZ
  };
}

function normalizeEdge(rawEdge) {
  if (!rawEdge) return null;
  // 백엔드가 edge.rel = "HOSTS" | "USES" 를 줄 수 있음. 없으면 기존 필드도 시도
  let kind = rawEdge.kind || rawEdge.rel || rawEdge.type || 'CONNECTS_TO';
  if (kind === 'CONNECTED') kind = 'CONNECTS_TO';
  return {
    source: rawEdge.sourceIP,
    target: rawEdge.targetIP,
    kind,
    assumed: Boolean(rawEdge.assumed),
    confidence: typeof rawEdge.confidence === 'number' ? rawEdge.confidence : undefined,
    __sid: rawEdge.sourceIP,
    __tid: rawEdge.targetIP
  };
}

// ===================== 레코드 → 그래프 =====================
function mergeRecordsToGraph(allRecords) {
  const nodesMap = new Map();
  const links = [];

  for (const rec of allRecords) {
    const sRaw = rec.src_IP || rec.n || rec.source; 
    const tRaw = rec.dst_IP || rec.t || rec.target; 
    const eRaw = rec.edge || rec.r; 
    if (!sRaw || !tRaw) continue;
    const sid = sRaw.id; const tid = tRaw.id;
    if (!sid || !tid) continue;
    if (!nodesMap.has(sid)) nodesMap.set(sid, normalizeNode(sRaw));
    if (!nodesMap.has(tid)) nodesMap.set(tid, normalizeNode(tRaw));
    const e = normalizeEdge(eRaw);
    if (e) links.push(e);
  }

  // 서브넷 클러스터 근처로 물리 노드 살짝 재배치
  const nodes = [...nodesMap.values()];
  const subs = nodes.filter(n => n.type === 'subnet');
  const devs = nodes.filter(n => n.layer === 'physical');
  const subnetCenters = new Map();
  subs.forEach((s, i) => {
    const angle = (i / Math.max(1, subs.length)) * Math.PI * 2;
    const radius = LAYOUT.subnetRadius;
    subnetCenters.set(s.subnet || s.label || s.id, { cx: Math.cos(angle) * radius, cy: Math.sin(angle) * radius });
  });
  devs.forEach(d => {
    const key = d.subnet || d.label;
    const c = subnetCenters.get(key);
    if (c) { d.x = c.cx + (Math.random() - 0.5) * 50; d.y = c.cy + (Math.random() - 0.5) * 50; }
  });

  return { nodes, links };
}

// ===================== 데이터 페치 =====================
async function fetchThreeLayer(project) {
  const url = `${API_BASE}/neo4j/nodes?activeView=multilayer${project ? `&project=${encodeURIComponent(project)}` : ''}`;
  
  return await interactionTracker.measureResponse(
    'MultilayerVisualization',
    'Fetch Three Layer Data',
    async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`failed fetch: ${res.status}`);
      return res.json();
    },
    { project, url }
  ).then(result => result.result);
}

// ===================== 인접 계산 =====================
function buildAdjacency(nodes, links) {
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  const adj = new Map(); nodes.forEach(n => adj.set(n.id, new Set()));
  links.forEach(l => {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (adj.has(s)) adj.get(s).add(t);
    if (adj.has(t)) adj.get(t).add(s);
    l.__sid = s; l.__tid = t; l.__s = byId[s]; l.__t = byId[t];
  });
  return { byId, adj };
}

// ===================== 폴백 모킹 =====================
function generateMockGraph() {
  const nodes = [];
  const links = [];
  for (let i = 0; i < 30; i++) nodes.push({ id: `dev-${i}`, layer: 'physical', type: 'server', label: `DEV-${i}`, status: 'up', severity: 0, x: (Math.random()-0.5)*LAYOUT.nodeSpread, y: (Math.random()-0.5)*LAYOUT.nodeSpread, z: LAYOUT.layerZ.physical, fz: LAYOUT.layerZ.physical });
  for (let i = 0; i < 10; i++) nodes.push({ id: `svc-${i}`, layer: 'logical', type: 'service', label: `SVC-${i}`, status: 'up', severity: 0, x: (Math.random()-0.5)*LAYOUT.nodeSpread, y: (Math.random()-0.5)*LAYOUT.nodeSpread, z: LAYOUT.layerZ.logical, fz: LAYOUT.layerZ.logical });
  for (let i = 0; i < 10; i++) nodes.push({ id: `user-${i}`, layer: 'persona', type: 'user', label: `USER-${i}`, status: 'up', severity: 0, x: (Math.random()-0.5)*LAYOUT.nodeSpread, y: (Math.random()-0.5)*LAYOUT.nodeSpread, z: LAYOUT.layerZ.persona, fz: LAYOUT.layerZ.persona });
  for (let i = 0; i < 80; i++) links.push({ source: `dev-${Math.floor(Math.random()*30)}`, target: `svc-${Math.floor(Math.random()*10)}`, kind: 'HOSTS' });
  for (let i = 0; i < 80; i++) links.push({ source: `user-${Math.floor(Math.random()*10)}`, target: `svc-${Math.floor(Math.random()*10)}`, kind: 'USES' });
  return { nodes, links };
}

// ===================== 상세 패널 =====================
function NodeDetailPanel({ selected, adj, visible, byId, onClearSelection, onResetView }) {
  if (!selected) {
    return (
      <div style={{ padding: 16, color: '#d1d5db', fontSize: 14 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>선택된 노드가 없습니다</div>
        노드를 클릭하면 상세 정보와 연결 리스트가 여기에 표시됩니다.
      </div>
    );
  }
  return (
    <>
      <div style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#fff' }}>기본 정보</div>
        <div style={{ display: 'grid', rowGap: 6, color: '#e5e7eb', fontSize: 13 }}>
          <div><b>ID:</b> <span style={{ wordBreak: 'break-all' }}>{selected.id}</span></div>
          <div><b>Layer:</b> {selected.layer}</div>
          <div><b>Type:</b> {selected.type}</div>
          <div><b>Label:</b> {selected.label}</div>
          <div><b>Status:</b> {selected.status}</div>
          <div><b>Severity:</b> {selected.severity}</div>
          {Array.isArray(selected.tags) && selected.tags.length > 0 && (<div><b>Tags:</b> {selected.tags.join(', ')}</div>)}
        </div>
      </div>
      <ConnLists selectedId={selected.id} visible={visible} adj={adj} byId={byId} />
      <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 8 }}>
        <button onClick={onClearSelection} style={{ padding: '4px 8px', background: '#374151', color: '#fff', border: 'none', borderRadius: 6 }}>선택 해제</button>
        <button onClick={onResetView} style={{ padding: '4px 8px', background: '#374151', color: '#fff', border: 'none', borderRadius: 6 }}>전체 보기</button>
      </div>
    </>
  );
}

function ConnLists({ selectedId, visible, byId, adj }) {
  return (
    <div style={{ padding: 16, flex: 1, overflow: 'auto' }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#fff' }}>동일 레이어 연결</div>
      <ConnList listType="same" selectedId={selectedId} visible={visible} byId={byId} adj={adj} />
      <div style={{ height: 12 }} />
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#fff' }}>교차 레이어 연결</div>
      <ConnList listType="cross" selectedId={selectedId} visible={visible} byId={byId} adj={adj} />
    </div>
  );
}

function ConnList({ listType, selectedId, visible, byId, adj }) {
  const items = [];
  if (selectedId && byId[selectedId]) {
    (adj.get(selectedId) || []).forEach(nid => {
      const l = visible.links.find(lnk => {
        const s = lnk.__sid || (typeof lnk.source === 'object' ? lnk.source.id : lnk.source);
        const t = lnk.__tid || (typeof lnk.target === 'object' ? lnk.target.id : lnk.target);
        return (s === selectedId && t === nid) || (t === selectedId && s === nid);
      });
      const other = byId[nid];
      if (!l || !other) return;
      const cross = other.layer !== byId[selectedId].layer;
      if ((listType === 'same' && !cross) || (listType === 'cross' && cross)) items.push({ l, other });
    });
  }
  if (!items.length) return <div style={{ fontSize: 12, color: '#9ca3af' }}>없음</div>;
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(55,65,81,0.5)', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: LAYER_COLORS[it.other.layer] }} />
            <span style={{ color: '#e5e7eb' }}>{it.other.label}</span>
            <span style={{ color: '#9ca3af' }}>({it.other.type})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {it.l.assumed && <span style={{ background: '#374151', color: '#e5e7eb', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>assumed</span>}
            <span style={{ color: '#9ca3af' }}>{it.l.kind}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== 메인 컴포넌트 =====================
export default function CyberMultiLayer3D({ onNodeSelect = () => {}, onInspectorChange = () => {} }) {
  const fgRef = useRef();
  const containerRef = useRef(null);
  const graphContainerRef = useRef(null);
  const graphNodesRef = useRef([]);   // z-lock 포스가 최신 노드를 참조하기 위한 ref
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [pulse, setPulse] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [layerFilter, setLayerFilter] = useState({ physical: true, logical: true, persona: true });
  const [assumedFilter, setAssumedFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState(new Set(STATUS));
  const [eventLogs, setEventLogs] = useState([]);

  const { byId, adj } = useMemo(() => buildAdjacency(graphData.nodes, graphData.links), [graphData]);
  const geoCache = useMemo(() => ({
    torus: new THREE.TorusGeometry(7, 1.6, 16, 32),
    cone: new THREE.ConeGeometry(4.2, 9, 10),
    cylinder: new THREE.CylinderGeometry(4.2, 4.2, 8, 18),
    disk: new THREE.CylinderGeometry(5.2, 5.2, 1.4, 24),
    pill: new THREE.CylinderGeometry(1.6, 1.6, 8.6, 14),
    box: new THREE.BoxGeometry(8.2, 2.6, 6.2),
    bar: new THREE.BoxGeometry(7.6, 1.1, 1.8),
    l3top: new THREE.CylinderGeometry(2.8, 2.8, 2.2, 16),
    sphere: new THREE.SphereGeometry(3.0, 16, 16),
    octa: new THREE.OctahedronGeometry(4.2),
    tetra: new THREE.TetrahedronGeometry(4.4),
    led: new THREE.SphereGeometry(0.7, 8, 8),
    hit: new THREE.SphereGeometry(7, 8, 8)
  }), []);
  const nodeMatCache = useMemo(() => ({
    base: new Map(),
    highlight: new THREE.MeshStandardMaterial({ color: 0xffda79, metalness: 0.25, roughness: 0.72 }),
    dim: new THREE.MeshStandardMaterial({ color: 0x324055, metalness: 0.25, roughness: 0.72, transparent: true, opacity: 0.15 }),
    ledUp: new THREE.MeshBasicMaterial({ color: 0x00ff99 }),
    ledDown: new THREE.MeshBasicMaterial({ color: 0xff3355 }),
    hit: new THREE.MeshBasicMaterial({ opacity: 0.0, transparent: true, depthWrite: false })
  }), []);
  const getBaseMat = useCallback((hex) => {
    let material = nodeMatCache.base.get(hex);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(hex),
        metalness: 0.25,
        roughness: 0.72
      });
      nodeMatCache.base.set(hex, material);
    }
    return material;
  }, [nodeMatCache]);
  const estimateNodeScale = useCallback((node) => {
    const kind = String(resolveTopologyKind(node) || 'server').replace(/^logical-/, '');
    const degree = adj.get(node.id)?.size || 0;
    const baseByKind = {
      router: 1.55,
      firewall: 1.45,
      plc: 1.52,
      switch: 1.45,
      laptop: 1.4,
      workstation: 1.45,
      printer: 1.45,
      server: 1.5,
      sensor: 1.42,
      hub: 1.42,
      persona: 1.35
    };
    const base = baseByKind[kind] ?? (1.35 + degree * 0.06);
    return Math.max(1.25, Math.min(3.0, base)) * NODE_VISUAL_SCALE;
  }, [adj]);

  // 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    interactionTracker.log('MultilayerVisualization', 'Component Mounted', {});
    return () => {
      interactionTracker.log('MultilayerVisualization', 'Component Unmounted', {});
    };
  }, []);

  // 레이어 플레인
  const addSceneLights = () => {
    const scene = fgRef.current?.scene?.(); if (!scene) return;
    const existing = scene.getObjectByName('scene-lights'); if (existing) scene.remove(existing);
    const group = new THREE.Group(); group.name = 'scene-lights';

    const ambient = new THREE.AmbientLight(0xffffff, 0.38);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x253043, 0.95);
    hemi.position.set(0, 1200, 0);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(900, 1200, 700);

    const fill = new THREE.DirectionalLight(0x9ec5ff, 0.45);
    fill.position.set(-900, 500, -700);

    group.add(ambient);
    group.add(hemi);
    group.add(key);
    group.add(fill);
    scene.add(group);
  };

  const addLayerPlanes = () => {
    const scene = fgRef.current?.scene?.(); if (!scene) return;
    const existing = scene.getObjectByName('layer-planes'); if (existing) scene.remove(existing);
    const group = new THREE.Group(); group.name = 'layer-planes';
    const makePlane = (z, color, label) => {
      const planeGeo = new THREE.PlaneGeometry(LAYOUT.plane.width, LAYOUT.plane.height, 1, 1);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.48, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(planeGeo, mat); mesh.position.set(0, 0, z);
      const edges = new THREE.EdgesGeometry(planeGeo);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }));
      line.position.set(0, 0, z + 0.1);
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128; const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,512,128); ctx.font = '40px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, 14, 64);
  const tex = new THREE.CanvasTexture(canvas); const sprMat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false });
  const sprite = new THREE.Sprite(sprMat); sprite.scale.set(320, 80, 1);
  // 평면 영역의 좌상단에 레이블 표시 (여백 포함)
  sprite.position.set(-LAYOUT.plane.width/2 + 180, LAYOUT.plane.height/2 - 80, z + 0.2);
      group.add(mesh); group.add(line); group.add(sprite);
    };
  makePlane(LAYOUT.layerZ.physical, LAYER_COLORS.physical, 'Physical');
  makePlane(LAYOUT.layerZ.logical,  LAYER_COLORS.logical,  'Logical');
  makePlane(LAYOUT.layerZ.persona,  LAYER_COLORS.persona,  'Persona');
    scene.add(group);
  };
  const toggleLayerPlanes = (visible) => { const scene = fgRef.current?.scene?.(); const group = scene?.getObjectByName('layer-planes'); if (group) group.visible = !!visible; };

  // 초기 로딩: 카메라, 컨트롤, 레이어 평면 설정
  useEffect(() => {
    const fg = fgRef.current; if (!fg) return;
    const controls = fg.controls && fg.controls();
    if (controls) {
      // Disable OrbitControls-driven rotate (we use custom pointer rotation)
      // Keep zoom enabled, but ensure RIGHT mouse button does not trigger dolly/rotate.
      controls.enableRotate = false;
      controls.enablePan = false;
      controls.enableZoom = true;
      // Map mouse buttons explicitly: LEFT rotate (unused here), MIDDLE dolly, RIGHT pan (pan disabled)
      try { controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }; } catch (e) {}
      controls.minPolarAngle = 1e-6;
      controls.maxPolarAngle = 1e-6;
    }
    fg.cameraPosition({ x: 0, y: 1800, z: 0 }, { x: 0, y: 0, z: 0 }, 0);
    const scene = fg.scene(); scene.rotation.order = 'YXZ'; scene.rotation.set(0, 0, 0, 'YXZ');
    addSceneLights();
    addLayerPlanes(); toggleLayerPlanes(true);
  }, []);

  // 포스(힘) 설정 완화 + z축 고정 (노드가 레이어 평면 밖으로 벗어나지 않도록)
  useEffect(() => {
    const fg = fgRef.current; if (!fg) return;
    try { fg.d3Force('charge') && fg.d3Force('charge').strength(0); } catch {}
    try { fg.d3Force('link') && fg.d3Force('link').strength(() => 0.05); } catch {}
    // 매 틱마다 각 노드의 z를 레이어 기준값으로 강제 고정
    try {
      fg.d3Force('z-lock', () => {
        graphNodesRef.current.forEach(node => {
          const targetZ = node.layer === 'persona' ? LAYOUT.layerZ.persona
            : node.layer === 'logical' ? LAYOUT.layerZ.logical
            : LAYOUT.layerZ.physical;
          node.z = targetZ;
          node.vz = 0;
        });
      });
    } catch {}
  }, []);

  // 데이터 로딩 (3계층 통합: HOSTS + USES+ PHYSICAL 동일레이어 연결)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (mounted) setLoading(true);
      } catch (e) {}
      try {
        const records = await fetchThreeLayer(PROJECT_FILTER || undefined);
        const g = mergeRecordsToGraph(records);
        if (mounted) setGraphData(g);
      } catch (e) {
        if (mounted) setGraphData(generateMockGraph());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 컨테이너 리사이즈 및 데이터 변경 시 중앙으로 맞춤
  useEffect(() => {
    const recenter = () => { try { fgRef.current && fgRef.current.zoomToFit(600, 40); } catch {} };
    if (graphData.nodes?.length || graphData.links?.length) requestAnimationFrame(recenter);
    const el = containerRef.current;
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
  }, [graphData]);
  // ForceGraph3D를 감싸는 컨테이너의 실제 픽셀 크기를 측정하여 width/height로 전달
  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;
    const measure = () => {
      try { setContainerSize({ width: el.clientWidth || 0, height: el.clientHeight || 0 }); } catch {}
    };
    measure();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => measure());
      try { ro.observe(el); } catch {}
    } else {
      window.addEventListener('resize', measure);
    }
    return () => {
      try { if (ro && el) ro.unobserve(el); } catch {}
      window.removeEventListener('resize', measure);
    };
  }, []);

  // 회전 제어 (Yaw ±30°, Pitch 제한, Roll 무제한)
  useEffect(() => {
    const fg = fgRef.current; if (!fg) return;
    const dom = fg.renderer().domElement;
    const scene = fg.scene();
    const PITCH_LIMIT = 1.3; const YAW_LIMIT = Math.PI/6; const ROLL_LIMIT = Infinity; const PITCH_SENS = 0.005; const YAW_SENS = 0.006; const ROLL_SENS = 0.006; const KEY_STEP = Math.PI/60;
    const clampAll = () => { scene.rotation.x = THREE.MathUtils.clamp(scene.rotation.x, -PITCH_LIMIT, PITCH_LIMIT); scene.rotation.y = THREE.MathUtils.clamp(scene.rotation.y, -YAW_LIMIT, YAW_LIMIT); scene.rotation.z = THREE.MathUtils.clamp(scene.rotation.z, -ROLL_LIMIT, ROLL_LIMIT); scene.rotation.order='YXZ'; };
  let dragging=false,lastX=0,lastY=0;
  let spacePressed = false;
    const getX = (e) => e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const getY = (e) => e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
  const onMove = (e)=>{ if(!dragging) return; const x=getX(e), y=getY(e); const dx=x-lastX, dy=y-lastY; lastX=x; lastY=y; if(spacePressed){ scene.rotation.z += dx*ROLL_SENS; } else { scene.rotation.y += dx*YAW_SENS; scene.rotation.x += dy*PITCH_SENS; } clampAll(); };
    const onUp = ()=>{dragging=false;};
    // 우클릭 줌인줌아웃 방지 및 드래그 등 금지
    const onDown = (e)=>{
      try {
        if ((e.pointerType === 'mouse' || typeof e.button === 'number') && e.button === 2) {
          try { e.preventDefault(); e.stopPropagation(); } catch (err) {}
          return;
        }
      } catch (err) {}
      dragging=true; lastX=getX(e); lastY=getY(e);
    };
    dom.addEventListener('pointerdown', onDown, { capture: true });
  const onContextMenu = (ev) => { try { ev.preventDefault(); } catch (e) {} };
  dom.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    dom.addEventListener('pointerleave', onUp);
    const worldDiag = new THREE.Vector3(1,1,1).normalize();
    const onKey = (e)=>{ let used=true; switch(e.key){ case 'ArrowUp': scene.rotation.x -= KEY_STEP; break; case 'ArrowDown': scene.rotation.x += KEY_STEP; break; case 'ArrowLeft': scene.rotation.y -= KEY_STEP; break; case 'ArrowRight': scene.rotation.y += KEY_STEP; break; case 'z': case 'Z': scene.rotation.z -= KEY_STEP; break; case 'x': case 'X': scene.rotation.z += KEY_STEP; break; case 'r': case 'R': scene.rotation.set(0,0,0,'YXZ'); break; case 'u': case 'U': scene.rotateOnWorldAxis(worldDiag, +KEY_STEP); scene.rotation.setFromQuaternion(scene.quaternion,'YXZ'); break; case 'i': case 'I': scene.rotateOnWorldAxis(worldDiag, -KEY_STEP); scene.rotation.setFromQuaternion(scene.quaternion,'YXZ'); break; default: used=false;} if(used){clampAll();} };
    // Space 키를 누르고 드래그하면 Roll(회전) 모드로 전환
    const onSpaceDown = (ev) => { if (ev.code === 'Space' || ev.key === ' ') { spacePressed = true; try { ev.preventDefault(); } catch {} } };
    const onSpaceUp = (ev) => { if (ev.code === 'Space' || ev.key === ' ') { spacePressed = false; try { ev.preventDefault(); } catch {} } };

    window.addEventListener('keydown', onKey);
    window.addEventListener('keydown', onSpaceDown);
    window.addEventListener('keyup', onSpaceUp);
    return ()=>{ dom.removeEventListener('pointerdown', onDown); dom.removeEventListener('contextmenu', onContextMenu); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); dom.removeEventListener('pointerleave', onUp); window.removeEventListener('keydown', onKey); window.removeEventListener('keydown', onSpaceDown); window.removeEventListener('keyup', onSpaceUp); };
  }, []);

  // 필터링 후 시각화용 그래프 계산
  const visible = useMemo(() => {
    const passesNode = (n) => {
      if (!layerFilter[n.layer]) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [n.label,n.ip,n.user_name,n.role,n.dept,n.hostname,n.service_name,n.subnet,n.type]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    };
    const nodeSet = new Set(graphData.nodes.filter(passesNode).map(n => n.id));
    const passesLink = (l) => {
      const s = l.__sid || (typeof l.source==='object'?l.source.id:l.source);
      const t = l.__tid || (typeof l.target==='object'?l.target.id:l.target);
      if (!nodeSet.has(s) || !nodeSet.has(t)) return false;
      if (assumedFilter !== 'all' && (!!l.assumed !== (assumedFilter==='true'))) return false;
      const sn = byId[s]; const tn = byId[t];
      if (sn && tn) { if (!statusFilter.has(sn.status) || !statusFilter.has(tn.status)) return false; }
      return true;
    };
    const links = graphData.links.filter(passesLink);
    const used = new Set(); links.forEach(l => { const s = l.__sid || (typeof l.source==='object'?l.source.id:l.source); const t = l.__tid || (typeof l.target==='object'?l.target.id:l.target); used.add(s); used.add(t); });
    const nodes = graphData.nodes.filter(n => nodeSet.has(n.id) && (used.has(n.id) || !search));
    return { nodes, links };
  }, [graphData, layerFilter, assumedFilter, statusFilter, search, byId]);

  const highlight = useMemo(() => {
    if (!selectedId) return { nodes: new Set(), links: new Set() };
    const nSet = new Set([selectedId]); const lSet = new Set();
    (adj.get(selectedId) || []).forEach(nid => nSet.add(nid));
    visible.links.forEach(l => { const s = l.__sid || (typeof l.source==='object'?l.source.id:l.source); const t = l.__tid || (typeof l.target==='object'?l.target.id:l.target); if (nSet.has(s) && nSet.has(t)) lSet.add(l); });
    return { nodes: nSet, links: lSet };
  }, [selectedId, visible, adj]);

  const isNodeDimmed = (n) => selectedId && !highlight.nodes.has(n.id);
  const isLinkDimmed = (l) => selectedId && !highlight.links.has(l);
  const nodeColor = (n) => (!selectedId ? (LAYER_COLORS[n.layer] || '#B0B0B0') : (isNodeDimmed(n) ? '#2A2A2A' : (LAYER_COLORS[n.layer] || '#B0B0B0')));
  const linkColor = (l) => { const rgb = new THREE.Color(KIND_COLORS[l.kind] || '#A0AEC0'); const c = isLinkDimmed(l) ? rgb.lerp(new THREE.Color('#2A2A2A'), 0.6) : rgb; return `#${c.getHexString()}`; };
  const linkWidth = (l) => isLinkDimmed(l) ? 0.3 : (l.assumed ? 0.6 : 1.5);
  const linkParticles = (l) => { if (!pulse || !selectedId) return 0; const s = l.source; const t = l.target; if (!s || !t || typeof s.id === 'undefined' || typeof t.id === 'undefined') return 0; const touchesSel = s.id === selectedId || t.id === selectedId; return touchesSel && isCrossLayer(s, t) ? 2 : 0; };
  const linkMaterial = (l) => { const color = new THREE.Color(linkColor(l)); if (l.assumed) { try { return new THREE.LineDashedMaterial({ color, dashSize: 2, gapSize: 1, transparent: true, opacity: isLinkDimmed(l) ? 0.25 : 0.65 }); } catch { return new THREE.LineBasicMaterial({ color, transparent: true, opacity: isLinkDimmed(l) ? 0.25 : 0.65 }); } } return new THREE.LineBasicMaterial({ color, transparent: true, opacity: isLinkDimmed(l) ? 0.25 : 0.95 }); };
  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    const kind = String(resolveTopologyKind(node) || 'server').replace(/^logical-/, '');
    const baseHex = nodeColor(node);
    const material = !selectedId
      ? getBaseMat(baseHex)
      : (highlight.nodes.has(node.id) ? nodeMatCache.highlight : nodeMatCache.dim);
    let mesh;
    if (kind === 'core') {
      const boxMesh = new THREE.Mesh(geoCache.box, material);
      boxMesh.scale.set(1.2, 0.95, 1.2);
      mesh = boxMesh;
    } else if (kind === 'firewall') {
      mesh = new THREE.Mesh(geoCache.cone, material);
    } else if (kind === 'logical-firewall') {
      const logicalFirewall = new THREE.Group();
      const coreShield = new THREE.Mesh(geoCache.octa, material);
      const basePlate = new THREE.Mesh(geoCache.box, material);
      basePlate.scale.set(1.15, 0.35, 0.9);
      basePlate.position.y = -1.8;
      logicalFirewall.add(coreShield);
      logicalFirewall.add(basePlate);
      mesh = logicalFirewall;
    } else if (kind === 'router') {
      mesh = new THREE.Mesh(geoCache.cylinder, material);
    } else if (kind === 'logical-router') {
      const logicalRouter = new THREE.Group();
      const coreSphere = new THREE.Mesh(geoCache.sphere, material);
      const orbitRing = new THREE.Mesh(geoCache.torus, material);
      orbitRing.rotation.x = Math.PI / 2;
      orbitRing.scale.set(0.7, 0.7, 0.7);
      logicalRouter.add(coreSphere);
      logicalRouter.add(orbitRing);
      mesh = logicalRouter;
    } else if (kind === 'switch') {
      const boxMesh = new THREE.Mesh(geoCache.box, material);
      boxMesh.scale.set(1.2, 0.95, 1.2);
      mesh = boxMesh;
    } else if (kind === 'laptop') {
      const laptopGroup = new THREE.Group();
      const keyboard = new THREE.Mesh(geoCache.box, material);
      const screen = new THREE.Mesh(geoCache.bar, material);
      keyboard.scale.set(1.25, 0.35, 1.05);
      keyboard.position.y = -1.6;
      screen.scale.set(1.15, 1.7, 0.22);
      screen.position.set(0, 0.95, -2.25);
      screen.rotation.x = -0.34;
      laptopGroup.add(keyboard);
      laptopGroup.add(screen);
      mesh = laptopGroup;
    } else if (kind === 'workstation') {
      const wsGroup = new THREE.Group();
      const tower = new THREE.Mesh(geoCache.box, material);
      const monitor = new THREE.Mesh(geoCache.bar, material);
      tower.scale.set(0.52, 1.8, 0.58);
      tower.position.set(-2.2, 0, 0);
      monitor.scale.set(1.05, 1.4, 0.28);
      monitor.position.set(1.6, 0.3, 0);
      wsGroup.add(tower);
      wsGroup.add(monitor);
      mesh = wsGroup;
    } else if (kind === 'printer') {
      const printerGroup = new THREE.Group();
      const body = new THREE.Mesh(geoCache.box, material);
      const tray = new THREE.Mesh(geoCache.bar, material);
      body.scale.set(1.12, 0.58, 1.0);
      tray.scale.set(0.96, 0.36, 0.82);
      tray.position.y = 1.3;
      printerGroup.add(body);
      printerGroup.add(tray);
      mesh = printerGroup;
    } else if (kind === 'logical-switch') {
      const logicalSwitch = new THREE.Group();
      const baseBox = new THREE.Mesh(geoCache.box, material);
      const topCyl = new THREE.Mesh(geoCache.l3top, material);
      baseBox.scale.set(1.45, 0.45, 1.2);
      topCyl.scale.set(0.95, 0.75, 0.95);
      topCyl.position.y = 1.4;
      logicalSwitch.add(baseBox);
      logicalSwitch.add(topCyl);
      mesh = logicalSwitch;
    } else if (kind === 'l3switch') {
      const baseBox = new THREE.Mesh(geoCache.box, material);
      const topCyl = new THREE.Mesh(geoCache.l3top, material);
      topCyl.position.y = 2.6;
      const l3Group = new THREE.Group();
      l3Group.add(baseBox);
      l3Group.add(topCyl);
      mesh = l3Group;
    } else if (kind === 'logical-l3switch') {
      const logicalL3Group = new THREE.Group();
      const baseBox = new THREE.Mesh(geoCache.box, material);
      const topCyl = new THREE.Mesh(geoCache.l3top, material);
      const topSphere = new THREE.Mesh(geoCache.sphere, material);
      baseBox.scale.set(1.35, 0.6, 1.25);
      topCyl.position.y = 1.9;
      topSphere.scale.set(0.55, 0.55, 0.55);
      topSphere.position.y = 3.5;
      logicalL3Group.add(baseBox);
      logicalL3Group.add(topCyl);
      logicalL3Group.add(topSphere);
      mesh = logicalL3Group;
    } else if (kind === 'persona') {
      mesh = new THREE.Mesh(geoCache.sphere, material);
    } else if (kind === 'hub') {
      mesh = new THREE.Mesh(geoCache.octa, material);
    } else if (kind === 'sensor') {
      const sensorGroup = new THREE.Group();
      const body = new THREE.Mesh(geoCache.sphere, material);
      const tip = new THREE.Mesh(geoCache.cone, material);
      tip.scale.set(0.45, 0.55, 0.45);
      tip.position.y = 2.4;
      sensorGroup.add(body);
      sensorGroup.add(tip);
      mesh = sensorGroup;
    } else if (kind === 'identity') {
      const identityGroup = new THREE.Group();
      const column = new THREE.Mesh(geoCache.pill, material);
      const head = new THREE.Mesh(geoCache.sphere, material);
      column.scale.set(0.66, 0.95, 0.66);
      head.scale.set(0.58, 0.58, 0.58);
      head.position.y = 3.9;
      identityGroup.add(column);
      identityGroup.add(head);
      mesh = identityGroup;
    } else if (kind === 'database') {
      const databaseGroup = new THREE.Group();
      [-1.8, 0.0, 1.8].forEach((y) => {
        const disk = new THREE.Mesh(geoCache.disk, material);
        disk.position.y = y;
        databaseGroup.add(disk);
      });
      mesh = databaseGroup;
    } else if (kind === 'mail') {
      const mailGroup = new THREE.Group();
      const body = new THREE.Mesh(geoCache.box, material);
      const flap = new THREE.Mesh(geoCache.bar, material);
      body.scale.set(1.2, 0.48, 0.9);
      flap.scale.set(1.08, 0.45, 0.66);
      flap.rotation.z = 0.52;
      flap.position.y = 1.2;
      mailGroup.add(body);
      mailGroup.add(flap);
      mesh = mailGroup;
    } else if (kind === 'monitor') {
      const monitorGroup = new THREE.Group();
      const ring = new THREE.Mesh(geoCache.torus, material);
      const eye = new THREE.Mesh(geoCache.sphere, material);
      ring.rotation.x = Math.PI / 2;
      ring.scale.set(0.86, 0.86, 0.86);
      eye.scale.set(0.52, 0.52, 0.52);
      eye.position.y = 0.5;
      monitorGroup.add(ring);
      monitorGroup.add(eye);
      mesh = monitorGroup;
    } else if (kind === 'client') {
      const clientGroup = new THREE.Group();
      const core = new THREE.Mesh(geoCache.tetra, material);
      const sat = new THREE.Mesh(geoCache.sphere, material);
      sat.scale.set(0.35, 0.35, 0.35);
      sat.position.set(2.4, 1.3, 0);
      clientGroup.add(core);
      clientGroup.add(sat);
      mesh = clientGroup;
    } else if (kind === 'app') {
      const appGroup = new THREE.Group();
      const layer1 = new THREE.Mesh(geoCache.box, material);
      const layer2 = new THREE.Mesh(geoCache.box, material);
      const layer3 = new THREE.Mesh(geoCache.box, material);
      layer1.scale.set(1.25, 0.3, 1.0);
      layer1.position.y = -1.4;
      layer2.scale.set(1.0, 0.3, 0.85);
      layer2.position.y = 0.2;
      layer3.scale.set(0.8, 0.3, 0.7);
      layer3.position.y = 1.8;
      appGroup.add(layer1);
      appGroup.add(layer2);
      appGroup.add(layer3);
      mesh = appGroup;
    } else if (kind === 'logical-sensor') {
      const logicalSensor = new THREE.Group();
      const body = new THREE.Mesh(geoCache.sphere, material);
      const tip = new THREE.Mesh(geoCache.octa, material);
      tip.scale.set(0.45, 0.45, 0.45);
      tip.position.y = 2.8;
      logicalSensor.add(body);
      logicalSensor.add(tip);
      mesh = logicalSensor;
    } else if (kind === 'logical-printer') {
      const logicalPrinter = new THREE.Group();
      const baseBox = new THREE.Mesh(geoCache.box, material);
      const topNode = new THREE.Mesh(geoCache.sphere, material);
      baseBox.scale.set(1.2, 0.45, 1.0);
      topNode.scale.set(0.45, 0.45, 0.45);
      topNode.position.y = 1.8;
      logicalPrinter.add(baseBox);
      logicalPrinter.add(topNode);
      mesh = logicalPrinter;
    } else if (kind === 'plc') {
      const plcGroup = new THREE.Group();
      const coreSphere = new THREE.Mesh(geoCache.sphere, material);
      const basePlate = new THREE.Mesh(geoCache.box, material);
      basePlate.scale.set(1.3, 0.4, 1.0);
      basePlate.position.y = -2.0;
      plcGroup.add(coreSphere);
      plcGroup.add(basePlate);
      mesh = plcGroup;
    } else if (kind === 'logical-plc') {
      const logicalPlc = new THREE.Group();
      const chip = new THREE.Mesh(geoCache.octa, material);
      const bridge = new THREE.Mesh(geoCache.l3top, material);
      bridge.scale.set(0.9, 0.8, 0.9);
      bridge.position.y = -1.2;
      logicalPlc.add(chip);
      logicalPlc.add(bridge);
      mesh = logicalPlc;
    } else if (kind === 'logical-identity') {
      const logicalIdentity = new THREE.Group();
      const column = new THREE.Mesh(geoCache.pill, material);
      const halo = new THREE.Mesh(geoCache.torus, material);
      const head = new THREE.Mesh(geoCache.sphere, material);
      column.scale.set(0.7, 1.0, 0.7);
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 1.2;
      halo.scale.set(0.72, 0.72, 0.72);
      head.scale.set(0.55, 0.55, 0.55);
      head.position.y = 4.2;
      logicalIdentity.add(column);
      logicalIdentity.add(halo);
      logicalIdentity.add(head);
      mesh = logicalIdentity;
    } else if (kind === 'logical-database') {
      const logicalDatabase = new THREE.Group();
      [-2.3, 0, 2.3].forEach((y) => {
        const layerDisk = new THREE.Mesh(geoCache.disk, material);
        layerDisk.position.y = y;
        logicalDatabase.add(layerDisk);
      });
      const topCore = new THREE.Mesh(geoCache.sphere, material);
      topCore.scale.set(0.38, 0.38, 0.38);
      topCore.position.y = 4.3;
      logicalDatabase.add(topCore);
      mesh = logicalDatabase;
    } else if (kind === 'logical-mail') {
      const logicalMail = new THREE.Group();
      const body = new THREE.Mesh(geoCache.box, material);
      const leftFlap = new THREE.Mesh(geoCache.bar, material);
      const rightFlap = new THREE.Mesh(geoCache.bar, material);
      body.scale.set(1.18, 0.45, 0.92);
      leftFlap.scale.set(0.72, 0.7, 0.85);
      rightFlap.scale.set(0.72, 0.7, 0.85);
      leftFlap.rotation.z = 0.62;
      rightFlap.rotation.z = -0.62;
      leftFlap.position.set(-1.55, 0.8, 0);
      rightFlap.position.set(1.55, 0.8, 0);
      logicalMail.add(body);
      logicalMail.add(leftFlap);
      logicalMail.add(rightFlap);
      mesh = logicalMail;
    } else if (kind === 'logical-monitor') {
      const logicalMonitor = new THREE.Group();
      const dish = new THREE.Mesh(geoCache.torus, material);
      const mast = new THREE.Mesh(geoCache.pill, material);
      const eye = new THREE.Mesh(geoCache.sphere, material);
      const beam = new THREE.Mesh(geoCache.cone, material);
      dish.rotation.x = Math.PI / 2;
      dish.scale.set(0.92, 0.92, 0.92);
      dish.position.y = -0.4;
      mast.scale.set(0.34, 0.72, 0.34);
      mast.position.y = 1.2;
      eye.scale.set(0.52, 0.52, 0.52);
      eye.position.y = 3.8;
      beam.rotation.z = -Math.PI / 2;
      beam.scale.set(0.34, 0.62, 0.34);
      beam.position.set(3.1, 3.4, 0);
      logicalMonitor.add(dish);
      logicalMonitor.add(mast);
      logicalMonitor.add(eye);
      logicalMonitor.add(beam);
      mesh = logicalMonitor;
    } else if (kind === 'logical-client') {
      const logicalClient = new THREE.Group();
      const core = new THREE.Mesh(geoCache.tetra, material);
      core.scale.set(0.95, 0.95, 0.95);
      logicalClient.add(core);
      [[3.0, 1.8, 0], [-2.5, -1.4, 2.1], [-2.5, -1.4, -2.1]].forEach(([x, y, z]) => {
        const satellite = new THREE.Mesh(geoCache.sphere, material);
        satellite.scale.set(0.32, 0.32, 0.32);
        satellite.position.set(x, y, z);
        logicalClient.add(satellite);
      });
      mesh = logicalClient;
    } else if (kind === 'logical-app') {
      const logicalApp = new THREE.Group();
      const bottomLayer = new THREE.Mesh(geoCache.box, material);
      const middleLayer = new THREE.Mesh(geoCache.box, material);
      const topLayer = new THREE.Mesh(geoCache.box, material);
      const appCore = new THREE.Mesh(geoCache.tetra, material);
      bottomLayer.scale.set(1.4, 0.3, 1.1);
      bottomLayer.position.set(-0.6, -2.0, 0);
      middleLayer.scale.set(1.2, 0.3, 1.0);
      middleLayer.position.set(0.4, 0, 0);
      topLayer.scale.set(1.0, 0.3, 0.9);
      topLayer.position.set(-0.2, 2.0, 0);
      appCore.scale.set(0.45, 0.45, 0.45);
      appCore.position.y = 4.0;
      logicalApp.add(bottomLayer);
      logicalApp.add(middleLayer);
      logicalApp.add(topLayer);
      logicalApp.add(appCore);
      mesh = logicalApp;
    } else if (kind === 'logical-server') {
      const logicalServer = new THREE.Group();
      const coreSphere = new THREE.Mesh(geoCache.sphere, material);
      const topCyl = new THREE.Mesh(geoCache.l3top, material);
      coreSphere.scale.set(1.1, 1.1, 1.1);
      topCyl.position.y = 2.7;
      logicalServer.add(coreSphere);
      logicalServer.add(topCyl);
      mesh = logicalServer;
    } else {
      const serverGroup = new THREE.Group();
      const serverBody = new THREE.Mesh(geoCache.box, material);
      const serverHead = new THREE.Mesh(geoCache.l3top, material);
      serverBody.scale.set(1.0, 1.8, 1.0);
      serverHead.position.y = 3.6;
      serverHead.scale.set(1.05, 1.0, 1.05);
      serverGroup.add(serverBody);
      serverGroup.add(serverHead);
      mesh = serverGroup;
    }

    const s = estimateNodeScale(node);
    const visualScale = s;
    const meshScale = visualScale;
    mesh.scale.set(meshScale, meshScale, meshScale);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    group.add(mesh);

    const led = new THREE.Mesh(geoCache.led, node.status === 'up' ? nodeMatCache.ledUp : nodeMatCache.ledDown);
    led.position.set(0, 6 * visualScale * 0.9, 0);
    group.add(led);

    const hit = new THREE.Mesh(geoCache.hit, nodeMatCache.hit);
    hit.name = 'hit-proxy';
    hit.scale.set(visualScale * 1.4, visualScale * 1.4, visualScale * 1.4);
    group.add(hit);

    return group;
  }, [estimateNodeScale, geoCache, getBaseMat, highlight, nodeColor, nodeMatCache, selectedId]);

  const onBackgroundClick = () => {
    interactionTracker.measureResponseSync(
      'MultilayerVisualization',
      'Background Click (Deselect)',
      () => {
        setSelectedId(null);
        onNodeSelect(null);
        onInspectorChange(null);
        setEventLogs([]);
      },
      {}
    );
  };
  const resetView = () => {
    interactionTracker.measureResponseSync(
      'MultilayerVisualization',
      'Reset View',
      () => {
        setSelectedId(null);
        onNodeSelect(null);
        const fg = fgRef.current;
        if (!fg) return;
        try {
          const rot = fg.scene().rotation;
          rot.order='YXZ';
          rot.x = 0;
          rot.y = 0;
          rot.z = 0;
        } catch {}
        fg.cameraPosition({ x: 0, y: 1800, z: 0 }, { x: 0, y: 0, z: 0 }, 600);
      },
      {}
    );
  };
  const onNodeClick = (node) => {
    interactionTracker.measureResponseSync(
      'MultilayerVisualization',
      'Node Click',
      () => {
        setSelectedId(node?.id || null);
        if (node) {
          const panel = <NodeDetailPanel selected={node} adj={adj} visible={visible} byId={byId} onClearSelection={onBackgroundClick} onResetView={resetView} />;
          onNodeSelect(panel);
          try { onInspectorChange(panel); } catch(e) {}
          
          // 연결된 노드 정보 수집
          const connectedNodes = adj.get(node.id) || new Set();
          const connectedIps = Array.from(connectedNodes)
            .map(nid => byId[nid])
            .filter(n => n && n.ip)
            .map(n => n.ip);
          
          // 클릭한 노드와 연결된 모든 링크의 상세 정보 수집 (dbInfo)
          const dbInfo = visible.links
            .filter(link => {
              const sid = link.__sid || (typeof link.source === 'object' ? link.source.id : link.source);
              const tid = link.__tid || (typeof link.target === 'object' ? link.target.id : link.target);
              return sid === node.id || tid === node.id;
            })
            .map(link => {
              const sid = link.__sid || (typeof link.source === 'object' ? link.source.id : link.source);
              const tid = link.__tid || (typeof link.target === 'object' ? link.target.id : link.target);
              const srcNode = byId[sid];
              const dstNode = byId[tid];
              
              return {
                src_IP: srcNode ? {
                  id: srcNode.id,
                  ip: srcNode.ip,
                  name: srcNode.label || srcNode.hostname || srcNode.name || srcNode.user_name || srcNode.service_name || srcNode.id,
                  type: srcNode.type,
                  subnet: srcNode.subnet,
                  dns: srcNode.dns,
                  gateway: srcNode.gateway,
                  description: srcNode.description || srcNode.service_name,
                  cve: extractCVE(srcNode),
                  value: srcNode.value,
                  key: srcNode.key,
                  __labels: [srcNode.layer, srcNode.type],
                  __id: srcNode.id,
                  index: srcNode.index
                } : null,
                dst_IP: dstNode ? {
                  id: dstNode.id,
                  ip: dstNode.ip,
                  name: dstNode.label || dstNode.hostname || dstNode.name || dstNode.user_name || dstNode.service_name || dstNode.id,
                  description: dstNode.description || dstNode.service_name,
                  cve: extractCVE(dstNode),
                  value: dstNode.value,
                  key: dstNode.key,
                  __labels: [dstNode.layer, dstNode.type],
                  __id: dstNode.id,
                  index: dstNode.index
                } : null,
                edge: {
                  sourceIP: sid,
                  targetIP: tid,
                  kind: link.kind,
                  rel: link.kind,
                  assumed: link.assumed,
                  confidence: link.confidence
                }
              };
            });
          
          const newLog = {
            message: `노드 선택: ${node.label || node.id}`,
            nodeInfo: { layer: node.layer, type: node.type, ip: node.ip },
            connectedCount: connectedNodes.size,
            connectedIps: connectedIps,
            dbInfo: dbInfo
          };
          setEventLogs([newLog]);
        } else { onNodeSelect(null); onInspectorChange(null); setEventLogs([]); }
      },
      { 
        nodeId: node?.id, 
        nodeLabel: node?.label, 
        nodeLayer: node?.layer, 
        nodeType: node?.type 
      }
    );
  };
  const onLinkClick = (l) => { const sid = l.__sid || (typeof l.source==='object'?l.source.id:l.source); const node = byId[sid]; if (node) onNodeClick(node); };
  const onLinkUpdate = (link, threeObj) => { try { const line = link.__lineObj || threeObj; if (line && line.computeLineDistances) line.computeLineDistances(); } catch {} };

  // 렌더용 그래프: 펄스 OFF일 경우 1-홉 이내만 표시
  const graphToRender = useMemo(() => {
    if (pulse) return visible;
    if (!selectedId) return { nodes: visible.nodes, links: [] };
    const sel = new Set([selectedId]); (adj.get(selectedId) || []).forEach(nid => sel.add(nid));
    const links = visible.links.filter(l => { const s = l.__sid || (typeof l.source==='object'? l.source.id : l.source); const t = l.__tid || (typeof l.target==='object'? l.target.id : l.target); return sel.has(s) || sel.has(t); });
    return { nodes: visible.nodes, links };
  }, [pulse, visible, selectedId, adj]);

  const modelLegend = useMemo(() => {
    return CANONICAL_DEVICE_KINDS.map((kind) => ({
      kind,
      color: LEGEND_COLOR_BY_KIND[kind] || LAYER_COLORS.physical
    }));
  }, []);

  const legendThumbByKind = useMemo(() => {
    const out = {};
    modelLegend.forEach(({ kind, color }) => {
      out[kind] = renderLegendThumbnail(kind, color);
    });
    return out;
  }, [modelLegend]);

  // graphToRender의 노드 목록을 ref에 동기화 (z-lock 포스가 최신 노드를 참조하도록)
  useEffect(() => { graphNodesRef.current = graphToRender.nodes; }, [graphToRender]);

  return (
    <Card ref={containerRef} sx={{
      width: '99%',
      height: 'calc(100vh - 132px)',
      bgcolor: 'background.paper',
      borderRadius: 2,
      boxShadow: 3,
      overflow: 'hidden'
    }}>
      <CardContent sx={{ p: 2, height: '100%', display: 'flex', gap: 2 }}>
        {/* 메인 컨텐츠 영역 */}
        <div style={{ flex: 1, minWidth: 0, height: '100%' }}>
          <div style={{ width: '100%', height: '100%', minHeight: 600, color: '#fff', display: 'flex', flexDirection: 'row' }}>
            <Card sx={{
              flex: 1,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '20px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1.5px 6px rgba(0,0,0,0.10)',
              border: '1px solid rgba(0,0,0,0.07)',
              background: '#ffffff',
              mr: 1
            }}>
              <div ref={graphContainerRef} style={{
                width: '100%',
                height: '100%',
                position: 'relative'
              }}>
                {/* /ExtInt/TimeSeriesVisualization 이동 버튼 */}
                <IconButton
                  size="small"
                  aria-label="시계열 기반 이상 탐지로 이동"
                  title="시계열 기반 이상 탐지로 이동"
                  onClick={() => window.location.href = '/ExtInt/TimeSeriesVisualization'}
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    zIndex: 1000,
                    bgcolor: 'rgba(124,58,237,0.8)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                    '&:hover': {
                      bgcolor: '#9333ea',
                      color: '#fff',
                    },
                  }}
                >
                  <ClusterOutlined style={{ fontSize: 18 }} />
                </IconButton>
            {/* 툴바 */}
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, background: 'rgba(57,48,107,0.7)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', fontSize: 12 }}>
            <input placeholder="검색: label, ip, user, role, dept..." value={search} onChange={(e)=>{
              const newValue = e.target.value;
              interactionTracker.log('MultilayerVisualization', 'Search Filter Change', { searchTerm: newValue });
              setSearch(newValue);
            }} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(128,128,128,0.5)', background: 'rgba(20,20,20,0.7)', color: '#fff' }} />
            <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
            {['physical','logical','persona'].map(id => (
              <label key={id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={layerFilter[id]} onChange={(e)=>{
                  const isChecked = e.target.checked;
                  interactionTracker.measureResponseSync(
                    'MultilayerVisualization',
                    'Layer Filter Toggle',
                    () => setLayerFilter(v=>({...v,[id]:isChecked})),
                    { layer: id, enabled: isChecked }
                  );
                }} />
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: LAYER_COLORS[id] }} />
                    <span style={{ color: LAYER_COLORS[id], fontWeight: 700 }}>{id}</span>
                  </span>
              </label>
            ))}
            <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>assumed</span>
                <select value={assumedFilter} onChange={(e)=>{
                  const newValue = e.target.value;
                  interactionTracker.measureResponseSync(
                    'MultilayerVisualization',
                    'Assumed Filter Change',
                    () => setAssumedFilter(newValue),
                    { filter: newValue }
                  );
                }} style={{ background: 'rgba(20,20,20,0.7)', color:'#fbbf24', border:'1px solid rgba(128,128,128,0.5)', borderRadius: 6, padding: '2px 4px', fontWeight: 700 }}>
                  <option value="all" style={{ color: '#fbbf24' }}>all</option>
                  <option value="true" style={{ color: '#fbbf24' }}>true</option>
                  <option value="false" style={{ color: '#fbbf24' }}>false</option>
                </select>
              </label>
            <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>status</span>
                {STATUS.map(s => {
                  let color = '#e5e7eb';
                  if (s === 'UP') color = '#22c55e';
                  else if (s === 'DOWN') color = '#ef4444';
                  else if (s === 'UNKNOWN') color = '#fbbf24';
                  return (
                    <label key={s} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <input type="checkbox" checked={statusFilter.has(s)} onChange={(e)=>{
                        const isChecked = e.target.checked;
                        interactionTracker.measureResponseSync(
                          'MultilayerVisualization',
                          'Status Filter Toggle',
                          () => {
                            const nxt=new Set(statusFilter);
                            isChecked?nxt.add(s):nxt.delete(s);
                            setStatusFilter(nxt);
                          },
                          { status: s, enabled: isChecked }
                        );
                      }} />
                      <span style={{ textTransform: 'uppercase', color, fontWeight: 700 }}>{s}</span>
                    </label>
                  );
                })}
              </div>
            <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)' }} />
            <button onClick={()=>{
              interactionTracker.measureResponseSync(
                'MultilayerVisualization',
                'Toggle Pulse',
                () => setPulse(p=>!p),
                { currentState: pulse }
              );
            }} style={{ padding:'4px 8px', borderRadius:6, background: pulse ? '#3b82f6' : '#F0EDFD', color:'#000', border:'1px solid rgba(128,128,128,0.5)' }}>{pulse ? '펄스 ON' : '펄스 OFF'}</button>
            <button onClick={() => {
              interactionTracker.measureResponseSync(
                'MultilayerVisualization',
                'Reset Filters',
                () => {
                  setSearch('');
                  setLayerFilter({ physical: true, logical: true, persona: true });
                  setAssumedFilter('all');
                  setStatusFilter(new Set(STATUS));
                },
                {}
              );
            }} style={{ padding:'4px 8px', borderRadius:6, background:'#F0EDFD', color:'#000', border:'1px solid rgba(128,128,128,0.5)' }}>필터 초기화</button>
            <button onClick={resetView} style={{ padding:'4px 8px', borderRadius:6, background:'#F0EDFD', color:'#000', border:'1px solid rgba(128,128,128,0.5)' }}>뷰 초기화</button>
          </div>
        </div>

        <div style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          minWidth: 180,
          maxWidth: 220,
          maxHeight: '62%',
          overflowY: 'auto',
          background: 'rgba(57,48,107,0.7)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: '10px 12px',
          pointerEvents: 'none'
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>장비 유형 범례</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {modelLegend.map(({ kind, color }) => (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {legendThumbByKind[kind]
                  ? <img src={legendThumbByKind[kind]} alt={kind} style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 4, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.03)' }} />
                  : <span style={{ width: 20, height: 20, borderRadius: 4, background: color, opacity: 0.9 }} />}
                <span style={{ fontSize: 11, color: '#e5e7eb', fontWeight: 600 }}>{formatDeviceType(kind)}</span>
              </div>
            ))}
          </div>
        </div>

        <ForceGraph3D
          ref={fgRef}
          graphData={graphToRender}
          backgroundColor="#ffffff" // 3계층 시각화 배경색 부분 
          width={containerSize.width}
          height={containerSize.height}
          nodeAutoColorBy={null}
          nodeColor={nodeColor}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          nodeLabel={(n) => formatDeviceType(resolveTopologyKind(n) || 'server')}
          nodeRelSize={18}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkMaterial={linkMaterial}
          linkDirectionalParticles={linkParticles}
          linkDirectionalParticleWidth={() => 2}
          linkDirectionalParticleSpeed={() => 0.006 + Math.random()*0.004}
          onNodeClick={onNodeClick}
          onBackgroundClick={onBackgroundClick}
          onLinkClick={onLinkClick}
          onLinkUpdate={onLinkUpdate}
          cooldownTicks={0}
          enableNodeDrag={false}
          showNavInfo={false}
        />
        {loading && (
          <div style={{position:'absolute',left:0,top:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{background:'rgba(0,0,0,0.6)',color:'#fff',padding:'12px 18px',borderRadius:8,backdropFilter:'blur(4px)'}}>Loading…</div>
          </div>
        )}
              </div>
            </Card>
          </div>
        </div>

        {/* 우측 이벤트 로그 패널 */}
        <ThreelayerLog eventLogs={eventLogs} />
      </CardContent>
    </Card>
  );
}
