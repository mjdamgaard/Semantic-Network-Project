
/* Some developer functions, both private and public */


/* A print hello world function */

export function upaf_appendHelloWorld() {
    $("#upaFrame").append("<div><b>Hello, world!</b></div>");
}








/* Functions to store and get callback upaf_ functions from key strings */


// The following out-commented code is copied from html/src/storeFunction.js.
// While it has a upas_ prefix instead of the upaf_ prefix, it is exceptionally
// still part of the UPA's API, namely since the
// upas_storedFunctions(<Exp>, <Fun>) syntax has been made a special part
// of the syntax of our JS subset. And storeFunction.js is run in the document
// head (before loading the UPA).

// // With upas_getStoreFunction I then intend to allow a definition of
// // a upas_storeFunction() in the begining of a script, namely by a statement
// // of the form
// // "const upas_storeFunction = upas_getStoreFunction();",
// // and then I will also allow statements of the form
// // "upas_storeFunction(<Exp>, <FunIdent>);".
// // (Here 's' in "upas_" stands for "special function.")
//
// function upas_getStoreFunction() {
//     var storedFunctions = {};
//     return function(key, fun) {
//         if (!/^\w+$/.test(key)) {
//             throw (
//                 "storeFunction(): function key is not a valid " +
//                 "/^\\w+$/ string"
//             );
//         }
//         storedFunctions[key] = fun;
//     }
// }

export function upaf_isAStoredFunction(key) {
    if (!/^\w+$/.test(key)) {
        throw (
            "isAStoredFunction(): function key is not a valid " +
            "/^\\w+$/ string"
        );
    }
    return (typeof upas_storedFunctions["upak_" + key] !== "undefined");
}

// Note that since this function does not have the upaf_ prefix, it cannot
// be exported to the final user modules (but only to other developer modules).
export function getFunction(key) {
    if (!/^\w+$/.test(key)) {
        throw (
            "getFunction(): function key is not a valid " +
            "/^\\w+$/ string"
        );
    }
    return upas_storedFunctions["upak_" + key];
}

/* A private function to get a resulting function from key and a data array
 * containing the input parameters.
 **/
export function getResultingFunction(funName, dataArr) {
    var fun = getFunction(funName);
    return function() {
        fun.apply(null, dataArr ?? []);
    };
}

/* A public function run a upaf_ function pointed to by a key */

export function upaf_runResultingFunction(funName, dataArr) {
    var fun = getFunction(funName);
    fun.apply(null, dataArr ?? []);
}












/* jQuery wrappers and other functions to add and remove HTML, HTML attributes,
 * and CSS styles.
 **/




/* A private function to get jQuery objects */

// Note that since this function does not have the upaf_ prefix, it cannot
// be exported to the final user modules (only to other developer modules).
export function getJQueryObj(selector) {
    // syntax check selector.
    checkSelector(selector);
    // return the descendents of #upaFrame that matches the selector.
    return $("#upaFrame").find(selector);
}






/* jQuery wrappers to get, add, remove and empty HTML */


export function upaf_html(selector, html, method) {
    // test selector and get jQuery object.
    let jqObj = getJQueryObj(selector);
    // if html is undefined/null, return the HTML of the selection.
    if (typeof html === "undefined") {
        return jqObj.html()
    }
    // else verify html first of all.
    checkHTML(html);
    // if this check succeeds, get ready to append or prepend html, insert
    // it after or before, or replace it as the innerHTML of each element
    // the selection.
    method = method ?? "inner";
    switch (method) {
        case "inner":
            jqObj.html(html);
            break;
        case "append":
        case "prepend":
        case "after":
        case "before":
            jqObj[method](html);
            break;
        default:
            throw (
                "html(): unrecognized method '" + method.toString() + "'"
            );
    }
}
// (One could also make a function to do several of these actions for the same
// selection, but I will let this be a (potential) task for a future module.)

export function upaf_remove(selector) {
    // test selector and get jQuery object.
    let jqObj = getJQueryObj(selector);
    // remove all selected elements.
    jqObj.remove();
}

export function upaf_empty(selector) {
    // test selector and get jQuery object.
    let jqObj = getJQueryObj(selector);
    // empty all selected elements of their inner HTML.
    jqObj.empty();
}






/* jQuery wrapper to get and set standard HTML attributes that does not need
 * quering of the server to verify their legality (but can be verified by
 * isLegalTagNameAttrNameAttrValTriplet() defined below).
 **/

export function upaf_attr(selector, attrOrAttrValPairArr, val) {
    // test selector and get jQuery object.
    let jqObj = getJQueryObj(selector);
    // if val is undefined/null and attrOrAttrValPairArr as a string, test it
    // and return jqObj.attr(attribute).
    if (
        typeof val === "undefined" &&
        typeof attrOrAttrValPairArr === "string"
    ) {
        let attr = attrOrAttrValPairArr;
        // test the format of attr.
        if (!/\w+/.test(attr)) {
            throw (
                "attr(): attribute input was not string of pattern /\\w+/"
            );
        }
        // return the attribute value of the first element in the selection.
        return jqObj.attr(attr);
    }
    // if both attrOrAttrValPairArr and val are strings, the semantics should
    // be the same as if attrOrAttrValPairArr had been [[attrOrAttrValPairArr,
    // val]] and val had been undefined/null.
    if (
        typeof val === "string" &&
        typeof attrOrAttrValPairArr === "string"
    ) {
        let attr = attrOrAttrValPairArr;
        // test the format of attr.
        if (!/\w+/.test(attr)) {
            throw (
                "attr(): attribute input was not string of pattern /\\w+/"
            );
        }
        // set attrOrAttrValPairArr = [[attr, val]] and continue with the last
        // option.
        attrOrAttrValPairArr = [[attr, val]];
    }
    // loop over all elements in the selection and for each element, get the
    // tagName and then try to set its attributes according to the input
    // attribute--value pair array.
    let attrValPairArr = attrOrAttrValPairArr;
    let attrValPairArrLen = attrValPairArr.length;
    jqObj.each(function(){
        // get the tagName of the current element.
        tagName = this.prop("tagName").toLowerCase();
        // loop and set new attributes according to attrValPairArr.
        for (let i = 0; i < attrValPairArrLen; i++) {
            // get the ith attribute--value pair.
            let attr = attrValPairArr[i][0];
            let val = attrValPairArr[i][1];
            // test the format of the attribute.
            if (!/\w+/.test(attr)) {
                throw (
                    "attr(): attribute number " + i.toString() +
                    " was not string of pattern /\\w+/"
                );
            }
            // test the (tagName, attr, val) triplet.
            testTagNameAttrNameAttrValTriplet(tagName, attr, val);
        }
        // if all tests succeded change all the attributes for the element.
        this.attr(Object.fromEntries(attrValPairArr));
    });
}



























export function setAttributeOfSingleJQueryObj(jqObj, tagName, key, val) {
    // verify that key and val are defined and have the right
    // formats.
    if (!attrKeyRegEx.test(key)) {
        throw (
            "setAttributeOfSingleJQueryObj(): input contains an invalid " +
            "attribute key"
        );
    }
    if (!attrValRegEx.test(val)) {
        throw (
            "setAttributeOfSingleJQueryObj(): input contains an invalid " +
            "attribute value"
        );
    }
    // if attribute key starts with '~,' set a new upaa_ attribute
    // for the new HTML element.
    if (key.substring(0, 1) === "~") {
        jqObj.attr("upaa_" + key.substring(1), val);
    // if it is instead an id, test that it has not already been
    // used and make sure to record it. (Let's not care about
    // race conditions.)
    } else if (key === "id") {
        if (upaf_isExistingID(val)) {
            throw (
                "getHTML(): id=\"" + val +
                "\" has already been used"
            );
        }
        recordID(val);
        jqObj.attr("id", val);
    // else, test that it is one of the allowed nagName--key--val
    // tuples.
    } else if (upaf_isLegalKeyValAttrPair(tagName, key, val)) {
        jqObj.attr(key, val);
    } else {
        throw (
            "setAttributeOfSingleJQueryObj(): illegal combination of " +
            "tagName, key and value"
        );
    }
}



