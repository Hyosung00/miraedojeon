// utils/geoHelpers.js
import * as d3 from 'd3-geo';

export function geoToSphereCoords(geoJsonFeature, radius = 2.02) {
    const projection = d3.geoOrthographic().translate([0, 0]).scale(radius);
    return geoJsonFeature.geometry.coordinates.flatMap(polygon =>
        polygon.flatMap(ring =>
            ring.map(([lon, lat]) => {
                const [x, y] = projection([lon, lat]);
                const z = Math.sqrt(radius ** 2 - x ** 2 - y ** 2); // hemispheric correction
                return [x, y, z];
            })
        )
    );
}
