// 存储三角形顶点数据的数组
let vertices = [];

// 生成线框模式谢尔宾斯基三角形顶点数据
function generateWireframeSierpinskiGasket(level, p1, p2, p3) {
  if (level === 0) {
    // 绘制三角形的三条边
    vertices.push(p1[0], p1[1]);
    vertices.push(p2[0], p2[1]);
    vertices.push(p2[0], p2[1]);
    vertices.push(p3[0], p3[1]);
    vertices.push(p3[0], p3[1]);
    vertices.push(p1[0], p1[1]);
  } else {
    // 计算各边中点
    const p12 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    const p23 = [(p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2];
    const p31 = [(p3[0] + p1[0]) / 2, (p3[1] + p1[1]) / 2];

    // 递归生成三个子三角形的线框
    generateWireframeSierpinskiGasket(level - 1, p1, p12, p31);
    generateWireframeSierpinskiGasket(level - 1, p12, p2, p23);
    generateWireframeSierpinskiGasket(level - 1, p31, p23, p3);
  }
}

// 绘制函数
function draw() {
  // 获取Canvas元素
  const canvas = document.getElementById('glCanvas');
  // 获取WebGL上下文（使用webgl）
  const gl = canvas.getContext('webgl');

  if (!gl) {
    alert('无法获取WebGL上下文，请确保浏览器支持WebGL');
    return;
  }

  // 初始化着色器
  const program = initShaders(gl, "vertex-shader", "fragment-shader");
  if (!program) {
    console.error('初始化着色器失败');
    return;
  }
  gl.useProgram(program);

  // 获取attribute变量和uniform变量的位置
  const a_Position = gl.getAttribLocation(program, 'a_Position');
  const u_RotateMatrix = gl.getUniformLocation(program, 'u_RotateMatrix');
  const u_FragColor = gl.getUniformLocation(program, 'u_FragColor');

  // 清空画布
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // 获取输入的层次和旋转角度
  const level = parseInt(document.getElementById('level').value);
  const angle = parseInt(document.getElementById('angle').value);
  // 重置顶点数组
  vertices = [];

  // 定义初始大三角形的三个顶点
  const p1 = [-0.8, 0.8];
  const p2 = [0.8, 0.8];
  const p3 = [0, -0.8];

  // 生成线框模式谢尔宾斯基三角形顶点数据
  generateWireframeSierpinskiGasket(level, p1, p2, p3);

  // 创建缓冲区对象
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.error('无法创建缓冲区对象');
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // 将顶点数据写入缓冲区
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // 将缓冲区对象分配给a_Position变量
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // 计算旋转矩阵（绕z轴旋转）
  const rad = angle * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rotateMatrix = [
    cos, -sin, 0, 0,
    sin, cos, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];

  // 将旋转矩阵传递给着色器
  gl.uniformMatrix4fv(u_RotateMatrix, false, rotateMatrix);

  // 设置线框颜色为红色
  gl.uniform4f(u_FragColor, 1.0, 0.0, 0.0, 1.0);

  // 绘制线段（线框模式）
  gl.drawArrays(gl.LINES, 0, vertices.length / 2);
}

// 为绘制按钮添加点击事件
document.getElementById('drawBtn').addEventListener('click', draw);
// 页面加载完成后默认绘制一次
window.addEventListener('load', draw);