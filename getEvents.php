<?php
    header("Content-type: application/json");
    $url = "http://localhost:8080/Dispatcher/resources/eventCatalogs?" . $_SERVER['QUERY_STRING'];
    echo file_get_contents($url);
?> 