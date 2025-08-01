
import {
  DevFunction, JSXElement, LiveJSModule, RuntimeError, getExtendedErrorMsg,
  getString, ObjectObject, forEachValue, CLEAR_FLAG, PromiseObject,
  OBJECT_PROTOTYPE, ArgTypeError, Environment, getPrototypeOf, ARRAY_PROTOTYPE,
  FunctionObject, Exception, getStringOrSymbol, getPropertyFromObject,
} from "../../interpreting/ScriptInterpreter.js";
import {
  CAN_POST_FLAG, CLIENT_TRUST_FLAG, REQUESTING_COMPONENT_FLAG
} from "../query/src/flags.js";

const CLASS_NAME_REGEX = /^ *([a-z][a-z0-9\-]* *)*$/;


export const CAN_CREATE_APP_FLAG = Symbol("can-create-app");

// export const APP_COMPONENT_PATH_FLAG = Symbol("app-component-path");
// export const COMPONENT_INSTANCE_FLAG = Symbol("component-instance");




// createJSXApp() creates a JSX (React-like) app and mounts it in the index
// HTML page, in the element with the id of "up-app-root".
export const createJSXApp = new DevFunction(
  "createJSXApp",
  {isAsync: true, typeArr:["module", "object?", "Settings"]},
  async function(
    {callerNode, execEnv, interpreter}, [appComponent, props = {}, settings]
  ) {
    // Check if the caller is allowed to create an app from in the current
    // environment.
    if (!execEnv.getFlag(CAN_CREATE_APP_FLAG)) throw new RuntimeError(
      "Cannot create a new the app from here",
      callerNode, execEnv
    );

    // Create a new environment clearing the CAN_CREATE_APP_FLAG (as well as
    // other flags.)
    let appEnv = new Environment(execEnv, undefined, {flags: [CLEAR_FLAG]});

    // Get the userID if the user is logged in and call settings.initiate() in
    // order to make any initial user-dependent preparations fro the settings
    // object from getSettings(). Note that the settings object extend the
    // (abstract) SettingsObject class declared below.
    let userID = getUserID();
    await settings.initiate(userID, appComponent, callerNode, appEnv);

    // Then create the app's root component instance, and before rendering it,
    // add some props for getting user data and URL data, and pushing/replacing
    // a new browser session history state, to it.
    let rootInstance = new JSXInstance(
      appComponent, "root", undefined, callerNode, appEnv, settings
    );
    props = addUserRelatedProps(
      props, rootInstance, interpreter, callerNode, appEnv
    );
    props = addURLRelatedProps(
      props, rootInstance, interpreter, callerNode, appEnv
    );

    // Then render the root instance and insert it into the document.
    let rootParent = document.getElementById("up-app-root");
    let appNode = rootInstance.render(
      props, false, interpreter, callerNode, appEnv, false, true, true
    );
    rootParent.replaceChildren(appNode);
  }
);







class JSXInstance {

  constructor (
    componentModule, key, parentInstance = undefined, callerNode, callerEnv,
    settings = undefined,
  ) {
    if (!(componentModule instanceof LiveJSModule)) throw new RuntimeError(
      "JSX component needs to be an imported module namespace object",
      callerNode, callerEnv
    );
    this.componentModule = componentModule;
    this.key = getString(key, callerNode, callerEnv);
    this.parentInstance = parentInstance;
    this.settings = settings ?? parentInstance.settings;
    this.settingsData = {}; // Reserved property handled purely by settings.
    this.domNode = undefined;
    this.isDecorated = undefined;
    this.childInstances = new Map();
    this.props = undefined;
    this.state = undefined;
    this.refs = undefined;
    this.contextProvisions = undefined;
    this.contextSubscriptions = undefined;
    this.callerNode = callerNode;
    this.callerEnv = callerEnv;
    this.isDiscarded = undefined;
    this.rerenderPromise = undefined;
  }

  get componentPath() {
    return this.componentModule.modulePath;
  }


