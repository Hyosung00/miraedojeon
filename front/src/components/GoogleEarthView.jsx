import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';

const GoogleEarthView = () => {
  const mapRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initMap = () => {
      try {
        if (window.google && window.google.maps) {
          const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 0, lng: 0 },
            zoom: 2,
            mapTypeId: 'satellite',
            tilt: 0,
            heading: 0,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            rotateControl: true,
            scaleControl: false,
            panControl: false,
            styles: [
              {
                featureType: 'all',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          });

          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Google Maps 초기화 오류:', err);
        setError('지도를 불러올 수 없습니다.');
      }
    };

    // Google Maps API가 로드되었는지 확인
    if (window.google && window.google.maps) {
      initMap();
    } else {
      // API가 아직 로드되지 않았다면 대기
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps);
          initMap();
        }
      }, 100);

      // 10초 후 타임아웃
      setTimeout(() => {
        clearInterval(checkGoogleMaps);
        if (!isLoaded) {
          setError('Google Maps API 로드 시간 초과');
        }
      }, 10000);
    }
  }, [isLoaded]);

  if (error) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          borderRadius: 2
        }}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px'
        }}
      />
      {!isLoaded && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.1)',
            borderRadius: 2
          }}
        >
          <Typography>지도 로딩 중...</Typography>
        </Box>
      )}

    </Box>
  );
};

export default GoogleEarthView;