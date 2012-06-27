var HASH = function(fpHashChange) {
	
	var sHash = null;
	
	function getHash() {
		return location.hash.replace(/^#/, '');
	}
	
	function onHashChange() {
		sHash = getHash();
		fpHashChange(sHash);
	}
	
	function checkHashChange() {
		var sNowHash = getHash();
		if (sHash !== sNowHash) {
			onHashChange();
		}
	}
	
	var bSupportHashChange = 'onhashchange' in window;
	if (bSupportHashChange) {
		$Element(window).attach('hashchange', onHashChange);
	} else {
		setInterval(checkHashChange, 100);
	}
	
	onHashChange();
	
};
