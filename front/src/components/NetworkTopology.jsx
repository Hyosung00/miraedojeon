import ForceGraph2D from "react-force-graph-2d";
import { useRef, useEffect, useState } from "react";

const sampleData = {
  nodes: [
    { id: 'Gateway', group: 1 },
    { id: 'Switch-1', group: 2 },
    { id: 'Server-1', group: 3 },
    { id: 'Server-2', group: 3 },
    { id: 'PC-1', group: 4 },
    { id: 'PC-2', group: 4 }
  ],
  links: [
    { source: 'Gateway', target: 'Switch-1' },
    { source: 'Switch-1', target: 'Server-1' },
    { source: 'Switch-1', target: 'Server-2' },
    { source: 'Switch-1', target: 'PC-1' },
    { source: 'Switch-1', target: 'PC-2' }
  ]
};

export default function NetworkTopology({ data = sampleData }) {
  const fgRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setDimensions({ width: offsetWidth, height: offsetHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}
    >
      {dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={data}
          nodeAutoColorBy="group"
          nodeLabel="id"
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.id;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(label, node.x, node.y);
          }}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={1}
          cooldownTicks={40}
          width={dimensions.width}
          height={dimensions.height}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          onEngineStop={() => {
            if (fgRef.current) fgRef.current.zoomToFit(400, 45);
          }}
        />
      )}
    </div>
  );
}