  render(
    props = {}, isDecorated, interpreter, callerNode, callerEnv,
    replaceSelf = true, force = false,
  ) {
    this.isDecorated = isDecorated;
    this.callerNode = callerNode;
    this.callerEnv = callerEnv;

    // Return early if the props are the same as on the last render, and if the
    // instance is not forced to rerender.
    if (
      !force && this.props !== undefined &&
      deepCompareExceptMutableAndRefs(props, this.props)
    ) {
      return this.domNode;
    }

    // Record the props. And on the first render only, initialize the state,
    // and record the refs as well (which cannot be changed by a subsequent
    // render).
    this.props = props;
    let state;
    if (this.state === undefined) {
      // Get the initial state if the component module declares one, which is
      // done either by exporting a 'getInitState()' function, or a constant
      // object called 'initState'.
      let getInitState = this.componentModule.get("getInitState");
      if (getInitState) {
        try {
          state = interpreter.executeFunction(
            getInitState, [props], callerNode, callerEnv, undefined,
            [CLEAR_FLAG],
          );
        }
        catch (err) {
          return this.getFailedComponentDOMNode(err, replaceSelf);
        }
      } else {
        state = this.componentModule.get("initState");
      }
      this.state = state ?? {};

      // And store the refs object.
      this.refs = props["refs"] ?? {};
    }


    // Call settings.prepareInstance() to prepare the other methods of settings
    // for this instance, in particular transformInstance(), used below.
    // prepareInstance(), like any other methods of settings, is allowed to
    // read and write to the 'settingsData' property of this JSXInstance.
    // prepareInstance() returns a whenReady value which is a promise if and
    // only if the the instance has not been prepared yet. That promise will
    // then resolve once the instance is finally prepared, which means that we
    // can queue a rerender here when that happens.
    let [
      isReady, whenReady, renderBeforeReady = false
    ] = this.settings.prepareInstance(this, callerNode, callerEnv);
    if (!isReady) {
      whenReady.then(() => this.queueRerender(interpreter));
      if (!renderBeforeReady) {
        let newDOMNode = document.createElement("template");
        newDOMNode.setAttribute("class", "_pending-settings");
        this.replaceDOMNode(newDOMNode, replaceSelf);
        return newDOMNode;
      }

    }

    // Call settings.getClientTrust() to get a boolean of whether the client
    // trusts this instance to override CORS-like server module checks. And use
    // this to create a new environment, with or without the "client-trust"
    // flag. Note that if the instance is not yet prepared, getClientTrust()
    // might just return false temporarily, and wait for the rerender. Similarly
    // call settings.getRequestOrigin() to get the a component path (not
    // necessarily that of the current component) which can also used in CORS-
    // lie checks by the server modules.
    let isTrusted = this.settings.getClientTrust(
      this, callerNode, callerEnv
    );
    let requestOrigin = this.settings.getRequestOrigin(
      this, callerNode, callerEnv
    );
    let compEnv = new Environment(callerEnv, undefined, {flags: [
      CLEAR_FLAG,
      [CLIENT_TRUST_FLAG, isTrusted],
      [REQUESTING_COMPONENT_FLAG, requestOrigin],
    ]});


    // Then get the component module's render() function.
    let renderFun = this.componentModule.get("render") ??
      this.componentModule.get("default");
    if (!renderFun) {
      return this.getFailedComponentDOMNode(
        new RuntimeError(
          'Component module is missing a render() function at "' +
          this.componentPath + '"',
          callerNode, compEnv
        ),
        replaceSelf
      );
    }

    // Initialize a marks Map to keep track of which existing child instances
    // was used or created in the render, such that instances that are no
    // longer used can be removed afterwards.
    let marks = new Map();

    // Now call the component module's render() function, but catch and instead
    // log any error, rather than letting the whole app fail.
    let jsxElement;
    try {
      jsxElement = interpreter.executeFunction(
        renderFun, [props], callerNode, compEnv, new JSXInstanceInterface(this)
      );
    }
    catch (err) {
      return this.getFailedComponentDOMNode(err, replaceSelf);
    }

    // If a JSXElement was successfully returned, call getDOMNode() to generate
    // the instance's new DOM node, unless render() is a dev function that
    // returns a DOM node directly, wrapped in the DOMNodeWrapper class
    // defined below, in which case just use that DOM node. getDOMNode() will
    // also fill out the ownDOMNodes array, which will include all the DOM
    // elements of the component instance that is not part of a child instance. 
    let newDOMNode, ownDOMNodes = [];
    if (jsxElement instanceof DOMNodeObject) {
      newDOMNode = jsxElement.domNode;
    }
    else {
      try {
        newDOMNode = this.getDOMNode(
          jsxElement, marks, interpreter, callerNode, compEnv, ownDOMNodes
        );
      }
      catch (err) {
        return this.getFailedComponentDOMNode(err, replaceSelf);
      }
    }

    // Then remove any existing child instances that wasn't marked during the
    // execution of getDOMNode().
    this.childInstances.forEach((_, key, map) => {
      if (!marks.get(key)) {
        map.get(key).dismount();
        map.delete(key);
      }
    });

    // If replaceSelf is true, replace the previous DOM node with the new one
    // in the DOM tree. Also call updateDecoratingAncestors() to update the
    // this.domNode property of any potential decorating ancestor (i.e. one
    // that shares the same DOM node as this one).
    if (replaceSelf) {
      this.domNode.replaceWith(newDOMNode);
      this.updateDecoratingAncestors(newDOMNode);
    }
    this.domNode = newDOMNode;


    // If the instance is not prepared yet, meaning that the style might not be
    // ready, add a "_pending-settings" class to the DOM node while waiting for
    // the rerender. (Note that the underscore here is meant to make it possible
    // for "trusted" style sheets to style the class.)
    if (!isReady) {
      newDOMNode.classList.add("_pending-settings");
    }

    // Also add a "this_" class to the node, which is equivalent of
    // automatically adding a "this" class to the the className property to the
    // outer node of all JSXElements returned by render (except for decorators).
    newDOMNode.classList.add("this_");

    // And before returning the new DOM node, call settings.transformInstance()
    // in order to transform the DOM node, in particular for applying style to
    // it (by giving it classes and/or inline styles). Note if this method has
    // not yet been prepared for the instance, it will just do nothing, and
    // wait for the rerender.
    this.settings.transformInstance(
      this, newDOMNode, ownDOMNodes, callerNode, compEnv
    );

    // Finally, return the instance's new DOM node.
    return newDOMNode;
  }



