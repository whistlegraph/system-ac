import {
  randInt,
  randIntRange,
  byteInterval17,
  mat4,
  vec4,
  radians,
  clamp,
} from "./num.js";

let width, height, pixels;
const c = [255, 255, 255, 255];

// 1. Configuration & State

function setBuffer(screen) {
  ({ width, height, pixels } = screen);
}

function color(r, g, b, a = 255) {
  c[0] = r;
  c[1] = g;
  c[2] = b;
  c[3] = a;
}

export { setBuffer, color };

// 2. 2D Drawing

function clear() {
  /*
  // Note: I believe this would be the fastest method but would have to test it.
  // Would have to copy up by doubling until we hit the length!
  pixels[0] = 255;
  pixels[1] = 255;
  pixels[2] = 255;
  pixels[3] = 255;

  pixels.copyWithin(4, 0);
  */
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = c[0]; // r
    pixels[i + 1] = c[1]; // g
    pixels[i + 2] = c[2]; // b
    pixels[i + 3] = c[3]; // alpha
  }
}

function plot(x, y) {
  x = Math.round(x);
  y = Math.round(y);

  // Skip pixels that are offscreen.
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return;
  }

  // Plot our pixel.
  const i = (x + y * width) * 4;
  pixels[i] = c[0];
  pixels[i + 1] = c[1];
  pixels[i + 2] = c[2];
  pixels[i + 3] = c[3];
}

function line(x0, y0, x1, y1) {
  // Make sure everything is ceil'd.
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);

  // Bresenham's Algorithm
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    plot(x0, y0);

    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function noise16() {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = byteInterval17(randInt(16)); // r
    pixels[i + 1] = byteInterval17(randInt(16)); // g
    pixels[i + 2] = byteInterval17(randInt(16)); // b
    pixels[i + 3] = 255; // a
  }
}

export { clear, plot, line, noise16 };

// 3. 3D Drawing (Kinda mixed with some 2D)

// a. Globals

const X = 0;
const Y = 1;
const Z = 2;
const W = 3;

// b. Geometric Abstractions

class Camera {
  matrix;
  x = 0;
  y = 0;
  z = 0;

  #perspectiveMatrix;
  #transformMatrix;

  constructor(fov) {
    this.#perspective(fov);
    this.#transform();
    //this.#screen();
    this.matrix = this.#transformMatrix;
  }

  forward(n) {
    this.z -= n;
    this.#transform();
    this.matrix = this.#transformMatrix;
  }

  #perspective(fov) {
    const zNear = 0.1;
    const zFar = 1000;

    this.#perspectiveMatrix = mat4.perspective(
      mat4.create(),
      radians(fov),
      width / height,
      0.1,
      1000
    );

    // See: https://github.com/BennyQBD/3DSoftwareRenderer/blob/641f59125351d9565e744a90ad86256c3970a724/src/Matrix4f.java#L89
    // And compare it with: https://glmatrix.net/docs/mat4.js.html#line1508
    const zRange = zNear - zFar;
    const ten = (-zNear - zFar) / zRange;
    const eleven = (2 * zFar * zNear) / zRange;

    this.#perspectiveMatrix[10] = ten; // Set this Z component to 0.
    this.#perspectiveMatrix[14] = eleven;
    this.#perspectiveMatrix[11] = 1; // Flip the Y so we see things rightside up.
  }

  #transform() {
    // Camera pan / move:
    this.#transformMatrix = mat4.translate(
      mat4.create(),
      this.#perspectiveMatrix,
      [this.x, this.y, this.z]
    );

    // Camera rotate:
    // mat4.rotate(perspective, perspective, radians(cr), [0, 0, 1]);
  }
}

class Form {
  vertices = [];
  position = [0, 0, 0];
  rotation = [0, 0, 0];
  scale = [1, 1, 1];

  #type = "triangle";

  constructor(
    vertices,
    position = [0, 0, 0],
    rotation = [0, 0, 0]
    //scale = [1, 1, 1]
  ) {
    // Create new vertices with an added 'w' component.
    for (let i = 0; i < vertices.length; i++) {
      this.vertices.push(new Vertex(vertices[i], c));
    }

    // TODO: Set this.#type here.
    // - 1 Vertex would render a point or sphere.
    // - 2 Verticies would render a line with a thickness.
    // - 3 or more vertices would render a triangle or lines or a fan.

    this.position = position;
    this.rotation = rotation;
    //this.scale = scale;
  }

  angle(x, y, z) {
    this.rotation[X] = x;
    this.rotation[Y] = y;
    this.rotation[Z] = z;
  }

