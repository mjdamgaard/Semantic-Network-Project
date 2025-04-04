
import {ScriptParser} from "../interpreting/parsing/ScriptParser.js";
import {
  ScriptInterpreter, RuntimeError, CustomException, Environment, UNDEFINED,
} from "../interpreting/ScriptInterpreter.js";

let scriptParser = new ScriptParser();
let scriptInterpreter = new ScriptInterpreter({}, {}, {dataFetcher: {}});



export function runTests() {
  // script_parsing_tests_01(); // Last tested: (...).
  script_interpreter_tests_01();

}







function testParser({
  parser, str, startSym, isPartial, keepLastLexeme,
  expectedIsSuccess, expectedNextPos, expectedOutput,
  testMsgPrefix, testKey, logParserOutput, logOnlyFailures,
  additionalTest = () => true,
}) {
  let [syntaxTree, lexArr, strPosArr] = parser.parse(
    str, startSym, isPartial, keepLastLexeme
  );

  expectedNextPos ??= lexArr?.length;
  let isSuccessMsg = "SUCCESS";
  if (
    syntaxTree.isSuccess != expectedIsSuccess ||
    syntaxTree.nextPos !== expectedNextPos ||
    expectedOutput && getMissingMember(syntaxTree, expectedOutput)
  ) {
    isSuccessMsg = "FAILURE";
  }
  else if (!additionalTest(syntaxTree, lexArr, strPosArr)) {
    isSuccessMsg = "FAILURE";
  }

  if (!logOnlyFailures || isSuccessMsg === "FAILURE") {
    console.log(
      testMsgPrefix + "." + testKey + ": " + isSuccessMsg +
      (logParserOutput ? ":" : "")
    );
    if (logParserOutput) {
      parser.log(syntaxTree);
    }
  }
}





function testInterpreter({
  str, startSym = "script",
  gas = {comp: 1000},
  expectedOutput, expectedLog,
  testMsgPrefix, testKey,
  logParserOutput, logOutput, logLog, logOnlyFailures,
}) {
  let [syntaxTree] = scriptParser.parse(str, startSym);
  if (!syntaxTree.isSuccess) {
    scriptParser.log(syntaxTree);
    debugger;throw "Could not lex or parse input";
  }

  let initNode = syntaxTree.res; 
  let log = {};
  gas = Object.assign({}, gas);
  let env = new Environment(
    undefined, undefined, "module", "0", {gas: gas, log: log},
  );

  let output;
  switch (startSym) {
    case "expression":
      output = scriptInterpreter.evaluateExpression(initNode, env);
      break;
    case "statement":
      try {
        scriptInterpreter.executeStatement(initNode, env);
        output = env;
      } catch (err) {
        if (err instanceof RuntimeError || err instanceof CustomException) {
          output = err;
        }
        else throw err;
      }
      break;
    case "statement*$":
      try {
        syntaxTree.children.forEach(stmtSyntaxTree => {
          scriptInterpreter.executeStatement(stmtSyntaxTree.res, env);
        });
        output = env;
      } catch (err) {
        if (err instanceof RuntimeError || err instanceof CustomException) {
          output = err;
        }
        else throw err;
      }
      break;
    default:
      debugger;throw `testing of "${startSym}" not implemented`;
  }

  let isSuccessMsg;
  if (getMissingMember({out: output}, {out: expectedOutput})) {
    isSuccessMsg = "FAILURE";
  } else {
    isSuccessMsg = "SUCCESS";
  }

  if (!logOnlyFailures || isSuccessMsg === "FAILURE") {
    console.log(
      testMsgPrefix + "." + testKey + ": " + isSuccessMsg +
      (logParserOutput ? ":" : "")
    );
    if (logOutput) {
      console.log("Output: ", output);
    }
    if (logParserOutput) {
      scriptParser.log(syntaxTree);
    }
  }
}






