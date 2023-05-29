/*
 * xpath.js
 *
 * An XPath 1.0 library for JavaScript.
 *
 * Cameron McCormack <cam (at) mcc.id.au>
 *
 * This work is licensed under the MIT License.
 *
 * Revision 20: April 26, 2011
 *   Fixed a typo resulting in FIRST_ORDERED_NODE_TYPE results being wrong,
 *   thanks to <shi_a009 (at) hotmail.com>.
 *
 * Revision 19: November 29, 2005
 *   Nodesets now store their nodes in a height balanced tree, increasing
 *   performance for the common case of selecting nodes in document order,
 *   thanks to Sébastien Cramatte <contact (at) zeninteractif.com>.
 *   AVL tree code adapted from Raimund Neumann <rnova (at) gmx.net>.
 *
 * Revision 18: October 27, 2005
 *   DOM 3 XPath support.  Caveats:
 *     - namespace prefixes aren't resolved in XPathEvaluator.createExpression,
 *       but in XPathExpression.evaluate.
 *     - XPathResult.invalidIteratorState is not implemented.
 *
 * Revision 17: October 25, 2005
 *   Some core XPath function fixes and a patch to avoid crashing certain
 *   versions of MSXML in PathExpr.prototype.getOwnerElement, thanks to
 *   Sébastien Cramatte <contact (at) zeninteractif.com>.
 *
 * Revision 16: September 22, 2005
 *   Workarounds for some IE 5.5 deficiencies.
 *   Fixed problem with prefix node tests on attribute nodes.
 *
 * Revision 15: May 21, 2005
 *   Fixed problem with QName node tests on elements with an xmlns="...".
 *
 * Revision 14: May 19, 2005
 *   Fixed QName node tests on attribute node regression.
 *
 * Revision 13: May 3, 2005
 *   Node tests are case insensitive now if working in an HTML DOM.
 *
 * Revision 12: April 26, 2005
 *   Updated licence.  Slight code changes to enable use of Dean
 *   Edwards' script compression, http://dean.edwards.name/packer/ .
 *
 * Revision 11: April 23, 2005
 *   Fixed bug with 'and' and 'or' operators, fix thanks to
 *   Sandy McArthur <sandy (at) mcarthur.org>.
 *
 * Revision 10: April 15, 2005
 *   Added support for a virtual root node, supposedly helpful for
 *   implementing XForms.  Fixed problem with QName node tests and
 *   the parent axis.
 *
 * Revision 9: March 17, 2005
 *   Namespace resolver tweaked so using the document node as the context
 *   for namespace lookups is equivalent to using the document element.
 *
 * Revision 8: February 13, 2005
 *   Handle implicit declaration of 'xmlns' namespace prefix.
 *   Fixed bug when comparing nodesets.
 *   Instance data can now be associated with a FunctionResolver, and
 *     workaround for MSXML not supporting 'localName' and 'getElementById',
 *     thanks to Grant Gongaware.
 *   Fix a few problems when the context node is the root node.
 *
 * Revision 7: February 11, 2005
 *   Default namespace resolver fix from Grant Gongaware
 *   <grant (at) gongaware.com>.
 *
 * Revision 6: February 10, 2005
 *   Fixed bug in 'number' function.
 *
 * Revision 5: February 9, 2005
 *   Fixed bug where text nodes not getting converted to string values.
 *
 * Revision 4: January 21, 2005
 *   Bug in 'name' function, fix thanks to Bill Edney.
 *   Fixed incorrect processing of namespace nodes.
 *   Fixed NamespaceResolver to resolve 'xml' namespace.
 *   Implemented union '|' operator.
 *
 * Revision 3: January 14, 2005
 *   Fixed bug with nodeset comparisons, bug lexing < and >.
 *
 * Revision 2: October 26, 2004
 *   QName node test namespace handling fixed.  Few other bug fixes.
 *
 * Revision 1: August 13, 2004
 *   Bug fixes from William J. Edney <bedney (at) technicalpursuit.com>.
 *   Added minimal licence.
 *
 * Initial version: June 14, 2004
 */

// functional helpers
function curry(func) {
	const { slice } = Array.prototype,
		totalargs = func.length,
		partial = function (args, fn) {
			return function () {
				return fn.apply(this, args.concat(slice.call(arguments)));
			};
		},
		fn = function () {
			const args = slice.call(arguments);
			return args.length < totalargs
				? partial(args, fn)
				: func.apply(this, slice.apply(arguments, [0, totalargs]));
		};
	return fn;
}

const forEach = function (f, xs) {
	for (let i = 0; i < xs.length; i += 1) {
		f(xs[i], i, xs);
	}
};

const reduce = function (f, seed, xs) {
	let acc = seed;

	forEach(function (x, i) {
		acc = f(acc, x, i);
	}, xs);

	return acc;
};

const map = function (f, xs) {
	const mapped = new Array(xs.length);

	forEach(function (x, i) {
		mapped[i] = f(x);
	}, xs);

	return mapped;
};

const filter = function (f, xs) {
	const filtered = [];

	forEach(function (x, i) {
		if (f(x, i)) {
			filtered.push(x);
		}
	}, xs);

	return filtered;
};

const includes = function (values, value) {
	for (let i = 0; i < values.length; i += 1) {
		if (values[i] === value) {
			return true;
		}
	}

	return false;
};

function always(value) {
	return function () {
		return value;
	};
}

function toString(x) {
	return x.toString();
}
const join = function (s, xs) {
	return xs.join(s);
};
const wrap = function (pref, suf, str) {
	return pref + str + suf;
};

const prototypeConcat = Array.prototype.concat;

// .apply() fails above a certain number of arguments - https://github.com/NikhilVerma/xpath-next/pull/98
const MAX_ARGUMENT_LENGTH = 32767;

function flatten(arr) {
	let result = [];

	for (let start = 0; start < arr.length; start += MAX_ARGUMENT_LENGTH) {
		const chunk = arr.slice(start, start + MAX_ARGUMENT_LENGTH);

		result = prototypeConcat.apply(result, chunk);
	}

	return result;
}

function assign(target, varArgs) {
	// .length of function is 2
	const to = Object(target);

	for (let index = 1; index < arguments.length; index++) {
		const nextSource = arguments[index];

		if (nextSource != null) {
			// Skip over if undefined or null
			for (const nextKey in nextSource) {
				// Avoid bugs when hasOwnProperty is shadowed
				if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
					to[nextKey] = nextSource[nextKey];
				}
			}
		}
	}

	return to;
}

// XPathParser ///////////////////////////////////////////////////////////////

XPathParser.prototype = new Object();
XPathParser.prototype.constructor = XPathParser;
XPathParser.superclass = Object.prototype;

function XPathParser() {
	this.init();
}

