window.addEventListener('DOMContentLoaded', function() {
'use strict';

var wrap = document.querySelector('.wrap');

(function() {

	var handle = document.createElement('span');
	handle.className = 'wrap-resize-handle';
	wrap.insertBefore(handle, wrap.firstChild);

	var isDragging = false;
	var diff;

	handle.addEventListener('mousedown', dragStart);
	window.addEventListener('mousemove', dragMove);
	window.addEventListener('mouseup', dragStop);
	handle.addEventListener('touchstart', dragStart);
	window.addEventListener('touchmove', dragMove);
	window.addEventListener('touchend', dragStop);

	function dragStart(event) {
		if (isDragging) {
			return;
		}
		isDragging = true;
		diff = (event.clientX || event.touches && event.touches[0] && event.touches[0].clientX || 0) - wrap.offsetWidth;
		if (event.preventDefault) {
			event.preventDefault();
		}
	}

	function dragMove(event) {
		if (!isDragging) {
			return;
		}
		wrap.style.width = (event.clientX || event.touches && event.touches[0] && event.touches[0].clientX || 0) - diff + 'px';
		window.cqApi.reevaluate();
	}

	function dragStop() {
		if (!isDragging) {
			return;
		}
		isDragging = false;
	}

})();

(function() {

	var row = document.createElement('div');
	document.querySelector('fieldset').appendChild(row);

	var handle = document.createElement('input');
	handle.type = 'color';
	handle.value = '#FFFFFF';
	handle.id = 'wrap-background-input';
	handle.className = 'wrap-background-input';
	row.appendChild(handle);

	var label = document.createElement('label');
	label.innerHTML = ' background-color (try green or black)';
	label.htmlFor = 'wrap-background-input';
	row.appendChild(label);

	handle.addEventListener('change', onChange);
	handle.addEventListener('input', onChange);

	function onChange() {
		wrap.style.backgroundColor = handle.value;
		window.cqApi.reevaluate();
	}

})();

(function() {

	var row = document.createElement('div');
	document.querySelector('fieldset').appendChild(row);

	var handle = document.createElement('input');
	handle.type = 'checkbox';
	handle.id = 'wrap-text-align-input';
	handle.className = 'wrap-text-align-input';
	row.appendChild(handle);

	var label = document.createElement('label');
	label.innerHTML = ' text-align: right';
	label.htmlFor = 'wrap-text-align-input';
	row.appendChild(label);

	handle.addEventListener('change', onChange);
	handle.addEventListener('click', onChange);

	function onChange() {
		wrap.style.textAlign = handle.checked ? 'right' : 'left';
		window.cqApi.reevaluate();
	}

})();

(function() {

	var row = document.createElement('div');
	document.querySelector('fieldset').appendChild(row);

	var handle = document.createElement('input');
	handle.type = 'range';
	handle.min = 6;
	handle.max = 30;
	handle.value = 16;
	handle.id = 'wrap-font-size-input';
	handle.className = 'wrap-font-size-input';
	row.appendChild(handle);

	var label = document.createElement('label');
	label.innerHTML = ' font-size';
	label.htmlFor = 'wrap-font-size-input';
	row.appendChild(label);

	handle.addEventListener('change', onChange);
	handle.addEventListener('input', onChange);

	function onChange() {
		wrap.style.fontSize = handle.value + 'px';
		window.cqApi.reevaluate();
	}

})();

});