export function upaf_setAttributes(selector, keyValArr) {
    // get the selected HTML element as a jQuery object.
    let jqObj = getJQueryObj(selector);
    // loop through key value pairs and set the attributes of the HTML element
    // accordingly.
    for (let i = 0; i < keyValArr.length; i++) {
        let key = keyValArr[$i][0];
        let val = keyValArr[$i][1];
        // verify that key and val are defined and have the right formats.
        jqObj.each(function() {
            setAttributeOfSingleJQueryObj(this, tagName, key, val)
        });
    }
}

export function upaf_getAttribute(selector, key) {
    // get the selected HTML element as a jQuery object.
    let jqObj = getJQueryObj(selector);
    // assert that key is defined and has the right format.
    if (!attrKeyRegEx.test(key)) {
        throw (
            "getAttribute(): input is not a valid attribute key"
        );
    }
    // replace '~' with 'upaa_' in key.
    key = key.replaceAll("~", "upaa_")
    // return the attribute of the first selected HTML element.
    return jqObj.first().attr(key);
}


export function upaf_getAttributes(selector, keyArr) {
    var ret = [];
    // get the selected HTML element as a jQuery object.
    let jqObj = getJQueryObj(selector);
    // loop through the keys in keyArr and get the corresponding attribute
    // values from the selected HTML element.
    for (let i = 0; i < keyArr.length; i++) {
        let key = keyValArr[$i];
        // assert that key is defined and has the right format.
        if (!attrKeyRegEx.test(key)) {
            throw (
                "getAttributes(): input " + i.toString() +
                " is not a valid attribute key"
            );
        }
        // replace '~' with 'upaa_' in key.
        key = key.replaceAll("~", "upaa_")
        // get the attribute of the selected HTML element and store it in the
        // return array.
        ret[i] = jqObj.first().attr(key);
    }
    // return an array of the gotten attribute values.
    return ret;
}

















/* Some functions to add and remove HTML elements */


// export const flowContentElements = [
//     "a", "abbr", "address", "article", "aside", "audio", "b", "bdi", "bdo",
//     "blockquote", "br", "button", "canvas", "cite", "code", "data",
//     "datalist", "del", "details", "dfn", "dialog", "div", "dl", "em",
//     "embed", "fieldset", "figure", "footer", "form",
//     "h1", "h2", "h3", "h4", "h5", "h6",
//     "header", "hgroup", "hr", "i", "iframe", "img", "input", "ins", "kbd",
//     "label", "map", "mark",
//     //"MathML math",
//     "menu", "meter", "nav",
//     "noscript", "object", "ol", "output", "p", "picture", "pre",
//     "progress", "q", "ruby", "s", "samp",
//     // "script",
//     "search", "section",
//     "select", "slot", "small", "span", "strong", "sub", "sup",
//     // "SVG svg",
//     "table", "template", "textarea", "time", "u", "ul", "var", "video",
//     "wbr",
//     //"autonomous custom elements",
// ];





/* << addHTML() >>
 * input = (selector, method, struct),
 * where
 * method = "append" | "prepend" | "before" | "after",
 * and where
 * struct = undefined | contentText | [(tagAttributesContentTuple,)*],
 * where
 * tagAttributesContentTuple =
 *     [tagName] | [tagName, struct] | [tagName, attributes, struct],
 * where
 * attributes = undefined | [([key, value],)*].
 **/
export function upaf_addHTML(selector, method, struct) {
    let jqObj = getJQueryObj(selector);
    // test method.
    if (!["append", "prepend", "before", "after"].includes(method)) {
        throw (
            "addHTML(): method name not recognized"
        );
    }
    let html = getHTMLFromStructureAndRecordIDs(struct);
    // insert html via the append(), prepend(), before() or after() method.
    return jqObj[method](html);
}


export function getHTMLFromStructureAndRecordIDs(struct) {
    // if struct is a string, return the converted (HTML safe) string.
    if (typeof struct === "string") {
        return upaf_convertHTMLSpecialChars(struct);
    }
    // if struct is undefined or an empty array, return "".
    var len;
    if (
        typeof struct === "undefined" ||
        (len = struct.length) == 0
    ) {
        return "";
    }
    // loop through tag--attribute--content tuples and append the resulting
    // html to a return variable, ret.
    var ret = "";
    for (let i = 0; i < len; i++) {
        // get the variables.
        var tagName, attributes;
        var content = "";
        let tupleLen = struct[i].length;
        if (tupleLen === 3) {
            tagName = struct[i][0];
            attributes = struct[i][1];
            content = struct[i][2];
        } else if (tupleLen === 2) {
            tagName = struct[i][0];
            content = struct[i][1];
        } else if (tupleLen === 1) {
            tagName = struct[i][0];
        }
        // if tag input is undefined, simply append the converted content to
        // ret.
        if (typeof tagName === "undefined") {
            ret = ret + getHTMLFromStructureAndRecordIDs(content);
            continue;
        }
        // else, test tag input.
        if (!elementNameRegEx.test(tagName)) {
            throw (
                "getHTMLFromStructureAndRecordIDs(): unrecognized tag name: " +
                tagName.toString()
            );
        }
        // initialize new HTML element.
        var htmlJQObj = $("<" + tagName + "></" + tagName + ">");
        // test each attribute input and add the attribute key--value pair to
        // the new HTML element.
        if (typeof attributes !== "undefined") {
            let lenAttr = attributes.length;
            for (let j = 0; j < lenAttr; j++) {
                // get attribute key and value.
                let key = attributes[j][0];
                let val = attributes[j][1];
                // try to set key="val" for htmlJQObj.
                setAttributeOfSingleJQueryObj(htmlJQObj, tagName, key, val);
            }
        }
        // test and convert content, and add it inside the new HTML element.
        htmlJQObj.html(getHTMLFromStructureAndRecordIDs(content));
        // append the new HTML element to ret.
        ret = ret + htmlJQObj[0].outerHTML;
    }
    // return the resulting HTML string.
    return ret;
}



