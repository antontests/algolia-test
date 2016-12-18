<?php
namespace Framework;

/**
 * Class Component
 * A root class for establishing the init-method behavior instead of the constructor-overloading behavior for other classes.
 * @package Framework
 */
class Component {
	public function __construct() {
		$this->init();
	}

	protected function init() {
	}
}