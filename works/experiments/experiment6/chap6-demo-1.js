'use strict';

// 在 gl-matrix.js 加载后，方便地获取矩阵/向量类型
const { mat4, vec3, quat } = glMatrix;

// 新增：角度转弧度小工具（避免依赖未知命名空间）
function degToRad(d) { return d * Math.PI / 180.0; }

// 新增：向量归一化小工具
function normalize3(v) {
    const len = Math.hypot(v[0], v[1], v[2]) || 1.0;
    return [v[0] / len, v[1] / len, v[2] / len];
}

// --- 全局变量 ---
let gl;
let canvas;
let program;
let model = {
    vertices: null,
    normals: null,
    triangleIndices: null,
    wireframeIndices: null,
    vertCount: 0,
    buffers: {
        vertexBuffer: null,
        normalBuffer: null,
        triangleIndexBuffer: null,
        wireframeIndexBuffer: null
    },
    numTriangleIndices: 0,
    numWireframeIndices: 0
};

// 存储所有 uniform 和 attribute 的位置
let locations = {
    // Attributes
    a_Position: -1,
    a_Normal: -1,
    // Uniforms
    u_MVP: null,
    u_NormalMatrix: null,
    u_Color: null,
    u_LightDir: null
};

// 存储所有矩阵
let matrices = {
    model: mat4.create(),
    view: mat4.create(),
    projection: mat4.create(),
    mvp: mat4.create(),
    normal: mat4.create()
};

// 存储UI控件的状态
let uiState = {
    // 绘制
    drawMode: 'solid',
    solidColor: [0.53, 0.53, 0.53, 1.0], // #888888
    wireframeColor: [1.0, 1.0, 1.0, 1.0], // #FFFFFF
    
    // 投影 (P)
    projectionMode: 'perspective',
    perspFovy: 45.0,
    orthoScale: 5.0,
    near: 0.1,
    far: 100.0,

    // 模型 (M)
    modelTY: -1.5,
    modelRY: 0.0,
    modelScale: 1.0,

    // 相机 (V) - 由鼠标控制
    camera: {
        distance: 5.0,
        rotationX: -30.0, // 绕X轴旋转 (俯仰)
        rotationY: 0.0    // 绕Y轴旋转 (偏航)
    }
};

// 鼠标交互状态
let mouseState = {
    isDragging: false,
    lastX: -1,
    lastY: -1
};

// --- 主函数 ---
window.onload = function main() {
    canvas = document.getElementById('webgl-canvas');
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        console.error("WebGL 无法初始化。");
        return;
    }

    // 1. 初始化着色器
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 2. 获取着色器变量位置
    findShaderLocations();

    // 3. 设置WebGL状态
    gl.clearColor(0.1, 0.1, 0.1, 1.0); // 深灰色背景
    gl.enable(gl.DEPTH_TEST);
    // 临时关闭背面剔除以便调试（若确认模型正确可改回 gl.enable(gl.CULL_FACE)）
    gl.disable(gl.CULL_FACE);
    // gl.enable(gl.CULL_FACE);
    // gl.cullFace(gl.BACK);

    // 4. (任务1) 加载和解析OBJ模型
    loadAndParseOBJ('bones.obj');
    // 注意: loadAndParseOBJ 是异步的, 它会在加载完成后调用 initBuffers 和开始绘制

    // 5. 设置UI事件监听
    setupUIListeners();

    // 6. (任务4) 设置相机交互
    setupMouseControls();
}

/**
 * (任务1) 加载并解析OBJ文件
 * 这是一个简化的解析器，只处理 'v', 'vn', 和 'f' (v//vn 格式)
 */
