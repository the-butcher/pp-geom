import { BBox, Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, MultiLineString, MultiPolygon, Point, Polygon, Position } from "geojson";
import * as turf from '@turf/turf';
import { IRingDeviation, TUnionPoint, TUnionPolygon, TUnionPolyline } from ".";

export class PPGeometry {

    static readonly DEFAULT_SIMPLIFY_TOLERANCE = 0.000001;
    static readonly GRAD_TO_RAD = Math.PI / 180;
    static readonly RAD_TO_GRAD = 180 / Math.PI;

    static bboxAtCenter(center: Position, width: number, height: number): BBox {
        return [
            center[0] - width / 2,
            center[1] - height / 2,
            center[0] + width / 2,
            center[1] + height / 2
        ];
    }

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

    static cleanAndSimplify(geometry: Geometry) {

        // there could be a bug in turf when cleaning MultilineStrings where single lines collapse to less than 3 points
        if (geometry.type === 'MultiLineString') {
            const polylines = PPGeometry.destructurePolylines(geometry);
            polylines.forEach(polyline => {
                turf.cleanCoords(polyline, {
                    mutate: true
                });
            });
            geometry = PPGeometry.restructurePolylines(polylines);
        } else {
            turf.cleanCoords(geometry, {
                mutate: true
            });
        }

        turf.simplify(geometry, {
            mutate: true,
            tolerance: PPGeometry.DEFAULT_SIMPLIFY_TOLERANCE,
            highQuality: true
        });
        if (geometry.type === 'MultiPolygon') {
            geometry = PPGeometry.cleanEmptyPolygons(geometry as MultiPolygon);
        } else if (geometry.type === 'MultiLineString') {
            geometry = PPGeometry.cleanEmptyPolylines(geometry as MultiLineString);
        }
        turf.cleanCoords(geometry, {
            mutate: true
        });

    }

    static cleanEmptyPolylines(multiPolyline: MultiLineString): MultiLineString {

        const result = PPGeometry.emptyMultiPolyline();
        multiPolyline.coordinates.forEach(polyline => {
            if (turf.length(turf.feature({
                type: 'LineString',
                coordinates: polyline
            }), {
                units: 'meters'
            }) > 0) {
                result.coordinates.push(polyline);
            }
        });
        return result;

    }

    static cleanEmptyPolygons(multiPolygon: MultiPolygon): MultiPolygon {

        const result = PPGeometry.emptyMultiPolygon();
        multiPolygon.coordinates.forEach(polygon => {
            if (turf.area(turf.feature({
                type: 'Polygon',
                coordinates: polygon
            })) > 0) {
                result.coordinates.push(polygon);
            }
            // if (polygon.length > 0 && polygon[0].length > 4) { // is there an outer ring having enough coordinates?
            //     result.coordinates.push(polygon);
            // }
        });
        return result;

    }

    static booleanWithin(bbox: BBox, point: Position) {
        return (point[0] >= bbox[0] && point[0] <= bbox[2] && point[1] >= bbox[1] && point[1] <= bbox[3]);
    }

    static booleanWithinRange(val: number, min: number, max: number): boolean {
        return val >= min && val <= max;
    }

    static booleanBboxOverlap(bboxA: BBox, bboxB: BBox) {

        let xOverlap = false;
        xOverlap = xOverlap || PPGeometry.booleanWithinRange(bboxA[0], bboxB[0], bboxB[2]);
        xOverlap = xOverlap || PPGeometry.booleanWithinRange(bboxA[2], bboxB[0], bboxB[2]);
        xOverlap = xOverlap || PPGeometry.booleanWithinRange(bboxB[0], bboxA[0], bboxA[2]);
        xOverlap = xOverlap || PPGeometry.booleanWithinRange(bboxB[2], bboxA[0], bboxA[2]);

        let yOverlap = false;
        yOverlap = yOverlap || PPGeometry.booleanWithinRange(bboxA[1], bboxB[1], bboxB[3]);
        yOverlap = yOverlap || PPGeometry.booleanWithinRange(bboxA[3], bboxB[1], bboxB[3]);
        yOverlap = yOverlap || PPGeometry.booleanWithinRange(bboxB[1], bboxA[1], bboxA[3]);
        yOverlap = yOverlap || PPGeometry.booleanWithinRange(bboxB[3], bboxA[1], bboxA[3]);

        return xOverlap && yOverlap;

    }

