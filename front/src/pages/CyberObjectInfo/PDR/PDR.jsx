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

// Cesium Token
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODNiZmZiNC04YTUxLTQ1YzgtOWU1Mi1kNDUyY2I2ZDRkNTQiLCJpZCI6MzQyNDEzLCJpYXQiOjE3NTgxNzMyNDh9.zZRyMPovg5ALhNtG2_E-0ED0qHqd_uQQnAG84eQUyG4';

const FACILITY_COLORS = {
  nuclear: Cesium.Color.RED,
  rocket: Cesium.Color.ORANGE,
  law_facility: Cesium.Color.PURPLE,
  default: Cesium.Color.GRAY
};

const BLUEPRINT_IMAGES = [
  '/image/BluePrint1.png',
  '/image/BluePrint2.png',
  '/image/BluePrint3 worst case.png'
];

const PDR = () => {
  const cesiumContainer = useRef(null);
  const viewerRef = useRef(null);
  
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [currentFloor, setCurrentFloor] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [blueprintImage, setBlueprintImage] = useState(null);

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
        
        // 초기 한반도 전체 뷰
        const KOREA_VIEW = {
            destination: Cesium.Cartesian3.fromDegrees(127.5, 39.5, 1200000),
            orientation: { heading: 0.0, pitch: Cesium.Math.toRadians(-90.0), roll: 0.0 }
        };
        viewer.camera.setView(KOREA_VIEW);

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
        const firstFloor = building.structure_info ? Object.keys(building.structure_info)[0] : null;
        setCurrentFloor(firstFloor);
        // 랜덤 blueprint 이미지 선택
        const randomIndex = Math.floor(Math.random() * BLUEPRINT_IMAGES.length);
        setBlueprintImage(BLUEPRINT_IMAGES[randomIndex]);
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

  const FloorPlanViewer = ({ rooms }) => {
    if (!rooms || rooms.length === 0) return <Typography variant="caption" sx={{p:2}}>데이터 없음</Typography>;

    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', bgcolor: '#eceff1', borderRadius: 2, border: '1px solid #cfd8dc', overflow: 'hidden' }}>
        {blueprintImage && (
          <Box
            component="img"
            src={blueprintImage}
            alt="Floor Plan Blueprint"
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center'
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Card sx={{ width: '100%', height: 'calc(100vh - 100px)', display: 'flex', bgcolor: '#f5f5f5', m:0, overflow: 'hidden', position: 'relative' }}>
      
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
      </Box>

      <Card sx={{ width: 420, height: '100%', display: 'flex', flexDirection: 'column', borderLeft: '1px solid #ddd', bgcolor: '#f8f9fa' }}>
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

            {selectedSite && !selectedBuilding && (
                <>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#333' }}>
                        내부 건물 목록 ({selectedSite.buildings.length})
                    </Typography>
                    {selectedSite.buildings.map((bldg) => (
                        <Button key={bldg.id} variant="outlined" startIcon={<BusinessIcon />}
                            onClick={() => {
                                interactionTracker.measureResponseSync(
                                  'PDR',
                                  'Building Card Click',
                                  () => {
                                    handleSelectBuilding(bldg, viewerRef.current);
                                    viewerRef.current.flyTo(
                                        viewerRef.current.entities.values.find(e => e.properties?.data?.getValue()?.id === bldg.id),
                                        { duration: 1.0, offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 1000) }
                                    );
                                  },
                                  { buildingName: bldg.name, buildingId: bldg.id }
                                );
                            }}
                            sx={{ justifyContent: 'flex-start', bgcolor: 'white', py: 1.5, borderColor: '#cfd8dc', color: '#455a64' }}>
                            {bldg.name}
                        </Button>
                    ))}
                </>
            )}

            {selectedBuilding && (
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#1a237e', fontSize: '1.1rem' }}>
                            {selectedBuilding.name}
                        </Typography>
                        <Button size="small" onClick={() => {
                          interactionTracker.measureResponseSync(
                            'PDR',
                            'Back to Building List',
                            () => setSelectedBuilding(null),
                            {}
                          );
                        }} variant="outlined">목록</Button>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" sx={{ display:'block', mb: 1, color: '#666', fontWeight:'bold' }}>층/구역 (Zone)</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {selectedBuilding.structure_info && Object.keys(selectedBuilding.structure_info).map(floor => (
                                <Button key={floor} variant={currentFloor === floor ? "contained" : "outlined"} size="small"
                                    onClick={() => {
                                      interactionTracker.measureResponseSync(
                                        'PDR',
                                        'Floor Selection',
                                        () => {
                                          setCurrentFloor(floor);
                                          // 랜덤 blueprint 이미지 선택
                                          const randomIndex = Math.floor(Math.random() * BLUEPRINT_IMAGES.length);
                                          setBlueprintImage(BLUEPRINT_IMAGES[randomIndex]);
                                        },
                                        { floor, buildingName: selectedBuilding.name }
                                      );
                                    }}
                                    sx={{ fontSize: '11px', px: 1, minWidth: 'auto', bgcolor: currentFloor === floor ? '#1a237e' : 'white', color: currentFloor === floor ? 'white' : '#546e7a' }}>
                                    {floor}
                                </Button>
                            ))}
                        </Box>
                    </Box>

                    <Box sx={{ flex: 1, minHeight: 300 }}>
                        {selectedBuilding.structure_info ? (
                             <FloorPlanViewer rooms={selectedBuilding.structure_info[currentFloor]} />
                        ) : <Typography variant="caption">정보 없음</Typography>}
                    </Box>

                    <Box sx={{ mt: 'auto', p: 2, bgcolor: 'white', borderTop: '1px solid #eee' }}>
                         <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#455a64' }}>시설 상태 범례</Typography>
                         <Box sx={{ display: 'flex', gap: 3 }}>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                 <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#e8f5e9', border: '2px solid #66bb6a' }} />
                                 <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>정상 시설</Typography>
                             </Box>
                             <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                 <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#ffebee', border: '2px solid #e57373' }} />
                                 <Typography variant="body2" sx={{ color: '#c62828', fontWeight: 'bold' }}>이상 시설</Typography>
                             </Box>
                         </Box>
                    </Box>
                </Box>
            )}
        </Box>
      </Card>
    </Card>
  );
};

export default PDR;