import {
    ContentLoader, ChildData,
} from "/src/ContentLoader.js";
import {
    sdbInterfaceCL, dbReqManager,
} from "/src/content_loaders/SDBInterfaces.js";



export var submitTermFieldCL = new ContentLoader(
    "SubmitTermField",
    /* Initial HTML template */
    '<div>' +
        '<h4>Submit a Term</h4>' +
        '<form action="javascript:void(0);">' +
            '<div class="std-field-container"></div>' +
            '<div class="extra-field-container"></div>' +
            '<button class="btn btn-default add-field">Add field</button>' +
            '<button class="btn btn-default submit">Submit</button>' +
        '</form>' +
        '<div class="response-display"></div>' +
    '</div>',
    sdbInterfaceCL
);
submitTermFieldCL.addCallback("data", function(data) {
    data.cxtID = data.getFromAncestor("cxtID") ?? 1;
});
submitTermFieldCL.addCallback(function($ci, data) {
    $ci.one("append-input-fields", function(event, labelArr) {
        let $obj = $(this).find('.std-field-container');
        labelArr.forEach(function(label) {
            submitTermFieldCL.loadAppended(
                $obj, "TextAreaFormGroup", new ChildData(data, {label:label})
            );
        });
        return false;
    });
});
submitTermFieldCL.addCallback(function($ci, data) {
    if (data.cxtID == 1) {
        let labelArr = ["Title/Defining text"];
        $ci.trigger("append-input-fields", [labelArr]);
        return;
    }
    let reqData = {
        type: "term",
        id: data.cxtID,
    };
    dbReqManager.query($ci, reqData, data, function($ci, result, data) {
        let cxtDefStr = (result[0] ?? [""])[1];
        if (cxtDefStr === "") {
            console.warn(
                "Context #" + data.cxtID + " has been removed from the database"
            );
            return;
        }
        let labelArr = getLabelArr(cxtDefStr);
        $ci.trigger("append-input-fields", [labelArr]);
    });
});
export function getLabelArr(cxtDefStr) {
    return cxtDefStr
        .replaceAll("&gt;", ">")
        .replaceAll("&lt;", "<")
        .match(/<[^<>]*>/g)
        .map(val => val.slice(1, -1));
}

submitTermFieldCL.addCallback(function($ci, data) {
    $ci.find('button.submit').on("click", function() {
        $(this).trigger("submit-term"); // "submit" event fires for all buttons.
    });
    $ci.on("submit-term", function() {
        let $this = $(this);
        let $standardInputFields = $this
            .find('.std-field-container')
            .children('.CI.TextAreaFormGroup');
        let $extraInputFields = $this
            .find('.extra-field-container')
            .children('.CI.ExtraInputFormGroup');
        // extract inputs from which to contruct the defining string.
        let defStrParts = [];
        $standardInputFields.each(function() {
            let input = $(this).find('.form-control').val().trim();
            defStrParts.push(input);
        });
        $extraInputFields.each(function() {
            let $this = $(this);
            let labelInput = $this.find('label .label-input').val().trim();
            let valInput = $this.children('.form-control').val().trim();
            if (valInput) {
                let input = "";
                if (labelInput) {
                    input = labelInput + ":";
                }
                input += valInput;
                defStrParts.push(input);
            }
        });
        // contruct the defining string.
        let defStr = defStrParts
            .map(val => val.replaceAll("|", "\\|").replaceAll("\\", "\\\\"))
            .join("|");
        // test if defStr is not too long or too short, and submit if not.
        if (defStr.length > 255) {
            $this.children('.response-display').html(
                '<span class="text-warning">' +
                    'Defining text is too long' +
                '</span>'
            );
            console.log("Too long defining string: " + defStr);
            return;
        }
        if (defStr.length == 0) {
            $this.children('.response-display').html(
                '<span class="text-warning">' +
                    'No defining text was supplied' +
                '</span>'
            );
            return;
        }
        // upload the new Term.
        let reqData = {
            type: "term",
            u: data.getFromAncestor("inputUserID"),
            c: data.cxtID == 1 ? 0 : data.cxtID,
            s: defStr,
        };
        dbReqManager.input($this, reqData, data, function($ci, result, data) {
            let exitCode = result.exitCode;
            let outID = result.outID;
            let newData = new ChildData(data, {termID: outID});
            if (exitCode == 0) {
                $ci.children('.response-display').html(
                    '<span class="text-success">' +
                        'Term was successfully uploaded!' +
                    '</span>' +
                    '<div>' +
                        'New ID: #' + outID +
                    '</div>'
                );
                $ci.trigger("open-column", ["AppColumn", newData, "right"]);
            } else if (exitCode == 1) {
                $ci.children('.response-display').html(
                    '<span class="text-info">' +
                        'Term already exists' +
                    '</span>' +
                    '<div>' +
                        'ID: #' + outID +
                    '</div>'
                );
                $ci.trigger("open-column", ["AppColumn", newData, "right"]);
            } else {
                // throw error since this should not happen.
                throw "Recieved exitCode=" + exitCode + " from Term submission";
            }
        });
        return false;
    });
});

submitTermFieldCL.addCallback(function($ci, data) {
    if (data.cxtID == 1) {
        $ci.find('button.add-field').hide();
        return;
    }
    $ci.find('button.add-field').on("click", function() {
        $(this).trigger("add-field"); // "submit" event fires for all buttons.
    });
    $ci.on("add-field", function() {
        let $obj = $(this).find('.extra-field-container');
        submitTermFieldCL.loadAppended($obj, "ExtraInputFormGroup", data);
        return false;
    });
});

export var textAreaFormGroupCL = new ContentLoader(
    "TextAreaFormGroup",
    /* Initial HTML template */
    '<div class="form-group">' +
        '<label></label>' +
        '<textarea rows="1" class="form-control"></textarea>' +
    '</div>',
    sdbInterfaceCL
);
textAreaFormGroupCL.addCallback("data", function(data) {
    data.copyFromAncestor([
        "label",
    ]);
});
textAreaFormGroupCL.addCallback(function($ci, data) {
    $ci.find('label').append(data.label + ":");
});

export var extraInputFormGroupCL = new ContentLoader(
    "ExtraInputFormGroup",
    /* Initial HTML template */
    '<div class="form-group">' +
        '<<CloseButton>>' +
        '<label>' +
            '<input type="text" class="label-input"></input>:' +
        '</label>' +
        '<textarea rows="1" class="form-control"></textarea>' +
    '</div>',
    sdbInterfaceCL
);
extraInputFormGroupCL.addCallback(function($ci, data) {
    $ci.on("close", function() {
        $(this).remove();
        return false;
    });
});
// TODO: Consider dropping the label.. ..or perhaps just make the colon syntax
// standard, and then make sure that IDs can be used instead of strings after
// the (first) colon..



// '<div>' +
//     '<h4>Submit a Predicate</h4>' +
//     '<form action="javascript:void(0);">' +
//         '<div class="form-group">' +
//             '<label>Relation text:</label>' +
//             '<textarea rows="1" class="form-control title"></textarea>' +
//         '</div>' +
//         '<div class="relation-id-display"></div>' +
//
//         '<div class="form-group">' +
//             '<label>Object type:</label>' +
//             '<input type="text" class="form-control specType">' +
//         '</div>' +
//         '<div class="form-group">' +
//             '<label>Object ID:</label>' +
//             '<input type="text" class="form-control specID">' +
//         '</div>' +
//         '<div class="object-title-display"></div>' +
//
//         '<button type="submit" class="btn btn-default">Submit</button>' +
//     '</form>' +
//     '<div class="response-display"></div>' +
// '</div>',