function script_interpreter_tests_01() {
  let testMsgPrefix = "script_interpreter_tests_01";

  console.log("Running " + testMsgPrefix + ":");

  let defaultParams = {
    parser: scriptParser, str: "", startSym: undefined,
    gas: {comp: 1000},
    expectedOutput: undefined, expectedLog: undefined,
    testMsgPrefix: testMsgPrefix, testKey: "",
    logOutput: true, logLog: undefined,
    logParserOutput: true, logOnlyFailures: false,
  }
  let params;


  params = Object.assign({}, defaultParams, {
    str: `2 + 2`,
    startSym: "expression",
    expectedOutput: 4,
    testKey: "01",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `2 + 2 - 3`,
    startSym: "expression",
    expectedOutput: 1,
    testKey: "02",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `2 ** 4 / 5 + 2 - (3) - (2 - 7)`,
    startSym: "expression",
    expectedOutput: 2 ** 4 / 5 + 2 - (3) - (2 - 7),
    testKey: "03",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `2 / 0`,
    startSym: "expression",
    expectedOutput: Infinity,
    testKey: "04",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `let x = 1;`,
    startSym: "statement",
    expectedOutput: {variables: {
      "#x": [1],
    }},
    testKey: "05",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `let x = 2; let y = 1; x = 2*x + y;`,
    startSym: "statement*$",
    expectedOutput: {variables: {
      "#x": [5],
      "#y": [1],
    }},
    testKey: "06",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `let x = 0; while(x < 12) { x += 5; }`,
    startSym: "statement*$",
    expectedOutput: {variables: {
      "#x": [15],
    }},
    testKey: "07",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `let x = 0, y = 2; if (x * y) break; else { x -= y++; }`,
    startSym: "statement*$",
    expectedOutput: {variables: {
      "#y": [2 + 1],
      "#x": [-2],
    }},
    testKey: "08",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `let x = 2; if (true) { x *= 3; }`,
    startSym: "statement*$",
    expectedOutput: {variables: {
      "#x": [6],
    }},
    testKey: "09",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `let x = 2; if (false) { x *= 3; }`,
    startSym: "statement*$",
    expectedOutput: {variables: {
      "#x": [2],
    }},
    testKey: "10",
  });
  testInterpreter(params);

  params = Object.assign({}, defaultParams, {
    str: `function foo(x, y) { let z = x * y; return z + y - x; }` +
      `let x = foo(2, 3);`,
    startSym: "statement*$",
    expectedOutput: {variables: {
      "#x": [7],
    }},
    testKey: "11",
  });
  testInterpreter(params);


  // Worked, but I need to use StartSym = "script" in order to get exception
  // handling:
  // params = Object.assign({}, defaultParams, {
  //   str: `let x = 0; while(true) { x += 5; }`,
  //   startSym: "statement*$",
  //   expectedOutput: {
  //     msg: "Ran out of computation gas"
  //   },
  //   testKey: "08",
  // });
  // testInterpreter(params);


  console.log("Finished " + testMsgPrefix + ".");
}











function getMissingMember(testObj, propObj, prefix = "") {
  let ret = undefined;
  Object.entries(propObj).some(([key, propObjVal]) => {
    let testObjVal = testObj[key];
    if (typeof propObjVal === "object" && propObjVal !== null) {
      if (typeof testObjVal === "object" && testObjVal !== null) {
        ret = getMissingMember(testObjVal, propObjVal, prefix + "." + key);
        return (ret !== undefined);
      } else {
        ret = key;
        debugger; // Useful to let this debugger statement remain.
        return true;
      }
    } else {
      ret = (testObjVal === propObjVal) ? undefined : key;
      if (ret !== undefined) debugger; // Useful to let this statement remain.
      return (ret !== undefined);
    }
  });
  return ret;
}