export function upaf_convertHTMLSpecialChars(str) {
    // verify that input is a string.
    if (typeof str !== "string") {
        throw (
            "convertHTMLSpecialChars(): input is not a string"
        );
    }
    // return the converted (HTML safe) string.
    return str
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

export function upaf_convertHTMLSpecialCharsAndBackslashes(str) {
    // verify that input is a string.
    if (typeof str !== "string") {
        throw (
            "convertHTMLSpecialCharsAndBackslashes(): " +
            "input is not a string"
        );
    }
    // return the converted (HTML safe and attribute value safe) string.
    return str
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\\", "&#92;");
}



export function upaf_removeHTML(selector) {
    let jqObj = getJQueryObj(selector);
    // remove all id in the selction from the idRecord.
    removeAllIDRecords(jqObj)
    // remove all elements in the selction.
    jqObj.remove();
}

export function upaf_emptyHTML(selector) {
    let jqObj = getJQueryObj(selector);
    // remove all id in the descendents of the selction from the idRecord.
    removeAllInnerIDRecords(jqObj)
    // remove all elements in the selction.
    jqObj.empty();
}



/* Function to get inner and outer HTML (of the first matched element only) */

export function upaf_getInnerHTML(selector) {
    let jqObj = getJQueryObj(selector);
    return jqObj[0].innerHTML; // (I don't know if this works in I.E. browsers.)
}

export function upaf_getOuterHTML(selector) {
    let jqObj = getJQueryObj(selector);
    return jqObj[0].outerHTML;
}




// TODO: Make this function:
export function upaf_getStructureFromHTML(struct) {
    //TODO..
}

// TODO: Make these:
export function upaf_getInnerStructure(selector) {

}

export function upaf_getOuterStructure(selector) {

}













/* A function to add CSS styles to a selection of elements */

export function upaf_css(selector, propertyOrPropertyValuePairArr) {
    // get the selected descendents of #upaFrame as a jQuery object.
    let jqObj = getJQueryObj(selector);
    if (typeof propertyOrPropertyValuePairArr === "string") {
        let property = propertyOrPropertyValuePairArr;
        if (!/^@?[[a-zA-Z]\-]+$/.test(property)) {
            throw (
                "css(): properties can only contain letters, '-' and '@'"
            );
        }
        return jqObj.css(property);
    } else {
        let propertyValuePairArr = propertyOrPropertyValuePairArr;
        // verify all values to be (PERHAPS! (TODO: verify this!)) safe.
        let len = propertyValuePairArr.length;
        for (let i = 0; i < len; i++) {
            let property = propertyValuePairArr[i][0];
            let value = propertyValuePairArr[i][1];
            // test property.
            if (!cssLegalProperties.includes(property)) {
                throw (
                    "css(): property" + i.toString() +
                    "can only contain letters, '-' and '@'"
                );
            }
            // test value.
            if (!cssAComplexRegEx.test(value)) {
                throw (
                    "css(): property value " + i.toString() +
                    " is either invalid or not implemented yet"
                );
            }
            // test that this nested array is a pair.
            if (!propertyValuePairArr[i].length === 2) {
                throw (
                    "css(): propertyValuePairArr[" + i.toString() + "] " +
                    "did not have a length of 2"
                );
            }
        }
        // convert the property--value array to a plain object
        let stylesObj = Object.fromEntries(styles);
        // set the css properties.
        jqObj.css(stylesObj);
    }
}


/* Function to add and remove CSS style tags to document head */

export function upaf_addCSS(selector, propertyValuePairArr) {
    // test the selector.
    if (!selectorRegex.test(selector)) {console.log(selectorRegex);
        throw (
            "addCSS(): selector does not match expected pattern"
        );
    }
    // initialize styleElem as the first part of the desired HTML string.
    var styleElem =
        '<style class="upas" selector="' + // Change to just have upak="key"
        // instead..
            // (This should be safe since it is inside quotation marks, I
            // believe.. TODO: Verify this.)
            upaf_convertHTMLSpecialCharsAndBackslashes(selector) +
        '"> ' +
        "#upaFrame { " + selector + " { ";
    // loop through property--value pairs and append them to styleElem.
    let len = propertyValuePairArr.length;
    for (let i = 0; i < len; i++) {
        let property = propertyValuePairArr[i][0];
        let value = propertyValuePairArr[i][1];
        // test property.
        if (!cssLegalProperties.includes(property)) {
            throw (
                "addCSS(): property" + i.toString() +
                "can only contain letters, '-' and '@'"
            );
        }
        // test value.
        if (!cssAComplexRegEx.test(value)) {
            throw (
                "addCSS(): property value " + i.toString() +
                " is either invalid or not implemented yet"
            );
        }
        // append property and value to styleElem.
        styleElem += property + ": " + value + "; ";
    }
    // append the final part of the style tag.
    styleElem += "}}</style>";
    // append the resulting style element to the document head.
    $(":root > head").append(styleElem);
}


export function upaf_removeCSS(selector) {
    // remove all UPA style tags with the given selector.
    $(
        ':root > head > .upas[' +
            'selector="' +
            upaf_convertHTMLSpecialCharsAndBackslashes(selector) + // TODO: Change for key.
        '"]'
    ).remove();
}

export function upaf_removeLastCSS(selector) {
    // remove the last UPA style tag with the given selector.
    $(
        ':root > head > .upas[' +
            'selector="' +
            upaf_convertHTMLSpecialCharsAndBackslashes(selector) +
        '"]:last-of-type'
    ).remove();
}














/* Functions to add events to HTML elements */

const jQueryEvents = [
    "blur", "change", "focus", "focusin", "focusout", "select", "submit",
    "keydown", "keypress", "keyup",
    "click", "dblclick", "hover", "mousedown", "mouseenter", "mouseleave",
    "mousemove", "mouseout", "mouseover", "mouseup",
    "toggle", "resize", "scroll", "load", "ready", "unload",
];

const singleEventPattern =
    "((" +
        jQueryEvents.join(")|(") +
    "))";

const eventsRegEx = new RegExp(
    "^" +
        singleEventPattern + "(" + " " +  singleEventPattern + ")*" +
    "$"
);

export function upaf_verifyEvents(events) {
    if (!eventsRegEx.test(events)) {
        throw (
            "verifyEvents(): unrecognized events pattern"
        );
    }
}


export function upaf_on(selector, eventsDataHandlerTupleArr) {
    let jqObj = getJQueryObj(selector);

    for (let i = 0; i < eventsDataHandlerTupleArr.length; i++) {
        let events = eventsDataHandlerTupleArr[$i][0];
        let data = eventsDataHandlerTupleArr[$i][1] ?? "";
        let handlerKey = eventsDataHandlerTupleArr[$i][2];
        let handler = getFunction(handlerKey);

        upaf_verifyEvents(events);

        jqObj.on(events, null, data, handler);
    }
}

export function upaf_one(selector, eventsDataHandlerTupleArr) {
    let jqObj = getJQueryObj(selector);

    for (let i = 0; i < eventsDataHandlerTupleArr.length; i++) {
        let events = eventsDataHandlerTupleArr[$i][0];
        let data = eventsDataHandlerTupleArr[$i][1] ?? "";
        let handlerKey = eventsDataHandlerTupleArr[$i][2];
        let handler = getFunction(handlerKey);

        upaf_verifyEvents(events);

        jqObj.one(events, null, data, handler);
    }
}

export function upaf_off(selector, eventsHandlerPairArr) {
    let jqObj = getJQueryObj(selector);

    for (let i = 0; i < eventsHandlerPairArr.length; i++) {
        let events = eventsHandlerPairArr[$i][0];
        let handlerKey = eventsHandlerPairArr[$i][1];
        if (typeof eventsHandlerPairArr[$i][2] !== "undefined") {
            handlerKey = eventsHandlerPairArr[$i][2];
        }
        let handler = getFunction(handlerKey);

        upaf_verifyEvents(events);

        jqObj.off(events, null, handler);
    }
}

// TODO: Consider adding a jQuery.trigger() wrapper also.








/* Some functions that add jQuery effects to HTML elements */


/* << jQuery show/hide/fade/slide wrapper >>
 * input = (selector, effectTypeString, speed, callbackFunction,
 *     inputDataForCallbackFunction),
 * or
 * input = (selector, effectTypeString, [speed (, opacity)], callbackFunction,
 *     inputDataForCallbackFunction).
 **/
export function upaf_visibilityEffect(
    selector, effectType, settings, callbackKey, callbackDataArr
) {
    // get the selected descendents of #upaFrame as a jQuery object.
    let jqObj = getJQueryObj(selector);
    // get the optional callback function pointed to by the optionally provided
    // function key (string).
    var resultingCallback;
    if (typeof callbackKey === "string") {
        resultingCallback = getResultingFunction(callbackKey, callbackDataArr);
    }
    // verify the speed and opacity inputs if some are provided.
    var speed, opacity;
    // get these variables from input array.
    if (typeof settings === "object") {
        speed = settings[0];
        opacity = settings[1];
    } else {
        speed = settings;
    }
    // verify the speed input if one is provided.
    if (
        !(typeof speed === "undefined") &&
        !(speed == ~~speed) &&
        !(["slow", "fast"].includes(speed))
    ) {
        throw (
            "visibilityEffect(): invalid speed input " +
            "(contained in settings or settings[0])"
        );
    }
    // verify the opacity input if one is provided and the effect type is
    // "fadeTo".
    if (
        effectType === "fadeTo" &&
        !/^0|1|(0?\.[0-9]+)$/.test(opacity)
    ) {
        throw (
            "visibilityEffect(): invalid opacity input " +
            "(contained in settings[1])"
        );
    }
    // match the provided effect type an initiate the effect.
    switch (effectType) {
        case "show":
        case "hide":
        case "toggle":
        case "fadeIn":
        case "fadeOut":
        case "fadeToggle":
        case "slideDown":
        case "slideUp":
        case "slideToggle":
            jqObj[effectType](speed, resultingCallback);
            break;
        case "fadeTo":
            jqObj[effectType](speed, opacity, resultingCallback);
            break;
        default:
            throw (
                "visibilityEffect(): invalid effect type input"
            );
    }
}


/* jQuery.animate wrapper */

export const cssCCasePropertiesForAnimate = [
    "backgroundPositionX", "backgroundPositionY", "borderWidth",
    "borderBottomWidth", "borderLeftWidth", "borderRightWidth",
    "borderTopWidth", "borderSpacing", "margin", "marginBottom",
    "marginLeft", "marginRight", "marginTop", "opacity", "outlineWidth",
    "padding", "paddingBottom", "paddingLeft", "paddingRight",
    "paddingTop", "height", "width", "maxHeight", "maxWidth",
    "minHeight", "minWidth", "fontSize", "bottom", "left", "right", "top",
    "letterSpacing", "wordSpacing", "lineHeight", "textIndent"
];

export const cssCCasePropertiesForAnimateRegEx = new RegExp(
    "^((" +
        cssCCasePropertiesForAnimate.join(")|(") +
    "))$"
);

/* << jQuery.animate wrapper >>
 * input = [selector, ...]..
 **/
export function upaf_animate(
    selector, styles, settings, callbackKey, callbackDataArr
) {
    // get the selected descendents of #upaFrame as a jQuery object.
    let jqObj = getJQueryObj(selector);
    // get the optional callback function pointed to by the optionally provided
    // function key (string).
    var resultingCallback;
    if (typeof callbackKey === "string") {
        resultingCallback = getResultingFunction(callbackKey, callbackDataArr);
    }
    // verify the speed and easing inputs if some are provided.
    var speed, easing;
    // get these variables from input array.
    if (typeof settings === "object") {
        speed = settings[0];
        easing = settings[1];
    } else {
        speed = settings;
    }
    // verify the speed input if one is provided.
    if (
        !(typeof speed === "undefined") &&
        !(speed == ~~speed) &&
        !(["slow", "fast"].includes(speed))
    ) {
        throw (
            "animate(): invalid speed input " +
            "(contained in settings or settings[0])"
        );
    }
    // verify the easing input if one is provided.
    if (
        typeof easing !== "undefined" &&
        !(["swing", "linear"].includes(easing))
    ) {
        throw (
            "animate(): invalid easing input " +
            "(contained in settings[1])" +
            "(options are 'swing' or 'linear' or undefined)"
        );
    }
    // verify the styles array.
    let len = styles.length;
    for (let i = 0; i < len; i++) {
        if (!cssCCasePropertiesForAnimateRegEx.test(styles[0])) {
            throw (
                "animate(): invalid property for animation " +
                "(contained in styles[" + i.toString() + "][0])"
            );
        }
        if (!cssNumericRegEx.test(styles[1])) {
            throw (
                "animate(): invalid property value for animation " +
                "(contained in styles[" + i.toString() + "][1]), " +
                "expects a numeric value"
            );
        }
    }
    // convert the styles array to a plain object
    let stylesObj = Object.fromEntries(styles);
    // initiate the animation.
    jqObj.animate(stylesObj, speed, easing, resultingCallback);
}
















/* Syntax checkers for CSS/jQuery selectors, CSS declarations, CSS rules and
 * HTML.
 **/

// (These syntax checkers use the SyntaxChecker and Lexer classes, so check
// those out to understand how the following code works.)






/* CSS/jQuery selector syntax checker */

export const elementNames = [
    "a", "abbr", "address", "area", "article", "aside",
    "audio", "b", "base", "bdi", "bdo", "blockquote",
    "br", "button", "canvas", "caption", "cite", "code", "col",
    "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "dialog",
    "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure",
    "footer", "form", "h[1-6]", "header",
    "hr", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend",
    "li", "link", "main", "map", "mark", "meta", "meter", "nav",
    "noscript", "object", "ol", "optgroup", "option", "output", "p", "param",
    "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp",
    "section", "select", "small", "source", "span", "strong", "style",
    "sub", "summary", "sup", "svg", "table", "tbody", "td", "template",
    "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track",
    "u", "ul", "var", "video", "wbr",
];
// TODO: Check all these to see that they are all safe to use.

export const elementNamePattern =
    "((" +
        elementNames.join(")|(") +
    "))";

export const classPattern =
    "\\.[\\w\\- ]+";

export const pseudoClasses = [
    "first", "last", "even", "odd",
    // "((first)|(last)|(only))\\-((child)|(of\\-type))",
    // "nth\\-(last\\-)?[(child)(of\\-type)]\\([1-9][0-9]*\\)",
    // "eq\\((0|[1-9][0-9]*)\\)",
    // "[(gt)(lt)]\\(([1-9][0-9]*)\\)",
    "header", "animated", "focus", "empty",
    // "parent",
    "hidden",
    "visible", "input", "text", "password", "radio", "checkbox",
    "submit", "reset", "button", "image", "file",
    "enabled", "diabled", "selected", "checked",
    // "lang\\(\\w+(\\-\\w+)*\\)",
    // TODO: add more pseudo-classes!
];

export const pseudoClassPattern =
    ":((" +
        pseudoClasses.join(")|(") +
    "))";

export const functionalPseudoClassesWithSelectorInput = [
    "is", "not", "where", "has",
];

export const functionalPseudoClassesWithSelectorInputPattern =
    ":((" +
        functionalPseudoClassesWithSelectorInput.join(")|(") +
    "))";

export const pseudoElements =
    [ +
        // "before", "after",
        "backdrop", "cue", "cue-region",
        "first-letter", "first-line",
        //TODO: complete this.
    ];

const pseudoElementPattern =
    "::((" +
        pseudoElements.join(")|(") +
    "))";


export const attributeSelectorPattern =
    /\[\w+([!\$\|\^~\*]?="w+")?\]/.source;



// construct a lexer for selectors.
let selectorLexemeAndEndCharPatterns = [
    [" ?[>,~\\+ ] ?", "\S"], // combinators.
    ["\\w+", "\\W"], // element names.
    ["\\.[\\w\\- ]+", "[^\\w\\- ]"], // classes.
    ["::[\\w\\-]+", "[^\\w\\-]"], // pseudo-elements.
    [":[\\w\\-]+", "[^\\w\\-]"], // pseudo-classes (perhaps functional).
    ["\\("],
    ["\\)"],
    [attributeSelectorPattern], // why not just lex this as one lexeme.
    ["\\*"],
    ["#upai_\\w+", "\\W"],
];
var selectorLexer = new Lexer(selectorLexemeAndEndCharPatterns, null);

// construct a syntax checker for selectors.
var = selectorChecker = new SyntaxChecker(selectorLexer);
selectorChecker.addLexemePatterns([
    [" ?[>,~\\+ ] ?"],
    [elementNamePattern],
    [classPattern],
    [pseudoClassPattern],
    [pseudoElementPattern],
    [functionalPseudoClassesWithSelectorInputPattern],
    ["\\("],
    ["\\)"],
    [attributeSelectorPattern],
    ["\\*"],
    ["#upai_\\w+"],
]);

selectorChecker.addProduction("<PseudoClassFunctionCall>", [
    ["initSequence", [
        functionalPseudoClassesWithSelectorInputPattern,
    ]],
    ["sequence", [
        "\\(",
        "<Selector>",
        "\\)",
    ]],
]);
selectorChecker.addProduction("<SimpleSelector>", [
    ["union", [
        elementNamePattern,
        classPattern,
        pseudoClassPattern,
        pseudoElementPattern,
        attributeSelectorPattern,
        "\\*",
        "#upai_\\w+",
        "<PseudoClassFunctionCall>"
    ]],
]);
selectorChecker.addProduction("<CompoundSelector>", [
    ["nonemptyList", [
        "<SimpleSelector>"
    ]],
]);
selectorChecker.addProduction("<Combinator>", [
    ["sequence", [
        " ?[>,~\\+ ] ?",
    ]],
]);
selectorChecker.addProduction("<ComplexSelector>", [
    ["nonemptyList", [
        "<CompoundSelector>", "<Combinator>"
    ]],
]);


export function checkSelector(selector, successRequired) {
    successRequired = successRequired ?? true;
    let ret = selectorChecker.lexAndParse(selector, "<ComplexSelector>");
    if (!ret && successRequired) {
        throw selectorChecker.error;
    } else {
        return ret;
    }
}
// Function meant to help with debugging.
export function upaf_checkSelectorAndGetErrorAndLexArr(selector) {
    selectorChecker.lexAndParse(selector, "<ComplexSelector>");
    return [selectorChecker.error, selectorChecker.lexer.lexArr];
}






/* CSS declaration list syntax checking */


// TODO: Check that these are safe with the "legal values" below!
const cssLegalProperties = [
"accent-color", "align-content", "align-items", "align-self", "all",
"animation", "animation-delay", "animation-direction", "animation-duration",
"animation-fill-mode", "animation-iteration-count", "animation-name",
"animation-play-state", "animation-timing-function", "aspect-ratio",
"backdrop-filter", "backface-visibility", "background", "background-attachment",
"background-blend-mode", "background-clip", "background-color",
"background-image", "background-origin", "background-position",
"background-position-x", "background-position-y", "background-repeat",
"background-size", "block-size", "border", "border-block", "border-block-color",
"border-block-end-color", "border-block-end-style", "border-block-end-width",
"border-block-start-color", "border-block-start-style",
"border-block-start-width", "border-block-style", "border-block-width",
"border-bottom", "border-bottom-color", "border-bottom-left-radius",
"border-bottom-right-radius", "border-bottom-style", "border-bottom-width",
"border-collapse", "border-color", "border-end-end-radius",
"border-end-start-radius", "border-image", "border-image-outset",
"border-image-repeat", "border-image-slice", "border-image-source",
"border-image-width", "border-inline", "border-inline-color",
"border-inline-end-color", "border-inline-end-style", "border-inline-end-width",
"border-inline-start-color", "border-inline-start-style",
"border-inline-start-width", "border-inline-style", "border-inline-width",
"border-left", "border-left-color", "border-left-style", "border-left-width",
"border-radius", "border-right", "border-right-color", "border-right-style",
"border-right-width", "border-spacing", "border-start-end-radius",
"border-start-start-radius", "border-style", "border-top", "border-top-color",
"border-top-left-radius", "border-top-right-radius", "border-top-style",
"border-top-width", "border-width", "bottom", "box-decoration-break",
"box-reflect", "box-shadow", "box-sizing", "break-after", "break-before",
"break-inside", "caption-side", "caret-color",
// "@charset",
"clear", "clip",
"clip-path", "color", "column-count", "column-fill", "column-gap",
"column-rule", "column-rule-color", "column-rule-style", "column-rule-width",
"column-span", "column-width", "columns", "content", "counter-increment",
"counter-reset", "cursor", "direction", "display", "empty-cells", "filter",
"flex", "flex-basis", "flex-direction", "flex-flow", "flex-grow", "flex-shrink",
"flex-wrap", "float", "font",
// "@font-face",
"font-family",
"font-feature-settings", "font-kerning", "font-size", "font-size-adjust",
"font-stretch", "font-style", "font-variant", "font-variant-caps",
"font-weight", "gap", "grid", "grid-area", "grid-auto-columns",
"grid-auto-flow", "grid-auto-rows", "grid-column", "grid-column-end",
"grid-column-gap", "grid-column-start", "grid-gap", "grid-row",
"grid-row-end", "grid-row-gap", "grid-row-start", "grid-template",
"grid-template-areas", "grid-template-columns", "grid-template-rows",
"hanging-punctuation", "height", "hyphens", "image-rendering",
// "@import",
"inline-size", "inset", "inset-block", "inset-block-end", "inset-block-start",
"inset-inline", "inset-inline-end", "inset-inline-start", "isolation",
"justify-content", "justify-items", "justify-self",
// "@keyframes",
"left",
"letter-spacing", "line-height", "list-style", "list-style-image",
"list-style-position", "list-style-type", "margin", "margin-block",
"margin-block-end", "margin-block-start", "margin-bottom", "margin-inline",
"margin-inline-end", "margin-inline-start", "margin-left", "margin-right",
"margin-top", "mask-image", "mask-mode", "mask-origin", "mask-position",
"mask-repeat", "mask-size", "max-block-size", "max-height", "max-inline-size",
"max-width",
// "@media",
"min-block-size", "min-inline-size", "min-height",
"min-width", "mix-blend-mode", "object-fit", "object-position", "offset",
"offset-anchor", "offset-distance", "offset-path", "offset-rotate",
"opacity", "order", "orphans", "outline", "outline-color", "outline-offset",
"outline-style", "outline-width", "overflow", "overflow-anchor",
"overflow-wrap", "overflow-x", "overflow-y", "overscroll-behavior",
"overscroll-behavior-block", "overscroll-behavior-inline",
"overscroll-behavior-x", "overscroll-behavior-y", "padding",
"padding-block", "padding-block-end", "padding-block-start", "padding-bottom",
"padding-inline", "padding-inline-end", "padding-inline-start",
"padding-left", "padding-right", "padding-top", "page-break-after",
"page-break-before", "page-break-inside", "paint-order", "perspective",
"perspective-origin", "place-content", "place-items", "place-self",
"pointer-events", "position", "quotes", "resize", "right", "rotate", "row-gap",
"scale", "scroll-behavior", "scroll-margin", "scroll-margin-block",
"scroll-margin-block-end", "scroll-margin-block-start", "scroll-margin-bottom",
"scroll-margin-inline", "scroll-margin-inline-end",
"scroll-margin-inline-start", "scroll-margin-left", "scroll-margin-right",
"scroll-margin-top", "scroll-padding", "scroll-padding-block",
"scroll-padding-block-end", "scroll-padding-block-start",
"scroll-padding-bottom", "scroll-padding-inline", "scroll-padding-inline-end",
"scroll-padding-inline-start", "scroll-padding-left", "scroll-padding-right",
"scroll-padding-top", "scroll-snap-align", "scroll-snap-stop",
"scroll-snap-type", "tab-size", "table-layout", "text-align",
"text-align-last", "text-decoration", "text-decoration-color",
"text-decoration-line", "text-decoration-style", "text-decoration-thickness",
"text-indent", "text-justify", "text-orientation", "text-overflow",
"text-shadow", "text-transform", "top", "transform", "transform-origin",
"transform-style", "transition", "transition-delay", "transition-duration",
"transition-property", "transition-timing-function", "translate",
"unicode-bidi", "user-select", "vertical-align", "visibility", "white-space",
"widows", "width", "word-break", "word-spacing", "word-wrap", "writing-mode",
"z-index",
];
// TODO: Outcomment properties that I'm not confident are safe to use with
// the "legal values" below.

export const cssUnits = [
    "cm", "mm", "Q", "in", "pc", "pt", "px",
    "em", "ex", "ch", "rem", "lh", "rlh",
    "vw", "vh", "vi", "vb", "vmin", "vmax",
    "svw", "svh", "lvw", "lvh", "dvw", "dvh",
    "deg", "grad", "rad", "turn",
    "s", "ms", "Hz", "kHz",
    "flex",
    "dpi", "dpcm", "dppx",
    "%",
];

export const cssUnitsPattern =
    "((" +
        cssUnits.join(")|(") +
    "))";

export const decimalNumberPattern =
    "(\\.[0-9]+)|((0|[1-9][0-9]*)(\\.[0-9]*)?)";

export const cssNumberUnitPattern =
    decimalNumberPattern + cssUnitsPattern;

export const cssHexColorPattern =
    "#([0-9a-fA-F]{3,4})|([0-9a-fA-F]{6})|([0-9a-fA-F]{8})";



/* Some CSS keyword values that I hope is safe for all CSS properties */
export const cssLegalKeywordValues = [
    "left", "right", "none", "inline-start", "inline-end",
// "inline-table"
// "table-row"
// "table-row-group"
// "table-column"
// "table-column-group"
// "table-cell"
// "table-caption"
// "table-header-group"
// "table-footer-group"
// "inline-flex"
// "inline-grid"
    "repeat-x", "repeat-y", "no-repeat", "repeat",
    "top", "bottom", "fixed",
    "scroll", "center", "justify",
    "dotted", "dashed", "solid", "double", "groove", "ridge", "inset",
    "outset", "none", "hidden",
    "thin", "medium", "thick",
    "border-box",
    "baseline", "text-top", "text-bottom", "sub", "super",
    "overline", "underline", "line-through",
    "uppercase", "lowercase", "capitalize",
    "nowrap", "clip",
    "sans-serif", "serif", "monospace", "cursive", "fantasy",
    "Arial", "Verdana", "Tahoma", "Trebuchet", "Times",
    "Georgia", "Garamond", "Courier", "Brush",
    "normal", "italic", "oblique", "bold", "small-caps",
    "circle", "ellipse", "square",
    "upper-roman", "upper-alpha", "lower-alpha",
    "outside", "inside",
    "collapse",
    "inline", "block", "inline-block",
    "static", "relative", "fixed", "absolute", "sticky",
    "visible", "auto", "both", "table",
    "cover", "contain", "content-box",
    "ellipsis", "break-word", "break-all", "keep-all",
    // "ltr", "rtl",
    "width", "height",
    "ease", "linear", "ease-in", "ease-out", "ease-in-out",
    "transform",
    "fill", "scale-down",
    "not-allowed",
    "horizontal", "vertical",
    "farthest-corner", "closest-side", "closest-corner", "farthest-side",
    "at", // this is not actually a *value* keyword.
    "normal", "reverse", "alternate", "alternate-reverse",
    "forwards", "backwards",
    "infinite", "example",
    // TODO: Consider adding more.
    // TODO: Verify their safety of these keyword values!
];


export const cssLegalFunctions = [
    "linear-gradient", "radial-gradient", "conic-gradient",
    "translate", "rotate", "scale", "scaleX", "scaleY",
    "skew", "skewX", "skewY", "matrix",
    "rgb", "rgba",
];




// I think we can just allow any string on the form:
// Dec ::= ( <Property> : <Values> ; )*
// with
// <Values> ::= ( <Value> [, ] )+
// <Value> ::= <LegalFun> \( <Values> \) | <Number><Unit> | <LegalKeyword> | at
// (In other words, let us just treat 'at' as a value.)
// So this will definitely not be a subset of CSS, but it will be a restriction
// at least in terms of the functions that we are allowed to use.
const cssDecLexemePatterns = [
    ["[\\w+\\-]", "[^\\w+\\-]"],
    [":"], [";"], ["\\("], ["\\)"], [","],
];
// (Note that while we let the whitespace pattern be " \\n\\r\\t", the
// "\\n\\r\\t" characters will only appear in CSS header styles; not
// in in-line styles.)
var cssDeclarationLexer = new Lexer(cssDecLexemePatterns, " \\n\\r\\t");

var cssDeclarationsChecker = new SyntaxChecker(cssDeclarationsLexer);
cssDeclarationsChecker.addLexemePatterns(cssDecLexemePatterns);
cssDeclarationsChecker.addLexemePatterns([
    // "[a-z]+[\\-a-z]*", // regular properties. *No, I don't need this.
    cssNumberUnitPattern, // <Number><Unit>.
    cssHexColorPattern, // hexadecimal color literals.
    "[a-zA-Z]", // keywords and functions.
]);
cssDeclarationsChecker.addProduction("<DeclarationList>", [
    ["initSequence", [
        "<Property>"
    ]],
    ["sequence", [
        ":",
        "<Values>",
        ";"
    ]],

]);
cssDeclarationsChecker.addProduction("<Property>", [
    ["sequence", [
        ["[\\w+\\-]",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // (lexeme variable will hold the "[\\w+\\-]" property lexeme.)
                return cssLegalProperties.includes(lexeme);
            }
        ]
    ]],

]);
cssDeclarationsChecker.addProduction("<Values>", [
    ["nonemptyList", [
        "<Value>", "<OptionalComma>"
    ]],

]);
cssDeclarationsChecker.addProduction("<OptionalComma>", [
    ["optSequence", [
        ","
    ]],

]);
cssDeclarationsChecker.addProduction("<Value>", [
    ["union", [
        cssNumberUnitPattern, // <Number><Unit>.
        cssHexColorPattern, // hexadecimal color literals.
        "<FunctionCall>",
        ["[a-zA-Z]", // keywords.
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // (lexeme variable will hold the "[a-zA-Z]" keyword lexeme.)
                return cssLegalKeywordValues.includes(lexeme);
            }
        ],
    ]],
]);
cssDeclarationsChecker.addProduction("<FunctionCall>", [
    ["initSequence", [
        ["[a-zA-Z]",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // (lexeme variable will hold the "[a-zA-Z]" function name.)
                return cssLegalFunctions.includes(lexeme);
            }
        ]
    ]],
    ["sequence", [
        "\\(",
        "<Values>",
        "\\)",
    ]],
]);




