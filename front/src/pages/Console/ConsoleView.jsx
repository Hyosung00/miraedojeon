import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@mui/material';
import interactionTracker from '../../utils/interactionTracker';

// 각 타입별 설정
const CONFIG = {
  treatAnalysis: {
    title: '위험 노출도 및 공격 가능도 측정',
    ariaLabel: '위험 노출도 및 공격 가능도 측정',
    file: 'network_treat_analysis.json',
    animationSpeed: 50,
    renderMode: 'text'
  },
  targetIdentification: {
    title: '네트워크 구조 분석 및 표적 식별',
    ariaLabel: '네트워크 구조 분석 및 표적 식별',
    file: 'network_traffic.nodes.json',
    animationSpeed: 100
  },
  targetPriority: {
    title: '핵심 표적 점수 분석',
    ariaLabel: '핵심 표적 점수 분석',
    file: 'network_traffic.nodes.json',
    animationSpeed: 100
  },
  fusionDB: {
    title: '융합 데이터베이스 구축',
    ariaLabel: '융합 데이터베이스 구축',
    file: 'network_traffic.nodes.json',
    animationSpeed: 100
  },
  networkDataFusion: {
    title: '네트워크 데이터 융합',
    ariaLabel: '네트워크 데이터 융합',
    file: 'network_traffic.nodes.json',
    animationSpeed: 100
  }
};

