import { LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon, Position } from "geojson";
import { IProjectableProperties, TProjectableFeature, TProjType, TUnionGeometry } from ".";

export class Projection {

    static projectFeature<T extends TUnionGeometry, P extends IProjectableProperties>(projectableFeature: TProjectableFeature<T, P>, projType: TProjType): TProjectableFeature<T, P> {
        if (projectableFeature.properties.projType === projType) {
            return projectableFeature;
        } else {
            return {
                ...projectableFeature,
                geometry: this.projectGeometry(projectableFeature.geometry, projectableFeature.properties.projectors[projType]),
                properties: {
                    ...projectableFeature.properties,
                    projType
                }
            };
        }
    }

    static projectGeometry<T extends TUnionGeometry>(projectableGeometry: T, projector: (position: Position) => Position): T {
        if (projectableGeometry.type === 'MultiPolygon') {
            return this.projectMultiPolygon(projectableGeometry, projector) as T;
        } else if (projectableGeometry.type === 'Polygon') {
            return this.projectPolygon(projectableGeometry, projector) as T;
        } else if (projectableGeometry.type === 'MultiLineString') {
            return this.projectMultiPolylines(projectableGeometry, projector) as T;
        } else if (projectableGeometry.type === 'LineString') {
            return this.projectPolyline(projectableGeometry, projector) as T;
        } else if (projectableGeometry.type === 'MultiPoint') {
            return this.projectMultiPoint(projectableGeometry, projector) as T;
        } else {
            return this.projectPoint(projectableGeometry, projector) as T;
        }
    }

    static projectMultiPolygon(polygons: MultiPolygon, projector: (position: Position) => Position): MultiPolygon {
        return {
            ...polygons,
            coordinates: Projection.projectPosition3(polygons.coordinates, projector)
        };
    }

    static projectPolygon(polygon: Polygon, projector: (position: Position) => Position): Polygon {
        return {
            ...polygon,
            coordinates: Projection.projectPosition2(polygon.coordinates, projector)
        };
    }

    static projectMultiPolylines(polylines: MultiLineString, projector: (position: Position) => Position): MultiLineString {
        return {
            ...polylines,
            coordinates: Projection.projectPosition2(polylines.coordinates, projector)
        };
    }

    static projectPolyline(polyline: LineString, projector: (position: Position) => Position): LineString {
        return {
            ...polyline,
            coordinates: Projection.projectPosition1(polyline.coordinates, projector)
        };
    }

    static projectMultiPoint(points: MultiPoint, projector: (position: Position) => Position): MultiPoint {
        return {
            ...points,
            coordinates: Projection.projectPosition1(points.coordinates, projector)
        };
    }

    static projectPoint(point: Point, projector: (position: Position) => Position): Point {
        return {
            ...point,
            coordinates: Projection.projectPosition(point.coordinates, projector)
        };
    }

    /**
     * Get a projected copy of the given three dimensional position array
     * @param positions
     * @param matrix
     * @returns
     */
    static projectPosition3(positions: Position[][][], projector: (position: Position) => Position): Position[][][] {
        return positions.map(p => Projection.projectPosition2(p, projector));
    }

    /**
     * Get a projected copy of the given two dimensional position array
     * @param positions
     * @param matrix
     * @returns
     */
    static projectPosition2(positions: Position[][], projector: (position: Position) => Position): Position[][] {
        return positions.map(p => Projection.projectPosition1(p, projector));
    }

    /**
     * Get a projected copy of the given one dimensional position array
     * @param positions
     * @param matrix
     * @returns
     */
    static projectPosition1(positions: Position[], projector: (position: Position) => Position): Position[] {
        return positions.map(p => Projection.projectPosition(p, projector));
    }

    /**
     * Get a projected copy of the given Position
     * @param position
     * @param transform
     * @returns
     */
    static projectPosition(position: Position, projector: (position: Position) => Position): Position {
        return projector(position);
    }

}