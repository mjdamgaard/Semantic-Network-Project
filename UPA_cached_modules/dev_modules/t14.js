
import {
    DBRequestManager,
} from "/UPA_scripts.php?id=11";
import {
    ContentLoader,
} from "/UPA_scripts.php?id=12";

import {
    sdbInterfaceCL, appColumnCL,
} from "/UPA_scripts.php?id=13";








/**
 * SetField requires data:
     * data.objType,
     * data.objID,
     * data.relID,
     * data.subjType,
     * data.queryNum,
     * data.userWeights = [{userID, weight}, ...],
     * data.elemCL,
     * data.initialNum,
     * data.incrementNum.
 * And it sets/updates data:
     * data.predTitle,
     * data.predID,
     * data.set = [[combRatVal, subjID, ratValArr], ...],
     * data.userSetsArr = [{predID, factorFun, userSetsObj}, ...],
         * userSetsObj = {userWeights, sets},
     * data.setLen,
     * TODO: make it so that users can adjust the parameters, rl, rh, o and a.
     * data.ratingLow,
     * data.ratingHigh,
     * data.queryOffset,
     * data.queryAscending.
 */
export var setFieldCL = new ContentLoader(
    "SetField",
    /* Initial HTML template */
    '<div>' +
        '<<SetHeader data:wait>>' +
        '<<SetList data:wait>>' +
    '</div>',
    appColumnCL
);
setFieldCL.addCallback(function($ci, data) {
    $ci
        .one("query-initial-pred-title", function() {
            let dbReqManager = sdbInterfaceCL.dynamicData.dbReqManager;
            reqData = {
                type: "term",
                id: data.relID,
            };
            dbReqManager.query($ci, reqData, function($ci, result) {
                data.predtitle = (result[0] ?? [])[1];
                $ci.trigger("query-initial-pred-id");
            });
            return false;
        })
        .one("query-initial-pred-id", function() {
            let dbReqManager = sdbInterfaceCL.dynamicData.dbReqManager;
            reqData = {
                type: "termID",
                cid: "2", // the ID of the Predicate Context
                spt: data.objType,
                spid: data.objID,
                t: data.predTitle,
            };
            dbReqManager.query($ci, reqData, function($ci, result) {
                data.predID = (result[0] ?? [])[0];
                $ci.trigger("query-initial-sets");
            });
            return false;
        })
        .one("query-initial-sets", function() {
            let dbReqManager = sdbInterfaceCL.dynamicData.dbReqManager;
            data.userSetsArr = [{
                predID: data.predID,
                factorFun: x => 1,
                userSetsObj: {
                    userWeights: data.userWeights,
                    sets: [],
                },
            }];
            let len = data.userWeights.length;
            for (let i = 0; i < len; i++) {
                reqData = {
                    type: "set",
                    uid: data.userWeights[i].userID,
                    pid: data.predID,
                    st: data.subjType,
                    rl: "", rh: "",
                    n: data.queryNum, o: 0,
                    a: 0,
                };
                dbReqManager.query($ci, reqData, i, function($ci, result, i) {
                    data.userSetsArr[0].userSetsObj.sets[i] = result;
                    $ci.trigger("load-initial-set-list-if-ready");
                });
            }
            return false;
        })
        .on("load-initial-set-list-if-ready", function() {
            let len = data.userWeights.length;
            for (let i = 0; i < len; i++) {
                if (
                    typeof data.userSetsArr[0].userSetsObj.sets[i] ===
                        "undefined"
                ) {
                    return false;
                }
            }
            data.set = getAveragedSet(data.userSetsArr[0].userSetsObj);
            $ci.children('.CI.SetList').trigger("load");
            $ci.off("load-initial-set-list-if-ready");
            return false;
        });
});
setFieldCL.addCallback(function($ci, data) {
    $ci.trigger("query-initial-pred-title");
});


