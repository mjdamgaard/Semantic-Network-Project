<?php

header("Content-Type: text/json");

$err_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/err/";
require_once $err_path . "errors.php";

$user_input_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/user_input/";
require_once $user_input_path . "InputGetter.php";
require_once $user_input_path . "InputValidator.php";

$db_io_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/db_io/";
require_once $db_io_path . "DBConnector.php";


if ($_SERVER["REQUEST_METHOD"] != "POST") {
    echoErrorJSONAndExit(
        "Only the POST HTTP method is allowed for this request"
    );
}


/* Getting the input */

// get the username and password.
$paramNameArr = array("n", "em", "pw");
$typeArr = array("username", "str", "password"); // TODO: Implement e-mail
// validation.
$paramValArr = InputGetter::getParams($paramNameArr);
InputValidator::validateParams($paramValArr, $typeArr, $paramNameArr);

// compute the password hash.
$pwHash = password_hash($pw);


/* Trying to create a new user account */

// get connection to the database.
require $db_io_path . "sdb_config.php";
$conn = DBConnector::getConnectionOrDie(
    $servername, $dbname, $username, $password
);

// prepare input MySQLi statement to create the new user.
$sql = "CALL createNewUser (?, ?, ?)";
$stmt = $conn->prepare($sql);
// execute input statement.
DBConnector::executeSuccessfulOrDie($stmt, array($u, $em, $pwHash));
// fetch the result as a numeric array.
$res = $stmt->get_result()->fetch_assoc();
// die with $res if the user could not be created.
if ($res["exitCode"] != 0) {
    echo json_encode($res);
    exit;
}


/* Creating a new session ID and outputting the sesID and expTime */

require $auth_path . "create_or_update_session.php";

// The program exits here, which also closes $conn.

?>
