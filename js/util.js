/// <reference path="./cuon-matrix.js" />

class Cube {
  constructor(min, max) {
    this.min = new Vector3(min);
    this.max = new Vector3(max);
  }
  /**
   * 开始计算包围盒
   * @param {Vector3} point
   */
  start(point) {
    this.min = new Vector3(point.elements);
    this.max = new Vector3(point.elements);
  }
  /**
   * 网包围盒中添加一个点
   * @param {Vector3} point
   */
  add(point) {
    [0, 1, 2].forEach((index) => {
      point.elements[index] < this.min.elements[index] &&
        (this.min.elements[index] = point.elements[index]),
        point.elements[index] > this.max.elements[index] &&
          (this.max.elements[index] = point.elements[index]);
    });
  }
  /**
   * @returns {Vector3} 包围盒中心点
   */
  get center() {
    return new Vector3(
      [0, 1, 2].map(
        (index) => (this.max.elements[index] + this.min.elements[index]) / 2
      )
    );
  }
  /**
   * @returns {Vector3} 包围盒大小
   */
  get size() {
    return new Vector3(
      [0, 1, 2].map(
        (value) => this.max.elements[value] - this.min.elements[value]
      )
    );
  }
}

class Sphere {
  /**
   * @summary 从包围盒获取到包围球
   * @param {Cube} cube
   * @returns
   */
  static fromCute(cube) {
    return new Sphere(cube.center, Math.max(...cube.size.elements) / 2);
  }
  /**
   * @summary 构造一个包围球
   * @param {Vector3} center 包围球的中心
   * @param {number} radius 包围球的半径
   */
  constructor(center, radius) {
    this.center = center;
    this.radius = radius;
  }

  getViewMatrix(fovy, { h_ratio }) {
    const angle = ((fovy / 2) * Math.PI) / 180.0;
    const eyeHeight = (this.radius * 2 * h_ratio) / 2 / angle;
    return new Matrix4().lookAt(0, 0, eyeHeight, 0, 0, 0, 0, 1, 0);
  }
  get modelMatrix() {
    const center = this.center.elements;
    return new Matrix4().translate(-center[0], -center[1], -center[2]);
  }
}

function cubeGenerator(center, size) {
  var min_x = center[0] - size[0] / 2,
    max_x = center[0] + size[0] / 2;
  var min_y = center[1] - size[1] / 2,
    max_y = center[1] + size[1] / 2;
  var min_z = center[2] - size[2] / 2,
    max_z = center[2] + size[2] / 2;
  /************************************************************
   *   4 - 5
   *  /|  /|     z
   * 7 - 6 |     |__ y
   * | | | |     /
   * | 0 - 1    x
   * |/  |/
   * 3 - 2
   ***********************************************************/
  var vertices = [
    [min_x, min_y, min_z],
    [min_x, max_y, min_z],
    [max_x, max_y, min_z],
    [max_x, min_y, min_z],
    [min_x, min_y, max_z],
    [min_x, max_y, max_z],
    [max_x, max_y, max_z],
    [max_x, min_y, max_z],
  ];
  var indices = [
    [0, 1, 2],
    [0, 2, 3],
    [3, 2, 6],
    [3, 6, 7],
    [2, 1, 5],
    [2, 5, 6],
    [1, 0, 4],
    [1, 4, 5],
    [0, 3, 7],
    [0, 7, 4],
    [7, 6, 5],
    [7, 5, 4],
  ];
  return { vertices, indices };
}

class Context {
  keyboard = {
    key_s: false,
    key_w: false,
    key_a: false,
    key_d: false,
    key_q: false,
    key_e: false,
    key_up: false,
    key_down: false,
    key_left: false,
    key_right: false,
  };
  model = {
    scale: 1,
    center: {
      x: 0,
      y: 0,
      z: 0,
    },
    rotation: {
      z: 0,
      y: 0,
    },
    translation: {
      x: 0,
      y: 0,
      z: 0,
    },
  };
  eye = {
    origin: [0, 0, 10],
    target: [0, 0, 0],
    up: [0, 1, 0],
  };
  project = {
    type: "perspective",
    options: {
      far: 10000,
      near: 1,
      aspect: 1,
      foxy: 30,
    },
  };
  setting = {
    translate: 0.2,
    rotate: 1,
  };
  /**
   *
   * @param {Context} context 坐标系状态描述
   * @returns
   */
  get mvpMatrix() {
    const context = this;
    var modelMatrix = new Matrix4();
    modelMatrix
      .setTranslate(
        context.model.translation.x,
        context.model.translation.y,
        context.model.translation.z
      )
      .scale(context.model.scale, context.model.scale, context.model.scale)
      .rotate(context.model.rotation.y, 0, 1, 0)
      .rotate(context.model.rotation.z, 0, 0, 1)
      .translate(
        -context.model.center.x,
        -context.model.center.y,
        -context.model.center.z
      );
    var viewMatrix = new Matrix4();
    viewMatrix.setLookAt(
      ...context.eye.origin,
      ...context.eye.target,
      ...context.eye.up
    );
    var projMatrix = new Matrix4();
    projMatrix.setPerspective(
      context.project.options.foxy,
      context.project.options.aspect,
      context.project.options.near,
      context.project.options.far
    );
    var mvp_matrix = new Matrix4();
    mvp_matrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    return mvp_matrix;
  }
}

