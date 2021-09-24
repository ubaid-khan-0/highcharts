/* *
 *
 *  Authors: Rafal Sebestjanski and Pawel Lysy
 *
 *  !!!!!!! SOURCE GETS TRANSPILED BY TYPESCRIPT. EDIT TS FILE ONLY. !!!!!!!
 *
 * */

'use strict';

/* *
 *
 *  Imports
 *
 * */

import type PositionObject from '../../../Core/Renderer/PositionObject';

import Annotation from '../Annotations.js';
import CrookedLine from './CrookedLine.js';
import ControlPoint from '../ControlPoint.js';
import U from '../../../Core/Utilities.js';
import MockPoint from '../MockPoint';
import MockPointOptions from '../MockPointOptions';
const { merge, isNumber, defined } = U;

/**
 * Internal types.
 * @private
 */
declare global {
    namespace Highcharts {
        interface AnnotationControllable {
            secondLineEdgePoints: [Function, Function];
        }
    }
}
interface TimeCyclesOptions extends CrookedLine.Options {
    xAxis: number;
    yAxis: number;
}

/**
 * Function to create start of the path.
 * @param {number} x x position of the TimeCycles
 * @param {number} y y position of the TimeCycles
 * @return {string} path
 */
function getStartingPath(x: number, y: number): string {
    return `M ${x} ${y}`;
}

/**
 * function to create circle paths
 *
 * @param {number} pixelInterval diameter of the circle in pixels
 * @param {number} numberOfCircles number of cricles
 * @return {string} path
 */
function getCirclePath(pixelInterval: number, numberOfCircles: number): string {
    console.log('interval: ', pixelInterval, 'numberOfCircles: ', numberOfCircles);
    const strToRepeat = `a 1 1 0 1 1 ${pixelInterval} 0 `;
    let path = strToRepeat;
    for (let i = 1; i < numberOfCircles; i++) {
        path += strToRepeat;
    }

    return path.trim();
}

/* *
 *
 *  Class
 *
 * */

/* eslint-disable no-invalid-this, valid-jsdoc */

class TimeCycles extends CrookedLine {

    public init(annotation: Annotation, options: TimeCyclesOptions, index?: number) {
        (this as any).customPoints = [this.chart.renderer.circle(0, 0, 0).attr({fill: 'green'}).add(), this.chart.renderer.circle(0, 0, 0).attr({fill: 'blue'}).add()];
        if (defined(options.yAxis)) {
            (options.points as MockPointOptions[]).forEach((point): void => {
                point.yAxis = options.yAxis;
            });
        }

        if (defined(options.xAxis)) {
            (options.points as MockPointOptions[]).forEach((point): void => {
                point.xAxis = options.xAxis;
            });
        } 
        super.init.call(this, annotation, options, index);

    }

    public getPath(): string {

        return `${getStartingPath(this.startX, this.y)} ${getCirclePath(
            this.pixelInterval,
            this.numberOfCircles
        )}`;
    }

    public addShapes(): void {
        const typeOptions = this.options.typeOptions;
        this.setPathProperties();
        const shape = this.initShape(
            merge(typeOptions.line, {
                type: 'path',

                d: this.getPath(),
                points: this.options.points
            }),
            0
        );

        typeOptions.line = shape.options;
    }

    public addControlPoints(): void {
        const options = this.options,
            typeOptions = options.typeOptions as TimeCycles.TypeOptions,
            controlPoint = new ControlPoint(
                this.chart,
                this,
                merge(
                    options.controlPointOptions,
                    typeOptions.controlPointOptions
                ),
                0
            );

        this.controlPoints.push(controlPoint);

        typeOptions.controlPointOptions = controlPoint.options;
    }

