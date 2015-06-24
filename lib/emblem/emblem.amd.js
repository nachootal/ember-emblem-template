define('emblem', ['exports', 'emblem/parser', 'emblem/compiler', 'emblem/bootstrap'], function (exports, Parser, compiler) {

  'use strict';

  exports['default'] = {
    Parser: Parser['default'],
    registerPartial: compiler.registerPartial,
    parse: compiler.parse,
    compile: compiler.compile,
    VERSION: "0.5.1"
  };

});
define('emblem/ast-builder', ['exports', 'emblem/utils/void-elements'], function (exports, isVoidElement) {

  'use strict';

  exports.generateBuilder = generateBuilder;

  function generateBuilder() {
    reset(builder);
    return builder;
  }function reset(builder) {
    var programNode = {
      type: "program",
      childNodes: []
    };
    builder.currentNode = programNode;
    builder.previousNodes = [];
    builder._ast = programNode;
  }

  var builder = {
    toAST: function () {
      return this._ast;
    },

    generateText: function (content) {
      return { type: "text", content: content };
    },

    text: function (content) {
      var node = this.generateText(content);
      this.currentNode.childNodes.push(node);
      return node;
    },

    generateElement: function (tagName) {
      return {
        type: "element",
        tagName: tagName,
        isVoid: isVoidElement['default'](tagName),
        attrStaches: [],
        classNameBindings: [],
        childNodes: []
      };
    },

    element: function (tagName) {
      var node = this.generateElement(tagName);
      this.currentNode.childNodes.push(node);
      return node;
    },

    generateMustache: function (content, escaped) {
      return {
        type: "mustache",
        escaped: escaped !== false,
        content: content
      };
    },

    generateAssignedMustache: function (content, key) {
      return {
        type: "assignedMustache",
        content: content,
        key: key
      };
    },

    mustache: function (content, escaped) {
      var node = this.generateMustache(content, escaped);
      this.currentNode.childNodes.push(node);
      return node;
    },

    generateBlock: function (content) {
      return {
        type: "block",
        content: content,
        childNodes: [],
        inverseChildNodes: []
      };
    },

    block: function (content) {
      var node = this.generateBlock(content);
      this.currentNode.childNodes.push(node);
      return node;
    },

    attribute: function (attrName, attrContent) {
      var node = {
        type: "attribute",
        name: attrName,
        content: attrContent
      };

      this.currentNode.attrStaches.push(node);
      return node;
    },

    generateClassNameBinding: function (classNameBinding) {
      return {
        type: "classNameBinding",
        name: classNameBinding // could be "color", or could be "hasColor:red" or ":color"
      };
    },

    classNameBinding: function (classNameBinding) {
      var node = this.generateClassNameBinding(classNameBinding);
      this.currentNode.classNameBindings.push(node);
      return node;
    },

    enter: function (node) {
      this.previousNodes.push(this.currentNode);
      this.currentNode = node;
    },

    exit: function () {
      var lastNode = this.currentNode;
      this.currentNode = this.previousNodes.pop();
      return lastNode;
    },

    add: function (label, node) {
      if (Array.isArray(node)) {
        for (var i = 0, l = node.length; i < l; i++) {
          this.add(label, node[i]);
        }
      } else {
        this.currentNode[label].push(node);
      }
    }
  };

});
define('emblem/bootstrap', ['emblem/compiler'], function (compiler) {

  'use strict';

  function compileScriptTags(scope) {
    var Handlebars = scope.Handlebars;
    var Ember = scope.Ember;

    if (typeof Ember === "undefined" || Ember === null) {
      throw new Error("Can't run Emblem.enableEmber before Ember has been defined");
    }
    if (typeof document !== "undefined" && document !== null) {
      return Ember.$("script[type=\"text/x-emblem\"], script[type=\"text/x-raw-emblem\"]", Ember.$(document)).each(function () {
        var handlebarsVariant, script, templateName;
        script = Ember.$(this);
        handlebarsVariant = script.attr("type") === "text/x-raw-handlebars" ? Handlebars : Ember.Handlebars;
        templateName = script.attr("data-template-name") || script.attr("id") || "application";
        Ember.TEMPLATES[templateName] = compiler.compile(handlebarsVariant, script.html());
        return script.remove();
      });
    }
  }

  if (typeof window !== "undefined" && window !== null) {
    var ENV = window.ENV || (window.ENV = {});
    ENV.EMBER_LOAD_HOOKS = ENV.EMBER_LOAD_HOOKS || {};
    ENV.EMBER_LOAD_HOOKS.application = ENV.EMBER_LOAD_HOOKS.application || [];
    ENV.EMBER_LOAD_HOOKS.application.push(compileScriptTags);
    ENV.EMBER_LOAD_HOOKS["Ember.Application"] = ENV.EMBER_LOAD_HOOKS["Ember.Application"] || [];
    ENV.EMBER_LOAD_HOOKS["Ember.Application"].push(function (Application) {
      if (Application.initializer) {
        return Application.initializer({
          name: "emblemDomTemplates",
          before: "registerComponentLookup",
          initialize: compileScriptTags
        });
      } else {
        return window.Ember.onLoad("application", compileScriptTags);
      }
    });
  }

});
define('emblem/compiler', ['exports', 'emblem/parser', 'emblem/parser-delegate/ember', 'emblem/preprocessor', 'emblem/template-compiler', 'emblem/ast-builder'], function (exports, parser, EmberDelegate, preprocessor, template_compiler, ast_builder) {

  'use strict';

  exports.compile = compile;

  function compile(emblem) {
    var builder = ast_builder.generateBuilder();
    var processedEmblem = preprocessor.processSync(emblem);
    parser.parse(processedEmblem, { builder: builder });
    var ast = builder.toAST();
    var result = template_compiler.compile(ast);
    return result;
  }

});
define('emblem/mustache-parser', ['exports', 'emblem/ast-builder', 'emblem/preprocessor'], function (exports, ast_builder, preprocessor) {

  'use strict';

  /*jshint newcap: false, laxbreak: true */
  var Parser = (function() {
    /*
     * Generated by PEG.js 0.8.0.
     *
     * http://pegjs.majda.cz/
     */

    function peg$subclass(child, parent) {
      function ctor() { this.constructor = child; }
      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
    }

    function SyntaxError(message, expected, found, offset, line, column) {
      this.message  = message;
      this.expected = expected;
      this.found    = found;
      this.offset   = offset;
      this.line     = line;
      this.column   = column;

      this.name     = "SyntaxError";
    }

    peg$subclass(SyntaxError, Error);

    function parse(input) {
      var options = arguments.length > 1 ? arguments[1] : {},

          peg$FAILED = {},

          peg$startRuleFunctions = { _0start: peg$parse_0start },
          peg$startRuleFunction  = peg$parse_0start,

          peg$c0 = peg$FAILED,
          peg$c1 = [],
          peg$c2 = null,
          peg$c3 = function(name, attrs, blockParams) {
            attrs = attrs.concat(name.shorthands);
            var ret = {
              name: name.name,
              attrs: attrs,
              blockParams: blockParams
            };
            if (name.modifier) {
              ret.modifier = name.modifier;
            }

            return ret;
          },
          peg$c4 = "|",
          peg$c5 = { type: "literal", value: "|", description: "\"|\"" },
          peg$c6 = function(params) {
            return params;
          },
          peg$c7 = "as",
          peg$c8 = { type: "literal", value: "as", description: "\"as\"" },
          peg$c9 = function(attr) { return attr;},
          peg$c10 = void 0,
          peg$c11 = function(attrs) {
            return attrs;
          },
          peg$c12 = "[",
          peg$c13 = { type: "literal", value: "[", description: "\"[\"" },
          peg$c14 = "]",
          peg$c15 = { type: "literal", value: "]", description: "\"]\"" },
          peg$c16 = { type: "other", description: "_0INDENT" },
          peg$c17 = { type: "any", description: "any character" },
          peg$c18 = function(t) { return preprocessor.INDENT_SYMBOL === t; },
          peg$c19 = function(t) { return ''; },
          peg$c20 = { type: "other", description: "_0LineEnd" },
          peg$c21 = "\r",
          peg$c22 = { type: "literal", value: "\r", description: "\"\\r\"" },
          peg$c23 = function(t) { return preprocessor.TERM_SYMBOL == t; },
          peg$c24 = "\n",
          peg$c25 = { type: "literal", value: "\n", description: "\"\\n\"" },
          peg$c26 = function(t) { return false; },
          peg$c27 = function(name, shorthands) {
            return {
              name: name.name,
              modifier: name.modifier,
              shorthands: shorthands
            };
          },
          peg$c28 = "%",
          peg$c29 = { type: "literal", value: "%", description: "\"%\"" },
          peg$c30 = function(tagName) {
            return 'tagName="' + tagName + '"';
          },
          peg$c31 = "#",
          peg$c32 = { type: "literal", value: "#", description: "\"#\"" },
          peg$c33 = function(idName) {
            return 'elementId="' + idName + '"';
          },
          peg$c34 = ".",
          peg$c35 = { type: "literal", value: ".", description: "\".\"" },
          peg$c36 = function(className) {
            return 'class="' + className + '"';
          },
          peg$c37 = /^[A-Za-z0-9\-]/,
          peg$c38 = { type: "class", value: "[A-Za-z0-9\\-]", description: "[A-Za-z0-9\\-]" },
          peg$c39 = function(name, modifier) {
            return {
              name: name,
              modifier: modifier
            };
          },
          peg$c40 = "-",
          peg$c41 = { type: "literal", value: "-", description: "\"-\"" },
          peg$c42 = /^[0-9]/,
          peg$c43 = { type: "class", value: "[0-9]", description: "[0-9]" },
          peg$c44 = "/",
          peg$c45 = { type: "literal", value: "/", description: "\"/\"" },
          peg$c46 = "!",
          peg$c47 = { type: "literal", value: "!", description: "\"!\"" },
          peg$c48 = "?",
          peg$c49 = { type: "literal", value: "?", description: "\"?\"" },
          peg$c50 = /^[A-Za-z0-9]/,
          peg$c51 = { type: "class", value: "[A-Za-z0-9]", description: "[A-Za-z0-9]" },
          peg$c52 = /^[_\/]/,
          peg$c53 = { type: "class", value: "[_\\/]", description: "[_\\/]" },
          peg$c54 = "=",
          peg$c55 = { type: "literal", value: "=", description: "\"=\"" },
          peg$c56 = function(attrName, attrValue) {
            return attrName + '=' + attrValue;
          },
          peg$c57 = function(v) {
            return v;
          },
          peg$c58 = "\"",
          peg$c59 = { type: "literal", value: "\"", description: "\"\\\"\"" },
          peg$c60 = "'",
          peg$c61 = { type: "literal", value: "'", description: "\"'\"" },
          peg$c62 = /^[^'"]/,
          peg$c63 = { type: "class", value: "[^'\"]", description: "[^'\"]" },
          peg$c64 = /^[^()]/,
          peg$c65 = { type: "class", value: "[^()]", description: "[^()]" },
          peg$c66 = function(p) {
            return p;
          },
          peg$c67 = "(",
          peg$c68 = { type: "literal", value: "(", description: "\"(\"" },
          peg$c69 = ")",
          peg$c70 = { type: "literal", value: ")", description: "\")\"" },
          peg$c71 = " ",
          peg$c72 = { type: "literal", value: " ", description: "\" \"" },

          peg$currPos          = 0,
          peg$reportedPos      = 0,
          peg$cachedPos        = 0,
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
          peg$maxFailPos       = 0,
          peg$maxFailExpected  = [],
          peg$silentFails      = 0,

          peg$result;

      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
        }

        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }

      function text() {
        return input.substring(peg$reportedPos, peg$currPos);
      }

      function offset() {
        return peg$reportedPos;
      }

      function line() {
        return peg$computePosDetails(peg$reportedPos).line;
      }

      function column() {
        return peg$computePosDetails(peg$reportedPos).column;
      }

      function expected(description) {
        throw peg$buildException(
          null,
          [{ type: "other", description: description }],
          peg$reportedPos
        );
      }

      function error(message) {
        throw peg$buildException(message, null, peg$reportedPos);
      }

      function peg$computePosDetails(pos) {
        function advance(details, startPos, endPos) {
          var p, ch;

          for (p = startPos; p < endPos; p++) {
            ch = input.charAt(p);
            if (ch === "\n") {
              if (!details.seenCR) { details.line++; }
              details.column = 1;
              details.seenCR = false;
            } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
              details.line++;
              details.column = 1;
              details.seenCR = true;
            } else {
              details.column++;
              details.seenCR = false;
            }
          }
        }

        if (peg$cachedPos !== pos) {
          if (peg$cachedPos > pos) {
            peg$cachedPos = 0;
            peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
          }
          advance(peg$cachedPosDetails, peg$cachedPos, pos);
          peg$cachedPos = pos;
        }

        return peg$cachedPosDetails;
      }

      function peg$fail(expected) {
        if (peg$currPos < peg$maxFailPos) { return; }

        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }

        peg$maxFailExpected.push(expected);
      }

      function peg$buildException(message, expected, pos) {
        function cleanupExpected(expected) {
          var i = 1;

          expected.sort(function(a, b) {
            if (a.description < b.description) {
              return -1;
            } else if (a.description > b.description) {
              return 1;
            } else {
              return 0;
            }
          });

          while (i < expected.length) {
            if (expected[i - 1] === expected[i]) {
              expected.splice(i, 1);
            } else {
              i++;
            }
          }
        }

        function buildMessage(expected, found) {
          function stringEscape(s) {
            function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

            return s
              .replace(/\\/g,   '\\\\')
              .replace(/"/g,    '\\"')
              .replace(/\x08/g, '\\b')
              .replace(/\t/g,   '\\t')
              .replace(/\n/g,   '\\n')
              .replace(/\f/g,   '\\f')
              .replace(/\r/g,   '\\r')
              .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
              .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
              .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
              .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
          }

          var expectedDescs = new Array(expected.length),
              expectedDesc, foundDesc, i;

          for (i = 0; i < expected.length; i++) {
            expectedDescs[i] = expected[i].description;
          }

          expectedDesc = expected.length > 1
            ? expectedDescs.slice(0, -1).join(", ")
                + " or "
                + expectedDescs[expected.length - 1]
            : expectedDescs[0];

          foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

          return "Expected " + expectedDesc + " but " + foundDesc + " found.";
        }

        var posDetails = peg$computePosDetails(pos),
            found      = pos < input.length ? input.charAt(pos) : null;

        if (expected !== null) {
          cleanupExpected(expected);
        }

        return new SyntaxError(
          message !== null ? message : buildMessage(expected, found),
          expected,
          found,
          pos,
          posDetails.line,
          posDetails.column
        );
      }

      function peg$parse_0start() {
        var s0;

        s0 = peg$parse_0newMustache();

        return s0;
      }

      function peg$parse_0newMustache() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_0newMustacheStart();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_0m_bracketedAttrs();
            if (s3 === peg$FAILED) {
              s3 = [];
              s4 = peg$parse_0newMustacheAttr();
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parse_0newMustacheAttr();
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_0m_blockParams();
              if (s4 === peg$FAILED) {
                s4 = peg$c2;
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c3(s1, s3, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_blockParams() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_0m_blockStart();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_0newMustacheAttrValue();
            if (s4 !== peg$FAILED) {
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parse_0newMustacheAttrValue();
              }
            } else {
              s3 = peg$c0;
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 124) {
                s4 = peg$c4;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c5); }
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c6(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_blockStart() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c7) {
          s1 = peg$c7;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 124) {
              s3 = peg$c4;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s3 !== peg$FAILED) {
              s1 = [s1, s2, s3];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_bracketedAttrs() {
        var s0, s1, s2, s3, s4, s5, s6;

        s0 = peg$currPos;
        s1 = peg$parse_0m_openBracket();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = [];
          s5 = peg$parse_0m_();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parse_0m_();
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_0newMustacheAttr();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_0m_TERM();
              if (s6 === peg$FAILED) {
                s6 = peg$c2;
              }
              if (s6 !== peg$FAILED) {
                peg$reportedPos = s3;
                s4 = peg$c9(s5);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = [];
            s5 = peg$parse_0m_();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parse_0m_();
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_0newMustacheAttr();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_0m_TERM();
                if (s6 === peg$FAILED) {
                  s6 = peg$c2;
                }
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c9(s5);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            peg$silentFails++;
            s4 = peg$parse_0m_closeBracket();
            peg$silentFails--;
            if (s4 !== peg$FAILED) {
              peg$currPos = s3;
              s3 = peg$c10;
            } else {
              s3 = peg$c0;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c11(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_openBracket() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 91) {
          s1 = peg$c12;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c13); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0m_TERM();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_0m_INDENT();
            if (s3 !== peg$FAILED) {
              s1 = [s1, s2, s3];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_closeBracket() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0m_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_0m_();
        }
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 93) {
            s2 = peg$c14;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_INDENT() {
        var s0, s1, s2;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = peg$currPos;
          s2 = peg$c18(s1);
          if (s2) {
            s2 = peg$c10;
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c19(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c16); }
        }

        return s0;
      }

      function peg$parse_0m_TERM() {
        var s0, s1, s2, s3, s4;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 13) {
          s1 = peg$c21;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c22); }
        }
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = peg$currPos;
            s3 = peg$c23(s2);
            if (s3) {
              s3 = peg$c10;
            } else {
              s3 = peg$c0;
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 10) {
                s4 = peg$c24;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c25); }
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c26(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }

        return s0;
      }

      function peg$parse_0newMustacheStart() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_0newMustacheName();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_0newMustacheShortHand();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_0newMustacheShortHand();
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c27(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0newMustacheShortHand() {
        var s0;

        s0 = peg$parse_0m_shortHandTagName();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_0m_shortHandIdName();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_0m_shortHandClassName();
          }
        }

        return s0;
      }

      function peg$parse_0m_shortHandTagName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 37) {
          s1 = peg$c28;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c29); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0newMustacheShortHandName();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_shortHandIdName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 35) {
          s1 = peg$c31;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0newMustacheShortHandName();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c33(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_shortHandClassName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s1 = peg$c34;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0newMustacheShortHandName();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c36(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0newMustacheShortHandName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        if (peg$c37.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c38); }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (peg$c37.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c38); }
            }
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0newMustacheName() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parse_0m_invalidNameStartChar();
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = [];
          s4 = peg$parse_0newMustacheNameChar();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_0newMustacheNameChar();
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            s3 = input.substring(s2, peg$currPos);
          }
          s2 = s3;
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_0m_modifierChar();
            if (s3 === peg$FAILED) {
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c39(s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_invalidNameStartChar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 46) {
          s0 = peg$c34;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 45) {
            s0 = peg$c40;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }
          if (s0 === peg$FAILED) {
            if (peg$c42.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c43); }
            }
          }
        }

        return s0;
      }

      function peg$parse_0m_invalidValueStartChar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 47) {
          s0 = peg$c44;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c45); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 91) {
            s0 = peg$c12;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
        }

        return s0;
      }

      function peg$parse_0m_modifierChar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 33) {
          s0 = peg$c46;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c47); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 63) {
            s0 = peg$c48;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c49); }
          }
        }

        return s0;
      }

      function peg$parse_0newMustacheNameChar() {
        var s0;

        if (peg$c50.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c51); }
        }
        if (s0 === peg$FAILED) {
          if (peg$c52.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c53); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 45) {
              s0 = peg$c40;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c41); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s0 = peg$c34;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c35); }
              }
            }
          }
        }

        return s0;
      }

      function peg$parse_0newMustacheAttr() {
        var s0;

        s0 = peg$parse_0m_keyValue();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_0m_parenthetical();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_0newMustacheAttrValue();
          }
        }

        return s0;
      }

      function peg$parse_0m_keyValue() {
        var s0, s1, s2, s3, s4, s5, s6, s7;

        s0 = peg$currPos;
        s1 = peg$parse_0newMustacheAttrName();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 61) {
              s3 = peg$c54;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c55); }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parse_0m_();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parse_0m_();
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_0newMustacheAttrValue();
                if (s5 !== peg$FAILED) {
                  s6 = [];
                  s7 = peg$parse_0m_();
                  while (s7 !== peg$FAILED) {
                    s6.push(s7);
                    s7 = peg$parse_0m_();
                  }
                  if (s6 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c56(s1, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0newMustacheAttrName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0newMustacheNameChar();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_0newMustacheNameChar();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0newMustacheAttrValue() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parse_0m_invalidValueStartChar();
        if (s2 === peg$FAILED) {
          s2 = peg$parse_0m_blockStart();
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0m_quotedString();
          if (s2 === peg$FAILED) {
            s2 = peg$parse_0m_valuePath();
            if (s2 === peg$FAILED) {
              s2 = peg$parse_0m_parenthetical();
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_0m_();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_0m_();
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c57(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_valuePath() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0newMustacheNameChar();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_0newMustacheNameChar();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0m_quotedString() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c58;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c59); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_0m_stringWithoutDouble();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 34) {
              s4 = peg$c58;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c59); }
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c60;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_0m_stringWithoutSingle();
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 39) {
                s4 = peg$c60;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s4 !== peg$FAILED) {
                s2 = [s2, s3, s4];
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$c0;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
          if (s1 !== peg$FAILED) {
            s1 = input.substring(s0, peg$currPos);
          }
          s0 = s1;
        }

        return s0;
      }

      function peg$parse_0m_stringWithoutDouble() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0m_inStringChar();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c60;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_0m_inStringChar();
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 39) {
              s2 = peg$c60;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c61); }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0m_stringWithoutSingle() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0m_inStringChar();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s2 = peg$c58;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c59); }
          }
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_0m_inStringChar();
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 34) {
              s2 = peg$c58;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c59); }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0m_inStringChar() {
        var s0;

        if (peg$c62.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c63); }
        }

        return s0;
      }

      function peg$parse_0m_inParensChar() {
        var s0;

        if (peg$c64.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c65); }
        }

        return s0;
      }

      function peg$parse_0m_commentChar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 47) {
          s0 = peg$c44;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c45); }
        }

        return s0;
      }

      function peg$parse_0m_parenthetical() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0m_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_0m_();
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$currPos;
          s4 = peg$parse_0m_OPEN_PAREN();
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$parse_0m_inParensChar();
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$parse_0m_inParensChar();
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_0m_parenthetical();
              if (s6 === peg$FAILED) {
                s6 = peg$c2;
              }
              if (s6 !== peg$FAILED) {
                s7 = [];
                s8 = peg$parse_0m_inParensChar();
                while (s8 !== peg$FAILED) {
                  s7.push(s8);
                  s8 = peg$parse_0m_inParensChar();
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parse_0m_CLOSE_PAREN();
                  if (s8 !== peg$FAILED) {
                    s4 = [s4, s5, s6, s7, s8];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c0;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            s3 = input.substring(s2, peg$currPos);
          }
          s2 = s3;
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_0m_();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_0m_();
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c66(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_OPEN_PAREN() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 40) {
          s0 = peg$c67;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c68); }
        }

        return s0;
      }

      function peg$parse_0m_CLOSE_PAREN() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 41) {
          s0 = peg$c69;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c70); }
        }

        return s0;
      }

      function peg$parse_0m_() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 32) {
          s0 = peg$c71;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c72); }
        }

        return s0;
      }

      peg$result = peg$startRuleFunction();

      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail({ type: "end", description: "end of input" });
        }

        throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
      }
    }

    return {
      SyntaxError: SyntaxError,
      parse:       parse
    };
  })();
  var parse = Parser.parse, ParserSyntaxError = Parser.SyntaxError;
  exports['default'] = parse;

  exports.ParserSyntaxError = ParserSyntaxError;
  exports.parse = parse;

});
define('emblem/parser-delegate/base', ['exports'], function (exports) {

  'use strict';

  var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

  var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc && desc.writable) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  var ParserDelegate = (function () {
    function ParserDelegate(AST, parse) {
      _classCallCheck(this, ParserDelegate);

      _get(Object.getPrototypeOf(ParserDelegate.prototype), "constructor", this).call(this, AST, parse);
    }

    _prototypeProperties(ParserDelegate, null, {
      capitalizedLineStarterMustache: {
        value: function capitalizedLineStarterMustache(node) {
          if (node.mustache) {
            node.mustache = this.handleCapitalizedMustache(node.mustache);
            return node;
          } else {
            return this.handleCapitalizedMustache(node);
          }
        },
        writable: true,
        configurable: true
      },
      handleCapitalizedMustache: {
        value: function handleCapitalizedMustache(mustache) {
          return mustache;
        },
        writable: true,
        configurable: true
      },
      rawMustacheAttribute: {
        value: function rawMustacheAttribute(key, id) {
          var mustacheNode = this.createMustacheNode([id], null, true);

          mustacheNode = this.handleUnboundSuffix(mustacheNode, id);

          return [new this.AST.ContentNode(key + "=" + "\""), mustacheNode, new this.AST.ContentNode("\"")];
        },
        writable: true,
        configurable: true
      },
      handleUnboundSuffix: {
        value: function handleUnboundSuffix(mustacheNode, id) {
          return mustacheNode;
        },
        writable: true,
        configurable: true
      },
      unshiftParam: {

        // Returns a new MustacheNode with a new preceding param (id).
        value: function unshiftParam(mustacheNode, helperName, newHashPairs) {
          var hash = mustacheNode.hash;

          // Merge hash.
          if (newHashPairs) {
            hash = hash || new this.AST.HashNode([]);

            for (var i = 0; i < newHashPairs.length; ++i) {
              hash.pairs.push(newHashPairs[i]);
            }
          }

          var params = [mustacheNode.id].concat(mustacheNode.params);
          params.unshift(new this.AST.IdNode([{ part: helperName }]));
          return this.createMustacheNode(params, hash, mustacheNode.escaped);
        },
        writable: true,
        configurable: true
      },
      createMustacheNode: {
        value: function createMustacheNode(params, hash, escaped) {
          var open = escaped ? "{{" : "{{{";
          return new this.AST.MustacheNode(params, hash, open, { left: false, right: false });
        },
        writable: true,
        configurable: true
      },
      createProgramNode: {
        value: function createProgramNode(statements, inverse) {
          return new this.AST.ProgramNode(statements, { left: false, right: false }, inverse, null);
        },
        writable: true,
        configurable: true
      }
    });

    return ParserDelegate;
  })();

  exports['default'] = ParserDelegate;

});
define('emblem/parser-delegate/ember', ['exports', 'emblem/parser-delegate/base'], function (exports, base) {

  'use strict';

  var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

  var _inherits = function (subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

  var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

  /* jshint proto: true */

  var EmberParserDelegate = (function (ParserDelegate) {
    function EmberParserDelegate(AST, parse) {
      _classCallCheck(this, EmberParserDelegate);

      this.AST = AST;
      this.recursiveParse = parse;
    }

    _inherits(EmberParserDelegate, ParserDelegate);

    _prototypeProperties(EmberParserDelegate, null, {
      handleCapitalizedMustache: {
        value: function handleCapitalizedMustache(mustache) {
          return this.unshiftParam(mustache, "view");
        },
        writable: true,
        configurable: true
      },
      handleUnboundSuffix: {
        value: function handleUnboundSuffix(mustacheNode, id) {
          if (id._emblemSuffixModifier === "!") {
            return this.unshiftParam(mustacheNode, "unbound");
          } else {
            return mustacheNode;
          }
        },
        writable: true,
        configurable: true
      }
    });

    return EmberParserDelegate;
  })(base['default']);

  exports['default'] = EmberParserDelegate;

});
define('emblem/parser', ['exports', 'emblem/ast-builder', 'emblem/preprocessor'], function (exports, ast_builder, preprocessor) {

  'use strict';

  /*jshint newcap: false, laxbreak: true */
  var Parser = (function() {
    /*
     * Generated by PEG.js 0.8.0.
     *
     * http://pegjs.majda.cz/
     */

    function peg$subclass(child, parent) {
      function ctor() { this.constructor = child; }
      ctor.prototype = parent.prototype;
      child.prototype = new ctor();
    }

    function SyntaxError(message, expected, found, offset, line, column) {
      this.message  = message;
      this.expected = expected;
      this.found    = found;
      this.offset   = offset;
      this.line     = line;
      this.column   = column;

      this.name     = "SyntaxError";
    }

    peg$subclass(SyntaxError, Error);

    function parse(input) {
      var options = arguments.length > 1 ? arguments[1] : {},

          peg$FAILED = {},

          peg$startRuleFunctions = { _1start: peg$parse_1start },
          peg$startRuleFunction  = peg$parse_1start,

          peg$c0 = peg$FAILED,
          peg$c1 = [],
          peg$c2 = null,
          peg$c3 = function(name, attrs, blockParams) {
            attrs = attrs.concat(name.shorthands);
            var ret = {
              name: name.name,
              attrs: attrs,
              blockParams: blockParams
            };
            if (name.modifier) {
              ret.modifier = name.modifier;
            }

            return ret;
          },
          peg$c4 = "|",
          peg$c5 = { type: "literal", value: "|", description: "\"|\"" },
          peg$c6 = function(params) {
            return params;
          },
          peg$c7 = "as",
          peg$c8 = { type: "literal", value: "as", description: "\"as\"" },
          peg$c9 = function(attr) { return attr;},
          peg$c10 = void 0,
          peg$c11 = function(attrs) {
            return attrs;
          },
          peg$c12 = "[",
          peg$c13 = { type: "literal", value: "[", description: "\"[\"" },
          peg$c14 = "]",
          peg$c15 = { type: "literal", value: "]", description: "\"]\"" },
          peg$c16 = { type: "other", description: "_0INDENT" },
          peg$c17 = { type: "any", description: "any character" },
          peg$c18 = function(t) { return preprocessor.INDENT_SYMBOL === t; },
          peg$c19 = function(t) { return ''; },
          peg$c20 = { type: "other", description: "_0LineEnd" },
          peg$c21 = "\r",
          peg$c22 = { type: "literal", value: "\r", description: "\"\\r\"" },
          peg$c23 = function(t) { return preprocessor.TERM_SYMBOL == t; },
          peg$c24 = "\n",
          peg$c25 = { type: "literal", value: "\n", description: "\"\\n\"" },
          peg$c26 = function(t) { return false; },
          peg$c27 = function(name, shorthands) {
            return {
              name: name.name,
              modifier: name.modifier,
              shorthands: shorthands
            };
          },
          peg$c28 = "%",
          peg$c29 = { type: "literal", value: "%", description: "\"%\"" },
          peg$c30 = function(tagName) {
            return 'tagName="' + tagName + '"';
          },
          peg$c31 = "#",
          peg$c32 = { type: "literal", value: "#", description: "\"#\"" },
          peg$c33 = function(idName) {
            return 'elementId="' + idName + '"';
          },
          peg$c34 = ".",
          peg$c35 = { type: "literal", value: ".", description: "\".\"" },
          peg$c36 = function(className) {
            return 'class="' + className + '"';
          },
          peg$c37 = /^[A-Za-z0-9\-]/,
          peg$c38 = { type: "class", value: "[A-Za-z0-9\\-]", description: "[A-Za-z0-9\\-]" },
          peg$c39 = function(name, modifier) {
            return {
              name: name,
              modifier: modifier
            };
          },
          peg$c40 = "-",
          peg$c41 = { type: "literal", value: "-", description: "\"-\"" },
          peg$c42 = /^[0-9]/,
          peg$c43 = { type: "class", value: "[0-9]", description: "[0-9]" },
          peg$c44 = "/",
          peg$c45 = { type: "literal", value: "/", description: "\"/\"" },
          peg$c46 = "!",
          peg$c47 = { type: "literal", value: "!", description: "\"!\"" },
          peg$c48 = "?",
          peg$c49 = { type: "literal", value: "?", description: "\"?\"" },
          peg$c50 = /^[A-Za-z0-9]/,
          peg$c51 = { type: "class", value: "[A-Za-z0-9]", description: "[A-Za-z0-9]" },
          peg$c52 = /^[_\/]/,
          peg$c53 = { type: "class", value: "[_\\/]", description: "[_\\/]" },
          peg$c54 = "=",
          peg$c55 = { type: "literal", value: "=", description: "\"=\"" },
          peg$c56 = function(attrName, attrValue) {
            return attrName + '=' + attrValue;
          },
          peg$c57 = function(v) {
            return v;
          },
          peg$c58 = "\"",
          peg$c59 = { type: "literal", value: "\"", description: "\"\\\"\"" },
          peg$c60 = "'",
          peg$c61 = { type: "literal", value: "'", description: "\"'\"" },
          peg$c62 = /^[^'"]/,
          peg$c63 = { type: "class", value: "[^'\"]", description: "[^'\"]" },
          peg$c64 = /^[^()]/,
          peg$c65 = { type: "class", value: "[^()]", description: "[^()]" },
          peg$c66 = function(p) {
            return p;
          },
          peg$c67 = "(",
          peg$c68 = { type: "literal", value: "(", description: "\"(\"" },
          peg$c69 = ")",
          peg$c70 = { type: "literal", value: ")", description: "\")\"" },
          peg$c71 = " ",
          peg$c72 = { type: "literal", value: " ", description: "\" \"" },
          peg$c73 = function(c) {return c;},
          peg$c74 = function(c, i) {
            builder.add('childNodes', c);
          },
          peg$c75 = function(c, i) {
            return [c,i];
          },
          peg$c76 = "else",
          peg$c77 = { type: "literal", value: "else", description: "\"else\"" },
          peg$c78 = function(statements) {
            return statements;
          },
          peg$c79 = { type: "other", description: "_1BeginStatement" },
          peg$c80 = { type: "other", description: "_1ContentStatement" },
          peg$c81 = function() { return []; },
          peg$c82 = ">",
          peg$c83 = { type: "literal", value: ">", description: "\">\"" },
          peg$c84 = function(n, params) {
            return [new AST.PartialNode(n, params[0], undefined, {})];
          },
          peg$c85 = /^[a-zA-Z0-9_$-\/]/,
          peg$c86 = { type: "class", value: "[a-zA-Z0-9_$-\\/]", description: "[a-zA-Z0-9_$-\\/]" },
          peg$c87 = function(s) {
              return new AST.PartialNameNode(new AST.StringNode(s));
            },
          peg$c88 = function(mustacheTuple) {
            var mustacheOrBlock = createBlockOrMustache(mustacheTuple);

            return [mustacheOrBlock];
          },
          peg$c89 = function(mustacheTuple) {
            return mustacheTuple;
          },
          peg$c90 = /^[A-Z]/,
          peg$c91 = { type: "class", value: "[A-Z]", description: "[A-Z]" },
          peg$c92 = function(mustacheTuple) {
            var mustache = mustacheTuple[0];
            var block = mustacheTuple[1];
            mustache.isViewHelper = true;

            return [mustache, block];
          },
          peg$c93 = function(ret, multilineContent) {
            if(multilineContent) {
              multilineContent = multilineContent[1];
              for(var i = 0, len = multilineContent.length; i < len; ++i) {
                ret.push(' ');
                ret = ret.concat(multilineContent[i]);
              }
            }
            return ret;
          },
          peg$c94 = function(c) { return c; },
          peg$c95 = function(mustacheTuple) {
              var blockOrMustache = createBlockOrMustache(mustacheTuple);
              return [blockOrMustache];
            },
          peg$c96 = function(h) { return h;},
          peg$c97 = function(h, nested) {
            if (nested && nested.length > 0) {
              nested = castStringsToTextNodes(nested);
              builder.add('childNodes', nested);
            }

            return [builder.exit()];
          },
          peg$c98 = function(mustacheContent, blockTuple) {
            if (blockTuple) {
              return [mustacheContent, blockTuple];
            } else {
              return [mustacheContent];
            }
          },
          peg$c99 = ": ",
          peg$c100 = { type: "literal", value: ": ", description: "\": \"" },
          peg$c101 = function(statements) { return statements; },
          peg$c102 = function(statements) {
              return statements;
            },
          peg$c103 = function(i) { return i },
          peg$c104 = function(block) {
              return block;
            },
          peg$c105 = function(e, mustacheTuple) {
            var mustache = mustacheTuple[0];
            var block = mustacheTuple[1];

            mustache.isEscaped = e;

            return [mustache, block];
          },
          peg$c106 = function(isPartial, mustache) {
            if(isPartial) {
              var n = new AST.PartialNameNode(new AST.StringNode(sexpr.id.string));
              return new AST.PartialNode(n, sexpr.params[0], undefined, {});
            }
            return mustache;
          },
          peg$c107 = function(t) { return ['tagName', t]; },
          peg$c108 = function(i) { return ['elementId', i]; },
          peg$c109 = function(c) { return ['class', c]; },
          peg$c110 = function(a) {
            return a;
          },
          peg$c111 = function(p) { return p; },
          peg$c112 = function(a) { return a; },
          peg$c113 = { type: "other", description: "_1PathIdent" },
          peg$c114 = "..",
          peg$c115 = { type: "literal", value: "..", description: "\"..\"" },
          peg$c116 = /^[a-zA-Z0-9_$\-!?\^@]/,
          peg$c117 = { type: "class", value: "[a-zA-Z0-9_$\\-!?\\^@]", description: "[a-zA-Z0-9_$\\-!?\\^@]" },
          peg$c118 = function(s) { return s; },
          peg$c119 = /^[^\]]/,
          peg$c120 = { type: "class", value: "[^\\]]", description: "[^\\]]" },
          peg$c121 = function(segmentLiteral) { return segmentLiteral; },
          peg$c122 = { type: "other", description: "_1Key" },
          peg$c123 = ":",
          peg$c124 = { type: "literal", value: ":", description: "\":\"" },
          peg$c125 = function(s, p) { return { part: p, separator: s }; },
          peg$c126 = function(first, tail) {
            var ret = [{ part: first }];
            for(var i = 0; i < tail.length; ++i) {
              ret.push(tail[i]);
            }
            return ret;
          },
          peg$c127 = { type: "other", description: "_1PathSeparator" },
          peg$c128 = /^[\/.]/,
          peg$c129 = { type: "class", value: "[\\/.]", description: "[\\/.]" },
          peg$c130 = function(v) {
            var last = v[v.length - 1];
            var idNode;

            // Support for data keywords that are prefixed with @ in the each
            // block helper such as @index, @key, @first, @last
            if (last.part.charAt(0) === '@') {
              last.part = last.part.slice(1);
              idNode = new AST.IdNode(v);
              var dataNode = new AST.DataNode(idNode);
              return dataNode;
            }

            var match;
            var suffixModifier;

            // FIXME probably need to handle this better?
            if (match = last.part.match(/!$/)) {
              last.part = 'unbound ' + last.part.slice(0, -1);
            }
            if(match = last.part.match(/[\?\^]$/)) {
              suffixModifier = match[0];
              throw "unhandled path terminated: " + suffixModifier;
            }

            return last.part;
          },
          peg$c131 = function(v) { return new AST.StringNode(v); },
          peg$c132 = function(v) { return new AST.NumberNode(v); },
          peg$c133 = function(v) { return new AST.BooleanNode(v); },
          peg$c134 = { type: "other", description: "_1Boolean" },
          peg$c135 = "true",
          peg$c136 = { type: "literal", value: "true", description: "\"true\"" },
          peg$c137 = "false",
          peg$c138 = { type: "literal", value: "false", description: "\"false\"" },
          peg$c139 = { type: "other", description: "_1Integer" },
          peg$c140 = function(s) { return parseInt(s); },
          peg$c141 = function(p) { return p[1]; },
          peg$c142 = /^[^"}]/,
          peg$c143 = { type: "class", value: "[^\"}]", description: "[^\"}]" },
          peg$c144 = /^[^'}]/,
          peg$c145 = { type: "class", value: "[^'}]", description: "[^'}]" },
          peg$c146 = /^[A-Za-z]/,
          peg$c147 = { type: "class", value: "[A-Za-z]", description: "[A-Za-z]" },
          peg$c148 = function(nodes) {
            return nodes;
          },
          peg$c149 = /^[|`']/,
          peg$c150 = { type: "class", value: "[|`']", description: "[|`']" },
          peg$c151 = "<",
          peg$c152 = { type: "literal", value: "<", description: "\"<\"" },
          peg$c153 = function() { return '<'; },
          peg$c154 = function(w) { return w;},
          peg$c155 = function(s, nodes, indentedNodes) {
            var i, l;

            var hasNodes = nodes && nodes.length,
                hasIndentedNodes = indentedNodes && indentedNodes.length;

            // add a space after the first line if it had content and
            // there are indented nodes to follow
            if (hasNodes && hasIndentedNodes) { nodes.push(' '); }

            // concat indented nodes
            if (indentedNodes) {
              for (i=0, l=indentedNodes.length; i<l; i++) {
                nodes = nodes.concat(indentedNodes[i]);

                // connect logical lines with a space, skipping the next-to-last line
                if (i < l - 1) { nodes.push(' '); }
              }
            }

            // add trailing space to non-indented nodes if special modifier
            if (s === LINE_SPACE_MODIFIERS.SPACE) {
              nodes.push(' ');
            } else if (s === LINE_SPACE_MODIFIERS.NEWLINE) {
              nodes.push('\n');
            }

            return castStringsToTextNodes(nodes);
          },
          peg$c156 = function(first, tail) {
            return flattenArray(first, tail);
          },
          peg$c157 = function(first, tail) { return flattenArray(first, tail); },
          peg$c158 = "{",
          peg$c159 = { type: "literal", value: "{", description: "\"{\"" },
          peg$c160 = /^[^}]/,
          peg$c161 = { type: "class", value: "[^}]", description: "[^}]" },
          peg$c162 = function(text) {
            return text;
          },
          peg$c163 = function(content) {
            return builder.generateMustache( prepareMustachValue(content), true);
          },
          peg$c164 = function(content) {
            return builder.generateMustache( prepareMustachValue(content), false);
          },
          peg$c165 = function(m) {
              return builder.generateMustache( m, true );
            },
          peg$c166 = { type: "other", description: "_1SingleMustacheOpen" },
          peg$c167 = { type: "other", description: "_1DoubleMustacheOpen" },
          peg$c168 = "{{",
          peg$c169 = { type: "literal", value: "{{", description: "\"{{\"" },
          peg$c170 = { type: "other", description: "_1TripleMustacheOpen" },
          peg$c171 = "{{{",
          peg$c172 = { type: "literal", value: "{{{", description: "\"{{{\"" },
          peg$c173 = { type: "other", description: "_1SingleMustacheClose" },
          peg$c174 = "}",
          peg$c175 = { type: "literal", value: "}", description: "\"}\"" },
          peg$c176 = { type: "other", description: "_1DoubleMustacheClose" },
          peg$c177 = "}}",
          peg$c178 = { type: "literal", value: "}}", description: "\"}}\"" },
          peg$c179 = { type: "other", description: "_1TripleMustacheClose" },
          peg$c180 = "}}}",
          peg$c181 = { type: "literal", value: "}}}", description: "\"}}}\"" },
          peg$c182 = { type: "other", description: "_1SubexpressionOpen" },
          peg$c183 = { type: "other", description: "_1SubexpressionClose" },
          peg$c184 = { type: "other", description: "_1InterpolationOpen" },
          peg$c185 = "#{",
          peg$c186 = { type: "literal", value: "#{", description: "\"#{\"" },
          peg$c187 = { type: "other", description: "_1InterpolationClose" },
          peg$c188 = "==",
          peg$c189 = { type: "literal", value: "==", description: "\"==\"" },
          peg$c190 = function() { return false; },
          peg$c191 = function() { return true; },
          peg$c192 = function(h, s) { return h || s; },
          peg$c193 = " [",
          peg$c194 = { type: "literal", value: " [", description: "\" [\"" },
          peg$c195 = function(h, inTagMustaches, fullAttributes) {
            return parseInHtml(h, inTagMustaches, fullAttributes);
          },
          peg$c196 = function(s) { return { shorthand: s, id: true}; },
          peg$c197 = function(s) { return { shorthand: s }; },
          peg$c198 = function(shorthands) {
            var id, classes = [];
            for(var i = 0, len = shorthands.length; i < len; ++i) {
              var shorthand = shorthands[i];
              if(shorthand.id) {
                id = shorthand.shorthand;
              } else {
                classes.push(shorthand.shorthand);
              }
            }

            return [id, classes];
          },
          peg$c199 = function(a) {
            return a || [];
          },
          peg$c200 = function(a) {
            if (a.length) {
              return a;
            } else {
              return [];
            }
          },
          peg$c201 = /^[A-Za-z.0-9_\-]/,
          peg$c202 = { type: "class", value: "[A-Za-z.0-9_\\-]", description: "[A-Za-z.0-9_\\-]" },
          peg$c203 = function(id) { return id; },
          peg$c204 = function(event, mustacheNode) {
            var actionBody, parts;

            if (typeof mustacheNode === 'string') {
              actionBody = mustacheNode;
            } else {
              parts = mustacheNode[1].split(' ');
              if (parts.length === 1) {
                actionBody = '"' + parts[0] + '"';
              } else {
                actionBody = mustacheNode[1];
              }
            }

            var actionContent = ['action'];
            actionContent.push(actionBody);
            actionContent.push('on="'+event+'"');
            return builder.generateMustache(actionContent.join(' '));
          },
          peg$c205 = function(key, boolValue) {
            if (boolValue === 'true') {
              return [key];
            }
          },
          peg$c206 = function(value) { return value.replace(/ *$/, ''); },
          peg$c207 = /^[.()]/,
          peg$c208 = { type: "class", value: "[.()]", description: "[.()]" },
          peg$c209 = /^[^"']/,
          peg$c210 = { type: "class", value: "[^\"']", description: "[^\"']" },
          peg$c211 = /^[']/,
          peg$c212 = { type: "class", value: "[']", description: "[']" },
          peg$c213 = /^["]/,
          peg$c214 = { type: "class", value: "[\"]", description: "[\"]" },
          peg$c215 = function(key, value) {
            value = value.trim();

            // Class logic needs to be coalesced, except if it is an inline if statement
            if (key === 'class') {
              if (value.indexOf('if') === 0) {
                return builder.generateClassNameBinding(value);
              } else {
                return splitValueIntoClassBindings(value);
              }
            } else {
              return builder.generateAssignedMustache(value, key);
            }
          },
          peg$c216 = function(key, value) {
            if (key === 'class') {
              return splitValueIntoClassBindings(value);
            } else {
              return builder.generateAssignedMustache(value, key);
            }
          },
          peg$c217 = function(key, id) {
            return [key, '{{' + id + '}}'];
          },
          peg$c218 = function(key, nodes) {
            var strings = [];
            nodes.forEach(function(node){
              if (typeof node === 'string') {
                strings.push(node);
              } else {
                // FIXME here we transform a mustache attribute
                // This should be handled higher up instead, not here.
                // This happens when the attribute is something like:
                // src="{{unbound post.showLogoUrl}}".
                // key = "src", nodes[0] = "unbound post.showLogoUrl"
                if (node.escaped) {
                  strings.push('{{' + node.content + '}}');
                } else {
                  strings.push('{{{' + node.content + '}}}');
                }
              }
            });
            var result = [key, strings.join('')];
            return result;
          },
          peg$c219 = "_",
          peg$c220 = { type: "literal", value: "_", description: "\"_\"" },
          peg$c221 = function(c) { return c;},
          peg$c222 = { type: "other", description: "_1CSSIdentifier" },
          peg$c223 = /^[_a-zA-Z0-9\-]/,
          peg$c224 = { type: "class", value: "[_a-zA-Z0-9\\-]", description: "[_a-zA-Z0-9\\-]" },
          peg$c225 = /^[_a-zA-Z]/,
          peg$c226 = { type: "class", value: "[_a-zA-Z]", description: "[_a-zA-Z]" },
          peg$c227 = /^[\x80-\xFF]/,
          peg$c228 = { type: "class", value: "[\\x80-\\xFF]", description: "[\\x80-\\xFF]" },
          peg$c229 = { type: "other", description: "_1KnownHTMLTagName" },
          peg$c230 = function(t) { return !!KNOWN_TAGS[t]; },
          peg$c231 = function(t) { return t; },
          peg$c232 = { type: "other", description: "_1a JS event" },
          peg$c233 = function(t) { return !!KNOWN_EVENTS[t]; },
          peg$c234 = { type: "other", description: "_1INDENT" },
          peg$c235 = { type: "other", description: "_1DEDENT" },
          peg$c236 = function(t) { return preprocessor.DEDENT_SYMBOL === t; },
          peg$c237 = { type: "other", description: "_1Unmatched DEDENT" },
          peg$c238 = function(t) { return preprocessor.UNMATCHED_DEDENT_SYMBOL === t; },
          peg$c239 = { type: "other", description: "_1LineEnd" },
          peg$c240 = { type: "other", description: "_1ANYDEDENT" },
          peg$c241 = { type: "other", description: "_1RequiredWhitespace" },
          peg$c242 = { type: "other", description: "_1OptionalWhitespace" },
          peg$c243 = { type: "other", description: "_1InlineWhitespace" },
          peg$c244 = /^[ \t]/,
          peg$c245 = { type: "class", value: "[ \\t]", description: "[ \\t]" },

          peg$currPos          = 0,
          peg$reportedPos      = 0,
          peg$cachedPos        = 0,
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
          peg$maxFailPos       = 0,
          peg$maxFailExpected  = [],
          peg$silentFails      = 0,

          peg$result;

      if ("startRule" in options) {
        if (!(options.startRule in peg$startRuleFunctions)) {
          throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
        }

        peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
      }

      function text() {
        return input.substring(peg$reportedPos, peg$currPos);
      }

      function offset() {
        return peg$reportedPos;
      }

      function line() {
        return peg$computePosDetails(peg$reportedPos).line;
      }

      function column() {
        return peg$computePosDetails(peg$reportedPos).column;
      }

      function expected(description) {
        throw peg$buildException(
          null,
          [{ type: "other", description: description }],
          peg$reportedPos
        );
      }

      function error(message) {
        throw peg$buildException(message, null, peg$reportedPos);
      }

      function peg$computePosDetails(pos) {
        function advance(details, startPos, endPos) {
          var p, ch;

          for (p = startPos; p < endPos; p++) {
            ch = input.charAt(p);
            if (ch === "\n") {
              if (!details.seenCR) { details.line++; }
              details.column = 1;
              details.seenCR = false;
            } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
              details.line++;
              details.column = 1;
              details.seenCR = true;
            } else {
              details.column++;
              details.seenCR = false;
            }
          }
        }

        if (peg$cachedPos !== pos) {
          if (peg$cachedPos > pos) {
            peg$cachedPos = 0;
            peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
          }
          advance(peg$cachedPosDetails, peg$cachedPos, pos);
          peg$cachedPos = pos;
        }

        return peg$cachedPosDetails;
      }

      function peg$fail(expected) {
        if (peg$currPos < peg$maxFailPos) { return; }

        if (peg$currPos > peg$maxFailPos) {
          peg$maxFailPos = peg$currPos;
          peg$maxFailExpected = [];
        }

        peg$maxFailExpected.push(expected);
      }

      function peg$buildException(message, expected, pos) {
        function cleanupExpected(expected) {
          var i = 1;

          expected.sort(function(a, b) {
            if (a.description < b.description) {
              return -1;
            } else if (a.description > b.description) {
              return 1;
            } else {
              return 0;
            }
          });

          while (i < expected.length) {
            if (expected[i - 1] === expected[i]) {
              expected.splice(i, 1);
            } else {
              i++;
            }
          }
        }

        function buildMessage(expected, found) {
          function stringEscape(s) {
            function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

            return s
              .replace(/\\/g,   '\\\\')
              .replace(/"/g,    '\\"')
              .replace(/\x08/g, '\\b')
              .replace(/\t/g,   '\\t')
              .replace(/\n/g,   '\\n')
              .replace(/\f/g,   '\\f')
              .replace(/\r/g,   '\\r')
              .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
              .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
              .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
              .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
          }

          var expectedDescs = new Array(expected.length),
              expectedDesc, foundDesc, i;

          for (i = 0; i < expected.length; i++) {
            expectedDescs[i] = expected[i].description;
          }

          expectedDesc = expected.length > 1
            ? expectedDescs.slice(0, -1).join(", ")
                + " or "
                + expectedDescs[expected.length - 1]
            : expectedDescs[0];

          foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

          return "Expected " + expectedDesc + " but " + foundDesc + " found.";
        }

        var posDetails = peg$computePosDetails(pos),
            found      = pos < input.length ? input.charAt(pos) : null;

        if (expected !== null) {
          cleanupExpected(expected);
        }

        return new SyntaxError(
          message !== null ? message : buildMessage(expected, found),
          expected,
          found,
          pos,
          posDetails.line,
          posDetails.column
        );
      }

      function peg$parse_0newMustache() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_0newMustacheStart();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_0m_bracketedAttrs();
            if (s3 === peg$FAILED) {
              s3 = [];
              s4 = peg$parse_0newMustacheAttr();
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parse_0newMustacheAttr();
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_0m_blockParams();
              if (s4 === peg$FAILED) {
                s4 = peg$c2;
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c3(s1, s3, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_blockParams() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_0m_blockStart();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_0newMustacheAttrValue();
            if (s4 !== peg$FAILED) {
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parse_0newMustacheAttrValue();
              }
            } else {
              s3 = peg$c0;
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 124) {
                s4 = peg$c4;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c5); }
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c6(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_blockStart() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c7) {
          s1 = peg$c7;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 124) {
              s3 = peg$c4;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s3 !== peg$FAILED) {
              s1 = [s1, s2, s3];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_bracketedAttrs() {
        var s0, s1, s2, s3, s4, s5, s6;

        s0 = peg$currPos;
        s1 = peg$parse_0m_openBracket();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = [];
          s5 = peg$parse_0m_();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parse_0m_();
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_0newMustacheAttr();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_0m_TERM();
              if (s6 === peg$FAILED) {
                s6 = peg$c2;
              }
              if (s6 !== peg$FAILED) {
                peg$reportedPos = s3;
                s4 = peg$c9(s5);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = [];
            s5 = peg$parse_0m_();
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$parse_0m_();
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_0newMustacheAttr();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_0m_TERM();
                if (s6 === peg$FAILED) {
                  s6 = peg$c2;
                }
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c9(s5);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            peg$silentFails++;
            s4 = peg$parse_0m_closeBracket();
            peg$silentFails--;
            if (s4 !== peg$FAILED) {
              peg$currPos = s3;
              s3 = peg$c10;
            } else {
              s3 = peg$c0;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c11(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_openBracket() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 91) {
          s1 = peg$c12;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c13); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0m_TERM();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_0m_INDENT();
            if (s3 !== peg$FAILED) {
              s1 = [s1, s2, s3];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_closeBracket() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0m_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_0m_();
        }
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 93) {
            s2 = peg$c14;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_INDENT() {
        var s0, s1, s2;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = peg$currPos;
          s2 = peg$c18(s1);
          if (s2) {
            s2 = peg$c10;
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c19(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c16); }
        }

        return s0;
      }

      function peg$parse_0m_TERM() {
        var s0, s1, s2, s3, s4;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 13) {
          s1 = peg$c21;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c22); }
        }
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = peg$currPos;
            s3 = peg$c23(s2);
            if (s3) {
              s3 = peg$c10;
            } else {
              s3 = peg$c0;
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 10) {
                s4 = peg$c24;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c25); }
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c26(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }

        return s0;
      }

      function peg$parse_0newMustacheStart() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_0newMustacheName();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_0newMustacheShortHand();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_0newMustacheShortHand();
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c27(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0newMustacheShortHand() {
        var s0;

        s0 = peg$parse_0m_shortHandTagName();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_0m_shortHandIdName();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_0m_shortHandClassName();
          }
        }

        return s0;
      }

      function peg$parse_0m_shortHandTagName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 37) {
          s1 = peg$c28;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c29); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0newMustacheShortHandName();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c30(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_shortHandIdName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 35) {
          s1 = peg$c31;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0newMustacheShortHandName();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c33(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_shortHandClassName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s1 = peg$c34;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0newMustacheShortHandName();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c36(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0newMustacheShortHandName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        if (peg$c37.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c38); }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (peg$c37.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c38); }
            }
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0newMustacheName() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parse_0m_invalidNameStartChar();
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = [];
          s4 = peg$parse_0newMustacheNameChar();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_0newMustacheNameChar();
            }
          } else {
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            s3 = input.substring(s2, peg$currPos);
          }
          s2 = s3;
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_0m_modifierChar();
            if (s3 === peg$FAILED) {
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c39(s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_invalidNameStartChar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 46) {
          s0 = peg$c34;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 45) {
            s0 = peg$c40;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }
          if (s0 === peg$FAILED) {
            if (peg$c42.test(input.charAt(peg$currPos))) {
              s0 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c43); }
            }
          }
        }

        return s0;
      }

      function peg$parse_0m_invalidValueStartChar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 47) {
          s0 = peg$c44;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c45); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 91) {
            s0 = peg$c12;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
        }

        return s0;
      }

      function peg$parse_0m_modifierChar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 33) {
          s0 = peg$c46;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c47); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 63) {
            s0 = peg$c48;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c49); }
          }
        }

        return s0;
      }

      function peg$parse_0newMustacheNameChar() {
        var s0;

        if (peg$c50.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c51); }
        }
        if (s0 === peg$FAILED) {
          if (peg$c52.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c53); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 45) {
              s0 = peg$c40;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c41); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s0 = peg$c34;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c35); }
              }
            }
          }
        }

        return s0;
      }

      function peg$parse_0newMustacheAttr() {
        var s0;

        s0 = peg$parse_0m_keyValue();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_0m_parenthetical();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_0newMustacheAttrValue();
          }
        }

        return s0;
      }

      function peg$parse_0m_keyValue() {
        var s0, s1, s2, s3, s4, s5, s6, s7;

        s0 = peg$currPos;
        s1 = peg$parse_0newMustacheAttrName();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$parse_0m_();
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$parse_0m_();
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 61) {
              s3 = peg$c54;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c55); }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parse_0m_();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parse_0m_();
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_0newMustacheAttrValue();
                if (s5 !== peg$FAILED) {
                  s6 = [];
                  s7 = peg$parse_0m_();
                  while (s7 !== peg$FAILED) {
                    s6.push(s7);
                    s7 = peg$parse_0m_();
                  }
                  if (s6 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c56(s1, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0newMustacheAttrName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0newMustacheNameChar();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_0newMustacheNameChar();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0newMustacheAttrValue() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parse_0m_invalidValueStartChar();
        if (s2 === peg$FAILED) {
          s2 = peg$parse_0m_blockStart();
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_0m_quotedString();
          if (s2 === peg$FAILED) {
            s2 = peg$parse_0m_valuePath();
            if (s2 === peg$FAILED) {
              s2 = peg$parse_0m_parenthetical();
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_0m_();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_0m_();
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c57(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_valuePath() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0newMustacheNameChar();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_0newMustacheNameChar();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0m_quotedString() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c58;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c59); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_0m_stringWithoutDouble();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 34) {
              s4 = peg$c58;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c59); }
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c60;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_0m_stringWithoutSingle();
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 39) {
                s4 = peg$c60;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s4 !== peg$FAILED) {
                s2 = [s2, s3, s4];
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$c0;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
          if (s1 !== peg$FAILED) {
            s1 = input.substring(s0, peg$currPos);
          }
          s0 = s1;
        }

        return s0;
      }

      function peg$parse_0m_stringWithoutDouble() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0m_inStringChar();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c60;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_0m_inStringChar();
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 39) {
              s2 = peg$c60;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c61); }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0m_stringWithoutSingle() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0m_inStringChar();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s2 = peg$c58;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c59); }
          }
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_0m_inStringChar();
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 34) {
              s2 = peg$c58;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c59); }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_0m_inStringChar() {
        var s0;

        if (peg$c62.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c63); }
        }

        return s0;
      }

      function peg$parse_0m_inParensChar() {
        var s0;

        if (peg$c64.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c65); }
        }

        return s0;
      }

      function peg$parse_0m_commentChar() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 47) {
          s0 = peg$c44;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c45); }
        }

        return s0;
      }

      function peg$parse_0m_parenthetical() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_0m_();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_0m_();
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$currPos;
          s4 = peg$parse_0m_OPEN_PAREN();
          if (s4 !== peg$FAILED) {
            s5 = [];
            s6 = peg$parse_0m_inParensChar();
            while (s6 !== peg$FAILED) {
              s5.push(s6);
              s6 = peg$parse_0m_inParensChar();
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_0m_parenthetical();
              if (s6 === peg$FAILED) {
                s6 = peg$c2;
              }
              if (s6 !== peg$FAILED) {
                s7 = [];
                s8 = peg$parse_0m_inParensChar();
                while (s8 !== peg$FAILED) {
                  s7.push(s8);
                  s8 = peg$parse_0m_inParensChar();
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parse_0m_CLOSE_PAREN();
                  if (s8 !== peg$FAILED) {
                    s4 = [s4, s5, s6, s7, s8];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c0;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            s3 = input.substring(s2, peg$currPos);
          }
          s2 = s3;
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_0m_();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_0m_();
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c66(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_0m_OPEN_PAREN() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 40) {
          s0 = peg$c67;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c68); }
        }

        return s0;
      }

      function peg$parse_0m_CLOSE_PAREN() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 41) {
          s0 = peg$c69;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c70); }
        }

        return s0;
      }

      function peg$parse_0m_() {
        var s0;

        if (input.charCodeAt(peg$currPos) === 32) {
          s0 = peg$c71;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c72); }
        }

        return s0;
      }

      function peg$parse_1start() {
        var s0;

        s0 = peg$parse_1program();

        return s0;
      }

      function peg$parse_1program() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

        s0 = peg$currPos;
        s1 = peg$parse_1content();
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parse_1DEDENT();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_1else();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_1_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_1TERM();
                if (s6 !== peg$FAILED) {
                  s7 = [];
                  s8 = peg$parse_1blankLine();
                  while (s8 !== peg$FAILED) {
                    s7.push(s8);
                    s8 = peg$parse_1blankLine();
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_1indentation();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse_1content();
                      if (s9 !== peg$FAILED) {
                        peg$reportedPos = s2;
                        s3 = peg$c73(s9);
                        s2 = s3;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$c0;
                      }
                    } else {
                      peg$currPos = s2;
                      s2 = peg$c0;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$c0;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$c0;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c74(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1invertibleContent() {
        var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

        s0 = peg$currPos;
        s1 = peg$parse_1content();
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parse_1DEDENT();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_1else();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_1_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_1TERM();
                if (s6 !== peg$FAILED) {
                  s7 = [];
                  s8 = peg$parse_1blankLine();
                  while (s8 !== peg$FAILED) {
                    s7.push(s8);
                    s8 = peg$parse_1blankLine();
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse_1indentation();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse_1content();
                      if (s9 !== peg$FAILED) {
                        peg$reportedPos = s2;
                        s3 = peg$c73(s9);
                        s2 = s3;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$c0;
                      }
                    } else {
                      peg$currPos = s2;
                      s2 = peg$c0;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$c0;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$c0;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c75(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1else() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 61) {
          s2 = peg$c54;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c55); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_1_();
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c76) {
            s2 = peg$c76;
            peg$currPos += 4;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c77); }
          }
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1content() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1statement();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_1statement();
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c78(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1statement() {
        var s0, s1;

        peg$silentFails++;
        s0 = peg$parse_1blankLine();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1comment();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_1contentStatement();
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c79); }
        }

        return s0;
      }

      function peg$parse_1contentStatement() {
        var s0, s1;

        peg$silentFails++;
        s0 = peg$parse_1legacyPartialInvocation();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1htmlElement();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_1textLine();
            if (s0 === peg$FAILED) {
              s0 = peg$parse_1mustache();
            }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c80); }
        }

        return s0;
      }

      function peg$parse_1blankLine() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$parse_1_();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1TERM();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c81();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1legacyPartialInvocation() {
        var s0, s1, s2, s3, s4, s5, s6;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 62) {
          s1 = peg$c82;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c83); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1legacyPartialName();
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parse_1inMustacheParam();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parse_1inMustacheParam();
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_1_();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parse_1TERM();
                  if (s6 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c84(s3, s4);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1legacyPartialName() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = [];
        if (peg$c85.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c86); }
        }
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c85.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c86); }
            }
          }
        } else {
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s2 = input.substring(s1, peg$currPos);
        }
        s1 = s2;
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c87(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1mustache() {
        var s0, s1;

        s0 = peg$currPos;
        s1 = peg$parse_1explicitMustache();
        if (s1 === peg$FAILED) {
          s1 = peg$parse_1lineStartingMustache();
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c88(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1commentContent() {
        var s0, s1, s2, s3, s4, s5, s6, s7;

        s0 = peg$currPos;
        s1 = peg$parse_1lineContent();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1TERM();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$currPos;
            s5 = peg$parse_1indentation();
            if (s5 !== peg$FAILED) {
              s6 = [];
              s7 = peg$parse_1commentContent();
              if (s7 !== peg$FAILED) {
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$parse_1commentContent();
                }
              } else {
                s6 = peg$c0;
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_1anyDedent();
                if (s7 !== peg$FAILED) {
                  s5 = [s5, s6, s7];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$currPos;
              s5 = peg$parse_1indentation();
              if (s5 !== peg$FAILED) {
                s6 = [];
                s7 = peg$parse_1commentContent();
                if (s7 !== peg$FAILED) {
                  while (s7 !== peg$FAILED) {
                    s6.push(s7);
                    s7 = peg$parse_1commentContent();
                  }
                } else {
                  s6 = peg$c0;
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_1anyDedent();
                  if (s7 !== peg$FAILED) {
                    s5 = [s5, s6, s7];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$c0;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c81();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1comment() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 47) {
          s1 = peg$c44;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c45); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1commentContent();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c81();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1inlineComment() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 47) {
          s1 = peg$c44;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c45); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1lineContent();
          if (s2 !== peg$FAILED) {
            s1 = [s1, s2];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1lineStartingMustache() {
        var s0, s1;

        s0 = peg$currPos;
        s1 = peg$parse_1capitalizedLineStarterMustache();
        if (s1 === peg$FAILED) {
          s1 = peg$parse_1mustacheOrBlock();
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c89(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1capitalizedLineStarterMustache() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        if (peg$c90.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c91); }
        }
        peg$silentFails--;
        if (s2 !== peg$FAILED) {
          peg$currPos = s1;
          s1 = peg$c10;
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1mustacheOrBlock();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c92(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1htmlNestedTextNodes() {
        var s0, s1, s2, s3, s4, s5, s6;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 32) {
          s1 = peg$c71;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c72); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1textNodes();
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$parse_1indentation();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parse_1whitespaceableTextNodes();
              if (s6 !== peg$FAILED) {
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parse_1whitespaceableTextNodes();
                }
              } else {
                s5 = peg$c0;
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_1DEDENT();
                if (s6 !== peg$FAILED) {
                  s4 = [s4, s5, s6];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
            if (s3 === peg$FAILED) {
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c93(s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1indentedContent() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1blankLine();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_1blankLine();
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1indentation();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1content();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_1DEDENT();
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c94(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1unindentedContent() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1blankLine();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_1blankLine();
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1content();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1DEDENT();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c94(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1htmlTerminator() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$parse_1colonContent();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_1_();
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_1explicitMustache();
            if (s2 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c95(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parse_1_();
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_1inlineComment();
              if (s2 === peg$FAILED) {
                s2 = peg$c2;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_1TERM();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_1indentedContent();
                  if (s4 === peg$FAILED) {
                    s4 = peg$c2;
                  }
                  if (s4 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c94(s4);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parse_1_();
              if (s1 !== peg$FAILED) {
                s2 = peg$parse_1inlineComment();
                if (s2 === peg$FAILED) {
                  s2 = peg$c2;
                }
                if (s2 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 93) {
                    s3 = peg$c14;
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c15); }
                  }
                  if (s3 !== peg$FAILED) {
                    s4 = peg$parse_1TERM();
                    if (s4 !== peg$FAILED) {
                      s5 = peg$parse_1unindentedContent();
                      if (s5 === peg$FAILED) {
                        s5 = peg$c2;
                      }
                      if (s5 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c94(s5);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                s1 = peg$parse_1htmlNestedTextNodes();
                if (s1 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c96(s1);
                }
                s0 = s1;
              }
            }
          }
        }

        return s0;
      }

      function peg$parse_1htmlElement() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$parse_1inHtmlTag();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1htmlTerminator();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c97(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1mustacheOrBlock() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_1inMustache();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1inlineComment();
            if (s3 === peg$FAILED) {
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_1mustacheNestedContent();
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c98(s1, s4);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1colonContent() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c99) {
          s1 = peg$c99;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c100); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1contentStatement();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c94(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1mustacheNestedContent() {
        var s0, s1, s2, s3, s4, s5, s6;

        s0 = peg$currPos;
        s1 = peg$parse_1colonContent();
        if (s1 === peg$FAILED) {
          s1 = peg$parse_1textLine();
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c101(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_1_();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 93) {
              s2 = peg$c14;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c15); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parse_1TERM();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_1colonContent();
                if (s4 === peg$FAILED) {
                  s4 = peg$parse_1textLine();
                  if (s4 === peg$FAILED) {
                    s4 = peg$parse_1htmlElement();
                  }
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_1DEDENT();
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c102(s4);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parse_1TERM();
            if (s1 !== peg$FAILED) {
              s2 = peg$currPos;
              s3 = [];
              s4 = peg$parse_1blankLine();
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parse_1blankLine();
              }
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_1indentation();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_1invertibleContent();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parse_1DEDENT();
                    if (s6 !== peg$FAILED) {
                      peg$reportedPos = s2;
                      s3 = peg$c103(s5);
                      s2 = s3;
                    } else {
                      peg$currPos = s2;
                      s2 = peg$c0;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$c0;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$c0;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
              if (s2 === peg$FAILED) {
                s2 = peg$c2;
              }
              if (s2 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c104(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              s1 = peg$parse_1_();
              if (s1 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 93) {
                  s2 = peg$c14;
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c15); }
                }
                if (s2 !== peg$FAILED) {
                  s3 = peg$parse_1TERM();
                  if (s3 !== peg$FAILED) {
                    s4 = peg$parse_1invertibleContent();
                    if (s4 !== peg$FAILED) {
                      s5 = peg$parse_1DEDENT();
                      if (s5 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c104(s4);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            }
          }
        }

        return s0;
      }

      function peg$parse_1explicitMustache() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$parse_1equalSign();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1mustacheOrBlock();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c105(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1inMustache() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 62) {
          s1 = peg$c82;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c83); }
        }
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 91) {
            s4 = peg$c12;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_1TERM();
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = peg$c10;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1_();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_0newMustache();
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_1inlineComment();
                if (s5 === peg$FAILED) {
                  s5 = peg$c2;
                }
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c106(s1, s4);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1htmlMustacheAttribute() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = peg$parse_1_();
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parse_1tagNameShorthand();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s2;
            s3 = peg$c107(s3);
          }
          s2 = s3;
          if (s2 === peg$FAILED) {
            s2 = peg$currPos;
            s3 = peg$parse_1idShorthand();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s2;
              s3 = peg$c108(s3);
            }
            s2 = s3;
            if (s2 === peg$FAILED) {
              s2 = peg$currPos;
              s3 = peg$parse_1classShorthand();
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s2;
                s3 = peg$c109(s3);
              }
              s2 = s3;
            }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c110(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1inMustacheParam() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = peg$parse_1htmlMustacheAttribute();
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          s2 = peg$parse_1__();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1param();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s1;
              s2 = peg$c111(s3);
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c112(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1pathIdent() {
        var s0, s1, s2, s3, s4;

        peg$silentFails++;
        if (input.substr(peg$currPos, 2) === peg$c114) {
          s0 = peg$c114;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c115); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s0 = peg$c34;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c35); }
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$currPos;
            s2 = [];
            if (peg$c116.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c117); }
            }
            if (s3 !== peg$FAILED) {
              while (s3 !== peg$FAILED) {
                s2.push(s3);
                if (peg$c116.test(input.charAt(peg$currPos))) {
                  s3 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c117); }
                }
              }
            } else {
              s2 = peg$c0;
            }
            if (s2 !== peg$FAILED) {
              s2 = input.substring(s1, peg$currPos);
            }
            s1 = s2;
            if (s1 !== peg$FAILED) {
              s2 = peg$currPos;
              peg$silentFails++;
              if (input.charCodeAt(peg$currPos) === 61) {
                s3 = peg$c54;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c55); }
              }
              peg$silentFails--;
              if (s3 === peg$FAILED) {
                s2 = peg$c10;
              } else {
                peg$currPos = s2;
                s2 = peg$c0;
              }
              if (s2 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c118(s1);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 91) {
                s1 = peg$c12;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c13); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$currPos;
                s3 = [];
                if (peg$c119.test(input.charAt(peg$currPos))) {
                  s4 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c120); }
                }
                while (s4 !== peg$FAILED) {
                  s3.push(s4);
                  if (peg$c119.test(input.charAt(peg$currPos))) {
                    s4 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s4 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c120); }
                  }
                }
                if (s3 !== peg$FAILED) {
                  s3 = input.substring(s2, peg$currPos);
                }
                s2 = s3;
                if (s2 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 93) {
                    s3 = peg$c14;
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c15); }
                  }
                  if (s3 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c121(s2);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c113); }
        }

        return s0;
      }

      function peg$parse_1key() {
        var s0, s1, s2;

        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1nmchar();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s2 = peg$c123;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c124); }
          }
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_1nmchar();
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 58) {
              s2 = peg$c123;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c124); }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c122); }
        }

        return s0;
      }

      function peg$parse_1param() {
        var s0;

        s0 = peg$parse_1booleanNode();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1integerNode();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_1pathIdNode();
            if (s0 === peg$FAILED) {
              s0 = peg$parse_1stringNode();
            }
          }
        }

        return s0;
      }

      function peg$parse_1path() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parse_1pathIdent();
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$parse_1separator();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_1pathIdent();
            if (s5 !== peg$FAILED) {
              peg$reportedPos = s3;
              s4 = peg$c125(s4, s5);
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$parse_1separator();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_1pathIdent();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s3;
                s4 = peg$c125(s4, s5);
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c126(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1separator() {
        var s0, s1;

        peg$silentFails++;
        if (peg$c128.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c129); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c127); }
        }

        return s0;
      }

      function peg$parse_1pathIdNode() {
        var s0, s1;

        s0 = peg$currPos;
        s1 = peg$parse_1path();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c130(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1stringNode() {
        var s0, s1;

        s0 = peg$currPos;
        s1 = peg$parse_1string();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c131(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1integerNode() {
        var s0, s1;

        s0 = peg$currPos;
        s1 = peg$parse_1integer();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c132(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1booleanNode() {
        var s0, s1;

        s0 = peg$currPos;
        s1 = peg$parse_1boolean();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c133(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1boolean() {
        var s0, s1;

        peg$silentFails++;
        if (input.substr(peg$currPos, 4) === peg$c135) {
          s0 = peg$c135;
          peg$currPos += 4;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c136); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c137) {
            s0 = peg$c137;
            peg$currPos += 5;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c138); }
          }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c134); }
        }

        return s0;
      }

      function peg$parse_1integer() {
        var s0, s1, s2, s3, s4, s5;

        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$currPos;
        s2 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
          s3 = peg$c40;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c41); }
        }
        if (s3 === peg$FAILED) {
          s3 = peg$c2;
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          if (peg$c42.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c43); }
          }
          if (s5 !== peg$FAILED) {
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              if (peg$c42.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c43); }
              }
            }
          } else {
            s4 = peg$c0;
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s2 = input.substring(s1, peg$currPos);
        }
        s1 = s2;
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c140(s1);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c139); }
        }

        return s0;
      }

      function peg$parse_1string() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c58;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c59); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_1hashDoubleQuoteStringValue();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 34) {
              s4 = peg$c58;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c59); }
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c60;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1hashSingleQuoteStringValue();
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 39) {
                s4 = peg$c60;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s4 !== peg$FAILED) {
                s2 = [s2, s3, s4];
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$c0;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c141(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1stringWithQuotes() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c58;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c59); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_1hashDoubleQuoteStringValue();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 34) {
              s4 = peg$c58;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c59); }
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c60;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1hashSingleQuoteStringValue();
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 39) {
                s4 = peg$c60;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s4 !== peg$FAILED) {
                s2 = [s2, s3, s4];
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$c0;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c66(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1hashDoubleQuoteStringValue() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$currPos;
        peg$silentFails++;
        s4 = peg$parse_1TERM();
        peg$silentFails--;
        if (s4 === peg$FAILED) {
          s3 = peg$c10;
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        if (s3 !== peg$FAILED) {
          if (peg$c142.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c143); }
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$currPos;
          s3 = peg$currPos;
          peg$silentFails++;
          s4 = peg$parse_1TERM();
          peg$silentFails--;
          if (s4 === peg$FAILED) {
            s3 = peg$c10;
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            if (peg$c142.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c143); }
            }
            if (s4 !== peg$FAILED) {
              s3 = [s3, s4];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1hashSingleQuoteStringValue() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$currPos;
        peg$silentFails++;
        s4 = peg$parse_1TERM();
        peg$silentFails--;
        if (s4 === peg$FAILED) {
          s3 = peg$c10;
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        if (s3 !== peg$FAILED) {
          if (peg$c144.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c145); }
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$currPos;
          s3 = peg$currPos;
          peg$silentFails++;
          s4 = peg$parse_1TERM();
          peg$silentFails--;
          if (s4 === peg$FAILED) {
            s3 = peg$c10;
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          if (s3 !== peg$FAILED) {
            if (peg$c144.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c145); }
            }
            if (s4 !== peg$FAILED) {
              s3 = [s3, s4];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$c0;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1alpha() {
        var s0;

        if (peg$c146.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c147); }
        }

        return s0;
      }

      function peg$parse_1whitespaceableTextNodes() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_1indentation();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1textNodes();
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_1whitespaceableTextNodes();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_1whitespaceableTextNodes();
            }
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_1anyDedent();
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c148(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1textNodes();
        }

        return s0;
      }

      function peg$parse_1textLineStart() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (peg$c149.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c150); }
        }
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 32) {
            s2 = peg$c71;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c72); }
          }
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c118(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$currPos;
          peg$silentFails++;
          if (input.charCodeAt(peg$currPos) === 60) {
            s2 = peg$c151;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c152); }
          }
          peg$silentFails--;
          if (s2 !== peg$FAILED) {
            peg$currPos = s1;
            s1 = peg$c10;
          } else {
            s1 = peg$c0;
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c153();
          }
          s0 = s1;
        }

        return s0;
      }

      function peg$parse_1textLine() {
        var s0, s1, s2, s3, s4, s5, s6;

        s0 = peg$currPos;
        s1 = peg$parse_1textLineStart();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1textNodes();
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$parse_1indentation();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parse_1whitespaceableTextNodes();
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                s6 = peg$parse_1whitespaceableTextNodes();
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_1DEDENT();
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c154(s5);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
            if (s3 === peg$FAILED) {
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c155(s1, s2, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1textNodes() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parse_1preMustacheText();
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$parse_1rawMustache();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_1preMustacheText();
            if (s5 === peg$FAILED) {
              s5 = peg$c2;
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$parse_1rawMustache();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_1preMustacheText();
              if (s5 === peg$FAILED) {
                s5 = peg$c2;
              }
              if (s5 !== peg$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1TERM();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c156(s1, s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1attributeTextNodes() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 34) {
          s1 = peg$c58;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c59); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1attributeTextNodesInner();
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 34) {
              s3 = peg$c58;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c59); }
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c112(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 39) {
            s1 = peg$c60;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_1attributeTextNodesInnerSingle();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 39) {
                s3 = peg$c60;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c112(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }

        return s0;
      }

      function peg$parse_1attributeTextNodesInner() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parse_1preAttrMustacheText();
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$parse_1rawMustache();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_1preAttrMustacheText();
            if (s5 === peg$FAILED) {
              s5 = peg$c2;
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$parse_1rawMustache();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_1preAttrMustacheText();
              if (s5 === peg$FAILED) {
                s5 = peg$c2;
              }
              if (s5 !== peg$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c157(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1attributeTextNodesInnerSingle() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parse_1preAttrMustacheTextSingle();
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          s3 = peg$currPos;
          s4 = peg$parse_1rawMustache();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_1preAttrMustacheTextSingle();
            if (s5 === peg$FAILED) {
              s5 = peg$c2;
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            s3 = peg$currPos;
            s4 = peg$parse_1rawMustache();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_1preAttrMustacheTextSingle();
              if (s5 === peg$FAILED) {
                s5 = peg$c2;
              }
              if (s5 !== peg$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c157(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1rawMustache() {
        var s0;

        s0 = peg$parse_1rawMustacheUnescaped();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1rawMustacheEscaped();
        }

        return s0;
      }

      function peg$parse_1recursivelyParsedMustacheContent() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 123) {
          s2 = peg$c158;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c159); }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = [];
          if (peg$c160.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c161); }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c160.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c161); }
            }
          }
          if (s3 !== peg$FAILED) {
            s3 = input.substring(s2, peg$currPos);
          }
          s2 = s3;
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c162(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1rawMustacheEscaped() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parse_1doubleOpen();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1recursivelyParsedMustacheContent();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_1_();
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_1doubleClose();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c163(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_1hashStacheOpen();
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_1_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parse_1recursivelyParsedMustacheContent();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_1_();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_1hashStacheClose();
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c163(s3);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }

        return s0;
      }

      function peg$parse_1rawMustacheUnescaped() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parse_1tripleOpen();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1recursivelyParsedMustacheContent();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_1_();
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_1tripleClose();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c164(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1preAttrMustacheText() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1preAttrMustacheUnit();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_1preAttrMustacheUnit();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1preAttrMustacheTextSingle() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1preAttrMustacheUnitSingle();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_1preAttrMustacheUnitSingle();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1preAttrMustacheUnit() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parse_1nonMustacheUnit();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s2 = peg$c58;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c59); }
          }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c94(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1preAttrMustacheUnitSingle() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parse_1nonMustacheUnit();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c60;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c94(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1preMustacheText() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1preMustacheUnit();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_1preMustacheUnit();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1preMustacheUnit() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parse_1nonMustacheUnit();
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c94(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1nonMustacheUnit() {
        var s0;

        s0 = peg$parse_1tripleOpen();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1doubleOpen();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_1hashStacheOpen();
            if (s0 === peg$FAILED) {
              s0 = peg$parse_1anyDedent();
              if (s0 === peg$FAILED) {
                s0 = peg$parse_1TERM();
              }
            }
          }
        }

        return s0;
      }

      function peg$parse_1rawMustacheSingle() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parse_1singleOpen();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1recursivelyParsedMustacheContent();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_1_();
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_1singleClose();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c165(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1inTagMustache() {
        var s0;

        s0 = peg$parse_1rawMustacheSingle();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1rawMustacheUnescaped();
          if (s0 === peg$FAILED) {
            s0 = peg$parse_1rawMustacheEscaped();
          }
        }

        return s0;
      }

      function peg$parse_1singleOpen() {
        var s0, s1;

        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 123) {
          s0 = peg$c158;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c159); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c166); }
        }

        return s0;
      }

      function peg$parse_1doubleOpen() {
        var s0, s1;

        peg$silentFails++;
        if (input.substr(peg$currPos, 2) === peg$c168) {
          s0 = peg$c168;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c169); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c167); }
        }

        return s0;
      }

      function peg$parse_1tripleOpen() {
        var s0, s1;

        peg$silentFails++;
        if (input.substr(peg$currPos, 3) === peg$c171) {
          s0 = peg$c171;
          peg$currPos += 3;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c172); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c170); }
        }

        return s0;
      }

      function peg$parse_1singleClose() {
        var s0, s1;

        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 125) {
          s0 = peg$c174;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c175); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c173); }
        }

        return s0;
      }

      function peg$parse_1doubleClose() {
        var s0, s1;

        peg$silentFails++;
        if (input.substr(peg$currPos, 2) === peg$c177) {
          s0 = peg$c177;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c178); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c176); }
        }

        return s0;
      }

      function peg$parse_1tripleClose() {
        var s0, s1;

        peg$silentFails++;
        if (input.substr(peg$currPos, 3) === peg$c180) {
          s0 = peg$c180;
          peg$currPos += 3;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c181); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c179); }
        }

        return s0;
      }

      function peg$parse_1sexprOpen() {
        var s0, s1;

        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 40) {
          s0 = peg$c67;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c68); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c182); }
        }

        return s0;
      }

      function peg$parse_1sexprClose() {
        var s0, s1;

        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 41) {
          s0 = peg$c69;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c70); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c183); }
        }

        return s0;
      }

      function peg$parse_1hashStacheOpen() {
        var s0, s1;

        peg$silentFails++;
        if (input.substr(peg$currPos, 2) === peg$c185) {
          s0 = peg$c185;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c186); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c184); }
        }

        return s0;
      }

      function peg$parse_1hashStacheClose() {
        var s0, s1;

        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 125) {
          s0 = peg$c174;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c175); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c187); }
        }

        return s0;
      }

      function peg$parse_1equalSign() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c188) {
          s1 = peg$c188;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c189); }
        }
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 32) {
            s2 = peg$c71;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c72); }
          }
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c190();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 61) {
            s1 = peg$c54;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 32) {
              s2 = peg$c71;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c72); }
            }
            if (s2 === peg$FAILED) {
              s2 = peg$c2;
            }
            if (s2 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c191();
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }

        return s0;
      }

      function peg$parse_1htmlStart() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$parse_1htmlTagName();
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1shorthandAttributes();
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 47) {
              s3 = peg$c44;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c45); }
            }
            if (s3 === peg$FAILED) {
              s3 = peg$c2;
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = peg$currPos;
              s4 = peg$c192(s1, s2);
              if (s4) {
                s4 = peg$c10;
              } else {
                s4 = peg$c0;
              }
              if (s4 !== peg$FAILED) {
                s1 = [s1, s2, s3, s4];
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1inHtmlTag() {
        var s0, s1, s2, s3, s4, s5, s6;

        s0 = peg$currPos;
        s1 = peg$parse_1htmlStart();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c193) {
            s2 = peg$c193;
            peg$currPos += 2;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c194); }
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parse_1TERM();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parse_1TERM();
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parse_1inTagMustache();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parse_1inTagMustache();
              }
              if (s4 !== peg$FAILED) {
                s5 = [];
                s6 = peg$parse_1bracketedAttribute();
                if (s6 !== peg$FAILED) {
                  while (s6 !== peg$FAILED) {
                    s5.push(s6);
                    s6 = peg$parse_1bracketedAttribute();
                  }
                } else {
                  s5 = peg$c0;
                }
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c195(s1, s4, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_1htmlStart();
          if (s1 !== peg$FAILED) {
            s2 = [];
            s3 = peg$parse_1inTagMustache();
            while (s3 !== peg$FAILED) {
              s2.push(s3);
              s3 = peg$parse_1inTagMustache();
            }
            if (s2 !== peg$FAILED) {
              s3 = [];
              s4 = peg$parse_1fullAttribute();
              while (s4 !== peg$FAILED) {
                s3.push(s4);
                s4 = peg$parse_1fullAttribute();
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c195(s1, s2, s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }

        return s0;
      }

      function peg$parse_1shorthandAttributes() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$currPos;
        s3 = peg$parse_1idShorthand();
        if (s3 !== peg$FAILED) {
          peg$reportedPos = s2;
          s3 = peg$c196(s3);
        }
        s2 = s3;
        if (s2 === peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parse_1classShorthand();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s2;
            s3 = peg$c197(s3);
          }
          s2 = s3;
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$currPos;
            s3 = peg$parse_1idShorthand();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s2;
              s3 = peg$c196(s3);
            }
            s2 = s3;
            if (s2 === peg$FAILED) {
              s2 = peg$currPos;
              s3 = peg$parse_1classShorthand();
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s2;
                s3 = peg$c197(s3);
              }
              s2 = s3;
            }
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c198(s1);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1fullAttribute() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        if (input.charCodeAt(peg$currPos) === 32) {
          s2 = peg$c71;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c72); }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (input.charCodeAt(peg$currPos) === 32) {
              s2 = peg$c71;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c72); }
            }
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1actionAttribute();
          if (s2 === peg$FAILED) {
            s2 = peg$parse_1booleanAttribute();
            if (s2 === peg$FAILED) {
              s2 = peg$parse_1boundAttributeWithSingleMustache();
              if (s2 === peg$FAILED) {
                s2 = peg$parse_1boundAttribute();
                if (s2 === peg$FAILED) {
                  s2 = peg$parse_1rawMustacheAttribute();
                  if (s2 === peg$FAILED) {
                    s2 = peg$parse_1normalAttribute();
                  }
                }
              }
            }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c199(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1bracketedAttribute() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1INDENT();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_1INDENT();
        }
        if (s1 !== peg$FAILED) {
          s2 = [];
          if (input.charCodeAt(peg$currPos) === 32) {
            s3 = peg$c71;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c72); }
          }
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (input.charCodeAt(peg$currPos) === 32) {
              s3 = peg$c71;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c72); }
            }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1actionAttribute();
            if (s3 === peg$FAILED) {
              s3 = peg$parse_1booleanAttribute();
              if (s3 === peg$FAILED) {
                s3 = peg$parse_1boundAttribute();
                if (s3 === peg$FAILED) {
                  s3 = peg$parse_1rawMustacheAttribute();
                  if (s3 === peg$FAILED) {
                    s3 = peg$parse_1normalAttribute();
                  }
                }
              }
            }
            if (s3 !== peg$FAILED) {
              s4 = [];
              s5 = peg$parse_1TERM();
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parse_1TERM();
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c200(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1boundAttributeValueChar() {
        var s0;

        if (peg$c201.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c202); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1nonSeparatorColon();
        }

        return s0;
      }

      function peg$parse_1actionValue() {
        var s0, s1;

        s0 = peg$parse_1stringWithQuotes();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_1pathIdNode();
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c203(s1);
          }
          s0 = s1;
        }

        return s0;
      }

      function peg$parse_1actionAttribute() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = peg$parse_1knownEvent();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c54;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1actionValue();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c204(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1booleanAttribute() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = peg$parse_1key();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c54;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s2 !== peg$FAILED) {
            if (input.substr(peg$currPos, 4) === peg$c135) {
              s3 = peg$c135;
              peg$currPos += 4;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c136); }
            }
            if (s3 === peg$FAILED) {
              if (input.substr(peg$currPos, 5) === peg$c137) {
                s3 = peg$c137;
                peg$currPos += 5;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c138); }
              }
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c205(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1boundAttributeValue() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 123) {
          s1 = peg$c158;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c159); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1_();
          if (s2 !== peg$FAILED) {
            s3 = peg$currPos;
            s4 = [];
            s5 = peg$parse_1boundAttributeValueChar();
            if (s5 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 32) {
                s5 = peg$c71;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c72); }
              }
            }
            if (s5 !== peg$FAILED) {
              while (s5 !== peg$FAILED) {
                s4.push(s5);
                s5 = peg$parse_1boundAttributeValueChar();
                if (s5 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 32) {
                    s5 = peg$c71;
                    peg$currPos++;
                  } else {
                    s5 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c72); }
                  }
                }
              }
            } else {
              s4 = peg$c0;
            }
            if (s4 !== peg$FAILED) {
              s4 = input.substring(s3, peg$currPos);
            }
            s3 = s4;
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_1_();
              if (s4 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 125) {
                  s5 = peg$c174;
                  peg$currPos++;
                } else {
                  s5 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c175); }
                }
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c206(s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = [];
          s2 = peg$parse_1boundAttributeValueChar();
          if (s2 !== peg$FAILED) {
            while (s2 !== peg$FAILED) {
              s1.push(s2);
              s2 = peg$parse_1boundAttributeValueChar();
            }
          } else {
            s1 = peg$c0;
          }
          if (s1 !== peg$FAILED) {
            s1 = input.substring(s0, peg$currPos);
          }
          s0 = s1;
        }

        return s0;
      }

      function peg$parse_1allCharactersExceptColonSyntax() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1nmchar();
        if (s2 === peg$FAILED) {
          if (peg$c207.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c208); }
          }
          if (s2 === peg$FAILED) {
            s2 = peg$parse_1whitespace();
            if (s2 === peg$FAILED) {
              s2 = peg$parse_1singleQuoteString();
              if (s2 === peg$FAILED) {
                s2 = peg$parse_1doubleQuoteString();
              }
            }
          }
        }
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_1nmchar();
          if (s2 === peg$FAILED) {
            if (peg$c207.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c208); }
            }
            if (s2 === peg$FAILED) {
              s2 = peg$parse_1whitespace();
              if (s2 === peg$FAILED) {
                s2 = peg$parse_1singleQuoteString();
                if (s2 === peg$FAILED) {
                  s2 = peg$parse_1doubleQuoteString();
                }
              }
            }
          }
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1nonQuoteChars() {
        var s0;

        if (peg$c209.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c210); }
        }

        return s0;
      }

      function peg$parse_1singleQuoteString() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        if (peg$c211.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c212); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parse_1nonQuoteChars();
          if (s4 === peg$FAILED) {
            if (peg$c213.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c214); }
            }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parse_1nonQuoteChars();
            if (s4 === peg$FAILED) {
              if (peg$c213.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c214); }
              }
            }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c211.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c212); }
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1doubleQuoteString() {
        var s0, s1, s2, s3, s4;

        s0 = peg$currPos;
        s1 = peg$currPos;
        if (peg$c213.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c214); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parse_1nonQuoteChars();
          if (s4 === peg$FAILED) {
            if (peg$c211.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c212); }
            }
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parse_1nonQuoteChars();
            if (s4 === peg$FAILED) {
              if (peg$c211.test(input.charAt(peg$currPos))) {
                s4 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c212); }
              }
            }
          }
          if (s3 !== peg$FAILED) {
            if (peg$c213.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c214); }
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c0;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1boundAttributeWithSingleMustache() {
        var s0, s1, s2, s3, s4, s5, s6, s7;

        s0 = peg$currPos;
        s1 = peg$parse_1key();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c54;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1singleOpen();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_1_();
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_1allCharactersExceptColonSyntax();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parse_1_();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse_1singleClose();
                    if (s7 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c215(s1, s5);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1boundAttribute() {
        var s0, s1, s2, s3, s4, s5;

        s0 = peg$currPos;
        s1 = peg$parse_1key();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c54;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1boundAttributeValue();
            if (s3 !== peg$FAILED) {
              s4 = peg$currPos;
              peg$silentFails++;
              if (input.charCodeAt(peg$currPos) === 33) {
                s5 = peg$c46;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c47); }
              }
              peg$silentFails--;
              if (s5 === peg$FAILED) {
                s4 = peg$c10;
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c216(s1, s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1rawMustacheAttribute() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = peg$parse_1key();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c54;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1pathIdNode();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c217(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1normalAttribute() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        s1 = peg$parse_1key();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 61) {
            s2 = peg$c54;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c55); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1attributeTextNodes();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c218(s1, s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1attributeName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1attributeChar();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_1attributeChar();
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1attributeChar() {
        var s0;

        s0 = peg$parse_1alpha();
        if (s0 === peg$FAILED) {
          if (peg$c42.test(input.charAt(peg$currPos))) {
            s0 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c43); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 95) {
              s0 = peg$c219;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c220); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 45) {
                s0 = peg$c40;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c41); }
              }
            }
          }
        }

        return s0;
      }

      function peg$parse_1tagNameShorthand() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 37) {
          s1 = peg$c28;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c29); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1cssIdentifier();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c94(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1idShorthand() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 35) {
          s1 = peg$c31;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1cssIdentifier();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c221(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1classShorthand() {
        var s0, s1, s2;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 46) {
          s1 = peg$c34;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c35); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1cssIdentifier();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c94(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1cssIdentifier() {
        var s0, s1;

        peg$silentFails++;
        s0 = peg$parse_1ident();
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c222); }
        }

        return s0;
      }

      function peg$parse_1ident() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1nmchar();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_1nmchar();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1nmchar() {
        var s0;

        if (peg$c223.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c224); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1nonascii();
        }

        return s0;
      }

      function peg$parse_1nmstart() {
        var s0;

        if (peg$c225.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c226); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1nonascii();
        }

        return s0;
      }

      function peg$parse_1nonascii() {
        var s0;

        if (peg$c227.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c228); }
        }

        return s0;
      }

      function peg$parse_1tagString() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1tagChar();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_1tagChar();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }

      function peg$parse_1htmlTagName() {
        var s0, s1, s2, s3;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 37) {
          s1 = peg$c28;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c29); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_1tagString();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c118(s3);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1knownTagName();
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c229); }
        }

        return s0;
      }

      function peg$parse_1knownTagName() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$parse_1tagString();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = peg$currPos;
          s2 = peg$c230(s1);
          if (s2) {
            s2 = peg$c10;
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c231(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1tagChar() {
        var s0;

        if (peg$c223.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c224); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1nonSeparatorColon();
        }

        return s0;
      }

      function peg$parse_1nonSeparatorColon() {
        var s0, s1, s2, s3;

        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 58) {
          s1 = peg$c123;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c124); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          if (input.charCodeAt(peg$currPos) === 32) {
            s3 = peg$c71;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c72); }
          }
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = peg$c10;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c94(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1knownEvent() {
        var s0, s1, s2;

        peg$silentFails++;
        s0 = peg$currPos;
        s1 = peg$parse_1tagString();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = peg$currPos;
          s2 = peg$c233(s1);
          if (s2) {
            s2 = peg$c10;
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c231(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c232); }
        }

        return s0;
      }

      function peg$parse_1indentation() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$parse_1INDENT();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_1__();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c118(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1INDENT() {
        var s0, s1, s2;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = peg$currPos;
          s2 = peg$c18(s1);
          if (s2) {
            s2 = peg$c10;
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c19(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c234); }
        }

        return s0;
      }

      function peg$parse_1DEDENT() {
        var s0, s1, s2;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = peg$currPos;
          s2 = peg$c236(s1);
          if (s2) {
            s2 = peg$c10;
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c19(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c235); }
        }

        return s0;
      }

      function peg$parse_1UNMATCHED_DEDENT() {
        var s0, s1, s2;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.length > peg$currPos) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c17); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = peg$currPos;
          s2 = peg$c238(s1);
          if (s2) {
            s2 = peg$c10;
          } else {
            s2 = peg$c0;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c19(s1);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c237); }
        }

        return s0;
      }

      function peg$parse_1TERM() {
        var s0, s1, s2, s3, s4;

        peg$silentFails++;
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 13) {
          s1 = peg$c21;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c22); }
        }
        if (s1 === peg$FAILED) {
          s1 = peg$c2;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = peg$currPos;
            s3 = peg$c23(s2);
            if (s3) {
              s3 = peg$c10;
            } else {
              s3 = peg$c0;
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 10) {
                s4 = peg$c24;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c25); }
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c26(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c239); }
        }

        return s0;
      }

      function peg$parse_1anyDedent() {
        var s0, s1;

        peg$silentFails++;
        s0 = peg$parse_1DEDENT();
        if (s0 === peg$FAILED) {
          s0 = peg$parse_1UNMATCHED_DEDENT();
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c240); }
        }

        return s0;
      }

      function peg$parse_1__() {
        var s0, s1, s2;

        peg$silentFails++;
        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1whitespace();
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            s2 = peg$parse_1whitespace();
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c241); }
        }

        return s0;
      }

      function peg$parse_1_() {
        var s0, s1;

        peg$silentFails++;
        s0 = [];
        s1 = peg$parse_1whitespace();
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$parse_1whitespace();
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c242); }
        }

        return s0;
      }

      function peg$parse_1whitespace() {
        var s0, s1;

        peg$silentFails++;
        if (peg$c244.test(input.charAt(peg$currPos))) {
          s0 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c245); }
        }
        peg$silentFails--;
        if (s0 === peg$FAILED) {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c243); }
        }

        return s0;
      }

      function peg$parse_1lineChar() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = peg$currPos;
        peg$silentFails++;
        s2 = peg$parse_1INDENT();
        if (s2 === peg$FAILED) {
          s2 = peg$parse_1DEDENT();
          if (s2 === peg$FAILED) {
            s2 = peg$parse_1TERM();
          }
        }
        peg$silentFails--;
        if (s2 === peg$FAILED) {
          s1 = peg$c10;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c94(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }

        return s0;
      }

      function peg$parse_1lineContent() {
        var s0, s1, s2;

        s0 = peg$currPos;
        s1 = [];
        s2 = peg$parse_1lineChar();
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parse_1lineChar();
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;

        return s0;
      }


        var builder = options.builder;

        var UNBOUND_MODIFIER = '!';
        var CONDITIONAL_MODIFIER = '?';

        var LINE_SPACE_MODIFIERS = {
          NEWLINE: '`',
          SPACE: "'"
        };

        var KNOWN_TAGS = {
          figcaption: true, blockquote: true, plaintext: true, textarea: true, progress: true,
          optgroup: true, noscript: true, noframes: true, frameset: true, fieldset: true,
          datalist: true, colgroup: true, basefont: true, summary: true, section: true,
          marquee: true, listing: true, isindex: true, details: true, command: true,
          caption: true, bgsound: true, article: true, address: true, acronym: true,
          strong: true, strike: true, spacer: true, source: true, select: true,
          script: true, output: true, option: true, object: true, legend: true,
          keygen: true, iframe: true, hgroup: true, header: true, footer: true,
          figure: true, center: true, canvas: true, button: true, applet: true, video: true,
          track: true, title: true, thead: true, tfoot: true, tbody: true, table: true,
          style: true, small: true, param: true, meter: true, label: true, input: true,
          frame: true, embed: true, blink: true, audio: true, aside: true, time: true,
          span: true, samp: true, ruby: true, nobr: true, meta: true, menu: true,
          mark: true, main: true, link: true, html: true, head: true, form: true,
          font: true, data: true, code: true, cite: true, body: true, base: true,
          area: true, abbr: true, xmp: true, wbr: true, 'var': true, sup: true,
          sub: true, pre: true, nav: true, map: true, kbd: true, ins: true,
          img: true, div: true, dir: true, dfn: true, del: true, col: true,
          big: true, bdo: true, bdi: true, ul: true, tt: true, tr: true, th: true, td: true,
          rt: true, rp: true, ol: true, li: true, hr: true, h6: true, h5: true, h4: true,
          h3: true, h2: true, h1: true, em: true, dt: true, dl: true, dd: true, br: true,
          u: true, s: true, q: true, p: true, i: true, b: true, a: true
        };

        var KNOWN_EVENTS = {
          "touchStart": true, "touchMove": true, "touchEnd": true, "touchCancel": true,
          "keyDown": true, "keyUp": true, "keyPress": true, "mouseDown": true, "mouseUp": true,
          "contextMenu": true, "click": true, "doubleClick": true, "mouseMove": true,
          "focusIn": true, "focusOut": true, "mouseEnter": true, "mouseLeave": true,
          "submit": true, "input": true, "change": true, "dragStart": true,
          "drag": true, "dragEnter": true, "dragLeave": true,
          "dragOver": true, "drop": true, "dragEnd": true
        };

        function prepareMustachValue(content){
          var parts = content.split(' '),
              first,
              match;

          // check for '!' unbound helper
          first = parts.shift();
          if (match = first.match(/(.*)!$/)) {
            parts.unshift( match[1] );
            content = 'unbound ' + parts.join(' ');
          } else {
            parts.unshift(first);
          }

          // check for '?' if helper
          first = parts.shift();
          if (match = first.match(/(.*)\?$/)) {
            parts.unshift( match[1] );
            content = 'if ' + parts.join(' ');
          } else {
            parts.unshift(first);
          }
          return content;
        }

        function castToAst(nodeOrString) {
          if (typeof nodeOrString === 'string') {
            return builder.generateText(nodeOrString);
          } else {
            return nodeOrString;
          }
        }

        function castStringsToTextNodes(possibleStrings) {
          var ret = [];
          var nodes = [];

          var currentString = null;
          var possibleString;

          for(var i=0, l=possibleStrings.length; i<l; i++) {
            possibleString = possibleStrings[i];
            if (typeof possibleString === 'string') {
              currentString = (currentString || '') + possibleString;
            } else {
              if (currentString) {
                ret.push( textNode(currentString) );
                currentString = null;
              }
              ret.push( possibleString ); // not a string, it is a node here
            }
          }
          if (currentString) {
            ret.push( textNode(currentString) );
          }
          return ret;
        }

        // attrs are simple strings,
        // combine all the ones that start with 'class='
        function coalesceAttrs(attrs){
          var classes = [];
          var newAttrs = [];
          var classRegex = /^class="(.*)"$/;
          var match;

          for (var i=0,l=attrs.length; i<l; i++) {
            var attr = attrs[i];
            if (match = attr.match(classRegex)) {
              classes.push(match[1]);
            } else {
              newAttrs.push(attr);
            }
          }

          if (classes.length) {
            newAttrs.push('class="' + classes.join(' ') + '"');
          }
          return newAttrs;
        }

        function createBlockOrMustache(mustacheTuple) {
          var mustache   = mustacheTuple[0];
          var blockTuple = mustacheTuple[1];

          var escaped    = mustache.isEscaped;
          var mustacheContent = mustache.name;
          var mustacheAttrs = mustache.attrs;
          var mustacheBlockParams = mustache.blockParams;

          if (mustacheAttrs.length) {
            var attrs = coalesceAttrs(mustacheAttrs);
            mustacheContent += ' ' + attrs.join(' ');
          }

          if (mustacheBlockParams) {
            mustacheContent += ' as |' + mustacheBlockParams.join(' ') + '|';
          }

          if (mustache.isViewHelper) {
            mustacheContent = 'view ' + mustacheContent;
          }

          if (mustache.modifier === UNBOUND_MODIFIER) {
            mustacheContent = 'unbound ' + mustacheContent;
          } else if (mustache.modifier === CONDITIONAL_MODIFIER) {
            mustacheContent = 'if ' + mustacheContent;
          }

          if (blockTuple) {
            var block = builder.generateBlock(mustacheContent, escaped);
            builder.enter(block);
            builder.add('childNodes', blockTuple[0]);
            if (blockTuple[1]) {
              builder.add('inverseChildNodes', blockTuple[1]);
            }
            return builder.exit();
          } else {
            return builder.generateMustache(mustacheContent, escaped);
          }
        }

        function flattenArray(first, tail) {
          var ret = [];
          if(first) {
            ret.push(first);
          }
          for(var i = 0; i < tail.length; ++i) {
            var t = tail[i];
            ret.push(t[0]);
            if(t[1]) {
              ret.push(t[1]);
            }
          }
          return ret;
        }

        function textNode(content){
          return builder.generateText(content);
        }

        /**
          Splits a value string into separate parts,
          then generates a classBinding for each part.
        */
        function splitValueIntoClassBindings(value) {
          return value.split(' ').map(function(v){
            return builder.generateClassNameBinding(v);
          });
        }

        function parseInHtml(h, inTagMustaches, fullAttributes) {
          var tagName = h[0] || 'div',
              shorthandAttributes = h[1] || [],
              id = shorthandAttributes[0],
              classes = shorthandAttributes[1] || [];
          var i, l;

          var elementNode = builder.generateElement(tagName);
          builder.enter(elementNode);

          for (i=0, l=classes.length;i<l;i++) {
            if (classes[i].type === 'classNameBinding') {
              builder.add('classNameBindings', classes[i]);
            } else {
              builder.classNameBinding(':'+classes[i]);
            }
          }

          if (id) {
            builder.attribute('id', id);
          }

          for(i = 0; i < inTagMustaches.length; ++i) {
            builder.add('attrStaches', inTagMustaches[i]);
          }

          for(i = 0; i < fullAttributes.length; ++i) {
            var currentAttr = fullAttributes[i];

            if (Array.isArray(currentAttr) && typeof currentAttr[0] === 'string') {  // a "normalAttribute", [attrName, attrContent]
              if (currentAttr.length) { // a boolean false attribute will be []

                // skip classes now, coalesce them later
                if (currentAttr[0] === 'class') {
                  builder.classNameBinding(':'+currentAttr[1]);
                } else {
                  builder.attribute(currentAttr[0], currentAttr[1]);
                }
              }
            } else if (Array.isArray(currentAttr)) {
              currentAttr.forEach(function(attrNode){
                builder.add(
                  attrNode.type === 'classNameBinding' ? 'classNameBindings' : 'attrStaches',
                  attrNode
                );
              });
            } else {
              builder.add(
                currentAttr.type === 'classNameBinding' ? 'classNameBindings' : 'attrStaches',
                currentAttr
              );
            }
          }
        }



      peg$result = peg$startRuleFunction();

      if (peg$result !== peg$FAILED && peg$currPos === input.length) {
        return peg$result;
      } else {
        if (peg$result !== peg$FAILED && peg$currPos < input.length) {
          peg$fail({ type: "end", description: "end of input" });
        }

        throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
      }
    }

    return {
      SyntaxError: SyntaxError,
      parse:       parse
    };
  })();
  var parse = Parser.parse, ParserSyntaxError = Parser.SyntaxError;
  exports['default'] = parse;

  exports.ParserSyntaxError = ParserSyntaxError;
  exports.parse = parse;

});
define('emblem/preprocessor', ['exports', 'string-scanner'], function (exports, StringScanner) {

  'use strict';

  exports.processSync = processSync;
  exports.prettyPrint = prettyPrint;

  var anyWhitespaceAndNewlinesTouchingEOF, any_whitespaceFollowedByNewlines_, processInput, ws;

  ws = "\\t\\x0B\\f \\xA0\\u1680\\u180E\\u2000-\\u200A\\u202F\\u205F\\u3000\\uFEFF";

  var INDENT_SYMBOL = "";
  var DEDENT_SYMBOL = "";
  var UNMATCHED_DEDENT_SYMBOL = "";
  var TERM_SYMBOL = "";

  // Prints an easy-to-read version of the preprocessed string for
  // debugging
  function prettyPrint(string) {
    var indent = new RegExp(INDENT_SYMBOL, "g");
    var dedent = new RegExp(DEDENT_SYMBOL, "g");
    var term = new RegExp(TERM_SYMBOL, "g");
    var unmatchedDedent = new RegExp(UNMATCHED_DEDENT_SYMBOL, "g");
    var newLine = new RegExp("\n", "g");
    var carriageReturn = new RegExp("\r", "g");

    return string.replace(indent, "{INDENT}").replace(dedent, "{DEDENT}").replace(term, "{TERM}").replace(unmatchedDedent, "{UNMATCHED_DEDENT}").replace(newLine, "{\\n}").replace(carriageReturn, "{\\r}");
  }

  anyWhitespaceAndNewlinesTouchingEOF = new RegExp("[" + ws + "\\r?\\n]*$");

  any_whitespaceFollowedByNewlines_ = new RegExp("(?:[" + ws + "]*\\r?\\n)+");

  function Preprocessor() {
    this.base = null;
    this.indents = [];
    this.context = [];
    this.ss = new StringScanner['default']("");
    this.context.peek = function () {
      if (this.length) {
        return this[this.length - 1];
      } else {
        return null;
      }
    };
    this.context.err = function (c) {
      throw new Error("Unexpected " + c);
    };
    this.output = "";
    this.context.observe = function (c) {
      var top;
      top = this.peek();
      switch (c) {
        case INDENT_SYMBOL:
          this.push(c);
          break;
        case DEDENT_SYMBOL:
          if (top !== INDENT_SYMBOL) {
            this.err(c);
          }
          this.pop();
          break;
        case "\r":
          if (top !== "/") {
            this.err(c);
          }
          this.pop();
          break;
        case "\n":
          if (top !== "/") {
            this.err(c);
          }
          this.pop();
          break;
        case "/":
          this.push(c);
          break;
        case "end-\\":
          if (top !== "\\") {
            this.err(c);
          }
          this.pop();
          break;
        default:
          throw new Error("undefined token observed: " + c);
      }
      return this;
    };
  }

  Preprocessor.prototype.p = function (s) {
    if (s) {
      this.output += s;
    }
    return s;
  };

  Preprocessor.prototype.scan = function (r) {
    return this.p(this.ss.scan(r));
  };

  Preprocessor.prototype.discard = function (r) {
    return this.ss.scan(r);
  };

  processInput = function (isEnd) {
    return function (data) {
      var b, d, indent, s;
      if (!isEnd) {
        this.ss.concat(data);
        this.discard(any_whitespaceFollowedByNewlines_);
      }
      while (!this.ss.eos()) {
        switch (this.context.peek()) {
          case null:
          case INDENT_SYMBOL:
            if (this.ss.bol() || this.discard(any_whitespaceFollowedByNewlines_)) {
              if (this.discard(new RegExp("[" + ws + "]*\\r?\\n"))) {
                this.p("" + TERM_SYMBOL + "\n");
                continue;
              }
              if (this.base != null) {
                if (this.discard(this.base) == null) {
                  throw new Error("inconsistent base indentation");
                }
              } else {
                b = this.discard(new RegExp("[" + ws + "]*"));
                this.base = new RegExp("" + b);
              }
              if (this.indents.length === 0) {
                if (this.ss.check(new RegExp("[" + ws + "]+"))) {
                  this.p(INDENT_SYMBOL);
                  this.context.observe(INDENT_SYMBOL);
                  this.indents.push(this.scan(new RegExp("([" + ws + "]+)")));
                }
              } else {
                indent = this.indents[this.indents.length - 1];
                if (d = this.ss.check(new RegExp("(" + indent + ")"))) {
                  this.discard(d);
                  if (this.ss.check(new RegExp("([" + ws + "]+)"))) {
                    this.p(INDENT_SYMBOL);
                    this.context.observe(INDENT_SYMBOL);
                    this.indents.push(d + this.scan(new RegExp("([" + ws + "]+)")));
                  }
                } else {
                  while (this.indents.length) {
                    indent = this.indents[this.indents.length - 1];
                    if (this.discard(new RegExp("(?:" + indent + ")"))) {
                      break;
                    }
                    this.context.observe(DEDENT_SYMBOL);
                    this.p(DEDENT_SYMBOL);
                    this.indents.pop();
                  }
                  if (s = this.discard(new RegExp("[" + ws + "]+"))) {
                    this.output = this.output.slice(0, -1);
                    this.output += UNMATCHED_DEDENT_SYMBOL;
                    this.p(INDENT_SYMBOL);
                    this.context.observe(INDENT_SYMBOL);
                    this.indents.push(s);
                  }
                }
              }
            }
            this.scan(/[^\r\n]+/);
            if (this.discard(/\r?\n/)) {
              this.p("" + TERM_SYMBOL + "\n");
            }
        }
      }
      if (isEnd) {
        this.scan(anyWhitespaceAndNewlinesTouchingEOF);
        while (this.context.length && INDENT_SYMBOL === this.context.peek()) {
          this.context.observe(DEDENT_SYMBOL);
          this.p(DEDENT_SYMBOL);
        }
        if (this.context.length) {
          throw new Error("Unclosed " + this.context.peek() + " at EOF");
        }
      }
    };
  };

  Preprocessor.prototype.processData = processInput(false);

  Preprocessor.prototype.processEnd = processInput(true);function processSync(input) {
    var pre;
    input += "\n";
    pre = new Preprocessor();
    pre.processData(input);
    pre.processEnd();
    return pre.output;
  }exports['default'] = Preprocessor;

  exports.INDENT_SYMBOL = INDENT_SYMBOL;
  exports.DEDENT_SYMBOL = DEDENT_SYMBOL;
  exports.UNMATCHED_DEDENT_SYMBOL = UNMATCHED_DEDENT_SYMBOL;
  exports.TERM_SYMBOL = TERM_SYMBOL;

});
define('emblem/process-opcodes', ['exports'], function (exports) {

  'use strict';

  exports.processOpcodes = processOpcodes;

  function processOpcodes(compiler, opcodes) {
    for (var i = 0, l = opcodes.length; i < l; i++) {
      var method = opcodes[i][0];
      var params = opcodes[i][1];
      if (params) {
        compiler[method].apply(compiler, params);
      } else {
        compiler[method].call(compiler);
      }
    }
  }

});
define('emblem/quoting', ['exports'], function (exports) {

  'use strict';

  exports.repeat = repeat;
  exports.escapeString = escapeString;
  exports.string = string;

  function escapeString(str) {
    str = str.replace(/\\/g, "\\\\");
    str = str.replace(/"/g, "\\\"");
    str = str.replace(/\n/g, "\\n");
    return str;
  }

  function string(str) {
    return "\"" + escapeString(str) + "\"";
  }

  function repeat(chars, times) {
    var str = "";
    while (times--) {
      str += chars;
    }
    return str;
  }

});
define('emblem/template-compiler', ['exports', 'emblem/process-opcodes', 'emblem/template-visitor', 'emblem/quoting'], function (exports, process_opcodes, template_visitor, quoting) {

  'use strict';

  exports.compile = compile;

  function compile(ast) {
    var opcodes = [];
    template_visitor.visit(ast, opcodes);
    reset(compiler);
    process_opcodes.processOpcodes(compiler, opcodes);
    return flush(compiler);
  }function reset(compiler) {
    compiler._content = [];
  }

  function flush(compiler) {
    return compiler._content.join("");
  }

  function pushContent(compiler, content) {
    compiler._content.push(content);
  }

  /**
    Wrap an string in mustache
    @param {Array} names
    @return {Array}
  */
  function wrapMustacheStrings(names) {
    return names.map(function (name) {
      return "{{" + name + "}}";
    });
  }

  /**
    Map a colon syntax string to inline if syntax.
    @param {String} Name
    @return {String}
  */
  function mapColonSyntax(name) {
    var parts = name.split(":");

    // First item will always be wrapped in single quotes (since we need at least one result for condition)
    parts[1] = singleQuoteString(parts[1]);

    // Only wrap second option if it exists
    if (parts[2]) parts[2] = singleQuoteString(parts[2]);

    parts.unshift("if");

    return parts.join(" ");
  }

  /**
    Wrap an string in single quotes
    @param {String} value
    @return {String}
  */
  function singleQuoteString(value) {
    return "'" + value + "'";
  }

  var boundClassNames, unboundClassNames;

  var compiler = {
    startProgram: function () {},
    endProgram: function () {},

    text: function (content) {
      pushContent(this, content);
    },

    attribute: function (name, content) {
      var attrString = " " + name;
      if (content === undefined) {} else {
        attrString += "=" + quoting.string(content);
      }
      pushContent(this, attrString);
    },

    openElementStart: function (tagName) {
      this._insideElement = true;
      pushContent(this, "<" + tagName);
    },

    openElementEnd: function () {
      pushContent(this, ">");
      this._insideElement = false;
    },

    closeElement: function (tagName) {
      pushContent(this, "</" + tagName + ">");
    },

    openClassNameBindings: function () {
      boundClassNames = [];
      unboundClassNames = [];
    },

    /**
      Add a class name binding
      @param {String} name
    */
    classNameBinding: function (name) {
      var isBoundAttribute = name[0] !== ":";

      if (isBoundAttribute) {
        var isColonSyntax = name.indexOf(":") > -1;
        if (isColonSyntax) {
          name = mapColonSyntax(name);
        }
        boundClassNames.push(name);
      } else {
        name = name.slice(1);
        unboundClassNames.push(name);
      }
    },

    /**
      Group all unbound classes into a single string
      Wrap each binding in mustache
    */
    closeClassNameBindings: function () {
      var unboundClassString = unboundClassNames.join(" ");
      var mustacheString = wrapMustacheStrings(boundClassNames).join(" ");
      var results = [unboundClassString, mustacheString];

      // Remove any blank strings
      results = results.filter(function (i) {
        return i !== "";
      });
      results = results.join(" ");

      // We only need to wrap the results in quotes if we have at least one unbound or more than 1 bound attributes
      var wrapInString = unboundClassString.length > 0 || boundClassNames.length > 1;

      if (wrapInString) results = quoting.string(results);else if (results.length === 0) results = "\"\"";

      pushContent(this, " class=" + results);
    },

    startBlock: function (content) {
      pushContent(this, "{{#" + content + "}}");
    },

    endBlock: function (content) {
      var parts = content.split(" ");

      pushContent(this, "{{/" + parts[0] + "}}");
    },

    mustache: function (content, escaped) {
      var prepend = this._insideElement ? " " : "";
      if (escaped) {
        pushContent(this, prepend + "{{" + content + "}}");
      } else {
        pushContent(this, prepend + "{{{" + content + "}}}");
      }
    },

    /**
      Special syntax for assigning mustache to a key
      @param {String} content
      @param {String} key
    */
    assignedMustache: function (content, key) {
      var prepend = this._insideElement ? " " : "";
      pushContent(this, prepend + key + "=" + "{{" + content + "}}");
    }
  };
  // boolean attribute with a true value, this is a no-op

});
define('emblem/template-visitor', ['exports'], function (exports) {

  'use strict';

  exports.visit = visit;

  function visit(node, opcodes) {
    visitor[node.type](node, opcodes);
  }function visitArray(nodes, opcodes) {
    if (!nodes || nodes.length === 0) {
      return;
    }
    for (var i = 0, l = nodes.length; i < l; i++) {
      visit(nodes[i], opcodes);
    }
  }

  var visitor = {

    program: function (node, opcodes) {
      opcodes.push(["startProgram"]);
      visitArray(node.childNodes, opcodes);
      opcodes.push(["endProgram"]);
    },

    text: function (node, opcodes) {
      opcodes.push(["text", [node.content]]);
    },

    attribute: function (node, opcodes) {
      opcodes.push(["attribute", [node.name, node.content]]);
    },

    classNameBinding: function (node, opcodes) {
      opcodes.push(["classNameBinding", [node.name]]);
    },

    element: function (node, opcodes) {
      opcodes.push(["openElementStart", [node.tagName]]);
      visitArray(node.attrStaches, opcodes);
      if (node.classNameBindings && node.classNameBindings.length) {
        opcodes.push(["openClassNameBindings"]);
        visitArray(node.classNameBindings, opcodes);
        opcodes.push(["closeClassNameBindings"]);
      }
      opcodes.push(["openElementEnd"]);

      if (node.isVoid) {
        if (node.childNodes.length) {
          throw new Error("Cannot nest under void element " + node.tagName);
        }
      } else {
        visitArray(node.childNodes, opcodes);
        opcodes.push(["closeElement", [node.tagName]]);
      }
    },

    block: function (node, opcodes) {
      opcodes.push(["startBlock", [node.content]]);
      visitArray(node.childNodes, opcodes);

      if (node.inverseChildNodes && node.inverseChildNodes.length > 0) {
        opcodes.push(["mustache", ["else", true]]);
        visitArray(node.inverseChildNodes, opcodes);
      }

      opcodes.push(["endBlock", [node.content]]);
    },

    mustache: function (node, opcodes) {
      opcodes.push(["mustache", [node.content, node.escaped]]);
    },

    assignedMustache: function (node, opcodes) {
      opcodes.push(["assignedMustache", [node.content, node.key]]);
    }
  };

});
define('emblem/utils/void-elements', ['exports'], function (exports) {

  'use strict';

  // http://www.w3.org/TR/html-markup/syntax.html#syntax-elements
  var voidElementTags = ["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"];

  function isVoidElement(tagName) {
    return voidElementTags.indexOf(tagName) > -1;
  }

  exports['default'] = isVoidElement;

});
define('string-scanner', ['exports'], function (exports) {

  'use strict';

  var module = {};

  (function() {
    var StringScanner;
    StringScanner = (function() {
      function StringScanner(str) {
        this.str = str != null ? str : '';
        this.str = '' + this.str;
        this.pos = 0;
        this.lastMatch = {
          reset: function() {
            this.str = null;
            this.captures = [];
            return this;
          }
        }.reset();
        this;
      }
      StringScanner.prototype.bol = function() {
        return this.pos <= 0 || (this.str[this.pos - 1] === "\n");
      };
      StringScanner.prototype.captures = function() {
        return this.lastMatch.captures;
      };
      StringScanner.prototype.check = function(pattern) {
        var matches;
        if (this.str.substr(this.pos).search(pattern) !== 0) {
          this.lastMatch.reset();
          return null;
        }
        matches = this.str.substr(this.pos).match(pattern);
        this.lastMatch.str = matches[0];
        this.lastMatch.captures = matches.slice(1);
        return this.lastMatch.str;
      };
      StringScanner.prototype.checkUntil = function(pattern) {
        var matches, patternPos;
        patternPos = this.str.substr(this.pos).search(pattern);
        if (patternPos < 0) {
          this.lastMatch.reset();
          return null;
        }
        matches = this.str.substr(this.pos + patternPos).match(pattern);
        this.lastMatch.captures = matches.slice(1);
        return this.lastMatch.str = this.str.substr(this.pos, patternPos) + matches[0];
      };
      StringScanner.prototype.clone = function() {
        var clone, prop, value, _ref;
        clone = new this.constructor(this.str);
        clone.pos = this.pos;
        clone.lastMatch = {};
        _ref = this.lastMatch;
        for (prop in _ref) {
          value = _ref[prop];
          clone.lastMatch[prop] = value;
        }
        return clone;
      };
      StringScanner.prototype.concat = function(str) {
        this.str += str;
        return this;
      };
      StringScanner.prototype.eos = function() {
        return this.pos === this.str.length;
      };
      StringScanner.prototype.exists = function(pattern) {
        var matches, patternPos;
        patternPos = this.str.substr(this.pos).search(pattern);
        if (patternPos < 0) {
          this.lastMatch.reset();
          return null;
        }
        matches = this.str.substr(this.pos + patternPos).match(pattern);
        this.lastMatch.str = matches[0];
        this.lastMatch.captures = matches.slice(1);
        return patternPos;
      };
      StringScanner.prototype.getch = function() {
        return this.scan(/./);
      };
      StringScanner.prototype.match = function() {
        return this.lastMatch.str;
      };
      StringScanner.prototype.matches = function(pattern) {
        this.check(pattern);
        return this.matchSize();
      };
      StringScanner.prototype.matched = function() {
        return this.lastMatch.str != null;
      };
      StringScanner.prototype.matchSize = function() {
        if (this.matched()) {
          return this.match().length;
        } else {
          return null;
        }
      };
      StringScanner.prototype.peek = function(len) {
        return this.str.substr(this.pos, len);
      };
      StringScanner.prototype.pointer = function() {
        return this.pos;
      };
      StringScanner.prototype.setPointer = function(pos) {
        pos = +pos;
        if (pos < 0) {
          pos = 0;
        }
        if (pos > this.str.length) {
          pos = this.str.length;
        }
        return this.pos = pos;
      };
      StringScanner.prototype.reset = function() {
        this.lastMatch.reset();
        this.pos = 0;
        return this;
      };
      StringScanner.prototype.rest = function() {
        return this.str.substr(this.pos);
      };
      StringScanner.prototype.scan = function(pattern) {
        var chk;
        chk = this.check(pattern);
        if (chk != null) {
          this.pos += chk.length;
        }
        return chk;
      };
      StringScanner.prototype.scanUntil = function(pattern) {
        var chk;
        chk = this.checkUntil(pattern);
        if (chk != null) {
          this.pos += chk.length;
        }
        return chk;
      };
      StringScanner.prototype.skip = function(pattern) {
        this.scan(pattern);
        return this.matchSize();
      };
      StringScanner.prototype.skipUntil = function(pattern) {
        this.scanUntil(pattern);
        return this.matchSize();
      };
      StringScanner.prototype.string = function() {
        return this.str;
      };
      StringScanner.prototype.terminate = function() {
        this.pos = this.str.length;
        this.lastMatch.reset();
        return this;
      };
      StringScanner.prototype.toString = function() {
        return "#<StringScanner " + (this.eos() ? 'fin' : "" + this.pos + "/" + this.str.length + " @ " + (this.str.length > 8 ? "" + (this.str.substr(0, 5)) + "..." : this.str)) + ">";
      };
      return StringScanner;
    })();
    StringScanner.prototype.beginningOfLine = StringScanner.prototype.bol;
    StringScanner.prototype.clear = StringScanner.prototype.terminate;
    StringScanner.prototype.dup = StringScanner.prototype.clone;
    StringScanner.prototype.endOfString = StringScanner.prototype.eos;
    StringScanner.prototype.exist = StringScanner.prototype.exists;
    StringScanner.prototype.getChar = StringScanner.prototype.getch;
    StringScanner.prototype.position = StringScanner.prototype.pointer;
    StringScanner.StringScanner = StringScanner;
    module.exports = StringScanner;
  }).call(undefined);

  exports['default'] = module.exports;

});