<?php
$url = 'https://down-south-front-end.onrender.com/send_otp'; // ← this is key

$postData = json_encode([
    'phoneNumber' => '94719958221',
    'otp' => '456889'
]);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true); // POST method
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData); // JSON body
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($postData)
]);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    echo "cURL Error: " . curl_error($ch);
    exit;
}

$data = json_decode($response, true);

if ($data === null) {
    echo "Invalid JSON\nRaw: $response";
} else {
    echo "Message: " . $data['message'];
}

curl_close($ch);
?>