export function checkCSSDeclarationList(declarations, successRequired) {
    successRequired = successRequired ?? true;
    let ret = cssDeclarationsChecker.lexAndParse(
        declarations, "<DeclarationList>"
    );
    if (!ret && successRequired) {
        throw cssDeclarationsChecker.error;
    } else {
        return ret;
    }
}
// Function meant to help with debugging.
export function upaf_checkCSSDeclarationListAndGetErrorAndLexArr(declarations) {
    cssDeclarationsChecker.lexAndParse(declarations, "<DeclarationList>");
    return [cssDeclarationsChecker.error, cssDeclarationsChecker.lexer.lexArr];
}


export function checkCSSValues(values, successRequired) {
    successRequired = successRequired ?? true;
    let ret = cssDeclarationsChecker.lexAndParse(values, "<Values>");
    if (!ret && successRequired) {
        throw cssDeclarationsChecker.error;
    } else {
        return ret;
    }
}
// Function meant to help with debugging.
export function upaf_checkCSSValuesAndGetErrorAndLexArr(values) {
    cssDeclarationsChecker.lexAndParse(values, "<Values>");
    return [cssDeclarationsChecker.error, cssDeclarationsChecker.lexer.lexArr];
}


export function checkCSSProperty(property, successRequired) {
    successRequired = successRequired ?? true;
    let ret = cssLegalProperties.includes(property);
    if (!ret && successRequired) {
        throw "property is not a legal CSS property";
    } else {
        return ret;
    }
}
// // Function meant to help with debugging.
// export function upaf_checkCSSPropertyAndGetError(property) {
//     if (cssLegalProperties.includes(property)) {
//         return "";
//     } else {
//         return "property is not a legal CSS property";
//     }
// }








