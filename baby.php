<?php
$TARGET_URL = 'https://t.me/s/babyChannels';

function send_proxy($method) {
    global $TARGET_URL;
    $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    $ch = curl_init($TARGET_URL);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_USERAGENT => $ua,
        CURLOPT_HTTPHEADER => [
            'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language: zh-CN,zh;q=0.9,en;q=0.8',
            'Connection: close',
            'Referer: ' . $TARGET_URL,
        ],
        CURLOPT_NOBODY => ($method === 'HEAD'),
    ]);

    $code = null;
    $contentType = null;
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($ch, $line) use (&$code, &$contentType) {
        $len = strlen($line);
        if (stripos($line, 'HTTP/') === 0) {
            $parts = explode(' ', trim($line));
            if (count($parts) >= 2) { $code = intval($parts[1]); }
        } else {
            $pos = strpos($line, ':');
            if ($pos !== false) {
                $name = strtolower(trim(substr($line, 0, $pos)));
                $value = trim(substr($line, $pos+1));
                if ($name === 'content-type') { $contentType = $value; }
            }
        }
        return $len;
    });

    if ($method === 'GET') {
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
            echo $data;
            return strlen($data);
        });
    } else {
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    }

    $ok = curl_exec($ch);
    if ($ok === false) {
        http_response_code(502);
        header('Content-Type: text/plain; charset=utf-8');
        echo curl_error($ch);
        curl_close($ch);
        return;
    }

    if ($code === null) { $code = 200; }
    http_response_code($code);
    if ($contentType) { header('Content-Type: ' . $contentType); }

    if ($method === 'HEAD') {
        // no body
    } else {
        // already streamed in WRITEFUNCTION
    }
    curl_close($ch);
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$script = isset($_SERVER['SCRIPT_NAME']) ? $_SERVER['SCRIPT_NAME'] : '';
$method = $_SERVER['REQUEST_METHOD'];
if ($path === '/viewer' || ($script && $path === rtrim($script, '/') . '/viewer')) {
    $html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Forward Viewer</title><style>html,body{height:100%;margin:0;background:#111} .wrap{position:fixed;inset:0} iframe{width:100%;height:100%;border:0;background:#fff}</style></head><body><div class="wrap"><iframe src="' . htmlspecialchars($script ?: '/') . '?mode=proxy" loading="eager"></iframe></div></body></html>';
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Length: ' . strlen($html));
    echo $html;
    return;
}
if (isset($_GET['mode']) && $_GET['mode'] === 'viewer') {
    $html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Forward Viewer</title><style>html,body{height:100%;margin:0;background:#111} .wrap{position:fixed;inset:0} iframe{width:100%;height:100%;border:0;background:#fff}</style></head><body><div class="wrap"><iframe src="' . htmlspecialchars($script ?: '/') . '?mode=proxy" loading="eager"></iframe></div></body></html>';
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Length: ' . strlen($html));
    echo $html;
    return;
}
send_proxy($method);
return;
?>
