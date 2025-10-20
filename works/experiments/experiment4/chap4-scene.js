/**
 * chap4-scene-2.js
 * WebGL 场景主逻辑和动画
 * * 修正: 确保 mat4 和 vec3 从 glMatrix 命名空间中正确引入
 */

// ************ 关键修正部分 ************
// 假设 gl-matrix.js 文件将所有功能封装在全局对象 glMatrix 中。
// 从 window 获取 glMatrix 对象，并从中解构 mat4, vec3 等模块。
const glMatrix = window.glMatrix;

// 检查 glMatrix 是否存在，如果不存在，脚本将终止并报错
if (!glMatrix) {
    console.error("glMatrix library is not loaded or not properly exposed globally. Please check the <script> tags in your HTML.");
    // 抛出错误或停止执行，防止后续代码继续报错
    throw new Error("Required glMatrix object is undefined.");
}

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;
// ****************************************


let gl;
let program;
let canvas;
let projectionMatrix = mat4.create(); 
let elements = []; // 存储场景中的所有可动元素
let currentObject = 'triangle'; // 当前选中的绘制对象

// 元素基类
class SceneElement {
    constructor(gl, objectData, initialX, initialY, hexColor) {
        this.buffer = initObjectBuffers(gl, objectData);
        this.color = hexColor;
        this.modelMatrix = mat4.create();
        // 初始位置，转换为 NDC 坐标 (假设画布为 600x600)
        this.position = [
            (initialX / 300) - 1.0, // x
            1.0 - (initialY / 300), // y
            0.0 // z
        ];
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);

        this.type = 'base';
        this.startTime = Date.now();
        this.lastUpdateTime = this.startTime;
    }

    update(currentTime) {
        // 子类实现具体的动画逻辑
    }

    draw(gl, program, viewMatrix) {
        // 绑定缓冲区
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.position);
        gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(program.a_Position);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.color);
        gl.vertexAttribPointer(program.a_Color, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(program.a_Color);

        // 计算 ModelViewMatrix
        const modelViewMatrix = mat4.create();
        mat4.multiply(modelViewMatrix, viewMatrix, this.modelMatrix);

        // 传递矩阵
        gl.uniformMatrix4fv(program.u_ModelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(program.u_ProjectionMatrix, false, projectionMatrix);

        // 绘制
        gl.drawArrays(this.buffer.mode, 0, this.buffer.numVertices);
    }
}

// 1. 正三角形：持续放大缩小并循环
class AnimatedTriangle extends SceneElement {
    constructor(gl, objectData, initialX, initialY, hexColor) {
        super(gl, objectData, initialX, initialY, hexColor);
        this.type = 'triangle';
    }

    update(currentTime) {
        const elapsedTime = (currentTime - this.startTime) / 1000; // 秒
        // 缩放参数在 0.5 - 2 之间变化，周期为 4 秒
        const scale = 1.25 + 0.75 * Math.sin(elapsedTime * Math.PI / 2);
        
        // 重置 Model Matrix (只保留平移)
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);

        // 应用缩放
        mat4.scale(this.modelMatrix, this.modelMatrix, [scale, scale, 1.0]);
    }
}

// 2. 正方形：持续绕 Z 轴转动
class RotatingSquare extends SceneElement {
    constructor(gl, objectData, initialX, initialY, hexColor) {
        super(gl, objectData, initialX, initialY, hexColor);
        this.type = 'square';
        this.rotationSpeed = 60; // 60 度/秒
    }

    update(currentTime) {
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // 秒
        this.lastUpdateTime = currentTime;

        // 计算旋转角度
        const rotationAngle = this.rotationSpeed * ((currentTime - this.startTime) / 1000);

        // 重置 Model Matrix (只保留平移)
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);

        // 绕 Z 轴旋转 (注意 glMatrix.toRadian)
        mat4.rotateZ(this.modelMatrix, this.modelMatrix, glMatrix.toRadian(rotationAngle));
    }
}

// 3. 立方体：持续绕某一特定轴转动，任一时刻都能看到至少两个面
class RotatingCube extends SceneElement {
    constructor(gl, objectData, initialX, initialY, hexColor) {
        super(gl, objectData, initialX, initialY, hexColor);
        this.type = 'cube';
        // 绕 X(1), Y(1), Z(0.5) 轴复合转动，确保能看到多个面
        this.rotationAxis = vec3.fromValues(1.0, 1.0, 0.5); 
        vec3.normalize(this.rotationAxis, this.rotationAxis);
        this.rotationSpeed = 45; // 45 度/秒
    }

    update(currentTime) {
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // 秒
        this.lastUpdateTime = currentTime;

        // 计算旋转角度
        const rotationAngle = this.rotationSpeed * ((currentTime - this.startTime) / 1000);

        // 重置 Model Matrix (只保留平移)
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
        
        // 绕特定轴旋转
        mat4.rotate(this.modelMatrix, this.modelMatrix, glMatrix.toRadian(rotationAngle), this.rotationAxis);
    }
}