  getFailedComponentDOMNode(error, replaceSelf) {
    if (error instanceof Exception) {
      console.error(getExtendedErrorMsg(error));
      let newDOMNode = document.createElement("span");
      newDOMNode.setAttribute("class", "_failed");
      this.replaceDOMNode(newDOMNode, replaceSelf);
      return newDOMNode;
    }
    else {
      console.error(error);
    }
  }

  replaceDOMNode(newDOMNode, replaceSelf) {
    this.childInstances.forEach(child => child.dismount());
    this.childInstances = new Map();
    if (replaceSelf && this.domNode) {
      this.domNode.replaceWith(newDOMNode);
      this.updateDecoratingAncestors(newDOMNode);
    }
    this.domNode = newDOMNode;
  }

  updateDecoratingAncestors(newDOMNode) {
    if (this.isDecorated) {
      this.parentInstance.domNode = newDOMNode;
      this.parentInstance.updateDecoratingAncestors(newDOMNode);
    }
  }

  dismount() {
    this.childInstances.forEach(child => {
      child.dismount();
    });
    this.unsubscribeFromAllContexts();
    this.isDiscarded = true;
  }




  getDOMNode(
    jsxElement, marks, interpreter, callerNode, callerEnv,
    ownDOMNodes, isOuterElement = true
  ) {
    // If jsxElement is not a JSXElement instance, return a string derived from
    // JSXElement, except if it is an outer element, in which case wrap it in
    // a span element.
    let isArray = jsxElement instanceof Array;
    if (!(jsxElement instanceof JSXElement) && !isArray) {
      if (isOuterElement) {
        let newDOMNode = document.createElement("span");
        if (jsxElement !== undefined) newDOMNode.append(
          getString(jsxElement, callerNode, callerEnv)
        );
        return newDOMNode;
      }
      else return getString(jsxElement, callerNode, callerEnv);
    }

    // If jsxElement is a fragment, we render each of its children individually,
    // and return an array of all these values, some of which are DOM nodes and
    // some of which are strings. This is unless the element is an outer one,
    // in which case we wrap it in a div element.
    if (jsxElement.isFragment || isArray) {
      let children = isArray ? jsxElement : jsxElement.props["children"] ?? [];
      let ret = children.map(val => (
        this.getDOMNode(
          val, marks, interpreter, callerNode, callerEnv,
          ownDOMNodes, false
        )
      ));
      if (isOuterElement) {
        let newDOMNode = document.createElement("div");
        if (jsxElement !== undefined) newDOMNode.append(...children);
        return newDOMNode;
      }
      else return ret;
    }

    // If componentModule is defined, render the component instance.
    let componentModule = jsxElement.componentModule;
    if (componentModule) {
      // First we check if the childInstances to see if the child component
      // instance already exists, and if not, create a new one. In both cases,
      // we also make sure to mark the childInstance as being used.
      let key = getString(jsxElement.key, callerNode, callerEnv);
      if (marks.get(key)) throw new RuntimeError(
        `Key "${key}" is already being used by another child component ` +
        "instance",
        jsxElement.node, jsxElement.decEnv
      );
      let childInstance = this.childInstances.get(key);
      if (
        !childInstance ||
        childInstance.componentPath !== componentModule.modulePath
      ) {
        childInstance = new JSXInstance(
          componentModule, key, this, jsxElement.node, jsxElement.decEnv
        );
        this.childInstances.set(key, childInstance);
      }
      marks.set(key, true);

      // Then we call childInstance.render() to render/rerender (if its props
      // have changed) the child instance and get its DOM node, which can be
      // returned straightaway. In order to get better error reporting, we also
      // create an intermediate environment such that it will appear as if the
      // render() function is called from the JSXElement itself, as if it were
      // a callback function.
      let childEnv = new Environment(
        jsxElement.decEnv, "function", {
          fun: {}, callerNode: callerNode, callerEnv: callerEnv,
        }
      );
      return childInstance.render(
        jsxElement.props, isOuterElement, interpreter,
        jsxElement.node, childEnv, false
      );
    }

    // If the JSXElement is not a component element, create a new DOM node of
    // the type given by jsxElement.tagName, and then potentially add some
    // attributes and/or append some content to it.
    else {
      let tagName = jsxElement.tagName;
      let newDOMNode = document.createElement(tagName);

      // Update allowed selection of attributes, and throw an invalid/non-
      // implemented attribute is set. Also record the children prop for the
      // next step afterwards.
      let childArr = [];
      let {node: jsxNode, decEnv: jsxDecEnv} = jsxElement;
      forEachValue(jsxElement.props, jsxNode, jsxDecEnv, (val, key) => {
        switch (key) {
          case "children" : {
            if (tagName === "br" || tagName === "hr") throw new RuntimeError(
               `Elements of type "${tagName}" cannot have children`,
              jsxNode, jsxDecEnv
            );
            if (!(childArr instanceof Array)) throw new RuntimeError(
              `A non-iterable 'children' prop was used`,
             jsxNode, jsxDecEnv
           );
            childArr = val ?? [];
            break;
          }
          case "className" : {
            let className = val.toString();
            if (!CLASS_NAME_REGEX.test(className)) throw new RuntimeError(
              `Invalid class name: "${className}" (each class name needs to ` +
              "be of the form '[<id>_]<name>' where both id is of the form " +
              "/([a-z]|-_)[a-z-A0-9\-]*/ and name is of the form " +
              "/[a-z][a-z0-9\-]*/)",
              jsxNode, jsxDecEnv
            );
            // Add automatic '_' suffixes to all initial classes.
            className = className.replaceAll(
              /[a-z][a-z0-9\-]*/g, str => str + "_"
            );
            newDOMNode.setAttribute("class", className);
            break;
          }
          // WARNING: In all documentations of this 'onClick prop, it should be
          // warned that one should not call a callback from the parent
          // instance (e.g. handed down through refs), unless one is okay with
          // bleeding the CAN_POST and REQUEST_ORIGIN privileges granted to
          // this onClick handler function into the parent instance.
          case "onClick": {
            if (!(val instanceof FunctionObject)) {
              break;
            }
            newDOMNode.onclick = async () => {
              try {
                // Execute the function object held in val, with elevated
                // privileges that allows the function to make POST-like
                // requests.
                interpreter.executeFunctionOffSync(
                  val, [], callerNode, callerEnv,
                  new JSXInstanceInterface(this), [CAN_POST_FLAG]
                );
              } catch (err) {
                console.error(err);
              }
            };
            break;
          }
          default: throw new RuntimeError(
            `Invalid or not-yet-implemented attribute, "${key}" for ` +
            "non-component elements",
            jsxNode, jsxDecEnv
          );
        }
      });

      // Then call a recursive helper method which calls getDOMNode() on any
      // and all children, and append each one to the new DOM node. And if a
      // child returns an array, it also calls itself recursively to append
      // any and all nested children inside that array (at any depth). We also
      // push the new DOM node to ownDOMNodes, and do this before hand, such
      // that ownDOMNodes will be ordered from ancestors to descendants at the
      // end.
      ownDOMNodes.push(newDOMNode);
      this.createAndAppendChildren(
        newDOMNode, childArr, marks, interpreter, callerNode, callerEnv,
        ownDOMNodes
      );

      // Then return the DOM node of this new element.
      return newDOMNode;
    }
  }


