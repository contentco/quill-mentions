/******/ (function(modules) { // webpackBootstrap
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
/******/ 	return __webpack_require__(__webpack_require__.s = 2);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.PasteHandler = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _quillTable = __webpack_require__(3);

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Custom module for quilljs to allow user to change url format and inline images format when copy and paste from their file system into the editor
 * @see https://quilljs.com/blog/building-a-custom-module/
 * extend from author https://github.com/schneidmaster
 */
var Delta = Quill.import('delta');

var PasteHandler = exports.PasteHandler = function () {
	function PasteHandler(quill, options) {
		_classCallCheck(this, PasteHandler);

		// save the quill reference
		this.quill = quill;
		// bind handlers to this instance
		this.handlePaste = this.handlePaste.bind(this);
		this.handleGetData = this.handleGetData.bind(this);
		this.quill.root.addEventListener('paste', this.handlePaste, false);
		this.quill.once('editor-change', this.handleGetData, false);
	}

	_createClass(PasteHandler, [{
		key: 'handlePaste',
		value: function handlePaste(evt) {
			if (evt.clipboardData && evt.clipboardData.items && evt.clipboardData.items.length) {
				this.quill.clipboard.addMatcher(Node.TEXT_NODE, function (node, delta) {
					var regex = /https?:\/\/[^\s]+/g;
					if (typeof node.data !== 'string') return;
					var matches = node.data.match(regex);
					if (matches && matches.length > 0) {
						var ops = [];
						var str = node.data;
						matches.forEach(function (match) {
							var split = str.split(match);
							var beforeLink = split.shift();
							ops.push({ insert: beforeLink });
							ops.push({ insert: match, attributes: { link: match } });
							str = split.join(match);
						});
						ops.push({ insert: str });
						delta.ops = ops;
					}
					return delta;
				});
				var table_id = _quillTable.TableTrick.random_id();
				var row_id = _quillTable.TableTrick.random_id();
				this.quill.clipboard.addMatcher('TABLE', function (node, delta) {
					table_id = _quillTable.TableTrick.random_id();
					delta.insert('\n');
					return delta;
				});
				this.quill.clipboard.addMatcher('TR', function (node, delta) {
					row_id = _quillTable.TableTrick.random_id();
					return delta;
				});
				this.quill.clipboard.addMatcher('TD', function (node, delta) {
					var cell_id = _quillTable.TableTrick.random_id();
					return delta.compose(new Delta().retain(delta.length(), { td: table_id + '|' + row_id + '|' + cell_id }));
				});

				this.quill.clipboard.addMatcher('LI', function (node, delta) {
					var style = window.getComputedStyle(node);
					var list_style = style.getPropertyValue('list-style-type');
					if (list_style) {
						var ops = [];
						var str = node.textContent;
						if (list_style == 'decimal') {
							ops.push({ "insert": str }, { "insert": "\n", "attributes": { "list": "ordered" } });
						} else if (list_style == 'lower-alpha') {
							ops.push({ "insert": str }, { "insert": "\n", "attributes": { "indent": 1, "list": "ordered" } });
						} else if (list_style == 'lower-roman') {
							ops.push({ "insert": str }, { "insert": "\n", "attributes": { "indent": 2, "list": "ordered" } });
						} else if (list_style == 'disc') {
							ops.push({ "insert": str }, { "insert": "\n", "attributes": { "list": "bullet" } });
						} else if (list_style == 'circle') {
							ops.push({ "insert": str }, { "insert": "\n", "attributes": { "indent": 1, "list": "bullet" } });
						} else if (list_style == 'square') {
							ops.push({ "insert": str }, { "insert": "\n", "attributes": { "indent": 2, "list": "bullet" } });
						} else {
							ops.push({ "insert": str }, { "insert": "\n", "attributes": { "list": "ordered" } });
						}
						delta.ops = ops;
					};
					return delta;
				});
			}
		}
	}, {
		key: 'handleGetData',
		value: function handleGetData(evt) {
			var current_container = this.quill.container;
			var editor = current_container.children[0];
			var current_html = editor.innerHTML;
			var table_id = _quillTable.TableTrick.random_id();
			var row_id = _quillTable.TableTrick.random_id();
			this.quill.clipboard.addMatcher('TABLE', function (node, delta) {
				table_id = _quillTable.TableTrick.random_id();
				return delta;
			});
			this.quill.clipboard.addMatcher('TR', function (node, delta) {
				row_id = _quillTable.TableTrick.random_id();
				return delta;
			});
			this.quill.clipboard.addMatcher('TD', function (node, delta) {
				var cell_id = _quillTable.TableTrick.random_id();
				return delta.compose(new Delta().retain(delta.length(), { td: table_id + '|' + row_id + '|' + cell_id }));
			});
			this.quill.clipboard.dangerouslyPasteHTML(current_html);
		}
	}]);

	return PasteHandler;
}();

Quill.register('modules/pasteHandler', PasteHandler);

/***/ }),
/* 1 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _base = __webpack_require__(1);

var _base2 = _interopRequireDefault(_base);

var _modulePasteHandler = __webpack_require__(0);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Container = Quill.import('blots/container');
var Scroll = Quill.import('blots/scroll');
var Inline = Quill.import('blots/inline');
var Block = Quill.import('blots/block');
var Delta = Quill.import('delta');
var Parchment = Quill.import('parchment');
var BlockEmbed = Quill.import('blots/block/embed');
var TextBlot = Quill.import('blots/text');

//
//
// CONTAINER TAG
//

var ContainBlot = function (_Container) {
  _inherits(ContainBlot, _Container);

  function ContainBlot() {
    _classCallCheck(this, ContainBlot);

    return _possibleConstructorReturn(this, (ContainBlot.__proto__ || Object.getPrototypeOf(ContainBlot)).apply(this, arguments));
  }

  _createClass(ContainBlot, [{
    key: 'insertBefore',
    value: function insertBefore(blot, ref) {
      if (blot.statics.blotName == this.statics.blotName) {
        _get(ContainBlot.prototype.__proto__ || Object.getPrototypeOf(ContainBlot.prototype), 'insertBefore', this).call(this, blot.children.head, ref);
      } else {
        _get(ContainBlot.prototype.__proto__ || Object.getPrototypeOf(ContainBlot.prototype), 'insertBefore', this).call(this, blot, ref);
      }
    }
  }, {
    key: 'formats',
    value: function formats() {
      // We don't inherit from FormatBlot
      return _defineProperty({}, this.statics.blotName, this.statics.formats(this.domNode));
    }
  }, {
    key: 'replace',
    value: function replace(target) {
      if (target.statics.blotName !== this.statics.blotName) {
        var item = Parchment.create(this.statics.defaultChild);
        target.moveChildren(item);
        this.appendChild(item);
      }
      if (target.parent == null) return;
      _get(ContainBlot.prototype.__proto__ || Object.getPrototypeOf(ContainBlot.prototype), 'replace', this).call(this, target);
    }
  }], [{
    key: 'create',
    value: function create(value) {
      var tagName = 'contain';
      var node = _get(ContainBlot.__proto__ || Object.getPrototypeOf(ContainBlot), 'create', this).call(this, tagName);
      return node;
    }
  }, {
    key: 'formats',
    value: function formats(domNode) {
      return domNode.tagName;
    }
  }]);

  return ContainBlot;
}(Container);

ContainBlot.blotName = 'contain';
ContainBlot.tagName = 'contain';
ContainBlot.scope = Parchment.Scope.BLOCK_BLOT;
ContainBlot.defaultChild = 'block';
ContainBlot.allowedChildren = [Block, BlockEmbed, Container];
Quill.register(ContainBlot);

//
//
// CONTAINER TR
//

var TableRow = function (_Container2) {
  _inherits(TableRow, _Container2);

  function TableRow() {
    _classCallCheck(this, TableRow);

    return _possibleConstructorReturn(this, (TableRow.__proto__ || Object.getPrototypeOf(TableRow)).apply(this, arguments));
  }

  _createClass(TableRow, [{
    key: 'optimize',
    value: function optimize() {
      _get(TableRow.prototype.__proto__ || Object.getPrototypeOf(TableRow.prototype), 'optimize', this).call(this);
      var next = this.next;
      if (next != null && next.prev === this && next.statics.blotName === this.statics.blotName && next.domNode.tagName === this.domNode.tagName && next.domNode.getAttribute('row_id') === this.domNode.getAttribute('row_id')) {
        next.moveChildren(this);
        next.remove();
      }
    }
  }], [{
    key: 'create',
    value: function create(value) {
      var tagName = 'tr';
      var node = _get(TableRow.__proto__ || Object.getPrototypeOf(TableRow), 'create', this).call(this, tagName);
      node.setAttribute('row_id', value);
      return node;
    }
  }]);

  return TableRow;
}(Container);

TableRow.blotName = 'tr';
TableRow.tagName = 'tr';
TableRow.scope = Parchment.Scope.BLOCK_BLOT;
TableRow.defaultChild = 'td';
Quill.register(TableRow);

//
//
// CONTAINER TABLE
//

var TableTrick = exports.TableTrick = function () {
  function TableTrick() {
    _classCallCheck(this, TableTrick);
  }

  _createClass(TableTrick, null, [{
    key: 'random_id',
    value: function random_id() {
      return Math.random().toString(36).slice(2);
    }
  }, {
    key: 'find_td',
    value: function find_td(what) {
      var leaf = quill.getLeaf(quill.getSelection()['index']);
      var blot = leaf[0];
      for (; blot != null && blot.statics.blotName != what;) {
        blot = blot.parent;
      }
      return blot; // return TD or NULL
    }
  }, {
    key: 'append_col',
    value: function append_col() {
      var td = TableTrick.find_td('td');
      if (td) {
        var table = td.parent.parent;
        var table_id = table.domNode.getAttribute('table_id');
        td.parent.parent.children.forEach(function (tr) {
          var row_id = tr.domNode.getAttribute('row_id');
          var cell_id = TableTrick.random_id();
          var td = Parchment.create('td', table_id + '|' + row_id + '|' + cell_id);
          tr.appendChild(td);
        });
      }
    }
  }, {
    key: 'append_row',
    value: function append_row() {
      var td = TableTrick.find_td('td');
      if (td) {
        var col_count = td.parent.children.length;
        var table = td.parent.parent;
        var new_row = td.parent.clone();
        var table_id = table.domNode.getAttribute('table_id');
        var row_id = TableTrick.random_id();
        new_row.domNode.setAttribute('row_id', row_id);
        for (var i = col_count - 1; i >= 0; i--) {
          var cell_id = TableTrick.random_id();
          var _td = Parchment.create('td', table_id + '|' + row_id + '|' + cell_id);
          new_row.appendChild(_td);
        };
        table.appendChild(new_row);
      }
    }
  }]);

  return TableTrick;
}();

var Table = function (_Container3) {
  _inherits(Table, _Container3);

  function Table() {
    _classCallCheck(this, Table);

    return _possibleConstructorReturn(this, (Table.__proto__ || Object.getPrototypeOf(Table)).apply(this, arguments));
  }

  _createClass(Table, [{
    key: 'optimize',
    value: function optimize() {
      _get(Table.prototype.__proto__ || Object.getPrototypeOf(Table.prototype), 'optimize', this).call(this);
      var next = this.next;
      if (next != null && next.prev === this && next.statics.blotName === this.statics.blotName && next.domNode.tagName === this.domNode.tagName && next.domNode.getAttribute('table_id') === this.domNode.getAttribute('table_id')) {
        next.moveChildren(this);
        next.remove();
      }
    }
  }], [{
    key: 'create',
    value: function create(value) {
      // special adding commands - belongs somewhere else out of constructor
      if (value == 'append-row') {
        var blot = TableTrick.append_row();
        return blot;
      } else if (value == 'append-col') {
        var _blot = TableTrick.append_col();
        return _blot;
      } else if (value.includes('newtable_')) {
        var node = null;
        var sizes = value.split('_');
        var row_count = Number.parseInt(sizes[1]);
        var col_count = Number.parseInt(sizes[2]);
        var table_id = TableTrick.random_id();
        var table = Parchment.create('table', table_id);
        for (var ri = 0; ri < row_count; ri++) {
          var row_id = TableTrick.random_id();
          var tr = Parchment.create('tr', row_id);
          table.appendChild(tr);
          for (var ci = 0; ci < col_count; ci++) {
            var cell_id = TableTrick.random_id();
            value = table_id + '|' + row_id + '|' + cell_id;
            var td = Parchment.create('td', value);
            tr.appendChild(td);
            var p = Parchment.create('block');
            td.appendChild(p);
            var br = Parchment.create('break');
            p.appendChild(br);
            node = p;
          }
        }
        var leaf = quill.getLeaf(quill.getSelection()['index']);
        var _blot2 = leaf[0];
        var top_branch = null;
        for (; _blot2 != null && !(_blot2 instanceof Container || _blot2 instanceof Scroll);) {
          top_branch = _blot2;
          _blot2 = _blot2.parent;
        }
        _blot2.insertBefore(table, top_branch);
        return node;
      } else {
        // normal table
        var tagName = 'table';
        var _node = _get(Table.__proto__ || Object.getPrototypeOf(Table), 'create', this).call(this, tagName);
        _node.setAttribute('table_id', value);
        return _node;
      }
    }
  }]);

  return Table;
}(Container);

Table.blotName = 'table';
Table.tagName = 'table';
Table.scope = Parchment.Scope.BLOCK_BLOT;
Table.defaultChild = 'tr';
Table.allowedChildren = [TableRow];
Quill.register(Table);

//
//
// CONTAINER TD
//

var TableCell = function (_ContainBlot) {
  _inherits(TableCell, _ContainBlot);

  function TableCell() {
    _classCallCheck(this, TableCell);

    return _possibleConstructorReturn(this, (TableCell.__proto__ || Object.getPrototypeOf(TableCell)).apply(this, arguments));
  }

  _createClass(TableCell, [{
    key: 'format',
    value: function format() {
      this.getAttribute('id');
    }
  }, {
    key: 'formats',
    value: function formats() {
      // We don't inherit from FormatBlot
      return _defineProperty({}, this.statics.blotName, this.domNode.getAttribute('table_id') + '|' + this.domNode.getAttribute('row_id') + '|' + this.domNode.getAttribute('cell_id'));
    }
  }, {
    key: 'optimize',
    value: function optimize() {
      _get(TableCell.prototype.__proto__ || Object.getPrototypeOf(TableCell.prototype), 'optimize', this).call(this);

      // Add parent TR and TABLE when missing
      var parent = this.parent;
      if (parent != null && parent.statics.blotName != 'tr') {
        // we will mark td position, put in table and replace mark
        var mark = Parchment.create('block');
        this.parent.insertBefore(mark, this.next);
        var table = Parchment.create('table', this.domNode.getAttribute('table_id'));
        var tr = Parchment.create('tr', this.domNode.getAttribute('row_id'));
        table.appendChild(tr);
        tr.appendChild(this);
        table.replace(mark);
      }

      // merge same TD id
      var next = this.next;
      if (next != null && next.prev === this && next.statics.blotName === this.statics.blotName && next.domNode.tagName === this.domNode.tagName && next.domNode.getAttribute('cell_id') === this.domNode.getAttribute('cell_id')) {
        next.moveChildren(this);
        next.remove();
      }
    }
  }], [{
    key: 'create',
    value: function create(value) {
      var tagName = 'td';
      var node = _get(TableCell.__proto__ || Object.getPrototypeOf(TableCell), 'create', this).call(this, tagName);
      var ids = value.split('|');
      node.setAttribute('table_id', ids[0]);
      node.setAttribute('row_id', ids[1]);
      node.setAttribute('cell_id', ids[2]);
      return node;
    }
  }]);

  return TableCell;
}(ContainBlot);

TableCell.blotName = 'td';
TableCell.tagName = 'td';
TableCell.scope = Parchment.Scope.BLOCK_BLOT;
TableCell.defaultChild = 'block';
TableCell.allowedChildren = [Block, BlockEmbed, Container];
Quill.register(TableCell);
TableRow.allowedChildren = [TableCell];

Container.order = ['list', 'contain', // Must be lower
'td', 'tr', 'table' // Must be higher
];

Quill.debug('debug');

/***/ })
/******/ ]);