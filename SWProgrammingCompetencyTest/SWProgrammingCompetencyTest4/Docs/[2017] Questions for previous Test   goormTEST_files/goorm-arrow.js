if (!window.widgets) {
	window.widgets = {};
}

widgets.arrow = function() {
	//set default value
	this.parent = '.result_content';
	this.show_time = 2500;
	this.fade_time = 750;

};

widgets.arrow.prototype = {
	init: function(options) {
		if(options && typeof(options) === 'object') {
			this.parent = options.parent || '.result_content';
			this.show_time = options.show_time || 2500;
			this.fade_time = options.fade_time || 750;
		}

		return this;
	},
	
	show: function(options) {
		if (window.is_mobile || $('.g-arrow').length > 0) {
			return;
		}
		
		var parent_dom = options && options.parent ? options.parent : this.parent;
		var show_time = options && options.show_time ? options.show_time : this.show_time;
		var fade_time = options && options.fade_time ? options.fade_time : this.fade_time;

		$(parent_dom).before('<div class="g-arrow bounce" style="display:none;"></div>');
		var arrow = $('.g-arrow');
		arrow.fadeIn(fade_time);
		setTimeout(function() {
			arrow.fadeOut(fade_time);
			setTimeout(function() {
				arrow.remove();
			}, fade_time);
		}, show_time + fade_time);
	},
	
	getValues: function() {
		var obj = {};
		obj.parent_dom = this.parent_dom;
		obj.show_time = this.show_time;
		obj.fade_time = this.fade_time;
		obj.height_offset = this.height_offset;
		
		return obj;
	}

};
