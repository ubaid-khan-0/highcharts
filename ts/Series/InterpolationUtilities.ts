/* *
 *
 *  (c) 2010-2023 Hubert Kozik
 *
 *  License: www.highcharts.com/license
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

import type HeatmapSeries from './Heatmap/HeatmapSeries';
import type GeoHeatmapSeries from './GeoHeatmap/GeoHeatmapSeries';
import Point from '../Core/Series/Point';

import H from '../Core/Globals.js';
const {
    doc
} = H;

import U from '../Core/Utilities.js';
import ColorAxis from '../Core/Axis/Color/ColorAxis';
const {
    defined,
    pick
} = U;

/* *
 *
 *  Functions
 *
 * */

/**
 * Find color of point based on color axis.
 *
 * @function Highcharts.colorFromPoint
 *
 * @param {number | null} value
 *        Value to find corresponding color on the color axis.
 *
 * @return {number[]}
 *        Color in RGBa array.
 */
function colorFromPoint(
    value: number | null,
    colorAxis: ColorAxis,
    visible: boolean
): number[] {

    const rgba = ((
        colorAxis.toColor(
            value || 0,
            new Point() as Point
        ) as string)
        .split(')')[0]
        .split('(')[1]
        .split(',')
        .map((s): number => pick(
            parseFloat(s),
            parseInt(s, 10)
        ))
    );
    rgba[3] = pick(rgba[3], 1.0) * 255;
    if (!defined(value) || !visible) {
        rgba[3] = 0;
    }
    return rgba;
}

/**
 * Method responsible for creating a canvas for interpolation image.
 * @private
 */
function getContext(
    series: HeatmapSeries | GeoHeatmapSeries
): CanvasRenderingContext2D | undefined {
    const {
        canvas,
        context
    } = series;
    if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
    } else {
        series.canvas = doc.createElement('canvas');

        series.context = series.canvas.getContext('2d', {
            willReadFrequently: true
        }) || void 0;
        return series.context;
    }

    return context;
}

const InterpolationUtilities = {
    colorFromPoint,
    getContext
};

export default InterpolationUtilities;