    public setPathProperties(): void {
        const options = this.options.typeOptions;
        const points = options.points;

        if (!points) {
            // TODO handling?
            return;
        }
        const point1 = points[0],
            point2 = points[1],
            xAxisNumber = options.xAxis || 0,
            yAxisNumber = options.yAxis || 0,
            xAxis = this.chart.xAxis[xAxisNumber],
            yAxis = this.chart.yAxis[yAxisNumber],
            xValue1 = point1.x,
            yValue = point1.y,
            xValue2 = point2.x;

            if(!xValue1 || !xValue2){
                    //TODO handling?
                return;
            }
            const pixelInterval = Math.round(Math.abs(xAxis.toPixels(xValue1 - xValue2) - xAxis.toPixels(0))),
        // const point = (this.options.points as any)[0],
        //     // If point.x and point.y are undefined,
        //     // the dragging in given direction is disabled.
        //     xValue = point.x,
        //     yValue = point.y,
        //     xAxisNumber = (point.xAxis as number) || 0,
        //     yAxisNumber = (point.yAxis as number) || 0,
        //     xAxis = this.chart.xAxis[xAxisNumber],
        //     yAxis = this.chart.yAxis[yAxisNumber],
            y = isNumber(yValue) && !isNaN(yValue) ? yAxis.toPixels(yValue) : yAxis.top + yAxis.height,
            x = isNumber(xValue1) && !isNaN(xValue1) ? xAxis.toPixels(xValue1) : xAxis.left,
            x2 = isNumber(xValue2) && !isNaN(xValue2) ? xAxis.toPixels(xValue2) : xAxis.left,
        //     r = this.options.r,
            xAxisLength = xAxis.len,
        //     pixelInterval = r ? r * 2 :
        //         (xAxisLength * (this.options.typeOptions as any).period) /
        //         ((xAxis.max as number) - (xAxis.min as number)),
            numberOfCircles = Math.floor(xAxisLength / pixelInterval) + 2,
            pixelShift = (Math.floor((x - xAxis.left) / pixelInterval) + 1) * pixelInterval;
        this.startX = x - pixelShift;
        this.y = y;
        this.pixelInterval = Math.round(pixelInterval);
        
        this.numberOfCircles = numberOfCircles;
        (this as any).customPoints[0].attr({ x, y, r: 5 });
        (this as any).customPoints[1].attr({ x: x2, y, r: 5 });
    }

    public redraw(animation: boolean): void {
        super.redraw(animation);
        this.setPathProperties();

        if (this.shapes[0]) {
            this.shapes[0].attr({ d: this.getPath() });
        }
    }
}

/* *
 *
 *  Class Prototype
 *
 * */

interface TimeCycles {
    defaultOptions: CrookedLine['defaultOptions'];
    startX: number;
    pixelInterval: number;
    numberOfCircles: number;
    y: number;
}
TimeCycles.prototype.defaultOptions = merge(
    CrookedLine.prototype.defaultOptions,
    {
    //     typeOptions: {
    //         controlPointOptions: [{
    //             positioner: function (
    //                 this: Highcharts.AnnotationControlPoint,
    //                 target: TimeCycles
    //             ): PositionObject {
    //                 const point = target.points[0],
    //                 position = target.anchor(point).absolutePosition;
                   
    //                 return {
    //                     x: position.x - this.graphic.width / 2,
    //                     y: position.y - this.graphic.height / 2
    //                 };
    //             },
    //             events: {
    //                 drag: function (
    //                     this: ControlPoint,
    //                     e: Highcharts.AnnotationEventObject,
    //                     target: TimeCycles
    //                 ): void {
    //                     const y = target.y,
    //                         dy = Math.abs(e.chartY - y);
    //                     target.options.r = Math.max(dy, 5);
    //                     target.redraw(false);
    //                 }
    //             }
    //         }, {
    //             positioner: function (
    //                 this: Highcharts.AnnotationControlPoint,
    //                 target: TimeCycles
    //             ): PositionObject {
    //                 const point = target.points[1],
    //                 position = target.anchor(point).absolutePosition;
                   
    //                 return {
    //                     x: position.x - this.graphic.width / 2,
    //                     y: position.y - this.graphic.height / 2
    //                 };
    //             },
    //             events: {
    //                 drag: function (
    //                     this: ControlPoint,
    //                     e: Highcharts.AnnotationEventObject,
    //                     target: TimeCycles
    //                 ): void {
    //                     const y = target.y,
    //                         dy = Math.abs(e.chartY - y);
    //                     target.options.r = Math.max(dy, 5);
    //                     target.redraw(false);
    //                 }
    //             }
    //         }
    //     ]
    // }
}
);

/* *
 *
 *  Class Namespace
 *
 * */

namespace TimeCycles {
    export interface Options extends CrookedLine.Options {
        typeOptions: TypeOptions;
    }
    export interface TypeOptions extends CrookedLine.TypeOptions {
        type: string;
        controlPointOptions: Highcharts.AnnotationControlPointOptionsObject;
    }
}

/* *
 *
 *  Registry
 *
 * */

Annotation.types.timeCycles = TimeCycles;
declare module './AnnotationType' {
    interface AnnotationTypeRegistry {
        timeCycles: typeof TimeCycles;
    }
}

/* *
 *
 *  Default Export
 *
 * */

export default TimeCycles;

/* *
 *
 *  API Declarations
 *
 * */

/**
 * The Fibonacci Timezones annotation.
 *
 * @sample highcharts/annotations-advanced/fibonacci-timezones/
 *         Fibonacci Timezones
 *
 * @extends   annotations.crookedLine
 * @product   highstock
 * @apioption annotations.timeCycles
 */

/**
 * @exclude   y
 * @product   highstock
 * @apioption annotations.timeCycles.typeOptions.points
 */

(''); // keeps doclets above in transpiled file
