import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { 
  Box, Typography, Card, Button, Paper, Divider
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import WarningIcon from '@mui/icons-material/Warning';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import interactionTracker from '../../../utils/interactionTracker';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DomainIcon from '@mui/icons-material/Domain';
import northInformation from './north_information.json';

const DEFAULT_SITE = northInformation.find(s => s.id === 'site_sohae') || northInformation[0];

// Cesium Token
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODNiZmZiNC04YTUxLTQ1YzgtOWU1Mi1kNDUyY2I2ZDRkNTQiLCJpZCI6MzQyNDEzLCJpYXQiOjE3NTgxNzMyNDh9.zZRyMPovg5ALhNtG2_E-0ED0qHqd_uQQnAG84eQUyG4';

const FACILITY_COLORS = {
  nuclear: Cesium.Color.RED,
  rocket: Cesium.Color.ORANGE,
  law_facility: Cesium.Color.PURPLE,
  default: Cesium.Color.GRAY
};


const PDR = () => {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);

  const [selectedSite, setSelectedSite] = useState(DEFAULT_SITE);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [expandedBuildingId, setExpandedBuildingId] = useState(DEFAULT_SITE.buildings[0]?.id ?? null);

  // 컴포넌트 마운트/언마운트 추적
  useEffect(() => {
    interactionTracker.log('PDR', 'Component Mounted', {});
    return () => {
      interactionTracker.log('PDR', 'Component Unmounted', {});
    };
  }, []);

  useEffect(() => {
    if (!cesiumContainer.current) return;

    const initCesium = async () => {
      try {
        const viewer = new Cesium.Viewer(cesiumContainer.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
          navigationInstructionsInitiallyVisible: false,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          sceneMode: Cesium.SceneMode.SCENE3D,
          skyAtmosphere: new Cesium.SkyAtmosphere(),
        });

        viewerRef.current = viewer;
        viewer.cesiumWidget.creditContainer.style.display = "none";
        
        // 초기 뷰: 한반도 전체 (로드 후 fly-to로 교체됨)
        viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(127.5, 39.5, 1200000),
            orientation: { heading: 0.0, pitch: Cesium.Math.toRadians(-90.0), roll: 0.0 }
        });

        try {
          const terrainProvider = await Cesium.createWorldTerrainAsync();
          viewer.scene.terrainProvider = terrainProvider;
          const buildingsTileset = await Cesium.createOsmBuildingsAsync();
          viewer.scene.primitives.add(buildingsTileset);
        } catch (e) { console.warn("Terrain load warning:", e); }

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click) => {
          interactionTracker.measureResponseSync(
            'PDR',
            'Cesium Map Click',
            () => {
              const pickedObject = viewer.scene.pick(click.position);
              
              if (Cesium.defined(pickedObject) && pickedObject.id) {
                const entity = pickedObject.id;
                const type = entity.properties?.type?.getValue();
                const data = entity.properties?.data?.getValue();

                if (type === 'site') {
                    handleSelectSite(data, viewer);
                } else if (type === 'building') {
                    handleSelectBuilding(data, viewer);
                }
              }
            },
            { hasPickedObject: !!viewer.scene.pick(click.position) }
          );
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setIsLoaded(true);

      } catch (error) {
        console.error("Cesium Init Error:", error);
      }
    };

    initCesium();

    return () => {
      if (viewerRef.current) viewerRef.current.destroy();
    };
  }, []);

  // 초기 로드 시 서해위성발사장으로 카메라 fly-to
  useEffect(() => {
    if (!isLoaded || !viewerRef.current) return;
    const site = DEFAULT_SITE;
    if (!site.buildings || site.buildings.length === 0) return;

    const lats = site.buildings.map(b => b.lat);
    const lngs = site.buildings.map(b => b.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const MIN_BUFFER = 0.005;
    const latBuffer = Math.max((maxLat - minLat) * 0.2, MIN_BUFFER);
    const lngBuffer = Math.max((maxLng - minLng) * 0.2, MIN_BUFFER);

    viewerRef.current.camera.flyTo({
      destination: Cesium.Rectangle.fromDegrees(
        minLng - lngBuffer, minLat - latBuffer,
        maxLng + lngBuffer, maxLat + latBuffer
      ),
      duration: 1.5
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!viewerRef.current || !isLoaded) return;
    const viewer = viewerRef.current;

    viewer.entities.removeAll();

    if (!selectedSite) {
        northInformation.forEach(site => {
            const color = FACILITY_COLORS[site.detail.type] || FACILITY_COLORS.default;
            viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(site.geo_info.lng, site.geo_info.lat),
                point: {
                    pixelSize: 20,
                    color: color,
                    outlineColor: Cesium.Color.WHITE,
                    outlineWidth: 3,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                },
                label: {
                    text: site.name,
                    font: '16px sans-serif',
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 4,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -25),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5000000)
                },
                properties: { type: 'site', data: site }
            });
        });
    } else {
        selectedSite.buildings.forEach(bldg => {
            viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(bldg.lng, bldg.lat),
                billboard: {
                    image: `data:image/svg+xml;charset=utf-8,
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%23fbc02d">
                        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                      </svg>`,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    width: 40, height: 40
                },
                label: {
                    text: bldg.name,
                    font: '14px sans-serif',
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    fillColor: Cesium.Color.YELLOW,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    verticalOrigin: Cesium.VerticalOrigin.TOP,
                    pixelOffset: new Cesium.Cartesian2(0, 5),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 50000)
                },
                properties: { type: 'building', data: bldg }
            });
        });
    }
  }, [selectedSite, isLoaded]);

  const handleSelectSite = (site, viewer) => {
    interactionTracker.measureResponseSync(
      'PDR',
      'Select Site',
      () => {
        setSelectedSite(site);
        setSelectedBuilding(null);
        
        if (!site.buildings || site.buildings.length === 0) {
            viewer.flyTo(viewer.entities, {
                destination: Cesium.Cartesian3.fromDegrees(site.geo_info.lng, site.geo_info.lat, 5000),
                duration: 1.5
            });
            return;
        }

        const lats = site.buildings.map(b => b.lat);
        const lngs = site.buildings.map(b => b.lng);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        if (minLat === maxLat && minLng === maxLng) {
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(minLng, minLat, 1000), // 핀포인트 줌 1000m
                duration: 1.5
            });
            return;
        }

        // 최소 여백(Buffer)을 0.005도(약 500m)로 설정
        const MIN_BUFFER = 0.005; 
        let latBuffer = (maxLat - minLat) * 0.2; // 20% 여백
        let lngBuffer = (maxLng - minLng) * 0.2;

        if (latBuffer < MIN_BUFFER) latBuffer = MIN_BUFFER;
        if (lngBuffer < MIN_BUFFER) lngBuffer = MIN_BUFFER;

        const rectangle = Cesium.Rectangle.fromDegrees(
            minLng - lngBuffer,
            minLat - latBuffer,
            maxLng + lngBuffer,
            maxLat + latBuffer
        );

        viewer.camera.flyTo({
            destination: rectangle,
            duration: 1.5
        });
      },
      {
        siteName: site.name,
        buildingCount: site.buildings?.length || 0
      }
    );
  };

  const handleSelectBuilding = (building, viewer) => {
    interactionTracker.measureResponseSync(
      'PDR',
      'Select Building',
      () => {
        setSelectedBuilding(building);
        setExpandedBuildingId(building.id);
        setPanelOpen(true);
      },
      {
        buildingName: building.name,
        buildingId: building.id
      }
    );
  };

  const handleResetView = () => {
    interactionTracker.measureResponseSync(
      'PDR',
      'Reset View',
      () => {
        setSelectedSite(null);
        setSelectedBuilding(null);
        viewerRef.current?.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(127.5, 39.5, 1200000),
            duration: 1.5
        });
      },
      { action: 'return to full map' }
    );
  };

  const FloorPlanViewer = ({ building }) => {
    if (!building || !building.structure_info) return null;

    // 층별 방이 같은 좌표를 공유하므로 가장 많은 방을 가진 층 하나만 표시
    const floors = Object.values(building.structure_info);
    const allRooms = floors.reduce((a, b) => (b.length > a.length ? b : a), floors[0] || []);

    // 건물 전체 bounding box
    const pad = 4;
    const bminX = Math.min(...allRooms.map(r => r.x)) - pad;
    const bminY = Math.min(...allRooms.map(r => r.y)) - pad;
    const bmaxX = Math.max(...allRooms.map(r => r.x + r.w)) + pad;
    const bmaxY = Math.max(...allRooms.map(r => r.y + r.h)) + pad;
    const bw = bmaxX - bminX;
    const bh = bmaxY - bminY;

    // 정사각형 viewBox
    const size = Math.max(bw, bh) * 1.1;
    const cx = (bminX + bmaxX) / 2;
    const cy = (bminY + bmaxY) / 2;
    const vbX = cx - size / 2;
    const vbY = cy - size / 2;

    const WALL = 2.2;
    const dashLen = size / 25;
    const gapLen = size / 35;
    const lineW = size / 160;

    return (
      <Box sx={{ width: '100%', aspectRatio: '1/1', bgcolor: '#080808', border: '1px solid #1a1a1a', borderRadius: 1.5, overflow: 'hidden' }}>
        <svg
          viewBox={`${vbX} ${vbY} ${size} ${size}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%', display: 'block' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* 외부 배경 */}
          <rect x={vbX} y={vbY} width={size} height={size} fill="#080808" />

          {/* 십자 기준선 */}
          <line x1={cx} y1={vbY} x2={cx} y2={vbY + size}
            stroke="rgba(255,255,255,0.22)" strokeWidth={lineW}
            strokeDasharray={`${dashLen} ${gapLen}`} />
          <line x1={vbX} y1={cy} x2={vbX + size} y2={cy}
            stroke="rgba(255,255,255,0.22)" strokeWidth={lineW}
            strokeDasharray={`${dashLen} ${gapLen}`} />

          {/* 건물 외벽 — 흰색으로 채움 (벽 전체가 흰색) */}
          <rect x={bminX} y={bminY} width={bw} height={bh} fill="white" />

          {/* 각 공간을 검정으로 파냄 (방 내부 = 빈 공간) */}
          {allRooms.map(room => {
            const isCritical = room.status === 'critical';
            const isCorridor = room.type === 'corridor';
            const ix = room.x + WALL;
            const iy = room.y + WALL;
            const iw = room.w - WALL * 2;
            const ih = room.h - WALL * 2;
            if (iw <= 0 || ih <= 0) return null;

            const innerFill = isCritical ? '#1c0000' : '#080808';
            const labelColor = isCritical ? '#ff8888' : !isCorridor ? '#aaffbb' : 'rgba(255,255,255,0.6)';

            return (
              <g key={room.id}>
                {/* 방 내부 공간 (검정) */}
                <rect x={ix} y={iy} width={iw} height={ih} fill={innerFill} />

                {/* 복도: 평행선 질감 */}
                {isCorridor && ih > iw
                  ? Array.from({ length: Math.floor(ih / 3.5) }).map((_, i) => (
                      <line key={i}
                        x1={ix + 0.5} y1={iy + i * 3.5 + 1.5}
                        x2={ix + iw - 0.5} y2={iy + i * 3.5 + 1.5}
                        stroke="rgba(255,255,255,0.13)" strokeWidth="0.5" />
                    ))
                  : isCorridor
                  ? Array.from({ length: Math.floor(iw / 3.5) }).map((_, i) => (
                      <line key={i}
                        x1={ix + i * 3.5 + 1.5} y1={iy + 0.5}
                        x2={ix + i * 3.5 + 1.5} y2={iy + ih - 0.5}
                        stroke="rgba(255,255,255,0.13)" strokeWidth="0.5" />
                    ))
                  : null
                }

                {/* 정상: 초록 테두리 / 이상: 빨간 테두리 */}
                {!isCorridor && (
                  <rect x={ix} y={iy} width={iw} height={ih}
                    fill="none"
                    stroke={isCritical ? '#cc2222' : '#22aa44'}
                    strokeWidth="1.2" />
                )}

                {/* 방 이름 — 공간에 맞게 폰트 자동 조절 */}
                {iw > 4 && ih > 4 && (
                  <text
                    x={ix + iw / 2} y={iy + ih / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={labelColor}
                    fontSize={Math.max(1.2, Math.min(iw / (room.name.length * 0.75), ih / 4, size / 28))}
                    fontFamily="'Courier New', monospace"
                    fontWeight="700"
                    style={{ pointerEvents: 'none' }}
                  >
                    {room.name}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </Box>
    );
  };

  return (
    <Card sx={{ width: '100%', height: 'calc(100vh - 132px)', display: 'flex', bgcolor: '#f5f5f5', m:0, overflow: 'hidden', position: 'relative' }}>

      <Box sx={{ flex: 1, position: 'relative', height: '100%' }}>
        <div ref={cesiumContainer} style={{ width: '100%', height: '100%' }} />
        
        {selectedSite && (
            <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={handleResetView}
                sx={{ position: 'absolute', top: 20, left: 20, zIndex: 1000, bgcolor: 'rgba(255,255,255,0.9)', color: '#333', '&:hover':{bgcolor:'white'} }}>
                전체 지도 보기
            </Button>
        )}

        {selectedSite && (
            <Paper elevation={3} sx={{ position: 'absolute', top: 20, right: 20, zIndex: 1000, width: 320, p: 2, bgcolor: 'rgba(255, 255, 255, 0.95)', borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a237e', display:'flex', alignItems:'center', gap:1, mb: 1 }}>
                    <LocationOnIcon color="error"/> {selectedSite.name}
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                <Typography variant="body2" sx={{ mb: 0.5 }}><strong>주소:</strong> {selectedSite.geo_info.addr}</Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}><strong>용도:</strong> {selectedSite.detail.용도}</Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}><strong>건물 수:</strong> {selectedSite.detail.건물수}개동</Typography>
                <Typography variant="body2"><strong>건축:</strong> {selectedSite.detail.건물년수}</Typography>
            </Paper>
        )}
        {/* 패널 토글 탭 */}
        <Box
          onClick={() => setPanelOpen(o => !o)}
          sx={{
            position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)',
            zIndex: 1100,
            width: 20, height: 64,
            bgcolor: '#263238',
            borderRadius: '6px 0 0 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '-2px 0 6px rgba(0,0,0,0.3)',
            '&:hover': { bgcolor: '#37474f' },
            transition: 'background 0.2s'
          }}
        >
          <Typography sx={{ color: 'white', fontSize: 12, fontWeight: 'bold', lineHeight: 1 }}>
            {panelOpen ? '›' : '‹'}
          </Typography>
        </Box>
      </Box>

      {panelOpen && (
      <Card sx={{ width: 520, height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ddd', bgcolor: '#f8f9fa' }}>
        <Box sx={{ p: 2, bgcolor: '#263238', color: 'white' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display:'flex', alignItems:'center', gap:1 }}>
                <DomainIcon /> 시설 상세 모니터링
            </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {!selectedSite && (
                <Box sx={{ textAlign: 'center', color: '#90a4ae', mt: 10 }}>
                    <MapIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
                    <Typography>지도에서 시설(마커)을 선택해주세요.</Typography>
                </Box>
            )}

            {selectedSite && (
                <>
                    <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={handleResetView}
                        size="small"
                        sx={{ alignSelf: 'flex-start', borderColor: '#90a4ae', color: '#546e7a', '&:hover': { borderColor: '#455a64', bgcolor: '#eceff1' } }}
                    >
                        전체 지도 보기
                    </Button>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#333' }}>
                        내부 건물 목록 ({selectedSite.buildings.length})
                    </Typography>

                    {/* 범례 */}
                    <Box sx={{ display: 'flex', gap: 2, px: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#e8f5e9', border: '2px solid #66bb6a' }} />
                            <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>정상</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffebee', border: '2px solid #e57373' }} />
                            <Typography variant="caption" sx={{ color: '#c62828', fontWeight: 'bold' }}>이상</Typography>
                        </Box>
                    </Box>

                    {selectedSite.buildings.map((bldg) => {
                        const isExpanded = expandedBuildingId === bldg.id;
                        return (
                            <Box key={bldg.id} sx={{ border: '1px solid', borderColor: isExpanded ? '#90caf9' : '#cfd8dc', borderRadius: 1.5, overflow: 'hidden', bgcolor: 'white' }}>
                                {/* 건물 헤더 - 클릭으로 토글 */}
                                <Box
                                    onClick={() => {
                                        interactionTracker.measureResponseSync('PDR', 'Building Toggle', () => {
                                            setExpandedBuildingId(isExpanded ? null : bldg.id);
                                            if (!isExpanded) {
                                                viewerRef.current?.flyTo(
                                                    viewerRef.current.entities.values.find(e => e.properties?.data?.getValue()?.id === bldg.id),
                                                    { duration: 1.0, offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 1000) }
                                                );
                                            }
                                        }, { buildingId: bldg.id, action: isExpanded ? 'collapse' : 'expand' });
                                    }}
                                    sx={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        px: 1.5, py: 1.2, cursor: 'pointer',
                                        bgcolor: isExpanded ? '#e3f2fd' : 'white',
                                        '&:hover': { bgcolor: isExpanded ? '#bbdefb' : '#f5f5f5' },
                                        transition: 'background 0.15s'
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <BusinessIcon sx={{ fontSize: 16, color: isExpanded ? '#1565c0' : '#546e7a' }} />
                                        <Typography variant="body2" sx={{ fontWeight: isExpanded ? 700 : 400, color: isExpanded ? '#1565c0' : '#455a64', fontSize: '0.82rem' }}>
                                            {bldg.name}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ fontSize: 13, color: '#90a4ae', fontWeight: 'bold' }}>
                                        {isExpanded ? '▲' : '▼'}
                                    </Typography>
                                </Box>

                                {/* 구조도 - 열렸을 때만 표시 */}
                                {isExpanded && (
                                    <Box sx={{ p: 1.5, borderTop: '1px solid #e3f2fd' }}>
                                        <FloorPlanViewer building={bldg} />
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </>
            )}
        </Box>
      </Card>
      )}
    </Card>
  );
};

export default PDR;