  createAndAppendChildren(
    domNode, childArr, marks, interpreter, callerNode, callerEnv,
    ownDOMNodes
  ) {
    childArr.forEach(val => {
      if (val instanceof Array) {
        this.createAndAppendChildren(
          domNode, val, marks, interpreter, callerNode, callerEnv, ownDOMNodes
        );
      } else {
        domNode.append(this.getDOMNode(
          val, marks, interpreter, callerNode, callerEnv, ownDOMNodes, false
        ));
      }
    });
  }


  getFullKey() {
    return this.parentInstance ?
      this.parentInstance.getFullKey() + "." + this.key :
      this.key;
  }


  // TODO: Add keyboard events, click events, and focus events and focus
  // methods, like I have described it in my working notes (in my "23-xx"
  // notes, which is currently located in my Notes/backup GitHub folder).

  // trigger(eventKey, input?) triggers an event to the first among the
  // instance itself and its ancestors who has an event that matches the
  // eventKey (which might be a Symbol). The events are declared by the
  // 'events' object exported by a component module. If no ancestors has an
  // event of a matching key, then trigger() just fails silently.
  trigger(eventKey, input, interpreter, callerNode, callerEnv) {
    let events = this.componentModule.get("events");
    eventKey = getStringOrSymbol(eventKey, callerNode, callerEnv);
    let eventFun = getPropertyFromObject(events, eventKey);
    if (eventFun) {
      interpreter.executeFunction(
        eventFun, [input], callerNode, callerEnv,
        new JSXInstanceInterface(this), [CLEAR_FLAG],
      );
    }
    else {
      if (this.parentInstance) {
        this.parentInstance.trigger(
          eventKey, input, interpreter, callerNode, callerEnv
        );
      }
    }

  }


