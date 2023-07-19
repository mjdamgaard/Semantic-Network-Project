
import {
    ContentLoader,
} from "/src/ContentLoader.js";
import {
    sdbInterfaceCL, dbReqManager,
} from "/src/content_loaders/SDBInterfaces.js";
import {
    SetQuerier, SetCombiner, MaxRatingSetCombiner,
} from "/src/content_loaders/SetLists.js";




export var entityPageCL = new ContentLoader(
    "EntityPage",
    /* Initial HTML template */
    '<div>' +
        '<h2><<EntityTitle>></h2>' +
        '<span class="full-title">Full title: <<FullEntityTitle>></span>' +
        '<div><<EntityIDDisplay>></div>' +
        '<div><<ContextDisplay>></div>' +
         "<<PagesWithTabs data:wait>>" +
     '</div>',
    sdbInterfaceCL
);
entityPageCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "entID",
        // "tmplID",  // optional.
    ]);
    data.columnEntityID = data.entID;
});
entityPageCL.addCallback(function($ci, data) {
    if (data.tmplID) {
        $ci.children('.CI.PagesWithTabs').trigger("load");
        return;
    };
    let reqData = {
        req: "ent",
        id: data.entID,
    };
    let $this = $(this);
    dbReqManager.query($ci, reqData, data, function($ci, result, data) {
        data.typeID = result[0][0];
        data.tabAndPageDataArr = [
            ["Info", "EntityInfoPage", {}],
            ["Ratings", "EntityRatingsPage", {}],
            ["Related to", "PropertyCategoryPage", {
                propID: 42,
            }],
        ];
        switch (data.typeID) {
            case 1:
                data.tabAndPageDataArr.push(
                    ["Relevant ratings", "RelevantRatingsTypePage"],
                    ["Relevant properties", "RelevantPropertiesTypePage"],
                );
                data.defaultTab = data.getFromAncestor("defaultTab", 1) ??
                    "Relevant ratings";
                break;
            case 2:
                data.tabAndPageDataArr.push(
                    ["Subcategories", "PropertyCategoryPage", {propID: 37,}],
                    ["Instances", "CategoryInstancesPage"],
                    ["Supercategories", "PropertyCategoryPage", {propID: 47,}],
                    ["Submit instance", "SubmitCategoryInstancePage"],
                );
                data.defaultTab = data.getFromAncestor("defaultTab", 1) ??
                    "Subcategories";
                break;
            case 3:
                data.tabAndPageDataArr.push(
                    ["Submit template instance", "SubmitTemplateInstancePage"],
                );
                data.defaultTab = data.getFromAncestor("defaultTab", 1) ??
                    "Submit template instance";
                break;
            default:
                data.defaultTab = data.getFromAncestor("defaultTab", 1) ??
                    "Info";
                break;
        }
        // TODO: Implement the following two tabs as well.
        // data.tabAndPageDataArr.push(
        //     ["Comments", "EntityCommentsPage", {}],
        //     ["Discussions", "EntityDiscussionsPage", {}],
        // );
        $ci.children('.CI.PagesWithTabs').trigger("load");
    });
});

export var entIDDisplayCL = new ContentLoader(
    "EntityIDDisplay",
    /* Initial HTML template */
    '<span>ID: </span>',
    sdbInterfaceCL
);
entIDDisplayCL.addCallback(function($ci, data) {
    $ci.append('#' + data.getFromAncestor("entID"));
});


export var propertyCategoryPageCL = new ContentLoader(
    "PropertyCategoryPage",
    /* Initial HTML template */
    '<div>' +
        '<<SetDisplay>>' +
    '</div>',
    sdbInterfaceCL
);
propertyCategoryPageCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "propID",
        "entID",  // optional.
    ]);
});
propertyCategoryPageCL.addCallback("data", function(data) {
    data.elemContentKey = "GeneralEntityElement";
    data.setGenerator = new SetQuerier({
        catTmplID: 21, // ID of the "<Property> of <Entity>" template.
        catStr: "#" + data.propID + "|#" + data.entID,
        queryUserID: 9,
        inputUserID: 9,
        num: 4000,
        ratingLo: 0,
        ratingHi: 0,
    });
    data.initialNum = 50;
    data.incrementNum = 50;
});


// TODO: Obvoiusly gather the repeated code above and below at some point, and
// probably gather it into a BasicSetQuerier class (subclass of SetQuerier).
// Make that class take the CI data as an input parameter, from which to get the
// input and query user IDs.


export var categoryInstancesPageCL = new ContentLoader(
    "CategoryInstancesPage",
    /* Initial HTML template */
    '<div>' +
        '<<SetDisplay>>' +
    '</div>',
    sdbInterfaceCL
);
categoryInstancesPageCL.addCallback("data", function(data) {
    data.elemContentKey = "GeneralEntityElement";
    data.setGenerator = new SetQuerier({
        catID: data.getFromAncestor("entID"),
        queryUserID: 9,
        inputUserID: 9,
        num: 4000,
        ratingLo: 0,
        ratingHi: 0,
    });
    data.initialNum = 50;
    data.incrementNum = 50;
});


