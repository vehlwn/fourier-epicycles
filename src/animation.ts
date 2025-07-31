import { lerp, min } from "./util";
import * as config from "./config";

import Complex from "complex.js";

export class AnimationView {
    private canvas_context: CanvasRenderingContext2D;
    private input_data_area: HTMLTextAreaElement;

    constructor(
        canvas_context: CanvasRenderingContext2D,
        input_data_area: HTMLTextAreaElement
    ) {
        this.canvas_context = canvas_context;
        this.input_data_area = input_data_area;
    }

    ctx() {
        return this.canvas_context;
    }

    add_data_point_to_textarea(scene_pos: Complex) {
        const x_str = scene_pos.re.toFixed(3);
        const y_str = scene_pos.im.toFixed(3);
        const ret = `${x_str} ${y_str}\n`;
        this.input_data_area.value += ret;
    }

    reset_input_points(data: Complex[]) {
        this.input_data_area.value = "";
        for (const p of data) {
            this.add_data_point_to_textarea(p);
        }
    }
}

class CachedSeriesPath {
    private times_map: Complex[] = [];

    add_point(time: number, value: Complex) {
        this.times_map[time] = value;
    }
    get_point(time: number): Complex | undefined {
        return this.times_map[time];
    }
    clear() {
        this.times_map = [];
    }
    entries() {
        return this.times_map.entries();
    }
}

export class AnimationState {
    private input_points: Complex[] = [];
    private circles: Complex[][] = [];
    private current_time: number = 0;
    private looped: boolean = false;

    clear() {
        this.input_points = [];
        this.circles = [];
        this.current_time = 0;
        this.looped = false;
    }

    add_input_point(scene_pos: Complex) {
        this.input_points.push(scene_pos);
    }

    set_input_points(data: Complex[]) {
        this.input_points = data;
    }

    get_input_points() {
        return this.input_points;
    }

    delete_input_point(pos: number) {
        this.input_points.splice(pos, 1);
    }

    get_circles() {
        return this.circles;
    }

    set_circles(data: Complex[][]) {
        this.circles = data;
    }

    get_t_circles() {
        return this.circles[this.current_time];
    }

    get_current_time() {
        return this.current_time;
    }

    max_time() {
        return this.circles.length;
    }

    increment_time() {
        this.current_time += 1;
        if (this.current_time === this.max_time()) {
            this.current_time = 0;
            this.looped = true;
        }
    }

    is_looped() {
        return this.looped;
    }
}

export class AnimationControls {
    private show_grid = true;
    private show_input_points = true;
    private show_circles = true;
    private harmonics = 0;

    show_grid_checked(): boolean {
        return this.show_grid;
    }
    set_show_grid(value: boolean) {
        this.show_grid = value;
    }

    show_input_points_checked(): boolean {
        return this.show_input_points;
    }
    set_show_input_points(value: boolean) {
        this.show_input_points = value;
    }

    show_circles_checked(): boolean {
        return this.show_circles;
    }
    set_show_circles(value: boolean) {
        this.show_circles = value;
    }

    get_harmonics() {
        return this.harmonics;
    }
    set_harmonics(value: number) {
        this.harmonics = value;
    }
}

export class AnimationController {
    private model = new AnimationState();
    private controls = new AnimationControls();
    private animation_interval = 0;
    private view: AnimationView;
    private cached_path = new CachedSeriesPath();

    constructor(view: AnimationView) {
        this.view = view;
        this.redraw_scene();
    }

    start(fps: number) {
        this.animation_interval = window.setInterval(
            () => {
                this.model.increment_time();
                this.redraw_scene();
            },
            (1.0 / fps) * 1000.0
        );
    }

    stop() {
        window.clearInterval(this.animation_interval);
        this.animation_interval = 0;
    }

    is_started(): boolean {
        return this.animation_interval !== 0;
    }

    set_input_points(data: Complex[]) {
        this.model.set_input_points(data);
    }

    set_circles(data: Complex[][]) {
        this.model.set_circles(data);
    }

    add_input_point(canvas_pos: Complex) {
        if (this.controls.show_input_points_checked()) {
            this.draw_data_point(canvas_pos);
        }
        const scene_pos = this.canvas_pos_to_scene(canvas_pos);
        this.model.add_input_point(scene_pos);
        this.view.add_data_point_to_textarea(scene_pos);
    }

    delete_closest_point(canvas_pos: Complex) {
        let min_point;
        try {
            const pos = min(
                this.model
                    .get_input_points()
                    .map((x) => x.sub(this.canvas_pos_to_scene(canvas_pos)))
                    .map((x) => x.abs())
                    .map((x, i) => [x, i])
                    .filter(([x]) => x < config.MIN_DISTANCE_FOR_REMOVING),
                ([l], [r]) => l < r
            )[1];
            min_point = pos;
        } catch (_e) {
            // Array is empty
            return;
        }
        this.model.delete_input_point(min_point);
        this.view.reset_input_points(this.model.get_input_points());
        this.redraw_scene();
    }

