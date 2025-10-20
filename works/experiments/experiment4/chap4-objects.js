// chap4-objects.js
// 定义图形对象类与顶点数据

class SceneObject {
  constructor(type, position, color, sides = 36) {
    this.type = type;
    this.position = position; // vec3
    this.color = color;
    this.sides = sides; // 对于圆形
    this.angle = 0;
    this.scale = 1;
    this.scaleDir = 1;
  }

  update() {
    switch (this.type) {
      case 'triangle':
        this.scale += this.scaleDir * 0.01;
        if (this.scale > 2 || this.scale < 0.5) this.scaleDir *= -1;
        break;
      case 'square':
        this.angle += 1;
        break;
      case 'cube':
        this.angle += 0.8;
        break;
      case 'circle':
        this.position[0] += (Math.random() - 0.5) * 0.01;
        this.position[1] += (Math.random() - 0.5) * 0.01;
        break;
    }
  }
}

// 各形状的顶点生成函数
function createTriangleData() {
  return new Float32Array([
    0.0,  0.2, 0.0,
   -0.2, -0.2, 0.0,
    0.2, -0.2, 0.0
  ]);
}

function createSquareData() {
  return new Float32Array([
   -0.2,  0.2, 0.0,
   -0.2, -0.2, 0.0,
    0.2, -0.2, 0.0,
    0.2,  0.2, 0.0
  ]);
}

function createCircleData(sides = 36) {
  const data = [0, 0, 0];
  const step = 2 * Math.PI / sides;
  for (let i = 0; i <= sides; i++) {
    const x = Math.cos(i * step) * 0.2;
    const y = Math.sin(i * step) * 0.2;
    data.push(x, y, 0);
  }
  return new Float32Array(data);
}

function createCubeData() {
  const vertices = new Float32Array([
    -0.2, -0.2,  0.2,  0.2, -0.2,  0.2,  0.2,  0.2,  0.2, -0.2,  0.2,  0.2, // front
    -0.2, -0.2, -0.2, -0.2,  0.2, -0.2,  0.2,  0.2, -0.2,  0.2, -0.2, -0.2  // back
  ]);
  const indices = new Uint16Array([
    0,1,2, 0,2,3,   1,5,6, 1,6,2,
    4,0,3, 4,3,7,   4,5,1, 4,1,0,
    3,2,6, 3,6,7,   4,7,6, 4,6,5
  ]);
  return { vertices, indices };
}