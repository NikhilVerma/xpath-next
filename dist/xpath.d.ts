declare class XPathParser {
    reduceActions: any[];
    constructor();
    init(): void;
    static actionTable: string[];
    static actionTableNumber: string[];
    static gotoTable: string[];
    static productions: number[][];
    static DOUBLEDOT: number;
    static DOUBLECOLON: number;
    static DOUBLESLASH: number;
    static NOTEQUAL: number;
    static LESSTHANOREQUAL: number;
    static GREATERTHANOREQUAL: number;
    static AND: number;
    static OR: number;
    static MOD: number;
    static DIV: number;
    static MULTIPLYOPERATOR: number;
    static FUNCTIONNAME: number;
    static AXISNAME: number;
    static LITERAL: number;
    static NUMBER: number;
    static ASTERISKNAMETEST: number;
    static QNAME: number;
    static NCNAMECOLONASTERISK: number;
    static NODETYPE: number;
    static PROCESSINGINSTRUCTIONWITHLITERAL: number;
    static EQUALS: number;
    static LESSTHAN: number;
    static GREATERTHAN: number;
    static PLUS: number;
    static MINUS: number;
    static BAR: number;
    static SLASH: number;
    static LEFTPARENTHESIS: number;
    static RIGHTPARENTHESIS: number;
    static COMMA: number;
    static AT: number;
    static LEFTBRACKET: number;
    static RIGHTBRACKET: number;
    static DOT: number;
    static DOLLAR: number;
    tokenize(s1: any): any[][];
    static SHIFT: string;
    static REDUCE: string;
    static ACCEPT: string;
    parse(s: any): XPath;
}
declare class XPath {
    expression: any;
    constructor(e: any);
    toString(): any;
    evaluate(c: any): any;
    static XML_NAMESPACE_URI: string;
    static XMLNS_NAMESPACE_URI: string;
}
declare class Expression {
    constructor();
    toString(): string;
    evaluate(c: any): void;
}
declare class UnaryOperation extends Expression {
    rhs: any;
    constructor(rhs: any);
    init(rhs: any): void;
}
declare class UnaryMinusOperation extends UnaryOperation {
    constructor(rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class BinaryOperation extends Expression {
    lhs: any;
    rhs: any;
    constructor(lhs: any, rhs: any);
    init(lhs: any, rhs: any): void;
}
declare class OrOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    toString(): string;
    evaluate(c: any): any;
}
declare class AndOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    toString(): string;
    evaluate(c: any): any;
}
declare class EqualsOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    toString(): string;
    evaluate(c: any): any;
}
declare class NotEqualOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    toString(): string;
    evaluate(c: any): any;
}
declare class LessThanOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class GreaterThanOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class LessThanOrEqualOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class GreaterThanOrEqualOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class PlusOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class MinusOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class MultiplyOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class DivOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class ModOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class BarOperation extends BinaryOperation {
    constructor(lhs: any, rhs: any);
    evaluate(c: any): any;
    toString(): string;
}
declare class PathExpr extends Expression {
    static PathExpr: Expression;
    filter: any;
    filterPredicates: any;
    locationPath: any;
    constructor(filter: any, filterPreds: any, locpath: any);
    init(filter: any, filterPreds: any, locpath: any): void;
    applyFilter(c: any, xpc: any): {
        nonNodes: any;
        nodes?: undefined;
    } | {
        nodes: any;
        nonNodes?: undefined;
    };
    evaluate(c: any): any;
    toString(): any;
    static applyPredicates(predicates: any, c: any, nodes: any): any;
    static getRoot(xpc: any, nodes: any): any;
    static applyStep(step: any, xpc: any, node: any): any[];
    static applySteps(steps: any, xpc: any, nodes: any): any;
    static applyLocationPath(locationPath: any, xpc: any, nodes: any): any;
    static predicateMatches(pred: any, c: any): any;
    static predicateString(predicate: any): any;
    static predicatesString(predicates: any): any;
    static getOwnerElement(n: any): any;
}
declare class LocationPath {
    absolute: any;
    steps: any;
    constructor(abs: any, steps: any);
    init(abs: any, steps: any): void;
    toString(): string;
}
declare class Step {
    axis: any;
    nodeTest: any;
    predicates: any;
    static STEPNAMES: any;
    constructor(axis: any, nodetest: any, preds: any);
    init(axis: any, nodetest: any, preds: any): void;
    toString(): string;
    static ANCESTOR: number;
    static ANCESTORORSELF: number;
    static ATTRIBUTE: number;
    static CHILD: number;
    static DESCENDANT: number;
    static DESCENDANTORSELF: number;
    static FOLLOWING: number;
    static FOLLOWINGSIBLING: number;
    static NAMESPACE: number;
    static PARENT: number;
    static PRECEDING: number;
    static PRECEDINGSIBLING: number;
    static SELF: number;
}
declare class NodeTest {
    static nodeTest: any;
    static commentTest: any;
    static textTest: any;
    static anyPiTest: any;
    static PITest: any;
    static nameTestAny: any;
    static NameTestPrefixAny: any;
    static NameTestQName: any;
    type: any;
    value: any;
    static isElementOrAttribute: (node: any) => boolean;
    constructor(type: any, value: any);
    init(type: any, value: any): void;
    toString(): string;
    matches(n: any, xpc: any): void;
    static NAMETESTANY: number;
    static NAMETESTPREFIXANY: number;
    static NAMETESTQNAME: number;
    static COMMENT: number;
    static TEXT: number;
    static PI: number;
    static NODE: number;
    static isNodeType(types: any): (node: any) => boolean;
    static makeNodeTestType(type: any, members: any, ctor?: any): any;
    static makeNodeTypeTest(type: any, nodeTypes: any, stringVal: any): any;
    static hasPrefix(node: any): any;
    static nameSpaceMatches(prefix: any, xpc: any, n: any): boolean;
    static localNameMatches(localName: any, xpc: any, n: any): boolean;
}
declare class VariableReference extends Expression {
    variable: any;
    constructor(v: any);
    init(v: any): void;
    toString(): string;
    evaluate(c: any): any;
}
declare class FunctionCall extends Expression {
    functionName: any;
    arguments: any;
    constructor(fn: any, args: any);
    init(fn: any, args: any): void;
    toString(): string;
    evaluate(c: any): any;
}
declare class XString extends Expression {
    str: string;
    constructor(s: any);
    init(s: any): void;
    toString(): string;
    evaluate(c: any): this;
    string(): this;
    number(): XNumber;
    bool(): XBoolean;
    nodeset(): void;
    stringValue(): string;
    numberValue(): number;
    booleanValue(): boolean;
    equals(r: any): any;
    notequal(r: any): any;
    lessthan(r: any): any;
    greaterthan(r: any): any;
    lessthanorequal(r: any): any;
    greaterthanorequal(r: any): any;
}
declare class XNumber extends Expression {
    numberFormat: RegExp;
    num: number;
    constructor(n: any);
    init(n: any): void;
    parse(s: any): number;
    toString(): any;
    evaluate(c: any): this;
    string(): XString;
    number(): this;
    bool(): XBoolean;
    nodeset(): void;
    stringValue(): string;
    numberValue(): number;
    booleanValue(): boolean;
    negate(): XNumber;
    equals(r: any): any;
    notequal(r: any): any;
    lessthan(r: any): any;
    greaterthan(r: any): any;
    lessthanorequal(r: any): any;
    greaterthanorequal(r: any): any;
    plus(r: any): XNumber;
    minus(r: any): XNumber;
    multiply(r: any): XNumber;
    div(r: any): XNumber;
    mod(r: any): XNumber;
}
declare class XBoolean extends Expression {
    b: boolean;
    static true_: XBoolean;
    static false_: XBoolean;
    constructor(b: any);
    init(b: any): void;
    toString(): string;
    evaluate(c: any): this;
    string(): XString;
    number(): XNumber;
    bool(): this;
    nodeset(): void;
    stringValue(): string;
    numberValue(): number;
    booleanValue(): boolean;
    not(): XBoolean;
    equals(r: any): any;
    notequal(r: any): any;
    lessthan(r: any): any;
    greaterthan(r: any): any;
    lessthanorequal(r: any): any;
    greaterthanorequal(r: any): any;
}
declare class XNodeSet extends Expression {
    tree: any;
    nodes: any[];
    size: number;
    constructor();
    init(): void;
    toString(): string;
    evaluate(c: any): this;
    string(): XString;
    stringValue(): string;
    number(): XNumber;
    numberValue(): number;
    bool(): XBoolean;
    booleanValue(): boolean;
    nodeset(): this;
    stringForNode(n: any): any;
    stringForContainerNode(n: any): string;
    buildTree(): any;
    first(): any;
    add(n: any): void;
    addArray(ns: any): void;
    toArray(): any[];
    toArrayRec(t: any, a: any): void;
    toUnsortedArray(): any[];
    compareWithString(r: any, o: any): any;
    compareWithNumber(r: any, o: any): any;
    compareWithBoolean(r: any, o: any): any;
    compareWithNodeSet(r: any, o: any): any;
    union(r: any): XNodeSet;
    static compareWith: () => any;
    equals: any;
    notequal: any;
    lessthan: any;
    greaterthan: any;
    lessthanorequal: any;
    greaterthanorequal: any;
}
declare class XPathContext {
    variableResolver: any;
    namespaceResolver: any;
    functionResolver: any;
    expressionContextNode: any;
    caseInsensitive: any;
    constructor(vr?: any, nr?: any, fr?: any);
    extend(newProps: any): any;
}
declare class VariableResolver {
    constructor();
    getVariable(ln: any, ns: any): any;
}
declare class FunctionResolver {
    thisArg: any;
    functions: Object;
    constructor(thisArg?: any);
    addStandardFunctions(): void;
    addFunction(ns: any, ln: any, f: any): void;
    getFunction(localName: any, namespace: any): any;
    static getFunctionFromContext(qName: any, context: any): any;
}
declare class NamespaceResolver {
    constructor();
    getNamespace(prefix: any, n: any): string;
}
declare class XPathResult {
    static XPathResult: {};
    resultType: any;
    numberValue: any;
    stringValue: any;
    booleanValue: any;
    singleNodeValue: any;
    invalidIteratorState: boolean;
    nodes: any[];
    iteratorIndex: number;
    snapshotLength: any;
    constructor(v: any, t: any);
    iterateNext(): any;
    snapshotItem(i: any): any;
    static ANY_TYPE: number;
    static NUMBER_TYPE: number;
    static STRING_TYPE: number;
    static BOOLEAN_TYPE: number;
    static UNORDERED_NODE_ITERATOR_TYPE: number;
    static ORDERED_NODE_ITERATOR_TYPE: number;
    static UNORDERED_NODE_SNAPSHOT_TYPE: number;
    static ORDERED_NODE_SNAPSHOT_TYPE: number;
    static ANY_UNORDERED_NODE_TYPE: number;
    static FIRST_ORDERED_NODE_TYPE: number;
}
declare const _default: XPathParser;
export default _default;
export declare const parse: (xpath: any) => any;
export { XPath, XPathParser, XPathResult, Step, PathExpr, NodeTest, LocationPath, OrOperation, AndOperation, BarOperation, EqualsOperation, NotEqualOperation, LessThanOperation, GreaterThanOperation, LessThanOrEqualOperation, GreaterThanOrEqualOperation, PlusOperation, MinusOperation, MultiplyOperation, DivOperation, ModOperation, UnaryMinusOperation, FunctionCall, VariableReference, XPathContext, XNodeSet, XBoolean, XString, XNumber, NamespaceResolver, FunctionResolver, VariableResolver, };
export declare function select(e: any, doc: any, single: any): any;
export declare function useNamespaces(mappings: any): (e: any, doc: any, single: any) => any;
export declare function selectWithResolver(e: any, doc: any, resolver: any, single: any): any;
export declare function select1(e: any, doc: any): any;
//# sourceMappingURL=xpath.d.ts.map