var goorm_lint = function() {
	this.socket = null;
	this.editor = null;
	this.result = [];
}

goorm_lint.prototype = {
	init: function(socket) {
		this.socket = socket;
		
		return this;
	},
	
	load: function(options) {
		var self = this;

		var filetype = options.filetype;
		var version = options.version;

		if (version) {
			this.version = version;
		}

		this.editor = options.editor;
		
		this.create();
		
		this.editor.on('change', $.debounce(1000, function() {
			self.socket.emit('lint', {
				'source': self.editor.getValue(),
				'filetype': self.get_type(self.editor.options.mode),
				'version': version
			});
		}));
		
		return this;
	},
	
	get_type: function(mode) {
		var type = '';
		
		if (mode === 'text/x-csrc') {
			type = 'c';
		} else if(mode === 'text/x-c++src') {
			type = 'cpp';
		} else if (mode === 'text/x-python') {
			type = 'py';
		}
		
		return type;
	},
	
	create: function() {
		var self = this;
		
		var type = this.get_type(this.editor.options.mode);
		// init
		
		if (type === 'c') {
			this.socket.on('lint_result_c', function(data) {
				var old = '';
				old = (window.c_result && window.c_result.length > 0) ? true : false;

				if (data.stderr) {
					window.c_result = self.formatting(self.c_parse(data.stderr, data.filepath));
				} else {
					window.c_result = [];
				}

				// trigger
				CodeMirror.optionHandlers.lint(self.editor, [], old);
			});
		} else if (type === 'cpp') {
			this.socket.on('lint_result_cpp', function(data) {
				var old = '';
				old = (window.cpp_result && window.cpp_result.length > 0) ? true : false;

				if (data.stderr) {
					window.cpp_result = self.formatting(self.cpp_parse(data.stderr, data.filepath));
				} else {
					window.cpp_result = [];
				}

				// trigger
				CodeMirror.optionHandlers.lint(self.editor, [], old);
			});
		} else if (type === 'py') {
			this.socket.on('lint_result_py', function(data) {
				var old = '';
				old = (window.python_result && window.python_result.length > 0) ? true : false;

				if (data.stderr) {
					window.python_result = self.formatting(self.python_parse(data.stderr, data.filepath));
				} else {
					window.python_result = [];
				}

				// trigger
				CodeMirror.optionHandlers.lint(self.editor, [], old);
			});
		}
		
	},
	
	c_parse: function(data, path) {
		var list = [];
		
		var regex = new RegExp('^(' + path.replace(/\//g, '\\/').replace(/\./g, '\\.') + '):(\\d+):\\d+?:? (.+)');
		var lines = data.split('\n');
		
		var matches = null;
		
		for (var i = 0; i < lines.length; i++) {
			matches = lines[i].match(regex);
			
			if (matches && matches.length >= 4) {
				var msg = matches[3].split(':');
				
				list.push({
					'line': parseInt(matches[2], 10),
					'type': msg.shift(),
					'contents': msg.join(':')
				});
			}
		}
		
		return list;
	},	
	
	cpp_parse: function(data, path) {
		var list = [];
		
		var regex = new RegExp('^(' + path.replace(/\//g, '\\/').replace(/\./g, '\\.') + '):(\\d+):\\d+?:? (.+)');
		var lines = data.split('\n');
		
		var matches = null;
		
		for (var i = 0; i < lines.length; i++) {
			matches = lines[i].match(regex);
			
			if (matches && matches.length >= 4) {
				var msg = matches[3].split(':');
				
				list.push({
					'line': parseInt(matches[2], 10),
					'type': msg.shift(),
					'contents': msg.join(':')
				});
			}
		}
		
		return list;
	},
	
	python_parse: function(data, path) {
		var list = [];
		
		var output = data.split('\n');
		
		for (var i=0; i<output.length; i++) {
			if (output[i].indexOf(path)> -1) {
				var msg = output[i].split(path).pop().split(':');
				
				list.push({
					'line': parseInt(msg[1], 10),
					'type': 'error',
					'contents': isNaN(parseInt(msg[2], 10)) ? msg[2] : msg[3]
				});
			}
		}
		
		return list;
	},
	
	formatting: function(list) {
		var self = this;
		
		var formatted = [];
		
		if (this.editor && list && list.length > 0) {
			formatted = list.map(function(o) {
				o.line = o.line - 1;
				
				var editor_line = self.editor.getLine(o.line);
				var line_info = editor_line.trim();
				
				var ch_start = editor_line.indexOf(line_info);
				var ch_end = ch_start + line_info.length;
				
				return {
					'message': o.contents,
					'severity': o.type,
					'from': {
						'line': o.line,
						'ch': ch_start
					},
					'to': {
						'line': o.line,
						'ch': ch_end
					}
				};
			});
		}
		
		return formatted;
	}
};
