YUI.add('microtemplate', function(Y) {
	
	var meta = {
		
		INCLUDE : function(name, data, metaAddon) {
			var lists = arguments.callee.lists;
			var html = lists[name] || '';
			
			meta.addon = metaAddon || {};
			
			return Y.MicroTemplate.compile(html)(data);
		},
		
		EACH : function(arr, func, args) {
			
			if (arr == null) { return; }
			if (!(arr instanceof Array)) { arr = [ arr ]; }
			
			for (var i = 0, len = arr.length; i < len; i++) {
				func.apply(arr[i], args || []);	
			}
			
		},
		
		HAS : function(exp, s) {
			if (exp instanceof Array) {
				return exp.length > 0;	
			}
			
			return !!exp;
		},
		
		HTML : function(s) {
			var entities = {'"':'quot','&':'amp','<':'lt','>':'gt','\'':'#39',' ':'nbsp'};
			return String(s).replace(/[<>&"' ]/g, function(m0){
				return entities[m0]?'&'+entities[m0]+';':m0;
			});
		},
		
		URL : function(s) {
			return encodeURIComponent(s);
		}

	};
	
	function atSee(s) {
		
		return s.replace(/<auidoc:(\w+)(\s+[^>]*)?(>([^<]*)<\/auidoc:(\w+)|\/)>/gi, function(_, tagName, attrs, _, description) {
			
			switch (tagName.toLowerCase()) {
			case 'see':
				var target = "blank";
				var href = (/(^|\s)content='([^']*)'($|\s)/.test(attrs) || /(^|\s)content="([^"]*)"($|\s)/.test(attrs)) && RegExp.$2;
				
				if (typeof description == 'undefined') {
					description = href;
				}
				
		    	if (!/^[a-z]+:\/\//.test(href)) {
		    		href = /#/.test(href) ? href.replace(/#/, '.html#') : href + '.html';
		    		target = "_self";
		    	}
			
				return '<a href="' + href + '" target="' + target + '">' + description + '</a>';
			
			default:
				return _;
			}
		});
    	
    }	
	
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
				if (/^=(=?)(.*)$/.test(code)) {
						return '"+'+ (RegExp.$1 ? 'HTML' : '') + '(' + RegExp.$2 + ')+"';
				}
				return '");' + code + ''+varname+'.push("';
			});
			
			code += 'with(o'+varname+') { '+str+' } return '+varname+'.join("");';
			
			//try {
				var compiled = new Function('o'+varname, code);
			/*} catch(e) {
				console.log('ERRROR', e);
			}*/
			
			return function(data) {
				return atSee(compiled.call(data, meta));
			};
			
		}
		
	};

});
