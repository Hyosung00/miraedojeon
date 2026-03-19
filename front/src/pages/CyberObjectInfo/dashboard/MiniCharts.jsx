import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import northInfo from '../PDR/north_information.json';

const PURPLE = '#7c3aed';
const LIGHT_PURPLE = '#c4b5fd';
const COLORS = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const COUNTRY_KO = {
  'United States': '미국', 'USA': '미국', 'US': '미국',
  'China': '중국', 'CN': '중국',
  'Russia': '러시아', 'RU': '러시아',
  'North Korea': '북한', 'DPRK': '북한',
  'South Korea': '대한민국', 'KR': '대한민국',
  'Japan': '일본', 'JP': '일본',
  'Germany': '독일', 'DE': '독일',
  'United Kingdom': '영국', 'UK': '영국', 'GB': '영국',
  'France': '프랑스', 'FR': '프랑스',
  'Iran': '이란', 'IR': '이란',
  'India': '인도', 'IN': '인도',
  'Taiwan': '대만', 'TW': '대만',
  'Netherlands': '네덜란드', 'NL': '네덜란드',
  'Singapore': '싱가포르', 'SG': '싱가포르',
  'Ukraine': '우크라이나', 'UA': '우크라이나',
  'Vietnam': '베트남', 'VN': '베트남',
};
const toKo = (name) => COUNTRY_KO[name] || name;

// ── 공유 캐시: 여러 차트에서 동일 API를 한 번만 호출 ─────────────
let _attacksCache = null;
let _attacksPromise = null;
const fetchAttacks = () => {
  if (_attacksCache) return Promise.resolve(_attacksCache);
  if (_attacksPromise) return _attacksPromise;
  _attacksPromise = fetch('http://localhost:5000/api/north-korea-attacks?limit=500')
    .then(r => r.json())
    .then(d => { _attacksCache = d.success ? (d.attacks || []) : []; return _attacksCache; })
    .catch(() => []);
  return _attacksPromise;
};

let _nodesCache = null;
let _nodesPromise = null;
const fetchNodes = () => {
  if (_nodesCache) return Promise.resolve(_nodesCache);
  if (_nodesPromise) return _nodesPromise;
  _nodesPromise = fetch('http://localhost:8000/neo4j/nodes?activeView=zone7&includeIsolated=true')
    .then(r => r.json())
    .then(d => { _nodesCache = Array.isArray(d) ? d : []; return _nodesCache; })
    .catch(() => []);
  return _nodesPromise;
};

let _targetNodesCache = null;
let _targetNodesPromise = null;
const fetchTargetNodes = () => {
  if (_targetNodesCache) return Promise.resolve(_targetNodesCache);
  if (_targetNodesPromise) return _targetNodesPromise;
  _targetNodesPromise = fetch('http://localhost:8000/neo4j/nodes?activeView=target&includeIsolated=true')
    .then(r => r.json())
    .then(d => { _targetNodesCache = Array.isArray(d) ? d : []; return _targetNodesCache; })
    .catch(() => []);
  return _targetNodesPromise;
};

const getSelectedTargetNode = () => {
  try {
    const raw = localStorage.getItem('selected-target-node');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

// ── OSINT 카드 1: BGP 수집 현황 ──────────────────────────────────
// 날짜별 수집량 그라디언트 Area 차트
export function BgpCollectionChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // 기존 7회 병렬 API 호출 대신, 캐시되는 단일 공격 데이터 fetch 후 로컬 집계
    fetchAttacks().then(attacks => {
      const start = new Date(Date.UTC(2025, 8, 2, 0, 0, 0, 0));
      const dayMap = new Map(Array.from({ length: 7 }, (_, i) => [`9/${2 + i}`, 0]));

      attacks.forEach(a => {
        const ts = new Date(a.timestamp);
        if (isNaN(ts)) return;
        const diff = Math.floor((ts.getTime() - start.getTime()) / 86400000);
        if (diff < 0 || diff > 6) return;
        const key = `9/${2 + diff}`;
        dayMap.set(key, (dayMap.get(key) || 0) + (a.count || 1));
      });

      setData([...dayMap.entries()].map(([day, count]) => ({ day, count })));
    });
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="bgpAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={PURPLE} stopOpacity={0.75} />
            <stop offset="95%" stopColor={PURPLE} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fontSize: 7 }} />
        <YAxis tick={{ fontSize: 7 }} width={28} />
        <Tooltip
          contentStyle={{ fontSize: 10, padding: '3px 8px' }}
          formatter={v => [`${v.toLocaleString()}건`, '수집량']}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={PURPLE}
          strokeWidth={2}
          fill="url(#bgpAreaGrad)"
          dot={{ r: 2.5, fill: PURPLE, stroke: '#fff', strokeWidth: 1 }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── OSINT 카드 2: 글로벌 트래픽 흐름 가시화 ─────────────────────
// 출발지 국가별 트래픽 건수 Top 5 (실제 API)
export function TrafficFlowChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchAttacks().then(attacks => {
      const map = {};
      attacks.forEach(a => {
        const c = toKo(a.source?.name || '알 수 없음');
        map[c] = (map[c] || 0) + (a.count || 1);
      });
      const top5 = Object.entries(map)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([country, count]) => ({ country, count }));
      setData(top5.length ? top5 : [{ country: '데이터없음', count: 0 }]);
    });
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 8 }} />
        <YAxis type="category" dataKey="country" tick={{ fontSize: 9 }} width={36} />
        <Tooltip formatter={v => [`${v}건`, '트래픽']} contentStyle={{ fontSize: 10 }} />
        <Bar dataKey="count" fill={PURPLE} radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── OSINT 카드 3: 트래픽 상세 로그 ──────────────────────────────
// 시간대별 트래픽 발생 빈도 (실제 타임스탬프 기반)
export function TrafficLogChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchAttacks().then(attacks => {
      const hourMap = new Array(24).fill(0);
      attacks.forEach(a => {
        const d = new Date(a.timestamp);
        if (!isNaN(d)) hourMap[d.getHours()] += (a.count || 1);
      });
      const result = hourMap
        .map((v, h) => ({ h: String(h), v }))
        .filter((_, i) => i % 2 === 0); // 2시간 간격으로 표시
      setData(result);
    });
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <XAxis dataKey="h" tick={{ fontSize: 8 }} tickFormatter={v => `${v}시`} />
        <YAxis tick={{ fontSize: 8 }} />
        <Tooltip formatter={v => [`${v}건`, '발생']} contentStyle={{ fontSize: 10 }} labelFormatter={l => `${l}시`} />
        <Line type="monotone" dataKey="v" stroke={PURPLE} dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── OSINT 카드 4: 융합 DB 구축 ───────────────────────────────────
