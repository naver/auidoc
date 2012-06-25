YUI.add('docs-search', function(Y) {

    var Search      = Y.namespace('Search'),
        inputNode   = Y.one('#search-filter'),
        resultNode  = Y.one('#search-result'),
        classesNode = Y.one('#all-classes');
    
    var data = Y.YUIDoc;
    var maximum = 5;
    
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
        
        var lists = data.detail[field] || [];
        for (var i = 0, len = lists.length; i < len; i++) {
            
            var item = lists[i];
            var matchName = highlightMatch(item.name, value);
            
            if (!matchName) { continue; }
            
            item.matchName = matchName;
            
            result = result || [];
            result.push(item);
            
            if (result.length === 5) {
                break;
            }
            
        }
        
        return result;
        
    }

    inputNode.on('keyup', function(evt) {
        
        var value = this._node.value;
        
        var result;
        
        var html = [];
        var fields = [ 'tags', 'classes', 'modules', 'methods', 'properties', 'attrs', 'events' ];
        
        var typeDetails = {
            'tags' : function(item) {
                var html = [ '<h3>' + item.matchName + '</h3>' ];
                return html.join('');  
            },
            'classes' : function(item) {
                return '<h3 class="title">' + item.matchName + '<h3>';  
            },
            'modules' : function(item) {
                return item.matchName + ' 클래스';  
            },
            'methods' : function(item) {
                return item.matchName + ' 클래스';  
            },
            'properties' : function(item) {
                return item.matchName + ' 클래스';  
            },
            'attrs' : function(item) {
                return item.matchName + ' 클래스';  
            },
            'events' : function(item) {
                return item.matchName + ' 클래스';  
            }
        };
        
        for (var i = 0, len = fields.length; i < len; i++) {
            
            var field = fields[i];
            result = getResults(data, field, value);
            
            if (!result) { continue; }
             
            html.push('<ul class="search">');
            for (var j = 0, cnt = result.length; j < cnt; j++) {
                
                var item = result[j];
                
                html.push([
                    '<li class="result">',
                        '<a href="#">',
                            '<h3 class="title">' + item.matchName + '</h3>',
                            '<span class="type">' + field + '</span>',
                            '<div class="description">테스트입니다' + /*typeDetails[field](result[j]) + */ '</div>',
                            '<span class="className">jindo.className</span>',
                        '</a>',
                    '</li>'
                ].join(''));
            }
            html.push('</ul>');
            
        }
        
        resultNode.setHTML(html.join(''));
        console.dir(result);
        
    });
    
        
}, '0.0.9', {
    requires : [ ]
});
