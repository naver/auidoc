YUI.add('microtemplate', function(Y) {
    
    var meta = {
        PART : function(name, data) {
            var lists = arguments.callee.lists;
            var html = lists[name] || '';
            return Y.MicroTemplate.compile(html)(data);
        }    
    };
    
    meta.PART.lists = {};

    Y.MicroTemplate = {
        
        registerHelper : function(name, func) {
            meta[name] = func;
        },
        
        registerPartial : function(name, source) {
            meta.PART.lists[name] = source;
        },
        
        compile : function(str) {
    
    		var varname = 'p' + new Date().getTime();
    		var code = 'var '+varname+'=[],print=function(){'+varname+'.push.apply('+varname+',arguments);};';
    		
    		str = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/(\r)?\n/g, '\\n');
    		
    		str = varname+'.push("' + str + '");';
    		str = str.replace(/<%(.*?)%>/g, function(_, code) {
    			code = code.replace(/\\([\\n"])/g, function(_, chr) { return chr === 'n' ? '\n' : chr; });
    			if (/^=(.*)$/.test(code)) { return '"+' + RegExp.$1 + '+"'; }
    			return '");' + code + ''+varname+'.push("';
    		});
    		
    		code += 'with(o'+varname+') { '+str+' } return '+varname+'.join("");';
    		
    		var compiled = new Function('o'+varname, code);
    		
    		return function(data) {
    		    return compiled.call(data, meta);
    		};
            
        }
        
    };

});
