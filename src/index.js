"use strict";

import Complex from "complex.js";
import { lerp, calc_epicycles } from "./util.js";

const DATA_POINT_SIZE = 3;
const DATA_POINT_COLOR = "black";
const CIRCLE_COLOR = "blue";
const SERIES_COLOR = "red";

let canvas;
let ctx;
let data_points;
let input_data_area;

function mouse_pos_to_canvas(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function canvas_pos_to_scene(pos) {
    const x = lerp(pos.x, [0, canvas.width], [-10, 10]);
    const y = lerp(pos.y, [0, canvas.height], [10, -10]);
    return { x, y };
}

function draw_axis() {
    ctx.save();

    const font_px = canvas.width * 0.03;
    ctx.font = `${font_px}px sans`;
    const text_padding = 3;
    const grid_color = "#c9c9c9";
    const grid_width = 1;
    const axis_color = "black";
    const axis_width = 1;

    // Vertical grid
    ctx.strokeStyle = grid_color;
    ctx.lineWidth = grid_width;
    for (let i = 1; i <= 4; i++) {
        let x = canvas.width / 2 + (i * canvas.width) / 10;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        let text = (i * 2).toString();
        let metrics = ctx.measureText(text);
        let text_width =
            metrics.actualBoundingBoxRight + metrics.actualBoundingBoxLeft;
        ctx.fillText(
            text,
            x - text_width / 2,
            canvas.height / 2 + metrics.actualBoundingBoxAscent + text_padding
        );

        x = canvas.width / 2 - (i * canvas.width) / 10;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();

        text = (-i * 2).toString();
        metrics = ctx.measureText(text);
        ctx.fillText(
            text,
            x - text_width / 2,
            canvas.height / 2 + metrics.actualBoundingBoxAscent + text_padding
        );
    }

    // Horizontal grid
    ctx.beginPath();
    ctx.strokeStyle = grid_color;
    ctx.lineWidth = grid_width;
    for (let i = 1; i <= 4; i++) {
        let y = canvas.height / 2 + (i * canvas.height) / 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        let text = `${-i * 2}i`;
        let metrics = ctx.measureText(text);
        ctx.fillText(
            text,
            canvas.width / 2 + text_padding,
            y + metrics.actualBoundingBoxAscent / 2
        );

        y = canvas.height / 2 - (i * canvas.height) / 10;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();

        text = `${i * 2}i`;
        metrics = ctx.measureText(text);
        ctx.fillText(
            text,
            canvas.width / 2 + text_padding,
            y + metrics.actualBoundingBoxAscent / 2
        );
    }
    ctx.stroke();

    // Vertical axis
    ctx.beginPath();
    ctx.strokeStyle = axis_color;
    ctx.lineWidth = axis_width;
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Horizontal axis
    ctx.beginPath();
    ctx.strokeStyle = axis_color;
    ctx.lineWidth = axis_width;
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.restore();
}

function draw_data_point(canvas_pos) {
    ctx.beginPath();
    ctx.fillStyle = DATA_POINT_COLOR;
    ctx.ellipse(
        canvas_pos.x,
        canvas_pos.y,
        DATA_POINT_SIZE,
        DATA_POINT_SIZE,
        0,
        0,
        2.0 * Math.PI
    );
    ctx.fill();
}

function add_data_point_to_textarea(scene_pos) {
    let ret = scene_pos.x.toFixed(3);
    ret += " ";
    ret += scene_pos.y.toFixed(3);
    ret += "\n";
    input_data_area.value += ret;
}

function parse_data_points() {
    const ret = [];
    for (let line of input_data_area.value.split("\n")) {
        line = line.trim();
        const split_pos = line.split(/\s+/, 2);
        if (split_pos.length !== 2) continue;
        const x = parseFloat(split_pos[0]);
        if (Number.isNaN(x)) continue;
        const y = parseFloat(split_pos[1]);
        if (Number.isNaN(y)) continue;
        ret.push(Complex(x, y));
    }
    return ret;
}

window.onload = () => {
    canvas = document.getElementById("main-scene");
    ctx = canvas.getContext("2d");
    input_data_area = document.getElementById("input-data");

    draw_axis();
    const input = [Complex(10, 1), Complex(20, 2), Complex(30, 3)];
    console.log(calc_epicycles(input, 4));

    canvas.addEventListener("click", (e) => {
        const canvas_pos = mouse_pos_to_canvas(e);
        draw_data_point(canvas_pos);
        const scene_pos = canvas_pos_to_scene(canvas_pos);
        add_data_point_to_textarea(scene_pos);
    });

    document.getElementById("start-btn").addEventListener("click", () => {
        console.log(parse_data_points());
    });
};
