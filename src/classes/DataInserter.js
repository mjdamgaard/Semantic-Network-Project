
import {DBRequestManager} from "./DBRequestManager.js";

import {basicEntIDs} from "../entity_ids/basic_entity_ids.js";
import {DataFetcher, getScaleDefStr} from "./DataFetcher.js";
import {ParallelCallbackHandler} from "./ParallelCallbackHandler.js";


const WORKSPACES_CLASS_ID = basicEntIDs["workspaces"];

const STANDARD_EDITING_DAYS = 100; // TODO: Reduce before going beta.

export class DataInserter {

  constructor(getAccountData, workspaceEntID) {
    this.getAccountData = getAccountData;
    this.workspaceEntID = workspaceEntID;
    this.workspaceObj = {};
  }

  fetchWorkspaceObject(callback = () => {}) {
    DataFetcher.fetchObject(this.getAccountData, this.workspaceEntID, obj => {
      this.workspaceObj = (obj ?? {})["Workspace object"] ?? {};
      callback(obj);
    });
  }

  updateWorkspace(callback) {
    if (!callback) {
      callback = () => {};
    }
    if (!this.workspaceObj) {
      return;
    }
    let reqData = {
      req: "editJSONEnt",
      ses: this.getAccountData("sesIDHex"),
      u: this.getAccountData("userID"),
      e: this.workspaceEntID,
      def: JSON.stringify(this.workspaceObj),
      prv: 1,
      a: 0,
      days: 0,
    };
    DBRequestManager.insert(reqData, (responseText) => {
      if (responseText === null) {
        throw "Abort: Workspace was not updated.";
      }
      let result = JSON.parse(responseText);
      callback(result.outID, result.exitCode);
    });
  }

  createWorkspace(callback) {
    if (!callback) {
      callback = () => {};
    }
    let reqData = {
      req: "jsonEnt",
      ses: this.getAccountData("sesIDHex"),
      u: this.getAccountData("userID"),
      def: JSON.stringify(this.workspaceObj),
      prv: 1,
      a: 0,
      days: 0,
    };
    DBRequestManager.insert(reqData, (responseText) => {
      if (responseText === null) {
        throw "Abort: Workspace was not created.";
      }
      let result = JSON.parse(responseText);
      this.workspaceEntID = result.outID.toString();
      callback(result.outID, result.exitCode);
    });
  }


  addExistingEntityToWorkspace(path, entID) {
    // Get or set the relevant node from path, then insert entID at this
    // potentially newly created node.
    let targetNode = this.#getOrSetNodeFromPath(path);
    targetNode[0] = {
      entID: entID.toString(),
      c: null, // 'c' for 'children.'
    }
  }

