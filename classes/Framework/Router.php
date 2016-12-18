<?php
namespace Framework;

/**
 * Class Router
 * @package Framework
 */
class Router extends Component {
	/**
	 * The array of the registered controller classes with their route patterns.
	 * @var array
	 */
	private $registered_controllers = [];

	/**
	 * Return the "path" part of the REQUEST_URI.
	 * @return string|false
	 */
	private function getRequestUriPath() {
		return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
	}

	/**
	 * Parses the content of an at-attribute in a doc comment.
	 * @param string $attribute_name The name of the attribute (without the @ symbol)
	 * @param string $doc_comment The contents of the doc comment
	 * @return string|null
	 */
	private function parseAttributeFromDocComment($attribute_name, $doc_comment) {
		$doc_comment_lines = explode("\n", $doc_comment);
		foreach ($doc_comment_lines as $doc_comment_line) {
			$line_contents = ltrim($doc_comment_line, "*\t ");
			if (substr($line_contents, 0, strlen($attribute_name)+1)==='@'.$attribute_name) {
				return trim(substr($line_contents, strlen($attribute_name)+1));
			}
		}

		return null;
	}

	/**
	 * Registers the given controller class name to handle routes with the correspondent given route pattern.
	 * @param $route_pattern
	 * @param $controller_class_name
	 * @return $this
	 */
	public function registerControllerClass($route_pattern, $controller_class_name) {
		$this->registered_controllers[] = [
			'pattern' => $route_pattern,
			'class_name' => $controller_class_name,
		];
		return $this;
	}

	/**
	 * @param $controller
	 */
	private function callActionMethodNameByController($controller) {
		$path = $this->getRequestUriPath();

		$controller_reflection = new \ReflectionClass($controller);
		foreach ($controller_reflection->getMethods(\ReflectionMethod::IS_PUBLIC) as $method) {

			$pattern = $this->parseAttributeFromDocComment('pattern', $method->getDocComment());

			$request_method = $this->parseAttributeFromDocComment('method', $method->getDocComment());
			if (is_null($request_method)) {
				$request_method = 'GET';
			}

			if (!in_array($_SERVER['REQUEST_METHOD'], explode(',', strtoupper($request_method)))) {
				continue;
			}

			$matches = [];
			if (preg_match('!^'.$pattern.'$!', $path, $matches)) {
				array_shift($matches);
				ob_end_clean();
				call_user_func_array(array($controller, $method->getName()), $matches);
				return;
			}
		}

		$this->throw404();
	}

	/**
	 * Throws error 404 reply.
	 */
	private function throw404() {
		ob_end_clean();
		header("HTTP/1.0 404 Not Found");
		include(VIEWS_ROOT.'/404.phtml');
		exit(0);
	}

	/**
	 * Searches for the request-matching action of the request-matching controller and runs it or throws 404 otherwise.
	 */
	public function runAction() {
		$path = $this->getRequestUriPath();
		foreach ($this->registered_controllers as $registered_controller) {
			if (preg_match('!^'.$registered_controller['pattern'].'$!', $path)) {
				$controller = new $registered_controller['class_name'];
				$this->callActionMethodNameByController($controller);
				return;
			}
		}

		$this->throw404();
	}
}