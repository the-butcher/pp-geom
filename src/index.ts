import { Feature, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon, Position } from "geojson";
import { Projection } from "./Projection";
import { Transformation } from "./Transformation";

export { Projection, Transformation };

export type TUnionPoint = Point | MultiPoint;
export type TUnionPolyline = LineString | MultiLineString;
export type TUnionPolygon = Polygon | MultiPolygon;
export type TUnionGeometry = TUnionPoint | TUnionPolyline | TUnionPolygon;

export interface IMatrix2D {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}

export type TProjectableFeature<T extends TUnionGeometry, P extends IProjectableProperties> = Feature<T, P>;

export type TUnitAbbr = 'm' | 'ft';
export type TUnitName = 'meters' | 'feet';
export type TProjType = 'proj' | '4326';

/**
 * definition for types that can convert between the raster spatial reference and WGS84/EPSG:4326
 *
 * @author h.fleischer
 * @since 21.04.2025
 */
export interface IProjectableProperties extends IProjectionProperties {
    projType: TProjType;
}

/**
 * definition for types that describe the conversion between an arbitrary spatial reference and WGS84/EPSG:4326
 *
 * @author h.fleischer
 * @since 21.04.2025
 */
export interface IProjectionProperties {

    projectors: { [K in TProjType]: (coordinate: Position) => Position };

    // /**
    //  * convert a coordinate in WGS84/EPSG:4326 space to local space
    //  * @param coordinates
    //  */
    // convert4326ToProj: (coordinate: Position) => Position; // forward
    // /**
    //  * convert a coordinate in local space to WGS84/EPSG:4326 space
    //  * @param coordinates
    //  */
    // convertProjTo4326: (coordinate: Position) => Position; // reverse

    /**
     * name of the raster spatial reference units (meteres, feet, ...)
     */
    unitName: TUnitName;
    /**
     * abbrevation of the raster spatial reference units
     */
    unitAbbr: TUnitAbbr;
    /**
     * meters per linear unit
     */
    metersPerUnit: number;
}