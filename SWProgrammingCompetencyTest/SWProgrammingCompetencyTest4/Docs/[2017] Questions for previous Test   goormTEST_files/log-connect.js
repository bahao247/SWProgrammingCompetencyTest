var log_connect = {
	lecture_index: null,
	lesson_index: null,
	
	'load': function(options) {
		if (options) {
			this.lecture_index = options.lecture_index;
			this.lesson_index = options.lesson_index;
		}
		this.edu_connect();
		this.init_event();
	},

	edu_connect: function() {
		var join_log_socket = io.connect();
		join_log_socket.emit('edu_connect', {url: window.location.href});
	},
	
	init_event: function() {
		var self = this;
		$('#out_link_btn').click(function() {
			var url = $('#out_link_btn').parent().attr('href');
			$.post('/link/out', {
				lecture_index: self.lecture_index,
				lesson_index: self.lesson_index,
				extern_url: url,
				url: window.location.href
			}, function(result) {
			});
		});
	}
};
