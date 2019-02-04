import scaleLinear from "./scale/linearScale";
import {BandScale} from "./scale/bandScale";
import {createHdpiCanvas} from "./canvas/canvas";
import {Axis} from "./axis";

export interface ChartOptions {
    width: number;
    height: number;
    store: {
        categoryField: string;
        fields: string[];
        fieldNames: string[],
        data: any[]
    };
}

const gradientTheme = [
    ['#69C5EC', '#53AFD6'],
    ['#FDED7C', '#FDE95C'],
    ['#B6D471', '#A4CA4E'],
    ['#EC866B', '#E76846'],
    ['#FB9D5D', '#FA8535'],
];

export class Chart {

    private chartOptions: ChartOptions;

    private eGui: HTMLElement;

    constructor(chartOptions: ChartOptions) {
        this.chartOptions = chartOptions;
        this.init();
    }

    public getGui(): HTMLElement {
        return this.eGui;
    }

    public destroy(): void {
    }

    private init() {

        const store = this.chartOptions.store;
        const data = store.data;

        const yFields = store.fields;
        const yFieldNames = store.fieldNames;
        const colors = gradientTheme;

        const padding = {
            top: 20,
            right: 40,
            bottom: 40,
            left: 60
        };
        const n = data.length;
        const xData = data.map(d => d[this.chartOptions.store.categoryField]);
        // For each category returns an array of values representing the height
        // of each bar in the group.
        const yData = data.map(datum => {
            const values: number[] = [];
            yFields.forEach(field => values.push((datum as any)[field]));
            return values;
        });

        const canvasWidth = this.chartOptions.width;
        const canvasHeight = this.chartOptions.height;
        const seriesWidth = canvasWidth - padding.left - padding.right;
        const seriesHeight = canvasHeight - padding.top - padding.bottom;

        const yScale = scaleLinear();
        // Find the tallest bar in each group, then the tallest bar overall.
        yScale.domain = [0, Math.max(...yData.map(values => Math.max(...values)))];
        yScale.range = [seriesHeight, 0];

        const xGroupScale = new BandScale<string>();
        xGroupScale.domain = xData;
        xGroupScale.range = [0, seriesWidth];
        xGroupScale.paddingInner = 0.1;
        xGroupScale.paddingOuter = 0.3;
        const groupWidth = xGroupScale.bandwidth;

        const xBarScale = new BandScale<string>();
        xBarScale.domain = yFields;
        xBarScale.range = [0, groupWidth];
        xBarScale.padding = 0.1;
        xBarScale.round = true;
        const barWidth = xBarScale.bandwidth;

        const canvas = createHdpiCanvas(canvasWidth, canvasHeight);
        this.eGui = canvas;

        const ctx = canvas.getContext('2d')!;
        ctx.font = '14px Verdana';

        // bars
        ctx.save();
        ctx.translate(padding.left, padding.top);
        for (let i = 0; i < n; i++) {
            const category = xData[i];
            const values = yData[i];
            const groupX = xGroupScale.convert(category); // x-coordinate of the group
            values.forEach((value, j) => {
                const barX = xBarScale.convert(yFields[j]); // x-coordinate of the bar within a group
                const x = groupX + barX;
                const y = yScale.convert(value);

                const color = colors[j % colors.length];
                if (Array.isArray(color)) {
                    const gradient = ctx.createLinearGradient(x, y, x + barWidth, seriesHeight);
                    gradient.addColorStop(0, color[0]);
                    gradient.addColorStop(1, color[1]);
                    ctx.fillStyle = gradient;
                }
                else {
                    ctx.fillStyle = color;
                }
                ctx.fillRect(x, y, barWidth, seriesHeight - y);
                ctx.strokeRect(x, y, barWidth, seriesHeight - y);

                const label = yFieldNames[j];
                const labelWidth = ctx.measureText(label).width;
                ctx.fillStyle = 'black';
                ctx.fillText(label, x + barWidth / 2 - labelWidth / 2, y + 20);
            })
        }
        ctx.restore();

        // y-axis
        const yAxis = new Axis<number>(yScale);
        yAxis.translation = [padding.left, padding.top];
        yAxis.render(ctx);

        // x-axis
        const xAxis = new Axis<string>(xGroupScale);
        xAxis.rotation = -Math.PI / 2;
        xAxis.translation = [padding.left, padding.top + seriesHeight];
        xAxis.flippedLabels = true;
        xAxis.render(ctx);
    }

}