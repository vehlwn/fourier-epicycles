# fourier-epicycles

Browser app to interpolate given set of points in the complex plane using complex
Fourier series and to draw
[epicycles and deferents](https://en.wikipedia.org/wiki/Deferent_and_epicycle).
Requiers JavaScript to work.

Textbox to the right contains lines with space separated points' coordinates. It can
be edited either manually or by clicking on the canvas to the left.

LMB -- add point.

Move mouse while holding LMB - add multiple points.

Alt+LMB -- remove point.

`Start` button calculates Fourier coefficients from input points and starts animation
with varying time argument.

`Clear` button removes all points.

## Build

```bash
$ npm install
$ npm run build
$ python3 -m http.server --bind 127.0.0.1 5000 -d dist
# Alternatively start vite dev server:
$ npm run dev -- --port 5000
```

## Details

Put $N$ be the length of a sequence of complex numbers
$\left\\{ x_i \right\\} _ {i=0} ^ {N-1}$.

Coefficients $c_k$ are calculated as discrete Fourier transform:

$$
c_k = \frac{1}{\sqrt N} \sum_{j=0}^{N-1} x_j \\, e^{-2i  \pi \frac{j}{N} k},
\\; k = \overline{0..N-1}.
$$

Value of an interpolant calculated as Fourier series:

$$
S(t) = \frac{1}{\sqrt N} \sum_{j=0}^{N-1} c_j \\, e^{+2i  \pi \frac{f_j}{N} t},
\\; t \in [0,N).
$$

Frequencies $f_j$ defined as:

$$
f_j = \begin{cases}
  j     & \text{if} \\; j \le \left\lfloor \frac{N}{2} \right\rfloor \\
  j - N & \text{otherwise}
\end{cases}
$$

## Examples

Figure 1:

![Figure1](examples/figure1.png)

Figure 2:

![Figure2](examples/figure2.png)
