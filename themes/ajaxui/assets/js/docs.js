var TAB = function(elBase, bUseClick) {
	
	var elTabs = $$.getSingle('.api-class-tabs', elBase);
	var elPanels = $$.getSingle('.api-class-panels', elBase);
	
	function setTab(sType) {
		
		$A($$('> li', elTabs)).forEach(function(elCandiTab) {
			var welCandiTab = $Element(elCandiTab);
			var bMatch = welCandiTab.hasClass(sType); 

			welCandiTab[ bMatch ? 'addClass' : 'removeClass' ]('tab-selected');
		});
		
		$A($$('> *', elPanels)).forEach(function(elCandiPanel) {
			var welCandiPanel = $Element(elCandiPanel);
			var bMatch = welCandiPanel.hasClass(sType); 
			
			welCandiPanel[ bMatch ? 'addClass' : 'removeClass' ]('panel-selected');
		});
		
	}
	
	if (bUseClick) {
		$Element(elTabs).delegate('click', 'a', function(oEvent) {
			var sType = oEvent.element.href.replace(/^.*#/, '');
			setTab(sType);
			
			oEvent.stopDefault();
		});
	}
	
	return {
		set : function(s, b) { setTab(s, b); }
	};
	
};

var SEARCH = function(elBase, oSearchTab, sRootPath) {
	
	var welBase = $Element(elBase);
	
	var elTabs = $$.getSingle('.api-class-tabs', elBase);
	var elPanels = $$.getSingle('.api-class-panels', elBase);
	
	var elField = $$.getSingle('input[type=text]', elBase);
	var elResult = $$.getSingle('.api-result', elBase);
	
	function showTab(oList) {
		
		var sFirstType = null;
		
		$A(['tag','class','method','attr','property','event']).forEach(function(sType) {
			var elTab = $$.getSingle('> li.' + sType, elTabs);
			var bExist = oList && sType in oList;
			
			if (bExist && !sFirstType) { sFirstType = sType; }
			
			$Element(elTab)[bExist ? 'show' : 'hide']();
		});
		
		var elShowedTab = $$.getSingle('> li.tab-selected', elTabs);
		if (sFirstType && (!elShowedTab || !$Element(elShowedTab).visible())) {
			oSearchTab.set(sFirstType);
		}
		
		welBase[sFirstType ? 'removeClass' : 'addClass']('no-result');
		
	}
	
	function getPanelHTML(aList) {
		
		var aHTML = [ '<ul>' ];
		
		for (var i = 0, len = aList.length; i < len; i++) {

			var oItem = aList[i];
			var sItemType = oItem.itemtype || 'class';
			
			var sHref = sRootPath + 'classes/';
			
			if (sItemType === 'class') {
				sHref += oItem.name + '.html#';
			} else {
				sHref += oItem['class'] + '.html#' + oItem.itemtype + '_' + oItem.name;
			}
			
			aHTML.push('<li><a href="' + sHref + '">' + (highlightMatch(oItem.name) || oItem.name) + '</a></li>');
			
		}
		
		aHTML.push('</ul>');
		return aHTML.join('');
		
	}
	
	function showPanel(oList) {
		
		if (!oList) { return; }
		
		$H(oList).forEach(function(oData, sType) {
			
			var elPanel = $$.getSingle('> li.' + sType, elPanels);
			var aHTML = [];
			
			switch (sType) {
			case 'tag':
				$H(oData).forEach(function(aList, sTag) {
					aHTML.push('<h3>' + highlightMatch(sTag) + '</h3>');
					aHTML.push(getPanelHTML(aList));
				});
				break;

			default:
				aHTML.push(getPanelHTML(oData));
				break;				
			}
			
			elPanel.innerHTML = aHTML.join('');
		});
		
	}
	
	function find() {
		
		var sValue = elField.value.replace(/(^\s+|\s+$)/g, '');
		if (!sValue) {
			welBase.removeClass('show-result');
			return;
		}
		
		welBase.addClass('show-result');
		
		var oList = findInData(sValue);
		showTab(oList);
		showPanel(oList);
		
		return oList;
		
	}
	
	var sLastNeedle = '';
	
	function highlightMatch(sStr, sNeedle) {
		
		sLastNeedle = sNeedle = sNeedle || sLastNeedle;
		
		var bMatch = false;
		var sRegNeedle = $S(sNeedle).escapeRegex();
		
		var sRet = sStr.replace(new RegExp(sRegNeedle, 'i'), function(_) {
			bMatch = true;
			return '<strong>' + _ + '</strong>';
		});
		
		return bMatch ? sRet : null;
		
	}
	
	function getMatchTag(aTag, sValue) {
		
		var aRet = [];
		
		for (var i = 0, len = aTag.length; i < len; i++) {
			var sTag = aTag[i];
			var sHighlightTag = highlightMatch(sTag, sValue);
			if (sHighlightTag) { aRet.push(sTag); }
		}
		
		return aRet;
		
	}
	
	function findInData(sValue) {
		
		var oResult = null;
		
		oResult = findTagInData(sValue, oResult);
		oResult = findClassItemInData(sValue, oResult);
		
		return oResult;
		
	}
	
	function findTagInData(sValue, oResult) {
		
		var oData = SEARCH.data;
		
		$H(oData.classes || {}).forEach(function(oClass) {
			
			var sName = oClass.name;
			var sHighlightName = highlightMatch(sName, sValue);
			if (sHighlightName) {
				
				oResult = oResult || {};
				
				var aItemList = oResult['class'] = oResult['class'] || [];
				aItemList.push(oClass);
				
			}
			
			var aTag = oClass.tag || [];
			var aMatchTag = getMatchTag(aTag, sValue);
			
			if (aMatchTag.length) {
	
				oResult = oResult || {};
				var oTagResult = oResult.tag = oResult.tag || {};
				
				for (var i = 0, len = aMatchTag.length; i < len; i++) {
					var sMatchTag = aMatchTag[i];
					var aClassList = oTagResult[sMatchTag] = oTagResult[sMatchTag] || [];
					aClassList.push(oClass);
				}
				
			}
			
		});

		return oResult;		
		
	}
		
	function findClassItemInData(sValue, oResult) {
		
		var oData = SEARCH.data;
		
		$A(oData.classitems || []).forEach(function(oItem) {
			
			var sItemType = oItem.itemtype;
			if (!sItemType) { $A.Continue(); }
			
			if (sItemType === 'constructor') { $A.Continue(); }

			var sName = oItem.name;
			var sHighlightName = highlightMatch(sName, sValue);
			if (sHighlightName) {
				
				oResult = oResult || {};
				
				var aItemList = oResult[sItemType] = oResult[sItemType] || [];
				aItemList.push(oItem);
				
			}
			
		});

		return oResult;		
		
	}
	
	$Element(elField).attach('keyup', find);
	find();
	
};

var DOCS = function(sRootPath) {
	
	var oBlinkTrans = new jindo.Transition({ fEffect : jindo.Effect.mirror }).fps(15);
	var oMoveTrans = new jindo.Transition({ fEffect : jindo.Effect.easeIn }).fps(30);
	
	var elLastTarget = null;
	
	var fpBlinkEnd = function() {
		if (!elLastTarget) { return; }
		elLastTarget.style.background = '';		
	};
	
	oBlinkTrans.attach('end', fpBlinkEnd);
	oBlinkTrans.attach('abort', fpBlinkEnd);
	
	oMoveTrans.attach('end', function() {
		if (!elLastTarget) { return; }
		oBlinkTrans.start(500, elLastTarget, {
			'@backgroundColor' : [ '#ffffff', '#ffff00' ]
		});
	});
	
	sRootPath = sRootPath.replace(/&#x([a-f0-9]+);/gi, function(_, sCode) {
		return String.fromCharCode(parseInt(sCode, 16));
	});
	
	$Ajax(sRootPath + '/data.json', {
		type : 'xhr',
		method : 'get',
		async : false,
		onload : function(oRes) {
			SEARCH.data = oRes.json();
		}
	}).request();
	
	var oSearchTab = TAB($('left-columns'), true);
	var oDocTab = TAB($('docs-main'));
	
	oSearchTab.set('tag', true);
	oDocTab.set('index');
	
	SEARCH($('left-columns'), oSearchTab, sRootPath);
	
	HASH(function(sHash) {
		
		var sType = 'index';
		var sName = '';
		
		if (/^(\w+?)(_(\w+))?$/.test(sHash)) {
			sType = RegExp.$1 || sType;
			sName = RegExp.$3 || sName;
		}
		
		oDocTab.set(sType);
		
		var welTarget = $Element('el-' + (sHash || 'top'));
		if (welTarget) {
			
			var nTargetTop = welTarget.offset().top - 10;
			
			var nScrollTop = $Document().scrollPosition().top;
			var nClientHeight = $Document().clientSize().height;
			
			if (nTargetTop < nScrollTop || nScrollTop + nClientHeight < nTargetTop) {
				
				oMoveTrans.start(Math.min(1000, Math.abs(nTargetTop - nScrollTop) / 5), {
					setter : function(k, v) {
						document.body[k] = document.documentElement[k] = v;
					},
					getter : function(k) {
						return document.body[k] || document.documentElement[k];
					}
				}, {
					'scrollTop' : [ nScrollTop, nTargetTop ]
				});
			
				oBlinkTrans.abort();

			} else {

				oBlinkTrans.abort();
				oBlinkTrans.start(500, welTarget.$value(), {
					'@backgroundColor' : [ '#ffffff', '#ffff00' ]
				});
				
			}

			elLastTarget = welTarget.$value();
			
		}

		// console.log([ sType, sName ]);
		
	});

};