    static filterPolylinesShorterThan(multiPolyline: MultiLineString, minLength: number): MultiLineString {

        const polylines = PPGeometry.destructurePolylines(multiPolyline).filter(p => turf.length(turf.feature(p), {
            units: 'meters'
        }) >= minLength);
        return PPGeometry.restructurePolylines(polylines);

    }

    static connectMultiPolyline(multiPolyline: MultiLineString, toleranceMeters: number): MultiLineString {

        const polylinesA = PPGeometry.destructurePolylines(multiPolyline);
        const polylinesB = PPGeometry.connectPolylines(polylinesA, toleranceMeters);
        const result = PPGeometry.restructurePolylines(polylinesB);
        // console.log(`connected polylines (${polylinesA.length} -> ${polylinesB.length}) ...`);
        // turf.cleanCoords(result, {
        //     mutate: true
        // })
        return result;

    }


    static connectPolylines(polylines2: LineString[], toleranceMeters: number): LineString[] {

        const results: LineString[] = [];
        const inclone: LineString[] = [...polylines2];

        while (inclone.length > 0) {

            let minDistance = toleranceMeters;
            let curDistance: number;
            let minConnects: [number, boolean, number, boolean] = [-1, false, -1, false];

            const position00 = inclone[0].coordinates[0]; // start of polyline0
            const position0L = inclone[0].coordinates[inclone[0].coordinates.length - 1]; // end of polyline0

            for (let i = 1; i < inclone.length; i++) {

                const positionI0 = inclone[i].coordinates[0]; // start of polylineI
                const positionIL = inclone[i].coordinates[inclone[i].coordinates.length - 1]; // end of polylineI

                curDistance = turf.distance(position00, positionI0, {
                    units: 'meters'
                });
                if (curDistance < minDistance) {
                    minDistance = curDistance;
                    minConnects = [0, true, i, false]; // index 0 on polyline 0, index 0 in polyline i
                }

                curDistance = turf.distance(position00, positionIL, {
                    units: 'meters'
                });
                if (curDistance < minDistance) {
                    minDistance = curDistance;
                    minConnects = [0, true, i, true]; // index 0 on polyline 0, index 0 in polyline i
                }

                curDistance = turf.distance(position0L, positionI0, {
                    units: 'meters'
                });
                if (curDistance < minDistance) {
                    minDistance = curDistance;
                    minConnects = [0, false, i, false]; // index 0 on polyline 0, index 0 in polyline i
                }

                curDistance = turf.distance(position0L, positionIL, {
                    units: 'meters'
                });
                if (curDistance < minDistance) {
                    minDistance = curDistance;
                    minConnects = [0, false, i, true]; // index 0 on polyline 0, index 0 in polyline i
                }

            }


            if (minConnects[0] >= 0 && minConnects[2] >= 0) {

                // console.log('minConnects', minConnects, minDistance);

                inclone.push({
                    type: 'LineString',
                    coordinates: [
                        ...(minConnects[1] ? inclone[minConnects[0]].coordinates.reverse() : inclone[minConnects[0]].coordinates),
                        ...(minConnects[3] ? inclone[minConnects[2]].coordinates.reverse() : inclone[minConnects[2]].coordinates),
                    ]
                });

                // remove, in that order
                inclone.splice(minConnects[2], 1);
                inclone.splice(minConnects[0], 1);

            } else {
                results.push(...inclone.splice(0, 1));
            }

        }

        return results.map(p => turf.cleanCoords(p, {
            mutate: true
        }));

    }

