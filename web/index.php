<?php
define('PROJECT_ROOT', __DIR__.'/../');
define('CLASSES_ROOT', PROJECT_ROOT.'classes/');
define('VIEWS_ROOT', PROJECT_ROOT.'views/');

ob_start();

require(__DIR__.'/../vendor/autoload.php');

include_once(CLASSES_ROOT.'Framework/Autoloader.php');
$autoloader = new \Framework\Autoloader(CLASSES_ROOT);
$autoloader->initAutoload();

$app = \Framework\App::i();
$app->getRouter()->registerControllerClass('/', '\IndexController');
$app->getRouter()->registerControllerClass('/api/1/apps.*', '\ApiController');
$app->run();