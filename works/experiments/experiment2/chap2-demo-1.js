"use strict";

var gl;
var program;
var vertices = [];

// 页面加载完成后初始化
window.onload = function init() {
    // 获取Canvas元素
    var canvas = document.getElementById("glCanvas");
    // 获取WebGL上下文（与示例一致）
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("WebGL 2 isn't available");
    }

    // 配置WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // 白色背景

    // 加载着色器（与示例一致，使用ID选择器）
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 初始化绘制
    draw();

    // 为绘制按钮添加点击事件
    document.getElementById('drawBtn').addEventListener('click', draw);
};

// 生成谢尔宾斯基三角形顶点数据
function generateSierpinskiGasket(level, p1, p2, p3) {
    if (level === 0) {
        vertices.push(p1[0], p1[1]);
        vertices.push(p2[0], p2[1]);
        vertices.push(p3[0], p3[1]);
    } else {
        // 计算各边中点
        const p12 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
        const p23 = [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2];
        const p31 = [(p3[0] + p1[0]) / 2, (p3[1] + p1[1]) / 2];

        // 递归生成三个子三角形
        generateSierpinskiGasket(level - 1, p1, p12, p31);
        generateSierpinskiGasket(level - 1, p12, p2, p23);
        generateSierpinskiGasket(level - 1, p31, p23, p3);
    }
}

// 绘制函数
function draw() {
    // 清空画布
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 获取输入的层次
    const level = parseInt(document.getElementById('level').value);
    // 重置顶点数组
    vertices = [];

    // 定义初始大三角形的三个顶点
    const p1 = [-0.8, 0.8];
    const p2 = [0.8, 0.8];
    const p3 = [0, -0.8];

    // 生成谢尔宾斯基三角形顶点数据
    generateSierpinskiGasket(level, p1, p2, p3);

    // 创建缓冲区对象（与示例一致的流程）
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // 关联顶点位置属性（与示例一致，使用vPosition变量名）
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // 设置颜色
    const u_FragColor = gl.getUniformLocation(program, "u_FragColor");
    gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);  // 红色

    // 绘制三角形
    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}