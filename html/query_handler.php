<?php

header("Access-Control-Allow-Origin: http://localhost:3000");
// header("Cache-Control: max-age=3");

// TODO: Set a higher "Cache-Control: max-age" than the ones below, and make
// the application control when requests need to have "Cache-Control: no-cache"
// when expecting changes (such as when the user has just submitted an input).

$err_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/php/err/";
require_once $err_path . "errors.php";

$user_input_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/php/user_input/";
require_once $user_input_path . "InputGetter.php";
require_once $user_input_path . "InputValidator.php";

$db_io_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/php/db_io/";
require_once $db_io_path . "DBConnector.php";

$auth_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/php/auth/";
require_once $auth_path . "Authenticator.php";



if ($_SERVER["REQUEST_METHOD"] != "POST") {
    $_POST = array_map('urldecode', $_GET);
}


// TODO: Consider implementing some limits on the "n"s below (other than just
// the maximal int).. (Well, I *think* we will need to do this...)

// NOTE: When we want to implement queries for private information, which should
// then require a valid session ID, let us create a seperate query handler
// program for this (e.g. "private_query_handler.php").


/* Handling of the qeury request */

// get request type.
if (!isset($_POST["req"])) {
    echoBadErrorJSONAndExit("No request type specified");
}
$reqType = $_POST["req"];


