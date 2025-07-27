import Complex from "complex.js";

export function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(v, hi));
}

export function lerp(x: number, xp: number[], yp: number[]): number {
    const a = (yp[1] - yp[0]) / (xp[1] - xp[0]);
    const b = yp[0] - xp[0] * a;
    return a * x + b;
}

function linspace(start: number, stop: number, num: number): number[] {
    const ret = [];
    for (let i = 0; i < num; i++) {
        ret.push(lerp(i, [0, num - 1], [start, stop]));
    }
    return ret;
}

function dft(input: Complex[]): Complex[] {
    const N = input.length;
    const ret = [];
    for (let k = 0; k < N; k++) {
        let c = Complex(0);
        for (let n = 0; n < N; n++) {
            c = c.add(
                input[n].mul(Complex(0, (-1 * (2 * Math.PI * k * n)) / N).exp())
            );
        }
        c = c.div(Math.sqrt(N));
        ret.push(c);
    }
    return ret;
}

function calc_frequencies(N: number): number[] {
    const ret = [];
    for (let n = 0; n < N; n++) {
        const frequecy = n > Math.floor(N / 2) ? n - N : n;
        ret.push(frequecy);
    }
    return ret;
}

export interface EpicyclesResult {
    circles: Complex[][];
    coef: Complex[];
    freq: number[];
}

export function calc_epicycles(input: Complex[], n: number): EpicyclesResult {
    const N = input.length;
    const coef = dft(input);
    const freq = calc_frequencies(N);
    const circles = [];
    const times = linspace(0, N, n + 1);
    times.pop();
    for (const t of times) {
        const t_circles = [];
        for (let n = 0; n < N; n++) {
            const tmp = Complex(0, (2 * Math.PI * t * freq[n]) / N);
            t_circles.push(coef[n].mul(tmp.exp()).div(Math.sqrt(N)));
        }
        circles.push(t_circles);
    }
    return { circles, coef, freq };
}

function round(x: number, n: number): number {
    return Math.round(x * 10 ** n) / 10 ** n;
}

export function get_series_formula(coef: Complex[], freq: number[]): string {
    const N = coef.length;
    let ret = `f(t) = 1/sqrt(${N}) * (`;
    let comma = "";
    for (let i = 0; i < N; i++) {
        ret += comma;
        const tmp = Complex(round(coef[i].re, 3), round(coef[i].im, 3));
        ret += `(${tmp.toString()}) * exp(2i*pi*t*${freq[i]}/${N})`;
        comma = " + ";
    }
    ret += ")";
    return ret;
}

export interface Point {
    x: number;
    y: number;
}

export function min<T>(data: T[], comp: (l: T, r: T) => boolean): T {
    interface EnumerateValue {
        elem: T;
        i: number;
    }
    return data
        .map((elem, i) => ({ elem, i }) as EnumerateValue)
        .reduce((left, right) => (comp(left.elem, right.elem) ? left : right)).elem;
}