  graph({ matrix: cameraMatrix }) {
    // Build a matrix to represent this form's position, rotation and scale.

    const translate = mat4.fromTranslation(mat4.create(), this.position);
    const rotateY = mat4.fromYRotation(
      mat4.create(),
      radians(this.rotation[Y])
    );

    const rotateX = mat4.fromXRotation(
      mat4.create(),
      radians(this.rotation[X])
    );
    const rotateZ = mat4.fromZRotation(
      mat4.create(),
      radians(this.rotation[Z])
    );

    const rotate = mat4.mul(mat4.create(), rotateY, rotateX);
    mat4.mul(rotate, rotate, rotateZ);

    //const rotate = rotateY;

    const matrix = mat4.mul(mat4.create(), translate, rotate);

    // Apply the camera matrix.
    mat4.mul(matrix, cameraMatrix, matrix);

    const transformedVertices = [];

    // Transform each vertex by the matrix.
    this.vertices.forEach((vertex) => {
      transformedVertices.push(vertex.transform(matrix));
    });

    // Draw a triangle (with clipping) and apply the screen transform &
    // perspective divide.
    drawTriangle(...transformedVertices);
  }
}

class Vertex {
  pos; // vec4
  color; // vec4

  get x() {
    return this.pos[X];
  }

  get y() {
    return this.pos[Y];
  }

  constructor(pos = [0, 0, 0, 1], color = [...c, 1.0]) {
    // TODO: Alpha
    this.pos = vec4.fromValues(...pos);
    this.color = vec4.fromValues(...color);
  }

  transform(matrix) {
    return new Vertex(
      vec4.transformMat4(vec4.create(), this.pos, matrix),
      this.color
    );
  }

  perspectiveDivide() {
    return new Vertex(
      vec4.fromValues(
        this.pos[X] / this.pos[W],
        this.pos[Y] / this.pos[W],
        this.pos[Z] / this.pos[W],
        this.pos[W]
      ),
      this.color
    );
  }
}

function initScreenSpaceTransformMatrix(halfWidth, halfHeight) {
  const m = mat4.create();
  mat4.translate(m, m, [halfWidth - 0.5, halfHeight - 0.5, 0]);
  mat4.scale(m, m, [halfWidth, -halfHeight, 0]);
  return m;
}

function isInsideViewFrustum(v4) {
  return (
    Math.abs(v4[X]) <= Math.abs(v4[W]) &&
    Math.abs(v4[Y]) <= Math.abs(v4[W]) &&
    Math.abs(v4[Z]) <= Math.abs(v4[W])
  );
}

// c. Rendering Procedures

class Edge {
  #x;
  #yStart;
  #yEnd;

  get x() {
    return this.#x;
  }

  get yStart() {
    return this.#yStart;
  }

  get yEnd() {
    return this.#yEnd;
  }

  #xStep;

  constructor(minYVert, maxYVert) {
    this.#yStart = Math.ceil(minYVert.y);
    this.#yEnd = Math.ceil(maxYVert.y);

    const yDist = maxYVert.y - minYVert.y;
    const xDist = maxYVert.x - minYVert.x;

    const yPrestep = this.#yStart - minYVert.y;

    this.#xStep = xDist / yDist;
    this.#x = minYVert.x + yPrestep * this.#xStep;
  }

  step() {
    this.#x += this.#xStep;
    // this.#color += this.#colorStep
    // this.#lighting += this.#lightingStep
  }
}

// d. Triangle Rendering

function drawTriangle(v1, v2, v3) {
  if (
    isInsideViewFrustum(v1.pos) &&
    isInsideViewFrustum(v2.pos) &&
    isInsideViewFrustum(v3.pos)
  ) {
    fillTriangle(v1, v2, v3);
    return;
  }

  // TODO: Fix clipping.
  return;

  const vertices = [v1, v2, v3];
  const auxillaryList = [];

  if (
    clipPolygonAxis(vertices, auxillaryList, 0) &&
    clipPolygonAxis(vertices, auxillaryList, 1) &&
    clipPolygonAxis(vertices, auxillaryList, 2)
  ) {
    const initialVertex = vertices[0];
    for (let i = 1; i < vertices.length - 1; i += 1) {
      fillTriangle(initialVertex, vertices[i], vertices[i + 1]);
    }
  }
}