  // call(instanceKey, methodKey, input?) either calls one of the instance's
  // own methods, if instanceKey is falsy or equal to "self", or otherwise
  // calls a method of the child instance with the same key. The method called
  // is the one with the key of methodKey in the 'methods' object exported by
  // the component module of the target instance.
  call(
    instanceKey, methodKey, input, interpreter, callerNode, callerEnv
  ) {
    instanceKey = getString(instanceKey, callerNode, callerEnv);

    // First get the target instance.
    let targetInstance;
    if (instanceKey === "") {
      targetInstance = this;
    }
    else {
      targetInstance = this.childInstances.get(instanceKey);
    }
    if (!targetInstance) throw new RuntimeError(
      `No child instance found with the key of "${instanceKey}"`,
      callerNode, callerEnv
    );

    // Then find and call its targeted method.
    let methods = targetInstance.componentModule.get("methods");
    methodKey = getStringOrSymbol(methodKey, callerNode, callerEnv);
    if (!methodKey) throw new ArgTypeError(
      "Invalid, falsy method key",
      callerNode, callerEnv
    );
    let methodFun;
    if (getPrototypeOf(methods) === OBJECT_PROTOTYPE) {
      methodFun = methods[methodKey];
    }
    if (methodFun) {
      return interpreter.executeFunction(
        methodFun, [input], callerNode, callerEnv,
        new JSXInstanceInterface(targetInstance), [CLEAR_FLAG],
      );
    }
    else throw new RuntimeError(
      `Call to a non-existent method, "${methodKey}", to a component ` +
      `instance of "${targetInstance.componentPath}"`,
      callerNode, callerEnv
    );
  }




  queueRerender(interpreter) {
    // Unless one is already currently queued, queue a Promise (that is
    // executed on the next tick) to rerender the instance, but only if it has
    // not been discarded since then.
    if (!this.rerenderPromise) {
      this.rerenderPromise = new Promise(resolve => resolve()).then(() => {
        delete this.rerenderPromise;
        if (!this.isDiscarded) {
          // Make sure to use the same callerNode and callerEnv as on the
          // previous render, which is done in order to not increase the memory
          // for every single triggered event or call.
          this.render(
            this.props, this.isDecorated, interpreter,
            this.callerNode, this.callerEnv, true, true
          );
        }
      });
    }
  }

  queueFullRerender(interpreter) {
    this.queueRerender(interpreter);
    this.childInstances.forEach(jsxInstance => {
      jsxInstance.queueFullRerender(interpreter);
    });
  }


  changePropsAndQueueRerender(newProps, interpreter, deletePrevious = false) {
    if (deletePrevious) {
      this.props = newProps;
    } else {
      this.props = {...this.props, ...newProps};
    }
    this.queueRerender(interpreter);
  }




  provideContext(key, context, interpreter) {
    this.contextProvisions ??= {};
    let {subscribers, prevContext} = this.contextProvisions[key] ?? {};
      this.contextProvisions[key] = {subscribers: new Map(), context: context};
    if (subscribers && !deepCompareExceptMutableAndRefs(context, prevContext)) {
      subscribers.forEach((_, jsxInstance) => {
        jsxInstance.queueRerender(interpreter);
      });
    }
  }

  subscribeToContext(key) {
    this.contextSubscriptions ??= new Map();
    this.contextSubscriptions.set(key, true);
    let parentInstance = this.parentInstance;
    while (parentInstance) {
      let contextProvisions = parentInstance.contextProvisions;
      if (contextProvisions && contextProvisions[key]) {
        contextProvisions[key].subscribers.set(this, true);
        return contextProvisions[key].context;
      }
      parentInstance = parentInstance.parentInstance;
    }
  }