class BasicAnimation {
  /**
   *
   * @param {WebGLRenderingContext} gl webGL实例
   * @param {HTMLElement} el 事件绑定DOM元素
   * @param {?{mvp_location: WebGLUniformLocation, elements: number}} options
   */
  constructor(gl, el, options) {
    this.context = new Context();
    this._el = el;
    this._gl = gl;
    this._start = false;
    this._options = { type: gl.UNSIGNED_BYTE, ...options };
  }
  setOptions(gl, options) {
    this._gl = gl;
    this._options = { ...this.options, ...options };
  }
  mousewheelHandler = (event) => {
    const context = this.context;
    if (event.wheelDelta > 0) {
      context.model.scale *= 1.1;
    } else {
      context.model.scale /= 1.1;
    }
  };
  keydownHandler = (event) => {
    const context = this.context;
    switch (event.key.toLowerCase()) {
      case "s":
        context.keyboard.key_s = true;
        break;
      case "w":
        context.keyboard.key_w = true;
        break;
      case "a":
        context.keyboard.key_a = true;
        break;
      case "d":
        context.keyboard.key_d = true;
        break;
      case "q":
        context.keyboard.key_q = true;
        break;
      case "e":
        context.keyboard.key_e = true;
        break;
      case "arrowup":
        context.keyboard.key_up = true;
        break;
      case "arrowdown":
        context.keyboard.key_down = true;
        break;
      case "arrowright":
        context.keyboard.key_right = true;
        break;
      case "arrowleft":
        context.keyboard.key_left = true;
        break;
    }
  };
  keyupHandler = (event) => {
    const context = this.context;
    switch (event.key.toLowerCase()) {
      case "s":
        context.keyboard.key_s = false;
        break;
      case "w":
        context.keyboard.key_w = false;
        break;
      case "a":
        context.keyboard.key_a = false;
        break;
      case "d":
        context.keyboard.key_d = false;
        break;
      case "q":
        context.keyboard.key_q = false;
        break;
      case "e":
        context.keyboard.key_e = false;
        break;
      case "arrowup":
        context.keyboard.key_up = false;
        break;
      case "arrowdown":
        context.keyboard.key_down = false;
        break;
      case "arrowright":
        context.keyboard.key_right = false;
        break;
      case "arrowleft":
        context.keyboard.key_left = false;
        break;
    }
  };
  start() {
    if (!this._start) {
      this._el.addEventListener("mousewheel", this.mousewheelHandler);
      this._el.addEventListener("keydown", this.keydownHandler);
      this._el.addEventListener("keyup", this.keyupHandler);
      this._start = true;
      requestAnimationFrame(this.onAnimation);
    }
  }

