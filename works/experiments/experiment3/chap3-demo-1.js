"use strict";

const { mat4 } = glMatrix;
let gl, program;
let transformMatrix = mat4.create();
let shapeVertices = [];

window.onload = function init() {
  const canvas = document.getElementById("gl-canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    alert("WebGL 2.0 不可用");
    return;
  }

  // 初始化图形（正方形）
  shapeVertices = [
    -0.5, -0.5,
     0.5, -0.5,
     0.5,  0.5,
    -0.5,  0.5
  ];

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);

  setupBuffer();
  setupUI();
  render();
};

function setupBuffer() {
  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shapeVertices), gl.STATIC_DRAW);

  const vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);
}

function setupUI() {
  const transformSelect = document.getElementById("transformType");
  const translateControls = document.getElementById("translateControls");
  const rotateControls = document.getElementById("rotateControls");
  const scaleControls = document.getElementById("scaleControls");

  transformSelect.onchange = () => {
    translateControls.style.display = "none";
    rotateControls.style.display = "none";
    scaleControls.style.display = "none";

    const type = transformSelect.value;
    if (type === "translate") translateControls.style.display = "inline";
    else if (type === "rotate") rotateControls.style.display = "inline";
    else if (type === "scale") scaleControls.style.display = "inline";
  };

  document.getElementById("applyButton").onclick = applyTransform;
  document.getElementById("resetButton").onclick = resetTransform;
}

function applyTransform() {
  const type = document.getElementById("transformType").value;

  if (type === "translate") {
    const tx = parseFloat(document.getElementById("tx").value);
    const ty = parseFloat(document.getElementById("ty").value);
    const tMat = mat4.create();
    mat4.translate(tMat, tMat, [tx, ty, 0]);
    mat4.multiply(transformMatrix, tMat, transformMatrix);
  }

  if (type === "rotate") {
    const theta = parseFloat(document.getElementById("theta").value) * Math.PI / 180;
    const rMat = mat4.create();
    mat4.rotateZ(rMat, rMat, theta);
    mat4.multiply(transformMatrix, rMat, transformMatrix);
  }

  if (type === "scale") {
    const sx = parseFloat(document.getElementById("sx").value);
    const sy = parseFloat(document.getElementById("sy").value);
    const sMat = mat4.create();
    mat4.scale(sMat, sMat, [sx, sy, 1]);
    mat4.multiply(transformMatrix, sMat, transformMatrix);
  }

  render();
}

function resetTransform() {
  transformMatrix = mat4.create();
  render();
}

function render() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const uTransform = gl.getUniformLocation(program, "uTransform");
  gl.uniformMatrix4fv(uTransform, false, transformMatrix);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}