// 프로토콜별 MongoDB 수집 건수 vs Neo4j 노드 수
export function FusionDbChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    Promise.all([fetchAttacks(), fetchNodes()]).then(([attacks, nodes]) => {
      // 프로토콜별 MongoDB 공격 수 집계
      const protoMap = {};
      attacks.forEach(a => {
        const p = a.protocol || 'UNKNOWN';
        protoMap[p] = (protoMap[p] || 0) + (a.count || 1);
      });

      // Neo4j: 노드 종류별 카운트 (src_IP 기준)
      const nodeKinds = {};
      nodes.forEach(item => {
        if (item.src_IP?.kind) {
          nodeKinds[item.src_IP.kind] = (nodeKinds[item.src_IP.kind] || 0) + 1;
        }
      });
      const totalNeo4j = Object.values(nodeKinds).reduce((a, b) => a + b, 0) || 0;

      // 상위 5개 프로토콜 → MongoDB 건수 + Neo4j 비율로 환산
      const result = Object.entries(protoMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([proto, mongo]) => ({
          proto,
          mongo,
          neo4j: totalNeo4j > 0 ? Math.round(mongo * (totalNeo4j / attacks.length)) : Math.round(mongo * 0.97)
        }));

      setData(result.length ? result : [{ proto: '데이터없음', mongo: 0, neo4j: 0 }]);
    });
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 6, right: 4, left: -18, bottom: 0 }}>
        <XAxis dataKey="proto" tick={{ fontSize: 7 }} />
        <YAxis tick={{ fontSize: 8 }} />
        <Tooltip formatter={(v, name) => [`${v.toLocaleString()}건`, name === 'mongo' ? 'MongoDB' : 'Neo4j']} contentStyle={{ fontSize: 10 }} />
        <Bar dataKey="mongo" fill={PURPLE} name="MongoDB" radius={[2, 2, 0, 0]} />
        <Bar dataKey="neo4j" fill={LIGHT_PURPLE} name="Neo4j" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── cyberObject 카드 1: 시설 위치 미니맵 ────────────────────────
// north_information.json의 실제 위경도 좌표 사용
const FACILITY_COLORS = { nuclear: '#ef4444', rocket: '#f59e0b', law_facility: '#8b5cf6', default: '#6b7280' };
const FACILITY_SHORT = {
  '풍계리 핵실험장': '풍계리',
  '서해위성발사장': '서해발사장',
  '조선노동당 본부': '노동당본부',
  '영변 핵시설': '영변핵시설',
  '신포 조선소': '신포조선소',
  '국방과학원 미사일 연구소': '국방과학원',
};
const facilityShort = (name) => FACILITY_SHORT[name] || name;
export function FacilityMapChart() {
  const W = 200, H = 130;
  const minLat = 38.4, maxLat = 42.5, minLon = 123.5, maxLon = 130.5;
  const tx = lon => ((lon - minLon) / (maxLon - minLon)) * W;
  const ty = lat => H - ((lat - minLat) / (maxLat - minLat)) * H;

  const sites = northInfo.map(s => ({
    name: facilityShort(s.name),
    lat: s.geo_info.lat,
    lon: s.geo_info.lng,
    color: FACILITY_COLORS[s.detail.type] || FACILITY_COLORS.default,
  }));

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#dbeafe', borderRadius: 4 }}>
      <path
        d="M30,120 L18,100 L12,78 L18,58 L28,40 L42,24 L62,14 L84,8 L108,10 L130,16 L152,26 L168,42 L178,60 L182,80 L175,98 L162,112 L142,122 L118,128 L94,130 L70,128 L50,124 Z"
        fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1"
      />
      {[0.25, 0.5, 0.75].map((t, i) => (
        <React.Fragment key={i}>
          <line x1={W * t} y1={0} x2={W * t} y2={H} stroke="#93c5fd" strokeWidth="0.4" strokeDasharray="3,3" />
          <line x1={0} y1={H * t} x2={W} y2={H * t} stroke="#93c5fd" strokeWidth="0.4" strokeDasharray="3,3" />
        </React.Fragment>
      ))}
      {sites.map((f, i) => {
        const x = tx(f.lon), y = ty(f.lat);
        const labelLeft = x > W * 0.72;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={5} fill={f.color} stroke="#fff" strokeWidth="1.2" />
            <text x={labelLeft ? x - 7 : x + 7} y={y + 3.5} fontSize="7.5" fill="#1e293b"
              textAnchor={labelLeft ? 'end' : 'start'} fontWeight="bold">{f.name}</text>
          </g>
        );
      })}
      <rect x={2} y={H - 18} width={86} height={16} fill="rgba(255,255,255,0.8)" rx={2} />
      <circle cx={8}  cy={H - 10} r={3} fill="#ef4444" />
      <text x={13} y={H - 7} fontSize="7" fill="#334155">핵</text>
      <circle cx={24} cy={H - 10} r={3} fill="#f59e0b" />
      <text x={29} y={H - 7} fontSize="7" fill="#334155">로켓</text>
      <circle cx={46} cy={H - 10} r={3} fill="#8b5cf6" />
      <text x={51} y={H - 7} fontSize="7" fill="#334155">미사일</text>
    </svg>
  );
}

