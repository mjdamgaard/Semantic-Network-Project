
import parseIdentifier, parseIdentifierTuple, parseIndexIdentifier
    from "./ident.js";

// TODO change this to an import from an exception module.
class ParseException {
    constructor(pos, msg) {
        this.pos = pos;
        this.msg = msg;
    }
}

/* A lot of comments are omitted here, namely when the procedures follow the
 * same logical flow as in stmt.js. So see that source code to understand
 * this logic.
 **/

export function parseExp(lexArr, nextPos, successRequired) {
    let ret =
        parseAssignExp(lexArr, nextPos, false) ||
        parseIndexExp(lexArr, nextPos, false) ||
        ...

    if (successRequired && !ret) {
        throw new ParseException(
            lexArr[nextPos[0]], "Expected expression"
        );
    }
    return ret;
}

/* Here "Index" refers to special variables who can also been assigned and
 * changed via certain restricted operations. They cannot be passed to
 * functions. But as opposed to "normal" vars, they can be used as array
 * indeces. (This fact is what requires us to be careful with them.)
 **/
// (13:46, 29.03.23) Ah, no! I will simply just require parseInt() in all
// array indeces!

export function parseAssignExp(lexArr, nextPos, successRequired) {
    let initialPos = nextPos[0];
    if (
        parseIndexIdentifier(lexArr, nextPos, false) &&
        parseLexeme(lexArr, nextPos, "=", false) && //no other assignOp allowed.
        parseIndexExp(lexArr, nextPos, false)
    ) {
        return true;
    }
    nextPos[0] = initialPos;
    if (
        parseIdentifier(lexArr, nextPos, false) &&
        parseAssignOp(lexArr, nextPos, false) &&
        parseExp(lexArr, nextPos, false)
    ) {
        return true;
    }
    nextPos[0] = initialPos;
    if (successRequired) {
        throw new ParseException(
            lexArr[nextPos[0]], "Expected assignment expression"
        );
    }
    return false;
}


// function parseIndexExp(lexArr, nextPos, successRequired) {
//     let ret =
//         parseIndexOperation(lexArr, nextPos, false) ||
//         parseIndexIncrement(lexArr, nextPos, false) ||
//         parseIndexDecrement(lexArr, nextPos, false) ||
//         parseIndexIdentifier(lexArr, nextPos, false) ||
//         parseIntLiteral(lexArr, nextPos, false) ||
// }
//
// function parseIndexOperation(lexArr, nextPos, successRequired) {
//     let initialPos = nextPos[0];
//     if (!parseIndexIdentifier(lexArr, nextPos, successRequired)) {
//         return false;
//     }
//     if (
//         !parseLexeme(lexArr, nextPos, "+", false) &&
//         !parseLexeme(lexArr, nextPos, "-", false) &&
//         !parseLexeme(lexArr, nextPos, "*", false) &&
//         !parseLexeme(lexArr, nextPos, "**", false) &&
//         !parseLexeme(lexArr, nextPos, "/~~", false) &&
//         !parseLexeme(lexArr, nextPos, "%", false)
//     ) {
//         nextPos[0] = initialPos;
//         if (successRequired) {
//             throw new ParseException(
//                 lexArr[nextPos[0]], "Expected integer operator"
//             );
//         }
//         return false;
//     }
//     // this recursive call allows for a series of operations, but not with
//     // any parenthesis.
//     return parseIndexExp(lexArr, nextPos, successRequired);
// }

        // parseIndexSum(lexArr, nextPos, false) ||
        // parseIndexDifference(lexArr, nextPos, false) ||
        // parseIndexMultiplication(lexArr, nextPos, false) ||
        // parseIndexExponentiation(lexArr, nextPos, false) ||
        // parseIndexIntDivision(lexArr, nextPos, false) ||
        // parseIndexModulus(lexArr, nextPos, false) ||







function parseAssignOp(lexArr, nextPos, successRequired) {
    let ret =
        parseLexeme(lexArr, nextPos, "=", false) ||
        parseLexeme(lexArr, nextPos, "+=", false) ||
        parseLexeme(lexArr, nextPos, "-=", false) ||
        parseLexeme(lexArr, nextPos, "*=", false) ||
        parseLexeme(lexArr, nextPos, "**=", false) ||
        parseLexeme(lexArr, nextPos, "/=", false) ||
        parseLexeme(lexArr, nextPos, "%=", false) ||
        parseLexeme(lexArr, nextPos, "&&=", false) ||
        parseLexeme(lexArr, nextPos, "||=", false);

    if (successRequired && !ret) {
        throw new ParseException(
            lexArr[nextPos[0]], "Expected non-block statement"
        );
    }
    return ret;
}

















//TODO:
    // boolPureExp, numPureExp, arrPureExp, objPureExp,
    // strPureExp, txtPureExp, attPureExp
    // voidExp, numExp