async function loadAndParseOBJ(url) {
    try {
        console.log('尝试加载 OBJ：', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`无法加载模型文件: ${url} (status ${response.status})`);
        }
        const text = await response.text();
        if (!text) throw new Error('OBJ 文件为空或未正确加载。');

        const temp_vertices = [];
        const temp_normals = [];
        const final_vertices = [];
        const final_normals = [];
        const final_triangleIndices = [];
        const final_wireframeIndices = [];
        const vertexMap = new Map();

        const lines = text.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith('#')) continue;
            const parts = line.split(/\s+/);
            if (parts.length === 0) continue;

            if (parts[0] === 'v') {
                if (parts.length >= 4) {
                    const nums = parts.slice(1, 4).map(n => parseFloat(n));
                    if (nums.every(n => !Number.isNaN(n))) temp_vertices.push(nums);
                    else console.warn('跳过非法顶点行:', line);
                }
            } else if (parts[0] === 'vn') {
                if (parts.length >= 4) {
                    const nums = parts.slice(1, 4).map(n => parseFloat(n));
                    if (nums.every(n => !Number.isNaN(n))) temp_normals.push(nums);
                    else console.warn('跳过非法法线行:', line);
                }
            } else if (parts[0] === 'f') {
                if (parts.length >= 4) {
                    const faceIndices = [];
                    let skipFace = false;
                    for (let i = 1; i <= 3; i++) {
                        const facePart = parts[i];
                        if (vertexMap.has(facePart)) {
                            faceIndices.push(vertexMap.get(facePart));
                        } else {
                            // 支持 v//vn 或 v/vt/vn 等常见格式
                            const sub = facePart.split('/');
                            const v_idx = parseInt(sub[0], 10);
                            const vn_idx = sub.length >= 3 && sub[2] !== '' ? parseInt(sub[2], 10) : null;

                            if (!v_idx || v_idx - 1 < 0 || v_idx - 1 >= temp_vertices.length) {
                                console.warn('缺失顶点索引或索引越界，跳过该面:', facePart, 'line:', line);
                                skipFace = true;
                                break;
                            }
                            if (vn_idx !== null && (vn_idx - 1 < 0 || vn_idx - 1 >= temp_normals.length)) {
                                console.warn('缺失法线索引或索引越界，跳过该面:', facePart, 'line:', line);
                                skipFace = true;
                                break;
                            }

                            const newIndex = final_vertices.length / 3;
                            const v = temp_vertices[v_idx - 1];
                            const vn = vn_idx ? temp_normals[vn_idx - 1] : [0, 0, 1];

                            final_vertices.push(v[0], v[1], v[2]);
                            final_normals.push(vn[0], vn[1], vn[2]);

                            vertexMap.set(facePart, newIndex);
                            faceIndices.push(newIndex);
                        }
                    }

                    if (!skipFace && faceIndices.length === 3) {
                        final_triangleIndices.push(faceIndices[0], faceIndices[1], faceIndices[2]);
                        final_wireframeIndices.push(faceIndices[0], faceIndices[1], faceIndices[1], faceIndices[2], faceIndices[2], faceIndices[0]);
                    }
                }
            }
        }

        if (final_vertices.length === 0) {
            throw new Error('解析后没有有效顶点，请检查 OBJ 文件格式。');
        }

        model.vertices = new Float32Array(final_vertices);
        model.normals = new Float32Array(final_normals);
        model.triangleIndices = new Uint16Array(final_triangleIndices);
        model.wireframeIndices = new Uint16Array(final_wireframeIndices);
        model.numTriangleIndices = model.triangleIndices.length;
        model.numWireframeIndices = model.wireframeIndices.length;

        console.log(`模型加载完成: ${model.vertices.length/3} 顶点, ${model.numTriangleIndices/3} 三角形`);
        initBuffers();
        requestAnimationFrame(draw);
    } catch (err) {
        console.error('loadAndParseOBJ 错误:', err);
        alert('模型加载失败：' + err.message + '\n请检查 bones.obj 是否存在并且路径正确。');
    }
}

/**
 * (任务2) 初始化 WebGL 缓冲区
 */
function initBuffers() {
    const bufs = model.buffers;

    // 创建、绑定并发送数据到GPU
    bufs.vertexBuffer = createAndBufferData(model.vertices, gl.ARRAY_BUFFER);
    bufs.normalBuffer = createAndBufferData(model.normals, gl.ARRAY_BUFFER);
    bufs.triangleIndexBuffer = createAndBufferData(model.triangleIndices, gl.ELEMENT_ARRAY_BUFFER);
    bufs.wireframeIndexBuffer = createAndBufferData(model.wireframeIndices, gl.ELEMENT_ARRAY_BUFFER);

    // 设置顶点位置 attribute
    bindAttributeToBuffer(locations.a_Position, bufs.vertexBuffer, 3);
    // 设置顶点法线 attribute
    bindAttributeToBuffer(locations.a_Normal, bufs.normalBuffer, 3);
}

