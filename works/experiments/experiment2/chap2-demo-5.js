"use strict";

const { vec2 } = glMatrix;
let gl, canvas;
let points = [];

window.onload = function init() {
  canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("WebGL 2.0 不可用");
    return;
  }

  document.getElementById("drawButton").onclick = function() {
    const level = parseInt(document.getElementById("numSubdivisions").value);
    const thetaDeg = parseFloat(document.getElementById("theta").value);
    renderScene(level, thetaDeg);
  };

  renderScene(4, 60); // 默认值
};

function renderScene(level, thetaDeg) {
  points = [];
  const theta = (Math.PI / 180) * thetaDeg;

  // 定义初始三角形
  const vertices = [
    vec2.fromValues(-1, -1),
    vec2.fromValues(0, 1),
    vec2.fromValues(1, -1)
  ];

  divideTriangle(vertices[0], vertices[1], vertices[2], level, theta);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

  const vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  gl.drawArrays(gl.TRIANGLES, 0, points.length / 2);
}

// ========== 递归划分 ==========
function divideTriangle(a, b, c, count, theta) {
  if (count === 0) {
    rotateAndPush(a, b, c, theta);
  } else {
    const ab = mix(a, b);
    const ac = mix(a, c);
    const bc = mix(b, c);
    count--;
    divideTriangle(a, ab, ac, count, theta);
    divideTriangle(c, ac, bc, count, theta);
    divideTriangle(b, bc, ab, count, theta);
  }
}

// ========== 旋转计算 ==========
function rotateAndPush(a, b, c, theta) {
  const pts = [a, b, c];
  for (let p of pts) {
    const x = p[0];
    const y = p[1];
    const d = Math.sqrt(x * x + y * y);
    const angle = d * theta;
    const xNew = x * Math.cos(angle) - y * Math.sin(angle);
    const yNew = x * Math.sin(angle) + y * Math.cos(angle);
    points.push(xNew, yNew);
  }
}

// ========== 辅助函数 ==========
function mix(u, v) {
  return vec2.fromValues((u[0] + v[0]) / 2.0, (u[1] + v[1]) / 2.0);
}
    