// 4. 圆：在 XOY 平面上作随机平移
class RandomMovingCircle extends SceneElement {
    constructor(gl, objectData, initialX, initialY, hexColor) {
        super(gl, objectData, initialX, initialY, hexColor);
        this.type = 'circle';
        this.speed = 0.05; // NDC 坐标 / 秒
        this.target = vec3.fromValues(this.position[0], this.position[1], 0.0);
        this.tolerance = 0.01; // 目标接近容忍度
    }

    update(currentTime) {
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // 秒
        this.lastUpdateTime = currentTime;

        let currentPos = vec3.fromValues(this.position[0], this.position[1], 0.0);
        let direction = vec3.create(); 
        vec3.subtract(direction, this.target, currentPos);
        const distance = vec3.length(direction);

        // 如果接近目标，设置新目标
        if (distance < this.tolerance) {
            this.target = vec3.fromValues(
                (Math.random() * 2 - 1) * 0.9, // -0.9 到 0.9
                (Math.random() * 2 - 1) * 0.9,
                0.0
            );
            vec3.subtract(direction, this.target, currentPos); // 重新计算方向
        }

        // 移动
        vec3.normalize(direction, direction);
        const moveAmount = this.speed * deltaTime;
        
        let moveStep = vec3.create(); 
        vec3.scale(moveStep, direction, moveAmount);
        vec3.add(currentPos, currentPos, moveStep);

        // 更新位置
        this.position[0] = currentPos[0];
        this.position[1] = currentPos[1];

        // 更新模型矩阵
        mat4.identity(this.modelMatrix);
        mat4.translate(this.modelMatrix, this.modelMatrix, this.position);
    }
}


function initWebGL() {
    canvas = document.getElementById('glCanvas');
    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl) {
        console.error("无法初始化 WebGL");
        return;
    }

    // 初始化着色器
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // 获取 attribute 和 uniform 位置
    program.a_Position = gl.getAttribLocation(program, "a_Position");
    program.a_Color = gl.getAttribLocation(program, "a_Color");
    program.u_ModelViewMatrix = gl.getUniformLocation(program, "u_ModelViewMatrix");
    program.u_ProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");

    // 配置 WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 0.9, 1.0); // 浅灰色背景
    gl.enable(gl.DEPTH_TEST); // 启用深度测试

    // 设置投影矩阵 (简单正射投影，NDC 坐标)
    mat4.ortho(projectionMatrix, -1.0, 1.0, -1.0, 1.0, 0.1, 100.0);
    // 基础 View Matrix (观察矩阵)
    // 假设相机在 Z=5 处，看向原点
    const viewMatrix = mat4.create();
    mat4.lookAt(viewMatrix, 
        vec3.fromValues(0, 0, 5), // Camera position
        vec3.fromValues(0, 0, 0), // Target position
        vec3.fromValues(0, 1, 0)  // Up vector
    );
    
    // 初始化事件监听
    initEventListeners(viewMatrix);

    // 开始渲染循环
    render(viewMatrix);
}

function initEventListeners(viewMatrix) {
    // UI 按钮和输入
    document.getElementById('selectTriangle').onclick = () => { currentObject = 'triangle'; };
    document.getElementById('selectSquare').onclick = () => { currentObject = 'square'; };
    document.getElementById('selectCube').onclick = () => { currentObject = 'cube'; };
    document.getElementById('selectCircle').onclick = () => { currentObject = 'circle'; };
    document.getElementById('clearScene').onclick = () => { elements = []; };

    const segmentsRange = document.getElementById('circleSegments');
    const segmentsValueSpan = document.getElementById('segmentsValue');
    segmentsRange.oninput = () => {
        segmentsValueSpan.textContent = segmentsRange.value;
    };


    // 鼠标点击事件
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        // 计算点击在画布上的坐标 (从左上角 (0, 0))
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const color = document.getElementById('colorPicker').value;

        // 根据当前选择的对象创建元素
        let newElement;
        let objectData;
        const segments = parseInt(segmentsRange.value);

        try {
            switch (currentObject) {
                case 'triangle':
                    objectData = createTriangle(color);
                    newElement = new AnimatedTriangle(gl, objectData, x, y, color);
                    break;
                case 'square':
                    objectData = createSquare(color);
                    newElement = new RotatingSquare(gl, objectData, x, y, color);
                    break;
                case 'cube':
                    objectData = createCube(color);
                    newElement = new RotatingCube(gl, objectData, x, y, color);
                    break;
                case 'circle':
                    // 圆的边数可能变化，每次点击都重新创建几何数据
                    objectData = createCircle(color, segments);
                    newElement = new RandomMovingCircle(gl, objectData, x, y, color);
                    break;
                default:
                    return;
            }
        } catch (e) {
            console.error("创建对象失败:", e);
            return;
        }

        elements.push(newElement);
    });
}

function render(viewMatrix) {
    const currentTime = Date.now();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // 遍历所有元素，更新和绘制
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        element.update(currentTime);
        element.draw(gl, program, viewMatrix);
    }

    // 请求下一帧动画
    requestAnimationFrame(() => render(viewMatrix));
}

window.onload = initWebGL;