XPathParser.prototype.init = function () {
	this.reduceActions = [];

	this.reduceActions[3] = function (rhs) {
		return new OrOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[5] = function (rhs) {
		return new AndOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[7] = function (rhs) {
		return new EqualsOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[8] = function (rhs) {
		return new NotEqualOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[10] = function (rhs) {
		return new LessThanOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[11] = function (rhs) {
		return new GreaterThanOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[12] = function (rhs) {
		return new LessThanOrEqualOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[13] = function (rhs) {
		return new GreaterThanOrEqualOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[15] = function (rhs) {
		return new PlusOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[16] = function (rhs) {
		return new MinusOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[18] = function (rhs) {
		return new MultiplyOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[19] = function (rhs) {
		return new DivOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[20] = function (rhs) {
		return new ModOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[22] = function (rhs) {
		return new UnaryMinusOperation(rhs[1]);
	};
	this.reduceActions[24] = function (rhs) {
		return new BarOperation(rhs[0], rhs[2]);
	};
	this.reduceActions[25] = function (rhs) {
		return new PathExpr(undefined, undefined, rhs[0]);
	};
	this.reduceActions[27] = function (rhs) {
		rhs[0].locationPath = rhs[2];
		return rhs[0];
	};
	this.reduceActions[28] = function (rhs) {
		rhs[0].locationPath = rhs[2];
		rhs[0].locationPath.steps.unshift(new Step(Step.DESCENDANTORSELF, NodeTest.nodeTest, []));
		return rhs[0];
	};
	this.reduceActions[29] = function (rhs) {
		return new PathExpr(rhs[0], [], undefined);
	};
	this.reduceActions[30] = function (rhs) {
		if (Utilities.instance_of(rhs[0], PathExpr)) {
			if (rhs[0].filterPredicates == undefined) {
				rhs[0].filterPredicates = [];
			}
			rhs[0].filterPredicates.push(rhs[1]);
			return rhs[0];
		} else {
			return new PathExpr(rhs[0], [rhs[1]], undefined);
		}
	};
	this.reduceActions[32] = function (rhs) {
		return rhs[1];
	};
	this.reduceActions[33] = function (rhs) {
		return new XString(rhs[0]);
	};
	this.reduceActions[34] = function (rhs) {
		return new XNumber(rhs[0]);
	};
	this.reduceActions[36] = function (rhs) {
		return new FunctionCall(rhs[0], []);
	};
	this.reduceActions[37] = function (rhs) {
		return new FunctionCall(rhs[0], rhs[2]);
	};
	this.reduceActions[38] = function (rhs) {
		return [rhs[0]];
	};
	this.reduceActions[39] = function (rhs) {
		rhs[2].unshift(rhs[0]);
		return rhs[2];
	};
	this.reduceActions[43] = function (rhs) {
		return new LocationPath(true, []);
	};
	this.reduceActions[44] = function (rhs) {
		rhs[1].absolute = true;
		return rhs[1];
	};
	this.reduceActions[46] = function (rhs) {
		return new LocationPath(false, [rhs[0]]);
	};
	this.reduceActions[47] = function (rhs) {
		rhs[0].steps.push(rhs[2]);
		return rhs[0];
	};
	this.reduceActions[49] = function (rhs) {
		return new Step(rhs[0], rhs[1], []);
	};
	this.reduceActions[50] = function (rhs) {
		return new Step(Step.CHILD, rhs[0], []);
	};
	this.reduceActions[51] = function (rhs) {
		return new Step(rhs[0], rhs[1], rhs[2]);
	};
	this.reduceActions[52] = function (rhs) {
		return new Step(Step.CHILD, rhs[0], rhs[1]);
	};
	this.reduceActions[54] = function (rhs) {
		return [rhs[0]];
	};
	this.reduceActions[55] = function (rhs) {
		rhs[1].unshift(rhs[0]);
		return rhs[1];
	};
	this.reduceActions[56] = function (rhs) {
		if (rhs[0] == "ancestor") {
			return Step.ANCESTOR;
		} else if (rhs[0] == "ancestor-or-self") {
			return Step.ANCESTORORSELF;
		} else if (rhs[0] == "attribute") {
			return Step.ATTRIBUTE;
		} else if (rhs[0] == "child") {
			return Step.CHILD;
		} else if (rhs[0] == "descendant") {
			return Step.DESCENDANT;
		} else if (rhs[0] == "descendant-or-self") {
			return Step.DESCENDANTORSELF;
		} else if (rhs[0] == "following") {
			return Step.FOLLOWING;
		} else if (rhs[0] == "following-sibling") {
			return Step.FOLLOWINGSIBLING;
		} else if (rhs[0] == "namespace") {
			return Step.NAMESPACE;
		} else if (rhs[0] == "parent") {
			return Step.PARENT;
		} else if (rhs[0] == "preceding") {
			return Step.PRECEDING;
		} else if (rhs[0] == "preceding-sibling") {
			return Step.PRECEDINGSIBLING;
		} else if (rhs[0] == "self") {
			return Step.SELF;
		}
		return -1;
	};
	this.reduceActions[57] = function (rhs) {
		return Step.ATTRIBUTE;
	};
	this.reduceActions[59] = function (rhs) {
		if (rhs[0] == "comment") {
			return NodeTest.commentTest;
		} else if (rhs[0] == "text") {
			return NodeTest.textTest;
		} else if (rhs[0] == "processing-instruction") {
			return NodeTest.anyPiTest;
		} else if (rhs[0] == "node") {
			return NodeTest.nodeTest;
		}
		return new NodeTest(-1, undefined);
	};
	this.reduceActions[60] = function (rhs) {
		return new NodeTest.PITest(rhs[2]);
	};
	this.reduceActions[61] = function (rhs) {
		return rhs[1];
	};
	this.reduceActions[63] = function (rhs) {
		rhs[1].absolute = true;
		rhs[1].steps.unshift(new Step(Step.DESCENDANTORSELF, NodeTest.nodeTest, []));
		return rhs[1];
	};
	this.reduceActions[64] = function (rhs) {
		rhs[0].steps.push(new Step(Step.DESCENDANTORSELF, NodeTest.nodeTest, []));
		rhs[0].steps.push(rhs[2]);
		return rhs[0];
	};
	this.reduceActions[65] = function (rhs) {
		return new Step(Step.SELF, NodeTest.nodeTest, []);
	};
	this.reduceActions[66] = function (rhs) {
		return new Step(Step.PARENT, NodeTest.nodeTest, []);
	};
	this.reduceActions[67] = function (rhs) {
		return new VariableReference(rhs[1]);
	};
	this.reduceActions[68] = function (rhs) {
		return NodeTest.nameTestAny;
	};
	this.reduceActions[69] = function (rhs) {
		return new NodeTest.NameTestPrefixAny(rhs[0].split(":")[0]);
	};
	this.reduceActions[70] = function (rhs) {
		return new NodeTest.NameTestQName(rhs[0]);
	};
};

XPathParser.actionTable = [
	" s s        sssssssss    s ss  s  ss",
	"                 s                  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"                rrrrr               ",
	" s s        sssssssss    s ss  s  ss",
	"rs  rrrrrrrr s  sssssrrrrrr  rrs rs ",
	" s s        sssssssss    s ss  s  ss",
	"                            s       ",
	"                            s       ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"  s                                 ",
	"                            s       ",
	" s           s  sssss          s  s ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"a                                   ",
	"r       s                    rr  r  ",
	"r      sr                    rr  r  ",
	"r   s  rr            s       rr  r  ",
	"r   rssrr            rss     rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrrsss         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrrs  rr  r  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"r  srrrrrrrr         rrrrrrs rr sr  ",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"                sssss               ",
	"r  rrrrrrrrr         rrrrrrr rr sr  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"                             s      ",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"              s                     ",
	"                             s      ",
	"                rrrrr               ",
	" s s        sssssssss    s sss s  ss",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s s        sssssssss      ss  s  ss",
	" s s        sssssssss    s ss  s  ss",
	" s           s  sssss          s  s ",
	" s           s  sssss          s  s ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	" s           s  sssss          s  s ",
	" s           s  sssss          s  s ",
	"r  rrrrrrrrr         rrrrrrr rr sr  ",
	"r  rrrrrrrrr         rrrrrrr rr sr  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"                             s      ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"                             rr     ",
	"                             s      ",
	"                             rs     ",
	"r      sr                    rr  r  ",
	"r   s  rr            s       rr  r  ",
	"r   rssrr            rss     rr  r  ",
	"r   rssrr            rss     rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrr            rrrss   rr  r  ",
	"r   rrrrrsss         rrrrr   rr  r  ",
	"r   rrrrrsss         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrr   rr  r  ",
	"r   rrrrrrrr         rrrrrr  rr  r  ",
	"                                 r  ",
	"                                 s  ",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	"r  srrrrrrrr         rrrrrrs rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr  r  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	" s s        sssssssss    s ss  s  ss",
	"r  rrrrrrrrr         rrrrrrr rr rr  ",
	"                             r      ",
];

XPathParser.actionTableNumber = [
	" 1 0        /.-,+*)('    & %$  #  \"!",
	"                 J                  ",
	"a  aaaaaaaaa         aaaaaaa aa  a  ",
	"                YYYYY               ",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	"K1  KKKKKKKK .  +*)('KKKKKK  KK# K\" ",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	"                            N       ",
	"                            O       ",
	"e  eeeeeeeee         eeeeeee ee ee  ",
	"f  fffffffff         fffffff ff ff  ",
	"d  ddddddddd         ddddddd dd dd  ",
	"B  BBBBBBBBB         BBBBBBB BB BB  ",
	"A  AAAAAAAAA         AAAAAAA AA AA  ",
	"  P                                 ",
	"                            Q       ",
	" 1           .  +*)('          #  \" ",
	"b  bbbbbbbbb         bbbbbbb bb  b  ",
	"                                    ",
	"!       S                    !!  !  ",
	'"      T"                    ""  "  ',
	"$   V  $$            U       $$  $  ",
	"&   &ZY&&            &XW     &&  &  ",
	")   )))))            )))\\[   ))  )  ",
	".   ....._^]         .....   ..  .  ",
	"1   11111111         11111   11  1  ",
	"5   55555555         55555`  55  5  ",
	"7   77777777         777777  77  7  ",
	"9   99999999         999999  99  9  ",
	":  c::::::::         ::::::b :: a:  ",
	"I  fIIIIIIII         IIIIIIe II  I  ",
	"=  =========         ======= == ==  ",
	"?  ?????????         ??????? ?? ??  ",
	"C  CCCCCCCCC         CCCCCCC CC CC  ",
	"J   JJJJJJJJ         JJJJJJ  JJ  J  ",
	"M   MMMMMMMM         MMMMMM  MM  M  ",
	"N  NNNNNNNNN         NNNNNNN NN  N  ",
	"P  PPPPPPPPP         PPPPPPP PP  P  ",
	"                +*)('               ",
	"R  RRRRRRRRR         RRRRRRR RR aR  ",
	"U  UUUUUUUUU         UUUUUUU UU  U  ",
	"Z  ZZZZZZZZZ         ZZZZZZZ ZZ ZZ  ",
	"c  ccccccccc         ccccccc cc cc  ",
	"                             j      ",
	"L  fLLLLLLLL         LLLLLLe LL  L  ",
	"6   66666666         66666   66  6  ",
	"              k                     ",
	"                             l      ",
	"                XXXXX               ",
	" 1 0        /.-,+*)('    & %$m #  \"!",
	"_  f________         ______e __  _  ",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1 0        /.-,+*)('      %$  #  \"!",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	" 1           .  +*)('          #  \" ",
	" 1           .  +*)('          #  \" ",
	">  >>>>>>>>>         >>>>>>> >> >>  ",
	" 1           .  +*)('          #  \" ",
	" 1           .  +*)('          #  \" ",
	"Q  QQQQQQQQQ         QQQQQQQ QQ aQ  ",
	"V  VVVVVVVVV         VVVVVVV VV aV  ",
	"T  TTTTTTTTT         TTTTTTT TT  T  ",
	"@  @@@@@@@@@         @@@@@@@ @@ @@  ",
	"                             \x87      ",
	"[  [[[[[[[[[         [[[[[[[ [[ [[  ",
	"D  DDDDDDDDD         DDDDDDD DD DD  ",
	"                             HH     ",
	"                             \x88      ",
	"                             F\x89     ",
	"#      T#                    ##  #  ",
	"%   V  %%            U       %%  %  ",
	"'   'ZY''            'XW     ''  '  ",
	"(   (ZY((            (XW     ((  (  ",
	"+   +++++            +++\\[   ++  +  ",
	"*   *****            ***\\[   **  *  ",
	"-   -----            ---\\[   --  -  ",
	",   ,,,,,            ,,,\\[   ,,  ,  ",
	"0   00000_^]         00000   00  0  ",
	"/   /////_^]         /////   //  /  ",
	"2   22222222         22222   22  2  ",
	"3   33333333         33333   33  3  ",
	"4   44444444         44444   44  4  ",
	"8   88888888         888888  88  8  ",
	"                                 ^  ",
	"                                 \x8a  ",
	";  f;;;;;;;;         ;;;;;;e ;;  ;  ",
	"<  f<<<<<<<<         <<<<<<e <<  <  ",
	"O  OOOOOOOOO         OOOOOOO OO  O  ",
	"`  `````````         ``````` ``  `  ",
	"S  SSSSSSSSS         SSSSSSS SS  S  ",
	"W  WWWWWWWWW         WWWWWWW WW  W  ",
	"\\  \\\\\\\\\\\\\\\\\\         \\\\\\\\\\\\\\ \\\\ \\\\  ",
	"E  EEEEEEEEE         EEEEEEE EE EE  ",
	" 1 0        /.-,+*)('    & %$  #  \"!",
	"]  ]]]]]]]]]         ]]]]]]] ]] ]]  ",
	"                             G      ",
];

XPathParser.gotoTable = [
	"3456789:;<=>?@ AB  CDEFGH IJ ",
	"                             ",
	"                             ",
	"                             ",
	"L456789:;<=>?@ AB  CDEFGH IJ ",
	"            M        EFGH IJ ",
	"       N;<=>?@ AB  CDEFGH IJ ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"            S        EFGH IJ ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"              e              ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                        h  J ",
	"              i          j   ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"o456789:;<=>?@ ABpqCDEFGH IJ ",
	"                             ",
	"  r6789:;<=>?@ AB  CDEFGH IJ ",
	"   s789:;<=>?@ AB  CDEFGH IJ ",
	"    t89:;<=>?@ AB  CDEFGH IJ ",
	"    u89:;<=>?@ AB  CDEFGH IJ ",
	"     v9:;<=>?@ AB  CDEFGH IJ ",
	"     w9:;<=>?@ AB  CDEFGH IJ ",
	"     x9:;<=>?@ AB  CDEFGH IJ ",
	"     y9:;<=>?@ AB  CDEFGH IJ ",
	"      z:;<=>?@ AB  CDEFGH IJ ",
	"      {:;<=>?@ AB  CDEFGH IJ ",
	"       |;<=>?@ AB  CDEFGH IJ ",
	"       };<=>?@ AB  CDEFGH IJ ",
	"       ~;<=>?@ AB  CDEFGH IJ ",
	"         \x7f=>?@ AB  CDEFGH IJ ",
	"\x80456789:;<=>?@ AB  CDEFGH IJ\x81",
	"            \x82        EFGH IJ ",
	"            \x83        EFGH IJ ",
	"                             ",
	"                     \x84 GH IJ ",
	"                     \x85 GH IJ ",
	"              i          \x86   ",
	"              i          \x87   ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"                             ",
	"o456789:;<=>?@ AB\x8cqCDEFGH IJ ",
	"                             ",
	"                             ",
];

XPathParser.productions = [
	[1, 1, 2],
	[2, 1, 3],
	[3, 1, 4],
	[3, 3, 3, -9, 4],
	[4, 1, 5],
	[4, 3, 4, -8, 5],
	[5, 1, 6],
	[5, 3, 5, -22, 6],
	[5, 3, 5, -5, 6],
	[6, 1, 7],
	[6, 3, 6, -23, 7],
	[6, 3, 6, -24, 7],
	[6, 3, 6, -6, 7],
	[6, 3, 6, -7, 7],
	[7, 1, 8],
	[7, 3, 7, -25, 8],
	[7, 3, 7, -26, 8],
	[8, 1, 9],
	[8, 3, 8, -12, 9],
	[8, 3, 8, -11, 9],
	[8, 3, 8, -10, 9],
	[9, 1, 10],
	[9, 2, -26, 9],
	[10, 1, 11],
	[10, 3, 10, -27, 11],
	[11, 1, 12],
	[11, 1, 13],
	[11, 3, 13, -28, 14],
	[11, 3, 13, -4, 14],
	[13, 1, 15],
	[13, 2, 13, 16],
	[15, 1, 17],
	[15, 3, -29, 2, -30],
	[15, 1, -15],
	[15, 1, -16],
	[15, 1, 18],
	[18, 3, -13, -29, -30],
	[18, 4, -13, -29, 19, -30],
	[19, 1, 20],
	[19, 3, 20, -31, 19],
	[20, 1, 2],
	[12, 1, 14],
	[12, 1, 21],
	[21, 1, -28],
	[21, 2, -28, 14],
	[21, 1, 22],
	[14, 1, 23],
	[14, 3, 14, -28, 23],
	[14, 1, 24],
	[23, 2, 25, 26],
	[23, 1, 26],
	[23, 3, 25, 26, 27],
	[23, 2, 26, 27],
	[23, 1, 28],
	[27, 1, 16],
	[27, 2, 16, 27],
	[25, 2, -14, -3],
	[25, 1, -32],
	[26, 1, 29],
	[26, 3, -20, -29, -30],
	[26, 4, -21, -29, -15, -30],
	[16, 3, -33, 30, -34],
	[30, 1, 2],
	[22, 2, -4, 14],
	[24, 3, 14, -4, 23],
	[28, 1, -35],
	[28, 1, -2],
	[17, 2, -36, -18],
	[29, 1, -17],
	[29, 1, -19],
	[29, 1, -18],
];

XPathParser.DOUBLEDOT = 2;
XPathParser.DOUBLECOLON = 3;
XPathParser.DOUBLESLASH = 4;
XPathParser.NOTEQUAL = 5;
XPathParser.LESSTHANOREQUAL = 6;
XPathParser.GREATERTHANOREQUAL = 7;
XPathParser.AND = 8;
XPathParser.OR = 9;
XPathParser.MOD = 10;
XPathParser.DIV = 11;
XPathParser.MULTIPLYOPERATOR = 12;
XPathParser.FUNCTIONNAME = 13;
XPathParser.AXISNAME = 14;
XPathParser.LITERAL = 15;
XPathParser.NUMBER = 16;
XPathParser.ASTERISKNAMETEST = 17;
XPathParser.QNAME = 18;
XPathParser.NCNAMECOLONASTERISK = 19;
XPathParser.NODETYPE = 20;
XPathParser.PROCESSINGINSTRUCTIONWITHLITERAL = 21;
XPathParser.EQUALS = 22;
XPathParser.LESSTHAN = 23;
XPathParser.GREATERTHAN = 24;
XPathParser.PLUS = 25;
XPathParser.MINUS = 26;
XPathParser.BAR = 27;
XPathParser.SLASH = 28;
XPathParser.LEFTPARENTHESIS = 29;
XPathParser.RIGHTPARENTHESIS = 30;
XPathParser.COMMA = 31;
XPathParser.AT = 32;
XPathParser.LEFTBRACKET = 33;
XPathParser.RIGHTBRACKET = 34;
XPathParser.DOT = 35;
XPathParser.DOLLAR = 36;

XPathParser.prototype.tokenize = function (s1) {
	const types = [];
	const values = [];
	const s = `${s1}\0`;

	let pos = 0;
	let c = s.charAt(pos++);
	while (1) {
		while (c == " " || c == "\t" || c == "\r" || c == "\n") {
			c = s.charAt(pos++);
		}
		if (c == "\0" || pos >= s.length) {
			break;
		}

		if (c == "(") {
			types.push(XPathParser.LEFTPARENTHESIS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == ")") {
			types.push(XPathParser.RIGHTPARENTHESIS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == "[") {
			types.push(XPathParser.LEFTBRACKET);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == "]") {
			types.push(XPathParser.RIGHTBRACKET);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == "@") {
			types.push(XPathParser.AT);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == ",") {
			types.push(XPathParser.COMMA);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == "|") {
			types.push(XPathParser.BAR);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == "+") {
			types.push(XPathParser.PLUS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == "-") {
			types.push(XPathParser.MINUS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == "=") {
			types.push(XPathParser.EQUALS);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}
		if (c == "$") {
			types.push(XPathParser.DOLLAR);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}

		if (c == ".") {
			c = s.charAt(pos++);
			if (c == ".") {
				types.push(XPathParser.DOUBLEDOT);
				values.push("..");
				c = s.charAt(pos++);
				continue;
			}
			if (c >= "0" && c <= "9") {
				var number = `.${c}`;
				c = s.charAt(pos++);
				while (c >= "0" && c <= "9") {
					number += c;
					c = s.charAt(pos++);
				}
				types.push(XPathParser.NUMBER);
				values.push(number);
				continue;
			}
			types.push(XPathParser.DOT);
			values.push(".");
			continue;
		}

		if (c == "'" || c == '"') {
			const delimiter = c;
			let literal = "";
			while (pos < s.length && (c = s.charAt(pos)) !== delimiter) {
				literal += c;
				pos += 1;
			}
			if (c !== delimiter) {
				throw XPathException.fromMessage(`Unterminated string literal: ${delimiter}${literal}`);
			}
			pos += 1;
			types.push(XPathParser.LITERAL);
			values.push(literal);
			c = s.charAt(pos++);
			continue;
		}

		if (c >= "0" && c <= "9") {
			var number = c;
			c = s.charAt(pos++);
			while (c >= "0" && c <= "9") {
				number += c;
				c = s.charAt(pos++);
			}
			if (c == ".") {
				if (s.charAt(pos) >= "0" && s.charAt(pos) <= "9") {
					number += c;
					number += s.charAt(pos++);
					c = s.charAt(pos++);
					while (c >= "0" && c <= "9") {
						number += c;
						c = s.charAt(pos++);
					}
				}
			}
			types.push(XPathParser.NUMBER);
			values.push(number);
			continue;
		}

		if (c == "*") {
			if (types.length > 0) {
				var last = types[types.length - 1];
				if (
					last != XPathParser.AT &&
					last != XPathParser.DOUBLECOLON &&
					last != XPathParser.LEFTPARENTHESIS &&
					last != XPathParser.LEFTBRACKET &&
					last != XPathParser.AND &&
					last != XPathParser.OR &&
					last != XPathParser.MOD &&
					last != XPathParser.DIV &&
					last != XPathParser.MULTIPLYOPERATOR &&
					last != XPathParser.SLASH &&
					last != XPathParser.DOUBLESLASH &&
					last != XPathParser.BAR &&
					last != XPathParser.PLUS &&
					last != XPathParser.MINUS &&
					last != XPathParser.EQUALS &&
					last != XPathParser.NOTEQUAL &&
					last != XPathParser.LESSTHAN &&
					last != XPathParser.LESSTHANOREQUAL &&
					last != XPathParser.GREATERTHAN &&
					last != XPathParser.GREATERTHANOREQUAL
				) {
					types.push(XPathParser.MULTIPLYOPERATOR);
					values.push(c);
					c = s.charAt(pos++);
					continue;
				}
			}
			types.push(XPathParser.ASTERISKNAMETEST);
			values.push(c);
			c = s.charAt(pos++);
			continue;
		}

		if (c == ":") {
			if (s.charAt(pos) == ":") {
				types.push(XPathParser.DOUBLECOLON);
				values.push("::");
				pos++;
				c = s.charAt(pos++);
				continue;
			}
		}

		if (c == "/") {
			c = s.charAt(pos++);
			if (c == "/") {
				types.push(XPathParser.DOUBLESLASH);
				values.push("//");
				c = s.charAt(pos++);
				continue;
			}
			types.push(XPathParser.SLASH);
			values.push("/");
			continue;
		}

		if (c == "!") {
			if (s.charAt(pos) == "=") {
				types.push(XPathParser.NOTEQUAL);
				values.push("!=");
				pos++;
				c = s.charAt(pos++);
				continue;
			}
		}

		if (c == "<") {
			if (s.charAt(pos) == "=") {
				types.push(XPathParser.LESSTHANOREQUAL);
				values.push("<=");
				pos++;
				c = s.charAt(pos++);
				continue;
			}
			types.push(XPathParser.LESSTHAN);
			values.push("<");
			c = s.charAt(pos++);
			continue;
		}

		if (c == ">") {
			if (s.charAt(pos) == "=") {
				types.push(XPathParser.GREATERTHANOREQUAL);
				values.push(">=");
				pos++;
				c = s.charAt(pos++);
				continue;
			}
			types.push(XPathParser.GREATERTHAN);
			values.push(">");
			c = s.charAt(pos++);
			continue;
		}

		if (c == "_" || Utilities.isLetter(c.charCodeAt(0))) {
			let name = c;
			c = s.charAt(pos++);
			while (Utilities.isNCNameChar(c.charCodeAt(0))) {
				name += c;
				c = s.charAt(pos++);
			}
			if (types.length > 0) {
				var last = types[types.length - 1];
				if (
					last != XPathParser.AT &&
					last != XPathParser.DOUBLECOLON &&
					last != XPathParser.LEFTPARENTHESIS &&
					last != XPathParser.LEFTBRACKET &&
					last != XPathParser.AND &&
					last != XPathParser.OR &&
					last != XPathParser.MOD &&
					last != XPathParser.DIV &&
					last != XPathParser.MULTIPLYOPERATOR &&
					last != XPathParser.SLASH &&
					last != XPathParser.DOUBLESLASH &&
					last != XPathParser.BAR &&
					last != XPathParser.PLUS &&
					last != XPathParser.MINUS &&
					last != XPathParser.EQUALS &&
					last != XPathParser.NOTEQUAL &&
					last != XPathParser.LESSTHAN &&
					last != XPathParser.LESSTHANOREQUAL &&
					last != XPathParser.GREATERTHAN &&
					last != XPathParser.GREATERTHANOREQUAL
				) {
					if (name == "and") {
						types.push(XPathParser.AND);
						values.push(name);
						continue;
					}
					if (name == "or") {
						types.push(XPathParser.OR);
						values.push(name);
						continue;
					}
					if (name == "mod") {
						types.push(XPathParser.MOD);
						values.push(name);
						continue;
					}
					if (name == "div") {
						types.push(XPathParser.DIV);
						values.push(name);
						continue;
					}
				}
			}
			if (c == ":") {
				if (s.charAt(pos) == "*") {
					types.push(XPathParser.NCNAMECOLONASTERISK);
					values.push(`${name}:*`);
					pos++;
					c = s.charAt(pos++);
					continue;
				}
				if (s.charAt(pos) == "_" || Utilities.isLetter(s.charCodeAt(pos))) {
					name += ":";
					c = s.charAt(pos++);
					while (Utilities.isNCNameChar(c.charCodeAt(0))) {
						name += c;
						c = s.charAt(pos++);
					}
					if (c == "(") {
						types.push(XPathParser.FUNCTIONNAME);
						values.push(name);
						continue;
					}
					types.push(XPathParser.QNAME);
					values.push(name);
					continue;
				}
				if (s.charAt(pos) == ":") {
					types.push(XPathParser.AXISNAME);
					values.push(name);
					continue;
				}
			}
			if (c == "(") {
				if (name == "comment" || name == "text" || name == "node") {
					types.push(XPathParser.NODETYPE);
					values.push(name);
					continue;
				}
				if (name == "processing-instruction") {
					if (s.charAt(pos) == ")") {
						types.push(XPathParser.NODETYPE);
					} else {
						types.push(XPathParser.PROCESSINGINSTRUCTIONWITHLITERAL);
					}
					values.push(name);
					continue;
				}
				types.push(XPathParser.FUNCTIONNAME);
				values.push(name);
				continue;
			}
			types.push(XPathParser.QNAME);
			values.push(name);
			continue;
		}

		throw new Error(`Unexpected character ${c}`);
	}
	types.push(1);
	values.push("[EOF]");
	return [types, values];
};

XPathParser.SHIFT = "s";
XPathParser.REDUCE = "r";
XPathParser.ACCEPT = "a";

XPathParser.prototype.parse = function (s) {
	let types;
	let values;
	const res = this.tokenize(s);
	if (res == undefined) {
		return undefined;
	}
	types = res[0];
	values = res[1];
	let tokenPos = 0;
	const state = [];
	const tokenType = [];
	const tokenValue = [];
	var s;
	let a;
	let t;

	state.push(0);
	tokenType.push(1);
	tokenValue.push("_S");

	a = types[tokenPos];
	t = values[tokenPos++];
	while (1) {
		s = state[state.length - 1];
		switch (XPathParser.actionTable[s].charAt(a - 1)) {
			case XPathParser.SHIFT:
				tokenType.push(-a);
				tokenValue.push(t);
				state.push(XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32);
				a = types[tokenPos];
				t = values[tokenPos++];
				break;
			case XPathParser.REDUCE:
				var num =
					XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][1];
				var rhs = [];
				for (let i = 0; i < num; i++) {
					tokenType.pop();
					rhs.unshift(tokenValue.pop());
					state.pop();
				}
				var s_ = state[state.length - 1];
				tokenType.push(
					XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][0]
				);
				if (
					this.reduceActions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32] == undefined
				) {
					tokenValue.push(rhs[0]);
				} else {
					tokenValue.push(
						this.reduceActions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32](rhs)
					);
				}
				state.push(
					XPathParser.gotoTable[s_].charCodeAt(
						XPathParser.productions[XPathParser.actionTableNumber[s].charCodeAt(a - 1) - 32][0] - 2
					) - 33
				);
				break;
			case XPathParser.ACCEPT:
				return new XPath(tokenValue.pop());
			default:
				throw new Error("XPath parse error");
		}
	}
};

// XPath /////////////////////////////////////////////////////////////////////

XPath.prototype = new Object();
XPath.prototype.constructor = XPath;
XPath.superclass = Object.prototype;

function XPath(e) {
	this.expression = e;
}

XPath.prototype.toString = function () {
	return this.expression.toString();
};

function setIfUnset(obj, prop, value) {
	if (!(prop in obj)) {
		obj[prop] = value;
	}
}

XPath.prototype.evaluate = function (c) {
	c.contextNode = c.expressionContextNode;
	c.contextSize = 1;
	c.contextPosition = 1;

	// [2017-11-25] Removed usage of .implementation.hasFeature() since it does
	//              not reliably detect HTML DOMs (always returns false in xmldom and true in browsers)
	if (c.isHtml) {
		setIfUnset(c, "caseInsensitive", true);
		setIfUnset(c, "allowAnyNamespaceForNoPrefix", true);
	}

	setIfUnset(c, "caseInsensitive", false);

	return this.expression.evaluate(c);
};

XPath.XML_NAMESPACE_URI = "http://www.w3.org/XML/1998/namespace";
XPath.XMLNS_NAMESPACE_URI = "http://www.w3.org/2000/xmlns/";

// Expression ////////////////////////////////////////////////////////////////

Expression.prototype = new Object();
Expression.prototype.constructor = Expression;
Expression.superclass = Object.prototype;

function Expression() {}

Expression.prototype.init = function () {};

Expression.prototype.toString = function () {
	return "<Expression>";
};

Expression.prototype.evaluate = function (c) {
	throw new Error("Could not evaluate expression.");
};

// UnaryOperation ////////////////////////////////////////////////////////////

UnaryOperation.prototype = new Expression();
UnaryOperation.prototype.constructor = UnaryOperation;
UnaryOperation.superclass = Expression.prototype;

function UnaryOperation(rhs) {
	if (arguments.length > 0) {
		this.init(rhs);
	}
}

UnaryOperation.prototype.init = function (rhs) {
	this.rhs = rhs;
};

// UnaryMinusOperation ///////////////////////////////////////////////////////

UnaryMinusOperation.prototype = new UnaryOperation();
UnaryMinusOperation.prototype.constructor = UnaryMinusOperation;
UnaryMinusOperation.superclass = UnaryOperation.prototype;

function UnaryMinusOperation(rhs) {
	if (arguments.length > 0) {
		this.init(rhs);
	}
}

UnaryMinusOperation.prototype.init = function (rhs) {
	UnaryMinusOperation.superclass.init.call(this, rhs);
};

UnaryMinusOperation.prototype.evaluate = function (c) {
	return this.rhs.evaluate(c).number().negate();
};

UnaryMinusOperation.prototype.toString = function () {
	return `-${this.rhs.toString()}`;
};

// BinaryOperation ///////////////////////////////////////////////////////////

BinaryOperation.prototype = new Expression();
BinaryOperation.prototype.constructor = BinaryOperation;
BinaryOperation.superclass = Expression.prototype;

function BinaryOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

BinaryOperation.prototype.init = function (lhs, rhs) {
	this.lhs = lhs;
	this.rhs = rhs;
};

// OrOperation ///////////////////////////////////////////////////////////////

OrOperation.prototype = new BinaryOperation();
OrOperation.prototype.constructor = OrOperation;
OrOperation.superclass = BinaryOperation.prototype;

function OrOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

OrOperation.prototype.init = function (lhs, rhs) {
	OrOperation.superclass.init.call(this, lhs, rhs);
};

OrOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} or ${this.rhs.toString()})`;
};

OrOperation.prototype.evaluate = function (c) {
	const b = this.lhs.evaluate(c).bool();
	if (b.booleanValue()) {
		return b;
	}
	return this.rhs.evaluate(c).bool();
};

// AndOperation //////////////////////////////////////////////////////////////

AndOperation.prototype = new BinaryOperation();
AndOperation.prototype.constructor = AndOperation;
AndOperation.superclass = BinaryOperation.prototype;

function AndOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

AndOperation.prototype.init = function (lhs, rhs) {
	AndOperation.superclass.init.call(this, lhs, rhs);
};

AndOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} and ${this.rhs.toString()})`;
};

AndOperation.prototype.evaluate = function (c) {
	const b = this.lhs.evaluate(c).bool();
	if (!b.booleanValue()) {
		return b;
	}
	return this.rhs.evaluate(c).bool();
};

// EqualsOperation ///////////////////////////////////////////////////////////

EqualsOperation.prototype = new BinaryOperation();
EqualsOperation.prototype.constructor = EqualsOperation;
EqualsOperation.superclass = BinaryOperation.prototype;

function EqualsOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

EqualsOperation.prototype.init = function (lhs, rhs) {
	EqualsOperation.superclass.init.call(this, lhs, rhs);
};

EqualsOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} = ${this.rhs.toString()})`;
};

EqualsOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).equals(this.rhs.evaluate(c));
};

// NotEqualOperation /////////////////////////////////////////////////////////

NotEqualOperation.prototype = new BinaryOperation();
NotEqualOperation.prototype.constructor = NotEqualOperation;
NotEqualOperation.superclass = BinaryOperation.prototype;

function NotEqualOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

NotEqualOperation.prototype.init = function (lhs, rhs) {
	NotEqualOperation.superclass.init.call(this, lhs, rhs);
};

NotEqualOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} != ${this.rhs.toString()})`;
};

NotEqualOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).notequal(this.rhs.evaluate(c));
};

// LessThanOperation /////////////////////////////////////////////////////////

LessThanOperation.prototype = new BinaryOperation();
LessThanOperation.prototype.constructor = LessThanOperation;
LessThanOperation.superclass = BinaryOperation.prototype;

function LessThanOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

LessThanOperation.prototype.init = function (lhs, rhs) {
	LessThanOperation.superclass.init.call(this, lhs, rhs);
};

LessThanOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).lessthan(this.rhs.evaluate(c));
};

LessThanOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} < ${this.rhs.toString()})`;
};

// GreaterThanOperation //////////////////////////////////////////////////////

GreaterThanOperation.prototype = new BinaryOperation();
GreaterThanOperation.prototype.constructor = GreaterThanOperation;
GreaterThanOperation.superclass = BinaryOperation.prototype;

function GreaterThanOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

GreaterThanOperation.prototype.init = function (lhs, rhs) {
	GreaterThanOperation.superclass.init.call(this, lhs, rhs);
};

GreaterThanOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).greaterthan(this.rhs.evaluate(c));
};

GreaterThanOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} > ${this.rhs.toString()})`;
};

