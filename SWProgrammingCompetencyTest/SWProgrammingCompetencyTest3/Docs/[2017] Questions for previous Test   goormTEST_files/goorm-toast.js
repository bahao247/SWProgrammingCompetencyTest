if (!window.widgets) {
	window.widgets = {};
}

widgets.toast = function() {
	this.panel = null;
};

widgets.toast.prototype = {
	init: function() {
		
		toastr.options.positionClass = 'toast-top-right';
		toastr.options.timeOut = 3000;
		
		return this;
	},

	show: function(message, options) {
		if (!options) {
			options = {};
		}
		
		var method = options.method || 'success';
		var time = options.time || 3000;
		var positionClass = options.positionClass || 'toast-top-right';

		toastr.options.timeOut = time;
		toastr.options.positionClass = positionClass;
		
		if (options.forever) {
			toastr.options.tapToDismiss = false;
			toastr.options.closeButton = true;
			toastr.options.timeOut = 0;
			toastr.options.extendedTimeOut = 0;
		} else {
			toastr.options.tapToDismiss = true;
			toastr.options.closeButton = false;
			toastr.options.timeOut = 3000;
			toastr.options.extendedTimeOut = 1000;
		}
		
		toastr[method](message);
	}
}