    static connectBufferFeatures(bufferLines: Feature<LineString>[]): LineString[] {

        for (let bufferFeatureIndex = 0; bufferFeatureIndex < bufferLines.length; bufferFeatureIndex++) {

            bufferLines[bufferFeatureIndex].properties!.index = bufferFeatureIndex;

            const coordinatesA = bufferLines[bufferFeatureIndex].geometry.coordinates;

            const coordinateCount = coordinatesA.length;
            const coordinateSplit = Math.floor(coordinateCount * Math.random());

            const coordinatesB: Position[] = [
                ...coordinatesA.slice(coordinateSplit), // from the split coordinate
                ...coordinatesA.slice(1, coordinateSplit + 1), // skip closing coordinate and repeat split coordinate for new closing coordinate
            ];

            // console.log(coordinateSplit, coordinatesA, coordinatesB);

            bufferLines[bufferFeatureIndex].geometry.coordinates = coordinatesB;


        }

        const ringDeviations: IRingDeviation[] = [];

        // console.log(`connecting polylines2, finding connections ...`);
        for (let bufferFeatureIndex = 0; bufferFeatureIndex < bufferLines.length; bufferFeatureIndex++) {

            const innerFeature = bufferLines[bufferFeatureIndex];
            const innerFeatureId = innerFeature.properties!.id;
            const innerFeatureDs = innerFeature.properties!.ds;
            const lastPoint = innerFeature.geometry.coordinates[innerFeature.geometry.coordinates.length - 1]; // last coordinate of polyline a

            // if (bufferFeatureIndex % 100 === 0) {
            //     console.log(`connecting buffer features, finding connections (${bufferFeatureIndex}/${bufferLines.length}) ...`);
            // }

            if (innerFeatureDs > 0) {

                const outerFeatureCandidates = bufferLines.filter(f => f.properties!.id === innerFeatureId && f.properties!.ds === innerFeatureDs - 1);

                let minDistance = Number.MAX_VALUE;
                let curDistance: number;
                let minIndex: number = -1;

                let minPoint: Feature<Point, {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    [key: string]: any;
                    dist: number;
                    index: number;
                    multiFeatureIndex: number;
                    location: number;
                }> | undefined;
                let curPoint: Feature<Point, {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    [key: string]: any;
                    dist: number;
                    index: number;
                    multiFeatureIndex: number;
                    location: number;
                }> | undefined;

                for (let c = 0; c < outerFeatureCandidates.length; c++) {

                    curPoint = turf.nearestPointOnLine(outerFeatureCandidates[c], lastPoint);
                    curDistance = turf.distance(curPoint, lastPoint, {
                        units: 'meters'
                    });
                    if (curDistance < minDistance) {
                        minDistance = curDistance;
                        minPoint = curPoint;
                        minIndex = outerFeatureCandidates[c].properties!.index;
                    }

                }

                if (minPoint && minIndex) {

                    ringDeviations.push({
                        smPolygonIndex: bufferFeatureIndex,
                        lgPolygonIndex: minIndex,
                        deviationProps: {
                            ...minPoint.properties,
                            point: minPoint.geometry.coordinates
                        }
                    });

                }

            }

        }

        const tracedPolylineIndices: number[] = [];
        const tracePolylineWithDeviations = (curPolylineIndex: number, coordinates: Position[]): void => {

            tracedPolylineIndices.push(curPolylineIndex);

            const polyDeviations = ringDeviations.filter(d => d.lgPolygonIndex == curPolylineIndex);
            polyDeviations.sort((a, b) => (a.deviationProps.index - b.deviationProps.index) * 100 + a.deviationProps.location - b.deviationProps.location);

            if (polyDeviations.length > 0) {

                // const coordinates: Position[] = [];
                let coordIndex = 0;
                for (let i = 0; i < polyDeviations.length; i++) {
                    // up to the deviation
                    for (; coordIndex <= polyDeviations[i].deviationProps.index; coordIndex++) {
                        coordinates.push(bufferLines[curPolylineIndex].geometry.coordinates[coordIndex]);
                    }
                    // deviation point
                    coordinates.push(polyDeviations[i].deviationProps.point);
                    // around inner polygon
                    tracePolylineWithDeviations(polyDeviations[i].smPolygonIndex!, coordinates);
                    // deviation point
                    coordinates.push(polyDeviations[i].deviationProps.point);
                }
                // rest of polygon
                for (; coordIndex < bufferLines[curPolylineIndex].geometry.coordinates.length; coordIndex++) {
                    coordinates.push(bufferLines[curPolylineIndex].geometry.coordinates[coordIndex]);
                }
                // return coordinates;

            } else {
                coordinates.push(...bufferLines[curPolylineIndex].geometry.coordinates);
                // no deviation from this polyline
                // return bufferLines[curPolylineIndex].geometry.coordinates;
            }

        };

        // console.log('ringDeviations', ringDeviations);

        // console.log(`connecting polylines2, applying connections (${ringDeviations.length}) ...`);
        const results: LineString[] = [];
        for (let bufferFeatureIndex = 0; bufferFeatureIndex < bufferLines.length; bufferFeatureIndex++) {

            if (tracedPolylineIndices.indexOf(bufferFeatureIndex) === -1) {
                const coordinates: Position[] = [];
                tracePolylineWithDeviations(bufferFeatureIndex, coordinates);
                results.push({
                    type: 'LineString',
                    coordinates
                });
            }

        }

        return results.map(p => turf.cleanCoords(p, {
            mutate: true
        }));

    }