/**
 * 渲染循环
 */
function draw() {
    // 简单调试输出（每帧可能很多，必要时注释）
    // console.log('draw frame, triIndices=', model.numTriangleIndices, 'buffers.vertex=', !!model.buffers.vertexBuffer);

    // --- 1. 更新矩阵 (任务3, 4, 5) ---
    
    // (任务5) 计算投影矩阵 (P)
    const aspect = canvas.clientWidth / canvas.clientHeight;
    if (uiState.projectionMode === 'perspective') {
        mat4.perspective(
            matrices.projection,
            degToRad(uiState.perspFovy),
            aspect,
            uiState.near,
            uiState.far
        );
    } else { // 'ortho'
        const h = uiState.orthoScale;
        const w = h * aspect;
        mat4.ortho(
            matrices.projection,
            -w / 2, w / 2, -h / 2, h / 2, 
            uiState.near, 
            uiState.far
        );
    }

    // (任务4) 计算视图矩阵 (V) - 基于鼠标交互
    mat4.identity(matrices.view);
    // 摄像机沿着Z轴平移（拉远）
    mat4.translate(matrices.view, matrices.view, [0, 0, -uiState.camera.distance]);
    // 摄像机绕X轴旋转（俯仰）
    mat4.rotate(matrices.view, matrices.view, degToRad(uiState.camera.rotationX), [1, 0, 0]);
    // 摄像机绕Y轴旋转（偏航）
    mat4.rotate(matrices.view, matrices.view, degToRad(uiState.camera.rotationY), [0, 1, 0]);

    // (任务3) 计算模型矩阵 (M) - 基于UI滑块
    mat4.identity(matrices.model);
    mat4.translate(matrices.model, matrices.model, [0, uiState.modelTY, 0]);
    mat4.rotate(matrices.model, matrices.model, degToRad(uiState.modelRY), [0, 1, 0]);
    mat4.scale(matrices.model, matrices.model, [uiState.modelScale, uiState.modelScale, uiState.modelScale]);

    // --- 2. 组合矩阵 ---
    
    // MVP = P * V * M
    mat4.multiply(matrices.mvp, matrices.projection, matrices.view);
    mat4.multiply(matrices.mvp, matrices.mvp, matrices.model);

    // NormalMatrix = transpose(invert(M))
    mat4.invert(matrices.normal, matrices.model);
    mat4.transpose(matrices.normal, matrices.normal);

    // --- 3. 绘制 ---
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // 检查模型是否已加载
    if (!model.buffers.vertexBuffer) {
        requestAnimationFrame(draw);
        return;
    }

    // 绑定属性 (每次绘制前都绑定是好习惯，虽然在此例中可以省略)
    bindAttributeToBuffer(locations.a_Position, model.buffers.vertexBuffer, 3);
    bindAttributeToBuffer(locations.a_Normal, model.buffers.normalBuffer, 3);
    
    // 发送 Uniforms 到 GPU
    gl.uniformMatrix4fv(locations.u_MVP, false, matrices.mvp);
    gl.uniformMatrix4fv(locations.u_NormalMatrix, false, matrices.normal);

    // 归一化光照方向再发送
    const lightDir = normalize3([0.5, 0.5, 0.5]);
    gl.uniform3f(locations.u_LightDir, lightDir[0], lightDir[1], lightDir[2]);

    // (任务2) 切换绘制模式
    if (uiState.drawMode === 'solid') {
        gl.uniform4fv(locations.u_Color, uiState.solidColor);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.buffers.triangleIndexBuffer);
        gl.drawElements(gl.TRIANGLES, model.numTriangleIndices, gl.UNSIGNED_SHORT, 0);
    } else { // 'wireframe'
        gl.uniform4fv(locations.u_Color, uiState.wireframeColor);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model.buffers.wireframeIndexBuffer);
        gl.drawElements(gl.LINES, model.numWireframeIndices, gl.UNSIGNED_SHORT, 0);
    }
    
    // 请求下一帧
    requestAnimationFrame(draw);
}