  #getOrSetNodeFromPath(path) {
    let pathParts = path.split("/");
    var wsObj = this.workspaceObj;
    var targetNode;
    // First create all required nodes in the workspace, and finish by having
    // targetNode be the last node where entID is supposed to be inserted. 
    pathParts.forEach(pathPart => {
      if (!wsObj[pathPart]) {
        wsObj[pathPart] = [null, {}];
      }
      targetNode = wsObj[pathPart];
      wsObj = wsObj[pathPart][1];
    });
    return targetNode;
  }

  #getNodeFromPath(path) {
    let pathParts = path.split("/");
    var wsObj = this.workspaceObj;
    var targetNode;
    // Find the node pointed to by path, or return the match unchanged if
    // this does not exist.
    pathParts.forEach(pathPart => {
      if (!wsObj[pathPart]) {
        targetNode = null;
        return;
      }
      targetNode = wsObj[pathPart];
      wsObj = wsObj[pathPart][1];
    });
    return targetNode;
  }

  getEntIDFromPath(path) {
    let targetNode = this.#getNodeFromPath(path);
    if (!targetNode || !targetNode[0]) {
      return;
    }
    else {
      return targetNode[0].entID;
    }
  }



  insertEntity(
    path, datatype, defStr,
    isAnonymous = 0, isPrivate = 0, isEditable = 1, callback = () => {}
  ) {
    let req =
      (datatype === "f") ? "funEnt" :
      (datatype === "c") ? "callEnt" :
      (datatype === "a") ? "attrEnt" :
      (datatype === "u") ? "utf8Ent" :
      (datatype === "h") ? "htmlEnt" :
      (datatype === "j") ? "jsonEnt" :
      "unrecognized datatype";
    let reqData = {
      req: req,
      ses: this.getAccountData("sesIDHex"),
      u: isAnonymous ? 0 : this.getAccountData("userID"),
      def: defStr,
      prv: isPrivate,
      a: isAnonymous,
      days: isEditable ? STANDARD_EDITING_DAYS : 0,
    };
    DBRequestManager.insert(reqData, (responseText) => {
      if (responseText === null) {
        callback(null);
        return;
      }
      let result = JSON.parse(responseText);
      if (parseInt(result.exitCode) >= 2) {
        callback(result.outID, result.exitCode);
        return;
      }
      // If path is provided, get or set the relevant node from path, then
      // insert entID at this potentially newly created node.
      if (path) {
        let targetNode = this.#getOrSetNodeFromPath(path);
        targetNode[0] = {
          entID: result.outID.toString(),
          c: isAnonymous ? 0 : this.getAccountData("userID"),
          prv: isAnonymous ? undefined : isPrivate,
          ed: isAnonymous ? undefined : isPrivate ? undefined : isEditable,
        };
      }
      callback(result.outID, result.exitCode);
    });
  }

  insertParsedEntity(
    path, datatype, defStr, isAnonymous, isPrivate, isEditable, callback
  ) {
    defStr = this.parseDefStr(defStr);
    this.insertEntity(
      path, datatype, defStr, isAnonymous, isPrivate, isEditable,
      callback
    );
  }


  parseDefStr(str) {
    return str.replaceAll(/@(@@)*\[[^\]\]]*\]/g, match => {
      let ats = match.match(/^@+/g)[0];
      let bracket = match.substring(ats.length);
      // Find the entID pointed to by path, or return the match unchanged if
      // this does not exist.
      let path = bracket.slice(1, -1);
      let entID = this.getEntIDFromPath(path);
      return entID ? (ats + entID) : match;
    });
  }

  insertOrEditEntity(
    path, datatype, defStr,
    isAnonymous = 0, isPrivate = 0, isEditable = 1, callback = () => {}
  ) {
    // If an entID is not already recorded at path, simply insert a new entity.
    let entID = this.getEntIDFromPath(path);
    if (!entID) {
      this.insertEntity(
        path, datatype, defStr, isAnonymous, isPrivate, isEditable, callback
      );
      return;
    }
    // Else edit the given entity.
    let req =
      (datatype === "f") ? "editFunEnt" :
      (datatype === "c") ? "editCallEnt" :
      (datatype === "a") ? "editAttrEnt" :
      (datatype === "u") ? "editUTF8Ent" :
      (datatype === "h") ? "editHTMLEnt" :
      (datatype === "j") ? "editJSONEnt" :
      "unrecognized datatype";
    let reqData = {
      req: req,
      ses: this.getAccountData("sesIDHex"),
      u: isAnonymous ? 0 : this.getAccountData("userID"),
      e: entID,
      def: defStr,
      prv: isPrivate,
      a: isAnonymous,
      days: isEditable ? STANDARD_EDITING_DAYS : 0,
    };
    DBRequestManager.insert(reqData, (responseText) => {
      if (responseText === null) {
        callback(null);
        return;
      }
      let result = JSON.parse(responseText);
      if (parseInt(result.exitCode) >= 2) {
        callback(result.outID, result.exitCode);
        return;
      }
      // Get or set the relevant node from path, then insert entID at this
      // potentially newly created node.
      let targetNode = this.#getOrSetNodeFromPath(path);
      targetNode[0] = {
        entID: result.outID.toString(),
        c: result.exitCode == "1" ? null :
          isAnonymous ? 0 : this.getAccountData("userID"),
        prv: isAnonymous ? undefined : isPrivate,
        ed: isAnonymous ? undefined : isPrivate ? undefined : isEditable,
      };
      callback(result.outID, result.exitCode);
    });
  }


  insertOrEditParsedEntity(
    path, datatype, defStr, isAnonymous, isPrivate, isEditable, callback
  ) {
    defStr = this.parseDefStr(defStr);
    this.insertOrEditEntity(
      path, datatype, defStr, isAnonymous, isPrivate, isEditable, callback
    );
  }




  insertOrFindScale(scaleKey, callback) {
    scaleKey = scaleKey.map(val => {
      if (parseInt(val) > 0) {
        return val;
      }
      else {
        return this.getEntIDFromPath(val);
      }
    });
    if (!scaleKey.reduce((acc, val) => acc && val)) {
      return;
    }
    let scaleDefStr = getScaleDefStr(...scaleKey);
    this.insertEntity(
      "", "j", scaleDefStr,
      1, 0, 0, 1,
      (outID, exitCode) => callback(outID, exitCode)
    );
  }



  addEntitiesToListFromScaleID(
    scaleID, PathScorePairArr, callback = () => {}
  ) {
    let parallelCallbackHandler = new ParallelCallbackHandler;
    let results = [];

    PathScorePairArr.forEach((pathScorePair, ind) => {
      parallelCallbackHandler.push((resolve) => {
        let entPath = pathScorePair[0];
        let scoreVal = pathScorePair[1];
        let entID = this.getEntIDFromPath(entPath);
        if (!entID) {
          return;
        }
        let reqData = {
          req: "score",
          ses: this.getAccountData("sesIDHex"),
          u: this.getAccountData("userID"),
          s: scaleID,
          e: entID,
          v: scoreVal,
        };
        DBRequestManager.insert(reqData, (result) => {
          results[ind] = result;
          resolve();
        });
      });
    });

    parallelCallbackHandler.execAndThen(() => {
      callback(results);
    });
  }

  addEntitiesToListFromScalePath(scalePath, PathScorePairArr, callback) {
    let scaleID = this.getEntIDFromPath(scalePath);
    if (!scaleID) {
      return;
    }
    this.addEntitiesToListFromScaleID(scaleID, PathScorePairArr, callback);
  }


  addEntitiesToListFromScaleKey(scaleKey, PathScorePairArr, callback) {
    this.insertOrFindScale(scaleKey, (outID, exitCode) => {
      if (parseInt(exitCode) <= 1) {
        this.addEntitiesToListFromScaleID(outID, PathScorePairArr, callback);
      }
    });
  }



}