import
    boolIdent, numIdent, arrIdent, objIdent,
    strIdent, txtIdent, attIdent,
    boolFunIdent, numFunIdent, arrFunIdent, objFunIdent,
    strFunIdent, txtFunIdent, attFunIdent,
    voidFunIdent, ecFunIdent
    identLst
from "./ident.js";

import
    boolLiteral, numLiteral, strLiteral, txtLiteral, attLiteral,
    arrLiteral, objLiteral
from "./literal.js";


export const boolAtom =
    "((" + boolLiteral + ")|(" + boolIdent + "))";
export const numAtom =
    "((" + numLiteral + ")|(" + numIdent + "))";
export const strAtom =
    "((" + strLiteral + ")|(" + strIdent + "))";
export const txtAtom =
    "((" + txtLiteral + ")|(" + txtIdent + "))";
export const attAtom =
    "((" + attLiteral + ")|(" + attIdent + "))";
export const arrAtom =
    "((" + arrLiteral + ")|(" + arrIdent + "))";
export const objAtom =
    "((" + objLiteral + ")|(" + objIdent + "))";



const boolFunCall =
    boolFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;
const numFunCall =
    numFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;
const strFunCall =
    strFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;
const txtFunCall =
    txtFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;
const attFunCall =
    attFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;
const arrFunCall =
    arrFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;
const objFunCall =
    objFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;

const voidFunCall =
    voidFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;
const ecFunCall =
    ecFunIdent +s+ "\(" +s+ identLst +s+ "\)" +s;



/* Numerical expressions */


const aritOp =
    "[\+\-\*\/%(\*\*)]";



const numAritExp1 =
    numAtom +s+ "(" + aritOp +s+ numAtom +s+ ")*";

const numAritExp2 =
    "\(" +s+ numAritExp1 +s+ "\)";

const numAritExp3 =
    "((" + numAritExp1 + ")|(" + "\-?" +s+ numAritExp2 + "))";


export const numPureExp =
    numAritExp3 +s+ "(" + aritOp +s+ numAritExp3 +s+ ")*";


/* Boolean expressions */

const numCompOp =
    "[(==)<>(<=)(>=)(!=)]";

const boolNumAritComp =
    numAritExp1 +s+ numCompOp +s+ numAritExp1;


const boolNoLogOp =
    "((" + "!?" +s+ boolAtom + ")|(" + boolNumAritComp + "))";


const logOp =
    "[(\|\|)(\?\?)(&&)]";

const boolCompoundExp =
    boolNoLogOp +s+ "(" + logOp +s+ boolNoLogOp +s+ ")*";


export const boolPureExp =
    "(" +
        "(" + boolCompoundExp +s+ ")" +
    "|" +
        "(" + boolFunCall +s+ ")" +
    ")";






/* String, text (safe for HTML printing) and attribute (safe for printing as
 * HTML attribute values) expressions
 **/

const strNoConcat =
    "((" + strAtom + ")|(" + strFunCall + "))";
const txtNoConcat =
    "((" + txtAtom + ")|(" + txtFunCall + "))";
const attNoConcat =
    "((" + attAtom + ")|(" + attFunCall + "))";


const strPureExp =
    strNoConcat +s+ "(" + "\+" +s+ strNoConcat +s+ ")*";
const txtPureExp =
    txtNoConcat +s+ "(" + "\+" +s+ txtNoConcat +s+ ")*";
const attPureExp =
    attNoConcat +s+ "(" + "\+" +s+ attNoConcat +s+ ")*";


/* Array and object expressions */

export const arrPureExp =
    "((" + arrAtom + ")|(" + arrFunCall + "))";
export const objPureExp =
    "((" + objAtom + ")|(" + objFunCall + "))";


/* Void and exit code (ec) expressions */

export const voidExp =
    "((" + voidFunCall + ")|(" + numIdent +s+ "[(\+\+)(\-\-)]" + "))";

export const ecExp =
    ecFunCall;


// (12:44, 25.03.23) Commit msg: "sorta done with exp.js, but I
// imagine that all this will give me a very large string, so now
// I'm wondering, if it wouldn't be better to just go the AST way
// instead from the beginning.."
// ..Hm, but maybe I can just parse one regex at a.. Wait.. Maybe I could
// just lex the script first in an way where I already create a tree in this
// lexing step..! I'm thinking about parsing all parentheses as one "word,"
// essentially, and then "lex" each element of such "compound words," as
// we can call them, recursively..!.. (12:49) ..Well, let me just call it
// an initial parsing, where we achieve lexing as well as getting an
// initial syntax tree, namely where all parentheses are.. wait no, let me
// actually not really "lex" the script at all. Let me instead just make
// the initial parsing return an array of subprograms, which themselves are
// either strings with any multiple-character whitespace reduced to a single
// \s, or they are arrays themselves (of strings and arrays on so on).
// ...(13:48) No, I should also lex the program initially. :)
