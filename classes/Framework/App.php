<?php
namespace Framework;

/**
 * Class App
 * Serves as a global application entity.
 * @package Framework
 */
class App extends Component {
	/**
	 * An instance of the App
	 * @var App
	 */
	static private $instance;

	/**
	 * @var Router
	 */
	private $router;

	/**
	 * The singleton instance getter.
	 * @return static
	 */
	public static function i() {
		if (!(self::$instance instanceof App)) {
			self::$instance = new static();
		}
		return self::$instance;
	}

	/**
	 * Returns the application router.
	 * @return Router
	 */
	public function getRouter() {
		if (!($this->router instanceof Router)) {
			$this->router = new Router();
		}
		return $this->router;
	}

	/**
	 * The application run method.
	 */
	public function run() {
		$router = $this->getRouter();
		$controller = new \IndexController();

		$router->runAction();
	}
}