function script_parsing_tests_01() {
  let testMsgPrefix = "regEnt_parsing_tests_01";

  console.log("Running " + testMsgPrefix + ":");

  let defaultParams = {
    parser: scriptParser, str: "", startSym: undefined, isPartial: undefined,
    keepLastLexeme: undefined,
    expectedIsSuccess: true, expectedNextPos: null,
    testMsgPrefix: testMsgPrefix, testKey: "",
    logParserOutput: true, logOnlyFailures: true,
    additionalTest: undefined,
  }
  let params;


  params = Object.assign({}, defaultParams, {
    str: `2 + 2`,
    startSym: "expression",
    expectedIsSuccess: true,
    expectedOutput: {res: {
      type: "additive-expression",
      children: [
        {type: "number", lexeme: "2"},
        "+",
        {type: "number", lexeme: "2"},
      ],
    }},
    testKey: "01",
  });
  testParser(params);

  params = Object.assign({}, defaultParams, {
    str: `2 + 2 - 3`,
    startSym: "expression",
    expectedIsSuccess: true,
    expectedOutput: {res: {
      type: "additive-expression",
      children: [
        {type: "number", lexeme: "2"},
        "+",
        {type: "number", lexeme: "2"},
        "-",
        {type: "number", lexeme: "3"},
      ],
    }},
    testKey: "02",
  });
  testParser(params);

  params = Object.assign({}, defaultParams, {
    str: `2 ** 4 / 5 + 2 - (3) + (2 + 2) || true`,
    startSym: "expression",
    expectedIsSuccess: true,
    expectedOutput: {res: {
      type: "or-expression",
      children: [
        {
          type: "additive-expression",
          children: [
            {
              type: "multiplicative-expression",
              children: [
                {
                  type: "exponential-expression",
                  root: {type: "number", lexeme: "2"},
                  exp: {type: "number", lexeme: "4"},
                },
                "/",
                {type: "number", lexeme: "5"},
              ],
            },
            "+",
            {type: "number", lexeme: "2"},
            "-",
            {
              type: "grouped-expression",
              exp: {type: "number", lexeme: "3"},
            },
            "+",
            {
              type: "grouped-expression",
              exp: {
                type: "additive-expression",
                children: [
                  {type: "number", lexeme: "2"},
                  "+",
                  {type: "number", lexeme: "2"},
                ],
              },
            },
          ],
        },
        "||",
        {type: "constant", lexeme: "true"},
      ],
    }},
    testKey: "03",
  });
  testParser(params);

  params = Object.assign({}, defaultParams, {
    str: `let x = 1;`,
    startSym: "statement",
    expectedIsSuccess: true,
    expectedOutput: {res: {
      type: "variable-declaration",
      decType: "definition-list",
      defArr: [
        {
          type: "variable-definition",
          ident: "x",
          exp: {type: "number", lexeme: "1"}
        },
      ],
    }},
    testKey: "04",
  });
  testParser(params);

  params = Object.assign({}, defaultParams, {
    str: `let x = 1, y = 2 + 3, z;`,
    startSym: "statement",
    expectedIsSuccess: true,
    expectedOutput: {res: {
      type: "variable-declaration",
      decType: "definition-list",
      defArr: [
        {
          type: "variable-definition",
          ident: "x",
          exp: {type: "number", lexeme: "1"}
        },
        {
          type: "variable-definition",
          ident: "y",
          exp: {
            type: "additive-expression",
            children: [
              {type: "number", lexeme: "2"},
              "+",
              {type: "number", lexeme: "3"},
            ],
          },
        },
        {
          type: "variable-definition",
          ident: "z",
          exp: undefined,
        },
      ],
    }},
    testKey: "05",
  });
  testParser(params);

  params = Object.assign({}, defaultParams, {
    str: `{ let x = 2; let y = 1; x = 2*x + y; }`,
    startSym: "statement",
    expectedIsSuccess: true,
    expectedOutput: {res: {
      type: "block-statement",
      stmtArr: [
        {type: "variable-declaration"},
        {type: "variable-declaration"},
        {
          type: "expression-statement",
          exp: {
            type: "assignment",
            op: "=",
            exp1: {type: "identifier"},
            exp2: {type: "additive-expression"},
          }
        },
      ],
    }},
    testKey: "06",
  });
  testParser(params);

  params = Object.assign({}, defaultParams, {
    str: `function foo(x, y) { let z = x * y; return z + y; }`,
    startSym: "statement",
    expectedIsSuccess: true,
    expectedOutput: {res: {
      type: "function-declaration",
      name: "foo",
      params: [
        {type: "parameter", ident: "x"},
        {type: "parameter", ident: "y"},
      ],
      body: {stmtArr: [
        {type: "variable-declaration"},
        {type: "return-statement"},
      ]},
    }},
    testKey: "07",
  });
  testParser(params);

  params = Object.assign({}, defaultParams, {
    str: `foo(x, y)(z);`,
    startSym: "statement",
    expectedIsSuccess: true,
    expectedOutput: {res: {
      type: "expression-statement",
      exp: {
        type: "function-call",
        exp: {
          type: "function-call",
          exp: {type: "identifier", ident: "foo"},
          postfix: {type: "expression-tuple", children: [
            {type: "identifier", ident: "x"},
            {type: "identifier", ident: "y"},
          ]}
        },
        postfix: {type: "expression-tuple", children: [
          {type: "identifier", ident: "z"},
        ]}
      }
    }},
    testKey: "08",
  });
  testParser(params);



  console.log("Finished " + testMsgPrefix + ".");
}








// function regEnt_parsing_tests_01() {
//   let testMsgPrefix = "regEnt_parsing_tests_01";

//   console.log("Running " + testMsgPrefix + ":");

//   let defaultParams = {
//     parser: regEntParser, str: "", startSym: undefined, isPartial: undefined,
//     keepLastLexeme: undefined,
//     expectedIsSuccess: true, expectedNextPos: null,
//     testMsgPrefix: testMsgPrefix, testKey: "",
//     logParserOutput: true, logOnlyFailures: true,
//     additionalTest: undefined,
//   }
//   let params;


