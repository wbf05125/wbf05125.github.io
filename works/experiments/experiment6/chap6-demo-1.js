'use strict';
const { mat4, mat3 } = glMatrix;

function degToRad(d){ return d * Math.PI / 180.0; }
function hexToRgbNorm(hex) {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    return [r,g,b];
}

// GL globals
let gl, canvas;

// shader programs
let programs = { phong: null, gouraud: null };
let currentProgramKey = 'phong';

// model geometry
let model = { vertices:null, normals:null, triIndices:null, wireIndices:null, buffers:{} };

// attribute/uniform locations
let loc = {};

// matrices
let M = mat4.create(), V = mat4.create(), P = mat4.create(), MV = mat4.create(), normalMat3 = mat3.create();

// UI state
let ui = {
    drawMode: 'solid',
    shading: 'phong',
    subdivision: 4,
    modelSelect: 'sphere',
    materialColor: '#888888',
    specColor: '#ffffff',
    shininess: 64,
    ka: 0.2, kd: 1.0, ks: 0.5,
    lightColor: '#ffffff',
    lightPos: [2,2,2],
    useBlinn: true,
    projectionMode: 'perspective',
    fovy: 45,
    camDist: 5,
    cameraRotX: -30,
    cameraRotY: 0
};

// mouse drag
let mouse = { dragging:false, lastX:0, lastY:0 };

// cache OBJ
let objCache = {};

// ---- main ----
window.onload = function main(){
    canvas = document.getElementById('webgl-canvas');
    gl = WebGLUtils.setupWebGL(canvas);
    if(!gl){ alert('WebGL 初始化失败'); return; }

    programs.phong = initShaders(gl, 'vs-phong', 'fs-phong');
    programs.gouraud = initShaders(gl, 'vs-gouraud', 'fs-gouraud');
    useProgram(ui.shading);

    gl.clearColor(0.08,0.08,0.08,1.0);
    gl.enable(gl.DEPTH_TEST);

    buildAndUploadSphere(ui.subdivision);
    setupUI();
    setupMouse();
    requestAnimationFrame(draw);
};

// ---- program ----
function useProgram(key){
    currentProgramKey = key;
    const program = programs[key];
    gl.useProgram(program);
    loc.a_Position = gl.getAttribLocation(program, 'a_Position');
    loc.a_Normal = gl.getAttribLocation(program, 'a_Normal');
    loc.u_ModelView = gl.getUniformLocation(program, 'u_ModelView');
    loc.u_Projection = gl.getUniformLocation(program, 'u_Projection');
    loc.u_NormalMatrix = gl.getUniformLocation(program, 'u_NormalMatrix');
    loc.u_LightPos = gl.getUniformLocation(program, 'u_LightPos');
    loc.u_LightColor = gl.getUniformLocation(program, 'u_LightColor');
    loc.u_ViewPos = gl.getUniformLocation(program, 'u_ViewPos');
    loc.u_Ka = gl.getUniformLocation(program, 'u_Ka');
    loc.u_Kd = gl.getUniformLocation(program, 'u_Kd');
    loc.u_Ks = gl.getUniformLocation(program, 'u_Ks');
    loc.u_Shininess = gl.getUniformLocation(program, 'u_Shininess');
    loc.u_UseBlinn = gl.getUniformLocation(program, 'u_UseBlinn');
}

// ---- sphere builder ----
function buildAndUploadSphere(subdivision){
    const { vertices, normals, triIndices, wireIndices } = buildSphere(subdivision);
    model.vertices = new Float32Array(vertices);
    model.normals = new Float32Array(normals);
    model.triIndices = new Uint16Array(triIndices);
    model.wireIndices = new Uint16Array(wireIndices);
    uploadModelBuffers();
}

