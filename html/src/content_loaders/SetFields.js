
import {
    ContentLoader,
} from "/src/ContentLoader.js";
import {
    sdbInterfaceCL, appColumnCL,
} from "/src/content_loaders/ColumnInterface.js";



/*
SetList requires data:
    data.setDataArr = [setData, ...],
        setData = {
            predKeys, ratTransFun, userWeightArr, setArr, avgSet, queryParams,
            refresh
        },
        predKeys =
            {relID, objType, objID} |
            {predTitle, objType, objID} |
            {predID} |
            {title, (objType, objID)?}, (requires setArr to be given)
        userWeightArr = [{userID, weight}, ...],
        queryParams = {
            num, ratingLow, ratingHigh, queryOffset, queryAscending
        },
    data.elemContentKey,
    data.subjType,
    data.initialNum,
    data.incrementNum,
    // data.showHeader,
    // data.applySortingOptions.
    // data.sortingOptions. (if applySortingOptions == true.)
And it also sets/updates data:
    data.combSet = [[combRatVal, subjID, ratValArr], ...].
*/
export var setListCL = new ContentLoader(
    "SetList",
    /* Initial HTML template */
    '<<PredicateSetField data:wait>>',
    appColumnCL
);
setFieldCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "setDataArr",
        "elemContentKey",
        "subjType",
        "initialNum",
        "incrementNum",
    ]);
    data.titleCutOutLevels = [2, 1];
    // data.titleCutOutLevels = [1, 1];
});
setFieldCL.addCallback(function($ci, data) {
    let len = data.setDataArr.length;
    for (let i = 0; i < len; i++) {
        queryAndSetAvgSetAndSignalCI(setDataArr[i], $ci, signal);
    }
});

export function queryAndSetAvgSetAndSignalCI(setData, $ci, signal) {
    // if setData.avgSet is already set and setData.refresh is not true, simply
    // send the ready signal immediatly
    if (!!setData.avgSet && !setData.refresh) {
        $ci.trigger(signal, [setData.title]);
        return;
    }
    // else, we should first..

}

















// NOTE: Since RelationSetField does not try set up any lasting events, this
// works. But do not decorate a CL that then waits for data, like here, and then
// try to have the decorator add events to the CI, since these will just be
// removed when the waiting decoratee finally loads.
setFieldCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "objType",
        "objID",
        "relID",
    ]);
    data.titleCutOutLevels = [2, 1];
    // data.titleCutOutLevels = [1, 1];
});
setFieldCL.addCallback(function($ci, data) {
    $ci.one("query-pred-title-then-pred-id-then-load", function() {
        let dbReqManager = sdbInterfaceCL.globalData.dbReqManager;
        let reqData = {
            type: "term",
            id: data.relID,
        };
        dbReqManager.query($ci, reqData, function($ci, result) {
            data.predTitle = (result[0] ?? [])[1];
            $ci.trigger("query-pred-id-then-load");
        });
        return false;
    });
    $ci.one("query-pred-id-then-load", function() {
        let dbReqManager = sdbInterfaceCL.globalData.dbReqManager;
        let reqData = {
            type: "termID",
            cid: "2", // the ID of the Predicate Context
            spt: data.objType,
            spid: data.objID,
            t: encodeURI(data.predTitle),
        };
        dbReqManager.query($ci, reqData, function($ci, result) {
            data.predID = (result[0] ?? [0])[0]; // predID = 0 if missing.
            if (data.predID === 0) {
                relationSetFieldCL.loadBefore(
                    $ci, "MissingPredicateText", data
                );
                relationSetFieldCL.loadReplaced(
                    $ci, "SubmitPredicateField", data
                );
            } else {
                $ci.trigger("load");
            }
        });
        return false;
    });
    $ci.trigger("query-pred-title-then-pred-id-then-load");
});
export var missingPredicateTextCL = new ContentLoader(
    "MissingPredicateText",
    /* Initial HTML template */
    '<span class="text-warning">' +
        'Predicate not found. Do you want to create the Predicate?' +
    '</span>',
    appColumnCL
);


