
import
    boolPureExpPatt, numPureExpPatt, arrPureExpPatt, objPureExpPatt,
    strPureExpPatt, txtPureExpPatt, attPureExpPatt
    voidExpPatt, numExpPatt
from "./productions/exp.js";

const s = "\s?";


const optVarKeywordPatt =
    "(((var)|(let)|((export\s)?const))\s)?";

const numPureVarAssignPatt =
    optVarKeywordPatt + numIdentPatt +s+ "=" +s+ numPureExpPatt +s+ ";" +s;
const arrPureVarAssignPatt =
    optVarKeywordPatt + arrIdentPatt +s+ "=" +s+ arrPureExpPatt +s+ ";" +s;
const objPureVarAssignPatt =
    optVarKeywordPatt + objIdentPatt +s+ "=" +s+ objPureExpPatt +s+ ";" +s;
const boolPureVarAssignPatt =
    optVarKeywordPatt + boolIdentPatt +s+ "=" +s+ boolPureExpPatt +s+ ";" +s;
const strPureVarAssignPatt =
    optVarKeywordPatt + strIdentPatt +s+ "=" +s+ strPureExpPatt +s+ ";" +s;
const txtPureVarAssignPatt =
    optVarKeywordPatt + strIdentPatt +s+ "=" +s+ txtPureExpPatt +s+ ";" +s;
const attPureVarAssignPatt =
    optVarKeywordPatt + strIdentPatt +s+ "=" +s+ attPureExpPatt +s+ ";" +s;


const numVarAssignPatt =
    optVarKeywordPatt + numIdentPatt +s+ "=" +s+ numExpPatt +s+ ";" +s;


export const pureVarAssignPatt =
    "(" +
        "(" + strPureVarAssignPatt + ")" +
    "|" +
        "(" + numPureVarAssignPatt + ")" +
    "|" +
        "(" + arrPureVarAssignPatt + ")" +
    "|" +
        "(" + objPureVarAssignPatt + ")" +
    "|" +
        "(" + boolPureVarAssignPatt + ")" +
    ")" +s;

const procStmtPatt =
    "(" +
        "(" + voidExp +s+ ";" ")" +
    "|" +
        "(" + numExp +s+ ";" ")" +
    "|" +
        "(" + numVarAssignPatt + ")" +
    ")" +s;


export const stmtPatt =
    "(" +
        "(" + pureVarAssignPatt + ")" +
    "|" +
        "(" + procStmtPatt + ")" +
    ")" +s;


// statement list without any branching.
const stmtSeriesPatt =
    "(" + stmtPatt +s+ ")*";



// some block statements that can include the above statements (and loop
// statements can also include if(-else) statements, by the way, but not the
// other way around).
const blockPatt =
    "\{" +s+ stmtSeriesPatt "\}" +s;

const ifBlockPatt =
    "if" +s+ "\(" +s+ boolPureExpPatt +s+ "\)" +s+ blockPatt +s;


const ifElseBlockPatt = // Note that this pattern also includes the ifBlockPatt.
    ifBlockPatt +s+
    "(" + "else\s" + ifBlockPatt +s+ ")*" +
    "(" + "else" +s+ blockPatt +s+ ")?";


const loopInnerBlockPatt =
    "\{" +s+ "(" + stmtSeriesPatt +s+ "|"+ ifElseBlockPatt +s+ ")*" + "\}" +s;

// Note if(-else) statements cannot include loops directly; only indirectly
// by calling looping functions inside their blocks.
const whileLoopBlockPatt =
    "while" +s+ "\(" +s+ boolPureExpPatt +s+ "\)" +s+ loopInnerBlockPatt +s;

const forLoopBeginningPatt =
    "for" +s+ "\(" +s+
        numPureVarAssignPatt +s+ boolPureExpPatt +s+ ";" +s+ stmtPatt +s+
     "\)" +s;

const forLoopBlockPatt =
    "(" + forLoopBeginningPatt +s+ ")+" +
    loopInnerBlockPatt +s;

const stmtBlockPatt =
    "(" +
        "(" + whileLoopBlockPatt + ")" +
    "|" +
        "(" + forLoopBlockPatt + ")" +
    "|" +
        "(" + ifElseBlockPatt + ")" + // (This also includes the ifBlockPatt.)
    "|" +
        "(" + blockPatt + ")" +
    "|" +
        "(" + stmtSeriesPatt + ")" +
    ")";


// final "stmtLstPatt".
export const stmtLstPatt =
    "(" + stmtBlockPatt +s+ ")*";
