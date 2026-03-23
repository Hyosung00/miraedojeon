import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as Cesium from 'cesium';
import { Box, Typography, Card, CardContent, Grid, IconButton, Slider, Dialog, DialogContent, DialogTitle } from '@mui/material';
import { FundOutlined, DatabaseOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import FusionDBConsole from '../FusionDB/FusionDB';
import { usePopup } from '../../../context/PopupContext';
import interactionTracker from '../../../utils/interactionTracker';

// ==================== 상수 정의 ====================
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  ENDPOINTS: {
    NORTH_KOREA_ATTACKS: '/api/north-korea-attacks'
  },
  DEFAULT_LIMIT: 12  // 월별 12개로 제한 (12개월 총 144개)
};

const MONTH_MARKS_2025 = [
  { value: 0, label: '25년 1월', labelShort: '1월' },
  { value: 1, label: '25년 2월', labelShort: '2월' },
  { value: 2, label: '25년 3월', labelShort: '3월' },
  { value: 3, label: '25년 4월', labelShort: '4월' },
  { value: 4, label: '25년 5월', labelShort: '5월' },
  { value: 5, label: '25년 6월', labelShort: '6월' },
  { value: 6, label: '25년 7월', labelShort: '7월' },
  { value: 7, label: '25년 8월', labelShort: '8월' },
  { value: 8, label: '25년 9월', labelShort: '9월' },
  { value: 9, label: '25년 10월', labelShort: '10월' },
  { value: 10, label: '25년 11월', labelShort: '11월' },
  { value: 11, label: '25년 12월', labelShort: '12월' }
];

const COLORS = {
  SOURCE: {
    NORMAL: Cesium.Color.YELLOW,
    OUTLINE: Cesium.Color.RED,
    HIGHLIGHT: Cesium.Color.ORANGE
  },
  TARGET: {
    NORMAL: Cesium.Color.CYAN,
    OUTLINE: Cesium.Color.BLUE,
    HIGHLIGHT: Cesium.Color.LIME
  },
  HIGHLIGHT_OUTLINE: Cesium.Color.WHITE
};

const MARKER_SIZES = {
  NORMAL: 6,
  HIGHLIGHT: 10,
  OUTLINE_WIDTH_NORMAL: 2,
  OUTLINE_WIDTH_HIGHLIGHT: 4
};

const ANIMATION_TIMINGS = {
  SCROLL_DURATION: 1300,
  PULSE_DURATION: 1200
};

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { box-shadow: 0 0 10px rgba(124,58,237,0.4); }
    50% { box-shadow: 0 0 20px rgba(124,58,237,0.6); }
    100% { box-shadow: 0 0 10px rgba(124,58,237,0.4); }
  }
`;
document.head.appendChild(style);

// Cesium Ion Access Token 설정
// 원본 토큰
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODNiZmZiNC04YTUxLTQ1YzgtOWU1Mi1kNDUyY2I2ZDRkNTQiLCJpZCI6MzQyNDEzLCJpYXQiOjE3NTgxNzMyNDh9.zZRyMPovg5ALhNtG2_E-0ED0qHqd_uQQnAG84eQUyG4';

// 수정 된 토큰
// Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYmM5NTM1NC05YjlkLTQ3NmItOTRhYi0zOWFlNmRkOTU4OWEiLCJpZCI6MzUzNTE4LCJpYXQiOjE3NjEyNjk2OTh9.0pxPJQdwLFl9wTzqp60Zr1rbgPJLdhT00OaBhS84ORs';

// 국가명 한국어 변환
const COUNTRY_KO = {
  'United States': '미국', 'USA': '미국', 'US': '미국',
  'China': '중국', 'CN': '중국',
  'Russia': '러시아', 'RU': '러시아',
  'North Korea': '북한', 'DPRK': '북한',
  'South Korea': '대한민국', 'Korea': '대한민국', 'KR': '대한민국',
  'Japan': '일본', 'JP': '일본',
  'Germany': '독일', 'DE': '독일',
  'United Kingdom': '영국', 'UK': '영국', 'GB': '영국',
  'France': '프랑스', 'FR': '프랑스',
  'Iran': '이란', 'IR': '이란',
  'India': '인도', 'IN': '인도',
  'Taiwan': '대만', 'TW': '대만',
  'Australia': '호주', 'AU': '호주',
  'Canada': '캐나다', 'CA': '캐나다',
  'Brazil': '브라질', 'BR': '브라질',
  'Netherlands': '네덜란드', 'NL': '네덜란드',
  'Singapore': '싱가포르', 'SG': '싱가포르',
  'Hong Kong': '홍콩', 'HK': '홍콩',
  'Ukraine': '우크라이나', 'UA': '우크라이나',
  'Vietnam': '베트남', 'VN': '베트남',
  'Thailand': '태국', 'TH': '태국',
  'Indonesia': '인도네시아', 'ID': '인도네시아',
  'Malaysia': '말레이시아', 'MY': '말레이시아',
  'Pakistan': '파키스탄', 'PK': '파키스탄',
  'Turkey': '터키', 'TR': '터키',
  'Israel': '이스라엘', 'IL': '이스라엘',
  'Saudi Arabia': '사우디아라비아', 'SA': '사우디아라비아',
  'Burundi': '부룬디', 'BI': '부룬디',
  'Mexico': '멕시코', 'MX': '멕시코',
  'Italy': '이탈리아', 'IT': '이탈리아',
  'Spain': '스페인', 'ES': '스페인',
  'Poland': '폴란드', 'PL': '폴란드',
  'Sweden': '스웨덴', 'SE': '스웨덴',
  'Switzerland': '스위스', 'CH': '스위스',
  'Norway': '노르웨이', 'NO': '노르웨이',
  'Finland': '핀란드', 'FI': '핀란드',
  'Denmark': '덴마크', 'DK': '덴마크',
  'Belgium': '벨기에', 'BE': '벨기에',
  'Czech Republic': '체코', 'CZ': '체코',
  'Romania': '루마니아', 'RO': '루마니아',
  'Hungary': '헝가리', 'HU': '헝가리',
  'Philippines': '필리핀', 'PH': '필리핀',
  'Myanmar': '미얀마', 'MM': '미얀마',
  'Bangladesh': '방글라데시', 'BD': '방글라데시',
  'Egypt': '이집트', 'EG': '이집트',
  'South Africa': '남아프리카', 'ZA': '남아프리카',
  'Nigeria': '나이지리아', 'NG': '나이지리아',
  'Kenya': '케냐', 'KE': '케냐',
  'Ethiopia': '에티오피아', 'ET': '에티오피아',
  'Argentina': '아르헨티나', 'AR': '아르헨티나',
  'Colombia': '콜롬비아', 'CO': '콜롬비아',
  'Chile': '칠레', 'CL': '칠레',
  'New Zealand': '뉴질랜드', 'NZ': '뉴질랜드',
};
const toKo = (name) => COUNTRY_KO[name] || name;

// AS 정보 생성 함수
const generateAS = (country) => {
  const asNumbers = {
    '중국': ['AS4134 CHINANET', 'AS4837 CHINA169', 'AS9808 CMNET', 'AS24400 ALIBABA'],
    'China': ['AS4134 CHINANET', 'AS4837 CHINA169', 'AS9808 CMNET', 'AS24400 ALIBABA'],
    '러시아': ['AS8359 MTS', 'AS12389 ROSTELECOM', 'AS31133 MF-MGSM', 'AS42610 NCNET'],
    'Russia': ['AS8359 MTS', 'AS12389 ROSTELECOM', 'AS31133 MF-MGSM', 'AS42610 NCNET'],
    '북한': ['AS131279 STAR-KP', 'AS9769 DPRK-AS', 'AS17762 KPTC-AS'],
    'North Korea': ['AS131279 STAR-KP', 'AS9769 DPRK-AS', 'AS17762 KPTC-AS'],
    '이란': ['AS44244 IRANCELL', 'AS6736 BARIN', 'AS197207 MCCI', 'AS58224 TCI'],
    'Iran': ['AS44244 IRANCELL', 'AS6736 BARIN', 'AS197207 MCCI', 'AS58224 TCI'],
    '미국': ['AS15169 GOOGLE', 'AS8075 MICROSOFT', 'AS16509 AMAZON', 'AS32934 FACEBOOK'],
    'United States': ['AS15169 GOOGLE', 'AS8075 MICROSOFT', 'AS16509 AMAZON', 'AS32934 FACEBOOK'],
    '일본': ['AS2516 KDDI', 'AS4713 NTT', 'AS2497 IIJ', 'AS7506 GMO'],
    'Japan': ['AS2516 KDDI', 'AS4713 NTT', 'AS2497 IIJ', 'AS7506 GMO'],
    '독일': ['AS3320 DEUTSCHE', 'AS8881 1&1', 'AS20940 AKAMAI', 'AS24940 HETZNER'],
    'Germany': ['AS3320 DEUTSCHE', 'AS8881 1&1', 'AS20940 AKAMAI', 'AS24940 HETZNER'],
    '영국': ['AS2856 BT', 'AS5089 VIRGIN', 'AS12576 EE', 'AS13037 ZEN'],
    'United Kingdom': ['AS2856 BT', 'AS5089 VIRGIN', 'AS12576 EE', 'AS13037 ZEN'],
    '대한민국': ['AS9318 SKB', 'AS4766 KT', 'AS9644 LGU', 'AS17858 LG-DACOM'],
    'South Korea': ['AS9318 SKB', 'AS4766 KT', 'AS9644 LGU', 'AS17858 LG-DACOM'],
    'Burundi': ['AS37578 AS-KONNECT', 'AS37054 USAN', 'AS36945 ONATEL'],
    'default': ['AS0 UNKNOWN']
  };

  const asList = asNumbers[country.name] || asNumbers['default'];
  return asList[Math.floor(Math.random() * asList.length)];
};

// ==================== 유틸리티 함수 ====================

// Attack ID로 공격 찾기 (타입 안정성 개선)
const findAttackById = (attacks, attackId) => {
  if (!attacks || !attackId) return null;
  return attacks.find(attack =>
    attack.id === attackId ||
    attack.id === attackId.toString() ||
    attack.id === parseInt(attackId)
  );
};

// 엔티티 색상 복원 (중복 코드 통합)
const resetEntityColors = (entity, entityId) => {
  if (!entity || !entity.point) return;

  const isSource = entityId.includes('source');
  entity.point.color = isSource ? COLORS.SOURCE.NORMAL : COLORS.TARGET.NORMAL;
  entity.point.outlineColor = isSource ? COLORS.SOURCE.OUTLINE : COLORS.TARGET.OUTLINE;
  entity.point.outlineWidth = MARKER_SIZES.OUTLINE_WIDTH_NORMAL;
  entity.point.pixelSize = MARKER_SIZES.NORMAL;
};

// 엔티티 하이라이트 (중복 코드 통합)
const highlightEntity = (entity, isSource) => {
  if (!entity || !entity.point) return;

  entity.point.color = isSource ? COLORS.SOURCE.HIGHLIGHT : COLORS.TARGET.HIGHLIGHT;
  entity.point.outlineColor = COLORS.HIGHLIGHT_OUTLINE;
  entity.point.outlineWidth = MARKER_SIZES.OUTLINE_WIDTH_HIGHLIGHT;
  entity.point.pixelSize = MARKER_SIZES.HIGHLIGHT;
  entity.point.disableDepthTestDistance = Number.POSITIVE_INFINITY;
};

// 로그로 스크롤 (중복 코드 통합)
const scrollToLog = (attackId) => {
  const el = document.getElementById(`log-${attackId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.animation = `pulse ${ANIMATION_TIMINGS.PULSE_DURATION / 1000}s ease-out 1`;
    setTimeout(() => { el.style.animation = ''; }, ANIMATION_TIMINGS.SCROLL_DURATION);
  }
};

