(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['@clubajax/on'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory(require('@clubajax/on'));
	} else {
		// Browser globals (root is window)
		root.returnExports = factory();
		root['keys'] = factory(root.on);
	}
}(this, function (on) {

	'use strict';

	function keys (listNode, options) {

		options = options || {};

		// TODO options:
		// search an option and/or a function?
		// space select an option?

		var
			controller = {
				log: false,
				setSelected: function (node) {
					highlight(select(node));
					on.fire(listNode, 'key-select', { value: selected });
				},
				getSelected: function () {
					return selected;
				},
				destroy: function () {
					select();
					unhighlight();
					this.handles.forEach(function (h) { h.remove(); });
					if (observer) {
						observer.disconnect();
					}
				}
			},
			tableMode = listNode.localName === 'table',
			inputMode = options.inputMode, // not used???
			canSelectNone = options.canSelectNone !== undefined ? options.canSelectNone : true,
			shift = false,
			meta = false,
			multiHandle,
			observer,
			searchString = '',
			searchStringTimer,
			searchStringTime = options.searchTime || 1000,
			// children is a live NodeList, so the reference will update if nodes are added or removed
			children = tableMode ? listNode.querySelectorAll('td') : listNode.children,
			selected = select(getSelected(children, options.noDefault)),
			highlighted = highlight(fromArray(selected)),
			nodeType = (highlighted || children[0]).localName;

		function unhighlight () {
			if (highlighted) {
				highlighted.removeAttribute('highlighted');
			}
		}

		function highlight (node) {
			node = fromArray(node);
			unhighlight();
			if (!node) {
				node = children[0];
			}
			highlighted = node;
			highlighted.setAttribute('highlighted', 'true');
			return highlighted;
		}

		function select (node) {
			if (options.multiple) {
				if (selected) {
					if (!shift && !meta) {
						selected.forEach(function (sel) {
							sel.removeAttribute('selected');
						});

						if (node) {
							selected = [node];
							node.setAttribute('selected', 'true');
						}
					}
					else if (shift && node) {
						selected = findShiftNodes(children, selected, node);
					}
					else if (meta && node) {

						if (!selected) {
							selected = [node];
						} else {
							selected.push(node);
						}
						node.setAttribute('selected', 'true');
					}
				} else {
					selected = [node];
				}

			} else {
				if (selected) {
					selected.removeAttribute('selected');
				}
				if (node) {
					selected = node;
					selected.setAttribute('selected', 'true');
				}
			}
			return selected;
		}

		on.fire(listNode, 'key-highlight', { value: highlighted });
		on.fire(listNode, 'key-select', { value: highlighted });

		controller.handles = [
			on(listNode, 'mouseover', nodeType, function (e, node) {
				highlight(node);
				on.fire(listNode, 'key-highlight', { value: highlighted });
			}),
			on(listNode, 'mouseout', function (e) {
				highlight(null);
				on.fire(listNode, 'key-highlight', { value: null });
			}),
			on(listNode, 'blur', function (e) {
				highlight(null);
				on.fire(listNode, 'key-highlight', { value: null });
			}),
			on(listNode, 'click', nodeType, function (e, node) {
				highlight(node);
				select(node);
				on.fire(listNode, 'key-select', { value: selected });
			}),
			on(document, 'keyup', function (e) {
				if (e.defaultPrevented) {
					return;
				}
				shift = false;
				meta = false;
			}),
			on(document, 'keydown', function (e) {
				if (e.defaultPrevented) {
					return;
				}
				switch (e.key) {
					case 'Meta':
					case 'Control':
					case 'Command':
						meta = true;
						break;
					case 'Shift':
						shift = true;
						break;
				}
			}),
			on(document, 'keydown', function (e) {
				if (e.defaultPrevented) {
					return;
				}

				switch (e.key) {
					case 'Enter':
						select(highlighted);
						on.fire(listNode, 'key-select', { value: selected });
						break;
					case 'Escape':
						if (canSelectNone) {
							select(null);
						}
						break;

					case 'ArrowDown':
						if (tableMode) {
							highlight(getCell(children, highlighted || selected, 'down'));
							on.fire(listNode, 'key-highlight', { value: highlighted });
							break;
						} else if (inputMode) {
							highlight(getNode(children, highlighted || selected, 'down'));
							on.fire(listNode, 'key-highlight', { value: highlighted });
						}
						e.preventDefault();
					// fallthrough
					case 'ArrowRight':
						if (!inputMode) {
							highlight(getNode(children, highlighted || selected, 'down'));
							on.fire(listNode, 'key-highlight', { value: highlighted });
						}
						break;

					case 'ArrowUp':
						if (tableMode) {
							highlight(getCell(children, highlighted || selected, 'up'));
							on.fire(listNode, 'key-highlight', { value: highlighted });
							e.preventDefault();
							break;
						} else if (inputMode) {
							highlight(getNode(children, highlighted || selected, 'up'));
							on.fire(listNode, 'key-highlight', { value: highlighted });
						}
						e.preventDefault();
					//fallthrough
					case 'ArrowLeft':
						if (!inputMode) {
							highlight(getNode(children, highlighted || selected, 'up'));
							on.fire(listNode, 'key-highlight', { value: highlighted });
						}
						break;
					default:
						// the event is not handled
						if (on.isAlphaNumeric(e.key)) {
							if (e.key === 'r' && meta) {
								return true;
							}
							searchString += e.key;
							var searchNode = searchHtmlContent(children, searchString);
							if (searchNode) {
								highlight(select(searchNode));
							}

							clearTimeout(searchStringTimer);
							searchStringTimer = setTimeout(function () {
								searchString = '';
							}, searchStringTime);

							break;
						}
						return;
				}
				//e.preventDefault();
				//return false;
			}),
			{
				pause: function () { if(controller.log) {console.log('pause');} },
				resume: function () { if(controller.log) {console.log('resume');} },
				remove: function () { if(controller.log) {console.log('remove');} }
			}
		];

		if (options.roles) {
			addRoles(listNode);
			if (typeof MutationObserver !== 'undefined') {
				observer = new MutationObserver(function (mutations) {
					mutations.forEach(function (event) {
						if (event.addedNodes.length) {
							addRoles(listNode);
						}
					});
				});
				observer.observe(listNode, { childList: true });
			}
		}

		multiHandle = on.makeMultiHandle(controller.handles);
		Object.keys(multiHandle).forEach(function (key) {
			controller[key] = multiHandle[key];
		});
		return controller;
	}

	function isSelected (node) {
		if (!node) {
			return false;
		}
		return node.selected || node.hasAttribute('selected');
	}

	function getSelected (children, noDefault) {
		for (var i = 0; i < children.length; i++) {
			if (isSelected(children[i])) {
				return children[i];
			}
		}
		return noDefault ? null : children[0];
	}

	function getNext (children, index) {
		var
			norecurse = children.length + 2,
			node = children[index];
		while (node) {
			index++;
			if (index > children.length - 1) {
				index = -1;
			} else if (isElligible(children, index)) {
				node = children[index];
				break;
			}
			if (norecurse-- < 0) {
				console.log('recurse');
				return getFirstElligible(children);
			}
		}
		return node;
	}

	function getPrev (children, index) {
		var
			norecurse = children.length + 2,
			node = children[index];
		while (node) {
			index--;
			if (index < 0) {
				index = children.length;
			} else if (isElligible(children, index)) {
				node = children[index];
				break;
			}
			if (norecurse-- < 0) {
				console.log('recurse');
				return getLastElligible(children);
			}
		}
		return node;
	}

	function isVisible (node) {
		return node.style.display !== 'none' && node.offsetHeight && node.offsetWidth;
	}

	function getFirstElligible (children) {
		for (var i = 0; i < children.length; i++) {
			if (isElligible(children, i)) {
				return children[i];
			}
		}
		return null;
	}

	function getLastElligible (children) {
		for (var i = children.length - 1; i >= 0 ; i--) {
			if (isElligible(children, i)) {
				return children[i];
			}
		}
		return null;
	}

	function isElligible (children, index) {
		return children[index] && !children[index].parentNode.disabled && isVisible(children[index]);
	}

	function getNode (children, highlighted, dir) {
		var index = 0;
		for (var i = 0; i < children.length; i++) {
			if (children[i] === highlighted) {
				index = i;
				break;
			}
		}
		if (dir === 'down') {
			return getNext(children, index);
		} else if (dir === 'up') {
			return getPrev(children, index);
		}
	}

	function getCell (children, highlighted, dir) {
		var
			cellIndex = getIndex(highlighted),
			row = highlighted.parentNode,
			rowIndex = getIndex(row),
			rowAmount = row.parentNode.rows.length;

		if (dir === 'down') {
			if (rowIndex + 1 < rowAmount) {
				return row.parentNode.rows[rowIndex + 1].cells[cellIndex];
			}
			return row.parentNode.rows[0].cells[cellIndex];
		} else if (dir === 'up') {
			if (rowIndex > 0) {
				return row.parentNode.rows[rowIndex - 1].cells[cellIndex];
			}
			return row.parentNode.rows[rowAmount - 1].cells[cellIndex];
		}
	}

	function getIndex (el) {
		var i, p = el.parentNode;
		for (i = 0; i < p.children.length; i++) {
			if (p.children[i] === el) {
				return i;
			}
		}
		return null;
	}

	function searchHtmlContent (children, str) {
		for (var i = 0; i < children.length; i++) {
			if (children[i].innerHTML.indexOf(str) === 0) {
				return children[i];
			}
		}
		return null;
	}

	function findShiftNodes (children, selected, node) {
		var i, a, b, c, lastNode = selected[selected.length - 1], newIndex, lastIndex, selection = [];
		selected.forEach(function (sel) {
			sel.removeAttribute('selected');
		});
		for (i = 0; i < children.length; i++) {
			c = children[i];
			if (c === node) {
				newIndex = i;
			} else if (c === lastNode) {
				lastIndex = i;
			}
		}
		if (newIndex < lastIndex) {
			a = newIndex;
			b = lastIndex;
		} else {
			b = newIndex;
			a = lastIndex;
		}

		while (a <= b) {
			children[a].setAttribute('selected', '');
			selection.push(children[a]);
			a++;
		}
		return selection;
	}

	function addRoles (node) {
		// https://www.w3.org/TR/wai-aria/roles#listbox
		for (var i = 0; i < node.children.length; i++) {
			node.children[i].setAttribute('role', 'listitem');
		}
		node.setAttribute('role', 'listbox');
	}

	function fromArray (thing) {
		return Array.isArray(thing) ? thing[0] : thing;
	}

	return keys;

}));

},{"@clubajax/on":"@clubajax/on"}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var dom = require('@clubajax/dom');
var on = require('@clubajax/on');
var PopupList = require('./popup-list');

var DEFAULT_PLACEHOLDER = 'Select One...';