function buildSphere(subdivision){
    const sqrt2 = Math.sqrt(2);
    const v0 = [0, 0, 1];
    const v1 = [0, (2*sqrt2)/3, -1/3];
    const v2 = [-Math.sqrt(6)/3, -Math.sqrt(2)/3, -1/3];
    const v3 = [Math.sqrt(6)/3, -Math.sqrt(2)/3, -1/3];

    let vertices=[], normals=[], indices=[], wire=[];
    const vmap=new Map();

    function addVertex(v){
        const len=Math.hypot(v[0],v[1],v[2])||1;
        const p=[v[0]/len,v[1]/len,v[2]/len];
        const key=p.map(n=>n.toFixed(6)).join(',');
        if(vmap.has(key)) return vmap.get(key);
        const idx=vertices.length/3;
        vertices.push(...p);
        normals.push(...p);
        vmap.set(key,idx);
        return idx;
    }
    function mid(a,b){ return [(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2]; }
    function subdivide(a,b,c,d){
        if(d===0){
            const ia=addVertex(a),ib=addVertex(b),ic=addVertex(c);
            indices.push(ia,ib,ic);
            wire.push(ia,ib,ib,ic,ic,ia);
            return;
        }
        const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);
        subdivide(a,ab,ca,d-1);
        subdivide(ab,b,bc,d-1);
        subdivide(ca,bc,c,d-1);
        subdivide(ab,bc,ca,d-1);
    }
    subdivide(v0,v1,v2,subdivision);
    subdivide(v0,v2,v3,subdivision);
    subdivide(v0,v3,v1,subdivision);
    subdivide(v1,v3,v2,subdivision);
    return { vertices, normals, triIndices:indices, wireIndices:wire };
}

// ---- upload ----
function uploadModelBuffers(){
    const m=model;
    m.buffers.vertex=createAndBufferData(m.vertices,gl.ARRAY_BUFFER);
    m.buffers.normal=createAndBufferData(m.normals,gl.ARRAY_BUFFER);
    m.buffers.tri=createAndBufferData(m.triIndices,gl.ELEMENT_ARRAY_BUFFER);
    m.buffers.wire=createAndBufferData(m.wireIndices,gl.ELEMENT_ARRAY_BUFFER);
    m.numTris=m.triIndices.length;
    m.numWire=m.wireIndices.length;
    bindAttrib(loc.a_Position,m.buffers.vertex,3);
    bindAttrib(loc.a_Normal,m.buffers.normal,3);
}

function createAndBufferData(data,target){
    const buf=gl.createBuffer();
    gl.bindBuffer(target,buf);
    gl.bufferData(target,data,gl.STATIC_DRAW);
    return buf;
}
function bindAttrib(locIdx,buffer,size){
    if(locIdx<0)return;
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.vertexAttribPointer(locIdx,size,gl.FLOAT,false,0,0);
    gl.enableVertexAttribArray(locIdx);
}

// ---- draw ----
function draw(){
    const aspect=canvas.clientWidth/canvas.clientHeight;
    if(ui.projectionMode==='perspective'){
        mat4.perspective(P,degToRad(ui.fovy),aspect,0.1,100.0);
    } else {
        const s=5;
        mat4.ortho(P,-s*aspect,s*aspect,-s,s,0.1,100.0);
    }

    mat4.identity(V);
    mat4.translate(V,V,[0,0,-ui.camDist]);
    mat4.rotateX(V,V,degToRad(ui.cameraRotX));
    mat4.rotateY(V,V,degToRad(ui.cameraRotY));

    mat4.identity(M);
    if(model.transform){
        // 已经在加载阶段归一化，可选额外scale
        mat4.scale(M,M,[1,1,1]);
    }

    mat4.multiply(MV,V,M);
    mat3.fromMat4(normalMat3,MV);
    mat3.invert(normalMat3,normalMat3);
    mat3.transpose(normalMat3,normalMat3);

    const lw=[ui.lightPos[0],ui.lightPos[1],ui.lightPos[2],1];
    const lightView4=[
        V[0]*lw[0]+V[4]*lw[1]+V[8]*lw[2]+V[12]*lw[3],
        V[1]*lw[0]+V[5]*lw[1]+V[9]*lw[2]+V[13]*lw[3],
        V[2]*lw[0]+V[6]*lw[1]+V[10]*lw[2]+V[14]*lw[3],
        V[3]*lw[0]+V[7]*lw[1]+V[11]*lw[2]+V[15]*lw[3]
    ];
    const lightView=[lightView4[0]/lightView4[3],lightView4[1]/lightView4[3],lightView4[2]/lightView4[3]];

    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

    if(currentProgramKey!==ui.shading){
        useProgram(ui.shading);
        bindAttrib(loc.a_Position,model.buffers.vertex,3);
        bindAttrib(loc.a_Normal,model.buffers.normal,3);
    }

    gl.uniformMatrix4fv(loc.u_ModelView,false,MV);
    gl.uniformMatrix4fv(loc.u_Projection,false,P);
    gl.uniformMatrix3fv(loc.u_NormalMatrix,false,normalMat3);

    gl.uniform3fv(loc.u_LightPos,lightView);
    gl.uniform3fv(loc.u_LightColor,hexToRgbNorm(ui.lightColor));
    gl.uniform3fv(loc.u_ViewPos,[0,0,0]);

    const matColor=hexToRgbNorm(ui.materialColor);
    const specColor=hexToRgbNorm(ui.specColor);
    gl.uniform3fv(loc.u_Ka,[ui.ka*matColor[0],ui.ka*matColor[1],ui.ka*matColor[2]]);
    gl.uniform3fv(loc.u_Kd,[ui.kd*matColor[0],ui.kd*matColor[1],ui.kd*matColor[2]]);
    gl.uniform3fv(loc.u_Ks,[ui.ks*specColor[0],ui.ks*specColor[1],ui.ks*specColor[2]]);
    gl.uniform1f(loc.u_Shininess,ui.shininess);
    gl.uniform1i(loc.u_UseBlinn,ui.useBlinn?1:0);

    if(ui.drawMode==='solid'){
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,model.buffers.tri);
        gl.drawElements(gl.TRIANGLES,model.numTris,gl.UNSIGNED_SHORT,0);
    }else{
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,model.buffers.wire);
        gl.drawElements(gl.LINES,model.numWire,gl.UNSIGNED_SHORT,0);
    }

    requestAnimationFrame(draw);
}

