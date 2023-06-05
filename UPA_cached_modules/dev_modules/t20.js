/* A main function */

import "/src/DBRequestManager.js";
import "/src/ContentLoader.js";
import {sdbInterfaceCL} from "/src/content_loaders/ColumnInterface.js";
import "/src/content_loaders/PagesWithTabs.js";
import "/src/content_loaders/SetFields.js";
import "/src/content_loaders/Titles.js";
import "/src/content_loaders/EntityColumns.js";
import "/src/content_loaders/SetElements.js";
import "/src/content_loaders/SubmitFields.js";
// import * as t16Mod from "/UPA_scripts.php?id=16";

import * as t19Mod from "/UPA_scripts.php?id=19";


export function upa_main(entityType, entityID, queryUserID, inputUserID) {
    if (queryUserID !== "1") {
        throw "Unrecognized query user";
    }

    let data = {
        entityType: entityType,
        entityID: entityID,
        queryUserID: queryUserID,
        inputUserID: inputUserID,
        columnSpecs: [
            {cl: sdbInterfaceCL.getRelatedCL("EntityColumn")},
        ],
    };
    let contentKey = sdbInterfaceCL.contentKey;
    sdbInterfaceCL.loadAppended($('body'), contentKey, data);
}
