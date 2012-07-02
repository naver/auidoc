var apiDocs = function(projectRoot) {
    
    prettyPrint();
    
    var elDocsTabWrap = jindo.$('docs-tab');
    
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
    
};
