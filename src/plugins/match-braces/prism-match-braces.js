(function () {

	if (typeof Prism === 'undefined' || typeof document === 'undefined') {
		return;
	}

	function mapClassName(name) {
		let customClass = Prism.plugins.customClass;
		if (customClass) {
			return customClass.apply(name, 'none');
		} else {
			return name;
		}
	}

	let PARTNER = {
		'(': ')',
		'[': ']',
		'{': '}',
	};

	// The names for brace types.
	// These names have two purposes: 1) they can be used for styling and 2) they are used to pair braces. Only braces
	// of the same type are paired.
	let NAMES = {
		'(': 'brace-round',
		'[': 'brace-square',
		'{': 'brace-curly',
	};

	// A map for brace aliases.
	// This is useful for when some braces have a prefix/suffix as part of the punctuation token.
	let BRACE_ALIAS_MAP = {
		'${': '{', // JS template punctuation (e.g. `foo ${bar + 1}`)
	};

	let LEVEL_WARP = 12;

	let pairIdCounter = 0;

	let BRACE_ID_PATTERN = /^(pair-\d+-)(close|open)$/;

	/**
	 * Returns the brace partner given one brace of a brace pair.
	 *
	 * @param {HTMLElement} brace
	 * @returns {HTMLElement}
	 */
	function getPartnerBrace(brace) {
		let match = BRACE_ID_PATTERN.exec(brace.id);
		return document.querySelector('#' + match[1] + (match[2] == 'open' ? 'close' : 'open'));
	}

	/**
	 * @this {HTMLElement}
	 */
	function hoverBrace() {
		if (!Prism.util.isActive(this, 'brace-hover', true)) {
			return;
		}

		[this, getPartnerBrace(this)].forEach(function (e) {
			e.classList.add(mapClassName('brace-hover'));
		});
	}
	/**
	 * @this {HTMLElement}
	 */
	function leaveBrace() {
		[this, getPartnerBrace(this)].forEach(function (e) {
			e.classList.remove(mapClassName('brace-hover'));
		});
	}
	/**
	 * @this {HTMLElement}
	 */
	function clickBrace() {
		if (!Prism.util.isActive(this, 'brace-select', true)) {
			return;
		}

		[this, getPartnerBrace(this)].forEach(function (e) {
			e.classList.add(mapClassName('brace-selected'));
		});
	}

	Prism.hooks.add('complete', function (env) {

		/** @type {HTMLElement} */
		let code = env.element;
		let pre = code.parentElement;

		if (!pre || pre.tagName != 'PRE') {
			return;
		}

		// find the braces to match
		/** @type {string[]} */
		let toMatch = [];
		if (Prism.util.isActive(code, 'match-braces')) {
			toMatch.push('(', '[', '{');
		}

		if (toMatch.length == 0) {
			// nothing to match
			return;
		}

		if (!pre.__listenerAdded) {
			// code blocks might be highlighted more than once
			pre.addEventListener('mousedown', function removeBraceSelected() {
				// the code element might have been replaced
				let code = pre.querySelector('code');
				let className = mapClassName('brace-selected');
				Array.prototype.slice.call(code.querySelectorAll('.' + className)).forEach(function (e) {
					e.classList.remove(className);
				});
			});
			Object.defineProperty(pre, '__listenerAdded', { value: true });
		}

		/** @type {HTMLSpanElement[]} */
		let punctuation = Array.prototype.slice.call(
			code.querySelectorAll('span.' + mapClassName('token') + '.' + mapClassName('punctuation'))
		);

		/** @type {{ index: number, open: boolean, element: HTMLElement }[]} */
		let allBraces = [];

		toMatch.forEach(function (open) {
			let close = PARTNER[open];
			let name = mapClassName(NAMES[open]);

			/** @type {[number, number][]} */
			let pairs = [];
			/** @type {number[]} */
			let openStack = [];

			for (let i = 0; i < punctuation.length; i++) {
				let element = punctuation[i];
				if (element.childElementCount == 0) {
					let text = element.textContent;
					text = BRACE_ALIAS_MAP[text] || text;
					if (text === open) {
						allBraces.push({ index: i, open: true, element: element });
						element.classList.add(name);
						element.classList.add(mapClassName('brace-open'));
						openStack.push(i);
					} else if (text === close) {
						allBraces.push({ index: i, open: false, element: element });
						element.classList.add(name);
						element.classList.add(mapClassName('brace-close'));
						if (openStack.length) {
							pairs.push([i, openStack.pop()]);
						}
					}
				}
			}

			pairs.forEach(function (pair) {
				let pairId = 'pair-' + (pairIdCounter++) + '-';

				let opening = punctuation[pair[0]];
				let closing = punctuation[pair[1]];

				opening.id = pairId + 'open';
				closing.id = pairId + 'close';

				[opening, closing].forEach(function (e) {
					e.addEventListener('mouseenter', hoverBrace);
					e.addEventListener('mouseleave', leaveBrace);
					e.addEventListener('click', clickBrace);
				});
			});
		});

		let level = 0;
		allBraces.sort(function (a, b) { return a.index - b.index; });
		allBraces.forEach(function (brace) {
			if (brace.open) {
				brace.element.classList.add(mapClassName('brace-level-' + (level % LEVEL_WARP + 1)));
				level++;
			} else {
				level = Math.max(0, level - 1);
				brace.element.classList.add(mapClassName('brace-level-' + (level % LEVEL_WARP + 1)));
			}
		});
	});

}());