
import {
  DevFunction, RuntimeError, LoadError,
} from '../../interpreting/ScriptInterpreter.js';
import {parseRoute} from './src/parseRoute.js';

// TODO: Since all these modules are now only used in the backend, refactor
// such that these are attached to the interpreter instead, somehow, similarly
// to interpreter.dbQueryHandler (if not just attaching them to that), such
// they are not bundled with the front-end script.
import * as directoriesMod from "./src/filetypes/directories.js";
import * as textFilesMod from "./src/filetypes/text_files.js";
import * as relationalTableFilesMod from "./src/filetypes/rel_tables.js";
import * as fullTextTableFilesMod from "./src/filetypes/full_text_tables.js";

import {checkAdminPrivileges, checkIfCanPost} from "./src/flags.js";





export const query = new DevFunction(
  "query",
  {isAsync: true, typeArr: ["boolean", "string", "boolean?", "any?", "any?"]},
  async function(
    {callerNode, execEnv, interpreter, liveModule},
    [isPublic, route, isPost = false, postData, options = {}]
  ) {
    isPost = isPublic ? false : isPost;

    // If isPost == true, check if the current environment is allowed to post.
    if (isPost) {
      checkIfCanPost(callerNode, execEnv);
    }

    // Parse the route, extracting parameters and qualities from it.
    let isLocked, upNodeID, homeDirID, filePath, fileExt, queryPathArr;
    try {
    [
      isLocked, upNodeID, homeDirID, filePath, fileExt, queryPathArr
    ] = parseRoute(route);
    }
    catch(errMsg) {
      throw new RuntimeError(errMsg, callerNode, execEnv);
    }
  
    // If the route is locked, check that you have admin privileges on the
    // directory of homeDirID.
    if (isLocked) {
      checkAdminPrivileges(homeDirID, callerNode, execEnv);
    }

    // If on the client side, simply forward the request to the server via the
    // serverQueryHandler.
    if (!interpreter.isServerSide) {
      let result = await interpreter.serverQueryHandler.queryServerFromScript(
        isPublic, route, isPost, postData, options,
        upNodeID, callerNode, execEnv
      );
      return [result];
    }
    
    // Else branch according to the file type and get the right module for
    // handling that file type.
    let filetypeModule;
    let mimeType = "application/json";
    switch (fileExt) {
      case undefined:
        filetypeModule = directoriesMod;
        break;
      case "js":
      case "jsx":
      case "txt":
      case "html":
      case "xml":
      case "svg":
      case "scss":
      case "md":
        // mimeType = "text/plain";
      case "json":
        filetypeModule = textFilesMod;
        break;
      case "att":
      case "bbt":
      case "bt":
      case "ct":
        filetypeModule = relationalTableFilesMod;
        break;
      case "ftt":
        filetypeModule = fullTextTableFilesMod;
        break;
      // (More file types can be added here in the future.)
      default:
        throw new LoadError(`Unrecognized file type: ".${fileExt}"`);
    }

    // Query the database via the filetypeModule, and return the output (which
    // will often be [result, wasReady] (on success) server-side, and will
    // simply be result client-side).
    let result = await filetypeModule.query(
      {callerNode, execEnv, interpreter, liveModule},
      route, isPost, postData, options,
      upNodeID, homeDirID, filePath, fileExt, queryPathArr,
    );
    return [result, mimeType];
  }
);



export const fetch = new DevFunction(
  "fetch", {isAsync: true, typeArr: ["string", "boolean?", "any?"]},
  async function(
    {callerNode, execEnv, interpreter},
    [route, isPublic = true, options]
  ) {
    let [result] = await query.fun(
      {callerNode, execEnv, interpreter},
      [isPublic, route, false, undefined, options],
    ) ?? [];
    return result;
  }
);


export const post = new DevFunction(
  "post", {isAsync: true, typeArr: ["string", "any?", "any?"]},
  async function(
    {callerNode, execEnv, interpreter},
    [route, postData, options]
  ) {
    let [result] = await query.fun(
      {callerNode, execEnv, interpreter},
      [false, route, true, postData, options],
    ) ?? [];
    return result;
  }
);



export const getCurrentHomePath = new DevFunction(
  "getCurrentHomePath", {},
  function({execEnv}, []) {
    let curRoute = execEnv.getModuleEnv().modulePath ?? "";
    let [ret] = curRoute.match(/^\/[^/]+\/[^/]+/g) ?? [];
    return ret; 
  }
);