var APISearch = (function() {

    var MAXIMUM = 15;
    
    var data = {};

    var tabs = [ 'keyword', 'class', /*'module',*/ 'method', 'property', 'attribute', 'event' ];
    var tabIdx = 0;

    var inputNode   = $Element('api-filter'),
        searchingNode = $Element('search-tab'),
        notSearchingNode = $Element('no-search'),
        resultNode  = searchingNode.queryAll('.tc-panel');
        
    searchingNode.hide();

    function toPlural(s) {
        
        var p = s + 's'; 
        
        return {
            'classs' : 'classes',
            'propertys' : 'properties',
            'attributes' : 'attrs'            
        }[p] || p;
        
    }
    
    function changeTab(idx) {
        tabIdx = idx;
        refreshResults();
    }
    
    function highlightMatch(sStr, sNeedle) {
        
        var bMatch = false;
        var sRegNeedle = sNeedle.replace(/([\?\.\*\+\-\/\(\)\{\}\[\]\:\!\^\$\\\|])/g, "\\$1");
        
        var sRet = sStr.replace(new RegExp(sRegNeedle, 'i'), function(_) {
            bMatch = true;
            return '<strong>' + _ + '</strong>';
        });
        
        return bMatch ? sRet : null;
        
    }

    function getResults(data, field, value) {
        
        var result = null;
        if (!value) { return result; }
        
        var field = toPlural(field);
        
        var lists = data.detail[field] || [];
        for (var i = 0, len = lists.length; i < len; i++) {
            
            var item = lists[i];
            var matchName = highlightMatch(item.name, value);
            
            if (!matchName) { continue; }
            
            item.matchName = matchName;
            
            result = result || [];
            result.push(item);
            
            if (result.length === MAXIMUM) {
                break;
            }
            
        }
        
        return result;
        
    }
    
    function memberAnchor(item, itemtype) {
        switch (itemtype) {
        case 'keyword': case 'class':
            return projectRoot + toPlural(itemtype) + '/' + item.name + '.html';
        }
        
        return projectRoot + 'classes/' + item['class'] + '.html#' + itemtype + '_' + item.name
    }
    
    function memberDetail(item, itemtype) {
        switch (itemtype) {
        case 'keyword':
            var html = [ '<ul>' ];
            for (var i = 0, len = item['class'].length; i < len; i++) {
                html.push('<li>' + item['class'][i] + '</li>');   
            }
            html.push('</ul>');
            return html.join('');  
        
        case 'class':
            return item.description ? '<div class="description">' + item.description.replace(/<[^>]+>/g, '') + '</div>' : '';
        }
        
        return [
            item.description ? '<div class="description">' + item.description.replace(/<[^>]+>/g, '') + '</div>' : '',
            '<span class="className type">&lt;' + item['class'] + '&gt;</span>'
        ].join('');
    }
  
    function refreshResults() {
        
        var value = inputNode.$value().value;
        if (value) {
            searchingNode.show();
            notSearchingNode.hide();
        } else {
            searchingNode.hide();
            notSearchingNode.show();
        }
        
        var html = [];

        var type = tabs[tabIdx];
        var results = getResults(data, type, value) || [];
        for (var j = 0, cnt = results.length; j < cnt; j++) {
            
            var item = results[j];
            
            html.push([
                '<li class="result">',
                    '<a href="' + memberAnchor(item, type) + '">',
                        '<h5 class="title">' + item.matchName + '</h5>',
                        '<span class="flag category">' + type + '</span>',
                        memberDetail(item, type),
                    '</a>',
                '</li>'
            ].join(''));
        }
        
        if (!results.length) {
            html.push('<li class="no-result">검색 결과가 없습니다.</li>');   
        }
        
        resultNode[tabIdx].html(html.join(''));        
        
    }
    
    function setData(_data) {
        data = _data;
    }
    
    inputNode.attach('keyup', refreshResults);
    inputNode.attach('click', refreshResults);
    
    setTimeout(function() { refreshResults(); }, 0);
    
    //////////////////////////////////////////
    
    var oTab = new jindo.TabControl('search-tab').attach({
        select : function(oCustomEvent) {
            changeTab(oCustomEvent.nIndex);            
        }
    });
    
    return {
        setData : setData
    };
    
})();