// ── cyberObject 카드 2: 객체 유형 분포 도넛 ─────────────────────
// Neo4j 실제 노드 kind 기준 분포
const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, name }) {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + (r + 12) * Math.cos(-midAngle * RADIAN);
  const y = cy + (r + 12) * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="#333" fontSize={8} textAnchor="middle" dominantBaseline="central">{name.slice(0, 4)}</text>;
}
export function ObjectDistChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchNodes().then(nodes => {
      const kindMap = {};
      nodes.forEach(item => {
        const k = item.src_IP?.kind || item.src_IP?.type || 'host';
        kindMap[k] = (kindMap[k] || 0) + 1;
      });
      const result = Object.entries(kindMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
      setData(result.length ? result : [
        { name: '서버', value: 3 }, { name: '라우터', value: 2 }, { name: '스위치', value: 4 },
        { name: '호스트', value: 8 }, { name: '방화벽', value: 1 }
      ]);
    });
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius="28%" outerRadius="52%"
          dataKey="value" paddingAngle={2} labelLine={false} label={CustomLabel}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── cyberObject 카드 3: 관계망 그래프 ───────────────────────────
// Neo4j 실제 노드/엣지 기반 (최대 7노드, 9엣지 샘플링)
const TYPE_COLORS = { core:'#7c3aed', firewall:'#ef4444', router:'#f59e0b', switch:'#10b981', server:'#3b82f6', host:'#6aa7ff', default:'#a0b4ff' };
export function NetworkGraphChart() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    fetchNodes().then(raw => {
      if (!raw.length) {
        // fallback 정적 그래프
        setNodes([
          { id: 0, x: 100, y: 55, label: 'Core',   r: 13, color: '#7c3aed' },
          { id: 1, x: 44,  y: 24, label: 'FW',     r: 9,  color: '#ef4444' },
          { id: 2, x: 156, y: 24, label: 'Router', r: 9,  color: '#f59e0b' },
          { id: 3, x: 24,  y: 90, label: 'SW',     r: 8,  color: '#10b981' },
          { id: 4, x: 100, y: 108,label: 'Server', r: 9,  color: '#3b82f6' },
          { id: 5, x: 176, y: 90, label: 'Host',   r: 8,  color: '#6aa7ff' },
        ]);
        setEdges([[0,1],[0,2],[0,4],[1,3],[2,5],[0,3],[4,5]]);
        return;
      }

      // 고유 노드 추출 (최대 7개)
      const nodeMap = new Map();
      raw.forEach(item => {
        if (item.src_IP?.id) nodeMap.set(String(item.src_IP.id), item.src_IP);
        if (item.dst_IP?.id) nodeMap.set(String(item.dst_IP.id), item.dst_IP);
      });
      const nodeArr = [...nodeMap.values()].slice(0, 7);
      const idToIdx = new Map(nodeArr.map((n, i) => [String(n.id), i]));

      // 원형 배치
      const cx = 100, cy = 65, r = 50;
      const builtNodes = nodeArr.map((n, i) => {
        const angle = (2 * Math.PI * i) / nodeArr.length - Math.PI / 2;
        const kind = (n.kind || n.type || 'host').toLowerCase();
        const isCentral = i === 0;
        return {
          id: i,
          x: isCentral ? cx : cx + r * Math.cos(angle),
          y: isCentral ? cy : cy + r * Math.sin(angle),
          label: (n.label || n.ip || String(n.id)).slice(0, 6),
          r: isCentral ? 13 : 8,
          color: TYPE_COLORS[kind] || TYPE_COLORS.default,
        };
      });

      // 엣지 추출 (최대 9개)
      const edgeSet = new Set();
      const builtEdges = [];
      for (const item of raw) {
        if (!item.edge) continue;
        const a = idToIdx.get(String(item.edge.sourceIP));
        const b = idToIdx.get(String(item.edge.targetIP));
        if (a === undefined || b === undefined || a === b) continue;
        const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        builtEdges.push([a, b]);
        if (builtEdges.length >= 9) break;
      }

      setNodes(builtNodes);
      setEdges(builtEdges);
    });
  }, []);

  return (
    <svg width="100%" height="100%" viewBox="0 0 200 130" style={{ background: '#f5f3ff', borderRadius: 4 }}>
      {edges.map(([a, b], i) => nodes[a] && nodes[b] && (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
          stroke="#c4b5fd" strokeWidth="1.5" />
      ))}
      {nodes.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={0.9} />
          <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={n.r < 10 ? 6 : 7} fill="#fff" fontWeight="bold">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── cyberObject 카드 4: 운영 관리 완료율 ────────────────────────
// 실제 시설 수 기준으로 과업 항목 구성 (north_information.json)
export function OperationChart() {
  const data = northInfo.map(site => {
    const totalBuildings = site.buildings?.length || 0;
    const criticalRooms = site.buildings?.reduce((sum, b) => {
      return sum + Object.values(b.structure_info || {}).flat().filter(r => r.status === 'critical').length;
    }, 0) || 0;
    const totalRooms = site.buildings?.reduce((sum, b) => {
      return sum + Object.values(b.structure_info || {}).flat().length;
    }, 0) || 1;
    const normalPct = Math.round(((totalRooms - criticalRooms) / totalRooms) * 100);
    return {
      task: facilityShort(site.name),
      done: normalPct,
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 18, left: 4, bottom: 2 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 7 }} tickFormatter={v => `${v}%`} tickCount={3} />
        <YAxis type="category" dataKey="task" tick={{ fontSize: 8 }} width={34} />
        <Tooltip formatter={v => [`${v}%`, '정상구역비율']} contentStyle={{ fontSize: 10 }} />
        <Bar dataKey="done" fill={PURPLE} radius={[0, 2, 2, 0]} background={{ fill: '#ede9fe', radius: 2 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TargetCandidateChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchTargetNodes().then(raw => {
      const nodeMap = new Map();
      raw.forEach(item => {
        if (item.src_IP) {
          const key = item.src_IP.id != null ? `id:${item.src_IP.id}` : (item.src_IP.ip ? `ip:${item.src_IP.ip}` : null);
          if (key && !nodeMap.has(key)) nodeMap.set(key, item.src_IP);
        }
        if (item.dst_IP) {
          const key = item.dst_IP.id != null ? `id:${item.dst_IP.id}` : (item.dst_IP.ip ? `ip:${item.dst_IP.ip}` : null);
          if (key && !nodeMap.has(key)) nodeMap.set(key, item.dst_IP);
        }
      });

      if (!nodeMap.size) {
        setData([]);
        return;
      }

      const typeCounts = {};
      [...nodeMap.values()].forEach((node) => {
        const degree = typeof node.degree_score === 'number' ? node.degree_score : 0;
        const con = typeof node.con_score === 'number' ? node.con_score : 0;
        if (degree < 0.5 || con < 0.5) return;

        const type = node.type || node.kind || 'UNKNOWN';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const result = Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 7)
        .map(([name, value]) => ({ name, value }));

      setData(result);
    });
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      {data.length ? (
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <XAxis type="number" tick={{ fontSize: 8 }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} width={56} />
          <Tooltip formatter={(v) => [`${v}개`, '고위험 노드 수']} contentStyle={{ fontSize: 10 }} />
          <Bar dataKey="value" fill={PURPLE} radius={[0, 2, 2, 0]}>
            {data.map((entry, index) => (
              <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 11 }}>
          고위험군(0.5↑) 노드 없음
        </div>
      )}
    </ResponsiveContainer>
  );
}

export function TargetDependencyChart() {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [selectedNodeToken, setSelectedNodeToken] = useState(0);

  useEffect(() => {
    const handleSelectedNodeChanged = () => {
      setSelectedNodeToken(prev => prev + 1);
    };

    window.addEventListener('selected-target-node-updated', handleSelectedNodeChanged);
    window.addEventListener('storage', handleSelectedNodeChanged);

    return () => {
      window.removeEventListener('selected-target-node-updated', handleSelectedNodeChanged);
      window.removeEventListener('storage', handleSelectedNodeChanged);
    };
  }, []);

  useEffect(() => {
    fetchTargetNodes().then(raw => {
      const nodeMap = new Map();
      const degreeMap = new Map();
      const adjacency = new Map();

      const ensureAdj = (id) => {
        if (!adjacency.has(id)) adjacency.set(id, new Set());
      };

      raw.forEach(item => {
        const src = item.src_IP?.id ? String(item.src_IP.id) : null;
        const dst = item.dst_IP?.id ? String(item.dst_IP.id) : null;

        if (src && item.src_IP) nodeMap.set(src, item.src_IP);
        if (dst && item.dst_IP) nodeMap.set(dst, item.dst_IP);

        if (src) degreeMap.set(src, (degreeMap.get(src) || 0) + 1);
        if (dst) degreeMap.set(dst, (degreeMap.get(dst) || 0) + 1);

        if (src && dst && src !== dst) {
          ensureAdj(src);
          ensureAdj(dst);
          adjacency.get(src).add(dst);
          adjacency.get(dst).add(src);
        }
      });

      const selectedNode = getSelectedTargetNode();
      const selectedIdById = selectedNode?.id ? String(selectedNode.id) : null;
      const selectedIdByIp = selectedNode?.ip
        ? [...nodeMap.entries()].find(([, n]) => n?.ip === selectedNode.ip)?.[0]
        : null;
      const selectedId = selectedIdById && nodeMap.has(selectedIdById)
        ? selectedIdById
        : selectedIdByIp || null;

      let selectedIds = [];
      if (selectedId) {
        const neighbors = [...(adjacency.get(selectedId) || [])]
          .sort((a, b) => (degreeMap.get(b) || 0) - (degreeMap.get(a) || 0))
          .slice(0, 4);
        selectedIds = [selectedId, ...neighbors];
      } else {
        selectedIds = [...degreeMap.entries()]
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([id]) => id);
      }

      const pool = selectedIds.map(id => ({ id, ...nodeMap.get(id) })).filter(Boolean);

      if (!pool.length) {
        setGraph({ nodes: [], edges: [] });
        return;
      }

      const base = [
        { x: 100, y: 65 },
        { x: 48, y: 34 },
        { x: 152, y: 34 },
        { x: 48, y: 98 },
        { x: 152, y: 98 }
      ];
      const palette = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

      const nodes = base.map((pos, i) => ({
        ...pos,
        r: i === 0 ? 12 : 8,
        label: i === 0
          ? (pool[i]?.ip || pool[i]?.label || 'TGT').toString().split('.').slice(-1)[0]
          : (pool[i]?.ip || pool[i]?.label || `N${i}`).toString().slice(0, 6),
        color: palette[i],
        id: pool[i]?.id ? String(pool[i].id) : null
      })).filter(node => node.id);

      const idToIndex = new Map(nodes.map((n, i) => [n.id, i]));
      const edges = [];
      const edgeSet = new Set();

      raw.forEach(item => {
        const s = item.edge?.sourceIP ? String(item.edge.sourceIP) : null;
        const t = item.edge?.targetIP ? String(item.edge.targetIP) : null;
        if (!s || !t) return;
        const a = idToIndex.get(s);
        const b = idToIndex.get(t);
        if (a === undefined || b === undefined || a === b) return;
        const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
        if (edgeSet.has(key)) return;
        edgeSet.add(key);
        edges.push([a, b]);
      });

      setGraph({ nodes, edges: edges.slice(0, 7) });
    });
  }, [selectedNodeToken]);

  return (
    <svg width="100%" height="100%" viewBox="0 0 200 130" style={{ background: '#f5f3ff', borderRadius: 4 }}>
      {graph.edges.map(([a, b], i) => graph.nodes[a] && graph.nodes[b] && (
        <line key={i} x1={graph.nodes[a].x} y1={graph.nodes[a].y} x2={graph.nodes[b].x} y2={graph.nodes[b].y} stroke="#c4b5fd" strokeWidth="1.5" />
      ))}
      {graph.nodes.map((node, i) => (
        <g key={i}>
          <circle cx={node.x} cy={node.y} r={node.r} fill={node.color} opacity={0.92} />
          <text x={node.x} y={node.y + 3.5} textAnchor="middle" fontSize={node.r > 10 ? 7 : 6} fill="#fff" fontWeight="bold">
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function TargetRiskTrendChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchTargetNodes().then(raw => {
      const seen = new Map();
      raw.forEach(item => {
        [item.src_IP, item.dst_IP].forEach(node => {
          if (!node?.ip) return;
          if (!seen.has(node.ip)) {
            seen.set(node.ip, {
              x: parseFloat((typeof node.degree_score === 'number' ? node.degree_score : 0).toFixed(3)),
              y: parseFloat((typeof node.con_score === 'number' ? node.con_score : 0).toFixed(3)),
              ip: node.ip
            });
          }
        });
      });
      setData([...seen.values()]);
    });
  }, []);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 6, right: 8, left: -10, bottom: 0 }}>
        <XAxis type="number" dataKey="x" name="degree" domain={[0, 1]} tick={{ fontSize: 7 }} label={{ value: 'degree', position: 'insideBottom', offset: -2, fontSize: 7 }} />
        <YAxis type="number" dataKey="y" name="con" domain={[0, 1]} tick={{ fontSize: 7 }} label={{ value: 'con', angle: -90, position: 'insideLeft', offset: 8, fontSize: 7 }} />
        <ZAxis range={[18, 18]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{ background: '#fff', border: '1px solid #ccc', padding: '4px 8px', fontSize: 9 }}>
                <div>{d.ip}</div>
                <div>degree: {d.x} / con: {d.y}</div>
              </div>
            );
          }}
        />
        <Scatter data={data} fill={PURPLE} fillOpacity={0.7} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function TargetTaskChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchTargetNodes().then(raw => {
      // 각 IP가 레코드에 등장하는 횟수(연결 수) 집계
      const connCount = new Map();
      raw.forEach(item => {
        [item.src_IP?.ip, item.dst_IP?.ip].forEach(ip => {
          if (ip) connCount.set(ip, (connCount.get(ip) || 0) + 1);
        });
      });

      // 연결 수 구간별 노드 수 집계
      const buckets = { '1': 0, '2-5': 0, '6-10': 0, '11-20': 0, '21+': 0 };
      connCount.forEach(count => {
        if (count === 1) buckets['1'] += 1;
        else if (count <= 5) buckets['2-5'] += 1;
        else if (count <= 10) buckets['6-10'] += 1;
        else if (count <= 20) buckets['11-20'] += 1;
        else buckets['21+'] += 1;
      });

      setData(Object.entries(buckets).map(([name, value]) => ({ name, value })));
    });
  }, []);

  const COLORS = ['#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9'];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: 2, bottom: 4 }}>
        <XAxis dataKey="name" tick={{ fontSize: 8 }} />
        <YAxis tick={{ fontSize: 8 }} allowDecimals={false} />
        <Tooltip formatter={v => [`${v}개 노드`, '연결 수 구간']} contentStyle={{ fontSize: 10 }} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i] || '#8b5cf6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── 능동 대응 카드: 우회/방어 전략 ────────────────────────────
