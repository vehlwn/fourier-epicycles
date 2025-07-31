import Complex from "complex.js";
import { calc_epicycles, clamp, get_series_formula } from "./util";
import { AnimationController, AnimationView } from "./animation";

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
let drawing_density: HTMLInputElement;

let animation_controller: AnimationController;

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
    harmonics_input.max = animation_controller.get_input_points().length.toString();
    harmonics_input.value = harmonics_input.max;
    animation_controller.set_harmonics(parseInt(harmonics_input.value, 10));
}

function start_animation() {
    animation_controller.clear_state();

    validate_fps_input();
    validate_precision_input();

    const data_points = parse_data_points();
    if (data_points.length === 0) {
        return;
    }
    animation_controller.set_input_points(data_points);

    const result = calc_epicycles(data_points, parseInt(precision_input.value, 10));
    console.log(get_series_formula(result.coef, result.freq));
    animation_controller.set_circles(result.circles);

    validate_harmonics_input();

    start_btn.innerHTML = "Stop";
    clear_btn.disabled = true;

    const fps_value = parseInt(fps_input.value, 10);
    animation_controller.start(fps_value);
}

function stop_animation() {
    start_btn.innerHTML = "Start";
    clear_btn.disabled = false;
    animation_controller.stop();
}

function can_edit_point() {
    return !animation_controller.is_started();
}

function add_or_delete_point(e: MouseEvent) {
    if (can_edit_point()) {
        const canvas_point = Complex(e.offsetX, e.offsetY);
        if (e.altKey) {
            animation_controller.delete_closest_point(canvas_point);
        } else {
            animation_controller.add_input_point(canvas_point);
        }
    }
}

function get_timestamp() {
    return performance.now();
}

function add_canvas_events() {
    let is_mouse_down = false;
    let last_mouse_move_ts = 0;

    canvas.addEventListener("mousedown", (e) => {
        is_mouse_down = true;
        last_mouse_move_ts = get_timestamp();
        add_or_delete_point(e);
    });
    window.addEventListener("mouseup", () => {
        is_mouse_down = false;
    });
    canvas.addEventListener("mousemove", (e) => {
        const now = get_timestamp();
        const delay = -Number.parseInt(drawing_density.value);
        if (is_mouse_down && can_edit_point() && now - last_mouse_move_ts >= delay) {
            add_or_delete_point(e);
            last_mouse_move_ts = now;
        }
    });
}

function add_event_listeners() {
    add_canvas_events();
    show_grid_checkbox.addEventListener("change", () => {
        animation_controller.set_show_grid(show_grid_checkbox.checked);
    });
    show_input_points_checkbox.addEventListener("change", () => {
        animation_controller.set_show_input_points(
            show_input_points_checkbox.checked
        );
    });
    show_circles_checkbox.addEventListener("change", () => {
        animation_controller.set_show_circles(show_circles_checkbox.checked);
    });
    harmonics_input.addEventListener("input", () => {
        animation_controller.set_harmonics(parseInt(harmonics_input.value, 10));
    });
    start_btn.addEventListener("click", () => {
        if (!animation_controller.is_started()) {
            start_animation();
        } else {
            stop_animation();
        }
    });
    clear_btn.addEventListener("click", () => {
        input_data_area.value = "";
        if (!animation_controller.is_started()) {
            animation_controller.clear_state();
        }
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
    drawing_density = document.getElementById("density") as HTMLInputElement;

    start_btn = document.getElementById("start-btn") as HTMLButtonElement;
    clear_btn = document.getElementById("clear-btn") as HTMLButtonElement;

    animation_controller = new AnimationController(
        new AnimationView(ctx, input_data_area)
    );

    add_event_listeners();
};
