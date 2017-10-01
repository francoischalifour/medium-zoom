/*
 * medium-zoom v0.2.0
 * Medium zoom on your images in vanilla JavaScript
 * Copyright 2017 Francois Chalifour
 * https://github.com/francoischalifour/medium-zoom
 * MIT License
 */
(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : global.mediumZoom = factory();
})(this, function() {
  "use strict";
  function __$styleInject(css, returnValue) {
    if (typeof document === "undefined") {
      return returnValue;
    }
    css = css || "";
    var head = document.head || document.getElementsByTagName("head")[0];
    var style = document.createElement("style");
    style.type = "text/css";
    head.appendChild(style);
    if (style.styleSheet) {
      style.styleSheet.cssText = css;
    } else {
      style.appendChild(document.createTextNode(css));
    }
    return returnValue;
  }
  function createCommonjsModule(fn, module) {
    return module = {
      exports: {}
    }, fn(module, module.exports), module.exports;
  }
  var _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  var toConsumableArray = function(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];
      return arr2;
    } else {
      return Array.from(arr);
    }
  };
  var mediumZoom_1 = createCommonjsModule(function(module) {
    var SUPPORTED_FORMATS = [ "IMG" ];
    var KEY_ESC = 27;
    var KEY_Q = 81;
    var CANCEL_KEYS = [ KEY_ESC, KEY_Q ];
    var isSupported = function isSupported(img) {
      return SUPPORTED_FORMATS.includes(img.tagName);
    };
    var isScaled = function isScaled(img) {
      return img.naturalWidth !== img.width;
    };
    var isListOrCollection = function isListOrCollection(selector) {
      return NodeList.prototype.isPrototypeOf(selector) || HTMLCollection.prototype.isPrototypeOf(selector);
    };
    var isNode = function isNode(selector) {
      return selector && selector.nodeType === 1;
    };
    /**
   * Attaches a zoom effect on a selection of images.
   *
   * @param {(string|Object[])} [selector] The images to attach the zoom to
   * @param {number} [options.margin=0] The space outside the zoomed image
   * @param {string} [options.background="#fff"] The color of the overlay
   * @param {number} [options.scrollOffset=48] The number of pixels to scroll to dismiss the zoom
   * @param {boolean} [options.metaClick=true] A boolean to enable the default action on meta click
   * @return The zoom object
   */
    var mediumZoom = function mediumZoom(selector) {
      var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {}, _ref$margin = _ref.margin, margin = _ref$margin === undefined ? 0 : _ref$margin, _ref$background = _ref.background, background = _ref$background === undefined ? "#fff" : _ref$background, _ref$scrollOffset = _ref.scrollOffset, scrollOffset = _ref$scrollOffset === undefined ? 48 : _ref$scrollOffset, _ref$metaClick = _ref.metaClick, metaClick = _ref$metaClick === undefined ? true : _ref$metaClick;
      var selectImages = function selectImages(selector) {
        try {
          return Array.isArray(selector) ? selector.filter(isSupported) : isListOrCollection(selector) ? [].concat(toConsumableArray(selector)).filter(isSupported) : isNode(selector) ? [ selector ].filter(isSupported) : typeof selector === "string" ? [].concat(toConsumableArray(document.querySelectorAll(selector))).filter(isSupported) : [].concat(toConsumableArray(document.querySelectorAll(SUPPORTED_FORMATS.map(function(attr) {
            return attr.toLowerCase();
          }).join(",")))).filter(isScaled);
        } catch (err) {
          throw new TypeError("The provided selector is invalid.\n" + "Expects a CSS selector, a Node element, a NodeList, an HTMLCollection or an array.\n" + "See: https://github.com/francoischalifour/medium-zoom");
        }
      };
      var createOverlay = function createOverlay(background) {
        var overlay = document.createElement("div");
        overlay.classList.add("medium-zoom-overlay");
        overlay.style.backgroundColor = background;
        return overlay;
      };
      var cloneTarget = function cloneTarget(template) {
        var _template$getBounding = template.getBoundingClientRect(), top = _template$getBounding.top, left = _template$getBounding.left, width = _template$getBounding.width, height = _template$getBounding.height;
        var clone = template.cloneNode();
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        clone.removeAttribute("id");
        clone.style.position = "absolute";
        clone.style.top = top + scrollTop + "px";
        clone.style.left = left + scrollLeft + "px";
        clone.style.width = width + "px";
        clone.style.height = height + "px";
        clone.style.transform = "";
        return clone;
      };
      var zoom = function zoom() {
        if (!target.template) return;
        target.template.dispatchEvent(new Event("show"));
        scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        isAnimating = true;
        target.zoomed = cloneTarget(target.template);
        document.body.appendChild(overlay);
        document.body.appendChild(target.zoomed);
        requestAnimationFrame(function() {
          document.body.classList.add("medium-zoom--open");
        });
        target.template.style.visibility = "hidden";
        target.zoomed.classList.add("medium-zoom-image--open");
        target.zoomed.addEventListener("click", zoomOut);
        target.zoomed.addEventListener("transitionend", onZoomEnd);
        if (target.template.getAttribute("data-zoom-target")) {
          target.zoomedHd = target.zoomed.cloneNode();
          target.zoomedHd.src = target.zoomed.getAttribute("data-zoom-target");
          target.zoomedHd.onerror = function() {
            clearInterval(getZoomTargetSize);
            console.error("Unable to reach the zoom image target " + target.zoomedHd.src);
            target.zoomedHd = null;
            animateTarget();
          };
          // We need to access the natural size of the full HD
          // target as fast as possible to compute the animation.
          var getZoomTargetSize = setInterval(function() {
            if (target.zoomedHd.naturalWidth) {
              clearInterval(getZoomTargetSize);
              target.zoomedHd.classList.add("medium-zoom-image--open");
              target.zoomedHd.addEventListener("click", zoomOut);
              document.body.appendChild(target.zoomedHd);
              animateTarget();
            }
          }, 10);
        } else {
          animateTarget();
        }
      };
      var zoomOut = function zoomOut() {
        var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var doZoomOut = function doZoomOut() {
          if (isAnimating || !target.template) return;
          target.template.dispatchEvent(new Event("hide"));
          isAnimating = true;
          document.body.classList.remove("medium-zoom--open");
          target.zoomed.style.transform = "";
          if (target.zoomedHd) {
            target.zoomedHd.style.transform = "";
            target.zoomedHd.removeEventListener("click", zoomOut);
          }
          target.zoomed.removeEventListener("click", zoomOut);
          target.zoomed.addEventListener("transitionend", onZoomOutEnd);
        };
        timeout > 0 ? setTimeout(doZoomOut, timeout) : doZoomOut();
      };
      var triggerZoom = function triggerZoom(event) {
        if (!target.template) {
          target.template = event ? event.target : images[0];
          zoom();
        } else {
          zoomOut();
        }
      };
      var update = function update() {
        var newOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        newOptions.background && (overlay.style.backgroundColor = newOptions.background);
        return _extends(options, newOptions);
      };
      var addEventListeners = function addEventListeners(type, listener) {
        images.forEach(function(image) {
          image.addEventListener(type, listener);
        });
      };
      var detach = function detach() {
        var doDetach = function doDetach() {
          var event = new Event("detach");
          images.forEach(function(image) {
            image.classList.remove("medium-zoom-image");
            image.removeEventListener("click", onClick);
            image.dispatchEvent(event);
          });
          images.splice(0, images.length);
          overlay.removeEventListener("click", zoomOut);
          document.removeEventListener("scroll", onScroll);
          document.removeEventListener("keyup", onDismiss);
          window.removeEventListener("resize", zoomOut);
          target.zoomed && target.zoomed.removeEventListener("transitionend", doDetach);
        };
        if (!target.zoomed) {
          doDetach();
        } else {
          zoomOut();
          target.zoomed.addEventListener("transitionend", requestAnimationFrame(doDetach));
        }
      };
      var onClick = function onClick(event) {
        if (event.metaKey || event.ctrlKey) {
          if (options.metaClick) {
            return window.open(event.target.getAttribute("data-original") || event.target.parentNode.href || event.target.src, "_blank");
          }
        }
        event.preventDefault();
        triggerZoom(event);
      };
      var onZoomEnd = function onZoomEnd() {
        isAnimating = false;
        target.zoomed.removeEventListener("transitionend", onZoomEnd);
        target.template.dispatchEvent(new Event("shown"));
      };
      var onZoomOutEnd = function onZoomOutEnd() {
        if (!target.template) return;
        target.template.style.visibility = "";
        document.body.removeChild(target.zoomed);
        target.zoomedHd && document.body.removeChild(target.zoomedHd);
        document.body.removeChild(overlay);
        target.zoomed.classList.remove("medium-zoom-image--open");
        isAnimating = false;
        target.zoomed.removeEventListener("transitionend", onZoomOutEnd);
        target.template.dispatchEvent(new Event("hidden"));
        target.template = null;
        target.zoomed = null;
        target.zoomedHd = null;
      };
      var onScroll = function onScroll() {
        if (isAnimating || !target.template) return;
        var currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        if (Math.abs(scrollTop - currentScroll) > options.scrollOffset) {
          zoomOut(150);
        }
      };
      var onDismiss = function onDismiss(event) {
        if (CANCEL_KEYS.includes(event.keyCode || event.which)) {
          zoomOut();
        }
      };
      var animateTarget = function animateTarget() {
        if (!target.template) return;
        var windowWidth = window.innerWidth;
        var windowHeight = window.innerHeight;
        var viewportWidth = windowWidth - options.margin * 2;
        var viewportHeight = windowHeight - options.margin * 2;
        var zoomTarget = target.zoomedHd || target.template;
        var _zoomTarget$naturalWi = zoomTarget.naturalWidth, naturalWidth = _zoomTarget$naturalWi === undefined ? viewportWidth : _zoomTarget$naturalWi, _zoomTarget$naturalHe = zoomTarget.naturalHeight, naturalHeight = _zoomTarget$naturalHe === undefined ? viewportHeight : _zoomTarget$naturalHe;
        var _zoomTarget$getBoundi = zoomTarget.getBoundingClientRect(), top = _zoomTarget$getBoundi.top, left = _zoomTarget$getBoundi.left, width = _zoomTarget$getBoundi.width, height = _zoomTarget$getBoundi.height;
        var scaleX = Math.min(naturalWidth, viewportWidth) / width;
        var scaleY = Math.min(naturalHeight, viewportHeight) / height;
        var scale = Math.min(scaleX, scaleY) || 1;
        var translateX = (-left + (viewportWidth - width) / 2 + options.margin) / scale;
        var translateY = (-top + (viewportHeight - height) / 2 + options.margin) / scale;
        var transform = "scale(" + scale + ") translate3d(" + translateX + "px, " + translateY + "px, 0)";
        target.zoomed.style.transform = transform;
        target.zoomedHd && (target.zoomedHd.style.transform = transform);
      };
      var options = {
        margin: margin,
        background: background,
        scrollOffset: scrollOffset,
        metaClick: metaClick
      };
      if (selector instanceof Object) {
        _extends(options, selector);
      }
      var images = selectImages(selector);
      var overlay = createOverlay(options.background);
      var target = {
        template: null,
        zoomed: null,
        zoomedHd: null
      };
      var scrollTop = 0;
      var isAnimating = false;
      images.forEach(function(elem) {
        elem.classList.add("medium-zoom-image");
        elem.addEventListener("click", onClick);
      });
      overlay.addEventListener("click", zoomOut);
      document.addEventListener("scroll", onScroll);
      document.addEventListener("keyup", onDismiss);
      window.addEventListener("resize", zoomOut);
      return {
        show: triggerZoom,
        hide: zoomOut,
        toggle: triggerZoom,
        update: update,
        addEventListeners: addEventListeners,
        detach: detach,
        images: images,
        options: options
      };
    };
    module.exports = mediumZoom;
  });
  __$styleInject(".medium-zoom-overlay{position:fixed;top:0;right:0;bottom:0;left:0;opacity:0;transition:opacity .3s;will-change:opacity}.medium-zoom--open .medium-zoom-overlay{cursor:pointer;cursor:zoom-out;opacity:1}.medium-zoom-image{cursor:pointer;cursor:zoom-in;transition:transform .3s}.medium-zoom-image--open{position:relative;z-index:1;cursor:pointer;cursor:zoom-out;will-change:transform}", undefined);
  var src = mediumZoom_1;
  return src;
});