// LessThanOrEqualOperation //////////////////////////////////////////////////

LessThanOrEqualOperation.prototype = new BinaryOperation();
LessThanOrEqualOperation.prototype.constructor = LessThanOrEqualOperation;
LessThanOrEqualOperation.superclass = BinaryOperation.prototype;

function LessThanOrEqualOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

LessThanOrEqualOperation.prototype.init = function (lhs, rhs) {
	LessThanOrEqualOperation.superclass.init.call(this, lhs, rhs);
};

LessThanOrEqualOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).lessthanorequal(this.rhs.evaluate(c));
};

LessThanOrEqualOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} <= ${this.rhs.toString()})`;
};

// GreaterThanOrEqualOperation ///////////////////////////////////////////////

GreaterThanOrEqualOperation.prototype = new BinaryOperation();
GreaterThanOrEqualOperation.prototype.constructor = GreaterThanOrEqualOperation;
GreaterThanOrEqualOperation.superclass = BinaryOperation.prototype;

function GreaterThanOrEqualOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

GreaterThanOrEqualOperation.prototype.init = function (lhs, rhs) {
	GreaterThanOrEqualOperation.superclass.init.call(this, lhs, rhs);
};

GreaterThanOrEqualOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).greaterthanorequal(this.rhs.evaluate(c));
};

GreaterThanOrEqualOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} >= ${this.rhs.toString()})`;
};

// PlusOperation /////////////////////////////////////////////////////////////

PlusOperation.prototype = new BinaryOperation();
PlusOperation.prototype.constructor = PlusOperation;
PlusOperation.superclass = BinaryOperation.prototype;

function PlusOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

PlusOperation.prototype.init = function (lhs, rhs) {
	PlusOperation.superclass.init.call(this, lhs, rhs);
};

PlusOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).number().plus(this.rhs.evaluate(c).number());
};

PlusOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} + ${this.rhs.toString()})`;
};

// MinusOperation ////////////////////////////////////////////////////////////

MinusOperation.prototype = new BinaryOperation();
MinusOperation.prototype.constructor = MinusOperation;
MinusOperation.superclass = BinaryOperation.prototype;

function MinusOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

MinusOperation.prototype.init = function (lhs, rhs) {
	MinusOperation.superclass.init.call(this, lhs, rhs);
};

MinusOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).number().minus(this.rhs.evaluate(c).number());
};

MinusOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} - ${this.rhs.toString()})`;
};

// MultiplyOperation /////////////////////////////////////////////////////////

MultiplyOperation.prototype = new BinaryOperation();
MultiplyOperation.prototype.constructor = MultiplyOperation;
MultiplyOperation.superclass = BinaryOperation.prototype;

function MultiplyOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

MultiplyOperation.prototype.init = function (lhs, rhs) {
	MultiplyOperation.superclass.init.call(this, lhs, rhs);
};

MultiplyOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).number().multiply(this.rhs.evaluate(c).number());
};

MultiplyOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} * ${this.rhs.toString()})`;
};

// DivOperation //////////////////////////////////////////////////////////////

DivOperation.prototype = new BinaryOperation();
DivOperation.prototype.constructor = DivOperation;
DivOperation.superclass = BinaryOperation.prototype;

function DivOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

DivOperation.prototype.init = function (lhs, rhs) {
	DivOperation.superclass.init.call(this, lhs, rhs);
};

DivOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).number().div(this.rhs.evaluate(c).number());
};

DivOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} div ${this.rhs.toString()})`;
};

// ModOperation //////////////////////////////////////////////////////////////

ModOperation.prototype = new BinaryOperation();
ModOperation.prototype.constructor = ModOperation;
ModOperation.superclass = BinaryOperation.prototype;

function ModOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

ModOperation.prototype.init = function (lhs, rhs) {
	ModOperation.superclass.init.call(this, lhs, rhs);
};

ModOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).number().mod(this.rhs.evaluate(c).number());
};

ModOperation.prototype.toString = function () {
	return `(${this.lhs.toString()} mod ${this.rhs.toString()})`;
};

// BarOperation //////////////////////////////////////////////////////////////

BarOperation.prototype = new BinaryOperation();
BarOperation.prototype.constructor = BarOperation;
BarOperation.superclass = BinaryOperation.prototype;

function BarOperation(lhs, rhs) {
	if (arguments.length > 0) {
		this.init(lhs, rhs);
	}
}

BarOperation.prototype.init = function (lhs, rhs) {
	BarOperation.superclass.init.call(this, lhs, rhs);
};

BarOperation.prototype.evaluate = function (c) {
	return this.lhs.evaluate(c).nodeset().union(this.rhs.evaluate(c).nodeset());
};

BarOperation.prototype.toString = function () {
	return map(toString, [this.lhs, this.rhs]).join(" | ");
};

// PathExpr //////////////////////////////////////////////////////////////////

PathExpr.prototype = new Expression();
PathExpr.prototype.constructor = PathExpr;
PathExpr.superclass = Expression.prototype;

function PathExpr(filter, filterPreds, locpath) {
	if (arguments.length > 0) {
		this.init(filter, filterPreds, locpath);
	}
}

PathExpr.prototype.init = function (filter, filterPreds, locpath) {
	PathExpr.superclass.init.call(this);
	this.filter = filter;
	this.filterPredicates = filterPreds;
	this.locationPath = locpath;
};

/**
 * Returns the topmost node of the tree containing node
 */
function findRoot(node) {
	while (node && node.parentNode) {
		node = node.parentNode;
	}

	return node;
}

PathExpr.applyPredicates = function (predicates, c, nodes) {
	if (predicates.length === 0) {
		return nodes;
	}

	const ctx = c.extend({});

	return reduce(
		function (inNodes, pred) {
			ctx.contextSize = inNodes.length;

			return filter(function (node, i) {
				ctx.contextNode = node;
				ctx.contextPosition = i + 1;

				return PathExpr.predicateMatches(pred, ctx);
			}, inNodes);
		},
		nodes,
		predicates
	);
};

PathExpr.getRoot = function (xpc, nodes) {
	const firstNode = nodes[0];

	if (firstNode.nodeType === 9 /*Node.DOCUMENT_NODE*/) {
		return firstNode;
	}

	if (xpc.virtualRoot) {
		return xpc.virtualRoot;
	}

	const ownerDoc = firstNode.ownerDocument;

	if (ownerDoc) {
		return ownerDoc;
	}

	// IE 5.5 doesn't have ownerDocument?
	let n = firstNode;
	while (n.parentNode != null) {
		n = n.parentNode;
	}
	return n;
};

