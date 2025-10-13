// components/CountryBorders.jsx
import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { geoToSphereCoords } from '../utils/geoHelpers';
import worldGeoJSON from '../assets/world_countries.json'; // TopoJSON or GeoJSON

export default function CountryBorders() {
    const positions = useMemo(() => {
        const allPoints = [];

        for (const feature of worldGeoJSON.features) {
            const pts = geoToSphereCoords(feature);
            allPoints.push(...pts);
        }

        return new Float32Array(allPoints);
    }, []);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    array={positions}
                    count={positions.length / 3}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial color="#00ff00" size={0.01} sizeAttenuation />
        </points>
    );
}
