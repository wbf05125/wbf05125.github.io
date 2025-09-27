"use strict";

var gl;
var points;
var program; // 新增：存储着色器程序对象
var scaleUniformLocation; // 新增：缩放因子 uniforms 位置

window.onload = function init() {
    var canvas = document.getElementById("triangle-canvas");
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL isn't available");
    }

    // 三个顶点
    var vertices = new Float32Array([
        -1.0, -1.0,
        1.0, -1.0,
        0.0, 1.0,
    ]);

    var vertcolors = new Float32Array([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
    ]);
    // 配置 WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // 加载着色器并初始化属性缓冲区
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 获取 uniforms 位置
    scaleUniformLocation = gl.getUniformLocation(program, "uScale");

    // 加载顶点数据到 GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 关联顶点属性与数据缓冲区
    var aPosition = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    var cbufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cbufferId);
    gl.bufferData(gl.ARRAY_BUFFER, vertcolors, gl.STATIC_DRAW);

    var aColor = gl.getAttribLocation(program, "aColor");
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aColor);

    // 滑块事件监听：拖动时更新缩放因子并重新绘制
    var scaleSlider = document.getElementById("scaleSlider");
    var scaleValue = document.getElementById("scaleValue");
    scaleSlider.addEventListener("input", function () {
        var scale = parseFloat(scaleSlider.value);
        scaleValue.textContent = scale.toFixed(1);
        gl.uniform1f(scaleUniformLocation, scale); // 将滑块值传递给 uniforms
        render(); // 重新绘制
    });

    // 初始化缩放因子为默认值
    gl.uniform1f(scaleUniformLocation, 1.0);

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}