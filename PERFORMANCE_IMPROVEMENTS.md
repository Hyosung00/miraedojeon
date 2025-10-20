# 성능 개선 가이드 (90점 목표)

## 현재 성능 점수 분석
- First Contentful Paint: 3.6초 (점수: 0.02/100)
- Largest Contentful Paint: 6.8초 (점수: 0.02/100)  
- Speed Index: 4.8초 (점수: 0.04/100)

## 주요 개선 사항

### 1. 코드 스플리팅 및 지연 로딩
```jsx
// React.lazy를 사용한 컴포넌트 지연 로딩
const ZonePage = React.lazy(() => import('./ZonePage'));
const InternalLog = React.lazy(() => import('./Internal_Log'));
const ForceGraph3D = React.lazy(() => import('react-force-graph-3d'));

// Suspense로 감싸기
<Suspense fallback={<div>Loading...</div>}>
  <ForceGraph3D ... />
</Suspense>
```

### 2. 3D 그래프 최적화
```jsx
// Three.js 객체 재사용 - 메모리 누수 방지
const geometryCache = new Map();
const materialCache = new Map();

// LOD (Level of Detail) 적용
const nodeThreeObject = useCallback((node) => {
  // 간소화된 기하학 사용 (세그먼트 수 줄이기)
  // 16, 32 → 8, 12로 감소
  const geo = new THREE.SphereGeometry(3, 8, 8); // 대신 12, 12
}, []);
```

### 3. 렌더링 최적화
```jsx
// React.memo로 불필요한 리렌더링 방지
const LeftSidebar = memo(({ zones }) => { ... });
const RightPanel = memo(({ logs }) => { ... });

// warmupTicks, cooldownTicks 줄이기
<ForceGraph3D
  warmupTicks={10}  // 18 → 10
  cooldownTicks={30} // 70 → 30
  d3AlphaDecay={0.04} // 0.028 → 0.04 (더 빠른 수렴)
/>
```

### 4. 네트워크 요청 최적화
```jsx
// 데이터 프리페칭
useEffect(() => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = 'http://localhost:8000/neo4j/nodes?activeView=internaltopology';
  document.head.appendChild(link);
}, []);

// 캐시 활용
const fetchWithCache = async (url) => {
  const cached = sessionStorage.getItem(url);
  if (cached) return JSON.parse(cached);
  const data = await fetch(url).then(r => r.json());
  sessionStorage.setItem(url, JSON.stringify(data));
  return data;
};
```

### 5. 이미지 및 에셋 최적화
```jsx
// 이미지 사전 로드
const preloadImages = () => {
  const images = ['logo.png', 'icon.svg'];
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });
};
```

### 6. CSS 최적화
```css
/* will-change 속성으로 하드웨어 가속 */
.graph-container {
  will-change: transform;
  transform: translateZ(0);
}

/* contain 속성으로 레이아웃 리페인트 최소화 */
.sidebar {
  contain: layout style;
}
```

### 7. 번들 크기 최적화
```js
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'react-graph': ['react-force-graph-3d']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
}
```

### 8. 초기 렌더링 최적화
```jsx
// Progressive Enhancement - 먼저 간단한 뷰 표시
const [isFullyLoaded, setIsFullyLoaded] = useState(false);

return (
  <>
    {!isFullyLoaded && <SimplifiedView />}
    <ComplexGraph onLoad={() => setIsFullyLoaded(true)} />
  </>
);
```

### 9. Web Worker 사용
```jsx
// 무거운 계산을 Web Worker로 분리
const worker = new Worker('dataProcessor.worker.js');
worker.postMessage({ nodes, links });
worker.onmessage = (e) => {
  setProcessedData(e.data);
};
```

### 10. 가상화 (Virtualization)
```jsx
// 많은 노드가 있을 경우 가상화 적용
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={zones.length}
  itemSize={50}
>
  {ZoneRow}
</FixedSizeList>
```

## 즉시 적용 가능한 최적화

### A. ForceGraph3D 설정
```jsx
<ForceGraph3D
  // 성능 관련 설정
  enableNodeDrag={false}
  enableNavigationControls={false}
  showNavInfo={false}
  
  // 물리 엔진 최적화
  warmupTicks={10}
  cooldownTicks={30}
  d3AlphaDecay={0.05}
  d3VelocityDecay={0.4}
  
  // 렌더링 최적화
  nodeRelSize={4}
  linkDirectionalParticles={0}  // 파티클 비활성화
/>
```

### B. 메모이제이션 강화
```jsx
// useMemo로 모든 계산 결과 캐싱
const filteredGraph = useMemo(() => 
  buildFilteredGraph(graph, selectedZones), 
  [graph, selectedZones]
);

const adjacency = useMemo(() => 
  buildAdjacency(filtered.links), 
  [filtered.links]
);
```

### C. 불필요한 리렌더링 제거
```jsx
// useCallback으로 함수 메모이제이션
const handleNodeClick = useCallback((node) => {
  setSelected(node);
}, []);

const handleBackgroundClick = useCallback(() => {
  setSelected(null);
}, []);
```

## 측정 및 모니터링
```jsx
// Performance API 사용
useEffect(() => {
  const start = performance.now();
  return () => {
    const end = performance.now();
    console.log(`Render time: ${end - start}ms`);
  };
}, [graph]);
```

## 예상 개선 효과
이 최적화들을 적용하면:
- FCP: 3.6초 → 1.2초 이하 (목표: <1.8초)
- LCP: 6.8초 → 2.0초 이하 (목표: <2.5초)
- Speed Index: 4.8초 → 2.5초 이하 (목표: <3.4초)
- **예상 종합 점수: 85-92점**