/* Full CSS syntax (or rather a (safe) subset of a superset of CSS) */

// Let us assume that this will always be wrapped in "#upaFrame {...}", such
// that we are safe as long as we don't include any pseudo elements like
// ::before, ::after or ::parent.
const cssRulesLexemePatterns = [
    // ["#upaFrame "],
    ["[^\\{\\}]", "[\\{\\}]"],
    ["\\{"],
    ["\\}"],

];
var cssRulesLexer = new Lexer(cssDecLexemePatterns, null);

var cssRulesChecker = new SyntaxChecker(cssRulesLexer);
cssRulesChecker.addLexemePatterns(cssRulesPatterns);
// cssRulesChecker.addLexemePatterns([
//
// ]);

cssRulesChecker.addProduction("<RuleList>", [
    ["optList", [
        "<Rule>",
    ]],
]);
cssRulesChecker.addProduction("<Rule>", [
    ["initSequence", [
        ["[^\\{\\}]",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // (The lexeme variable will hold the "[^\\{\\}]" selector,
                // perhaps surrounded by whitespace.)
                // trim the whitespace at both ends to get the selector.
                let selector = lexeme.trim();
                // check the selector using checkSelector().
                return checkSelector(selector, false);
            }
        ],
        "\\{",
    ]],
    ["sequence", [
        "<DeclarationListOrRuleList>"
        "\\}",
    ]],
]);
cssRulesChecker.addProduction("<DeclarationListOrRuleList>", [
    ["union", [
        "<DeclarationList>",
        "<RuleList>",
    ]],
]);
cssRulesChecker.addProduction("<DeclarationList>", [
    ["sequence", [
        ["[^\\{\\}]",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // (The lexeme variable will hold the CSS declaration list.)
                // check the declaration list using checkCSSDeclarationList().
                return checkCSSDeclarationList(lexeme, false);
            }
        ],
    ]],
]);

