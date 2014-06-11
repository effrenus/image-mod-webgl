(function(){

    'use strict';


    var gl,
        resizeToWidth = 1024;


function init(){

    
    function cancel(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }

    document.addEventListener('dragenter', cancel, false);
    document.addEventListener('dragover', cancel, false);


    document.addEventListener('drop', function(e){
        
        e.preventDefault();
        e.stopPropagation();

        var reader = new FileReader();
        reader.onload = function(e){

            var textureImage = new Image();
            textureImage.onload = function(){

                var ratio = textureImage.width/textureImage.height;

                gl.viewportWidth = wrap.canvas.width = resizeToWidth;
                gl.viewportHeight = wrap.canvas.height = resizeToWidth/ratio;

                wrap.createTexture(textureImage);
                wrap.initScene();
                wrap.drawScene();

                //var domImage = document.createElement("img");
                //domImage.src = wrap.canvas.toDataURL('image/jpeg');
                //document.body.appendChild(domImage);

                //wrap.clear();
            }
            textureImage.src = e.currentTarget.result;

        }
        reader.readAsDataURL(e.dataTransfer.files[0]);

    }, false);

    



    var wrap = new WebGLWrap();



}

var WebGLWrap = function(){
    
    gl = this.createContext();
    
    this.shaders = new DOMShaders();
    this.compileShaders();

    this.shaderProgram = this.createShaderProgram();
    
    this.createBuffers();
}

WebGLWrap.prototype = {
    
    constructor: WebGLWrap,

    clear: function(){
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
    },

    createContext: function(){
        if(gl)
            return gl;

        var canvas = document.createElement('canvas'),
            gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if(!gl)
        {
            console.log("WebGL doesn't supported or disabled. Install latest version of Chrome, Firefox or Opera");
        }

        gl.viewportWidth = canvas.width = 50;
        gl.viewportHeight = canvas.height = 50;

        this.canvas = canvas;

        document.body.appendChild(canvas);

        return gl;
    },

    compileShaders: function(){
        var shader,
            self = this;

        [].forEach.call(['vertex', 'fragment'], function(type){
            shader = (type == 'vertex') ? gl.createShader(gl.VERTEX_SHADER) : gl.createShader(gl.FRAGMENT_SHADER);
            
            gl.shaderSource(shader, self.shaders[type].code);
            gl.compileShader(shader);

            if(gl.getShaderParameter(shader, gl.COMPILE_STATUS))
            {
                self.shaders[type].compiled = shader;
            }else{ console.log( gl.getShaderInfoLog(shader) ) }
        });

    },

    createTexture: function(oImage){
        this.texture = gl.createTexture();
        this.texture.width = oImage.width;
        this.texture.height = oImage.height;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, oImage);

        gl.bindTexture(gl.TEXTURE_2D, null);
    },

    createShaderProgram: function(){
        var program = gl.createProgram();

        gl.attachShader(program, this.shaders['vertex'].compiled);
        gl.attachShader(program, this.shaders['fragment'].compiled);

        gl.linkProgram(program);

        gl.useProgram(program);

        program.vertexPositionAttribute = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(program.vertexPositionAttribute);

        program.vertexTexPositionAttribute = gl.getAttribLocation(program, "inputTextureCoordinate");
        gl.enableVertexAttribArray(program.vertexTexPositionAttribute);

        program.samplerUniformLocation = gl.getUniformLocation(program, "inputImageTexture");
        /*program.texWidth = gl.getUniformLocation(program, "uTexWidth");
        program.texHeight = gl.getUniformLocation(program, "uTexHeight");
        program.texelSizeX = gl.getUniformLocation(program, "uTexelSizeX");
        program.texelSizeY = gl.getUniformLocation(program, "uTexelSizeY");*/
        program.texelWidthOffset = gl.getUniformLocation(program, "texelWidthOffset");
        program.texelHeightOffset = gl.getUniformLocation(program, "texelHeightOffset");

        return program;
    },

    createBuffers: function(){
        this.buffers = {};

        this.buffers["vertexPosition"] = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers["vertexPosition"])

        var vertices = [
            -1, -1,
             -1, 1,
            1,  -1,
            1,  1
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        this.buffers["vertexTexPosition"] = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers["vertexTexPosition"])

        var vertices = [
            0, 0,
             0, 1,
            1,  0,
            1,  1
        ];

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    },

    initScene: function(){
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers["vertexPosition"]);
        gl.vertexAttribPointer(this.shaderProgram["vertexPositionAttribute"], 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers["vertexTexPosition"]);
        gl.vertexAttribPointer(this.shaderProgram["vertexTexPositionAttribute"], 2, gl.FLOAT, false, 0, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.shaderProgram["samplerUniformLocation"], 0);

        /*gl.uniform1f(this.shaderProgram["texWidth"], this.texture.width);
        gl.uniform1f(this.shaderProgram["texHeight"], this.texture.height);

        gl.uniform1f(this.shaderProgram["texelSizeX"], 1.0/this.texture.width);
        gl.uniform1f(this.shaderProgram["texelSizeY"], 1.0/this.texture.height);*/

        gl.uniform1f(this.shaderProgram["texelWidthOffset"], 1.0/this.texture.width );
        gl.uniform1f(this.shaderProgram["texelHeightOffset"], 0 );
    },

    drawScene: function(){
        gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
};


var DOMShaders = function (){
    this.loadShaders()
}


DOMShaders.prototype.updateShaders = function(elm)
{
    switch(elm.type)
    {
        case "x-shader/x-vertex":
            this.vertex = {code: elm.textContent};
            break;
        case "x-shader/x-fragment":
            this.fragment = {code: elm.textContent};
            break;
        default:
            void(0);
    }
}

DOMShaders.prototype.loadShaders = function()
{
    var shaderElms = document.querySelectorAll('.shader');
    
    for(var i = 0; i < shaderElms.length; i++)
    {
        this.updateShaders(shaderElms[i]);
    }
}


window.addEventListener('load', init, false);

})();