//   params = Object.assign({}, defaultParams, {
//     str: `12`,
//     expectedIsSuccess: true,
//     expectedOutput: {
//       sym: "literal-list",
//       res: {
//         children: [
//           {type: "number", lexeme: "12"}
//         ]
//       },
//     },
//     testKey: "01"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12, 13`,
//     expectedIsSuccess: true,
//     expectedOutput: {res: {children: [
//       {type: "number", lexeme: "12"},
//       {type: "number", lexeme: "13"}
//     ]}},
//     testKey: "02"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `"Hello, world!"`,
//     expectedIsSuccess: true,
//     expectedOutput: {res: {children: [
//       {type: "string", lexeme: '"Hello, world!"', str: "Hello, world!"},
//     ]}},
//     testKey: "03"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `,`,
//     expectedIsSuccess: false, expectedNextPos: 0,
//     testKey: "04"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `@`,
//     expectedIsSuccess: false, expectedNextPos: undefined, // Lexer error,
//     testKey: "05"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `@[`,
//     expectedIsSuccess: false, expectedNextPos: 1,
//     testKey: "06"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12,`,
//     expectedIsSuccess: false, expectedNextPos: 2,
//     testKey: "07"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12,[`,
//     expectedIsSuccess: false, expectedNextPos: 3,
//     testKey: "08"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `"Hello, world!",@[7],_,false`,
//     expectedIsSuccess: true, expectedNextPos: 9,
//     expectedOutput: {res: {children: [
//       {type: "string", lexeme: '"Hello, world!"'},
//       {type: "entity-reference", id: "7"},
//       {type: "constant", lexeme: "_"},
//       {type: "constant", lexeme: "false"},
//     ]}},
//     testKey: "09"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `"Hello, world!",@[7],_,false,`,
//     expectedIsSuccess: false, expectedNextPos: 10,
//     testKey: "10"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `"Hello, world!",@[7],_,false`,
//     startSym: "literal-list",
//     expectedIsSuccess: true, expectedNextPos: 9,
//     testKey: "11"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `"Hello, world!",@[7],_,false`,
//     startSym: "literal",
//     expectedIsSuccess: false, expectedNextPos: 1,
//     testKey: "12"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `"H`,
//     startSym: "literal",
//     expectedIsSuccess: false, expectedNextPos: 0,
//     testKey: "13"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12`,
//     startSym: "literal",
//     expectedIsSuccess: true, expectedNextPos: 1,
//     testKey: "14"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12`,
//     startSym: "literal",
//     isPartial: true, keepLastLexeme: false,
//     expectedIsSuccess: false, expectedNextPos: 0,
//     testKey: "15"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12`,
//     startSym: "literal",
//     isPartial: true, keepLastLexeme: true,
//     expectedIsSuccess: false, expectedNextPos: 1,
//     testKey: "16"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12`,
//     startSym: "literal+",
//     isPartial: true, keepLastLexeme: true,
//     expectedIsSuccess: false, expectedNextPos: 1,
//     testKey: "17"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12`,
//     isPartial: true, keepLastLexeme: false,
//     expectedIsSuccess: false, expectedNextPos: 0,
//     testKey: "18"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12`,
//     isPartial: true, keepLastLexeme: true,
//     expectedIsSuccess: false, expectedNextPos: 1,
//     testKey: "19"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12,`,
//     isPartial: true, keepLastLexeme: false,
//     expectedIsSuccess: false, expectedNextPos: 1,
//     testKey: "20"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12,@`,
//     isPartial: true, keepLastLexeme: false,
//     expectedIsSuccess: false, expectedNextPos: 2,
//     testKey: "21"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12, "Hello", @[7]!`,
//     expectedIsSuccess: false, expectedNextPos: undefined, // Lexer error.
//     testKey: "22"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12, [13, [14, 15, [16 ,  17]],18]`,
//     expectedIsSuccess: true,
//     expectedOutput: {res: {children: [
//       {type: "number", lexeme: "12"},
//       {type: "array", children: [
//         {type: "number", lexeme: "13"},
//         {type: "array", children: [
//           {type: "number", lexeme: "14"},
//           {type: "number", lexeme: "15"},
//           {type: "array", children: [
//             {type: "number", lexeme: "16"},
//             {type: "number", lexeme: "17"},
//           ]},
//         ]},
//         {type: "number", lexeme: "18"},
//       ]},
//     ]}},
//     testKey: "23"
//   });
//   testParser(params);

//   params = Object.assign({}, defaultParams, {
//     str: `12, {"prop": [13]}, 13`,
//     expectedIsSuccess: true,
//     expectedOutput: {res: {children: [
//       {type: "number", lexeme: "12"},
//       {type: "object", children: [
//         {type: "member", name: "prop", val: {
//           type: "array", children: [
//             {type: "number", lexeme: "13"},
//           ],
//         }},
//       ]},
//       {type: "number", lexeme: "13"},
//     ]}},
//     testKey: "24"
//   });
//   testParser(params);


//   console.log("Finished " + testMsgPrefix + ".");
// }