export function checkCSSRuleList(css, successRequired) {
    successRequired = successRequired ?? true;
    let ret = cssRulesChecker.lexAndParse(css, "<RuleList>");
    if (!ret && successRequired) {
        throw cssRulesChecker.error;
    } else {
        return ret;
    }
}
// Function meant to help with debugging.
export function upaf_checkCSSRuleListAndGetErrorAndLexArr(css) {
    cssRulesChecker.lexAndParse(css, "<RuleList>");
    return [cssRulesChecker.error, cssRulesChecker.lexer.lexArr];
}





/* HTML syntax checker */

// (I still don't wnt to worry about repeated ids, even though my
// SyntaxChecker class now has the ability in principle to record the ids
// it encounters during the parsing.)

// construct a lexer for HTML.
let htmlLexemeAndEndCharPatterns = [
    ["<\\w+", "\\W"], [">"], // beginning tag.
    ["<\\/\\w+>"], // end tag.
    ["="], ["\\("], ["\\)"],
    ['"[ -\\[\\]\\^a-~]*"'], // strings of printable, non-backslash, non-
    // whitespace --- except space --- ASCII characters.
    ["\\w+", "\\W"], // attribute names.
    ["[^<>]+", "[<>]"], // text.
];
var htmlLexer = new Lexer(htmlLexemeAndEndCharPatterns, "[ \\n\\r\\t]+");


