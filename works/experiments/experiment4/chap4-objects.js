/**
 * chap4-objects-2.js
 * 定义基本几何对象的顶点和颜色数据生成函数
 */

// 转换十六进制颜色字符串到 RGBA 数组 [r, g, b, a]
function hexToRgba(hex) {
    let r = parseInt(hex.substring(1, 3), 16) / 255;
    let g = parseInt(hex.substring(3, 5), 16) / 255;
    let b = parseInt(hex.substring(5, 7), 16) / 255;
    return [r, g, b, 1.0];
}

/**
 * 创建一个带颜色的正三角形
 * @param {string} hexColor - 十六进制颜色字符串 (e.g., "#ff0000")
 * @returns {{vertices: Float32Array, colors: Float32Array, numVertices: number, mode: number}}
 */
function createTriangle(hexColor) {
    const color = hexToRgba(hexColor);
    const vertices = new Float32Array([
        0.0, 0.5, 0.0,
        -0.5, -0.5, 0.0,
        0.5, -0.5, 0.0
    ]);
    const colors = new Float32Array([
        ...color, ...color, ...color
    ]);
    return {
        vertices: vertices,
        colors: colors,
        numVertices: 3,
        mode: gl.TRIANGLES
    };
}

/**
 * 创建一个带颜色的正方形 (两个三角形)
 * @param {string} hexColor - 十六进制颜色字符串
 * @returns {{vertices: Float32Array, colors: Float32Array, numVertices: number, mode: number}}
 */
function createSquare(hexColor) {
    const color = hexToRgba(hexColor);
    const vertices = new Float32Array([
        -0.5, 0.5, 0.0,
        -0.5, -0.5, 0.0,
        0.5, 0.5, 0.0,
        0.5, 0.5, 0.0,
        -0.5, -0.5, 0.0,
        0.5, -0.5, 0.0
    ]);
    const colorsData = [];
    for (let i = 0; i < 6; i++) {
        colorsData.push(...color);
    }
    return {
        vertices: vertices,
        colors: new Float32Array(colorsData),
        numVertices: 6,
        mode: gl.TRIANGLES
    };
}

/**
 * 创建一个带颜色的立方体
 * @param {string} hexColor - 十六进制颜色字符串
 * @returns {{vertices: Float32Array, colors: Float32Array, numVertices: number, mode: number}}
 */
function createCube(hexColor) {
    const color = hexToRgba(hexColor);
    // 6 个面，每个面 2 个三角形，每个三角形 3 个顶点 = 36 个顶点
    const vertices = new Float32Array([
        // Front face
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5,
        -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Back face
        -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
        -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
        // Top face
        -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
        -0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
        // Bottom face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5,
        -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
        // Right face
        0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5,
        0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
        // Left face
        -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5,
        -0.5, -0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5
    ]);
    const colorsData = [];
    for (let i = 0; i < 36; i++) {
        colorsData.push(...color);
    }
    return {
        vertices: vertices,
        colors: new Float32Array(colorsData),
        numVertices: 36,
        mode: gl.TRIANGLES
    };
}

/**
 * 创建一个带颜色的圆 (风扇形)
 * @param {string} hexColor - 十六进制颜色字符串
 * @param {number} segments - 圆的边数
 * @returns {{vertices: Float32Array, colors: Float32Array, numVertices: number, mode: number}}
 */
function createCircle(hexColor, segments) {
    const radius = 0.5;
    const color = hexToRgba(hexColor);
    const vertices = [0.0, 0.0, 0.0]; // 圆心
    const colorsData = [...color];

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * 2 * Math.PI;
        vertices.push(radius * Math.cos(angle), radius * Math.sin(angle), 0.0);
        colorsData.push(...color);
    }

    return {
        vertices: new Float32Array(vertices),
        colors: new Float32Array(colorsData),
        numVertices: segments + 2, // 圆心 + segments + 1 个边上的点
        mode: gl.TRIANGLE_FAN
    };
}

// 封装 WebGL 缓冲区
function initObjectBuffers(gl, objectData) {
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, objectData.vertices, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, objectData.colors, gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        numVertices: objectData.numVertices,
        mode: objectData.mode,
    };
}