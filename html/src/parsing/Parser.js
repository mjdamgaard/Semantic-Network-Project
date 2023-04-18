
class Parser = {

constructor() {
    this.parseFunctions = {};
    this.error = "";
    this.success = undefined;
    // this.lexArr = undefined;
    this.nextPos = [0];
}


parse(lexArr, productionKey) {
    // parse and try for error.
    try {
        this.parseFunctions[productionKey](lexArr, this.nextPos, true);
    } catch (error) {
        this.error = "Parsing failed at position " + this.nextPos.toString() +
            " after\n'" +
            lexArr.slice(Math.max(0, nextPos - 20), nextPos).join(" ") + "'\n" +
            error;
        this.success = false;
        return false;
    }
    // check if all the lexeme array has been parsed.
    if (this.nextPos >= lexArr.length) {
        this.error = "Parsing failed at position " + this.nextPos.toString() +
            " after\n'" +
            lexArr.slice(Math.max(0, nextPos - 20), nextPos).join(" ") + "'\n" +
            "The lexame array was only partially parsed";
        this.success = false;
        return false;
    }
    // if it has, return true.
    this.error = "";
    this.success = true;
    return true;
}

addProduction(key, parseSettings) {
    // if parseSettings is a RegEx, simply add the corresponding single-
    // lexeme production (as a parse function).
    if (parseSettings instanceof RegExp) {
        // initialize the single-lexeme parse function.
        this.parseFunctions[key] =
            function(lexArr, nextPos, successRequired) {
                let test = parseSettings.test(lexArr[nextPos[0]]);
                if (!test && successRequired) {
                    throw (
                        'Expected lexeme of production ' + key + ' ' +
                        '(with syntax pattern "/' + parseSettings.source + '/")'
                    );
                } else if (!test) {
                    return false;
                } else {
                    nextPos[0] += 1;
                    return true;
                }
            };
    }
    // else we assume that parseSettings is an array of [parseType,
    // subproductionKeys] arrays, where subproductionKeys are
    // earlier (or later) defined function keys added with addProduction().
    let settingsLen = parseSettings.length;
    this.parseFunctions[key] = function(lexArr, nextPos, successRequired) {
        // record the initial position.
        initialPos = nextPos[0];
        // declare the boolean return value.
        var ret;
        // go through each parse setting and do the parsing as instructed.
        try {
            for (let i = 0; i < settingsLen; i++) {
                let parseType = parseSettings[i][0];
                let subproductionKeys = parseSettings[i][1];
                switch (parseType) {
                    case ("optWords"):
                        // parse some optional words that are never required.
                        ret = parseWords(
                            lexArr, nextPos, subproductionKeys, false
                        );
                    case ("initWords"):
                        // parse some initial words after which the rest of
                        // the "words" in the production become mandatory.
                        ret = parseWords(
                            lexArr, nextPos, subproductionKeys, successRequired
                        );
                        successRequired = true;
                    case ("words"):
                        // parse some words which are required only if
                        // successRequired is true or if "initalWords" has
                        // appeared before.
                        ret = parseWords(
                            lexArr, nextPos, subproductionKeys, successRequired
                        );
                    case ("list"):
                        // parse an optional list with a required delimeter of
                        // a syntax defined by subproductionKeys[1]. If
                        // subproductionKeys[1] is undefined, then the list
                        // expects no delimeter between its elements.
                        let delimeterRegEx = subSettings;
                        ret = parseList(
                            lexArr, nextPos,
                            subproductionKeys[0], subproductionKeys[1]
                        );
                    case ("union"):
                        // parse at least one of the subproductions pointed to
                        // by each of the the subproductionKeys.
                        ret = parseUnion(
                            lexArr, nextPos, subproductionKeys, successRequired
                        );
                    case ("optUnion"):
                        // parse at most one of the subproductions pointed to
                        // by each of the the subproductionKeys.
                        ret = parseUnion(
                            lexArr, nextPos, subproductionKeys, false
                        );
                    default:
                        // (Note that this error is only thrown in the call
                        // to parse(), not to addProduction().)
                        throw (
                            "addProduction(): Unknown parseType: " + parseType
                        );
                }
            }
        } catch (error) {
            error += " in " + key + " at position " + initialPos.toString();
            throw error;
        }
        // if no error was thrown, test ret to see if nextPos has to be reset.
        if (!ret) {
            nextPos[0] = initialPos;
        }
        // return the boolean ret, which denotes if the parsing succeeded or
        // not.
        return ret;
    }
}

parseWords(lexArr, nextPos, subproductionKeys, successRequired) {
    // initialize bolean return value as true.
    var ret = true;
    // loop through the subproductionKeys and call the corresponding parsing
    // function.
    let subKeysLen = subproductionKeys.length;
    var i;
    for (i = 0; i < subKeysLen; i++) {
        let key = subproductionKeys[i];
        // (Note that all parseFunctions reset nextPos on failure (excpet when
        // an error is thrown).)
        ret = this.parseFunctions[key](lexArr, nextPos, successRequired);
        if (!ret) {
            break;
        }
    }
    // throw an error if parsing failed and successRequired == true;
    if (successRequired && !ret) {
        throw (
            'Expected word of production ' + subproductionKeys[i]
        );
    }
    // return the conjunction of all the individual results of those parsings.
    return ret;
}

parseUnion(lexArr, nextPos, subproductionKeys, successRequired) {
    // initialize bolean return value as false.
    var ret = false;
    // loop through the subproductionKeys and call the corresponding parsing
    // function.
    let subKeysLen = subproductionKeys.length;
    for (let i = 0; i < subKeysLen; i++) {
        let key = subproductionKeys[i];
        // (Note that all parseFunctions reset nextPos on failure.)
        ret = this.parseFunctions[key](lexArr, nextPos, successRequired);
        if (ret) {
            break;
        }
    }
    // throw an error if parsing failed and successRequired == true;
    if (successRequired && !ret) {
        throw (
            'Expected word of production (' + subproductionKeys.join("|") + ")"
        );
    }
    // return true if one of the parsings succeeded, or return false otherwise.
    return ret;
}

parseList(lexArr, nextPos, elementProductionKey, delimeterProductionKey) {
    let delimeterIsProvided = (typeof delimeterProductionKey !== "undefined");
    // (Note that all parseFunctions reset nextPos on failure.)
    while (this.parseFunctions[elementProductionKey](lexArr, nextPos, false)) {
        if (
            delimeterIsProvided &&
            !this.parseFunctions[delimeterProductionKey](lexArr, nextPos, false)
        ) {
            break;
        }
    }
    // always return true unless an error was thrown in a nested parsing.
    return true;
    // NOTE: If a trailing delimeter is allowed, this should be implemented
    // by adding an "optWord" parsing after this "list" parsing.
}



// end of class.
}