// construct a syntax checker for HTML.
var = htmlChecker = new SyntaxChecker(htmlLexer);
// it doesn't hurt to add all the pattern from the lexer, even if I won't use
// some of them.
htmlChecker.addLexemePatterns(htmlLexemeAndEndCharPatterns);

htmlChecker.addProduction("<LegalHTMLContent>", [
    ["optList", [
        "<HTMLElement>",
    ]],
]);
// (Out-commented productions are left for a future implementation.)
// (Also, the unions below are not meant to be complete; they may be expanded
// in a future implementation.)
htmlChecker.addProduction("<LegalHTMLElement>", [
    ["union", [
        "<ContainerTagElement>",
        "<EmptyTagElement>",
        "<Text>",
        // "<MathMLCore>",
        // "<SVG>",
    ]],
]);
const legalContainerHTMLElements = [
    "a", "abbr", "address", "article", "aside", "audio", "b", "bdi", "bdo",
    "blockquote", "button", "cite", "code", "colgroup", "data",
    "datalist", "del", "details", "dfn", "dialog", "div", "dl", "em",
    "fieldset", "figure", "footer", "form",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "header", "hgroup", "hr", "i", "ins", "kbd",
    "label", "map", "mark",
    //"MathML math",
    "menu", "meter", "nav",
    "object", "ol", "output", "p", "picture", "pre",
    "progress", "q", "ruby","rp", "rt", "s", "samp",
    // "script",
    "search", "section",
    "select", "slot", "small", "span", "strong", "sub", "sup",
    // "SVG svg",
    "table", "tbody", "td", "tfoot", "th", "thead", "tr",
    "template",
    "textarea", "time", "u", "ul", "var", "video",
    //"autonomous custom elements",
];
const legalEmptyHTMLElements = [
    "area", "br", "col",
    // "embed",
    "iframe",
    "img", "input", "track",
    "source",
    "wbr",
];
htmlChecker.addProduction("<ContainerTagElement>", [
    ["initSequence", [
        ["<\\w+",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // get the "\\w+" element name from the "<\\w+" lexeme.
                let elementName = lexeme.substring(1);
                // let this testFun fail if elementName is not included in
                // legalContainerHTMLElements.
                if (!legalContainerHTMLElements.includes(elementName)) {
                    return false;
                }
                // push the element name to mainProdScopedArr in order to
                // test if the ending tag matches it, among other things.
                mainProdScopedArr.push(elementName);
            }
        ],
    ]],
    ["sequence", [
        // (Note that the <AttributeDefinitionList> production also includes
        // a test function which depends on the newly pushed elementName.)
        "<AttributeDefinitionList>",
        ">", // because of the "initSequence", htmlChecker.check() will throw
        // immediately if reaching this point and failing to parse ">". (The
        // same thing can be said about parsing the end tag below, but both
        // <AttributeDefinitionList> and <LegalHTMLContent> are optional, and
        // will thus not fail unless they contain invalid syntax within them.)
        "<LegalHTMLContent>",
        ["<\\/\\w+>",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // let this testFun return whether the element name in this
                // end tag matches the recorded name for the beginning tag,
                // and make sure to also pop the tag name from mainProdScopedArr
                // again.
                let endTag = "</" + mainProdScopedArr.pop() + ">";
                if (endTag !== lexeme) {
                    // This error message overwrites the standard one.
                    throw (
                        "Expected either <LegalHTMLContent> or '" + endTag +
                        "' but got " + lexeme
                    );
                }
                // if (endTag === lexeme), return true.
                return true;
            }
        ],
    ]],
]);

