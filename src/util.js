"use strict";

import Complex from "complex.js";

export function lerp(x, xp, yp) {
    const a = (yp[1] - yp[0]) / (xp[1] - xp[0]);
    const b = yp[0] - xp[0] * a;
    return a * x + b;
}

export function linspace(start, stop, num) {
    const ret = [];
    for (let i = 0; i < num; i++) {
        ret.push(lerp(i, [0, num - 1], [start, stop]));
    }
    return ret;
}

export function dft(input, inverse = false) {
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

export function calc_epicycles(input, n) {
    const N = input.length;
    const coef = dft(input);
    const ret = [];
    for (const t of linspace(0, N, n)) {
        const one_point = [];
        for (let n = 0; n < N; n++) {
            const frequecy = n > Math.floor(N / 2) ? n - N : n;
            const tmp = Complex(0, (2 * Math.PI * t * frequecy) / N);
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
    return ret;
}
