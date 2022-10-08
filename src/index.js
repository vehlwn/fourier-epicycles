"use strict";

import Complex from "complex.js";
import { lerp, calc_epicycles, clamp, get_series_formula } from "./util.js";

const DATA_POINT_SIZE = 3;
const DATA_POINT_COLOR = "black";
const CIRCLE_COLOR = "blue";

let canvas;
let ctx;
let start_btn;
let clear_btn;
let input_data_area;
let show_grid_checkbox;
let show_input_points_checkbox;
let show_circles_checkbox;
let harmonics_input;
let precision_input;
let fps_input;

let data_points = [];
let animation_interval = null;
let current_time = 0;

function mouse_pos_to_canvas(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function canvas_pos_to_scene(pos) {
    const x = lerp(pos.x, [0, canvas.width], [-10, 10]);
    const y = lerp(pos.y, [0, canvas.height], [10, -10]);
    return { x, y };
}

function scene_pos_to_canvas(pos) {
    const x = lerp(pos.x, [-10, 10], [0, canvas.width]);
    const y = lerp(pos.y, [-10, 10], [canvas.height, 0]);
    return { x, y };
}

function draw_grid() {
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
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = DATA_POINT_COLOR;
    ctx.arc(canvas_pos.x, canvas_pos.y, DATA_POINT_SIZE, 0, 2.0 * Math.PI);
    ctx.fill();
    ctx.restore();
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

function redraw_scene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (show_grid_checkbox.checked) {
        draw_grid();
    }
    if (show_input_points_checkbox.checked) {
        for (const p of data_points) {
            draw_data_point(scene_pos_to_canvas({ x: p.re, y: p.im }));
        }
    }
}

function animation_step(epicycles) {
    ctx.save();
    redraw_scene();
    if (epicycles.length !== 0 && show_circles_checkbox.checked) {
        let accumulated_point = Complex(0);
        const series_point = epicycles[current_time];
        ctx.strokeStyle = CIRCLE_COLOR;
        ctx.lineWidth = 1;
        for (let i = 0; i < harmonics_input.value; i++) {
            const p = series_point[i];
            const a = scene_pos_to_canvas({
                x: accumulated_point.re,
                y: accumulated_point.im,
            });
            const next_point = accumulated_point.add(p);
            const b = scene_pos_to_canvas({
                x: next_point.re,
                y: next_point.im,
            });
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(
                a.x,
                a.y,
                Math.hypot(a.x - b.x, a.y - b.y),
                0,
                2.0 * Math.PI
            );
            ctx.stroke();
            accumulated_point = next_point;
        }
        current_time++;
        if (current_time === epicycles.length) {
            current_time = 0;
        }
    }
    ctx.restore();
}

function validate_fps_input() {
    fps_input.value = clamp(fps_input.value, fps_input.min, fps_input.max);
}

function validate_precision_input() {
    precision_input.value = Math.max(
        precision_input.value,
        precision_input.min
    );
}

function start_animation() {
    validate_fps_input();
    validate_precision_input();

    data_points = parse_data_points();
    if (data_points.length === 0) {
        return;
    }
    const { epicycles, coef, freq } = calc_epicycles(
        data_points,
        parseInt(precision_input.value)
    );
    console.log(get_series_formula(coef, freq));

    harmonics_input.min = 1;
    harmonics_input.max = data_points.length;
    harmonics_input.value = harmonics_input.max;

    start_btn.innerHTML = "Stop";
    clear_btn.disabled = true;

    animation_interval = setInterval(
        animation_step,
        (1.0 / fps_input.value) * 1000.0,
        epicycles
    );
}

function stop_animation() {
    start_btn.innerHTML = "Start";
    clear_btn.disabled = false;
    current_time = 0;
    clearInterval(animation_interval);
    animation_interval = null;
}

function add_event_listeners() {
    canvas.addEventListener("click", (e) => {
        if (animation_interval === null) {
            const canvas_pos = mouse_pos_to_canvas(e);
            if (show_input_points_checkbox.checked) {
                draw_data_point(canvas_pos);
            }
            const scene_pos = canvas_pos_to_scene(canvas_pos);
            add_data_point_to_textarea(scene_pos);
            data_points.push(Complex(scene_pos.x, scene_pos.y));
        }
    });

    show_grid_checkbox.addEventListener("change", () => {
        if (animation_interval === null) {
            redraw_scene();
        }
    });
    show_input_points_checkbox.addEventListener("change", () => {
        if (animation_interval === null) {
            redraw_scene();
        }
    });
    start_btn.addEventListener("click", () => {
        if (animation_interval === null) {
            start_animation();
        } else {
            stop_animation();
        }
    });
    clear_btn.addEventListener("click", () => {
        data_points = [];
        input_data_area.value = "";
        redraw_scene();
    });
}

window.onload = () => {
    canvas = document.getElementById("main-scene");
    ctx = canvas.getContext("2d");
    input_data_area = document.getElementById("input-data");
    show_grid_checkbox = document.getElementById("show-grid");
    show_input_points_checkbox = document.getElementById("show-input-points");
    show_circles_checkbox = document.getElementById("show-circles");
    harmonics_input = document.getElementById("harmonics");
    precision_input = document.getElementById("precision");
    fps_input = document.getElementById("fps");
    start_btn = document.getElementById("start-btn");
    clear_btn = document.getElementById("clear-btn");

    draw_grid();

    add_event_listeners();
};