// match $reqType against any of the following single-query request types
// and execute the corresponding query if a match is found.
$sql = "";
$paramNameArr = "";
$typeArr = "";
switch ($reqType) {
    case "instList":
        header("Cache-Control: max-age=3");
        $sql = "CALL selectInstanceList (?, ?, ?, ?, ?, ?, ?)";
        $paramNameArr = array(
            "u", "t",
            "rl", "rh",
            "n", "o",
            "a"
        );
        $typeArr = array(
            "id", "id",
            "rat", "rat",
            "uint", "uint",
            "tint"
        );
        // output: [[ratVal, instID], ...].
        break;
    case "rat":
        header("Cache-Control: max-age=3");
        $sql = "CALL selectRating (?, ?, ?)";
        $paramNameArr = array("u", "t", "i");
        $typeArr = array("id", "id", "id");
        // output: [[ratVal]].
        break;
    case "recInputs":
        header("Cache-Control: max-age=3");
        $sql = "CALL selectRecordedInputs (?, ?)";
        $paramNameArr = array("id", "n");
        $typeArr = array("id", "uint");
        // output: [[userID, stmtID, ratVal], ...].
        break;
    case "recInputsSK":
        header("Cache-Control: max-age=3");
        $sql = "CALL selectRecordedInputsFromSecKey (?, ?, ?, ?)";
        $paramNameArr = array("s", "n", "o", "a");
        $typeArr = array("id", "uint", "uint", "tint");
        // output: [[ratID, userID, stmtID, ratVal], ...].
        break;
    case "recInputsMaxID":
        header("Cache-Control: max-age=3");
        $sql = "CALL selectRecordedInputsMaxID ()";
        $paramNameArr = array();
        $typeArr = array();
        // output: [[maxID]].
        break;
    case "ent":
        $sql = "CALL selectEntity (?)";
        $paramNameArr = array("id");
        $typeArr = array("id");
        // output: [[parentID, specInput, ownStruct, dataLen]].
        break;
    case "entSK":
        $sql = "CALL selectEntityFromSecKey (?, ?, ?, ?)";
        $paramNameArr = array("p", "s", "oh", "dh");
        $paramNameArr = array("id", "str", "str", "str");
        // output: [[entID]].
        break;
    case "entData":
        $sql = "CALL selectEntityData (?, ?, ?)";
        $paramNameArr = array("id", "l", "s");
        $paramNameArr = array("id", "uint", "uint");
        // output: [[dataInput]].
        break;
    case "creator":
        $sql = "CALL selectCreator (?)";
        $paramNameArr = array("id");
        $typeArr = array("id");
        // output: [[userID]].
        break;
    case "creations":
        $sql = "CALL selectCreations (?, ?, ?, ?)";
        $paramNameArr = array("u", "n", "o", "a");
        $typeArr = array("id", "uint", "uint", "tint");
        // output: [[entID], ...].
        break;
    // case "ent":
    //     $sql = "CALL selectEntityInfo (?)";
    //     $paramNameArr = array("id");
    //     $typeArr = array("id");
    //     // output:
    //     //     sim: [['s', title]],
    //     //     assoc: [['a', titleID, title, defID]],
    //     //     form: [['f', funID, inputListID, textStart, len]],
    //     //     propTag: [['p', subjID, propID]],
    //     //     stmt: [['m', tagID, instID]],
    //     //     list: [['l', textStart, len]],
    //     //     propDoc: [['d', textStart, len]],
    //     //     text: [['t', textStart, len, dataHash]],
    //     //     bin: [['b', len, dataHash]],
    //     //     user: [['u', username]],
    //     //     bot: [['n', botName]],
    //     break;
    // case "list":
    //     $sql = "CALL selectList (?, ?, ?)";
    //     $paramNameArr = array("id", "l", "s");
    //     // (l = 0 is the same as l = 65535.)
    //     $typeArr = array("id", "uint", "uint");
    //     // output: [[text]].
    //     break;
    // case "propDoc":
    //     $sql = "CALL selectPropDoc (?, ?, ?)";
    //     $paramNameArr = array("id", "l", "s");
    //     $typeArr = array("id", "uint", "uint");
    //     // output: [[text]].
    //     break;
    // case "text":
    //     $sql = "CALL selectText (?, ?, ?)";
    //     $paramNameArr = array("id", "l", "s");
    //     $typeArr = array("id", "uint", "uint");
    //     // output: [[text]].
    //     break;
    // case "bin":
    //     $sql = "CALL selectBinary (?)";
    //     $paramNameArr = array("id");
    //     $typeArr = array("id");
    //     // output: [[bin]].
    //     break;
    case "user":
        $sql = "CALL selectUserInfo (?)";
        $paramNameArr = array("id");
        $typeArr = array("id");
        // output: [[username, publicKeys]].
        break;
    case "bot":
        $sql = "CALL selectBotInfo (?)";
        $paramNameArr = array("id");
        $typeArr = array("id");
        // output: [[botName, botDescription]].
        break;
    // case "simID":
    //     $sql = "CALL selectSimEntityID (?)";
    //     $paramNameArr = array("t");
    //     $typeArr = array("str");
    //     // output: [[entID]].
    //     break;
    // case "assocID":
    //     $sql = "CALL selectAssocEntityID (?, ?)";
    //     $paramNameArr = array("t", "p");
    //     $typeArr = array("id", "id");
    //     // output: [[entID]].
    //     break;
    // case "formID":
    //     $sql = "CALL selectFormEntityID (?, ?)";
    //     $paramNameArr = array("f", "i");
    //     $typeArr = array("id", "id");
    //     // output: [[entID]].
    //     break;
    // case "formIDFromText":
    //     $sql = "CALL selectFormEntityIDFromText (?, ?)";
    //     $paramNameArr = array("f", "i");
    //     $typeArr = array("id", "text");
    //     // output: [[entID, inputListID]].
    //     break;
    // case "propTagID":
    //     $sql = "CALL selectPropTagEntityID (?, ?)";
    //     $paramNameArr = array("s", "p");
    //     $typeArr = array("id", "id");
    //     // output: [[entID]].
    //     break;
    //     case "stmtID":
    //         $sql = "CALL selectStmtEntityID (?, ?)";
    //         $paramNameArr = array("t", "i");
    //         $typeArr = array("id", "id");
    //         // output: [[entID]].
    //         break;
    // case "listID":
    //     $sql = "CALL selectListEntityID (?)";
    //     $paramNameArr = array("h");
    //     $typeArr = array("str");
    //     // output: [[entID]].
    //     break;
    // case "propDocID":
    //     $sql = "CALL selectPropDocEntityID (?)";
    //     $paramNameArr = array("h");
    //     $typeArr = array("str");
    //     // output: [[entID]].
    //     break;
    // case "textID":
    //     $sql = "CALL selectTextEntityID (?)";
    //     $paramNameArr = array("h");
    //     $typeArr = array("str");
    //     // output: [[entID]].
    //     break;
    // case "binID":
    //     $sql = "CALL selectBinaryEntityID (?)";
    //     $paramNameArr = array("h");
    //     $typeArr = array("str");
    //     // output: [[entID]].
    //     break;
    // case "userID":
    //     $sql = "CALL selectUserEntityID (?)";
    //     $paramNameArr = array("n");
    //     $typeArr = array("str");
    //     // output: [[entID]].
    //     break;
    // case "botID":
    //     $sql = "CALL selectBotEntityID (?)";
    //     $paramNameArr = array("n");
    //     $typeArr = array("str");
    //     // output: [[entID]].
    //     break;
    case "ancBotData1e2d":
        $sql = "CALL selectAncillaryBotData1e2d (?, ?)";
        $paramNameArr = array("n", "e");
        $typeArr = array("str", "id");
        // output: [[data1, data2]].
        break;
    case "ancBotData1e4d":
        $sql = "CALL selectAncillaryBotData1e4d (?, ?)";
        $paramNameArr = array("n", "e");
        $typeArr = array("str", "id");
        // output: [[data1, data2, data3, data4]].
        break;
    default:
        echoBadErrorJSONAndExit("Unrecognized request type");
}

// get inputs.
$paramValArr = InputGetter::getParams($paramNameArr);
// validate inputs.
InputValidator::validateParams($paramValArr, $typeArr, $paramNameArr);
// get connection.
require $db_io_path . "sdb_config.php";
$conn = DBConnector::getConnectionOrDie(
    DB_SERVER_NAME, DB_DATABASE_NAME, DB_USERNAME, DB_PASSWORD
);
// prepare input MySQLi statement.
$stmt = $conn->prepare($sql);
// execute query statement.
DBConnector::executeSuccessfulOrDie($stmt, $paramValArr);
// fetch the result as a numeric array.
$res = $stmt->get_result()->fetch_all();
// if $reqType == ent, JSON-decode the third output, "ownStruct", before the
// final full JSON-encoding. 
if ($reqType === "ent") {
    $res[0][2] = json_decode($res[0][2], true);
}
// finally echo the JSON-encoded numeric array, containing e.g. the
// columns: ("ratVal", "instID") for $reqType == "set", etc., so look at
// the comments above for what the resulting arrays will contain.
header("Content-Type: text/json");
echo json_encode($res);

// The program exits here, which also closes $conn.
?>