function fillTriangle(minYVert, midYVert, maxYVert) {
  const screenMatrix = initScreenSpaceTransformMatrix(
    width / 2,
    height / 2,
    mat4
  );

  minYVert = minYVert.transform(screenMatrix).perspectiveDivide();
  midYVert = midYVert.transform(screenMatrix).perspectiveDivide();
  maxYVert = maxYVert.transform(screenMatrix).perspectiveDivide();

  if (maxYVert.y < midYVert.y) {
    const temp = maxYVert;
    maxYVert = midYVert;
    midYVert = temp;
  }

  if (midYVert.y < minYVert.y) {
    const temp = midYVert;
    midYVert = minYVert;
    minYVert = temp;
  }

  if (maxYVert.y < midYVert.y) {
    const temp = maxYVert;
    maxYVert = midYVert;
    midYVert = temp;
  }

  const handedness = triangleAreaDouble(minYVert, maxYVert, midYVert) >= 0;

  scanTriangle(minYVert, midYVert, maxYVert, handedness);

  let tempColor = c.slice();

  // Wireframes
  color(0, 0, 255);
  line(minYVert.x, minYVert.y, midYVert.x, midYVert.y);
  line(midYVert.x, midYVert.y, maxYVert.x, maxYVert.y);
  line(minYVert.x, minYVert.y, maxYVert.x, maxYVert.y);

  color(0, 255, 0);
  plot(minYVert.x, minYVert.y);
  plot(midYVert.x, midYVert.y);
  plot(maxYVert.x, maxYVert.y);

  color(...tempColor);
}

function triangleAreaDouble(a, b, c) {
  const x1 = b.x - a.x;
  const y1 = b.y - a.y;
  const x2 = c.x - a.x;
  const y2 = c.y - a.y;
  return x1 * y2 - x2 * y1;
}

function scanTriangle(minYVert, midYVert, maxYVert, handedness) {
  const topToBottom = new Edge(minYVert, maxYVert);
  const topToMiddle = new Edge(minYVert, midYVert);
  const middleToBottom = new Edge(midYVert, maxYVert);

  {
    let left = topToBottom;
    let right = topToMiddle;
    if (handedness) {
      let temp = left;
      left = right;
      right = temp;
    }

    const yStart = topToMiddle.yStart;
    const yEnd = topToMiddle.yEnd;

    for (let i = yStart; i < yEnd; i += 1) {
      drawScanLine(left, right, i);
      left.step();
      right.step();
    }
  }

  {
    let left = topToBottom;
    let right = middleToBottom;
    if (handedness) {
      let temp = left;
      left = right;
      right = temp;
    }

    const yStart = middleToBottom.yStart;
    const yEnd = middleToBottom.yEnd;

    for (let i = yStart; i < yEnd; i += 1) {
      drawScanLine(left, right, i);
      left.step();
      right.step();
    }
  }
}

function drawScanLine(left, right, j) {
  // Clipping

  function clipPolygonAxis(vertices, auxillaryList, componentIndex) {
    clipPolygonComponent(vertices, componentIndex, 1.0, auxillaryList);
    vertices.length = 0;

    if (auxillaryList.length === 0) {
      return false;
    }

    clipPolygonComponent(auxillaryList, componentIndex, -1.0, vertices);
    auxillaryList.length = 0;

    return !(vertices.length === 0);
  }

  function clipPolygonComponent(
    vertices,
    componentIndex,
    componentFactor,
    result
  ) {
    let prevVertex = vertices[vertices.length - 1];
    let prevComponent = prevVertex[componentIndex] * componentFactor;
    let prevInside = prevComponent <= prevVertex[W];

    for (let i = 0; i < vertices.length; i += 1) {
      const curVertex = vertices[i];
      const curComponent = curVertex[componentIndex] * componentFactor;

      const curInside = curComponent <= curVertex[W];

      if (curInside ? !prevInside : prevInside) {
        const lerpAmount =
          (prevVertex[W] - prevComponent) /
          (prevVertex[W] - prevComponent - (curVertex[W] - curComponent));
        result.push(
          vec4.lerp(vec4.create(), prevVertex, curVertex, lerpAmount)
        );
      }

      if (curInside) {
        result.push(curVertex);
      }

      prevVertex = curVertex;
      prevComponent = curComponent;
      prevInside = curInside;
    }
  }

  const startColor = [...c];

  const xMin = Math.ceil(left.x);
  const xMax = Math.ceil(right.x);

  for (let i = xMin; i < xMax; i += 1) {
    // TODO: Why can't I properly edit the pixels here?

    color(
      clamp(startColor[0] + randIntRange(-15, 15), 0, 255),
      clamp(startColor[1] + randIntRange(-15, 15), 0, 255),
      clamp(startColor[2] + randIntRange(-15, 15), 0, 255)
    );

    //color(randInt(255), randInt(255), randInt(255));

    plot(i, j);
  }
}

export { Camera, Form };

// e. Utilities

let graphicLogCount = 0;
const graphicLogMax = 5;

function graphicLog(log) {
  graphicLogCount = Math.min(graphicLogCount + 1, graphicLogMax);
  if (graphicLogCount < graphicLogMax) {
    console.log(log);
  }
}