export var predicateSetFieldCL = new ContentLoader(
    "PredicateSetField",
    /* Initial HTML template */
    '<div>' +
        '<<SetHeader>>' +
        '<<SetList data:wait>>' +
    '</div>',
    appColumnCL
);
predicateSetFieldCL.addCallback("data", function(data) {
    // data.copyFromAncestor("predTitle", 1); // copy only from own parent.
    data.copyFromAncestor([
        "elemContentKey",
        "predID",
        "subjType",
        "queryNum",
        "userWeightArr",
        "initialNum",
        "incrementNum",
    ]);
});
predicateSetFieldCL.addCallback(function($ci, data) {
    $ci.one("query-initial-sets-then-load", function() {
        let dbReqManager = sdbInterfaceCL.globalData.dbReqManager;
        data.setDataArr = [{
            predID: data.predID,
            ratTransFun: 1,
            userWeightArr: data.get("userWeightArr"),
            setArr: [],
        }];
        let len = data.userWeightArr.length;
        for (let i = 0; i < len; i++) {
            let reqData = {
                type: "set",
                uid: data.userWeightArr[i].userID,
                pid: data.predID,
                st: data.subjType,
                rl: data.ratingLow ?? -32767,
                rh: data.ratingHigh ?? 32767,
                n: data.queryNum,
                o: data.queryOffset ?? 0,
                a: data.queryAscending ?? 0,
            };
            dbReqManager.query($ci, reqData, i, function($ci, result, i) {
                data.setDataArr[0].setArr[i] = result;
                $ci.trigger("load-initial-set-list-if-ready");
            });
        }
        return false;
    });
    $ci.on("load-initial-set-list-if-ready", function() {
        let len = data.userWeightArr.length;
        for (let i = 0; i < len; i++) {
            if (typeof data.setDataArr[0].setArr[i] === "undefined") {
                return false;
            }
        }
        let userSets = data.setDataArr[0];
        data.combSet = getAveragedSet(userSets.setArr, userSets.userWeightArr);
        $ci.children('.CI.SetList').trigger("load");
        // off this event.
        $ci.off("load-initial-set-list-if-ready");
        // trigger event to make header responsive to click event.
        $ci.children('.CI.SetHeader').trigger("setDataArr-is-ready");
        return false;
    });
    $ci.trigger("query-initial-sets-then-load");
});




/**
 * SetList requires data:
     * data.elemContentKey,
     * data.subjType,
     * data.combSet = [[combRatVal, subjID, ratValArr], ...],
     * data.initialNum,
     * data.incrementNum (can be changed before appending a new list).
     * TODO: Add filter set IDs (meaning userID + predID) to potentially
         * collapse elements before loading.
 * And it sets/updates data:
     * newData.listElemDataArr = [{ratVal, subjID}, ...],
     * newData.currentLen.
 */
export var setListCL = new ContentLoader(
    "SetList",
    /* Initial HTML template */
    '<div>' +
        '<<List>>' +
    '</div>',
    appColumnCL
);
setListCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "elemContentKey",
        "subjType",
        "combSet",
        "initialNum",
        "incrementNum",
    ]);
});
setListCL.addCallback("data", function(data) {
    data.cl = setListCL.getRelatedCL(data.getFromAncestor("elemContentKey"));
    data.copyFromAncestor("initialNum");
    let subjType = data.subjType;
    data.listElemDataArr = data.combSet
        .slice(0, data.initialNum)
        .map(function(row) {
            return {
                combRatVal: row[0],
                entityID: row[1],
                entityType: subjType,
                avgRatValArr: row[3] ?? [],
            };
        });
    data.currentLen = data.initialNum;
});
setListCL.addCallback(function($ci, data) {
    $ci.on("append-list", function() {
        let $this = $(this);
        let data = $(this).data("data");
        let subjType = data.subjType;
        data.listElemDataArr = data.set
            .slice(data.currentLen, data.currentLen + data.incrementNum)
            .map(function(row) {
                return {
                    combRatVal: row[0],
                    entityID: row[1],
                    entityType: subjType,
                    avgRatValArr: row[3] ?? [row[0]],
                };
            });
        data.currentLen += data.incrementNum;
        setListCL.loadAppended($this, 'List', data);
    });
});