PathExpr.applyStep = function (step, xpc, node) {
	const self = this;
	const newNodes = [];
	xpc.contextNode = node;

	switch (step.axis) {
		case Step.ANCESTOR:
			// look at all the ancestor nodes
			if (xpc.contextNode === xpc.virtualRoot) {
				break;
			}
			var m;
			if (xpc.contextNode.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
				m = PathExpr.getOwnerElement(xpc.contextNode);
			} else {
				m = xpc.contextNode.parentNode;
			}
			while (m != null) {
				if (step.nodeTest.matches(m, xpc)) {
					newNodes.push(m);
				}
				if (m === xpc.virtualRoot) {
					break;
				}
				m = m.parentNode;
			}
			break;

		case Step.ANCESTORORSELF:
			// look at all the ancestor nodes and the current node
			for (
				var m = xpc.contextNode;
				m != null;
				m = m.nodeType == 2 /*Node.ATTRIBUTE_NODE*/ ? PathExpr.getOwnerElement(m) : m.parentNode
			) {
				if (step.nodeTest.matches(m, xpc)) {
					newNodes.push(m);
				}
				if (m === xpc.virtualRoot) {
					break;
				}
			}
			break;

		case Step.ATTRIBUTE:
			// look at the attributes
			var nnm = xpc.contextNode.attributes;
			if (nnm != null) {
				for (var k = 0; k < nnm.length; k++) {
					var m = nnm.item(k);
					if (step.nodeTest.matches(m, xpc)) {
						newNodes.push(m);
					}
				}
			}
			break;

		case Step.CHILD:
			// look at all child elements
			for (var m = xpc.contextNode.firstChild; m != null; m = m.nextSibling) {
				if (step.nodeTest.matches(m, xpc)) {
					newNodes.push(m);
				}
			}

			if (xpc.contextNode.shadowRoot) {
				for (var m = xpc.contextNode.shadowRoot.firstChild; m != null; m = m.nextSibling) {
					if (step.nodeTest.matches(m, xpc)) {
						newNodes.push(m);
					}
				}
			}
			break;

		case Step.DESCENDANT:
			// look at all descendant nodes
			var st = [xpc.contextNode.firstChild];
			while (st.length > 0) {
				for (var m = st.pop(); m != null; ) {
					if (step.nodeTest.matches(m, xpc)) {
						newNodes.push(m);
					}
					if (m.firstChild != null) {
						st.push(m.nextSibling);
						m = m.firstChild;
					} else {
						m = m.nextSibling;
					}
				}
			}
			break;

		case Step.DESCENDANTORSELF:
			// look at self
			if (step.nodeTest.matches(xpc.contextNode, xpc)) {
				newNodes.push(xpc.contextNode);
			}

			// look at all descendant nodes
			var st = [xpc.contextNode.firstChild];

			if (xpc.contextNode.shadowRoot?.firstChild != null) {
				st.push(xpc.contextNode.shadowRoot.firstChild);
			}

			while (st.length > 0) {
				for (var m = st.pop(); m != null; ) {
					if (step.nodeTest.matches(m, xpc)) {
						newNodes.push(m);
					}

					if (m.shadowRoot?.firstChild != null) {
						st.push(m.shadowRoot.firstChild);
					}

					if (m.firstChild != null) {
						st.push(m.nextSibling);
						m = m.firstChild;
					} else {
						m = m.nextSibling;
					}
				}
			}

			break;

		case Step.FOLLOWING:
			if (xpc.contextNode === xpc.virtualRoot) {
				break;
			}
			var st = [];
			if (xpc.contextNode.firstChild != null) {
				st.unshift(xpc.contextNode.firstChild);
			} else {
				st.unshift(xpc.contextNode.nextSibling);
			}
			for (
				var m = xpc.contextNode.parentNode;
				m != null && m.nodeType != 9 /*Node.DOCUMENT_NODE*/ && m !== xpc.virtualRoot;
				m = m.parentNode
			) {
				st.unshift(m.nextSibling);
			}
			do {
				for (var m = st.pop(); m != null; ) {
					if (step.nodeTest.matches(m, xpc)) {
						newNodes.push(m);
					}
					if (m.firstChild != null) {
						st.push(m.nextSibling);
						m = m.firstChild;
					} else {
						m = m.nextSibling;
					}
				}
			} while (st.length > 0);
			break;

		case Step.FOLLOWINGSIBLING:
			if (xpc.contextNode === xpc.virtualRoot) {
				break;
			}
			for (var m = xpc.contextNode.nextSibling; m != null; m = m.nextSibling) {
				if (step.nodeTest.matches(m, xpc)) {
					newNodes.push(m);
				}
			}
			break;

		case Step.NAMESPACE:
			var n = {};
			if (xpc.contextNode.nodeType == 1 /*Node.ELEMENT_NODE*/) {
				n.xml = XPath.XML_NAMESPACE_URI;
				n.xmlns = XPath.XMLNS_NAMESPACE_URI;
				for (
					var m = xpc.contextNode;
					m != null && m.nodeType == 1 /*Node.ELEMENT_NODE*/;
					m = m.parentNode
				) {
					for (var k = 0; k < m.attributes.length; k++) {
						const attr = m.attributes.item(k);
						const nm = String(attr.name);
						if (nm == "xmlns") {
							if (n[""] == undefined) {
								n[""] = attr.value;
							}
						} else if (nm.length > 6 && nm.substring(0, 6) == "xmlns:") {
							var pre = nm.substring(6, nm.length);
							if (n[pre] == undefined) {
								n[pre] = attr.value;
							}
						}
					}
				}
				for (var pre in n) {
					const nsn = new XPathNamespace(pre, n[pre], xpc.contextNode);
					if (step.nodeTest.matches(nsn, xpc)) {
						newNodes.push(nsn);
					}
				}
			}
			break;

		case Step.PARENT:
			m = null;
			if (xpc.contextNode !== xpc.virtualRoot) {
				if (xpc.contextNode.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
					m = PathExpr.getOwnerElement(xpc.contextNode);
				} else {
					m = xpc.contextNode.parentNode;
				}
			}
			if (m != null && step.nodeTest.matches(m, xpc)) {
				newNodes.push(m);
			}
			break;

		case Step.PRECEDING:
			var st;
			if (xpc.virtualRoot != null) {
				st = [xpc.virtualRoot];
			} else {
				// cannot rely on .ownerDocument because the node may be in a document fragment
				st = [findRoot(xpc.contextNode)];
			}
			outer: while (st.length > 0) {
				for (var m = st.pop(); m != null; ) {
					if (m == xpc.contextNode) {
						break outer;
					}
					if (step.nodeTest.matches(m, xpc)) {
						newNodes.unshift(m);
					}
					if (m.firstChild != null) {
						st.push(m.nextSibling);
						m = m.firstChild;
					} else {
						m = m.nextSibling;
					}
				}
			}
			break;

		case Step.PRECEDINGSIBLING:
			if (xpc.contextNode === xpc.virtualRoot) {
				break;
			}
			for (var m = xpc.contextNode.previousSibling; m != null; m = m.previousSibling) {
				if (step.nodeTest.matches(m, xpc)) {
					newNodes.push(m);
				}
			}
			break;

		case Step.SELF:
			if (step.nodeTest.matches(xpc.contextNode, xpc)) {
				newNodes.push(xpc.contextNode);
			}
			break;

		default:
	}

	return newNodes;
};

function applyStepWithPredicates(step, xpc, node) {
	return PathExpr.applyPredicates(step.predicates, xpc, PathExpr.applyStep(step, xpc, node));
}

function applyStepToNodes(context, nodes, step) {
	return flatten(map(applyStepWithPredicates.bind(null, step, context), nodes));
}

PathExpr.applySteps = function (steps, xpc, nodes) {
	return reduce(applyStepToNodes.bind(null, xpc), nodes, steps);
};

PathExpr.prototype.applyFilter = function (c, xpc) {
	if (!this.filter) {
		return { nodes: [c.contextNode] };
	}

	const ns = this.filter.evaluate(c);

	if (!Utilities.instance_of(ns, XNodeSet)) {
		if (
			(this.filterPredicates != null && this.filterPredicates.length > 0) ||
			this.locationPath != null
		) {
			throw new Error(
				"Path expression filter must evaluate to a nodeset if predicates or location path are used"
			);
		}

		return { nonNodes: ns };
	}

	return {
		nodes: PathExpr.applyPredicates(this.filterPredicates || [], xpc, ns.toUnsortedArray()),
	};
};

PathExpr.applyLocationPath = function (locationPath, xpc, nodes) {
	if (!locationPath) {
		return nodes;
	}

	const startNodes = locationPath.absolute ? [PathExpr.getRoot(xpc, nodes)] : nodes;

	return PathExpr.applySteps(locationPath.steps, xpc, startNodes);
};

PathExpr.prototype.evaluate = function (c) {
	const xpc = assign(new XPathContext(), c);

	const filterResult = this.applyFilter(c, xpc);

	if ("nonNodes" in filterResult) {
		return filterResult.nonNodes;
	}

	const ns = new XNodeSet();
	ns.addArray(PathExpr.applyLocationPath(this.locationPath, xpc, filterResult.nodes));
	return ns;
};

PathExpr.predicateMatches = function (pred, c) {
	const res = pred.evaluate(c);

	return Utilities.instance_of(res, XNumber)
		? c.contextPosition === res.numberValue()
		: res.booleanValue();
};

PathExpr.predicateString = function (predicate) {
	return wrap("[", "]", predicate.toString());
};

PathExpr.predicatesString = function (predicates) {
	return join("", map(PathExpr.predicateString, predicates));
};

PathExpr.prototype.toString = function () {
	if (this.filter != undefined) {
		const filterStr = toString(this.filter);

		if (Utilities.instance_of(this.filter, XString)) {
			return wrap("'", "'", filterStr);
		}
		if (this.filterPredicates != undefined && this.filterPredicates.length) {
			return wrap("(", ")", filterStr) + PathExpr.predicatesString(this.filterPredicates);
		}
		if (this.locationPath != undefined) {
			return filterStr + (this.locationPath.absolute ? "" : "/") + toString(this.locationPath);
		}

		return filterStr;
	}

	return toString(this.locationPath);
};

PathExpr.getOwnerElement = function (n) {
	// DOM 2 has ownerElement
	if (n.ownerElement) {
		return n.ownerElement;
	}
	// DOM 1 Internet Explorer can use selectSingleNode (ironically)
	try {
		if (n.selectSingleNode) {
			return n.selectSingleNode("..");
		}
	} catch (e) {}
	// Other DOM 1 implementations must use this egregious search
	const doc = n.nodeType == 9 /*Node.DOCUMENT_NODE*/ ? n : n.ownerDocument;
	const elts = doc.getElementsByTagName("*");
	for (let i = 0; i < elts.length; i++) {
		const elt = elts.item(i);
		const nnm = elt.attributes;
		for (let j = 0; j < nnm.length; j++) {
			const an = nnm.item(j);
			if (an === n) {
				return elt;
			}
		}
	}
	return null;
};

// LocationPath //////////////////////////////////////////////////////////////

LocationPath.prototype = new Object();
LocationPath.prototype.constructor = LocationPath;
LocationPath.superclass = Object.prototype;

function LocationPath(abs, steps) {
	if (arguments.length > 0) {
		this.init(abs, steps);
	}
}

LocationPath.prototype.init = function (abs, steps) {
	this.absolute = abs;
	this.steps = steps;
};

LocationPath.prototype.toString = function () {
	return (this.absolute ? "/" : "") + map(toString, this.steps).join("/");
};

// Step //////////////////////////////////////////////////////////////////////

Step.prototype = new Object();
Step.prototype.constructor = Step;
Step.superclass = Object.prototype;

function Step(axis, nodetest, preds) {
	if (arguments.length > 0) {
		this.init(axis, nodetest, preds);
	}
}

Step.prototype.init = function (axis, nodetest, preds) {
	this.axis = axis;
	this.nodeTest = nodetest;
	this.predicates = preds;
};

Step.prototype.toString = function () {
	return `${Step.STEPNAMES[this.axis]}::${this.nodeTest.toString()}${PathExpr.predicatesString(
		this.predicates
	)}`;
};

Step.ANCESTOR = 0;
Step.ANCESTORORSELF = 1;
Step.ATTRIBUTE = 2;
Step.CHILD = 3;
Step.DESCENDANT = 4;
Step.DESCENDANTORSELF = 5;
Step.FOLLOWING = 6;
Step.FOLLOWINGSIBLING = 7;
Step.NAMESPACE = 8;
Step.PARENT = 9;
Step.PRECEDING = 10;
Step.PRECEDINGSIBLING = 11;
Step.SELF = 12;

Step.STEPNAMES = reduce(
	function (acc, x) {
		return (acc[x[0]] = x[1]), acc;
	},
	{},
	[
		[Step.ANCESTOR, "ancestor"],
		[Step.ANCESTORORSELF, "ancestor-or-self"],
		[Step.ATTRIBUTE, "attribute"],
		[Step.CHILD, "child"],
		[Step.DESCENDANT, "descendant"],
		[Step.DESCENDANTORSELF, "descendant-or-self"],
		[Step.FOLLOWING, "following"],
		[Step.FOLLOWINGSIBLING, "following-sibling"],
		[Step.NAMESPACE, "namespace"],
		[Step.PARENT, "parent"],
		[Step.PRECEDING, "preceding"],
		[Step.PRECEDINGSIBLING, "preceding-sibling"],
		[Step.SELF, "self"],
	]
);

// NodeTest //////////////////////////////////////////////////////////////////

NodeTest.prototype = new Object();
NodeTest.prototype.constructor = NodeTest;
NodeTest.superclass = Object.prototype;

function NodeTest(type, value) {
	if (arguments.length > 0) {
		this.init(type, value);
	}
}

NodeTest.prototype.init = function (type, value) {
	this.type = type;
	this.value = value;
};

NodeTest.prototype.toString = function () {
	return "<unknown nodetest type>";
};

NodeTest.prototype.matches = function (n, xpc) {
	console.warn("unknown node test type");
};

NodeTest.NAMETESTANY = 0;
NodeTest.NAMETESTPREFIXANY = 1;
NodeTest.NAMETESTQNAME = 2;
NodeTest.COMMENT = 3;
NodeTest.TEXT = 4;
NodeTest.PI = 5;
NodeTest.NODE = 6;

NodeTest.isNodeType = function (types) {
	return function (node) {
		return includes(types, node.nodeType);
	};
};

NodeTest.makeNodeTestType = function (type, members, ctor) {
	const newType = ctor || function () {};

	newType.prototype = new NodeTest(type);
	newType.prototype.constructor = newType;

	assign(newType.prototype, members);

	return newType;
};
// create invariant node test for certain node types
NodeTest.makeNodeTypeTest = function (type, nodeTypes, stringVal) {
	return new (NodeTest.makeNodeTestType(type, {
		matches: NodeTest.isNodeType(nodeTypes),
		toString: always(stringVal),
	}))();
};

NodeTest.hasPrefix = function (node) {
	return node.prefix || (node.nodeName || node.tagName).indexOf(":") !== -1;
};

NodeTest.isElementOrAttribute = NodeTest.isNodeType([1, 2]);
NodeTest.nameSpaceMatches = function (prefix, xpc, n) {
	const nNamespace = n.namespaceURI || "";

	if (!prefix) {
		return !nNamespace || (xpc.allowAnyNamespaceForNoPrefix && !NodeTest.hasPrefix(n));
	}

	const ns = xpc.namespaceResolver.getNamespace(prefix, xpc.expressionContextNode);

	if (ns == null) {
		throw new Error(`Cannot resolve QName ${prefix}`);
	}

	return ns === nNamespace;
};
NodeTest.localNameMatches = function (localName, xpc, n) {
	const nLocalName = n.localName || n.nodeName;

	return xpc.caseInsensitive
		? localName.toLowerCase() === nLocalName.toLowerCase()
		: localName === nLocalName;
};

NodeTest.NameTestPrefixAny = NodeTest.makeNodeTestType(
	NodeTest.NAMETESTPREFIXANY,
	{
		matches(n, xpc) {
			return NodeTest.isElementOrAttribute(n) && NodeTest.nameSpaceMatches(this.prefix, xpc, n);
		},
		toString() {
			return `${this.prefix}:*`;
		},
	},
	function NameTestPrefixAny(prefix) {
		this.prefix = prefix;
	}
);

NodeTest.NameTestQName = NodeTest.makeNodeTestType(
	NodeTest.NAMETESTQNAME,
	{
		matches(n, xpc) {
			return (
				NodeTest.isNodeType([1, 2, XPathNamespace.XPATH_NAMESPACE_NODE])(n) &&
				NodeTest.nameSpaceMatches(this.prefix, xpc, n) &&
				NodeTest.localNameMatches(this.localName, xpc, n)
			);
		},
		toString() {
			return this.name;
		},
	},
	function NameTestQName(name) {
		const nameParts = name.split(":");

		this.name = name;
		this.prefix = nameParts.length > 1 ? nameParts[0] : null;
		this.localName = nameParts[nameParts.length > 1 ? 1 : 0];
	}
);

NodeTest.PITest = NodeTest.makeNodeTestType(
	NodeTest.PI,
	{
		matches(n, xpc) {
			return NodeTest.isNodeType([7])(n) && (n.target || n.nodeName) === this.name;
		},
		toString() {
			return wrap('processing-instruction("', '")', this.name);
		},
	},
	function (name) {
		this.name = name;
	}
);

// singletons

// elements, attributes, namespaces
NodeTest.nameTestAny = NodeTest.makeNodeTypeTest(
	NodeTest.NAMETESTANY,
	[1, 2, XPathNamespace.XPATH_NAMESPACE_NODE],
	"*"
);
// text, cdata
NodeTest.textTest = NodeTest.makeNodeTypeTest(NodeTest.TEXT, [3, 4], "text()");
NodeTest.commentTest = NodeTest.makeNodeTypeTest(NodeTest.COMMENT, [8], "comment()");
// elements, attributes, text, cdata, PIs, comments, document nodes
NodeTest.nodeTest = NodeTest.makeNodeTypeTest(NodeTest.NODE, [1, 2, 3, 4, 7, 8, 9], "node()");
NodeTest.anyPiTest = NodeTest.makeNodeTypeTest(NodeTest.PI, [7], "processing-instruction()");

// VariableReference /////////////////////////////////////////////////////////

VariableReference.prototype = new Expression();
VariableReference.prototype.constructor = VariableReference;
VariableReference.superclass = Expression.prototype;

function VariableReference(v) {
	if (arguments.length > 0) {
		this.init(v);
	}
}

VariableReference.prototype.init = function (v) {
	this.variable = v;
};

VariableReference.prototype.toString = function () {
	return `$${this.variable}`;
};

VariableReference.prototype.evaluate = function (c) {
	const parts = Utilities.resolveQName(this.variable, c.namespaceResolver, c.contextNode, false);

	if (parts[0] == null) {
		throw new Error(`Cannot resolve QName ${fn}`);
	}
	const result = c.variableResolver.getVariable(parts[1], parts[0]);
	if (!result) {
		throw XPathException.fromMessage(`Undeclared variable: ${this.toString()}`);
	}
	return result;
};

// FunctionCall //////////////////////////////////////////////////////////////

FunctionCall.prototype = new Expression();
FunctionCall.prototype.constructor = FunctionCall;
FunctionCall.superclass = Expression.prototype;

function FunctionCall(fn, args) {
	if (arguments.length > 0) {
		this.init(fn, args);
	}
}

FunctionCall.prototype.init = function (fn, args) {
	this.functionName = fn;
	this.arguments = args;
};

FunctionCall.prototype.toString = function () {
	let s = `${this.functionName}(`;
	for (let i = 0; i < this.arguments.length; i++) {
		if (i > 0) {
			s += ", ";
		}
		s += this.arguments[i].toString();
	}
	return `${s})`;
};

FunctionCall.prototype.evaluate = function (c) {
	const f = FunctionResolver.getFunctionFromContext(this.functionName, c);

	if (!f) {
		throw new Error(`Unknown function ${this.functionName}`);
	}

	const a = [c].concat(this.arguments);
	return f.apply(c.functionResolver.thisArg, a);
};

// Operators /////////////////////////////////////////////////////////////////

const Operators = new Object();

Operators.equals = function (l, r) {
	return l.equals(r);
};

Operators.notequal = function (l, r) {
	return l.notequal(r);
};

Operators.lessthan = function (l, r) {
	return l.lessthan(r);
};

Operators.greaterthan = function (l, r) {
	return l.greaterthan(r);
};

Operators.lessthanorequal = function (l, r) {
	return l.lessthanorequal(r);
};

Operators.greaterthanorequal = function (l, r) {
	return l.greaterthanorequal(r);
};

// XString ///////////////////////////////////////////////////////////////////

XString.prototype = new Expression();
XString.prototype.constructor = XString;
XString.superclass = Expression.prototype;

