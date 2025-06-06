import { MultiLineString, MultiPolygon, Polygon, Position } from "geojson";
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
        };
    }

    /**
     * Get a transformed copy of the given Polygon
     * @param positions
     * @param matrix
     * @returns
     */
    static transformPolygon(polygon: Polygon, matrix: IMatrix2D): Polygon {
        return {
            type: 'Polygon',
            coordinates: PPTransformation.transformPosition2(polygon.coordinates, matrix)
        };
    }

    /**
     * Get a transformed copy of the given MultiPolygon
     * @param positions
     * @param matrix
     * @returns
     */
    static transformMultiPolyline(polylines: MultiLineString, matrix: IMatrix2D): MultiLineString {
        return {
            type: 'MultiLineString',
            coordinates: PPTransformation.transformPosition2(polylines.coordinates, matrix)
        };
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
    static matrixScaleInstance(x: number, y: number): IMatrix2D {
        return {
            a: x,
            b: 0,
            c: 0,
            d: y,
            e: 0,
            f: 0
        };
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
        };
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
        };
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
            };
        }
        return matrixA;
    }

    static matrixDeterminant(matrix: IMatrix2D): number {
        return matrix.a * matrix.d - matrix.b * matrix.c;
    }

    static matrixIsInvertible(matrix: IMatrix2D): boolean {
        return PPTransformation.matrixDeterminant(matrix) !== 0;
    }

    static matrixInvert(matrix: IMatrix2D): IMatrix2D {

        if (PPTransformation.matrixIsInvertible(matrix)) {
            const dt = PPTransformation.matrixDeterminant(matrix);
            return {
                a: matrix.d / dt,
                b: -matrix.b / dt,
                c: -matrix.c / dt,
                d: matrix.a / dt,
                e: (matrix.c * matrix.f - matrix.d * matrix.e) / dt,
                f: -(matrix.a * matrix.f - matrix.b * matrix.e) / dt,
            };
        } else {
            throw "matrix is not invertible";
        }

        // inverse: function() {

        //     if (this.isIdentity()) {
        //         return new Matrix();
        //     }
        //     else if (!this.isInvertible()) {
        //         throw "Matrix is not invertible.";
        //     }
        //     else {
        //         var me = this,
        //             a = me.a,
        //             b = me.b,
        //             c = me.c,
        //             d = me.d,
        //             e = me.e,
        //             f = me.f,

        //             m = new Matrix(),
        //             dt = a * d - b * c;	// determinant(), skip DRY here...

        //         m.a = d / dt;
        //         m.b = -b / dt;
        //         m.c = -c / dt;
        //         m.d = a / dt;
        //         m.e = (c * f - d * e) / dt;
        //         m.f = -(a * f - b * e) / dt;

        //         return m;
        //     }
        // },

    }

}