const ConsoleView = ({ type = 'treatAnalysis', open = true, isPopup = false, controls = null, bare = false }) => {
  const [jsonTable, setJsonTable] = useState(null);
  const [displayedRows, setDisplayedRows] = useState(0);
  const [rowTimestamps, setRowTimestamps] = useState([]);
  const tableAnimationRef = React.useRef(null);
  
  const config = CONFIG[type] || CONFIG.treatAnalysis;

  useEffect(() => {
    if (open) {
      setJsonTable(null);
      setDisplayedRows(0);
      setRowTimestamps([]);
      loadFileContent();
    } else {
      if (tableAnimationRef.current) {
        clearInterval(tableAnimationRef.current);
        tableAnimationRef.current = null;
      }
      setJsonTable(null);
      setDisplayedRows(0);
      setRowTimestamps([]);
    }
    return () => {
      if (tableAnimationRef.current) {
        clearInterval(tableAnimationRef.current);
      }
    };
  }, [open, type]);

  const loadFileContent = async () => {
    setJsonTable(null);
    setDisplayedRows(0);
    setRowTimestamps([]);
    
    await interactionTracker.measureResponse(
      'ConsoleView',
      'Load File Content',
      async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/read-info-file?file=${config.file}`);
          const text = await response.text();
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object') {
          // 시간 없이 원본 데이터 저장
          setJsonTable(json);
          animateTable(json.length);
        }
          } catch (e) {
            // JSON 파싱 실패 시 무시
          }
        } catch (error) {
          console.error('파일 로드 실패:', error);
        }
      },
      { file: config.file, type: type }
    );
  };

  const getCurrentTimestamp = () => {
    const now = new Date();
    const performanceTime = performance.now();
    const microseconds = String(Math.floor((performanceTime % 1) * 1000000)).padStart(6, '0');
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  };

  const animateTable = (totalRows) => {
    if (tableAnimationRef.current) {
      clearInterval(tableAnimationRef.current);
    }
    
    let currentRow = 0;
    setDisplayedRows(0);
    setRowTimestamps([]);
    
    tableAnimationRef.current = setInterval(() => {
      if (currentRow < totalRows) {
        currentRow++;
        setDisplayedRows(currentRow);
        // 각 행이 표시될 때 타임스탬프 기록
        setRowTimestamps(prev => [...prev, getCurrentTimestamp()]);
      } else {
        clearInterval(tableAnimationRef.current);
        tableAnimationRef.current = null;
      }
    }, config.animationSpeed);
  };

  const formatRowAsText = (row) => {
    if (row['노드번호'] === '헤더') {
      return `\n▶ ${row['노드명']}`;
    }
    if (row['노드번호'] === '경로') {
      return `  ${row['노드명']}\n  경로: ${row['공격가능도']}`;
    }
    if (row['노드번호'] === '요약') {
      return `결론: ${row['공격가능도']}`;
    }
    return `  노드 ${row['노드번호']}번 [${row['노드명']}] — HRN: ${row['HRN']}, NLS: ${row['NLS']}, CPS: ${row['CPS']}, 공격가능도: ${row['공격가능도']}`;
  };

  const tableBody = config.renderMode === 'text' ? (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: '13px', lineHeight: '2' }}>
      {jsonTable && jsonTable.slice(0, displayedRows).map((row, i) => {
        const isHeader = row['노드번호'] === '헤더';
        const isPath   = row['노드번호'] === '경로';
        const isSummary = row['노드번호'] === '요약';
        return (
          <div key={i} style={{
            display: 'flex', gap: '12px', padding: '2px 0',
            borderBottom: isHeader ? '1px solid rgba(57,48,107,0.3)' : '1px solid rgba(57,48,107,0.1)',
            marginTop: isHeader ? '10px' : '0',
            fontWeight: isHeader ? 'bold' : 'normal',
            color: isHeader ? '#39306b' : isSummary ? '#2e7d32' : 'inherit'
          }}>
            {!isHeader && <span style={{ color: '#6858a3', flexShrink: 0, fontSize: '11px' }}>{rowTimestamps[i] || ''}</span>}
            <span style={{ whiteSpace: 'pre-line', color: isPath ? '#555' : 'inherit', fontSize: isPath ? '12px' : 'inherit' }}>
              {formatRowAsText(row)}
            </span>
          </div>
        );
      })}
    </div>
  ) : (
    <div style={{ overflowX: 'auto' }}>
      {jsonTable && (
        <table style={{ 
          borderCollapse: 'collapse', 
          width: '100%', 
          background: '#fff', 
          color: '#222', 
          fontSize: '13px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px 12px', background: '#6858a3', color: '#fff', fontWeight: 'bold', textAlign: 'left' }}>시간</th>
              {Object.keys(jsonTable[0]).map((key) => (
                <th key={key} style={{ border: '1px solid #ddd', padding: '8px 12px', background: '#6858a3', color: '#fff', fontWeight: 'bold', textAlign: 'left' }}>{key}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jsonTable.slice(0, displayedRows).map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                <td style={{ border: '1px solid #ddd', padding: '8px 12px' }}>{rowTimestamps[i] || ''}</td>
                {Object.keys(jsonTable[0]).map((key) => (
                  <td key={key} style={{ border: '1px solid #ddd', padding: '8px 12px' }}>
                    {typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  if (bare) {
    return tableBody;
  }

  return (
    <Card 
      component="main"
      role="main"
      aria-label={config.ariaLabel}
      sx={{
        width: '100%',
        height: isPopup ? '100%' : 'calc(100vh - 132px)',
        bgcolor: 'background.paper',
        boxShadow: 3,
        m: 0
      }}
    >
      <CardContent sx={{
        p: 1,
        height: '100%',
        '&:last-child': { pb: 1 },
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
      }}>
        <div style={{
          background: '#f0edfd',
          color: '#39306b',
          padding: '20px',
          fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', Arial, Helvetica, sans-serif",
          height: '100%',
          fontSize: '14px',
          lineHeight: '1.5',
          overflow: 'auto',
          borderRadius: '4px'
        }}>
          <div style={{ 
            borderBottom: '2px solid #39306b', 
            paddingBottom: '10px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div>
              <h2 style={{ margin: 0 }}>{config.title}</h2>
              <div style={{ fontSize: '12px', opacity: 0.7 }}>
                Loading ~ Neo4j - neo4j+s://eff16e19.databases.neo4j.io
              </div>
            </div>
            {controls && <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>{controls}</div>}
          </div>
          
          {tableBody}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsoleView;