function XString(s) {
	if (arguments.length > 0) {
		this.init(s);
	}
}

XString.prototype.init = function (s) {
	this.str = String(s);
};

XString.prototype.toString = function () {
	return this.str;
};

XString.prototype.evaluate = function (c) {
	return this;
};

XString.prototype.string = function () {
	return this;
};

XString.prototype.number = function () {
	return new XNumber(this.str);
};

XString.prototype.bool = function () {
	return new XBoolean(this.str);
};

XString.prototype.nodeset = function () {
	throw new Error("Cannot convert string to nodeset");
};

XString.prototype.stringValue = function () {
	return this.str;
};

XString.prototype.numberValue = function () {
	return this.number().numberValue();
};

XString.prototype.booleanValue = function () {
	return this.bool().booleanValue();
};

XString.prototype.equals = function (r) {
	if (Utilities.instance_of(r, XBoolean)) {
		return this.bool().equals(r);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.number().equals(r);
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithString(this, Operators.equals);
	}
	return new XBoolean(this.str == r.str);
};

XString.prototype.notequal = function (r) {
	if (Utilities.instance_of(r, XBoolean)) {
		return this.bool().notequal(r);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.number().notequal(r);
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithString(this, Operators.notequal);
	}
	return new XBoolean(this.str != r.str);
};

XString.prototype.lessthan = function (r) {
	return this.number().lessthan(r);
};

XString.prototype.greaterthan = function (r) {
	return this.number().greaterthan(r);
};

XString.prototype.lessthanorequal = function (r) {
	return this.number().lessthanorequal(r);
};

XString.prototype.greaterthanorequal = function (r) {
	return this.number().greaterthanorequal(r);
};

// XNumber ///////////////////////////////////////////////////////////////////

XNumber.prototype = new Expression();
XNumber.prototype.constructor = XNumber;
XNumber.superclass = Expression.prototype;

function XNumber(n) {
	if (arguments.length > 0) {
		this.init(n);
	}
}

XNumber.prototype.init = function (n) {
	this.num = typeof n === "string" ? this.parse(n) : Number(n);
};

XNumber.prototype.numberFormat = /^\s*-?[0-9]*\.?[0-9]+\s*$/;

XNumber.prototype.parse = function (s) {
	// XPath representation of numbers is more restrictive than what Number() or parseFloat() allow
	return this.numberFormat.test(s) ? parseFloat(s) : Number.NaN;
};

function padSmallNumber(numberStr) {
	const parts = numberStr.split("e-");
	let base = parts[0].replace(".", "");
	const exponent = Number(parts[1]);

	for (let i = 0; i < exponent - 1; i += 1) {
		base = `0${base}`;
	}

	return `0.${base}`;
}

function padLargeNumber(numberStr) {
	const parts = numberStr.split("e");
	let base = parts[0].replace(".", "");
	const exponent = Number(parts[1]);
	const zerosToAppend = exponent + 1 - base.length;

	for (let i = 0; i < zerosToAppend; i += 1) {
		base += "0";
	}

	return base;
}

XNumber.prototype.toString = function () {
	const strValue = this.num.toString();

	if (strValue.indexOf("e-") !== -1) {
		return padSmallNumber(strValue);
	}

	if (strValue.indexOf("e") !== -1) {
		return padLargeNumber(strValue);
	}

	return strValue;
};

XNumber.prototype.evaluate = function (c) {
	return this;
};

XNumber.prototype.string = function () {
	return new XString(this.toString());
};

XNumber.prototype.number = function () {
	return this;
};

XNumber.prototype.bool = function () {
	return new XBoolean(this.num);
};

XNumber.prototype.nodeset = function () {
	throw new Error("Cannot convert number to nodeset");
};

XNumber.prototype.stringValue = function () {
	return this.string().stringValue();
};

XNumber.prototype.numberValue = function () {
	return this.num;
};

XNumber.prototype.booleanValue = function () {
	return this.bool().booleanValue();
};

XNumber.prototype.negate = function () {
	return new XNumber(-this.num);
};

XNumber.prototype.equals = function (r) {
	if (Utilities.instance_of(r, XBoolean)) {
		return this.bool().equals(r);
	}
	if (Utilities.instance_of(r, XString)) {
		return this.equals(r.number());
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.equals);
	}
	return new XBoolean(this.num == r.num);
};

XNumber.prototype.notequal = function (r) {
	if (Utilities.instance_of(r, XBoolean)) {
		return this.bool().notequal(r);
	}
	if (Utilities.instance_of(r, XString)) {
		return this.notequal(r.number());
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.notequal);
	}
	return new XBoolean(this.num != r.num);
};

XNumber.prototype.lessthan = function (r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.greaterthan);
	}
	if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
		return this.lessthan(r.number());
	}
	return new XBoolean(this.num < r.num);
};

XNumber.prototype.greaterthan = function (r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.lessthan);
	}
	if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
		return this.greaterthan(r.number());
	}
	return new XBoolean(this.num > r.num);
};

XNumber.prototype.lessthanorequal = function (r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.greaterthanorequal);
	}
	if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
		return this.lessthanorequal(r.number());
	}
	return new XBoolean(this.num <= r.num);
};

XNumber.prototype.greaterthanorequal = function (r) {
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithNumber(this, Operators.lessthanorequal);
	}
	if (Utilities.instance_of(r, XBoolean) || Utilities.instance_of(r, XString)) {
		return this.greaterthanorequal(r.number());
	}
	return new XBoolean(this.num >= r.num);
};

XNumber.prototype.plus = function (r) {
	return new XNumber(this.num + r.num);
};

XNumber.prototype.minus = function (r) {
	return new XNumber(this.num - r.num);
};

XNumber.prototype.multiply = function (r) {
	return new XNumber(this.num * r.num);
};

XNumber.prototype.div = function (r) {
	return new XNumber(this.num / r.num);
};

XNumber.prototype.mod = function (r) {
	return new XNumber(this.num % r.num);
};

// XBoolean //////////////////////////////////////////////////////////////////

XBoolean.prototype = new Expression();
XBoolean.prototype.constructor = XBoolean;
XBoolean.superclass = Expression.prototype;

function XBoolean(b) {
	if (arguments.length > 0) {
		this.init(b);
	}
}

XBoolean.prototype.init = function (b) {
	this.b = Boolean(b);
};

XBoolean.prototype.toString = function () {
	return this.b.toString();
};

XBoolean.prototype.evaluate = function (c) {
	return this;
};

XBoolean.prototype.string = function () {
	return new XString(this.b);
};

XBoolean.prototype.number = function () {
	return new XNumber(this.b);
};

XBoolean.prototype.bool = function () {
	return this;
};

XBoolean.prototype.nodeset = function () {
	throw new Error("Cannot convert boolean to nodeset");
};

XBoolean.prototype.stringValue = function () {
	return this.string().stringValue();
};

XBoolean.prototype.numberValue = function () {
	return this.number().numberValue();
};

XBoolean.prototype.booleanValue = function () {
	return this.b;
};

XBoolean.prototype.not = function () {
	return new XBoolean(!this.b);
};

XBoolean.prototype.equals = function (r) {
	if (Utilities.instance_of(r, XString) || Utilities.instance_of(r, XNumber)) {
		return this.equals(r.bool());
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithBoolean(this, Operators.equals);
	}
	return new XBoolean(this.b == r.b);
};

XBoolean.prototype.notequal = function (r) {
	if (Utilities.instance_of(r, XString) || Utilities.instance_of(r, XNumber)) {
		return this.notequal(r.bool());
	}
	if (Utilities.instance_of(r, XNodeSet)) {
		return r.compareWithBoolean(this, Operators.notequal);
	}
	return new XBoolean(this.b != r.b);
};

XBoolean.prototype.lessthan = function (r) {
	return this.number().lessthan(r);
};

XBoolean.prototype.greaterthan = function (r) {
	return this.number().greaterthan(r);
};

XBoolean.prototype.lessthanorequal = function (r) {
	return this.number().lessthanorequal(r);
};

XBoolean.prototype.greaterthanorequal = function (r) {
	return this.number().greaterthanorequal(r);
};

XBoolean.true_ = new XBoolean(true);
XBoolean.false_ = new XBoolean(false);

// AVLTree ///////////////////////////////////////////////////////////////////

AVLTree.prototype = new Object();
AVLTree.prototype.constructor = AVLTree;
AVLTree.superclass = Object.prototype;

function AVLTree(n) {
	this.init(n);
}

AVLTree.prototype.init = function (n) {
	this.left = null;
	this.right = null;
	this.node = n;
	this.depth = 1;
};

AVLTree.prototype.balance = function () {
	const ldepth = this.left == null ? 0 : this.left.depth;
	const rdepth = this.right == null ? 0 : this.right.depth;

	if (ldepth > rdepth + 1) {
		// LR or LL rotation
		const lldepth = this.left.left == null ? 0 : this.left.left.depth;
		const lrdepth = this.left.right == null ? 0 : this.left.right.depth;

		if (lldepth < lrdepth) {
			// LR rotation consists of a RR rotation of the left child
			this.left.rotateRR();
			// plus a LL rotation of this node, which happens anyway
		}
		this.rotateLL();
	} else if (ldepth + 1 < rdepth) {
		// RR or RL rorarion
		const rrdepth = this.right.right == null ? 0 : this.right.right.depth;
		const rldepth = this.right.left == null ? 0 : this.right.left.depth;

		if (rldepth > rrdepth) {
			// RR rotation consists of a LL rotation of the right child
			this.right.rotateLL();
			// plus a RR rotation of this node, which happens anyway
		}
		this.rotateRR();
	}
};

AVLTree.prototype.rotateLL = function () {
	// the left side is too long => rotate from the left (_not_ leftwards)
	const nodeBefore = this.node;
	const rightBefore = this.right;
	this.node = this.left.node;
	this.right = this.left;
	this.left = this.left.left;
	this.right.left = this.right.right;
	this.right.right = rightBefore;
	this.right.node = nodeBefore;
	this.right.updateInNewLocation();
	this.updateInNewLocation();
};

AVLTree.prototype.rotateRR = function () {
	// the right side is too long => rotate from the right (_not_ rightwards)
	const nodeBefore = this.node;
	const leftBefore = this.left;
	this.node = this.right.node;
	this.left = this.right;
	this.right = this.right.right;
	this.left.right = this.left.left;
	this.left.left = leftBefore;
	this.left.node = nodeBefore;
	this.left.updateInNewLocation();
	this.updateInNewLocation();
};

AVLTree.prototype.updateInNewLocation = function () {
	this.getDepthFromChildren();
};

AVLTree.prototype.getDepthFromChildren = function () {
	this.depth = this.node == null ? 0 : 1;
	if (this.left != null) {
		this.depth = this.left.depth + 1;
	}
	if (this.right != null && this.depth <= this.right.depth) {
		this.depth = this.right.depth + 1;
	}
};

function nodeOrder(n1, n2) {
	if (n1 === n2) {
		return 0;
	}

	if (n1.compareDocumentPosition) {
		const cpos = n1.compareDocumentPosition(n2);

		if (cpos & 0x01) {
			// not in the same document; return an arbitrary result (is there a better way to do this)
			return 1;
		}
		if (cpos & 0x0a) {
			// n2 precedes or contains n1
			return 1;
		}
		if (cpos & 0x14) {
			// n2 follows or is contained by n1
			return -1;
		}

		return 0;
	}

	let d1 = 0,
		d2 = 0;
	for (let m1 = n1; m1 != null; m1 = m1.parentNode || m1.ownerElement) {
		d1++;
	}
	for (let m2 = n2; m2 != null; m2 = m2.parentNode || m2.ownerElement) {
		d2++;
	}

	// step up to same depth
	if (d1 > d2) {
		while (d1 > d2) {
			n1 = n1.parentNode || n1.ownerElement;
			d1--;
		}
		if (n1 === n2) {
			return 1;
		}
	} else if (d2 > d1) {
		while (d2 > d1) {
			n2 = n2.parentNode || n2.ownerElement;
			d2--;
		}
		if (n1 === n2) {
			return -1;
		}
	}

	let n1Par = n1.parentNode || n1.ownerElement,
		n2Par = n2.parentNode || n2.ownerElement;

	// find common parent
	while (n1Par !== n2Par) {
		n1 = n1Par;
		n2 = n2Par;
		n1Par = n1.parentNode || n1.ownerElement;
		n2Par = n2.parentNode || n2.ownerElement;
	}

	const n1isAttr = Utilities.isAttribute(n1);
	const n2isAttr = Utilities.isAttribute(n2);

	if (n1isAttr && !n2isAttr) {
		return -1;
	}
	if (!n1isAttr && n2isAttr) {
		return 1;
	}

	if (n1Par) {
		const cn = n1isAttr ? n1Par.attributes : n1Par.childNodes,
			len = cn.length;
		for (let i = 0; i < len; i += 1) {
			const n = cn[i];
			if (n === n1) {
				return -1;
			}
			if (n === n2) {
				return 1;
			}
		}
	}

	throw new Error("Unexpected: could not determine node order");
}

AVLTree.prototype.add = function (n) {
	if (n === this.node) {
		return false;
	}

	const o = nodeOrder(n, this.node);

	let ret = false;
	if (o == -1) {
		if (this.left == null) {
			this.left = new AVLTree(n);
			ret = true;
		} else {
			ret = this.left.add(n);
			if (ret) {
				this.balance();
			}
		}
	} else if (o == 1) {
		if (this.right == null) {
			this.right = new AVLTree(n);
			ret = true;
		} else {
			ret = this.right.add(n);
			if (ret) {
				this.balance();
			}
		}
	}

	if (ret) {
		this.getDepthFromChildren();
	}
	return ret;
};

// XNodeSet //////////////////////////////////////////////////////////////////

XNodeSet.prototype = new Expression();
XNodeSet.prototype.constructor = XNodeSet;
XNodeSet.superclass = Expression.prototype;

function XNodeSet() {
	this.init();
}

XNodeSet.prototype.init = function () {
	this.tree = null;
	this.nodes = [];
	this.size = 0;
};

XNodeSet.prototype.toString = function () {
	// See CHANGELOG.md (0.0.35)
	// const p = this.first();
	// if (p == null) {
	// 	return "";
	// }
	// return this.stringForNode(p);

	return this.nodes.map((node) => this.stringForNode(node)).join(" ");
};

XNodeSet.prototype.evaluate = function (c) {
	return this;
};

XNodeSet.prototype.string = function () {
	return new XString(this.toString());
};

XNodeSet.prototype.stringValue = function () {
	return this.toString();
};

XNodeSet.prototype.number = function () {
	return new XNumber(this.string());
};

XNodeSet.prototype.numberValue = function () {
	return Number(this.string());
};

XNodeSet.prototype.bool = function () {
	return new XBoolean(this.booleanValue());
};

XNodeSet.prototype.booleanValue = function () {
	return !!this.size;
};

XNodeSet.prototype.nodeset = function () {
	return this;
};

XNodeSet.prototype.stringForNode = function (n) {
	if (
		n.nodeType == 9 /*Node.DOCUMENT_NODE*/ ||
		n.nodeType == 1 /*Node.ELEMENT_NODE */ ||
		n.nodeType === 11 /*Node.DOCUMENT_FRAGMENT*/
	) {
		return this.stringForContainerNode(n);
	}
	if (n.nodeType === 2 /* Node.ATTRIBUTE_NODE */) {
		return n.value || n.nodeValue;
	}
	if (n.isNamespaceNode) {
		return n.namespace;
	}
	return n.nodeValue;
};

XNodeSet.prototype.stringForContainerNode = function (n) {
	let s = "";
	for (let n2 = n.firstChild; n2 != null; n2 = n2.nextSibling) {
		const nt = n2.nodeType;
		//  Element,    Text,       CDATA,      Document,   Document Fragment
		if (nt === 1 || nt === 3 || nt === 4 || nt === 9 || nt === 11) {
			s += this.stringForNode(n2);
		}
	}
	return s;
};

XNodeSet.prototype.buildTree = function () {
	if (!this.tree && this.nodes.length) {
		this.tree = new AVLTree(this.nodes[0]);
		for (let i = 1; i < this.nodes.length; i += 1) {
			this.tree.add(this.nodes[i]);
		}
	}

	return this.tree;
};

XNodeSet.prototype.first = function () {
	let p = this.buildTree();
	if (p == null) {
		return null;
	}
	while (p.left != null) {
		p = p.left;
	}
	return p.node;
};

XNodeSet.prototype.add = function (n) {
	for (let i = 0; i < this.nodes.length; i += 1) {
		if (n === this.nodes[i]) {
			return;
		}
	}

	this.tree = null;
	this.nodes.push(n);
	this.size += 1;
};

XNodeSet.prototype.addArray = function (ns) {
	const self = this;

	forEach(function (x) {
		self.add(x);
	}, ns);
};

/**
 * Returns an array of the node set's contents in document order
 */
XNodeSet.prototype.toArray = function () {
	const a = [];
	this.toArrayRec(this.buildTree(), a);
	return a;
};

XNodeSet.prototype.toArrayRec = function (t, a) {
	if (t != null) {
		this.toArrayRec(t.left, a);
		a.push(t.node);
		this.toArrayRec(t.right, a);
	}
};

/**
 * Returns an array of the node set's contents in arbitrary order
 */
XNodeSet.prototype.toUnsortedArray = function () {
	return this.nodes.slice();
};

XNodeSet.prototype.compareWithString = function (r, o) {
	const a = this.toUnsortedArray();
	for (let i = 0; i < a.length; i++) {
		const n = a[i];
		const l = new XString(this.stringForNode(n));
		const res = o(l, r);
		if (res.booleanValue()) {
			return res;
		}
	}
	return new XBoolean(false);
};

