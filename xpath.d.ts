export function select(e: any, doc: any, single: any): XPathResult;
export function useNamespaces(mappings: any): (e: any, doc: any, single: any) => XPathResult;
export function selectWithResolver(e: any, doc: any, resolver: any, single: any): XPathResult;
export function select1(e: any, doc: any): XPathResult;
declare const _default: XPathParser;
export default _default;
export function parse(xpath: any): any;
export function XPathResult(v: any, t: any): void;
export class XPathResult {
    constructor(v: any, t: any);
    resultType: any;
    numberValue: any;
    stringValue: any;
    booleanValue: any;
    singleNodeValue: any;
    invalidIteratorState: boolean;
    nodes: any;
    iteratorIndex: number;
    snapshotLength: any;
    constructor: typeof XPathResult;
    iterateNext(): any;
    snapshotItem(i: any): any;
}
export namespace XPathResult {
    export { prototype as superclass, ANY_TYPE, NUMBER_TYPE, STRING_TYPE, BOOLEAN_TYPE, UNORDERED_NODE_ITERATOR_TYPE, ORDERED_NODE_ITERATOR_TYPE, UNORDERED_NODE_SNAPSHOT_TYPE, ORDERED_NODE_SNAPSHOT_TYPE, ANY_UNORDERED_NODE_TYPE, FIRST_ORDERED_NODE_TYPE };
}
export function XPathParser(): void;
export class XPathParser {
    constructor: typeof XPathParser;
    init(): void;
    reduceActions: any[];
    tokenize(s1: any): (string[] | number[])[];
    parse(s: any): XPath;
}
export namespace XPathParser {
    const superclass: Object;
    const actionTable: string[];
    const actionTableNumber: string[];
    const gotoTable: string[];
    const productions: number[][];
    const DOUBLEDOT: number;
    const DOUBLECOLON: number;
    const DOUBLESLASH: number;
    const NOTEQUAL: number;
    const LESSTHANOREQUAL: number;
    const GREATERTHANOREQUAL: number;
    const AND: number;
    const OR: number;
    const MOD: number;
    const DIV: number;
    const MULTIPLYOPERATOR: number;
    const FUNCTIONNAME: number;
    const AXISNAME: number;
    const LITERAL: number;
    const NUMBER: number;
    const ASTERISKNAMETEST: number;
    const QNAME: number;
    const NCNAMECOLONASTERISK: number;
    const NODETYPE: number;
    const PROCESSINGINSTRUCTIONWITHLITERAL: number;
    const EQUALS: number;
    const LESSTHAN: number;
    const GREATERTHAN: number;
    const PLUS: number;
    const MINUS: number;
    const BAR: number;
    const SLASH: number;
    const LEFTPARENTHESIS: number;
    const RIGHTPARENTHESIS: number;
    const COMMA: number;
    const AT: number;
    const LEFTBRACKET: number;
    const RIGHTBRACKET: number;
    const DOT: number;
    const DOLLAR: number;
    const SHIFT: string;
    const REDUCE: string;
    const ACCEPT: string;
}
export function XPath(e: any): void;
export class XPath {
    constructor(e: any);
    expression: any;
    constructor: typeof XPath;
    toString(): any;
    evaluate(c: any): any;
}
export namespace XPath {
    const superclass_1: Object;
    export { superclass_1 as superclass };
    export const XML_NAMESPACE_URI: string;
    export const XMLNS_NAMESPACE_URI: string;
}
export function Step(axis: any, nodetest: any, preds: any, ...args: any[]): void;
export class Step {
    constructor(axis: any, nodetest: any, preds: any, ...args: any[]);
    constructor: typeof Step;
    init(axis: any, nodetest: any, preds: any): void;
    axis: any;
    nodeTest: any;
    predicates: any;
    toString(): string;
}
export namespace Step {
    const superclass_2: Object;
    export { superclass_2 as superclass };
    export const ANCESTOR: number;
    export const ANCESTORORSELF: number;
    export const ATTRIBUTE: number;
    export const CHILD: number;
    export const DESCENDANT: number;
    export const DESCENDANTORSELF: number;
    export const FOLLOWING: number;
    export const FOLLOWINGSIBLING: number;
    export const NAMESPACE: number;
    export const PARENT: number;
    export const PRECEDING: number;
    export const PRECEDINGSIBLING: number;
    export const SELF: number;
    export const STEPNAMES: any;
}
export function PathExpr(filter: any, filterPreds: any, locpath: any, ...args: any[]): void;
export class PathExpr {
    constructor(filter: any, filterPreds: any, locpath: any, ...args: any[]);
    constructor: typeof PathExpr;
    init(filter: any, filterPreds: any, locpath: any): void;
    filter: any;
    filterPredicates: any;
    locationPath: any;
    applyFilter(c: any, xpc: any): {
        nonNodes: any;
        nodes?: undefined;
    } | {
        nodes: any;
        nonNodes?: undefined;
    };
    evaluate(c: any): any;
    toString(): any;
}
export namespace PathExpr {
    import superclass_3 = Expression.prototype;
    export { superclass_3 as superclass };
    export function applyPredicates(predicates: any, c: any, nodes: any): any;
    export function getRoot(xpc: any, nodes: any): any;
    export function applyStep(step: any, xpc: any, node: any): any[];
    export function applySteps(steps: any, xpc: any, nodes: any): any;
    export function applyLocationPath(locationPath: any, xpc: any, nodes: any): any;
    export function predicateMatches(pred: any, c: any): any;
    export function predicateString(predicate: any): any;
    export function predicatesString(predicates: any): any;
    export function getOwnerElement(n: any): any;
}
export function NodeTest(type: any, value: any, ...args: any[]): void;
export class NodeTest {
    constructor(type: any, value: any, ...args: any[]);
    constructor: typeof NodeTest;
    init(type: any, value: any): void;
    type: any;
    value: any;
    toString(): string;
    matches(n: any, xpc: any): void;
}
export namespace NodeTest {
    const superclass_4: Object;
    export { superclass_4 as superclass };
    export const NAMETESTANY: number;
    export const NAMETESTPREFIXANY: number;
    export const NAMETESTQNAME: number;
    export const COMMENT: number;
    export const TEXT: number;
    export const PI: number;
    export const NODE: number;
    export function isNodeType(types: any): (node: any) => boolean;
    export function makeNodeTestType(type: any, members: any, ctor: any): any;
    export function makeNodeTypeTest(type: any, nodeTypes: any, stringVal: any): any;
    export function hasPrefix(node: any): any;
    export function isElementOrAttribute(node: any): boolean;
    export function nameSpaceMatches(prefix: any, xpc: any, n: any): boolean;
    export function localNameMatches(localName: any, xpc: any, n: any): boolean;
    export const NameTestPrefixAny: any;
    export const NameTestQName: any;
    export const PITest: any;
    export const nameTestAny: any;
    export const textTest: any;
    export const commentTest: any;
    export const nodeTest: any;
    export const anyPiTest: any;
}
export function LocationPath(abs: any, steps: any, ...args: any[]): void;
export class LocationPath {
    constructor(abs: any, steps: any, ...args: any[]);
    constructor: typeof LocationPath;
    init(abs: any, steps: any): void;
    absolute: any;
    steps: any;
    toString(): string;
}
export namespace LocationPath {
    const superclass_5: Object;
    export { superclass_5 as superclass };
}
export function OrOperation(lhs: any, rhs: any, ...args: any[]): void;
export class OrOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof OrOperation;
    init(lhs: any, rhs: any): void;
    toString(): string;
    evaluate(c: any): any;
}
export namespace OrOperation {
    import superclass_6 = BinaryOperation.prototype;
    export { superclass_6 as superclass };
}
export function AndOperation(lhs: any, rhs: any, ...args: any[]): void;
export class AndOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof AndOperation;
    init(lhs: any, rhs: any): void;
    toString(): string;
    evaluate(c: any): any;
}
export namespace AndOperation {
    import superclass_7 = BinaryOperation.prototype;
    export { superclass_7 as superclass };
}
export function BarOperation(lhs: any, rhs: any, ...args: any[]): void;
export class BarOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof BarOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace BarOperation {
    import superclass_8 = BinaryOperation.prototype;
    export { superclass_8 as superclass };
}
export function EqualsOperation(lhs: any, rhs: any, ...args: any[]): void;
export class EqualsOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof EqualsOperation;
    init(lhs: any, rhs: any): void;
    toString(): string;
    evaluate(c: any): any;
}
export namespace EqualsOperation {
    import superclass_9 = BinaryOperation.prototype;
    export { superclass_9 as superclass };
}
export function NotEqualOperation(lhs: any, rhs: any, ...args: any[]): void;
export class NotEqualOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof NotEqualOperation;
    init(lhs: any, rhs: any): void;
    toString(): string;
    evaluate(c: any): any;
}
export namespace NotEqualOperation {
    import superclass_10 = BinaryOperation.prototype;
    export { superclass_10 as superclass };
}
export function LessThanOperation(lhs: any, rhs: any, ...args: any[]): void;
export class LessThanOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof LessThanOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace LessThanOperation {
    import superclass_11 = BinaryOperation.prototype;
    export { superclass_11 as superclass };
}
export function GreaterThanOperation(lhs: any, rhs: any, ...args: any[]): void;
export class GreaterThanOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof GreaterThanOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace GreaterThanOperation {
    import superclass_12 = BinaryOperation.prototype;
    export { superclass_12 as superclass };
}
export function LessThanOrEqualOperation(lhs: any, rhs: any, ...args: any[]): void;
export class LessThanOrEqualOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof LessThanOrEqualOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace LessThanOrEqualOperation {
    import superclass_13 = BinaryOperation.prototype;
    export { superclass_13 as superclass };
}
export function GreaterThanOrEqualOperation(lhs: any, rhs: any, ...args: any[]): void;
export class GreaterThanOrEqualOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof GreaterThanOrEqualOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace GreaterThanOrEqualOperation {
    import superclass_14 = BinaryOperation.prototype;
    export { superclass_14 as superclass };
}
export function PlusOperation(lhs: any, rhs: any, ...args: any[]): void;
export class PlusOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof PlusOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace PlusOperation {
    import superclass_15 = BinaryOperation.prototype;
    export { superclass_15 as superclass };
}
export function MinusOperation(lhs: any, rhs: any, ...args: any[]): void;
export class MinusOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof MinusOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace MinusOperation {
    import superclass_16 = BinaryOperation.prototype;
    export { superclass_16 as superclass };
}
export function MultiplyOperation(lhs: any, rhs: any, ...args: any[]): void;
export class MultiplyOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof MultiplyOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace MultiplyOperation {
    import superclass_17 = BinaryOperation.prototype;
    export { superclass_17 as superclass };
}
export function DivOperation(lhs: any, rhs: any, ...args: any[]): void;
export class DivOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof DivOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace DivOperation {
    import superclass_18 = BinaryOperation.prototype;
    export { superclass_18 as superclass };
}
export function ModOperation(lhs: any, rhs: any, ...args: any[]): void;
export class ModOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof ModOperation;
    init(lhs: any, rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace ModOperation {
    import superclass_19 = BinaryOperation.prototype;
    export { superclass_19 as superclass };
}
export function UnaryMinusOperation(rhs: any, ...args: any[]): void;
export class UnaryMinusOperation {
    constructor(rhs: any, ...args: any[]);
    constructor: typeof UnaryMinusOperation;
    init(rhs: any): void;
    evaluate(c: any): any;
    toString(): string;
}
export namespace UnaryMinusOperation {
    import superclass_20 = UnaryOperation.prototype;
    export { superclass_20 as superclass };
}
export function FunctionCall(fn: any, args: any, ...args: any[]): void;
export class FunctionCall {
    constructor(fn: any, args: any, ...args: any[]);
    constructor: typeof FunctionCall;
    init(fn: any, args: any): void;
    functionName: any;
    arguments: any;
    toString(): string;
    evaluate(c: any): any;
}
export namespace FunctionCall {
    import superclass_21 = Expression.prototype;
    export { superclass_21 as superclass };
}
export function VariableReference(v: any, ...args: any[]): void;
export class VariableReference {
    constructor(v: any, ...args: any[]);
    constructor: typeof VariableReference;
    init(v: any): void;
    variable: any;
    toString(): string;
    evaluate(c: any): any;
}
export namespace VariableReference {
    import superclass_22 = Expression.prototype;
    export { superclass_22 as superclass };
}
export function XPathContext(vr: any, nr: any, fr: any): void;
export class XPathContext {
    constructor(vr: any, nr: any, fr: any);
    variableResolver: any;
    namespaceResolver: any;
    functionResolver: any;
    constructor: typeof XPathContext;
    extend(newProps: any): any;
}
export namespace XPathContext {
    const superclass_23: Object;
    export { superclass_23 as superclass };
}
export function XNodeSet(): void;
export class XNodeSet {
    constructor: typeof XNodeSet;
    init(): void;
    tree: AVLTree;
    nodes: any[];
    size: number;
    toString(): string;
    evaluate(c: any): XNodeSet;
    string(): XString;
    stringValue(): string;
    number(): XNumber;
    numberValue(): number;
    bool(): XBoolean;
    booleanValue(): boolean;
    nodeset(): XNodeSet;
    stringForNode(n: any): any;
    stringForContainerNode(n: any): string;
    buildTree(): AVLTree;
    first(): any;
    add(n: any): void;
    addArray(ns: any): void;
    /**
     * Returns an array of the node set's contents in document order
     */
    toArray(): any[];
    toArrayRec(t: any, a: any): void;
    /**
     * Returns an array of the node set's contents in arbitrary order
     */
    toUnsortedArray(): any[];
    compareWithString(r: any, o: any): any;
    compareWithNumber(r: any, o: any): any;
    compareWithBoolean(r: any, o: any): any;
    compareWithNodeSet(r: any, o: any): any;
    equals: any;
    notequal: any;
    lessthan: any;
    greaterthan: any;
    lessthanorequal: any;
    greaterthanorequal: any;
    union(r: any): XNodeSet;
}
export namespace XNodeSet {
    import superclass_24 = Expression.prototype;
    export { superclass_24 as superclass };
    export function compareWith(...args: any[]): any;
}
export function XBoolean(b: any, ...args: any[]): void;
export class XBoolean {
    constructor(b: any, ...args: any[]);
    constructor: typeof XBoolean;
    init(b: any): void;
    b: boolean;
    toString(): string;
    evaluate(c: any): XBoolean;
    string(): XString;
    number(): XNumber;
    bool(): XBoolean;
    nodeset(): never;
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
export namespace XBoolean {
    import superclass_25 = Expression.prototype;
    export { superclass_25 as superclass };
    export const true_: XBoolean;
    export const false_: XBoolean;
}
export function XString(s: any, ...args: any[]): void;
export class XString {
    constructor(s: any, ...args: any[]);
    constructor: typeof XString;
    init(s: any): void;
    str: string;
    toString(): string;
    evaluate(c: any): XString;
    string(): XString;
    number(): XNumber;
    bool(): XBoolean;
    nodeset(): never;
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
export namespace XString {
    import superclass_26 = Expression.prototype;
    export { superclass_26 as superclass };
}
export function XNumber(n: any, ...args: any[]): void;
export class XNumber {
    constructor(n: any, ...args: any[]);
    constructor: typeof XNumber;
    init(n: any): void;
    num: number;
    numberFormat: RegExp;
    parse(s: any): number;
    toString(): any;
    evaluate(c: any): XNumber;
    string(): XString;
    number(): XNumber;
    bool(): XBoolean;
    nodeset(): never;
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
export namespace XNumber {
    import superclass_27 = Expression.prototype;
    export { superclass_27 as superclass };
}
export function NamespaceResolver(): void;
export class NamespaceResolver {
    constructor: typeof NamespaceResolver;
    getNamespace(prefix: any, n: any): string;
}
export namespace NamespaceResolver {
    const superclass_28: Object;
    export { superclass_28 as superclass };
}
export function FunctionResolver(thisArg: any): void;
export class FunctionResolver {
    constructor(thisArg: any);
    thisArg: any;
    functions: Object;
    constructor: typeof FunctionResolver;
    addStandardFunctions(): void;
    addFunction(ns: any, ln: any, f: any): void;
    getFunction(localName: any, namespace: any): any;
}
export namespace FunctionResolver {
    const superclass_29: Object;
    export { superclass_29 as superclass };
    export function getFunctionFromContext(qName: any, context: any): any;
}
export function VariableResolver(): void;
export class VariableResolver {
    constructor: typeof VariableResolver;
    getVariable(ln: any, ns: any): any;
}
export namespace VariableResolver {
    const superclass_30: Object;
    export { superclass_30 as superclass };
}
export var Utilities: Object;
declare var ANY_TYPE: number;
declare var NUMBER_TYPE: number;
declare var STRING_TYPE: number;
declare var BOOLEAN_TYPE: number;
declare var UNORDERED_NODE_ITERATOR_TYPE: number;
declare var ORDERED_NODE_ITERATOR_TYPE: number;
declare var UNORDERED_NODE_SNAPSHOT_TYPE: number;
declare var ORDERED_NODE_SNAPSHOT_TYPE: number;
declare var ANY_UNORDERED_NODE_TYPE: number;
declare var FIRST_ORDERED_NODE_TYPE: number;
declare function Expression(): void;
declare class Expression {
    constructor: typeof Expression;
    init(): void;
    toString(): string;
    evaluate(c: any): never;
}
declare namespace Expression {
    const superclass_31: Object;
    export { superclass_31 as superclass };
}
declare function BinaryOperation(lhs: any, rhs: any, ...args: any[]): void;
declare class BinaryOperation {
    constructor(lhs: any, rhs: any, ...args: any[]);
    constructor: typeof BinaryOperation;
    init(lhs: any, rhs: any): void;
    lhs: any;
    rhs: any;
}
declare namespace BinaryOperation {
    import superclass_32 = Expression.prototype;
    export { superclass_32 as superclass };
}
declare function UnaryOperation(rhs: any, ...args: any[]): void;
declare class UnaryOperation {
    constructor(rhs: any, ...args: any[]);
    constructor: typeof UnaryOperation;
    init(rhs: any): void;
    rhs: any;
}
declare namespace UnaryOperation {
    import superclass_33 = Expression.prototype;
    export { superclass_33 as superclass };
}
declare function AVLTree(n: any): void;
declare class AVLTree {
    constructor(n: any);
    constructor: typeof AVLTree;
    init(n: any): void;
    left: any;
    right: any;
    node: any;
    depth: any;
    balance(): void;
    rotateLL(): void;
    rotateRR(): void;
    updateInNewLocation(): void;
    getDepthFromChildren(): void;
    add(n: any): boolean;
}
declare namespace AVLTree {
    const superclass_34: Object;
    export { superclass_34 as superclass };
}
//# sourceMappingURL=xpath.d.ts.map