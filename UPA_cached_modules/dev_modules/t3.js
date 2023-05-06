
import {
    DBRequestManager,
} from "/UPA_scripts.php?id=t1";
import {
    ContentLoader,
} from "/UPA_scripts.php?id=t2";




export var upaCL = new ContentLoader(
    "ColumnBasedSDBInterface",
    /* Initial HTML */
    '<div id="upa1" class="sdb-interface-app">' +
        '<<ColumnGroup>>' +
    '</div>'
);
export var columnGroupCL = new ContentLoader(
    "ColumnGroup",
    /* Initial HTML */
    '<div class="app-column-group">' +
        '<<OuterColumn>>' +
    '</div>',
    upaCL
);

export var outerColumnCL = new ContentLoader(
    "OuterColumn",
    /* Initial HTML */
    '<<Column>>',
    columnGroupCL,
);
outerColumnCL.nestedCSSRules.push(
    'margin: 5px 5px;'
)
outerColumnCL.inwardCallbacks.push(function($ci) {
    let termType = $ci.data("contextData").termID.substring(0, 1);
    switch (termType) {
        case "c":
            $ci.attr("data-key", "CategoryColumn");
            break;
        default:
            throw (
                "Term type '" + termType + "' has not been implemented yet"
            );
    }
});
columnGroupCL.outwardCallbacks.push(function($ci) {
    $ci.css({
        padding: "0px 20px 0px 20px"
    });
});

export var columnCL = new ContentLoader(
    "Column",
    /* Initial HTML */
    '<div class="app-column">' +
        "<<ColumnHeader>>" +
        "<<ColumnMain>>" +
        // "<<ColumnFooter>>" +
    '</div>',
    columnGroupCL
);
export var columnHeaderCL = new ContentLoader(
    "ColumnHeader",
    /* Initial HTML */
    '<header class="">' +
        '<<TabNavList>>' +
    '</header>',
    columnCL
);
export var columnMainCL = new ContentLoader(
    "ColumnMain",
    /* Initial HTML */
    '<main class=""></main>',
    columnCL
);

export var tabNavListCL = new ContentLoader(
    "TabNavList",
    /* Initial HTML */
    '<ul class="nav nav-tabs"></ul>',
    upaCL
);
tabNavListCL.nestedCSSRules.push(
    '& > li > a { padding: 7px 12px; }'
);
tabNavListCL.nestedCSSRules.push(
    '&.odd { left-margin: 2px }'
);
// columnCL.inwardCallbacks.push(function($ci, data, childData) {
//     let parentColumnParity = data.columnParity ?? 1;
//     childData.columnParity = !parentColumnOddity;
// });
// columnCL.outwardCallbacks.push(function($ci, data) {
//     let parentColumnParity = data.columnParity ?? 1;
//     $ci.data("columnParity", !parentColumnParity);
// });
// tabNavListCL.outwardCallbacks.push(function($ci, data) {
//     if (data.columnParity) {
//         $ci.addClass("odd");
//     }
// });




columnCL.outwardCallbacks.push(function($ci) {
    $ci.data("page-spec-store", {})
        .on("add-page", function(event, tabTitle, contentKey, pageData) {
            let pageCL = columnCL.getRelatedContentLoader(contentKey);
            $(this).data("page-spec-store")[tabTitle] =
                {cl:pageCL, data:pageData};
            return false;
        })
        .on("open-page", function(event, tabTitle) {
            let $this = $(this);
            let pageSpec = $this.data("page-spec-store")[tabTitle];
            $(this).children('.CI.ColumnMain')
                .trigger("open-page", [tabTitle, pageSpec.cl, pageSpec.data]);
            return false;
        })
        .on("close-page", function(event, tabTitle) {
            $(this).children('.CI.ColumnMain')
                .trigger("open-page", [tabTitle]);
            return false;
        })
        .on("add-tab", function(event, tabTitle) {
            $(this).children('.CI.ColumnHeader')
                .trigger("add-tab", [tabTitle]);
            return false;
        })
        .on("activate-tab", function(event, tabTitle) {
            $(this).children('.CI.ColumnHeader')
                .trigger("activate-tab", [tabTitle]);
            return false;
        })
        .on("add-tab-and-page", function(
            event, tabTitle, contentKey, pageData
        ) {
            $(this)
                .trigger("add-page", [tabTitle, contentKey, pageData])
                .trigger("add-tab", [tabTitle]);
            return false;
        })
        .on("open-tab-and-page", function(event, tabTitle) {
            $(this)
                .trigger("activate-tab", [tabTitle])
                .trigger("open-page", [tabTitle]);
            return false;
        })
        .on("tab-selected", function(event, tabTitle) {
            $(this).trigger("open-page", [tabTitle]);
            return false;
        });
});




columnHeaderCL.outwardCallbacks.push(function($ci) {
    $ci
        .on("add-tab", function(event, tabTitle) {
            $(this).find('.CI.TabNavList')
                .trigger("add-tab", [tabTitle]);
            return false;
        })
        .on("activate-tab", function(event, tabTitle) {
            $(this).find('.CI.TabNavList')
                .trigger("activate-tab", [tabTitle]);
            return false;
        });
});


tabNavListCL.outwardCallbacks.push(function($ci) {
    $ci
        .on("add-tab", function(event, tabTitle) {
            let $newTab = $(this).append(
                    '<li data-title="' + tabTitle + '"> <a href="#">' +
                    tabTitle + '</a> </li>'
                )
                .children(':last-child');
            $newTab.on("click", function() {
                $(this)
                    .trigger("activate-tab", [tabTitle])
                    .trigger("tab-selected", [tabTitle]);
                return false;
            });
            return false;
        })
        .on("activate-tab", function(event, tabTitle) {
            $(this).children('li')
                .removeClass("active")
                .filter('[data-title="' + tabTitle + '"]')
                .addClass("active");
            return false;
        });
});