// ---- UI ----
function setupUI(){
    document.getElementById('draw-mode').addEventListener('change',e=>ui.drawMode=e.target.value);
    document.getElementById('shading-mode').addEventListener('change',e=>ui.shading=e.target.value);
    document.getElementById('subdivision').addEventListener('input',e=>{
        const v=parseInt(e.target.value);
        ui.subdivision=v;
        if(ui.modelSelect==='sphere') buildAndUploadSphere(v);
    });
    document.getElementById('mat-color').addEventListener('input',e=>ui.materialColor=e.target.value);
    document.getElementById('spec-color').addEventListener('input',e=>ui.specColor=e.target.value);
    document.getElementById('shininess').addEventListener('input',e=>ui.shininess=parseFloat(e.target.value));
    document.getElementById('ka').addEventListener('input',e=>ui.ka=parseFloat(e.target.value));
    document.getElementById('kd').addEventListener('input',e=>ui.kd=parseFloat(e.target.value));
    document.getElementById('ks').addEventListener('input',e=>ui.ks=parseFloat(e.target.value));

    document.getElementById('light-color').addEventListener('input',e=>ui.lightColor=e.target.value);
    document.getElementById('light-x').addEventListener('input',e=>ui.lightPos[0]=parseFloat(e.target.value));
    document.getElementById('light-y').addEventListener('input',e=>ui.lightPos[1]=parseFloat(e.target.value));
    document.getElementById('light-z').addEventListener('input',e=>ui.lightPos[2]=parseFloat(e.target.value));
    document.getElementById('use-blinn').addEventListener('change',e=>ui.useBlinn=e.target.checked);

    document.getElementById('projection-mode').addEventListener('change',e=>ui.projectionMode=e.target.value);
    document.getElementById('persp-fovy').addEventListener('input',e=>ui.fovy=parseFloat(e.target.value));
    document.getElementById('cam-dist').addEventListener('input',e=>ui.camDist=parseFloat(e.target.value));

    // 模型切换
    document.getElementById('model-select').addEventListener('change',async e=>{
        ui.modelSelect=e.target.value;
        if(ui.modelSelect==='sphere'){
            buildAndUploadSphere(ui.subdivision);
        } else if(ui.modelSelect==='bones'){
            await loadObjModel('bones.obj');
        }
    });
}

