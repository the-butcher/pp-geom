import { BBox, FeatureCollection, LineString, MultiLineString, MultiPolygon, Point, Polygon } from "geojson";
import * as turf from '@turf/turf';
import { TUnionPoint, TUnionPolygon, TUnionPolyline } from ".";

export class PPGeometry {

    static emptyMultiPolyline(): MultiLineString {
        return {
            type: 'MultiLineString',
            coordinates: []
        };
    }

    static emptyMultiPolygon(): MultiPolygon {
        return {
            type: 'MultiPolygon',
            coordinates: []
        };
    }

    static bboxClipMultiPolygon(multiPolygon: MultiPolygon, bbox: BBox): MultiPolygon {

        const clipped = turf.bboxClip(multiPolygon, bbox);
        if (clipped.geometry.type === 'MultiPolygon') {
            return clipped.geometry;
        } else if (clipped.geometry.type === 'Polygon') {
            return {
                type: 'MultiPolygon',
                coordinates: [clipped.geometry.coordinates]
            };
        } else {
            return PPGeometry.emptyMultiPolygon();
        }

    }

    static bboxClipMultiPolyline(multiPolyline: MultiLineString, bbox: BBox): MultiLineString {

        const clipped = turf.bboxClip(multiPolyline, bbox);
        if (clipped.geometry.type === 'MultiLineString') {
            return clipped.geometry;
        } else if (clipped.geometry.type === 'LineString') {
            return {
                type: 'MultiLineString',
                coordinates: [clipped.geometry.coordinates]
            };
        } else {
            return PPGeometry.emptyMultiPolyline();
        }

    }

    static destructurePolygons(unionPolygon: TUnionPolygon): Polygon[] {

        const result: Polygon[] = [];
        if (unionPolygon.type === 'MultiPolygon') {
            unionPolygon.coordinates.forEach(coordinates => {
                result.push({
                    type: 'Polygon',
                    coordinates
                });
            });
        } else if (unionPolygon.type === 'Polygon') {
            result.push(unionPolygon);
        }
        return result;

    }

    static destructurePolylines(unionPolyline: TUnionPolyline): LineString[] {
        const result: LineString[] = [];
        if (unionPolyline.type === 'MultiLineString') {
            unionPolyline.coordinates.forEach(coordinates => {
                result.push({
                    type: 'LineString',
                    coordinates
                });
            });
        } else if (unionPolyline.type === 'LineString') {
            result.push(unionPolyline);
        }
        return result;
    }

    static unionPolygons(input: Polygon[]): TUnionPolygon {

        if (input.length > 1) {
            const featureCollection = turf.featureCollection(input.map(p => turf.feature(p)));
            return turf.union(featureCollection)!.geometry;
        } else if (input.length === 1) {
            return input[0];
        } else {
            return {
                type: 'Polygon',
                coordinates: []
            };
        }

    }

    static unionPolylines(input: LineString[]): TUnionPolyline {

        // console.log('line union input', input.length);
        const overlaps = PPGeometry.emptyMultiPolyline();
        if (input.length > 1) {
            for (let i = 0; i < input.length - 1; i++) {

                for (let j = i + 1; j < input.length; j++) {
                    // const overlapping = turf.lineOverlap(input[i], input[j]);
                    if (turf.booleanOverlap(input[i], input[j])) {

                        // input[i].coordinates.push(...input[j].coordinates);
                        // input.splice(j, 1);

                        // turf.cleanCoords(input[i], {
                        //     mutate: true
                        // });
                        // console.log('overlapping', i, j);
                        overlaps.coordinates.push(input[i].coordinates);
                        overlaps.coordinates.push(input[j].coordinates);
                        // break;
                    }

                }
                // break;

            }
            return overlaps;
            // const featureCollection = turf.featureCollection(input.map(p => turf.feature(p)));
            // return turf.union(featureCollection)!.geometry;
        } else if (input.length === 1) {
            return input[0];
        } else {
            return {
                type: 'LineString',
                coordinates: []
            };
        }

    }

    static restructurePolygons(polygons: Polygon[]): MultiPolygon {
        return {
            type: 'MultiPolygon',
            coordinates: [...polygons.map(p => p.coordinates)]
        };
    }

    static restructurePolylines(polylines: LineString[]): MultiLineString {
        return {
            type: 'MultiLineString',
            coordinates: [...polylines.map(p => p.coordinates)]
        };
    }


    static destructurePoints(unionPoints: FeatureCollection<TUnionPoint>): Point[] {

        const result: Point[] = [];
        unionPoints.features.map(f => f.geometry).forEach(unionPoint => {
            if (unionPoint.type === 'MultiPoint') {
                unionPoint.coordinates.forEach(coordinates => {
                    result.push({
                        type: 'Point',
                        coordinates
                    });
                });
            } else if (unionPoint.type === 'Point') {
                result.push(unionPoint);
            }
        });

        return result;

    }


}