columnMainCL.outwardCallbacks.push(function($ci) {
    $ci.data("open-pages-title-arr", [])
        .on("open-page", function(event, tabTitle, pageCL, pageData) {
            let $this = $(this);
            if ($this.data("open-pages-title-arr").includes(tabTitle)) {
                $this.children().hide();
                $this.children('[data-title="' + tabTitle +'"]').show();
            } else {
                $this.data("open-pages-title-arr").push(tabTitle);
                $this.children().hide();
                pageCL.loadAppended($this, pageData);
                $this.children(':last-child').attr("data-title", tabTitle);
            }
            return false;
        })
        .on("close-page", function(event, tabTitle) {
            let $this = $(this);
            let titleArr = $this.data("open-pages-title-arr");
            titleArr[titleArr.indexOf(tabTitle)] = null;
            $this.children('[data-title="' + tabTitle +'"]').remove();
            return false;
        })
});





export var pageFieldCL = new ContentLoader(
    "PageField",
    /* Initial HTML */
    '<div></div>',
    columnCL
);
pageFieldCL.outwardCallbacks.push(function($ci) {
    $ci.data('db-request-manager', new DBRequestManager())
        .on("query-db", function(event, reqData, cacheKey, callback) {
            let $this = $(this);
            let dbReqManager = $this.data('db-request-manager');
            dbReqManager.query($this, reqData, cacheKey, callback);
            return false;
        })
        .on("append-cis", function(event, contentKey, dataArr, selector) {
            let $obj = (typeof selector === "undefined") ?
                $(this) : $(this).find(selector);
            let cl = pageFieldCL.getRelatedContentLoader(contentKey);
            let len = dataArr.length;
            for (let i = 0; i < len; i++) {
                cl.loadAppended($obj, dataArr[i]);
            }
            return false;
        });
        // TODO: add a prepend-cis event also, after having debugged.
});
export var termListCL = new ContentLoader(
    "TermList",
    /* Initial HTML */
    '<<PageField>>',
    columnCL
);
termListCL.outwardCallbacks.push(function($ci) {
    $ci.append('<ul class="container"></ul>');
});
termListCL.outwardCallbacks.push(function($ci) {
    $ci
        .on("append-elements", function(event, contentKey, elemDataArr) {
            $(this).trigger("append-cis", [contentKey, elemDataArr, 'ul, ol']);
            return false;
        })
        .on("empty", function(event, elemDataArr, elemCL) {
            $(this).children('ul, ol').empty();
            return false;
        });
});


export var extensibleTermListCL = new ContentLoader(
    "ExtensibleTermList",
    /* Initial HTML */
    '<<TermList>>',
    columnCL
);
// TODO: Add a callback that adds a button at the bottom of the ci, which when
// pressed, adds elements to the list, either cached ones or ones that are then
// queried.



export var termListElementCL = new ContentLoader(
    "TermListElement",
    /* Initial HTML */
    '<div></div>',
    columnCL
);



/* Test */

export var categoryListElementCL = new ContentLoader(
    "CategoryListElement",
    /* Initial HTML */
    '<<TermListElement>>',
    columnCL
);
categoryListElementCL.outwardCallbacks.push(function($ci) {
    $ci.append(
        '<span>Hello, I will become a category term list element</span>'
    );
});

export var supercategoryPageCL = new ContentLoader(
    "SupercategoryPage",
    /* Initial HTML */
    '<<Column>>',
    columnCL
);
supercategoryPageCL.outwardCallbacks.push(function($ci) {
    let childContextData = $ci.data("childContextData");
    $ci.trigger("add-tab-and-page",
        ["Defining supercategories", "DefSuperCatsPage", childContextData]
    );
    $ci.trigger("open-tab-and-page", ["Defining supercategories"]);
    // open the "DefSuperCatsPage" tab as the default one.
    // TODO
});

export var defSuperCatsPageCL = new ContentLoader(
    "DefSuperCatsPage",
    /* Initial HTML */
    '<<ExtensibleTermList>>',
    columnCL
);
defSuperCatsPageCL.outwardCallbacks.push(function($ci) {
    let elemDataArr = [{}, {}, {}];
    $ci.trigger("append-elements", ["CategoryListElement", elemDataArr]);
});

export var mainPageCL = new ContentLoader(
    "MainPage",
    /* Initial HTML */
    '<div></div>',
    columnCL
);
mainPageCL.inwardCallbacks.push(function($ci) {
    let contextData = $ci.data("contextData");
    $ci.prepend(
        '<span>Hello, I will be a main page generated from: ' +
        JSON.stringify(contextData) + '</span>'
    );
});

export var categoryColumnCL = new ContentLoader(
    "CategoryColumn",
    /* Initial HTML */
    '<<Column>>',
    columnGroupCL
);


categoryColumnCL.outwardCallbacks.push(function($ci) {
    let childContextData = $ci.data("childContextData");
    $ci.trigger("add-tab-and-page",
        ["Supercategories", "SupercategoryPage", childContextData]
    );
    $ci.trigger("add-tab-and-page",
        ["Subcategories", "MainPage", childContextData]
    );
    $ci.trigger("add-tab-and-page",
        ["Elements", "MainPage", childContextData]
    );
    // open the "Subcategories" tab as the default one.
    $ci.trigger("open-tab-and-page", ["Subcategories"]);
});