    static dashMultiPolyline(multiPolyline: MultiLineString, dashArray: [number, number]): MultiLineString {

        const dashLengthBase = dashArray[0] / 2 + dashArray[1] + dashArray[0] / 2;
        const polylinesA = PPGeometry.destructurePolylines(multiPolyline);
        const polylinesB = PPGeometry.connectPolylines(polylinesA, 10);
        const polylinesC: LineString[] = [];
        polylinesB.forEach(polylineB => {
            const feature04 = turf.feature(polylineB);
            const length = turf.length(feature04, {
                units: 'meters'
            });
            let dashCount = Math.round(length / dashLengthBase);
            if (dashCount % 2 === 0) {
                dashCount++;
            };
            const dashLength = length / dashCount; // full dash length with 2 semi spaces on the front and aback of the dash
            const dashLength0 = dashLength * dashArray[0] / dashLengthBase;
            const dashLength1 = dashLength * dashArray[1] / dashLengthBase;
            // console.log(dashLength, dashLengthBase, dashLength0, dashArray[0]);
            // console.log(length, dashCount, dashLength);
            for (let i = 0; i < dashCount; i++) {
                const coordinateA = turf.along(feature04, i * dashLength + dashLength0, {
                    units: 'meters'
                }).geometry.coordinates;
                const coordinateB = turf.along(feature04, i * dashLength + dashLength0 + dashLength1, {
                    units: 'meters'
                }).geometry.coordinates;
                polylinesC.push({
                    type: 'LineString',
                    coordinates: [coordinateA, coordinateB]
                });
            }
        });
        return PPGeometry.restructurePolylines(polylinesC);

    }

