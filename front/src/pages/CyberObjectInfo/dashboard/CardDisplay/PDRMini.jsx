// PDRMini.jsx - PDR(사이버 물리 환경 구조 가시화) 페이지의 미니 버전
import React, { useEffect, useRef, useState, memo } from 'react';
import * as Cesium from 'cesium';
import { Box, Typography } from '@mui/material';

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODNiZmZiNC04YTUxLTQ1YzgtOWU1Mi1kNDUyY2I2ZDRkNTQiLCJpZCI6MzQyNDEzLCJpYXQiOjE3NTgxNzMyNDh9.zZRyMPovg5ALhNtG2_E-0ED0qHqd_uQQnAG84eQUyG4';

const FACILITIES = [
  { name: '풍계리 핵실험장',       lat: 41.280, lon: 129.085, color: Cesium.Color.RED,    size: 10 },
  { name: '서해위성발사장',         lat: 39.660, lon: 124.705, color: Cesium.Color.ORANGE, size: 10 },
  { name: '조선노동당 본부',        lat: 39.018, lon: 125.744, color: Cesium.Color.PURPLE, size: 9  },
  { name: '영변 핵시설',           lat: 39.794, lon: 125.754, color: Cesium.Color.RED,    size: 10 },
  { name: '신포 조선소',           lat: 40.005, lon: 128.187, color: Cesium.Color.ORANGE, size: 9  },
  { name: '국방과학원 미사일 연구소', lat: 39.150, lon: 125.680, color: Cesium.Color.PURPLE, size: 9  },
];

const PDRMini = () => {
  const cesiumContainer = useRef(null);
  const viewer = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!cesiumContainer.current || viewer.current) return;

    const init = async () => {
      try {
        viewer.current = new Cesium.Viewer(cesiumContainer.current, {
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
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
        });

        const scene = viewer.current.scene;
        viewer.current.cesiumWidget.creditContainer.style.display = 'none';

        // 모든 카메라 인터랙션 비활성화
        const ctrl = scene.screenSpaceCameraController;
        ctrl.enableRotate    = false;
        ctrl.enableTranslate = false;
        ctrl.enableZoom      = false;
        ctrl.enableTilt      = false;
        ctrl.enableLook      = false;

        // 카메라: 북한 전체가 보이는 위치
        viewer.current.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(127.2, 40.0, 1_600_000),
          orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO, roll: 0 },
        });

        // 시설 마커 추가
        FACILITIES.forEach((f) => {
          viewer.current.entities.add({
            position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat, 2000),
            point: {
              pixelSize: f.size,
              color: f.color,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1.5,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
            label: {
              text: f.name,
              font: '11px sans-serif',
              fillColor: Cesium.Color.WHITE,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              pixelOffset: new Cesium.Cartesian2(0, -14),
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        });

        const resizeObserver = new ResizeObserver(() => {
          if (viewer.current && !viewer.current.isDestroyed()) {
            viewer.current.resize();
            scene.requestRender();
          }
        });
        resizeObserver.observe(cesiumContainer.current);
        viewer.current._resizeObs = resizeObserver;

        scene.requestRender();
      } catch (err) {
        setError(`지도 초기화 실패: ${err.message}`);
      }
    };

    init();

    return () => {
      if (viewer.current) {
        viewer.current._resizeObs?.disconnect();
        if (!viewer.current.isDestroyed()) viewer.current.destroy();
        viewer.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#1a1a2e' }}>
        <Typography variant="caption" color="#ff6b6b">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={cesiumContainer}
      sx={{
        width: '100%', height: '100%',
        position: 'absolute', top: 0, left: 0,
        overflow: 'hidden',
        '& .cesium-viewer, & .cesium-widget, & .cesium-widget canvas': {
          width: '100% !important',
          height: '100% !important',
          position: 'absolute !important',
        },
      }}
    />
  );
};

export default memo(PDRMini);
