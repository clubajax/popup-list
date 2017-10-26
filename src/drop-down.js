const dom = require('@clubajax/dom');
const on = require('@clubajax/on');
const PopupList = require('./popup-list');

const DEFAULT_PLACEHOLDER = 'Select One...';

class DropDown extends PopupList {

	constructor () {
		super();
	}

	domReady () {
		this.setAttribute('role', 'select');
		// important that the container has focus, because nothing can't lose focus
		// while selecting, or the blur will trigger a change event in React
		this.setAttribute('tabindex', '0');


		this.button = dom('div', {class:'drop-btn'}, this);
		super.domReady();

		if(this.label){
			this.labelNode = dom('label', {html: this.label});
			this.insertBefore(this.labelNode, this.button);
		}

	}

	update () {
		if(this.button) {
			this.button.innerHTML = this.selectedNode ? this.selectedNode.innerHTML : this.placeholder || DEFAULT_PLACEHOLDER;
			dom.classList.toggle(this.button, 'has-placeholder', !this.selectedNode);
		}
	}

	destroy () {
		super.destroy();
	}
}

customElements.define('drop-down', DropDown);

module.exports = DropDown;