var DropDown = function (_PopupList) {
	_inherits(DropDown, _PopupList);

	function DropDown() {
		_classCallCheck(this, DropDown);

		return _possibleConstructorReturn(this, (DropDown.__proto__ || Object.getPrototypeOf(DropDown)).call(this));
	}

	_createClass(DropDown, [{
		key: 'domReady',
		value: function domReady() {
			this.setAttribute('role', 'select');
			// important that the container has focus, because nothing can't lose focus
			// while selecting, or the blur will trigger a change event in React
			this.setAttribute('tabindex', '0');

			this.button = dom('div', { class: 'drop-btn' }, this);
			_get(DropDown.prototype.__proto__ || Object.getPrototypeOf(DropDown.prototype), 'domReady', this).call(this);

			if (this.label) {
				this.labelNode = dom('label', { html: this.label });
				this.insertBefore(this.labelNode, this.button);
			}
		}
	}, {
		key: 'update',
		value: function update() {
			if (this.button) {
				this.button.innerHTML = this.selectedNode ? this.selectedNode.innerHTML : this.placeholder || DEFAULT_PLACEHOLDER;
				dom.classList.toggle(this.button, 'has-placeholder', !this.selectedNode);
			}
		}
	}, {
		key: 'destroy',
		value: function destroy() {
			_get(DropDown.prototype.__proto__ || Object.getPrototypeOf(DropDown.prototype), 'destroy', this).call(this);
		}
	}]);

	return DropDown;
}(PopupList);

customElements.define('drop-down', DropDown);

module.exports = DropDown;

},{"./popup-list":3,"@clubajax/dom":"@clubajax/dom","@clubajax/on":"@clubajax/on"}],3:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BaseComponent = require('@clubajax/base-component');
var dom = require('@clubajax/dom');
var on = require('@clubajax/on');
var keys = require('@clubajax/key-nav');

var props = ['placeholder', 'label', 'limit', 'name'];
var bools = ['disabled', 'open-when-blank', 'allow-new', 'required', 'case-sensitive', 'autofocus'];

// TODO: ARIA, reset (w placeholder)

var PopupList = function (_BaseComponent) {
	_inherits(PopupList, _BaseComponent);

	function PopupList() {
		_classCallCheck(this, PopupList);

		var _this = _possibleConstructorReturn(this, (PopupList.__proto__ || Object.getPrototypeOf(PopupList)).call(this));

		_this.open = false;
		_this.selfOpen = true;
		_this.emitItem = false;
		_this.toggle = _this.toggle.bind(_this);
		return _this;
	}

	_createClass(PopupList, [{
		key: 'attributeChanged',
		value: function attributeChanged(prop, value) {
			if (prop === 'value') {
				this.value = value;
			}
		}
	}, {
		key: 'onDisabled',
		value: function onDisabled(value) {
			if (this.button) {
				this.button.disabled = !!value;
			}
			if (value) {
				this.removeAttribute('tabindex');
			} else {
				this.setAttribute('tabindex', '0');
			}
		}
	}, {
		key: 'onPlaceholder',
		value: function onPlaceholder(value) {
			if (!this.value) {
				this.button.innerHTML = value;
			}
		}
	}, {
		key: 'domReady',
		value: function domReady() {
			var testId = void 0;
			var postValue = void 0;
			var hasChildren = false;
			var parentValue = this.value;
			if (this.button) {
				var _testId = this.button.getAttribute('data-test-id');
				this.removeChild(this.button);
			}
			// TODO: in React, the UL may be set
			this.popup = dom('ul', {});
			while (this.children.length) {
				hasChildren = true;
				if (this.children[0].localName !== 'li') {
					console.warn("drop-down children should use LI's");
				}
				if (this.children[0].hasAttribute('selected') || this.children[0].getAttribute('value') === parentValue) {
					this.selectedNode = this.children[0];
					this.orgSelected = this.children[0];
					if (!parentValue) {
						postValue = this.children[0].getAttribute('value');
					}
				}
				this.popup.appendChild(this.children[0]);
			}
			if (!hasChildren) {
				this.setItemsFromData(true);
			}
			this.update();
			if (this.button) {
				this.appendChild(this.button);
			}
			this.appendChild(this.popup);
			this.connect();

			this.disabled = this.hasAttribute('disabled');

			if (postValue || parentValue) {
				this.select(postValue || parentValue);
			}
		}
	}, {
		key: 'setItemsFromData',
		value: function setItemsFromData(silent) {
			if (!this.items) {
				return;
			}
			var postValue = void 0;
			var parentValue = this.value;
			var popup = this.popup;
			var self = this;
			var node = void 0;
			popup.innerHTML = '';
			this.items.forEach(function (item) {
				if (item.value === undefined) {
					node = dom('div', { class: 'label', html: item.label }, popup);
					node.unselectable = true;
					return;
				}
				var options = { html: item.label, value: item.value };
				var isSelected = item.selected || item.value === parentValue;
				if (isSelected) {
					options.selected = true;
				}
				if (item.class) {
					options.class = item.class;
				}
				node = dom('li', options, popup);
				if (isSelected) {
					if (self.selectedNode) {
						self.selectedNode.removeAttribute('selected');
					}
					self.selectedNode = node;
					self.orgSelected = node;
					if (!parentValue) {
						self.__value = item.value;
					}
				}
			});
			this.update();
			this.connect();
		}
	}, {
		key: 'getItem',
		value: function getItem(value) {
			if (this.items) {
				for (var i = 0; i < this.items.length; i++) {
					if (this.items[i].value === value || this.items[i].label === value) {
						return this.items[i];
					}
				}
			}
			return null;
		}
	}, {
		key: 'select',
		value: function select(value, silent) {
			if (this.selectedNode) {
				this.selectedNode.removeAttribute('selected');
			}
			this.selectedNode = dom.query(this.popup, '[value="' + value + '"]');
			if (this.selectedNode) {
				this.selectedNode.setAttribute('selected', 'true');
			}
			this.lastValue = this.__value;
			this.__value = value;
			this.update();
			if (!silent) {
				this.emitEvent(value);
			}
		}
	}, {
		key: 'unselect',
		value: function unselect() {
			if (this.selectedNode) {
				this.selectedNode.removeAttribute('selected');
			}
		}
	}, {
		key: 'updateAfterListChange',
		value: function updateAfterListChange() {
			// TODO: doc this
			var parentValue = getValue(this);
			this.select(parentValue, true);
			this.hide();
		}
	}, {
		key: 'emitEvent',
		value: function emitEvent() {
			var value = void 0;
			if (this.emitItem) {
				value = this.getItem(this.value);
				if (value === null && this['allow-new']) {
					value = {
						label: this.value,
						value: this.value,
						isNew: true
					};
				}
			} else {
				value = this.value;
			}
			//const value = this.emitItem ? this.getItem(this.value) : this.value;
			this.emit('change', { value: value }, true);
		}
	}, {
		key: 'isValid',
		value: function isValid() {
			return true;
		}
	}, {
		key: 'isValidSelection',
		value: function isValidSelection() {
			// override me
			return true;
		}
	}, {
		key: 'update',
		value: function update() {
			// override me
		}
	}, {
		key: 'reset',
		value: function reset() {
			var value = this.orgSelected ? this.orgSelected.dom.normalize('value') : null;
			this.select(value);
		}
	}, {
		key: 'undo',
		value: function undo() {
			if (this.lastValue !== undefined) {
				this.select(this.lastValue, true);
			}
		}
	}, {
		key: 'toggle',
		value: function toggle() {
			if (this.open) {
				this.hide();
			} else {
				this.show();
			}
		}
	}, {
		key: 'show',
		value: function show() {
			var _this2 = this;

			if (this.disabled) {
				return;
			}
			dom.style(this.popup, 'min-width', dom.box(this).w);
			this.open = true;
			this.classList.add('show');
			position.call(this);
			setTimeout(function () {
				_this2.controller.resume();
				_this2.winHandle.resume();
				_this2.fire('open');
			}, 30);
		}
	}, {
		key: 'hide',
		value: function hide() {
			var _this3 = this;

			var timer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

			if (window.keepPopupsOpen) {
				return;
			}

			setTimeout(function () {
				if (_this3.open) {
					_this3.open = false;
					_this3.classList.remove('show');
					_this3.winHandle.pause();
					_this3.controller.pause();
					clearHighlights(_this3);
					_this3.fire('close');
				}
			}, timer);
		}
	}, {
		key: 'connect',
		value: function connect() {
			var _this4 = this;

			if (this.button && this.popup.children.length) {
				if (this.selfOpen) {
					this.on(this.button, 'click', function () {
						_this4.toggle();
					});
					this.on(this, 'keydown', function (e) {
						if (!_this4.open && e.key === 'Enter') {
							//this.show();
						}
					});
				}
				this.winHandle = on.makeMultiHandle([on(window, 'mouseup', function (e) {
					if (on.closest(e.target, _this4.localName, document.body) === _this4) {
						return true;
					}
					_this4.hide();
				}), on(window, 'keyup', function (e) {
					if (e.key === 'Escape') {
						_this4.hide();
					}
				}), on(this, 'blur', function () {
					_this4.hide();
				})]);
				var isInput = this.button.localName === 'input';
				this.controller = keys(this.popup, { roles: true, inputMode: isInput, noDefault: isInput });
				this.controller.pause();

				// listen here AFTER initializing keys, to prevent initial event
				this.on(this.popup, 'key-select', function (e) {
					var node = e.detail.value;
					if (node) {
						var value = getValue(node);
						_this4.select(value);
						_this4.hide();
					}
				});

				this.connect = function () {};
			}
		}
	}, {
		key: 'destroy',
		value: function destroy() {
			_get(PopupList.prototype.__proto__ || Object.getPrototypeOf(PopupList.prototype), 'destroy', this).call(this);
		}
	}, {
		key: 'props',
		get: function get() {
			return props;
		}
	}, {
		key: 'bools',
		get: function get() {
			return bools;
		}
	}, {
		key: 'value',
		set: function set(value) {
			var _this5 = this;

			this.__value = value;
			onDomReady(this, function () {
				_this5.select(value);
			});
		},
		get: function get() {
			return this.__value !== null ? this.__value : dom.normalize(this.getAttribute('value'));
		}
	}, {
		key: 'data',
		set: function set(value) {
			if (!value.length) {
				return;
			}
			if (!Array.isArray(value)) {
				value = [value];
			}
			if (_typeof(value[0]) !== 'object') {
				value = value.map(function (item) {
					return { label: item, value: item };
				});
			}
			this.__value = null;
			this.selectedNode = null;
			this.update();
			this.items = value;
			if (this.DOMSTATE === 'domready') {
				this.setItemsFromData();
			}
		},
		get: function get() {
			return this.items;
		}
	}], [{
		key: 'observedAttributes',
		get: function get() {
			return [].concat(props, bools, ['value']);
		}
	}]);

	return PopupList;
}(BaseComponent);

