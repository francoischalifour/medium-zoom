/*!
 * 
 *    medium-zoom v0.1.1
 *    Medium-like zoom on your pictures in pure JavaScript
 *    Copyright (c) 2017 Francois Chalifour
 *    https://github.com/francoischalifour/medium-zoom
 *    MIT license
 * 
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("medium-zoom", [], factory);
	else if(typeof exports === 'object')
		exports["medium-zoom"] = factory();
	else
		root["medium-zoom"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 5);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(2);
if(typeof content === 'string') content = [[module.i, content, '']];
// add the styles to the DOM
var update = __webpack_require__(4)(content, {});
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../node_modules/css-loader/index.js!../node_modules/postcss-loader/index.js!./medium-zoom.css", function() {
			var newContent = require("!!../node_modules/css-loader/index.js!../node_modules/postcss-loader/index.js!./medium-zoom.css");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = function(module) {
	if(!module.webpackPolyfill) {
		module.deprecate = function() {};
		module.paths = [];
		// module.parent = undefined by default
		if(!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function() {
				return module.i;
			}
		});
		module.webpackPolyfill = 1;
	}
	return module;
};


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(3)();
// imports


// module
exports.push([module.i, ".medium-zoom-overlay {\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  opacity: 0;\n  -webkit-transition: opacity 300ms;\n  transition: opacity 300ms;\n  will-change: opacity;\n}\n\n.medium-zoom--open .medium-zoom-overlay {\n  cursor: pointer;\n  cursor: zoom-out;\n  opacity: 1;\n}\n\n.medium-zoom-image {\n  cursor: pointer;\n  cursor: zoom-in;\n  -webkit-transition: all 300ms;\n  transition: all 300ms;\n}\n\n.medium-zoom-image--open {\n  position: relative;\n  z-index: 999;\n  cursor: pointer;\n  cursor: zoom-out;\n  will-change: transform;\n}\n", ""]);

// exports


/***/ }),
/* 3 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function() {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		var result = [];
		for(var i = 0; i < this.length; i++) {
			var item = this[i];
			if(item[2]) {
				result.push("@media " + item[2] + "{" + item[1] + "}");
			} else {
				result.push(item[1]);
			}
		}
		return result.join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};


/***/ }),
/* 4 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var stylesInDom = {},
	memoize = function(fn) {
		var memo;
		return function () {
			if (typeof memo === "undefined") memo = fn.apply(this, arguments);
			return memo;
		};
	},
	isOldIE = memoize(function() {
		return /msie [6-9]\b/.test(self.navigator.userAgent.toLowerCase());
	}),
	getHeadElement = memoize(function () {
		return document.head || document.getElementsByTagName("head")[0];
	}),
	singletonElement = null,
	singletonCounter = 0,
	styleElementsInsertedAtTop = [];

module.exports = function(list, options) {
	if(typeof DEBUG !== "undefined" && DEBUG) {
		if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};
	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (typeof options.singleton === "undefined") options.singleton = isOldIE();

	// By default, add <style> tags to the bottom of <head>.
	if (typeof options.insertAt === "undefined") options.insertAt = "bottom";

	var styles = listToStyles(list);
	addStylesToDom(styles, options);

	return function update(newList) {
		var mayRemove = [];
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			domStyle.refs--;
			mayRemove.push(domStyle);
		}
		if(newList) {
			var newStyles = listToStyles(newList);
			addStylesToDom(newStyles, options);
		}
		for(var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];
			if(domStyle.refs === 0) {
				for(var j = 0; j < domStyle.parts.length; j++)
					domStyle.parts[j]();
				delete stylesInDom[domStyle.id];
			}
		}
	};
}

function addStylesToDom(styles, options) {
	for(var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];
		if(domStyle) {
			domStyle.refs++;
			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}
			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];
			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}
			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles(list) {
	var styles = [];
	var newStyles = {};
	for(var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};
		if(!newStyles[id])
			styles.push(newStyles[id] = {id: id, parts: [part]});
		else
			newStyles[id].parts.push(part);
	}
	return styles;
}

function insertStyleElement(options, styleElement) {
	var head = getHeadElement();
	var lastStyleElementInsertedAtTop = styleElementsInsertedAtTop[styleElementsInsertedAtTop.length - 1];
	if (options.insertAt === "top") {
		if(!lastStyleElementInsertedAtTop) {
			head.insertBefore(styleElement, head.firstChild);
		} else if(lastStyleElementInsertedAtTop.nextSibling) {
			head.insertBefore(styleElement, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			head.appendChild(styleElement);
		}
		styleElementsInsertedAtTop.push(styleElement);
	} else if (options.insertAt === "bottom") {
		head.appendChild(styleElement);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement(styleElement) {
	styleElement.parentNode.removeChild(styleElement);
	var idx = styleElementsInsertedAtTop.indexOf(styleElement);
	if(idx >= 0) {
		styleElementsInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement(options) {
	var styleElement = document.createElement("style");
	styleElement.type = "text/css";
	insertStyleElement(options, styleElement);
	return styleElement;
}

function createLinkElement(options) {
	var linkElement = document.createElement("link");
	linkElement.rel = "stylesheet";
	insertStyleElement(options, linkElement);
	return linkElement;
}

function addStyle(obj, options) {
	var styleElement, update, remove;

	if (options.singleton) {
		var styleIndex = singletonCounter++;
		styleElement = singletonElement || (singletonElement = createStyleElement(options));
		update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
		remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
	} else if(obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function") {
		styleElement = createLinkElement(options);
		update = updateLink.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
			if(styleElement.href)
				URL.revokeObjectURL(styleElement.href);
		};
	} else {
		styleElement = createStyleElement(options);
		update = applyToTag.bind(null, styleElement);
		remove = function() {
			removeStyleElement(styleElement);
		};
	}

	update(obj);

	return function updateStyle(newObj) {
		if(newObj) {
			if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
				return;
			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;
		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag(styleElement, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (styleElement.styleSheet) {
		styleElement.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = styleElement.childNodes;
		if (childNodes[index]) styleElement.removeChild(childNodes[index]);
		if (childNodes.length) {
			styleElement.insertBefore(cssNode, childNodes[index]);
		} else {
			styleElement.appendChild(cssNode);
		}
	}
}

function applyToTag(styleElement, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		styleElement.setAttribute("media", media)
	}

	if(styleElement.styleSheet) {
		styleElement.styleSheet.cssText = css;
	} else {
		while(styleElement.firstChild) {
			styleElement.removeChild(styleElement.firstChild);
		}
		styleElement.appendChild(document.createTextNode(css));
	}
}

function updateLink(linkElement, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	if(sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = linkElement.href;

	linkElement.href = URL.createObjectURL(blob);

	if(oldSrc)
		URL.revokeObjectURL(oldSrc);
}


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(module) {

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * Adds a zoom effect on a selection of images when clicked.
 *
 * @param {(string|Object[])} [selector] The images to apply the zoom to
 * @param {number} [options.margin=0] Space outside the zoomed image
 * @param {string} [options.background="#fff"] The color of the overlay
 * @param {number} [options.scrollOffset=48] Number of pixels to scroll to dismiss the zoom
 * @param {boolean} [options.metaClick=true] Enables the action on meta click
 */
