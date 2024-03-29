
import {
    ContentLoader,
} from "/src/ContentLoader.js";
import {
    sdbInterfaceCL, dbReqManager, accountManager,
} from "/src/content_loaders/SDBInterface.js";


export var ratingElementCL = new ContentLoader(
    "RatingElement",
    /* Initial HTML template */
    '<div>' +
        '<<RatingDisplay>>' +
    '</div>',
    sdbInterfaceCL
);
ratingElementCL.addCallback("data", function(data) {
    data.catID = data.getFromAncestor("entID");
    data.copyFromAncestor("instID");
});

export var ratingDisplayCL = new ContentLoader(
    "RatingDisplay",
    /* Initial HTML template */
    '<div>' +
        '<div class="statement">' +
            '<<EntityTitle>> ' +
            '<span class="applies-to-inst">' +
                '(applies to <<EntityTitle data.instData:wait>>)' +
            '</span>' +
        '</div>' +
        '<<QueryUserRatingDisplay data:wait>>' +
        '<<InputRatingSlider data:wait>>' +
    '</div>',
    sdbInterfaceCL
);
ratingDisplayCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "catID",
        "instID",
    ]);
    data.entID = data.catID;
    data.instData = {entID: data.instID};
});
ratingDisplayCL.addCallback(function($ci, data) {
    $ci.find('.statement .CI.EntityTitle:last-of-type').trigger("load");
});
ratingDisplayCL.addCallback(function($ci, data) {
    let reqData = {
        req: "rat",
        u: accountManager.stdQueryUserID,
        c: data.catID,
        i: data.instID,
    };
    dbReqManager.query($ci, reqData, data, function($ci, result, data) {
        data.queryUserRatVal = (result[0] ?? [0])[0];
        // I'll out-comment this for now:
        // $ci.find('.CI.QueryUserRatingDisplay').trigger("load");
    });
    data.inputUserID = accountManager.inputUserID;
    if (data.inputUserID) {
        reqData = {
            req: "rat",
            u: data.inputUserID,
            c: data.catID,
            i: data.instID,
        };
        dbReqManager.query($ci, reqData, data, function($ci, result, data) {
            data.prevInputRatVal = (result[0] ?? [0])[0];
            $ci.find('.CI.InputRatingSlider').trigger("load");
        });
    } else {
        let $obj = $ci.find('.CI.InputRatingSlider');
        ratingDisplayCL.loadReplaced($obj, "LogInToRateText", data);
    }
});


export var logInToRateTextCL = new ContentLoader(
    "LogInToRateText",
    /* Initial HTML template */
    '<span class="text-warning">' +
        'Log in or sign up in order to submit own rating.' +
    '</span>',
    sdbInterfaceCL
);


export var queryUserRatingDisplayCL = new ContentLoader(
    "QueryUserRatingDisplay",
    /* Initial HTML template */
    '<div>' +
    '</div>',
    sdbInterfaceCL
);
queryUserRatingDisplayCL.addCallback(function($ci, data) {
    let ratVal = data.getFromAncestor("queryUserRatVal");
    if (ratVal) {
        $ci.html((ratVal / 6553.5).toFixed(1));
    } else {
        $ci.html("no rating");
    }
});


// TODO: Insert ten starts above the rating slider that fills up with yellow
// according to the position of the slider.
export var inputRatingSliderCL = new ContentLoader(
    "InputRatingSlider",
    /* Initial HTML template */
    '<div>' +
        '<input type="range" min="0.1" max="10.0" step="0.1" value="5">' +
        '<div class="value-display"></div>' +
        '<div class="button-container">' +
            '<button class="btn btn-default clear">Clear</button>' +
            '<button class="btn btn-default submit">Submit</button>' +
        '</div>' +
    '</div>',
    sdbInterfaceCL
);
inputRatingSliderCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "prevInputRatVal",
        "inputUserID",
        "catID",
        "instID",
    ]);
});
inputRatingSliderCL.addCallback(function($ci, data) {
    let prevInputRatVal = data.prevInputRatVal;
    if (prevInputRatVal) { // value cannot be 0 (only null or positive).
        let sliderVal = (prevInputRatVal / 6553.5).toFixed(1);
        $ci.find('input[type="range"]').val(sliderVal);
        $ci.find('.value-display').html(sliderVal);
    } else {
        $ci.find('button.clear').hide();
    }
    $ci.find('button.submit').hide();
});
inputRatingSliderCL.addCallback(function($ci, data) {
    $ci.find('button.clear').on("click", function() {
        let $ci = $(this).closest('.CI.InputRatingSlider');
        let data = $ci.data("data");
        let reqData = {
            req: "rat",
            ses: accountManager.sesIDHex,
            u: accountManager.inputUserID,
            c: data.catID,
            i: data.instID,
            r: 0,
            l: 0,
        };
        dbReqManager.input($ci, reqData, data, function($ci, result, data) {
            $ci.find('input[type="range"]').val(5);
            $ci.find('button.clear').hide();
        });
        return false;
    });
    $ci.find('input[type="range"]').one("input", function() {
        let $this = $(this);
        let $ci = $this.closest('.CI.InputRatingSlider');
        $ci.find('button.submit').show().on("click", function() {
            let $ci = $(this).closest('.CI.InputRatingSlider');
            let data = $ci.data("data");
            let inputVal = $ci.find('input[type="range"]').val();
            let roundedRatVal = Math.max(Math.round(inputVal * 25.5), 1) * 256;
            let reqData = {
                req: "rat",
                ses: accountManager.sesIDHex,
                u: accountManager.inputUserID,
                c: data.catID,
                i: data.instID,
                r: roundedRatVal,
                l: 0,
            };
            $ci.find('button.submit').hide();
            dbReqManager.input($ci, reqData, data, function($ci, result, data) {
                $ci.find('button.clear').show();
            });
            return false;
        });
        $this.on("change input", function() {
            let $this = $(this);
            let sliderVal = $this.val();
            let $ci = $this.closest('.CI.InputRatingSlider');
            $ci.find('.value-display').html(sliderVal);
            $ci.find('button.clear').hide();
            $ci.find('button.submit').show();
            return false;
        });
        return false;
    });
});
// TODO: Maybe add a Reset button to get the previous rating back after having
// changed the slider.
