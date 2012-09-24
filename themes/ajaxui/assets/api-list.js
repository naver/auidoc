var apiDocs = function(projectAssets) {
    
    prettyPrint(function() {
		var aLine = $$('#file li');
		for (var i = 0, len = aLine.length; i < len; i++) {
			aLine[i].id = 'l' + (i+1);	
		}
    });
    
    var fpRelocate = function() {};
   
    var onHashChange = function(oCustomEvent) {
    	
        var sHash = oCustomEvent.hash;
        
        /^([a-z0-9]+)(_(.+))?$/i.test(sHash);
        
        var welEl = jindo.$Element(sHash);
        if (welEl) {
            
            var nTop = welEl.offset().top;
            document.documentElement.scrollTop = document.body.scrollTop = nTop - 90;
            
            welEl.addClass('highlight');
            setTimeout(function() {
                welEl.removeClass('highlight');
            }, 1000);
        }
        
        // fpRelocate();
        
    };
    
    var oStorage = {
    	
    	set : function(sKey, sVal) {
	    	
	    	sKey = 'auidoc-' + sKey;
	    	sVal = String(sVal);
	    	
	    	$Cookie().set(sKey, sVal);
	    	if ($Cookie().get(sKey) !== sVal) {
	    		localStorage.setItem(sKey, sVal);	
	    	}
    	
    	},
    	
    	get : function(sKey) {
    		sKey = 'auidoc-' + sKey;
    		return $Cookie().get(sKey) || localStorage.getItem(sKey);
    	}
    	
    };
    
    var oHash = new jindo.Hash({
        'frameSrc' : projectAssets + '/hash.html'
    }).attach('change', onHashChange);
    
    setTimeout(function() { onHashChange({ hash : oHash.get() }); }, 0);
    
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
        
        // fpRelocate();
        
    });
    
	$Element(document).delegate('click', 'button.btn_open, button.btn_close', function(oEvent) {
	
		var elButton = oEvent.element;
		var elParent = $$.getSingle('! .history-table', elButton);
	
		elParent && $Element(elParent).toggleClass('tbl_fold');
	    
	});

	(function() {
		
		var welDemoList = $Element('demo_list');
		if (!welDemoList) { return; }
		
		var welDemoDesc = $Element('demo_desc');
		var welDemoExample = $Element('demo_example');
		var welDemoIframe = $Element('demo_iframe');
		var welBtnExternal = $Element('btn_external');
		
		var welLastLI = null;
		
		var fpSetDemo = function(elAnchor) {
			
			var welLI = $Element($$.getSingle('! li', elAnchor));
			
			welDemoDesc.html(elAnchor.title);
			welDemoIframe.$value().src = elAnchor.href;
			
			welLastLI && welLastLI.removeClass('selected');
			welLI.addClass('selected');
			
			welLastLI = welLI;
			
		};

		welDemoList.delegate('click', 'a', function(oEvent) {
			
			if (welDemoExample.visible()) {
				fpSetDemo(oEvent.element);
				oEvent.stopDefault();
			}
			
		});
		
		welBtnExternal.attach('click', function(oEvent) {
			open(welDemoIframe.$value().src);
			oEvent.stopDefault();
		});
		
		fpSetDemo(welDemoList.query('a').$value());
		
	})();
	
	(function() {
		
		var aHistoryTables = $$('div.history-table');
		
		for (var i = 0, nLen = aHistoryTables.length; i < nLen; i++) {
			var elTable = aHistoryTables[i];
		}
		
	})();
	
	(function() {
		
		var elHeader = $('header');
        var elLeft = $('left-columns');

		var elDepth1 = $$.getSingle('div.depth1');
		var elDepth2 = $$.getSingle('div.depth2');
		
		var oScrollTimer = null;
		
		var oScrBox1 = new jindo.ScrollBox(elDepth1, {
			sOverflowX : 'hidden',
			sOverflowY : 'auto',
			bAdjustThumbSize : true,
			nDelta : 32
		}).attach('scroll', function(oCustomEvent) {
			
			var nPosition = oCustomEvent.nPosition;
			
			if (oCustomEvent.sDirection !== 'top') { return; }
			
			if (oScrollTimer) { clearTimeout(oScrollTimer); }
			setTimeout(function() {
				oStorage.set('scroll-top', nPosition);
				oScrollTimer = null;
			}, 500);
						
		});
		
		var oScrBox2 = elDepth2 && (new jindo.ScrollBox(elDepth2, {
			sOverflowX : 'hidden',
			sOverflowY : 'auto',
			bAdjustThumbSize : true,
			nDelta : 32
		}));
		
		var bScrollFirst = true;
		var elDepth1Selected = $$.getSingle('a.selected', elDepth1);
		
		var bCurSmall = null;
		
		var onMouseWheel = function(oEvent) {
			bCurSmall && oEvent.stopBubble();
		};
		
		$Element(elDepth1).attach('mousewheel', onMouseWheel);
		elDepth2 && $Element(elDepth2).attach('mousewheel', onMouseWheel);
		
		fpRelocate = function() {
			
			var bSmall = $Document().clientSize().width < 768;
			if (bSmall !== bCurSmall) {
				$Element(document.body).cssClass('small-body', bSmall);
				bCurSmall = bSmall;	
			}
			
			if (!bCurSmall) {
				
				var nTmpTop = oScrBox1.getScrollTop();
				oScrBox1.setSize(148, elLeft.offsetHeight - elHeader.offsetHeight);
				oScrBox1.setScrollTop(nTmpTop);
				
				if (oScrBox2) {
				
					nTmpTop = oScrBox2.getScrollTop();
					
					oScrBox2.setSize(148, elLeft.offsetHeight - elHeader.offsetHeight);
					$Element(elLeft).cssClass('has_scrollbar', oScrBox2.hasScrollBarVertical());
					
					oScrBox2.setScrollTop(nTmpTop);
					
				}
				
			}
			
			if (bScrollFirst) {
				
				if (elDepth1Selected) {
					
					var aItem = [ elDepth1Selected.offsetTop + elDepth1Selected.offsetParent.offsetTop ];
					aItem[1] = aItem[0] + elDepth1Selected.offsetHeight;
					
				}
				
				var nTop = Number(oStorage.get('scroll-top'));
				if (nTop) { oScrBox1.setScrollTop(nTop); }
				
				if (elDepth1Selected) {
					
					var aRange = [ oScrBox1.getScrollTop() ];
					aRange[1] = aRange[0] + elDepth1.offsetHeight;
					
					if (aItem[0] < aRange[0]) {
						oScrBox1.setScrollTop(aRange[0] - (aRange[0] - aItem[0]));
					} else if (aItem[1] > aRange[1]) {
						oScrBox1.setScrollTop(aRange[0] + (aItem[1] - aRange[1]));
					}
					
				}
				
				bScrollFirst = false;
			}

		};
		
		var oTimer = new jindo.Timer();
		$Element(window).attach('resize', function() {
			oTimer.start(fpRelocate, 100);
		});
		
		setTimeout(fpRelocate, 0);
		
	})();
	
	(function() {
		
		var welWrap = $Element('wrap');
		
		var welBtnClose = $Element($$.getSingle('button.btn_close'));
		var welBtnOpen = $Element($$.getSingle('button.btn_open'));
		
		welWrap.cssClass('lft_fold', oStorage.get('show-left-fold') === 'true');
		
		welBtnClose.attach('click', function() {
			welWrap.addClass('lft_fold');
			oStorage.set('show-left-fold', true);
		});
		
		welBtnOpen.attach('click', function() {
			welWrap.removeClass('lft_fold');
			oStorage.set('show-left-fold', false);
			fpRelocate();
		});
		
	})();
        
    (function() {
        
        var elLeft = $('left-columns');
        var elMain = $('main');
        
        var showInherited = jindo.$('api-show-inherited');
        var showDeprecated = jindo.$('api-show-deprecated');
        
        if (!showInherited || !showDeprecated) { return; }
        
        showInherited.checked = oStorage.get('show-inherited') === 'true';
        showDeprecated.checked = oStorage.get('show-deprecated') === 'true';
        
        var chkInherited = jindo.$('checkbox-inherited');
        var chkDeprecated = jindo.$('checkbox-deprecated');
        
        var oInherited = new jindo.CheckBox(chkInherited);
        var oDeprecated = new jindo.CheckBox(chkDeprecated);
        
        var refresh = function() {
        	
            $Element(document.body).cssClass({
               'hide-inherited' : !showInherited.checked,
               'hide-deprecated' : !showDeprecated.checked
            });
            
            oStorage.set('show-inherited', showInherited.checked); 
            oStorage.set('show-deprecated', showDeprecated.checked); 
            
            fpRelocate();
            
        };
        
        oInherited.attach('change', refresh);
        oDeprecated.attach('change', refresh);

		/*
        $Element(showInherited).attach('click', refresh);
        $Element(showDeprecated).attach('click', refresh);
        */
        
        refresh();
        
    })();
    
};
