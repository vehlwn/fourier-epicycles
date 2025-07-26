import Complex from "complex.js";
import { lerp, calc_epicycles, clamp, get_series_formula } from "./util";

const DATA_POINT_SIZE = 3;
const DATA_POINT_COLOR = "black";
const CIRCLE_COLOR = "#8f8fff";
const SERIES_COLOR = "red";
const MIN_DISTANCE_FOR_REMOVING = 0.5;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let start_btn: HTMLButtonElement;
let clear_btn: HTMLButtonElement;
let input_data_area: HTMLTextAreaElement;
let show_grid_checkbox: HTMLInputElement;
let show_input_points_checkbox: HTMLInputElement;
let show_circles_checkbox: HTMLInputElement;
let harmonics_input: HTMLInputElement;
let precision_input: HTMLInputElement;
let fps_input: HTMLInputElement;

let data_points: Complex[] = [];
let animation_interval: number = 0;
let current_time = 0;
let series_path: Complex[] = [];
let epicycles: Complex[][] = [];

interface Point {
    x: number;
    y: number;
}

function mouse_pos_to_canvas(e: MouseEvent): Point {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function canvas_pos_to_scene(pos: Point): Point {
    const x = lerp(pos.x, [0, canvas.width], [-10, 10]);
    const y = lerp(pos.y, [0, canvas.height], [10, -10]);
    return { x, y };
}

function scene_pos_to_canvas(pos: Point): Point {
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
        const text_width =
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

function draw_data_point(canvas_pos: Point) {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = DATA_POINT_COLOR;
    ctx.arc(canvas_pos.x, canvas_pos.y, DATA_POINT_SIZE, 0, 2.0 * Math.PI);
    ctx.fill();
    ctx.restore();
}

function add_data_point_to_textarea(scene_pos: Point) {
    let ret = scene_pos.x.toFixed(3);
    ret += " ";
    ret += scene_pos.y.toFixed(3);
    ret += "\n";
    input_data_area.value += ret;
}

function parse_data_points(): Complex[] {
    const ret = [];
    for (let line of input_data_area.value.split("\n")) {
        line = line.trim();
        const split_pos = line.split(/\s+/, 2);
        if (split_pos.length !== 2) {
            continue;
        }
        const x = parseFloat(split_pos[0]);
        if (Number.isNaN(x)) {
            continue;
        }
        const y = parseFloat(split_pos[1]);
        if (Number.isNaN(y)) {
            continue;
        }
        ret.push(Complex(x, y));
    }
    return ret;
}

function redraw_scene(increment_time = false) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (show_grid_checkbox.checked) {
        draw_grid();
    }
    if (show_input_points_checkbox.checked) {
        for (const p of data_points) {
            draw_data_point(scene_pos_to_canvas({ x: p.re, y: p.im }));
        }
    }
    if (epicycles.length !== 0 && show_circles_checkbox.checked) {
        const last_series_point = draw_circles();
        if (increment_time) {
            series_path.push(last_series_point);
            if (series_path.length > epicycles.length + 1) {
                series_path.shift();
            }
            current_time++;
            if (current_time === epicycles.length) {
                current_time = 0;
            }
        }
    }
    draw_series_path();
}

function draw_circles() {
    let accumulated_point = Complex(0);
    const series_point = epicycles[current_time];
    ctx.strokeStyle = CIRCLE_COLOR;
    ctx.lineWidth = 1;
    const max_harmonics = parseInt(harmonics_input.value, 10);
    for (let i = 0; i < max_harmonics; i++) {
        const p = series_point[i];
        const a = scene_pos_to_canvas({
            x: accumulated_point.re,
            y: accumulated_point.im
        });
        const next_point = accumulated_point.add(p);
        const b = scene_pos_to_canvas({
            x: next_point.re,
            y: next_point.im
        });
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(a.x, a.y, Math.hypot(a.x - b.x, a.y - b.y), 0, 2.0 * Math.PI);
        ctx.stroke();
        accumulated_point = next_point;
    }
    return accumulated_point;
}

function draw_series_path() {
    ctx.save();
    ctx.strokeStyle = SERIES_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const draw_line = (i: number, j: number) => {
        const a = scene_pos_to_canvas({
            x: series_path[i].re,
            y: series_path[i].im
        });
        const b = scene_pos_to_canvas({
            x: series_path[j].re,
            y: series_path[j].im
        });
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
    };
    for (let i = 0; i < series_path.length - 1; i++) {
        draw_line(i, i + 1);
    }
    ctx.stroke();
    ctx.restore();
}

function validate_fps_input() {
    const tmp = clamp(
        parseInt(fps_input.value, 10),
        parseInt(fps_input.min, 10),
        parseInt(fps_input.max, 10)
    );
    if (Number.isNaN(tmp)) {
        fps_input.value = "20";
    } else {
        fps_input.value = tmp.toString();
    }
}

function validate_precision_input() {
    const tmp = Math.max(
        parseInt(precision_input.value, 10),
        parseInt(precision_input.min, 10)
    );
    if (Number.isNaN(tmp)) {
        precision_input.value = "100";
    } else {
        precision_input.value = tmp.toString();
    }
}

function validate_harmonics_input() {
    harmonics_input.min = "1";
    harmonics_input.max = data_points.length.toString();
    harmonics_input.value = harmonics_input.max;
}

function start_animation() {
    validate_fps_input();
    validate_precision_input();

    data_points = parse_data_points();
    if (data_points.length === 0) {
        return;
    }
    const result = calc_epicycles(data_points, parseInt(precision_input.value, 10));
    epicycles = result.epicycles;
    console.log(get_series_formula(result.coef, result.freq));

    validate_harmonics_input();

    start_btn.innerHTML = "Stop";
    clear_btn.disabled = true;

    const fps_value = parseInt(fps_input.value, 10);
    series_path = [];
    animation_interval = window.setInterval(
        redraw_scene,
        (1.0 / fps_value) * 1000.0,
        true
    );
}

function stop_animation() {
    start_btn.innerHTML = "Start";
    clear_btn.disabled = false;
    current_time = 0;
    window.clearInterval(animation_interval);
    animation_interval = 0;
}

function add_input_point(canvas_pos: Point) {
    if (show_input_points_checkbox.checked) {
        draw_data_point(canvas_pos);
    }
    const scene_pos = canvas_pos_to_scene(canvas_pos);
    add_data_point_to_textarea(scene_pos);
    data_points.push(Complex(scene_pos.x, scene_pos.y));
}

function delete_input_point(canvas_pos: Point) {
    const scene_pos = (() => {
        const tmp = canvas_pos_to_scene(canvas_pos);
        return Complex(tmp.x, tmp.y);
    })();
    let min_point_index = -1;
    let min_distance = Infinity;
    for (let i = 0; i < data_points.length; i++) {
        const distance = scene_pos.sub(data_points[i]).abs();
        if (distance < MIN_DISTANCE_FOR_REMOVING) {
            if (distance < min_distance) {
                min_distance = distance;
                min_point_index = i;
            }
        }
    }
    if (min_point_index === -1) {
        return;
    }
    data_points.splice(min_point_index, 1);
    input_data_area.value = "";
    for (const p of data_points) {
        add_data_point_to_textarea({ x: p.re, y: p.im });
    }
    redraw_scene();
}

function add_event_listeners() {
    canvas.addEventListener("click", (e) => {
        if (animation_interval === 0) {
            const canvas_pos = mouse_pos_to_canvas(e);
            if (e.altKey) {
                delete_input_point(canvas_pos);
            } else {
                add_input_point(canvas_pos);
            }
        }
    });

    const redraw_if_no_animation = () => {
        if (animation_interval === null) {
            redraw_scene();
        }
    };
    show_grid_checkbox.addEventListener("change", redraw_if_no_animation);
    show_input_points_checkbox.addEventListener("change", redraw_if_no_animation);
    show_circles_checkbox.addEventListener("change", redraw_if_no_animation);
    start_btn.addEventListener("click", () => {
        if (animation_interval === 0) {
            start_animation();
        } else {
            stop_animation();
        }
    });
    clear_btn.addEventListener("click", () => {
        data_points = [];
        series_path = [];
        epicycles = [];
        input_data_area.value = "";
        redraw_scene();
    });
}

window.onload = () => {
    canvas = document.getElementById("main-scene") as HTMLCanvasElement;

    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("Unexpected null canvas context!");
    }
    ctx = context;
    input_data_area = document.getElementById("input-data") as HTMLTextAreaElement;
    show_grid_checkbox = document.getElementById("show-grid") as HTMLInputElement;
    show_input_points_checkbox = document.getElementById(
        "show-input-points"
    ) as HTMLInputElement;
    show_circles_checkbox = document.getElementById(
        "show-circles"
    ) as HTMLInputElement;
    harmonics_input = document.getElementById("harmonics") as HTMLInputElement;
    precision_input = document.getElementById("precision") as HTMLInputElement;
    fps_input = document.getElementById("fps") as HTMLInputElement;
    start_btn = document.getElementById("start-btn") as HTMLButtonElement;
    clear_btn = document.getElementById("clear-btn") as HTMLButtonElement;

    draw_grid();

    add_event_listeners();
};
