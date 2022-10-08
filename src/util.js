"use strict";

import Complex from "complex.js";

export function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(v, hi));
}

export function lerp(x, xp, yp) {
    const a = (yp[1] - yp[0]) / (xp[1] - xp[0]);
    const b = yp[0] - xp[0] * a;
    return a * x + b;
}

function linspace(start, stop, num) {
    const ret = [];
    for (let i = 0; i < num; i++) {
        ret.push(lerp(i, [0, num - 1], [start, stop]));
    }
    return ret;
}

function dft(input, inverse = false) {
    const N = input.length;
    const ret = [];
    for (let i = 0; i < N; i++) {
        ret.push(Complex(0));
    }
    for (let k = 0; k < N; k++) {
        for (let n = 0; n < N; n++) {
            const tmp = Complex(
                0,
                ((inverse ? +1 : -1) * (2 * Math.PI * k * n)) / N
            );
            ret[k] = ret[k].add(input[n].mul(tmp.exp()));
        }
        ret[k] = ret[k].div(Complex(Math.sqrt(N)));
    }
    return ret;
}

function calc_frequencies(N) {
    const ret = [];
    for (let n = 0; n < N; n++) {
        const frequecy = n > Math.floor(N / 2) ? n - N : n;
        ret.push(frequecy);
    }
    return ret;
}

export function calc_epicycles(input, n) {
    const N = input.length;
    const coef = dft(input);
    const freq = calc_frequencies(N);
    const ret = [];
    const times = linspace(0, N, n + 1);
    times.pop();
    for (const t of times) {
        const one_point = [];
        for (let n = 0; n < N; n++) {
            const tmp = Complex(0, (2 * Math.PI * t * freq[n]) / N);
            one_point.push(coef[n].mul(tmp.exp()).div(Complex(Math.sqrt(N))));
        }
        const compare_abs = (a, b) => {
            const a_abs = a.abs();
            const b_abs = b.abs();
            if (a_abs < b_abs) return -1;
            else if (a_abs > b_abs) return 1;
            else return 0;
        };
        one_point.sort((a, b) => -compare_abs(a, b));
        ret.push(one_point);
    }
    return { epicycles: ret, coef, freq };
}

export function get_series_formula(coef, freq) {
    const N = coef.length;
    let ret = `f(t) = 1/sqrt(${N}) * (`;
    let comma = "";
    for (let i = 0; i < N; i++) {
        ret += comma;
        ret += `(${coef[i].toString()}) * exp(2i * pi * t * ${freq[i]} / ${N})`;
    }
    ret += ")";
    return ret;
}
