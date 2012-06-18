YUI.add('microtemplate', function(Y) {
    
    var meta = {
        INCLUDE : function(name, data) {
            var lists = arguments.callee.lists;
            var html = lists[name] || '';
            return Y.MicroTemplate.compile(html)(data);
        },
        
        EACH : function(arr, func, args) {
        	var arr = arr instanceof Array ? arr : [ arr ];
        	for (var i = 0, len = arr.length; i < len; i++) {
        		func.apply(arr[i], args || []);	
        	}
        },
        
        HAS : function(exp, s) {
        	if (exp instanceof Array) {
        		console.log('###', s, exp.length);
        		return exp.length > 0;	
        	}
        	
        	return !!exp;
        } 
    };
    
    meta.INCLUDE.lists = {};

    Y.MicroTemplate = {
        
        registerHelper : function(name, func) {
            meta[name] = func;
        },
        
        registerPartial : function(name, source) {
            meta.INCLUDE.lists[name] = source;
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
    		
    		//try {
    			var compiled = new Function('o'+varname, code);
    		/*} catch(e) {
    			console.log('ERRROR', e);
    		}*/
    		
    		return function(data) {
    		    return compiled.call(data, meta);
    		};
            
        }
        
    };

});
