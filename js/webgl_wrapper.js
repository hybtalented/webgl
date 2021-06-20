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
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
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
    gl.enableVertexAttribArray(attribute);
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
    gl.activeTexture(gl[`TEXTURE${id}`]);
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

/**
 * @summary 投影封装类
 * @typedef {{ far: number; near: number; aspect: number;foxy: number;}} PerspectiveProjectionOptions
 * @typedef {{type:"perspective"; options: PerspectiveProjectionOptions}} PerspectiveProjectionConfig
 * @typedef {{ left: number; right: number; bottom:number; top: number; far: number; near: number;}} OrthogonalProjectionOptions
 * @typedef {{type:"orthogonal"; options: OrthogonalProjectionOptions}} OrthogonalProjectionConfig
 * @typedef {PerspectiveProjectionConfig|OrthogonalProjectionConfig} ProjectionConfig
 */
class WebGLMVPMatrixWrapper {
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
  view = {
    origin: [0, 0, 10],
    target: [0, 0, 0],
    up: [0, 1, 0],
  };
  /**
   * @type {ProjectionConfig}
   */
  projection = {
    type: "perspective",
    options: {
      far: 10000,
      near: 1,
      aspect: 1,
      foxy: 30,
    },
  };
  /**
   * @param {'perspective'|'orthogonal'} projection_type 投影矩阵方式
   */
  constructor(projection_type = "perspective") {
    this.projectionType = projection_type;
  }
  /**
   * @param {'perspective'|'orthogonal'} projection_type 投影矩阵方式
   */
  set projectionType(type) {
    this.projection.type = type;
    switch (this.projection.type) {
      case "orthogonal":
        this.projection.options = {
          left: -10,
          right: 10,
          bottom: -10,
          top: 10,
          near: 1,
          far: 1000,
        };
        break;
      case "perspective":
        this.projection.options = {
          far: 10000,
          near: 1,
          aspect: 1,
          foxy: 30,
        };
        break;
      default:
        throw new Error(`unknow project type ${projection_type}`);
    }
  }
  /**
   *
   * @param {Context} context 坐标系状态描述
   * @returns
   */
  get matrix() {
    debugger;
    const { projection, model, view } = this;
    var modelMatrix = new Matrix4();
    modelMatrix
      .setTranslate(
        model.translation.x,
        model.translation.y,
        model.translation.z
      )
      .scale(model.scale, model.scale, model.scale)
      .rotate(model.rotation.y, 0, 1, 0)
      .rotate(model.rotation.z, 0, 0, 1)
      .translate(-model.center.x, -model.center.y, -model.center.z);
    var viewMatrix = new Matrix4();
    viewMatrix.setLookAt(...view.origin, ...view.target, ...view.up);
    var projMatrix = new Matrix4();

    switch (projection.type) {
      case "orthogonal":
        {
          const options = projection.options;
          projMatrix.setOrtho(
            options.left,
            options.right,
            options.bottom,
            options.top,
            options.near,
            options.far
          );
        }
        break;
      case "perspective":
        {
          const { options } = projection;
          projMatrix.setPerspective(
            options.foxy,
            options.aspect,
            options.near,
            options.far
          );
        }

        break;
      default:
        break;
    }

    var mvp_matrix = new Matrix4();
    mvp_matrix.set(projMatrix).multiply(viewMatrix).multiply(modelMatrix);
    return mvp_matrix;
  }

  /**
   * @summary 从包围盒初始化MVP矩阵设置
   * @param {Cube} cube 包围盒
   * @param {HTMLCanvasElement} aspect 画布
   */
  initializeByBoundCube(cube, aspect) {
    const min = cube.min.elements;
    const size = cube.size.elements;
    const center = cube.center.elements;
    this.model.center = {
      x: center[0],
      y: center[1],
      z: center[2],
    };
    let width = size[0] * 0.6;
    let height = size[1] * 0.6;
    if (size[0] / size[1] > aspect) {
      height = width / aspect;
    } else {
      width = height * aspect;
    }
    this.view.origin = [0, 0, size[2] * 2.5];
    this.view.target = [0, 0, 0];
    switch (this.projection.type) {
      case "perspective":
        this.projection.options = {
          foxy: (Math.atan(height / size[2] / 2.5) / Math.PI) * 360,
          far: size[2] * 10,
          near: size[2] * 0.1,
          aspect,
        };

        break;
      case "orthogonal":
        this.projection.options = {
          left: -width / 2,
          right: width / 2,
          top: -height / 2,
          bottom: height / 2,
          far: size[2] * 10,
          near: size[2] * 0.1,
        };
        break;
      default:
        break;
    }
  }
  /**
   * @summary 从包围盒初始化MVP矩阵设置
   * @param {Sphere} sphere 包围球
   * @param {HTMLCanvasElement} aspect 画布
   */
  initializeByBoundSphere(sphere, aspect) {
    const {
      center: { elements: center },
      radius,
    } = sphere;
    this.model.center = {
      x: center[0],
      y: center[1],
      z: center[2],
    };
    this.view.origin = [0, 0, radius * 2.1];
    this.view.target = [0, 0, 0];
    switch (this.projection.type) {
      case "perspective":
        this.projection.options = {
          foxy: 60,
          far: radius * 10,
          near: radius * 0.1,
          aspect,
        };
        break;
      case "orthogonal":
        this.projection.options = {
          left: -radius / 2,
          right: radius / 2,
          top: -radius / 2,
          bottom: radius / 2,
          far: radius * 10,
          near: radius * 0.1,
        };
        break;
      default:
        break;
    }
  }
}

class WebGLBasicAnimation extends WebGLMVPMatrixWrapper {
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
  setting = {
    translate: 0.2,
    rotate: 1,
  };
  _start = false;
  /**
   *
   * @param {HTMLElement} el 事件监听的对象元素
   * @param {(Vector4) => void} render_callback 绘制回调函数
   * @param {Cube|Sphere} bound 包围盒
   */
  constructor(el, render_callback, bound) {
    super();
    this._el = el;
    this._render_callback = render_callback;
    this._bound = bound;
    if (this._bound) {
      this.setTranlateInterval();
    }
  }
  start() {
    if (!this._start) {
      this._el.addEventListener("mousewheel", this.mousewheelHandler);
      this._el.addEventListener("keydown", this.keydownHandler);
      this._el.addEventListener("keyup", this.keyupHandler);
      this._start = true;
      requestAnimationFrame(this.onAnimation);
    }
  }

  setTranlateInterval() {
    if (this._bound instanceof Cube) {
      this.setting.translate = this._bound.size.elements[2] / 20;
    } else if (this._bound instanceof Sphere) {
      this.setting.translate = this._bound.radius / 10;
    }
  }
  stop() {
    if (this._start) {
      this._el.removeEventListener("mousewheel", this.mousewheelHandler);
      this._el.removeEventListener("keydown", this.keydownHandler);
      this._el.removeEventListener("keyup", this.keyupHandler);
      this._start = false;
    }
  }
  mousewheelHandler = (event) => {
    const context = this;
    if (event.wheelDelta > 0) {
      context.model.scale *= 1.1;
    } else {
      context.model.scale /= 1.1;
    }
  };
  keydownHandler = (event) => {
    const context = this;
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
    const context = this;
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
  /**
   * @summary 完成一次动画
   * @abstract
   */
  invokeAnimation() {
    const context = this;
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
  }
  onAnimation = () => {
    this.invokeAnimation();
    this._render_callback(this.matrix);
    if (this._start) {
      requestAnimationFrame(this.onAnimation);
    }
  };
}