// getAveragedSet() takes a userSetsObj = {userWeights, sets} and returns a
// unioned set containing the weighted averaged ratings for any subjects that
// appear in one or more of the sets.
export function getAveragedSet(userSetsObj) {
    // if there is only one set, simply return the set as is.
    let sets = userSetsObj.sets
    let setNum = sets.length;
    if (setNum === 1) {
        return sets[0];
    }
    // else, first sort each array in terms of the subject IDs.
    for (let i = 0; i < setNum; i++) {
        sets[i].sort(row1, row2 => row1[1] - row2[1]);
    }
    // ..TODO..

    let ret = new Array(sets.reduce((acc, currVal) => acc + currVal.length, 0));
    let retLen = 0;
    let indices = new Array(setNum);
    for (let i = 0; i < setNum; i++) {
        indices[i] = [i, 0];
    }
    let continue = true;
    let weights = userSetsObj.weights;
    while (continue) {
        let minSubjID = indices.reduce(
            (acc, currVal) => Math.min(acc, sets[currVal[0]][currVal[1]][1]),
            0
        );
        let weightSum = 0;
        for (let i = 0; i < setNum; i++) {
            if (sets[i][indices[i][1]][1] === minSubjID) {
                weightSum += weights[i];
            }
        }
        // ret[retLen] = indices.reduce(
        //     (acc, currVal) => acc +
        //         sets[currVal[0]][currVal[1]][0] * weights[currVal[0]] /
        //             weightSum,
        //     0
        // );
        // retLen++;
    }
}
export function getCombinedSet(userSetsArr) {
    // TODO..
    // let len = userSetsArr.length;
    // if (len === 1) {
    //     return userSetsArr[0].set
    //         .map(function(row) {
    //             return [
    //                 row[0],
    //                 row[1],
    //                 [],
    //             ];
    //         });
    // }
    // TODO: Implement this function for non-trivial cases as well.
}




/**
 * SetList requires data:
     * data.subjType,
     * data.cl = <element CL>,
     * data.set = [[ratVal, subjID], ...],
     * data.setLen,
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
setListCL.addCallback("data", function(newData, data) {
    newData.listElemDataArr = data.set
        .slice(0, data.initialNum)
        .map(function(row) {
            return {
                ratVal: row[0],
                subjID: row[1],
            };
        });
    newData.currentLen = data.initialNum;
});
setListCL.addCallback(function($ci, data) {
    $ci.on("append-list", function() {
        let $this = $(this);
        let data = $(this).data("data");
        data.listElemDataArr = data.set
            .slice(data.currentLen, data.currentLen + data.incrementNum)
            .map(function(row) {
                return {
                    ratVal: row[0],
                    subjID: row[1],
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
        // TODO: add a bar with user weight buttons and a refresh button. *(This
        // bar should also turn into a drop-down menu for some decorating CLs.
        '<<PredicateRepresentation>>' +
    '</div>',
    appColumnCL
);
setHeaderCL.addCallback("data", function(newData, data) {
    let setInfo = data.setInfo;
    newData.subjType = setInfo[2];
    newData.subjID = setInfo[3];
    newData.relID = setInfo[4];
    newData.relText = setInfo[5];
    newData.objType = setInfo[6];
});
export var predicateRepresentationCL = new ContentLoader(
    "PredicateRepresentation",
    /* Initial HTML template */
    '<div>' +
        '<<RelationTitle>>' +
        '<<SubjectTitle>>' +
    '</div>',
    appColumnCL
);
export var relationTitleCL = new ContentLoader(
    "RelationTitle",
    /* Initial HTML template */
    '<<EntityTitle>>',
    appColumnCL
);
relationTitleCL.addCallback("data", function(newData, data) {
    newData.entityType = "r";
    newData.entityID = data.relID;
    newData.title = data.relText;
});
export var subjectTitleCL = new ContentLoader(
    "SubjectTitle",
    /* Initial HTML template */
    '<span>' +
        '<<EntityTitle>>' +
    '</span>',
    appColumnCL
);
subjectTitleCL.addCallback("data", function(newData, data) {
    newData.entityType = data.subjType;
    newData.entityID = data.subjID;
});




export var entityTitleCL = new ContentLoader(
    "EntityTitle",
    /* Initial HTML template */
    '<span>' +
    '</span>',
    appColumnCL
);
entityTitleCL.addCallback(function($ci, data) {
    if (typeof data.title === "string") {
        $ci.append(data.title);
        return;
    }
    let dbReqManager = sdbInterfaceCL.dynamicData.dbReqManager;
    let reqData = {
        id: data.entityID,
    };
    switch (data.entityType) {
        case "c":
            reqData.type = "cat"
            break;
        case "t":
            reqData.type = "term"
            break;
        case "r":
            reqData.type = "rel"
            break;
        default:
            throw "entityType " + data.entityType + " not implemented";
    }
    dbReqManager.query($ci, reqData, function($ci, result) {
        $ci.append(result[0][0]);
    });
});
entityTitleCL.addCallback(function($ci, data) {
    $ci
        .on("click", function() {
            let columnData = {
                queryUserID: data.queryUserID,
                inputUserID: data.inputUserID,
                entityType: data.entityType,
                entityID: data.entityID,
                subjType: data.subjType,
                subjID: data.subjID,
            };
            $(this)
                .trigger("open-column", [
                    "EntityColumn", columnData, "right", true
                ])
                .trigger("column-click");
            return false;
        });
});



export var entityRepresentationCL = new ContentLoader(
    "EntityRepresentation",
    /* Initial HTML template */
    '<div>' +
        '<<EntityTitle>>' +
    '</div>',
    appColumnCL
);


//
