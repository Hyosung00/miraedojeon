import React, { useRef, useMemo, useState, useEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { createLayeredGridGraph } from "./GraphUtil";

const layers = [
  { name: "Device", count: 6 },
  { name: "Access", count: 3 },
  { name: "Distrib", count: 2 },
  { name: "Core", count: 1 },
  { name: "DMZ", count: 3 },
  { name: "Server", count: 4 }
];

const layerRadii = [55, 30, 22, 10, 28, 40];
const layerGap = 25;
const nodeColors = ["#00d4ff", "#4ade80", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4"];

const getLinkKey = l => {
  const getName = n => (typeof n === "object" ? n.name || n.id : n);
  return [getName(l.source), getName(l.target)].sort().join("←→");
};

// 박스 안에서 너무 꽉 차 보이지 않도록 여백(padding) 살짝 줌
const FIT_PADDING = 0;
const UI_SCALE = 1.6; // 전체 UI 스케일 업
const POST_FIT_ZOOM_MULTIPLIER = 0.82; // zoomToFit 이후 카메라를 더 가깝게

export default function InternalNetwork() {
  const fgRef = useRef();
  const hostRef = useRef(null);

  const [size, setSize] = useState({ width: 1, height: 1 });

  // Debug logging
  useEffect(() => {
    console.log('InternalNetwork mounted', { size });
  }, [size]);

  // 부모 박스 크기 추적
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      const { clientWidth, clientHeight } = el;
      setSize({ width: Math.max(1, clientWidth), height: Math.max(1, clientHeight) });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const [graphData] = useState(() => {
    const { nodes = [], links = [] } = createLayeredGridGraph({
      layers,
      layerGap,
      layerRadius: layerRadii
    }) ?? {};

    links.push({ source: "Core-1", target: "DMZ-1" });
    links.push({ source: "Core-1", target: "DMZ-2" });
    links.push({ source: "DMZ-1", target: "Server-1" });
    links.push({ source: "DMZ-2", target: "Server-2" });
    links.push({ source: "DMZ-3", target: "Server-3" });
    links.push({ source: "DMZ-3", target: "Server-4" });

    // 중심 정렬
    if (nodes.length) {
      const center = nodes.reduce(
        (acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y, z: acc.z + n.z }),
        { x: 0, y: 0, z: 0 }
      );
      center.x /= nodes.length; center.y /= nodes.length; center.z /= nodes.length;
      nodes.forEach(n => { n.x -= center.x; n.y -= center.y; n.z -= center.z; });
    }

    return { nodes, links };
  });

  // 렌더러/컨트롤 안전값
  useEffect(() => {
    if (!fgRef.current) return;
    const renderer = fgRef.current.renderer();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const controls = fgRef.current.controls?.();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 50;
      controls.maxDistance = 1000;
      controls.target.set(0, 0, 0); // 타겟을 원점으로 설정
    }

    // 카메라 FOV를 조금 좁혀서 더 크게 보이도록
    const camera = fgRef.current.camera?.();
    if (camera) {
      camera.fov = 60; // 기본 60으로 복원
      camera.position.set(200, 100, 200); // 초기 카메라 위치 설정
      camera.lookAt(0, 0, 0); // 원점을 바라보도록 설정
      camera.updateProjectionMatrix();
    }
  }, []);

  // 박스 크기나 데이터 변동 시마다 중앙 고정 + 전체가 딱 맞도록 자동 맞춤
  const fitToBox = (duration = 300) => {
    const fg = fgRef.current;
    if (!fg) return;
    try {
      fg.zoomToFit(duration, FIT_PADDING);
      // zoomToFit 후 카메라를 타겟 쪽으로 조금 더 당겨서 더 크게 보이게 함
      const camera = fg.camera?.();
      const controls = fg.controls?.();
      if (camera && controls && controls.target) {
        const toTarget = new THREE.Vector3().copy(camera.position).sub(controls.target);
        toTarget.multiplyScalar(POST_FIT_ZOOM_MULTIPLIER);
        camera.position.copy(new THREE.Vector3().copy(controls.target).add(toTarget));
        camera.updateProjectionMatrix();
        controls.update?.();
      }
    } catch {}
  };

  const [cameraLocked, setCameraLocked] = useState(false);
  const [hasInitialFit, setHasInitialFit] = useState(false);

  // 초기 렌더링 후 자동으로 중앙 맞춤
  useEffect(() => {
    if (size.width > 1 && size.height > 1 && !hasInitialFit) {
      const timer = setTimeout(() => {
        fitToBox(500); // 첫 렌더에서 천천히 맞춤
        setHasInitialFit(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [size, hasInitialFit]);

  useEffect(() => { if (!cameraLocked && hasInitialFit) fitToBox(250); }, [size.width, size.height, cameraLocked, hasInitialFit]); // 박스 리사이즈
  // 엔진 안정 후에도 보정
  const [engineStopped, setEngineStopped] = useState(false);

  const [highlighted, setHighlighted] = useState({ nodes: new Set(), links: new Set(), dimmedNodes: new Set() });
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);

  const handleNodeClick = (node, event) => {
    event.stopPropagation();
    const getName = n => (typeof n === "object" ? n.name || n.id : n);
    const adjacency = {};
    graphData.nodes.forEach(n => { adjacency[n.name] = new Set(); });
    graphData.links.forEach(l => {
      const s = getName(l.source); const t = getName(l.target);
      adjacency[s].add(t); adjacency[t].add(s);
    });

    const connected = new Set([node.name]);
    const queue = [node.name];
    while (queue.length) {
      const cur = queue.shift();
      adjacency[cur].forEach(nb => { if (!connected.has(nb)) { connected.add(nb); queue.push(nb); } });
    }

    const highlightLinks = new Set();
    graphData.links.forEach(l => {
      const s = getName(l.source); const t = getName(l.target);
      if (connected.has(s) && connected.has(t)) highlightLinks.add(getLinkKey(l));
    });

    const dimmedNodes = new Set(graphData.nodes.filter(n => !connected.has(n.name)).map(n => n.name));
    setHighlighted({ nodes: connected, links: highlightLinks, dimmedNodes });
    setSelectedNode(node);
  };

  const handleBackgroundClick = () => {
    setHighlighted({ nodes: new Set(), links: new Set(), dimmedNodes: new Set() });
    setSelectedNode(null);
  };

  const handleNodeHover = (node) => { setHoverNode(node); };

  const nodeThreeObject = useMemo(() => {
    return node => {
      const layerIndex = layers.findIndex(l => l.name === node.layer);
      const isHighlighted = highlighted.nodes.has(node.name);
      const isDimmed = highlighted.dimmedNodes.has(node.name);
      const isSelected = selectedNode?.name === node.name;
      const isHovered = hoverNode?.name === node.name;

      const baseColor = nodeColors[layerIndex] || "#64748b";
      const opacity = isDimmed ? 0.2 : 1;
      const scale = (isSelected ? 1.2 : isHovered ? 1.08 : 1) * UI_SCALE;
      const radius = (isSelected ? 3.8 : 3.2) * scale;

      const geometry = new THREE.SphereGeometry(radius, 20, 20);
      const material = new THREE.MeshPhongMaterial({ color: baseColor, transparent: opacity < 1, opacity, shininess: 100 });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.castShadow = true; sphere.receiveShadow = true;

      if (isSelected || isHighlighted) {
        const ringGeometry = new THREE.RingGeometry(radius * 1.12, radius * 1.26, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: isSelected ? "#ffffff" : baseColor, transparent: true, opacity: isSelected ? 0.75 : 0.45, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        sphere.add(ring);
      }

      // 라벨
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const text = node.name.replace('-', ' ');
      ctx.font = "bold 12px sans-serif";
      const metrics = ctx.measureText(text);
      const padding = 6;
      canvas.width = Math.ceil(metrics.width) + padding * 2;
      canvas.height = 20;
      ctx.fillStyle = isDimmed ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = isDimmed ? "rgba(255,255,255,0.4)" : "#ffffff";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const texture = new THREE.CanvasTexture(canvas);
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity });
      const sprite = new THREE.Sprite(spriteMaterial);
      const labelDivisor = 10 / UI_SCALE; // 스케일에 맞춰 라벨 크기도 키움
      sprite.scale.set(canvas.width / labelDivisor, canvas.height / labelDivisor, 1);
      sprite.position.set(0, radius + 6, 0);

      const group = new THREE.Group();
      group.add(sphere); group.add(sprite);
      return group;
    };
  }, [highlighted, selectedNode, hoverNode]);

  const linkWidth = link => {
    const base = highlighted.links.has(getLinkKey(link)) ? 3 : highlighted.links.size > 0 ? 0.6 : 1.8;
    return base * (UI_SCALE / 1.0);
  };
  const linkColor = link => highlighted.links.has(getLinkKey(link)) ? "#00ff88" : highlighted.links.size > 0 ? "#334155" : "#64748b";
  const linkOpacity = link => highlighted.links.size === 0 ? 0.8 : highlighted.links.has(getLinkKey(link)) ? 1 : 0.2;

  return (
    // 부모 박스 크기를 그대로 따라감 (서브 대시보드 슬롯에 딱 맞춤)
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={size.width}
        height={size.height}
        nodeThreeObject={nodeThreeObject}
        linkWidth={linkWidth}
        linkColor={linkColor}
        linkOpacity={linkOpacity}
        linkDirectionalParticles={Math.round(2 * UI_SCALE)}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleWidth={1.5 * (UI_SCALE / 1.0)}
        showNavInfo={false}
        enableNodeDrag={false}
        warmupTicks={100}
        cooldownTicks={0}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        controlType="orbit"
        backgroundColor="rgba(0,0,0,0)"
        enablePointerInteraction={true}
        onEngineStop={() => {
          if (!engineStopped) {
            setEngineStopped(true);
            // 엔진 정지 후 자동 맞춤
            setTimeout(() => {
              fitToBox(300);
            }, 200);
          }
        }}
      />

      {/* 범례 */}
      <div style={{
        position: "absolute", top: 8, right: 8, background: "rgba(15,23,42,0.98)",
        padding: 8, borderRadius: 8, fontSize: 10, color: "#e2e8f0", zIndex: 10,
        border: "1px solid rgba(148,163,184,0.2)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
      }}>
        {layers.map((layer, i) => (
          <div key={layer.name} style={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: nodeColors[i], marginRight: 6 }} />
            {layer.name}
          </div>
        ))}
      </div>

      {/* 선택 정보 */}
      {selectedNode && (
        <div style={{
          position: "absolute", bottom: 8, left: 8,
          background: "linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,41,59,0.95) 100%)",
          color: "#e2e8f0", padding: "10px 14px", borderRadius: 10,
          border: "1px solid rgba(148,163,184,0.3)", fontSize: 12,
          fontWeight: 500, zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: 4 }}>📡 {selectedNode.name}</div>
          <div style={{ color: "#94a3b8", fontSize: 10 }}>Layer: {selectedNode.layer}</div>
        </div>
      )}
    </div>
  );
}