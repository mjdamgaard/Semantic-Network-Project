<?php

header("Cache-Control: max-age=300");

$err_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/err/";
require_once $err_path . "errors.php";

$user_input_path = $_SERVER['DOCUMENT_ROOT'] . "/../src/user_input/";
require_once $user_input_path . "InputGetter.php";
require_once $user_input_path . "InputValidator.php";



if ($_SERVER["REQUEST_METHOD"] != "POST") {
    $_POST = $_GET;
}


// TODO: Change the code just below such that the URLs can determine the start
// column's entity. Also made it so that the URL of the window changes everytime
// the user clicks an EntityLink (not by turning these into <a> elements, but
// by just changing the value of the URL when they are clicked).

// if (!isset($_POST["e"])) {
//     $_POST["e"] = "10";
// }
$_POST["e"] = "10";

// get and validate the required inputs.
$paramNameArr = array("e");
$typeArr = array("id");
$paramValArr = InputGetter::getParams($paramNameArr);
InputValidator::validateParams($paramValArr, $typeArr, $paramNameArr);
$entID = $paramValArr[0];


?>
<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js"></script>
<!-- <script src="/lib/jquery-3.6.4.js"></script> -->
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.1/css/bootstrap.min.css">
<!-- <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous"> -->



<link rel="stylesheet" type="text/css" href="src/style/style.css">

</head>
<body>


<main id="sdb-interface-app">
</main>
<script type="module">
    import "/src/ContentLoader.js";
    import "/src/DBRequestManager.js";
    import "/src/AccountManager.js";
    import {sdbInterfaceCL} from "/src/content_loaders/SDBInterface.js";
    import "/src/content_loaders/PagesWithTabs.js";
    import "/src/SetGenerator.js";
    import "/src/content_loaders/SetDisplays.js";
    import "/src/content_loaders/EntityElements.js";
    import "/src/content_loaders/EntityPages.js";
    import "/src/content_loaders/EntityTitles.js";
    import "/src/content_loaders/Ratings.js";
    import "/src/content_loaders/SubmissionFields.js";
    import "/src/content_loaders/OverlayPages.js";

    import "/src/style/style_modules/style01.js";

    let data = {
        entID: <?php echo $entID; ?>,
        cl: sdbInterfaceCL.getRelatedCL("EntityPage"),
    };
    sdbInterfaceCL.loadAppended($('#sdb-interface-app'), "self", data);
</script>

</body>
</html>