  setMvpMatrix(context) {
    var u_mvp_matrix = this._options.mvp_location;
    if (!u_mvp_matrix) {
      console.log("mvp uniform variable mvp_location not found!");
      return;
    }
    this._gl.uniformMatrix4fv(u_mvp_matrix, false, context.mvpMatrix.elements);
  }
  stop() {
    if (this._start) {
      this._el.removeEventListener("mousewheel", this.mousewheelHandler);
      this._el.removeEventListener("keydown", this.keydownHandler);
      this._el.removeEventListener("keyup", this.keyupHandler);
      this._start = false;
    }
  }
  onAnimation = () => {
    const context = this.context;
    const translate_step = context.setting.translate;
    const rotate_angle_step = context.setting.rotate;
    if (context.keyboard.key_s) {
      context.model.translation.z -= translate_step;
    }
    if (context.keyboard.key_w) {
      context.model.translation.z += translate_step;
    }
    if (context.keyboard.key_left) {
      context.model.translation.x -= translate_step;
    }
    if (context.keyboard.key_right) {
      context.model.translation.x += translate_step;
    }
    if (context.keyboard.key_down) {
      context.model.translation.y -= translate_step;
    }
    if (context.keyboard.key_up) {
      context.model.translation.y += translate_step;
    }
    if (context.keyboard.key_q) {
      context.model.rotation.z -= rotate_angle_step;
    }
    if (context.keyboard.key_e) {
      context.model.rotation.z += rotate_angle_step;
    }

    if (context.keyboard.key_a) {
      context.model.rotation.y -= rotate_angle_step;
    }
    if (context.keyboard.key_d) {
      context.model.rotation.y += rotate_angle_step;
    }
    this.setMvpMatrix(context);
    this._gl.drawElements(
      this._gl.TRIANGLES,
      this._options.elements,
      this._options.type,
      0
    );
    if (this._start) {
      requestAnimationFrame(this.onAnimation);
    }
  };
}

class DEMLoader {
  constructor() {
    this.cube = new Cube();
    this.data = [];
  }
  get size() {
    return 9;
  }
  loadDEM(dem_string) {
    const stringlines = dem_string.split("\n");
    if (!stringlines || stringlines.length < 0) {
      return (this.valid = false);
    }
    const head = stringlines[0].split("\t");
    this.col = parseInt(head[4]);
    this.row = parseInt(head[5]);
    var data = [];
    for (var i = 1; i < stringlines.length; ++i) {
      var vertexinfo = stringlines[i].split(",");
      if (vertexinfo.length !== 9) {
        continue;
      }
      data.push(vertexinfo.map(parseFloat));
    }
    if (data.length !== this.vertices) {
      return (this.valid = false);
    }
    this.cube.start(new Vector3(data[0]));
    for (var i = 1; i < data.length; ++i) {
      this.cube.add(new Vector3(data[i]));
    }
    this.data = data;
    this.triangles = this.loadTriangle();
    return (this.valid = true);
  }
  /**
   *
   * @param {WebGLRenderingContext} gl 渲染上下文
   * @param {string} texture_image 纹理图片
   * @param {{format:number, id: number, location: WebGLUniformLocation}} options
   */
  loadTexture(gl, texture_image, options) {
    const merged_option = Object.assign({ id: 0, format: gl.RGB }, options);
    const { id } = merged_option;
    return new Promise((resolve) => {
      var image = new Image();
      image.onload = () => {
        const texture = new WebGLTextureWrapper(gl, merged_option.format);

        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
        texture.bind(id);
        texture.setParams();
        texture.bindImage(image);

        const max = this.cube.max.elements;
        const min = this.cube.min.elements;
        const size = [max[0] - min[0], max[1] - min[1]];
        resolve(
          this.data.map((vertex) => {
            let data = vertex.slice(0, 3);
            if (merged_option.with_normal) {
              data = data.concat(vertex.slice(6, 9));
            }
            return data.concat([
              (vertex[0] - min[0]) / size[0],
              (vertex[1] - min[1]) / size[1],
            ]);
          })
        );
        if (merged_option.location) {
          gl.uniform1i(merged_option.location, id);
        }
      };
      image.src = texture_image;
    });
  }
  loadTriangle() {
    /**
     *    i,j -- i+1,j
     *    |   /  |
     *    |  /   |
     *   i,j+1 -- i+1,j+1
     *
     */
    var indices = [];
    for (var i = 0; i < this.row - 1; ++i) {
      for (var j = 0; j < this.col - 1; ++j) {
        indices.push([
          i * this.col + j,
          (i + 1) * this.col + j,
          i * this.col + j + 1,
        ]);
        indices.push([
          i * this.col + j + 1,
          (i + 1) * this.col + j,
          (i + 1) * this.col + j + 1,
        ]);
      }
    }
    return indices;
  }
  get vertices() {
    return this.col * this.row;
  }
}

class FileUtils {
  static loadUrl(url) {
    return new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      request.onload = function (event) {
        resolve(request.response);
      };
      request.onerror = function (event) {
        reject(request.statusText);
      };
      request.open("GET", url);
      request.send();
    });
  }
  /**
   * 从文件中读取文本
   * @param {File} file 文件
   */
  static readTextFromFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) {
        resolve(reader.result);
      };
      reader.onerror = function (event) {
        reject(reader.statusText);
      };
      reader.readAsText(file);
    });
  }
}
/**
 * @summary WebGL program 对象封装
 * @typedef {{name:string;type:string;location?: WebGLUniformLocation|number}} VarMetaInfo
 */
