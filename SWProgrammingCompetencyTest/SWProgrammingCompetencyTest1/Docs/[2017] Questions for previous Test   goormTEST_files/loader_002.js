var loader = {
	init: function() {
		this.panel = $('#loader');

		return this;
	},
	show: function(options) {
		var loader = $('#loader');

		if (options) {
			loader.find('.header').html(options.header);
			loader.find('.contents').html(options.contents);
		}

		loader.show();
	},
	
	hide: function() {
		var loader = $('#loader');
		
		loader.hide();
	}
};

if (typeof(define) === 'undefined') {
	window.loader = loader;
} else {
	define(function(){
		var widgets = {};
		
		widgets.loader = function() {
			this.panel = null;
		};

		widgets.loader.prototype = loader;

		return widgets.loader;
	});	
}