function position() {
	this.popup.classList.remove('right-aligned');
	this.popup.classList.remove('top-aligned');
	dom.style(this.popup, 'height', '');
	var win = dom.box(window);
	var pop = dom.box(this.popup);
	var btn = dom.box(this.button);

	var topSpace = btn.top;
	var botSpace = win.h - btn.top + btn.h;

	if (pop.x + pop.w + 10 > win.w) {
		this.popup.classList.add('right-aligned');
	} else {
		this.popup.classList.remove('right-aligned');
	}

	if (pop.h > botSpace && pop.h < topSpace) {
		this.popup.classList.add('top-aligned');
	} else if (pop.h < botSpace) {
		this.popup.classList.remove('top-aligned');
	} else if (botSpace > topSpace) {
		// bottom, and scroll
		this.popup.classList.remove('top-aligned');
		dom.style(this.popup, 'height', botSpace - 100);
	} else {
		// top and scroll
		this.popup.classList.add('top-aligned');
		dom.style(this.popup, 'height', topSpace - 20);
	}
}

function clearHighlights(node) {
	dom.queryAll(node, 'li').forEach(function (li) {
		li.removeAttribute('highlighted');
	});
}

function getValue(node) {
	return attr(node, 'value', 'defaultValue');
}

function attr() {
	for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
		args[_key] = arguments[_key];
	}

	var node = args[0];
	var value = void 0;
	var i = void 0;
	for (i = 1; i < args.length; i++) {
		value = dom.normalize(node.getAttribute(args[i]));
		if (value !== null && value !== '') {
			return value;
		}
	}
	return null;
}

customElements.define('popup-list', PopupList);