// --- 辅助函数 ---

/**
 * 查找所有 shader attribute 和 uniform 的位置
 */
function findShaderLocations() {
    locations.a_Position = gl.getAttribLocation(program, 'a_Position');
    locations.a_Normal = gl.getAttribLocation(program, 'a_Normal');
    locations.u_MVP = gl.getUniformLocation(program, 'u_MVP');
    locations.u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
    locations.u_Color = gl.getUniformLocation(program, 'u_Color');
    locations.u_LightDir = gl.getUniformLocation(program, 'u_LightDir');
}

/**
 * 创建、绑定并填充数据的缓冲区
 */
function createAndBufferData(data, target) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    return buffer;
}

/**
 * 将一个缓冲区绑定到一个 attribute
 */
function bindAttributeToBuffer(attribLoc, buffer, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(attribLoc, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attribLoc);
}

/**
 * 16进制颜色转为 [r, g, b, a] (0.0 - 1.0)
 */
function hexToRgba(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, 1.0];
}

/**
 * (任务 3, 5) 链接所有HTML控件到 uiState
 */
function setupUIListeners() {
    // 绘制控制
    document.getElementById('draw-mode').addEventListener('change', (e) => uiState.drawMode = e.target.value);
    document.getElementById('solid-color').addEventListener('input', (e) => uiState.solidColor = hexToRgba(e.target.value));
    document.getElementById('wireframe-color').addEventListener('input', (e) => uiState.wireframeColor = hexToRgba(e.target.value));

    // 成像控制
    const perspControls = document.getElementById('perspective-controls');
    const orthoControls = document.getElementById('ortho-controls');
    document.getElementById('projection-mode').addEventListener('change', (e) => {
        uiState.projectionMode = e.target.value;
        perspControls.style.display = (uiState.projectionMode === 'perspective') ? 'block' : 'none';
        orthoControls.style.display = (uiState.projectionMode === 'ortho') ? 'block' : 'none';
    });
    document.getElementById('persp-fovy').addEventListener('input', (e) => uiState.perspFovy = parseFloat(e.target.value));
    document.getElementById('ortho-scale').addEventListener('input', (e) => uiState.orthoScale = parseFloat(e.target.value));
    document.getElementById('proj-near').addEventListener('input', (e) => uiState.near = parseFloat(e.target.value));
    document.getElementById('proj-far').addEventListener('input', (e) => uiState.far = parseFloat(e.target.value));

    // 模型变换
    document.getElementById('model-ty').addEventListener('input', (e) => uiState.modelTY = parseFloat(e.target.value));
    document.getElementById('model-ry').addEventListener('input', (e) => uiState.modelRY = parseFloat(e.target.value));
    document.getElementById('model-scale').addEventListener('input', (e) => uiState.modelScale = parseFloat(e.target.value));
}

/**
 * (任务4) 设置相机交互
 */
function setupMouseControls() {
    canvas.addEventListener('mousedown', (e) => {
        mouseState.isDragging = true;
        mouseState.lastX = e.clientX;
        mouseState.lastY = e.clientY;
    });

    canvas.addEventListener('mouseup', () => mouseState.isDragging = false);
    canvas.addEventListener('mouseout', () => mouseState.isDragging = false);

    canvas.addEventListener('mousemove', (e) => {
        if (!mouseState.isDragging) return;

        const deltaX = e.clientX - mouseState.lastX;
        const deltaY = e.clientY - mouseState.lastY;

        // 更新相机旋转
        uiState.camera.rotationY += deltaX * 0.5; // 左右拖拽 -> 绕Y轴旋转
        uiState.camera.rotationX += deltaY * 0.5; // 上下拖拽 -> 绕X轴旋转

        // 限制俯仰角度
        uiState.camera.rotationX = Math.max(-89, Math.min(89, uiState.camera.rotationX));

        mouseState.lastX = e.clientX;
        mouseState.lastY = e.clientY;
    });

    // 鼠标滚轮缩放 (Dolly)
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        uiState.camera.distance += e.deltaY * 0.01;
        uiState.camera.distance = Math.max(1.0, Math.min(50.0, uiState.camera.distance)); // 限制缩放范围
    });
}