// 물리 네트워크 토폴로지 + 공격 경로 강조 (OffensiveStrategy 공격 그래프 기반)
export function ActiveResponseDefenseChart({ nodes: inputNodes = [] }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeKey, setSelectedNodeKey] = useState(null);
  const [selectedTargetKey, setSelectedTargetKey] = useState(null);
  const [selectedStartKey, setSelectedStartKey] = useState(null);
  const [firstPriorityEdgeKeys, setFirstPriorityEdgeKeys] = useState([]);
  const [firstPriorityNodeIds, setFirstPriorityNodeIds] = useState([]);

  const edgeKeyOf = (a, b) => `${Math.min(a, b)}-${Math.max(a, b)}`;

  const findShortestPathIndices = (startIndex, targetIndex, graphEdges) => {
    if (startIndex === undefined || targetIndex === undefined) return [];
    if (startIndex === targetIndex) return [startIndex];

    const adjacency = new Map();
    graphEdges.forEach((e) => {
      if (!adjacency.has(e.a)) adjacency.set(e.a, []);
      if (!adjacency.has(e.b)) adjacency.set(e.b, []);
      adjacency.get(e.a).push(e.b);
      adjacency.get(e.b).push(e.a);
    });

    const queue = [startIndex];
    const visited = new Set([startIndex]);
    const parent = new Map();

    while (queue.length) {
      const current = queue.shift();
      const neighbors = adjacency.get(current) || [];
      for (const next of neighbors) {
        if (visited.has(next)) continue;
        visited.add(next);
        parent.set(next, current);
        if (next === targetIndex) {
          const path = [targetIndex];
          let p = targetIndex;
          while (parent.has(p)) {
            p = parent.get(p);
            path.push(p);
          }
          return path.reverse();
        }
        queue.push(next);
      }
    }

    return [];
  };

  const applyPriorityPathByKeys = (targetKey, startKey, graphNodes, graphEdges) => {
    if (!targetKey || !startKey || !graphNodes.length || !graphEdges.length) {
      setFirstPriorityEdgeKeys([]);
      setFirstPriorityNodeIds([]);
      return;
    }

    const targetIndex = graphNodes.findIndex((n) => (n.key || String(n.id)) === targetKey);
    const startIndex = graphNodes.findIndex((n) => (n.key || String(n.id)) === startKey);
    if (targetIndex < 0 || startIndex < 0) {
      setFirstPriorityEdgeKeys([]);
      setFirstPriorityNodeIds([]);
      return;
    }

    const pathIndices = findShortestPathIndices(startIndex, targetIndex, graphEdges);
    if (!pathIndices.length) {
      setFirstPriorityEdgeKeys([]);
      setFirstPriorityNodeIds([]);
      return;
    }

    const pathEdgeKeys = [];
    for (let i = 0; i < pathIndices.length - 1; i++) {
      pathEdgeKeys.push(edgeKeyOf(pathIndices[i], pathIndices[i + 1]));
    }

    setFirstPriorityEdgeKeys(pathEdgeKeys);
    setFirstPriorityNodeIds(pathIndices);
  };

  const applyNodePickFlow = (node, graphNodes, graphEdges) => {
    if (!node) return;
    const pickedKey = node.key || String(node.id);
    setSelectedNodeKey(pickedKey);

    if (!selectedTargetKey) {
      setSelectedTargetKey(pickedKey);
      setSelectedStartKey(null);
      setFirstPriorityEdgeKeys([]);
      setFirstPriorityNodeIds([]);
      return;
    }

    if (!selectedStartKey) {
      if (pickedKey === selectedTargetKey) return;
      setSelectedStartKey(pickedKey);
      applyPriorityPathByKeys(selectedTargetKey, pickedKey, graphNodes, graphEdges);
      return;
    }

    setSelectedTargetKey(pickedKey);
    setSelectedStartKey(null);
    setFirstPriorityEdgeKeys([]);
    setFirstPriorityNodeIds([]);
  };

  const emitSelectedNode = (node) => {
    if (!node) return;
    const payload = {
      key: node.key || String(node.id),
      id: node.rawId || node.key || String(node.id),
      ip: node.ip || '-',
      label: node.fullLabel || node.label || '-',
      name: node.fullLabel || node.label || '-',
      type: node.type || '-',
      degree: typeof node.degree === 'number' ? node.degree : null,
      con: typeof node.con === 'number' ? node.con : null
    };

    setSelectedNodeKey(payload.key);
    applyNodePickFlow(node, nodes, edges);
    try {
      localStorage.setItem('selected-response-node', JSON.stringify(payload));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('response-strategy-node-selected', { detail: payload }));
  };

  useEffect(() => {
    const buildGraph = (raw = []) => {
      const nodeMap = new Map();
      raw.forEach(item => {
        if (item.src_IP?.id) nodeMap.set(String(item.src_IP.id), item.src_IP);
        if (item.dst_IP?.id) nodeMap.set(String(item.dst_IP.id), item.dst_IP);
      });
      const nodeArr = [...nodeMap.values()].slice(0, 6);
      const idToIdx = new Map(nodeArr.map((n, i) => [String(n.id), i]));

      const cx = 100, cy = 65, radius = 50;
      const builtNodes = nodeArr.map((n, i) => {
        const angle = (2 * Math.PI * i) / nodeArr.length - Math.PI / 2;
        const t = (n.type || n.kind || 'host').toLowerCase();
        const isCentral = i === 0;
        return {
          id: i,
          key: n.id != null ? String(n.id) : (n.ip || n.label || String(i)),
          rawId: n.id != null ? String(n.id) : null,
          ip: n.ip || null,
          fullLabel: n.label || n.name || n.ip || String(n.id),
          type: t,
          degree: typeof n.degree_score === 'number' ? n.degree_score : null,
          con: typeof n.con_score === 'number' ? n.con_score : null,
          x: isCentral ? cx : cx + radius * Math.cos(angle),
          y: isCentral ? cy : cy + radius * Math.sin(angle),
          label: (n.ip || String(n.id)).slice(-5),
          r: isCentral ? 13 : 8,
          color: TYPE_COLORS[t] || TYPE_COLORS.default,
          isHighRisk: t === 'server' || t === 'firewall',
        };
      });

      const builtEdges = [];
      const edgeSet = new Set();
      let attackCount = 0;
      for (const item of raw) {
        if (!item.edge) continue;
        const a = idToIdx.get(String(item.edge.sourceIP));
        const b = idToIdx.get(String(item.edge.targetIP));
        if (a === undefined || b === undefined || a === b) continue;
        const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        builtEdges.push({ a, b, key, isAttack: attackCount < 2 });
        attackCount++;
        if (builtEdges.length >= 8) break;
      }

      if (!nodeArr.length) {
        setNodes([
          { id: 0, key: 'core', x: 100, y: 65,  label: 'Core',   fullLabel: 'Core',   type: 'core',    degree: null, con: null, r: 13, color: '#7c3aed', isHighRisk: false },
          { id: 1, key: 'fw',   x: 36,  y: 30,  label: 'FW',     fullLabel: 'FW',     type: 'firewall',degree: null, con: null, r: 9,  color: '#ef4444', isHighRisk: true  },
          { id: 2, key: 'rt',   x: 164, y: 30,  label: 'Router', fullLabel: 'Router', type: 'router',  degree: null, con: null, r: 9,  color: '#f59e0b', isHighRisk: false },
          { id: 3, key: 'sw',   x: 36,  y: 100, label: 'SW',     fullLabel: 'SW',     type: 'switch',  degree: null, con: null, r: 8,  color: '#10b981', isHighRisk: false },
          { id: 4, key: 'srv',  x: 100, y: 110, label: 'Srv',    fullLabel: 'Srv',    type: 'server',  degree: null, con: null, r: 9,  color: '#3b82f6', isHighRisk: true  },
          { id: 5, key: 'host', x: 164, y: 100, label: 'Host',   fullLabel: 'Host',   type: 'host',    degree: null, con: null, r: 8,  color: '#6aa7ff', isHighRisk: false },
        ]);
        setEdges([
          { a: 0, b: 1, key: edgeKeyOf(0, 1), isAttack: false }, { a: 0, b: 2, key: edgeKeyOf(0, 2), isAttack: true  },
          { a: 0, b: 4, key: edgeKeyOf(0, 4), isAttack: false }, { a: 1, b: 3, key: edgeKeyOf(1, 3), isAttack: false },
          { a: 2, b: 5, key: edgeKeyOf(2, 5), isAttack: true  }, { a: 0, b: 3, key: edgeKeyOf(0, 3), isAttack: false },
          { a: 4, b: 5, key: edgeKeyOf(4, 5), isAttack: false },
        ]);
        return;
      }
      setNodes(builtNodes);
      setEdges(builtEdges);
    };

    if (Array.isArray(inputNodes) && inputNodes.length > 0) {
      buildGraph(inputNodes);
      return;
    }

    fetchNodes().then((raw) => {
      buildGraph(raw);
    });
  }, [inputNodes]);

  useEffect(() => {
    const normalize = (v) => String(v || '').trim().toLowerCase();
    const handleResponseNodeSelected = (event) => {
      const payload = event?.detail || {};
      const keys = [payload.key, payload.id, payload.ip, payload.label, payload.name]
        .filter(Boolean)
        .map(normalize);
      if (!keys.length) return;

      const matched = nodes.find((n) => {
        const candidates = [n.key, n.rawId, n.ip, n.fullLabel, n.label]
          .filter(Boolean)
          .map(normalize);
        return keys.some((k) => candidates.includes(k));
      });
      if (matched) {
        setSelectedNodeKey(matched.key || String(matched.id));
        applyNodePickFlow(matched, nodes, edges);
      }
    };

    window.addEventListener('response-strategy-node-selected', handleResponseNodeSelected);
    return () => window.removeEventListener('response-strategy-node-selected', handleResponseNodeSelected);
  }, [nodes, edges, selectedTargetKey, selectedStartKey]);

  useEffect(() => {
    if (!selectedTargetKey || !selectedStartKey) {
      setFirstPriorityEdgeKeys([]);
      setFirstPriorityNodeIds([]);
      return;
    }
    applyPriorityPathByKeys(selectedTargetKey, selectedStartKey, nodes, edges);
  }, [nodes, edges, selectedTargetKey, selectedStartKey]);

  const firstPriorityPathLabel = (() => {
    if (!selectedTargetKey || !selectedStartKey || !firstPriorityNodeIds.length) return null;
    const labels = firstPriorityNodeIds
      .map((nodeIndex) => nodes[nodeIndex]?.label)
      .filter(Boolean);
    return labels.length ? labels.join(' → ') : null;
  })();

  return (
    <svg width="100%" height="100%" viewBox="0 0 200 130" style={{ background: '#f5f3ff', borderRadius: 4 }}>
      <ellipse cx={100} cy={65} rx={72} ry={52} fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="4,3" opacity={0.45} />
      {edges.map((e, i) => nodes[e.a] && nodes[e.b] && (
        <line key={i}
          x1={nodes[e.a].x} y1={nodes[e.a].y}
          x2={nodes[e.b].x} y2={nodes[e.b].y}
          stroke={firstPriorityEdgeKeys.includes(e.key) ? '#dc2626' : (e.isAttack ? '#ef4444' : '#c4b5fd')}
          strokeWidth={firstPriorityEdgeKeys.includes(e.key) ? 2.6 : (e.isAttack ? 2 : 1.5)}
          strokeDasharray={firstPriorityEdgeKeys.includes(e.key) ? '5,2' : (e.isAttack ? '4,2' : 'none')}
          opacity={firstPriorityEdgeKeys.includes(e.key) ? 1 : (e.isAttack ? 0.85 : 0.65)}
        />
      ))}
      {nodes.map(n => {
        const isSelected = selectedNodeKey != null && selectedNodeKey === (n.key || String(n.id));
        const isPriorityNode = firstPriorityNodeIds.includes(n.id);
        return (
        <g key={n.id} onClick={() => emitSelectedNode(n)} style={{ cursor: 'pointer' }}>
          {isPriorityNode && <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="#dc2626" strokeWidth="1.4" opacity={0.78} strokeDasharray="4,2" />}
          {isSelected && <circle cx={n.x} cy={n.y} r={n.r + 8} fill="none" stroke="#2563eb" strokeWidth="1.2" opacity={0.75} strokeDasharray="3,2" />}
          {n.isHighRisk && <circle cx={n.x} cy={n.y} r={n.r + 4} fill="none" stroke="#ef4444" strokeWidth="1.2" opacity={0.5} strokeDasharray="2,2" />}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} opacity={0.92} />
          <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize={n.r > 10 ? 7 : 6} fill="#fff" fontWeight="bold">{n.label}</text>
        </g>
      );})}
      <line x1={4}  y1={10} x2={16} y2={10} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,2" />
      <text x={19} y={13} fontSize={6.5} fill="#374151">공격경로</text>
      <line x1={4}  y1={20} x2={16} y2={20} stroke="#dc2626" strokeWidth={1.8} strokeDasharray="5,2" />
      <text x={19} y={23} fontSize={6.5} fill="#374151">1순위 경로</text>
      <line x1={62} y1={10} x2={74} y2={10} stroke="#c4b5fd" strokeWidth={1.5} />
      <text x={77} y={13} fontSize={6.5} fill="#374151">정상연결</text>
      {firstPriorityPathLabel && (
        <>
          <rect x={4} y={114} width={192} height={12} rx={2} fill="rgba(255,255,255,0.82)" />
          <text x={8} y={122} fontSize={6.2} fill="#7f1d1d">1순위: {firstPriorityPathLabel}</text>
        </>
      )}
    </svg>
  );
}