XNodeSet.prototype.compareWithNumber = function (r, o) {
	const a = this.toUnsortedArray();
	for (let i = 0; i < a.length; i++) {
		const n = a[i];
		const l = new XNumber(this.stringForNode(n));
		const res = o(l, r);
		if (res.booleanValue()) {
			return res;
		}
	}
	return new XBoolean(false);
};

XNodeSet.prototype.compareWithBoolean = function (r, o) {
	return o(this.bool(), r);
};

XNodeSet.prototype.compareWithNodeSet = function (r, o) {
	const arr = this.toUnsortedArray();
	const oInvert = function (lop, rop) {
		return o(rop, lop);
	};

	for (let i = 0; i < arr.length; i++) {
		const l = new XString(this.stringForNode(arr[i]));

		const res = r.compareWithString(l, oInvert);
		if (res.booleanValue()) {
			return res;
		}
	}

	return new XBoolean(false);
};

XNodeSet.compareWith = curry(function (o, r) {
	if (Utilities.instance_of(r, XString)) {
		return this.compareWithString(r, o);
	}
	if (Utilities.instance_of(r, XNumber)) {
		return this.compareWithNumber(r, o);
	}
	if (Utilities.instance_of(r, XBoolean)) {
		return this.compareWithBoolean(r, o);
	}
	return this.compareWithNodeSet(r, o);
});

XNodeSet.prototype.equals = XNodeSet.compareWith(Operators.equals);
XNodeSet.prototype.notequal = XNodeSet.compareWith(Operators.notequal);
XNodeSet.prototype.lessthan = XNodeSet.compareWith(Operators.lessthan);
XNodeSet.prototype.greaterthan = XNodeSet.compareWith(Operators.greaterthan);
XNodeSet.prototype.lessthanorequal = XNodeSet.compareWith(Operators.lessthanorequal);
XNodeSet.prototype.greaterthanorequal = XNodeSet.compareWith(Operators.greaterthanorequal);

XNodeSet.prototype.union = function (r) {
	const ns = new XNodeSet();
	ns.addArray(this.toUnsortedArray());
	ns.addArray(r.toUnsortedArray());
	return ns;
};

// XPathNamespace ////////////////////////////////////////////////////////////

XPathNamespace.prototype = new Object();
XPathNamespace.prototype.constructor = XPathNamespace;
XPathNamespace.superclass = Object.prototype;

function XPathNamespace(pre, ns, p) {
	this.isXPathNamespace = true;
	this.ownerDocument = p.ownerDocument;
	this.nodeName = "#namespace";
	this.prefix = pre;
	this.localName = pre;
	this.namespaceURI = ns;
	this.nodeValue = ns;
	this.ownerElement = p;
	this.nodeType = XPathNamespace.XPATH_NAMESPACE_NODE;
}

XPathNamespace.prototype.toString = function () {
	return `{ "${this.prefix}", "${this.namespaceURI}" }`;
};

// XPathContext //////////////////////////////////////////////////////////////

XPathContext.prototype = new Object();
XPathContext.prototype.constructor = XPathContext;
XPathContext.superclass = Object.prototype;

function XPathContext(vr, nr, fr) {
	this.variableResolver = vr != null ? vr : new VariableResolver();
	this.namespaceResolver = nr != null ? nr : new NamespaceResolver();
	this.functionResolver = fr != null ? fr : new FunctionResolver();
}

XPathContext.prototype.extend = function (newProps) {
	return assign(new XPathContext(), this, newProps);
};

// VariableResolver //////////////////////////////////////////////////////////

VariableResolver.prototype = new Object();
VariableResolver.prototype.constructor = VariableResolver;
VariableResolver.superclass = Object.prototype;

function VariableResolver() {}

VariableResolver.prototype.getVariable = function (ln, ns) {
	return null;
};

// FunctionResolver //////////////////////////////////////////////////////////

FunctionResolver.prototype = new Object();
FunctionResolver.prototype.constructor = FunctionResolver;
FunctionResolver.superclass = Object.prototype;

function FunctionResolver(thisArg) {
	this.thisArg = thisArg != null ? thisArg : Functions;
	this.functions = new Object();
	this.addStandardFunctions();
}

FunctionResolver.prototype.addStandardFunctions = function () {
	this.functions["{}last"] = Functions.last;
	this.functions["{}position"] = Functions.position;
	this.functions["{}count"] = Functions.count;
	this.functions["{}id"] = Functions.id;
	this.functions["{}local-name"] = Functions.localName;
	this.functions["{}namespace-uri"] = Functions.namespaceURI;
	this.functions["{}name"] = Functions.name;
	this.functions["{}string"] = Functions.string;
	this.functions["{}concat"] = Functions.concat;
	this.functions["{}starts-with"] = Functions.startsWith;
	this.functions["{}contains"] = Functions.contains;
	this.functions["{}substring-before"] = Functions.substringBefore;
	this.functions["{}substring-after"] = Functions.substringAfter;
	this.functions["{}substring"] = Functions.substring;
	this.functions["{}string-length"] = Functions.stringLength;
	this.functions["{}normalize-space"] = Functions.normalizeSpace;
	this.functions["{}translate"] = Functions.translate;
	this.functions["{}boolean"] = Functions.boolean_;
	this.functions["{}not"] = Functions.not;
	this.functions["{}true"] = Functions.true_;
	this.functions["{}false"] = Functions.false_;
	this.functions["{}lang"] = Functions.lang;
	this.functions["{}number"] = Functions.number;
	this.functions["{}sum"] = Functions.sum;
	this.functions["{}floor"] = Functions.floor;
	this.functions["{}ceiling"] = Functions.ceiling;
	this.functions["{}round"] = Functions.round;
};

FunctionResolver.prototype.addFunction = function (ns, ln, f) {
	this.functions[`{${ns}}${ln}`] = f;
};

FunctionResolver.getFunctionFromContext = function (qName, context) {
	const parts = Utilities.resolveQName(
		qName,
		context.namespaceResolver,
		context.contextNode,
		false
	);

	if (parts[0] === null) {
		throw new Error(`Cannot resolve QName ${name}`);
	}

	return context.functionResolver.getFunction(parts[1], parts[0]);
};

FunctionResolver.prototype.getFunction = function (localName, namespace) {
	return this.functions[`{${namespace}}${localName}`];
};

// NamespaceResolver /////////////////////////////////////////////////////////

NamespaceResolver.prototype = new Object();
NamespaceResolver.prototype.constructor = NamespaceResolver;
NamespaceResolver.superclass = Object.prototype;

function NamespaceResolver() {}

NamespaceResolver.prototype.getNamespace = function (prefix, n) {
	if (prefix == "xml") {
		return XPath.XML_NAMESPACE_URI;
	} else if (prefix == "xmlns") {
		return XPath.XMLNS_NAMESPACE_URI;
	}
	if (n.nodeType == 9 /*Node.DOCUMENT_NODE*/) {
		n = n.documentElement;
	} else if (n.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
		n = PathExpr.getOwnerElement(n);
	} else if (n.nodeType != 1 /*Node.ELEMENT_NODE*/) {
		n = n.parentNode;
	}
	while (n != null && n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
		const nnm = n.attributes;
		for (let i = 0; i < nnm.length; i++) {
			const a = nnm.item(i);
			const aname = a.name || a.nodeName;
			if ((aname === "xmlns" && prefix === "") || aname === `xmlns:${prefix}`) {
				return String(a.value || a.nodeValue);
			}
		}
		n = n.parentNode;
	}
	return null;
};

// Functions /////////////////////////////////////////////////////////////////

var Functions = new Object();

Functions.last = function (c) {
	if (arguments.length != 1) {
		throw new Error("Function last expects ()");
	}

	return new XNumber(c.contextSize);
};

Functions.position = function (c) {
	if (arguments.length != 1) {
		throw new Error("Function position expects ()");
	}

	return new XNumber(c.contextPosition);
};

Functions.count = function () {
	const c = arguments[0];
	let ns;
	if (arguments.length != 2 || !Utilities.instance_of((ns = arguments[1].evaluate(c)), XNodeSet)) {
		throw new Error("Function count expects (node-set)");
	}
	return new XNumber(ns.size);
};

Functions.id = function () {
	const c = arguments[0];
	let id;
	if (arguments.length != 2) {
		throw new Error("Function id expects (object)");
	}
	id = arguments[1].evaluate(c);
	if (Utilities.instance_of(id, XNodeSet)) {
		id = id.toArray().join(" ");
	} else {
		id = id.stringValue();
	}
	const ids = id.split(/[\x0d\x0a\x09\x20]+/);
	let count = 0;
	const ns = new XNodeSet();
	const doc =
		c.contextNode.nodeType == 9 /*Node.DOCUMENT_NODE*/
			? c.contextNode
			: c.contextNode.ownerDocument;
	for (let i = 0; i < ids.length; i++) {
		var n;
		if (doc.getElementById) {
			n = doc.getElementById(ids[i]);
		} else {
			n = Utilities.getElementById(doc, ids[i]);
		}
		if (n != null) {
			ns.add(n);
			count++;
		}
	}
	return ns;
};

Functions.localName = function (c, eNode) {
	let n;

	if (arguments.length == 1) {
		n = c.contextNode;
	} else if (arguments.length == 2) {
		n = eNode.evaluate(c).first();
	} else {
		throw new Error("Function local-name expects (node-set?)");
	}

	if (n == null) {
		return new XString("");
	}

	return new XString(
		n.localName || //  standard elements and attributes
			n.baseName || //  IE
			n.target || //  processing instructions
			n.nodeName || //  DOM1 elements
			"" //  fallback
	);
};

Functions.namespaceURI = function () {
	const c = arguments[0];
	let n;
	if (arguments.length == 1) {
		n = c.contextNode;
	} else if (arguments.length == 2) {
		n = arguments[1].evaluate(c).first();
	} else {
		throw new Error("Function namespace-uri expects (node-set?)");
	}
	if (n == null) {
		return new XString("");
	}
	return new XString(n.namespaceURI);
};

Functions.name = function () {
	const c = arguments[0];
	let n;
	if (arguments.length == 1) {
		n = c.contextNode;
	} else if (arguments.length == 2) {
		n = arguments[1].evaluate(c).first();
	} else {
		throw new Error("Function name expects (node-set?)");
	}
	if (n == null) {
		return new XString("");
	}
	if (n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
		return new XString(n.nodeName);
	} else if (n.nodeType == 2 /*Node.ATTRIBUTE_NODE*/) {
		return new XString(n.name || n.nodeName);
	} else if (n.nodeType === 7 /*Node.PROCESSING_INSTRUCTION_NODE*/) {
		return new XString(n.target || n.nodeName);
	} else if (n.localName == null) {
		return new XString("");
	} else {
		return new XString(n.localName);
	}
};

Functions.string = function () {
	const c = arguments[0];
	if (arguments.length == 1) {
		return new XString(XNodeSet.prototype.stringForNode(c.contextNode));
	} else if (arguments.length == 2) {
		return arguments[1].evaluate(c).string();
	}
	throw new Error("Function string expects (object?)");
};

Functions.concat = function (c) {
	if (arguments.length < 3) {
		throw new Error("Function concat expects (string, string[, string]*)");
	}
	let s = "";
	for (let i = 1; i < arguments.length; i++) {
		s += arguments[i].evaluate(c).stringValue();
	}
	return new XString(s);
};

Functions.startsWith = function () {
	const c = arguments[0];
	if (arguments.length != 3) {
		throw new Error("Function startsWith expects (string, string)");
	}
	const s1 = arguments[1].evaluate(c).stringValue();
	const s2 = arguments[2].evaluate(c).stringValue();
	return new XBoolean(s1.substring(0, s2.length) == s2);
};

Functions.contains = function () {
	const c = arguments[0];
	if (arguments.length != 3) {
		throw new Error("Function contains expects (string, string)");
	}
	const s1 = arguments[1].evaluate(c).stringValue();
	const s2 = arguments[2].evaluate(c).stringValue();
	return new XBoolean(s1.indexOf(s2) !== -1);
};

Functions.substringBefore = function () {
	const c = arguments[0];
	if (arguments.length != 3) {
		throw new Error("Function substring-before expects (string, string)");
	}
	const s1 = arguments[1].evaluate(c).stringValue();
	const s2 = arguments[2].evaluate(c).stringValue();
	return new XString(s1.substring(0, s1.indexOf(s2)));
};

Functions.substringAfter = function () {
	const c = arguments[0];
	if (arguments.length != 3) {
		throw new Error("Function substring-after expects (string, string)");
	}
	const s1 = arguments[1].evaluate(c).stringValue();
	const s2 = arguments[2].evaluate(c).stringValue();
	if (s2.length == 0) {
		return new XString(s1);
	}
	const i = s1.indexOf(s2);
	if (i == -1) {
		return new XString("");
	}
	return new XString(s1.substring(i + s2.length));
};

Functions.substring = function () {
	const c = arguments[0];
	if (!(arguments.length == 3 || arguments.length == 4)) {
		throw new Error("Function substring expects (string, number, number?)");
	}
	const s = arguments[1].evaluate(c).stringValue();
	const n1 = Math.round(arguments[2].evaluate(c).numberValue()) - 1;
	const n2 =
		arguments.length == 4 ? n1 + Math.round(arguments[3].evaluate(c).numberValue()) : undefined;
	return new XString(s.substring(n1, n2));
};

Functions.stringLength = function () {
	const c = arguments[0];
	let s;
	if (arguments.length == 1) {
		s = XNodeSet.prototype.stringForNode(c.contextNode);
	} else if (arguments.length == 2) {
		s = arguments[1].evaluate(c).stringValue();
	} else {
		throw new Error("Function string-length expects (string?)");
	}
	return new XNumber(s.length);
};

Functions.normalizeSpace = function () {
	const c = arguments[0];
	let s;
	if (arguments.length == 1) {
		s = XNodeSet.prototype.stringForNode(c.contextNode);
	} else if (arguments.length == 2) {
		s = arguments[1].evaluate(c).stringValue();
	} else {
		throw new Error("Function normalize-space expects (string?)");
	}
	let i = 0;
	let j = s.length - 1;
	while (Utilities.isSpace(s.charCodeAt(j))) {
		j--;
	}
	let t = "";
	while (i <= j && Utilities.isSpace(s.charCodeAt(i))) {
		i++;
	}
	while (i <= j) {
		if (Utilities.isSpace(s.charCodeAt(i))) {
			t += " ";
			while (i <= j && Utilities.isSpace(s.charCodeAt(i))) {
				i++;
			}
		} else {
			t += s.charAt(i);
			i++;
		}
	}
	return new XString(t);
};

Functions.translate = function (c, eValue, eFrom, eTo) {
	if (arguments.length != 4) {
		throw new Error("Function translate expects (string, string, string)");
	}

	const value = eValue.evaluate(c).stringValue();
	const from = eFrom.evaluate(c).stringValue();
	const to = eTo.evaluate(c).stringValue();

	const cMap = reduce(
		function (acc, ch, i) {
			if (!(ch in acc)) {
				acc[ch] = i > to.length ? "" : to[i];
			}
			return acc;
		},
		{},
		from
	);

	const t = join(
		"",
		map(function (ch) {
			return ch in cMap ? cMap[ch] : ch;
		}, value)
	);

	return new XString(t);
};

Functions.boolean_ = function () {
	const c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function boolean expects (object)");
	}
	return arguments[1].evaluate(c).bool();
};

Functions.not = function (c, eValue) {
	if (arguments.length != 2) {
		throw new Error("Function not expects (object)");
	}
	return eValue.evaluate(c).bool().not();
};

Functions.true_ = function () {
	if (arguments.length != 1) {
		throw new Error("Function true expects ()");
	}
	return XBoolean.true_;
};

Functions.false_ = function () {
	if (arguments.length != 1) {
		throw new Error("Function false expects ()");
	}
	return XBoolean.false_;
};

Functions.lang = function () {
	const c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function lang expects (string)");
	}
	let lang;
	for (
		let n = c.contextNode;
		n != null && n.nodeType != 9 /*Node.DOCUMENT_NODE*/;
		n = n.parentNode
	) {
		const a = n.getAttributeNS(XPath.XML_NAMESPACE_URI, "lang");
		if (a != null) {
			lang = String(a);
			break;
		}
	}
	if (lang == null) {
		return XBoolean.false_;
	}
	const s = arguments[1].evaluate(c).stringValue();
	return new XBoolean(
		lang.substring(0, s.length) == s && (lang.length == s.length || lang.charAt(s.length) == "-")
	);
};

Functions.number = function () {
	const c = arguments[0];
	if (!(arguments.length == 1 || arguments.length == 2)) {
		throw new Error("Function number expects (object?)");
	}
	if (arguments.length == 1) {
		return new XNumber(XNodeSet.prototype.stringForNode(c.contextNode));
	}
	return arguments[1].evaluate(c).number();
};

Functions.sum = function () {
	const c = arguments[0];
	let ns;
	if (arguments.length != 2 || !Utilities.instance_of((ns = arguments[1].evaluate(c)), XNodeSet)) {
		throw new Error("Function sum expects (node-set)");
	}
	ns = ns.toUnsortedArray();
	let n = 0;
	for (let i = 0; i < ns.length; i++) {
		n += new XNumber(XNodeSet.prototype.stringForNode(ns[i])).numberValue();
	}
	return new XNumber(n);
};

Functions.floor = function () {
	const c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function floor expects (number)");
	}
	return new XNumber(Math.floor(arguments[1].evaluate(c).numberValue()));
};

Functions.ceiling = function () {
	const c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function ceiling expects (number)");
	}
	return new XNumber(Math.ceil(arguments[1].evaluate(c).numberValue()));
};

