"use strict";

const { vec3, vec4, mat4 } = glMatrix;

let canvas, gl;
let modelViewMatrixLoc, projectionMatrixLoc;

let NumVertices = 36;
let points = [], colors = [];

// 观察参数
let near = 0.1;
let far = 10.0;
let radius = 4.0;
let theta = 0.0;
let phi = 0.0;
let dtheta = 5.0 * Math.PI / 180.0;
let fovy = 45.0 * Math.PI / 180.0;
let aspect;

// 模型参数
let tx = 0.0, ty = 0.0, tz = 0.0;
let rotY = 0.0;

const at = vec3.fromValues(0.0, 0.0, 0.0);
const up = vec3.fromValues(0.0, 1.0, 0.0);

function makeColorCube() {
    const vertices = [
        vec4.fromValues(-0.5, -0.5, 0.5, 1.0),
        vec4.fromValues(-0.5, 0.5, 0.5, 1.0),
        vec4.fromValues(0.5, 0.5, 0.5, 1.0),
        vec4.fromValues(0.5, -0.5, 0.5, 1.0),
        vec4.fromValues(-0.5, -0.5, -0.5, 1.0),
        vec4.fromValues(-0.5, 0.5, -0.5, 1.0),
        vec4.fromValues(0.5, 0.5, -0.5, 1.0),
        vec4.fromValues(0.5, -0.5, -0.5, 1.0)
    ];

    const vertexColors = [
        vec4.fromValues(1.0, 0.0, 0.0, 1.0),
        vec4.fromValues(0.0, 1.0, 0.0, 1.0),
        vec4.fromValues(0.0, 0.0, 1.0, 1.0),
        vec4.fromValues(1.0, 1.0, 0.0, 1.0),
        vec4.fromValues(1.0, 0.0, 1.0, 1.0),
        vec4.fromValues(0.0, 1.0, 1.0, 1.0),
        vec4.fromValues(0.7, 0.7, 0.7, 1.0),
        vec4.fromValues(1.0, 1.0, 1.0, 1.0)
    ];

    const faces = [
        1, 0, 3, 1, 3, 2,
        2, 3, 7, 2, 7, 6,
        3, 0, 4, 3, 4, 7,
        6, 5, 1, 6, 1, 2,
        4, 5, 6, 4, 6, 7,
        5, 4, 0, 5, 0, 1
    ];

    for (let i = 0; i < faces.length; i++) {
        const vidx = faces[i];
        points.push(vertices[vidx][0], vertices[vidx][1], vertices[vidx][2], vertices[vidx][3]);
        const color = vertexColors[Math.floor(i / 6)];
        colors.push(color[0], color[1], color[2], color[3]);
    }
}

function initCube() {
    canvas = document.getElementById("gl-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) alert("WebGL2 not supported");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    aspect = canvas.width / canvas.height;

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    makeColorCube();

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    const cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    // 键盘交互控制
    document.onkeydown = handleKeyDown;
    render();
}

function handleKeyDown(event) {
    const key = event.key.toLowerCase();

    switch (key) {
        case "arrowleft": phi += dtheta; break;
        case "arrowright": phi -= dtheta; break;
        case "arrowup": theta += dtheta; break;
        case "arrowdown": theta -= dtheta; break;

        case "w": radius *= 0.9; break; // 前进（拉近）
        case "s": radius *= 1.1; break; // 后退（拉远）

        case "a": rotY -= dtheta; break; // 左旋转物体
        case "d": rotY += dtheta; break; // 右旋转物体

        case "i": ty += 0.1; break; // 上移
        case "k": ty -= 0.1; break; // 下移
        case "j": tx -= 0.1; break; // 左移
        case "l": tx += 0.1; break; // 右移

        case "z": fovy -= 5 * Math.PI / 180.0; break; // 减小视角
        case "x": fovy += 5 * Math.PI / 180.0; break; // 增大视角
    }
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const eye = vec3.fromValues(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta)
    );

    // 视图矩阵
    const mvMatrix = mat4.create();
    mat4.lookAt(mvMatrix, eye, at, up);

    // 模型变换
    mat4.translate(mvMatrix, mvMatrix, [tx, ty, tz]);
    mat4.rotateY(mvMatrix, mvMatrix, rotY);

    // 透视投影矩阵
    const pMatrix = mat4.create();
    mat4.perspective(pMatrix, fovy, aspect, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, mvMatrix);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, pMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, NumVertices);
    requestAnimFrame(render);
}
