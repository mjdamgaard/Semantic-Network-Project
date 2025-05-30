
import * as http from 'http';
import fs from 'fs';
import path from 'path';
// import * as process from 'process';

import {ClientError, endWithError, endWithInternalError} from './err/errors.js';
import {ScriptInterpreter} from "../interpreting/ScriptInterpreter.js";
import {DBQueryHandler} from "./db_io/DBQueryHandler.js";
import {scriptParser} from "../interpreting/parsing/ScriptParser.js";

import {ELEVATED_PRIVILEGES_FLAG} from "../dev_lib/server/src/signals.js";

import * as serverMod from "../dev_lib/server/server.js";

const staticDevLibs = new Map();
staticDevLibs.set("server", serverMod);


const [ , curPath] = process.argv;
const mainScriptPath = path.normalize(
  path.dirname(curPath) + "/main_script/main.js"
);
const mainScript = fs.readFileSync(mainScriptPath, "utf8");

const [syntaxTree, lexArr, strPosArr] = scriptParser.parse(mainScript);
const parsedMainScript = syntaxTree.res;
const dbQueryHandler = new DBQueryHandler();

const scriptInterpreter = new ScriptInterpreter(
  true, undefined, dbQueryHandler, staticDevLibs, undefined
);

// Locked routes are all routes where any file name, directory name, or
// query string property name starts with a tilde (~), or if a file or
// directory name contains an occurrence of '&~'. 
const LOCKED_ROUTE_REGEX = /[&/]~/;




http.createServer(async function(req, res) {
  try {
    await requestHandler(req, res);
  }
  catch (err) {
    if (err instanceof ClientError) {
      endWithError(res, err);
    }
    else {
      endWithInternalError(res, err);
    }
  }
}).listen(8080);




async function requestHandler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");

  // At this point, the server only implements POST requests where most of the
  // parameters are stored in a JSON object.
  let data;
  if (req.method === "POST") {
    data = await getData(req);
  }
  else if (req.method !== "GET") {
    throw new ClientError(
      "Server only accepts the POST or GET methods"
    );
  }
  else {
    throw new ClientError(
      "Server does not implement the GET method yet"
    );
  }

  // First get and parse the request params.
  let reqParams, isValidJSON = true;
  try {
    reqParams = JSON.parse(data);
  }
  catch (err) {
    isValidJSON = false;
  }
  if (!isValidJSON || !reqParams || typeof reqParams !== "object") {
    throw new ClientError(
      "Post body was not a JSON object"
    );
  }

  // Then extract the parameters from it.
  let {
    // Get the optional user credentials (username and password/token).
    credentials,
    // Get the 'method', and the optional postData parameter (used when
    // method == "post").
    method = "fetch", postData,
    // Get the optional maxAge, noCache, and lastUpToDate parameters used by
    // caches.
    maxAge, noCache, lastUpToDate,
    // Get the optional gasID and a initFlagsID, which points to a gas
    // and a initFlags object, respectively, which can both influence
    // whether the script succeeds or fails (but don't change the result on a
    // success).
    gasID, initFlagsID,
    // Get the returnLog boolean, which if not present means that the script's
    // result will be returned on its own, without the log (which might be
    // empty anyway).
    returnLog,
  } = reqParams;

  if (!method) throw new ClientError(
    "No 'method' parameter was specified in the POST body"
  );

  // And get the "route" from the URL, which is an extended path that points to
  // the file or directory that is the target of the request.
  let route = req.url;


  // Get the userID of the requesting user, if the user has supplied their
  // credentials to the request, failing if those credentials couldn't be
  // authenticated. Also get the gas for the request in the same process.
  let [gas, reqUserID] = await getGasAndReqUserID(credentials, gasID);


  // Parse whether the route is a "locked" route (that can only be accessed by
  // the admin, if any, or by a server module method (SMM) of that directory).
  // These are all paths where a 
  let isLocked = LOCKED_ROUTE_REGEX.test(route);

  // TODO: If the route it locked, get the adminID of the homeDir, and verify
  // that reqUser is the admin, then initialize initFlags with a
  // SET_ELEVATED_PRIVILEGES_SIGNAL on homeDirID. And if the route is not
  // locked, initialize an empty initFlags array.
  let initFlags = [[ELEVATED_PRIVILEGES_FLAG, route[1]]];


  // Call the main.js script which redirects to the query() dev function, whose
  // arguments are: method, route, postData, maxAge, noCache, and lastUpToDate.
  let parsedScripts = new Map([
    ["main.js", [parsedMainScript, lexArr, strPosArr, mainScript]]
  ]);
  let [output, log] = await scriptInterpreter.interpretScript(
    gas, undefined, "main.js",
    [method, route, postData, maxAge, noCache, lastUpToDate, undefined],
    reqUserID, initFlags, undefined, undefined, parsedScripts,
  );
  let [result, wasReady] = output ?? [];


  // If the script logged an error, set an error status and write back the
  // stringified log to the client.
  if (log.error) {
    // TODO: Parse and reformat log hee, before handing it to JSON.stringify().
      endWithError(res, log.error);
  }

  // Else if returnLog is true, write back an array containing the result,
  // wasReady, and also the log.
  else if (returnLog) {
    // TODO: parse result first.
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end(JSON.stringify([result, log, wasReady]));
  }

  // TODO: Comment this in again, and implement it in both ends. Also add
  // a(nother) todo about using an 'Accepted' status code to signal the client
  // to try again but with user credentials added to the request (such that the
  // user's own gas will be used, thus mitigating DoS attacks). 
  // // Else if wasReady is true, write back a 204 No Content response.
  // else if (wasReady) {
  //   res.writeHead(204);
  //   res.end("");
  // }

  // And else simply write back the stringified [result, wasReady].
  else {
    // TODO: parse result first.
    res.writeHead(200, {'Content-Type': 'text/json'});
    res.end(JSON.stringify([result, wasReady]));
  }

}







async function getGasAndReqUserID(credentials) {
  let username, password;
  // TODO...
  return [{
    comp: 100000,
    import: 100,
    fetch: 100,
    time: 3000,
    // time: Infinity,
    dbRead: 100,
    dbWrite: 10000,
    cacheRead: 100,
    cacheWrite: 100,
  }];
}




function getDataChunksPromise(req) {
  return new Promise((resolve, reject) => {
      let chunks = [];
      let size = 0;
      req.on('data', chunk => {
        chunks.push(chunk);
        size += chunk.length ?? chunk.size;
        if (size > 10000) reject(
          new ClientError("Post data maximum size exceeded")
        );
      });
      req.on('end', () => {
          resolve(chunks);
      });
  });
}


async function getData(req) {
  let chunks = await getDataChunksPromise(req);

  // TODO: Implement returning a string only if chunks are UFT-8 string parts,
  // and not binary data chunks, in which case return something like a Buffer.
  return chunks.reduce(
    (acc, val) => acc + val.toString(),
    ""
  ); 
}