export var setHeaderCL = new ContentLoader(
    "SetHeader",
    /* Initial HTML template */
    '<div>' +
        '<<PredicateTitle>>' +
        '<<RefreshButton>>' +
        '<<AddButton>>' + // Button to add predicate (menu point) in dd. menu.
        '<<DropdownButton>>' +
        '<<SetPredicatesDropdownMenu data:wait>>' +
    '</div>',
    appColumnCL
);
setHeaderCL.addCallback(function($ci, data) {
    $ci.one("setDataArr-is-ready", function() {
        $(this).one("click", function() {
            let $this = $(this);
            $this.find('.CI.SetPredicatesDropdownMenu').trigger("load");
            $this.on("click", function() {
                $(this).find('.CI.SetPredicatesDropdownMenu').toggle();
            })
        });
    });
});
export var setPredicatesDropdownMenuCL = new ContentLoader(
    "SetPredicatesDropdownMenu",
    /* Initial HTML template */
    '<div>' +
        '<<SetPredicateMenuPoint data.setDataArr[...]>>' +
    '</div>',
    appColumnCL
);
export var setPredicateMenuPointCL = new ContentLoader(
    "SetPredicateMenuPoint",
    /* Initial HTML template */
    '<div>' +
        '<<PredicateTitle>>' +
        '<<RatingTransformFunctionMenu>>' +
        // '<<UserWeightsMenu>>' +
    '</div>',
    appColumnCL
);
export var ratingTransformFunctionMenuCL = new ContentLoader(
    "RatingTransformFunctionMenu",
    /* Initial HTML template */
    '<div>' +
        // TODO: CHange this to add more options for the function, and also so
        // that the user can set rl and rh for the set query, as well as decide
        // if the predicate set should be a superset the combined set
        // (filtering away all other elements).
        '<div class="form-group">' +
            '<label>factor:</label>' +
            '<input type="number" class="form-control">' +
        '</div>' +
    '</div>',
    appColumnCL
);
ratingTransformFunctionMenuCL.addCallback("data", function(data) {
    let setDataArr = getFromAncestor("setDataArr");
    data.copyFromAncestor("predID");
    let len = setDataArr.length;
    // find the userSets object corresponing to the relevant predicate.
    for (let i = 0; i < len; i++) {
        if (setDataArr[i].predID = data.predID) {
            data.userSets = setDataArr[i];
            break;
        }
    }
});
ratingTransformFunctionMenuCL.addCallback(function($ci, data) {
    $ci
});





// TODO: Make the user weight menu a global one, changed for the whole
// sdbInterface at once.
// export var userWeightArrMenuCL = new ContentLoader(
//     "UserWeightsMenu",
//     /* Initial HTML template */
//     '<div>' +
//         '<<UserWeightMenuPoint data.userWeightArr[...]>>' +
//     '</div>',
//     appColumnCL
// );
// export var userWeightMenuPointCL = new ContentLoader(
//     "UserWeightMenuPoint",
//     /* Initial HTML template */
//     '<div>' +
//         '<div class="form-group">' +
//             '<label><<UserTitle>> weight:</label>' +
//             '<input type="text" class="form-control">' +
//         '</div>' +
//     '</div>',
//     appColumnCL
// );
// userWeightMenuPointCL.addCallback("data", function(data) {
//     data.entityType = "u";
//     data.entityID = data.getFromAncestor("userID");
// });