// API에서 실제 MongoDB 데이터를 가져와서 포맷팅하는 함수
const fetchAndFormatAttackData = async (startDate = null, endDate = null) => {
  return await interactionTracker.measureResponse(
    'GeoIP',
    'Fetch Attack Data',
    async () => {
      try {
    let url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.NORTH_KOREA_ATTACKS}?limit=${API_CONFIG.DEFAULT_LIMIT}`;

    if (startDate) {
      url += `&startDate=${startDate.toISOString()}`;
    }
    if (endDate) {
      url += `&endDate=${endDate.toISOString()}`;
    }

    console.log('🌐 API 요청:', url);
    const response = await fetch(url);
    console.log('📡 API 응답 상태:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📦 API 응답 데이터:', {
      success: data.success,
      count: data.count,
      attacks: data.attacks?.length || 0
    });

    if (!data.success) {
      console.error('API 호출 실패:', data.error);
      return [];
    }

    console.log(`✅ ${data.count}개의 공격 데이터를 가져왔습니다.`);
    console.log('📊 [2D] 전체 작전 데이터:', data.attacks);

    // API 데이터를 기존 형식에 맞게 변환
    const attacks = data.attacks.map((attack) => {
      return {
        id: attack.id,
        source: {
          name: attack.source.name,
          building: {
            name: attack.source.city || attack.source.name,
            lat: attack.source.lat,
            lon: attack.source.lon
          },
          ip: attack.source.ip,
          port: attack.source.port,
          subnet: attack.source.subnet,
          gateway: attack.source.gateway,
          dns: attack.source.dns,
          as: generateAS({ name: attack.source.name })
        },
        target: {
          name: attack.target.name,
          building: {
            name: attack.target.city || 'North Korea',
            lat: attack.target.lat,
            lon: attack.target.lon
          },
          ip: attack.target.ip,
          port: attack.target.port,
          subnet: attack.target.subnet,
          gateway: attack.target.gateway,
          dns: attack.target.dns,
          as: generateAS({ name: 'North Korea' })
        },
        type: attack.protocol,
        severity: Math.min(5, Math.ceil(attack.count / 5)),
        timestamp: new Date(attack.timestamp),
        status: attack.status,
        count: attack.count
      };
    });

    // 변환된 작전 데이터를 모두 로그로 출력
    console.log('🔍 [2D] 변환된 작전 데이터 (전체):', attacks);
    attacks.forEach((attack, index) => {
      console.log(`\n[2D 작전 ${index + 1}/${attacks.length}]`, {
        id: attack.id,
        type: attack.type,
        출발지: {
          국가: attack.source.name,
          도시: attack.source.building.name,
          IP: attack.source.ip,
          Port: attack.source.port,
          좌표: `${attack.source.building.lat}, ${attack.source.building.lon}`,
          Subnet: attack.source.subnet,
          Gateway: attack.source.gateway,
          DNS: attack.source.dns,
          AS: attack.source.as
        },
        목표지: {
          국가: attack.target.name,
          도시: attack.target.building.name,
          IP: attack.target.ip,
          Port: attack.target.port,
          좌표: `${attack.target.building.lat}, ${attack.target.building.lon}`,
          Subnet: attack.target.subnet,
          Gateway: attack.target.gateway,
          DNS: attack.target.dns,
          AS: attack.target.as
        },
        심각도: attack.severity,
        카운트: attack.count,
        상태: attack.status,
        시간: attack.timestamp
      });
    });

    console.log(`✅ ${attacks.length}개 작전 변환 완료`);
    return attacks;
      } catch (error) {
        console.error('❌ API 호출 중 오류:', error);
        console.error('❌ 에러 상세:', error.message, error.stack);
        return [];
      }
    },
    { startDate, endDate }
  ).then(result => result.result);
};


const TwoDPage = () => {
  const navigate = useNavigate();
  const cesiumContainer = useRef(null);
  const viewer = useRef(null);

  const logListRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [attacks, setAttacks] = useState([]);

  // 통합 PopupContext 사용
  const { popups, openPopup, closePopup } = usePopup();
  const fusionDBOpen = popups.fusionDB;

  // 메뉴에서 팝업 오픈 요청 시 자동으로 열리도록
  useEffect(() => {
    if (popups.fusionDB) {
      // 팝업이 이미 열려있으면 아무것도 하지 않음
    }
  }, [popups.fusionDB]);

  // 날짜 및 시간 필터링 상태
  const [allAttacks, setAllAttacks] = useState([]); // 전체 데이터 저장 (12개월, 월당 12개 = 총 144개)
  const [timeRange, setTimeRange] = useState([0, 11]); // 시간 범위 (월 단위, 25/01~25/12)

  // attackStats를 useMemo로 최적화 (attacks가 변경될 때만 재계산)
  // 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    interactionTracker.log('GeoIP', 'Component Mounted', {});
    return () => {
      interactionTracker.log('GeoIP', 'Component Unmounted', {});
    };
  }, []);

  const attackStats = useMemo(() => {
    if (!attacks || attacks.length === 0) {
      return { total: 0, active: 0, blocked: 0, countries: 0 };
    }

    return {
      total: attacks.length,
      active: attacks.length,
      blocked: 0,
      countries: new Set([
        ...attacks.map(a => a.source.name),
        ...attacks.map(a => a.target.name)
      ]).size
    };
  }, [attacks]);

  const mapStats = useMemo(() => {
    if (!attacks || attacks.length === 0) return null;

    const routeViewsCount = attacks.filter(a => (a.displayMonthIndex ?? 0) % 2 === 0).length;
    const ripeCount = attacks.length - routeViewsCount;

    const protocolMap = {};
    attacks.forEach(a => { const p = a.type || 'UNKNOWN'; protocolMap[p] = (protocolMap[p] || 0) + 1; });
    const protocols = Object.entries(protocolMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

    const countryMap = {};
    attacks.forEach(a => { const c = toKo(a.source.name); countryMap[c] = (countryMap[c] || 0) + 1; });
    const countries = Object.entries(countryMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

    return { routeViewsCount, ripeCount, protocols, countries, total: attacks.length };
  }, [attacks]);

  // 현재 월 범위에 따른 필터링된 작전 데이터
  const filteredAttacks = useMemo(() => {
    console.log('🔄 filteredAttacks useMemo 실행');
    console.log('  - allAttacks 길이:', allAttacks ? allAttacks.length : 'null');
    console.log('  - timeRange:', timeRange);

    if (!allAttacks || allAttacks.length === 0) {
      console.log('⚠️ allAttacks가 비어있음');
      return [];
    }

    const [startMonth, endMonth] = timeRange;

    console.log('🔍 필터링 정보:', {
      '전체 작전 수': allAttacks.length,
      '범위 시작 (월)': startMonth,
      '범위 종료 (월)': endMonth,
      '첫 번째 작전 시간': allAttacks[0] ? new Date(allAttacks[0].timestamp).toISOString() : 'N/A',
      '마지막 작전 시간': allAttacks[allAttacks.length - 1] ? new Date(allAttacks[allAttacks.length - 1].timestamp).toISOString() : 'N/A'
    });

    // 범위 내의 월 데이터만 표시 (포함 범위)
    const filtered = allAttacks.filter(attack => {
      const monthIndex = typeof attack.displayMonthIndex === 'number' ? attack.displayMonthIndex : 0;
      const isInRange = monthIndex >= startMonth && monthIndex <= endMonth;

      // 처음 3개만 샘플로 로그 출력
      if (allAttacks.indexOf(attack) < 3) {
        console.log(`  작전 ${attack.id}:`, {
          시간: new Date(attack.timestamp).toISOString(),
          표시월: MONTH_MARKS_2025[monthIndex]?.label,
          '범위 내': isInRange
        });
      }

      return isInRange;
    });

    console.log(`✅ 필터링 결과: ${filtered.length}개 작전 (${timeRange[1] - timeRange[0] + 1}개월치)`);
    return filtered;
  }, [allAttacks, timeRange]);

  // attacks를 filteredAttacks로 동기화
  useEffect(() => {
    console.log('🔄 attacks 상태 업데이트:', filteredAttacks.length, '개');
    setAttacks(filteredAttacks);
  }, [filteredAttacks]);

  // 공격 데이터 초기화 및 업데이트 (API 호출)
  useEffect(() => {
    const initializeAttacks = async () => {
      console.log('📅 12개월 표시 데이터 생성 (월당 12개, 실제 수집일 25/9/2~25/9/8 재사용):', {
        실제수집시작: '2025-09-02T00:00:00.000Z',
        실제수집종료: '2025-09-08T23:59:59.999Z'
      });

      // 12개월 표시를 위해 월별 12개 데이터 생성
      // 실제 데이터는 9/2~9/8(7일)을 순환 재사용
      const promises = [];
      for (let month = 0; month < 12; month++) {
        const sourceDayIndex = month % 7;
        const dayStart = new Date(Date.UTC(2025, 8, 2 + sourceDayIndex, 0, 0, 0, 0));
        const dayEnd = new Date(Date.UTC(2025, 8, 2 + sourceDayIndex, 23, 59, 59, 999));

        console.log(`📆 ${MONTH_MARKS_2025[month].label} 표시용 데이터 요청 (실제 ${dayStart.toISOString().slice(0, 10)}):`, {
          dayStart: dayStart.toISOString(),
          dayEnd: dayEnd.toISOString()
        });

        promises.push(
          fetchAndFormatAttackData(dayStart, dayEnd)
            .then(monthData => {
              console.log(`  ✅ ${MONTH_MARKS_2025[month].label} 응답: ${monthData.length}개 작전`);

              const uniqueData = monthData.slice(0, 12).map((attack, index) => ({
                ...attack,
                id: `month${month + 1}-${index}-${attack.id}`,
                displayMonthIndex: month,
                timestamp: new Date(Date.UTC(
                  2025,
                  month,
                  Math.min(index + 1, 28),
                  new Date(attack.timestamp).getUTCHours(),
                  new Date(attack.timestamp).getUTCMinutes(),
                  new Date(attack.timestamp).getUTCSeconds()
                ))
              }));

              return uniqueData;
            })
            .catch(error => {
              console.error(`  ❌ ${MONTH_MARKS_2025[month].label} 에러:`, error);
              return [];
            })
        );
      }

      // 모든 요청이 완료될 때까지 대기
      const allDayData = await Promise.all(promises);
      const allData = allDayData.flat(); // 2차원 배열을 1차원으로 평탄화

      console.log('📊 월별 데이터 개수:', allDayData.map((data, i) => `${MONTH_MARKS_2025[i].label}: ${data.length}개`).join(', '));

      console.log(`✅ 총 ${allData.length}개의 작전 데이터를 가져왔습니다.`);

      if (allData.length > 0) {
        console.log('📊 전체 데이터 시간 범위:', {
          첫번째: new Date(allData[0].timestamp).toISOString(),
          마지막: new Date(allData[allData.length - 1].timestamp).toISOString()
        });
        console.log('📊 첫 3개 작전 샘플:', allData.slice(0, 3).map(a => ({
          id: a.id,
          timestamp: new Date(a.timestamp).toISOString(),
          source: a.source.name,
          target: a.target.name
        })));
      } else {
        console.error('❌ 데이터가 하나도 없습니다!');
      }

      setAllAttacks(allData);
      console.log('💾 allAttacks 상태에 저장 완료:', allData.length, '개');

      // 초기에는 전체 12개월 표시
      setTimeRange([0, 11]);
      console.log('📅 초기 timeRange 설정: [0, 11]');
    };

    initializeAttacks();
  }, []);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    const initializeCesium = async () => {
      try {
        console.log('Cesium 2D 모드 초기화 시작...');
        console.log('Access Token:', Cesium.Ion.defaultAccessToken ? '설정됨' : '없음');

        // Cesium Viewer 생성 - 2D 모드만 지원
        viewer.current = new Cesium.Viewer(cesiumContainer.current, {
          // UI 요소들 정리
          animation: false,
          baseLayerPicker: true,
          fullscreenButton: false,
          geocoder: true,
          homeButton: true,
          infoBox: true,
          sceneModePicker: false,
          scene3DOnly: false, // 2D 모드 지원
          selectionIndicator: true,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,

          // 고품질 지형 데이터 사용
          terrainProvider: await Cesium.createWorldTerrainAsync({
            requestWaterMask: true,
            requestVertexNormals: true
          }),

          // 연속 렌더링 강제 활성화
          requestRenderMode: false,
          maximumRenderTimeChange: Infinity
        });

        console.log('Cesium Viewer 생성 완료');

        // 즉시 2D 모드로 전환
        viewer.current.scene.morphTo2D(0);
        console.log('2D 모드로 강제 전환');

        // 고해상도 이미지 레이어 추가
        try {
          const bingProvider = await Cesium.createWorldImageryAsync({
            style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
          });
          viewer.current.imageryLayers.addImageryProvider(bingProvider);
          console.log('고해상도 이미지 레이어 추가 완료');
        } catch (error) {
          console.log('고해상도 이미지 레이어 추가 실패:', error);
        }

        // 지구본 고급 설정
        const scene = viewer.current.scene;
        const globe = scene.globe;

        // 실제적인 조명 및 대기 효과
        scene.skyAtmosphere.show = true;
        scene.fog.enabled = true;
        scene.fog.density = 0.0001;
        scene.fog.screenSpaceErrorFactor = 2.0;

        // 고품질 지구본 렌더링
        globe.enableLighting = true;
        globe.dynamicAtmosphereLighting = true;
        globe.atmosphereLightIntensity = 10.0;
        globe.showWaterEffect = true;

        // 지형 상세도 최대화
        globe.maximumScreenSpaceError = 1.0;
        globe.tileCacheSize = 1000;

        // 2D 모드 카메라 컨트롤 설정
        scene.screenSpaceCameraController.enableRotate = false;
        scene.screenSpaceCameraController.enableTranslate = true;
        scene.screenSpaceCameraController.enableZoom = true;
        scene.screenSpaceCameraController.enableTilt = false;
        scene.screenSpaceCameraController.enableLook = false;
        scene.screenSpaceCameraController.enableInputs = true;

        // 2D 모드 확대 범위 최적화 - 전체 지도를 볼 수 있도록
        scene.screenSpaceCameraController.minimumZoomDistance = 100;
        scene.screenSpaceCameraController.maximumZoomDistance = 40000000;  // 40,000km - 전체 지구 보기

        // 2D 모드에서 안전한 패닝 설정
        scene.screenSpaceCameraController.translateEventTypes = [
          Cesium.CameraEventType.LEFT_DRAG,
          Cesium.CameraEventType.RIGHT_DRAG
        ];

        // 2D 모드에서 줌 속도 조정
        scene.screenSpaceCameraController.zoomEventTypes = [
          Cesium.CameraEventType.WHEEL,
          Cesium.CameraEventType.PINCH
        ];

        // 자연스러운 줌 속도 최적화
        scene.screenSpaceCameraController.zoomFactor = 5.0;
        scene.screenSpaceCameraController.wheelZoomFactor = 10.0;  // 정상적인 줌 속도

        // 관성 설정 최적화 (부드러운 움직임)
        scene.screenSpaceCameraController.inertiaSpin = 0.95;
        scene.screenSpaceCameraController.inertiaTranslate = 0.95;
        scene.screenSpaceCameraController.inertiaZoom = 0.9;

        // 카메라 이동 후 지도 중앙 위치로 복귀하는 리스너 추가
        scene.camera.moveEnd.addEventListener(() => {
          const cameraHeight = scene.camera.positionCartographic.height;

          // 최대 축소 상태일 때만 (38,000km 이상) 지도를 화면 중앙에 정렬
          if (cameraHeight >= 38000000) {
            const currentCenter = scene.camera.positionCartographic;
            const mapCenterLon = 125.7625;  // 경도 126도 (북한 가로 위치) - 좌우 밸런스
            const mapCenterLat = 0.0;       // 위도 0도 (적도) - 상하 밸런스

            // 현재 위치가 지도 중심에서 많이 벗어났을 경우만 부드럽게 중앙으로 이동
            const lonDiff = Math.abs(Cesium.Math.toDegrees(currentCenter.longitude) - mapCenterLon);
            const latDiff = Math.abs(Cesium.Math.toDegrees(currentCenter.latitude) - mapCenterLat);

            // 30도 이상 벗어났을 때만 복귀
            if (lonDiff > 30 || latDiff > 30) {
              scene.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(mapCenterLon, mapCenterLat, cameraHeight),
                orientation: {
                  heading: 0.0,
                  pitch: -Cesium.Math.PI_OVER_TWO,
                  roll: 0.0
                },
                duration: 1.0
              });
            }
          }
        });

        // 마우스 상호작용 및 정보 표시 활성화
        viewer.current.cesiumWidget.creditContainer.style.display = "none";

        // 지형 클릭 시 좌표 정보 표시
        viewer.current.screenSpaceEventHandler.setInputAction((event) => {
          const cartesian = viewer.current.camera.pickEllipsoid(event.position, scene.globe.ellipsoid);
          if (cartesian) {
            const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            const longitude = Cesium.Math.toDegrees(cartographic.longitude);
            const latitude = Cesium.Math.toDegrees(cartographic.latitude);
            const height = cartographic.height;

            console.log(`위치: 위도 ${latitude.toFixed(6)}, 경도 ${longitude.toFixed(6)}, 고도 ${height.toFixed(2)}m`);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // 초기 카메라 위치 - 북한 중심으로 설정 (2D 모드)
        // 2D 모드에서는 정확한 중앙 정렬이 필요
        const northKoreaView = {
          destination: Cesium.Cartesian3.fromDegrees(125.7625, 39.0392, 5000000),
          orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,  // 정확히 위에서 아래를 바라봄
            roll: 0.0
          }
        };

        // 2D 모드 전환 완료 후 카메라 설정
        setTimeout(() => {
          viewer.current.camera.setView(northKoreaView);
        }, 500);

        // 홈 버튼이 활성화되어 있을 때만 이벤트 등록
        if (viewer.current.homeButton) {
          viewer.current.homeButton.viewModel.command.beforeExecute.addEventListener((e) => {
            e.cancel = true;
            viewer.current.camera.setView(northKoreaView);
          });
        }

        // 고품질 렌더링 설정
        if (Cesium.FeatureDetection.supportsImageRenderingPixelated()) {
          viewer.current.resolutionScale = window.devicePixelRatio;
        }

        // 장면 설정
        scene.postProcessStages.fxaa.enabled = true;

        // 애니메이션 시계 설정
        viewer.current.clock.shouldAnimate = true;
        viewer.current.clock.multiplier = 1.0;
        viewer.current.clock.currentTime = Cesium.JulianDate.now();

        // 강제 연속 렌더링
        scene.requestRenderMode = false;
        scene.maximumRenderTimeChange = Infinity;

        // requestAnimationFrame ID 저장 (메모리 누수 방지)
        let animationFrameId = null;
        const forceRender = () => {
          if (viewer.current && !viewer.current.isDestroyed()) {
            scene.requestRender();
            animationFrameId = requestAnimationFrame(forceRender);
          }
        };
        forceRender();

        // 시계를 항상 실행 상태로 유지 (메모리 누수 방지 - interval ID 저장)
        const clockIntervalId = setInterval(() => {
          if (viewer.current && !viewer.current.isDestroyed()) {
            viewer.current.clock.tick();
          }
        }, 16);

        // cleanup 함수들을 외부에서 접근할 수 있도록 저장
        viewer.current._cleanupIds = {
          animationFrameId,
          clockIntervalId
        };

        setIsLoaded(true);

      } catch (error) {
        console.error('Cesium 초기화 오류:', error);
        setError(`Cesium 초기화 실패: ${error.message}`);
      }
    };

    initializeCesium();

    // 컴포넌트 언마운트 시 정리 (메모리 누수 방지)
    return () => {
      if (viewer.current) {
        // interval과 animationFrame 정리
        if (viewer.current._cleanupIds) {
          if (viewer.current._cleanupIds.animationFrameId) {
            cancelAnimationFrame(viewer.current._cleanupIds.animationFrameId);
          }
          if (viewer.current._cleanupIds.clockIntervalId) {
            clearInterval(viewer.current._cleanupIds.clockIntervalId);
          }
        }

        viewer.current.destroy();
        viewer.current = null;
      }
    };
  }, []);

  // 애니메이션 상태 관리
  const [animationEntities, setAnimationEntities] = useState([]);
  const [selectedAttackId, setSelectedAttackId] = useState(null);
  const [selectedBuildingAttacks, setSelectedBuildingAttacks] = useState([]);
  const [highlightedBuildings, setHighlightedBuildings] = useState([]);
  const [markerHighlights, setMarkerHighlights] = useState([]);

  // 모든 하이라이트를 강제로 제거하는 함수
  const clearAllHighlights = useCallback(() => {
    if (!viewer.current) return;

    // 모든 엔티티를 순회하며 하이라이트 제거
    const entities = viewer.current.entities.values;
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity && entity.id) {
        const entityId = entity.id;
        // source 또는 target 마커인 경우에만 색상 복원
        if (entityId.startsWith('source-2d-') || entityId.startsWith('target-2d-')) {
          resetEntityColors(entity, entityId);
        }
      }
    }

    // 모든 광선을 다시 순회하며 강제로 빨간색 복원
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      if (entity && entity.id && entity.id.startsWith('beam-2d-')) {
        if (entity.polyline && entity.polyline.material) {
          entity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.05,
            color: Cesium.Color.RED.withAlpha(0.08)
          });
        }
      }
    }

    // 상태 초기화
    setHighlightedBuildings([]);
    setMarkerHighlights([]);
  }, []);

  // 지도에서 건물 하이라이트 함수 (최적화 버전)
  const highlightBuildingOnMap = useCallback((attackId) => {
    if (!viewer.current || !attacks) return;

    const attack = findAttackById(attacks, attackId);
    if (!attack) return;

    // 기존 하이라이트 제거
    highlightedBuildings.forEach(entityId => {
      const entity = viewer.current.entities.getById(entityId);
      if (entity) resetEntityColors(entity, entityId);
    });
    // 모든 경로 투명화
    viewer.current.entities.values.forEach(e => {
      if (e.id?.startsWith('beam-2d-') && e.polyline?.material) {
        e.polyline.material = new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.05, color: Cesium.Color.RED.withAlpha(0) });
      }
    });

    // 새로운 하이라이트 적용 (2D 모드용 ID)
    const targetPrefix = `target-2d-${attack.id}`;
    const sourcePrefix = `source-2d-${attack.id}`;
    const beamPrefix = `beam-2d-${attack.id}`;

    const targetEntity = viewer.current.entities.getById(targetPrefix);
    const sourceEntity = viewer.current.entities.getById(sourcePrefix);
    const beamEntity = viewer.current.entities.getById(beamPrefix);

    const newHighlighted = [];

    if (targetEntity) {
      highlightEntity(targetEntity, false);
      newHighlighted.push(targetPrefix);
    }

    if (sourceEntity) {
      highlightEntity(sourceEntity, true);
      newHighlighted.push(sourcePrefix);
    }

    // 선택된 경로를 빨간색으로 강조
    if (beamEntity && beamEntity.polyline && beamEntity.polyline.material) {
      beamEntity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.05,
        color: Cesium.Color.RED.withAlpha(0.9)
      });
    }

    setHighlightedBuildings(newHighlighted);
  }, [attacks, highlightedBuildings]);

  // 건물 클릭 시 관련된 모든 공격 하이라이트 (최적화 버전)
  const highlightBuildingAttacks = useCallback((clickedAttack, entityId) => {
    if (!viewer.current || !attacks) return;

    // 모든 하이라이트 강제 제거
    clearAllHighlights();
    // 모든 경로 투명화
    viewer.current.entities.values.forEach(e => {
      if (e.id?.startsWith('beam-2d-') && e.polyline?.material) {
        e.polyline.material = new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.05, color: Cesium.Color.RED.withAlpha(0) });
      }
    });

    // 클릭된 건물의 정확한 좌표 가져오기
    const isTargetClick = entityId.includes('target');
    const clickedLat = isTargetClick
      ? clickedAttack.target.building.lat
      : clickedAttack.source.building.lat;
    const clickedLon = isTargetClick
      ? clickedAttack.target.building.lon
      : clickedAttack.source.building.lon;

    // 같은 좌표를 가진 모든 공격 찾기 (같은 건물의 공격들만)
    const relatedAttacks = isTargetClick
      ? attacks.filter(attack =>
          attack.target.building.lat === clickedLat &&
          attack.target.building.lon === clickedLon
        )
      : attacks.filter(attack =>
          attack.source.building.lat === clickedLat &&
          attack.source.building.lon === clickedLon
        );

    if (relatedAttacks.length === 0) return;

    // 관련된 모든 마커 하이라이트
    const newMarkerHighlights = [];

    relatedAttacks.forEach(attack => {
      const sourceEntityId = `source-2d-${attack.id}`;
      const targetEntityId = `target-2d-${attack.id}`;
      const beamEntityId = `beam-2d-${attack.id}`;

      const sourceEntity = viewer.current.entities.getById(sourceEntityId);
      const targetEntity = viewer.current.entities.getById(targetEntityId);
      const beamEntity = viewer.current.entities.getById(beamEntityId);

      if (sourceEntity) {
        highlightEntity(sourceEntity, true);
        newMarkerHighlights.push(sourceEntityId);
      }

      if (targetEntity) {
        highlightEntity(targetEntity, false);
        newMarkerHighlights.push(targetEntityId);
      }

      // 선택된 경로를 빨간색으로 강조
      if (beamEntity && beamEntity.polyline && beamEntity.polyline.material) {
        beamEntity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.3,
          color: Cesium.Color.RED.withAlpha(0.9)
        });
      }
    });

    setMarkerHighlights(newMarkerHighlights);

    // 관련된 모든 로그 하이라이트
    const relatedAttackIds = relatedAttacks.map(attack => attack.id);
    setSelectedBuildingAttacks(relatedAttackIds);
    setSelectedAttackId(null);

    // 첫 번째 관련 로그로 스크롤
    if (relatedAttacks.length > 0) {
      scrollToLog(relatedAttacks[0].id);
    }
  }, [attacks, clearAllHighlights]);

  // IP 기반 마커 하이라이트 함수 (최적화 버전)
  const highlightMarkerAndLogs = useCallback((clickedAttack, entityId) => {
    if (!viewer.current || !attacks) return;

    // 모든 하이라이트 강제 제거
    clearAllHighlights();

    // 클릭된 마커가 source인지 target인지 확인
    const isSource = entityId.includes('source');
    const clickedIP = isSource ? clickedAttack.source.ip : clickedAttack.target.ip;

    // 해당 IP와 관련된 모든 공격 찾기
    const relatedAttacks = attacks.filter(attack =>
      attack.source.ip === clickedIP || attack.target.ip === clickedIP
    );

    if (relatedAttacks.length > 0) {
      // 모든 경로 투명화
      viewer.current.entities.values.forEach(e => {
        if (e.id?.startsWith('beam-2d-') && e.polyline?.material) {
          e.polyline.material = new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.05, color: Cesium.Color.RED.withAlpha(0) });
        }
      });

      // 모든 관련된 마커 하이라이트
      const newMarkerHighlights = [];

      relatedAttacks.forEach(attack => {
        const sourceEntityId = `source-2d-${attack.id}`;
        const targetEntityId = `target-2d-${attack.id}`;
        const beamEntityId = `beam-2d-${attack.id}`;

        const sourceEntity = viewer.current.entities.getById(sourceEntityId);
        const targetEntity = viewer.current.entities.getById(targetEntityId);
        const beamEntity = viewer.current.entities.getById(beamEntityId);

        // Source 마커 하이라이트
        if (sourceEntity && attack.source.ip === clickedIP) {
          highlightEntity(sourceEntity, true);
          newMarkerHighlights.push(sourceEntityId);
        }

        // Target 마커 하이라이트
        if (targetEntity && attack.target.ip === clickedIP) {
          highlightEntity(targetEntity, false);
          newMarkerHighlights.push(targetEntityId);
        }

        // 선택된 경로를 빨간색으로 강조
        if (beamEntity && beamEntity.polyline && beamEntity.polyline.material) {
          beamEntity.polyline.material = new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.3,
            color: Cesium.Color.RED.withAlpha(0.9)
          });
        }
      });

      setMarkerHighlights(newMarkerHighlights);

      // 관련된 로그들 하이라이트
      const relatedAttackIds = relatedAttacks.map(attack => attack.id);
      setSelectedBuildingAttacks(relatedAttackIds);
      setSelectedAttackId(null);

      // 첫 번째 관련 로그로 스크롤
      if (relatedAttacks.length > 0) {
        scrollToLog(relatedAttacks[0].id);
      }
    }
  }, [attacks, clearAllHighlights]);

  // 2D 모드용 엔티티 생성 함수
  const create2DEntities = (attacks) => {
    if (!viewer.current || !attacks || attacks.length === 0) {
      console.warn('⚠️ create2DEntities: viewer 또는 attacks가 없음', {
        viewer: !!viewer.current,
        attacksCount: attacks?.length || 0
      });
      return;
    }

    console.log(`🎨 create2DEntities 시작: ${attacks.length}개 작전 시각화`);
    let successCount = 0;
    let failCount = 0;

    try {
      attacks.forEach((attack, index) => {
        // 좌표 유효성 검증
        const sourceLon = parseFloat(attack.source.building.lon);
        const sourceLat = parseFloat(attack.source.building.lat);
        const targetLon = parseFloat(attack.target.building.lon);
        const targetLat = parseFloat(attack.target.building.lat);

        if (isNaN(sourceLon) || isNaN(sourceLat) || isNaN(targetLon) || isNaN(targetLat)) {
          console.warn('2D 모드: 잘못된 좌표 데이터', {
            id: attack.id,
            source: attack.source.name,
            target: attack.target.name
          });
          failCount++;
          return;
        }

        // 처음 5개는 상세 로그 출력
        if (index < 5) {
          console.log(`  작전 ${index + 1}:`, {
            id: attack.id,
            source: `${attack.source.name} (${sourceLat.toFixed(2)}, ${sourceLon.toFixed(2)})`,
            target: `${attack.target.name} (${targetLat.toFixed(2)}, ${targetLon.toFixed(2)})`,
            protocol: attack.type
          });
        }

        // 2D 모드에서는 높이를 0으로 설정
        const markerHeight = 0;
        const sourceMarkerPos = Cesium.Cartesian3.fromDegrees(sourceLon, sourceLat, markerHeight);
        const targetMarkerPos = Cesium.Cartesian3.fromDegrees(targetLon, targetLat, markerHeight);

        // 2D 소스 마커 (공격 출발지)
        viewer.current.entities.add({
          id: `source-2d-${attack.id}`,
          position: sourceMarkerPos,
          point: {
            pixelSize: MARKER_SIZES.NORMAL,
            color: COLORS.SOURCE.NORMAL,
            outlineColor: COLORS.SOURCE.OUTLINE,
            outlineWidth: MARKER_SIZES.OUTLINE_WIDTH_NORMAL,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: true
          },
          buildingData: {
            name: attack.source.building.name,
            country: attack.source.name,
            type: 'source'
          }
        });

        // 2D 타겟 마커 (공격 받는 곳)
        viewer.current.entities.add({
          id: `target-2d-${attack.id}`,
          position: targetMarkerPos,
          point: {
            pixelSize: MARKER_SIZES.NORMAL,
            color: COLORS.TARGET.NORMAL,
            outlineColor: COLORS.TARGET.OUTLINE,
            outlineWidth: MARKER_SIZES.OUTLINE_WIDTH_NORMAL,
            heightReference: Cesium.HeightReference.NONE,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            show: true
          },
          buildingData: {
            name: attack.target.building.name,
            country: attack.target.name,
            type: 'target'
          }
        });

        // 2D 직선 광선
        viewer.current.entities.add({
          id: `beam-2d-${attack.id}`,
          polyline: {
            positions: [sourceMarkerPos, targetMarkerPos],
            width: 12,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.05,
              color: Cesium.Color.RED.withAlpha(0.08)
            }),
            clampToGround: false,
            followSurface: false,
            granularity: Cesium.Math.RADIANS_PER_DEGREE
          },
          description: `🔴 트래픽: ${attack.source.name} → ${attack.target.name}`,
          attackData: attack
        });

        successCount++;
      });

      console.log(`✅ create2DEntities 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
      console.log(`📊 생성된 엔티티: 마커 ${successCount * 2}개, 광선 ${successCount}개`);
    } catch (error) {
      console.error('❌ 2D 엔티티 생성 오류:', error);
    }
  };

  // 공격 시각화 효과
  useEffect(() => {
    if (!viewer.current || !isLoaded || !attacks || attacks.length === 0) return;

    try {
      // 기존 엔티티 제거
      viewer.current.entities.removeAll();

      // 기존 애니메이션 정리
      animationEntities.forEach(entity => {
        if (entity.interval) clearInterval(entity.interval);
      });
      setAnimationEntities([]);

      // 2D 엔티티 생성
      create2DEntities(attacks);
    } catch (error) {
      console.error('엔티티 생성 중 오류 발생:', error);
    }

    // 클릭 이벤트 핸들러
    if (viewer.current.screenSpaceEventHandler) {
      viewer.current.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      viewer.current.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }

    // 싱글 클릭 이벤트
    viewer.current.screenSpaceEventHandler.setInputAction((click) => {
      interactionTracker.measureResponseSync(
        'GeoIP',
        'Building Click on Map',
        () => {
          try {
            const pickedObject = viewer.current.scene.pick(click.position);

            if (pickedObject && pickedObject.id) {
              // ID 찾기
              let entityId = null;
              if (pickedObject.id.id) {
                entityId = pickedObject.id.id;
              } else if (pickedObject.id._id) {
                entityId = pickedObject.id._id;
              } else if (typeof pickedObject.id === 'string') {
                entityId = pickedObject.id;
              }

              // 먼저 모든 하이라이트 제거
              clearAllHighlights();

              // 건물 클릭 처리
              const isSourceBuilding = entityId && entityId.startsWith('source-2d-');
              const isTargetBuilding = entityId && entityId.startsWith('target-2d-');

              if (isSourceBuilding || isTargetBuilding) {
                // ID에서 attack ID 추출
                let attackId = null;
                if (entityId.startsWith('source-2d-')) {
                  attackId = entityId.replace('source-2d-', '');
                } else if (entityId.startsWith('target-2d-')) {
                  attackId = entityId.replace('target-2d-', '');
                }

                if (attackId) {
                  // 공격 찾기 (타입 안정성 개선된 유틸리티 함수 사용)
                  const clickedAttack = findAttackById(attacks, attackId);

                  if (clickedAttack) {
                    // 새로운 마커 하이라이트
                    highlightBuildingAttacks(clickedAttack, entityId);
                    return;
                  }
                }
              }
            }

            // 빈 공간 클릭 시 선택 해제
            setSelectedAttackId(null);
            setSelectedBuildingAttacks([]);

            // 모든 하이라이트 제거
            clearAllHighlights();
          } catch (error) {
            console.error('클릭 이벤트 처리 오류:', error);
          }
        },
        { hasPickedObject: !!viewer.current.scene.pick(click.position) }
      );
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // 더블 클릭 이벤트 - 마커로 확대
    viewer.current.screenSpaceEventHandler.setInputAction((click) => {
      interactionTracker.measureResponseSync(
        'GeoIP',
        'Building Double Click (Zoom)',
        () => {
          try {
            const pickedObject = viewer.current.scene.pick(click.position);

            if (pickedObject && pickedObject.id) {
              // ID 찾기
              let entityId = null;
              if (pickedObject.id.id) {
                entityId = pickedObject.id.id;
              } else if (pickedObject.id._id) {
                entityId = pickedObject.id._id;
              } else if (typeof pickedObject.id === 'string') {
                entityId = pickedObject.id;
              }

              // 마커인지 확인
              const isSourceMarker = entityId && entityId.startsWith('source-2d-');
              const isTargetMarker = entityId && entityId.startsWith('target-2d-');

              if (isSourceMarker || isTargetMarker) {
                const entity = viewer.current.entities.getById(entityId);
                if (entity && entity.position) {
                  const position = entity.position.getValue(viewer.current.clock.currentTime);
                  if (position) {
                    const cartographic = Cesium.Cartographic.fromCartesian(position);
                    const longitude = Cesium.Math.toDegrees(cartographic.longitude);
                    const latitude = Cesium.Math.toDegrees(cartographic.latitude);

                    // 2D 모드에서 적절한 줌 레벨로 이동
                    viewer.current.camera.flyTo({
                      destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, 50000), // 50km 고도
                      duration: 1.5,
                      complete: () => {
                        // 카메라 이동 완료 후 컨트롤 재활성화
                        viewer.current.scene.screenSpaceCameraController.enableInputs = true;
                      }
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.error('더블클릭 이벤트 처리 오류:', error);
          }
        },
        { hasPickedObject: !!viewer.current.scene.pick(click.position) }
      );
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }, [attacks, isLoaded]);

  if (error) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          borderRadius: 2,
          p: 2
        }}
      >
        <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          1. https://cesium.com/ion/ 방문<br/>
          2. 무료 계정 생성<br/>
          3. Access Token 발급<br/>
          4. EarthGlobe.jsx 파일의 토큰 교체
        </Typography>
      </Box>
    );
  }

  return (
    <Card
      component="main"
      role="main"
      aria-label="2D 지도 기반 사이버 공격 시각화"
      sx={{
        width: '100%',
        height: 'calc(100vh - 132px)',
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
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 1,
        overflow: 'hidden'
      }}>
        {/* 지구본 영역 */}
        <Card 
          component="section"
          aria-label="2D 지도 영역"
          sx={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            height: '100%',
            bgcolor: '#000',
            border: '1px solid #333',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <CardContent sx={{ p: 0, height: '100%', '&:last-child': { pb: 0 }, position: 'relative' }}>
            {/* MultilayerVisualization 이동 버튼 */}
            <IconButton
              size="small"
              aria-label="3D 멀티레이어로 이동"
              title="3D 멀티레이어로 이동"
              onClick={() => {
                interactionTracker.measureResponseSync(
                  'GeoIP',
                  'Navigate to MultilayerVisualization',
                  () => navigate('/CyberObjectInfo/MultilayerVisualization'),
                  { destination: '/CyberObjectInfo/MultilayerVisualization' }
                );
              }}
              sx={{
                position: 'absolute',
                top: 6.5,
                right: 125,
                zIndex: 1000,
                bgcolor: '#222b33',
                color: '#fff',
                borderRadius: '5%',
                width: 32,
                height: 32,
                boxShadow: '0 2px 8px #222b33',
                '&:hover': {
                  bgcolor: '#5b89b1ff',
                  color: '#fff',
                },
              }}
            >
              <FundOutlined style={{ fontSize: 18 }} />
            </IconButton>
            <div
              ref={cesiumContainer}
              role="img"
              aria-label="사이버 공격 경로를 표시하는 2D 지도"
              style={{
                width: '100%',
                height: '100%'
              }}
            />
            {!isLoaded && (
              <Box
                role="status"
                aria-live="polite"
                aria-label="지도 로딩 중"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(0,0,0,0.8)',
                  color: 'white'
                }}
              >
                <Typography>2D 모드 로딩 중...</Typography>
              </Box>
            )}

            {/* 통계 패널 - 가로형 */}
            {isLoaded && mapStats && (
              <Box sx={{
                position: 'absolute', top: 8, left: 8, zIndex: 1000,
                bgcolor: 'rgba(8,16,26,0.85)',
                backdropFilter: 'blur(8px)',
                borderRadius: 2.5,
                border: '1px solid rgba(255,255,255,0.12)',
                px: 2.5, py: 1.5,
                color: 'white',
                display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0
              }}>

                {/* 헤더 라벨 */}
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', pr: 2.5, mr: 2.5, borderRight: '1px solid rgba(255,255,255,0.12)', minWidth: 76 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#7dd3fc', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>📊 BGP</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#7dd3fc', letterSpacing: 0.5 }}>트래픽 통계</Typography>
                </Box>

                {/* 컬렉터 통계 */}
                <Box sx={{ pr: 2.5, mr: 2.5, borderRight: '1px solid rgba(255,255,255,0.12)', minWidth: 160 }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', mb: 0.7, textTransform: 'uppercase', letterSpacing: 0.8 }}>컬렉터 통계</Typography>
                  {[
                    { label: 'RouteViews', val: mapStats.routeViewsCount, color: '#38bdf8' },
                    { label: 'RIPE RIS',   val: mapStats.ripeCount,       color: '#a78bfa' }
                  ].map(({ label, val, color }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', width: 70, flexShrink: 0 }}>{label}</Typography>
                      <Box sx={{ width: 56, height: 6, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                        <Box sx={{ width: `${Math.round(val / mapStats.total * 100)}%`, height: '100%', bgcolor: color, borderRadius: 1 }} />
                      </Box>
                      <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 20, textAlign: 'right' }}>{val}</Typography>
                    </Box>
                  ))}
                </Box>

                {/* 기간별 트래픽 수 */}
                <Box sx={{ pr: 2.5, mr: 2.5, borderRight: '1px solid rgba(255,255,255,0.12)' }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', mb: 0.7, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap' }}>기간별 트래픽 수</Typography>
                  <Box sx={{ display: 'flex', gap: 2.5 }}>
                    {[
                      { val: mapStats.total,              label: '현재 구간', color: '#34d399' },
                      { val: timeRange[1]-timeRange[0]+1, label: '선택 월 수', color: '#fbbf24' },
                      { val: allAttacks.length,           label: '전체 총계', color: '#f87171' }
                    ].map(({ val, label, color }) => (
                      <Box key={label} sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{val}</Typography>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', mt: 0.3, whiteSpace: 'nowrap' }}>{label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* 프로토콜 통계 */}
                <Box sx={{ pr: 2.5, mr: 2.5, borderRight: '1px solid rgba(255,255,255,0.12)', minWidth: 140 }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', mb: 0.7, textTransform: 'uppercase', letterSpacing: 0.8 }}>프로토콜</Typography>
                  {mapStats.protocols.map(([proto, cnt], i) => {
                    const colors = ['#38bdf8', '#34d399', '#fbbf24', '#f87171'];
                    return (
                      <Box key={proto} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', width: 46, flexShrink: 0 }}>{proto}</Typography>
                        <Box sx={{ width: 56, height: 6, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                          <Box sx={{ width: `${Math.round(cnt / mapStats.total * 100)}%`, height: '100%', bgcolor: colors[i], borderRadius: 1 }} />
                        </Box>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 20, textAlign: 'right' }}>{cnt}</Typography>
                      </Box>
                    );
                  })}
                </Box>

                {/* 국가 통계 */}
                <Box sx={{ minWidth: 140 }}>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', mb: 0.7, textTransform: 'uppercase', letterSpacing: 0.8 }}>국가</Typography>
                  {mapStats.countries.map(([country, cnt], i) => {
                    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635'];
                    return (
                      <Box key={country} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', width: 46, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{country}</Typography>
                        <Box sx={{ width: 56, height: 6, bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1, overflow: 'hidden' }}>
                          <Box sx={{ width: `${Math.round(cnt / mapStats.total * 100)}%`, height: '100%', bgcolor: colors[i], borderRadius: 1 }} />
                        </Box>
                        <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', width: 20, textAlign: 'right' }}>{cnt}</Typography>
                      </Box>
                    );
                  })}
                </Box>

              </Box>
            )}

            {/* 범례 - 지도 내부 우하단 */}
            {isLoaded && (
              <Box sx={{
                position: 'absolute',
                bottom: 16,
                left: 12,
                zIndex: 1000,
                bgcolor: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
                borderRadius: 1.5,
                px: 1.5,
                py: 1,
                border: '1px solid rgba(255,255,255,0.15)'
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#FFFF00', border: '2px solid #FF0000', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px' }}>공격 출발지</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#00FFFF', border: '2px solid #0000FF', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px' }}>공격 목표지</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 16, height: 2, bgcolor: '#FF0000', borderRadius: 1, boxShadow: '0 0 4px #FF0000', flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px' }}>사이버 트래픽</Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {/* FusionDB 팝업 버튼 */}
            {isLoaded && (
              <IconButton
                size="small"
                aria-label="융합 데이터베이스 열기"
                title="융합 데이터베이스 열기"
                onClick={() => {
                  interactionTracker.measureResponseSync(
                    'GeoIP',
                    'Open FusionDB Popup',
                    () => openPopup('fusionDB'),
                    {}
                  );
                }}
                sx={{
                  position: 'absolute',
                  bottom: '1%',
                  left: '98%',
                  transform: 'translateX(-50%)',
                  zIndex: 1000,
                  bgcolor: '#222b33',
                  color: '#fff',
                  borderRadius: '5%',
                  width: 48,
                  height: 48,
                  boxShadow: '0 4px 12px #222b33',
                  '&:hover': {
                    bgcolor: '#5b89b1ff',
                    color: '#fff',
                    transform: 'translateX(-50%) scale(1.1)',
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <DatabaseOutlined style={{ fontSize: 24 }} />
              </IconButton>
            )}
          </CardContent>
        </Card>

        {/* 공격 현황 패널 */}
        <Box 
          component="aside"
          aria-label="공격 현황 패널"
          sx={{
            width: { xs: '100%', lg: 350 },
            maxWidth: { xs: '100%', lg: 400 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            height: '100%',
            overflow: 'hidden'
          }}
        >
          {/* 실시간 통계 */}
          <Card 
            component="section"
            aria-label="실시간 공격 통계"
            sx={{
              bgcolor: '#f0edfd',
              color: '#333',
              border: '1px solid #d0c9f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              minHeight: 0,
              flexShrink: 0
            }}
          >
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      sx={{ color: '#7c3aed', fontWeight: 'bold' }}
                      aria-label={`전체 트래픽 수 ${allAttacks.length}개`}
                    >
                      98,182,532
                      {/* {allAttacks.length} */}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      전체 트래픽
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h4"
                      sx={{ color: '#9333ea', fontWeight: 'bold' }}
                      aria-label={`현재 트래픽 수 ${attacks.length}개`}
                    >
                      {attacks.length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666' }}>
                      현재 트래픽
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 최근 공격 목록 */}
          <Card 
            component="section"
            aria-label="최근 공격 목록"
            sx={{
              bgcolor: 'transparent',
              color: '#333',
              flex: 1,
              minHeight: 0,
              border: 'none',
              boxShadow: 'none',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <CardContent sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              '&:last-child': { pb: 2 }
            }}>
              <Box
                ref={logListRef}
                role="list"
                aria-label="공격 로그 목록"
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  minHeight: 0
                }}
              >
              {attacks && attacks.map((attack, index) => (
                <Box
                  id={`log-${attack.id}`}
                  key={attack.id}
                  data-attack-id={attack.id}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`공격 정보: ${attack.type}, ${attack.source.name}에서 ${attack.target.name}로, 출발지 IP ${attack.source.ip}`}
                  aria-selected={selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)}
                  sx={{
                    p: 1,
                    mb: 1,
                    bgcolor: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.05)',
                    borderRadius: 1,
                    borderLeft: '3px solid #7c3aed',
                    border: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? '2px solid #7c3aed' : 'none',
                    boxShadow: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
                    animation: (selectedAttackId === attack.id || selectedBuildingAttacks.includes(attack.id)) ? 'pulse 1.5s infinite' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}
                  onClick={() => {
                    interactionTracker.measureResponseSync(
                      'GeoIP',
                      'Attack Item Click',
                      () => {
                        const newSelectedId = selectedAttackId === attack.id ? null : attack.id;
                        setSelectedAttackId(newSelectedId);
                        setSelectedBuildingAttacks([]);

                        // 로그 클릭 시 지도에서 해당 건물 하이라이트 및 이동
                        if (newSelectedId) {
                          clearAllHighlights();
                          highlightBuildingOnMap(attack.id);
                        } else {
                          // 선택 해제 시 모든 하이라이트 제거
                          clearAllHighlights();
                        }
                      },
                      { attackId: attack.id, attackType: attack.type, isDeselect: selectedAttackId === attack.id }
                    );
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333', mb: 0.3 }}>
                    🔴 {toKo(attack.source.name)} → {toKo(attack.target.name)} ({attack.count})
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    출발지 IP: {attack.source.ip}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    목적지 IP: {attack.target.ip}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    네트워크: {attack.target.subnet}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    게이트웨이: {attack.target.gateway}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#888', fontSize: '10px' }}>
                    DNS: {attack.target.dns}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#7c3aed', fontSize: '10px' }}>
                    트래픽 시간: {attack.timestamp.toLocaleString('ko-KR', {
                      timeZone: 'Asia/Seoul',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </Typography>

                  {/* 내부망 이동 아이콘 */}
                  <IconButton
                    size="small"
                    aria-label="내부망 토폴로지로 이동"
                    title="내부망 토폴로지로 이동"
                    onClick={(e) => {
                      e.stopPropagation();
                      interactionTracker.measureResponseSync(
                        'GeoIP',
                        'Navigate to Internal Topology',
                        () => navigate('/ExtInt/internaltopology'),
                        { destination: '/ExtInt/internaltopology' }
                      );
                    }}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      color: '#7c3aed',
                      bgcolor: 'rgba(124,58,237,0.1)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(124,58,237,0.2)',
                        color: '#9333ea'
                      },
                      width: 24,
                      height: 24
                    }}
                  >
                    <FundOutlined style={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              ))}
              </Box>
            </CardContent>
          </Card>

          {/* 시간 필터링 컨트롤 */}
          <Card 
            component="section"
            aria-label="날짜 범위 필터링 컨트롤"
            sx={{
              bgcolor: '#f0edfd',
              color: '#333',
              border: '1px solid #d0c9f0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              flexShrink: 0,
              minHeight: 0
            }}
          >
            <CardContent>
              <Typography 
                variant="body2" 
                component="h3"
                sx={{ mb: 1, fontWeight: 'bold', color: '#7c3aed' }}
              >
                날짜 범위 필터링
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#666' }}>
                {(() => {
                  const startMonthLabel = MONTH_MARKS_2025[timeRange[0]]?.label || '25/01';
                  const endMonthLabel = MONTH_MARKS_2025[timeRange[1]]?.label || '25/12';
                  return `${startMonthLabel} ~ ${endMonthLabel} (${timeRange[1] - timeRange[0] + 1}개월)`;
                })()}
              </Typography>
              <Slider
                aria-label="날짜 범위 선택"
                value={timeRange}
                onChange={(_, newValue) => {
                  interactionTracker.measureResponseSync(
                    'GeoIP',
                    'Time Range Slider Change',
                    () => setTimeRange(newValue),
                    { newRange: newValue, months: newValue[1] - newValue[0] + 1 }
                  );
                }}
                min={0}
                max={11}
                step={1}
                marks={MONTH_MARKS_2025.map(({ value, labelShort }) => ({ value, label: labelShort }))}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => MONTH_MARKS_2025[value]?.labelShort || ''}
                sx={{
                  color: '#7c3aed',
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#7c3aed',
                    '&:hover, &.Mui-focusVisible': {
                      boxShadow: '0 0 0 8px rgba(124,58,237, 0.16)',
                    },
                  },
                  '& .MuiSlider-track': {
                    backgroundColor: '#7c3aed',
                  },
                  '& .MuiSlider-rail': {
                    backgroundColor: '#d0c9f0',
                  },
                  '& .MuiSlider-mark': {
                    backgroundColor: '#b8aee0',
                  },
                  '& .MuiSlider-markLabel': {
                    color: '#666',
                    fontSize: '9px',
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: '#7c3aed',
                    color: '#fff',
                  },
                }}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#888', fontSize: '10px' }}>
                현재 트래픽: {attacks.length}개 / 전체: {allAttacks.length}개
              </Typography>
            </CardContent>
          </Card>

        </Box>
      </CardContent>

      {/* FusionDB 팝업 다이얼로그 */}
      <Dialog
        open={fusionDBOpen}
        onClose={() => {
          interactionTracker.measureResponseSync(
            'GeoIP',
            'Close FusionDB Popup (Dialog Close)',
            () => closePopup('fusionDB'),
            {}
          );
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '70vh',
            maxHeight: '70vh',
            m: 0,
            position: 'relative',
            overflow: 'hidden'
          }
        }}
      >
        <IconButton
          onClick={() => {
            interactionTracker.measureResponseSync(
              'GeoIP',
              'Close FusionDB Popup (Button)',
              () => closePopup('fusionDB'),
              {}
            );
          }}
          sx={{
            position: 'absolute',
            right: 23,
            top: 8.5,
            color: '#000000ff',
            zIndex: 1,
            bgcolor: '#cac7d4ff',
            '&:hover': {
              bgcolor: '#39306b',
              color: '#ffffffff'
            }
          }}
        >
          ✕
        </IconButton>
        <DialogContent sx={{ p: 0, height: '100%', overflow: 'hidden' }}>
          <FusionDBConsole open={fusionDBOpen} isPopup={true} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TwoDPage;