Functions.round = function () {
	const c = arguments[0];
	if (arguments.length != 2) {
		throw new Error("Function round expects (number)");
	}
	return new XNumber(Math.round(arguments[1].evaluate(c).numberValue()));
};

// Utilities /////////////////////////////////////////////////////////////////

var Utilities = new Object();

Utilities.isAttribute = function (val) {
	return val && (val.nodeType === 2 || val.ownerElement);
};

Utilities.splitQName = function (qn) {
	const i = qn.indexOf(":");
	if (i == -1) {
		return [null, qn];
	}
	return [qn.substring(0, i), qn.substring(i + 1)];
};

Utilities.resolveQName = function (qn, nr, n, useDefault) {
	const parts = Utilities.splitQName(qn);
	if (parts[0] != null) {
		parts[0] = nr.getNamespace(parts[0], n);
	} else {
		if (useDefault) {
			parts[0] = nr.getNamespace("", n);
			if (parts[0] == null) {
				parts[0] = "";
			}
		} else {
			parts[0] = "";
		}
	}
	return parts;
};

Utilities.isSpace = function (c) {
	return c == 0x9 || c == 0xd || c == 0xa || c == 0x20;
};

Utilities.isLetter = function (c) {
	return (
		(c >= 0x0041 && c <= 0x005a) ||
		(c >= 0x0061 && c <= 0x007a) ||
		(c >= 0x00c0 && c <= 0x00d6) ||
		(c >= 0x00d8 && c <= 0x00f6) ||
		(c >= 0x00f8 && c <= 0x00ff) ||
		(c >= 0x0100 && c <= 0x0131) ||
		(c >= 0x0134 && c <= 0x013e) ||
		(c >= 0x0141 && c <= 0x0148) ||
		(c >= 0x014a && c <= 0x017e) ||
		(c >= 0x0180 && c <= 0x01c3) ||
		(c >= 0x01cd && c <= 0x01f0) ||
		(c >= 0x01f4 && c <= 0x01f5) ||
		(c >= 0x01fa && c <= 0x0217) ||
		(c >= 0x0250 && c <= 0x02a8) ||
		(c >= 0x02bb && c <= 0x02c1) ||
		c == 0x0386 ||
		(c >= 0x0388 && c <= 0x038a) ||
		c == 0x038c ||
		(c >= 0x038e && c <= 0x03a1) ||
		(c >= 0x03a3 && c <= 0x03ce) ||
		(c >= 0x03d0 && c <= 0x03d6) ||
		c == 0x03da ||
		c == 0x03dc ||
		c == 0x03de ||
		c == 0x03e0 ||
		(c >= 0x03e2 && c <= 0x03f3) ||
		(c >= 0x0401 && c <= 0x040c) ||
		(c >= 0x040e && c <= 0x044f) ||
		(c >= 0x0451 && c <= 0x045c) ||
		(c >= 0x045e && c <= 0x0481) ||
		(c >= 0x0490 && c <= 0x04c4) ||
		(c >= 0x04c7 && c <= 0x04c8) ||
		(c >= 0x04cb && c <= 0x04cc) ||
		(c >= 0x04d0 && c <= 0x04eb) ||
		(c >= 0x04ee && c <= 0x04f5) ||
		(c >= 0x04f8 && c <= 0x04f9) ||
		(c >= 0x0531 && c <= 0x0556) ||
		c == 0x0559 ||
		(c >= 0x0561 && c <= 0x0586) ||
		(c >= 0x05d0 && c <= 0x05ea) ||
		(c >= 0x05f0 && c <= 0x05f2) ||
		(c >= 0x0621 && c <= 0x063a) ||
		(c >= 0x0641 && c <= 0x064a) ||
		(c >= 0x0671 && c <= 0x06b7) ||
		(c >= 0x06ba && c <= 0x06be) ||
		(c >= 0x06c0 && c <= 0x06ce) ||
		(c >= 0x06d0 && c <= 0x06d3) ||
		c == 0x06d5 ||
		(c >= 0x06e5 && c <= 0x06e6) ||
		(c >= 0x0905 && c <= 0x0939) ||
		c == 0x093d ||
		(c >= 0x0958 && c <= 0x0961) ||
		(c >= 0x0985 && c <= 0x098c) ||
		(c >= 0x098f && c <= 0x0990) ||
		(c >= 0x0993 && c <= 0x09a8) ||
		(c >= 0x09aa && c <= 0x09b0) ||
		c == 0x09b2 ||
		(c >= 0x09b6 && c <= 0x09b9) ||
		(c >= 0x09dc && c <= 0x09dd) ||
		(c >= 0x09df && c <= 0x09e1) ||
		(c >= 0x09f0 && c <= 0x09f1) ||
		(c >= 0x0a05 && c <= 0x0a0a) ||
		(c >= 0x0a0f && c <= 0x0a10) ||
		(c >= 0x0a13 && c <= 0x0a28) ||
		(c >= 0x0a2a && c <= 0x0a30) ||
		(c >= 0x0a32 && c <= 0x0a33) ||
		(c >= 0x0a35 && c <= 0x0a36) ||
		(c >= 0x0a38 && c <= 0x0a39) ||
		(c >= 0x0a59 && c <= 0x0a5c) ||
		c == 0x0a5e ||
		(c >= 0x0a72 && c <= 0x0a74) ||
		(c >= 0x0a85 && c <= 0x0a8b) ||
		c == 0x0a8d ||
		(c >= 0x0a8f && c <= 0x0a91) ||
		(c >= 0x0a93 && c <= 0x0aa8) ||
		(c >= 0x0aaa && c <= 0x0ab0) ||
		(c >= 0x0ab2 && c <= 0x0ab3) ||
		(c >= 0x0ab5 && c <= 0x0ab9) ||
		c == 0x0abd ||
		c == 0x0ae0 ||
		(c >= 0x0b05 && c <= 0x0b0c) ||
		(c >= 0x0b0f && c <= 0x0b10) ||
		(c >= 0x0b13 && c <= 0x0b28) ||
		(c >= 0x0b2a && c <= 0x0b30) ||
		(c >= 0x0b32 && c <= 0x0b33) ||
		(c >= 0x0b36 && c <= 0x0b39) ||
		c == 0x0b3d ||
		(c >= 0x0b5c && c <= 0x0b5d) ||
		(c >= 0x0b5f && c <= 0x0b61) ||
		(c >= 0x0b85 && c <= 0x0b8a) ||
		(c >= 0x0b8e && c <= 0x0b90) ||
		(c >= 0x0b92 && c <= 0x0b95) ||
		(c >= 0x0b99 && c <= 0x0b9a) ||
		c == 0x0b9c ||
		(c >= 0x0b9e && c <= 0x0b9f) ||
		(c >= 0x0ba3 && c <= 0x0ba4) ||
		(c >= 0x0ba8 && c <= 0x0baa) ||
		(c >= 0x0bae && c <= 0x0bb5) ||
		(c >= 0x0bb7 && c <= 0x0bb9) ||
		(c >= 0x0c05 && c <= 0x0c0c) ||
		(c >= 0x0c0e && c <= 0x0c10) ||
		(c >= 0x0c12 && c <= 0x0c28) ||
		(c >= 0x0c2a && c <= 0x0c33) ||
		(c >= 0x0c35 && c <= 0x0c39) ||
		(c >= 0x0c60 && c <= 0x0c61) ||
		(c >= 0x0c85 && c <= 0x0c8c) ||
		(c >= 0x0c8e && c <= 0x0c90) ||
		(c >= 0x0c92 && c <= 0x0ca8) ||
		(c >= 0x0caa && c <= 0x0cb3) ||
		(c >= 0x0cb5 && c <= 0x0cb9) ||
		c == 0x0cde ||
		(c >= 0x0ce0 && c <= 0x0ce1) ||
		(c >= 0x0d05 && c <= 0x0d0c) ||
		(c >= 0x0d0e && c <= 0x0d10) ||
		(c >= 0x0d12 && c <= 0x0d28) ||
		(c >= 0x0d2a && c <= 0x0d39) ||
		(c >= 0x0d60 && c <= 0x0d61) ||
		(c >= 0x0e01 && c <= 0x0e2e) ||
		c == 0x0e30 ||
		(c >= 0x0e32 && c <= 0x0e33) ||
		(c >= 0x0e40 && c <= 0x0e45) ||
		(c >= 0x0e81 && c <= 0x0e82) ||
		c == 0x0e84 ||
		(c >= 0x0e87 && c <= 0x0e88) ||
		c == 0x0e8a ||
		c == 0x0e8d ||
		(c >= 0x0e94 && c <= 0x0e97) ||
		(c >= 0x0e99 && c <= 0x0e9f) ||
		(c >= 0x0ea1 && c <= 0x0ea3) ||
		c == 0x0ea5 ||
		c == 0x0ea7 ||
		(c >= 0x0eaa && c <= 0x0eab) ||
		(c >= 0x0ead && c <= 0x0eae) ||
		c == 0x0eb0 ||
		(c >= 0x0eb2 && c <= 0x0eb3) ||
		c == 0x0ebd ||
		(c >= 0x0ec0 && c <= 0x0ec4) ||
		(c >= 0x0f40 && c <= 0x0f47) ||
		(c >= 0x0f49 && c <= 0x0f69) ||
		(c >= 0x10a0 && c <= 0x10c5) ||
		(c >= 0x10d0 && c <= 0x10f6) ||
		c == 0x1100 ||
		(c >= 0x1102 && c <= 0x1103) ||
		(c >= 0x1105 && c <= 0x1107) ||
		c == 0x1109 ||
		(c >= 0x110b && c <= 0x110c) ||
		(c >= 0x110e && c <= 0x1112) ||
		c == 0x113c ||
		c == 0x113e ||
		c == 0x1140 ||
		c == 0x114c ||
		c == 0x114e ||
		c == 0x1150 ||
		(c >= 0x1154 && c <= 0x1155) ||
		c == 0x1159 ||
		(c >= 0x115f && c <= 0x1161) ||
		c == 0x1163 ||
		c == 0x1165 ||
		c == 0x1167 ||
		c == 0x1169 ||
		(c >= 0x116d && c <= 0x116e) ||
		(c >= 0x1172 && c <= 0x1173) ||
		c == 0x1175 ||
		c == 0x119e ||
		c == 0x11a8 ||
		c == 0x11ab ||
		(c >= 0x11ae && c <= 0x11af) ||
		(c >= 0x11b7 && c <= 0x11b8) ||
		c == 0x11ba ||
		(c >= 0x11bc && c <= 0x11c2) ||
		c == 0x11eb ||
		c == 0x11f0 ||
		c == 0x11f9 ||
		(c >= 0x1e00 && c <= 0x1e9b) ||
		(c >= 0x1ea0 && c <= 0x1ef9) ||
		(c >= 0x1f00 && c <= 0x1f15) ||
		(c >= 0x1f18 && c <= 0x1f1d) ||
		(c >= 0x1f20 && c <= 0x1f45) ||
		(c >= 0x1f48 && c <= 0x1f4d) ||
		(c >= 0x1f50 && c <= 0x1f57) ||
		c == 0x1f59 ||
		c == 0x1f5b ||
		c == 0x1f5d ||
		(c >= 0x1f5f && c <= 0x1f7d) ||
		(c >= 0x1f80 && c <= 0x1fb4) ||
		(c >= 0x1fb6 && c <= 0x1fbc) ||
		c == 0x1fbe ||
		(c >= 0x1fc2 && c <= 0x1fc4) ||
		(c >= 0x1fc6 && c <= 0x1fcc) ||
		(c >= 0x1fd0 && c <= 0x1fd3) ||
		(c >= 0x1fd6 && c <= 0x1fdb) ||
		(c >= 0x1fe0 && c <= 0x1fec) ||
		(c >= 0x1ff2 && c <= 0x1ff4) ||
		(c >= 0x1ff6 && c <= 0x1ffc) ||
		c == 0x2126 ||
		(c >= 0x212a && c <= 0x212b) ||
		c == 0x212e ||
		(c >= 0x2180 && c <= 0x2182) ||
		(c >= 0x3041 && c <= 0x3094) ||
		(c >= 0x30a1 && c <= 0x30fa) ||
		(c >= 0x3105 && c <= 0x312c) ||
		(c >= 0xac00 && c <= 0xd7a3) ||
		(c >= 0x4e00 && c <= 0x9fa5) ||
		c == 0x3007 ||
		(c >= 0x3021 && c <= 0x3029)
	);
};

Utilities.isNCNameChar = function (c) {
	return (
		(c >= 0x0030 && c <= 0x0039) ||
		(c >= 0x0660 && c <= 0x0669) ||
		(c >= 0x06f0 && c <= 0x06f9) ||
		(c >= 0x0966 && c <= 0x096f) ||
		(c >= 0x09e6 && c <= 0x09ef) ||
		(c >= 0x0a66 && c <= 0x0a6f) ||
		(c >= 0x0ae6 && c <= 0x0aef) ||
		(c >= 0x0b66 && c <= 0x0b6f) ||
		(c >= 0x0be7 && c <= 0x0bef) ||
		(c >= 0x0c66 && c <= 0x0c6f) ||
		(c >= 0x0ce6 && c <= 0x0cef) ||
		(c >= 0x0d66 && c <= 0x0d6f) ||
		(c >= 0x0e50 && c <= 0x0e59) ||
		(c >= 0x0ed0 && c <= 0x0ed9) ||
		(c >= 0x0f20 && c <= 0x0f29) ||
		c == 0x002e ||
		c == 0x002d ||
		c == 0x005f ||
		Utilities.isLetter(c) ||
		(c >= 0x0300 && c <= 0x0345) ||
		(c >= 0x0360 && c <= 0x0361) ||
		(c >= 0x0483 && c <= 0x0486) ||
		(c >= 0x0591 && c <= 0x05a1) ||
		(c >= 0x05a3 && c <= 0x05b9) ||
		(c >= 0x05bb && c <= 0x05bd) ||
		c == 0x05bf ||
		(c >= 0x05c1 && c <= 0x05c2) ||
		c == 0x05c4 ||
		(c >= 0x064b && c <= 0x0652) ||
		c == 0x0670 ||
		(c >= 0x06d6 && c <= 0x06dc) ||
		(c >= 0x06dd && c <= 0x06df) ||
		(c >= 0x06e0 && c <= 0x06e4) ||
		(c >= 0x06e7 && c <= 0x06e8) ||
		(c >= 0x06ea && c <= 0x06ed) ||
		(c >= 0x0901 && c <= 0x0903) ||
		c == 0x093c ||
		(c >= 0x093e && c <= 0x094c) ||
		c == 0x094d ||
		(c >= 0x0951 && c <= 0x0954) ||
		(c >= 0x0962 && c <= 0x0963) ||
		(c >= 0x0981 && c <= 0x0983) ||
		c == 0x09bc ||
		c == 0x09be ||
		c == 0x09bf ||
		(c >= 0x09c0 && c <= 0x09c4) ||
		(c >= 0x09c7 && c <= 0x09c8) ||
		(c >= 0x09cb && c <= 0x09cd) ||
		c == 0x09d7 ||
		(c >= 0x09e2 && c <= 0x09e3) ||
		c == 0x0a02 ||
		c == 0x0a3c ||
		c == 0x0a3e ||
		c == 0x0a3f ||
		(c >= 0x0a40 && c <= 0x0a42) ||
		(c >= 0x0a47 && c <= 0x0a48) ||
		(c >= 0x0a4b && c <= 0x0a4d) ||
		(c >= 0x0a70 && c <= 0x0a71) ||
		(c >= 0x0a81 && c <= 0x0a83) ||
		c == 0x0abc ||
		(c >= 0x0abe && c <= 0x0ac5) ||
		(c >= 0x0ac7 && c <= 0x0ac9) ||
		(c >= 0x0acb && c <= 0x0acd) ||
		(c >= 0x0b01 && c <= 0x0b03) ||
		c == 0x0b3c ||
		(c >= 0x0b3e && c <= 0x0b43) ||
		(c >= 0x0b47 && c <= 0x0b48) ||
		(c >= 0x0b4b && c <= 0x0b4d) ||
		(c >= 0x0b56 && c <= 0x0b57) ||
		(c >= 0x0b82 && c <= 0x0b83) ||
		(c >= 0x0bbe && c <= 0x0bc2) ||
		(c >= 0x0bc6 && c <= 0x0bc8) ||
		(c >= 0x0bca && c <= 0x0bcd) ||
		c == 0x0bd7 ||
		(c >= 0x0c01 && c <= 0x0c03) ||
		(c >= 0x0c3e && c <= 0x0c44) ||
		(c >= 0x0c46 && c <= 0x0c48) ||
		(c >= 0x0c4a && c <= 0x0c4d) ||
		(c >= 0x0c55 && c <= 0x0c56) ||
		(c >= 0x0c82 && c <= 0x0c83) ||
		(c >= 0x0cbe && c <= 0x0cc4) ||
		(c >= 0x0cc6 && c <= 0x0cc8) ||
		(c >= 0x0cca && c <= 0x0ccd) ||
		(c >= 0x0cd5 && c <= 0x0cd6) ||
		(c >= 0x0d02 && c <= 0x0d03) ||
		(c >= 0x0d3e && c <= 0x0d43) ||
		(c >= 0x0d46 && c <= 0x0d48) ||
		(c >= 0x0d4a && c <= 0x0d4d) ||
		c == 0x0d57 ||
		c == 0x0e31 ||
		(c >= 0x0e34 && c <= 0x0e3a) ||
		(c >= 0x0e47 && c <= 0x0e4e) ||
		c == 0x0eb1 ||
		(c >= 0x0eb4 && c <= 0x0eb9) ||
		(c >= 0x0ebb && c <= 0x0ebc) ||
		(c >= 0x0ec8 && c <= 0x0ecd) ||
		(c >= 0x0f18 && c <= 0x0f19) ||
		c == 0x0f35 ||
		c == 0x0f37 ||
		c == 0x0f39 ||
		c == 0x0f3e ||
		c == 0x0f3f ||
		(c >= 0x0f71 && c <= 0x0f84) ||
		(c >= 0x0f86 && c <= 0x0f8b) ||
		(c >= 0x0f90 && c <= 0x0f95) ||
		c == 0x0f97 ||
		(c >= 0x0f99 && c <= 0x0fad) ||
		(c >= 0x0fb1 && c <= 0x0fb7) ||
		c == 0x0fb9 ||
		(c >= 0x20d0 && c <= 0x20dc) ||
		c == 0x20e1 ||
		(c >= 0x302a && c <= 0x302f) ||
		c == 0x3099 ||
		c == 0x309a ||
		c == 0x00b7 ||
		c == 0x02d0 ||
		c == 0x02d1 ||
		c == 0x0387 ||
		c == 0x0640 ||
		c == 0x0e46 ||
		c == 0x0ec6 ||
		c == 0x3005 ||
		(c >= 0x3031 && c <= 0x3035) ||
		(c >= 0x309d && c <= 0x309e) ||
		(c >= 0x30fc && c <= 0x30fe)
	);
};

