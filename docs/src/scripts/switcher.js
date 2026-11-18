// "Somaari sites" switcher, ported from vendor/somaari-site/nav.js: a grid button opening a panel of every
// site. Hidden without JS (the header nav links are there instead). Escape closes and returns focus;
// clicking outside or choosing a link closes. (Starlight supplies the phone menu.)
(function () {
	var box = document.getElementById('site-switcher');
	var btn = document.getElementById('switcher-toggle');
	var menu = document.getElementById('switcher-menu');
	if (!box || !btn || !menu) return;
	box.hidden = false;
	function set(open, returnFocus) {
		menu.hidden = !open;
		btn.setAttribute('aria-expanded', open ? 'true' : 'false');
		if (open) { var a = menu.querySelector('a[href]'); if (a) a.focus(); }
		else if (returnFocus) btn.focus();
	}
	btn.addEventListener('click', function () { set(menu.hidden, true); });
	document.addEventListener('click', function (e) { if (!menu.hidden && !box.contains(e.target)) set(false, false); });
	document.addEventListener('keydown', function (e) {
		if (menu.hidden) return;
		if (e.key === 'Escape') { e.preventDefault(); set(false, true); }
		else if (e.key === 'Tab') {
			var items = Array.prototype.slice.call(menu.querySelectorAll('a[href]')).concat([btn]);
			var first = items[0], last = items[items.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
			else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
		}
	});
})();
