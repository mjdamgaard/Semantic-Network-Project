<?php


$general_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/general/";
require_once $general_path . "errors.php";


class InputVerifier {

    public static function verifyType(
        $paramVal, $type, $paramName
    ) {
        switch($type) {
            /* Type and ID input */
            case "type":
                $pattern = "/^[cerugkltb]$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "id":
                $pattern = "/^[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "termID":
                $pattern = "/^[scerugkltb][0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "setID":
                $pattern = "/^s[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "semTermID":
                $pattern = "/^[cer][0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "catID":
                $pattern = "/^c[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "eTermID":
                $pattern = "/^e[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "relID":
                $pattern = "/^r[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "userOrGroupID":
                $pattern = "/^[ug][0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "userID":
                $pattern = "/^u[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "groupID":
                $pattern = "/^g[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "kwStringID":
                $pattern = "/^k[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "listID":
                $pattern = "/^l[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "textID":
                $pattern = "/^t[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "binID":
                $pattern = "/^b[0-9a-fA-F]{1,16}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            /* Data input */
            case "str":
                if (
                    !is_string($paramVal) ||
                    !ctype_print($paramVal) ||
                    strlen($paramVal) > 255
                ) {
                    echoTypeErrorJSONAndExit($paramName, "VARCHAR(225)");
                }
                break;
            case "bin":
                $pattern = "/^([0-9a-fA-F]{2}){0,255}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $pattern);
                }
                break;
            case "uint":
                $pattern = "/^([1-9][0-9]*|0)$/";
                $n = intval($paramVal);
                if (
                    !preg_match($pattern, $paramVal) ||
                    $n < 0 ||
                    $n > 4294967295
                ) {
                    echoTypeErrorJSONAndExit($paramName, "UINT");
                }
                break;
            case "int":
                $pattern = "/^-?([1-9][0-9]*|0)$/"; // this allows "-0", why not?..
                $n = intval($paramVal);
                if (
                    !preg_match($pattern, $paramVal) ||
                    $n < -2147483648 ||
                    $n > 2147483647
                ) {
                    echoTypeErrorJSONAndExit($paramName, "INT");
                }
                break;
            case "tint":
                $pattern = "/^-?([1-9][0-9]*|0)$/"; // this allows "-0", why not?..
                $n = intval($paramVal);
                if (
                    !preg_match($pattern, $paramVal) ||
                    $n < -128 ||
                    $n > 127
                ) {
                    echoTypeErrorJSONAndExit($paramName, "TINYINT");
                }
                break;
            default:
                throw new \Exception(
                    'verifyAndSetParams(): unknown type for ' . $paramName
                );
        }
    }

}


?>
