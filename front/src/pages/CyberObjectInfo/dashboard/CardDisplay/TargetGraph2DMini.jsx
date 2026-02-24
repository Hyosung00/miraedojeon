import React, { useEffect, useRef, useMemo, memo } from "react";
import { Network } from "vis-network/standalone";
import { Box } from "@mui/material";
import "vis-network/styles/vis-network.css";
import interactionTracker from "../../../../utils/interactionTracker";

// 노드 타입에 따른 이미지 반환
const getNodeImage = (node) => {
  let type = node?.nodeType || node?.type || node?.properties?.type;
  if (!type && node?.label && typeof node.label === 'string') {
    const lowerLabel = node.label.toLowerCase();
    if (lowerLabel.includes('server')) return '/image/server.png';
    if (lowerLabel.includes('laptop')) return '/image/laptop.png';
    if (lowerLabel.includes('workstation')) return '/image/workstation.png';
    if (lowerLabel.includes('router')) return '/image/router.png';
    if (lowerLabel.includes('switch')) return '/image/switch.png';
    if (lowerLabel.includes('firewall')) return '/image/firewall.png';
  }
  const t = String(type || '').toLowerCase();
  if (t === 'switch') return '/image/switch.png';
  if (t === 'workstation') return '/image/workstation.png';
  if (t === 'server') return '/image/server.png';
  if (t === 'router') return '/image/router.png';
  if (t === 'firewall') return '/image/firewall.png';
  if (t === 'laptop') return '/image/laptop.png';
  if (t === 'printer') return '/image/printer.png';
  if (t === 'sensor') return '/image/sensor.png';
  if (t === 'plc') return '/image/plc.png';
  return '/image/switch.png';
};

// 엣지 스타일 반환
const getEdgeStyle = (edge) => {
  const defaultStyle = {
    color: { color: '#cccccc' },
    width: 1
  };
  if (!edge) return defaultStyle;
  
  const type = edge.type || edge.attack_type;
  if (type === 'attack' || type === 'malicious') {
    return { color: { color: '#ff0000' }, width: 2 };
  }
  if (type === 'suspicious') {
    return { color: { color: '#ff9900' }, width: 2 };
  }
  return defaultStyle;
};

const TargetGraph2DMini = memo(({ dbNodes = [] }) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  // dbNodes를 Vis.js 노드/엣지 데이터로 변환
  const getNodeId = React.useCallback(
    node => String(node?.__id ?? node?.id ?? node?.ip ?? node?.index ?? JSON.stringify(node)),
    []
  );

  const { nodes, edges } = useMemo(() => {
    const nodes = [];
    const edges = [];
    
    // 모든 edge 생성
    dbNodes.forEach(item => {
      if (item.edge && item.src_IP && item.dst_IP) {
        const srcId = getNodeId(item.src_IP);
        const dstId = getNodeId(item.dst_IP);
        const style = getEdgeStyle(item.edge);
        edges.push({
          from: srcId,
          to: dstId,
          length: 100 + Math.random() * 200,
          ...style
        });
      }
    });

    // 모든 노드 추가
    dbNodes.forEach(item => {
      [item.src_IP, item.dst_IP].forEach(node => {
        const nid = getNodeId(node);
        if (node && !nodes.some(n => n.id === nid)) {
          const imageSrc = getNodeImage(node);
          const minSize = 12;
          const maxSize = 40;
          let score = 0.5;
          if (typeof node.degree_score === 'number' && typeof node.con_score === 'number') {
            score = node.degree_score + node.con_score;
            score = Math.max(0, Math.min(1, score));
          }
          const dynamicSize = minSize + (maxSize - minSize) * score;
          nodes.push({
            id: nid,
            label: node.label || node.ip || nid,
            shape: 'image',
            image: imageSrc,
            size: dynamicSize
          });
        }
      });
    });

    return { nodes, edges };
  }, [dbNodes, getNodeId]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;
    if (networkRef.current) return;

    const data = { nodes, edges };
    const options = {
      layout: {
        randomSeed: 1
      },
      nodes: {
        shape: "image",
        brokenImage: getNodeImage({}),
        size: 30,
        borderWidth: 2,
        color: { border: "#b39ddb" },
        font: { size: 12, color: "#222" }
      },
      edges: {
        smooth: { type: 'continuous' }
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -30,
          centralGravity: 0.005,
          springLength: 100,
          springConstant: 0.05
        },
        stabilization: {
          enabled: true,
          iterations: 150,
          updateInterval: 25
        }
      },
      interaction: {
        hover: true,
        navigationButtons: false,
        keyboard: false
      }
    };

    networkRef.current = new Network(containerRef.current, data, options);

    // 줌 이벤트
    networkRef.current.on('zoom', (params) => {
      interactionTracker.log('TargetGraph2DMini', 'Network Zoom', { 
        scale: params.scale?.toFixed(2),
        pointer: params.pointer
      });
    });

    // 드래그 이벤트
    networkRef.current.on('dragStart', (params) => {
      interactionTracker.log('TargetGraph2DMini', 'Network Drag Started', {});
    });
    
    networkRef.current.on('dragging', (params) => {
      if (params.nodes.length > 0) {
        interactionTracker.log('TargetGraph2DMini', 'Node Being Dragged', { nodeId: params.nodes[0] });
      }
    });
    
    networkRef.current.on('dragEnd', (params) => {
      interactionTracker.log('TargetGraph2DMini', 'Network Drag Ended', {});
    });

    // 노드 호버 이벤트
    networkRef.current.on('hoverNode', (params) => {
      const hoveredNode = nodes.find(n => n.id === params.node);
      interactionTracker.log('TargetGraph2DMini', 'Node Hover', { 
        nodeId: params.node,
        label: hoveredNode?.label 
      });
    });

    // 네트워크 안정화 완료
    networkRef.current.once('stabilizationIterationsDone', () => {
      interactionTracker.log('TargetGraph2DMini', 'Network Stabilized', { 
        nodeCount: nodes.length,
        edgeCount: edges.length 
      });
    });

    // 노드 클릭 이벤트
    networkRef.current.on('selectNode', (params) => {
      const nodeId = params.nodes && params.nodes[0];
      if (!nodeId) return;
      
      const selectedNode = nodes.find(n => n.id === nodeId);
      interactionTracker.measureResponseSync(
        'TargetGraph2DMini',
        'Node Click',
        () => {
          console.log('Target node clicked:', selectedNode);
        },
        { nodeId, label: selectedNode?.label }
      );
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [nodes, edges]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        bgcolor: '#F0EDFD',
        '& .vis-network': {
          outline: 'none'
        },
        '& canvas': {
          display: 'block'
        }
      }}
    />
  );
});

TargetGraph2DMini.displayName = 'TargetGraph2DMini';

export default TargetGraph2DMini;
