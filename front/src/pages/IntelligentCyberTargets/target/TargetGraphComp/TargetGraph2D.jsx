import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { Network } from "vis-network/standalone";
import "../Target.css";
import getNodeImage from './TargetImage';
import { getEdgeStyle } from './edgeStyleUtils';

const TargetGraph2D = React.memo(({ dbNodes = [], onNodeClick, filterConditions }) => {
  const containerRef = useRef(null);
  const networkRef = useRef(null);

  // dbNodes를 Vis.js 노드/엣지 데이터로 변환
  const getNodeId = React.useCallback(
    node => String(node?.__id ?? node?.id ?? node?.ip ?? node?.index ?? JSON.stringify(node)),
    []
  );
  // ...width, height 변수 제거...
  const { nodes, edges } = React.useMemo(() => {
    const nodes = [];
    const edges = [];
    // 모든 edge 생성 (중복 허용, ip 상관없이)
    dbNodes.forEach(item => {
      if (item.edge && item.src_IP && item.dst_IP) {
        const srcId = getNodeId(item.src_IP);
        const dstId = getNodeId(item.dst_IP);
        const degreeScore = typeof item.src_IP.degree_score === 'number' ? item.src_IP.degree_score : null;
        let edgeType = 'solid';
        if (degreeScore <= 0.5) edgeType = 'dashed';
        if (filterConditions?.connectionType === 'direct' && !(degreeScore > 0.5)) return;
        if (filterConditions?.connectionType === 'indirect' && !(degreeScore > 0 && degreeScore <= 0.5)) return;
        const style = getEdgeStyle({ ...item.edge, edgeType });
        edges.push({
          from: srcId,
          to: dstId,
          length: 100 + Math.random() * 200,
          ...style
        });
      }
    });
    // 모든 노드 추가 (중복 허용, ip 상관없이)
    dbNodes.forEach(item => {
      [item.src_IP, item.dst_IP].forEach(node => {
        const nid = getNodeId(node);
        if (node && !nodes.some(n => n.id === nid)) {
          const imageSrc = getNodeImage(node);
          const minSize = 14;
          const maxSize = 50;
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
  }, [dbNodes, getNodeId, filterConditions]);

  useEffect(() => {
    const data = { nodes, edges };
    const options = {
      layout: {
        randomSeed: 1 // 고정 배치
      },
      nodes: {
        shape: "image",
        brokenImage: getNodeImage({}),
        size: 30,
        borderWidth: 2,
        color: { border: "#b39ddb" },
        font: { size: 18, color: "#222" }
      },
      edges: {
        // edge별 스타일은 edges 배열에서 개별적으로 적용됨
      },
      physics: true // 물리 엔진 활성화
    };
    if (containerRef.current && !networkRef.current) {
      networkRef.current = new Network(containerRef.current, data, options);
      networkRef.current.on('click', function(params) {
        if (params.nodes && params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const nodeData = nodes.find(n => n.id === nodeId);
          // 트리 형태로 연결된 모든 노드 탐색 (BFS)
          const visited = new Set();
          const queue = [nodeId];
          while (queue.length > 0) {
            const currentId = queue.shift();
            if (!visited.has(currentId)) {
              visited.add(currentId);
              edges.forEach(e => {
                if (e.from === currentId && !visited.has(e.to)) {
                  queue.push(e.to);
                }
                if (e.to === currentId && !visited.has(e.from)) {
                  queue.push(e.from);
                }
              });
            }
          }
          const connectedIds = Array.from(visited).filter(id => id !== nodeId);
          const connectedCount = connectedIds.length;
          // 연결된 노드의 ip/label을 nodes에서 직접 추출
          const ipSet = new Set();
          connectedIds.forEach(cid => {
            const foundNode = nodes.find(n => n.id === cid);
            if (foundNode?.label) ipSet.add(foundNode.label);
            if (foundNode?.ip) ipSet.add(foundNode.ip);
          });
          // 클릭한 노드의 ip/label 구하기
          let clickedIp = nodeData?.ip || nodeData?.label;
          // 클릭한 노드 ip/label을 목록에서 제외
          const connectedIps = Array.from(ipSet).filter(ip => ip !== clickedIp);
          // 클릭한 노드의 src_IP, dst_IP, edge 정보만 전달
          const clickedItem = dbNodes.find(item => {
            return getNodeId(item.src_IP) === nodeId || getNodeId(item.dst_IP) === nodeId;
          });
          if (onNodeClick) {
            onNodeClick({
              ...nodeData,
              connectedCount,
              connectedIps,
              dbInfo: clickedItem ? [{
                src_IP: clickedItem.src_IP,
                dst_IP: clickedItem.dst_IP,
                edge: clickedItem.edge
              }] : []
            });
          }
        }
      });
    }
    // 이후에는 setData 호출하지 않음 (최초 렌더만)
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbNodes, nodes, edges]);

  return (
    <div className="target-graph-canvas" ref={containerRef} />
  );
});

TargetGraph2D.displayName = 'TargetGraph2D';

export default TargetGraph2D;