  unsubscribeFromContext(key) {
    this.contextSubscriptions ??= new Map();
    this.contextSubscriptions.delete(key);
    let parentInstance = this.parentInstance;
    while (parentInstance) {
      let contextProvisions = parentInstance.contextProvisions;
      if (contextProvisions && contextProvisions[key]) {
        contextProvisions[key].subscribers.delete(this);
        return contextProvisions[key].context;
      }
      parentInstance = parentInstance.parentInstance;
    }
  }

  unsubscribeFromAllContexts() {
    let contextSubscriptions = this.contextSubscriptions;
    if (contextSubscriptions) {
      contextSubscriptions.forEach((_, key) => {
        this.unsubscribeFromContext(key);
      });
    }
  }

  getOwnContext(key) {
    let contextProvisions = this.contextProvisions;
    if (contextProvisions) {
      return contextProvisions.get(key)?.context;
    }
  }

}







class JSXInstanceInterface extends ObjectObject {
  constructor(jsxInstance) {
    super("JSXInstance");
    this.jsxInstance = jsxInstance;

    Object.assign(this.members, {
    /* Properties */
      "props": this.jsxInstance.props,
      "state": this.jsxInstance.state,
      "refs": this.jsxInstance.refs,
      /* Methods */
      "trigger": this.trigger,
      "call": this.call,
      "setState": this.setState,
      "rerender": this.rerender,
      "provideContext": this.provideContext,
      "subscribeToContext": this.subscribeToContext,
      "unsubscribeFromContext": this.unsubscribeFromContext,
      "getOwnContext": this.getOwnContext,
      "getSettings": this.getSettings,
    });
  }


  // See the comments above for what trigger() and call() does.
  trigger = new DevFunction(
    "trigger", {typeArr: ["object key", "any?"]},
    ({callerNode, execEnv, interpreter}, [eventKey, input]) => {
      this.jsxInstance.trigger(
        eventKey, input, interpreter, callerNode, execEnv
      );
    }
  );

  call = new DevFunction(
    "call", {typeArr: ["any", "object key", "any?"]},
    ({callerNode, execEnv, interpreter}, [instanceKey, methodKey, input]) => {
      return this.jsxInstance.call(
        instanceKey, methodKey, input, interpreter, callerNode, execEnv
      );
    }
  );

  // triggerAncestor() does the same as trigger, but ships looking in the
  // instance's own events.
  triggerAncestor = new DevFunction(
    "triggerAncestor", {typeArr: ["object key", "any?"]},
    ({callerNode, execEnv, interpreter}, [eventKey, input]) => {
      let parentInstance = this.jsxInstance.parentInstance;
      if (parentInstance) {
        parentInstance.trigger(
          eventKey, input, interpreter, callerNode, execEnv
        );
      }
    }
  );

  // setState() assigns to jsxInstance.state immediately, which means that the
  // state changes will be visible to all subsequently triggered events and
  // calls to this instance. However, since the render() function can only
  // access the state via 'this.state', the state changes will not be visible
  // in the continued execution of a render() after it has set the new state,
  // but only be visible on a subsequent rerender.
  setState = new DevFunction(
    "setState", {},
    ({interpreter}, [newState]) => {
      this.jsxInstance.state = newState;
      this.jsxInstance.queueRerender(interpreter);
    }
  );

  // rerender() is equivalent of calling setState() on the current state; it
  // just forces a rerender.
  rerender = new DevFunction("rerender", {}, ({interpreter}) => {
    this.jsxInstance.queueRerender(interpreter);
  });

  // import() is similar to the regular import function, except it also makes
  // the app call settings.prepareComponent() in order to prepare e.g. the
  // style of the component before it is used (which might be helpful in order
  // to prevent UI flickering in some instances).
  import = new DevFunction(
    "import", {isAsync: true, typeArr: ["string"]},
    async ({callerNode, execEnv, interpreter}, [route]) => {
      let liveModule = interpreter.import(route, callerNode, execEnv);
      let settings = this.jsxInstance.settings;
      if (route.slice(-4) === ".jsx") {
        await settings.prepareComponent(liveModule, callerNode, execEnv);
      }
      return liveModule;
    }
  );

  // provideContext(key, context) provides a context identified by key for all
  // its descendants, meaning that they can subscribe to it an get the context
  // value in return. And if this instance ever calls provideContext() with a
  // different value for that key, all the subscribing instances will rerender.
  provideContext = new DevFunction(
    "provideContext", {typeArr: ["object key", "object"]},
    ({interpreter}, [key, context]) => {
      this.jsxInstance.provideContext(key, context, interpreter);
    },
  );

