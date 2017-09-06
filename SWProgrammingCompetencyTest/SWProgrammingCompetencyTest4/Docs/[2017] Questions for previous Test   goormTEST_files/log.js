var g_throttle = function(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date(),
        args = arguments;
    if (last && now < last + threshhold) {

      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold + last - now);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
};

var log = {
	init: function() {
		// window.onerror = g_throttle(function(errorMsg, url, lineNumber, column) {
		// 	var postdata = {
		// 		error_msg: errorMsg,
		// 		url: url,
		// 		line_number: lineNumber,
		// 		col_number: column || -1, // old browsers do not support this param
		// 		browser: navigator.userAgent,
		// 		os: navigator.platform
		// 	};

		// 	if (typeof($) !== 'undefined' && $.post) {
		// 		$.post('/log/save_error', postdata, function(result) {
		// 			if (result) {
		// 				console.log('err reported');
		// 			}
		// 		});
		// 	}
		// }, 1000);
	}
};

log.init();