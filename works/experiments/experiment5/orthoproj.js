"use strict";

const { mat4, vec3, vec4 } = glMatrix;

let canvas, gl;
let modelViewMatrixLoc, projectionMatrixLoc;
let points = [], colors = [];

let radius = 2.0;
let theta = 0.0;
let phi = 0.0;
let dtheta = 5.0 * Math.PI / 180.0;

let near = -2.0;
let far = 2.0;
let left = -1.0;
let right = 1.0;
let ytop = 1.0;
let ybottom = -1.0;

// 物体变换参数
let tx = 0.0, ty = 0.0, tz = 0.0;
let rotY = 0.0;

// 相机参数
const eyeat = vec3.fromValues(0.0, 0.0, 0.0);
const eyeup = vec3.fromValues(0.0, 1.0, 0.0);

function makeColorCube() {
    const vertices = [
        vec4.fromValues(-0.5, -0.5,  0.5, 1.0),
        vec4.fromValues(-0.5,  0.5,  0.5, 1.0),
        vec4.fromValues( 0.5,  0.5,  0.5, 1.0),
        vec4.fromValues( 0.5, -0.5,  0.5, 1.0),
        vec4.fromValues(-0.5, -0.5, -0.5, 1.0),
        vec4.fromValues(-0.5,  0.5, -0.5, 1.0),
        vec4.fromValues( 0.5,  0.5, -0.5, 1.0),
        vec4.fromValues( 0.5, -0.5, -0.5, 1.0)
    ];

    const vertexColors = [
        vec4.fromValues(1.0, 0.0, 0.0, 1.0),
        vec4.fromValues(0.0, 1.0, 0.0, 1.0),
        vec4.fromValues(0.0, 0.0, 1.0, 1.0),
        vec4.fromValues(1.0, 1.0, 0.0, 1.0),
        vec4.fromValues(1.0, 0.0, 1.0, 1.0),
        vec4.fromValues(0.0, 1.0, 1.0, 1.0),
        vec4.fromValues(0.5, 0.5, 0.5, 1.0),
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
        points.push(vertices[vidx][0], vertices[vidx][1], vertices[vidx][2]);
        const color = vertexColors[Math.floor(i / 6)];
        colors.push(color[0], color[1], color[2], color[3]);
    }
}

function initCube() {
    canvas = document.getElementById("proj-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) alert("WebGL2 not supported");

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    makeColorCube();

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
    const vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    const cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    const vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    // 按钮交互
    document.getElementById("btn1").onclick = () => near -= 0.1;
    document.getElementById("btn2").onclick = () => near += 0.1;
    document.getElementById("btn3").onclick = () => radius += 0.1;
    document.getElementById("btn4").onclick = () => radius -= 0.1;
    document.getElementById("btn5").onclick = () => theta += dtheta;
    document.getElementById("btn6").onclick = () => theta -= dtheta;
    document.getElementById("btn7").onclick = () => phi += dtheta;
    document.getElementById("btn8").onclick = () => phi -= dtheta;

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 计算观察点位置（标准球坐标公式）
    const eye = vec3.fromValues(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta)
    );

    // 视图矩阵
    const mvMatrix = mat4.create();
    mat4.lookAt(mvMatrix, eye, eyeat, eyeup);

    // 物体平移 + 旋转
    mat4.translate(mvMatrix, mvMatrix, [tx, ty, tz]);
    mat4.rotateY(mvMatrix, mvMatrix, rotY);

    // 正交投影矩阵
    const pMatrix = mat4.create();
    mat4.ortho(pMatrix, left, right, ybottom, ytop, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, mvMatrix);
    gl.uniformMatrix4fv(projectionMatrixLoc, false, pMatrix);

    gl.drawArrays(gl.TRIANGLES, 0, points.length / 3);
    requestAnimFrame(render);
}