  // subscribeToContext(key) looks through the instance's ancestors and finds
  // the first one, if any, that has provided a context of that key. If one is
  // found, the value is returned, and this current instance is "subscribed" to
  // the context (if not already), meaning that if the context's value changes,
  // this instance rerenders. If no context is found of the given key, no side-
  // effect happens, and undefined is returned.
  subscribeToContext = new DevFunction(
    "subscribeToContext", {typeArr: ["object key"]}, (_, [key]) => {
      return this.jsxInstance.subscribeToContext(key);
    }
  );

  // unsubscribeFromContext(key) unsubscribes the instance from a context,
  // meaning that it will no longer rerender if the context updates.
  unsubscribeFromContext = new DevFunction(
    "unsubscribeFromContext", {typeArr: ["object key"]}, (_, [key]) => {
      return this.jsxInstance.unsubscribeFromContext(key);
    }
  );

  // getOwnContext(key) the instance's own context of the given key.
  getOwnContext = new DevFunction(
    "getOwnContext", {typeArr: ["object key"]}, (_, [key]) => {
      return this.jsxInstance.getOwnContext(key);
    }
  );


  // getSettings() returns a promise to the settings. Note that it might be a
  // good idea to check the CLIENT_TRUST_FLAG before allowing a component
  // instance to get settings that the user might consider private. So don't
  // just let private settings be properties of settings; make them methods
  // that check said flag.
  getSettings = new DevFunction(
    "getSettings", {isAsync: true}, async () => {
      let settings = this.jsxInstance.settings;
      if (settings instanceof Promise) {
        settings = await settings;
      }
      return settings;
    }
  );


  // TODO: Add more instance methods at some point, such as a method to get
  // bounding box data, or a method to get a PromiseObject that resolves a
  // short time after the bounding box data, and similar data, is ready.
}





// DOMNodeObjects can be returned by the render() functions of dev components.
export class DOMNodeObject extends ObjectObject {
  constructor(domNode) {
    super("DOMNode");
    this.domNode = domNode;
  }
}


// SettingsObject is an abstract class that is meant to be extended by settings
// systems, i.e. the modules that define a getSettings() function to be passed
// to createJSXApp().
export class SettingsObject extends ObjectObject {
  constructor() {
    super("Settings");
  }

  // TODO: Correct and complete the following comments.

  // initiate(userID, appComponent, node, env) ...
  initiate(userID, appComponent, node, env) {}

  // getUserID(node, env) ...
  getUserID(node, env) {}

  // changeUser(userID?, node, env) ...
  changeUser(userID, node, env) {}

  // prepareComponent(componentModule, node, env) ...
  prepareComponent(componentModule, node, env) {}

  // prepareInstance(jsxInstance, node, env) has
  // to prepare transformInstance() such that it can be called synchronously.
  // It should also return a whenPrepared value that might be a promise, in
  // which case the component renders with a "_pending-settings" class and
  // queues a rerender when the promise resolves.
  prepareInstance(jsxInstance, node, env) {}

  // TODO: Correct.
  // getClientTrust(componentPath, node, env) takes a component path,
  // which will often be the so-called "request origin", and returns boolean
  // of whether client trust the component to make post requests, and to
  // fetch private data. If getClientTrust() has not yet been prepared by
  // prepareInstance(), it might just return false temporarily.
  getClientTrust(jsxInstance, node, env) {}

  // transformInstance() ...
  transformInstance(
    jsxInstance, domNode, ownDOMNodes, node, env
  ) {}

  // Note that these are just the minimal API needed for this module to
  // function. In practice the settings class will likely be extended with
  // other methods.

}







function deepCompareExceptMutableAndRefs(props1, props2) {
  if (props1 === props2) return true;

  // Get the keys, and return false immediately if the two props have different
  // sets of keys.
  let keys1 = Object.keys(props1);
  let keys2 = Object.keys(props2);
  let unionedKeys = [...new Set(keys1.concat(keys2))];
  if (unionedKeys.length > keys1.length) {
    return false;
  }

  // Loop through each pair of properties that are not the 'refs' property and
  // deep-compare them.
  let ret = true;
  Object.entries(props1).some(([key, val1]) => {
    if (key === "refs") {
      return false; // continue the some() iteration.
    }
    let val2 = Object.hasOwn(props2, key) ? props2[key] : undefined;
    if (!deepCompare(val1, val2, true)) {
      ret = false;
      return true; // break the some() iteration.
    }
  });
  return ret;
}


