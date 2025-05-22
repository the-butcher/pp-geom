import { MultiPolygon, Position } from "geojson";
import { IMatrix2D } from ".";

export class PPTransformation {

    /**
     * Get a transformed copy of the given MultiPolygon
     * @param positions
     * @param matrix
     * @returns
     */
    static transformMultiPolygon(polygons: MultiPolygon, matrix: IMatrix2D): MultiPolygon {
        return {
            type: 'MultiPolygon',
            coordinates: PPTransformation.transformPosition3(polygons.coordinates, matrix)
        }
    }

    /**
     * Get a transformed copy of the given three dimensional position array
     * @param positions
     * @param matrix
     * @returns
     */
    static transformPosition3(positions: Position[][][], matrix: IMatrix2D): Position[][][] {
        return positions.map(p => PPTransformation.transformPosition2(p, matrix));
    }

    /**
     * Get a transformed copy of the given two dimensional position array
     * @param positions
     * @param matrix
     * @returns
     */
    static transformPosition2(positions: Position[][], matrix: IMatrix2D): Position[][] {
        return positions.map(p => PPTransformation.transformPosition1(p, matrix));
    }

    /**
     * Get a transformed copy of the given one dimensional position array
     * @param positions
     * @param matrix
     * @returns
     */
    static transformPosition1(positions: Position[], matrix: IMatrix2D): Position[] {
        return positions.map(p => PPTransformation.transformPosition(p, matrix));
    }

    /**
     * Get a transformed copy of the given Position
     * @param position
     * @param transform
     * @returns
     */
    static transformPosition(position: Position, transform: IMatrix2D): Position {
        return [
            position[0] * transform.a + position[1] * transform.c + transform.e,
            position[0] * transform.b + position[1] * transform.d + transform.f
        ];
    }

    /**
     * https://github.com/Fionoble/transformation-matrix-js/blob/master/src/matrix.js
     * @param x
     * @param y
     * @returns
     */
    static matrixTranslationInstance(x: number, y: number): IMatrix2D {
        return {
            a: 1,
            b: 0,
            c: 0,
            d: 1,
            e: x,
            f: y
        }
    }

    /**
     * https://github.com/Fionoble/transformation-matrix-js/blob/master/src/matrix.js
     * @param radians
     * @returns
     */
    static matrixRotationInstance(radians: number): IMatrix2D {
        const cos = Math.cos(radians), sin = Math.sin(radians);
        return {
            a: cos,
            b: sin,
            c: -sin,
            d: cos,
            e: 0,
            f: 0
        }
    }

    /**
     * https://github.com/Fionoble/transformation-matrix-js/blob/master/src/matrix.js
     * @param matrixA
     * @param matrixB
     * @returns
     */
    static matrixMultiply(...matrices: IMatrix2D[]): IMatrix2D {
        let matrixA = matrices[0];
        for (let i = 1; i < matrices.length; i++) {
            const matrixB = matrices[i];
            matrixA = {
                a: matrixA.a * matrixB.a + matrixA.c * matrixB.b,
                b: matrixA.b * matrixB.a + matrixA.d * matrixB.b,
                c: matrixA.a * matrixB.c + matrixA.c * matrixB.d,
                d: matrixA.b * matrixB.c + matrixA.d * matrixB.d,
                e: matrixA.a * matrixB.e + matrixA.c * matrixB.f + matrixA.e,
                f: matrixA.b * matrixB.e + matrixA.d * matrixB.f + matrixA.f
            }
        }
        return matrixA;
    }

}