htmlChecker.addProduction("<EmptyTagElement>", [
    ["initSequence", [
        ["<\\w+",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // get the "\\w+" element name from the "<\\w+" lexeme.
                let elementName = lexeme.substring(1);
                // let this testFun fail if elementName is not included in
                // legalContainerHTMLElements.
                if (!legalEmptyHTMLElements.includes(elementName)) {
                    return false;
                }
                // push the element name to mainProdScopedArr specifically in
                // order to be able to check the <AttributeDefinitionList>.
                mainProdScopedArr.push(elementName);
            }
        ],
    ]],
    ["sequence", [
        "<AttributeDefinitionList>",
        [">",
            // make sure to pop the elementName again.
            mainProdScopedArr.pop();
        ]
    ]],
]);

htmlChecker.addProduction("(([^<>&]+)|(&#[0-9]+;)|(&\\w+;))+");
htmlChecker.addProduction("<Text>", [
    ["sequence", [
        "(([^<>&]+)|(&#[0-9]+;)|(&\\w+;))+",
    ]],
]);



htmlChecker.addProduction("<AttributeDefinitionList>", [
    ["optList", [
        "<AttributeDefinition>"
    ]],
]);
htmlChecker.addProduction("<AttributeDefinition>", [
    ["union", [
        "<RegularAttributeDefinition>"
        "<BooleanAttributeDefinition>"
    ]],
]);
htmlChecker.addProduction("<RegularAttributeDefinition>", [
    ["initSequence", [
        ["\\w+",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // record the "\\w+" attribute name recorded in lexeme in
                // currentProdScopedArr.
                currentProdScopedArr[0] = lexeme;
            }
        ],
        "=",
    ]],
    ["sequence", [
        ['"[ -\\[\\]\\^a-~]*"',
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // read the tag name from mainProdScopedArr, read the attribute
                // name from currentProdScopedArr[0], and read the attribute
                // value from lexeme.
                let tagName = mainProdScopedArr[mainProdScopedArr.length - 1];
                let attrName = currentProdScopedArr[0];
                let attrVal = lexeme.substring(1, lexeme.length - 1);
                // then validate this triplet be a call to
                // testTagNameAttrNameAttrValTriplet() (which throws an
                // error if the triplet is illegal).
                testTagNameAttrNameAttrValTriplet(tagName, attrName, attrVal);
                // return true if the check succeeded without throwing.
                return true;
            }
        ],
    ]],
]);

htmlChecker.addProduction("<BooleanAttributeDefinition>", [
    ["sequence", [
        ["\\w+",
            function(lexeme, currentProdScopedArr, mainProdScopedArr) {
                // read the tag name from mainProdScopedArr and read the
                // attribute name from lexeme.
                let tagName = mainProdScopedArr[mainProdScopedArr.length - 1];
                let attrName = lexeme;
                // then validate this pair be a call to
                // testTagNameAttrNameAttrValTriplet() (which throws an
                // error if the triplet is illegal).
                testTagNameAttrNameAttrValTriplet(tagName, attrName, null);
                // return true if the check succeeded without throwing.
                return true;
            }
        ],
    ]],
]);


/* A function to validate tagName--attrName--attrVal triplets */

const legalAttrNameAttrValPairStruct = {
    "id": {
        "All":
            /^upai_\w+$/,
    },
    "class": {
        "All":
            true,
    },
    "style": {
        "All": function(attrVal) {
            cssDeclarationsChecker.lexAndCheck(attrVal);
        },
    },
    "hidden": {
        "All":
            true,
    },
    "type": {
        "input": [
            "button", "checkbox", "color", "date", "file", "hidden", "image",
            "month", "number", "radio", "range", "reset", "search", "submit",
            "tel", "text", "time", "url", "week",
        ],
    },
    "action": {
        "form":
            /^javascript:((void\(0\))|(upaf_[\$\w]+\(\w*\)))$/,
    },
    "alt": {
        "area":
            // (Note that attrVal already matches /[ -\[\]\^a-~]*/ here.)
            /^[^<>]$/,
        "img":
            /^[^<>]$/,
        "input":
            /^[^<>]$/,
    },
    "for": {
        "label":
            /^upai_\w+$/,
    },
    // TODO: Add more.
};
// (I thought I would add e.g. hrefs and srcs, but because one needs to know
// the pattern / pattern key to verify a URL, it makes more sense to this be
// handled by special upaf_ functions only. It is anyway also often best to
// insert any new HTML as soon as possible, and then handle all subsequent
// AJAX requests (asynchronously) afterwards (and not try to verify relevant
// URLs *before* the new HTML is inserted).


export function isLegalTagNameAttrNameAttrValTriplet(
    tagName, attrName, attrVal
) {
    let attrValValidationData =
        legalAttrNameAttrValPairStruct[attrName][tagName] ??
        legalAttrNameAttrValPairStruct[attrName]["All"] ??
        false;
    if (attrValValidationData === false) {
        return false;
    }
    if (attrValValidationData === true) {
        return true;
    }
    if (attrValValidationData instanceof Array) {
        return attrValValidationData.includes(attrVal);
    }
    if (attrValValidationData instanceof RegExp) {
        return attrValValidationData.test(attrVal);
    }
    if (attrValValidationData instanceof Function) {
        return attrValValidationData(attrVal);
    }
    throw (
        "isLegalTagNameAttrNameAttrValTriplet(): " +
        "attrValValidationData not a instance of a right class"
    );
}
// TODO: Add some more attributes, such as 'pattern', 'placeholder' and 'list'..

export function testTagNameAttrNameAttrValTriplet(
    tagName, attrName, attrVal
) {
    if (!isLegalTagNameAttrNameAttrValTriplet(tagName, attrName, attrVal)) {
        throw (
            "testTagNameAttrNameAttrValTriplet(): illegal combination of " +
            "tagName, attribute name and attribute value (" + tagName +
            ", " + attrName + ", " + attrVal + ")"
        );
    }
}


export function checkHTML(html, successRequired) {
    successRequired = successRequired ?? true;
    let ret = htmlChecker.lexAndParse(html, "<LegalHTMLContent>");
    if (!ret && successRequired) {
        throw htmlChecker.error;
    } else {
        return ret;
    }
}
// Function meant to help with debugging.
export function upaf_checkHTMLAndGetErrorAndLexArr(html) {
    htmlChecker.lexAndParse(html, "<LegalHTMLContent>");
    return [htmlChecker.error, htmlChecker.lexer.lexArr];
}