export var submitCategoryInstancePageCL = new ContentLoader(
    "SubmitCategoryInstancePage",
    /* Initial HTML template */
    '<div>' +
        '<<SubmitInstanceField>>' +
    '</div>',
    sdbInterfaceCL
);





export var entityRatingsPageCL = new ContentLoader(
    "EntityRatingsPage",
    /* Initial HTML template */
    '<div>' +
        '<h4>Relevant ratings</h4>' +
        '<<SetDisplay>>' +
    '</div>',
    sdbInterfaceCL
);
entityRatingsPageCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "entID",
        "typeID",
    ]);
});
entityRatingsPageCL.addCallback("data", function(data) {
    // Relevant categories:
    data.elemContentKey = "RatingElement";
    let sg1 = new SetQuerier({
        catTmplID: 21, // ID of the "<Property> of <Entity>" template.
        catStr: "#54|#" + data.entID,
        queryUserID: 9,
        inputUserID: 9,
        num: 4000,
        ratingLo: 0,
        ratingHi: 0,
    });
    let sg2 = new SetQuerier({
        catTmplID: 21, // ID of the "<Property> of <Entity>" template.
        catStr: "#52|#" + data.typeID,
        queryUserID: 9,
        inputUserID: 9,
        num: 4000,
        ratingLo: 0,
        ratingHi: 0,
    });
    data.setGenerator = new MaxRatingSetCombiner([sg1, sg2]);
    data.initialNum = 50;
    data.incrementNum = 50;
});
entityRatingsPageCL.addCallback("data", function(data) {
    data.instID = data.getFromAncestor("columnEntityID");
    data.copyFromAncestor("queryUserID");
});




export var submitTemplateInstancePageCL = new ContentLoader(
    "SubmitTemplateInstancePage",
    /* Initial HTML template */
    '<div>' +
        '<<SubmitEntityField>>' +
    '</div>',
    sdbInterfaceCL
);
submitTemplateInstancePageCL.addCallback("data", function(data) {
    data.tmplID = data.getFromAncestor("entID");
});



export var relevantRatingsTypePageCL = new ContentLoader(
    "RelevantRatingsTypePage",
    /* Initial HTML template */
    '<div>' +
        '<h4>Relevant categories to rate for entities of this type</h4>' +
        '<<SetDisplay>>' +
    '</div>',
    sdbInterfaceCL
);
relevantRatingsTypePageCL.addCallback("data", function(data) {
    data.copyFromAncestor("entID");
});
relevantRatingsTypePageCL.addCallback("data", function(data) {
    data.elemContentKey = "GeneralEntityElement";
    data.setGenerator = new SetQuerier({
        catTmplID: 21, // ID of the "<Property> of <Entity>" template.
        catStr: "#52|#" + data.entID,
        queryUserID: 9,
        inputUserID: 9,
        num: 4000,
        ratingLo: 0,
        ratingHi: 0,
    });
    data.initialNum = 50;
    data.incrementNum = 50;
});

export var relevantPropertiesTypePageCL = new ContentLoader(
    "RelevantPropertiesTypePage",
    /* Initial HTML template */
    '<div>' +
        '<h4>Relevant categories to rate for entities of this type</h4>' +
        '<<SetDisplay>>' +
    '</div>',
    sdbInterfaceCL
);
relevantPropertiesTypePageCL.addCallback("data", function(data) {
    data.copyFromAncestor("entID");
});
relevantPropertiesTypePageCL.addCallback("data", function(data) {
    data.elemContentKey = "GeneralEntityElement";
    data.setGenerator = new SetQuerier({
        catTmplID: 21, // ID of the "<Property> of <Entity>" template.
        catStr: "#58|#" + data.entID,
        queryUserID: 9,
        inputUserID: 9,
        num: 4000,
        ratingLo: 0,
        ratingHi: 0,
    });
    data.initialNum = 50;
    data.incrementNum = 50;
});





export var entityInfoPageCL = new ContentLoader(
    "EntityInfoPage",
    /* Initial HTML template */
    '<div>' +
        '<<SetDisplay>>' +
    '</div>',
    sdbInterfaceCL
);
entityInfoPageCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "entID",
        "typeID",
    ]);
});
entityInfoPageCL.addCallback("data", function(data) {
    data.elemContentKey = "SemanticPropertyElement";
    let sg1 = new SetQuerier({
        catTmplID: 21, // ID of the "<Property> of <Entity>" template.
        catStr: "#58|#" + data.entID,
        queryUserID: 9,
        inputUserID: 9,
        num: 100,
        ratingLo: 0,
        ratingHi: 0,
    });
    let sg2 = new SetQuerier({
        catTmplID: 21, // ID of the "<Property> of <Entity>" template.
        catStr: "#59|#" + data.typeID,
        queryUserID: 9,
        inputUserID: 9,
        num: 100,
        ratingLo: 0,
        ratingHi: 0,
    });
    data.setGenerator = new MaxRatingSetCombiner([sg1, sg2]);
    data.initialNum = 50;
    data.incrementNum = 50;
});