export function deepCompare(val1, val2, excludeMutableProps = false) {
  if (val1 === val2) return true;

  if (!val1 || !val2 || !(val1 instanceof Object && val2 instanceof Object)) {
    return false;
  }

  if (val1 instanceof ObjectObject) {
    if (
      excludeMutableProps && val1.isMutable &&
      val2 instanceof ObjectObject && val2.isMutable
    ) {
      return true;
    }
    if (
      val1.isComparable && val2 instanceof ObjectObject && val2.isComparable
      && val1.constructor === val2.constructor
    ) {
      val1 = val1.members;
      val2 = val2.members;
    }
    else return false;
  }

  let proto1 = Object.getPrototypeOf(val1);
  let proto2 = Object.getPrototypeOf(val2);
  if (proto1 !== proto2) return false;

  if (proto1 === OBJECT_PROTOTYPE) {
    let keys1 = Object.keys(val1);
    let keys2 = Object.keys(val2);
    let unionedKeys = [...new Set(keys1.concat(keys2))];
    if (unionedKeys.length > keys1.length) {
      return false;
    }
    let ret = true;
    Object.entries(val1).some(([key, prop1]) => {
      let prop2 = Object.hasOwn(val2, key) ? val2[key] : undefined;
      if (!deepCompare(prop1, prop2, excludeMutableProps)) {
        ret = false;
        return true; // break some() iteration.
      }
    });
    return ret;
  }
  else if (proto1 === ARRAY_PROTOTYPE) {
    if (val1.length !== val2.length) {
      return false;
    }
    let ret = true;
    val1.some((entry1, ind) => {
      let entry2 = val2[ind];
      if (!deepCompare(entry1, entry2, excludeMutableProps)) {
        ret = false;
        return true; // break the some() iteration.
      }
    });
    return ret;
  }
  else return false;
}





export async function getSetting(
  settings, name, inputArr = undefined, interpreter, node, env
) {
  let val = settings[name];
  if (val instanceof PromiseObject) {
    val = await val.promise;
  }
  if (val instanceof FunctionObject) {
    val = interpreter.executeFunctionOffSync(
      val, inputArr ?? [], node, env, settings
    );
    if (val instanceof PromiseObject) {
      val = await val.promise;
    }
  }
  return val;
}






export function getUserID() {
  let {userID} = JSON.parse(
    localStorage.getItem("userData") ?? "{}"
  );
  return userID;
}


function addUserRelatedProps(props, jsxInstance, interpreter, node, env) {
  let {contexts: {settingsContext}} = env.scriptVars;
  let userID = settingsContext.getVal().getUserID(node, env);
  settingsContext.addSubscriberCallback(settings => {
    let userID = settings.getUserID(node, env);
    jsxInstance.changePropsAndQueueRerender({userID: userID}, interpreter);
    jsxInstance.queueFullRerender(interpreter);
  });
  return {...props, userID: userID};
}


function addURLRelatedProps(props, jsxInstance, interpreter, _, env) {
  let {contexts: {urlContext}} = env.scriptVars;
  let urlData = urlContext.getVal();
  urlContext.addSubscriberCallback((urlData) => {
    jsxInstance.changePropsAndQueueRerender({urlData: urlData}, interpreter);
  });
  const replaceState = new DevFunction(
    "replaceState", {typeArr: ["string", "any?"]},
    ({callerNode, callerEnv}, [url, state = {}]) => {
      // TODO: Parse url for pathname, search, and hash, then call
      // replaceState() and .set() the urlContext.
    }
  );
  const pushState = new DevFunction(
    "pushState", {typeArr: ["string", "any?"]},
    ({callerNode, callerEnv}, [url, state = {}]) => {
      // TODO: Parse url for pathname, search, and hash, then call pushState()
      // and .set() the urlContext.
    }
  );
  return {
    ...props, urlData: urlData, replaceState: replaceState,
    pushState: pushState
  };
}

  // let {hostname, pathname, search, hash} = window.location;
  // props = {
  //   location: {
  //     hostname: hostname, pathname: pathname, search: search, hash: hash,
  //     state: window.history.state,
  //   },
  //   ...props
  // };
  // let pushState = new DevFunction(
  //   {typeArr:["string", "object?"]},
  //   ({callerNode, execEnv}, [path, state]) => {
  //     let {protocol, host, pathname} = window.location;
  //     let newPath = getFullPath(pathname, path, callerNode, execEnv);
  //     // TODO: Validate newPath!
  //     let newFullURL = protocol + '//' + host + newPath;
  //     window.history.pushState(state, undefined, newFullURL);
  //     jsxInstance.changePropsAndQueueRerender()
  //   }
  // );
  // let refs = props.refs;
  // refs = getPrototypeOf(refs) === OBJECT_PROTOTYPE ? refs : {};
  // props.refs = {pushState, ...refs};

// }
