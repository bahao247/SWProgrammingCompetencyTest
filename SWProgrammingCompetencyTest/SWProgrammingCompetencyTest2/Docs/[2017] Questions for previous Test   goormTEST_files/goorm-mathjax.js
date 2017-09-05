define(['mathjax'], function() {
	return {
		initialized: false,	// is initialized or not
		
		init: function () {
			MathJax.Hub.Config({
				'tex2jax': {
					'inlineMath': [["$","$"],["\\(","\\)"]]
				},
				'jax': ['output/SVG'],
				'skipStartupTypeset': true	// we will typeset manually after contents is fully loaded
			});
		},
		
		// render formula as svg. Jayde-Im.
		// target (jQuery || DOM element || undefined) : formula html to be rendered || whole page will be rendered
		render: function (target) {
			if(!this.initialized) {
				this.initialized = true;
				
				this.init();
			}
			
			$('.MathJax_SVG, .MathJax_Preview, .MathJax_SVG_Display').remove();	// we will redraw svg when loading, so remove duplicate htmls
			
			if(target) {
				MathJax.Hub.Queue(['Typeset', MathJax.Hub, target.length ? target[0] : target]);
			} else {
				MathJax.Hub.Queue(['Typeset', MathJax.Hub]);
			}
		}
	};
}); 