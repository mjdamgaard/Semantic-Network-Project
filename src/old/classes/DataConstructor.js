
import {basicEntIDs} from "../entity_ids/basic_entity_ids.js";



export class DataConstructor {

  static getUserScoreListExplodedDefStr(userID, qualIDOrDefStr) {
    let qualRef = (/^[1-9][0-9]*$/.test(qualIDOrDefStr.toString())) ?
      `@[${qualIDOrDefStr}]` :
      `@<qual s>${qualIDOrDefStr}@</qual>`;

    return (
      "@[" + basicEntIDs["user score lists/format"] + "],@[" + userID + "]," +
      qualRef
    );
  }

  static getRelevancyQualityExplodedDefStr(classIDOrDefStr) {
    let classRef = (/^[1-9][0-9]*$/.test(classIDOrDefStr.toString())) ?
      `@[${classIDOrDefStr}]` :
      `@<class s>${classIDOrDefStr}@</class>`;

    return (
      "@[" + basicEntIDs["relevancy qualities/format"] + "]," + classRef
    );
  }

  static getRelationalClassExplodedDefStr(objID, relID) {
    return (
      "@[" + basicEntIDs["relational classes/format"] + "],@[" + objID + "],@[" +
      relID + "]"
    );
  }



}




export {DataConstructor as default};
