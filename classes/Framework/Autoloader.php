<?php
namespace Framework;

/**
 * Class Autoloader
 * A small autoload callback initialization wrapper class.
 * @package Framework
 */
class Autoloader {
	/**
	 * @var string
	 */
	public $classes_root;

	/**
	 * Autoloader constructor.
	 * @param string $classes_root A root directory for PSR-0 classes
	 */
	public function __construct($classes_root = '') {
		$this->classes_root = $classes_root;
	}

	/**
	 * Autoload callback. Returns a file name to include by a class name.
	 * @param string $class_name
	 * @return string
	 */
	public function autoloadCallback($class_name = '') {
		$file_name = $this->classes_root.DIRECTORY_SEPARATOR.str_replace('\\', DIRECTORY_SEPARATOR, $class_name).'.php';
		require_once($file_name);
	}

	public function initAutoload() {
		spl_autoload_register(array($this, 'autoloadCallback'));
	}
}