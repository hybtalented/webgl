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
    // context.model.rotation.y += rotate_angle_step;
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
    this.loadTriangle();
    return (this.valid = true);
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
    this.triangles = indices;
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