module.exports = PopupList;

},{"@clubajax/base-component":"@clubajax/base-component","@clubajax/dom":"@clubajax/dom","@clubajax/key-nav":1,"@clubajax/on":"@clubajax/on"}],4:[function(require,module,exports){
'use strict';

window['no-native-shim'] = false;
require('@clubajax/custom-elements-polyfill');
window.on = require('@clubajax/on');
window.dom = require('@clubajax/dom');
require('../../src/popup-list');
require('../../src/drop-down');

},{"../../src/drop-down":2,"../../src/popup-list":3,"@clubajax/custom-elements-polyfill":"@clubajax/custom-elements-polyfill","@clubajax/dom":"@clubajax/dom","@clubajax/on":"@clubajax/on"}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQGNsdWJhamF4L2tleS1uYXYvc3JjL2tleXMuanMiLCJzcmMvZHJvcC1kb3duLmpzIiwic3JjL3BvcHVwLWxpc3QuanMiLCJ0ZXN0cy9zcmMvZ2xvYmFscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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O0FBQU4sTUFBTTtBQUFBOztBQUN2QixLQUFNLE9BQU8sS0FBSyxDQUFMLENBQWI7QUFDQSxLQUFJLGNBQUo7QUFDQSxLQUFJLFVBQUo7QUFDQSxNQUFLLElBQUksQ0FBVCxFQUFZLElBQUksS0FBSyxNQUFyQixFQUE2QixHQUE3QixFQUFrQztBQUNqQyxVQUFRLElBQUksU0FBSixDQUFjLEtBQUssWUFBTCxDQUFrQixLQUFLLENBQUwsQ0FBbEIsQ0FBZCxDQUFSO0FBQ0EsTUFBSSxVQUFVLElBQVYsSUFBa0IsVUFBVSxFQUFoQyxFQUFvQztBQUNuQyxVQUFPLEtBQVA7QUFDQTtBQUNEO0FBQ0QsUUFBTyxJQUFQO0FBQ0E7O0FBRUQsZUFBZSxNQUFmLENBQXNCLFlBQXRCLEVBQW9DLFNBQXBDOztBQUVBLE9BQU8sT0FBUCxHQUFpQixTQUFqQjs7Ozs7QUNwWkEsT0FBTyxnQkFBUCxJQUEyQixLQUEzQjtBQUNBLFFBQVEsb0NBQVI7QUFDQSxPQUFPLEVBQVAsR0FBWSxRQUFRLGNBQVIsQ0FBWjtBQUNBLE9BQU8sR0FBUCxHQUFhLFFBQVEsZUFBUixDQUFiO0FBQ0EsUUFBUSxzQkFBUjtBQUNBLFFBQVEscUJBQVIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG5cdGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblx0XHQvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG5cdFx0ZGVmaW5lKFsnQGNsdWJhamF4L29uJ10sIGZhY3RvcnkpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdFx0Ly8gTm9kZS4gRG9lcyBub3Qgd29yayB3aXRoIHN0cmljdCBDb21tb25KUywgYnV0XG5cdFx0Ly8gb25seSBDb21tb25KUy1saWtlIGVudmlyb25tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsXG5cdFx0Ly8gbGlrZSBOb2RlLlxuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeShyZXF1aXJlKCdAY2x1YmFqYXgvb24nKSk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcblx0XHRyb290LnJldHVybkV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdFx0cm9vdFsna2V5cyddID0gZmFjdG9yeShyb290Lm9uKTtcblx0fVxufSh0aGlzLCBmdW5jdGlvbiAob24pIHtcblxuXHQndXNlIHN0cmljdCc7XG5cblx0ZnVuY3Rpb24ga2V5cyAobGlzdE5vZGUsIG9wdGlvbnMpIHtcblxuXHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0Ly8gVE9ETyBvcHRpb25zOlxuXHRcdC8vIHNlYXJjaCBhbiBvcHRpb24gYW5kL29yIGEgZnVuY3Rpb24/XG5cdFx0Ly8gc3BhY2Ugc2VsZWN0IGFuIG9wdGlvbj9cblxuXHRcdHZhclxuXHRcdFx0Y29udHJvbGxlciA9IHtcblx0XHRcdFx0bG9nOiBmYWxzZSxcblx0XHRcdFx0c2V0U2VsZWN0ZWQ6IGZ1bmN0aW9uIChub2RlKSB7XG5cdFx0XHRcdFx0aGlnaGxpZ2h0KHNlbGVjdChub2RlKSk7XG5cdFx0XHRcdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1zZWxlY3QnLCB7IHZhbHVlOiBzZWxlY3RlZCB9KTtcblx0XHRcdFx0fSxcblx0XHRcdFx0Z2V0U2VsZWN0ZWQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRyZXR1cm4gc2VsZWN0ZWQ7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGRlc3Ryb3k6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0XHRzZWxlY3QoKTtcblx0XHRcdFx0XHR1bmhpZ2hsaWdodCgpO1xuXHRcdFx0XHRcdHRoaXMuaGFuZGxlcy5mb3JFYWNoKGZ1bmN0aW9uIChoKSB7IGgucmVtb3ZlKCk7IH0pO1xuXHRcdFx0XHRcdGlmIChvYnNlcnZlcikge1xuXHRcdFx0XHRcdFx0b2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHRhYmxlTW9kZSA9IGxpc3ROb2RlLmxvY2FsTmFtZSA9PT0gJ3RhYmxlJyxcblx0XHRcdGlucHV0TW9kZSA9IG9wdGlvbnMuaW5wdXRNb2RlLCAvLyBub3QgdXNlZD8/P1xuXHRcdFx0Y2FuU2VsZWN0Tm9uZSA9IG9wdGlvbnMuY2FuU2VsZWN0Tm9uZSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5jYW5TZWxlY3ROb25lIDogdHJ1ZSxcblx0XHRcdHNoaWZ0ID0gZmFsc2UsXG5cdFx0XHRtZXRhID0gZmFsc2UsXG5cdFx0XHRtdWx0aUhhbmRsZSxcblx0XHRcdG9ic2VydmVyLFxuXHRcdFx0c2VhcmNoU3RyaW5nID0gJycsXG5cdFx0XHRzZWFyY2hTdHJpbmdUaW1lcixcblx0XHRcdHNlYXJjaFN0cmluZ1RpbWUgPSBvcHRpb25zLnNlYXJjaFRpbWUgfHwgMTAwMCxcblx0XHRcdC8vIGNoaWxkcmVuIGlzIGEgbGl2ZSBOb2RlTGlzdCwgc28gdGhlIHJlZmVyZW5jZSB3aWxsIHVwZGF0ZSBpZiBub2RlcyBhcmUgYWRkZWQgb3IgcmVtb3ZlZFxuXHRcdFx0Y2hpbGRyZW4gPSB0YWJsZU1vZGUgPyBsaXN0Tm9kZS5xdWVyeVNlbGVjdG9yQWxsKCd0ZCcpIDogbGlzdE5vZGUuY2hpbGRyZW4sXG5cdFx0XHRzZWxlY3RlZCA9IHNlbGVjdChnZXRTZWxlY3RlZChjaGlsZHJlbiwgb3B0aW9ucy5ub0RlZmF1bHQpKSxcblx0XHRcdGhpZ2hsaWdodGVkID0gaGlnaGxpZ2h0KGZyb21BcnJheShzZWxlY3RlZCkpLFxuXHRcdFx0bm9kZVR5cGUgPSAoaGlnaGxpZ2h0ZWQgfHwgY2hpbGRyZW5bMF0pLmxvY2FsTmFtZTtcblxuXHRcdGZ1bmN0aW9uIHVuaGlnaGxpZ2h0ICgpIHtcblx0XHRcdGlmIChoaWdobGlnaHRlZCkge1xuXHRcdFx0XHRoaWdobGlnaHRlZC5yZW1vdmVBdHRyaWJ1dGUoJ2hpZ2hsaWdodGVkJyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gaGlnaGxpZ2h0IChub2RlKSB7XG5cdFx0XHRub2RlID0gZnJvbUFycmF5KG5vZGUpO1xuXHRcdFx0dW5oaWdobGlnaHQoKTtcblx0XHRcdGlmICghbm9kZSkge1xuXHRcdFx0XHRub2RlID0gY2hpbGRyZW5bMF07XG5cdFx0XHR9XG5cdFx0XHRoaWdobGlnaHRlZCA9IG5vZGU7XG5cdFx0XHRoaWdobGlnaHRlZC5zZXRBdHRyaWJ1dGUoJ2hpZ2hsaWdodGVkJywgJ3RydWUnKTtcblx0XHRcdHJldHVybiBoaWdobGlnaHRlZDtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiBzZWxlY3QgKG5vZGUpIHtcblx0XHRcdGlmIChvcHRpb25zLm11bHRpcGxlKSB7XG5cdFx0XHRcdGlmIChzZWxlY3RlZCkge1xuXHRcdFx0XHRcdGlmICghc2hpZnQgJiYgIW1ldGEpIHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkLmZvckVhY2goZnVuY3Rpb24gKHNlbCkge1xuXHRcdFx0XHRcdFx0XHRzZWwucmVtb3ZlQXR0cmlidXRlKCdzZWxlY3RlZCcpO1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdGlmIChub2RlKSB7XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkID0gW25vZGVdO1xuXHRcdFx0XHRcdFx0XHRub2RlLnNldEF0dHJpYnV0ZSgnc2VsZWN0ZWQnLCAndHJ1ZScpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbHNlIGlmIChzaGlmdCAmJiBub2RlKSB7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZCA9IGZpbmRTaGlmdE5vZGVzKGNoaWxkcmVuLCBzZWxlY3RlZCwgbm9kZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsc2UgaWYgKG1ldGEgJiYgbm9kZSkge1xuXG5cdFx0XHRcdFx0XHRpZiAoIXNlbGVjdGVkKSB7XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkID0gW25vZGVdO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0c2VsZWN0ZWQucHVzaChub2RlKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdG5vZGUuc2V0QXR0cmlidXRlKCdzZWxlY3RlZCcsICd0cnVlJyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHNlbGVjdGVkID0gW25vZGVdO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmIChzZWxlY3RlZCkge1xuXHRcdFx0XHRcdHNlbGVjdGVkLnJlbW92ZUF0dHJpYnV0ZSgnc2VsZWN0ZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobm9kZSkge1xuXHRcdFx0XHRcdHNlbGVjdGVkID0gbm9kZTtcblx0XHRcdFx0XHRzZWxlY3RlZC5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJ3RydWUnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHNlbGVjdGVkO1xuXHRcdH1cblxuXHRcdG9uLmZpcmUobGlzdE5vZGUsICdrZXktaGlnaGxpZ2h0JywgeyB2YWx1ZTogaGlnaGxpZ2h0ZWQgfSk7XG5cdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1zZWxlY3QnLCB7IHZhbHVlOiBoaWdobGlnaHRlZCB9KTtcblxuXHRcdGNvbnRyb2xsZXIuaGFuZGxlcyA9IFtcblx0XHRcdG9uKGxpc3ROb2RlLCAnbW91c2VvdmVyJywgbm9kZVR5cGUsIGZ1bmN0aW9uIChlLCBub2RlKSB7XG5cdFx0XHRcdGhpZ2hsaWdodChub2RlKTtcblx0XHRcdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1oaWdobGlnaHQnLCB7IHZhbHVlOiBoaWdobGlnaHRlZCB9KTtcblx0XHRcdH0pLFxuXHRcdFx0b24obGlzdE5vZGUsICdtb3VzZW91dCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGhpZ2hsaWdodChudWxsKTtcblx0XHRcdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1oaWdobGlnaHQnLCB7IHZhbHVlOiBudWxsIH0pO1xuXHRcdFx0fSksXG5cdFx0XHRvbihsaXN0Tm9kZSwgJ2JsdXInLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRoaWdobGlnaHQobnVsbCk7XG5cdFx0XHRcdG9uLmZpcmUobGlzdE5vZGUsICdrZXktaGlnaGxpZ2h0JywgeyB2YWx1ZTogbnVsbCB9KTtcblx0XHRcdH0pLFxuXHRcdFx0b24obGlzdE5vZGUsICdjbGljaycsIG5vZGVUeXBlLCBmdW5jdGlvbiAoZSwgbm9kZSkge1xuXHRcdFx0XHRoaWdobGlnaHQobm9kZSk7XG5cdFx0XHRcdHNlbGVjdChub2RlKTtcblx0XHRcdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1zZWxlY3QnLCB7IHZhbHVlOiBzZWxlY3RlZCB9KTtcblx0XHRcdH0pLFxuXHRcdFx0b24oZG9jdW1lbnQsICdrZXl1cCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdGlmIChlLmRlZmF1bHRQcmV2ZW50ZWQpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0c2hpZnQgPSBmYWxzZTtcblx0XHRcdFx0bWV0YSA9IGZhbHNlO1xuXHRcdFx0fSksXG5cdFx0XHRvbihkb2N1bWVudCwgJ2tleWRvd24nLCBmdW5jdGlvbiAoZSkge1xuXHRcdFx0XHRpZiAoZS5kZWZhdWx0UHJldmVudGVkKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHN3aXRjaCAoZS5rZXkpIHtcblx0XHRcdFx0XHRjYXNlICdNZXRhJzpcblx0XHRcdFx0XHRjYXNlICdDb250cm9sJzpcblx0XHRcdFx0XHRjYXNlICdDb21tYW5kJzpcblx0XHRcdFx0XHRcdG1ldGEgPSB0cnVlO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0Y2FzZSAnU2hpZnQnOlxuXHRcdFx0XHRcdFx0c2hpZnQgPSB0cnVlO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH0pLFxuXHRcdFx0b24oZG9jdW1lbnQsICdrZXlkb3duJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0aWYgKGUuZGVmYXVsdFByZXZlbnRlZCkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHN3aXRjaCAoZS5rZXkpIHtcblx0XHRcdFx0XHRjYXNlICdFbnRlcic6XG5cdFx0XHRcdFx0XHRzZWxlY3QoaGlnaGxpZ2h0ZWQpO1xuXHRcdFx0XHRcdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1zZWxlY3QnLCB7IHZhbHVlOiBzZWxlY3RlZCB9KTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGNhc2UgJ0VzY2FwZSc6XG5cdFx0XHRcdFx0XHRpZiAoY2FuU2VsZWN0Tm9uZSkge1xuXHRcdFx0XHRcdFx0XHRzZWxlY3QobnVsbCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRicmVhaztcblxuXHRcdFx0XHRcdGNhc2UgJ0Fycm93RG93bic6XG5cdFx0XHRcdFx0XHRpZiAodGFibGVNb2RlKSB7XG5cdFx0XHRcdFx0XHRcdGhpZ2hsaWdodChnZXRDZWxsKGNoaWxkcmVuLCBoaWdobGlnaHRlZCB8fCBzZWxlY3RlZCwgJ2Rvd24nKSk7XG5cdFx0XHRcdFx0XHRcdG9uLmZpcmUobGlzdE5vZGUsICdrZXktaGlnaGxpZ2h0JywgeyB2YWx1ZTogaGlnaGxpZ2h0ZWQgfSk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChpbnB1dE1vZGUpIHtcblx0XHRcdFx0XHRcdFx0aGlnaGxpZ2h0KGdldE5vZGUoY2hpbGRyZW4sIGhpZ2hsaWdodGVkIHx8IHNlbGVjdGVkLCAnZG93bicpKTtcblx0XHRcdFx0XHRcdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1oaWdobGlnaHQnLCB7IHZhbHVlOiBoaWdobGlnaHRlZCB9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0XHQvLyBmYWxsdGhyb3VnaFxuXHRcdFx0XHRcdGNhc2UgJ0Fycm93UmlnaHQnOlxuXHRcdFx0XHRcdFx0aWYgKCFpbnB1dE1vZGUpIHtcblx0XHRcdFx0XHRcdFx0aGlnaGxpZ2h0KGdldE5vZGUoY2hpbGRyZW4sIGhpZ2hsaWdodGVkIHx8IHNlbGVjdGVkLCAnZG93bicpKTtcblx0XHRcdFx0XHRcdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1oaWdobGlnaHQnLCB7IHZhbHVlOiBoaWdobGlnaHRlZCB9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Y2FzZSAnQXJyb3dVcCc6XG5cdFx0XHRcdFx0XHRpZiAodGFibGVNb2RlKSB7XG5cdFx0XHRcdFx0XHRcdGhpZ2hsaWdodChnZXRDZWxsKGNoaWxkcmVuLCBoaWdobGlnaHRlZCB8fCBzZWxlY3RlZCwgJ3VwJykpO1xuXHRcdFx0XHRcdFx0XHRvbi5maXJlKGxpc3ROb2RlLCAna2V5LWhpZ2hsaWdodCcsIHsgdmFsdWU6IGhpZ2hsaWdodGVkIH0pO1xuXHRcdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChpbnB1dE1vZGUpIHtcblx0XHRcdFx0XHRcdFx0aGlnaGxpZ2h0KGdldE5vZGUoY2hpbGRyZW4sIGhpZ2hsaWdodGVkIHx8IHNlbGVjdGVkLCAndXAnKSk7XG5cdFx0XHRcdFx0XHRcdG9uLmZpcmUobGlzdE5vZGUsICdrZXktaGlnaGxpZ2h0JywgeyB2YWx1ZTogaGlnaGxpZ2h0ZWQgfSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdFx0Ly9mYWxsdGhyb3VnaFxuXHRcdFx0XHRcdGNhc2UgJ0Fycm93TGVmdCc6XG5cdFx0XHRcdFx0XHRpZiAoIWlucHV0TW9kZSkge1xuXHRcdFx0XHRcdFx0XHRoaWdobGlnaHQoZ2V0Tm9kZShjaGlsZHJlbiwgaGlnaGxpZ2h0ZWQgfHwgc2VsZWN0ZWQsICd1cCcpKTtcblx0XHRcdFx0XHRcdFx0b24uZmlyZShsaXN0Tm9kZSwgJ2tleS1oaWdobGlnaHQnLCB7IHZhbHVlOiBoaWdobGlnaHRlZCB9KTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHQvLyB0aGUgZXZlbnQgaXMgbm90IGhhbmRsZWRcblx0XHRcdFx0XHRcdGlmIChvbi5pc0FscGhhTnVtZXJpYyhlLmtleSkpIHtcblx0XHRcdFx0XHRcdFx0aWYgKGUua2V5ID09PSAncicgJiYgbWV0YSkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHNlYXJjaFN0cmluZyArPSBlLmtleTtcblx0XHRcdFx0XHRcdFx0dmFyIHNlYXJjaE5vZGUgPSBzZWFyY2hIdG1sQ29udGVudChjaGlsZHJlbiwgc2VhcmNoU3RyaW5nKTtcblx0XHRcdFx0XHRcdFx0aWYgKHNlYXJjaE5vZGUpIHtcblx0XHRcdFx0XHRcdFx0XHRoaWdobGlnaHQoc2VsZWN0KHNlYXJjaE5vZGUpKTtcblx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdGNsZWFyVGltZW91dChzZWFyY2hTdHJpbmdUaW1lcik7XG5cdFx0XHRcdFx0XHRcdHNlYXJjaFN0cmluZ1RpbWVyID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdFx0XHRcdFx0c2VhcmNoU3RyaW5nID0gJyc7XG5cdFx0XHRcdFx0XHRcdH0sIHNlYXJjaFN0cmluZ1RpbWUpO1xuXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHQvL3JldHVybiBmYWxzZTtcblx0XHRcdH0pLFxuXHRcdFx0e1xuXHRcdFx0XHRwYXVzZTogZnVuY3Rpb24gKCkgeyBpZihjb250cm9sbGVyLmxvZykge2NvbnNvbGUubG9nKCdwYXVzZScpO30gfSxcblx0XHRcdFx0cmVzdW1lOiBmdW5jdGlvbiAoKSB7IGlmKGNvbnRyb2xsZXIubG9nKSB7Y29uc29sZS5sb2coJ3Jlc3VtZScpO30gfSxcblx0XHRcdFx0cmVtb3ZlOiBmdW5jdGlvbiAoKSB7IGlmKGNvbnRyb2xsZXIubG9nKSB7Y29uc29sZS5sb2coJ3JlbW92ZScpO30gfVxuXHRcdFx0fVxuXHRcdF07XG5cblx0XHRpZiAob3B0aW9ucy5yb2xlcykge1xuXHRcdFx0YWRkUm9sZXMobGlzdE5vZGUpO1xuXHRcdFx0aWYgKHR5cGVvZiBNdXRhdGlvbk9ic2VydmVyICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uIChtdXRhdGlvbnMpIHtcblx0XHRcdFx0XHRtdXRhdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRcdGlmIChldmVudC5hZGRlZE5vZGVzLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRhZGRSb2xlcyhsaXN0Tm9kZSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRvYnNlcnZlci5vYnNlcnZlKGxpc3ROb2RlLCB7IGNoaWxkTGlzdDogdHJ1ZSB9KTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRtdWx0aUhhbmRsZSA9IG9uLm1ha2VNdWx0aUhhbmRsZShjb250cm9sbGVyLmhhbmRsZXMpO1xuXHRcdE9iamVjdC5rZXlzKG11bHRpSGFuZGxlKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcblx0XHRcdGNvbnRyb2xsZXJba2V5XSA9IG11bHRpSGFuZGxlW2tleV07XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGNvbnRyb2xsZXI7XG5cdH1cblxuXHRmdW5jdGlvbiBpc1NlbGVjdGVkIChub2RlKSB7XG5cdFx0aWYgKCFub2RlKSB7XG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBub2RlLnNlbGVjdGVkIHx8IG5vZGUuaGFzQXR0cmlidXRlKCdzZWxlY3RlZCcpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0U2VsZWN0ZWQgKGNoaWxkcmVuLCBub0RlZmF1bHQpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAoaXNTZWxlY3RlZChjaGlsZHJlbltpXSkpIHtcblx0XHRcdFx0cmV0dXJuIGNoaWxkcmVuW2ldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gbm9EZWZhdWx0ID8gbnVsbCA6IGNoaWxkcmVuWzBdO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0TmV4dCAoY2hpbGRyZW4sIGluZGV4KSB7XG5cdFx0dmFyXG5cdFx0XHRub3JlY3Vyc2UgPSBjaGlsZHJlbi5sZW5ndGggKyAyLFxuXHRcdFx0bm9kZSA9IGNoaWxkcmVuW2luZGV4XTtcblx0XHR3aGlsZSAobm9kZSkge1xuXHRcdFx0aW5kZXgrKztcblx0XHRcdGlmIChpbmRleCA+IGNoaWxkcmVuLmxlbmd0aCAtIDEpIHtcblx0XHRcdFx0aW5kZXggPSAtMTtcblx0XHRcdH0gZWxzZSBpZiAoaXNFbGxpZ2libGUoY2hpbGRyZW4sIGluZGV4KSkge1xuXHRcdFx0XHRub2RlID0gY2hpbGRyZW5baW5kZXhdO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGlmIChub3JlY3Vyc2UtLSA8IDApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3JlY3Vyc2UnKTtcblx0XHRcdFx0cmV0dXJuIGdldEZpcnN0RWxsaWdpYmxlKGNoaWxkcmVuKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG5vZGU7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRQcmV2IChjaGlsZHJlbiwgaW5kZXgpIHtcblx0XHR2YXJcblx0XHRcdG5vcmVjdXJzZSA9IGNoaWxkcmVuLmxlbmd0aCArIDIsXG5cdFx0XHRub2RlID0gY2hpbGRyZW5baW5kZXhdO1xuXHRcdHdoaWxlIChub2RlKSB7XG5cdFx0XHRpbmRleC0tO1xuXHRcdFx0aWYgKGluZGV4IDwgMCkge1xuXHRcdFx0XHRpbmRleCA9IGNoaWxkcmVuLmxlbmd0aDtcblx0XHRcdH0gZWxzZSBpZiAoaXNFbGxpZ2libGUoY2hpbGRyZW4sIGluZGV4KSkge1xuXHRcdFx0XHRub2RlID0gY2hpbGRyZW5baW5kZXhdO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdH1cblx0XHRcdGlmIChub3JlY3Vyc2UtLSA8IDApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ3JlY3Vyc2UnKTtcblx0XHRcdFx0cmV0dXJuIGdldExhc3RFbGxpZ2libGUoY2hpbGRyZW4pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gbm9kZTtcblx0fVxuXG5cdGZ1bmN0aW9uIGlzVmlzaWJsZSAobm9kZSkge1xuXHRcdHJldHVybiBub2RlLnN0eWxlLmRpc3BsYXkgIT09ICdub25lJyAmJiBub2RlLm9mZnNldEhlaWdodCAmJiBub2RlLm9mZnNldFdpZHRoO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0Rmlyc3RFbGxpZ2libGUgKGNoaWxkcmVuKSB7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGlzRWxsaWdpYmxlKGNoaWxkcmVuLCBpKSkge1xuXHRcdFx0XHRyZXR1cm4gY2hpbGRyZW5baV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0TGFzdEVsbGlnaWJsZSAoY2hpbGRyZW4pIHtcblx0XHRmb3IgKHZhciBpID0gY2hpbGRyZW4ubGVuZ3RoIC0gMTsgaSA+PSAwIDsgaS0tKSB7XG5cdFx0XHRpZiAoaXNFbGxpZ2libGUoY2hpbGRyZW4sIGkpKSB7XG5cdFx0XHRcdHJldHVybiBjaGlsZHJlbltpXTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRmdW5jdGlvbiBpc0VsbGlnaWJsZSAoY2hpbGRyZW4sIGluZGV4KSB7XG5cdFx0cmV0dXJuIGNoaWxkcmVuW2luZGV4XSAmJiAhY2hpbGRyZW5baW5kZXhdLnBhcmVudE5vZGUuZGlzYWJsZWQgJiYgaXNWaXNpYmxlKGNoaWxkcmVuW2luZGV4XSk7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXROb2RlIChjaGlsZHJlbiwgaGlnaGxpZ2h0ZWQsIGRpcikge1xuXHRcdHZhciBpbmRleCA9IDA7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGNoaWxkcmVuW2ldID09PSBoaWdobGlnaHRlZCkge1xuXHRcdFx0XHRpbmRleCA9IGk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZiAoZGlyID09PSAnZG93bicpIHtcblx0XHRcdHJldHVybiBnZXROZXh0KGNoaWxkcmVuLCBpbmRleCk7XG5cdFx0fSBlbHNlIGlmIChkaXIgPT09ICd1cCcpIHtcblx0XHRcdHJldHVybiBnZXRQcmV2KGNoaWxkcmVuLCBpbmRleCk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0Q2VsbCAoY2hpbGRyZW4sIGhpZ2hsaWdodGVkLCBkaXIpIHtcblx0XHR2YXJcblx0XHRcdGNlbGxJbmRleCA9IGdldEluZGV4KGhpZ2hsaWdodGVkKSxcblx0XHRcdHJvdyA9IGhpZ2hsaWdodGVkLnBhcmVudE5vZGUsXG5cdFx0XHRyb3dJbmRleCA9IGdldEluZGV4KHJvdyksXG5cdFx0XHRyb3dBbW91bnQgPSByb3cucGFyZW50Tm9kZS5yb3dzLmxlbmd0aDtcblxuXHRcdGlmIChkaXIgPT09ICdkb3duJykge1xuXHRcdFx0aWYgKHJvd0luZGV4ICsgMSA8IHJvd0Ftb3VudCkge1xuXHRcdFx0XHRyZXR1cm4gcm93LnBhcmVudE5vZGUucm93c1tyb3dJbmRleCArIDFdLmNlbGxzW2NlbGxJbmRleF07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcm93LnBhcmVudE5vZGUucm93c1swXS5jZWxsc1tjZWxsSW5kZXhdO1xuXHRcdH0gZWxzZSBpZiAoZGlyID09PSAndXAnKSB7XG5cdFx0XHRpZiAocm93SW5kZXggPiAwKSB7XG5cdFx0XHRcdHJldHVybiByb3cucGFyZW50Tm9kZS5yb3dzW3Jvd0luZGV4IC0gMV0uY2VsbHNbY2VsbEluZGV4XTtcblx0XHRcdH1cblx0XHRcdHJldHVybiByb3cucGFyZW50Tm9kZS5yb3dzW3Jvd0Ftb3VudCAtIDFdLmNlbGxzW2NlbGxJbmRleF07XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0SW5kZXggKGVsKSB7XG5cdFx0dmFyIGksIHAgPSBlbC5wYXJlbnROb2RlO1xuXHRcdGZvciAoaSA9IDA7IGkgPCBwLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAocC5jaGlsZHJlbltpXSA9PT0gZWwpIHtcblx0XHRcdFx0cmV0dXJuIGk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2VhcmNoSHRtbENvbnRlbnQgKGNoaWxkcmVuLCBzdHIpIHtcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAoY2hpbGRyZW5baV0uaW5uZXJIVE1MLmluZGV4T2Yoc3RyKSA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gY2hpbGRyZW5baV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBudWxsO1xuXHR9XG5cblx0ZnVuY3Rpb24gZmluZFNoaWZ0Tm9kZXMgKGNoaWxkcmVuLCBzZWxlY3RlZCwgbm9kZSkge1xuXHRcdHZhciBpLCBhLCBiLCBjLCBsYXN0Tm9kZSA9IHNlbGVjdGVkW3NlbGVjdGVkLmxlbmd0aCAtIDFdLCBuZXdJbmRleCwgbGFzdEluZGV4LCBzZWxlY3Rpb24gPSBbXTtcblx0XHRzZWxlY3RlZC5mb3JFYWNoKGZ1bmN0aW9uIChzZWwpIHtcblx0XHRcdHNlbC5yZW1vdmVBdHRyaWJ1dGUoJ3NlbGVjdGVkJyk7XG5cdFx0fSk7XG5cdFx0Zm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRjID0gY2hpbGRyZW5baV07XG5cdFx0XHRpZiAoYyA9PT0gbm9kZSkge1xuXHRcdFx0XHRuZXdJbmRleCA9IGk7XG5cdFx0XHR9IGVsc2UgaWYgKGMgPT09IGxhc3ROb2RlKSB7XG5cdFx0XHRcdGxhc3RJbmRleCA9IGk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGlmIChuZXdJbmRleCA8IGxhc3RJbmRleCkge1xuXHRcdFx0YSA9IG5ld0luZGV4O1xuXHRcdFx0YiA9IGxhc3RJbmRleDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YiA9IG5ld0luZGV4O1xuXHRcdFx0YSA9IGxhc3RJbmRleDtcblx0XHR9XG5cblx0XHR3aGlsZSAoYSA8PSBiKSB7XG5cdFx0XHRjaGlsZHJlblthXS5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJycpO1xuXHRcdFx0c2VsZWN0aW9uLnB1c2goY2hpbGRyZW5bYV0pO1xuXHRcdFx0YSsrO1xuXHRcdH1cblx0XHRyZXR1cm4gc2VsZWN0aW9uO1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkUm9sZXMgKG5vZGUpIHtcblx0XHQvLyBodHRwczovL3d3dy53My5vcmcvVFIvd2FpLWFyaWEvcm9sZXMjbGlzdGJveFxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuXHRcdFx0bm9kZS5jaGlsZHJlbltpXS5zZXRBdHRyaWJ1dGUoJ3JvbGUnLCAnbGlzdGl0ZW0nKTtcblx0XHR9XG5cdFx0bm9kZS5zZXRBdHRyaWJ1dGUoJ3JvbGUnLCAnbGlzdGJveCcpO1xuXHR9XG5cblx0ZnVuY3Rpb24gZnJvbUFycmF5ICh0aGluZykge1xuXHRcdHJldHVybiBBcnJheS5pc0FycmF5KHRoaW5nKSA/IHRoaW5nWzBdIDogdGhpbmc7XG5cdH1cblxuXHRyZXR1cm4ga2V5cztcblxufSkpO1xuIiwiY29uc3QgZG9tID0gcmVxdWlyZSgnQGNsdWJhamF4L2RvbScpO1xuY29uc3Qgb24gPSByZXF1aXJlKCdAY2x1YmFqYXgvb24nKTtcbmNvbnN0IFBvcHVwTGlzdCA9IHJlcXVpcmUoJy4vcG9wdXAtbGlzdCcpO1xuXG5jb25zdCBERUZBVUxUX1BMQUNFSE9MREVSID0gJ1NlbGVjdCBPbmUuLi4nO1xuXG5jbGFzcyBEcm9wRG93biBleHRlbmRzIFBvcHVwTGlzdCB7XG5cblx0Y29uc3RydWN0b3IgKCkge1xuXHRcdHN1cGVyKCk7XG5cdH1cblxuXHRkb21SZWFkeSAoKSB7XG5cdFx0dGhpcy5zZXRBdHRyaWJ1dGUoJ3JvbGUnLCAnc2VsZWN0Jyk7XG5cdFx0Ly8gaW1wb3J0YW50IHRoYXQgdGhlIGNvbnRhaW5lciBoYXMgZm9jdXMsIGJlY2F1c2Ugbm90aGluZyBjYW4ndCBsb3NlIGZvY3VzXG5cdFx0Ly8gd2hpbGUgc2VsZWN0aW5nLCBvciB0aGUgYmx1ciB3aWxsIHRyaWdnZXIgYSBjaGFuZ2UgZXZlbnQgaW4gUmVhY3Rcblx0XHR0aGlzLnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuXG5cblx0XHR0aGlzLmJ1dHRvbiA9IGRvbSgnZGl2Jywge2NsYXNzOidkcm9wLWJ0bid9LCB0aGlzKTtcblx0XHRzdXBlci5kb21SZWFkeSgpO1xuXG5cdFx0aWYodGhpcy5sYWJlbCl7XG5cdFx0XHR0aGlzLmxhYmVsTm9kZSA9IGRvbSgnbGFiZWwnLCB7aHRtbDogdGhpcy5sYWJlbH0pO1xuXHRcdFx0dGhpcy5pbnNlcnRCZWZvcmUodGhpcy5sYWJlbE5vZGUsIHRoaXMuYnV0dG9uKTtcblx0XHR9XG5cblx0fVxuXG5cdHVwZGF0ZSAoKSB7XG5cdFx0aWYodGhpcy5idXR0b24pIHtcblx0XHRcdHRoaXMuYnV0dG9uLmlubmVySFRNTCA9IHRoaXMuc2VsZWN0ZWROb2RlID8gdGhpcy5zZWxlY3RlZE5vZGUuaW5uZXJIVE1MIDogdGhpcy5wbGFjZWhvbGRlciB8fCBERUZBVUxUX1BMQUNFSE9MREVSO1xuXHRcdFx0ZG9tLmNsYXNzTGlzdC50b2dnbGUodGhpcy5idXR0b24sICdoYXMtcGxhY2Vob2xkZXInLCAhdGhpcy5zZWxlY3RlZE5vZGUpO1xuXHRcdH1cblx0fVxuXG5cdGRlc3Ryb3kgKCkge1xuXHRcdHN1cGVyLmRlc3Ryb3koKTtcblx0fVxufVxuXG5jdXN0b21FbGVtZW50cy5kZWZpbmUoJ2Ryb3AtZG93bicsIERyb3BEb3duKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEcm9wRG93bjsiLCJjb25zdCBCYXNlQ29tcG9uZW50ID0gcmVxdWlyZSgnQGNsdWJhamF4L2Jhc2UtY29tcG9uZW50Jyk7XG5jb25zdCBkb20gPSByZXF1aXJlKCdAY2x1YmFqYXgvZG9tJyk7XG5jb25zdCBvbiA9IHJlcXVpcmUoJ0BjbHViYWpheC9vbicpO1xuY29uc3Qga2V5cyA9IHJlcXVpcmUoJ0BjbHViYWpheC9rZXktbmF2Jyk7XG5cbmNvbnN0IHByb3BzID0gWydwbGFjZWhvbGRlcicsICdsYWJlbCcsICdsaW1pdCcsICduYW1lJ107XG5jb25zdCBib29scyA9IFsnZGlzYWJsZWQnLCAnb3Blbi13aGVuLWJsYW5rJywgJ2FsbG93LW5ldycsICdyZXF1aXJlZCcsICdjYXNlLXNlbnNpdGl2ZScsICdhdXRvZm9jdXMnXTtcblxuLy8gVE9ETzogQVJJQSwgcmVzZXQgKHcgcGxhY2Vob2xkZXIpXG5cbmNsYXNzIFBvcHVwTGlzdCBleHRlbmRzIEJhc2VDb21wb25lbnQge1xuXG5cdGNvbnN0cnVjdG9yICgpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMub3BlbiA9IGZhbHNlO1xuXHRcdHRoaXMuc2VsZk9wZW4gPSB0cnVlO1xuXHRcdHRoaXMuZW1pdEl0ZW0gPSBmYWxzZTtcblx0XHR0aGlzLnRvZ2dsZSA9IHRoaXMudG9nZ2xlLmJpbmQodGhpcyk7XG5cdH1cblxuXHRzdGF0aWMgZ2V0IG9ic2VydmVkQXR0cmlidXRlcyAoKSB7XG5cdFx0cmV0dXJuIFsuLi5wcm9wcywgLi4uYm9vbHMsICd2YWx1ZSddO1xuXHR9XG5cblx0Z2V0IHByb3BzICgpIHtcblx0XHRyZXR1cm4gcHJvcHM7XG5cdH1cblxuXHRnZXQgYm9vbHMgKCkge1xuXHRcdHJldHVybiBib29scztcblx0fVxuXG5cdGF0dHJpYnV0ZUNoYW5nZWQgKHByb3AsIHZhbHVlKSB7XG5cdFx0aWYgKHByb3AgPT09ICd2YWx1ZScpIHtcblx0XHRcdHRoaXMudmFsdWUgPSB2YWx1ZTtcblx0XHR9XG5cdH1cblxuXHRzZXQgdmFsdWUgKHZhbHVlKSB7XG5cdFx0dGhpcy5fX3ZhbHVlID0gdmFsdWU7XG5cdFx0b25Eb21SZWFkeSh0aGlzLCAoKSA9PiB7XG5cdFx0XHR0aGlzLnNlbGVjdCh2YWx1ZSk7XG5cdFx0fSk7XG5cdH1cblxuXHRnZXQgdmFsdWUgKCkge1xuXHRcdHJldHVybiB0aGlzLl9fdmFsdWUgIT09IG51bGwgPyB0aGlzLl9fdmFsdWUgOiBkb20ubm9ybWFsaXplKHRoaXMuZ2V0QXR0cmlidXRlKCd2YWx1ZScpKTtcblx0fVxuXG5cdHNldCBkYXRhICh2YWx1ZSkge1xuXHRcdGlmICghdmFsdWUubGVuZ3RoKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGlmICghQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcblx0XHRcdHZhbHVlID0gW3ZhbHVlXTtcblx0XHR9XG5cdFx0aWYgKHR5cGVvZiB2YWx1ZVswXSAhPT0gJ29iamVjdCcpIHtcblx0XHRcdHZhbHVlID0gdmFsdWUubWFwKGl0ZW0gPT4gKHsgbGFiZWw6IGl0ZW0sIHZhbHVlOiBpdGVtIH0pKTtcblx0XHR9XG5cdFx0dGhpcy5fX3ZhbHVlID0gbnVsbDtcblx0XHR0aGlzLnNlbGVjdGVkTm9kZSA9IG51bGw7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0XHR0aGlzLml0ZW1zID0gdmFsdWU7XG5cdFx0aWYgKHRoaXMuRE9NU1RBVEUgPT09ICdkb21yZWFkeScpIHtcblx0XHRcdHRoaXMuc2V0SXRlbXNGcm9tRGF0YSgpO1xuXHRcdH1cblx0fVxuXG5cdGdldCBkYXRhICgpIHtcblx0XHRyZXR1cm4gdGhpcy5pdGVtcztcblx0fVxuXG5cdG9uRGlzYWJsZWQgKHZhbHVlKSB7XG5cdFx0aWYgKHRoaXMuYnV0dG9uKSB7XG5cdFx0XHR0aGlzLmJ1dHRvbi5kaXNhYmxlZCA9ICEhdmFsdWU7XG5cdFx0fVxuXHRcdGlmICh2YWx1ZSkge1xuXHRcdFx0dGhpcy5yZW1vdmVBdHRyaWJ1dGUoJ3RhYmluZGV4Jyk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2V0QXR0cmlidXRlKCd0YWJpbmRleCcsICcwJyk7XG5cdFx0fVxuXHR9XG5cblx0b25QbGFjZWhvbGRlciAodmFsdWUpIHtcblx0XHRpZiAoIXRoaXMudmFsdWUpIHtcblx0XHRcdHRoaXMuYnV0dG9uLmlubmVySFRNTCA9IHZhbHVlO1xuXHRcdH1cblx0fVxuXG5cdGRvbVJlYWR5ICgpIHtcblx0XHRsZXQgdGVzdElkO1xuXHRcdGxldCBwb3N0VmFsdWU7XG5cdFx0bGV0IGhhc0NoaWxkcmVuID0gZmFsc2U7XG5cdFx0Y29uc3QgcGFyZW50VmFsdWUgPSB0aGlzLnZhbHVlO1xuXHRcdGlmICh0aGlzLmJ1dHRvbikge1xuXHRcdFx0bGV0IHRlc3RJZCA9IHRoaXMuYnV0dG9uLmdldEF0dHJpYnV0ZSgnZGF0YS10ZXN0LWlkJyk7XG5cdFx0XHR0aGlzLnJlbW92ZUNoaWxkKHRoaXMuYnV0dG9uKTtcblx0XHR9XG5cdFx0Ly8gVE9ETzogaW4gUmVhY3QsIHRoZSBVTCBtYXkgYmUgc2V0XG5cdFx0dGhpcy5wb3B1cCA9IGRvbSgndWwnLCB7IH0pO1xuXHRcdHdoaWxlICh0aGlzLmNoaWxkcmVuLmxlbmd0aCkge1xuXHRcdFx0aGFzQ2hpbGRyZW4gPSB0cnVlO1xuXHRcdFx0aWYgKHRoaXMuY2hpbGRyZW5bMF0ubG9jYWxOYW1lICE9PSAnbGknKSB7XG5cdFx0XHRcdGNvbnNvbGUud2FybihcImRyb3AtZG93biBjaGlsZHJlbiBzaG91bGQgdXNlIExJJ3NcIik7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5jaGlsZHJlblswXS5oYXNBdHRyaWJ1dGUoJ3NlbGVjdGVkJykgfHwgdGhpcy5jaGlsZHJlblswXS5nZXRBdHRyaWJ1dGUoJ3ZhbHVlJykgPT09IHBhcmVudFZhbHVlKSB7XG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWROb2RlID0gdGhpcy5jaGlsZHJlblswXTtcblx0XHRcdFx0dGhpcy5vcmdTZWxlY3RlZCA9IHRoaXMuY2hpbGRyZW5bMF07XG5cdFx0XHRcdGlmICghcGFyZW50VmFsdWUpIHtcblx0XHRcdFx0XHRwb3N0VmFsdWUgPSB0aGlzLmNoaWxkcmVuWzBdLmdldEF0dHJpYnV0ZSgndmFsdWUnKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0dGhpcy5wb3B1cC5hcHBlbmRDaGlsZCh0aGlzLmNoaWxkcmVuWzBdKTtcblx0XHR9XG5cdFx0aWYgKCFoYXNDaGlsZHJlbikge1xuXHRcdFx0dGhpcy5zZXRJdGVtc0Zyb21EYXRhKHRydWUpO1xuXHRcdH1cblx0XHR0aGlzLnVwZGF0ZSgpO1xuXHRcdGlmICh0aGlzLmJ1dHRvbikge1xuXHRcdFx0dGhpcy5hcHBlbmRDaGlsZCh0aGlzLmJ1dHRvbik7XG5cdFx0fVxuXHRcdHRoaXMuYXBwZW5kQ2hpbGQodGhpcy5wb3B1cCk7XG5cdFx0dGhpcy5jb25uZWN0KCk7XG5cblx0XHR0aGlzLmRpc2FibGVkID0gdGhpcy5oYXNBdHRyaWJ1dGUoJ2Rpc2FibGVkJyk7XG5cblx0XHRpZiAocG9zdFZhbHVlIHx8IHBhcmVudFZhbHVlKSB7XG5cdFx0XHR0aGlzLnNlbGVjdChwb3N0VmFsdWUgfHwgcGFyZW50VmFsdWUpO1xuXHRcdH1cblx0fVxuXG5cdHNldEl0ZW1zRnJvbURhdGEgKHNpbGVudCkge1xuXHRcdGlmICghdGhpcy5pdGVtcykge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRsZXQgcG9zdFZhbHVlO1xuXHRcdGNvbnN0IHBhcmVudFZhbHVlID0gdGhpcy52YWx1ZTtcblx0XHRjb25zdCBwb3B1cCA9IHRoaXMucG9wdXA7XG5cdFx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdFx0bGV0IG5vZGU7XG5cdFx0cG9wdXAuaW5uZXJIVE1MID0gJyc7XG5cdFx0dGhpcy5pdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG5cdFx0XHRpZiAoaXRlbS52YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRcdG5vZGUgPSBkb20oJ2RpdicsIHsgY2xhc3M6ICdsYWJlbCcsIGh0bWw6IGl0ZW0ubGFiZWwgfSwgcG9wdXApO1xuXHRcdFx0XHRub2RlLnVuc2VsZWN0YWJsZSA9IHRydWU7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGNvbnN0IG9wdGlvbnMgPSB7IGh0bWw6IGl0ZW0ubGFiZWwsIHZhbHVlOiBpdGVtLnZhbHVlIH07XG5cdFx0XHRjb25zdCBpc1NlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCB8fCBpdGVtLnZhbHVlID09PSBwYXJlbnRWYWx1ZTtcblx0XHRcdGlmIChpc1NlbGVjdGVkKSB7XG5cdFx0XHRcdG9wdGlvbnMuc2VsZWN0ZWQgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKGl0ZW0uY2xhc3MpIHtcblx0XHRcdFx0b3B0aW9ucy5jbGFzcyA9IGl0ZW0uY2xhc3M7XG5cdFx0XHR9XG5cdFx0XHRub2RlID0gZG9tKCdsaScsIG9wdGlvbnMsIHBvcHVwKTtcblx0XHRcdGlmIChpc1NlbGVjdGVkKSB7XG5cdFx0XHRcdGlmIChzZWxmLnNlbGVjdGVkTm9kZSkge1xuXHRcdFx0XHRcdHNlbGYuc2VsZWN0ZWROb2RlLnJlbW92ZUF0dHJpYnV0ZSgnc2VsZWN0ZWQnKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLnNlbGVjdGVkTm9kZSA9IG5vZGU7XG5cdFx0XHRcdHNlbGYub3JnU2VsZWN0ZWQgPSBub2RlO1xuXHRcdFx0XHRpZiAoIXBhcmVudFZhbHVlKSB7XG5cdFx0XHRcdFx0c2VsZi5fX3ZhbHVlID0gaXRlbS52YWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cdFx0dGhpcy5jb25uZWN0KCk7XG5cdH1cblxuXHRnZXRJdGVtICh2YWx1ZSkge1xuXHRcdGlmICh0aGlzLml0ZW1zKSB7XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuaXRlbXMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0aWYgKHRoaXMuaXRlbXNbaV0udmFsdWUgPT09IHZhbHVlIHx8IHRoaXMuaXRlbXNbaV0ubGFiZWwgPT09IHZhbHVlKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRoaXMuaXRlbXNbaV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG51bGw7XG5cdH1cblxuXHRzZWxlY3QgKHZhbHVlLCBzaWxlbnQpIHtcblx0XHRpZiAodGhpcy5zZWxlY3RlZE5vZGUpIHtcblx0XHRcdHRoaXMuc2VsZWN0ZWROb2RlLnJlbW92ZUF0dHJpYnV0ZSgnc2VsZWN0ZWQnKTtcblx0XHR9XG5cdFx0dGhpcy5zZWxlY3RlZE5vZGUgPSBkb20ucXVlcnkodGhpcy5wb3B1cCwgYFt2YWx1ZT1cIiR7dmFsdWV9XCJdYCk7XG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWROb2RlKSB7XG5cdFx0XHR0aGlzLnNlbGVjdGVkTm9kZS5zZXRBdHRyaWJ1dGUoJ3NlbGVjdGVkJywgJ3RydWUnKTtcblx0XHR9XG5cdFx0dGhpcy5sYXN0VmFsdWUgPSB0aGlzLl9fdmFsdWU7XG5cdFx0dGhpcy5fX3ZhbHVlID0gdmFsdWU7XG5cdFx0dGhpcy51cGRhdGUoKTtcblx0XHRpZiAoIXNpbGVudCkge1xuXHRcdFx0dGhpcy5lbWl0RXZlbnQodmFsdWUpO1xuXHRcdH1cblx0fVxuXG5cdHVuc2VsZWN0ICgpIHtcblx0XHRpZiAodGhpcy5zZWxlY3RlZE5vZGUpIHtcblx0XHRcdHRoaXMuc2VsZWN0ZWROb2RlLnJlbW92ZUF0dHJpYnV0ZSgnc2VsZWN0ZWQnKTtcblx0XHR9XG5cdH1cblxuXHR1cGRhdGVBZnRlckxpc3RDaGFuZ2UgKCkge1xuXHRcdC8vIFRPRE86IGRvYyB0aGlzXG5cdFx0Y29uc3QgcGFyZW50VmFsdWUgPSBnZXRWYWx1ZSh0aGlzKTtcblx0XHR0aGlzLnNlbGVjdChwYXJlbnRWYWx1ZSwgdHJ1ZSk7XG5cdFx0dGhpcy5oaWRlKCk7XG5cdH1cblxuXHRlbWl0RXZlbnQgKCkge1xuXHRcdGxldCB2YWx1ZTtcblx0XHRpZiAodGhpcy5lbWl0SXRlbSkge1xuXHRcdFx0dmFsdWUgPSB0aGlzLmdldEl0ZW0odGhpcy52YWx1ZSk7XG5cdFx0XHRpZiAodmFsdWUgPT09IG51bGwgJiYgdGhpc1snYWxsb3ctbmV3J10pIHtcblx0XHRcdFx0dmFsdWUgPSB7XG5cdFx0XHRcdFx0bGFiZWw6IHRoaXMudmFsdWUsXG5cdFx0XHRcdFx0dmFsdWU6IHRoaXMudmFsdWUsXG5cdFx0XHRcdFx0aXNOZXc6IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YWx1ZSA9IHRoaXMudmFsdWU7XG5cdFx0fVxuXHRcdC8vY29uc3QgdmFsdWUgPSB0aGlzLmVtaXRJdGVtID8gdGhpcy5nZXRJdGVtKHRoaXMudmFsdWUpIDogdGhpcy52YWx1ZTtcblx0XHR0aGlzLmVtaXQoJ2NoYW5nZScsIHsgdmFsdWUgfSwgdHJ1ZSk7XG5cdH1cblxuXHRpc1ZhbGlkICgpIHtcblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxuXG5cdGlzVmFsaWRTZWxlY3Rpb24gKCkge1xuXHRcdC8vIG92ZXJyaWRlIG1lXG5cdFx0cmV0dXJuIHRydWU7XG5cdH1cblxuXHR1cGRhdGUgKCkge1xuXHRcdC8vIG92ZXJyaWRlIG1lXG5cdH1cblxuXHRyZXNldCAoKSB7XG5cdFx0Y29uc3QgdmFsdWUgPSB0aGlzLm9yZ1NlbGVjdGVkID8gdGhpcy5vcmdTZWxlY3RlZC5kb20ubm9ybWFsaXplKCd2YWx1ZScpIDogbnVsbDtcblx0XHR0aGlzLnNlbGVjdCh2YWx1ZSk7XG5cdH1cblxuXHR1bmRvICgpIHtcblx0XHRpZiAodGhpcy5sYXN0VmFsdWUgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5zZWxlY3QodGhpcy5sYXN0VmFsdWUsIHRydWUpO1xuXHRcdH1cblx0fVxuXG5cdHRvZ2dsZSAoKSB7XG5cdFx0aWYgKHRoaXMub3Blbikge1xuXHRcdFx0dGhpcy5oaWRlKCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2hvdygpO1xuXHRcdH1cblx0fVxuXG5cdHNob3cgKCkge1xuXHRcdGlmICh0aGlzLmRpc2FibGVkKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGRvbS5zdHlsZSh0aGlzLnBvcHVwLCAnbWluLXdpZHRoJywgZG9tLmJveCh0aGlzKS53KTtcblx0XHR0aGlzLm9wZW4gPSB0cnVlO1xuXHRcdHRoaXMuY2xhc3NMaXN0LmFkZCgnc2hvdycpO1xuXHRcdHBvc2l0aW9uLmNhbGwodGhpcyk7XG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHR0aGlzLmNvbnRyb2xsZXIucmVzdW1lKCk7XG5cdFx0XHR0aGlzLndpbkhhbmRsZS5yZXN1bWUoKTtcblx0XHRcdHRoaXMuZmlyZSgnb3BlbicpO1xuXHRcdH0sIDMwKTtcblx0fVxuXG5cdGhpZGUgKHRpbWVyID0gMCkge1xuXHRcdGlmICh3aW5kb3cua2VlcFBvcHVwc09wZW4pIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGlmICh0aGlzLm9wZW4pIHtcblx0XHRcdFx0dGhpcy5vcGVuID0gZmFsc2U7XG5cdFx0XHRcdHRoaXMuY2xhc3NMaXN0LnJlbW92ZSgnc2hvdycpO1xuXHRcdFx0XHR0aGlzLndpbkhhbmRsZS5wYXVzZSgpO1xuXHRcdFx0XHR0aGlzLmNvbnRyb2xsZXIucGF1c2UoKTtcblx0XHRcdFx0Y2xlYXJIaWdobGlnaHRzKHRoaXMpO1xuXHRcdFx0XHR0aGlzLmZpcmUoJ2Nsb3NlJyk7XG5cdFx0XHR9XG5cdFx0fSwgdGltZXIpO1xuXHR9XG5cblx0Y29ubmVjdCAoKSB7XG5cdFx0aWYgKHRoaXMuYnV0dG9uICYmIHRoaXMucG9wdXAuY2hpbGRyZW4ubGVuZ3RoKSB7XG5cdFx0XHRpZiAodGhpcy5zZWxmT3Blbikge1xuXHRcdFx0XHR0aGlzLm9uKHRoaXMuYnV0dG9uLCAnY2xpY2snLCAoKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy50b2dnbGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdHRoaXMub24odGhpcywgJ2tleWRvd24nLCAoZSkgPT4ge1xuXHRcdFx0XHRcdGlmICghdGhpcy5vcGVuICYmIGUua2V5ID09PSAnRW50ZXInKSB7XG5cdFx0XHRcdFx0XHQvL3RoaXMuc2hvdygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLndpbkhhbmRsZSA9IG9uLm1ha2VNdWx0aUhhbmRsZShbXG5cdFx0XHRcdG9uKHdpbmRvdywgJ21vdXNldXAnLCAoZSkgPT4ge1xuXHRcdFx0XHRcdGlmIChvbi5jbG9zZXN0KGUudGFyZ2V0LCB0aGlzLmxvY2FsTmFtZSwgZG9jdW1lbnQuYm9keSkgPT09IHRoaXMpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR0aGlzLmhpZGUoKTtcblx0XHRcdFx0fSksXG5cdFx0XHRcdG9uKHdpbmRvdywgJ2tleXVwJywgKGUpID0+IHtcblx0XHRcdFx0XHRpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSB7XG5cdFx0XHRcdFx0XHR0aGlzLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRvbih0aGlzLCAnYmx1cicsICgpID0+IHtcblx0XHRcdFx0XHR0aGlzLmhpZGUoKTtcblx0XHRcdFx0fSlcblx0XHRcdF0pO1xuXHRcdFx0Y29uc3QgaXNJbnB1dCA9IHRoaXMuYnV0dG9uLmxvY2FsTmFtZSA9PT0gJ2lucHV0Jztcblx0XHRcdHRoaXMuY29udHJvbGxlciA9IGtleXModGhpcy5wb3B1cCwgeyByb2xlczogdHJ1ZSwgaW5wdXRNb2RlOiBpc0lucHV0LCBub0RlZmF1bHQ6IGlzSW5wdXQgfSk7XG5cdFx0XHR0aGlzLmNvbnRyb2xsZXIucGF1c2UoKTtcblxuXG5cdFx0XHQvLyBsaXN0ZW4gaGVyZSBBRlRFUiBpbml0aWFsaXppbmcga2V5cywgdG8gcHJldmVudCBpbml0aWFsIGV2ZW50XG5cdFx0XHR0aGlzLm9uKHRoaXMucG9wdXAsICdrZXktc2VsZWN0JywgKGUpID0+IHtcblx0XHRcdFx0Y29uc3Qgbm9kZSA9IGUuZGV0YWlsLnZhbHVlO1xuXHRcdFx0XHRpZiAobm9kZSkge1xuXHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gZ2V0VmFsdWUobm9kZSk7XG5cdFx0XHRcdFx0dGhpcy5zZWxlY3QodmFsdWUpO1xuXHRcdFx0XHRcdHRoaXMuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5jb25uZWN0ID0gZnVuY3Rpb24gKCkge307XG5cdFx0fVxuXHR9XG5cblx0ZGVzdHJveSAoKSB7XG5cdFx0c3VwZXIuZGVzdHJveSgpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHBvc2l0aW9uICgpIHtcblx0dGhpcy5wb3B1cC5jbGFzc0xpc3QucmVtb3ZlKCdyaWdodC1hbGlnbmVkJyk7XG5cdHRoaXMucG9wdXAuY2xhc3NMaXN0LnJlbW92ZSgndG9wLWFsaWduZWQnKTtcblx0ZG9tLnN0eWxlKHRoaXMucG9wdXAsICdoZWlnaHQnLCAnJyk7XG5cdGNvbnN0IHdpbiA9IGRvbS5ib3god2luZG93KTtcblx0Y29uc3QgcG9wID0gZG9tLmJveCh0aGlzLnBvcHVwKTtcblx0Y29uc3QgYnRuID0gZG9tLmJveCh0aGlzLmJ1dHRvbik7XG5cblx0Y29uc3QgdG9wU3BhY2UgPSBidG4udG9wO1xuXHRjb25zdCBib3RTcGFjZSA9IHdpbi5oIC0gYnRuLnRvcCArIGJ0bi5oO1xuXG5cdGlmIChwb3AueCArIHBvcC53ICsgMTAgPiB3aW4udykge1xuXHRcdHRoaXMucG9wdXAuY2xhc3NMaXN0LmFkZCgncmlnaHQtYWxpZ25lZCcpO1xuXHR9IGVsc2Uge1xuXHRcdHRoaXMucG9wdXAuY2xhc3NMaXN0LnJlbW92ZSgncmlnaHQtYWxpZ25lZCcpO1xuXHR9XG5cblx0aWYgKHBvcC5oID4gYm90U3BhY2UgJiYgcG9wLmggPCB0b3BTcGFjZSkge1xuXHRcdHRoaXMucG9wdXAuY2xhc3NMaXN0LmFkZCgndG9wLWFsaWduZWQnKTtcblxuXHR9ZWxzZSBpZiAocG9wLmggPCBib3RTcGFjZSl7XG5cdFx0dGhpcy5wb3B1cC5jbGFzc0xpc3QucmVtb3ZlKCd0b3AtYWxpZ25lZCcpO1xuXG5cdH0gZWxzZSBpZiAoYm90U3BhY2UgPiB0b3BTcGFjZSkge1xuXHRcdC8vIGJvdHRvbSwgYW5kIHNjcm9sbFxuXHRcdHRoaXMucG9wdXAuY2xhc3NMaXN0LnJlbW92ZSgndG9wLWFsaWduZWQnKTtcblx0XHRkb20uc3R5bGUodGhpcy5wb3B1cCwgJ2hlaWdodCcsIGJvdFNwYWNlIC0gMTAwKTtcblx0fSBlbHNlIHtcblx0XHQvLyB0b3AgYW5kIHNjcm9sbFxuXHRcdHRoaXMucG9wdXAuY2xhc3NMaXN0LmFkZCgndG9wLWFsaWduZWQnKTtcblx0XHRkb20uc3R5bGUodGhpcy5wb3B1cCwgJ2hlaWdodCcsIHRvcFNwYWNlIC0gMjApO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGNsZWFySGlnaGxpZ2h0cyAobm9kZSkge1xuXHRkb20ucXVlcnlBbGwobm9kZSwgJ2xpJykuZm9yRWFjaCgobGkpID0+IHtcblx0XHRsaS5yZW1vdmVBdHRyaWJ1dGUoJ2hpZ2hsaWdodGVkJyk7XG5cdH0pXG59XG5cbmZ1bmN0aW9uIGdldFZhbHVlIChub2RlKSB7XG5cdHJldHVybiBhdHRyKG5vZGUsICd2YWx1ZScsICdkZWZhdWx0VmFsdWUnKTtcbn1cblxuZnVuY3Rpb24gYXR0ciAoLi4uYXJncykge1xuXHRjb25zdCBub2RlID0gYXJnc1swXTtcblx0bGV0IHZhbHVlO1xuXHRsZXQgaTtcblx0Zm9yIChpID0gMTsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcblx0XHR2YWx1ZSA9IGRvbS5ub3JtYWxpemUobm9kZS5nZXRBdHRyaWJ1dGUoYXJnc1tpXSkpO1xuXHRcdGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gJycpIHtcblx0XHRcdHJldHVybiB2YWx1ZTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIG51bGw7XG59XG5cbmN1c3RvbUVsZW1lbnRzLmRlZmluZSgncG9wdXAtbGlzdCcsIFBvcHVwTGlzdCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUG9wdXBMaXN0OyIsIndpbmRvd1snbm8tbmF0aXZlLXNoaW0nXSA9IGZhbHNlO1xucmVxdWlyZSgnQGNsdWJhamF4L2N1c3RvbS1lbGVtZW50cy1wb2x5ZmlsbCcpO1xud2luZG93Lm9uID0gcmVxdWlyZSgnQGNsdWJhamF4L29uJyk7XG53aW5kb3cuZG9tID0gcmVxdWlyZSgnQGNsdWJhamF4L2RvbScpO1xucmVxdWlyZSgnLi4vLi4vc3JjL3BvcHVwLWxpc3QnKTtcbnJlcXVpcmUoJy4uLy4uL3NyYy9kcm9wLWRvd24nKTsiXX0=