class WebGLProgramWrapper {
  static attr_rec_reg = /attribute\s+([\w\d_]+)\s+([\w\d_]+)\s*;/g;
  static uniform_rec_reg = /uniform\s+([\w\d_]+)\s+([\w\d_]+)\s*;/g;
  /**
   * @summary
   * @param {WebGLRenderingContext} gl WebGL 渲染上下文对象
   */
  constructor(gl) {
    this.gl = gl;
    this.meta_info = {};
    this.program = gl.createProgram();
  }
  /**
   * @summary 创建着色器
   * @param {number} type 着色器类型
   * @param {string} source 着色器源代码
   */
  createShader(type, source) {
    const { gl, program } = this;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
    return shader;
  }

  /**
   * @summary 初始化WebGL程序
   * @param {string} vShaderSource
   * @param {string} fShaderSource
   */
  init(vShaderSource, fShaderSource) {
    const { gl, program } = this;
    this.shader = this.createShader(gl.VERTEX_SHADER, vShaderSource);
    this.fragment = this.createShader(gl.FRAGMENT_SHADER, fShaderSource);
    gl.linkProgram(program);
    this.initVariables(vShaderSource, fShaderSource);
  }
  /**
   * @summary 初始化程序内部变了
   * @param {string} vShaderSource 顶点着色器源代码
   * @param {string} fShaderSource 片元着色器源代码
   */
  initVariables(vShaderSource, fShaderSource) {
    WebGLProgramWrapper.getAttributes(vShaderSource).forEach((attr) => {
      this.addMetaData("attribute", attr);
    });
    WebGLProgramWrapper.getUniforms(vShaderSource).forEach((uniform) => {
      this.addMetaData("uniform", uniform);
    });
    WebGLProgramWrapper.getUniforms(fShaderSource).forEach((uniform) => {
      this.addMetaData("uniform", uniform);
    });
  }
  /**
   * @summary 初始化 Program 属性
   * @param {string} source 属性列
   * @returns {VarMetaInfo[]}
   */
  static getAttributes(source) {
    const attribute_info = [];
    for (const attr of source.matchAll(WebGLProgramWrapper.attr_rec_reg)) {
      if (attr.length === 3) {
        attribute_info.push({ name: attr[2], type: attr[1] });
      } else {
        console.error(`invalid attrbute ${attr} for source`);
      }
    }
    return attribute_info;
  }

