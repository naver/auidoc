/*
Copyright (c) 2011, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var MD = require("node-markdown").Markdown,
	fs = require('graceful-fs'),
	noop = function() {},
	path = require('path'),
	DEFAULT_RETURN_TAGS = 'code|em|strong|span|a|pre|dl|dd|dt|ul|li|ol',
	TEMPLATE;

/**
* Takes the `JSON` data from the `DocParser` class, creates and parses markdown and handlebars
based templates to generate static HTML content
* @class DocBuilder
* @module yuidoc
*/

function mkdirRecursiveSync(path, mode) {
	
	var paths = path.split(/[\\\/]/);
	var p = '';
	
	for (var i = 0, len = paths.length; i < len; i++) {
		p += paths[i] + '/';
		try { fs.mkdirSync(p, mode); } catch(e) {
			if (e.code !== 'EEXIST') { throw e; }
		}	
	}
	
}

YUI.add('doc-builder', function(Y) {
	
	var templateEngines = {
		'handlebars' : {
			engine : Y.Handlebars,
			include : function(s) { return '{{>' + s + '}}'; }
		},
		'microtemplate' : {
			engine : Y.MicroTemplate,
			include : function(s) { return '<%=INCLUDE("' + s + '", this)%>'; }
		} 
	}
	
	var TMPL_ENGINE, TMPL_INCLUDE;
	
	var fixType = Y.Lang.fixType,
	print = function(items) {
		var out = '<ul>';

		Y.each(items, function(i, k) {
			out += '<li>';
			if (Y.Lang.isObject(i)) {
				if (!i.path) {
					out += k + '/' + print(i);
				} else {
					out += '<a href="../files/' + i.name + '.html">' + k + '</a>';
				}
			}
			out += '</li>';
		});

		out += '</ul>';
		return out;
	};

	var DEFAULT_THEME = themeDir = path.join(__dirname, '../', 'themes', 'default');

	Y.DocBuilder = function(options, data) {

		this.options = options;
		
		var templateEngine = templateEngines[this.options.template] || templateEngines.microtemplate;
		
		TMPL_ENGINE = templateEngine.engine;
		TMPL_INCLUDE = templateEngine.include;
		
		if (options.helpers) {
			this._addHelpers(options.helpers);
		}
		if (options.themedir) {
			themeDir = options.themedir;
		}
		
		TMPL_ENGINE.registerHelper('buildFileTree', function(items, fn) {
			return print(items);
		});
		
		this.data = data;
		Y.log('Building..', 'info', 'builder');
		this.files = 0;
		var self = this;
		
		var arrayWalk = function(func, self, args) {
			
			// args = Array.prototype.slice.apply(args);

			var items = args[0];
			
			if (items instanceof Array) {
				var ret = [];
				for (var i = 0, len = items.length; i < len; i++) {
					args[0] = items[i];
					ret.push(func.apply(self, args));
				}
				return ret;
			}
			
			return null;
			
		};

		TMPL_ENGINE.registerHelper('crossLink', function(item, fn) {
			
			var ret;
			if (ret = arrayWalk(arguments.callee, this, arguments)) { return ret; }
			
			var str = '';
			if (!item) {
				item = '';
			}
			//console.log('CrossLink:', item);
			if (item.indexOf('|') > 0) {
				var parts = item.split('|'),
				p = [];
				Y.each(parts, function(i) {
					p.push(self._parseCrossLink.call(self, i));
				});
				str = p.join(' | ');
			} else {
				str = self._parseCrossLink.call(self, item);
			}
			return str;
		});

		TMPL_ENGINE.registerHelper('crossLinkModule', function(item, fn) {

			var ret;
			if (ret = arrayWalk(arguments.callee, this, arguments)) { return ret; }
			
			var str = item;
			if (self.data.modules[item]) {
				str = '<a href="../modules/' + item.replace('/', '_') +
					  '.html">' + item + '</a>';
			}
			return str;
		});

		TMPL_ENGINE.registerHelper('crossLinkRaw', function(item, fn) {

			var ret;
			if (ret = arrayWalk(arguments.callee, this, arguments)) { return ret; }
			
			var str = '';
			if (!item) {
				item = '';
			}
			if (item.indexOf('|') > 0) {
				var parts = item.split('|'),
				p = [];
				Y.each(parts, function(i) {
					p.push(self._parseCrossLink.call(self, i, true));
				});
				str = p.join(' | ');
			} else {
				str = self._parseCrossLink.call(self, item, true);
			}
			return str;
		});

		this.cacheTemplates = true;
		if (options.cacheTemplates === false) {
			this.cacheTemplates = false;
		}

	};

	Y.DocBuilder.prototype = {
		/**
		* Register a `Y.Handlebars` helper method
		* @method _addHelpers
		* @param {Object} helpers Object containing a hash of names and functions
		*/
		_addHelpers: function(helpers) {
			Y.log('Importing helpers: ' + helpers, 'info', 'builder');
			helpers.forEach(function(imp) {
				if (!Y.Files.exists(imp) || Y.Files.exists(path.join(process.cwd(), imp))) {
					imp= path.join(process.cwd(), imp);
				}
				var h = require(imp);
				Object.keys(h).forEach(function(name) {
					TMPL_ENGINE.registerHelper(name, h[name]);
				});
			});
		},
		/**
		* Wrapper around the Markdown parser so it can be normalized or even side stepped
		* @method markdown
		* @private
		* @param {String} md The Markdown string to parse
		* @param {Boolean} def Only allow default set of HTML tags
		* @param {Array} tags An array of tags to allow
		* @return {HTML} The rendered HTML
		*/
		markdown: function(md, def, tags) {
			html = MD(md, def, tags);
			/*
			if (html.indexOf('{{#') > -1) { //Only reprocess with Handlebars if we see a helper
				//console.log('MD: ', html);
				html = (TMPL_ENGINE.compile(html))({});
				//console.log('HB: ', html);
			}
			*/
			return html;
		},
		
		nothing: function(s) {
			return s; // this.markdown.apply(this, arguments);;
		},
		
		/**
		* Parse the item to be cross linked and return an HREF linked to the item
		* @method _parseCrossLink
		* @private
		* @param {String} item The item to crossLink
		* @param {Boolean} [raw=false] Do not wrap it in HTML
		*/
		_parseCrossLink: function(item, raw) {
			
			var self = this;
			var base = '../',
				baseName = item,
				newWin = false,
				className = 'crosslink';

			item = fixType(item);

			item = baseItem = Y.Lang.trim(item.replace('{', '').replace('}', ''));
			//Remove Cruft
			item = item.replace('*', '').replace('[', '').replace(']', '');
			var link = false,
				href;

			if (self.data.classes[item]) {
				link = true;
			} else {
				if (self.data.classes[item.replace('.', '')]) {
					link = true;
					item = item.replace('.', '');
				}
			}
			if (self.options.externalData) {
				if (self.data.classes[item]) {
					if (self.data.classes[item].external) {
						href = self.data.classes[item].path;
						base = self.options.externalData.base;
						className += ' external';
						newWin = true;
						link = true;
					}
				}
			}

			if (item.indexOf('/') > -1) {
				//We have a class + method to parse
				var parts = item.split('/'),
					cls = parts[0],
					method = parts[1];

				if (cls && method) {
					if (self.data.classes[cls]) {
						self.data.classitems.forEach(function(i) {
							if (i.itemtype === 'method' && i.name === method && i.class === cls) {
								link = true;
								baseItem = method;
								href = path.join(base, 'classes', cls + '.html#method_' + method);
							}
						});
					}
				}

			}

			if (item === 'Object' || item === 'Array') {
				link = false;
			}
			if (!href) {
				href = path.join(base, 'classes', item + '.html');
				if (base.match(/^https?:\/\//)) {
					href = base + path.join('classes', item + '.html');
				}
			}
			if (!link && self.options.linkNatives) {
				if (self.NATIVES && self.NATIVES[item]) {
					href = self.NATIVES_LINKER(item);
					if (href) {
						className += ' external';
						newWin = true;
						link = true;
					}
				}
			}
			
			var typeDesc;
			
			if (link) {
				item = '<a href="' + href + '" class="' + className + '"' + ((newWin) ? ' target="_blank"' : '') + '>' + baseItem + '</a>';
			} else if (typeDesc = this.options.types[baseItem]) {
				item = '<a href="#" onclick="return false;" title="' + typeDesc + '">' + baseItem + '</a>';	
			}
			 
			return (raw) ? href : item;
		},
		/**
		* List of native types to cross link to MDN
		* @property NATIVES
		* @type Object
		*/
		NATIVES: {
			'Array': 1,
			'Boolean': 1,
			'Date': 1,
			'decodeURI': 1,
			'decodeURIComponent': 1,
			'encodeURI': 1,
			'encodeURIComponent': 1,
			'eval': 1,
			'Error': 1,
			'EvalError': 1,
			'Function': 1,
			'Infinity': 1,
			'isFinite': 1,
			'isNaN': 1,
			'Math': 1,
			'NaN': 1,
			'Number': 1,
			'Object': 1,
			'parseFloat': 1,
			'parseInt': 1,
			'RangeError': 1,
			'ReferenceError': 1,
			'RegExp': 1,
			'String': 1,
			'SyntaxError': 1,
			'TypeError': 1,
			'undefined': 1,
			'URIError': 1,
			'HTMLElement': 'https:/'+'/developer.mozilla.org/en/Document_Object_Model_(DOM)/',
			'HTMLCollection': 'https:/'+'/developer.mozilla.org/en/Document_Object_Model_(DOM)/',
			'DocumentFragment': 'https:/'+'/developer.mozilla.org/en/Document_Object_Model_(DOM)/',
			'HTMLDocument': 'https:/'+'/developer.mozilla.org/en/Document_Object_Model_(DOM)/'
		},
		/**
		* Function to link an external type uses `NATIVES` object
		* @method NATIVES_LINKER
		* @private
		* @param {String} name The name of the type to link
		* @return {String} The combined URL
		*/
		NATIVES_LINKER: function(name) {
			var url = 'https:/'+'/developer.mozilla.org/en/JavaScript/Reference/Global_Objects/';
			if (this.NATIVES[name] !== 1) {
				url = this.NATIVES[name];
			}
			return url + name;
		},
		/**
		* Mixes the various external data soures together into the local data, augmenting 
		* it with flags.
		* @method _mixExternal
		* @private
		*/
		_mixExternal: function() {
			var self = this;
			Y.log('External data received, mixing', 'info', 'builder');
			self.options.externalData.forEach(function(exData) {
			
				['files', 'classes', 'modules'].forEach(function(k) {
					Y.each(exData[k], function(item, key) {
						item.external = true;
						var file = item.name;
						if (!item.file) {
							file = self.filterFileName(item.name);
						}
						
						if (item.type) {
							item.type = fixType(item.type);
						}

						item.path = exData.base + path.join(k, file + '.html');

						self.data[k][key] = item;
					});
				});
				Y.each(exData.classitems, function(item) {
					item.external = true;
					item.path = exData.base + path.join('files', self.filterFileName(item.file) + '.html');
					if (item.type) {
						item.type = fixType(item.type);
					}
					if (item.params) {
						item.params.forEach(function(p) {
							if (p.type) {
								p.type = fixType(p.type);
							}
						});
					}
					if (item.return) {
						item.return.type = fixType(item.return.type);
					}
					self.data.classitems.push(item);
				});
			});
		},
		/**
		* Fetches the remote data and fires the callback when it's all complete
		* @method mixExternal
		* @param {Callback} cb The callback to execute when complete
		* @async
		*/
		mixExternal: function(cb) {
			var self = this,
				info = self.options.external;

			if (!info) {
				cb();
				return;
			}
			if (!info.merge) {
				info.merge = 'mix';
			}
			if (!info.data) {
				Y.log('External config found but no data path defined, skipping import.', 'warn', 'builder');
				cb();
				return;
			}
			if (!Y.Lang.isArray(info.data)) {
				info.data = [ info.data ];
			}
			Y.log('Importing external documentation data.', 'info', 'builder');
			
			var stack = new Y.Parallel();
			info.data.forEach(function(i) {
				var base;
				if (i.match(/^https?:\/\//)) {
					base = i.replace('data.json', '');
					Y.use('io-base', stack.add(function() {
						Y.log('Fetching: ' + i, 'info', 'builder');
						Y.io(i, {
							on: {
								complete: stack.add(function(id, e) {
									Y.log('Received: ' + i, 'info', 'builder');
									var data = JSON.parse(e.responseText);
									data.base = base;
									//self.options.externalData = Y.mix(self.options.externalData || {}, data);
									if (!self.options.externalData) {
										self.options.externalData = [];
									}
									self.options.externalData.push(data);
								})
							}
						});
					}));
				} else {
					base = path.dirname(path.resolve(i));
					var data = Y.Files.getJSON(i);
					data.base = base;
					//self.options.externalData = Y.mix(self.options.externalData || {}, data);
					if (!self.options.externalData) {
						self.options.externalData = [];
					}
					self.options.externalData.push(data);
				}
			});

			stack.done(function() {
				Y.log('Finished fetching remote data', 'info', 'builder');
				self._mixExternal();
				cb();
			});
		},
		/**
		* The default tags to use in return descriptions (for Markdown).
		* @property defaultReturnTags
		* @type String
		*/
		defaultReturnTags: DEFAULT_RETURN_TAGS,
		/**
		* The default tags to use in params descriptions (for Markdown).
		* @property defaultTags
		* @type String
		*/
		defaultTags: 'p|' + DEFAULT_RETURN_TAGS,
		/**
		* File counter
		* @property files
		* @type Number
		*/
		files: null,
		/**
		* Holder for project meta data
		* @property _meta
		* @type Object
		* @private
		*/
		_meta: null,
		/**
		* Prep the meta data to be fed to Selleck
		* @method getProjectMeta
		* @return {Object} The project metadata
		*/
		getProjectMeta: function() {
			var obj = {
				meta: {
					yuiSeedUrl: 'http://yui.yahooapis.com/3.5.0/build/yui/yui-min.js',
					yuiGridsUrl: 'http://yui.yahooapis.com/3.5.0/build/cssgrids/cssgrids-min.css'
				}
			};
			if (!this._meta) {
				try {
					var meta,
						theme = path.join(themeDir, 'theme.json');
					if (Y.Files.exists(theme)) {
						Y.log('Loading theme from ' + theme, 'info', 'builder');
						meta = Y.Files.getJSON(theme);
					} else if (DEFAULT_THEME !== themeDir) {
						theme = path.join(DEFAULT_THEME, 'theme.json')
						if (Y.Files.exists(theme)) {
							Y.log('Loading theme from ' + theme, 'info', 'builder');
							meta = Y.Files.getJSON(theme);
						}
					}

					if (meta) {
						obj.meta = meta;
						this._meta = meta;
					}
				} catch (e) {
					console.error('Error', e);
				}
			} else {
				obj.meta = this._meta;
			}
			Y.each(this.data.project, function(v, k) {
				var key = k.substring(0, 1).toUpperCase() + k.substring(1, k.length);
				obj.meta['project' + key] = v;
			});
			return obj
		},
		/**
		* Populate the meta data for classes
		* @method populateClasses
		* @param {Object} opts The original options
		* @return {Object} The modified options
		*/
		populateClasses: function(opts) {
			opts.meta.classes = [];
			Y.each(this.data.classes, function(v) {
				if (v.external) { return }
				opts.meta.classes.push({ displayName: v.name, name: v.name, description : v.description, screenshots : v.screenshots, extends : v.extends, details : v });
			});
			this.sortLists(opts.meta.classes);
			return opts;
		},
		/**
		* Populate the meta data for modules
		* @method populateModules
		* @param {Object} opts The original options
		* @return {Object} The modified options
		*/
		populateModules: function(opts) {
			var self = this;
			opts.meta.modules = [];
			opts.meta.allModules = [];
			Y.each(this.data.modules, function(v) {
				if (v.external) { return }
				opts.meta.allModules.push({ displayName: v.displayName || v.name, name: self.filterFileName(v.name), description: v.description });
				if (!v.is_submodule) {
					var o = { displayName: v.displayName || v.name, name: self.filterFileName(v.name) };
					if (v.submodules) {
						o.submodules = [];
						Y.each(v.submodules, function(i, k) {
							moddef = self.data.modules[k];
							if (moddef) {
								o.submodules.push({
									displayName: k,
									description: moddef.description
								});
							} else {
								//Y.log('Submodule data missing: ' + k + ' for ' + v.name, 'warn', 'builder');
							}
						});
						self.sortLists(o.submodules);
					}
					opts.meta.modules.push(o);
				}
			});
			this.sortLists(opts.meta.modules);
			this.sortLists(opts.meta.allModules);
			return opts;
		},
		/**
		* Populate the meta data for keywords
		* @method populateKeywords
		* @param {Object} opts The original options
		* @return {Object} The modified options
		*/
		populateKeywords: function(opts) {
			opts.meta.keywords = [];
			Y.each(this.data.keywords, function(v) {
				if (v.external) { return }
				opts.meta.keywords.push({ displayName: v.name, name: v.name});
			});
			this.sortLists(opts.meta.keywords);
			return opts;
		},
		/**
		* Populate the meta data for files
		* @method populateFiles
		* @param {Object} opts The original options
		* @return {Object} The modified options
		*/
		populateFiles: function(opts) {
			var self = this;
			opts.meta.files = [];
			Y.each(this.data.files, function(v) {
				if (v.external) { return }
				opts.meta.files.push({ displayName: v.name, name: self.filterFileName(v.name), path: v.path || v.name });
			});

			var tree = {};
			var files = [];
			Y.each(this.data.files, function(v) {
				if (v.external) { return }
				files.push(v.name);
			});
			files.sort();
			Y.each(files, function(v) {
				var p = v.split('/'),
					par;
				p.forEach(function(i, k) {
					if (!par) {
						if (!tree[i]) {
							tree[i] = {};
						}
						par = tree[i];
					} else {
						if (!par[i]) {
							par[i] = {};
						}
						if (k + 1 === p.length) {
							par[i] = {
								path: v,
								name: self.filterFileName(v)
							};
						}
						par = par[i];
					}
				});
			});

			opts.meta.fileTree = tree;

			return opts;
		},
		/**
		* Parses file and line number from an item object and build's an HREF
		* @method addFoundAt
		* @param {Object} a The item to parse
		* @return {String} The parsed HREF
		*/
		addFoundAt: function(a) {
			var self = this;
			if (a.file && a.line && !self.options.nocode) {
				a.foundAt = '../files/' + self.filterFileName(a.file) + '.html#l' + a.line;
				if (a.path) {
					a.foundAt = a.path + '#l' + a.line;   
				}
			}
			return a;
		},
		/**
		* Augments the **DocParser** meta data to provide default values for certain keys as well as parses all descriptions
		* with the `Markdown Parser`
		* @method augmentData
		* @param {Object} o The object to recurse and augment
		* @return {Object} The augmented object
		*/
		augmentData: function(o) {
			var self = this;
			o = self.addFoundAt(o);
			Y.each(o, function(i, k1) {
				if (i && i.forEach) {
					Y.each(i, function(a, k) {
						if (!(a instanceof Object)) {
							return;
						}
						if (!a.type) {
							a.type = 'Object'; //Default type is Object
						}
						if (a.final === '') {
							a.final = true;
						}
						if (!a.description) {
							a.description = ' ';
						} else {
							//a.description = self.nothing(a.description, true, self.defaultTags);
							a.description = self.nothing(a.description);
						}
						if (a.example) {
							a.example = self.nothing(a.example, true, self.defaultTags);
						}
						a = self.addFoundAt(a);

						Y.each(a, function(c, d) {
							if (c.forEach || (c instanceof Object)) {
								c = self.augmentData(c);
								a[d] = c;
							}
						});

						o[k1][k] = a;
					});
				} else if (i instanceof Object) {
					i = self.addFoundAt(i);
					Y.each(i, function(v, k) {
						if (k === 'final') {
							o[k1][k] = true;
						}
						if (k === 'description' || k === 'example') {
							if (k1 === 'return') {
								o[k1][k] = self.nothing(v, true, self.defaultReturnTags);
							} else if (v.forEach || (v instanceof Object)) {
								o[k1][k] = self.augmentData(v);
							} else {
								//o[k1][k] = nothing(v, true, self.defaultTags);
								o[k1][k] = self.nothing(v);
							}
						}
					});
				} else if (k1 === 'description' || k1 === 'example') {
					//o[k1] = nothing(i, true, self.defaultTags);
					o[k1] = self.nothing(i);;
				}
			});
			return o;
		},
		/**
		* Makes the default directories needed
		* @method makeDirs
		* @param {Callback} cb The callback to execute after it's completed
		*/
		makeDirs: function(cb) {
			var self = this;
			var dirs = ['classes', 'modules', 'files', 'keywords'];
			if (self.options.dumpview) {
				dirs.push('json');
			}
			var writeRedirect = function(dir, file, cb) {
				Y.Files.exists(file, function(x) {
					if (x) {
						var out = path.join(dir, 'index.html');
						fs.createReadStream(file).pipe(fs.createWriteStream(out));
					}
					cb();
				});
			};
			var defaultIndex = path.join(themeDir, 'assets', 'index.html');
			var stack = new Y.Parallel();
			Y.log('Making default directories: ' + dirs.join(','), 'info', 'builder');
			dirs.forEach(function(d) {
				var dir = path.join(self.options.outdir, d);
				Y.Files.exists(dir, stack.add(function(x) {
					if (!x) {
						fs.mkdir(dir, 0777, stack.add(function() {
							writeRedirect(dir, defaultIndex, stack.add(noop));
						}));
					} else {
						writeRedirect(dir, defaultIndex, stack.add(noop));
					}
				}));
			});
			stack.done(function() {
				if (cb) {
					cb();
				}
			});
		},
		/**
		* Parses `<pre><code>` tags and adds the __prettyprint__ `className` to them
		* @method _parseCode
		* @private
		* @param {HTML} html The HTML to parse
		* @return {HTML} The parsed HTML
		*/
		_parseCode: function (html) {
			html = html || '';
			html = html.replace(/<pre><code>/g, '<pre class="code"><code class="prettyprint">');
			return html;
		},
		/**
		* Ported from [Selleck](https://github.com/rgrove/selleck), this handles ```'s in fields
		that are not parsed by the **Markdown** parser.
		* @method _inlineCode
		* @private
		* @param {HTML} html The HTML to parse
		* @return {HTML} The parsed HTML
		*/
		_inlineCode: function(html) {
			html = html.replace(/\\`/g, '__{{SELLECK_BACKTICK}}__');

			html = html.replace(/`(.+?)`/g, function (match, code) {
				return '<code>' + Y.escapeHTML(code) + '</code>';
			});

			html = html.replace(/__\{\{SELLECK_BACKTICK\}\}__/g, '`');

			return html;
		},
		/**
		* Ported from [Selleck](https://github.com/rgrove/selleck)
		Renders the handlebars templates with the default View class.
		* @method render
		* @param {HTML} source The default template to parse
		* @param {Class} view The default view handler
		* @param {HTML} [layout=null] The HTML from the layout to use.
		* @param {Object} [partials=object] List of partials to include in this template
		* @param {Callback} callback
		* @param {Error} callback.err
		* @param {HTML} callback.html The assembled template markup
		*/
		render: function(source, view, layout, partials, callback) {
			var html = [];

			function buffer(line) {
				html.push(line);
			}

			// Allow callback as third or fourth param.
			if (typeof partials === 'function') {
				callback = partials;
				partials = {};
			} else if (typeof layout === 'function') {
				callback = layout;
				layout = null;
			}
			
			var parts = Y.merge(partials || {}, { layout_content: source });
			Y.each(parts, function(source, name) {
				TMPL_ENGINE.registerPartial(name, source);
			});

			if (!TEMPLATE || !this.cacheTemplates) {
				TEMPLATE = TMPL_ENGINE.compile(layout);
			}


			var _v = {};
			for (var k in view) {
				if (Y.Lang.isFunction(view[k])) {
					_v[k] = view[k]();
				} else {
					_v[k] = view[k];
				}
			};
			html = TEMPLATE(_v);
			//html = html.replace(/{{&#x2F;/g, '{{/');

			
			//html = (TMPL_ENGINE.compile(html))({});

			html = this._inlineCode(html);
			callback(null, html);
		},
		/**
		* Render the index file
		* @method renderIndex
		* @param {Function} cb The callback fired when complete
		* @param {String} cb.html The HTML to render this view
		* @param {Object} cv.view The View Data
		*/
		renderIndex: function(cb) {
			var self = this;

			Y.prepare([DEFAULT_THEME, themeDir], self.getProjectMeta(), function(err, opts) {
				opts.meta.title = self.data.project.name;
				opts.meta.projectRoot = './';
				opts.meta.projectAssets = './assets';

				opts = self.populateClasses(opts);
				opts = self.populateModules(opts);
				opts = self.populateKeywords(opts);

				var view   = new Y.DocView(opts.meta);
				self.render(TMPL_INCLUDE('index'), view, opts.layouts.main, opts.partials, function(err, html) {
					self.files++;
					cb(html, view);
				});
			});
		},
		/**
		* Generates the index.html file
		* @method writeIndex
		* @param {Callback} cb The callback to execute after it's completed
		*/
		writeIndex: function(cb) {
			var self = this,
				stack = new Y.Parallel();

			Y.log('Preparing index.html', 'info', 'builder');
			self.renderIndex(stack.add(function(html, view) {
				stack.html = html;
				stack.view = view;
				if (self.options.dumpview) {
					Y.Files.writeFile(path.join(self.options.outdir, 'json', 'index.json'), JSON.stringify(view), stack.add(noop));
				}
				Y.Files.writeFile(path.join(self.options.outdir, 'index.html'), html, stack.add(noop));
			}));

			stack.done(function(html, view) {
				Y.log('Writing index.html', 'info', 'builder');
				cb(stack.html, stack.view);
			});
		},


		/**
		* Render a keyword 
		* @method renderKeyword
		* @param {Function} cb The callback fired when complete
		* @param {String} cb.html The HTML to render this view
		* @param {Object} cv.view The View Data
		*/
		renderKeyword: function(cb, data, layout) {
			var self = this;
			var stack = new Y.Parallel();
			
			data.displayName = data.name;
			data.name = self.filterFileName(data.name);
			
			Y.prepare([DEFAULT_THEME, themeDir], self.getProjectMeta(), function(err, opts) {
				
				opts.meta = Y.merge(opts.meta, data);

				//opts.meta.htmlTitle = v.name + ': ' + self.data.project.name;
				opts.meta.title = self.data.project.name;

				opts.meta.keywordName = data.displayName || data.name;
				//opts.meta.keywordDescription = self._parseCode(self.markdown(data.description || ' '));
				//opts.meta.file = data.file;
				//opts.meta.line = data.line;
				//opts.meta = self.addFoundAt(opts.meta);
				opts.meta.projectRoot = '../';
				opts.meta.projectAssets = '../assets';
				
				opts = self.populateClasses(opts);
				opts = self.populateModules(opts);
				opts = self.populateKeywords(opts);
				opts = self.populateFiles(opts);

				if (data.classes && Object.keys(data.classes).length) {
					opts.meta.keywordClasses = [];
					Y.each(Object.keys(data.classes), function(name) {
						var i = self.data.classes[name];
						if (i) {
							opts.meta.keywordClasses.push({ name: i.name, displayName: i.name, description : i.description, screenshots : i.screenshots });
						}
					});
					self.sortLists(opts.meta.keywordClasses);
				}

				var view   = new Y.DocView(opts.meta);
				var mainLayout = opts.layouts[layout];
				self.render(TMPL_INCLUDE('keyword'), view, mainLayout, opts.partials, stack.add(function(err, html) {
					self.files++;
					stack.html = html;
					stack.view = view;
				}));
				
			});

			stack.done(function() {
				cb(stack.html, stack.view);
			});

		},

		/**
		* Generates the keyword files under "out"/keywords/
		* @method writeKeywords
		* @param {Callback} cb The callback to execute after it's completed
		*/
		writeKeywords: function(cb, layout) {
			layout = layout || 'main';
			var self = this,
				stack = new Y.Parallel();
			stack.html = [];
			stack.view = [];
			
			var counter = 0;
				Object.keys(self.data.keywords).forEach(function(k) {
					if (!self.data.keywords[k].external) {
						counter++;
					}
				});
			Y.log('Rendering and writing ' + counter + ' keyword pages.', 'info', 'builder');
			
			Y.each(self.data.keywords, function(v) {
				if (v.external) { return }
				self.renderKeyword(function(html, view) {
					stack.html.push(html);
					stack.view.push(view);
					if (self.options.dumpview) {
						Y.Files.writeFile(path.join(self.options.outdir, 'json', 'keyword_' + v.name + '.json'), JSON.stringify(view), stack.add(noop));
					}
					Y.Files.writeFile(path.join(self.options.outdir, 'keywords', v.name + '.html'), html, stack.add(noop));
				}, v, layout);
			});
			stack.done(function() {
				Y.log('Finished writing keyword files', 'info', 'builder');
				cb(stack.html, stack.view);
			});
		},

		/**
		* Render a module 
		* @method renderModule
		* @param {Function} cb The callback fired when complete
		* @param {String} cb.html The HTML to render this view
		* @param {Object} cv.view The View Data
		*/
		renderModule: function(cb, data, layout) {
			var self = this;
			var stack = new Y.Parallel();

			data.displayName = data.name;
			data.name = self.filterFileName(data.name);
			Y.prepare([DEFAULT_THEME, themeDir], self.getProjectMeta(), function(err, opts) {
				opts.meta = Y.merge(opts.meta, data);

				//opts.meta.htmlTitle = v.name + ': ' + self.data.project.name;
				opts.meta.title = self.data.project.name;

				opts.meta.moduleName = data.displayName || data.name;
				opts.meta.moduleDescription = self._parseCode(self.markdown(data.description || ' '));
				opts.meta.file = data.file;
				opts.meta.line = data.line;
				opts.meta = self.addFoundAt(opts.meta);
				opts.meta.projectRoot = '../';
				opts.meta.projectAssets = '../assets';

				opts = self.populateClasses(opts);
				opts = self.populateModules(opts);
				opts = self.populateKeywords(opts);
				opts = self.populateFiles(opts);

				if (data.classes && Object.keys(data.classes).length) {
					opts.meta.moduleClasses = [];
					Y.each(Object.keys(data.classes), function(name) {
						var i = self.data.classes[name];
						if (i) {
							opts.meta.moduleClasses.push({ name: i.name, displayName: i.name, description : i.description, screenshots : i.screenshots });
						}
					});
					self.sortLists(opts.meta.moduleClasses);
				}
				if (data.example && data.example.length) {
					if (data.example.forEach) {
						var e = '';
						data.example.forEach(function(v) {
							e += self._parseCode(self.markdown(v));
						});
						data.example = e;
					} else {
						data.example = self._parseCode(self.markdown(i.example));
					}
					opts.meta.example = data.example;
				}
				if (data.submodules && Object.keys(data.submodules).length) {
					opts.meta.subModules = [];
					Y.each(Object.keys(data.submodules), function(name) {
						var i = self.data.modules[name];
						if (i) {
							opts.meta.subModules.push({ name: i.name, displayName: i.name, description: i.description });
						}
					});
					self.sortLists(opts.meta.subModules);
				}

				var view   = new Y.DocView(opts.meta);
				var mainLayout = opts.layouts[layout];
				self.render(TMPL_INCLUDE('module'), view, mainLayout, opts.partials, stack.add(function(err, html) {
					self.files++;
					stack.html = html;
					stack.view = view;
				}));
				
				console.log(opts.meta);
			});

			stack.done(function() {
				cb(stack.html, stack.view);
			});

		},
		/**
		* Generates the module files under "out"/modules/
		* @method writeModules
		* @param {Callback} cb The callback to execute after it's completed
		*/
		writeModules: function(cb, layout) {
			layout = layout || 'main';
			var self = this,
				stack = new Y.Parallel();
			stack.html = [];
			stack.view = [];
			
			var counter = 0;
				Object.keys(self.data.modules).forEach(function(k) {
					if (!self.data.modules[k].external) {
						counter++;
					}
				});
			Y.log('Rendering and writing ' + counter + ' modules pages.', 'info', 'builder');
			Y.each(self.data.modules, function(v) {
				if (v.external) { return }
				self.renderModule(function(html, view) {
					stack.html.push(html);
					stack.view.push(view);
					if (self.options.dumpview) {
						Y.Files.writeFile(path.join(self.options.outdir, 'json', 'module_' + v.name + '.json'), JSON.stringify(view), stack.add(noop));
					}
					Y.Files.writeFile(path.join(self.options.outdir, 'modules', v.name + '.html'), html, stack.add(noop));
				}, v, layout);
			});
			stack.done(function() {
				Y.log('Finished writing module files', 'info', 'builder');
				cb(stack.html, stack.view);
			});
		},
		/**
		* Checks an array of items (class items) to see if an item is in that list
		* @method hasProperty
		* @param {Array} a The Array of items to check
		* @param {Object} b The object to find
		* @return Boolean
		*/
		hasProperty: function(a, b) {
			var other = false;
			var h = Y.some(a, function(i, k) {
				if ((i.itemtype === b.itemtype) && (i.name === b.name)) {
					other = k;
					return true;
				}
			});
			return other;
		},
		/**
		* Merge superclass data into a child class
		* @method mergeExtends
		* @param {Object} info The item to extend
		* @param {Array} classItems The list of items to merge in
		*/
		mergeExtends: function(info, classItems) {
			var self = this;
			if (info.extends || info.mixin) {
				var hasItems = {};
				hasItems[info.extends] = 1;
				if (info.mixin) {
					info.mixin.forEach(function(v) {
						hasItems[v] = 1;
					});
				}
				self.data.classitems.forEach(function(v) {
					//console.error(v.class, '==', info.extends);
					if (hasItems[v.class]) {
						if (!v.static) {
							var override = self.hasProperty(classItems, v);
							if (override === false) {
								//This method was extended from the parent class but not over written
								//console.error('Merging extends from', v.class, 'onto', info.name);

								if (v.itemtype !== 'constructor') {
									var q = Y.merge({}, v);
									q.extended_from = v.class;
									
									classItems.push(q);
								}
								
							} else {
								//This method was extended from the parent and overwritten in this class
								var q = Y.merge({}, v);
								q = self.augmentData(q);
								classItems[override].overwritten_from = q;
							}
						}
					}
				});
				if (self.data.classes[info.extends]) {
					if (self.data.classes[info.extends].extends || self.data.classes[info.extends].mixin) {
						//console.error('Stepping down to:', self.data.classes[info.extends]);
						classItems = self.mergeExtends(self.data.classes[info.extends], classItems);
					}
				}
			}
			return classItems;
		},
		/**
		* Render the class file
		* @method renderClass
		* @param {Function} cb The callback fired when complete
		* @param {String} cb.html The HTML to render this view
		* @param {Object} cv.view The View Data
		*/
		renderClass: function(cb, data, layout) {
			var self = this;
			var stack = new Y.Parallel();

			Y.prepare([DEFAULT_THEME, themeDir], self.getProjectMeta(), function(err, opts) {
				//console.log(opts);
				if (err) {
					console.log(err);
				}
				opts.meta = Y.merge(opts.meta, data);

				opts.meta.title = self.data.project.name;
				opts.meta.moduleName = data.name;
				opts.meta.file = data.file;
				opts.meta.line = data.line;
				
				opts.meta.screenshots = data.screenshots;
				opts.meta.demos = data.demos;
				opts.meta.manuals = data.manuals;
				
				opts.meta = self.addFoundAt(opts.meta);
				opts.meta.projectRoot = '../';
				opts.meta.projectAssets = '../assets';

				opts = self.populateClasses(opts);
				opts = self.populateModules(opts);
				opts = self.populateKeywords(opts);
				opts = self.populateFiles(opts);

				opts.meta.classDescription = self._parseCode(self.markdown(data.description || ' '));

				opts.meta.constructors = [];
				opts.meta.methods = [];
				opts.meta.properties = [];
				opts.meta.attrs = [];
				opts.meta.events = [];
				opts.meta.extension_for = null;
				if (data.mixin) {
					opts.meta.mixin = data.mixin;
				}
				if (data.entension_for && data.extension_for.length) {
					opts.meta.extension_for = data.extension_for;
				}

				if (data.extends) {
					opts.meta.extends = data.extends;
				}

				var classItems = [];
				self.data.classitems.forEach(function(i) {
					if (i.class === data.name) {
						classItems.push(i);
					}
				});

				classItems = self.mergeExtends(data, classItems);

				classItems.forEach(function(i) {
					
					var prefix = '';
					
					switch (i.itemtype) {
						case 'constructor':
							prefix = opts.meta.factory ? '' : 'new ';
						
						case 'method':
							i = self.augmentData(i);
							
							if (i.syntax instanceof Array) {
								
								// i.hasParams = true;
								i.paramsList = i.syntax;
								
							} else {
							
								var paramsList = [];
								if (i.params && i.params.forEach) {
									i.params.forEach(function(p, v) {
										var name = p.name;
										/*
										if (p.optional) {
											name = '[' + name + ((p.optdefault) ? '=' + p.optdefault : '') + ']'
										}
										*/
										paramsList.push(name);
									});
								}
	
								// i.hasParams = paramsList.length;
								i.paramsList = [ paramsList.join(', ') || ' ' ];
								
							}
							
							i.syntax = prefix + i.name + '(' + i.paramsList.join(')\n' + prefix + i.name + '(') + ')';

							//i.methodDescription = self._parseCode(self.markdown(i.description || ''));
							i[i.itemtype + 'Description'] = self._parseCode(self.markdown(i.description || ''));
							if (i.example && i.example.length) {
								if (i.example.forEach) {
									var e = '';
									i.example.forEach(function(v) {
										e += self._parseCode(self.markdown(v));
									});
									i.example = e;
								} else {
									i.example = self._parseCode(self.markdown(i.example));
								}
							}
							i.hasAccessType = i.access;
							i.returnType = ' ';
							if (i.return) {
								i.hasReturn = true;
								i.returnType = i.return.type;
							}

							// If this item is provided by a module other
							// than the module that provided the original
							// class, add the original module name to the
							// item's `providedBy` property so we can
							// indicate the relationship.
							if ((i.submodule || i.module) !== (data.submodule || data.module)) {
								i.providedBy = (i.submodule || i.module);
							}

							opts.meta[i.itemtype + 's'].push(i);
							break;
						case 'property':
							i = self.augmentData(i);
							i.propertyDescription = self._parseCode(self.markdown(i.description || ''));
							// i.propertyDescription = self._parseCode(i.description);
							if (!i.type) {
								i.type = 'unknown';
							}
							if (i.final === '') {
								i.final = true;
							}
							if (i.example && i.example.length) {
								if (i.example.forEach) {
									var e = '';
									i.example.forEach(function(v) {
										e += self._parseCode(self.markdown(v));
									});
									i.example = e;
								} else {
									i.example = self._parseCode(self.markdown(i.example));
								}
							}

							// If this item is provided by a module other
							// than the module that provided the original
							// class, add the original module name to the
							// item's `providedBy` property so we can
							// indicate the relationship.
							if ((i.submodule || i.module) !== (data.submodule || data.module)) {
								i.providedBy = (i.submodule || i.module);
							}

							opts.meta.properties.push(i);
							break;

						case 'attribute': // fallthru
						case 'config':
							i = self.augmentData(i);
							i.attrDescription = self._parseCode(self.markdown(i.description || ''));
							// i.attrDescription = self._parseCode(i.description);

							if (i.itemtype === 'config') {
								i.config = true;
							} else {
								i.emit = self.options.attributesEmit;
							}

							if (i.example && i.example.length) {
								if (i.example.forEach) {
									var e = '';
									i.example.forEach(function(v) {
										e += self._parseCode(self.markdown(v));
									});
									i.example = e;
								} else {
									i.example = self._parseCode(self.markdown(i.example));
								}
							}

							// If this item is provided by a module other
							// than the module that provided the original
							// class, add the original module name to the
							// item's `providedBy` property so we can
							// indicate the relationship.
							if ((i.submodule || i.module) !== (data.submodule || data.module)) {
								i.providedBy = (i.submodule || i.module);
							}

							opts.meta.attrs.push(i);
							break;
						case 'event':
							i = self.augmentData(i);
							i.eventDescription = self._parseCode(self.markdown(i.description || ''));
							// i.eventDescription = self._parseCode(i.description);
							i.stoppable = 'stoppable' in i;
							
							if (i.example && i.example.length) {
								if (i.example.forEach) {
									var e = '';
									i.example.forEach(function(v) {
										e += self._parseCode(self.markdown(v));
									});
									i.example = e;
								} else {
									i.example = self._parseCode(self.markdown(i.example));
								}
							}

							// If this item is provided by a module other
							// than the module that provided the original
							// class, add the original module name to the
							// item's `providedBy` property so we can
							// indicate the relationship.
							if ((i.submodule || i.module) !== (data.submodule || data.module)) {
								i.providedBy = (i.submodule || i.module);
							}

							opts.meta.events.push(i);
							break;
					}
				});

				self.sortLists(opts.meta.attrs);
				self.sortLists(opts.meta.events);
				self.sortLists(opts.meta.methods);
				self.sortLists(opts.meta.properties);
				
				if (!opts.meta.methods.length) {
					delete opts.meta.methods;
				}
				if (!opts.meta.properties.length) {
					delete opts.meta.properties;
				}
				if (!opts.meta.attrs.length) {
					delete opts.meta.attrs;
				}
				if (!opts.meta.events.length) {
					delete opts.meta.events;
				}

				var view   = new Y.DocView(opts.meta);
				var mainLayout = opts.layouts[layout];
				self.render(TMPL_INCLUDE('classes'), view, mainLayout, opts.partials, stack.add(function(err, html) {
					self.files++;
					stack.html = html;
					stack.view = view;
					stack.opts = opts;
				}));
			});

			stack.done(function() {
				cb(stack.html, stack.view, stack.opts);
			});
		},
		
		/**
		* Generates the class files under "out"/classes/
		* @method writeClasses
		* @param {Callback} cb The callback to execute after it's completed
		*/
		writeClasses: function(cb, layout) {
			layout = layout || 'main';
			var self = this,
				stack = new Y.Parallel();
			stack.html = [];
			stack.view = [];

			var counter = 0;
				Object.keys(self.data.classes).forEach(function(k) {
					if (!self.data.classes[k].external) {
						counter++;
					}
				});
			Y.log('Rendering and writing ' + counter + ' class pages.', 'info', 'builder');
			Y.each(self.data.classes, function(v) {
				if (v.external) { return }
				self.renderClass(stack.add(function(html, view) {
					stack.html.push(html);
					stack.view.push(view);
					if (self.options.dumpview) {
						Y.Files.writeFile(path.join(self.options.outdir, 'json', 'classes_' + v.name + '.json'), JSON.stringify(view), stack.add(noop));
					}
					Y.Files.writeFile(path.join(self.options.outdir, 'classes', v.name + '.html'), html, stack.add(noop));
				}), v, layout);
			});
			stack.done(function() {
				Y.log('Finished writing class files', 'info', 'builder');
				cb(stack.html, stack.view);
			});
		},
		
		sortLists : function(arr, fCallback) {
			var fCallback = fCallback || this.nameSort;
			for (var i = 0, len = arr.length; i < len; i++) {
				arr[i].__INDEX__ = i;
			}
			arr.sort(fCallback);
		},
		
		/**
		* Sort method of array of objects with a property called __name__
		* @method nameSort
		* @param {Object} a First object to compare
		* @param {Object} b Second object to compare
		* @return {Number} 1, -1 or 0 for sorting.
		*/
		nameSort: function(a, b) {
			
			var compare = function(a, b) {
				
				var a = a || null;
				var b = b || null;
				
				if (a > b) { return 1; }
				if (a < b) { return -1; }
				
				return 0;			
				
			}
			
			var ret = compare(a.name, b.name);
			if (ret) { return ret; }
			
			ret = compare(a.__INDEX__, b.__INDEX__);
			return ret;

		},
		/**
		* Generates the resources under `"out"/resources/`
		* @method writeResources
		* @param {Callback} cb The callback to execute after it's completed
		*/
		writeResources: function(cb, layout) {
			var self = this;
			// Y.Files.copyAssets([self.options.resourcedir], path.join(self.options.outdir, 'resources'), false, function() {});
		},
		/**
		* Render the resource file
		* @method renderResource
		* @param {Function} cb The callback fired when complete
		* @param {String} cb.js The Whatevet to render this view
		*/
		renderResource: function(cb, fileName) {
			var self = this;
			fs.readFile(fileName, Y.rbind(function(err, str) {
				
				if (err) {
					Y.log(err, 'error', 'builder');
					cb(err);
					return;
				}
				cb(str);

			}, this));
		},
		/**
		* Generates the syntax files under `"out"/files/`
		* @method writeFiles
		* @param {Callback} cb The callback to execute after it's completed
		*/
		writeFiles: function(cb, layout) {
			layout = layout || 'main';
			var self = this,
				stack = new Y.Parallel();
			stack.html = [];
			stack.view = [];

			var counter = 0;
				Object.keys(self.data.files).forEach(function(k) {
					if (!self.data.files[k].external) {
						counter++;
					}
				});
			Y.log('Rendering and writing ' + counter + ' source files.', 'info', 'builder');
			Y.each(self.data.files, function(v) {
				if (v.external) { return }
				self.renderFile(stack.add(function(html, view, data) {
					if (!view || !data) {
						return;
					}
					stack.html.push(html);
					stack.view.push(view);
					if (self.options.dumpview) {
						Y.Files.writeFile(path.join(self.options.outdir, 'json', 'files_' + self.filterFileName(data.name) + '.json'), JSON.stringify(view), stack.add(noop));
					}
					Y.Files.writeFile(path.join(self.options.outdir, 'files', self.filterFileName(data.name) + '.html'), html, stack.add(noop));
				}), v, layout);
			});
			stack.done(function() {
				Y.log('Finished writing source files', 'info', 'builder');
				cb(stack.html, stack.view);
			});
		},
		/**
		* Render the source file
		* @method renderFile
		* @param {Function} cb The callback fired when complete
		* @param {String} cb.html The HTML to render this view
		* @param {Object} cv.view The View Data
		*/
		renderFile: function(cb, data, layout) {
			var self = this;
			
			Y.prepare([DEFAULT_THEME, themeDir], self.getProjectMeta(), function(err, opts) {
				if (err) {
					console.log(err);
				}
				if (!data.name) {
					return;
				}

				opts.meta = Y.merge(opts.meta, data);

				opts.meta.title = self.data.project.name;
				opts.meta.moduleName = data.name;
				opts.meta.projectRoot = '../';
				opts.meta.projectAssets = '../assets';

				opts = self.populateClasses(opts);
				opts = self.populateModules(opts);
				opts = self.populateKeywords(opts);
				opts = self.populateFiles(opts);

				opts.meta.fileName = data.name;
				fs.readFile(opts.meta.fileName, 'utf8', Y.rbind(function(err, str, opts, data) {
					if (err) {
						Y.log(err, 'error', 'builder');
						cb(err);
						return;
					}
					opts.meta.fileData = str;
					var view   = new Y.DocView(opts.meta, 'index');
					var mainLayout = opts.layouts[layout];
					self.render(TMPL_INCLUDE('files'), view, mainLayout, opts.partials, function(err, html) {
						self.files++;
						cb(html, view, data);
					});

				}, this, opts, data));
			});

		},
		/**
		* Write the API meta data used for the AutoComplete widget
		* @method writeAPIMeta
		* @param {Callback} cb The callback to execute when complete
		* @async
		*/
		writeAPIMeta: function(cb) {
			Y.log('Writing API Meta Data', 'info', 'builder');
			var self = this;
			this.renderAPIMeta(function(js) {
				var output = 'APISearch.setData(' + js + ')';
				fs.writeFile(path.join(self.options.outdir, 'api.js'), output, 'utf8', cb);
			});
		},
		/**
		* Render the API meta and return the Javascript
		* @method renderAPIMeta
		* @param {Callback} cb The callback
		* @async
		*/
		renderAPIMeta: function(cb) {

			var opts = { meta: {} }, self = this;
			opts = this.populateClasses(opts);
			opts = this.populateModules(opts);
			opts = self.populateKeywords(opts);

			['classes', 'modules', 'keywords'].forEach(function(id) {
				opts.meta[id].forEach(function(v, k) {
					opts.meta[id][k] = v.name;
					if (v.submodules) {
						v.submodules.forEach(function(s) {
							opts.meta[id].push(s.displayName);
						});
					}
				});
				opts.meta[id].sort();
			});
			
			opts = this.populateSearchData(opts);
			
			var apijs = JSON.stringify(opts, null, 4);

			cb(apijs);
		},
		
		/**
		* Write the Dependency meta data used for the Selectin Downloader
		* @method writeDependencyMeta
		* @param {Callback} cb The callback to execute when complete
		* @async
		*/
		writeDependencyMeta: function(cb) {
			Y.log('Writing Dependency Meta Data', 'info', 'builder');
			var self = this;
			this.renderDependencyMeta(function(js) {
				var output = 'var dependency = (' + js + ')';
				fs.writeFile(path.join(self.options.outdir, 'dependency.js'), output, 'utf8', cb);
			});
		},
		/**
		* Render the Dependency meta and return the Javascript
		* @method renderDependencyMeta
		* @param {Callback} cb The callback
		* @async
		*/
		renderDependencyMeta: function(cb) {

			var opts = { meta: {} }, self = this;
			
			var data = {};
			var lists = this.data.classes;
			
			for (var k in lists) if (lists.hasOwnProperty(k)) {
				
				var item = lists[k];
				
				var relation = item.relation || {};
				item.extends && (relation.extends = item.extends);
				
				data[k] = {
					description : item.description,
					file : item.file,
					relation : relation
				};
				
			}
			
			cb(JSON.stringify(data, null, 4));

		},
		
		populateSearchData : function(opts) {
			
			var itemtypes = {
				'property' : 'properties',
				'attribute' : 'attrs',
				'class' : 'classes'
			};
			
			var data = this.data;
			var meta = opts.meta;
			
			var detail = opts.detail = {
				'keywords' : [],
				'classes' : [],
				'modules' : [],
				'methods' : [],
				'properties' : [],
				'attrs' : [],
				'events' : []
			};
			
			var keywords = {};
			
			for (var klassName in data.classes) {
				
				var klass = data.classes[klassName];
				
				var klassData = { 'name' : klass.name, 'description' : klass.description };
				detail.classes.push(klassData);

				(klass.keyword || []).forEach(function(keyword) {
					var list = keywords[keyword] = keywords[keyword] || [];
					list.push(klassName); 
				});

			}
			
			for (var moduleName in data.modules) {
				var module = data.modules[moduleName];
				detail.modules.push(module);
			}
			
			for (keyword in keywords) {
				var list = detail.keywords;
				list.push({ name : keyword, class : keywords[keyword] });  
			}
			
			data.classitems.forEach(function(item) {
				
				var itemtype = item.itemtype;
				if (!itemtype || itemtype === 'constructor') { return; } 
				
				itemtype = itemtypes[item.itemtype] || item.itemtype + 's';

				var list = detail[itemtype];
				list.push({ 'name' : item.name, 'description' : item.description, 'class' : item.class });  

			});
			
			var fpSort = function(arr) {
				return arr.sort(function(a, b) {
					var r = a.name.toUpperCase() < b.name.toUpperCase();
					return r ? -1 : 1; 
				});
			};
			
			detail.keywords = fpSort(detail.keywords);
			detail.classes = fpSort(detail.classes);
			detail.modules = fpSort(detail.modules);
			detail.methods = fpSort(detail.methods);
			detail.properties = fpSort(detail.properties);
			detail.attrs = fpSort(detail.attrs);
			detail.events = fpSort(detail.events);
			
			return opts;
			
		},
		
		/**
		* Normalizes a file path to a writable filename:
		*
		*    var path = 'lib/file.js';
		*    returns 'lib_file.js';
		*
		* @method filterFileName
		* @param {String} f The filename to normalize
		* @return {String} The filtered file path
		*/
		filterFileName: function(f) {
			return f.replace(/[\/\\]/g, '_');
		},
		/**
		* Compiles the templates from the meta-data provided by DocParser
		* @method compile
		* @param {Callback} cb The callback to execute after it's completed
		*/
		compile: function(cb) {
			var self = this;
			var starttime = (new Date()).getTime();
			Y.log('Compiling Templates', 'info', 'builder');

			this.mixExternal(function() {
				self.makeDirs(function() {
					Y.log('Copying Assets', 'info', 'builder');
					if (!Y.Files.isDirectory(path.join(self.options.outdir, 'assets'))) {
						mkdirRecursiveSync(path.join(self.options.outdir, 'assets'), 0777);
						// fs.mkdirSync(path.join(self.options.outdir, 'assets'), 0777);
					}
					Y.Files.copyAssets([path.join(DEFAULT_THEME, 'assets'), path.join(themeDir, 'assets')], path.join(self.options.outdir, 'assets'), false, function() {
						var cstack = new Y.Parallel();
						
						/*
						self.writeModules(cstack.add(function() {
							self.writeClasses(cstack.add(function() {
								if (!self.options.nocode) {
									self.writeFiles(cstack.add(noop));
								}
							}));
						}));
						*/
						self.writeModules(cstack.add(noop));
						self.writeClasses(cstack.add(noop));
						self.writeKeywords(cstack.add(noop));
						if (!self.options.nocode) {
							self.writeFiles(cstack.add(noop));
						}
						self.writeIndex(cstack.add(noop));
						self.writeAPIMeta(cstack.add(noop));
						self.writeDependencyMeta(cstack.add(noop));
						self.writeResources(cstack.add(noop));

						cstack.done(function() {
							var endtime = (new Date()).getTime();
							var timer = ((endtime - starttime) / 1000) + ' seconds';
							Y.log('Finished writing ' + self.files + ' files in ' + timer, 'info', 'builder');
							if (cb) { cb(); }
						});
					});
				});
			});
		}
	}
});