    static clipMultiPolyline(multiPolyline: MultiLineString, bufferFeature: Feature<TUnionPolygon>): MultiLineString {

        const remainingLines: LineString[] = [];

        // let counter = 0;

        // console.log('bufferFeature', bufferFeature.geometry.coordinates.length);
        const bufferPolygons = PPGeometry.destructurePolygons(bufferFeature.geometry);
        const bufferBBoxes = bufferPolygons.map(p => turf.bbox(p));

        multiPolyline.coordinates.forEach(polyline => {

            // if (counter % 1000 === 0) {
            //     console.log('counter', counter);
            // }
            // counter++

            const polylineS: LineString = {
                type: 'LineString',
                coordinates: polyline
            };
            PPGeometry.cleanAndSimplify(polylineS);

            const polylineSFeature = turf.feature(polylineS);
            const polylineBBox = turf.bbox(polylineSFeature);

            let overlap = false;
            for (let i = 0; i < bufferBBoxes.length; i++) {
                if (PPGeometry.booleanBboxOverlap(bufferBBoxes[i], polylineBBox)) {
                    overlap = true;
                    break;
                }
            }
            if (overlap) {

                const polylineSLength = turf.length(polylineSFeature, {
                    units: 'meters'
                });

                if (polylineSLength > 0) {

                    const lineIntersects = turf.lineIntersect(polylineSFeature, bufferFeature);
                    const indxIntersects: Feature<Point, GeoJsonProperties>[] = [];

                    indxIntersects.push(turf.feature({
                        'type': 'Point',
                        coordinates: polylineS.coordinates[0]
                    }, {
                        location: 0
                    }));
                    lineIntersects.features.forEach(lineIntersect => {
                        indxIntersects.push(turf.nearestPointOnLine(polylineS, lineIntersect.geometry, {
                            units: 'meters'
                        }));
                    });
                    indxIntersects.push(turf.feature({
                        'type': 'Point',
                        coordinates: polylineS.coordinates[polylineS.coordinates.length - 1]
                    }, {
                        location: polylineSLength
                    }));
                    indxIntersects.sort((a, b) => a.properties!.location - b.properties!.location);

                    const indxIntersectsNoDuplicates: Feature<Point, GeoJsonProperties>[] = [];
                    let location = -1;
                    for (let i = 0; i < indxIntersects.length; i++) {
                        const locationI = indxIntersects[i].properties!.location;
                        if (locationI !== location) {
                            indxIntersectsNoDuplicates.push(indxIntersects[i]);
                            location = locationI;
                        }
                    }

                    if (indxIntersectsNoDuplicates.length > 2) {

                        for (let i = 0; i < indxIntersectsNoDuplicates.length - 1; i++) {

                            const distA = indxIntersectsNoDuplicates[i].properties!.location;
                            const distB = indxIntersectsNoDuplicates[i + 1].properties!.location;
                            const segment = turf.lineSliceAlong(polylineS, distA, distB, {
                                units: 'meters'
                            });

                            const length = turf.length(segment, {
                                units: 'meters'
                            });
                            const pof = turf.along(segment, length / 2, {
                                units: 'meters'
                            });
                            if (turf.booleanWithin(pof, bufferFeature)) { //  && turf.length(feature, { units: 'meters' }) > maxKeepLength
                                // dont keep
                            } else {
                                remainingLines.push(segment.geometry);
                            }

                        }

                    } else {

                        const pof = turf.along(polylineS, polylineSLength / 2, {
                            units: 'meters'
                        });
                        if (turf.booleanWithin(pof, bufferFeature!)) {
                            // dont keep
                        } else {
                            remainingLines.push(polylineS);
                        }

                        // remainingLines.push(polylineS);

                    }

                }

            } else {
                remainingLines.push(polylineS);
            }

        });
        return {
            type: 'MultiLineString',
            coordinates: remainingLines.map(c => c.coordinates)
        };

    }

    static bufferOutAndIn(multiPolygon: MultiPolygon, ...distances: number[]): Polygon[] {

        let bufferable: TUnionPolygon = PPGeometry.cleanEmptyPolygons(multiPolygon);
        if (bufferable.coordinates.length > 0) {
            for (let i = 0; i < distances.length; i++) {
                const bufferFeature: Feature<Polygon | MultiPolygon> = turf.buffer(bufferable, distances[i], {
                    units: 'meters'
                }) as Feature<Polygon | MultiPolygon>;
                if (bufferFeature) {
                    bufferable = bufferFeature.geometry;
                } else {
                    break;
                }
            }
        }
        return PPGeometry.destructurePolygons(bufferable);

    }

