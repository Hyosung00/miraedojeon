// Zone7Mini.jsx - Zone 7 네트워크 토폴로지 미니 버전
import React, { useRef, useEffect, useState, useMemo, memo, lazy, Suspense } from "react";
import * as THREE from "three";
import { Box, Typography } from "@mui/material";
import interactionTracker from "../../../../utils/interactionTracker";

const ForceGraph3D = lazy(() => import("react-force-graph-3d"));

const TYPE_COLORS = {
  core: "#ffffff",
  firewall: "#e55353",
  router: "#f6a609",
  l3switch: "#f6a609",
  switchrouter: "#f6a609",
  layer3: "#f6a609",
  switch: "#3fb950",
  hub: "#26c6da",
  server: "#6aa7ff",
  host: "#6aa7ff",
  default: "#a0b4ff",
};

const Zone7Mini = () => {
  const fgRef = useRef();
  const containerRef = useRef(null);
  const [zoneGraph, setZoneGraph] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pointerEnabled, setPointerEnabled] = useState(false);

  // Zone 7 데이터 fetch
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetch(`http://localhost:8000/neo4j/nodes?activeView=zone7&includeIsolated=true`).then((r) => r.json());

        const nodesMap = new Map();
        const rawLinks = [];
        data.forEach((item) => {
          if (item.src_IP?.id) nodesMap.set(String(item.src_IP.id), item.src_IP);
          if (item.dst_IP?.id) nodesMap.set(String(item.dst_IP.id), item.dst_IP);
          if (item.edge?.sourceIP && item.edge?.targetIP) {
            rawLinks.push({
              source: String(item.edge.sourceIP),
              target: String(item.edge.targetIP),
              ...item.edge,
            });
          }
        });

        const nodeIds = new Set([...nodesMap.keys()]);
        const filtered = rawLinks.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));

        const seen = new Set();
        const links = [];
        for (const l of filtered) {
          const a = String(l.source);
          const b = String(l.target);
          const key = a < b ? `${a}__${b}__${l.type || ""}` : `${b}__${a}__${l.type || ""}`;
          if (seen.has(key)) continue;
          seen.add(key);
          links.push(l);
        }

        const nodes = Array.from(nodesMap.values()).map((n) => {
          const kind = (n.kind || n.type || "host").toLowerCase();
          const label = n.label || n.ip || String(n.id);
          const color = n.color || TYPE_COLORS[kind] || TYPE_COLORS.default;
          return { ...n, id: String(n.id), kind, label, color };
        });

        if (mounted) setZoneGraph({ nodes, links });
      } catch (e) {
        console.error(e);
        if (mounted) setZoneGraph({ nodes: [], links: [] });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 컨테이너 크기 측정 (ResizeObserver 사용)
  useEffect(() => {
    if (!containerRef.current) return;
    
    const measure = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        if (offsetWidth > 0 && offsetHeight > 0) {
          setContainerSize({ width: offsetWidth, height: offsetHeight });
        }
      }
    };
    
    // 초기 측정 (약간의 지연 후)
    const timer = setTimeout(measure, 100);
    
    // ResizeObserver로 크기 변화 감지
    const resizeObserver = new ResizeObserver(() => {
      measure();
    });
    resizeObserver.observe(containerRef.current);
    
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [loading]); // loading이 false가 되면 다시 측정

  // 지오메트리 캐시
  const geoCache = useMemo(() => ({
    sphere: new THREE.SphereGeometry(3.0, 16, 16),
    box: new THREE.BoxGeometry(6, 6, 6),
  }), []);

  const nodeThreeObject = useMemo(() => (node) => {
    const group = new THREE.Group();
    const color = node.color || TYPE_COLORS[node.kind] || TYPE_COLORS.default;
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.7 });
    const mesh = new THREE.Mesh(geoCache.sphere, material);
    group.add(mesh);
    return group;
  }, [geoCache]);

  const linkColor = useMemo(() => (l) => {
    const type = String(l.type || '').toLowerCase();
    return type === 'logical' ? '#87aafc' : '#a9b9ff';
  }, []);

  // 노드 클릭 핸들러
  const handleNodeClick = (node) => {
    interactionTracker.measureResponseSync(
      'Zone7Mini',
      'Node Click',
      () => {
        // 노드 정보 표시 로직 (현재는 콘솔에만 표시)
        console.log('Node clicked:', node);
      },
      { nodeId: node.id, label: node.label, kind: node.kind }
    );
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F0EDFD' }}>
        <Typography variant="body2" color="text.secondary">Loading Zone 7...</Typography>
      </Box>
    );
  }

  if (zoneGraph.nodes.length === 0) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F0EDFD' }}>
        <Typography variant="body2" color="text.secondary">Zone 7 데이터 없음</Typography>
      </Box>
    );
  }

  return (
    <Box 
      ref={containerRef} 
      sx={{ 
        width: '100%', 
        height: '100%', 
        bgcolor: '#F0EDFD', 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      }}
    >
      {containerSize.width > 0 && containerSize.height > 0 ? (
        <Suspense fallback={
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2">Loading Graph...</Typography>
          </Box>
        }>
          <ForceGraph3D
            ref={fgRef}
            graphData={zoneGraph}
            backgroundColor="#F0EDFD"
            width={containerSize.width}
            height={containerSize.height}
            nodeThreeObject={nodeThreeObject}
            nodeThreeObjectExtend={false}
            linkColor={linkColor}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleSpeed={0.006}
            enableNodeDrag={false}
            enablePointerInteraction={pointerEnabled}
            showNavInfo={false}
            warmupTicks={10}
            cooldownTicks={0}
            d3AlphaDecay={0.08}
            d3VelocityDecay={0.4}
            onEngineStop={() => {
              interactionTracker.log('Zone7Mini', 'Physics Engine Stopped - Interaction Enabled', {});
              setPointerEnabled(true);
            }}
            onNodeClick={handleNodeClick}
            onNodeHover={(node) => {
              if (node) {
                interactionTracker.log('Zone7Mini', 'Node Hover', { nodeId: node.id, label: node.label });
              }
            }}
          />
        </Suspense>
      ) : (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2">Initializing...</Typography>
        </Box>
      )}
    </Box>
  );
};

export default memo(Zone7Mini);