var mediumZoom = function mediumZoom(selector) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$margin = _ref.margin,
      margin = _ref$margin === undefined ? 0 : _ref$margin,
      _ref$background = _ref.background,
      background = _ref$background === undefined ? '#fff' : _ref$background,
      _ref$scrollOffset = _ref.scrollOffset,
      scrollOffset = _ref$scrollOffset === undefined ? 48 : _ref$scrollOffset,
      _ref$metaClick = _ref.metaClick,
      metaClick = _ref$metaClick === undefined ? true : _ref$metaClick;

  __webpack_require__(0);

  var SUPPORTED_FORMATS = ['IMG', 'PICTURE', 'SVG'];
  var KEY_ESC = 27;
  var KEY_Q = 81;
  var CANCEL_KEYS = [KEY_ESC, KEY_Q];

  var isSupported = function isSupported(img) {
    return SUPPORTED_FORMATS.includes(img.tagName);
  };
  var isScaled = function isScaled(img) {
    return img.naturalWidth !== img.width;
  };
  var isArrayLike = function isArrayLike(item) {
    return !!item && (typeof item === 'undefined' ? 'undefined' : _typeof(item)) === 'object' && item.length && typeof item.length === 'number' && item.length > 0;
  };

  var getImages = function getImages() {
    try {
      return Array.isArray(selector) ? selector.filter(isSupported) : isArrayLike(selector) ? [].concat(_toConsumableArray(selector)).filter(isSupported) : typeof selector === 'string' ? [].concat(_toConsumableArray(document.querySelectorAll(selector))).filter(isSupported) : [].concat(_toConsumableArray(document.querySelectorAll(SUPPORTED_FORMATS.map(function (attr) {
        return attr.toLowerCase();
      }).join(',')))).filter(isScaled);
    } catch (err) {
      throw new SyntaxError('[medium-zoom] Unknown selector when applying the zoom.' + 'Expects a CSS selector, an array-like or an array.' + 'Check https://github.com/francoischalifour/medium-zoom for more.');
    }
  };

  var createOverlay = function createOverlay() {
    var overlay = document.createElement('div');
    overlay.classList.add('medium-zoom-overlay');
    overlay.style.backgroundColor = options.background;

    return overlay;
  };

  var zoom = function zoom() {
    if (!target) return;

    var event = new Event('show');
    target.dispatchEvent(event);

    scrollTop = document.body.scrollTop;
    isAnimating = true;

    document.body.appendChild(overlay);

    requestAnimationFrame(function () {
      document.body.classList.add('medium-zoom--open');
    });

    target.classList.add('medium-zoom-image--open');

    target.addEventListener('transitionend', onZoomEnd);

    animateTarget();
  };

  var zoomOut = function zoomOut() {
    if (!target) return;

    var event = new Event('hide');
    target.dispatchEvent(event);

    setTimeout(function () {
      isAnimating = true;
      document.body.classList.remove('medium-zoom--open');
      target.style.transform = 'none';

      target.addEventListener('transitionend', onZoomOutEnd);
    }, 150);
  };

  var triggerZoom = function triggerZoom(event) {
    if (!target) {
      target = event ? event.target : images[0];
      zoom();
    } else {
      zoomOut();
    }
  };

  var update = function update() {
    var newOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    options = _extends({}, options, newOptions);

    if (options.background) {
      overlay.style.backgroundColor = options.background;
    }

    return options;
  };

  var addEventListeners = function addEventListeners(type, listener) {
    images.forEach(function (image) {
      image.addEventListener(type, listener);
    });
  };

  var detachAll = function detachAll() {
    var event = new Event('detach');

    images.forEach(function (image) {
      image.classList.remove('medium-zoom-image');
      image.removeEventListener('click', onClick);
      image.dispatchEvent(event);
    });

    if (target) {
      target.removeEventListener('transitionend', detachAll);
    }
  };

  var detach = function detach() {
    if (target) {
      zoomOut();
      target.addEventListener('transitionend', detachAll);
    } else {
      detachAll();
    }
  };

  var onClick = function onClick(event) {
    if (event.metaKey || event.ctrlKey) {
      if (options.metaClick) {
        return window.open(event.target.getAttribute('data-original') || event.target.parentNode.href || event.target.src, '_blank');
      }
    }

    event.preventDefault();

    triggerZoom(event);
  };

  var onZoomEnd = function onZoomEnd() {
    isAnimating = false;
    target.removeEventListener('transitionend', onZoomEnd);

    var event = new Event('shown');
    target.dispatchEvent(event);
  };

  var onZoomOutEnd = function onZoomOutEnd() {
    if (!target) return;

    document.body.removeChild(overlay);
    target.classList.remove('medium-zoom-image--open');

    isAnimating = false;
    target.removeEventListener('transitionend', onZoomOutEnd);

    var event = new Event('hidden');
    target.dispatchEvent(event);

    target = null;
  };

  var onScroll = function onScroll() {
    if (isAnimating || !target) return;

    if (Math.abs(scrollTop - document.body.scrollTop) > options.scrollOffset) {
      zoomOut();
    }
  };

  var onDismiss = function onDismiss(event) {
    if (CANCEL_KEYS.includes(event.keyCode || event.which)) {
      zoomOut();
    }
  };

  var animateTarget = function animateTarget() {
    if (!target) return;

    var windowWidth = document.body.clientWidth || window.innerWidth;
    var windowHeight = document.body.clientHeight || window.innerHeight;

    var viewportWidth = windowWidth - options.margin * 2;
    var viewportHeight = windowHeight - options.margin * 2;

    var _target = target,
        width = _target.width,
        height = _target.height,
        _target$naturalWidth = _target.naturalWidth,
        naturalWidth = _target$naturalWidth === undefined ? +Infinity : _target$naturalWidth,
        _target$naturalHeight = _target.naturalHeight,
        naturalHeight = _target$naturalHeight === undefined ? +Infinity : _target$naturalHeight;

    var _target$getBoundingCl = target.getBoundingClientRect(),
        top = _target$getBoundingCl.top,
        left = _target$getBoundingCl.left;

    var isCenterAligned = Math.abs(windowWidth / 2 - (left + width / 2)) <= 10;

    var scaleX = Math.min(naturalWidth, viewportWidth) / width;
    var scaleY = Math.min(naturalHeight, viewportHeight) / height;
    var scale = Math.min(scaleX, scaleY) || 1;
    var translateX = isCenterAligned ? 0 : (-left + (viewportWidth - width) / 2) / scale;
    var translateY = (-top + (viewportHeight - height) / 2 + options.margin) / scale;

    target.style.transform = 'scale(' + scale + ') translate3d(' + translateX + 'px, ' + translateY + 'px, 0)';
  };

  var options = {
    margin: parseInt(margin) || 0,
    background: background,
    scrollOffset: parseInt(scrollOffset) || 48,
    metaClick: metaClick
  };

  if (selector instanceof Object) {
    options = _extends({}, options, selector);
  }

  var images = getImages(selector);
  var overlay = createOverlay();

  var target = null;
  var scrollTop = 0;
  var isAnimating = false;

  images.forEach(function (elem) {
    elem.classList.add('medium-zoom-image');
    elem.addEventListener('click', onClick);
  });
  overlay.addEventListener('click', zoomOut);
  document.addEventListener('scroll', onScroll);
  document.addEventListener('keyup', onDismiss);
  window.addEventListener('resize', zoomOut);

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

if (typeof window !== 'undefined') {
  window.mediumZoom = mediumZoom;
} else if (module && module.exports) {
  module.exports = mediumZoom;
}
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)(module)))

/***/ })
/******/ ]);
});
//# sourceMappingURL=medium-zoom.js.map