    static bufferCollect2(unionPolygon: TUnionPolygon, includeInput: boolean, ...distances: number[]): Feature<LineString>[] {

        const results: Feature<LineString>[] = [];

        const bufferableFeaturesA: Feature<Polygon>[] = [];
        // if (unionPolygon.type === 'MultiPolygon') {
        const polygons = PPGeometry.destructurePolygons(unionPolygon);
        polygons.forEach(polygon => {
            bufferableFeaturesA.push(turf.feature(polygon, {
                id: Math.ceil((Math.random() + 10) * Date.now()).toString(16).padStart(16, '0') // .substring(0, 16);
            }));
        });
        // } else {
        //     bufferableFeaturesA.push(turf.feature(unionPolygon, {
        //         id: Uid.random16()
        //     }));
        // }

        if (includeInput) {
            bufferableFeaturesA.forEach(bufferableFeatureA => {
                bufferableFeatureA.geometry.coordinates.forEach(ring => {
                    results.push(turf.feature({
                        type: 'LineString',
                        coordinates: ring
                    }, {
                        id: bufferableFeatureA.properties!.id,
                        ds: 0
                    }));
                });
            });
        }

        // for each single polygon
        for (let a = 0; a < bufferableFeaturesA.length; a++) {

            let bufferableFeaturesB: Feature<Polygon>[] = [bufferableFeaturesA[a]]; // initial set of bufferableFeaturesB
            for (let i = 0; i < distances.length; i++) {

                const bufferableFeaturesC: Feature<Polygon>[] = [];
                for (let b = 0; b < bufferableFeaturesB.length; b++) {
                    const bufferFeature: Feature<Polygon | MultiPolygon> = turf.buffer(bufferableFeaturesB[b], distances[i], {
                        units: 'meters'
                    }) as Feature<Polygon | MultiPolygon>;
                    if (bufferFeature) {
                        if (bufferFeature.geometry.type === 'MultiPolygon') {
                            bufferFeature.geometry.coordinates.forEach(coordinates => {
                                bufferableFeaturesC.push(turf.feature({
                                    type: 'Polygon',
                                    coordinates
                                }, {
                                    id: bufferableFeaturesA[a].properties!.id
                                }));
                                coordinates.forEach(ring => {
                                    results.push(turf.feature({
                                        type: 'LineString',
                                        coordinates: ring
                                    }, {
                                        id: bufferableFeaturesA[a].properties!.id,
                                        ds: i + 1
                                    }));
                                });
                            });
                        } else if (bufferFeature.geometry.type === 'Polygon') {
                            bufferableFeaturesC.push(turf.feature(bufferFeature.geometry, {
                                id: bufferableFeaturesA[a].properties!.id
                            }));
                            bufferFeature.geometry.coordinates.forEach(ring => {
                                results.push(turf.feature({
                                    type: 'LineString',
                                    coordinates: ring
                                }, {
                                    id: bufferableFeaturesA[a].properties!.id,
                                    ds: i + 1
                                }));
                            });
                        }
                    }

                }
                // results.push(...bufferableFeaturesC);
                bufferableFeaturesB = bufferableFeaturesC;

            }


        }

        return results;

    }

    static bufferCollect1(unionPolygon: TUnionPolygon, includeInput: boolean, ...distances: number[]): Polygon[] {

        const polygons: Polygon[] = [];
        if (includeInput) {
            polygons.push(...PPGeometry.destructurePolygons(unionPolygon));
        }

        let bufferableGeometry: Polygon | MultiPolygon = unionPolygon;
        if (bufferableGeometry.coordinates.length > 0) {
            for (let i = 0; i < distances.length; i++) {
                const bufferFeature: Feature<Polygon | MultiPolygon> = turf.buffer(bufferableGeometry, distances[i], {
                    units: 'meters'
                }) as Feature<Polygon | MultiPolygon>;
                if (bufferFeature) {

                    bufferableGeometry = bufferFeature.geometry;
                    PPGeometry.cleanAndSimplify(bufferableGeometry);

                    if (bufferableGeometry.type === 'MultiPolygon') {
                        bufferableGeometry.coordinates.forEach(coordinates => {
                            polygons.push({
                                type: 'Polygon',
                                coordinates
                            });
                        });
                    } else if (bufferableGeometry.type === 'Polygon') {
                        polygons.push(bufferableGeometry);
                    }

                } else {
                    break;
                }
            }
        }
        return polygons;

    }


}