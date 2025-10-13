"use strict";

const { vec3 } = glMatrix;
let gl, canvas;
let points = [], colors = [];

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("WebGL 2.0 不可用");
    return;
  }

  document.getElementById("drawButton").onclick = function() {
    const level = parseInt(document.getElementById("numSubdivisions").value);
    renderScene(level);
  };

  renderScene(2); // 默认层次
};

function renderScene(level) {
  points = [];
  colors = [];

  const vertices = [
    vec3.fromValues(0.0000, 0.0000, -1.0000),
    vec3.fromValues(0.0000, 0.9428, 0.3333),
    vec3.fromValues(-0.8165, -0.4714, 0.3333),
    vec3.fromValues(0.8165, -0.4714, 0.3333)
  ];

  divideTetra(vertices[0], vertices[1], vertices[2], vertices[3], level);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  const program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  // 顶点缓冲
  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
  const vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // 颜色缓冲
  const cBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  const aColor = gl.getAttribLocation(program, "aColor");
  gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColor);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, points.length / 3);
}

function triangle(a, b, c, colorIndex) {
  const baseColors = [
    [1.0, 0.0, 0.0, 1.0],
    [0.0, 1.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 1.0],
    [0.0, 0.0, 0.0, 1.0]
  ];

  const color = baseColors[colorIndex];
  for (let i = 0; i < 3; i++) {
    points.push(a[i]);
  }
  colors.push(...color);

  for (let i = 0; i < 3; i++) {
    points.push(b[i]);
  }
  colors.push(...color);

  for (let i = 0; i < 3; i++) {
    points.push(c[i]);
  }
  colors.push(...color);
}

function tetra(a, b, c, d) {
  triangle(a, c, b, 0);
  triangle(a, c, d, 1);
  triangle(a, b, d, 2);
  triangle(b, c, d, 3);
}

function divideTetra(a, b, c, d, count) {
  if (count === 0) {
    tetra(a, b, c, d);
  } else {
    const ab = vec3.create(), ac = vec3.create(), ad = vec3.create();
    const bc = vec3.create(), bd = vec3.create(), cd = vec3.create();
    vec3.lerp(ab, a, b, 0.5);
    vec3.lerp(ac, a, c, 0.5);
    vec3.lerp(ad, a, d, 0.5);
    vec3.lerp(bc, b, c, 0.5);
    vec3.lerp(bd, b, d, 0.5);
    vec3.lerp(cd, c, d, 0.5);

    divideTetra(a, ab, ac, ad, count - 1);
    divideTetra(ab, b, bc, bd, count - 1);
    divideTetra(ac, bc, c, cd, count - 1);
    divideTetra(ad, bd, cd, d, count - 1);
  }
}
