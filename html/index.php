<?php

// TODO: Implement an index page where the user can login and so on..



?>
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">

<link rel="stylesheet" type="text/css" href="src/css/style.css">
<script src="/lib/jquery-3.6.4.js"></script>
<script src="/src/requests/QueryDataConstructors.js"></script>
<script src="/src/requests/InputDataConstructors.js"></script>
<script src="/src/storeFunction.js"></script>


</head>
<body>

<!-- TODO: Add functionalities to this bar; login etc.. -->
<div id="headerBar">
    <h2> openSDB </h2>
</div>


<?php
if (!isset($_GET["tid"])) {
    $_GET["tid"] = "c3";
}
if (!isset($_GET["uid"])) {
    $_GET["uid"] = "u1";
}
if (!isset($_GET["pid"])) {
    $_GET["pid"] = "u1";
}
require $_SERVER['DOCUMENT_ROOT'] . "/../src/UPA.php";
?>

<!-- Tests -->
<script>

// console.log(~~"12367");

</script>

</body>
</html>
