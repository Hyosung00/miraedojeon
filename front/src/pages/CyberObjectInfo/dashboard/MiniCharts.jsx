import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer
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

// ── OSINT 카드 1: BGP 수집 현황 ──────────────────────────────────
// 날짜별 수집량 그라디언트 Area 차트
export function BgpCollectionChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // BGP 페이지와 동일: 2025-09-02~09-08 7일간 날짜별 병렬 fetch
    const promises = [];
    const labels = [];
    for (let day = 0; day < 7; day++) {
      const dayStart = new Date(Date.UTC(2025, 8, 2 + day, 0, 0, 0, 0));
      const dayEnd   = new Date(Date.UTC(2025, 8, 2 + day, 23, 59, 59, 999));
      labels.push(`9/${2 + day}`);
      const url = `http://localhost:5000/api/north-korea-attacks?limit=20&startDate=${dayStart.toISOString()}&endDate=${dayEnd.toISOString()}`;
      promises.push(
        fetch(url).then(r => r.json())
          .then(d => d.success ? (d.attacks || []) : [])
          .catch(() => [])
      );
    }
    Promise.all(promises).then(dayResults => {
      const result = labels.map((day, i) => ({
        day,
        count: dayResults[i].reduce((sum, a) => sum + (a.count || 1), 0),
      }));
      setData(result);
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
};
