// WebGL1 grain renderer — point sprites with a soft halo, coloured by speed
// (hot amber moving → pale sand settled). Alpha-blended so dense nodal lines
// read as warm sand rather than blowing out to white.

import { type Renderer, WEBGL_GRAINS } from './renderer';

const VERT = `
precision mediump float;
attribute vec2 a_pos;     // plate coords ∈ [0,1]
attribute float a_speed;  // ∈ [0,1]
uniform float u_size;     // base point size in device px
varying float v_speed;
void main() {
  // Plate (0,0) top-left → clip space, y flipped.
  vec2 clip = vec2(a_pos.x * 2.0 - 1.0, 1.0 - a_pos.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  // Moving grains are drawn a touch larger to suggest energy.
  gl_PointSize = u_size * (1.0 + a_speed * 0.6);
  v_speed = a_speed;
}`;

const FRAG = `
precision mediump float;
varying float v_speed;
uniform float u_glow;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  float r = length(d);
  if (r > 0.5) discard;
  // Soft core + halo. Glow widens the falloff a little.
  float core = smoothstep(0.5, 0.12, r);
  float halo = smoothstep(0.5, 0.0, r) * (0.25 + u_glow * 0.35);
  float a = clamp(core + halo, 0.0, 1.0);

  // Pale settled sand → hot amber in motion.
  vec3 sand  = vec3(0.910, 0.835, 0.659); // #e8d5a8
  vec3 amber = vec3(1.000, 0.640, 0.260); // hot amber
  vec3 col = mix(sand, amber, smoothstep(0.0, 0.8, v_speed));

  gl_FragColor = vec4(col, a * 0.72);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader compile failed: ${log}`);
  }
  return sh;
}

export class WebGLRenderer implements Renderer {
  readonly kind = 'webgl' as const;
  readonly capacity = WEBGL_GRAINS;

  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly posBuf: WebGLBuffer;
  private readonly speedBuf: WebGLBuffer;
  private readonly aPos: number;
  private readonly aSpeed: number;
  private readonly uSize: WebGLUniformLocation;
  private readonly uGlow: WebGLUniformLocation;
  private baseSize = 2.4;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    this.aPos = gl.getAttribLocation(program, 'a_pos');
    this.aSpeed = gl.getAttribLocation(program, 'a_speed');
    this.uSize = gl.getUniformLocation(program, 'u_size')!;
    this.uGlow = gl.getUniformLocation(program, 'u_glow')!;

    this.posBuf = gl.createBuffer()!;
    this.speedBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, WEBGL_GRAINS * 2 * 4, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.speedBuf);
    gl.bufferData(gl.ARRAY_BUFFER, WEBGL_GRAINS * 4, gl.DYNAMIC_DRAW);

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.039, 0.039, 0.043, 1.0); // near-black anodised plate
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    // Keep grains a constant visual size across plate sizes and densities.
    this.baseSize = Math.max(1.6, (Math.min(cssW, cssH) / 760) * 2.4) * dpr;
  }

  draw(pos: Float32Array, speed: Float32Array, count: number, glow: boolean): void {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniform1f(this.uSize, this.baseSize);
    gl.uniform1f(this.uGlow, glow ? 1 : 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos.subarray(0, count * 2));
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.speedBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, speed.subarray(0, count));
    gl.enableVertexAttribArray(this.aSpeed);
    gl.vertexAttribPointer(this.aSpeed, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, count);
  }
}
