<?php


$err_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/php/err/";
require_once $err_path . "errors.php";


class InputValidator {

    public static function validateParams(
        $paramValArr, $typeArr, $paramNameArr
    ) {
        $len = count($paramValArr);
        for ($i = 0; $i < $len; $i++) {
            InputValidator::validateParam(
                $paramValArr[$i], $typeArr[$i], $paramNameArr[$i]
            );
        }
    }

    public static function validateParam($paramVal, $type, $paramName) {
        switch($type) {
            case "id":
            case "unix_time":
            case "ulong":
                $pattern = "/^[1-9][0-9]*|0$/";
                if (
                    !preg_match($pattern, $paramVal) ||
                    strlen($paramVal) > 20 ||
                    strlen($paramVal) == 20 &&
                        $paramVal > "18446744073709551615"
                ) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "BIGINT UNSIGNED"
                    );
                }
                break;
            case "uint":
                $pattern = "/^[1-9][0-9]*|0$/";
                if (
                    !preg_match($pattern, $paramVal) ||
                    strlen($paramVal) > 10 ||
                    strlen($paramVal) == 10 && $paramVal > "4294967295"
                ) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "INT UNSIGNED"
                    );
                }
                break;
            case "int":
                $pattern = "/^-?[1-9][0-9]{0,9}|0$/";
                $n = intval($paramVal);
                if (
                    !preg_match($pattern, $paramVal) ||
                    $n < -2147483648 ||
                    $n > 2147483647
                ) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, "INT");
                }
                break;
            case "tint":
            // case "rat":
                $pattern = "/^-?[1-9][0-9]{0,2}|0$/";
                $n = intval($paramVal);
                if (
                    !preg_match($pattern, $paramVal) ||
                    $n < -128 ||
                    $n > 127
                ) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, "TINYINT");
                }
                break;
            case "bool":
            // case "rat":
                $pattern = "/^[01]$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, $pattern);
                }
                break;
            case "utint":
            case "uchar":
            case "rat":
                $pattern = "/^[1-9][0-9][0-9]|0$/";
                $n = intval($paramVal);
                if (
                    !preg_match($pattern, $paramVal) ||
                    $n < 0 ||
                    $n > 255
                ) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "TINYINT UNSIGNED"
                    );
                }
                break;
            case "ushort":
            // case "encoded_rat":
            // case "enc_rat":
                $pattern = "/^[1-9][0-9]{0,4}|0$/";
                $n = intval($paramVal);
                if (
                    !preg_match($pattern, $paramVal) ||
                    $n > 65535
                ) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "SMALLINT UNSIGNED"
                    );
                }
                break;
            case "float":
            // TODO: Restricting syntax, unless it's fine..
                $pattern =
                 "/^\\-?(0|[1-9][0-9]*)(\\.[0-9]+)?([eE][+\\-]?[1-9][0-9]?)?$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, "FLOAT");
                }
                // $x = floatval($paramVal);
                // if (
                //     $x < -3.402823466E+38 || 3.402823466E+38 < $x ||
                //     abs($x) < 1.175494351E-38
                // ) {
                //     echoTypeErrorJSONAndExit($paramName, $paramVal, "FLOAT");
                // }
                break;
            case "char":
                if (
                    !(iconv_strlen($paramVal, "UFT-8") === 1)
                ) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, "CHAR");
                }
                break;
            case "str":
                if (
                    !(iconv_strlen($paramVal, "UFT-8") <= 700)
                ) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "VARCHAR(700)"
                    );
                }
                break;
            case "hash":
                $pattern = "/^[0-9a-f]{128}$/";
                if (preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, $pattern);
                }
                break;
            case "id_list":
                $pattern = "/^((this|[1-9][0-9]*)(,(this|[1-9][0-9]*))*)?$/";
                $len = strlen($paramVal);
                if (
                    $len > 209 ||
                    !preg_match($pattern, $paramVal)
                ) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "ID list (max 10)"
                    );
                }
                break;
            case "list_list":
                $pattern =
                    "/^((this|[1-9][0-9]*)([,\|](this|[1-9][0-9]*))*)?$/";
                $len = strlen($paramVal);
                if (
                    $len > 209 ||
                    !preg_match($pattern, $paramVal)
                ) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "ID list (max 10)"
                    );
                }
                break;
            case "text":
            case "uft8_text":
                $len = strlen($paramVal);
                if (
                    $len > 65535 ||
                    !mb_check_encoding($paramVal, 'UTF-8')
                ) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "UFT-8 TEXT"
                    );
                }
                break;
            case "blob":
                if (
                    !is_string($paramVal) ||
                    // !ctype_print($paramVal) ||
                    strlen($paramVal) > 65535
                ) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, "BLOB");
                }
                break;
            case "json":
            case "json_indexable":
                // Never mind about this, I don't wish to not have
                // 'constructor' as a possible attribute:
                // $jsObjProtoPropsPattern =
                //     '/[^\\]"(' .
                //         '__defineGetter__|__defineSetter__|__lookupGetter__|' .
                //         '__lookupSetter__|__proto__|hasOwnProperty|' .
                //         'isPrototypeOf|propertyIsEnumerable|toLocaleString|' .
                //         'toString|valueOf|constructor|' . 
                //         '<get __proto__\\(\\)>|<set __proto__\\(\\)>' .
                //     ')":/';
                if (
                    strlen($paramVal) > 3000 ||
                    !json_validate($paramVal) // ||
                    // preg_match($jsObjProtoPropsPattern, $paramVal)
                ) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, "JSON");
                }
                break;
            case "list_text":
                $pattern = "/^[1-9][0-9]*(,[1-9][0-9]*)*$/";
                if (
                    strlen($paramVal) > 65535 ||
                    !preg_match($pattern, $paramVal)
                ) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, "listText");
                }
                break;
            // case "time":
            //     $pattern =
            //         "/^(" .
            //             "([12]?[0-9]|3[0-4]) ".
            //             "([01][0-9]|2[0-3])" .
            //             "(:[0-5][0-9]){0,2}" .
            //         ")|(" .
            //             "([01][0-9]|2[0-3]:)?" .
            //             "([0-5][0-9])" .
            //             "(:[0-5][0-9])?" .
            //         ")$/";
            //     if (!preg_match($pattern, $paramVal)) {
            //         echoTypeErrorJSONAndExit($paramName, $paramVal, $pattern);
            //     }
            //     break;
            case "username":
                // if (!is_string($paramVal) || !ctype_print($paramVal)) {
                //     echoTypeErrorJSONAndExit(
                //         $paramName, $paramVal, "VARCHAR(1,50)"
                //     );
                // }
                // $pattern = "/^[\S]+$/";
                $pattern = "/^[a-zA-Z][\w\-]*$/"; // TODO: Make this a lot less
                // restrictive. (But do not include integers, as these are
                // reserved for IDs.)
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, $pattern);
                }
                if (strlen($paramVal) > 50) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "VARCHAR(1,50)"
                    );
                }
                break;
            case "password":
                if (!is_string($paramVal) || !ctype_print($paramVal)) {
                    // TODO: Change this as to not echo the password back to
                    // the user.
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "VARCHAR(8,72)"
                    );
                }
                $len = strlen($paramVal);
                if ($len < 8  || $len > 72) {
                    echoTypeErrorJSONAndExit(
                        $paramName, $paramVal, "VARCHAR(8,72)"
                    );
                }
                break;
            case "session_id_hex":
                $pattern = "/^([0-9a-zA-Z]{2}){60}$/";
                if (!preg_match($pattern, $paramVal)) {
                    echoTypeErrorJSONAndExit($paramName, $paramVal, $pattern);
                }
                break;
            case "any":
                break;
            default:
                throw new \Exception(
                    'validateParam(): unknown type ' .
                    $type . ' for ' . $paramName
                );
        }
    }
}
?>
