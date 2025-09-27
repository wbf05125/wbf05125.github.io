"use strict";

var gl;

window.onload = function init(){
	var canvas = document.getElementById( "square-canvas" );
	gl = canvas.getContext("webgl2");
	if( !gl ){
		alert( "WebGL isn't available" );
	}

	// Four Vertices
	var points = new Float32Array([
		-0.5, -0.5,
		 0.5, -0.5,
		 0.5,  0.5,
		-0.5,  0.5,
	]);

	var colors=new Float32Array([
		// 为每个顶点提供颜色（4个顶点×4个颜色分量）
		// 原始代码只提供了一个颜色，这里补充完整
		0.0, 1.0, 0.0, 1.0,    // 顶点1：绿色
		0.0, 1.0, 0.0, 1.0,    // 顶点2：绿色
		0.0, 1.0, 0.0, 1.0,    // 顶点3：绿色
		0.0, 1.0, 0.0, 1.0     // 顶点4：绿色
		// 你也可以尝试为每个顶点设置不同颜色，实现渐变效果
		// 0.0, 1.0, 0.0, 1.0,    // 顶点1：绿色
		// 1.0, 1.0, 0.0, 1.0,    // 顶点2：黄色
		// 1.0, 0.0, 0.0, 1.0,    // 顶点3：红色
		// 0.0, 0.0, 1.0, 1.0     // 顶点4：蓝色
	]);

	// Configure WebGL
	// 原始代码：视口为画布的1/4
	// gl.viewport( 0, 0, canvas.width/2, canvas.height/2 );
	// 修改：视口占满整个画布
	gl.viewport( 0, 0, canvas.width, canvas.height );
	
	// 原始代码：红色背景
	// gl.clearColor( 1.0, 0.0, 0.0, 1.0 );
	// 修改：白色背景
	gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

	// Load shaders and initialize attribute buffers
	var program = initShaders( gl, "vertex-shader", "fragment-shader" );
	gl.useProgram( program );

	// Load the data into the GPU
	var bufferId = gl.createBuffer();
	gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
	gl.bufferData( gl.ARRAY_BUFFER, points, gl.STATIC_DRAW );

	// Associate external shader variables with data buffer
	var vPosition = gl.getAttribLocation( program, "vPosition" );
	gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vPosition );

	
	var cBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

	var vColor = gl.getAttribLocation(program, "vColor");
	gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(vColor);
	
	
	render();
}

function render(){
	gl.clear( gl.COLOR_BUFFER_BIT );
	gl.drawArrays( gl.TRIANGLE_FAN, 0, 4 );
}