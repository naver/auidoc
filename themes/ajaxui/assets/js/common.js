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
		    
		    /*
			var nTop = Math.max(0, nScrollTop - 140);
			var nHeight = elLeft.offsetHeight;
			var nBottom = nTop + nHeight;
			
			if (nBottom > elMain.offsetHeight) {
				nTop -= (nBottom - elMain.offsetHeight);
				nTop = Math.max(0, nTop);
			}
			*/
			
			// elLeft.style.marginTop = nTop + 'px';
			elLeft.style.marginTop = -Math.min(nScrollTop, 140) + 'px';
			
            var nClientHeight = $Document().clientSize().height;
            // elLeft.style.height = nClientHeight + Math.min(0, nScrollTop - 140) + 'px';

            var aArea = [
                Math.max(nScrollTop, 140),
                Math.min(nScrollTop + nClientHeight, 140 + elMain.offsetHeight)
            ];
            
            elLeft.style.height = aArea[1] - aArea[0] + 'px';
            
            // oScroll.refresh();

		};
		
        setTimeout(fpRelocate, 0);
		
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
	
	(function() {
	    
	    var wrap = $('class-columns');
	    if (!wrap) { return; }
	    
        var columns = $$('.column', wrap);
        var stacks = $$('.stack', wrap);
        
        var heights = Array(columns.length);
        
        var getMinHeightIndex = function() {
            
            var minHeight = Infinity;
            var minIndex = -1;
            
            for (var i = 0, len = heights.length; i < len; i++) {
                
                var height = heights[i] || 0;
                if (height < minHeight) {
                    minHeight = height;
                    minIndex = i;
                }
                
            }
            
            return minIndex;
            
        };
        
        for (var i = 0, len = stacks.length; i < len; i++) {
            
            var index = getMinHeightIndex();
            var column = columns[index];
            
            var stack = stacks[i];
            column.appendChild(stack);
            
            stack.style.display = 'block';
            heights[index] = (heights[index] || 0) + stack.offsetHeight;

        }
	    
	})();
	
});
