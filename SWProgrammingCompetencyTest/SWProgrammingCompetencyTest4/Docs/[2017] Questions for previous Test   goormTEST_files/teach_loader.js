requirejs.config({
    // baseUrl: "//statics.goorm.io/lge/modules",
	baseUrl: "/modules",
    waitSeconds: 200,
	packages: [{
		name: "codemirror",
		location: "//statics.goorm.io/lge/libs/codemirror",
		main: "lib/codemirror"
	}],
    paths: {
        "jquery": "//statics.goorm.io/lge/libs/jquery/jquery-2.1.1.min",
        "jquery.form": "//statics.goorm.io/lge/libs/jquery/jquery.form",
        "jquery-ui": "//statics.goorm.io/lge/libs/jquery/jquery-ui.min",
		"datatables": "/libs/jquery/jquery.dataTables.bootstrap",
        "datatables.net": "/libs/jquery/jquery.dataTables.min",
        "jquery.jpanelmenu": "//statics.goorm.io/lge/libs/jquery/jquery.jpanelmenu.min",
		"moment": "//statics.goorm.io/lge/libs/moment/moment-with-locales.min",
        "bootstrap": "//statics.goorm.io/lge/libs/bootstrap/js/bootstrap-edu.min",
        "bootstrap-tour": "//statics.goorm.io/lge/libs/bootstrap/js/bootstrap-tour",
		"bootstrap-datetimepicker": "//statics.goorm.io/lge/libs/bootstrap/js/bootstrap-datetimepicker.min",
		"bootstrap-tagsinput": "//statics.goorm.io/lge/libs/bootstrap/js/bootstrap-tagsinput.min",
		"bootstrap-treeview": "//statics.goorm.io/lge/libs/bootstrap-treeview/bootstrap-treeview.min",
		"bootstrap-treeview-raw": "//statics.goorm.io/lge/libs/bootstrap-treeview/bootstrap-treeview.raw",
		"bootstrap-select": "//statics.goorm.io/lge/libs/bootstrap/js/bootstrap-select.min",
		"bootstrap-colorpicker": "//statics.goorm.io/lge/libs/bootstrap/js/bootstrap-colorpicker.min",
		// "ckeditor": "//statics.goorm.io/lge/libs/ckeditor/ckeditor",
		// "chart": "//statics.goorm.io/lge/libs/chart/Chart.min",
		// "chart.horizontal": "//statics.goorm.io/lge/libs/chart/Chart.HorizontalBar",
		// "chart.stackedline": "//statics.goorm.io/lge/libs/chart/Chart.StackedLine",
		// "chart.stackedbar": "//statics.goorm.io/lge/libs/chart/Chart.StackedBar",
		"socket.io": "/socket.io/socket.io",
        "domReady": "//statics.goorm.io/lge/libs/domReady",
        "async": "//statics.goorm.io/lge/libs/async",
        "jstree": "//statics.goorm.io/lge/libs/jquery/jstree/jstree",
		"jquery.throttle.debounce": "//statics.goorm.io/lge/libs/jquery/jquery.throttle.debounce",
		// "codemirror": "//statics.goorm.io/lge/libs/codemirror/lib/codemirror",
        "ua-parser": "//statics.goorm.io/lge/libs/ua-parser/ua-parser.min",
		// "bootstrap-wizard": "//statics.goorm.io/lge/libs/bootstrap/js/jquery.bootstrap.wizard.min",
		"summernote": "//statics.goorm.io/lge/libs/summernote/summernote",
		"marked": "//statics.goorm.io/lge/libs/marked",
		"toMarkdown": "//statics.goorm.io/lge/libs/to-markdown",
		"d3": "//statics.goorm.io/lge/libs/c3/d3.min",
		"c3": "//statics.goorm.io/lge/libs/c3/c3.min",
		"battle": "/robocode/battle",
		"toast": "//statics.goorm.io/lge/libs/Toastr/toastr.min",
		"clipboard": "//statics.goorm.io/lge/libs/clipboard.js/clipboard.min",
		"swfobject": "//statics.goorm.io/lge/libs/swfobject/swfobject",
		"mathjax": "https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.1/MathJax.js?config=TeX-MML-AM_SVG"
    },
    shim: {
        "jquery.form": ["jquery"],
        "jquery-ui": ["jquery"],
        "datatables": ["jquery"],
        "datatables.net": ["jquery"],
        "jquery.jpanelmenu": ["jquery"],
        "jstree": ["jquery"],
		"jquery.throttle.debounce": ["jquery"],
		"moment": ["jquery"],
        "bootstrap": ["jquery"],
        "bootstrap-tour": ["bootstrap"],
		"bootstrap-treeview-raw": ["bootstrap"],
		"bootstrap-datetimepicker": ["bootstrap"],
		// "bootstrap-wizard": ["bootstrap"],
		"bootstrap-tagsinput": ["bootstrap"],
		"bootstrap-select": ["jquery", "bootstrap"],
		"bootstrap-colorpicker": ["bootstrap"],
        // "codemirror": {
        //     "exports": "CodeMirror"
        // },
        "socket.io": {
            "exports": "io"
        },
        // "ckeditor": {
        //     'exports': 'CKEDITOR'
        // },
		// "chart.horizontal": ["chart"],
		// "chart.stackedline": ["chart"],
		// "chart.stackedbar": ["chart"],
		// "chart": {
		// 'exports': 'Chart'
		// },
		"summernote": ["jquery", "bootstrap"],
		"c3": ["d3"]
    },
	urlArgs: '_v=20161107'
});