Utilities.coalesceText = function (n) {
	for (let m = n.firstChild; m != null; m = m.nextSibling) {
		if (m.nodeType == 3 /*Node.TEXT_NODE*/ || m.nodeType == 4 /*Node.CDATA_SECTION_NODE*/) {
			let s = m.nodeValue;
			const first = m;
			m = m.nextSibling;
			while (
				m != null &&
				(m.nodeType == 3 /*Node.TEXT_NODE*/ || m.nodeType == 4) /*Node.CDATA_SECTION_NODE*/
			) {
				s += m.nodeValue;
				const del = m;
				m = m.nextSibling;
				del.parentNode.removeChild(del);
			}
			if (first.nodeType == 4 /*Node.CDATA_SECTION_NODE*/) {
				const p = first.parentNode;
				if (first.nextSibling == null) {
					p.removeChild(first);
					p.appendChild(p.ownerDocument.createTextNode(s));
				} else {
					const next = first.nextSibling;
					p.removeChild(first);
					p.insertBefore(p.ownerDocument.createTextNode(s), next);
				}
			} else {
				first.nodeValue = s;
			}
			if (m == null) {
				break;
			}
		} else if (m.nodeType == 1 /*Node.ELEMENT_NODE*/) {
			Utilities.coalesceText(m);
		}
	}
};

Utilities.instance_of = function (o, c) {
	while (o != null) {
		if (o.constructor === c) {
			return true;
		}
		if (o === Object) {
			return false;
		}
		o = o.constructor.superclass;
	}
	return false;
};

Utilities.getElementById = function (n, id) {
	// Note that this does not check the DTD to check for actual
	// attributes of type ID, so this may be a bit wrong.
	if (n.nodeType == 1 /*Node.ELEMENT_NODE*/) {
		if (n.getAttribute("id") == id || n.getAttributeNS(null, "id") == id) {
			return n;
		}
	}
	for (let m = n.firstChild; m != null; m = m.nextSibling) {
		const res = Utilities.getElementById(m, id);
		if (res != null) {
			return res;
		}
	}
	return null;
};

// XPathException ////////////////////////////////////////////////////////////

var XPathException = (function () {
	function getMessage(code, exception) {
		const msg = exception ? `: ${exception.toString()}` : "";
		switch (code) {
			case XPathException.INVALID_EXPRESSION_ERR:
				return `Invalid expression${msg}`;
			case XPathException.TYPE_ERR:
				return `Type error${msg}`;
		}
		return null;
	}

	function XPathException(code, error, message) {
		const err = Error.call(this, getMessage(code, error) || message);

		err.code = code;
		err.exception = error;

		return err;
	}

	XPathException.prototype = Object.create(Error.prototype);
	XPathException.prototype.constructor = XPathException;
	XPathException.superclass = Error;

	XPathException.prototype.toString = function () {
		return this.message;
	};

	XPathException.fromMessage = function (message, error) {
		return new XPathException(null, error, message);
	};

	XPathException.INVALID_EXPRESSION_ERR = 51;
	XPathException.TYPE_ERR = 52;

	return XPathException;
})();

// XPathExpression ///////////////////////////////////////////////////////////

XPathExpression.prototype = {};
XPathExpression.prototype.constructor = XPathExpression;
XPathExpression.superclass = Object.prototype;

function XPathExpression(e, r, p) {
	this.xpath = p.parse(e);
	this.context = new XPathContext();
	this.context.namespaceResolver = new XPathNSResolverWrapper(r);
}

XPathExpression.getOwnerDocument = function (n) {
	return n.nodeType === 9 /*Node.DOCUMENT_NODE*/ ? n : n.ownerDocument;
};

XPathExpression.detectHtmlDom = function (n) {
	if (!n) {
		return false;
	}

	const doc = XPathExpression.getOwnerDocument(n);

	try {
		return doc.implementation.hasFeature("HTML", "2.0");
	} catch (e) {
		return true;
	}
};

XPathExpression.prototype.evaluate = function (n, t, res) {
	this.context.expressionContextNode = n;
	// backward compatibility - no reliable way to detect whether the DOM is HTML, but
	// this library has been using this method up until now, so we will continue to use it
	// ONLY when using an XPathExpression
	this.context.caseInsensitive = XPathExpression.detectHtmlDom(n);

	const result = this.xpath.evaluate(this.context);
	return new XPathResult(result, t);
};

// XPathNSResolverWrapper ////////////////////////////////////////////////////

XPathNSResolverWrapper.prototype = {};
XPathNSResolverWrapper.prototype.constructor = XPathNSResolverWrapper;
XPathNSResolverWrapper.superclass = Object.prototype;

function XPathNSResolverWrapper(r) {
	this.xpathNSResolver = r;
}

XPathNSResolverWrapper.prototype.getNamespace = function (prefix, n) {
	if (this.xpathNSResolver == null) {
		return null;
	}
	return this.xpathNSResolver.lookupNamespaceURI(prefix);
};

// NodeXPathNSResolver ///////////////////////////////////////////////////////

NodeXPathNSResolver.prototype = {};
NodeXPathNSResolver.prototype.constructor = NodeXPathNSResolver;
NodeXPathNSResolver.superclass = Object.prototype;

function NodeXPathNSResolver(n) {
	this.node = n;
	this.namespaceResolver = new NamespaceResolver();
}

NodeXPathNSResolver.prototype.lookupNamespaceURI = function (prefix) {
	return this.namespaceResolver.getNamespace(prefix, this.node);
};

// XPathResult ///////////////////////////////////////////////////////////////

XPathResult.prototype = {};
XPathResult.prototype.constructor = XPathResult;
XPathResult.superclass = Object.prototype;

function XPathResult(v, t) {
	if (t == XPathResult.ANY_TYPE) {
		if (v.constructor === XString) {
			t = XPathResult.STRING_TYPE;
		} else if (v.constructor === XNumber) {
			t = XPathResult.NUMBER_TYPE;
		} else if (v.constructor === XBoolean) {
			t = XPathResult.BOOLEAN_TYPE;
		} else if (v.constructor === XNodeSet) {
			t = XPathResult.UNORDERED_NODE_ITERATOR_TYPE;
		}
	}
	this.resultType = t;
	switch (t) {
		case XPathResult.NUMBER_TYPE:
			this.numberValue = v.numberValue();
			return;
		case XPathResult.STRING_TYPE:
			this.stringValue = v.stringValue();
			return;
		case XPathResult.BOOLEAN_TYPE:
			this.booleanValue = v.booleanValue();
			return;
		case XPathResult.ANY_UNORDERED_NODE_TYPE:
		case XPathResult.FIRST_ORDERED_NODE_TYPE:
			if (v.constructor === XNodeSet) {
				this.singleNodeValue = v.first();
				return;
			}
			break;
		case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
		case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
			if (v.constructor === XNodeSet) {
				this.invalidIteratorState = false;
				this.nodes = v.toArray();
				this.iteratorIndex = 0;
				return;
			}
			break;
		case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
		case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
			if (v.constructor === XNodeSet) {
				this.nodes = v.toArray();
				this.snapshotLength = this.nodes.length;
				return;
			}
			break;
	}
	throw new XPathException(XPathException.TYPE_ERR);
}

XPathResult.prototype.iterateNext = function () {
	if (
		this.resultType != XPathResult.UNORDERED_NODE_ITERATOR_TYPE &&
		this.resultType != XPathResult.ORDERED_NODE_ITERATOR_TYPE
	) {
		throw new XPathException(XPathException.TYPE_ERR);
	}
	return this.nodes[this.iteratorIndex++];
};

XPathResult.prototype.snapshotItem = function (i) {
	if (
		this.resultType != XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE &&
		this.resultType != XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
	) {
		throw new XPathException(XPathException.TYPE_ERR);
	}
	return this.nodes[i];
};

XPathResult.ANY_TYPE = 0;
XPathResult.NUMBER_TYPE = 1;
XPathResult.STRING_TYPE = 2;
XPathResult.BOOLEAN_TYPE = 3;
XPathResult.UNORDERED_NODE_ITERATOR_TYPE = 4;
XPathResult.ORDERED_NODE_ITERATOR_TYPE = 5;
XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE = 6;
XPathResult.ORDERED_NODE_SNAPSHOT_TYPE = 7;
XPathResult.ANY_UNORDERED_NODE_TYPE = 8;
XPathResult.FIRST_ORDERED_NODE_TYPE = 9;

// DOM 3 XPath support ///////////////////////////////////////////////////////

function installDOM3XPathSupport(doc, p) {
	doc.createExpression = function (e, r) {
		try {
			return new XPathExpression(e, r, p);
		} catch (e) {
			throw new XPathException(XPathException.INVALID_EXPRESSION_ERR, e);
		}
	};
	doc.createNSResolver = function (n) {
		return new NodeXPathNSResolver(n);
	};
	doc.evaluate = function (e, cn, r, t, res) {
		if (t < 0 || t > 9) {
			throw {
				code: 0,
				toString() {
					return "Request type not supported";
				},
			};
		}
		return doc.createExpression(e, r, p).evaluate(cn, t, res);
	};
}

// ---------------------------------------------------------------------------

// Install DOM 3 XPath support for the current document.
try {
	let shouldInstall = true;
	try {
		if (
			document.implementation &&
			document.implementation.hasFeature &&
			document.implementation.hasFeature("XPath", null)
		) {
			shouldInstall = false;
		}
	} catch (e) {}
	if (shouldInstall) {
		installDOM3XPathSupport(document, new XPathParser());
	}
} catch (e) {}

export default new XPathParser();

export const parse = (function () {
	const parser = new XPathParser();

	const defaultNSResolver = new NamespaceResolver();
	const defaultFunctionResolver = new FunctionResolver();
	const defaultVariableResolver = new VariableResolver();

	function makeNSResolverFromFunction(func) {
		return {
			getNamespace(prefix, node) {
				const ns = func(prefix, node);

				return ns || defaultNSResolver.getNamespace(prefix, node);
			},
		};
	}

	function makeNSResolverFromObject(obj) {
		return makeNSResolverFromFunction(obj.getNamespace.bind(obj));
	}

	function makeNSResolverFromMap(map) {
		return makeNSResolverFromFunction(function (prefix) {
			return map[prefix];
		});
	}

	function makeNSResolver(resolver) {
		if (resolver && typeof resolver.getNamespace === "function") {
			return makeNSResolverFromObject(resolver);
		}

		if (typeof resolver === "function") {
			return makeNSResolverFromFunction(resolver);
		}

		// assume prefix -> uri mapping
		if (typeof resolver === "object") {
			return makeNSResolverFromMap(resolver);
		}

		return defaultNSResolver;
	}

	/** Converts native JavaScript types to their XPath library equivalent */
	function convertValue(value) {
		if (
			value === null ||
			typeof value === "undefined" ||
			value instanceof XString ||
			value instanceof XBoolean ||
			value instanceof XNumber ||
			value instanceof XNodeSet
		) {
			return value;
		}

		switch (typeof value) {
			case "string":
				return new XString(value);
			case "boolean":
				return new XBoolean(value);
			case "number":
				return new XNumber(value);
		}

		// assume node(s)
		const ns = new XNodeSet();
		ns.addArray([].concat(value));
		return ns;
	}

	function makeEvaluator(func) {
		return function (context) {
			const args = Array.prototype.slice.call(arguments, 1).map(function (arg) {
				return arg.evaluate(context);
			});
			const result = func.apply(this, [].concat(context, args));
			return convertValue(result);
		};
	}

	function makeFunctionResolverFromFunction(func) {
		return {
			getFunction(name, namespace) {
				const found = func(name, namespace);
				if (found) {
					return makeEvaluator(found);
				}
				return defaultFunctionResolver.getFunction(name, namespace);
			},
		};
	}

	function makeFunctionResolverFromObject(obj) {
		return makeFunctionResolverFromFunction(obj.getFunction.bind(obj));
	}

	function makeFunctionResolverFromMap(map) {
		return makeFunctionResolverFromFunction(function (name) {
			return map[name];
		});
	}

	function makeFunctionResolver(resolver) {
		if (resolver && typeof resolver.getFunction === "function") {
			return makeFunctionResolverFromObject(resolver);
		}

		if (typeof resolver === "function") {
			return makeFunctionResolverFromFunction(resolver);
		}

		// assume map
		if (typeof resolver === "object") {
			return makeFunctionResolverFromMap(resolver);
		}

		return defaultFunctionResolver;
	}

	function makeVariableResolverFromFunction(func) {
		return {
			getVariable(name, namespace) {
				const value = func(name, namespace);
				return convertValue(value);
			},
		};
	}

	function makeVariableResolver(resolver) {
		if (resolver) {
			if (typeof resolver.getVariable === "function") {
				return makeVariableResolverFromFunction(resolver.getVariable.bind(resolver));
			}

			if (typeof resolver === "function") {
				return makeVariableResolverFromFunction(resolver);
			}

			// assume map
			if (typeof resolver === "object") {
				return makeVariableResolverFromFunction(function (name) {
					return resolver[name];
				});
			}
		}

		return defaultVariableResolver;
	}

	function copyIfPresent(prop, dest, source) {
		if (prop in source) {
			dest[prop] = source[prop];
		}
	}

	function makeContext(options) {
		const context = new XPathContext();

		if (options) {
			context.namespaceResolver = makeNSResolver(options.namespaces);
			context.functionResolver = makeFunctionResolver(options.functions);
			context.variableResolver = makeVariableResolver(options.variables);
			context.expressionContextNode = options.node;
			copyIfPresent("allowAnyNamespaceForNoPrefix", context, options);
			copyIfPresent("isHtml", context, options);
		} else {
			context.namespaceResolver = defaultNSResolver;
		}

		return context;
	}

	function evaluate(parsedExpression, options) {
		const context = makeContext(options);

		return parsedExpression.evaluate(context);
	}

	const evaluatorPrototype = {
		evaluate(options) {
			return evaluate(this.expression, options);
		},

		evaluateNumber(options) {
			return this.evaluate(options).numberValue();
		},

		evaluateString(options) {
			return this.evaluate(options).stringValue();
		},

		evaluateBoolean(options) {
			return this.evaluate(options).booleanValue();
		},

		evaluateNodeSet(options) {
			return this.evaluate(options).nodeset();
		},

		select(options) {
			return this.evaluateNodeSet(options).toArray();
		},

		select1(options) {
			return this.select(options)[0];
		},
	};

	return function parse(xpath) {
		const parsed = parser.parse(xpath);

		return Object.create(evaluatorPrototype, {
			expression: {
				value: parsed,
			},
		});
	};
})();

export {
	XPath,
	XPathParser,
	XPathResult,
	Step,
	PathExpr,
	NodeTest,
	LocationPath,
	OrOperation,
	AndOperation,
	BarOperation,
	EqualsOperation,
	NotEqualOperation,
	LessThanOperation,
	GreaterThanOperation,
	LessThanOrEqualOperation,
	GreaterThanOrEqualOperation,
	PlusOperation,
	MinusOperation,
	MultiplyOperation,
	DivOperation,
	ModOperation,
	UnaryMinusOperation,
	FunctionCall,
	VariableReference,
	XPathContext,
	XNodeSet,
	XBoolean,
	XString,
	XNumber,
	NamespaceResolver,
	FunctionResolver,
	VariableResolver,
	Utilities,
};

// helper
export function select(e, doc, single) {
	return selectWithResolver(e, doc, null, single);
}

export function useNamespaces(mappings) {
	const resolver = {
		mappings: mappings || {},
		lookupNamespaceURI(prefix) {
			return this.mappings[prefix];
		},
	};

	return function (e, doc, single) {
		return selectWithResolver(e, doc, resolver, single);
	};
}

export function selectWithResolver(e, doc, resolver, single) {
	const expression = new XPathExpression(e, resolver, new XPathParser());
	const type = XPathResult.ANY_TYPE;

	let result = expression.evaluate(doc, type, null);

	if (result.resultType == XPathResult.STRING_TYPE) {
		result = result.stringValue;
	} else if (result.resultType == XPathResult.NUMBER_TYPE) {
		result = result.numberValue;
	} else if (result.resultType == XPathResult.BOOLEAN_TYPE) {
		result = result.booleanValue;
	} else {
		result = result.nodes;
		if (single) {
			result = result[0];
		}
	}

	return result;
}

export function select1(e, doc) {
	return select(e, doc, true);
}
