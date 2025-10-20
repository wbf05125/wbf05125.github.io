// chap4-scene.js
let gl, program;
let objects = [];
let currentShape = "triangle";
let selectedColor = [0.0, 1.0, 1.0];
let circleSides = 36;

window.onload = function() {
  const canvas = document.getElementById("gl-canvas");
  gl = WebGLUtils.setupWebGL(canvas);
  if (!gl) alert("WebGL not available");

  program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);

  // 控件事件
  document.getElementById("triangleBtn").onclick = () => currentShape = "triangle";
  document.getElementById("squareBtn").onclick = () => currentShape = "square";
  document.getElementById("cubeBtn").onclick = () => currentShape = "cube";
  document.getElementById("circleBtn").onclick = () => currentShape = "circle";
  document.getElementById("colorPicker").oninput = (e) => selectedColor = hexToRgb(e.target.value);
  document.getElementById("circleSides").oninput = (e) => circleSides = parseInt(e.target.value);
  document.getElementById("clearBtn").onclick = () => objects = [];

  // 鼠标点击添加对象
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / canvas.width) * 2 - 1;
    const y = ((canvas.height - (e.clientY - rect.top)) / canvas.height) * 2 - 1;
    const newObj = new SceneObject(currentShape, [x, y, 0], selectedColor, circleSides);
    objects.push(newObj);
  });

  render();
};

// 渲染循环
function render() {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  for (let obj of objects) {
    obj.update();
    drawObject(obj);
  }

  requestAnimationFrame(render);
}

function drawObject(obj) {
  let vertices, indices, primitiveType;

  switch(obj.type) {
    case "triangle":
      vertices = createTriangleData();
      primitiveType = gl.TRIANGLES;
      break;
    case "square":
      vertices = createSquareData();
      primitiveType = gl.TRIANGLE_FAN;
      break;
    case "circle":
      vertices = createCircleData(obj.sides);
      primitiveType = gl.TRIANGLE_FAN;
      break;
    case "cube":
      const cube = createCubeData();
      vertices = cube.vertices;
      indices = cube.indices;
      primitiveType = gl.TRIANGLES;
      break;
  }

  const vBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const vPosition = gl.getAttribLocation(program, "aPosition");
  gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  const uColor = gl.getUniformLocation(program, "uColor");
  gl.uniform3fv(uColor, obj.color);

  const uModelMatrix = gl.getUniformLocation(program, "uModelMatrix");
  let model = mat4.create();
  mat4.translate(model, model, obj.position);
  mat4.scale(model, model, [obj.scale, obj.scale, obj.scale]);
  if (obj.type === "square" || obj.type === "cube") {
    mat4.rotateZ(model, model, obj.angle * Math.PI / 180);
  }
  if (obj.type === "cube") {
    mat4.rotateY(model, model, obj.angle * Math.PI / 180);
  }
  gl.uniformMatrix4fv(uModelMatrix, false, model);

  if (obj.type === "cube") {
    const iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.drawElements(primitiveType, indices.length, gl.UNSIGNED_SHORT, 0);
  } else {
    gl.drawArrays(primitiveType, 0, vertices.length / 3);
  }
}

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return [(bigint >> 16 & 255) / 255, (bigint >> 8 & 255) / 255, (bigint & 255) / 255];
}