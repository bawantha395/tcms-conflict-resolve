<?php
header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'message' => 'Simple index file is working ...'
]);
