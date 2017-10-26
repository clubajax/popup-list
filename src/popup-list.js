const BaseComponent = require('@clubajax/base-component');
const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const keys = require('@clubajax/key-nav');

const props = ['placeholder', 'label', 'limit', 'name'];
const bools = ['disabled', 'open-when-blank', 'allow-new', 'required', 'case-sensitive', 'autofocus'];

// TODO: ARIA, reset (w placeholder)

class PopupList extends BaseComponent {

	constructor () {
		super();
		this.open = false;
		this.selfOpen = true;
		this.emitItem = false;
		this.toggle = this.toggle.bind(this);
	}

	static get observedAttributes () {
		return [...props, ...bools, 'value'];
	}

	get props () {
		return props;
	}

	get bools () {
		return bools;
	}

	attributeChanged (prop, value) {
		if (prop === 'value') {
			this.value = value;
		}
	}

	set value (value) {
		this.__value = value;
		onDomReady(this, () => {
			this.select(value);
		});
	}

	get value () {
		return this.__value !== null ? this.__value : dom.normalize(this.getAttribute('value'));
	}

	set data (value) {
		if (!value.length) {
			return;
		}
		if (!Array.isArray(value)) {
			value = [value];
		}
		if (typeof value[0] !== 'object') {
			value = value.map(item => ({ label: item, value: item }));
		}
		this.__value = null;
		this.selectedNode = null;
		this.update();
		this.items = value;
		if (this.DOMSTATE === 'domready') {
			this.setItemsFromData();
		}
	}

	get data () {
		return this.items;
	}

	onDisabled (value) {
		if (this.button) {
			this.button.disabled = !!value;
		}
		if (value) {
			this.removeAttribute('tabindex');
		} else {
			this.setAttribute('tabindex', '0');
		}
	}

	onPlaceholder (value) {
		if (!this.value) {
			this.button.innerHTML = value;
		}
	}

	domReady () {
		let testId;
		let postValue;
		let hasChildren = false;
		const parentValue = this.value;
		if (this.button) {
			let testId = this.button.getAttribute('data-test-id');
			this.removeChild(this.button);
		}
		// TODO: in React, the UL may be set
		this.popup = dom('ul', { });
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

	setItemsFromData (silent) {
		if (!this.items) {
			return;
		}
		let postValue;
		const parentValue = this.value;
		const popup = this.popup;
		const self = this;
		let node;
		popup.innerHTML = '';
		this.items.forEach(function (item) {
			if (item.value === undefined) {
				node = dom('div', { class: 'label', html: item.label }, popup);
				node.unselectable = true;
				return;
			}
			const options = { html: item.label, value: item.value };
			const isSelected = item.selected || item.value === parentValue;
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

	getItem (value) {
		if (this.items) {
			for (let i = 0; i < this.items.length; i++) {
				if (this.items[i].value === value || this.items[i].label === value) {
					return this.items[i];
				}
			}
		}
		return null;
	}

	select (value, silent) {
		if (this.selectedNode) {
			this.selectedNode.removeAttribute('selected');
		}
		this.selectedNode = dom.query(this.popup, `[value="${value}"]`);
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

	unselect () {
		if (this.selectedNode) {
			this.selectedNode.removeAttribute('selected');
		}
	}

	updateAfterListChange () {
		// TODO: doc this
		const parentValue = getValue(this);
		this.select(parentValue, true);
		this.hide();
	}

	emitEvent () {
		let value;
		if (this.emitItem) {
			value = this.getItem(this.value);
			if (value === null && this['allow-new']) {
				value = {
					label: this.value,
					value: this.value,
					isNew: true
				}
			}
		} else {
			value = this.value;
		}
		//const value = this.emitItem ? this.getItem(this.value) : this.value;
		this.emit('change', { value }, true);
	}

	isValid () {
		return true;
	}

	isValidSelection () {
		// override me
		return true;
	}

	update () {
		// override me
	}

	reset () {
		const value = this.orgSelected ? this.orgSelected.dom.normalize('value') : null;
		this.select(value);
	}

	undo () {
		if (this.lastValue !== undefined) {
			this.select(this.lastValue, true);
		}
	}

	toggle () {
		if (this.open) {
			this.hide();
		} else {
			this.show();
		}
	}

	show () {
		if (this.disabled) {
			return;
		}
		dom.style(this.popup, 'min-width', dom.box(this).w);
		this.open = true;
		this.classList.add('show');
		position.call(this);
		setTimeout(() => {
			this.controller.resume();
			this.winHandle.resume();
			this.fire('open');
		}, 30);
	}

	hide (timer = 0) {
		if (window.keepPopupsOpen) {
			return;
		}

		setTimeout(() => {
			if (this.open) {
				this.open = false;
				this.classList.remove('show');
				this.winHandle.pause();
				this.controller.pause();
				clearHighlights(this);
				this.fire('close');
			}
		}, timer);
	}

	connect () {
		if (this.button && this.popup.children.length) {
			if (this.selfOpen) {
				this.on(this.button, 'click', () => {
					this.toggle();
				});
				this.on(this, 'keydown', (e) => {
					if (!this.open && e.key === 'Enter') {
						//this.show();
					}
				});
			}
			this.winHandle = on.makeMultiHandle([
				on(window, 'mouseup', (e) => {
					if (on.closest(e.target, this.localName, document.body) === this) {
						return true;
					}
					this.hide();
				}),
				on(window, 'keyup', (e) => {
					if (e.key === 'Escape') {
						this.hide();
					}
				}),
				on(this, 'blur', () => {
					this.hide();
				})
			]);
			const isInput = this.button.localName === 'input';
			this.controller = keys(this.popup, { roles: true, inputMode: isInput, noDefault: isInput });
			this.controller.pause();


			// listen here AFTER initializing keys, to prevent initial event
			this.on(this.popup, 'key-select', (e) => {
				const node = e.detail.value;
				if (node) {
					const value = getValue(node);
					this.select(value);
					this.hide();
				}
			});

			this.connect = function () {};
		}
	}

	destroy () {
		super.destroy();
	}
}

function position () {
	this.popup.classList.remove('right-aligned');
	this.popup.classList.remove('top-aligned');
	dom.style(this.popup, 'height', '');
	const win = dom.box(window);
	const pop = dom.box(this.popup);
	const btn = dom.box(this.button);

	const topSpace = btn.top;
	const botSpace = win.h - btn.top + btn.h;

	if (pop.x + pop.w + 10 > win.w) {
		this.popup.classList.add('right-aligned');
	} else {
		this.popup.classList.remove('right-aligned');
	}

	if (pop.h > botSpace && pop.h < topSpace) {
		this.popup.classList.add('top-aligned');

	}else if (pop.h < botSpace){
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

function clearHighlights (node) {
	dom.queryAll(node, 'li').forEach((li) => {
		li.removeAttribute('highlighted');
	})
}

function getValue (node) {
	return attr(node, 'value', 'defaultValue');
}

function attr (...args) {
	const node = args[0];
	let value;
	let i;
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