  /**
   * @summary 初始化 uniforms
   * @param {string} source uniform 列表
   * @returns {VarMetaInfo[]} 初始化失败的 uniform 列表
   */
  static getUniforms(source) {
    const uniform_info = [];
    for (const uniform of source.matchAll(
      WebGLProgramWrapper.uniform_rec_reg
    )) {
      if (uniform.length === 3) {
        uniform_info.push({ name: uniform[2], type: uniform[1] });
      } else {
        console.error(`invalid uniform ${uniform} for source`);
      }
    }
    return uniform_info;
  }
  /**
   *
   * @param {string}} type
   * @param {VarMetaInfo} info
   */
  addMetaData(type, info) {
    const { meta_info, gl, program } = this;

    if (meta_info.hasOwnProperty(info.name)) {
      const origin_info = meta_info[info.name];
      if (origin_info.meta_type !== type) {
        console.error(
          `${type} ${info.name} declaretion with differet meta type ${
            meta_info[info.name].meta_type
          }`
        );
      } else if (type === "attribute") {
        console.error("redeclaretion of attibute", info.name);
        return;
      } else if (type === "uniform" && info.type !== origin_info.type) {
        console.error(
          `${type} ${info.name} declaretion with differet variable type ${info.type}`
        );
      }
      return;
    }
    switch (type) {
      case "uniform":
        info.location = gl.getUniformLocation(program, info.name);
        if (!info.location) {
          console.warn(`location of uniform ${info.name} is not found`);
          return;
        }
        this[info.name] = info.location;
        break;
      case "attribute":
        info.location = gl.getAttribLocation(program, info.name);
        if (info.location < 0) {
          console.warn(`location of attribute ${info.name} is not found`);
          return;
        }
        this[info.name] = info.location;
        break;
      default:
        break;
    }
    meta_info[info.name] = {
      ...info,
      meta_type: type,
    };
  }
  use() {
    const { gl, program } = this;
    gl.useProgram(program);
  }
  unuse() {
    this.gl.useProgram(null);
  }
}
class WebGLFrameBufferWrapper {
  /**
   *
   * @param {WebGLRenderingContext} gl
   * @param {number} width 离屏渲染的宽度
   * @param {number} height 离屏渲染的高度
   */
  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.framebuffer = gl.createFramebuffer();
  }
  /**
   * @summary 将framebufer 绑定的正缓冲区对象
   */
  bind() {
    const { gl, framebuffer, width, height } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, width, height);
  }

  unbind() {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   *
   * @param {} attachment 指定渲染缓冲区关联的帧缓冲区对象类型
   */
  createRenderBuffer(attachment = gl.DEPTH_ATTACHMENT) {
    const { gl, width, height } = this;
    const renderBuffer = gl.createRenderBuffer();
    if (!renderBuffer) {
      console.error("failed to create renderbuffer object");
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16,
      width,
      height
    );
    // 将
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      attachment,
      gl.RENDERBUFFER,
      renderBuffer
    );

    return renderBuffer;
  }
  /**
   * @summary 获取当前帧缓冲区状态
   */
  status() {
    const { gl } = this;
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (gl.FRAMEBUFFER_COMPLETE !== status) {
      console.log(`frame buffer object is incomplete: ${status.toString()}`);
    }
    return status;
  }
}
class WebGLBufferWrapper {
  /**
   * 封装 WebGL 的 buffer 对象
   * @param {WebGLRenderingContext} gl
   * @param {number} target 缓冲区关联的对象
   */
  constructor(gl, target) {
    this.gl = gl;
    this.target = target;
    this.buffer = gl.createBuffer();
  }
  /**
   * @summary 初始化buffer 对象数据
   * @param {number} usage
   * @param {Uint8Array|Uint16Array|Uint32Array|Float32Array|Float64Array} data
   * @param {number} stride 每一节点的元素个数
   */
  init(usage, data, stride = 1) {
    const { gl, target } = this;
    gl.bufferData(target, data, usage);
    this.ElementSize = data.BYTES_PER_ELEMENT;
    this.stride = stride * this.ElementSize;
    this.size = Math.floor(data.length / stride);
  }
  /**
   * @summary 将当前buffer对象绑定到gl的对应buffer上
   * @param {number} target
   */
  bind() {
    const { gl, buffer, target } = this;
    gl.bindBuffer(target, buffer);
  }
  unbind() {
    const { gl, target } = this;
    gl.bindBuffer(target, null);
  }
  /**
   * @summary 将buffer 对象绑定到属性上
   * @param {number} attribute 属性
   * @param {number} size 元素数量
   * @param {number} type 元素类型
   * @param {boolean} normalized 是否进行规范化
   * @param {number} offset 偏移量
   */
  bindAttibute(attribute, size, type, offset = 0, normalized = false) {
    const { gl, ElementSize, stride } = this;
    gl.vertexAttribPointer(
      attribute,
      size,
      type,
      normalized,
      stride,
      ElementSize * offset
    );
  }
}

class WebGLTextureWrapper {
  /**
   * 封装 WebGL 的 texture 对象
   * @param {WebGLRenderingContext} gl
   * @param {format} 纹理格式
   */
  constructor(gl, format = gl.RGBA) {
    this.gl = gl;
    this.format = format;
    this.texture = gl.createTexture();
    if (!this.texture) {
      console.log(`createFrameBuffer Texture object faild`);
      return;
    }
  }

  /**
   * @summary 将纹理对象绑定到对应的纹理上
   */
  bind(id) {
    const { gl, texture } = this;
    gl.activeTexture(gl[`texture${id}`]);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }

  setParams() {
    const { gl } = this;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  /**
   * 将纹理对象绑定的帧缓冲区的对象上
   * @param {WebGLFrameBufferWrapper} framebuffer
   * @param {number} attachment 关联的帧缓冲区对象的类型
   */
  bindFramebuffer(framebuffer, attachment = this.gl.COLOR_ATTACHMENT0) {
    const { gl, texture, format } = this;
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      format,
      framebuffer.width,
      framebuffer.height,
      0,
      format,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      attachment,
      gl.TEXTURE_2D,
      texture,
      0
    );
  }
  bindImage(image) {
    const { gl, format } = this;
    gl.texImage2D(gl.TEXTURE_2D, 0, format, format, gl.UNSIGNED_BYTE, image);
  }
}
