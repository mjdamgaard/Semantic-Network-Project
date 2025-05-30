
import {serverDomainURL} from "./config.js";
import {payGas} from "../../interpreting/ScriptInterpreter.js";


// Cache placeholder:
const clientCache = {
  get: () => {}, set: () => {}, remove: () => {}, removeExtensions: () => {},
};




export class ServerQueryHandler {

  #postReqBuffer = new Map();

  post(route, reqData) {
      let reqKey = JSON.stringify(reqData);

      // If there is already an ongoing request with this reqData object,
      // simply return the promise of that.
      let responsePromise = this.#postReqBuffer.get(reqKey);
      if (responsePromise) {
        return responsePromise;
      }

      // Else send the request to the server and create the new response text
      // promise.
      let url = serverDomainURL + route;
      // let credentials = btoa(`${username}:${password}`)
      responsePromise = postData(url, reqData);

      // Then add it to #postReqBuffer, and also give it a then-callback to
      // remove itself from said buffer, before return ing the promise.
      this.#postReqBuffer.set(reqKey, responsePromise);
      responsePromise.then(() => {
        this.#postReqBuffer.delete(reqKey);
      });
      return responsePromise;
  }



  // queryServerOrCache() handles a lot of common queries, namely where the
  // whole result is stored directly at the route in the cache, or simply not
  // cached at all, namely when the noCache parameter is truthy.
  async queryServerOrCache(
    isPost, route, upNodeID, maxAge, noCache = isPost, onCached, interpreter,
    node, env, routesToEvict,
  ) {
    // If noCache is falsy, look in the cache first.
    let cachedResult, fetchedResult, wasReady, lastUpToDate, now;
    if (!noCache) {
      payGas(node, env, {cacheRead: 1});
      now = Date.now();
      [cachedResult, lastUpToDate] = clientCache.get(route) ?? [];
      if (cachedResult !== undefined) {
        // If the resource was cached, check if it is still considered fresh
        // according to the maxAge argument, and if so return the result.
        let isFresh = now - lastUpToDate <= maxAge;
        if (isFresh) {
          return cachedResult;
        }
        // Else if not fresh, we still continue to query the server, but first
        // we call onCached() right away if provided.
        else if (onCached !== undefined) {
          interpreter.executeFunction(onCached, [cachedResult], node, env);
        }
      }
    }

    // Query the server for [result, wasReady]. (TODO: Make the dbRead cost
    // depend on the size of the result list, perhaps divided by 1000, or
    // something like that, and then rounded up.)
    payGas(node, env, {fetch: 1});
    let reqData = {};
    if (isPost) {
      reqData.method = "post";
      let {reqUserID} = env.scriptVars;
      let token = "TODO: Implement.";
      reqData.credentials = btoa(`${reqUserID}:${token}`);
    }
    else if (noCache) {
      reqData.noCache = true;
    }
    if (maxAge !== undefined) reqData.maxAge = maxAge;
    if (lastUpToDate) reqData.lastUpToDate = lastUpToDate;
    [fetchedResult, wasReady] = await this.post(route, reqData) ?? [];

    // If the cachedResult was already up-to-date, use the cachedResult going
    // forward, and if not, use the fetched result.
    let result = wasReady ? cachedResult : fetchedResult;
  
    // If noCache is not truthy, we also update the cache.
    if (!noCache) {
      payGas(node, env, {cacheWrite: 1});
      lastUpToDate = now;
      clientCache.set(route, [result, lastUpToDate]);
    }

    // If routesToEvict is defined, it means that the query modifies the
    // database, and therefore should also evict previously stored results in
    // the cache (at least when the query is expected to potentially out-date
    // some cache entries).
    if (routesToEvict) {
      if (!noCache) throw (
        "ServerQueryHandler.queryServerOrCache(): routesToEvict must not be " +
        "used with a falsy noCache"
      )
      routesToEvict.forEach(route => {
        // If a route entry in the array is not a string, treat it as a route--
        // removeExtensions pair, where if removeExtensions is true, it means
        // that all routes that are extensions of route should also be removed.
        let removeExtensions = false; 
        if (typeof route !== "string") {
          [route, removeExtensions] = route;
        }
        if (removeExtensions) {
          clientCache.removeExtensions(route);
        }
        clientCache.remove(route);
      });
    }

    // And finally, return the result (either cached or fetched).
    return result;
  }



  // fetchScript(filePath, credentials) {
  //   if(filePath.slice(-3) !== ".js") throw (
  //     'Expected a script file name with the extension ".js", but got ' +
  //     `"${filePath}"`
  //   );
  //   return this.queryServerOrCache(
  //     false, filePath, credentials, "..."
  //   )
  // }

}







export async function postData(url, reqData) {
  let options = {
    method: "POST",
    body: JSON.stringify(reqData),
  };

  let response = await fetch(url, options);

  if (!response.ok) {
    response.text().then(responseText => {
      throw (
        "HTTP error " + response.status +
        (responseText ? ": " + responseText : "")
      );
    });
    return;
  }
  else {
    let result = await response.text();
    return JSON.parse(result);
  }
}

