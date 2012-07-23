var apiDocs = function(projectRoot) {
    
    prettyPrint();
    
    var elDocsTabWrap = jindo.$('docs-tab');
    
    var fpRelocate = function() {};
    
    var oDocsTab = elDocsTabWrap && new jindo.TabControl(elDocsTabWrap).attach({
        
        'click' : function(oCustomEvent) {
            var weEvt = oCustomEvent.weEvent;
            var elTab = weEvt.element;
            
            if (!$$.getSingle('! .tc-tab', elTab)) { return; }
            
            oCustomEvent.stop();
        }
        
    });
    
    var getTabIndex = function(sTabName) {
        
        var aTabs = jindo.$$('li.tc-tab a', jindo.$('docs-tab'));
        for (var i = 0, len = aTabs.length; i < len; i++) {
            var elTab = aTabs[i];
            if (new RegExp('#' + sTabName + '$').test(elTab.href)) {
                return i;
            }
        }
        
        return -1;
        
    };
    
    var onHashChange = function(oCustomEvent) {
        
        var sHash = oCustomEvent.hash;
        
        /^([a-z0-9]+)(_(.+))?$/i.test(sHash);
        
        var sTabName = RegExp.$1;
        var sItemName = RegExp.$3;
        
        var nIndex = getTabIndex(sTabName);
        
        nIndex > -1 && oDocsTab.selectTab(nIndex);
        
        var welEl = jindo.$Element(sHash);
        if (welEl) {
            
            var nTop = welEl.offset().top;
            
            document.documentElement.scrollTop = document.body.scrollTop = nTop - 15;
            window.scrollBy(0, 0);
            
            welEl.addClass('highlight');
            setTimeout(function() {
                welEl.removeClass('highlight');
            }, 500);
        }
        
        fpRelocate();
        
    };
    
    var oHash = new jindo.Hash({
        'frameSrc' : projectRoot + '/assets/lib/hash.html'
    }).attach('change', onHashChange);
    
    onHashChange({ hash : oHash.get() });
    
    $Element(document).delegate('click', 'a', function(oEvent) {
        
        var el = oEvent.element;
        var sHref = el.getAttribute('href');
        
        if (/^#(.*)$/.test(sHref)) {
            var sHash = RegExp.$1;
            oHash.set(sHash);
            
            oEvent.stopDefault();   
        }

    });
        
    $Element(document).delegate('click', 'button.fold', function(oEvent) {
        
        var elButton = oEvent.element;
        var elParent = $$.getSingle('! .param', elButton);
        
        elParent && $Element(elParent).toggleClass('collapsed');
        
        fpRelocate();
        
    });
        
    $Element(document).delegate('click', 'button.more-history', function(oEvent) {
        
        var elButton = oEvent.element;
        var elParent = $$.getSingle('! .history', elButton);
        
        elParent && $Element(elParent).toggleClass('show-all-rows');
        
        fpRelocate();
        
    });
    
    $Element('classes_options').attach('change', function(oEvent) {
    	location.href = oEvent.element.value;
    });
        
    $Element(document).attach('domready', function() {
        
        var elLeft = $('left-columns');
        var elMain = $('main');
        
        var elSidemenu = $$.getSingle('.sidemenu', elLeft);
        var elBody = $$.getSingle('.body', elMain);
    
        // Relocation left-columns
        (function() {
            
            if (!elLeft) { return; }
        
            fpRelocate = function() {
                
                elMain.style.height = Math.max(elSidemenu.scrollHeight, elBody.scrollHeight) + 'px';

                var nScrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
                
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
        
        (function() {
            
            var showInherited = jindo.$('api-show-inherited');
            var showDeprecated = jindo.$('api-show-deprecated');
            
            var refresh = function() {
                $Element(document.body).cssClass({
                   'show-inherited' : showInherited.checked,
                   'show-deprecated' : showDeprecated.checked
                });
                
                fpRelocate();
            };

            $Element(showInherited).attach('click', refresh);
            $Element(showDeprecated).attach('click', refresh);
            
            refresh();
            
        })();
        
    });
    
    
};
