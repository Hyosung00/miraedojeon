import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@mui/material';

// 각 타입별 설정
const CONFIG = {
  treatAnalysis: {
    title: '위험 노출도 및 공격 가능도 측정',
    ariaLabel: '위험 노출도 및 공격 가능도 측정',
    file: 'network_traffic.nodes.json',
    animationSpeed: 50
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
  }
};

const ConsoleView = ({ type = 'treatAnalysis', open = true, isPopup = false }) => {
  const [jsonTable, setJsonTable] = useState(null);
  const [displayedRows, setDisplayedRows] = useState(0);
  const tableAnimationRef = React.useRef(null);
  
  const config = CONFIG[type] || CONFIG.treatAnalysis;

  useEffect(() => {
    if (open) {
      setJsonTable(null);
      setDisplayedRows(0);
      loadFileContent();
    } else {
      if (tableAnimationRef.current) {
        clearInterval(tableAnimationRef.current);
        tableAnimationRef.current = null;
      }
      setJsonTable(null);
      setDisplayedRows(0);
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
    try {
      const response = await fetch(`http://localhost:5000/api/read-info-file?file=${config.file}`);
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json) && json.length > 0 && typeof json[0] === 'object') {
          setJsonTable(json);
          animateTable(json.length);
        }
      } catch (e) {
        // JSON 파싱 실패 시 무시
      }
    } catch (error) {
      console.error('파일 로드 실패:', error);
    }
  };

  const animateTable = (totalRows) => {
    if (tableAnimationRef.current) {
      clearInterval(tableAnimationRef.current);
    }
    
    let currentRow = 0;
    setDisplayedRows(0);
    
    tableAnimationRef.current = setInterval(() => {
      if (currentRow < totalRows) {
        currentRow++;
        setDisplayedRows(currentRow);
      } else {
        clearInterval(tableAnimationRef.current);
        tableAnimationRef.current = null;
      }
    }, config.animationSpeed);
  };

  return (
    <Card 
      component="main"
      role="main"
      aria-label={config.ariaLabel}
      sx={{
        width: '100%',
        height: isPopup ? '100%' : 'calc(100vh - 120px)',
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
            marginBottom: '20px' 
          }}>
            <h2 style={{ margin: 0 }}>{config.title}</h2>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              Loading ~ Neo4j - neo4j+s://eff16e19.databases.neo4j.io
            </div>
          </div>
          
          {jsonTable && (
            <div style={{ marginTop: '24px', overflowX: 'auto' }}>
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
                    {Object.keys(jsonTable[0]).map((key) => (
                      <th key={key} style={{ 
                        border: '1px solid #ddd', 
                        padding: '8px 12px', 
                        background: '#6858a3',
                        color: '#fff',
                        fontWeight: 'bold',
                        textAlign: 'left'
                      }}>
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jsonTable.slice(0, displayedRows).map((row, i) => (
                    <tr key={i} style={{ 
                      background: i % 2 === 0 ? '#fff' : '#f9f9f9'
                    }}>
                      {Object.keys(jsonTable[0]).map((key) => (
                        <td key={key} style={{ 
                          border: '1px solid #ddd', 
                          padding: '8px 12px'
                        }}>
                          {typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConsoleView;