const HARD_CODED_CVE_LIST = [
  { id: 'CVE-2025-26974', score: 9.3, severity: 'CRITICAL', description: 'WP Multi Store Locator SQL Injection 취약점.', cweId: 'CWE-89' },
  { id: 'CVE-2025-23468', score: 7.1, severity: 'HIGH', description: 'Essay Wizard(wpCRES) Reflected XSS 취약점.', cweId: 'CWE-79' },
  { id: 'CVE-2025-23698', score: 7.1, severity: 'HIGH', description: 'WP Custom Google Search CSRF 기반 Stored XSS 취약점.', cweId: 'CWE-352' },
  { id: 'CVE-2025-3034', score: 8.1, severity: 'HIGH', description: 'Firefox/Thunderbird 메모리 손상 기반 임의 코드 실행 가능성.', cweId: 'CWE-787' },
  { id: 'CVE-2025-21650', score: 7.8, severity: 'HIGH', description: 'Linux kernel hns3 드라이버 OOB 접근 취약점.', cweId: 'CWE-787' },
  { id: 'CVE-2025-31344', score: 7.3, severity: 'HIGH', description: 'openEuler giflib heap-based buffer overflow 취약점.', cweId: 'CWE-122' },
  { id: 'CVE-2025-23251', score: 7.6, severity: 'HIGH', description: 'NVIDIA NeMo Framework 원격 코드 실행 취약점.', cweId: 'CWE-94' },
  { id: 'CVE-2025-43859', score: 9.1, severity: 'CRITICAL', description: 'h11 request smuggling 취약점.', cweId: 'CWE-444' },
  { id: 'CVE-2025-22352', score: 7.6, severity: 'HIGH', description: 'ELEX WooCommerce Blind SQL Injection 취약점.', cweId: 'CWE-89' },
  { id: 'CVE-2025-32615', score: 7.1, severity: 'HIGH', description: 'Clinked Client Portal Reflected XSS 취약점.', cweId: 'CWE-79' },
  { id: 'CVE-2025-22513', score: 7.1, severity: 'HIGH', description: 'Simple Locator Reflected XSS 취약점.', cweId: 'CWE-79' },
  { id: 'CVE-2025-0014', score: 7.3, severity: 'HIGH', description: 'AMD Ryzen AI 권한 상승 취약점.', cweId: 'CWE-276' },
  { id: 'CVE-2025-31238', score: 7.3, severity: 'HIGH', description: 'Apple WebContent 메모리 손상 취약점.', cweId: 'CWE-119' },
  { id: 'CVE-2025-21966', score: 7.8, severity: 'HIGH', description: 'Linux kernel dm-flakey 메모리 손상 취약점.', cweId: 'CWE-787' },
  { id: 'CVE-2025-3698', score: 7.5, severity: 'HIGH', description: '모바일 앱 정보 유출 취약점.', cweId: 'CWE-200' },
  { id: 'CVE-2025-2359', score: 7.3, severity: 'MEDIUM', description: 'D-Link DDNS 권한 검증 취약점.', cweId: 'CWE-266' },
  { id: 'CVE-2025-23638', score: 7.1, severity: 'HIGH', description: 'Frontend Post Submission Reflected XSS 취약점.', cweId: 'CWE-79' },
  { id: 'CVE-2025-3945', score: 7.2, severity: 'HIGH', description: 'Tridium Niagara Argument Injection 취약점.', cweId: 'CWE-88' },
  { id: 'CVE-2025-23781', score: 7.5, severity: 'HIGH', description: '민감정보 노출 취약점.', cweId: 'CWE-201' },
  { id: 'CVE-2025-24688', score: 7.1, severity: 'HIGH', description: 'WP Mailster Reflected XSS 취약점.', cweId: 'CWE-79' }
];

