var TAB = function(elBase) {
	
	var tabs = $$.getSingle('.api-class-tabs', elBase);
	var panels = $$.getSingle('.api-class-panels', elBase);
	
	function setTab(sType) {
		
		$A($$('> li', tabs)).forEach(function(elCandiTab) {
			var welCandiTab = $Element(elCandiTab);
			var bMatch = welCandiTab.hasClass(sType); 
			
			welCandiTab[ bMatch ? 'addClass' : 'removeClass' ]('tab-selected');
		});
		
		$A($$('> *', panels)).forEach(function(elCandiPanel) {
			var welCandiPanel = $Element(elCandiPanel);
			var bMatch = welCandiPanel.hasClass(sType); 
			
			welCandiPanel[ bMatch ? 'addClass' : 'removeClass' ]('panel-selected');
		});
		
	}
	
	$Element(tabs).delegate('click', 'a', function(oEvent) {
		var sType = oEvent.element.href.replace(/^.*#/, '');
		setTab(sType);
		
		oEvent.stopDefault();
	});
	
	return {
		set : function(s) { setTab(s); }
	};
	
};

TAB($('classdocs')).set('index');
TAB($('left-columns')).set('tags');
