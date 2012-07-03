$Element(document).attach('domready', function() {
	
	var elLeft = $('left-columns');
	var elMain = $('main');

    /*
    var oScroll = new iScroll(elLeft, {
        hScroll : false,
        deltaScale : 3,
        onBeforeScrollStart : function(e) {
            var el = $Event(e).element;
            var tagName = el.tagName.toUpperCase();
            
            if (tagName !== 'INPUT' && tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        }
    });
    
    $Element(elLeft).attach('mousewheel', function(o) { o.stopDefault(); });
    */
		
	// Relocation left-columns
	(function() {
		
		if (!elLeft) { return; }
	
		var fpRelocate = function() {
		    
		    var nScrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
		    
			var nTop = Math.max(0, nScrollTop - 140);
			var nHeight = elLeft.offsetHeight;
			var nBottom = nTop + nHeight;
			
			if (nBottom > elMain.offsetHeight) {
				nTop -= (nBottom - elMain.offsetHeight);
				nTop = Math.max(0, nTop);
			}
			
			elLeft.style.marginTop = nTop + 'px';
			
            var nClientHeight = $Document().clientSize().height;
            elLeft.style.height = nClientHeight + Math.min(0, nScrollTop - 140) + 'px';
            
            // oScroll.refresh();

		};
		
        fpRelocate();
		
		$Element(window).attach('scroll', fpRelocate);
		$Element(window).attach('resize', fpRelocate);

	})();
	
	(function() {
	    
	    $Element(document).delegate('click', 'button.fold', function(oEvent) {
	        
	        var elButton = oEvent.element;
	        var elParent = $$.getSingle('! .param', elButton);
	        
	        elParent && $Element(elParent).toggleClass('collapsed');
	        
	    });
	    
	})();
	
});
