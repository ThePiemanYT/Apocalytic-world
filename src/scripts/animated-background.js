"use strict";

(function (t) {
  // Helper to convert hex -> rgb
  function parseColor(hex) {
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      let c = hex.substring(1).split("");
      if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      let val = "0x" + c.join("");
      return { r: (val >> 16) & 255, g: (val >> 8) & 255, b: val & 255 };
    }
    return { r: 0, g: 0, b: 0 };
  }

  // Particle class
  class Particle {
    constructor(color, quadrant, opts) {
      this.o = opts;
      this.r = parseColor(color);
      this.d = Math.random() > 0.5 ? 1 : -1;
      this.h = this.randomShape();
      this.s = Math.abs(this.randomInRange(this.o.size));
      this.setStartPosition(quadrant);
      this.vx = this.randomInRange(this.o.speed.x) * (Math.random() > 0.5 ? 1 : -1);
      this.vy = this.randomInRange(this.o.speed.y) * (Math.random() > 0.5 ? 1 : -1);
    }

    randomInRange(r) {
      if (r.min === r.max) return r.min;
      return Math.random() * (r.max - r.min) + r.min;
    }

    randomShape() {
      return this.o.shapes[Math.floor(Math.random() * this.o.shapes.length)];
    }

    setStartPosition(quadrant) {
      const c = { x: Math.random() * (this.o.c.w / 2), y: Math.random() * (this.o.c.h / 2) };
      if (quadrant === 3) {
        this.x = c.x + this.o.c.w / 2;
        this.y = c.y;
      } else if (quadrant === 2) {
        this.x = c.x;
        this.y = c.y + this.o.c.h / 2;
      } else if (quadrant === 1) {
        this.x = c.x + this.o.c.w / 2;
        this.y = c.y + this.o.c.h / 2;
      } else {
        this.x = c.x;
        this.y = c.y;
      }
    }

    rgba(c, alpha) {
      return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
    }

    animate(ctx, w, h) {
      if (this.o.size.pulse) {
        this.s += this.o.size.pulse * this.d;
        if (this.s > this.o.size.max || this.s < this.o.size.min) this.d *= -1;
        this.s = Math.abs(this.s);
      }
      this.x += this.vx;
      this.y += this.vy;

      if (this.x < 0 || this.x > w) this.vx *= -1;
      if (this.y < 0 || this.y > h) this.vy *= -1;

      ctx.beginPath();
      if (this.o.blending && this.o.blending !== "none") {
        ctx.globalCompositeOperation = this.o.blending;
      }

      const inner = this.rgba(this.r, this.o.opacity.center);
      const outer = this.rgba(this.r, this.o.opacity.edge);

      const radius =
        this.h === "c"
          ? this.s / 2
          : this.h === "t"
          ? 0.577 * this.s
          : this.h === "s"
          ? 0.707 * this.s
          : this.s;

      const grad = ctx.createRadialGradient(this.x, this.y, 0.01, this.x, this.y, radius);
      grad.addColorStop(0, inner);
      grad.addColorStop(1, outer);
      ctx.fillStyle = grad;

      if (this.h === "c") ctx.arc(this.x, this.y, Math.abs(this.s / 2), 0, 2 * Math.PI);
      if (this.h === "s") {
        const r = Math.abs(this.s / 2);
        ctx.rect(this.x - r, this.y - r, this.s, this.s);
      }
      if (this.h === "t") {
        const r = Math.abs(this.s / 2);
        const v = Math.tan(30 * Math.PI / 180) * r;
        ctx.moveTo(this.x - r, this.y + v);
        ctx.lineTo(this.x + r, this.y + v);
        ctx.lineTo(this.x, this.y - 2 * v);
      }

      ctx.closePath();
      ctx.fill();
    }
  }

  // Main FinisherHeader
  class FinisherHeader {
    constructor(opts) {
      this.c = document.createElement("canvas");
      this.ctx = this.c.getContext("2d");
      this.c.setAttribute("id", "finisher-canvas");

      this.gr(opts.className).appendChild(this.c);
      this.init(opts);

      let resizeTimer;
      t.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(this.resize.bind(this), 150);
      });

      requestAnimationFrame(this.animate.bind(this));
    }

    gr(className) {
      const el = document.getElementsByClassName(className || "finisher-header");
      if (!el.length) throw new Error("No .finisher-header element found");
      return el[0];
    }

    resize() {
      const parent = this.gr(this.o.className);
      this.o.c = { w: parent.clientWidth, h: parent.clientHeight };
      this.c.width = this.o.c.w;
      this.c.height = this.o.c.h;

      // 👇 Transparent background (alpha = 0 instead of 1)
      this.c.setAttribute(
        "style",
        "position:absolute;z-index:1600;top:0;left:0;right:0;bottom:0;" +
          "-webkit-transform:skewY(" +
          this.o.skew +
          "deg);" +
          "transform:skewY(" +
          this.o.skew +
          "deg);" +
          "outline:1px solid transparent;" +
          "background-color:rgba(" +
          this.bc.r +
          "," +
          this.bc.g +
          "," +
          this.bc.b +
          ",0);"
      );
    }

    init(opts) {
      this.o = opts;
      this.bc = parseColor(this.o.colors.background);
      this.ps = [];
      this.resize();
      this.createParticles();
    }

    createParticles() {
      this.ps = [];
      const total = t.innerWidth < 600 && this.o.count > 5 ? Math.round(this.o.count / 2) : this.o.count;
      for (let i = 0; i < total; i++) {
        this.ps.push(new Particle(this.o.colors.particles[i % this.o.colors.particles.length], i % 4, this.o));
      }
    }

    animate() {
      requestAnimationFrame(this.animate.bind(this));
      this.ctx.clearRect(0, 0, this.o.c.w, this.o.c.h);
      for (let p of this.ps) p.animate(this.ctx, this.o.c.w, this.o.c.h);
    }
  }

  t.FinisherHeader = FinisherHeader;
})(window);