    get_input_points() {
        return this.model.get_input_points();
    }

    clear_state() {
        this.model.clear();
        this.cached_path.clear();
        this.redraw_scene();
    }

    set_harmonics(value: number) {
        this.controls.set_harmonics(value);
        this.redraw_scene();
    }

    set_show_grid(value: boolean) {
        this.controls.set_show_grid(value);
        this.redraw_scene();
    }

    set_show_input_points(value: boolean) {
        this.controls.set_show_input_points(value);
        this.redraw_scene();
    }
    set_show_circles(value: boolean) {
        this.controls.set_show_circles(value);
        this.redraw_scene();
    }

    private redraw_scene() {
        const ctx = this.view.ctx();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (this.controls.show_grid_checked()) {
            this.draw_grid();
        }
        if (this.controls.show_input_points_checked()) {
            for (const p of this.model.get_input_points()) {
                this.draw_data_point(this.scene_pos_to_canvas(p));
            }
        }
        if (
            this.model.get_circles().length > 0 &&
            this.controls.show_circles_checked()
        ) {
            this.draw_circles();
        }
        this.draw_series_path();
    }

    private draw_data_point(canvas_pos: Complex) {
        const ctx = this.view.ctx();
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = config.DATA_POINT_COLOR;
        ctx.arc(
            canvas_pos.re,
            canvas_pos.im,
            config.DATA_POINT_SIZE,
            0,
            2.0 * Math.PI
        );
        ctx.fill();
        ctx.restore();
    }

    private scene_pos_to_canvas(pos: Complex): Complex {
        const canvas = this.view.ctx().canvas;
        const x = lerp(pos.re, [-10, 10], [0, canvas.width]);
        const y = lerp(pos.im, [-10, 10], [canvas.height, 0]);
        return Complex(x, y);
    }

    private canvas_pos_to_scene(pos: Complex): Complex {
        const canvas = this.view.ctx().canvas;
        const x = lerp(pos.re, [0, canvas.width], [-10, 10]);
        const y = lerp(pos.im, [0, canvas.height], [10, -10]);
        return Complex(x, y);
    }

    private draw_grid() {
        const ctx = this.view.ctx();
        const canvas = this.view.ctx().canvas;

        ctx.save();

        const font_px = canvas.width * 0.03;
        ctx.font = `${font_px}px sans`;
        const text_padding = 3;
        const grid_color = "#c9c9c9";
        const grid_width = 1;
        const axis_color = "black";
        const axis_width = 1;

        // Vertical lines
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

        // Horizontal lines
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

        // Y line
        ctx.beginPath();
        ctx.strokeStyle = axis_color;
        ctx.lineWidth = axis_width;
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();

        // X line
        ctx.beginPath();
        ctx.strokeStyle = axis_color;
        ctx.lineWidth = axis_width;
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        ctx.restore();
    }

    private draw_circles() {
        const ctx = this.view.ctx();
        ctx.strokeStyle = config.CIRCLE_COLOR;
        ctx.lineWidth = 1;

        const t_circles = this.model.get_t_circles();
        const max_harmonics = this.controls.get_harmonics();

        let partial_sum = Complex(0);
        for (let i = 0; i < max_harmonics; i++) {
            const p = t_circles[i];
            const a = this.scene_pos_to_canvas(partial_sum);
            const next_point = partial_sum.add(p);
            const b = this.scene_pos_to_canvas(next_point);
            ctx.beginPath();
            ctx.moveTo(a.re, a.im);
            ctx.lineTo(b.re, b.im);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(a.re, a.im, a.sub(b).abs(), 0, 2.0 * Math.PI);
            ctx.stroke();
            partial_sum = next_point;
        }
        this.cached_path.add_point(this.model.get_current_time(), partial_sum);
    }

    private draw_series_path() {
        const ctx = this.view.ctx();
        ctx.save();
        ctx.strokeStyle = config.SERIES_COLOR;
        ctx.lineWidth = config.SERIES_LINE_WIDTH;
        ctx.beginPath();

        const draw_line_segment = (begin: Complex, end: Complex) => {
            const a = this.scene_pos_to_canvas(begin);
            const b = this.scene_pos_to_canvas(end);
            ctx.moveTo(a.re, a.im);
            ctx.lineTo(b.re, b.im);
        };

        let prev_point = null;
        for (const [_time, point] of this.cached_path.entries()) {
            if (prev_point === null) {
                prev_point = point;
                continue;
            }
            draw_line_segment(prev_point, point);
            prev_point = point;
        }

        if (this.model.is_looped()) {
            const first = this.cached_path.get_point(this.model.max_time() - 1);
            const last = this.cached_path.get_point(0);
            if (first !== undefined && last !== undefined) {
                draw_line_segment(first, last);
            }
        }
        ctx.stroke();
        ctx.restore();
    }
}