// ---- mouse ----
function setupMouse(){
    canvas.addEventListener('mousedown',e=>{
        mouse.dragging=true; mouse.lastX=e.clientX; mouse.lastY=e.clientY;
    });
    window.addEventListener('mouseup',()=>mouse.dragging=false);
    canvas.addEventListener('mousemove',e=>{
        if(!mouse.dragging)return;
        const dx=e.clientX-mouse.lastX,dy=e.clientY-mouse.lastY;
        ui.cameraRotY+=dx*0.5; ui.cameraRotX+=dy*0.5;
        ui.cameraRotX=Math.max(-89,Math.min(89,ui.cameraRotX));
        mouse.lastX=e.clientX; mouse.lastY=e.clientY;
    });
    canvas.addEventListener('wheel',e=>{
        e.preventDefault();
        ui.camDist+=e.deltaY*0.01;
        ui.camDist=Math.max(1.0,Math.min(50.0,ui.camDist));
    },{passive:false});
}

// ---- OBJ Loader（带自动缩放/居中）----
async function loadObjModel(filename){
    if(objCache[filename]){
        console.log("使用缓存模型", filename);
        Object.assign(model, objCache[filename]);
        uploadModelBuffers();
        return;
    }

    console.log("加载 OBJ 模型:", filename);
    const resp = await fetch(filename);
    const text = await resp.text();

    const verts=[], norms=[], faces=[];
    const lines=text.split('\n');
    for(let line of lines){
        line=line.trim();
        if(line.startsWith('v ')){
            const [,x,y,z]=line.split(/\s+/);
            verts.push([parseFloat(x),parseFloat(y),parseFloat(z)]);
        }else if(line.startsWith('vn ')){
            const [,x,y,z]=line.split(/\s+/);
            norms.push([parseFloat(x),parseFloat(y),parseFloat(z)]);
        }else if(line.startsWith('f ')){
            const parts=line.split(/\s+/).slice(1);
            const faceVerts=[];
            for(let p of parts){
                const [vIdx,,nIdx]=p.split('/').map(v=>parseInt(v));
                faceVerts.push({v:vIdx-1,n:nIdx-1});
            }
            if(faceVerts.length>=3){
                for(let i=1;i<faceVerts.length-1;i++){
                    faces.push([faceVerts[0],faceVerts[i],faceVerts[i+1]]);
                }
            }
        }
    }

    const positions=[], normalsArr=[], indices=[], wire=[];
    let index=0;
    for(const tri of faces){
        for(const v of tri){
            const pos=verts[v.v];
            const nor=norms.length>0?norms[v.n]:[0,0,1];
            positions.push(...pos);
            normalsArr.push(...nor);
            indices.push(index++);
        }
    }
    for(let i=0;i<indices.length;i+=3){
        wire.push(indices[i],indices[i+1]);
        wire.push(indices[i+1],indices[i+2]);
        wire.push(indices[i+2],indices[i]);
    }

    // 自动计算包围盒
    let min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<positions.length;i+=3){
        min[0]=Math.min(min[0],positions[i]);
        min[1]=Math.min(min[1],positions[i+1]);
        min[2]=Math.min(min[2],positions[i+2]);
        max[0]=Math.max(max[0],positions[i]);
        max[1]=Math.max(max[1],positions[i+1]);
        max[2]=Math.max(max[2],positions[i+2]);
    }
    const center=[(min[0]+max[0])/2,(min[1]+max[1])/2,(min[2]+max[2])/2];
    const size=Math.max(max[0]-min[0],max[1]-min[1],max[2]-min[2]);
    const scale=2.0/size;

    for(let i=0;i<positions.length;i+=3){
        positions[i]=(positions[i]-center[0])*scale;
        positions[i+1]=(positions[i+1]-center[1])*scale;
        positions[i+2]=(positions[i+2]-center[2])*scale;
    }

    const mobj={
        vertices:new Float32Array(positions),
        normals:new Float32Array(normalsArr),
        triIndices:new Uint16Array(indices),
        wireIndices:new Uint16Array(wire),
        buffers:{},
        transform:{scale,center}
    };
    objCache[filename]=mobj;
    Object.assign(model,mobj);
    uploadModelBuffers();
    console.log(`OBJ 模型加载完成，原始尺寸 ${size.toFixed(2)}，已缩放 ×${scale.toFixed(3)} 并居中。`);
}