// getAveragedSet() takes a two arrays, setArr and userWeightArr, and returns a
// unioned set containing the weighted averaged ratings for any subjects that
// appear in one or more of the setArr.
export function getAveragedSet(setArr, userWeightArr, sortFlag) {
    // if there is only one set, simply return the set as is.
    let setNum = setArr.length;
    if (setNum === 1) {
        return setArr[0];
    }
    // else, first sort each array in terms of the subject IDs.
    for (let i = 0; i < setNum; i++) {
        setArr[i].sort(row1, row2 => row1[1] - row2[1]);
    }

    let setLengths = setArr.map(val => val.length);
    let setLenSum = setLengths.reduce((acc, val) => acc + val, 0);
    let ret = new Array(setLenSum);
    let retLen = 0;
    let positions = new Array(setNum).fill(0);
    let continueLoop = true;
    while (continueLoop) {
        let minSubjID = positions.reduce(
            (acc, val, ind) => Math.min(acc, setArr[ind][val][1]), 0
        );
        let weightedRatValOfMinSubjArray = positions.map(
            (val, ind) => (setArr[ind][val][1] !== minSubjID) ? "" :
                setArr[ind][val][0] * userWeightArr[ind]
        );
        let weightSum = weightedRatValOfMinSubjArray.reduce(
            (acc, val, ind) => acc + ((val === "") ? 0 : userWeightArr[ind]), 0
        );

        let averagedRatVal = weightedRatValOfMinSubjArray
            .reduce((acc, val) => acc + val, 0) /
                weightSum;
        ret[retLen] = [averagedRatVal, minSubjID];
            // .sort(row1, row2 => row2[0] - row1[0]); ..
        retLen++;
        // increase the positions.
        for (let i = 0; i < setNum; i++) {
            if (weightedRatValOfMinSubjArray[i] !== "") {
                positions[i] += 1;
            }
        }
        continueLoop = false;
        for (let i = 0; i < setNum; i++) {
            if (positions[i] === setLengths) {
                positions[i] -= 1;
            } else {
                continueLoop = true;
            }
        }
    }
    return ret;
}

export function setAveragedSets(setDataArr, boolArr, sortFlag) {
    let predNum = setDataArr.length;
    if (!boolArr) {
        boolArr = new Array(predNum).fill(true);
    }
    for (let i = 0; i < predNum; i++) {
        if (boolArr[0]) {
            setDataArr[i].avgSet = getAveragedSet(
                setDataArr.setArr, setDataArr.userWeightArr, sortFlag
            );
        }
    }
}


// (setDataArr = [{predID, ratTransFun, userWeightArr, setArr, avgSet}, ...].)

/**
 * getCombinedSet(setDataArr) returns a combined set,
 * combSet = [[combRatVal, subjID, ratValArr], ...]. This is done by first
 * using setAveragedSets() to get averaged sets for each predicate. Then these
 * sets are further combined into one by applying the individual ratTransFuns
 * and then adding up the values. The first predicate in setDataArr and the
 * corresponding averaged set is treated specially in that the combined will
 * contain all the entities of that set and no more. If the other sets contain
 * other entities, these will then not be used for the combined set. And for
 * all the entities of the first set that are not present in a given other set,
 * their averaged rating value will then be set to 0 (before applying the
 * rating transformer function).
 */
// TODO: Figure out about the sortFlag, and what should happen when predNum ==
// 1..
export function getCombinedSet(setDataArr, boolArr, sortFlag) {
    // first compute the averaged sets for each predicate (where the ratings
    // from each user for that predicate is combined as a weighted average).
    setAveragedSets(setDataArr, boolArr); // (An undefined sortFlag means that
    // the averaged sets will be sorted in terms of subjID.)
    // then initialize the return array to the first averaged set, but with an
    // extra third column meant to contain all the averaged ratings before this
    // combination
    let predNum = setDataArr.length;
    let ret = setDataArr[0].avgSet.map(
        row => [row[0], row[1], new Array(predNum).fill(row[0])]
    );
    // for each subsequent avgSet, look for any subjID contained in the first
    // set, and for each one found, apply the setDataArr[i].ratTransFun to the
    // averaged ratVal and add the result to the combRatVal located in the first
    // column of ret. Also store the same averaged ratVal as is in the array in
    // the third column of ret.
    let retLen = ret.length;
    for (let i = 1; i < predNum; i++) {
        let ratTransFun = setDataArr[i].ratTransFun;
        let avgSet = setDataArr[i].avgSet;
        let avgSetLen = avgSet.length;
        let pos = 0;
        for (let j = 0; j < retLen; j++) {
            let subjID = ret[j][1];
            while (avgSet[pos][1] < subjID && pos < avgSetLen - 1) {
                pos++;
            }
            let row = avgSet[pos];
            if (row[1] == subjID) {
                ret[j][0] += ratTransFun(row[0]);
                ret[j][1][i] = row[0];
            } else {
                ret[j][0] += ratTransFun(0);
                ret[j][1][i] = null;
            }
        }
    }
    return ret;
}