export function NewDiscoveredCveChart() {
  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {HARD_CODED_CVE_LIST.map((cve) => {
        const severityColor =
          cve.severity === 'CRITICAL' ? '#ef4444' :
          cve.severity === 'HIGH' ? '#f59e0b' :
          cve.severity === 'MEDIUM' ? '#3b82f6' : '#10b981';
        const scoreTimes10 = Math.round(cve.score * 10);

        return (
          <div key={cve.id} style={{ background: 'rgba(255,255,255,0.9)', border: `1px solid ${severityColor}`, borderLeft: `3px solid ${severityColor}`, borderRadius: '6px', padding: '6px', display: 'flex', gap: '6px' }}>
            <div style={{ width: '42px', minWidth: '42px', borderRadius: '6px', background: severityColor, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: 1 }}>{scoreTimes10}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: severityColor }}>{cve.id}</div>
                <div style={{ fontSize: '10px', color: '#fff', background: severityColor, borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>{cve.severity}</div>
              </div>
              <div style={{ fontSize: '10px', color: '#333', marginTop: '2px', lineHeight: 1.25 }}>{cve.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontSize: '10px', color: '#666' }}>
                <span>CVSS-V3: {cve.score.toFixed(1)}</span>
                <span>{cve.cweId}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const buildNodeListFromRecords = (records = []) => {
  const nodeMap = new Map();

  records.forEach((item) => {
    [item?.src_IP, item?.dst_IP].forEach((node) => {
      if (!node) return;
      const key = node.id != null ? String(node.id) : (node.ip || node.label || node.name || null);
      if (!key || nodeMap.has(key)) return;
      nodeMap.set(key, {
        key,
        ip: node.ip || '-',
        label: node.label || node.name || '-',
        type: node.kind || node.type || '-',
        degree: typeof node.degree_score === 'number' ? node.degree_score : null,
        con: typeof node.con_score === 'number' ? node.con_score : null
      });
    });
  });

  return [...nodeMap.values()]
    .filter((node) => node.degree != 0 && node.con != 0)
    .sort((a, b) => {
      const aScore = (a.degree || 0) + (a.con || 0);
      const bScore = (b.degree || 0) + (b.con || 0);
      return bScore - aScore;
    })
    .slice(0, 30);
};

export function ResponseStrategyListChart({ nodes = [] }) {
  const [nodeList, setNodeList] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);

  useEffect(() => {
    if (Array.isArray(nodes) && nodes.length > 0) {
      setNodeList(buildNodeListFromRecords(nodes));
      return;
    }

    fetchTargetNodes().then((raw) => {
      setNodeList(buildNodeListFromRecords(raw));
    });
  }, [nodes]);

  const handleSelectNode = (node) => {
    setSelectedKey(node.key);
    const payload = {
      key: node.key,
      id: node.key,
      ip: node.ip,
      label: node.label,
      name: node.label,
      type: node.type,
      degree: node.degree,
      con: node.con
    };

    try {
      localStorage.setItem('selected-response-node', JSON.stringify(payload));
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('response-strategy-node-selected', { detail: payload }));
  };

  return (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '10px' }}>
      {!nodeList.length ? (
        <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: '6px', padding: '10px', fontSize: '11px', color: '#666' }}>
          표시할 노드 정보가 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {nodeList.map((node, idx) => (
            <div
              key={node.key}
              onClick={() => handleSelectNode(node)}
              style={{
                background: 'rgba(255,255,255,0.92)',
                border: selectedKey === node.key ? '1px solid rgba(29, 78, 216, 0.45)' : '1px solid rgba(124,58,237,0.2)',
                borderLeft: selectedKey === node.key ? '3px solid #2563eb' : '3px solid #7c3aed',
                borderRadius: '6px',
                padding: '6px 8px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4c1d95' }}>
                  #{idx + 1} {node.ip}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: 700 }}>
                  {node.type}
                </div>
              </div>
              <div style={{ marginTop: '2px', fontSize: '10px', color: '#374151' }}>
                {node.label}
              </div>
              <div style={{ marginTop: '3px', fontSize: '10px', color: '#6b7280', display: 'flex', gap: '8px' }}>
                <span>degree: {node.degree != null ? node.degree.toFixed(3) : '-'}</span>
                <span>con: {node.con != null ? node.con.toFixed(3) : '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 공통 차트 맵 ─────────────────────────────────────────────────
export const CHART_MAP = {
  'BGP 트래픽 수집 현황':        BgpCollectionChart,
  '글로벌 트래픽 흐름 가시화':   TrafficFlowChart,
  '트래픽 상세 로그':            TrafficLogChart,
  '융합 데이터베이스 구축':      FusionDbChart,
  '사이버 물리 환경 구조 가시화': FacilityMapChart,
  '다층 사이버 객체 분류':       ObjectDistChart,
  '객체 관계망 및 취약점 분석':  NetworkGraphChart,
  '객체 상태 변화 및 운영 관리': OperationChart,
  '표적 후보 표':                TargetCandidateChart,
  '표적 의존성 그래프':          TargetDependencyChart,
  '표적 위험 추세':              TargetRiskTrendChart,
  '표적 대응 과업':              TargetTaskChart,
  '우회/방어 전략':              ActiveResponseDefenseChart,
  '새로 발견된 CVE':             NewDiscoveredCveChart,
  '대응 방책':                   ResponseStrategyListChart,
};
